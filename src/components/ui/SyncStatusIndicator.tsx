import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useOfflineSync } from '../../hooks/useOfflineSync';

export function SyncStatusIndicator() {
  const { pendingItems, isOnline, isSyncing, lastSyncTime, forceSync } = useOfflineSync();

  const getStatusColor = () => {
    if (!isOnline) return '#666';
    if (isSyncing) return '#FFA500';
    if (pendingItems > 0) return '#FFD700';
    return '#4CAF50';
  };

  const getStatusText = () => {
    if (!isOnline) return 'オフライン';
    if (isSyncing) return '同期中...';
    if (pendingItems > 0) return `${pendingItems}件の未同期データ`;
    return '同期済み';
  };

  return (
    <TouchableOpacity
      onPress={forceSync}
      disabled={!isOnline || isSyncing}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 16,
        margin: 8
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: getStatusColor(),
          marginRight: 8
        }}
      />
      {isSyncing && (
        <ActivityIndicator size="small" color={getStatusColor()} style={{ marginRight: 8 }} />
      )}
      <Text style={{ fontSize: 12, color: '#333' }}>
        {getStatusText()}
      </Text>
    </TouchableOpacity>
  );
}