import { StageProgress, StageType, StageCharacter } from '../types/progress';
import { supabase } from '../lib/supabase';
import AsyncStorageUtil from '../utils/asyncStorage';

// テイラードプログラムの制限時間（ミリ秒）
const TIME_LIMITS = {
  TRAINING_1: 2500, // 訓練1: 2.5秒
  TRAINING_2: 2000, // 訓練2: 2.0秒
  TRAINING_3: 1700, // 訓練3: 1.7秒
  LAST_STAGE: 1500  // ラストステージ: 1.5秒
};

// 必要なセット数
const REQUIRED_SETS: Record<string, number> = {
  [StageType.BEGINNER]: 3,    // 初級: 3セット
  [StageType.INTERMEDIATE]: 2, // 中級: 2セット
  [StageType.ADVANCED]: 2      // 上級: 2セット
};

// テスト合格条件（正答率）
const TEST_PASS_RATE = 0.75; // 3/4以上の正解率

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
        // テイラードプログラム用の初期値
        trainingLevel: 1,    // 訓練1からスタート
        testMode: false,     // 通常モードからスタート
        completedSets: 0,    // 完了セット数0
        testResults: {       // テスト結果を初期化
          totalAttempts: 0,
          correctAttempts: 0
        }
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
      await AsyncStorageUtil.setItem(this.getStageKey(stageType), initialProgress);
      
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
      const progress = await AsyncStorageUtil.getItem<StageProgress>(this.getStageKey(stageType));
      if (progress) {
        return progress;
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
      trainingLevel: 1,
      testMode: false,
      completedSets: 0,
      testResults: {
        totalAttempts: 0,
        correctAttempts: 0
      }
    };
  }

  // 現在の訓練レベルに応じた制限時間を取得するヘルパーメソッド
  private getTimeLimit(trainingLevel: number, isLastStage: boolean = false): number {
    if (isLastStage) return TIME_LIMITS.LAST_STAGE;
    
    switch (trainingLevel) {
      case 1: return TIME_LIMITS.TRAINING_1;
      case 2: return TIME_LIMITS.TRAINING_2;
      case 3: return TIME_LIMITS.TRAINING_3;
      default: return TIME_LIMITS.TRAINING_2; // デフォルトは2.0秒
    }
  }

  async updateProgress(stageType: StageType, character: string, isCorrect: boolean, responseTime: number): Promise<StageProgress> {
    try {
      const progress = await this.getProgress(stageType);
      const characterProgress = progress.characterProgress[character] || 0;

      // ラストステージの場合
      if (progress.lastStageCompleted) {
        // ラストステージの条件: 全単音1.5秒以内
        if (isCorrect && responseTime <= TIME_LIMITS.LAST_STAGE) {
          progress.characterProgress[character] = characterProgress + 1;
          progress.lastClearedTime = responseTime;
          
          // もじ玉獲得処理（既存と同じ）
          if (progress.characterProgress[character] === 3 && !progress.collectedMojitama.includes(character)) {
            progress.collectedMojitama.push(character);
          }
          
          await AsyncStorageUtil.setItem(this.getStageKey(stageType), progress);
        }
        return progress;
      }

      // テストモードの場合
      if (progress.testMode) {
        // テスト結果を更新
        if (!progress.testResults) {
          progress.testResults = { totalAttempts: 0, correctAttempts: 0 };
        }
        
        progress.testResults.totalAttempts++;
        if (isCorrect && responseTime <= this.getTimeLimit(progress.trainingLevel)) {
          progress.testResults.correctAttempts++;
        }
        
        // テスト終了条件（4問）をチェック
        if (progress.testResults.totalAttempts >= 4) {
          // 正答率を計算
          const correctRate = progress.testResults.correctAttempts / progress.testResults.totalAttempts;
          
          if (correctRate >= TEST_PASS_RATE) {
            // テスト合格、次のステージへ
            if (stageType === StageType.BEGINNER) {
              // 初級から中級へ
              progress.testMode = false;
              progress.trainingLevel = 1;
              progress.completedSets = 0;
              progress.currentLevel++; // レベルアップ
            } else if (stageType === StageType.INTERMEDIATE) {
              // 中級から上級へ
              progress.testMode = false;
              progress.trainingLevel = 1;
              progress.completedSets = 0;
              progress.currentLevel++;
            } else if (stageType === StageType.ADVANCED) {
              // 上級からラストステージへ
              progress.testMode = false;
              progress.lastStageCompleted = true;
            }
          } else {
            // テスト不合格、同じステージの訓練1に戻る
            progress.testMode = false;
            progress.trainingLevel = 1;
            progress.completedSets = 0;
          }
          
          // テスト結果をリセット
          progress.testResults = {
            totalAttempts: 0,
            correctAttempts: 0
          };
        }
        
        await AsyncStorageUtil.setItem(this.getStageKey(stageType), progress);
        return progress;
      }

      // 通常の訓練モード
      // 現在の訓練レベルに応じた制限時間を取得
      const currentTimeLimit = this.getTimeLimit(progress.trainingLevel);
      
      // 正解かつ制限時間内の場合のみ進捗を更新
      if (isCorrect && responseTime <= currentTimeLimit) {
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
          
          // セット数をインクリメント
          progress.completedSets++;
          
          // セット完了条件をチェック
          const requiredSets = REQUIRED_SETS[stageType.toString()] || 3;
          if (progress.completedSets >= requiredSets) {
            if (progress.trainingLevel < 3) {
              // 次の訓練レベルへ
              progress.trainingLevel++;
              progress.completedSets = 0;
            } else {
              // 訓練3まで完了したらテストモードへ
              progress.testMode = true;
              progress.completedSets = 0;
              progress.testResults = {
                totalAttempts: 0,
                correctAttempts: 0
              };
            }
          }
        }

        await AsyncStorageUtil.setItem(this.getStageKey(stageType), progress);
      }

      return progress;
    } catch (error) {
      console.error('進捗の更新に失敗しました:', error);
      throw error;
    }
  }

  // 現在の制限時間を取得するメソッド（UIで表示するために）
  async getCurrentTimeLimit(stageType: StageType): Promise<number> {
    const progress = await this.getProgress(stageType);
    if (progress.lastStageCompleted) {
      return TIME_LIMITS.LAST_STAGE;
    }
    return this.getTimeLimit(progress.trainingLevel);
  }

  // 現在のモード情報を取得するメソッド（UI表示用）
  async getCurrentModeInfo(stageType: StageType): Promise<{
    isTestMode: boolean;
    trainingLevel: number;
    timeLimit: number;
    completedSets: number;
    requiredSets: number;
    isLastStage: boolean;
  }> {
    const progress = await this.getProgress(stageType);
    return {
      isTestMode: progress.testMode,
      trainingLevel: progress.trainingLevel,
      timeLimit: this.getTimeLimit(progress.trainingLevel, progress.lastStageCompleted),
      completedSets: progress.completedSets,
      requiredSets: REQUIRED_SETS[stageType.toString()] || 3,
      isLastStage: !!progress.lastStageCompleted
    };
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
      await AsyncStorageUtil.removeItem(this.getStageKey(stageType));
    } catch (error) {
      console.error('進捗のリセットに失敗しました:', error);
      throw error;
    }
  }
}

export const stageService = new StageService();
export default stageService; 