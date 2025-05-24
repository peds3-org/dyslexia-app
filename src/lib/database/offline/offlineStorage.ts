import AsyncStorage from '@react-native-async-storage/async-storage';

export class OfflineStorage {
  private static PREFIX = 'offline_data_';

  static async saveLocalData<T>(
    table: string,
    key: string,
    data: T,
    userId: string
  ): Promise<void> {
    const storageKey = `${this.PREFIX}${userId}_${table}_${key}`;
    const storageData = {
      data,
      timestamp: Date.now(),
      synced: false
    };
    
    await AsyncStorage.setItem(storageKey, JSON.stringify(storageData));
  }

  static async getLocalData<T>(
    table: string,
    key: string,
    userId: string
  ): Promise<T | null> {
    try {
      const storageKey = `${this.PREFIX}${userId}_${table}_${key}`;
      const stored = await AsyncStorage.getItem(storageKey);
      
      if (!stored) return null;
      
      const { data } = JSON.parse(stored);
      return data as T;
    } catch {
      return null;
    }
  }

  static async getAllLocalData<T>(
    table: string,
    userId: string
  ): Promise<T[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const prefix = `${this.PREFIX}${userId}_${table}_`;
      const relevantKeys = keys.filter(key => key.startsWith(prefix));
      
      if (relevantKeys.length === 0) return [];
      
      const items = await AsyncStorage.multiGet(relevantKeys);
      return items
        .map(([_, value]) => {
          if (!value) return null;
          const { data } = JSON.parse(value);
          return data as T;
        })
        .filter((item): item is T => item !== null);
    } catch {
      return [];
    }
  }

  static async markAsSynced(
    table: string,
    key: string,
    userId: string
  ): Promise<void> {
    const storageKey = `${this.PREFIX}${userId}_${table}_${key}`;
    const stored = await AsyncStorage.getItem(storageKey);
    
    if (stored) {
      const parsedData = JSON.parse(stored);
      parsedData.synced = true;
      await AsyncStorage.setItem(storageKey, JSON.stringify(parsedData));
    }
  }

  static async getUnsyncedData<T>(
    table: string,
    userId: string
  ): Promise<Array<{ key: string; data: T }>> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const prefix = `${this.PREFIX}${userId}_${table}_`;
      const relevantKeys = keys.filter(key => key.startsWith(prefix));
      
      if (relevantKeys.length === 0) return [];
      
      const items = await AsyncStorage.multiGet(relevantKeys);
      const unsyncedItems: Array<{ key: string; data: T }> = [];
      
      for (const [key, value] of items) {
        if (!value) continue;
        
        const parsedData = JSON.parse(value);
        if (!parsedData.synced) {
          const actualKey = key.replace(prefix, '');
          unsyncedItems.push({
            key: actualKey,
            data: parsedData.data as T
          });
        }
      }
      
      return unsyncedItems;
    } catch {
      return [];
    }
  }

  static async clearUserData(userId: string): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const userKeys = keys.filter(key => key.startsWith(`${this.PREFIX}${userId}_`));
    
    if (userKeys.length > 0) {
      await AsyncStorage.multiRemove(userKeys);
    }
  }

  static async removeLocalData(
    table: string,
    key: string,
    userId: string
  ): Promise<void> {
    const storageKey = `${this.PREFIX}${userId}_${table}_${key}`;
    await AsyncStorage.removeItem(storageKey);
  }
}