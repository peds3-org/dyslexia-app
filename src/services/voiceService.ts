import { Audio } from 'expo-av';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Conditionally import Voice to avoid iOS simulator issues
let Voice: any = null;
try {
  Voice = require('@react-native-voice/voice').default;
} catch (error) {
  console.warn('Voice module not available in voiceService, using mock mode');
}

type VoiceConfig = {
  timeout?: number;
  maxDuration?: number;
};

// 音声認識状態
type RecognitionState = 'idle' | 'listening' | 'processing' | 'complete' | 'error';

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
  private state: RecognitionState = 'idle';
  private recording: Audio.Recording | null = null;
  private lastRecordingUri: string | null = null;
  private modelInitialized: boolean = false;

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
      
      // Voice モジュールが利用可能な場合のみ初期化
      if (Voice) {
        await Voice.start('ja-JP');
        await Voice.stop();
      }
      
      this.isInitialized = true;
      this.lastInitTime = Date.now();
    } catch (error) {
      console.error('音声認識の初期化エラー:', error);
      // Voice モジュールがなくても初期化済みとする
      this.isInitialized = true;
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
      
      // Voice モジュールが利用可能な場合のみ destroy を実行
      if (Voice) {
        try {
          await Voice.destroy();
        } catch (e) {
          // エラーは無視
        }
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
    
    // Voice モジュールが利用可能な場合のみリスナーを登録
    if (!Voice) return;
    
    Voice.onSpeechResults = (e: any) => {
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
    
    Voice.onSpeechError = (e: any) => {
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
    // Voice モジュールが利用可能な場合のみリスナーを削除
    if (!Voice) return;
    
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

      // Voice モジュールが利用できない場合はエラーを返す
      if (!Voice) {
        console.warn('VoiceService: Voiceモジュールが利用できません');
        onError('音声認識機能が利用できません');
        return;
      }

      this.removeAllListeners();
      
      Voice.onSpeechResults = (e: any) => {
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

      Voice.onSpeechError = (e: any) => {
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
        // Voice モジュールが利用可能な場合のみ停止
        if (Voice) {
          await Voice.stop();
        }
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
      
      // Voice モジュールが利用可能な場合のみ処理
      if (Voice) {
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
      } else {
        // Voice モジュールがない場合も状態をリセット
        this.isListening = false;
        this.removeAllListeners();
      }
      
      console.log('VoiceService: クリーンアップ完了');
    } catch (error) {
      console.error('VoiceService: クリーンアップエラー', error);
      // エラーをスローせずに処理を続行
      console.log('VoiceService: クリーンアップエラーを無視して続行');
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

  // AIモデルの初期化
  async initializeModel() {
    try {
      // ここでAIモデルの初期化を行う
      // 実際の実装ではTensorFlowモデルのロードなどを行う
      console.log('VoiceService: AIモデルを初期化中...');
      
      // モデル初期化の擬似処理（実際はモデルロード）
      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.modelInitialized = true;
      console.log('VoiceService: AIモデル初期化完了');
      return true;
    } catch (error) {
      console.error('VoiceService: AIモデル初期化エラー', error);
      return false;
    }
  }

  // 録音データをAIモデルで評価し、ひらがな認識結果を返す
  async evaluateRecording(targetCharacter: string, recordingUri?: string): Promise<{
    topResults: Array<{ character: string; confidence: number }>;
    result: 'correct' | 'incorrectA' | 'incorrectB';
    responseTimeMs: number;
  }> {
    try {
      const uri = recordingUri || this.lastRecordingUri;
      
      // 録音データがなくてもエラーにせず、モックデータを生成する
      if (!uri) {
        console.log(`VoiceService: 録音データがないため、モック評価を生成します (文字: ${targetCharacter})`);
        // モックAI評価を生成
        const mockEvaluation = this.mockAIEvaluation(targetCharacter);
        const responseTimeMs = Math.floor(Math.random() * 1500) + 500;
        
        // ランダムな結果の生成（開発/テスト用）
        const random = Math.random();
        let result: 'correct' | 'incorrectA' | 'incorrectB';
        
        if (random > 0.3) {
          result = 'correct'; // 70%の確率で正解
        } else if (random > 0.1) {
          result = 'incorrectA'; // 20%の確率で「惜しい」
        } else {
          result = 'incorrectB'; // 10%の確率で「残念」
        }
        
        console.log('VoiceService: モック評価結果', { 
          topResults: mockEvaluation,
          result,
          responseTimeMs
        });
        
        return {
          topResults: mockEvaluation,
          result,
          responseTimeMs
        };
      }

      console.log(`VoiceService: 録音を評価中... 対象文字: ${targetCharacter}`);

      // AIモデルが初期化されているか確認
      if (!this.modelInitialized) {
        await this.initializeModel();
      }

      // 実際のAI評価の代わりにモック実装
      // 本番環境では実際のAIモデルを使用する
      const mockEvaluation = this.mockAIEvaluation(targetCharacter);
      
      // 応答時間を擬似的に設定（実際の実装では録音開始からの経過時間）
      const responseTimeMs = Math.floor(Math.random() * 1500) + 500;
      
      // 判定結果を決定
      let result: 'correct' | 'incorrectA' | 'incorrectB';
      
      // トップの認識結果が対象文字と一致する場合は正解
      if (mockEvaluation[0].character === targetCharacter) {
        result = 'correct';
      } 
      // トップ3に対象文字が含まれる場合や音が似ている場合は「惜しい」
      else if (
        mockEvaluation.some(r => r.character === targetCharacter) || 
        this.isSimilarSound(targetCharacter, mockEvaluation[0].character)
      ) {
        result = 'incorrectA';
      } 
      // それ以外は「間違い」
      else {
        result = 'incorrectB';
      }
      
      console.log('VoiceService: 評価結果', { 
        topResults: mockEvaluation,
        result,
        responseTimeMs
      });
      
      return {
        topResults: mockEvaluation,
        result,
        responseTimeMs
      };
    } catch (error) {
      console.error('VoiceService: 録音評価エラー', error);
      
      // エラー時はデフォルト値を返す
      return {
        topResults: [
          { character: '？', confidence: 0.0 },
          { character: '？', confidence: 0.0 },
          { character: '？', confidence: 0.0 }
        ],
        result: 'incorrectB',
        responseTimeMs: 0
      };
    }
  }

  // 文字の音が似ているかを判定するヘルパー関数
  private isSimilarSound(char1: string, char2: string): boolean {
    // 清音・濁音の対応
    const similarSoundMap: Record<string, string[]> = {
      // 清音・濁音のペア
      'か': ['が'], 'き': ['ぎ'], 'く': ['ぐ'], 'け': ['げ'], 'こ': ['ご'],
      'が': ['か'], 'ぎ': ['き'], 'ぐ': ['く'], 'げ': ['け'], 'ご': ['こ'],
      'さ': ['ざ'], 'し': ['じ'], 'す': ['ず'], 'せ': ['ぜ'], 'そ': ['ぞ'],
      'ざ': ['さ'], 'じ': ['し'], 'ず': ['す'], 'ぜ': ['せ'], 'ぞ': ['そ'],
      'た': ['だ'], 'ち': ['ぢ'], 'つ': ['づ'], 'て': ['で'], 'と': ['ど'],
      'だ': ['た'], 'ぢ': ['ち'], 'づ': ['つ'], 'で': ['て'], 'ど': ['と'],
      'は': ['ば', 'ぱ'], 'ひ': ['び', 'ぴ'], 'ふ': ['ぶ', 'ぷ'], 'へ': ['べ', 'ぺ'], 'ほ': ['ぼ', 'ぽ'],
      'ば': ['は', 'ぱ'], 'び': ['ひ', 'ぴ'], 'ぶ': ['ふ', 'ぷ'], 'べ': ['へ', 'ぺ'], 'ぼ': ['ほ', 'ぽ'],
      'ぱ': ['は', 'ば'], 'ぴ': ['ひ', 'び'], 'ぷ': ['ふ', 'ぶ'], 'ぺ': ['へ', 'べ'], 'ぽ': ['ほ', 'ぼ'],
    };
    
    // 同じ行の母音違い（別のマップを使用）
    const rowSimilarityMap: Record<string, string[]> = {
      'あ': ['い', 'う', 'え', 'お'], 'い': ['あ', 'う', 'え', 'お'], 'う': ['あ', 'い', 'え', 'お'],
      'え': ['あ', 'い', 'う', 'お'], 'お': ['あ', 'い', 'う', 'え'],
      
      'か': ['き', 'く', 'け', 'こ'], 'き': ['か', 'く', 'け', 'こ'], 'く': ['か', 'き', 'け', 'こ'],
      'け': ['か', 'き', 'く', 'こ'], 'こ': ['か', 'き', 'く', 'け'],
      
      'さ': ['し', 'す', 'せ', 'そ'], 'し': ['さ', 'す', 'せ', 'そ'], 'す': ['さ', 'し', 'せ', 'そ'],
      'せ': ['さ', 'し', 'す', 'そ'], 'そ': ['さ', 'し', 'す', 'せ'],
      
      'た': ['ち', 'つ', 'て', 'と'], 'ち': ['た', 'つ', 'て', 'と'], 'つ': ['た', 'ち', 'て', 'と'],
      'て': ['た', 'ち', 'つ', 'と'], 'と': ['た', 'ち', 'つ', 'て'],
      
      'な': ['に', 'ぬ', 'ね', 'の'], 'に': ['な', 'ぬ', 'ね', 'の'], 'ぬ': ['な', 'に', 'ね', 'の'],
      'ね': ['な', 'に', 'ぬ', 'の'], 'の': ['な', 'に', 'ぬ', 'ね'],
      
      'は': ['ひ', 'ふ', 'へ', 'ほ'], 'ひ': ['は', 'ふ', 'へ', 'ほ'], 'ふ': ['は', 'ひ', 'へ', 'ほ'],
      'へ': ['は', 'ひ', 'ふ', 'ほ'], 'ほ': ['は', 'ひ', 'ふ', 'へ'],
      
      'ま': ['み', 'む', 'め', 'も'], 'み': ['ま', 'む', 'め', 'も'], 'む': ['ま', 'み', 'め', 'も'],
      'め': ['ま', 'み', 'む', 'も'], 'も': ['ま', 'み', 'む', 'め'],
      
      'や': ['ゆ', 'よ'], 'ゆ': ['や', 'よ'], 'よ': ['や', 'ゆ'],
      
      'ら': ['り', 'る', 'れ', 'ろ'], 'り': ['ら', 'る', 'れ', 'ろ'], 'る': ['ら', 'り', 'れ', 'ろ'],
      'れ': ['ら', 'り', 'る', 'ろ'], 'ろ': ['ら', 'り', 'る', 'れ'],
      
      'わ': ['を', 'ん'], 'を': ['わ', 'ん'], 'ん': ['わ', 'を'],
      
      // 拗音のグループ
      'しゃ': ['しゅ', 'しょ'], 'しゅ': ['しゃ', 'しょ'], 'しょ': ['しゃ', 'しゅ'],
      'ちゃ': ['ちゅ', 'ちょ'], 'ちゅ': ['ちゃ', 'ちょ'], 'ちょ': ['ちゃ', 'ちゅ'],
      'じゃ': ['じゅ', 'じょ'], 'じゅ': ['じゃ', 'じょ'], 'じょ': ['じゃ', 'じゅ'],
    };
    
    // 似ている音のリストを取得（両方のマップをチェック）
    const similarSounds = similarSoundMap[char1] || [];
    const rowSimilarSounds = rowSimilarityMap[char1] || [];
    
    // いずれかのマップに該当するか確認
    return similarSounds.includes(char2) || rowSimilarSounds.includes(char2);
  }

  // AIモデル評価のモック実装（開発用）
  private mockAIEvaluation(targetCharacter: string): Array<{ character: string; confidence: number }> {
    const hiraganaList = [
      'あ', 'い', 'う', 'え', 'お',
      'か', 'き', 'く', 'け', 'こ',
      'さ', 'し', 'す', 'せ', 'そ',
      'た', 'ち', 'つ', 'て', 'と',
      'な', 'に', 'ぬ', 'ね', 'の',
      'は', 'ひ', 'ふ', 'へ', 'ほ',
      'ま', 'み', 'む', 'め', 'も',
      'や', 'ゆ', 'よ',
      'ら', 'り', 'る', 'れ', 'ろ',
      'わ', 'を', 'ん'
    ];
    
    // 似ている文字を優先的に選ぶ
    const similarChars = this.isSimilarSound(targetCharacter, '') ? 
      hiraganaList.filter(char => this.isSimilarSound(targetCharacter, char)) : 
      [];
    
    // ランダム結果のシミュレーション
    const random = Math.random();
    let topResults: Array<{ character: string; confidence: number }> = [];
    
    // 70%の確率で正解
    if (random > 0.3) {
      topResults = [
        { character: targetCharacter, confidence: 0.8 + Math.random() * 0.2 },
        { character: similarChars[0] || this.getRandomHiragana(hiraganaList, [targetCharacter]), confidence: 0.3 + Math.random() * 0.3 },
        { character: similarChars[1] || this.getRandomHiragana(hiraganaList, [targetCharacter, topResults[1]?.character]), confidence: 0.1 + Math.random() * 0.2 }
      ];
    }
    // 20%の確率で似た文字（間違いA）
    else if (random > 0.1) {
      const similarChar = similarChars.length > 0 ? 
        similarChars[Math.floor(Math.random() * similarChars.length)] : 
        this.getRandomHiragana(hiraganaList, [targetCharacter]);
      
      topResults = [
        { character: similarChar, confidence: 0.6 + Math.random() * 0.3 },
        { character: targetCharacter, confidence: 0.4 + Math.random() * 0.2 },
        { character: this.getRandomHiragana(hiraganaList, [targetCharacter, similarChar]), confidence: 0.1 + Math.random() * 0.2 }
      ];
    }
    // 10%の確率で全く違う文字（間違いB）
    else {
      const randomChar1 = this.getRandomHiragana(hiraganaList, [targetCharacter, ...similarChars]);
      const randomChar2 = this.getRandomHiragana(hiraganaList, [targetCharacter, ...similarChars, randomChar1]);
      const randomChar3 = this.getRandomHiragana(hiraganaList, [targetCharacter, ...similarChars, randomChar1, randomChar2]);
      
      topResults = [
        { character: randomChar1, confidence: 0.5 + Math.random() * 0.3 },
        { character: randomChar2, confidence: 0.3 + Math.random() * 0.2 },
        { character: randomChar3, confidence: 0.1 + Math.random() * 0.2 }
      ];
    }
    
    return topResults;
  }

  // 指定した文字以外のランダムなひらがなを取得
  private getRandomHiragana(list: string[], exclude: (string | undefined)[]): string {
    const filteredList = list.filter(char => !exclude.includes(char));
    return filteredList[Math.floor(Math.random() * filteredList.length)];
  }

  // 音声を再生
  async playRecording(uri?: string): Promise<void> {
    try {
      const playbackUri = uri || this.lastRecordingUri;
      if (!playbackUri) {
        console.error('VoiceService: 再生する録音がありません');
        return;
      }

      const { sound } = await Audio.Sound.createAsync({ uri: playbackUri });
      await sound.playAsync();
      
      // 再生が終わったらアンロード
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && !status.isPlaying && status.positionMillis > 0 && status.durationMillis !== undefined && 
            status.positionMillis >= status.durationMillis - 50) {
          sound.unloadAsync();
        }
      });
      
      console.log('VoiceService: 録音を再生中');
    } catch (error) {
      console.error('VoiceService: 録音再生エラー', error);
    }
  }

  // 現在の状態を取得
  getState(): RecognitionState {
    return this.state;
  }
}

export const voiceService = new VoiceService();
export default voiceService; 