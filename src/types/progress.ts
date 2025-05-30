import type { Database } from './supabase';
import { StageType, StageConfig } from './common';

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

export type Achievement = Database['public']['Tables']['achievements']['Row'];

// stage.tsから移行したステージ関連の型定義
// StageTypeとStageConfigはcommon.tsに移動
export { StageType, StageConfig };

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
}

// データベースのテーブル型定義
export type DbChallengeProgress = Database['public']['Tables']['challenge_progress']['Row'];

// デフォルトエクスポート - TS警告を解消するためのダミー値
const _default = {};
export default _default; 