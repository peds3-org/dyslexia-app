import { supabase } from '@src/lib/supabase';
import { TrainingProgress } from '@src/types/progress';
import authService from './authService';

export type CharacterMastery = {
  id: string;
  user_id: string;
  character: string;
  stage: string;
  attempts: number;
  successes: number;
  mastery_count: number;
  is_mastered: boolean;
  last_success_time: string | null;
  ai_evaluation_history: any;
  created_at: string;
  updated_at: string;
};

export interface CharacterData {
  character: string;
  successful: boolean;
  total: number;
  responseTimeMs: number;
}

export type LearningSession = {
  id?: string;
  user_id: string;
  stage?: string;
  session_type: string;
  duration_seconds: number;
  started_at?: string;
  completed_at: string;
  total_attempts?: number;
  correct_attempts?: number;
  accuracy_rate?: number;
  character_data: CharacterData[];
  created_at?: string;
  updated_at?: string;
};

export type UserProfile = {
  id: string;
  user_id: string;
  display_name: string;
  character_level: string;
  character_exp: number;
  created_at: string;
  updated_at: string;
};

export type Recording = {
  id: string;
  user_id: string;
  session_id: string;
  character: string;
  stage: string;
  storage_url: string;
  ai_result: any;
  response_time_ms: number;
  created_at: string;
};

export interface LearningSessionData {
  sessionType: string;
  durationSeconds: number;
  character_data: CharacterData[];
}

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
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (stateError) {
        console.error('user_profiles取得エラー:', stateError);
        return null;
      }

      // マスターした文字を取得
      let collectedMojitama: string[] = [];
      try {
        const masteries = await this.getCharacterMasteries(userId);
        // is_masteredがtrueの文字だけをcollectedMojitamaに追加
        collectedMojitama = masteries
          .filter(mastery => mastery.is_mastered)
          .map(mastery => mastery.character);
        console.log('収集した文字:', collectedMojitama);
      } catch (error) {
        console.error('文字習熟度取得エラー:', error);
        // エラーが発生しても処理を続行
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
        collectedMojitama: collectedMojitama,
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
      
      // 変数宣言を最上位に移動
      const statsUpdates: any = {};
      const stateUpdates: any = {};
      
      // テーブルが存在しない場合のエラーハンドリング追加
      try {
        // 既存のデータを取得
        const { data: existingStats, error: fetchError } = await supabase
          .from('training_stats')
          .select('*')
          .eq('user_id', userId)
          .single();
          
        if (fetchError && fetchError.code !== 'PGRST116') {
          if (fetchError.code === '42P01') {
            // テーブルが存在しない場合はログを出力して処理を続行
            console.log('training_statsテーブルが存在しません。テーブル作成が必要です。');
            // 処理を続行（エラーをスローしない）
          } else {
            console.error('既存データ取得エラー:', fetchError);
            // その他のエラーの場合はスロー
            throw fetchError;
          }
        }
        
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
          try {
            const { error: updateStatsError } = await supabase
              .from('training_stats')
              .upsert({
                user_id: userId,
                ...statsUpdates
              });

            if (updateStatsError) {
              console.error('統計データ更新エラー:', updateStatsError);
              // エラーをスローするか、処理を続行するかはビジネスロジックによる
              // ここではログを残して処理を続行
            }
          } catch (error) {
            console.error('統計データ更新中の例外:', error);
            // テーブルが存在しない場合もここでキャッチして処理を続行
          }
        }
      } catch (statsError: any) {
        if (statsError.code === '42P01') {
          // テーブルが存在しない場合はログのみ出力して続行
          console.log('training_statsテーブルが存在しません。後ほどデータを同期します。');
        } else {
          // その他のエラーはスロー
          throw statsError;
        }
      }

      try {
        if (Object.keys(stateUpdates).length > 0) {
          try {
            stateUpdates.updated_at = new Date().toISOString();
            const { error: profileUpdateError } = await supabase
              .from('user_profiles')
              .update(stateUpdates)
              .eq('id', userId);

            if (profileUpdateError) {
              console.error('プロフィール更新エラー:', profileUpdateError);
              // エラーの種類に応じて処理を分岐
              if (profileUpdateError.code === '42P01') {
                // テーブルが存在しない場合
                console.log('user_profilesテーブルが存在しません。テーブル作成が必要です。');
              } else {
                // その他のエラーはスロー
                throw profileUpdateError;
              }
            }
          } catch (error) {
            console.error('プロフィール更新中の例外:', error);
            // エラー処理をここで行う
          }
        }
      } catch (stateError: any) {
        if (stateError.code === '42P01') {
          // テーブルが存在しない場合はログのみ出力
          console.log('user_profilesテーブルが存在しません。後ほどデータを同期します。');
        } else {
          // その他のエラーはスロー
          throw stateError;
        }
      }
      
      console.log('進捗更新完了:', userId);
    } catch (error: any) {
      if (error.code === '42P01') {
        // テーブルが存在しない場合は致命的エラーとしない
        console.log('データベーステーブルが存在しません。後ほどデータを同期します:', error.message);
        // エラーを再スローしない
        return;
      }
      console.error('進捗更新処理エラー:', error);
      // その他のエラーの場合はスロー
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
        .from('session_state')
        .upsert({
          user_id: userId,
          stage_type: stageType,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

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
        .from('session_state')
        .delete()
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
        .from('session_state')
        .select('stage_type, updated_at')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116はデータが見つからないエラー
        console.error('セッション状態の取得に失敗しました:', error);
        throw error;
      }

      return {
        stageType: data?.stage_type || null,
        lastTime: data?.updated_at ? new Date(data.updated_at) : null
      };
    } catch (error) {
      console.error('セッション状態の取得エラー:', error);
      throw error;
    }
  }

  /**
   * キャラクターの習熟度を更新する
   * @param userId ユーザーID
   * @param character 文字
   * @param successful 成功回数
   * @param total 総試行回数
   * @param responseTimeMs 反応時間（ミリ秒）
   */
  async updateCharacterMastery(userId: string, character: string, successful: number, total: number, responseTimeMs: number): Promise<void> {
    // Get existing mastery
    const { data: existing, error } = await supabase
      .from('character_mastery')
      .select('*')
      .eq('user_id', userId)
      .eq('character', character)
      .eq('stage', successful)
      .maybeSingle();
    if (error) throw error;
    let attempts = 1;
    let successes = successful ? 1 : 0;
    let mastery_count = successful ? 1 : 0;
    let is_mastered = false;
    let ai_evaluation_history = [successful];
    if (existing) {
      attempts = (existing.attempts || 0) + 1;
      successes = (existing.successes || 0) + (successful ? 1 : 0);
      mastery_count = (existing.mastery_count || 0) + (successful ? 1 : 0);
      is_mastered = mastery_count >= 3;
      ai_evaluation_history = [...(existing.ai_evaluation_history || []), successful];
    }
    const upsertData = {
      user_id: userId,
      character,
      stage: successful,
      attempts,
      successes,
      mastery_count,
      is_mastered,
      last_success_time: successful ? new Date().toISOString() : existing?.last_success_time || null,
      ai_evaluation_history,
      updated_at: new Date().toISOString(),
      created_at: existing?.created_at || new Date().toISOString(),
    };
    const { error: upsertError } = await supabase
      .from('character_mastery')
      .upsert([upsertData], { onConflict: 'user_id,character,stage' });
    if (upsertError) throw upsertError;
  }

  /**
   * ユーザーのキャラクター習熟度一覧を取得する
   * @param userId ユーザーID
   */
  async getCharacterMasteries(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('character_mastery')
        .select('*')
        .eq('user_id', userId)
        .order('mastery_level', { ascending: false });
      
      if (error) {
        console.error('マスタリー一覧取得エラー:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('マスタリー一覧取得処理エラー:', error);
      throw error;
    }
  }

  /**
   * ユーザーの学習セッション履歴を取得する
   * @param userId ユーザーID
   * @param limit 取得する件数
   */
  async getLearningSessionHistory(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('セッション履歴取得エラー:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('セッション履歴取得処理エラー:', error);
      throw error;
    }
  }

  /**
   * セッションの文字詳細を取得する
   * @param sessionId セッションID
   */
  async getSessionCharacterDetails(sessionId: string): Promise<any[]> {
    try {
      // session_character_details テーブルの代わりに learning_sessions テーブルを使用
      const { data, error } = await supabase
        .from('learning_sessions')
        .select('character_data')
        .eq('id', sessionId)
        .single();
      
      if (error) {
        console.error('セッション文字詳細取得エラー:', error);
        throw error;
      }
      
      // character_data カラムから直接データを取得（JSONBフィールド）
      if (data && data.character_data) {
        return data.character_data.map((item: CharacterData) => ({
          character: item.character,
          successful: item.successful,
          total: item.total,
          response_time_ms: item.responseTimeMs
        }));
      }
      
      return [];
    } catch (error) {
      console.error('セッション文字詳細取得処理エラー:', error);
      return []; // エラー時は空配列を返す
    }
  }

  /**
   * 特定の日の学習セッションを取得する
   * @param userId ユーザーID
   * @param date 日付（デフォルト: 今日）
   */
  async getTodaysSessions(userId: string, date: Date = new Date()): Promise<{
    sessions: any[];
    totalDuration: number;
    totalCharacters: number;
  }> {
    try {
      // 日付の開始と終了を設定
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // 当日のセッションを取得
      const { data, error } = await supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('本日のセッション取得エラー:', error);
        throw error;
      }
      
      // 合計学習時間（秒）と練習した文字数を計算
      const totalDuration = data?.reduce((sum, session) => sum + (session.duration_seconds || 0), 0) || 0;
      const totalCharacters = data?.reduce((sum, session) => sum + (session.characters_practiced || 0), 0) || 0;
      
      return {
        sessions: data || [],
        totalDuration,
        totalCharacters
      };
    } catch (error) {
      console.error('本日のセッション取得処理エラー:', error);
      return { sessions: [], totalDuration: 0, totalCharacters: 0 };
    }
  }

  /**
   * 最後のセッションとの時間差を取得する（同じ日の再開判定用）
   * @param userId ユーザーID
   */
  async getTimeSinceLastSession(userId: string): Promise<number> {
    try {
      // 最後のセッションを取得
      const { data, error } = await supabase
        .from('learning_sessions')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // セッションがない場合
          return Infinity;
        }
        console.error('最後のセッション取得エラー:', error);
        throw error;
      }
      
      if (!data) {
        return Infinity;
      }
      
      // 現在時刻との差を分で計算
      const lastSessionTime = new Date(data.created_at);
      const now = new Date();
      const diffMs = now.getTime() - lastSessionTime.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      return diffMinutes;
    } catch (error) {
      console.error('時間差取得エラー:', error);
      return Infinity;
    }
  }

  // log: Get all unmastered characters for a user and stage
  async getUnmasteredCharacters(userId: string, stage: string): Promise<CharacterMastery[]> {
    const { data, error } = await supabase
      .from('character_mastery')
      .select('*')
      .eq('user_id', userId)
      .eq('stage', stage)
      .eq('is_mastered', false);
    if (error) throw error;
    return data || [];
  }

  // 新スキーマでの学習セッション記録
  async recordLearningSession(
    userId: string,
    sessionData: LearningSessionData
  ): Promise<boolean> {
    try {
      console.log(`記録中: ユーザー ${userId} のセッションデータ`, sessionData);

      const session: LearningSession = {
        user_id: userId,
        session_type: sessionData.sessionType,
        duration_seconds: sessionData.durationSeconds,
        completed_at: new Date().toISOString(),
        character_data: sessionData.character_data
      };

      const { error } = await supabase.from('learning_sessions').insert(session);

      if (error) {
        if (error.code === '42P01') {
          // テーブルが存在しない場合
          console.log('learning_sessionsテーブルが存在しません。テーブル作成が必要です。');
          return true; // 処理を続行
        } else {
          console.error('学習セッション記録エラー:', error);
          return false;
        }
      }

      console.log('学習セッション記録成功');
      return true;
    } catch (error) {
      console.error('学習セッション記録中の例外:', error);
      return false;
    }
  }

  // log: Update user profile level/exp
  async updateUserLevel(userId: string, level: string, exp: number): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ character_level: level, character_exp: exp, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (error) throw error;
  }

  // log: Save a recording entry
  async saveRecording(userId: string, sessionId: string, character: string, stage: string, storageUrl: string, aiResult: any, responseTimeMs: number): Promise<void> {
    const { error } = await supabase
      .from('recordings')
      .insert([
        {
          user_id: userId,
          session_id: sessionId,
          character,
          stage,
          storage_url: storageUrl,
          ai_result: aiResult,
          response_time_ms: responseTimeMs,
          created_at: new Date().toISOString(),
        },
      ]);
    if (error) throw error;
  }

  // log: Get user profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) return null;
    return data;
  }

  // 学習ストリーク（連続学習日数）を取得
  async getStreak(userId: string): Promise<number> {
    try {
      // ユーザープロフィールから現在のストリークを取得
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('current_streak')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('ストリーク取得エラー:', error);
        return 0;
      }

      return profile?.current_streak || 0;
    } catch (error) {
      console.error('ストリーク取得エラー:', error);
      return 0;
    }
  }
}

const progressService = new ProgressService();
export default progressService; 