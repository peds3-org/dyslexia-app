import { supabase } from '../supabase';
import { UserProfileRepository } from './repositories/userProfile';
import { LearningSessionRepository } from './repositories/learningSession';
import { CharacterMasteryRepository } from './repositories/characterMastery';
import { DatabaseError, DatabaseErrorCode } from './errors';
import NetInfo from '@react-native-community/netinfo';

class DatabaseManager {
  private static instance: DatabaseManager;
  
  public userProfiles: UserProfileRepository;
  public learningSessions: LearningSessionRepository;
  public characterMastery: CharacterMasteryRepository;
  
  private networkListener: (() => void) | null = null;
  private isOnline: boolean = true;

  private constructor() {
    this.userProfiles = new UserProfileRepository(supabase);
    this.learningSessions = new LearningSessionRepository(supabase);
    this.characterMastery = new CharacterMasteryRepository(supabase);
    
    this.initializeNetworkListener();
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private initializeNetworkListener() {
    this.networkListener = NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected === true;
      
      // If we just came back online, sync offline data
      if (wasOffline && this.isOnline) {
        this.syncAllOfflineData().catch(console.error);
      }
    });
  }

  async syncAllOfflineData(): Promise<void> {
    if (!this.isOnline) return;
    
    try {
      await Promise.all([
        this.userProfiles.syncOfflineData(),
        this.learningSessions.syncOfflineData(),
        this.characterMastery.syncOfflineData()
      ]);
    } catch (error) {
      console.error('Failed to sync offline data:', error);
    }
  }

  async isUserAuthenticated(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return !!user;
    } catch {
      return false;
    }
  }

  async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      throw DatabaseError.fromSupabaseError(error);
    }
    
    if (!user) {
      throw new DatabaseError('User not authenticated', DatabaseErrorCode.RLS_VIOLATION);
    }
    
    return user.id;
  }

  cleanup() {
    if (this.networkListener) {
      this.networkListener();
      this.networkListener = null;
    }
  }
}

// Export singleton instance
export const db = DatabaseManager.getInstance();

// Export types and errors
export { DatabaseError, DatabaseErrorCode };
export type { QueryOptions } from './base';