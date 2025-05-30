import { supabase } from '@src/lib/supabase';
import { TrainingProgress } from '@src/types/progress';
import authService from './authService';

// 新しいデータベース構造に基づく型定義
export type CharacterProgress = {
  user_id: string;
  character: string;
  total_attempts: number;
  total_correct: number;
  cumulative_correct_reads: number;
  current_mojitama_color: 'none' | 'green' | 'blue' | 'red';
  highest_mojitama_color: 'none' | 'green' | 'blue' | 'red';
  first_attempted_at: string | null;
  last_practiced_at: string | null;
  last_success_at: string | null;
  recent_ai_evaluations: any[];
  created_at: string;
  updated_at: string;
};

export type MojitamaCollection = {
  user_id: string;
  character: string;
  current_color: 'none' | 'green' | 'blue' | 'red';
  highest_color: 'none' | 'green' | 'blue' | 'red';
  shine_level: number;
  special_variant: 'normal' | 'shiny' | 'rainbow' | 'golden';
  obtained_date: string | null;
  obtained_method: string | null;
  float_animation: boolean;
  rotation_speed: number;
  particle_effects: any;
  shared_with_oni: boolean;
  oni_reaction: string | null;
  created_at: string;
  updated_at: string;
};

export type StoryProgress = {
  user_id: string;
  current_chapter: number;
  current_scene: string | null;
  scene_progress: number;
  oni_level: number;
  oni_learned_characters: string[];
  oni_mood: 'confused' | 'trying' | 'happy' | 'excited';
  scroll_return_progress: number;
  unlocked_scenes: any[];
  special_events_triggered: any[];
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
  client_session_id?: string;
  session_date?: string;
  stage?: string;
  session_type: string;
  duration_seconds: number;
  started_at?: string;
  completed_at?: string;
  total_attempts?: number;
  correct_attempts?: number;
  accuracy_rate?: number;
  characters_practiced?: string[];
  character_data?: CharacterData[];
  app_version?: string;
  device_info?: any;
  created_at?: string;
  synced_at?: string;
};

export type UserProfile = {
  id: string;
  user_id: string;
  display_name: string;
  birthday?: string | null;
  gender?: string | null;
  avatar_url?: string | null;
  character_type: string;
  character_level: string;
  is_anonymous: boolean;
  character_exp: number;
  current_level: string;
  coins: number;
  created_at: string;
  updated_at: string;
};

export type NinjaRank = {
  user_id: string;
  current_rank: number;
  rank_title: string;
  total_exp: number;
  exp_to_next_level: number;
  unlocked_abilities: any[];
  unlocked_animations: any[];
  unlocked_sounds: any[];
  ninja_color: string;
  special_effects: any;
  created_at: string;
  updated_at: string;
};

export interface LearningSessionData {
  sessionType: string;
  durationSeconds: number;
  character_data: CharacterData[];
}

class ProgressService {
  async initialize(): Promise<void> {
    console.log('ProgressService initialized');
  }

  // 進捗の取得（新しいテーブル構造に対応）
  async getProgress(userId?: string): Promise<TrainingProgress | null> {
    if (!userId) {
      return this.getDemoProgress();
    }

    try {
      // ユーザープロファイルを取得
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('user_profiles取得エラー:', profileError);
        return null;
      }

      // 忍者ランクを取得
      const { data: ninjaRankData, error: ninjaRankError } = await supabase
        .from('ninja_ranks')
        .select('*')
        .eq('user_id', userId)
        .single();

      // ストーリー進捗を取得
      const { data: storyData, error: storyError } = await supabase
        .from('story_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      // 文字別進捗を取得
      const { data: characterProgressData, error: characterProgressError } = await supabase
        .from('character_progress')
        .select('*')
        .eq('user_id', userId);

      if (characterProgressError) {
        console.error('character_progress取得エラー:', characterProgressError);
      }

      // もじ玉コレクションを取得
      const { data: mojitamaData, error: mojitamaError } = await supabase
        .from('mojitama_collection')
        .select('*')
        .eq('user_id', userId);

      // 学習セッションの統計を計算
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('session_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('session_date', { ascending: false });

      // 統計を計算
      const totalMinutes = sessionsData?.reduce((sum, session) => 
        sum + (session.duration_seconds || 0) / 60, 0) || 0;
      
      const averageAccuracy = sessionsData?.length > 0
        ? sessionsData.reduce((sum, session) => sum + (session.accuracy_rate || 0), 0) / sessionsData.length
        : 0;

      // 文字別マスター数を計算
      const masteredCount = characterProgressData?.filter(cp => 
        cp.current_mojitama_color === 'red'
      ).length || 0;

      const progress: TrainingProgress = {
        totalMinutes: Math.round(totalMinutes),
        streakCount: this.calculateStreak(sessionsData || []),
        longestStreak: this.calculateLongestStreak(sessionsData || []),
        level: profileData?.current_level || 'beginner',
        experience: ninjaRankData?.total_exp || 0,
        stageProgress: this.calculateStageProgress(characterProgressData || []),
        averageAccuracy: Math.round(averageAccuracy),
        charactersLearned: characterProgressData?.length || 0,
        charactersMastered: masteredCount,
        lastTrainingDate: sessionsData?.[0]?.session_date || null,
        storyProgress: storyData?.scene_progress || 0,
        achievementsUnlocked: 0, // 実績システムから取得する場合は追加実装
        itemsCollected: mojitamaData?.length || 0
      };

      return progress;
    } catch (error) {
      console.error('進捗取得エラー:', error);
      return null;
    }
  }

  // 連続日数を計算
  private calculateStreak(sessions: LearningSession[]): number {
    if (sessions.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let currentDate = new Date(today);

    for (let i = 0; i < 30; i++) { // 最大30日分チェック
      const dateStr = currentDate.toISOString().split('T')[0];
      const hasSession = sessions.some(session => 
        session.session_date?.startsWith(dateStr)
      );

      if (hasSession) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (i === 0) {
        // 今日練習していない場合は昨日をチェック
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  // 最長連続日数を計算
  private calculateLongestStreak(sessions: LearningSession[]): number {
    if (sessions.length === 0) return 0;

    // セッションを日付でグループ化
    const sessionDates = new Set(
      sessions.map(s => s.session_date?.split('T')[0]).filter(Boolean)
    );

    const sortedDates = Array.from(sessionDates).sort();
    
    let longestStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return longestStreak;
  }

  // ステージ進捗を計算
  private calculateStageProgress(characterProgress: CharacterProgress[]): number {
    if (characterProgress.length === 0) return 0;
    
    const totalCharacters = 106; // ひらがな全文字数
    const masteredCount = characterProgress.filter(cp => 
      cp.current_mojitama_color === 'red'
    ).length;
    
    return Math.round((masteredCount / totalCharacters) * 100);
  }

  // デモ用の進捗データ
  private getDemoProgress(): TrainingProgress {
    return {
      totalMinutes: 45,
      streakCount: 3,
      longestStreak: 7,
      level: 'beginner',
      experience: 250,
      stageProgress: 35,
      averageAccuracy: 78,
      charactersLearned: 15,
      charactersMastered: 5,
      lastTrainingDate: new Date().toISOString(),
      storyProgress: 25,
      achievementsUnlocked: 3,
      itemsCollected: 8
    };
  }

  // 文字の学習を記録（新しいテーブル構造に対応）
  async recordCharacterPractice(
    character: string,
    isSuccess: boolean,
    aiEvaluation?: any,
    sessionId?: string
  ): Promise<void> {
    const userId = authService.getCurrentUserId();
    if (!userId) {
      console.error('ユーザーIDが取得できません');
      return;
    }

    try {
      // AI判定結果を記録
      if (aiEvaluation) {
        const { error: aiError } = await supabase
          .from('ai_classifications')
          .insert({
            user_id: userId,
            character,
            session_id: sessionId,
            classification_result: aiEvaluation,
            confidence: aiEvaluation.confidence || aiEvaluation.top3?.[0]?.probability,
            is_correct: isSuccess,
            processing_time_ms: aiEvaluation.processingTime
          });

        if (aiError) {
          console.error('AI判定結果記録エラー:', aiError);
        }
      }

      // character_progressは ai_classifications へのINSERTトリガーで自動更新される
      // ただし、セッションIDがない場合は手動で更新
      if (!sessionId) {
        await this.updateCharacterProgress(userId, character, isSuccess, aiEvaluation);
      }
    } catch (error) {
      console.error('文字練習記録エラー:', error);
    }
  }

  // 文字進捗を手動更新（トリガーが動作しない場合のフォールバック）
  private async updateCharacterProgress(
    userId: string,
    character: string,
    isSuccess: boolean,
    aiEvaluation?: any
  ): Promise<void> {
    const { data: existing, error: fetchError } = await supabase
      .from('character_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('character', character)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('character_progress取得エラー:', fetchError);
      return;
    }

    if (!existing) {
      // 新規作成
      const { error: insertError } = await supabase
        .from('character_progress')
        .insert({
          user_id: userId,
          character,
          total_attempts: 1,
          total_correct: isSuccess ? 1 : 0,
          cumulative_correct_reads: isSuccess ? 1 : 0,
          current_mojitama_color: isSuccess ? 'green' : 'none',
          highest_mojitama_color: isSuccess ? 'green' : 'none',
          first_attempted_at: new Date().toISOString(),
          last_practiced_at: new Date().toISOString(),
          last_success_at: isSuccess ? new Date().toISOString() : null,
          recent_ai_evaluations: aiEvaluation ? [aiEvaluation] : []
        });

      if (insertError) {
        console.error('character_progress作成エラー:', insertError);
      }
    } else {
      // 既存データを更新
      const updates: any = {
        total_attempts: existing.total_attempts + 1,
        last_practiced_at: new Date().toISOString()
      };

      if (isSuccess) {
        updates.total_correct = existing.total_correct + 1;
        updates.cumulative_correct_reads = existing.cumulative_correct_reads + 1;
        updates.last_success_at = new Date().toISOString();
      }

      if (aiEvaluation) {
        updates.recent_ai_evaluations = [
          ...(existing.recent_ai_evaluations || []),
          aiEvaluation
        ].slice(-10); // 最新10件のみ保持
      }

      const { error: updateError } = await supabase
        .from('character_progress')
        .update(updates)
        .eq('user_id', userId)
        .eq('character', character);

      if (updateError) {
        console.error('character_progress更新エラー:', updateError);
      }
    }
  }

  // 学習セッションを記録
  async recordLearningSession(sessionData: LearningSessionData): Promise<string | null> {
    const userId = authService.getCurrentUserId();
    if (!userId) {
      console.error('ユーザーIDが取得できません');
      return null;
    }

    try {
      const totalAttempts = sessionData.character_data.length;
      const correctAttempts = sessionData.character_data.filter(cd => cd.successful).length;
      const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;

      const { data, error } = await supabase
        .from('learning_sessions')
        .insert({
          user_id: userId,
          session_type: sessionData.sessionType,
          duration_seconds: sessionData.durationSeconds,
          total_attempts: totalAttempts,
          correct_attempts: correctAttempts,
          accuracy_rate: accuracy,
          characters_practiced: sessionData.character_data.map(cd => cd.character),
          character_data: sessionData.character_data,
          started_at: new Date(Date.now() - sessionData.durationSeconds * 1000).toISOString(),
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('学習セッション記録エラー:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('学習セッション記録エラー:', error);
      return null;
    }
  }

  // ストーリー進捗を更新
  async updateStoryProgress(
    chapterProgress: number,
    oniMood?: 'confused' | 'trying' | 'happy' | 'excited',
    learnedCharacter?: string
  ): Promise<void> {
    const userId = authService.getCurrentUserId();
    if (!userId) return;

    try {
      const { data: existing, error: fetchError } = await supabase
        .from('story_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('story_progress取得エラー:', fetchError);
        return;
      }

      const updates: any = {
        scene_progress: chapterProgress
      };

      if (oniMood) {
        updates.oni_mood = oniMood;
      }

      if (learnedCharacter && existing) {
        const learned = existing.oni_learned_characters || [];
        if (!learned.includes(learnedCharacter)) {
          updates.oni_learned_characters = [...learned, learnedCharacter];
          updates.oni_level = Math.min(100, existing.oni_level + 1);
        }
      }

      if (!existing) {
        // 新規作成
        await supabase
          .from('story_progress')
          .insert({
            user_id: userId,
            ...updates,
            oni_learned_characters: learnedCharacter ? [learnedCharacter] : []
          });
      } else {
        // 更新
        await supabase
          .from('story_progress')
          .update(updates)
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('ストーリー進捗更新エラー:', error);
    }
  }

  // 経験値を追加
  async addExperience(amount: number): Promise<void> {
    const userId = authService.getCurrentUserId();
    if (!userId) return;

    try {
      const { data: ninjaRank, error: fetchError } = await supabase
        .from('ninja_ranks')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('ninja_ranks取得エラー:', fetchError);
        return;
      }

      if (!ninjaRank) {
        // 新規作成
        await supabase
          .from('ninja_ranks')
          .insert({
            user_id: userId,
            total_exp: amount
          });
      } else {
        // 経験値を追加
        const newExp = ninjaRank.total_exp + amount;
        const newRank = Math.floor(newExp / 100) + 1; // 100expごとにランクアップ

        await supabase
          .from('ninja_ranks')
          .update({
            total_exp: newExp,
            current_rank: newRank,
            rank_title: this.getRankTitle(newRank)
          })
          .eq('user_id', userId);

        // レベルアップイベントを記録
        if (newRank > ninjaRank.current_rank) {
          await supabase
            .from('level_up_events')
            .insert({
              user_id: userId,
              old_level: ninjaRank.current_rank,
              new_level: newRank,
              level_up_type: 'ninja_rank',
              rewards: { exp: amount }
            });
        }
      }
    } catch (error) {
      console.error('経験値追加エラー:', error);
    }
  }

  // ランク称号を取得
  private getRankTitle(rank: number): string {
    if (rank <= 5) return '見習い忍者';
    if (rank <= 10) return '下忍';
    if (rank <= 20) return '中忍';
    if (rank <= 30) return '上忍';
    if (rank <= 40) return '達人';
    return '伝説の忍者';
  }
}

const progressService = new ProgressService();
export default progressService;