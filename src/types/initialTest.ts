/**
 * 初期診断テストで使用する型定義
 */

// テスト結果の型定義
export interface TestResult {
  yoon: string;
  time: number;
  audioUri?: string;
  aiResult?: {
    predictions?: Array<{ character: string; confidence: number }>;
    top3?: Array<{ character: string; confidence: number }>;
    isCorrect?: boolean;
    confidence?: number;
    processingTime?: number;
  };
}

// テストの状態を表す型
export type TestState = 'idle' | 'countdown' | 'recording' | 'processing' | 'encouragement' | 'paused' | 'waiting_for_countdown';

// カウントダウン状態の管理用型
export interface CountdownState {
  isActive: boolean;
  questionNumber: number | null;
  lockId: string | null;
}

// テストレベルの型
export type TestLevel = 'beginner' | 'intermediate';

// テスト結果サマリーの型
export interface TestResultSummary {
  results: TestResult[];
  correctRate: number;
  averageTime: number;
  seionAvg: number;
  dakuonAvg: number;
  yoonAvg: number;
  determinedLevel: TestLevel;
  timestamp: number;
}