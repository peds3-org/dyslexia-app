import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Tables } from '@src/types/supabase';
import { OfflineFirstDataAccess, OfflineFirstOptions } from '../base';

type CharacterMastery = Tables<'character_mastery'>;

export class OfflineCharacterMasteryRepository extends OfflineFirstDataAccess<CharacterMastery> {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, 'character_mastery');
  }

  async updateMastery(
    userId: string,
    character: string,
    updates: {
      attempts?: number;
      successes?: number;
      stage?: string;
      isSuccess?: boolean;
      aiEvaluation?: any;
    },
    options: OfflineFirstOptions = { localOnly: true } // Default to local-only for game play
  ): Promise<CharacterMastery> {
    const validUserId = this.validateUserId(userId);
    const key = `${character}_${updates.stage || 'beginner'}`;

    // Get existing mastery or create new one
    let mastery = await this.findByUserAndCharacter(
      validUserId, 
      character, 
      { localOnly: true }
    );

    const now = new Date().toISOString();

    if (!mastery) {
      // Create new mastery
      mastery = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: validUserId,
        character,
        stage: updates.stage || 'beginner',
        attempts: updates.attempts || 1,
        successes: updates.isSuccess ? 1 : 0,
        mastery_level: 0,
        mastery_count: 0,
        is_mastered: false,
        unlocked_at: now,
        last_success_time: updates.isSuccess ? now : null,
        ai_evaluation_history: updates.aiEvaluation ? [updates.aiEvaluation] : []
      };
    } else {
      // Update existing mastery
      mastery = {
        ...mastery,
        attempts: (mastery.attempts || 0) + (updates.attempts || 1),
        successes: (mastery.successes || 0) + (updates.isSuccess ? 1 : 0),
        last_success_time: updates.isSuccess ? now : mastery.last_success_time,
        mastery_count: updates.isSuccess 
          ? (mastery.mastery_count || 0) + 1 
          : mastery.mastery_count || 0,
        is_mastered: updates.isSuccess && (mastery.mastery_count || 0) + 1 >= 3,
        ai_evaluation_history: updates.aiEvaluation 
          ? [...(mastery.ai_evaluation_history as any[] || []), updates.aiEvaluation]
          : mastery.ai_evaluation_history
      };
    }

    return this.saveOfflineFirst(
      key,
      mastery,
      validUserId,
      mastery.id?.startsWith('local_') ? 'create' : 'update',
      options
    );
  }

  async findByUserAndCharacter(
    userId: string,
    character: string,
    options: OfflineFirstOptions = {}
  ): Promise<CharacterMastery | null> {
    const validUserId = this.validateUserId(userId);
    
    // For offline-first, we need to check all local masteries
    if (options.localOnly) {
      const allMasteries = await this.findAllByUser(validUserId, options);
      return allMasteries.find(m => m.character === character) || null;
    }

    // Try to find by composite key
    const keys = [`${character}_beginner`, `${character}_intermediate`, `${character}_advanced`];
    
    for (const key of keys) {
      const mastery = await this.readOfflineFirst<CharacterMastery>(
        key,
        validUserId,
        async () => {
          const { data, error } = await this.supabase
            .from('character_mastery')
            .select('*')
            .eq('user_id', validUserId)
            .eq('character', character)
            .single();

          if (error && error.code !== 'PGRST116') {
            throw error;
          }

          return data;
        },
        options
      );

      if (mastery) return mastery;
    }

    return null;
  }

  async findAllByUser(
    userId: string,
    options: OfflineFirstOptions = {}
  ): Promise<CharacterMastery[]> {
    const validUserId = this.validateUserId(userId);

    return this.readAllOfflineFirst<CharacterMastery>(
      validUserId,
      async () => {
        const { data, error } = await this.supabase
          .from('character_mastery')
          .select('*')
          .eq('user_id', validUserId)
          .order('character', { ascending: true });

        if (error) throw error;
        return data || [];
      },
      options
    );
  }

  async getMasteredCharacters(
    userId: string,
    options: OfflineFirstOptions = {}
  ): Promise<string[]> {
    const allMasteries = await this.findAllByUser(userId, options);
    return allMasteries
      .filter(m => m.is_mastered)
      .map(m => m.character);
  }

  async getStageProgress(
    userId: string,
    stage: string,
    options: OfflineFirstOptions = {}
  ): Promise<{
    total: number;
    mastered: number;
    percentage: number;
  }> {
    const allMasteries = await this.findAllByUser(userId, options);
    const stageMasteries = allMasteries.filter(m => m.stage === stage);
    
    const total = stageMasteries.length;
    const mastered = stageMasteries.filter(m => m.is_mastered).length;
    const percentage = total > 0 ? (mastered / total) * 100 : 0;

    return { total, mastered, percentage };
  }

  protected async syncToSupabase(data: CharacterMastery, operation: 'create' | 'update'): Promise<CharacterMastery> {
    // Clean up local ID if present
    const cleanData = { ...data };
    if (cleanData.id?.startsWith('local_')) {
      delete (cleanData as any).id;
    }

    const { data: result, error } = await this.supabase
      .from('character_mastery')
      .upsert(cleanData, {
        onConflict: 'user_id,character'
      })
      .select()
      .single();

    if (error) throw error;
    return result;
  }
}