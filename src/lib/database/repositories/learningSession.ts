import { BaseDataAccess, QueryOptions } from '../base';
import { DatabaseError, DatabaseErrorCode } from '../errors';
import { Database, Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

type LearningSession = Tables<'learning_sessions'>;
type LearningSessionInsert = TablesInsert<'learning_sessions'>;
type LearningSessionUpdate = TablesUpdate<'learning_sessions'>;

export class LearningSessionRepository extends BaseDataAccess<LearningSession> {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, 'learning_sessions');
  }

  async create(session: LearningSessionInsert, options?: QueryOptions): Promise<LearningSession> {
    const validUserId = this.validateUserId(session.user_id);

    const result = await this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('learning_sessions')
        .insert({
          ...session,
          user_id: validUserId,
          session_date: session.session_date || new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new DatabaseError('Failed to create session', DatabaseErrorCode.UNKNOWN);

      return data;
    }, options);

    return result;
  }

  async update(sessionId: string, updates: LearningSessionUpdate, options?: QueryOptions): Promise<LearningSession> {
    const result = await this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('learning_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new DatabaseError('Session not found', DatabaseErrorCode.NOT_FOUND);

      return data;
    }, options);

    return result;
  }

  async complete(sessionId: string, stats: {
    duration_seconds: number;
    correct_attempts: number;
    total_attempts: number;
    character_data?: any;
  }, options?: QueryOptions): Promise<LearningSession> {
    const accuracy = stats.total_attempts > 0 
      ? (stats.correct_attempts / stats.total_attempts) * 100 
      : 0;

    return this.update(sessionId, {
      ...stats,
      accuracy_rate: accuracy,
      completed_at: new Date().toISOString()
    }, options);
  }

  async findTodaysSessions(userId: string, options?: QueryOptions): Promise<LearningSession[]> {
    const validUserId = this.validateUserId(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', validUserId)
        .gte('session_date', today.toISOString())
        .lt('session_date', tomorrow.toISOString())
        .order('session_date', { ascending: false })
        .limit(50); // Add pagination

      if (error) throw error;
      return data || [];
    }, options);

    return result;
  }

  async findByDateRange(
    userId: string, 
    startDate: Date, 
    endDate: Date, 
    options?: QueryOptions
  ): Promise<LearningSession[]> {
    const validUserId = this.validateUserId(userId);

    const result = await this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', validUserId)
        .gte('session_date', startDate.toISOString())
        .lte('session_date', endDate.toISOString())
        .order('session_date', { ascending: false });

      if (error) throw error;
      return data || [];
    }, options);

    return result;
  }

  async getSessionStats(userId: string, days: number = 7, options?: QueryOptions): Promise<{
    totalSessions: number;
    totalDuration: number;
    averageAccuracy: number;
    charactersLearned: number;
  }> {
    const validUserId = this.validateUserId(userId);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sessions = await this.findByDateRange(validUserId, startDate, new Date(), options);

    const stats = sessions.reduce((acc, session) => ({
      totalSessions: acc.totalSessions + 1,
      totalDuration: acc.totalDuration + (session.duration_seconds || 0),
      totalAccuracy: acc.totalAccuracy + (session.accuracy_rate || 0),
      charactersLearned: acc.charactersLearned + (session.characters_practiced || 0)
    }), {
      totalSessions: 0,
      totalDuration: 0,
      totalAccuracy: 0,
      charactersLearned: 0
    });

    return {
      totalSessions: stats.totalSessions,
      totalDuration: stats.totalDuration,
      averageAccuracy: stats.totalSessions > 0 ? stats.totalAccuracy / stats.totalSessions : 0,
      charactersLearned: stats.charactersLearned
    };
  }

  async syncOfflineData(): Promise<void> {
    // Implement offline sync logic
    // For now, just clear the cache
    await this.clearCache();
  }
}