#!/usr/bin/env python3
"""
開発テスト用のダミーTFLiteモデルを作成
実際のモデルはGitHubリリースからダウンロードされる
"""

# ダミーのTFLiteファイルを作成（最小限のバイナリデータ）
# これは実際のモデルではなく、ファイルの存在チェックをパスするためのもの
dummy_tflite_data = bytes([
    # TFLite magic number
    0x54, 0x46, 0x4C, 0x33,  # "TFL3"
    # Version (0)
    0x00, 0x00, 0x00, 0x00,
    # 最小限のダミーデータ（実際のモデル構造ではない）
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    # モデルサイズを1MB以上にするためのパディング
] + [0x00] * (1024 * 1024))  # 1MB以上のサイズ

# ファイルを保存
with open('/Users/ik/dyslexia-app/assets/model.tflite', 'wb') as f:
    f.write(dummy_tflite_data)

print("Dummy TFLite model created at: /Users/ik/dyslexia-app/assets/model.tflite")
print(f"File size: {len(dummy_tflite_data) / 1024 / 1024:.2f} MB")