import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import Base64 from 'react-native-base64';
import RemoteAIService from './remoteAIService';

// デバッグ用のグローバル変数
declare global {
  var __useRemoteAI: boolean;
}

// 環境変数からリモートAIの設定を取得
const REMOTE_AI_URL = process.env.EXPO_PUBLIC_AI_SERVER_URL || 'http://localhost:8000';
const REMOTE_AI_KEY = process.env.EXPO_PUBLIC_AI_API_KEY;

// Tfliteモジュールのインポート
let loadTensorflowModel: any = null;
let tfliteAvailable = false;

// react-native-fast-tfliteの遅延読み込み
const initializeTflite = async () => {
  if (tfliteAvailable) return true;
  
  try {
    const { NativeModules } = require('react-native');
    
    console.log('AIサービス: react-native-fast-tfliteモジュールの読み込みを開始...');
    console.log('AIサービス: 利用可能なNativeModules:', Object.keys(NativeModules));
    
    // デバッグ用: モジュールの存在確認
    if ('Tflite' in NativeModules) {
      console.log('AIサービス: Tfliteモジュールがネイティブに登録されています');
    } else {
      console.warn('AIサービス: Tfliteモジュールがネイティブに登録されていません');
      
      // 開発環境での暫定対応
      if (__DEV__) {
        console.warn('AIサービス: 開発環境のため、リモートAIサービスにフォールバックします');
        (global as any).__useRemoteAI = true;
        return false;
      }
    }
    
    // モジュールのインポートを試みる（try-catchで保護）
    try {
      console.log('AIサービス: react-native-fast-tfliteのrequireを実行...');
      const tflite = require('react-native-fast-tflite');
      console.log('AIサービス: requireが成功しました');
      console.log('AIサービス: tfliteオブジェクトの内容:', Object.keys(tflite || {}));
      
      if (tflite && tflite.loadTensorflowModel && typeof tflite.loadTensorflowModel === 'function') {
        loadTensorflowModel = tflite.loadTensorflowModel;
        tfliteAvailable = true;
        console.log('AIサービス: Tfliteモジュールを正常に読み込みました');
        return true;
      }
    } catch (requireError: any) {
      console.error('AIサービス: requireエラー:', requireError.message);
      console.error('AIサービス: エラースタック:', requireError.stack);
      
      if (__DEV__) {
        console.warn('AIサービス: 開発環境のため、エラーを無視してフォールバックします');
        (global as any).__useRemoteAI = true;
        return false;
      } else {
        // 本番環境では再スローしない（クラッシュを防ぐ）
        console.error('AIサービス: 本番環境でTFLiteモジュールの読み込みに失敗しました');
        return false;
      }
    }
    
    // グローバル関数を確認
    if (typeof (global as any).__loadTensorflowModel === 'function') {
      loadTensorflowModel = (global as any).__loadTensorflowModel;
      tfliteAvailable = true;
      console.log('AIサービス: Tfliteモジュールを正常に読み込みました（グローバル）');
      return true;
    }
    
    console.warn('AIサービス: TFLiteモジュールが利用できません');
    console.warn('AIサービス: AI機能は制限されます');
    return false;
    
  } catch (error) {
    console.error('AIサービス: Tfliteモジュールの読み込みに失敗しました', error);
    return false;
  }
};

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

// メモリ効率化オプション
export interface MemoryEfficientOptions {
  useMemoryMapping?: boolean; // メモリマップドファイルを使用
  maxMemoryMB?: number; // 最大メモリ使用量（MB）
  enableGarbageCollection?: boolean; // アグレッシブなGCを有効化
}

class AIService {
  private model: any | null = null;
  private state: AIServiceState = AIServiceState.NOT_INITIALIZED;
  private error: string | null = null;
  private initializePromise: Promise<boolean> | null = null;
  private modelPath: string = 'assets/model.tflite';
  private currentSessionId: string | null = null;
  private memoryOptions: MemoryEfficientOptions = {
    useMemoryMapping: true,
    maxMemoryMB: 500, // デフォルト500MB制限
    enableGarbageCollection: true,
  };
  private remoteService: RemoteAIService | null = null;
  
  // モデルのリモートURL（テスト用のダミーURL）
  //private remoteModelUrl: string = 'https://storage.googleapis.com/tfjs-models/tfjs/mnist_v1/model.json'; // テスト用URL - 実際のTFLiteモデルURLに置き換えてください
  // モデルのリモートURL（GitHubリリース）
  private remoteModelUrl: string = 'https://github.com/peds3-org/dyslexia-app/releases/download/v0.0.1-beta/model.tflite';
  // ローカルストレージのパス
  private get localModelPath(): string {
    const documentDir = FileSystem.documentDirectory;
    if (!documentDir) {
      // Fallback path for when FileSystem is not available
      return 'model.tflite';
    }
    return `${documentDir}model.tflite`;
  }

  // 進捗コールバック
  private progressCallback: DownloadProgressCallback | null = null;
  
  // 進捗コールバックを設定
  setProgressCallback(callback: DownloadProgressCallback | null): void {
    this.progressCallback = callback;
  }

  // AIモデルが準備完了しているかチェック
  async isReady(): Promise<boolean> {
    return this.state === AIServiceState.READY;
  }

  // Tfliteモジュールが利用可能かチェック
  async isTfliteAvailable(): Promise<boolean> {
    console.log('AIサービス: isTfliteAvailable called, current state:', tfliteAvailable);
    // 遅延初期化を試みる
    if (!tfliteAvailable) {
      console.log('AIサービス: TFLite not available yet, attempting initialization...');
      await initializeTflite();
    }
    console.log('AIサービス: isTfliteAvailable returning:', tfliteAvailable);
    return tfliteAvailable;
  }

  // AIモデルがダウンロード済みかチェック
  async isModelDownloaded(): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(this.localModelPath);
      return fileInfo.exists && (fileInfo as any).size > 0;
    } catch (error) {
      console.error('AIサービス: モデルファイル確認エラー', error);
      return false;
    }
  }
  
  // メモリ効率化オプションの設定
  setMemoryOptions(options: MemoryEfficientOptions): void {
    this.memoryOptions = { ...this.memoryOptions, ...options };
    console.log('AIサービス: メモリオプション更新', this.memoryOptions);
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
      
      // リモートAI使用フラグまたは本番環境の場合はリモートAIを使用
      if ((global as any).__useRemoteAI || !__DEV__) {
        console.log('AIサービス: リモートAIサービスを使用します');
        this.remoteService = new RemoteAIService({
          serverUrl: REMOTE_AI_URL,
          apiKey: REMOTE_AI_KEY,
          timeout: 30000,
        });
        
        const remoteInitialized = await this.remoteService.initialize();
        if (remoteInitialized) {
          this.state = AIServiceState.READY;
          console.log('AIサービス: リモートAIサービスの初期化成功');
          return true;
        } else {
          console.error('AIサービス: リモートAIサービスの初期化失敗');
          this.state = AIServiceState.ERROR;
          this.error = 'リモートAIサービスに接続できません';
          return false;
        }
      }
      
      // Tfliteモジュールの初期化を試みる
      const tfliteInitialized = await initializeTflite();
      if (!tfliteInitialized) {
        console.warn('AIサービス: Tfliteモジュールが利用できません。AI機能は制限されます。');
        // TFLiteが利用できなくてもアプリは続行する
        this.state = AIServiceState.ERROR;
        this.error = 'TFLiteモジュールが利用できません';
        return false;
      }

      // バンドルからの読み込みをスキップ（1.2GBはバンドルサイズ制限を超えるため）
      console.log('AIサービス: バンドルからの読み込みをスキップ（ファイルサイズが大きすぎるため）');
      let bundledModelLoaded = false;
          
      
      // ステップ1: ローカルストレージのモデルチェック
      console.log('\nAIサービス: ステップ1 - ローカルストレージのモデルチェック開始');
      
      // ネットワーク接続を確認 (ダウンロードに必要)
      const networkStatus = await this._checkNetworkConnection();
      console.log('AIサービス: ネットワーク状態:', {
        isConnected: networkStatus.isConnected,
        type: networkStatus.type || 'unknown'
      });
      
      if (!networkStatus.isConnected) {
        // ローカルにモデルファイルが存在するか確認
        const modelExists = await this._checkModelExists();
        console.log('AIサービス: ローカルモデル存在確認:', modelExists);
        
        if (!modelExists) {
          console.error('AIサービス: ❌ ネットワーク接続がなく、モデルもローカルにありません');
          throw new Error('ネットワーク接続がなく、モデルもローカルにありません');
        } else {
          console.log('AIサービス: ✅ オフラインですが、ローカルモデルが存在します');
        }
      }
      
      
      // ローカルにモデルファイルが存在するか確認
      const modelExists = await this._checkModelExists();
      console.log('AIサービス: ローカルモデルファイル存在確認:', {
        exists: modelExists,
        path: this.localModelPath
      });
      
      // モデルが存在しない場合、ダウンロードする
      if (!modelExists) {
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
      
      // モデルのパスを取得 (ダウンロードされたモデル用)
      const modelPath = await this._getModelPath(); // これは主にダウンロードされたモデルのパスを指す
      
      // ファイルの存在とサイズを確認
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      
      if (!fileInfo.exists) {
        throw new Error('モデルファイルが存在しません');
      }
      
      if (fileInfo.exists && (fileInfo as any).size === 0) {
        throw new Error('モデルファイルが空です');
      }
      
      
      try {
        // TFLiteモジュールが利用できない場合はエラー
        if (!loadTensorflowModel) {
          throw new Error('TFLiteモジュールが利用できません');
        }
        
        // 本番環境での安全チェック
        if (!modelPath.startsWith('file://') && !modelPath.startsWith('/')) {
          console.error('AIサービス: 無効なモデルパス:', modelPath);
          throw new Error('モデルパスが無効です');
        }
        
        // 本番モード: 実際のモデルを読み込む (ダウンロードされたモデル)
        try {
          console.log('\nAIサービス: ローカルストレージからモデル読み込み試行');
          console.log('AIサービス: モデルパス:', modelPath);
          
          const modelUrl = modelPath.startsWith('file://') ? modelPath : `file://${modelPath}`;
          const modelSource = { url: modelUrl };
          console.log('AIサービス: モデルソース:', modelSource);
          
          // メモリ効率化オプションを適用
          const loadOptions = this.memoryOptions.useMemoryMapping ? {
            enableMemoryMapping: true,
            maxMemoryBytes: (this.memoryOptions.maxMemoryMB || 500) * 1024 * 1024,
          } : {};
          
          this.model = await loadTensorflowModel(modelSource, loadOptions);
          
          if (this.model) {
            console.log('AIサービス: ✅ モデル読み込み完了 (ローカルストレージ)');
            console.log('AIサービス: モデル情報:', {
              inputs: this.model.inputs?.length || 'unknown',
              outputs: this.model.outputs?.length || 'unknown',
              delegate: this.model.delegate || 'unknown'
            });
          } else {
            throw new Error('モデルのロード結果がnullです');
          }
        } catch (modelLoadError) {
          console.error('AIサービス: ❌ TensorFlowモデル読み込みエラー (ローカルストレージ):', modelLoadError);
          throw modelLoadError;
        }
      } catch (loadError) {
        console.error('AIサービス: モデル読み込みエラー (ダウンロードフェーズ後)', loadError);
        
        // モデルファイルが破損している可能性があるため、削除して再ダウンロードを試みる
        
        try {
          await FileSystem.deleteAsync(this.localModelPath);
          
          // 再ダウンロード
          this.state = AIServiceState.DOWNLOADING;
          const downloadSuccess = await this._downloadModel();
          
          if (downloadSuccess && loadTensorflowModel) {
            // 再度読み込みを試みる (ダウンロードされたモデル)
            const newModelPath = await this._getModelPath();
            const newModelUrl = newModelPath.startsWith('file://') ? newModelPath : `file://${newModelPath}`;
            const newModelSource = { url: newModelUrl };
            this.model = await loadTensorflowModel(newModelSource);
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
      console.error('AIサービス: ❌ 初期化エラー (総合)', error);
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
        console.log('AIサービス: モデルファイルが存在しません:', this.localModelPath);
        return false;
      }
      
      // ファイルサイズもチェック
      const fileSize = (fileInfo as any).size || 0;
      console.log('AIサービス: モデルファイルサイズ:', `${(fileSize / (1024 * 1024)).toFixed(2)}MB`);
      
      if (fileSize < MIN_MODEL_SIZE) {
        console.warn(`AIサービス: モデルファイルが小さすぎます (${(fileSize / 1024).toFixed(2)}KB < 1MB)`);
        // 不完全なファイルを削除
        try {
          await FileSystem.deleteAsync(this.localModelPath);
          console.log('AIサービス: 不完全なモデルファイルを削除しました');
        } catch (deleteError) {
          console.error('AIサービス: 不完全なファイルの削除エラー', deleteError);
        }
        return false;
      }
      
      console.log('AIサービス: ✅ 有効なモデルファイルが存在します');
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
      const documentDir = FileSystem.documentDirectory;
      if (!documentDir) {
        console.error('AIサービス: FileSystem.documentDirectoryが利用できません');
        return false;
      }
      
      try {
        const dirInfo = await FileSystem.getInfoAsync(documentDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(documentDir, { intermediates: true });
        }
      } catch (dirError) {
        console.error('AIサービス: ディレクトリ確認/作成エラー:', dirError);
        // ディレクトリが作成できなくても続行を試みる
      }
      
      // ダウンロードの進捗を監視するコールバック
      const downloadCallback = (downloadProgress: FileSystem.DownloadProgressData) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        
        // 進捗コールバックを呼び出す
        if (this.progressCallback) {
          this.progressCallback(progress);
        }
      };
      
      // ダウンロード再開可能なオブジェクトを作成
      let downloadResumable;
      try {
        // @ts-ignore - FileSystem型の問題を一時的に回避
        downloadResumable = FileSystem.createDownloadResumable(
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
      } catch (createError) {
        console.error('AIサービス: ダウンロードオブジェクト作成エラー:', createError);
        return false;
      }
      
      // 保存されたダウンロード情報があれば再開を試みる
      const resumeData = await this._getDownloadResumeData();
      let result = null;
      
      if (resumeData) {
        try {
          result = await downloadResumable.resumeAsync();
          
          if (!result) {
            result = await downloadResumable.downloadAsync();
          }
        } catch (resumeError) {
          result = await downloadResumable.downloadAsync();
        }
      } else {
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

  // 104クラス出力のうち0-100のインデックスのみ使用（101文字）
  private readonly CLASS_LABELS: string[] = [
    'あ', 'い', 'う', 'え', 'お',
    'か', 'が', 'き', 'きゃ', 'きゅ', 'きょ', 'ぎ', 'ぎゃ', 'ぎゅ', 'ぎょ', 'く', 'ぐ', 'け', 'げ', 'こ', 'ご',
    'さ', 'ざ', 'し', 'しゃ', 'しゅ', 'しょ', 'じ', 'じゃ', 'じゅ', 'じょ', 'す', 'ず', 'せ', 'ぜ', 'そ', 'ぞ',
    'た', 'だ', 'ち', 'ちゃ', 'ちゅ', 'ちょ', 'つ', 'て', 'で', 'と', 'ど',
    'な', 'に', 'にゃ', 'にゅ', 'にょ', 'ぬ', 'ね', 'の',
    'は', 'ば', 'ぱ', 'ひ', 'ひゃ', 'ひゅ', 'ひょ', 'び', 'びゃ', 'びゅ', 'びょ', 'ぴ', 'ぴゃ', 'ぴゅ', 'ぴょ', 'ふ', 'ぶ', 'ぷ', 'へ', 'べ', 'ぺ', 'ほ', 'ぼ', 'ぽ',
    'ま', 'み', 'みゃ', 'みゅ', 'みょ', 'む', 'め', 'も',
    'や', 'ゆ', 'よ',
    'ら', 'り', 'りゃ', 'りゅ', 'りょ', 'る', 'れ', 'ろ',
    'わ', 'ん'
  ];

  // 同一扱いの文字ペア
  // 注意: AIモデルは「づ」→「ず」、「ぢ」→「じ」、「を」→「お」として出力するため、
  // これらの文字はCLASS_LABELSには含まれていない。
  // このマッピングは入力文字の正解判定時に使用される。
  private readonly IDENTICAL_PAIRS: Record<string, string> = {
    'を': 'お',
    'お': 'を',
    'ず': 'づ',
    'づ': 'ず',
    'じ': 'ぢ',
    'ぢ': 'じ'
  };

  // 類似ラベルペア（tflite_spec.mdに基づく）- AIが頻繁に間違えるペア
  // 注意: 「ぢ」「づ」「を」は入力時の判定に使用されるが、AIモデルの出力には含まれない
  public readonly SIMILAR_PAIRS: Record<string, string[]> = {
    'ぎ': ['じ'],              // 「ぢ」は「じ」として出力される
    'じ': ['ぎ'],         
    'ぢ': ['ぎ', 'じ'],        // 入力が「ぢ」の場合の判定用
    'ぎゅ': ['じゅ', 'ず'],     // 「づ」は「ず」として出力される
    'じゅ': ['ぎゅ', 'ず'], 
    'ず': ['ぎゅ', 'じゅ', 'しょ', 'す'], 
    'づ': ['ぎゅ', 'じゅ', 'ず'], // 入力が「づ」の場合の判定用
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
    console.log('\n========== AI評価処理開始 ==========');
    console.log(`AIサービス: 評価対象文字 = ${character || '不明'}`);
    
    // 処理時間の計算
    const processingTimeMs = Date.now() - startTime;
    
    // ソフトマックスを適用してlogitsを確率に変換
    const probabilities = this.softmax(logits);
    
    // 確率と文字のペアを作成してソート（0-100のインデックスのみ使用）
    const probabilityPairs = probabilities.slice(0, 101).map((prob, index) => ({
      character: this.CLASS_LABELS[index] || `未知_${index}`,
      confidence: prob,
      index: index
    }));
    
    
    // 確率の高い順にソート
    probabilityPairs.sort((a, b) => b.confidence - a.confidence);
    
    // Top-3を取得
    const top3 = probabilityPairs.slice(0, 3);
    
    // デバッグ: Top-3の予測結果を表示
    console.log(`AIサービス: 正解文字「${character || '不明'}」に対するTop-3予測:`);
    top3.forEach((pred, i) => {
      console.log(`  ${i + 1}位: [${pred.index}] ${pred.character} (確率: ${(pred.confidence * 100).toFixed(2)}%)`);
    });
    
    // 最も確率の高い予測結果
    const topPrediction = top3[0];
    
    // 正解判定ロジック（Top-3 + 類似ラベル調整）
    let isCorrect = false;
    if (character) {
      const top3Characters = top3.map(p => p.character);
      
      
      // 直接的な正解判定
      if (top3Characters.includes(character)) {
        isCorrect = true;
        const position = top3Characters.indexOf(character) + 1;
      } else {
        // 同一扱いの文字チェック
        const identicalChar = this.IDENTICAL_PAIRS[character];
        if (identicalChar && top3Characters.includes(identicalChar)) {
          isCorrect = true;
          const position = top3Characters.indexOf(identicalChar) + 1;
        } else {
          // 類似ラベルチェック
          const similarLabels = this.SIMILAR_PAIRS[character] || [];
          const matchedSimilar = similarLabels.filter(label => top3Characters.includes(label));
          if (matchedSimilar.length > 0) {
            isCorrect = true;
          } else {
          }
        }
      }
    }
    
    // デバッグ: 最終的な判定結果
    console.log(`AIサービス: 最終判定 = ${isCorrect ? '正解' : '不正解'} (予測: ${topPrediction.character}, 正解: ${character || '不明'})`);
    console.log(`AIサービス: 処理時間: ${processingTimeMs}ms`);
    
    const result: AIClassificationResult = {
      level: 'beginner', 
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
    
    console.log('========== AI評価処理完了 ==========\n');

    return result;
  }

  // iOS Simulatorかどうかを検出
  private isIOSSimulator(): boolean {
    // React Native の Platform を使用して検出
    const isIOS = typeof navigator !== 'undefined' && 
                  navigator.userAgent && 
                  (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad'));
    const isSimulator = !!(isIOS && navigator.userAgent.includes('Simulator'));
    
    return isSimulator;
  }

  // 処理済みの音声データをWAVファイルとして保存
  private async saveProcessedWav(audioData: Float32Array, originalPath: string): Promise<string> {
    try {
      // 16ビットPCMに変換
      const int16Data = new Int16Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        // -1.0 〜 1.0 の範囲を -32768 〜 32767 に変換
        const sample = Math.max(-1, Math.min(1, audioData[i]));
        int16Data[i] = sample < 0 ? sample * 32768 : sample * 32767;
      }

      // WAVヘッダーを作成
      const sampleRate = 16000;
      const numChannels = 1;
      const bitsPerSample = 16;
      const dataSize = int16Data.length * 2;
      const fileSize = 44 + dataSize - 8;

      const header = new ArrayBuffer(44);
      const view = new DataView(header);

      // RIFF header
      view.setUint32(0, 0x46464952, false); // "RIFF"
      view.setUint32(4, fileSize, true);
      view.setUint32(8, 0x45564157, false); // "WAVE"

      // fmt subchunk
      view.setUint32(12, 0x20746d66, false); // "fmt "
      view.setUint32(16, 16, true); // subchunk1 size
      view.setUint16(20, 1, true); // audio format (PCM)
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true); // byte rate
      view.setUint16(32, numChannels * bitsPerSample / 8, true); // block align
      view.setUint16(34, bitsPerSample, true);

      // data subchunk
      view.setUint32(36, 0x61746164, false); // "data"
      view.setUint32(40, dataSize, true);

      // ヘッダーとデータを結合
      const headerArray = new Uint8Array(header);
      const dataArray = new Uint8Array(int16Data.buffer);
      const wavData = new Uint8Array(headerArray.length + dataArray.length);
      wavData.set(headerArray);
      wavData.set(dataArray, headerArray.length);

      // Base64にエンコード
      let base64String = '';
      try {
        // Convert Uint8Array to binary string first
        let binaryStr = '';
        for (let i = 0; i < wavData.length; i++) {
          binaryStr += String.fromCharCode(wavData[i]);
        }
        
        // Use react-native-base64 for encoding
        base64String = Base64.encode(binaryStr);
      } catch (error) {
        console.error('Base64エンコードエラー:', error);
        throw new Error('音声データのエンコードに失敗しました');
      }

      // 新しいファイル名を生成
      const timestamp = new Date().getTime();
      const processedPath = `${FileSystem.documentDirectory}processed_${timestamp}.wav`;

      // ファイルとして保存
      await FileSystem.writeAsStringAsync(processedPath, base64String, {
        encoding: FileSystem.EncodingType.Base64
      });

      return processedPath;
    } catch (error) {
      console.error('AIサービス: 処理済み音声の保存エラー:', error);
      return originalPath; // エラー時は元のパスを返す
    }
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
      // React Nativeでは atob が使えない場合があるため、安全な方法でデコード
      let binaryString: string;
      try {
        // Use react-native-base64 for decoding
        binaryString = Base64.decode(wavData);
      } catch (error) {
        console.error('Base64デコードエラー:', error);
        throw new Error('音声データのデコードに失敗しました');
      }
      
      const binaryData = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        binaryData[i] = binaryString.charCodeAt(i);
      }
      
      
      // WAVヘッダーを解析して正しいデータオフセットを取得
      let headerSize = 44; // デフォルトは44バイト
      
      // WAVファイルのヘッダーを解析
      // 最初の4バイトが"RIFF"かチェック
      if (binaryData[0] === 0x52 && binaryData[1] === 0x49 && 
          binaryData[2] === 0x46 && binaryData[3] === 0x46) {
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
          dataChunkFound = true;
          break;
        }
      }
      
      if (!dataChunkFound) {
        console.error('WAV前処理: dataチャンクが見つかりません');
        throw new Error('無効なWAVファイル形式');
      }
      
      const audioData = binaryData.slice(headerSize);
      
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
      
      // 最大振幅が小さすぎる場合は正規化
      if (maxAbs > 0 && maxAbs < 0.3) {
        const normalizationFactor = 0.5 / maxAbs; // 最大振幅を0.5に正規化
        for (let i = 0; i < floatArray.length; i++) {
          floatArray[i] *= normalizationFactor;
        }
      }
      
      // モデルが期待するサンプル数（32000）に調整
      const expectedSamples = 32000; // 2秒 × 16kHz
      if (floatArray.length !== expectedSamples) {
        console.log(`WAV前処理: サンプル数調整 - 元: ${floatArray.length}サンプル (${(floatArray.length/16000).toFixed(2)}秒) → 32000サンプル (2.00秒)`);
        
        const adjustedArray = new Float32Array(expectedSamples);
        if (floatArray.length > expectedSamples) {
          // 長すぎる場合は切り詰める
          console.log(`WAV前処理: 音声が長すぎるため、最初の2秒のみを使用します`);
          adjustedArray.set(floatArray.slice(0, expectedSamples));
        } else {
          // 短すぎる場合はゼロパディング
          console.log(`WAV前処理: 音声が短いため、残り${expectedSamples - floatArray.length}サンプルを無音で埋めます`);
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
    try {
      // リモートサービスが有効な場合はそちらを使用
      if (this.remoteService && this.remoteService.isReady()) {
        console.log('AIサービス: リモートAIサービスを使用して推論を実行');
        
        if (!audioUri) {
          throw new Error('音声URIが提供されていません。');
        }
        
        const remoteResult = await this.remoteService.classifySpeech(
          character || '',
          audioUri
        );
        
        if (remoteResult) {
          return {
            level: 'beginner',
            character: remoteResult.character,
            confidence: remoteResult.confidence,
            timestamp: new Date().toISOString(),
            processingTimeMs: remoteResult.processingTimeMs,
            isCorrect: remoteResult.isCorrect,
            top3: remoteResult.top3
          };
        } else {
          console.error('AIサービス: リモートAIサービスから結果を取得できませんでした');
          return null;
        }
      }
      
      if (this.state !== AIServiceState.READY || !this.model) {
        console.warn('AIサービス: 初期化が完了していないか、モデルがロードされていません。');
        
        // TFLiteが利用できない場合のフォールバック
        if (!tfliteAvailable) {
          console.warn('AIサービス: TFLiteが利用できないため、ダミー結果を返します。');
          return {
            level: 'beginner',
            character: character || '不明',
            confidence: 0.5,
            timestamp: new Date().toISOString(),
            processingTimeMs: 0,
            isCorrect: false,
            top3: [
              { character: character || '不明', confidence: 0.5 },
              { character: 'あ', confidence: 0.3 },
              { character: 'い', confidence: 0.2 }
            ]
          };
        }
        
        return null;
      }
      const startTime = Date.now();
      
      let wavPath: string;
      
      if (audioUri) {
        // 既存の録音URIが提供された場合はそれを使用
        wavPath = audioUri;
      } else {
        // URIが提供されていない場合はエラーを投げる
        // 呼び出し側でvoiceServiceを使用して録音し、URIを渡すべき
        throw new Error('音声URIが提供されていません。呼び出し側で録音してURIを渡してください。');
      }

      // デバッグ用：元の録音ファイルパスを表示
      console.log(`AIサービス: 元の録音ファイル = ${wavPath}`);
      
      // WAVデータを前処理
      const floatArray = await this.preprocessWav(wavPath);
      console.log(`AIサービス: 音声データを処理しました (${floatArray.length}サンプル = ${floatArray.length/16000}秒)`);
      
      // デバッグ用：処理後の音声データを新しいWAVファイルとして保存（開発環境のみ）
      if (__DEV__) {
        try {
          const processedWavPath = await this.saveProcessedWav(floatArray, wavPath);
          console.log(`AIサービス: 処理済み音声ファイル = ${processedWavPath}`);
          console.log(`open "${processedWavPath}"`);
        } catch (saveError) {
          console.log('AIサービス: 処理済み音声の保存に失敗しましたが、AI処理は継続します');
        }
      }
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
      
      // 音声データの詳細情報をログ出力
      console.log('AIサービス: 音声データ統計:');
      console.log(`  - 最小値: ${audioStats.min.toFixed(4)}`);
      console.log(`  - 最大値: ${audioStats.max.toFixed(4)}`);
      console.log(`  - 平均値: ${audioStats.mean.toFixed(4)}`);
      console.log(`  - RMS（音量）: ${audioStats.rms.toFixed(4)}`);
      console.log(`  - 非無音サンプル数: ${audioStats.nonZeroCount} / ${floatArray.length} (${(audioStats.nonZeroCount / floatArray.length * 100).toFixed(1)}%)`);
      
      // 音声データが極端に少ない場合の警告
      if (audioStats.nonZeroCount < floatArray.length * 0.01) {
        console.warn('AIサービス: ⚠️ 音声データが非常に少ないです（1%未満）。無音の可能性があります。');
      } else if (audioStats.rms < 0.01) {
        console.warn('AIサービス: ⚠️ 音声の音量が非常に小さいです。マイクの設定を確認してください。');
      } else {
        console.log('AIサービス: ✅ 音声データは正常に含まれています。');
      }

      // 推論実行
      
      try {
        // モデルの入力形状を確認
        const inputShape = this.model.inputs[0];
        
        // 入力データを配列として渡す
        // runSyncは入力テンソルの配列を期待する
        const inputs = [floatArray];
        
        // 推論を実行
        const outputs = this.model.runSync(inputs);
        
        // 出力形状を確認
        const outputShape = this.model.outputs[0];
        
        // 出力データを取得（最初の出力テンソル）
        const probabilities = outputs[0];
        
        // 配列でない場合は配列に変換（TypedArrayの場合も考慮）
        let probabilityArray: number[];
        if (Array.isArray(probabilities)) {
          probabilityArray = probabilities;
        } else if (probabilities instanceof Float32Array || probabilities instanceof Float64Array) {
          probabilityArray = Array.from(probabilities);
        } else if (probabilities && typeof probabilities.length === 'number') {
          // その他のTypedArrayまたは配列風オブジェクトの場合
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
        throw inferenceError;
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

// Create and export the singleton instance
const aiServiceInstance = new AIService();

// Export the real TensorFlow Lite service
export default aiServiceInstance;