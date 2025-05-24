import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { offlineDb } from '../lib/database/offlineIndex';

interface SyncStatus {
  pendingItems: number;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
}

/**
 * Hook to manage offline sync status and trigger syncs on app lifecycle events
 */
export function useOfflineSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pendingItems: 0,
    isOnline: true,
    isSyncing: false,
    lastSyncTime: null
  });

  // Update sync status
  const updateSyncStatus = async () => {
    try {
      const status = await offlineDb.getSyncStatus();
      setSyncStatus(prev => ({
        ...status,
        lastSyncTime: prev.lastSyncTime
      }));
    } catch (error) {
      console.error('Failed to get sync status:', error);
    }
  };

  // Force sync
  const forceSync = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true }));
      await offlineDb.forceSyncAll();
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date(),
        pendingItems: 0
      }));
    } catch (error) {
      console.error('Force sync failed:', error);
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  };

  useEffect(() => {
    // Initial status check
    updateSyncStatus();

    // Set up interval to check status
    const statusInterval = setInterval(updateSyncStatus, 10000); // Check every 10 seconds

    // Listen for app state changes
    const appStateListener = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          // Sync when app goes to background
          offlineDb.forceSyncAll().catch(console.error);
        } else if (nextAppState === 'active') {
          // Update status when app becomes active
          updateSyncStatus();
        }
      }
    );

    // Listen for network changes
    const netInfoUnsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && !syncStatus.isOnline) {
        // Network came back, trigger sync
        forceSync();
      }
      setSyncStatus(prev => ({ ...prev, isOnline: state.isConnected === true }));
    });

    return () => {
      clearInterval(statusInterval);
      appStateListener.remove();
      netInfoUnsubscribe();
    };
  }, []);

  return {
    ...syncStatus,
    forceSync
  };
}