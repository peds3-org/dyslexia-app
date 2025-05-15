import * as tflite from 'react-native-fast-tflite';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import voiceService from './voiceService';

// AIサービスの状態
enum AIServiceState {
  NOT_INITIALIZED = 'not_initialized',
  INITIALIZING = 'initializing',
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
}

class AIService {
  private model: any = null;
  private state: AIServiceState = AIServiceState.NOT_INITIALIZED;
  private error: string | null = null;
  private initializePromise: Promise<boolean> | null = null;
  private modelPath: string = 'assets/model.tflite';
  private currentSessionId: string | null = null;
  
  // AIサービスの初期化
  async initialize(): Promise<boolean> {
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
      console.log('AIサービス: 初期化開始');
      
      // モデルのパスを作成
      const modelPath = Platform.OS === 'android' 
        ? `${FileSystem.bundleDirectory}/assets/${this.modelPath}` 
        : `${FileSystem.bundleDirectory}/${this.modelPath}`;
      
      console.log(`AIサービス: モデルを読み込み中 - ${modelPath}`);
      
      // モデルの読み込み（グローバル関数を使用）
      this.model = await (global as any).__loadTensorflowModel(modelPath, 'default');
      
      console.log('AIサービス: モデル読み込み完了');
      this.state = AIServiceState.READY;
      return true;
    } catch (error) {
      console.error('AIサービス: 初期化エラー', error);
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

  // WAVファイルを前処理してFloat32Array形式にする関数
  private async preprocessWav(wavPath: string): Promise<Float32Array> {
    try {
      // WAVファイルをバイナリデータとして読み込み
      const wavData = await FileSystem.readAsStringAsync(wavPath, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      // Base64をバイナリデータにデコード
      const binaryData = Buffer.from(wavData, 'base64');
      
      // WAVヘッダー（通常44バイト）をスキップしてオーディオデータだけを取得
      const headerSize = 44;
      const audioData = binaryData.slice(headerSize);
      
      // 16ビットPCMデータを-1.0〜1.0のFloat32に変換
      const floatArray = new Float32Array(audioData.length / 2);
      for (let i = 0; i < floatArray.length; i++) {
        // 16ビットのリトルエンディアンでサンプルを取得して正規化
        const sample = audioData.readInt16LE(i * 2);
        floatArray[i] = sample / 32768.0; // 16ビットの最大値で割って-1.0〜1.0に正規化
      }
      
      return floatArray;
    } catch (error) {
      console.error('WAV前処理エラー:', error);
      throw error;
    }
  }

  // 特定の文字に対する音声から推論を行う
  async classifySpeech(character?: string, expectedResult?: string): Promise<AIClassificationResult | null> {
    if (this.state !== AIServiceState.READY) {
      console.error('AIサービス: モデルが初期化されていません');
      return null;
    }

    if (!this.model) {
      console.error('AIサービス: モデルがnullです');
      return null;
    }

    try {
      const startTime = Date.now();
      
      // 2秒間の音声を録音
      console.log('AIサービス: 音声録音開始');
      const wavPath = await voiceService.record2SecWav();
      console.log(`AIサービス: 録音完了 - ${wavPath}`);

      // WAVデータを前処理
      console.log('AIサービス: 音声前処理開始');
      const floatArray = await this.preprocessWav(wavPath);
      console.log('AIサービス: 音声前処理完了');

      // 推論実行
      console.log('AIサービス: 推論開始');
      // グローバル関数を使った推論
      const inputs = { input: floatArray };
      const outputs = await this.model.runAsync(inputs, undefined);
      const probabilities = outputs['output'];
      console.log('AIサービス: 推論完了', probabilities);

      // 処理時間の計算
      const processingTimeMs = Date.now() - startTime;
      
      // 結果の処理（outputの形式はモデルによって異なる）
      // 例: outputが[beginner, intermediate, advanced]の確率の配列と仮定
      
      // 最も確率の高いクラスを特定
      const maxIndex = probabilities.indexOf(Math.max(...probabilities));
      let level: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
      
      switch (maxIndex) {
        case 0:
          level = 'beginner';
          break;
        case 1:
          level = 'intermediate';
          break;
        case 2:
          level = 'advanced';
          break;
      }
      
      // 正解かどうかを判定（expectedResultが指定されている場合）
      const isCorrect = expectedResult ? level === expectedResult : undefined;
      
      const result: AIClassificationResult = {
        level,
        character,
        confidence: probabilities[maxIndex],
        timestamp: new Date().toISOString(),
        processingTimeMs,
        isCorrect
      };

      // 結果をデータベースに保存
      this.saveResultToDatabase(result, wavPath).catch(err => {
        console.error('AIサービス: 結果保存エラー', err);
      });

      return result;
    } catch (error) {
      console.error('AIサービス: 推論エラー', error);
      return null;
    }
  }

  // 結果をデータベースに保存
  private async saveResultToDatabase(result: AIClassificationResult, recordingPath?: string): Promise<void> {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      
      if (!userId) {
        console.error('AIサービス: ユーザーIDが取得できません');
        return;
      }
      
      // 録音ファイルをストレージにアップロードする場合の処理
      let recordingId = null;
      if (recordingPath && result.character) {
        // 録音をSupabaseに保存する処理（recordings テーブル）
        const { data: recordingData, error: recordingError } = await supabase
          .from('recordings')
          .insert({
            user_id: userId,
            session_id: this.currentSessionId,
            character: result.character,
            stage: 'ai_test', // または適切なステージ名
            storage_url: recordingPath, // 一時的にローカルパスを保存
            ai_result: {
              level: result.level,
              confidence: result.confidence
            },
            response_time_ms: result.processingTimeMs,
            created_at: result.timestamp
          })
          .select('id')
          .single();
          
        if (recordingError) {
          console.error('AIサービス: 録音保存エラー', recordingError);
        } else {
          recordingId = recordingData.id;
        }
      }
      
      // AIの分類結果をai_classificationsテーブルに保存
      const { error } = await supabase.from('ai_classifications').insert({
        user_id: userId,
        character: result.character || null,
        recording_id: recordingId,
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
        console.error('AIサービス: DB保存エラー', error);
      } else {
        console.log('AIサービス: 分類結果をDBに保存しました');
      }
    } catch (error) {
      console.error('AIサービス: DB保存中の例外', error);
    }
  }
}

export default new AIService(); 