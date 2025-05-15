import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import * as Speech from 'expo-speech';

// 音声ファイルを直接インポート - ファイル名ではなく効果音名をキーにする
const SOUND_FILES: Record<string, any> = {
  shuriken: require('../../assets/sounds/shuriken.wav'),
  correct: require('../../assets/sounds/correct.wav'),
  incorrect: require('../../assets/sounds/incorrect.wav'),
  levelUp: require('../../assets/sounds/level-up.wav'),
  success: require('../../assets/sounds/success.mp3'),
  error: require('../../assets/sounds/select.mp3'),  // エラー音として select.mp3 を使用
  click: require('../../assets/sounds/select.mp3')
};

// BGMファイルも静的に定義
const BGM_FILES: Record<string, any> = {
  indexPage: require('../../assets/sounds/index_page.mp3'),
  menu: require('../../assets/sounds/index_page.mp3')
};

class SoundService {
  private sounds: { [key: string]: Audio.Sound } = {};
  private bgm: Audio.Sound | null = null;
  private initialized = false;
  private initializePromise: Promise<void> | null = null;
  private soundEnabled = true;

  toggleSound(enabled: boolean) {
    this.soundEnabled = enabled;
    console.log(`SoundService: サウンドを${enabled ? '有効' : '無効'}にしました`);
    
    if (!enabled && this.bgm) {
      this.stopBGM().catch(err => {
        console.error('BGM停止エラー:', err);
      });
    }
    
    return this.soundEnabled;
  }

  async initialize(): Promise<void> {
    if (this.initializePromise) {
      return this.initializePromise;
    }

    this.initializePromise = this._initialize();
    return this.initializePromise;
  }

  private async _initialize(): Promise<void> {
    try {
      if (this.initialized) return;

      // サウンドの事前ロード
      await Promise.all(
        Object.entries(SOUND_FILES).map(([key, source]) => 
          this.loadSound(key, source)
        )
      );

      this.initialized = true;
    } catch (error) {
      console.error('サウンドサービス初期化エラー:', error);
      this.initialized = true;  // エラーが発生しても初期化完了とマーク
    } finally {
      this.initializePromise = null;
    }
  }

  private async loadSound(key: string, source: any): Promise<void> {
    try {
      const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: false });
      this.sounds[key] = sound;
    } catch (error) {
      console.error(`サウンド[${key}]のロードに失敗:`, error);
    }
  }

  async playSound(key: string): Promise<void> {
    try {
      if (!this.soundEnabled) {
        console.log(`SoundService: サウンドが無効のため効果音再生をスキップします - ${key}`);
        return;
      }

      if (!this.initialized) {
        await this.initialize();
      }

      const sound = this.sounds[key];
      if (!sound) {
        console.warn(`サウンド[${key}]が見つかりません`);
        return;
      }

      await sound.setPositionAsync(0);
      await sound.playAsync();
    } catch (error) {
      console.error(`サウンド[${key}]の再生に失敗:`, error);
    }
  }

  async playBGM(source: any): Promise<void> {
    try {
      if (!this.soundEnabled) {
        console.log(`SoundService: サウンドが無効のためBGM再生をスキップします`);
        return;
      }

      if (this.bgm) {
        await this.stopBGM();
      }

      const { sound } = await Audio.Sound.createAsync(source, {
        shouldPlay: true,
        isLooping: true,
        volume: 0.5
      });

      this.bgm = sound;
    } catch (error) {
      console.error('BGM再生エラー:', error);
    }
  }

  async stopBGM(): Promise<void> {
    try {
      if (this.bgm) {
        await this.bgm.stopAsync();
        await this.bgm.unloadAsync();
        this.bgm = null;
      }
    } catch (error) {
      console.error('BGM停止エラー:', error);
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async playEffect(effectName: string) {
    try {
      if (!this.soundEnabled) {
        console.log(`SoundService: サウンドが無効のため効果音再生をスキップします - ${effectName}`);
        return false;
      }

      if (!this.initialized) {
        await this.initialize();
      }
      
      const sound = this.sounds[effectName];
      if (sound) {
        try {
          await sound.setPositionAsync(0).catch(() => {});
          await sound.playAsync().catch(() => {});
          return true;
        } catch (e) {
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error(`サウンド再生エラー (${effectName}):`, error);
      return false;
    }
  }

  // ひらがな文字の音声を再生する
  playCharacterSound(character: string): void {
    try {
      if (!this.soundEnabled) {
        console.log(`SoundService: サウンドが無効のため文字の発音をスキップします - ${character}`);
        return;
      }
      
      console.log(`SoundService: 文字の発音 - ${character}`);
      
      // expo-speechを使用して文字を発音
      Speech.speak(character, {
        language: 'ja-JP',
        rate: 0.8,
        pitch: 1.0,
      });
      
      // クリック効果音も再生
      this.playEffect('click').catch(err => {
        console.error('クリック効果音再生エラー:', err);
      });
    } catch (error) {
      console.error(`文字の発音エラー (${character}):`, error);
    }
  }

  async unloadSounds() {
    try {
      console.log('SoundService: サウンドアンロード開始');
      
      // BGMのアンロード
      if (this.bgm) {
        await this.stopBGM().catch(() => {});
      }
      
      // 効果音のアンロード
      for (const soundKey in this.sounds) {
        const sound = this.sounds[soundKey];
        if (sound) {
          try {
            await sound.stopAsync().catch(() => {});
            await sound.unloadAsync().catch(() => {});
            console.log(`SoundService: サウンド(${soundKey})をアンロードしました`);
          } catch (e) {
            // 個別のエラーをログに記録するが、全体の処理は続行
            console.error(`SoundService: サウンド(${soundKey})アンロードエラー:`, e);
          }
        }
      }
      
      this.sounds = {};
      this.initialized = false;
      console.log('SoundService: サウンドアンロード完了');
      return true;
    } catch (error) {
      console.error('SoundService: サウンドアンロードエラー', error);
      // エラーがあっても状態をクリアする
      this.sounds = {};
      this.initialized = false;
      return false;
    }
  }
}

export default new SoundService(); 