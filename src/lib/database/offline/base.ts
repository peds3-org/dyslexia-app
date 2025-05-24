import { SupabaseClient } from '@supabase/supabase-js';
import NetInfo from '@react-native-community/netinfo';
import { Database } from '../../../types/supabase';
import { DatabaseError, DatabaseErrorCode } from '../errors';
import { OfflineStorage } from './offlineStorage';
import { SyncQueue } from './syncQueue';

export interface OfflineFirstOptions {
  localOnly?: boolean; // Force local-only operation (for game play)
  syncImmediate?: boolean; // Try to sync immediately if online
  skipQueue?: boolean; // Skip adding to sync queue
}

export abstract class OfflineFirstDataAccess<T> {
  protected tableName: string;
  
  constructor(
    protected supabase: SupabaseClient<Database>,
    tableName: string
  ) {
    this.tableName = tableName;
  }

  protected async isOnline(): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected === true;
  }

  protected validateUserId(userId: string | null | undefined): string {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new DatabaseError('Invalid user ID', DatabaseErrorCode.VALIDATION_ERROR);
    }
    return userId.trim();
  }

  /**
   * Save data locally first, then queue for sync
   */
  protected async saveOfflineFirst<D extends Record<string, any>>(
    key: string,
    data: D,
    userId: string,
    operation: 'create' | 'update',
    options: OfflineFirstOptions = {}
  ): Promise<D> {
    // Always save locally first
    await OfflineStorage.saveLocalData(this.tableName, key, data, userId);

    // If local-only mode, don't queue for sync
    if (options.localOnly || options.skipQueue) {
      return data;
    }

    // Add to sync queue
    await SyncQueue.addToQueue({
      type: operation,
      table: this.tableName,
      data,
      userId
    });

    // If sync immediate and online, try to sync now
    if (options.syncImmediate && await this.isOnline()) {
      try {
        const result = await this.syncToSupabase(data, operation);
        // Mark as synced if successful
        await OfflineStorage.markAsSynced(this.tableName, key, userId);
        // Remove from queue since it's synced
        const queue = await SyncQueue.getQueue();
        const itemsToRemove = queue
          .filter(item => 
            item.table === this.tableName && 
            item.data.id === data.id &&
            item.userId === userId
          )
          .map(item => item.id);
        
        if (itemsToRemove.length > 0) {
          await SyncQueue.removeFromQueue(itemsToRemove);
        }
        
        return result;
      } catch (error) {
        console.warn('Immediate sync failed, will retry later:', error);
      }
    }

    return data;
  }

  /**
   * Read data - try local first, then remote if needed
   */
  protected async readOfflineFirst<D>(
    key: string,
    userId: string,
    remoteGetter: () => Promise<D | null>,
    options: OfflineFirstOptions = {}
  ): Promise<D | null> {
    // Always try local first
    const localData = await OfflineStorage.getLocalData<D>(this.tableName, key, userId);
    
    // If local-only mode or we have local data, return it
    if (options.localOnly || localData !== null) {
      return localData;
    }

    // If online, try to get fresh data
    if (await this.isOnline()) {
      try {
        const remoteData = await remoteGetter();
        if (remoteData !== null) {
          // Update local cache with remote data
          await OfflineStorage.saveLocalData(this.tableName, key, remoteData, userId);
        }
        return remoteData;
      } catch (error) {
        console.warn('Failed to fetch remote data, using local:', error);
        return localData;
      }
    }

    return localData;
  }

  /**
   * Read all data for a user
   */
  protected async readAllOfflineFirst<D>(
    userId: string,
    remoteGetter: () => Promise<D[]>,
    options: OfflineFirstOptions = {}
  ): Promise<D[]> {
    // Get local data
    const localData = await OfflineStorage.getAllLocalData<D>(this.tableName, userId);
    
    // If local-only mode, return local data
    if (options.localOnly) {
      return localData;
    }

    // If online, try to get fresh data
    if (await this.isOnline()) {
      try {
        const remoteData = await remoteGetter();
        
        // Update local cache with remote data
        // This is a simplified approach - in production, you'd want to merge/reconcile
        for (const item of remoteData) {
          if ((item as any).id) {
            await OfflineStorage.saveLocalData(
              this.tableName, 
              (item as any).id, 
              item, 
              userId
            );
          }
        }
        
        return remoteData;
      } catch (error) {
        console.warn('Failed to fetch remote data, using local:', error);
        return localData;
      }
    }

    return localData;
  }

  /**
   * Delete data locally and queue for sync
   */
  protected async deleteOfflineFirst(
    key: string,
    userId: string,
    options: OfflineFirstOptions = {}
  ): Promise<void> {
    // Remove from local storage
    await OfflineStorage.removeLocalData(this.tableName, key, userId);

    // If not local-only, queue for sync
    if (!options.localOnly && !options.skipQueue) {
      await SyncQueue.addToQueue({
        type: 'delete',
        table: this.tableName,
        data: { id: key },
        userId
      });
    }
  }

  /**
   * Sync data to Supabase (to be implemented by subclasses)
   */
  protected abstract syncToSupabase(data: any, operation: 'create' | 'update'): Promise<any>;

  /**
   * Get all unsynced data for this table and user
   */
  async getUnsyncedData(userId: string): Promise<Array<{ key: string; data: T }>> {
    return OfflineStorage.getUnsyncedData<T>(this.tableName, userId);
  }

  /**
   * Force sync all local data for this table
   */
  async forceSyncAll(userId: string): Promise<void> {
    const unsyncedData = await this.getUnsyncedData(userId);
    
    for (const { key, data } of unsyncedData) {
      try {
        await this.syncToSupabase(data, 'update');
        await OfflineStorage.markAsSynced(this.tableName, key, userId);
      } catch (error) {
        console.error(`Failed to sync ${this.tableName} item ${key}:`, error);
      }
    }
  }
}