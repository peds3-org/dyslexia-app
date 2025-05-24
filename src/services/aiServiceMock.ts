// Temporary mock AI service to avoid TFLite dependency issues on iOS
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import voiceService from './voiceService';

// AIサービスの状態
enum AIServiceState {
  NOT_INITIALIZED = 'not_initialized',
  INITIALIZING = 'initializing',
  DOWNLOADING = 'downloading',
  READY = 'ready',
  ERROR = 'error'
}

// 音声分類の結果
export interface AIClassificationResult {
  level: 'beginner' | 'intermediate' | 'advanced';
  character?: string;
  confidence: number;
  timestamp: string;
  processingTimeMs?: number;
  isCorrect?: boolean;
  top3?: Array<{
    character: string;
    confidence: number;
  }>;
}

// ダウンロード進捗の通知用インターフェース
export type DownloadProgressCallback = (progress: number) => void;

class AIServiceMock {
  private state: AIServiceState = AIServiceState.NOT_INITIALIZED;
  private error: string | null = null;
  private initializePromise: Promise<boolean> | null = null;
  private currentSessionId: string | null = null;
  
  // 進捗コールバック
  private progressCallback: DownloadProgressCallback | null = null;
  
  // 進捗コールバックを設定
  setProgressCallback(callback: DownloadProgressCallback | null): void {
    this.progressCallback = callback;
  }
  
  // AIサービスの初期化
  async initialize(onProgress?: DownloadProgressCallback): Promise<boolean> {
    // 進捗コールバックを設定
    if (onProgress) {
      this.progressCallback = onProgress;
    }
    
    // 既に初期化中なら進行中のPromiseを返す
    if (this.initializePromise) {
      return this.initializePromise;
    }

    // 既に初期化済みならtrueを返す
    if (this.state === AIServiceState.READY) {
      return true;
    }

    // 初期化処理を開始
    this.state = AIServiceState.INITIALIZING;
    this.error = null;
    
    this.initializePromise = this._initialize();
    return this.initializePromise;
  }

  // 実際の初期化処理
  private async _initialize(): Promise<boolean> {
    try {
      console.log('AIサービス（モック）: 初期化開始');
      
      // モックなので短い遅延を入れる
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.state = AIServiceState.READY;
      console.log('AIサービス（モック）: 初期化完了');
      return true;
    } catch (error) {
      console.error('AIサービス（モック）: 初期化エラー', error);
      this.error = error instanceof Error ? error.message : '不明なエラーが発生しました';
      this.state = AIServiceState.ERROR;
      return false;
    } finally {
      this.initializePromise = null;
    }
  }

  // サービスの状態を取得
  getState(): { state: AIServiceState; error: string | null } {
    return {
      state: this.state,
      error: this.error
    };
  }

  // 現在のセッションIDを設定
  setCurrentSessionId(sessionId: string | null): void {
    this.currentSessionId = sessionId;
  }

  // 102クラス分類用のひらがな文字マッピング
  private readonly CLASS_LABELS: string[] = [
    'あ', 'い', 'う', 'え', 'お',
    'か', 'が', 'き', 'ぎ', 'く', 'ぐ', 'け', 'げ', 'こ', 'ご',
    'きゃ', 'きゅ', 'きょ', 'ぎゃ', 'ぎゅ', 'ぎょ',
    'さ', 'ざ', 'し', 'じ', 'す', 'ず', 'せ', 'ぜ', 'そ', 'ぞ',
    'しゃ', 'しゅ', 'しょ', 'じゃ', 'じゅ', 'じょ',
    'た', 'だ', 'ち', 'ぢ', 'つ', 'づ', 'て', 'で', 'と', 'ど',
    'ちゃ', 'ちゅ', 'ちょ',
    'な', 'に', 'ぬ', 'ね', 'の',
    'にゃ', 'にゅ', 'にょ',
    'は', 'ば', 'ぱ', 'ひ', 'び', 'ぴ', 'ふ', 'ぶ', 'ぷ', 'へ', 'べ', 'ぺ', 'ほ', 'ぼ', 'ぽ',
    'ひゃ', 'ひゅ', 'ひょ', 'びゃ', 'びゅ', 'びょ', 'ぴゃ', 'ぴゅ', 'ぴょ',
    'ま', 'み', 'む', 'め', 'も',
    'みゃ', 'みゅ', 'みょ',
    'や', 'ゆ', 'よ',
    'ら', 'り', 'る', 'れ', 'ろ',
    'りゃ', 'りゅ', 'りょ',
    'わ', 'ゐ', 'ゑ', 'を', 'ん'
  ];

  // 特定の文字に対する音声から推論を行う（モック実装）
  async classifySpeech(character?: string, expectedResult?: string, audioUri?: string): Promise<AIClassificationResult | null> {
    if (this.state !== AIServiceState.READY) {
      console.error('AIサービス（モック）: モデルが初期化されていません');
      return null;
    }

    try {
      const startTime = Date.now();
      
      // モックなので実際の録音はスキップ（URIが提供されていない場合のみ）
      if (!audioUri) {
        console.log('AIサービス（モック）: 音声録音をシミュレート');
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒の録音をシミュレート
      }

      // モック推論結果を生成
      const probabilities = new Array(102).fill(0.001); // 全て低い確率で初期化
      
      // 期待される文字が指定されている場合は、その文字に高い確率を割り当て
      let topCharacter = character;
      if (character) {
        const charIndex = this.CLASS_LABELS.indexOf(character);
        if (charIndex !== -1) {
          // 80%の確率で正解、20%の確率で他の文字
          if (Math.random() < 0.8) {
            probabilities[charIndex] = 0.85;
            // ランダムに他の2つの文字にも少し高い確率を割り当て
            const randomIndices: number[] = [];
            while (randomIndices.length < 2) {
              const randomIndex = Math.floor(Math.random() * 102);
              if (randomIndex !== charIndex && !randomIndices.includes(randomIndex)) {
                randomIndices.push(randomIndex);
              }
            }
            probabilities[randomIndices[0]] = 0.08;
            probabilities[randomIndices[1]] = 0.05;
          } else {
            // 不正解の場合
            const wrongIndex = Math.floor(Math.random() * 102);
            probabilities[wrongIndex] = 0.75;
            topCharacter = this.CLASS_LABELS[wrongIndex];
          }
        }
      } else {
        // 期待される文字が不明な場合はランダムに高い確率を割り当て
        const randomIndex = Math.floor(Math.random() * 102);
        probabilities[randomIndex] = 0.75;
        topCharacter = this.CLASS_LABELS[randomIndex];
      }
      
      // Top-3を生成
      const probabilityPairs = probabilities.map((prob, index) => ({
        character: this.CLASS_LABELS[index] || `未知_${index}`,
        confidence: prob
      }));
      
      // 確率の高い順にソート
      probabilityPairs.sort((a, b) => b.confidence - a.confidence);
      
      // Top-3を取得
      const top3 = probabilityPairs.slice(0, 3);
      
      const processingTimeMs = Date.now() - startTime;
      
      const result: AIClassificationResult = {
        level: 'beginner',
        character: topCharacter,
        confidence: top3[0].confidence,
        timestamp: new Date().toISOString(),
        processingTimeMs,
        isCorrect: character === topCharacter,
        top3
      };

      console.log('AIサービス（モック）: 推論完了', result);
      
      // 結果をデータベースに保存
      this.saveResultToDatabase(result, undefined).catch(err => {
        console.error('AIサービス（モック）: 結果保存エラー', err);
      });

      return result;
    } catch (error) {
      console.error('AIサービス（モック）: 推論エラー', error);
      return null;
    }
  }

  // 結果をデータベースに保存
  private async saveResultToDatabase(result: AIClassificationResult, recordingPath?: string): Promise<void> {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      
      if (!userId) {
        console.error('AIサービス（モック）: ユーザーIDが取得できません');
        return;
      }
      
      // AIの分類結果をai_classificationsテーブルに保存
      const { error } = await supabase.from('ai_classifications').insert({
        user_id: userId,
        character: result.character || null,
        recording_id: null,
        session_id: this.currentSessionId,
        classification_result: {
          level: result.level,
          confidence: result.confidence
        },
        confidence: result.confidence,
        is_correct: result.isCorrect,
        processing_time_ms: result.processingTimeMs,
        created_at: result.timestamp
      });
      
      if (error) {
        console.error('AIサービス（モック）: DB保存エラー', error);
      } else {
        console.log('AIサービス（モック）: 分類結果をDBに保存しました');
      }
    } catch (error) {
      console.error('AIサービス（モック）: DB保存中の例外', error);
    }
  }

  // モデルをクリーンアップ
  async cleanup(): Promise<void> {
    this.state = AIServiceState.NOT_INITIALIZED;
    console.log('AIサービス（モック）: クリーンアップ完了');
  }

  // モデルファイルを削除（モックなので何もしない）
  async deleteModelFile(): Promise<void> {
    console.log('AIサービス（モック）: モデルファイル削除（スキップ）');
  }

  // Dockerの実行手順を取得
  getDockerInstructions(): string[] {
    return [
      "1. Docker をインストール:\n   macOS: https://docs.docker.com/desktop/install/mac/\n   Windows: https://docs.docker.com/desktop/install/windows/",
      "2. Docker イメージをダウンロード:\n   docker pull dyslexia/ai-model:latest",
      "3. サーバーを起動:\n   docker run -p 8080:8080 dyslexia/ai-model:latest"
    ];
  }

  // Dockerの詳細情報を取得
  getDockerDetails(): { title: string, content: string }[] {
    return [
      {
        title: "なぜ Docker が必要なの？",
        content: "AI モデルは大きなファイルで、スマートフォンでは処理が重いことがあります。Docker を使うと、パソコンで AI を動かして、スマートフォンから使うことができます。"
      },
      {
        title: "どんな準備が必要？",
        content: "Docker をインストールして、イメージをダウンロードし、サーバーを起動するだけです。詳しい手順は上の指示に書いてあります。"
      },
      {
        title: "トラブルシューティング",
        content: "サーバーが起動しない場合は、Docker が正しくインストールされているか確認してください。ポート 8080 が他のアプリで使われていないか確認することも大切です。"
      }
    ];
  }
}

export default new AIServiceMock();