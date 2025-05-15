import * as FileSystem from 'expo-file-system';

// AIモデルの結果の型
export type AIResult = {
  text: string;        // 認識されたテキスト
  confidence: number;  // 確信度（0〜1）
};

// エラーハンドリング用関数型
type ErrorHandler = (error: string) => void;

// AIサービスのクラス
class AIService {
  private serverUrl: string | null = null;
  private isInitialized: boolean = false;
  private containerRunning: boolean = false;

  // サービスの初期化
  async initialize(onError?: ErrorHandler): Promise<boolean> {
    try {
      console.log('AIサービスを初期化しています...');
      
      // サーバーURLを設定（実際の環境に合わせて変更）
      this.serverUrl = 'http://localhost:3000';
      
      // サーバーに接続テスト
      const isConnected = await this.testConnection();
      
      if (isConnected) {
        console.log('AIサーバーに接続できました');
        this.isInitialized = true;
        this.containerRunning = true;
        return true;
      } else {
        console.error('AIサーバーに接続できません');
        if (onError) onError('AIサーバーに接続できませんでした');
        return false;
      }
    } catch (error) {
      console.error('AI初期化エラー:', error);
      if (onError) onError('AIサービスの初期化に失敗しました');
      return false;
    }
  }

  // サーバーへの接続テスト
  private async testConnection(): Promise<boolean> {
    try {
      // モック: 実際はサーバーへの接続確認を行う
      // 実装例: fetch(${this.serverUrl}/ping) などでサーバー疎通確認
      console.log('サーバー接続テスト（開発用モック）');
      return true; // 開発中は常にtrueを返す
    } catch (error) {
      console.error('接続テストエラー:', error);
      return false;
    }
  }

  // 音声ファイルを処理してテキストを取得
  async processAudio(audioUri: string, onError?: ErrorHandler): Promise<AIResult | null> {
    if (!this.isInitialized) {
      console.error('AIサービスが初期化されていません');
      if (onError) onError('AIサービスが準備できていません');
      return null;
    }

    try {
      console.log('音声を処理します:', audioUri);

      // === ここからはモック処理（実際の実装では以下の処理を行う） ===
      
      // 1. 音声ファイルの準備
      // const audioInfo = await FileSystem.getInfoAsync(audioUri);
      // if (!audioInfo.exists) {
      //   throw new Error('音声ファイルが見つかりません');
      // }

      // 2. サーバーへ音声ファイルを送信
      // const formData = new FormData();
      // formData.append('audio', {
      //   uri: audioUri,
      //   name: 'audio.wav',
      //   type: 'audio/wav',
      // });
      
      // const response = await fetch(`${this.serverUrl}/recognize`, {
      //   method: 'POST',
      //   body: formData,
      //   headers: {
      //     'Content-Type': 'multipart/form-data',
      //   },
      // });
      
      // if (!response.ok) {
      //   throw new Error(`サーバーエラー: ${response.status}`);
      // }
      
      // const result = await response.json();
      
      // === モック結果を返す（開発用） ===
      await new Promise(resolve => setTimeout(resolve, 500)); // 処理時間をシミュレート
      
      // ランダムなひらがなを返す（デモ用）
      const hiragana = ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ'];
      const randomIndex = Math.floor(Math.random() * hiragana.length);
      
      return {
        text: hiragana[randomIndex],
        confidence: 0.7 + Math.random() * 0.3, // 0.7〜1.0の範囲
      };
      
    } catch (error) {
      console.error('音声処理エラー:', error);
      if (onError) onError('音声の処理に失敗しました');
      return null;
    }
  }

  // Dockerコンテナの実行状況を確認
  async checkContainerStatus(onError?: ErrorHandler): Promise<boolean> {
    try {
      console.log('コンテナの状態を確認しています...');
      
      // モック: 実際はサーバーへの接続確認を行う
      return this.containerRunning;
    } catch (error) {
      console.error('コンテナ状態確認エラー:', error);
      if (onError) onError('AIコンテナの状態確認に失敗しました');
      return false;
    }
  }

  // Dockerコンテナとの接続をリセット
  async resetConnection(onError?: ErrorHandler): Promise<boolean> {
    try {
      console.log('接続をリセットしています...');
      
      // 接続状態をリセット
      this.isInitialized = false;
      
      // 再初期化
      return await this.initialize(onError);
    } catch (error) {
      console.error('接続リセットエラー:', error);
      if (onError) onError('接続のリセットに失敗しました');
      return false;
    }
  }
}

export const aiService = new AIService();
export default aiService; 