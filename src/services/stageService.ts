import AsyncStorage from '@react-native-async-storage/async-storage';
import { StageProgress, StageType, StageCharacter } from '../types/progress';
import { supabase } from '../lib/supabase';

class StageService {
  private getStageKey(stageType: StageType): string {
    return `stage_progress_${stageType}`;
  }

  // 初期テスト結果に基づいてユーザーのステージを初期化するメソッド
  async initializeStageForUser(userId: string, stageType: StageType): Promise<void> {
    try {
      console.log(`ユーザー ${userId} のステージを初期化: ${stageType}`);
      
      // 初期のステージ進捗を作成
      const initialProgress: StageProgress = {
        currentLevel: 1,
        collectedMojitama: [],
        unlockedCharacters: [],
        characterProgress: {},
      };
      
      // ステージタイプに基づいて基本設定を適用
      if (stageType === StageType.BEGINNER) {
        // 初級は清音からスタート
        initialProgress.currentLevel = 1;
      } else if (stageType === StageType.INTERMEDIATE) {
        // 中級は濁音・半濁音も含む
        initialProgress.currentLevel = 2;
      } else if (stageType === StageType.ADVANCED) {
        // 上級はすべての文字を含む
        initialProgress.currentLevel = 3;
      }
      
      // 初期の5文字をアンロック
      this.unlockNextCharacters(initialProgress);
      
      // ローカルストレージに保存
      await AsyncStorage.setItem(this.getStageKey(stageType), JSON.stringify(initialProgress));
      
      // 既存のレコードを確認
      const { data: existingData, error: selectError } = await supabase
        .from('user_stage_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('stage_type', stageType)
        .single();
      
      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 は "no rows returned" エラー
        console.error('既存のステージ進捗確認エラー:', selectError);
      }
      
      const now = new Date().toISOString();
      
      let error;
      if (existingData) {
        // 既存のレコードがある場合は更新
        console.log(`ユーザー ${userId} の既存のステージ進捗を更新します`);
        const { error: updateError } = await supabase
          .from('user_stage_progress')
          .update({
            progress: initialProgress,
            updated_at: now
          })
          .eq('user_id', userId)
          .eq('stage_type', stageType);
        
        error = updateError;
      } else {
        // 新規レコードを挿入
        console.log(`ユーザー ${userId} の新規ステージ進捗を作成します`);
        const { error: insertError } = await supabase
          .from('user_stage_progress')
          .insert({
            user_id: userId,
            stage_type: stageType,
            progress: initialProgress,
            created_at: now,
            updated_at: now
          });
        
        error = insertError;
      }
      
      if (error) {
        console.error('ステージ進捗のSupabase保存エラー:', error);
      }
      
      console.log(`ユーザー ${userId} のステージ初期化完了`);
    } catch (error) {
      console.error('ステージの初期化に失敗しました:', error);
      throw error;
    }
  }

  async getProgress(stageType: StageType): Promise<StageProgress> {
    try {
      const progressJson = await AsyncStorage.getItem(this.getStageKey(stageType));
      if (progressJson) {
        return JSON.parse(progressJson);
      }
    } catch (error) {
      console.error('進捗の読み込みに失敗しました:', error);
    }

    // 初期状態を返す
    return {
      currentLevel: 1,
      collectedMojitama: [],
      unlockedCharacters: [],
      characterProgress: {},
    };
  }

  async updateProgress(stageType: StageType, character: string, isCorrect: boolean, responseTime: number): Promise<StageProgress> {
    try {
      const progress = await this.getProgress(stageType);
      const characterProgress = progress.characterProgress[character] || 0;

      // 正解かつ制限時間内の場合のみ進捗を更新
      if (isCorrect && responseTime <= 2000) {
        progress.characterProgress[character] = characterProgress + 1;
        progress.lastClearedTime = responseTime;

        // 3回正解でもじ玉獲得
        if (progress.characterProgress[character] === 3 && !progress.collectedMojitama.includes(character)) {
          progress.collectedMojitama.push(character);
          
          // レベルアップの判定（5文字ごと）
          if (progress.collectedMojitama.length % 5 === 0) {
            progress.currentLevel = Math.min(5, progress.currentLevel + 1);
          }

          // 次の文字をアンロック
          this.unlockNextCharacters(progress);
        }

        await AsyncStorage.setItem(this.getStageKey(stageType), JSON.stringify(progress));
      }

      return progress;
    } catch (error) {
      console.error('進捗の更新に失敗しました:', error);
      throw error;
    }
  }

  private unlockNextCharacters(progress: StageProgress): void {
    // 最初の5文字は常にアンロック
    if (progress.unlockedCharacters.length === 0) {
      for (let i = 0; i < 5; i++) {
        progress.unlockedCharacters.push(String(i));
      }
      return;
    }

    // 新しい文字をアンロック（次の3文字）
    const lastUnlockedIndex = parseInt(progress.unlockedCharacters[progress.unlockedCharacters.length - 1]);
    for (let i = 1; i <= 3; i++) {
      const nextIndex = lastUnlockedIndex + i;
      if (!progress.unlockedCharacters.includes(String(nextIndex))) {
        progress.unlockedCharacters.push(String(nextIndex));
      }
    }
  }

  async resetProgress(stageType: StageType): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.getStageKey(stageType));
    } catch (error) {
      console.error('進捗のリセットに失敗しました:', error);
      throw error;
    }
  }
}

export const stageService = new StageService();
export default stageService; 