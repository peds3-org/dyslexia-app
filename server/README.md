# Hiragana Ninja AI Server

## Railway デプロイ手順

### 1. 事前準備

1. モデルファイルのURLを更新:
   ```bash
   # download_model.py の MODEL_URL を実際のURLに変更
   MODEL_URL="https://github.com/your-username/your-repo/releases/download/v1.0/tfkeras_weight.tflite"
   ```

2. APIキーを生成:
   ```bash
   # ランダムなAPIキーを生成
   openssl rand -hex 32
   ```

### 2. Railwayでのデプロイ

1. Railwayにログイン:
   ```bash
   cd server/
   npm install -g @railway/cli
   railway login
   ```

2. 新規プロジェクト作成:
   ```bash
   railway init
   # プロジェクト名を入力 (例: hiragana-ninja-ai)
   ```

3. 環境変数を設定:
   ```bash
   railway variables set MODEL_URL="https://github.com/..."
   railway variables set API_KEY="your-generated-api-key"
   railway variables set PORT=8000
   ```

4. デプロイ:
   ```bash
   railway up
   ```

5. URLを確認:
   ```bash
   railway open
   # または
   railway status
   ```

### 3. アプリ側の設定

1. `.env`ファイルを作成:
   ```bash
   cd ..  # プロジェクトルートに戻る
   cp .env.example .env
   ```

2. `.env`を編集:
   ```
   EXPO_PUBLIC_AI_SERVER_URL=https://your-app.up.railway.app
   EXPO_PUBLIC_AI_API_KEY=your-generated-api-key
   ```

### 4. 動作確認

サーバーのヘルスチェック:
```bash
curl https://your-app.up.railway.app/health
```

### 5. 監視とログ

```bash
# ログを確認
railway logs

# メトリクスを確認
railway open
```

## トラブルシューティング

### メモリ不足エラー
Railwayダッシュボードで以下を確認:
- Settings > Service > Memory を 4GB以上に設定
- 必要に応じて8GBまで増やす

### モデルダウンロード失敗
- GitHub Releasesの公開設定を確認
- MODEL_URLが正しいか確認
- railway logs でエラーを確認

### 接続エラー
- CORS設定を確認（main.pyで全オリジン許可中）
- APIキーが一致しているか確認
- railway status でサービス状態を確認