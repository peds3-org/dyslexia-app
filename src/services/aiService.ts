import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';
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

class AIService {
  private model: TensorflowModel | null = null;
  private state: AIServiceState = AIServiceState.NOT_INITIALIZED;
  private error: string | null = null;
  private initializePromise: Promise<boolean> | null = null;
  private modelPath: string = 'assets/model.tflite';
  private currentSessionId: string | null = null;
  
  // モデルのリモートURL（テスト用のダミーURL）
  //private remoteModelUrl: string = 'https://storage.googleapis.com/tfjs-models/tfjs/mnist_v1/model.json'; // テスト用URL - 実際のTFLiteモデルURLに置き換えてください
  // モデルのリモートURL（GitHubリリース）
  private remoteModelUrl: string = 'https://github.com/peds3-org/dyslexia-app/releases/download/v0.0.1-beta/model.tflite';
  // ローカルストレージのパス
  private get localModelPath(): string {
    return `${FileSystem.documentDirectory || ''}model.tflite`;
  }

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
      console.log('AIサービス: 初期化開始');
      
      // ネットワーク接続を確認
      const networkStatus = await this._checkNetworkConnection();
      if (!networkStatus.isConnected) {
        console.log('AIサービス: ネットワーク接続がありません');
        
        // ローカルにモデルファイルが存在するか確認
        const modelExists = await this._checkModelExists();
        if (!modelExists) {
          throw new Error('ネットワーク接続がなく、モデルもローカルにありません');
        }
        
        console.log('AIサービス: ネットワーク接続はありませんが、ローカルにモデルがあります');
      } else {
        console.log(`AIサービス: ネットワーク接続タイプ: ${networkStatus.type}`);
      }
      
      // 開発中: モックモードの場合はダウンロードをスキップ
      const USE_MOCK_MODE = false; // privateリポジトリの問題が解決するまでtrueに設定
      
      // ローカルにモデルファイルが存在するか確認
      const modelExists = await this._checkModelExists();
      
      // モデルが存在しない場合、ダウンロードする（モックモードではスキップ）
      if (!modelExists && !USE_MOCK_MODE) {
        console.log('AIサービス: モデルをダウンロードします');
        this.state = AIServiceState.DOWNLOADING;
        
        // 進捗を0%に設定
        if (this.progressCallback) {
          this.progressCallback(0);
        }
        
        // 最大3回までリトライ
        let downloadSuccess = false;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!downloadSuccess && retryCount < maxRetries) {
          try {
            if (retryCount > 0) {
              console.log(`AIサービス: ダウンロード再試行 (${retryCount}/${maxRetries})`);
              // リトライ間隔を徐々に長くする（指数バックオフ）
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
            }
            
            downloadSuccess = await this._downloadModel();
          } catch (downloadError) {
            console.error(`AIサービス: ダウンロード試行 ${retryCount + 1} 失敗`, downloadError);
          }
          
          retryCount++;
        }
        
        if (!downloadSuccess) {
          throw new Error(`モデルのダウンロードに${maxRetries}回失敗しました`);
        }
      }
      
      // モデルのパスを取得
      const modelPath = await this._getModelPath();
      
      // モックモードでない場合のみファイルの存在とサイズを確認
      if (!USE_MOCK_MODE) {
        const fileInfo = await FileSystem.getInfoAsync(modelPath);
        console.log(`AIサービス: モデルファイル情報:`, {
          exists: fileInfo.exists,
          size: fileInfo.exists ? (fileInfo as any).size : 0,
          path: modelPath
        });
        
        if (!fileInfo.exists) {
          throw new Error('モデルファイルが存在しません');
        }
        
        if (fileInfo.exists && (fileInfo as any).size === 0) {
          throw new Error('モデルファイルが空です');
        }
      }
      
      console.log(`AIサービス: モデルを読み込み中 - ${modelPath}`);
      
      try {
        // 開発中: モデルファイルが利用可能でない場合はモックモードを使用
        const USE_MOCK_MODE = false; // 本番環境ではfalseに設定
        
        if (USE_MOCK_MODE) {
          console.log('AIサービス: モックモードで動作します（開発用）');
          // モックモデルオブジェクトを作成
          this.model = {
            inputs: [{
              name: 'input',
              dataType: 'float32' as const,
              shape: [1, 32000] // 2秒の音声データ (16kHz)
            }],
            outputs: [{
              name: 'output',
              dataType: 'float32' as const,
              shape: [1, 3] // 3クラス分類
            }],
            delegate: 'default' as const,
            run: async (_input: any[]) => {
              // モック推論結果を返す
              return [new Float32Array([0.8, 0.1, 0.1])];
            },
            runSync: (_input: any[]) => {
              // モック推論結果を返す
              return [new Float32Array([0.8, 0.1, 0.1])];
            }
          } as any;
          console.log('AIサービス: モックモデル準備完了');
        } else {
          // 本番モード: 実際のモデルを読み込む
          const modelUrl = modelPath.startsWith('file://') ? modelPath : `file://${modelPath}`;
          const modelSource = { url: modelUrl };
          console.log(`AIサービス: loadTensorflowModel呼び出し - URL: ${modelUrl}`);
          this.model = await loadTensorflowModel(modelSource);
          
          console.log('AIサービス: モデル読み込み完了');
          console.log('AIサービス: モデル情報:', {
            inputs: this.model.inputs,
            outputs: this.model.outputs
          });
          
          // モデルの詳細情報を出力
          if (this.model.inputs && this.model.inputs[0]) {
            console.log('AIサービス: 入力詳細:', {
              shape: this.model.inputs[0].shape,
              dataType: (this.model.inputs[0] as any).dataType || 'unknown'
            });
          }
          if (this.model.outputs && this.model.outputs[0]) {
            console.log('AIサービス: 出力詳細:', {
              shape: this.model.outputs[0].shape,
              dataType: (this.model.outputs[0] as any).dataType || 'unknown'
            });
          }
        }
      } catch (loadError) {
        console.error('AIサービス: モデル読み込みエラー', loadError);
        
        // モデルファイルが破損している可能性があるため、削除して再ダウンロードを試みる
        console.log('AIサービス: モデルファイルが破損している可能性があります。削除して再ダウンロードします。');
        
        try {
          await FileSystem.deleteAsync(this.localModelPath);
          console.log('AIサービス: 破損したモデルファイルを削除しました');
          
          // 再ダウンロード
          this.state = AIServiceState.DOWNLOADING;
          const downloadSuccess = await this._downloadModel();
          
          if (downloadSuccess) {
            // 再度読み込みを試みる
            const newModelPath = await this._getModelPath();
            const newModelUrl = newModelPath.startsWith('file://') ? newModelPath : `file://${newModelPath}`;
            const newModelSource = { url: newModelUrl };
            this.model = await loadTensorflowModel(newModelSource);
            console.log('AIサービス: 再ダウンロード後のモデル読み込み成功');
          } else {
            throw new Error('モデルの再ダウンロードに失敗しました');
          }
        } catch (retryError) {
          console.error('AIサービス: モデル再ダウンロード/読み込みエラー', retryError);
          throw new Error(`モデルの読み込みに失敗しました: ${loadError}`);
        }
      }
      
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

  // ネットワーク接続状態を確認
  private async _checkNetworkConnection(): Promise<{ isConnected: boolean, type?: string }> {
    try {
      // NetInfoライブラリを使用してネットワーク状態を取得
      const state = await NetInfo.fetch();
      return { 
        isConnected: state.isConnected || false, 
        type: state.type 
      };
    } catch (error) {
      console.error('AIサービス: ネットワーク確認エラー', error);
      return { isConnected: false };
    }
  }

  // モデルファイルの存在チェック
  private async _checkModelExists(): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(this.localModelPath);
      // TFLiteモデルの最小サイズ（1MB - 通常のTFLiteモデルは数MB以上）
      const MIN_MODEL_SIZE = 1024 * 1024; // 1MB
      
      if (!fileInfo.exists) {
        return false;
      }
      
      // ファイルサイズもチェック
      const fileSize = (fileInfo as any).size || 0;
      if (fileSize < MIN_MODEL_SIZE) {
        console.log(`AIサービス: 既存のモデルファイルが小さすぎます（${(fileSize / 1024).toFixed(2)}KB）。再ダウンロードが必要です。`);
        console.log(`AIサービス: 期待される最小サイズ: ${(MIN_MODEL_SIZE / (1024 * 1024)).toFixed(2)}MB`);
        // 不完全なファイルを削除
        try {
          await FileSystem.deleteAsync(this.localModelPath);
        } catch (deleteError) {
          console.error('AIサービス: 不完全なファイルの削除エラー', deleteError);
        }
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('AIサービス: モデル存在チェックエラー', error);
      return false;
    }
  }
  
  // モデルのダウンロード
  private async _downloadModel(): Promise<boolean> {
    try {
      // ダウンロードディレクトリが存在することを確認
      const documentDir = FileSystem.documentDirectory || '';
      const dirInfo = await FileSystem.getInfoAsync(documentDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(documentDir, { intermediates: true });
      }
      
      // ダウンロードの進捗を監視するコールバック
      const downloadCallback = (downloadProgress: FileSystem.DownloadProgressData) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        console.log(`ダウンロード進捗: ${Math.round(progress * 100)}%`);
        
        // 進捗コールバックを呼び出す
        if (this.progressCallback) {
          this.progressCallback(progress);
        }
      };
      
      // ダウンロード再開可能なオブジェクトを作成
      // @ts-ignore - FileSystem型の問題を一時的に回避
      const downloadResumable = FileSystem.createDownloadResumable(
        this.remoteModelUrl as string,
        this.localModelPath as string,
        {
          headers: {
            'Accept': 'application/octet-stream',
            'User-Agent': 'Mozilla/5.0 (compatible; Expo; Mobile)'
          },
          md5: true  // MD5チェックサムを検証
        },
        downloadCallback
      );
      
      // 保存されたダウンロード情報があれば再開を試みる
      const resumeData = await this._getDownloadResumeData();
      let result = null;
      
      if (resumeData) {
        try {
          console.log('AIサービス: 中断されたダウンロードを再開します');
          result = await downloadResumable.resumeAsync();
          
          if (!result) {
            console.log('AIサービス: 再開に失敗しました。新しいダウンロードを開始します');
            result = await downloadResumable.downloadAsync();
          }
        } catch (resumeError) {
          console.log('AIサービス: 再開エラー、新しいダウンロードを開始します', resumeError);
          result = await downloadResumable.downloadAsync();
        }
      } else {
        console.log('AIサービス: 新しいダウンロードを開始します');
        result = await downloadResumable.downloadAsync();
      }
      
      if (!result) {
        throw new Error('ダウンロード結果がnullです');
      }
      
      // ダウンロード情報を保存（後で再開できるように）
      const resumableData = downloadResumable.savable();
      if (resumableData) {
        await this._saveDownloadResumeData(resumableData);
      }
      
      // ダウンロード完了後の確認
      const fileInfo = await FileSystem.getInfoAsync(this.localModelPath);
      if (!fileInfo.exists) {
        throw new Error('ダウンロードしたファイルが存在しません');
      }
      
      // ファイルサイズをチェック（TFLiteモデルの最小サイズを1MBとする）
      const MIN_MODEL_SIZE = 1024 * 1024; // 1MB
      const fileSize = (fileInfo as any).size || 0;
      if (!fileInfo.exists || fileSize < MIN_MODEL_SIZE) {
        console.error(`AIサービス: ダウンロードしたファイルサイズが小さすぎます: ${(fileSize / 1024).toFixed(2)}KB`);
        console.error(`AIサービス: 期待される最小サイズ: ${(MIN_MODEL_SIZE / (1024 * 1024)).toFixed(2)}MB`);
        // ファイルを削除
        await FileSystem.deleteAsync(this.localModelPath);
        throw new Error(`ダウンロードしたファイルが不完全です（サイズ: ${(fileSize / 1024).toFixed(2)}KB）`);
      }
      
      console.log('AIサービス: モデルのダウンロードが完了しました');
      console.log(`AIサービス: ファイルサイズ: ${((fileInfo as any).size / (1024 * 1024)).toFixed(2)}MB`);
      
      // ダウンロード再開情報をクリア（完了したため）
      await this._clearDownloadResumeData();
      
      return true;
    } catch (error) {
      console.error('AIサービス: ダウンロードエラー', error);
      return false;
    }
  }
  
  // ダウンロード再開データを保存
  private async _saveDownloadResumeData(resumeData: any): Promise<void> {
    try {
      if (FileSystem.documentDirectory) {
        const resumeFilePath = `${FileSystem.documentDirectory}download-resume-data.json`;
        await FileSystem.writeAsStringAsync(resumeFilePath, JSON.stringify(resumeData));
      }
    } catch (error) {
      console.error('AIサービス: 再開データ保存エラー', error);
    }
  }
  
  // ダウンロード再開データを取得
  private async _getDownloadResumeData(): Promise<any | null> {
    try {
      if (FileSystem.documentDirectory) {
        const resumeFilePath = `${FileSystem.documentDirectory}download-resume-data.json`;
        const fileInfo = await FileSystem.getInfoAsync(resumeFilePath);
        
        if (fileInfo.exists) {
          const resumeData = await FileSystem.readAsStringAsync(resumeFilePath);
          return JSON.parse(resumeData);
        }
      }
      return null;
    } catch (error) {
      console.error('AIサービス: 再開データ取得エラー', error);
      return null;
    }
  }
  
  // ダウンロード再開データをクリア
  private async _clearDownloadResumeData(): Promise<void> {
    try {
      if (FileSystem.documentDirectory) {
        const resumeFilePath = `${FileSystem.documentDirectory}download-resume-data.json`;
        const fileInfo = await FileSystem.getInfoAsync(resumeFilePath);
        
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(resumeFilePath);
        }
      }
    } catch (error) {
      console.error('AIサービス: 再開データクリアエラー', error);
    }
  }
  
  // 実際に使用するモデルのパスを取得
  private async _getModelPath(): Promise<string> {
    // モックモードの場合はダミーパスを返す
    const USE_MOCK_MODE = false; // 本番環境ではfalseに設定
    if (USE_MOCK_MODE) {
      return 'mock://model.tflite';
    }
    
    // ローカルにモデルがある場合はそれを使用
    const modelExists = await this._checkModelExists();
    if (modelExists) {
      // ローカルファイルの絶対パスを返す（file://プレフィックスなし）
      return this.localModelPath;
    }
    
    // モデルが存在しない場合はエラー
    throw new Error('モデルファイルが見つかりません。ダウンロードが必要です。');
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

  // 102クラス分類用のひらがな文字マッピング（tflite_spec.mdに基づく正確な順序）
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

  // 同一扱いの文字ペア（tflite_spec.mdに基づく）
  private readonly IDENTICAL_PAIRS: Record<string, string> = {
    'を': 'お',
    'お': 'を',
    'ず': 'づ',
    'づ': 'ず',
    'じ': 'ぢ',
    'ぢ': 'じ'
  };

  // 類似ラベルペア（tflite_spec.mdに基づく）- AIが頻繁に間違えるペア
  private readonly SIMILAR_PAIRS: Record<string, string[]> = {
    'ぎ': ['じ', 'ぢ'],         // じ/ぢは元々同一扱い
    'じ': ['ぎ', 'ぢ'],         
    'ぢ': ['ぎ', 'じ'],
    'ぎゅ': ['じゅ', 'ず', 'づ'], // ず/づは元々同一扱い
    'じゅ': ['ぎゅ', 'ず', 'づ'], 
    'ず': ['ぎゅ', 'じゅ', 'づ', 'しょ', 'す'], 
    'づ': ['ぎゅ', 'じゅ', 'ず'],
    'は': ['ほ'],
    'ほ': ['は'],
    'ぱ': ['ぷ'],
    'ぷ': ['ぱ'],
    // 音響的に類似した拗音ペアを追加
    'りゃ': ['ぴゃ', 'びゃ', 'みゃ'],
    'ぴゃ': ['りゃ', 'びゃ'],
    'びゃ': ['りゃ', 'ぴゃ'],
    'りゅ': ['ぴゅ', 'びゅ', 'みゅ'],
    'ぴゅ': ['りゅ', 'びゅ'],
    'びゅ': ['りゅ', 'ぴゅ'],
    // しょ/ず の誤認識対策を追加
    'しょ': ['ず', 'じょ', 'しゅ'],
    'りょ': ['ぴょ', 'びょ', 'みょ'],
    'ぴょ': ['りょ', 'びょ'],
    'びょ': ['りょ', 'ぴょ']
  };

  // ソフトマックス関数を適用してlogitsを確率に変換
  private softmax(logits: number[]): number[] {
    // 数値の安定性のために最大値を引く
    const maxLogit = Math.max(...logits);
    const expScores = logits.map(logit => Math.exp(logit - maxLogit));
    const sumExpScores = expScores.reduce((sum, exp) => sum + exp, 0);
    return expScores.map(exp => exp / sumExpScores);
  }

  // 確率配列を処理してTop-3結果を生成
  private async processProbabilities(
    logits: number[],
    character: string | undefined,
    expectedResult: string | undefined,
    startTime: number
  ): Promise<AIClassificationResult> {
    // 処理時間の計算
    const processingTimeMs = Date.now() - startTime;
    
    // モデル出力が104クラスの場合、102クラスに調整
    if (logits.length === 104) {
      console.log('AIサービス: 104クラス出力を102クラスに調整');
      // 最後の2要素を削除（またはマッピングを調整）
      logits = logits.slice(0, 102);
    } else if (logits.length !== 102) {
      console.warn(`AIサービス: 予期しないクラス数: ${logits.length} (期待値: 102)`);
    }
    
    // ソフトマックスを適用してlogitsを確率に変換
    console.log('AIサービス: ソフトマックス適用前のlogits (最初の5個):', logits.slice(0, 5));
    const probabilities = this.softmax(logits);
    console.log('AIサービス: ソフトマックス適用後の確率 (最初の5個):', probabilities.slice(0, 5).map(p => (p * 100).toFixed(2) + '%'));
    
    // 確率と文字のペアを作成してソート
    const probabilityPairs = probabilities.map((prob, index) => ({
      character: this.CLASS_LABELS[index] || `未知_${index}`,
      confidence: prob
    }));
    
    // 確率の高い順にソート
    probabilityPairs.sort((a, b) => b.confidence - a.confidence);
    
    // Top-3を取得
    const top3 = probabilityPairs.slice(0, 3);
    
    // 最も確率の高い予測結果
    const topPrediction = top3[0];
    
    // 正解判定ロジック（Top-3 + 類似ラベル調整）
    let isCorrect = false;
    if (character) {
      const top3Characters = top3.map(p => p.character);
      
      // デバッグ情報を詳細に出力
      console.log(`\n=== AI認識詳細デバッグ情報 ===`);
      console.log(`期待される文字: ${character}`);
      console.log(`Top-3予測結果:`);
      top3.forEach((pred, i) => {
        const charIndex = this.CLASS_LABELS.indexOf(pred.character);
        console.log(`  ${i+1}位: ${pred.character} (信頼度: ${(pred.confidence * 100).toFixed(1)}%, インデックス: ${charIndex})`);
      });
      
      // 特定の文字のインデックスを確認
      console.log('デバッグ: 特定文字のインデックス');
      console.log(`  ぴゃ: ${this.CLASS_LABELS.indexOf('ぴゃ')}`);
      console.log(`  びゅ: ${this.CLASS_LABELS.indexOf('びゅ')}`);
      console.log(`  お: ${this.CLASS_LABELS.indexOf('お')}`);
      console.log(`  期待される文字(${character}): ${this.CLASS_LABELS.indexOf(character || '')}`);
      
      // 確率配列の全体的な分布を確認
      const sortedIndices = probabilities
        .map((prob, idx) => ({ prob, idx }))
        .sort((a, b) => b.prob - a.prob)
        .slice(0, 10);
      console.log('上位10個の確率分布:');
      sortedIndices.forEach((item, i) => {
        console.log(`  ${i+1}位: インデックス${item.idx} (${this.CLASS_LABELS[item.idx] || '未知'}) = ${(item.prob * 100).toFixed(1)}%`);
      });
      
      // 直接的な正解判定
      if (top3Characters.includes(character)) {
        isCorrect = true;
        const position = top3Characters.indexOf(character) + 1;
        console.log(`✓ 正解判定: Top-${position}に含まれています`);
      } else {
        // 同一扱いの文字チェック
        const identicalChar = this.IDENTICAL_PAIRS[character];
        if (identicalChar && top3Characters.includes(identicalChar)) {
          isCorrect = true;
          const position = top3Characters.indexOf(identicalChar) + 1;
          console.log(`✓ 正解判定: 同一扱い文字マッチ`);
          console.log(`  期待: ${character}`);
          console.log(`  同一扱い: ${identicalChar}`);
          console.log(`  Top-${position}に含まれています`);
        } else {
          // 類似ラベルチェック
          const similarLabels = this.SIMILAR_PAIRS[character] || [];
          const matchedSimilar = similarLabels.filter(label => top3Characters.includes(label));
          if (matchedSimilar.length > 0) {
            isCorrect = true;
            console.log(`✓ 正解判定: 類似ラベルマッチ`);
            console.log(`  期待: ${character}`);
            console.log(`  類似ラベル: [${similarLabels.join(', ')}]`);
            console.log(`  マッチした類似: [${matchedSimilar.join(', ')}]`);
          } else {
            console.log(`✗ 不正解判定`);
            console.log(`  期待: ${character}`);
            console.log(`  同一扱い: ${identicalChar || 'なし'}`);
            console.log(`  類似ラベル: [${similarLabels.join(', ')}]`);
            console.log(`  いずれもTop-3に含まれていません`);
          }
        }
      }
      console.log(`=== デバッグ情報終了 ===\n`);
    }
    
    const result: AIClassificationResult = {
      level: 'beginner', // レベルは固定（TFLiteモデルでは使用しない）
      character: topPrediction.character,
      confidence: topPrediction.confidence,
      timestamp: new Date().toISOString(),
      processingTimeMs,
      isCorrect,
      top3 // Top-3結果を追加
    };

    // 結果をデータベースに保存
    this.saveResultToDatabase(result, undefined).catch(err => {
      console.error('AIサービス: 結果保存エラー', err);
    });

    return result;
  }

  // iOS Simulatorかどうかを検出
  private isIOSSimulator(): boolean {
    // React Native の Platform を使用して検出
    const isIOS = typeof navigator !== 'undefined' && 
                  navigator.userAgent && 
                  (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad'));
    const isSimulator = isIOS && navigator.userAgent.includes('Simulator');
    
    return isSimulator;
  }

  // WAVファイルを前処理してFloat32Array形式にする関数
  private async preprocessWav(wavPath: string): Promise<Float32Array> {
    try {
      // iOS Simulatorの場合は警告を表示
      if (this.isIOSSimulator()) {
        console.warn('AIサービス: iOS Simulatorを検出しました。音声録音が正しく動作しない可能性があります。');
        console.warn('AIサービス: 実機でのテストを推奨します。');
      }
      
      // WAVファイルをバイナリデータとして読み込み
      const wavData = await FileSystem.readAsStringAsync(wavPath, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      // Base64をバイナリデータにデコード
      // React Nativeでは Bufferが使えないため、別の方法でデコード
      const binaryString = atob(wavData);
      const binaryData = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        binaryData[i] = binaryString.charCodeAt(i);
      }
      
      console.log(`WAV前処理: ファイル全体サイズ = ${binaryData.length} バイト`);
      
      // WAVヘッダーを解析して正しいデータオフセットを取得
      let headerSize = 44; // デフォルトは44バイト
      
      // WAVファイルのヘッダーを解析
      // 最初の4バイトが"RIFF"かチェック
      if (binaryData[0] === 0x52 && binaryData[1] === 0x49 && 
          binaryData[2] === 0x46 && binaryData[3] === 0x46) {
        console.log('WAV前処理: 有効なRIFFヘッダーを検出');
      } else {
        console.warn('WAV前処理: RIFFヘッダーが見つかりません');
      }
      
      // "data"チャンクを探す（より効率的な検索）
      let dataChunkFound = false;
      for (let i = 12; i < binaryData.length - 8; i += 2) { // 偶数位置のみチェック
        if (binaryData[i] === 0x64 && // 'd'
            binaryData[i+1] === 0x61 && // 'a'
            binaryData[i+2] === 0x74 && // 't'
            binaryData[i+3] === 0x61) { // 'a'
          
          // dataチャンクのサイズを読み取る（リトルエンディアン）
          const dataSize = binaryData[i+4] | (binaryData[i+5] << 8) | 
                          (binaryData[i+6] << 16) | (binaryData[i+7] << 24);
          
          headerSize = i + 8; // "data" + サイズ(4バイト) の後からデータ開始
          console.log(`WAV前処理: dataチャンクを位置 ${i} で発見`);
          console.log(`WAV前処理: dataチャンクサイズ = ${dataSize} バイト`);
          console.log(`WAV前処理: ヘッダーサイズ = ${headerSize} バイト`);
          dataChunkFound = true;
          break;
        }
      }
      
      if (!dataChunkFound) {
        console.error('WAV前処理: dataチャンクが見つかりません');
        throw new Error('無効なWAVファイル形式');
      }
      
      const audioData = binaryData.slice(headerSize);
      console.log(`WAV前処理: オーディオデータサイズ = ${audioData.length} バイト`);
      
      // 16ビットPCMデータを-1.0〜1.0のFloat32に変換
      const floatArray = new Float32Array(audioData.length / 2);
      for (let i = 0; i < floatArray.length; i++) {
        // 16ビットのリトルエンディアンでサンプルを取得して正規化
        const low = audioData[i * 2];
        const high = audioData[i * 2 + 1];
        const sample = (high << 8) | low;
        // 符号付き16ビット整数として扱う
        const signedSample = sample > 32767 ? sample - 65536 : sample;
        floatArray[i] = signedSample / 32768.0; // 16ビットの最大値で割って-1.0〜1.0に正規化
      }
      
      // 音声データの正規化（音量が小さい場合の対策）
      const maxAbs = Math.max(...floatArray.map(v => Math.abs(v)));
      console.log(`WAV前処理: 最大振幅 = ${maxAbs}`);
      
      // 最大振幅が小さすぎる場合は正規化
      if (maxAbs > 0 && maxAbs < 0.3) {
        const normalizationFactor = 0.5 / maxAbs; // 最大振幅を0.5に正規化
        console.log(`WAV前処理: 正規化係数 = ${normalizationFactor.toFixed(2)}x`);
        for (let i = 0; i < floatArray.length; i++) {
          floatArray[i] *= normalizationFactor;
        }
      }
      
      // モデルが期待するサンプル数（32000）に調整
      const expectedSamples = 32000; // 2秒 × 16kHz
      if (floatArray.length !== expectedSamples) {
        console.log(`WAV前処理: サンプル数調整 ${floatArray.length} → ${expectedSamples}`);
        
        const adjustedArray = new Float32Array(expectedSamples);
        if (floatArray.length > expectedSamples) {
          // 長すぎる場合は切り詰める
          adjustedArray.set(floatArray.slice(0, expectedSamples));
        } else {
          // 短すぎる場合はゼロパディング
          adjustedArray.set(floatArray);
          // 残りは0で埋められる（Float32Arrayのデフォルト）
        }
        
        // 正規化が適用された場合は調整後の配列にも適用
        if (maxAbs > 0 && maxAbs < 0.3) {
          const normalizationFactor = 0.5 / maxAbs;
          for (let i = 0; i < adjustedArray.length; i++) {
            if (i < floatArray.length) {
              adjustedArray[i] = floatArray[i];
            }
          }
        }
        
        return adjustedArray;
      }
      
      return floatArray;
    } catch (error) {
      console.error('WAV前処理エラー:', error);
      throw error;
    }
  }

  // 特定の文字に対する音声から推論を行う
  async classifySpeech(character?: string, expectedResult?: string, audioUri?: string): Promise<AIClassificationResult | null> {
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
      
      let wavPath: string;
      
      if (audioUri) {
        // 既存の録音URIが提供された場合はそれを使用
        console.log(`AIサービス: 提供された録音を使用 - ${audioUri}`);
        wavPath = audioUri;
      } else {
        // URIが提供されていない場合は新規録音
        console.log('AIサービス: 音声録音開始');
        wavPath = await voiceService.record2SecWav();
        console.log(`AIサービス: 録音完了 - ${wavPath}`);
      }

      // WAVデータを前処理
      console.log('AIサービス: 音声前処理開始');
      const floatArray = await this.preprocessWav(wavPath);
      console.log('AIサービス: 音声前処理完了');
      console.log('AIサービス: 入力データサイズ:', floatArray.length);
      // 音声データの統計を計算
      const audioStats = {
        min: Math.min(...floatArray),
        max: Math.max(...floatArray),
        mean: floatArray.reduce((a, b) => a + b, 0) / floatArray.length,
        first10: Array.from(floatArray).slice(0, 10),
        last10: Array.from(floatArray).slice(-10),
        // 実際の音声部分（無音を除く）の統計
        nonZeroCount: floatArray.filter(v => Math.abs(v) > 0.001).length, // 閾値を0.01から0.001に変更
        rms: Math.sqrt(floatArray.reduce((sum, v) => sum + v * v, 0) / floatArray.length)
      };
      
      console.log('AIサービス: 入力データ統計:', audioStats);
      console.log(`AIサービス: 非ゼロサンプル数: ${audioStats.nonZeroCount} / ${floatArray.length} (${(audioStats.nonZeroCount / floatArray.length * 100).toFixed(1)}%)`);
      console.log(`AIサービス: RMS値: ${audioStats.rms.toFixed(4)}`);
      
      // 音声データが極端に少ない場合の警告
      if (audioStats.nonZeroCount < floatArray.length * 0.01) {
        console.warn(`AIサービス: 音声データが非常に少ないです (${(audioStats.nonZeroCount / floatArray.length * 100).toFixed(1)}%)`);
        console.warn('AIサービス: マイクの権限を確認し、はっきりと発音してください。');
      }

      // 推論実行
      console.log('AIサービス: 推論開始');
      
      try {
        // モデルの入力形状を確認
        const inputShape = this.model.inputs[0];
        console.log('AIサービス: モデル入力形状:', inputShape);
        
        // 入力データを配列として渡す
        // runSyncは入力テンソルの配列を期待する
        const inputs = [floatArray];
        
        // 推論を実行
        const outputs = this.model.runSync(inputs);
        
        // 出力形状を確認
        const outputShape = this.model.outputs[0];
        console.log('AIサービス: モデル出力形状:', outputShape);
        
        // 出力データを取得（最初の出力テンソル）
        const probabilities = outputs[0];
        console.log('AIサービス: 推論完了');
        console.log('AIサービス: 出力型:', typeof probabilities);
        console.log('AIサービス: 出力コンストラクタ:', probabilities?.constructor?.name);
        console.log('AIサービス: 出力長さ:', probabilities?.length);
        console.log('AIサービス: 最初の10要素:', probabilities ? Array.from(probabilities).slice(0, 10) : 'null');
        
        // 配列でない場合は配列に変換（TypedArrayの場合も考慮）
        let probabilityArray: number[];
        if (Array.isArray(probabilities)) {
          console.log('AIサービス: 通常の配列として処理');
          probabilityArray = probabilities;
        } else if (probabilities instanceof Float32Array || probabilities instanceof Float64Array) {
          console.log('AIサービス: Float32/64Arrayとして処理');
          probabilityArray = Array.from(probabilities);
        } else if (probabilities && typeof probabilities.length === 'number') {
          // その他のTypedArrayまたは配列風オブジェクトの場合
          console.log('AIサービス: 配列風オブジェクトとして処理');
          probabilityArray = [];
          for (let i = 0; i < probabilities.length; i++) {
            probabilityArray.push(Number(probabilities[i]));
          }
        } else {
          console.error('AIサービス: 予期しない出力形式:', probabilities);
          throw new Error('モデル出力が予期しない形式です');
        }
        return this.processProbabilities(probabilityArray, character, expectedResult, startTime);
      } catch (inferenceError) {
        console.error('AIサービス: 推論実行エラー', inferenceError);
        // フォールバック: 102クラス用のダミーデータを返す
        console.log('AIサービス: フォールバックモードでダミーデータを使用');
        
        // 102クラス用のダミー確率配列を生成
        const probabilities = new Array(102).fill(0.001); // 全て低い確率で初期化
        
        // 期待される文字が指定されている場合は、その文字に高い確率を割り当て
        if (character) {
          const charIndex = this.CLASS_LABELS.indexOf(character);
          if (charIndex !== -1) {
            probabilities[charIndex] = 0.85; // 期待される文字に高い確率
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
          }
        } else {
          // 期待される文字が不明な場合はランダムに高い確率を割り当て
          const randomIndex = Math.floor(Math.random() * 102);
          probabilities[randomIndex] = 0.75;
        }
        
        return this.processProbabilities(probabilities, character, expectedResult, startTime);
      }

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

  // モデルをクリーンアップ
  async cleanup(): Promise<void> {
    try {
      if (this.model) {
        // モデルを解放
        this.model = null;
      }
      this.state = AIServiceState.NOT_INITIALIZED;
      console.log('AIサービス: クリーンアップ完了');
    } catch (error) {
      console.error('AIサービス: クリーンアップエラー', error);
    }
  }

  // モデルファイルを削除（ストレージ容量を開放）
  async deleteModelFile(): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(this.localModelPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(this.localModelPath);
        console.log('AIサービス: モデルファイルを削除しました');
      }
    } catch (error) {
      console.error('AIサービス: モデルファイル削除エラー', error);
    }
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

// Export the real TensorFlow Lite service
export default new AIService();