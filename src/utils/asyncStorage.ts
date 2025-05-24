import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * AsyncStorage utility wrapper for consistent error handling and JSON serialization
 */
export class AsyncStorageUtil {
  /**
   * Store an item with automatic JSON serialization
   */
  static async setItem(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error storing item ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get an item with automatic JSON parsing
   */
  static async getItem<T = any>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      // Return null if parsing fails (corrupted data)
      if (error instanceof SyntaxError) {
        console.warn(`Corrupted data for key ${key}, returning null`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Remove an item
   */
  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get multiple items with automatic JSON parsing
   */
  static async multiGet<T = any>(keys: string[]): Promise<{ [key: string]: T | null }> {
    try {
      const pairs = await AsyncStorage.multiGet(keys);
      const result: { [key: string]: T | null } = {};
      
      pairs.forEach(([key, value]) => {
        try {
          result[key] = value != null ? JSON.parse(value) : null;
        } catch (error) {
          console.warn(`Error parsing value for key ${key}:`, error);
          result[key] = null;
        }
      });
      
      return result;
    } catch (error) {
      console.error('Error in multiGet:', error);
      throw error;
    }
  }

  /**
   * Set multiple items with automatic JSON serialization
   */
  static async multiSet(items: { [key: string]: any }): Promise<void> {
    try {
      const pairs: [string, string][] = Object.entries(items).map(([key, value]) => [
        key,
        JSON.stringify(value)
      ]);
      await AsyncStorage.multiSet(pairs);
    } catch (error) {
      console.error('Error in multiSet:', error);
      throw error;
    }
  }

  /**
   * Remove multiple items
   */
  static async multiRemove(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error in multiRemove:', error);
      throw error;
    }
  }

  /**
   * Get all keys for the app
   */
  static async getAllKeys(): Promise<string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Error getting all keys:', error);
      throw error;
    }
  }

  /**
   * Get storage size info (Android only)
   */
  static async getStorageInfo(): Promise<{ totalSize: number; keys: string[] }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          // Rough estimate of size in bytes
          totalSize += key.length + value.length;
        }
      }

      return { totalSize, keys };
    } catch (error) {
      console.error('Error getting storage info:', error);
      throw error;
    }
  }

  /**
   * Clear app-specific data (safer than clear())
   */
  static async clearAppData(keyPrefix: string): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const appKeys = allKeys.filter(key => key.startsWith(keyPrefix));
      if (appKeys.length > 0) {
        await AsyncStorage.multiRemove(appKeys);
      }
    } catch (error) {
      console.error('Error clearing app data:', error);
      throw error;
    }
  }
}

export default AsyncStorageUtil;