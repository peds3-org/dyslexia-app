#!/usr/bin/env python3
"""
Download TFLite model from GitHub releases
"""
import os
import sys
import urllib.request
from pathlib import Path

# モデルのダウンロードURL（実際のURLに置き換えてください）
MODEL_URL = os.environ.get(
    "MODEL_URL",
    "https://github.com/peds3-org/dyslexia-app/releases/download/v0.0.1-beta/model.tflite"
)

MODEL_DIR = Path("./model")
MODEL_PATH = MODEL_DIR / "tfkeras_weight.tflite"

def download_with_progress(url: str, dest: Path):
    """プログレスバー付きでファイルをダウンロード"""
    def download_progress(block_num, block_size, total_size):
        downloaded = block_num * block_size
        percent = min(downloaded * 100 / total_size, 100)
        sys.stdout.write(f"\rDownloading: {percent:.1f}%")
        sys.stdout.flush()
    
    print(f"Downloading from: {url}")
    urllib.request.urlretrieve(url, dest, reporthook=download_progress)
    print("\nDownload complete!")

def main():
    # ディレクトリ作成
    MODEL_DIR.mkdir(exist_ok=True)
    
    # 既にモデルが存在する場合はスキップ
    if MODEL_PATH.exists():
        print(f"Model already exists at {MODEL_PATH}")
        file_size_mb = MODEL_PATH.stat().st_size / (1024 * 1024)
        print(f"Model size: {file_size_mb:.1f} MB")
        return
    
    # モデルをダウンロード
    try:
        download_with_progress(MODEL_URL, MODEL_PATH)
        
        # ファイルサイズ確認
        file_size_mb = MODEL_PATH.stat().st_size / (1024 * 1024)
        print(f"Model downloaded successfully!")
        print(f"Model size: {file_size_mb:.1f} MB")
        
        if file_size_mb < 100:
            print("WARNING: Model size seems too small. Please check the download URL.")
            
    except Exception as e:
        print(f"Error downloading model: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()