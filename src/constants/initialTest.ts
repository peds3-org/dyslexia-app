/**
 * 初期診断テストで使用する定数
 */

// 全ての拗音のリスト
export const YOON_LIST = [
  'きゃ', 'きゅ', 'きょ',
  'しゃ', 'しゅ', 'しょ',
  'ちゃ', 'ちゅ', 'ちょ',
  'にゃ', 'にゅ', 'にょ',
  'ひゃ', 'ひゅ', 'ひょ',
  'みゃ', 'みゅ', 'みょ',
  'りゃ', 'りゅ', 'りょ',
  'ぎゃ', 'ぎゅ', 'ぎょ',
  'じゃ', 'じゅ', 'じょ',
  'びゃ', 'びゅ', 'びょ',
  'ぴゃ', 'ぴゅ', 'ぴょ',
] as const;

// 濁音・半濁音のリスト
export const DAKUON_LIST = [
  'が', 'ぎ', 'ぐ', 'げ', 'ご',
  'ざ', 'じ', 'ず', 'ぜ', 'ぞ',
  'だ', 'ぢ', 'づ', 'で', 'ど',
  'ば', 'び', 'ぶ', 'べ', 'ぼ',
  'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ',
] as const;

// 清音のリスト
export const SEION_LIST = [
  'あ', 'い', 'う', 'え', 'お',
  'か', 'き', 'く', 'け', 'こ',
  'さ', 'し', 'す', 'せ', 'そ',
  'た', 'ち', 'つ', 'て', 'と',
  'な', 'に', 'ぬ', 'ね', 'の',
  'は', 'ひ', 'ふ', 'へ', 'ほ',
  'ま', 'み', 'む', 'め', 'も',
  'や', 'ゆ', 'よ',
  'ら', 'り', 'る', 'れ', 'ろ',
  'わ', 'を', 'ん',
] as const;

// テスト設定
export const TEST_CONFIG = {
  TOTAL_QUESTIONS: 33,
  ENCOURAGEMENT_POINTS: [11, 22], // 励ましを表示する問題番号
  COUNTDOWN_DURATION: 5, // カウントダウンの秒数
  RECORDING_TIMEOUT: 2500, // 録音タイムアウト（ミリ秒）
  VIBRATION_DURATION: 10, // バイブレーションの長さ（ミリ秒）
  CORRECT_RATE_THRESHOLD: 1 / 3, // レベル判定の閾値
  DEBOUNCE_DELAY: 500, // ボタン連打防止のディレイ（ミリ秒）
} as const;

// AsyncStorageのキー
export const STORAGE_KEYS = {
  TEST_RESULTS: 'initialTestResults',
} as const;