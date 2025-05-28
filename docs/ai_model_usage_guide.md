# AIモデル使用ガイド - 開発者向け

最終更新: 2025-05-28

## 🤖 概要

本アプリはTensorFlow Liteを使用して、ひらがなの音声認識を行います。104クラス分類モデルで、106個のひらがな文字を認識します。

### モデルスペック
- **モデルサイズ**: 約1.2GB
- **入力**: 16kHz, 16-bit PCM WAV音声（2秒間）
- **出力**: 104クラスの確率配列
- **特徴**: 同一扱い文字（を/お、じ/ぢ、ず/づ）の考慮

## 🚀 初期化

### 基本的な初期化

```typescript
import aiService from '@/services/aiService';

// シンプルな初期化
const success = await aiService.initialize();
if (success) {
  console.log('AIサービスの初期化に成功');
}
```

### 進捗コールバック付き初期化

```typescript
const success = await aiService.initialize((progress) => {
  console.log(`ダウンロード進捗: ${Math.round(progress * 100)}%`);
});
```

### 状態確認

```typescript
// 初期化状態の確認
if (aiService.isInitialized) {
  console.log('モデルは使用可能');
}

// モデルがダウンロード済みか確認
const isDownloaded = await aiService.isModelDownloaded();
```

## 🎤 音声認識の実行

### 基本的な音声認識

```typescript
// 音声を録音して認識
const result = await aiService.classifySpeech(
  targetCharacter,  // 認識対象の文字 (例: 'あ')
  expectedResult    // 期待される結果 (通常はtargetCharacterと同じ)
);

if (result) {
  console.log(`認識結果: ${result.character}`);
  console.log(`信頼度: ${(result.confidence * 100).toFixed(2)}%`);
  console.log(`正解: ${result.isCorrect ? 'はい' : 'いいえ'}`);
}
```

### Voice Practice用の音声処理

```typescript
// 録音済み音声ファイルを処理
const result = await aiService.processAudio(
  audioUri,         // 音声ファイルのURI
  targetCharacter   // 認識対象の文字
);
```

## 📈 結果の解釈

### AIClassificationResultインターフェース

```typescript
interface AIClassificationResult {
  level: 'beginner' | 'intermediate' | 'advanced';
  character: string;         // 認識された文字
  confidence: number;        // 信頼度 (0.0 ~ 1.0)
  timestamp: string;         // ISO8601形式のタイムスタンプ
  processingTimeMs: number;  // 処理時間（ミリ秒）
  isCorrect: boolean;        // 正解判定
  top3: Array<{              // Top-3予測結果
    character: string;
    confidence: number;
    index: number;
  }>;
}
```

### 正解判定ロジック

1. **Top-3判定**: 正解文字がTop-3に含まれていれば正解
2. **同一扱い文字**: 以下の文字は同一として扱う
   - 「を」と「お」
   - 「じ」と「ぢ」
   - 「ず」と「づ」
3. **類似ラベル調整**: 特定の類似文字間で正解判定を調整

## ⚠️ エラーハンドリング

### 初期化エラー

```typescript
const success = await aiService.initialize();
if (!success) {
  const error = aiService.error;
  console.error(`初期化エラー: ${error}`);
  
  // エラー種別に応じた処理
  if (error?.includes('ネットワーク')) {
    // オフライン対応
  } else if (error?.includes('TensorFlow')) {
    // TFLiteモジュールエラー
  }
}
```

### 音声認識エラー

```typescript
try {
  const result = await aiService.classifySpeech(character);
  if (!result) {
    console.error('音声認識に失敗');
  }
} catch (error) {
  console.error('音声認識例外:', error);
}
```

## 🚀 パフォーマンス最適化

### TestFlight対応

1. **遅延ロード**: AIサービスは起動時に自動インポートされない
2. **コンソールログ**: すべて__DEV__チェックでラップ
3. **GPUアクセラレーション**: CoreML/Metal Delegateは無効化

### メモリ管理

```typescript
// モデルのクリーンアップ
await aiService.cleanup();

// モデルファイルの削除（ストレージ開放）
await aiService.deleteModelFile();
```

### 音声データの統計情報

音声認識時に以下の統計情報がログに出力されます（開発環境のみ）：

- 最小値/最大値/平均値
- RMS（音量）
- 非無音サンプル数
- 無音/低音量の警告

## 🔧 デバッグ

### デバッグログの有効化

開発環境では以下の詳細ログが出力されます：

- TFLiteモジュール初期化プロセス
- モデルダウンロード進捗
- 音声データ処理統計
- Top-3予測結果
- 処理時間

### iOSシミュレーターでの注意

iOSシミュレーターでは音声録音が正しく動作しない可能性があります。実機でのテストを推奨します。

## 📦 モデルファイルの管理

- **ダウンロード先**: `FileSystem.documentDirectory + 'ai-model.tflite'`
- **ファイルサイズ**: 約1.2GB
- **ダウンロード元**: GitHub Releases (private repo)
- **自動リトライ**: 最大3回まで自動リトライ
- **ファイル検証**: MD5チェックサムとファイルサイズ確認
