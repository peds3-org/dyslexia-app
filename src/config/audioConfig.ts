import { Audio } from 'expo-av';

/**
 * 共通の音声録音設定
 */
export const AUDIO_RECORDING_OPTIONS: Audio.RecordingOptions = {
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

/**
 * 録音タイマーの設定
 */
export const RECORDING_TIMER_CONFIG = {
  // デフォルトの録音時間（ミリ秒）
  DEFAULT_DURATION_MS: 2500, // 2.5秒
  
  // initial-test用の録音時間
  INITIAL_TEST_DURATION_MS: 2500, // 2.5秒
  
  // ゲーム画面のデフォルト録音時間
  GAME_DEFAULT_DURATION_MS: 2500, // 2.5秒
};

/**
 * オーディオモードの設定
 */
export const AUDIO_MODE_CONFIG = {
  // 録音時の設定
  RECORDING: {
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  },
  
  // 通常時の設定
  PLAYBACK: {
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
  },
};

/**
 * 音声読み上げの設定
 */
export const SPEECH_CONFIG = {
  // 言語設定
  LANGUAGE: 'ja-JP',
  
  // 読み上げ速度
  RATE: {
    SLOW: 0.75,    // ゆっくり（初心者向け）
    NORMAL: 0.9,   // 通常（練習時）
    FAST: 1.0,     // 速い（上級者向け）
  },
  
  // ピッチ設定
  PITCH: {
    LOW: 0.95,     // 低め（男性的な声）
    NORMAL: 1.0,   // 通常
    HIGH: 1.1,     // 高め（女性的な声）
  },
};

/**
 * 録音の自動停止タイマーを設定する共通関数
 */
export const setRecordingTimer = (
  callback: () => void,
  duration: number = RECORDING_TIMER_CONFIG.DEFAULT_DURATION_MS
): NodeJS.Timeout => {
  return setTimeout(callback, duration);
};