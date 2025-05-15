import { Platform } from 'react-native';
import Voice from '@react-native-voice/voice';

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

class SpeechRecognitionService {
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
      // react-native-voiceの初期化
      const available = await Voice.isAvailable();
      if (!available) {
        console.error('音声認識機能が利用できません');
        return false;
      }

      Voice.onSpeechResults = this.handleVoiceResults.bind(this);
      Voice.onSpeechPartialResults = this.handleVoicePartialResults.bind(this);
      Voice.onSpeechError = this.handleVoiceError.bind(this);

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('音声認識サービスの初期化エラー:', error);
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
      // react-native-voiceの音声認識開始
      await Voice.start('ja-JP');
      
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('音声認識開始エラー:', error);
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
      // react-native-voiceの音声認識停止
      await Voice.stop();
    } catch (error) {
      console.error('音声認識停止エラー:', error);
    } finally {
      this.isListening = false;
    }
  }

  // リソースの解放
  public async cleanup(): Promise<void> {
    try {
      if (this.isListening) {
        await this.stopListening();
      }

      await Voice.destroy();
      Voice.removeAllListeners();

      this.isInitialized = false;
      this.resultCallback = null;
      this.errorCallback = null;
    } catch (error) {
      console.error('音声認識クリーンアップエラー:', error);
    }
  }

  // react-native-voiceの結果ハンドラ
  private handleVoiceResults(event: any) {
    if (event.value && event.value.length > 0 && this.resultCallback) {
      this.resultCallback({
        text: event.value[0],
        isFinal: true
      });
    }
  }

  // react-native-voiceの部分結果ハンドラ
  private handleVoicePartialResults(event: any) {
    if (event.value && event.value.length > 0 && this.resultCallback) {
      this.resultCallback({
        text: event.value[0],
        isFinal: false
      });
    }
  }

  // react-native-voiceのエラーハンドラ
  private handleVoiceError(event: any) {
    if (this.errorCallback) {
      this.errorCallback(event.error?.message || '音声認識エラー');
    }
  }
}

export default new SpeechRecognitionService(); 