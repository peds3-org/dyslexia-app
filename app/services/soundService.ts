import { Audio } from 'expo-av';

// 音声ファイルを直接インポート - ファイル名ではなく効果音名をキーにする
const SOUND_FILES: Record<string, any> = {
  shuriken: require('../../assets/sounds/shuriken.wav'),
  correct: require('../../assets/sounds/correct.wav'),
  incorrect: require('../../assets/sounds/incorrect.wav'),
  levelUp: require('../../assets/sounds/level-up.wav')
};

// BGMファイルも静的に定義
const BGM_FILES: Record<string, any> = {
  indexPage: require('../../assets/sounds/index_page.mp3')
};

class SoundService {
  private sounds: Record<string, Audio.Sound> = {};
  private initialized = false;
  private bgm: Audio.Sound | null = null;
  private isLoading = false;
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

  async ensureInitialized() {
    if (!this.initialized && !this.isLoading) {
      await this.loadSounds();
    }
    return this.initialized;
  }

  async loadSounds() {
    // 既に読み込み中なら待機
    if (this.isLoading) {
      console.log('SoundService: 既に読み込み中のため待機します');
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.isLoading) {
            clearInterval(checkInterval);
            resolve(this.initialized);
          }
        }, 100);
      });
    }

    // 既に初期化済みならスキップ
    if (this.initialized) {
      console.log('SoundService: 既に初期化済みのためスキップします');
      return true;
    }

    this.isLoading = true;
    console.log('SoundService: サウンド読み込み開始');

    try {
      // サウンドファイルを読み込む
      for (const soundName in SOUND_FILES) {
        try {
          console.log(`SoundService: ${soundName}の読み込みを試行`);
          const sound = new Audio.Sound();
          await sound.loadAsync(SOUND_FILES[soundName]);
          this.sounds[soundName] = sound;
          console.log(`SoundService: ${soundName}の読み込み成功`);
        } catch (error) {
          console.log(`SoundService: ${soundName}の読み込みに失敗: ${error}`);
        }
      }

      this.initialized = true;
      this.isLoading = false;
      console.log('SoundService: サウンド初期化完了');
      return true;
    } catch (error) {
      console.error('SoundService: サウンド読み込みエラー', error);
      // エラーが発生しても初期化済みとマークする（空のサウンドで継続）
      this.initialized = true;
      this.isLoading = false;
      return false;
    }
  }

  async playBGM(track: string) {
    try {
      if (!this.soundEnabled) {
        console.log(`SoundService: サウンドが無効のためBGM再生をスキップします - ${track}`);
        return false;
      }
      
      if (this.bgm) {
        await this.stopBGM();
      }
      
      console.log(`SoundService: BGM再生を試行 - ${track}`);
      this.bgm = new Audio.Sound();
      
      // BGMマッピング - トラック名からキーへの変換
      const bgmKey = track === 'index_page.mp3' ? 'indexPage' : track;
      
      try {
        if (BGM_FILES[bgmKey]) {
          await this.bgm.loadAsync(BGM_FILES[bgmKey]);
          await this.bgm.setIsLoopingAsync(true);
          await this.bgm.playAsync();
          console.log(`SoundService: BGM再生開始 - ${bgmKey}`);
          return true;
        } else {
          console.log(`SoundService: BGMファイル(${bgmKey})が見つかりません`);
          this.bgm = null;
          return false;
        }
      } catch (e) {
        console.log(`SoundService: BGMファイルのロードエラー: ${e}`);
        this.bgm = null;
        return false;
      }
    } catch (error) {
      console.error('SoundService: BGM再生エラー:', error);
      return false;
    }
  }

  async stopBGM() {
    try {
      if (this.bgm) {
        await this.bgm.stopAsync().catch(() => {});
        await this.bgm.unloadAsync().catch(() => {});
        this.bgm = null;
        console.log('SoundService: BGM停止完了');
      }
      return true;
    } catch (error) {
      console.error('SoundService: BGM停止エラー:', error);
      this.bgm = null;
      return false;
    }
  }

  async playEffect(effectName: string) {
    try {
      if (!this.soundEnabled) {
        console.log(`SoundService: サウンドが無効のため効果音再生をスキップします - ${effectName}`);
        return false;
      }
      
      console.log(`SoundService: 効果音再生試行 - ${effectName}`);
      const sound = this.sounds[effectName];
      if (sound) {
        try {
          await sound.setPositionAsync(0).catch(() => {});
          await sound.playAsync().catch(() => {
            console.log(`SoundService: 効果音(${effectName})の再生に失敗しましたが、処理を継続します`);
          });
          console.log(`SoundService: 効果音再生完了 - ${effectName}`);
          return true;
        } catch (e) {
          console.log(`SoundService: 効果音(${effectName})の再生に失敗しましたが、処理を継続します`);
          return false;
        }
      }
      console.log(`SoundService: 効果音(${effectName})が見つかりません`);
      return false;
    } catch (error) {
      console.error(`SoundService: 効果音再生エラー (${effectName}):`, error);
      return false;
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

export const soundService = new SoundService();
export default soundService; 