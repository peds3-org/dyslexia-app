import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retries: number;
  userId: string;
}

export class SyncQueue {
  private static QUEUE_KEY = 'offline_sync_queue';
  private static MAX_RETRIES = 3;
  private static BATCH_SIZE = 10;

  static async addToQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    const queue = await this.getQueue();
    const newItem: SyncQueueItem = {
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0
    };
    
    queue.push(newItem);
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
  }

  static async getQueue(): Promise<SyncQueueItem[]> {
    try {
      const queueData = await AsyncStorage.getItem(this.QUEUE_KEY);
      return queueData ? JSON.parse(queueData) : [];
    } catch {
      return [];
    }
  }

  static async removeFromQueue(ids: string[]): Promise<void> {
    const queue = await this.getQueue();
    const filteredQueue = queue.filter(item => !ids.includes(item.id));
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(filteredQueue));
  }

  static async incrementRetry(id: string): Promise<void> {
    const queue = await this.getQueue();
    const item = queue.find(i => i.id === id);
    if (item) {
      item.retries++;
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    }
  }

  static async getItemsToSync(userId: string): Promise<SyncQueueItem[]> {
    const queue = await this.getQueue();
    return queue
      .filter(item => item.userId === userId && item.retries < this.MAX_RETRIES)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, this.BATCH_SIZE);
  }

  static async clearUserQueue(userId: string): Promise<void> {
    const queue = await this.getQueue();
    const filteredQueue = queue.filter(item => item.userId !== userId);
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(filteredQueue));
  }

  static async getQueueSize(userId?: string): Promise<number> {
    const queue = await this.getQueue();
    if (userId) {
      return queue.filter(item => item.userId === userId).length;
    }
    return queue.length;
  }
}