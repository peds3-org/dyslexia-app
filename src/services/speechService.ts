import * as Speech from 'expo-speech';

class SpeechService {
  private initialized: boolean = false;
  private voiceEnabled: boolean = true;

  toggleVoice(enabled: boolean) {
    this.voiceEnabled = enabled;
    console.log(`SpeechService: 音声を${enabled ? '有効' : '無効'}にしました`);
    
    if (!enabled) {
      this.stop().catch(err => {
        console.error('音声停止エラー:', err);
      });
    }
    
    return this.voiceEnabled;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // 音声サービスの初期化確認 (Expo Speechは特別な初期化は不要)
      this.initialized = true;
      console.log('SpeechService initialized');
    } catch (error) {
      console.error('SpeechService initialization error:', error);
      throw error;
    }
  }

  async speak(text: string): Promise<void> {
    try {
      if (!this.voiceEnabled) {
        console.log('SpeechService: 音声が無効なため読み上げをスキップします');
        return;
      }
      
      if (!this.initialized) {
        await this.initialize();
      }
      
      // 日本語の声で読み上げる
      await Speech.speak(text, {
        language: 'ja-JP',
        pitch: 1.0,
        rate: 0.75, // 少しゆっくり目
      });
    } catch (error) {
      console.error('Speech error:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await Speech.stop();
    } catch (error) {
      console.error('Speech stop error:', error);
    }
  }
}

// シングルトンインスタンスをエクスポート
const speechService = new SpeechService();
export default speechService; 