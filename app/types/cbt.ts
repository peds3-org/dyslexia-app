// 気分の種類
export enum MoodType {
  HAPPY = 'たのしい',
  EXCITED = 'うきうき',
  CALM = 'おちついた',
  TIRED = 'つかれた',
  SAD = 'かなしい',
  FRUSTRATED = 'いらいら',
  WORRIED = 'しんぱい',
  CONFUSED = 'こんがらがった'
}

// キャラクターの種類
export enum CharacterMood {
  HAPPY = 'うれしい',
  ENERGETIC = 'げんき',
  RELAXED = 'リラックス',
  SLEEPY = 'ねむい',
  DETERMINED = 'けっしん',
}

// 考え方カードの種類
export interface ThinkingCard {
  id: string;
  title: string;
  description: string;
  positiveReframe: string;
  iconName: string;
}

// 考え方カードのデータ
export const THINKING_CARDS: ThinkingCard[] = [
  {
    id: 'card1',
    title: 'きょうはまけた',
    description: 'よめなかったもじがあって くやしい',
    positiveReframe: 'まいにちれんしゅうすれば もっとよくなるよ',
    iconName: 'emoticon-sad-outline'
  },
  {
    id: 'card2',
    title: 'むずかしい',
    description: 'もじがよめなくて こまった',
    positiveReframe: 'むずかしいけど ちょっとずつできるようになるよ',
    iconName: 'emoticon-confused-outline'
  },
  {
    id: 'card3',
    title: 'じぶんはだめだ',
    description: 'ともだちはよめるのに よめない',
    positiveReframe: 'ひとそれぞれとくいなことがちがうよ',
    iconName: 'emoticon-frown-outline'
  },
  {
    id: 'card4',
    title: 'おそい',
    description: 'よむのにじかんがかかる',
    positiveReframe: 'まえよりすこしずつはやくなってるよ',
    iconName: 'clock-outline'
  },
  {
    id: 'card5',
    title: 'つづけられない',
    description: 'がんばれない きょうはやすみたい',
    positiveReframe: 'きょうはすこしやすんで あしたまたがんばろう',
    iconName: 'battery-outline'
  },
];

// 日々の取り組み記録
export interface DailyActivity {
  date: string; // ISO形式の日付
  mood?: MoodType; // 選択した気分
  character?: CharacterMood; // 選択したキャラクター
  thinkingCardId?: string; // 選択した考え方カード
  practiceTimeMinutes: number; // 練習時間（分）
  correctAnswers: number; // 正解数
  totalAnswers: number; // 総回答数
  feelingAfter?: 'たのしかった' | 'つかれた' | 'すっきりした' | undefined; // 練習後の気分
  notes?: string; // メモ（任意）
}

// CBTセッションの保存用タイプ
export interface CBTSession {
  userId: string;
  sessions: DailyActivity[];
  lastUpdated: string; // ISO形式の日付
}

// 任務（ミッション）タイプ
export interface Mission {
  id: string;
  title: string; // 例：「○○もじ せいかくによむ」
  description: string;
  targetCount: number; // 達成に必要な数
  currentCount: number; // 現在の達成数
  isCompleted: boolean;
  rewardType: 'もじたま' | 'にんじゃどうぐ' | 'タイトル';
  rewardId: string;
}

// ログインボーナスタイプ
export interface LoginBonus {
  daysInRow: number; // 連続ログイン日数
  totalLogins: number; // 合計ログイン日数
  lastLoginDate: string; // 最後のログイン日（ISO形式）
  rewards: {
    id: string;
    type: 'もじたま' | 'にんじゃどうぐ' | 'タイトル';
    description: string;
    isCollected: boolean;
  }[];
}

// デフォルトエクスポートを追加
const cbtTypes = {
  MoodType,
  CharacterMood,
  THINKING_CARDS
};

export default cbtTypes; 