import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@src/lib/supabase';
import * as FileSystem from 'expo-file-system';

interface PracticeRecord {
  id: string;
  userId: string;
  character: string;
  isCorrect: boolean;
  responseTime: number;
  timestamp: Date;
  audioUri?: string; // ローカルファイルパス
  audioUrl?: string; // Supabaseのpublic URL
  aiResult?: {
    confidence: number;
    top3: Array<{ character: string; confidence: number }>;
  };
  metadata?: {
    stageType: string;
    trainingLevel: number;
    timeLimit: number;
  };
}

class PracticeStorageService {
  private uploadQueue: PracticeRecord[] = [];
  private isUploading = false;
  private BATCH_SIZE = 5; // 5件ずつアップロード
  private RETENTION_DAYS = 21; // 21日間保持

  // 練習データを保存（非同期・パフォーマンス優先）
  async savePracticeData(record: Omit<PracticeRecord, 'id' | 'audioUrl'>): Promise<void> {
    try {
      const id = `${record.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fullRecord: PracticeRecord = {
        ...record,
        id,
      };

      // 1. まずローカルストレージに保存（高速）
      await this.saveToLocal(fullRecord);

      // 2. アップロードキューに追加（バックグラウンド処理）
      this.uploadQueue.push(fullRecord);
      
      // 3. バックグラウンドでアップロード処理を開始
      this.processUploadQueue(); // awaitしない
    } catch (error) {
      console.error('練習データ保存エラー:', error);
      // エラーがあっても練習は続行
    }
  }

  // ローカルストレージに保存
  private async saveToLocal(record: PracticeRecord): Promise<void> {
    try {
      // 今日の練習データを取得
      const today = new Date().toISOString().split('T')[0];
      const key = `practice_${record.userId}_${today}`;
      
      const existingDataStr = await AsyncStorage.getItem(key);
      const existingData = existingDataStr ? JSON.parse(existingDataStr) : [];
      
      existingData.push(record);
      
      await AsyncStorage.setItem(key, JSON.stringify(existingData));
    } catch (error) {
      console.error('ローカル保存エラー:', error);
    }
  }

  // バックグラウンドでSupabaseにアップロード
  private async processUploadQueue(): Promise<void> {
    if (this.isUploading || this.uploadQueue.length === 0) {
      return;
    }

    this.isUploading = true;

    try {
      // バッチサイズ分取り出す
      const batch = this.uploadQueue.splice(0, this.BATCH_SIZE);
      
      // 並列アップロード
      const uploadPromises = batch.map(async (record) => {
        try {
          let audioUrl: string | undefined;
          
          // 音声ファイルがある場合はSupabase Storageにアップロード
          if (record.audioUri) {
            audioUrl = await this.uploadAudioFile(record.audioUri, record.id);
          }

          // データベースに記録を保存
          const { error } = await supabase
            .from('practice_records')
            .insert({
              id: record.id,
              user_id: record.userId,
              character: record.character,
              is_correct: record.isCorrect,
              response_time: record.responseTime,
              timestamp: record.timestamp,
              audio_url: audioUrl,
              ai_result: record.aiResult,
              metadata: record.metadata,
            });

          if (error) {
            console.error('Supabase保存エラー:', error);
            // エラーの場合はキューに戻す
            this.uploadQueue.push(record);
          }
        } catch (error) {
          console.error('個別アップロードエラー:', error);
          this.uploadQueue.push(record);
        }
      });

      await Promise.allSettled(uploadPromises);
    } finally {
      this.isUploading = false;
      
      // まだキューが残っていれば続行
      if (this.uploadQueue.length > 0) {
        setTimeout(() => this.processUploadQueue(), 5000); // 5秒後に再試行
      }
    }
  }

  // 音声ファイルをSupabase Storageにアップロード
  private async uploadAudioFile(localUri: string, recordId: string): Promise<string | undefined> {
    try {
      // 開発環境では音声アップロードをスキップ
      if (__DEV__) {
        console.log('開発環境: 音声アップロードをスキップします');
        return undefined;
      }

      // ファイルを2秒に加工（TODO: 実装が必要）
      const processedUri = localUri; // 暫定的に元のファイルを使用
      
      // ファイルを読み込み
      const fileInfo = await FileSystem.getInfoAsync(processedUri);
      if (!fileInfo.exists) {
        console.error('音声ファイルが存在しません:', processedUri);
        return undefined;
      }

      // ファイルをBlobとして読み込む
      const fileBlob = await fetch(processedUri).then(r => r.blob());

      // Supabase Storageにアップロード
      const fileName = `${recordId}.wav`;
      const { data, error } = await supabase.storage
        .from('practice-audio')
        .upload(fileName, fileBlob, {
          contentType: 'audio/wav',
          upsert: true,
        });

      if (error) {
        console.error('音声アップロードエラー:', error);
        return undefined;
      }

      // Public URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('practice-audio')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('音声ファイル処理エラー:', error);
      return undefined;
    }
  }

  // 古いデータを削除（アプリ起動時に実行）
  async cleanupOldData(userId: string): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

      // ローカルストレージから削除
      const keys = await AsyncStorage.getAllKeys();
      const practiceKeys = keys.filter(key => key.startsWith(`practice_${userId}_`));
      
      for (const key of practiceKeys) {
        const dateStr = key.split('_').pop();
        if (dateStr && new Date(dateStr) < cutoffDate) {
          await AsyncStorage.removeItem(key);
        }
      }

      // Supabaseから削除
      const { error } = await supabase
        .from('practice_records')
        .delete()
        .eq('user_id', userId)
        .lt('timestamp', cutoffDate.toISOString());

      if (error) {
        console.error('古いデータ削除エラー:', error);
      }
    } catch (error) {
      console.error('クリーンアップエラー:', error);
    }
  }

  // 親や医師が確認するためのデータ取得
  async getPracticeHistory(userId: string, days: number = 7): Promise<PracticeRecord[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('practice_records')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('履歴取得エラー:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('履歴取得エラー:', error);
      return [];
    }
  }
}

export default new PracticeStorageService();