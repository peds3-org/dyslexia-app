import { SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Database } from '@src/types/supabase';
import { DatabaseError, DatabaseErrorCode } from './errors';

export interface QueryOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  useCache?: boolean;
  cacheDuration?: number;
}

export abstract class BaseDataAccess<T> {
  protected tableName: string;
  protected cachePrefix: string;
  
  constructor(
    protected supabase: SupabaseClient<Database>,
    tableName: string
  ) {
    this.tableName = tableName;
    this.cachePrefix = `cache_${tableName}_`;
  }

  protected async isOnline(): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected === true;
  }

  protected async executeWithRetry<R>(
    operation: () => Promise<R>,
    options: QueryOptions = {}
  ): Promise<R> {
    const { retries = 3, retryDelay = 1000, timeout = 30000 } = options;
    
    let lastError: any;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Operation timeout')), timeout);
        });
        
        // Race between operation and timeout
        const result = await Promise.race([operation(), timeoutPromise]);
        return result;
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error instanceof DatabaseError) {
          if ([DatabaseErrorCode.RLS_VIOLATION, DatabaseErrorCode.VALIDATION_ERROR, DatabaseErrorCode.NOT_FOUND].includes(error.code)) {
            throw error;
          }
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        }
      }
    }
    
    throw DatabaseError.fromSupabaseError(lastError);
  }

  protected async getCachedData<R>(key: string): Promise<R | null> {
    try {
      const cached = await AsyncStorage.getItem(this.cachePrefix + key);
      if (!cached) return null;
      
      const { data, timestamp, duration } = JSON.parse(cached);
      const now = Date.now();
      
      if (now - timestamp > duration) {
        await AsyncStorage.removeItem(this.cachePrefix + key);
        return null;
      }
      
      return data;
    } catch {
      return null;
    }
  }

  protected async setCachedData<R>(key: string, data: R, duration: number = 5 * 60 * 1000): Promise<void> {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        duration
      };
      await AsyncStorage.setItem(this.cachePrefix + key, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  protected async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  protected async withTransaction<R>(
    operation: (client: SupabaseClient<Database>) => Promise<R>
  ): Promise<R> {
    // Note: Supabase doesn't support client-side transactions
    // This is a placeholder for future implementation with RPC functions
    // For now, we'll just execute the operation
    return operation(this.supabase);
  }

  protected validateUserId(userId: string | null | undefined): string {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new DatabaseError('Invalid user ID', DatabaseErrorCode.VALIDATION_ERROR);
    }
    return userId.trim();
  }

  abstract syncOfflineData(): Promise<void>;
}