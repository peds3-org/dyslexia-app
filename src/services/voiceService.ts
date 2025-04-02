import { Audio } from 'expo-av';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechVolumeChangeEvent,
  SpeechStartEvent,
  SpeechEndEvent,
} from '@react-native-voice/voice';
import * as Speech from 'expo-speech';

type VoiceConfig = {
  timeout?: number;
  maxDuration?: number;
};

class VoiceService {
  private currentCallback: ((text: string) => void) | null = null;
  private currentErrorCallback: ((error: string) => void) | null = null;
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private lastInitTime: number = 0;
  private cleanupInProgress: boolean = false;
  private isListening: boolean = false;
  private hasSentResult: boolean = false;
  private recognitionTimeout: NodeJS.Timeout | null = null;
  private isDestroying: boolean = false;
  private timeoutId: NodeJS.Timeout | null = null;

  constructor() {
    console.log('VoiceService: インスタンス作成');
    // 初期化時にリスナーは登録しない
    this.initialize();
  }

  /**
   * 音声認識サービスが初期化されていることを確認する
   * 初期化されていない場合は初期化を行う
   */
  async ensureInitialized(): Promise<void> {
    if (this.isInitialized) {
      console.log('VoiceService: 既に初期化済み');
      return;
    }

    if (this.isInitializing) {
      console.log('VoiceService: 初期化処理中のため待機');
      await new Promise<void>((resolve) => {
        const checkInitialized = () => {
          if (this.isInitialized) {
            resolve();
          } else {
            setTimeout(checkInitialized, 100);
          }
        };
        checkInitialized();
      });
      return;
    }

    this.isInitializing = true;
    try {
      console.log('VoiceService: 初期化開始');
      await this.cleanup(); // まず確実にクリーンアップ
      
      // 音声認識エンジンの開始
      await Voice.start('ja-JP');
      await Voice.stop();
      
      this.isInitialized = true;
      this.lastInitTime = Date.now();
      console.log('VoiceService: 初期化完了');
    } catch (error) {
      console.error('VoiceService: 初期化エラー', error);
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * 音声認識サービスを初期化する
   */
  private async initialize(): Promise<void> {
    try {
      // クリーンアップが進行中なら待機
      if (this.cleanupInProgress) {
        console.log('VoiceService: クリーンアップ中のため初期化を遅延');
        let attempts = 0;
        while (this.cleanupInProgress && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
      }

      // 万が一前回の録音が残っている場合にリセット
      this.isDestroying = false;
      try {
        await Voice.destroy();
      } catch (e) {
        // エラーは無視
      }

      // 少し待機して初期化の完了を待つ
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 全てのイベントハンドラーを登録
      this.registerAllListeners();
      
      this.isInitialized = true;
      console.log('VoiceService: 初期化完了');
    } catch (error) {
      this.isInitialized = false;
      console.error('VoiceService: 初期化エラー', error);
      throw error;
    }
  }

  private registerAllListeners() {
    if (this.isDestroying) return;

    console.log('VoiceService: 全リスナー登録');
    
    // 結果ハンドラー
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      console.log('VoiceService: 音声認識結果受信', e.value);
      if (e.value && e.value.length > 0 && this.currentCallback && this.isListening && !this.hasSentResult) {
        // 一度だけ結果を送信するフラグを立てる
        this.hasSentResult = true;
        
        // 一旦停止してから結果を処理
        this.stopListening().then(() => {
          if (this.currentCallback) {
            this.currentCallback(e.value![0].toLowerCase());
          }
        });
        
        // タイムアウトをクリア
        if (this.recognitionTimeout) {
          clearTimeout(this.recognitionTimeout);
          this.recognitionTimeout = null;
        }
      }
    };
    
    // エラーハンドラー
    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      console.log('VoiceService: 音声認識エラー', e.error);
      if (this.currentErrorCallback && this.isListening) {
        this.isListening = false;
        this.hasSentResult = false;
        this.currentErrorCallback(e.error?.message || '音声認識に失敗しました');
      }
      
      // タイムアウトをクリア
      if (this.recognitionTimeout) {
        clearTimeout(this.recognitionTimeout);
        this.recognitionTimeout = null;
      }
    };

    // 音量変化ハンドラー
    Voice.onSpeechVolumeChanged = (e: SpeechVolumeChangeEvent) => {
      // 音量変化は記録するだけ
      // console.log('VoiceService: 音量変化', e.value);
    };
    
    // 開始ハンドラー
    Voice.onSpeechStart = (e: SpeechStartEvent) => {
      console.log('VoiceService: 音声認識開始');
    };
    
    // 終了ハンドラー
    Voice.onSpeechEnd = (e: SpeechEndEvent) => {
      console.log('VoiceService: 音声認識終了');
    };
  }

  private removeAllListeners(): void {
    Voice.onSpeechStart = () => {};
    Voice.onSpeechRecognized = () => {};
    Voice.onSpeechEnd = () => {};
    Voice.onSpeechError = () => {};
    Voice.onSpeechResults = () => {};
    Voice.onSpeechPartialResults = () => {};
    Voice.onSpeechVolumeChanged = () => {};
    console.log('VoiceService: 全リスナーを削除');
  }

  async startListening(
    onResult: (text: string) => void,
    onError: (error: string | Error) => void,
    config?: VoiceConfig
  ): Promise<void> {
    try {
      // 既に録音中なら一旦停止
      if (this.isListening) {
        console.log('VoiceService: 既に録音中のため停止します');
        await this.stopListening();
        await this.removeAllListeners();
      }

      // 初期化確認
      await this.ensureInitialized();

      // リスナー設定
      this.removeAllListeners(); // 念のため全リスナーを削除
      
      // 結果のハンドラを設定
      Voice.onSpeechResults = (e: SpeechResultsEvent) => {
        if (e.value && e.value.length > 0) {
          const text = e.value[0];
          console.log('VoiceService: 音声認識結果', text);
          
          // タイムアウトをクリア
          this.clearTimeout();
          
          // リスナーを削除してからコールバック実行
          this.removeAllListeners();
          this.isListening = false;
          
          onResult(text);
        } else {
          console.log('VoiceService: 空の結果を受信');
          onError('音声認識結果が空です');
        }
      };

      // エラーハンドラを設定
      Voice.onSpeechError = (e: SpeechErrorEvent) => {
        const errorMessage = `音声認識エラー: ${e.error?.message || JSON.stringify(e.error)}`;
        console.error('VoiceService:', errorMessage);
        
        // タイムアウトをクリア
        this.clearTimeout();
        
        // リスナーを削除してからコールバック実行
        this.removeAllListeners();
        this.isListening = false;
        
        onError(errorMessage);
      };

      // 音声認識を開始
      console.log('VoiceService: 録音開始');
      await Voice.start('ja-JP');
      this.isListening = true;

      // タイムアウト設定
      const timeout = config?.timeout || 10000;
      this.timeoutId = setTimeout(() => {
        console.log(`VoiceService: ${timeout}msタイムアウト`);
        this.stopListening()
          .then(() => {
            // リスナーを削除してからコールバック実行
            this.removeAllListeners();
            this.isListening = false;
            onError('音声認識がタイムアウトしました');
          })
          .catch((err) => {
            console.error('VoiceService: タイムアウト停止エラー', err);
            this.removeAllListeners();
            this.isListening = false;
            onError('タイムアウト処理中にエラー');
          });
      }, timeout);

    } catch (error) {
      console.error('VoiceService: 録音開始エラー', error);
      this.isListening = false;
      this.removeAllListeners();
      onError(error instanceof Error ? error : new Error('音声認識の開始に失敗しました'));
    }
  }

  async stopListening(): Promise<void> {
    try {
      this.clearTimeout();
      
      if (this.isListening) {
        console.log('VoiceService: 録音停止');
        await Voice.stop();
        this.isListening = false;
      } else {
        console.log('VoiceService: 録音中ではないため停止をスキップ');
      }
    } catch (error) {
      console.error('VoiceService: 録音停止エラー', error);
      throw error;
    }
  }

  /**
   * 音声認識サービスをクリーンアップする
   */
  async cleanup(): Promise<void> {
    try {
      console.log('VoiceService: クリーンアップ開始');
      this.clearTimeout();
      
      // 録音中なら停止
      if (this.isListening) {
        try {
          await Voice.stop();
        } catch (e) {
          console.error('VoiceService: 停止エラー', e);
        }
        this.isListening = false;
      }
      
      // 全てのリスナーを削除
      this.removeAllListeners();
      
      // Voice APIのリセット
      try {
        await Voice.destroy();
      } catch (e) {
        console.error('VoiceService: destroy エラー', e);
      }
      
      console.log('VoiceService: クリーンアップ完了');
    } catch (error) {
      console.error('VoiceService: クリーンアップエラー', error);
      throw error;
    }
  }

  // タイムアウトのクリア
  private clearTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  speakText(text: string) {
    try {
      Speech.speak(text, {
        language: 'ja-JP',
        rate: 0.8,
      });
    } catch (error) {
      console.error('VoiceService: 読み上げエラー', error);
    }
  }
  
  // 現在の録音状態を返す
  isRecording(): boolean {
    return this.isListening;
  }
}

export const voiceService = new VoiceService();
export default voiceService; 