import AsyncStorage from '@react-native-async-storage/async-storage';
import { StageProgress, StageType, StageCharacter } from '../types/progress';

class StageService {
  private getStageKey(stageType: StageType): string {
    return `stage_progress_${stageType}`;
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