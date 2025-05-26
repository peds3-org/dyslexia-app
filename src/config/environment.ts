// 環境設定
export const ENV = {
  // 開発環境かどうか
  isDevelopment: __DEV__,
  
  // 機能フラグ
  features: {
    // 音声ファイルのクラウドアップロードを有効にするか
    enableVoiceUpload: false, // 開発中は無効化
    
    // AIモデルのモックモードを使用するか
    useAIMockMode: false,
    
    // デバッグログを表示するか
    showDebugLogs: __DEV__,
  },
  
  // ストレージ設定
  storage: {
    // 音声ファイルを保存するバケット名
    voiceBucketName: 'practice-audio',
    
    // ローカルに保存する最大ファイル数
    maxLocalVoiceFiles: 50,
  }
};