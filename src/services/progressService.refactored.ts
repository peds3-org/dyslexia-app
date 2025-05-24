import { db, DatabaseError, DatabaseErrorCode, QueryOptions } from '../lib/database';
import { Tables } from '../types/supabase';

type TrainingStats = Tables<'training_stats'>;
type UserProfile = Tables<'user_profiles'>;
type CharacterMastery = Tables<'character_mastery'>;

export interface Progress {
  level: string;
  experience: number;
  totalMinutes: number;
  lastTrainingDate: Date | null;
  streakCount: number;
  longestStreak: number;
  averageAccuracy: number;
  collectedMojitama: string[];
  currentCharacterType?: string;
  currentCharacterLevel?: string;
  weeklyProgress?: {
    date: string;
    duration: number;
    accuracy: number;
  }[];
}

class RefactoredProgressService {
  private queryOptions: QueryOptions = {
    retries: 3,
    retryDelay: 1000,
    useCache: true,
    cacheDuration: 5 * 60 * 1000 // 5 minutes
  };

  async getProgress(userId: string): Promise<Progress | null> {
    try {
      // Get user profile and training stats in parallel
      const [profile, trainingStats] = await Promise.all([
        db.userProfiles.findByUserId(userId, this.queryOptions),
        this.getOrCreateTrainingStats(userId)
      ]);

      if (!profile) {
        throw new DatabaseError('User profile not found', DatabaseErrorCode.NOT_FOUND);
      }

      // Get character masteries
      const masteries = await db.characterMastery.findAllByUser(userId, this.queryOptions);
      const collectedMojitama = masteries
        .filter(m => m.is_mastered)
        .map(m => m.character);

      // Get weekly progress
      const weeklyProgress = await this.getWeeklyProgress(userId);

      return {
        level: trainingStats.level || 'beginner',
        experience: trainingStats.experience || 0,
        totalMinutes: Math.floor((trainingStats.total_minutes || 0) / 60),
        lastTrainingDate: trainingStats.last_training_date 
          ? new Date(trainingStats.last_training_date) 
          : null,
        streakCount: trainingStats.streak_count || 0,
        longestStreak: trainingStats.longest_streak || 0,
        averageAccuracy: Number(trainingStats.average_accuracy) || 0,
        collectedMojitama,
        currentCharacterType: profile.character_type || 'ninja',
        currentCharacterLevel: profile.character_level || 'beginner',
        weeklyProgress
      };
    } catch (error) {
      if (error instanceof DatabaseError) {
        console.error(`Progress retrieval failed: ${error.message}`, error.code);
      } else {
        console.error('Unexpected error in getProgress:', error);
      }
      return null;
    }
  }

  async updateSessionProgress(
    userId: string,
    sessionData: {
      duration: number;
      correctAttempts: number;
      totalAttempts: number;
      charactersLearned?: string[];
      stage?: string;
    }
  ): Promise<void> {
    try {
      // Create learning session
      const session = await db.learningSessions.create({
        user_id: userId,
        duration_seconds: sessionData.duration,
        characters_practiced: sessionData.charactersLearned?.length || 0,
        correct_attempts: sessionData.correctAttempts,
        total_attempts: sessionData.totalAttempts,
        stage: sessionData.stage || 'beginner',
        session_type: 'practice',
        character_data: sessionData.charactersLearned ? {
          characters: sessionData.charactersLearned
        } : null
      });

      // Update training stats
      await this.updateTrainingStats(userId, sessionData);

      // Update character masteries if characters were learned
      if (sessionData.charactersLearned && sessionData.charactersLearned.length > 0) {
        await Promise.all(
          sessionData.charactersLearned.map(character =>
            db.characterMastery.upsertMastery(
              userId,
              character,
              {
                attempts: 1,
                successes: 1,
                stage: sessionData.stage
              }
            )
          )
        );
      }
    } catch (error) {
      console.error('Failed to update session progress:', error);
      throw error;
    }
  }

  async getCharacterMasteries(userId: string): Promise<CharacterMastery[]> {
    try {
      return await db.characterMastery.findAllByUser(userId, this.queryOptions);
    } catch (error) {
      console.error('Failed to get character masteries:', error);
      return [];
    }
  }

  async getMasteredCharacters(userId: string): Promise<string[]> {
    try {
      return await db.characterMastery.getMasteredCharacters(userId, this.queryOptions);
    } catch (error) {
      console.error('Failed to get mastered characters:', error);
      return [];
    }
  }

  async getTodaysSessions(userId: string): Promise<Tables<'learning_sessions'>[]> {
    try {
      return await db.learningSessions.findTodaysSessions(userId, this.queryOptions);
    } catch (error) {
      console.error('Failed to get today\'s sessions:', error);
      return [];
    }
  }

  async getWeeklyProgress(userId: string): Promise<Progress['weeklyProgress']> {
    try {
      const stats = await db.learningSessions.getSessionStats(userId, 7, this.queryOptions);
      const sessions = await db.learningSessions.findByDateRange(
        userId,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date(),
        this.queryOptions
      );

      // Group by date
      const progressByDate = new Map<string, { duration: number; accuracy: number; count: number }>();
      
      sessions.forEach(session => {
        const date = new Date(session.session_date || session.created_at || '').toISOString().split('T')[0];
        const existing = progressByDate.get(date) || { duration: 0, accuracy: 0, count: 0 };
        
        progressByDate.set(date, {
          duration: existing.duration + (session.duration_seconds || 0),
          accuracy: existing.accuracy + (session.accuracy_rate || 0),
          count: existing.count + 1
        });
      });

      return Array.from(progressByDate.entries()).map(([date, data]) => ({
        date,
        duration: data.duration,
        accuracy: data.count > 0 ? data.accuracy / data.count : 0
      }));
    } catch (error) {
      console.error('Failed to get weekly progress:', error);
      return [];
    }
  }

  private async getOrCreateTrainingStats(userId: string): Promise<TrainingStats> {
    try {
      const { data, error } = await db.supabase
        .from('training_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Create new stats
          const { data: newStats, error: createError } = await db.supabase
            .from('training_stats')
            .insert({
              user_id: userId,
              total_minutes: 0,
              streak_count: 0,
              longest_streak: 0,
              average_accuracy: 0,
              experience: 0,
              level: 'beginner'
            })
            .select()
            .single();

          if (createError) throw createError;
          return newStats!;
        }
        throw error;
      }

      return data;
    } catch (error) {
      throw DatabaseError.fromSupabaseError(error);
    }
  }

  private async updateTrainingStats(
    userId: string,
    sessionData: {
      duration: number;
      correctAttempts: number;
      totalAttempts: number;
    }
  ): Promise<void> {
    try {
      const stats = await this.getOrCreateTrainingStats(userId);
      const accuracy = sessionData.totalAttempts > 0 
        ? (sessionData.correctAttempts / sessionData.totalAttempts) * 100 
        : 0;

      // Calculate new average accuracy
      const sessions = await db.learningSessions.findTodaysSessions(userId);
      const totalAccuracy = sessions.reduce((sum, s) => sum + (s.accuracy_rate || 0), 0);
      const avgAccuracy = sessions.length > 0 ? totalAccuracy / sessions.length : accuracy;

      await db.supabase
        .from('training_stats')
        .update({
          total_minutes: stats.total_minutes + Math.floor(sessionData.duration / 60),
          average_accuracy: avgAccuracy,
          last_training_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Failed to update training stats:', error);
    }
  }
}

export const refactoredProgressService = new RefactoredProgressService();