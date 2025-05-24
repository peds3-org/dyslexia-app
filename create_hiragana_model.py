import tensorflow as tf
import numpy as np
import os

# 102クラス（ひらがな）分類用のモデルを作成
def create_hiragana_model():
    """
    音声認識用のモデルを作成
    入力: 32000サンプル（2秒 × 16kHz）の音声データ
    出力: 102クラスの確率分布
    """
    model = tf.keras.Sequential([
        # 入力層 - 2秒の16kHz音声データ
        tf.keras.layers.Input(shape=(32000,)),
        
        # 1次元畳み込み層で音声の特徴を抽出
        tf.keras.layers.Reshape((32000, 1)),
        tf.keras.layers.Conv1D(32, kernel_size=80, strides=16, activation='relu'),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.MaxPooling1D(pool_size=4),
        
        tf.keras.layers.Conv1D(64, kernel_size=40, strides=2, activation='relu'),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.MaxPooling1D(pool_size=4),
        
        tf.keras.layers.Conv1D(128, kernel_size=20, strides=2, activation='relu'),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.GlobalAveragePooling1D(),
        
        # 全結合層
        tf.keras.layers.Dense(256, activation='relu'),
        tf.keras.layers.Dropout(0.5),
        tf.keras.layers.Dense(128, activation='relu'),
        tf.keras.layers.Dropout(0.5),
        
        # 出力層 - 102クラス分類
        tf.keras.layers.Dense(102, activation='linear')  # TFLiteではsoftmaxは後処理で適用
    ])
    
    return model

# モデルを作成
print("Creating hiragana recognition model...")
model = create_hiragana_model()

# モデルのサマリーを表示
model.summary()

# ダミーの重みを設定（実際の学習なしでテスト用）
# 実際のプロダクションでは、ここで学習済みの重みをロードする
for layer in model.layers:
    if hasattr(layer, 'kernel'):
        # ランダムな重みを設定（実際は学習済みの重みを使用）
        weights = layer.get_weights()
        new_weights = []
        for w in weights:
            # Xavierの初期化に近い分散でランダム初期化
            fan_in = np.prod(w.shape[:-1])
            fan_out = w.shape[-1]
            std = np.sqrt(2.0 / (fan_in + fan_out))
            new_weights.append(np.random.normal(0, std, w.shape).astype(np.float32))
        layer.set_weights(new_weights)

# TensorFlow Liteに変換
print("\nConverting to TensorFlow Lite...")
converter = tf.lite.TFLiteConverter.from_keras_model(model)

# 最適化オプション
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.target_spec.supported_types = [tf.float32]  # float32精度を維持

# 量子化（オプション - モデルサイズを削減）
# converter.representative_dataset = representative_dataset_gen  # 実際のデータが必要

# 変換実行
tflite_model = converter.convert()

# モデルを保存
output_dir = '/Users/ik/dyslexia-app/assets'
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, 'model.tflite')

with open(output_path, 'wb') as f:
    f.write(tflite_model)

print(f"\nModel saved to: {output_path}")
print(f"Model size: {len(tflite_model) / 1024 / 1024:.2f} MB")

# モデルの検証
print("\nValidating model...")
interpreter = tf.lite.Interpreter(model_content=tflite_model)
interpreter.allocate_tensors()

# 入出力の詳細を取得
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

print(f"\nModel details:")
print(f"Input shape: {input_details[0]['shape']}")
print(f"Input dtype: {input_details[0]['dtype']}")
print(f"Output shape: {output_details[0]['shape']}")
print(f"Output dtype: {output_details[0]['dtype']}")

# テスト推論
print("\nTesting inference...")
test_input = np.random.randn(1, 32000).astype(np.float32) * 0.1  # ノイズのような入力
interpreter.set_tensor(input_details[0]['index'], test_input)
interpreter.invoke()
output = interpreter.get_tensor(output_details[0]['index'])

# ソフトマックスを適用して確率に変換
def softmax(x):
    exp_x = np.exp(x - np.max(x))
    return exp_x / exp_x.sum()

probabilities = softmax(output[0])
top_indices = np.argsort(probabilities)[-3:][::-1]

print(f"\nTop 3 predictions (with random input):")
for i, idx in enumerate(top_indices):
    print(f"  {i+1}. Class {idx}: {probabilities[idx]*100:.1f}%")

print("\nModel creation completed successfully!")
print("\nNote: This is a test model with random weights.")
print("For production use, train the model with actual hiragana audio data.")