import { Platform } from 'react-native';

// 音声認識サービスのタイプ
export enum SpeechRecognitionServiceType {
  VOICE = 'voice'
}

// 音声認識結果の型定義
export interface SpeechRecognitionResult {
  text: string;
  isFinal: boolean;
  confidence?: number;
}

class SpeechRecognitionServiceMock {
  private isInitialized: boolean = false;
  private isListening: boolean = false;
  private serviceType: SpeechRecognitionServiceType = SpeechRecognitionServiceType.VOICE;
  private resultCallback: ((result: SpeechRecognitionResult) => void) | null = null;
  private errorCallback: ((error: string) => void) | null = null;

  // サービスの初期化
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      console.log('音声認識サービス（モック）: 初期化');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('音声認識サービス（モック）の初期化エラー:', error);
      return false;
    }
  }

  // 音声認識の開始
  public async startListening(
    resultCallback: (result: SpeechRecognitionResult) => void,
    errorCallback: (error: string) => void
  ): Promise<boolean> {
    if (this.isListening) {
      return true;
    }

    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        return false;
      }
    }

    this.resultCallback = resultCallback;
    this.errorCallback = errorCallback;

    try {
      console.log('音声認識サービス（モック）: 音声認識開始');
      
      // モックとして2秒後にダミーの結果を返す
      setTimeout(() => {
        if (this.resultCallback && this.isListening) {
          const mockTexts = ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ'];
          const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
          
          this.resultCallback({
            text: randomText,
            isFinal: true,
            confidence: 0.85
          });
        }
      }, 2000);
      
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('音声認識開始エラー（モック）:', error);
      if (this.errorCallback) {
        this.errorCallback('音声認識の開始に失敗しました');
      }
      return false;
    }
  }

  // 音声認識の停止
  public async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      console.log('音声認識サービス（モック）: 音声認識停止');
    } catch (error) {
      console.error('音声認識停止エラー（モック）:', error);
    } finally {
      this.isListening = false;
    }
  }

  // リソースの解放
  public async cleanup(): Promise<void> {
    await this.stopListening();
    this.resultCallback = null;
    this.errorCallback = null;
    this.isInitialized = false;
  }

  // 認識中かどうかの確認
  public isRecognizing(): boolean {
    return this.isListening;
  }

  // サービスタイプの取得
  public getServiceType(): SpeechRecognitionServiceType {
    return this.serviceType;
  }

  // 利用可能かどうかの確認
  public async isAvailable(): Promise<boolean> {
    // モックなので常にtrue
    return true;
  }
}

// シングルトンインスタンスとしてエクスポート
export default new SpeechRecognitionServiceMock();