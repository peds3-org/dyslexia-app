# ひらがなにんじゃ (Hiragana Ninja)

<div align="center">
  <img src="assets/icon.png" width="128" height="128" alt="ひらがなにんじゃ">
  
  **ディスレクシアの子どもたちのための楽しい日本語学習アプリ**
  
  [![React Native](https://img.shields.io/badge/React%20Native-0.75.2-blue.svg)](https://reactnative.dev/)
  [![Expo](https://img.shields.io/badge/Expo-52.0.0-000.svg)](https://expo.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://www.typescriptlang.org/)
  [![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
</div>

## 📱 概要

「ひらがなにんじゃ」は、ディスレクシアの子どもたちがゲーム感覚で楽しくひらがなを学べる教育アプリです。AIによる音声認識技術と忍者をテーマにしたゲーミフィケーションを組み合わせ、個々の学習ペースに合わせた最適な学習体験を提供します。

### 主な特徴

- 🎯 **AI音声認識**: TensorFlow Liteを使用した高精度な発音判定
- 🥷 **忍者テーマ**: 楽しいキャラクターと手裏剣アニメーション
- 📊 **個別最適化**: 子どもの能力に合わせた段階的な学習プログラム
- 💝 **心理的サポート**: CBT（認知行動療法）に基づく励まし機能
- 🎮 **ゲーミフィケーション**: もじ玉収集、レベルアップ、ミッション機能

## 🚀 はじめに

### 必要な環境

- Node.js 18.x 以上
- npm または yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS: Xcode 14.0+ (Mac のみ)
- Android: Android Studio

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/your-org/dyslexia-app.git
cd dyslexia-app

# 依存関係のインストール
npm install

# iOS の場合は追加で
cd ios && pod install
```

### 開発サーバーの起動

```bash
# Expo開発サーバーの起動
npm start

# iOSシミュレーターで起動
npm run ios

# Androidエミュレーターで起動
npm run android
```

## 📂 プロジェクト構造

```
dyslexia-app/
├── app/                      # Expo Router によるナビゲーション
│   ├── (app)/               # 認証後の画面
│   │   ├── index.tsx        # ホーム画面
│   │   ├── initial-test/    # 初期診断テスト
│   │   ├── beginner/        # 初級ステージ
│   │   ├── intermediate/    # 中級ステージ
│   │   └── advanced/        # 上級ステージ
│   └── (auth)/              # 認証関連画面
├── src/
│   ├── components/          # 再利用可能なUIコンポーネント
│   ├── services/            # ビジネスロジック
│   │   ├── aiService.ts     # AI音声認識
│   │   ├── voiceService.ts  # 音声録音・再生
│   │   ├── stageService.ts  # ステージ管理
│   │   └── cbtService.ts    # CBT機能
│   ├── hooks/               # カスタムフック
│   ├── types/               # TypeScript型定義
│   ├── constants/           # 定数定義
│   └── lib/                 # ユーティリティ
├── assets/                  # 画像・音声リソース
├── docs/                    # ドキュメント
└── CLAUDE.md               # AI開発アシスタント用ガイド
```

## 🔧 主要な技術スタック

### フロントエンド
- **React Native** + **Expo SDK 52**
- **TypeScript** - 型安全な開発
- **Expo Router** - ファイルベースのナビゲーション
- **React Native Reanimated** - スムーズなアニメーション

### AI/機械学習
- **TensorFlow Lite** - モバイル最適化された音声認識
- **react-native-fast-tflite** - 高速なTFLite実行

### バックエンド
- **Supabase** - リアルタイムDB、認証、ストレージ
- **PostgreSQL** - データ永続化
- **Edge Functions** - サーバーレスAPI

### 開発ツール
- **ESLint** + **Prettier** - コード品質管理
- **Jest** - ユニットテスト
- **EAS Build** - クラウドビルドサービス

## 🎮 主要機能

### 1. 初期診断テスト
- 33問の拗音（きゃ、しゅ、ちょ等）読み取りテスト
- AI音声認識による発音評価
- レベル判定（初級/中級）

### 2. ステージ学習
- **初級**: 基本的なひらがな学習
- **中級**: 濁音・半濁音の学習
- **上級**: 拗音・複雑な音の学習

### 3. テイラードプログラム
- 訓練レベル1〜3（反応時間: 2.5秒→2.0秒→1.7秒）
- テストステージ（75%以上の正解率で進級）
- ラストステージ（1.5秒以内での読み取り）

### 4. ゲーミフィケーション
- もじ玉収集システム
- 忍者キャラクターの成長
- 手裏剣アニメーション
- ログインボーナス

### 5. CBT機能
- 毎日の気分記録
- 考え方カード選択
- ミッション機能
- 励ましメッセージ

## 🛠 開発コマンド

```bash
# 開発サーバー起動
npm start

# テスト実行
npm test

# Lintチェック
npm run lint

# TypeScriptチェック
npm run typecheck

# 本番ビルド（iOS）
eas build --platform ios --profile production

# 本番ビルド（Android）
eas build --platform android --profile production
```

## 📚 ドキュメント

- [プロジェクト構造](docs/project_structure.md)
- [基本概念と用語](docs/terminology_and_basics.md)
- [ゲーミフィケーション設計](docs/gamification_system.md)
- [テイラードプログラム](docs/tailored_program.md)
- [CBTフィードバックシステム](docs/cbt_feedback_system.md)
- [Supabaseセットアップ](docs/supabase_setup.md)
- [TensorFlow Lite仕様](docs/tflite_spec.md)

## 🔐 環境変数

`.env` ファイルを作成し、以下の環境変数を設定してください：

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Model
EXPO_PUBLIC_AI_MODEL_URL=https://github.com/your-repo/releases/download/v1.0/model.tflite
```

## 🤝 開発に参加する

### ブランチ戦略
- `main` - 本番環境
- `develop` - 開発環境
- `feature/*` - 新機能開発
- `bugfix/*` - バグ修正

### コミットメッセージ規約
```
<type>: <subject>

<body>

<footer>
```

Type:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント更新
- `style`: コードスタイル修正
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルド・補助ツール更新

## 📄 ライセンス

このプロジェクトは商用ライセンスです。詳細は [LICENSE](LICENSE) ファイルをご覧ください。

## 👥 開発チーム

- **プロジェクトリード**: 小枝先生
- **AI/MLエンジニア**: 岸さん
- **開発**: PEDS3チーム

## 📞 お問い合わせ

- Issue: [GitHub Issues](https://github.com/your-org/dyslexia-app/issues)
- Email: support@peds3.org

---

<div align="center">
  Made with ❤️ by PEDS3 Team
</div>