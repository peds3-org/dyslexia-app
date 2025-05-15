// ステージ関連の共通型定義
// 循環参照を回避するためprogressから分離

export enum StageType {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED'
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

// デフォルトエクスポート - TS警告を解消するためのダミー値
const _default = {};
export default _default;
