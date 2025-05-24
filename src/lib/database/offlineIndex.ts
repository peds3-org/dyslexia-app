import { supabase } from '../supabase';
import { OfflineLearningSessionRepository } from './offline/repositories/learningSession';
import { OfflineCharacterMasteryRepository } from './offline/repositories/characterMastery';
import { UserProfileRepository } from './repositories/userProfile';
import { SyncManager } from './offline/syncManager';
import { DatabaseError, DatabaseErrorCode } from './errors';

/**
 * Offline-first database manager for game play
 * 
 * This manager prioritizes local storage for immediate response during gameplay
 * and syncs data to Supabase in the background when network is available.
 */
class OfflineFirstDatabaseManager {
  private static instance: OfflineFirstDatabaseManager;
  
  public learningSessions: OfflineLearningSessionRepository;
  public characterMastery: OfflineCharacterMasteryRepository;
  public userProfiles: UserProfileRepository; // User profiles stay online-first
  public syncManager: SyncManager;
  
  private constructor() {
    this.learningSessions = new OfflineLearningSessionRepository(supabase);
    this.characterMastery = new OfflineCharacterMasteryRepository(supabase);
    this.userProfiles = new UserProfileRepository(supabase); // Keep online-first for auth
    this.syncManager = SyncManager.getInstance(supabase);
    
    // Start auto-sync every 30 seconds when online
    this.syncManager.startAutoSync(30000);
  }

  static getInstance(): OfflineFirstDatabaseManager {
    if (!OfflineFirstDatabaseManager.instance) {
      OfflineFirstDatabaseManager.instance = new OfflineFirstDatabaseManager();
    }
    return OfflineFirstDatabaseManager.instance;
  }

  /**
   * Check if user is authenticated
   */
  async isUserAuthenticated(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return !!user;
    } catch {
      return false;
    }
  }

  /**
   * Get current user ID
   */
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

  /**
   * Create a game session (local-only by default)
   */
  async createGameSession(sessionData: {
    stage: string;
    session_type?: string;
  }): Promise<string> {
    const userId = await this.getCurrentUserId();
    
    const session = await this.learningSessions.create({
      user_id: userId,
      stage: sessionData.stage,
      session_type: sessionData.session_type || 'practice',
      duration_seconds: 0,
      characters_practiced: 0,
      correct_attempts: 0,
      total_attempts: 0
    }, { localOnly: true }); // Local-only for immediate response
    
    return session.id;
  }

  /**
   * Update character progress during gameplay (local-only)
   */
  async updateCharacterProgress(
    character: string,
    isSuccess: boolean,
    stage: string
  ): Promise<void> {
    const userId = await this.getCurrentUserId();
    
    await this.characterMastery.updateMastery(
      userId,
      character,
      {
        isSuccess,
        stage,
        attempts: 1
      },
      { localOnly: true } // Local-only for immediate response
    );
  }

  /**
   * Complete a game session and trigger background sync
   */
  async completeGameSession(
    sessionId: string,
    stats: {
      duration_seconds: number;
      correct_attempts: number;
      total_attempts: number;
      characters_practiced: string[];
    }
  ): Promise<void> {
    const userId = await this.getCurrentUserId();
    
    // Update session locally
    await this.learningSessions.complete(
      sessionId,
      userId,
      {
        ...stats,
        character_data: { characters: stats.characters_practiced }
      },
      { localOnly: true }
    );
    
    // Update character masteries locally
    for (const character of stats.characters_practiced) {
      await this.characterMastery.updateMastery(
        userId,
        character,
        { attempts: 1, successes: 1 },
        { localOnly: true }
      );
    }
    
    // Trigger background sync
    this.syncManager.syncAll().catch(error => {
      console.warn('Background sync failed, will retry:', error);
    });
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    pendingItems: number;
    isOnline: boolean;
    isSyncing: boolean;
  }> {
    const userId = await this.getCurrentUserId();
    return this.syncManager.getQueueStatus(userId);
  }

  /**
   * Force sync all data (useful for app lifecycle events)
   */
  async forceSyncAll(): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      
      // Sync all repositories
      await Promise.all([
        this.learningSessions.forceSyncAll(userId),
        this.characterMastery.forceSyncAll(userId)
      ]);
      
      // Run sync manager
      await this.syncManager.syncAll();
    } catch (error) {
      console.error('Force sync failed:', error);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.syncManager.cleanup();
  }
}

// Export singleton instance
export const offlineDb = OfflineFirstDatabaseManager.getInstance();

// Export types
export type { OfflineFirstOptions } from './offline/base';