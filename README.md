# ひらがなにんじゃ

ひらがなを読むのが苦手なこどもたちのためのアプリです。

## おんせいにんしき きのう

このアプリには「expo-speech-recognition」を使った音声認識機能があります。

### きほんてきな つかいかた

```jsx
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

// イベントリスナーを設定
useSpeechRecognitionEvent('start', () => {
  console.log('音声認識開始');
});

useSpeechRecognitionEvent('result', (event) => {
  console.log('認識結果:', event.results[0]?.transcript);
});

useSpeechRecognitionEvent('error', (event) => {
  console.log('エラー:', event.error, event.message);
});

// 音声認識を開始
const startListening = async () => {
  const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  if (!result.granted) {
    return;
  }

  ExpoSpeechRecognitionModule.start({
    lang: 'ja-JP',
    interimResults: true,
    continuous: false,
  });
};

// 音声認識を停止
const stopListening = () => {
  ExpoSpeechRecognitionModule.stop();
};
```

### おんせいにんしきの イベント

- `start` - 音声認識開始時
- `end` - 音声認識終了時
- `result` - 認識結果が得られたとき
- `error` - エラー発生時
- `volumechange` - 音量が変化したとき

### オプション せってい

- `lang` - 認識言語（例: 'ja-JP'）
- `interimResults` - 中間結果も取得するか
- `continuous` - 連続認識するか
- `volumeChangeEventOptions` - 音量計測の設定

```jsx
{
  lang: 'ja-JP',
  interimResults: true,
  continuous: false,
  volumeChangeEventOptions: {
    enabled: true,
    intervalMillis: 300,
  }
}
```

## パフォーマンス最適化（2024 年 6 月）

以下の最適化を行いました：

1. **コードクリーンアップ**

   - 不要なコンソールログの削除
   - 未使用コードの削除

2. **パフォーマンス最適化**

   - React Hooks（useMemo, useCallback）を活用した再レンダリング最適化
   - StyleSheet を使用したスタイル定義の集約
   - レンダリングパフォーマンスの向上

3. **設定最適化**
   - Hermes エンジンの有効化（app.json に`"jsEngine": "hermes"`を追加）

これらの最適化により、アプリの動作速度と応答性が向上し、バッテリー消費も抑えられます。
