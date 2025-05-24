import { BaseDataAccess, QueryOptions } from '../base';
import { DatabaseError, DatabaseErrorCode } from '../errors';
import { Database, Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

type CharacterMastery = Tables<'character_mastery'>;
type CharacterMasteryInsert = TablesInsert<'character_mastery'>;
type CharacterMasteryUpdate = TablesUpdate<'character_mastery'>;

export class CharacterMasteryRepository extends BaseDataAccess<CharacterMastery> {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, 'character_mastery');
  }

  async findByUserAndCharacter(
    userId: string, 
    character: string, 
    options?: QueryOptions
  ): Promise<CharacterMastery | null> {
    const validUserId = this.validateUserId(userId);
    const cacheKey = `${validUserId}_${character}`;

    if (options?.useCache) {
      const cached = await this.getCachedData<CharacterMastery>(cacheKey);
      if (cached) return cached;
    }

    const result = await this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('character_mastery')
        .select('*')
        .eq('user_id', validUserId)
        .eq('character', character)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    }, options);

    if (result && options?.useCache) {
      await this.setCachedData(cacheKey, result, options.cacheDuration);
    }

    return result;
  }

  async findAllByUser(userId: string, options?: QueryOptions): Promise<CharacterMastery[]> {
    const validUserId = this.validateUserId(userId);
    const cacheKey = `all_${validUserId}`;

    if (options?.useCache) {
      const cached = await this.getCachedData<CharacterMastery[]>(cacheKey);
      if (cached) return cached;
    }

    const result = await this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('character_mastery')
        .select('*')
        .eq('user_id', validUserId)
        .order('character', { ascending: true });

      if (error) throw error;
      return data || [];
    }, options);

    if (options?.useCache) {
      await this.setCachedData(cacheKey, result, options.cacheDuration);
    }

    return result;
  }

  async upsertMastery(
    userId: string,
    character: string,
    updates: {
      attempts?: number;
      successes?: number;
      stage?: string;
      isSuccess?: boolean;
      aiEvaluation?: any;
    },
    options?: QueryOptions
  ): Promise<CharacterMastery> {
    const validUserId = this.validateUserId(userId);

    const result = await this.executeWithRetry(async () => {
      // Use Supabase upsert with onConflict
      const masteryData: CharacterMasteryInsert = {
        user_id: validUserId,
        character,
        stage: updates.stage || 'beginner',
        attempts: updates.attempts || 1,
        successes: updates.successes || (updates.isSuccess ? 1 : 0),
        mastery_level: 0,
        mastery_count: 0,
        is_mastered: false
      };

      if (updates.isSuccess) {
        masteryData.last_success_time = new Date().toISOString();
      }

      if (updates.aiEvaluation) {
        masteryData.ai_evaluation_history = [updates.aiEvaluation];
      }

      const { data, error } = await this.supabase
        .from('character_mastery')
        .upsert(masteryData, {
          onConflict: 'user_id,character',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new DatabaseError('Failed to upsert mastery', DatabaseErrorCode.UNKNOWN);

      // If it's an update and success, increment the counters
      if (updates.isSuccess && data.attempts > 1) {
        const { data: updated, error: updateError } = await this.supabase
          .from('character_mastery')
          .update({
            attempts: data.attempts + 1,
            successes: data.successes + 1,
            last_success_time: new Date().toISOString(),
            mastery_count: data.mastery_count + 1,
            is_mastered: data.mastery_count + 1 >= 3,
            ai_evaluation_history: updates.aiEvaluation 
              ? [...(data.ai_evaluation_history as any[] || []), updates.aiEvaluation]
              : data.ai_evaluation_history
          })
          .eq('id', data.id)
          .select()
          .single();

        if (updateError) throw updateError;
        return updated || data;
      }

      return data;
    }, options);

    // Clear cache after update
    await this.clearCache();

    return result;
  }

  async getMasteredCharacters(userId: string, options?: QueryOptions): Promise<string[]> {
    const validUserId = this.validateUserId(userId);

    const result = await this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('character_mastery')
        .select('character')
        .eq('user_id', validUserId)
        .eq('is_mastered', true);

      if (error) throw error;
      return data?.map(item => item.character) || [];
    }, options);

    return result;
  }

  async getStageProgress(userId: string, stage: string, options?: QueryOptions): Promise<{
    total: number;
    mastered: number;
    percentage: number;
  }> {
    const validUserId = this.validateUserId(userId);

    const result = await this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('character_mastery')
        .select('character, is_mastered')
        .eq('user_id', validUserId)
        .eq('stage', stage);

      if (error) throw error;

      const total = data?.length || 0;
      const mastered = data?.filter(item => item.is_mastered).length || 0;
      const percentage = total > 0 ? (mastered / total) * 100 : 0;

      return { total, mastered, percentage };
    }, options);

    return result;
  }

  async syncOfflineData(): Promise<void> {
    // Implement offline sync logic
    await this.clearCache();
  }
}