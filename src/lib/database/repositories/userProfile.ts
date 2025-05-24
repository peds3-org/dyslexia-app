import { BaseDataAccess, QueryOptions } from '../base';
import { DatabaseError, DatabaseErrorCode } from '../errors';
import { Database, Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

type UserProfile = Tables<'user_profiles'>;
type UserProfileInsert = TablesInsert<'user_profiles'>;
type UserProfileUpdate = TablesUpdate<'user_profiles'>;

export class UserProfileRepository extends BaseDataAccess<UserProfile> {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, 'user_profiles');
  }

  async findByUserId(userId: string, options?: QueryOptions): Promise<UserProfile | null> {
    const validUserId = this.validateUserId(userId);
    const cacheKey = `user_${validUserId}`;

    // Check cache first
    if (options?.useCache) {
      const cached = await this.getCachedData<UserProfile>(cacheKey);
      if (cached) return cached;
    }

    const result = await this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', validUserId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    }, options);

    // Cache the result
    if (result && options?.useCache) {
      await this.setCachedData(cacheKey, result, options.cacheDuration);
    }

    return result;
  }

  async create(profile: UserProfileInsert, options?: QueryOptions): Promise<UserProfile> {
    const validUserId = this.validateUserId(profile.user_id);

    const result = await this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .insert({
          ...profile,
          user_id: validUserId
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new DatabaseError('Failed to create profile', DatabaseErrorCode.UNKNOWN);

      return data;
    }, options);

    // Clear cache after create
    await this.clearCache();

    return result;
  }

  async update(userId: string, updates: UserProfileUpdate, options?: QueryOptions): Promise<UserProfile> {
    const validUserId = this.validateUserId(userId);

    const result = await this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', validUserId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new DatabaseError('Profile not found', DatabaseErrorCode.NOT_FOUND);

      return data;
    }, options);

    // Clear cache after update
    await this.clearCache();

    return result;
  }

  async upsert(profile: UserProfileInsert, options?: QueryOptions): Promise<UserProfile> {
    const validUserId = this.validateUserId(profile.user_id);

    const result = await this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .upsert({
          ...profile,
          user_id: validUserId,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new DatabaseError('Failed to upsert profile', DatabaseErrorCode.UNKNOWN);

      return data;
    }, options);

    // Clear cache after upsert
    await this.clearCache();

    return result;
  }

  async incrementCoins(userId: string, amount: number, options?: QueryOptions): Promise<number> {
    const validUserId = this.validateUserId(userId);

    if (amount === 0) return 0;

    const result = await this.executeWithRetry(async () => {
      // First get current coins
      const { data: profile, error: fetchError } = await this.supabase
        .from('user_profiles')
        .select('coins')
        .eq('user_id', validUserId)
        .single();

      if (fetchError) throw fetchError;
      if (!profile) throw new DatabaseError('Profile not found', DatabaseErrorCode.NOT_FOUND);

      const newCoins = Math.max(0, profile.coins + amount);

      // Update coins
      const { error: updateError } = await this.supabase
        .from('user_profiles')
        .update({ 
          coins: newCoins,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', validUserId);

      if (updateError) throw updateError;

      return newCoins;
    }, options);

    // Clear cache after update
    await this.clearCache();

    return result;
  }

  async syncOfflineData(): Promise<void> {
    // Implement offline sync logic here
    // For now, just clear the cache to ensure fresh data
    await this.clearCache();
  }
}