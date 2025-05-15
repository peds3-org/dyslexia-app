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
    this.initialize();
  }

  async ensureInitialized(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.isInitializing) {
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
      await this.cleanup();
      await Voice.start('ja-JP');
      await Voice.stop();
      
      this.isInitialized = true;
      this.lastInitTime = Date.now();
    } catch (error) {
      console.error('音声認識の初期化エラー:', error);
    } finally {
      this.isInitializing = false;
    }
  }

  private async initialize(): Promise<void> {
    try {
      if (this.cleanupInProgress) {
        let attempts = 0;
        while (this.cleanupInProgress && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
      }

      this.isDestroying = false;
      try {
        await Voice.destroy();
      } catch (e) {
        // エラーは無視
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      this.registerAllListeners();
      this.isInitialized = true;
    } catch (error) {
      this.isInitialized = false;
      console.error('音声認識の初期化エラー:', error);
      throw error;
    }
  }

  private registerAllListeners() {
    if (this.isDestroying) return;
    
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0 && this.currentCallback && this.isListening && !this.hasSentResult) {
        this.hasSentResult = true;
        this.stopListening().then(() => {
          if (this.currentCallback) {
            this.currentCallback(e.value![0].toLowerCase());
          }
        });
        
        if (this.recognitionTimeout) {
          clearTimeout(this.recognitionTimeout);
          this.recognitionTimeout = null;
        }
      }
    };
    
    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      if (this.currentErrorCallback && this.isListening) {
        this.isListening = false;
        this.hasSentResult = false;
        this.currentErrorCallback(e.error?.message || '音声認識に失敗しました');
      }
      
      if (this.recognitionTimeout) {
        clearTimeout(this.recognitionTimeout);
        this.recognitionTimeout = null;
      }
    };

    Voice.onSpeechVolumeChanged = () => {};
    Voice.onSpeechStart = () => {};
    Voice.onSpeechEnd = () => {};
  }

  private removeAllListeners(): void {
    Voice.onSpeechStart = () => {};
    Voice.onSpeechRecognized = () => {};
    Voice.onSpeechEnd = () => {};
    Voice.onSpeechError = () => {};
    Voice.onSpeechResults = () => {};
    Voice.onSpeechPartialResults = () => {};
    Voice.onSpeechVolumeChanged = () => {};
  }

  async startListening(
    onResult: (text: string) => void,
    onError: (error: string | Error) => void,
    config?: VoiceConfig
  ): Promise<void> {
    try {
      if (this.isListening) {
        console.log('VoiceService: 既に録音中のため停止します');
        await this.stopListening();
        await this.removeAllListeners();
      }

      await this.ensureInitialized();

      this.removeAllListeners();
      
      Voice.onSpeechResults = (e: SpeechResultsEvent) => {
        if (e.value && e.value.length > 0) {
          const text = e.value[0];
          console.log('VoiceService: 音声認識結果', text);
          
          this.clearTimeout();
          
          this.removeAllListeners();
          this.isListening = false;
          
          onResult(text);
        } else {
          console.log('VoiceService: 空の結果を受信');
          onError('音声認識結果が空です');
        }
      };

      Voice.onSpeechError = (e: SpeechErrorEvent) => {
        const errorMessage = `音声認識エラー: ${e.error?.message || JSON.stringify(e.error)}`;
        console.error('VoiceService:', errorMessage);
        
        this.clearTimeout();
        
        this.removeAllListeners();
        this.isListening = false;
        
        onError(errorMessage);
      };

      console.log('VoiceService: 録音開始');
      await Voice.start('ja-JP');
      this.isListening = true;

      const timeout = config?.timeout || 10000;
      this.timeoutId = setTimeout(() => {
        console.log(`VoiceService: ${timeout}msタイムアウト`);
        this.stopListening()
          .then(() => {
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

  async cleanup(): Promise<void> {
    try {
      console.log('VoiceService: クリーンアップ開始');
      this.clearTimeout();
      
      if (this.isListening) {
        try {
          await Voice.stop();
        } catch (e) {
          console.error('VoiceService: 停止エラー', e);
        }
        this.isListening = false;
      }
      
      this.removeAllListeners();
      
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

  private clearTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  speakText(text: string) {
    return Speech.speak(text, {
      language: 'ja-JP',
      rate: 0.8,
      pitch: 1.1,
    });
  }
  
  isRecording(): boolean {
    return this.isListening;
  }
  
  // 2秒間のWAVファイルを録音する
  async record2SecWav(): Promise<string> {
    console.log('VoiceService: 2秒間WAV録音開始');
    
    try {
      // 録音設定
      const recordingOptions: Audio.RecordingOptions = {
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/wav',
          bitsPerSecond: 256000,
        },
      };
      
      // Audio Recording権限のリクエスト
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('録音権限がありません');
      }
      
      // オーディオモードの設定
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: 2, // DUCK_OTHERS
        interruptionModeAndroid: 2, // DUCK_OTHERS
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      // 録音オブジェクトの作成
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(recordingOptions);
      
      // 録音開始
      await recording.startAsync();
      console.log('VoiceService: 録音中...');
      
      // 2秒後に録音停止
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 録音停止
      await recording.stopAndUnloadAsync();
      console.log('VoiceService: 録音停止');
      
      // 録音されたファイルのURIを取得
      const uri = recording.getURI();
      if (!uri) {
        throw new Error('録音ファイルのURIが取得できませんでした');
      }
      
      console.log(`VoiceService: 録音完了 - ${uri}`);
      return uri;
    } catch (error) {
      console.error('VoiceService: 録音エラー', error);
      throw error;
    }
  }
}

export const voiceService = new VoiceService();
export default voiceService; 