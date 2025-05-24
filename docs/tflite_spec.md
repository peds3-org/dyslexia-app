# 小児音声認識AIモデル - TensorFlow Lite実装用技術仕様書

## モデル基本仕様

### アーキテクチャ
```
音声入力（16kHz, 2秒） 
→ HuBERT（日本語事前学習済み、レイヤー23）
→ CNN × 4層 
→ 平坦化 
→ 全結合層 × 3層 
→ 出力（102クラス分類、0-102logit）
```

### 使用モデル
- **ベースモデル**: `TKU410410103/hubert-large-japanese-asr`
- **パラメータ数**: 316M（HuBERT-large）
- **使用レイヤー**: 第23層（最終層）の特徴量
- **事前学習精度**: WER 22.71%（common_voice_11_0）

## TensorFlow Lite変換仕様

### 入出力形式
```python
# 入力
input_shape: [1, 32000]  # 16kHz × 2秒 = 32000サンプル
input_dtype: float32

# 出力  
output_shape: [1, 102]   # 102文字分類
output_dtype: float32    # logit値
```

### 対象文字クラス（102クラス）
```python
# 基本ひらがな（単音・拗音・濁音・半濁音）
classes = [
    'あ', 'い', 'う', 'え', 'お',
    'か', 'が', 'き', 'ぎ', 'く', 'ぐ', 'け', 'げ', 'こ', 'ご',
    'きゃ', 'きゅ', 'きょ', 'ぎゃ', 'ぎゅ', 'ぎょ',
    'さ', 'ざ', 'し', 'じ', 'す', 'ず', 'せ', 'ぜ', 'そ', 'ぞ',
    'しゃ', 'しゅ', 'しょ', 'じゃ', 'じゅ', 'じょ',
    'た', 'だ', 'ち', 'ぢ', 'つ', 'づ', 'て', 'で', 'と', 'ど',
    'ちゃ', 'ちゅ', 'ちょ',
    'な', 'に', 'ぬ', 'ね', 'の',
    'にゃ', 'にゅ', 'にょ',
    'は', 'ば', 'ぱ', 'ひ', 'び', 'ぴ', 'ふ', 'ぶ', 'ぷ', 'へ', 'べ', 'ぺ', 'ほ', 'ぼ', 'ぽ',
    'ひゃ', 'ひゅ', 'ひょ', 'びゃ', 'びゅ', 'びょ', 'ぴゃ', 'ぴゅ', 'ぴょ',
    'ま', 'み', 'む', 'め', 'も',
    'みゃ', 'みゅ', 'みょ',
    'や', 'ゆ', 'よ',
    'ら', 'り', 'る', 'れ', 'ろ',
    'りゃ', 'りゅ', 'りょ',
    'わ', 'ゐ', 'ゑ', 'を', 'ん'
]

# 特殊ルール
# 'を/お' → 同一扱い
# 'ず/づ' → 同一扱い  
# 'じ/ぢ' → 同一扱い
```

## 性能指標・要件

### 達成精度
```
- Top-1精度: 82.4%
- Top-3精度: 89.3% 
- Top-3+類似調整: 92.3%
- 目標精度: 95%（未達成）
```

### 処理速度要件
- **目標**: 0.5秒以内（Adreno 750GPU）
- **実測**: CPU 0.231秒、GPU 0.041秒
- **TensorFlow Lite**: さらなる高速化期待

### モバイル最適化要件
- **量子化**: INT8推奨（精度と速度のバランス）
- **メモリ使用量**: 制限あり（HuBERT-largeは大型）
- **バッテリー消費**: 最小化必要

## 後処理ロジック（重要）

### Top-3 + 類似ラベル調整
```python
# 類似ラベルペア（AIが頻繁に間違えるペア）
similar_pairs = {
    'ぎ': ['じ', 'ぢ'],         # じ/ぢは元々同一扱い
    'じ': ['ぎ', 'ぢ'],         
    'ぢ': ['ぎ', 'じ'],
    'ぎゅ': ['じゅ', 'ず', 'づ'], # ず/づは元々同一扱い
    'じゅ': ['ぎゅ', 'ず', 'づ'], 
    'ず': ['ぎゅ', 'じゅ', 'づ'], 
    'づ': ['ぎゅ', 'じゅ', 'ず'],
    'は': ['ほ'],
    'ほ': ['は'],
    'ぱ': ['ぷ'],
    'ぷ': ['ぱ']
}

def post_process_prediction(logits, ground_truth=None):
    # Top-3取得
    top3_indices = torch.topk(logits, k=3).indices
    top3_classes = [index_to_char[idx] for idx in top3_indices]
    
    if ground_truth:
        # 正解判定ロジック
        if ground_truth in top3_classes:
            return True
        
        # 類似ラベルチェック
        similar_labels = similar_pairs.get(ground_truth, [])
        return any(label in top3_classes for label in similar_labels)
    
    return top3_classes[0]  # 最高スコアを返す
```

### 推論フロー
```python
def inference_pipeline(audio_data):
    # 前処理
    audio = preprocess_audio(audio_data, target_length=32000)
    
    # TensorFlow Lite推論
    interpreter.set_tensor(input_details[0]['index'], audio)
    interpreter.invoke()
    logits = interpreter.get_tensor(output_details[0]['index'])
    
    # Top-3 + 後処理
    top3_indices = np.argsort(logits[0])[-3:][::-1]
    top3_probs = softmax(logits[0])[top3_indices]
    
    return {
        'prediction': index_to_char[top3_indices[0]],
        'top3': [(index_to_char[idx], prob) for idx, prob in zip(top3_indices, top3_probs)],
        'confidence': float(top3_probs[0])
    }
```

## データ拡張・学習詳細

### 学習データ構成
```
- 生データ: 4,769件
- KNN-VC合成データ: 5,110件
- 比率: 1:1程度（最適バランス）
- 評価データ: 1,552件
```

### KNN-VC合成データ生成
```python
# 使用したモデル
- WavLM: 特徴抽出
- HiFi-GAN: 音声生成
- 参考実装: https://github.com/bshall/knn-vc

# プロセス
1. 1モーラ小児音声（Peds3収集） → WavLM → 特徴抽出
2. 大人発話音声（全モーラ対応） → WavLM → マッチングセット
3. KNN回帰でマッピング
4. HiFi-GANで小児様音声合成
```

## 実装上の重要な注意点

### 話者リーク問題
- **問題**: 学習時と推論時で精度に10%程度の乖離
- **原因**: 同一話者データが学習・評価両方に含まれていた
- **対策**: 話者単位でのデータ分割が必要

### 低精度文字（要個別対応）
```python
# 70%未満の精度文字（Top-1）
low_accuracy_chars = [
    'で': 56.4%,    # 最も困難
    'ど': 62.7%,
    'ぽ': 66.1%,
    'つ': 66.1%,
    'りょ': 68.3%,
    'ぜ': 68.9%
]

# アプリ側での追加対応推奨
```

### TensorFlow Lite変換時の注意
```python
# 量子化オプション
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.target_spec.supported_types = [tf.int8]

# HuBERTの大きさに注意
# - 元モデル: ~1.2GB
# - 量子化後: ~300MB（推定）
# - メモリ使用量: 実行時に要確認

# 代替案: モデル軽量化
# - DistilBERT系の軽量モデル検討
# - レイヤー数削減
# - 知識蒸留
```

## モバイル実装推奨事項

### Android実装
```kotlin
// TensorFlow Lite Interpreter初期化
private val interpreter = Interpreter(loadModelFile())

// 音声前処理
fun preprocessAudio(audioData: FloatArray): FloatArray {
    // 16kHz, 2秒に正規化
    return resampleAndPad(audioData, targetLength = 32000)
}

// 推論実行
fun predict(audioData: FloatArray): PredictionResult {
    val input = arrayOf(preprocessAudio(audioData))
    val output = Array(1) { FloatArray(102) }
    
    interpreter.run(input, output)
    return postProcess(output[0])
}
```

### iOS実装
```swift
// Core ML使用推奨
import CoreML

class SpeechRecognizer {
    private let model: MLModel
    
    func predict(audioBuffer: AVAudioPCMBuffer) -> PredictionResult {
        // 前処理 → Core ML推論 → 後処理
    }
}
```

## デバッグ・検証用

### 混同行列分析
```python
# 主な誤りペア（カウント8以上）
major_confusion_pairs = [
    ('じ/ぢ', 'ち'): 15,
    ('ぼ', 'ぽ'): 15, 
    ('き', 'ち'): 14,
    ('ず/づ', 'つ'): 14,
    ('び', 'ぴ'): 14,
    ('きゅ', 'ちゅ'): 13,
    ('ぜ', 'で'): 13
]
```

### パフォーマンス監視
```python
# 監視すべきメトリクス
metrics_to_monitor = {
    'inference_time': '< 0.5s',
    'memory_usage': '< 500MB', 
    'battery_impact': 'minimal',
    'top1_accuracy': '> 80%',
    'top3_accuracy': '> 90%'
}
```

## 改善提案

### 短期的改善
1. **量子化最適化**: INT8量子化で速度向上
2. **モデル軽量化**: 不要レイヤーの削除
3. **後処理調整**: 類似ラベルの閾値調整

### 長期的改善
1. **データ収集**: 小児音声データの追加収集
2. **アーキテクチャ見直し**: より軽量なSSLモデルの検討
3. **個別チューニング**: 低精度文字の専用モデル

---

**注意**: この仕様書はTensorFlow Lite実装に特化した内容です。実際の変換・実装時には最新の制約事項を確認してください。