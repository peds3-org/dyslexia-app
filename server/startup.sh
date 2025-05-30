#!/bin/bash
# サーバー起動スクリプト

echo "Starting Hiragana Ninja AI Server..."

# モデルのダウンロード
python download_model.py

# サーバー起動
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}