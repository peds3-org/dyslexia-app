# ひらがなにんじゃ - 開発者クイックリファレンス

最終更新: 2025-05-28
バージョン: 0.4.1 (Build undefined)

## 🚀 ビルドコマンド

```bash
# ビルド前チェック（必須）
npm run pre-build

# 開発ビルド
eas build --profile development --platform ios

# TestFlightビルド
eas build --profile testflight --platform ios

# 本番ビルド
eas build --profile production --platform ios
```

## 📱 現在の設定

- **iOS Deployment Target**: 15.1
- **最小システムバージョン**: 15.1
- **TensorFlow Lite**: CoreML/Metal Delegate 無効化
- **AIサービス**: 遅延ロード実装済み
- **本番環境最適化**: コンソールログ無効化済み

## ⚠️ 重要な注意事項

1. **必ずpre-buildチェックを実行**
   ```bash
   npm run pre-build
   ```

2. **TestFlightビルド前の確認事項**
   - aiServiceが遅延ロードされているか
   - コンソールログが本番環境で無効化されているか
   - TFLite delegateが無効化されているか

3. **環境変数の設定（EAS Secrets）**
   ```bash
   eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "your-url"
   eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-key"
   ```

## 🐛 デバッグコマンド

```bash
# ログの確認
eas build:view --platform ios

# クラッシュログの分析
eas build:inspect --platform ios --output logs
```
