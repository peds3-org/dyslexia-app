import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Tables, TablesInsert } from '../../../../types/supabase';
import { OfflineFirstDataAccess, OfflineFirstOptions } from '../base';
import { DatabaseError, DatabaseErrorCode } from '../../errors';

type LearningSession = Tables<'learning_sessions'>;
type LearningSessionInsert = TablesInsert<'learning_sessions'>;

export class OfflineLearningSessionRepository extends OfflineFirstDataAccess<LearningSession> {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, 'learning_sessions');
  }

  async create(
    session: LearningSessionInsert,
    options: OfflineFirstOptions = { localOnly: true } // Default to local-only for game play
  ): Promise<LearningSession> {
    const validUserId = this.validateUserId(session.user_id);
    
    // Generate a local ID if not provided
    const sessionId = session.id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullSession: LearningSession = {
      id: sessionId,
      user_id: validUserId,
      session_date: session.session_date || new Date().toISOString(),
      duration_seconds: session.duration_seconds || 0,
      characters_practiced: session.characters_practiced || 0,
      correct_attempts: session.correct_attempts || 0,
      total_attempts: session.total_attempts || 0,
      accuracy_rate: session.accuracy_rate || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      stage: session.stage || 'beginner',
      session_data: session.session_data || null,
      completed_at: null,
      character_data: session.character_data || null,
      session_type: session.session_type || null
    };

    return this.saveOfflineFirst(
      sessionId,
      fullSession,
      validUserId,
      'create',
      options
    );
  }

  async complete(
    sessionId: string,
    userId: string,
    stats: {
      duration_seconds: number;
      correct_attempts: number;
      total_attempts: number;
      character_data?: any;
    },
    options: OfflineFirstOptions = { localOnly: true }
  ): Promise<LearningSession> {
    const validUserId = this.validateUserId(userId);
    
    // Get existing session
    const existingSession = await this.findById(sessionId, validUserId, { localOnly: true });
    
    if (!existingSession) {
      throw new DatabaseError('Session not found', DatabaseErrorCode.NOT_FOUND);
    }

    const accuracy = stats.total_attempts > 0 
      ? (stats.correct_attempts / stats.total_attempts) * 100 
      : 0;

    const updatedSession: LearningSession = {
      ...existingSession,
      ...stats,
      accuracy_rate: accuracy,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return this.saveOfflineFirst(
      sessionId,
      updatedSession,
      validUserId,
      'update',
      options
    );
  }

  async findById(
    sessionId: string,
    userId: string,
    options: OfflineFirstOptions = {}
  ): Promise<LearningSession | null> {
    const validUserId = this.validateUserId(userId);

    return this.readOfflineFirst<LearningSession>(
      sessionId,
      validUserId,
      async () => {
        const { data, error } = await this.supabase
          .from('learning_sessions')
          .select('*')
          .eq('id', sessionId)
          .eq('user_id', validUserId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return null;
          }
          throw error;
        }

        return data;
      },
      options
    );
  }

  async findTodaysSessions(
    userId: string,
    options: OfflineFirstOptions = {}
  ): Promise<LearningSession[]> {
    const validUserId = this.validateUserId(userId);

    return this.readAllOfflineFirst<LearningSession>(
      validUserId,
      async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { data, error } = await this.supabase
          .from('learning_sessions')
          .select('*')
          .eq('user_id', validUserId)
          .gte('session_date', today.toISOString())
          .lt('session_date', tomorrow.toISOString())
          .order('session_date', { ascending: false });

        if (error) throw error;
        return data || [];
      },
      options
    );
  }

  async getRecentSessions(
    userId: string,
    limit: number = 10,
    options: OfflineFirstOptions = {}
  ): Promise<LearningSession[]> {
    const validUserId = this.validateUserId(userId);
    
    // For local-only mode, get all local data and sort/limit
    if (options.localOnly) {
      const allSessions = await this.readAllOfflineFirst<LearningSession>(
        validUserId,
        async () => [],
        options
      );
      
      return allSessions
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, limit);
    }

    return this.readAllOfflineFirst<LearningSession>(
      validUserId,
      async () => {
        const { data, error } = await this.supabase
          .from('learning_sessions')
          .select('*')
          .eq('user_id', validUserId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return data || [];
      },
      options
    );
  }

  protected async syncToSupabase(data: LearningSession, operation: 'create' | 'update'): Promise<LearningSession> {
    if (operation === 'create') {
      // Remove local ID prefix if present
      const cleanData = { ...data };
      if (cleanData.id?.startsWith('local_')) {
        delete (cleanData as any).id;
      }

      const { data: result, error } = await this.supabase
        .from('learning_sessions')
        .insert(cleanData)
        .select()
        .single();

      if (error) throw error;
      return result;
    } else {
      const { data: result, error } = await this.supabase
        .from('learning_sessions')
        .upsert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    }
  }
}