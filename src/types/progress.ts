export interface TrainingProgress {
  // 基本情報
  userId: string;
  currentDay: number;
  startDate: Date;
  lastTrainingDate: Date;
  
  // 統計情報
  totalStudyMinutes: number;
  averageAccuracy: number;
  streakCount: number;
  longestStreak: number;
  perfectDays: number;
  
  // ゲーム要素
  rank: string;
  experience: number;
  level: number;
  collectedMojitama: string[];
  unlockedSkills: string[];
  
  // カスタマイズ要素
  avatarItems: Record<string, string>;
  
  // デイリーチャレンジ
  dailyProgress: {
    completedMinutes: number;
    challengesCompleted: string[];
    specialAchievements: string[];
  };
  
  // 追加のフィールド
  daysCompleted: number;
  currentStreak: number;
  totalPracticeTime: number;
}

export interface DailyChallenge {
  id: string;
  type: 'SPEED' | 'ACCURACY' | 'COMBO';
  target: number;
  reward: {
    type: 'SHURIKEN' | 'SCROLL' | 'NINJA_TOOL';
    itemId: string;
  };
  description: string;
  expiresAt: Date;
}

export interface ChallengeProgress {
  userId: string;
  challengeId: string;
  currentProgress: number;
  updatedAt: Date;
}

export interface DailyTrainingRecord {
  date: Date;
  minutes: number;
  completed: boolean;
}

export type Achievement = {
  id: string;
  title: string;
  description: string;
  requirement: {
    type: 'STUDY_TIME' | 'ACCURACY' | 'STREAK' | 'COLLECTION';
    value: number;
  };
  reward: {
    type: 'TITLE' | 'AVATAR_ITEM' | 'BACKGROUND';
    itemId: string;
  };
  unlockedAt?: Date;
};

// stage.tsから移行したステージ関連の型定義
export enum StageType {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  HIRAGANA = 'HIRAGANA',
  KATAKANA = 'KATAKANA',
  KANJI = 'KANJI'
}

export interface StageCharacter {
  character: string;
  reading: string;
  meaning?: string;
  level: number;
}

export interface StageProgress {
  currentLevel: number;
  collectedMojitama: string[];
  unlockedCharacters: string[];
  characterProgress: Record<string, number>;
  lastClearedTime?: number;
  trainingLevel: 1 | 2 | 3;  // 訓練レベル（1: 2.5秒, 2: 2.0秒, 3: 1.7秒）
  testMode: boolean;         // テストモードかどうか
  completedSets: number;     // 完了したセット数
  testResults?: {            // テスト結果
    totalAttempts: number;   // 試行回数
    correctAttempts: number; // 正解回数
  };
  lastStageCompleted?: boolean; // ラストステージをクリアしたかどうか
}

export type StageConfig = {
  type: StageType;
  requiredCorrectCount: number;
  timeLimit: number;
  characters: string[];
  readings: Record<string, string>;
  backgroundImage: any;
  elderImage: any;
  storyTitle: string;
  storyText: string;
  buttonText: string;
};

// データベースのテーブル型定義
export type DbChallengeProgress = {
  current_progress: number;
  daily_challenges: {
    target: number;
  }[];
  user_id?: string;
  challenge_id?: string;
  updated_at?: string;
};

export { TrainingProgress as default }; 