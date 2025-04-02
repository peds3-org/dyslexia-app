// Export a dummy asset file

// プレースホルダーサウンドファイル
// このファイルは実際のサウンドファイルがない場合に使用するダミーファイルです

// ダミーの音声ファイルオブジェクトをエクスポート
// soundService.tsでrequireしたときにエラーが発生しないようにするため
export const placeholder = null;
export const shuriken = null;
export const correct = null;
export const incorrect = null;
export const levelUp = null;
export const bgm = null;

// デフォルトエクスポート
export default {
  placeholder,
  shuriken,
  correct,
  incorrect,
  levelUp,
  bgm,
};
