import { supabase } from '../lib/supabase';
import { TrainingProgress } from '../types/progress';
import authService from './authService';

class ProgressService {
  async initialize(): Promise<void> {
    // 初期化処理
    console.log('ProgressService initialized');
  }

  // 進捗の取得
  async getProgress(userId?: string): Promise<TrainingProgress | null> {
    if (!userId) {
      return this.getDemoProgress();
    }

    try {
      const { data: statsData, error: statsError } = await supabase
        .from('training_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (statsError) {
        console.error('training_stats取得エラー:', statsError);
        return null;
      }

      const { data: stateData, error: stateError } = await supabase
        .from('user_state')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (stateError) {
        console.error('user_state取得エラー:', stateError);
        return null;
      }

      return {
        userId,
        currentDay: this.calculateCurrentDay(statsData.created_at),
        startDate: new Date(statsData.created_at),
        lastTrainingDate: new Date(statsData.last_training_date),
        totalStudyMinutes: statsData.total_minutes,
        averageAccuracy: statsData.average_accuracy,
        streakCount: statsData.streak_count,
        longestStreak: statsData.longest_streak,
        perfectDays: statsData.perfect_days,
        rank: statsData.rank,
        experience: statsData.experience,
        level: statsData.level,
        collectedMojitama: [],
        unlockedSkills: [],
        avatarItems: {},
        dailyProgress: {
          completedMinutes: 0,
          challengesCompleted: [],
          specialAchievements: []
        },
        daysCompleted: this.calculateDaysCompleted(statsData.created_at),
        currentStreak: statsData.streak_count,
        totalPracticeTime: statsData.total_minutes
      };
    } catch (error) {
      console.error('進捗データ取得エラー:', error);
      return null;
    }
  }

  private getDemoProgress(): TrainingProgress {
    return {
      userId: 'demo',
      currentDay: 1,
      startDate: new Date(),
      lastTrainingDate: new Date(),
      totalStudyMinutes: 0,
      averageAccuracy: 0,
      streakCount: 0,
      longestStreak: 0,
      perfectDays: 0,
      rank: '下忍',
      experience: 0,
      level: 1,
      collectedMojitama: [],
      unlockedSkills: [],
      avatarItems: {},
      dailyProgress: {
        completedMinutes: 0,
        challengesCompleted: [],
        specialAchievements: []
      },
      daysCompleted: 0,
      currentStreak: 0,
      totalPracticeTime: 0
    };
  }

  private calculateCurrentDay(startDate: string): number {
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private calculateDaysCompleted(startDate: string): number {
    return this.calculateCurrentDay(startDate);
  }

  // 進捗の更新
  async updateProgress(userId: string, updates: Partial<TrainingProgress>): Promise<void> {
    try {
      console.log('進捗更新処理開始:', { userId, updates });
      
      // 既存のデータを取得
      const { data: existingStats, error: fetchError } = await supabase
        .from('training_stats')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('既存データ取得エラー:', fetchError);
        throw fetchError;
      }
      
      const statsUpdates: any = {};
      const stateUpdates: any = {};

      if (updates.totalStudyMinutes !== undefined) {
        // 既存の値に加算する
        statsUpdates.total_minutes = (existingStats?.total_minutes || 0) + updates.totalStudyMinutes;
      }
      if (updates.lastTrainingDate) {
        statsUpdates.last_training_date = updates.lastTrainingDate.toISOString();
      }
      if (updates.streakCount !== undefined) {
        statsUpdates.streak_count = updates.streakCount;
      }
      if (updates.averageAccuracy !== undefined) {
        statsUpdates.average_accuracy = updates.averageAccuracy;
      }
      if (updates.experience !== undefined) {
        statsUpdates.experience = updates.experience;
      }
      if (updates.level !== undefined) {
        statsUpdates.level = updates.level;
      }

      if (Object.keys(statsUpdates).length > 0) {
        // データが存在するかどうかで処理を分岐
        let statsResult;
        if (existingStats) {
          console.log('既存データ更新:', statsUpdates);
          statsUpdates.updated_at = new Date().toISOString();
          statsResult = await supabase
            .from('training_stats')
            .update(statsUpdates)
            .eq('user_id', userId);
        } else {
          console.log('新規データ作成:', statsUpdates);
          statsUpdates.user_id = userId;
          statsUpdates.created_at = new Date().toISOString();
          statsUpdates.updated_at = new Date().toISOString();
          statsResult = await supabase
            .from('training_stats')
            .insert(statsUpdates);
        }

        if (statsResult.error) {
          console.error('training_stats更新エラー:', statsResult.error);
          throw statsResult.error;
        }
        
        console.log('training_stats更新成功');
      }

      if (Object.keys(stateUpdates).length > 0) {
        // user_stateテーブルも同様に処理
        const { data: existingState, error: stateFetchError } = await supabase
          .from('user_state')
          .select('*')
          .eq('user_id', userId)
          .single();
          
        if (stateFetchError && stateFetchError.code !== 'PGRST116') {
          console.error('既存state取得エラー:', stateFetchError);
          throw stateFetchError;
        }
        
        let stateResult;
        stateUpdates.user_id = userId;
        stateUpdates.updated_at = new Date().toISOString();
        
        if (existingState) {
          stateResult = await supabase
            .from('user_state')
            .update(stateUpdates)
            .eq('user_id', userId);
        } else {
          stateUpdates.created_at = new Date().toISOString();
          stateResult = await supabase
            .from('user_state')
            .insert(stateUpdates);
        }

        if (stateResult.error) {
          console.error('user_state更新エラー:', stateResult.error);
          throw stateResult.error;
        }
        
        console.log('user_state更新成功');
      }
      
      console.log('進捗更新完了:', userId);
    } catch (error) {
      console.error('進捗更新処理エラー:', error);
      throw error;
    }
  }

  // 学習時間の記録
  async recordStudyTime(userId: string, minutes: number): Promise<void> {
    const { data: stats } = await supabase
      .from('training_stats')
      .select('total_minutes')
      .eq('user_id', userId)
      .single();

    const totalMinutes = (stats?.total_minutes || 0) + minutes;

    await this.updateProgress(userId, {
      totalStudyMinutes: totalMinutes,
      lastTrainingDate: new Date()
    });
  }

  // ストリークの更新
  async updateStreak(userId: string): Promise<void> {
    const { data: stats } = await supabase
      .from('training_stats')
      .select('streak_count, last_training_date, longest_streak')
      .eq('user_id', userId)
      .single();

    if (!stats) {
      return;
    }

    const lastTraining = stats.last_training_date ? new Date(stats.last_training_date) : new Date();
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - lastTraining.getTime()) / (1000 * 60 * 60 * 24));

    let newStreak = stats.streak_count || 0;
    if (diffDays === 1) {
      newStreak += 1;
      // 最長ストリークの更新
      if (newStreak > (stats.longest_streak || 0)) {
        await supabase
          .from('training_stats')
          .update({ longest_streak: newStreak })
          .eq('user_id', userId);
      }
    } else if (diffDays > 1) {
      newStreak = 1;
    }

    await this.updateProgress(userId, {
      streakCount: newStreak,
      lastTrainingDate: new Date()
    });
  }

  // セッション状態の更新
  async updateSessionState(userId: string, stageType: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_state')
        .update({
          current_stage: stageType,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('セッション状態の更新に失敗しました:', error);
        throw error;
      }

      console.log('セッション状態を更新しました:', { userId, stageType });
    } catch (error) {
      console.error('セッション状態の更新エラー:', error);
      throw error;
    }
  }

  // セッション状態のクリア
  async clearSessionState(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_state')
        .update({
          current_stage: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('セッション状態のクリアに失敗しました:', error);
        throw error;
      }

      console.log('セッション状態をクリアしました:', { userId });
    } catch (error) {
      console.error('セッション状態のクリアエラー:', error);
      throw error;
    }
  }

  // セッション状態の取得
  async getSessionState(userId: string): Promise<{ stageType: string | null; lastTime: Date | null }> {
    try {
      const { data, error } = await supabase
        .from('user_state')
        .select('current_stage, updated_at')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('セッション状態の取得に失敗しました:', error);
        throw error;
      }

      return {
        stageType: data?.current_stage || null,
        lastTime: data?.updated_at ? new Date(data.updated_at) : null
      };
    } catch (error) {
      console.error('セッション状態の取得エラー:', error);
      throw error;
    }
  }
}

const progressService = new ProgressService();
export default progressService; 