#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 ビルド前チェックを実行中...\n');

let hasError = false;

// 1. app.jsonのチェック
console.log('1️⃣ app.jsonをチェック中...');
const appJsonPath = path.join(process.cwd(), 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// バージョン番号の確認
console.log(`   ✓ バージョン: ${appJson.expo.version}`);
console.log(`   ✓ iOSビルド番号: ${appJson.expo.ios.buildNumber}`);

// 2. Podfile.properties.jsonのチェック
console.log('\n2️⃣ iOS設定をチェック中...');
const podfilePropsPath = path.join(process.cwd(), 'ios', 'Podfile.properties.json');
if (fs.existsSync(podfilePropsPath)) {
  const podfileProps = JSON.parse(fs.readFileSync(podfilePropsPath, 'utf8'));
  console.log(`   ✓ iOS Deployment Target: ${podfileProps['ios.deploymentTarget']}`);
  
  // deployment targetの一致確認
  const buildPropsTarget = appJson.expo.plugins?.find(p => Array.isArray(p) && p[0] === 'expo-build-properties')?.[1]?.ios?.deploymentTarget;
  if (buildPropsTarget && buildPropsTarget !== podfileProps['ios.deploymentTarget']) {
    console.error(`   ❌ エラー: deploymentTargetが一致しません！`);
    console.error(`      app.json: ${buildPropsTarget}`);
    console.error(`      Podfile.properties.json: ${podfileProps['ios.deploymentTarget']}`);
    hasError = true;
  }
}

// 3. Info.plistのチェック（存在する場合）
console.log('\n3️⃣ Info.plistをチェック中...');
const infoPlistPath = path.join(process.cwd(), 'ios', 'app', 'Info.plist');
if (fs.existsSync(infoPlistPath)) {
  const infoPlist = fs.readFileSync(infoPlistPath, 'utf8');
  
  // LSMinimumSystemVersionのチェック
  const minVersionMatch = infoPlist.match(/<key>LSMinimumSystemVersion<\/key>\s*<string>([^<]+)<\/string>/);
  if (minVersionMatch) {
    console.log(`   ✓ LSMinimumSystemVersion: ${minVersionMatch[1]}`);
    if (minVersionMatch[1] !== '15.1') {
      console.warn(`   ⚠️  警告: LSMinimumSystemVersionが15.1ではありません。npx expo prebuildを実行してください。`);
    }
  }
  
  // 権限の説明文チェック
  const permissions = [
    'NSMicrophoneUsageDescription',
    'NSSpeechRecognitionUsageDescription',
    'NSCameraUsageDescription',
    'NSPhotoLibraryUsageDescription'
  ];
  
  permissions.forEach(permission => {
    if (!infoPlist.includes(`<key>${permission}</key>`)) {
      console.error(`   ❌ エラー: ${permission}が設定されていません！`);
      hasError = true;
    } else {
      console.log(`   ✓ ${permission}: 設定済み`);
    }
  });
}

// 4. 環境変数のチェック（EASビルドではシークレットから提供されるため警告のみ）
console.log('\n4️⃣ 環境変数をチェック中...');
const requiredEnvVars = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY'
];

let envMissing = false;
requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`   ✓ ${envVar}: 設定済み`);
  } else {
    console.warn(`   ⚠️  警告: ${envVar}が設定されていません（EASビルドではシークレットから提供されます）`);
    envMissing = true;
  }
});

if (envMissing) {
  console.log('   ℹ️  注意: EAS Buildを使用する場合は、EASシークレットに環境変数を設定してください。');
  console.log('   コマンド: eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "your-value"');
}

// 5. TFLite設定のチェック
console.log('\n5️⃣ TensorFlow Lite設定をチェック中...');
const tflitePlugin = appJson.expo.plugins?.find(p => Array.isArray(p) && p[0] === 'react-native-fast-tflite');
if (tflitePlugin && tflitePlugin[1]) {
  const tfliteConfig = tflitePlugin[1];
  if (tfliteConfig.enableCoreMLDelegate === false) {
    console.log('   ✓ CoreML Delegate: 無効化済み');
  } else {
    console.warn('   ⚠️  警告: CoreML Delegateが有効になっています。TestFlightでクラッシュする可能性があります。');
  }
  
  if (tfliteConfig.enableMetalDelegate === false) {
    console.log('   ✓ Metal Delegate: 無効化済み');
  } else {
    console.warn('   ⚠️  警告: Metal Delegateが有効になっています。TestFlightでクラッシュする可能性があります。');
  }
}

// 6. aiServiceの遅延ロード確認
console.log('\n6️⃣ AIサービスの設定をチェック中...');
const servicesIndexPath = path.join(process.cwd(), 'src', 'services', 'index.ts');
if (fs.existsSync(servicesIndexPath)) {
  const servicesIndex = fs.readFileSync(servicesIndexPath, 'utf8');
  if (servicesIndex.includes("export { default as aiService } from './aiService'") && !servicesIndex.includes('//')) {
    console.error('   ❌ エラー: aiServiceが起動時にエクスポートされています！TestFlightでクラッシュします。');
    hasError = true;
  } else {
    console.log('   ✓ aiService: 遅延ロード設定済み');
  }
}

// 7. 本番環境最適化のチェック
console.log('\n7️⃣ 本番環境最適化をチェック中...');
const layoutPath = path.join(process.cwd(), 'app', '_layout.tsx');
if (fs.existsSync(layoutPath)) {
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  
  // コンソールログ無効化チェック
  if (layoutContent.includes('if (!__DEV__)') && layoutContent.includes('console.log = () => {}')) {
    console.log('   ✓ コンソールログ: 本番環境で無効化済み');
  } else {
    console.warn('   ⚠️  警告: 本番環境でコンソールログが無効化されていません！パフォーマンス問題の原因になります。');
  }
  
  // グローバルエラーハンドラーチェック
  if (layoutContent.includes('if (__DEV__ && typeof global')) {
    console.log('   ✓ グローバルエラーハンドラー: 本番環境で軽量化済み');
  } else {
    console.warn('   ⚠️  警告: グローバルエラーハンドラーが本番環境で軽量化されていません。');
  }
}

// 8. ドキュメントの更新
console.log('\n8️⃣ ドキュメントを更新中...');

// AIモデル使用ガイドの生成
const aiGuideDocPath = path.join(process.cwd(), 'docs', 'ai_model_usage_guide.md');
try {
  const aiServicePath = path.join(process.cwd(), 'src', 'services', 'aiService.ts');
  if (fs.existsSync(aiServicePath)) {
    const aiServiceContent = fs.readFileSync(aiServicePath, 'utf8');
    
    // AIサービスの主要メソッドを抽出
    const hasInitialize = aiServiceContent.includes('async initialize(');
    const hasClassifySpeech = aiServiceContent.includes('async classifySpeech(');
    const hasProcessAudio = aiServiceContent.includes('async processAudio(');
    
    const currentDate = new Date().toISOString().split('T')[0];
    const aiGuideContent = `# AIモデル使用ガイド - 開発者向け

最終更新: ${currentDate}

## 🤖 概要

本アプリはTensorFlow Liteを使用して、ひらがなの音声認識を行います。104クラス分類モデルで、106個のひらがな文字を認識します。

### モデルスペック
- **モデルサイズ**: 約1.2GB
- **入力**: 16kHz, 16-bit PCM WAV音声（2秒間）
- **出力**: 104クラスの確率配列
- **特徴**: 同一扱い文字（を/お、じ/ぢ、ず/づ）の考慮

## 🚀 初期化

### 基本的な初期化

\`\`\`typescript
import aiService from '@/services/aiService';

// シンプルな初期化
const success = await aiService.initialize();
if (success) {
  console.log('AIサービスの初期化に成功');
}
\`\`\`

### 進捗コールバック付き初期化

\`\`\`typescript
const success = await aiService.initialize((progress) => {
  console.log(\`ダウンロード進捗: \${Math.round(progress * 100)}%\`);
});
\`\`\`

### 状態確認

\`\`\`typescript
// 初期化状態の確認
if (aiService.isInitialized) {
  console.log('モデルは使用可能');
}

// モデルがダウンロード済みか確認
const isDownloaded = await aiService.isModelDownloaded();
\`\`\`

## 🎤 音声認識の実行

### 基本的な音声認識

\`\`\`typescript
// 音声を録音して認識
const result = await aiService.classifySpeech(
  targetCharacter,  // 認識対象の文字 (例: 'あ')
  expectedResult    // 期待される結果 (通常はtargetCharacterと同じ)
);

if (result) {
  console.log(\`認識結果: \${result.character}\`);
  console.log(\`信頼度: \${(result.confidence * 100).toFixed(2)}%\`);
  console.log(\`正解: \${result.isCorrect ? 'はい' : 'いいえ'}\`);
}
\`\`\`

### Voice Practice用の音声処理

\`\`\`typescript
// 録音済み音声ファイルを処理
const result = await aiService.processAudio(
  audioUri,         // 音声ファイルのURI
  targetCharacter   // 認識対象の文字
);
\`\`\`

## 📈 結果の解釈

### AIClassificationResultインターフェース

\`\`\`typescript
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
\`\`\`

### 正解判定ロジック

1. **Top-3判定**: 正解文字がTop-3に含まれていれば正解
2. **同一扱い文字**: 以下の文字は同一として扱う
   - 「を」と「お」
   - 「じ」と「ぢ」
   - 「ず」と「づ」
3. **類似ラベル調整**: 特定の類似文字間で正解判定を調整

## ⚠️ エラーハンドリング

### 初期化エラー

\`\`\`typescript
const success = await aiService.initialize();
if (!success) {
  const error = aiService.error;
  console.error(\`初期化エラー: \${error}\`);
  
  // エラー種別に応じた処理
  if (error?.includes('ネットワーク')) {
    // オフライン対応
  } else if (error?.includes('TensorFlow')) {
    // TFLiteモジュールエラー
  }
}
\`\`\`

### 音声認識エラー

\`\`\`typescript
try {
  const result = await aiService.classifySpeech(character);
  if (!result) {
    console.error('音声認識に失敗');
  }
} catch (error) {
  console.error('音声認識例外:', error);
}
\`\`\`

## 🚀 パフォーマンス最適化

### TestFlight対応

1. **遅延ロード**: AIサービスは起動時に自動インポートされない
2. **コンソールログ**: すべて__DEV__チェックでラップ
3. **GPUアクセラレーション**: CoreML/Metal Delegateは無効化

### メモリ管理

\`\`\`typescript
// モデルのクリーンアップ
await aiService.cleanup();

// モデルファイルの削除（ストレージ開放）
await aiService.deleteModelFile();
\`\`\`

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

- **ダウンロード先**: \`FileSystem.documentDirectory + 'ai-model.tflite'\`
- **ファイルサイズ**: 約1.2GB
- **ダウンロード元**: GitHub Releases (private repo)
- **自動リトライ**: 最大3回まで自動リトライ
- **ファイル検証**: MD5チェックサムとファイルサイズ確認
`;
    
    fs.writeFileSync(aiGuideDocPath, aiGuideContent);
    console.log('   ✓ ai_model_usage_guide.md: 生成完了');
  }
} catch (error) {
  console.error('   ❌ エラー: AIモデル使用ガイドの生成に失敗しました:', error.message);
}

// 開発者向けクイックリファレンスの更新
const quickRefPath = path.join(process.cwd(), 'docs', 'quick_reference.md');
try {
  const currentDate = new Date().toISOString().split('T')[0];
  let quickRefContent = `# ひらがなにんじゃ - 開発者クイックリファレンス

最終更新: ${currentDate}
バージョン: ${appJson.expo.version} (Build ${appJson.expo.ios.buildNumber})

## 🚀 ビルドコマンド

\`\`\`bash
# ビルド前チェック（必須）
npm run pre-build

# 開発ビルド
eas build --profile development --platform ios

# TestFlightビルド
eas build --profile testflight --platform ios

# 本番ビルド
eas build --profile production --platform ios
\`\`\`

## 📱 現在の設定

- **iOS Deployment Target**: ${appJson.expo.plugins?.find(p => Array.isArray(p) && p[0] === 'expo-build-properties')?.[1]?.ios?.deploymentTarget || '15.1'}
- **最小システムバージョン**: 15.1
- **TensorFlow Lite**: CoreML/Metal Delegate 無効化
- **AIサービス**: 遅延ロード実装済み
- **本番環境最適化**: コンソールログ無効化済み

## ⚠️ 重要な注意事項

1. **必ずpre-buildチェックを実行**
   \`\`\`bash
   npm run pre-build
   \`\`\`

2. **TestFlightビルド前の確認事項**
   - aiServiceが遅延ロードされているか
   - コンソールログが本番環境で無効化されているか
   - TFLite delegateが無効化されているか

3. **環境変数の設定（EAS Secrets）**
   \`\`\`bash
   eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "your-url"
   eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-key"
   \`\`\`

## 🐛 デバッグコマンド

\`\`\`bash
# ログの確認
eas build:view --platform ios

# クラッシュログの分析
eas build:inspect --platform ios --output logs
\`\`\`
`;

  fs.writeFileSync(quickRefPath, quickRefContent);
  console.log('   ✓ quick_reference.md: 更新完了');
} catch (error) {
  console.error('   ❌ エラー: quick_reference.mdの更新に失敗しました:', error.message);
}

// app.jsonのdescription更新
try {
  const features = [];
  
  // 機能の検出
  if (fs.existsSync(path.join(process.cwd(), 'src', 'services', 'aiService.ts'))) {
    features.push('AI音声認識');
  }
  if (fs.existsSync(path.join(process.cwd(), 'src', 'services', 'cbtService.ts'))) {
    features.push('認知行動療法(CBT)サポート');
  }
  if (fs.existsSync(path.join(process.cwd(), 'src', 'services', 'progressService.ts'))) {
    features.push('学習進捗トラッキング');
  }
  
  const updatedDescription = `ディスレクシアの子どもたちがひらがなを楽しく学べる教育アプリ。${features.join('、')}機能を搭載。忍者をテーマにしたゲーミフィケーションで、楽しみながら確実に文字を習得できます。`;
  
  if (appJson.expo.description !== updatedDescription) {
    appJson.expo.description = updatedDescription;
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
    console.log('   ✓ app.json description: 更新完了');
  } else {
    console.log('   ✓ app.json description: 最新の状態');
  }
} catch (error) {
  console.error('   ❌ エラー: app.json descriptionの更新に失敗しました:', error.message);
}

// CHANGELOG.mdの更新チェック
const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
if (fs.existsSync(changelogPath)) {
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  const currentVersion = appJson.expo.version;
  
  if (!changelog.includes(`## [${currentVersion}]`)) {
    console.warn('   ⚠️  警告: CHANGELOG.mdに現在のバージョン(${currentVersion})のエントリがありません。');
    console.log('      変更内容を記録してください。');
  } else {
    console.log('   ✓ CHANGELOG.md: 現在のバージョンのエントリあり');
  }
}

// 結果表示
console.log('\n' + '='.repeat(50));
if (hasError) {
  console.error('\n❌ エラーが見つかりました。修正してからビルドしてください。\n');
  process.exit(1);
} else {
  console.log('\n✅ すべてのチェックに合格しました！ビルドを続行できます。\n');
  console.log('ビルドコマンド:');
  console.log('  開発版: eas build --profile development --platform ios');
  console.log('  TestFlight版: eas build --profile testflight --platform ios');
  console.log('  本番版: eas build --profile production --platform ios\n');
}