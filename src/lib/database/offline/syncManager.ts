import { SupabaseClient } from '@supabase/supabase-js';
import NetInfo from '@react-native-community/netinfo';
import { Database } from '../../../types/supabase';
import { SyncQueue, SyncQueueItem } from './syncQueue';
import { OfflineStorage } from './offlineStorage';
import { DatabaseError } from '../errors';

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  failedItems: number;
  errors: Array<{ item: SyncQueueItem; error: any }>;
}

export class SyncManager {
  private static instance: SyncManager;
  private supabase: SupabaseClient<Database>;
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private networkListener: (() => void) | null = null;

  private constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
    this.initializeNetworkListener();
  }

  static getInstance(supabase: SupabaseClient<Database>): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager(supabase);
    }
    return SyncManager.instance;
  }

  private initializeNetworkListener() {
    this.networkListener = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        // When network comes back, try to sync
        this.syncAll().catch(console.error);
      }
    });
  }

  startAutoSync(intervalMs: number = 30000) {
    this.stopAutoSync();
    
    // Initial sync
    this.syncAll().catch(console.error);
    
    // Set up interval
    this.syncInterval = setInterval(() => {
      this.syncAll().catch(console.error);
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        syncedItems: 0,
        failedItems: 0,
        errors: []
      };
    }

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return {
        success: false,
        syncedItems: 0,
        failedItems: 0,
        errors: [{ item: {} as SyncQueueItem, error: new Error('No network connection') }]
      };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      errors: []
    };

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const itemsToSync = await SyncQueue.getItemsToSync(user.id);
      const successfulIds: string[] = [];

      for (const item of itemsToSync) {
        try {
          await this.syncItem(item);
          successfulIds.push(item.id);
          result.syncedItems++;
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          result.failedItems++;
          result.errors.push({ item, error });
          
          // Increment retry count
          await SyncQueue.incrementRetry(item.id);
        }
      }

      // Remove successfully synced items
      if (successfulIds.length > 0) {
        await SyncQueue.removeFromQueue(successfulIds);
      }

      // Sync unsynced local data
      await this.syncLocalData(user.id);

    } catch (error) {
      console.error('Sync failed:', error);
      result.success = false;
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    const { type, table, data } = item;

    switch (type) {
      case 'create':
        await this.supabase.from(table as any).insert(data);
        break;
      
      case 'update':
        if (!data.id && !data.user_id) {
          throw new Error('Update requires id or user_id');
        }
        
        const updateQuery = this.supabase.from(table as any).update(data);
        
        if (data.id) {
          await updateQuery.eq('id', data.id);
        } else if (data.user_id) {
          await updateQuery.eq('user_id', data.user_id);
        }
        break;
      
      case 'delete':
        if (!data.id) {
          throw new Error('Delete requires id');
        }
        await this.supabase.from(table as any).delete().eq('id', data.id);
        break;
    }
  }

  private async syncLocalData(userId: string): Promise<void> {
    // Sync learning sessions
    const unsyncedSessions = await OfflineStorage.getUnsyncedData<any>(
      'learning_sessions',
      userId
    );

    for (const { key, data } of unsyncedSessions) {
      try {
        await this.supabase.from('learning_sessions').upsert(data);
        await OfflineStorage.markAsSynced('learning_sessions', key, userId);
      } catch (error) {
        console.error('Failed to sync learning session:', error);
      }
    }

    // Sync character mastery
    const unsyncedMasteries = await OfflineStorage.getUnsyncedData<any>(
      'character_mastery',
      userId
    );

    for (const { key, data } of unsyncedMasteries) {
      try {
        await this.supabase.from('character_mastery').upsert(data);
        await OfflineStorage.markAsSynced('character_mastery', key, userId);
      } catch (error) {
        console.error('Failed to sync character mastery:', error);
      }
    }
  }

  async getQueueStatus(userId: string): Promise<{
    pendingItems: number;
    isOnline: boolean;
    isSyncing: boolean;
  }> {
    const netInfo = await NetInfo.fetch();
    const pendingItems = await SyncQueue.getQueueSize(userId);

    return {
      pendingItems,
      isOnline: netInfo.isConnected === true,
      isSyncing: this.isSyncing
    };
  }

  cleanup() {
    this.stopAutoSync();
    if (this.networkListener) {
      this.networkListener();
      this.networkListener = null;
    }
  }
}