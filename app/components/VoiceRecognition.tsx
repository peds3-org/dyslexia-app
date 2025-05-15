import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Voice from '@react-native-voice/voice';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * 音声認識のプロパティ
 * @param onTranscript 認識結果を受け取るコールバック関数
 * @param placeholder 音声認識待機中に表示するテキスト
 */
type VoiceRecognitionProps = {
  onTranscript: (text: string) => void;
  placeholder?: string;
};

/**
 * 音声認識コンポーネント
 * ユーザーの音声を認識し、テキストに変換する機能を提供します
 */
export default function VoiceRecognition({ onTranscript, placeholder = 'よみたいことばをはなしてね' }: VoiceRecognitionProps) {
  // 状態管理
  const [recognizing, setRecognizing] = useState(false); // 認識中かどうか
  const [transcript, setTranscript] = useState(''); // 認識結果
  const [error, setError] = useState<string | null>(null); // エラーメッセージ
  const [volumeLevel, setVolumeLevel] = useState(0); // 音量レベル（0-10）

  /**
   * 音声認識イベントリスナーの設定
   * コンポーネントのマウント時に一度だけ実行
   */
  useEffect(() => {
    // 音声認識開始時
    Voice.onSpeechStart = () => {
      setRecognizing(true);
      setError(null);
    };

    // 音声認識終了時
    Voice.onSpeechEnd = () => {
      setRecognizing(false);
    };

    // 音声認識結果受信時
    Voice.onSpeechResults = (event) => {
      if (event.value && event.value.length > 0) {
        const result = event.value[0];
        setTranscript(result);
        onTranscript(result);
      }
    };

    // 音声認識エラー発生時
    Voice.onSpeechError = (event) => {
      setError(`エラー: ${event.error?.message || 'おんせいにんしきエラー'}`);
      setRecognizing(false);
    };

    // 音量変化時
    Voice.onSpeechVolumeChanged = (event) => {
      setVolumeLevel(Math.min(10, Math.max(0, event.value || 0)));
    };

    // クリーンアップ関数 - コンポーネントのアンマウント時に実行
    return () => {
      Voice.destroy();
    };
  }, [onTranscript]);

  /**
   * 音声認識を開始する関数
   * パフォーマンス最適化のためuseCallbackを使用
   */
  const startListening = useCallback(async () => {
    try {
      await Voice.start('ja-JP');
    } catch (err) {
      setError('おんせいにんしきを しようできません');
    }
  }, []);

  /**
   * 音声認識を停止する関数
   * パフォーマンス最適化のためuseCallbackを使用
   */
  const stopListening = useCallback(async () => {
    try {
      await Voice.stop();
    } catch (err) {
      // エラー処理
    }
  }, []);

  /**
   * ボタンのクリックハンドラ
   * 認識中なら停止、停止中なら開始
   */
  const handleButtonPress = useCallback(() => {
    if (recognizing) {
      stopListening();
    } else {
      startListening();
    }
  }, [recognizing, startListening, stopListening]);

  /**
   * 音量インジケーターのレンダリング
   * パフォーマンス最適化のためuseMemoを使用
   */
  const renderVolumeIndicator = useMemo(() => {
    if (!recognizing) return null;

    return (
      <View style={styles.volumeContainer}>
        {[...Array(5)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.volumeBar,
              {
                height: 4 + i * 3,
                opacity: volumeLevel > i * 2 ? 1 : 0.3,
              },
            ]}
          />
        ))}
      </View>
    );
  }, [recognizing, volumeLevel]);

  /**
   * ボタンの内容をメモ化
   * 認識中はインジケーターを表示、それ以外はマイクアイコンのみ
   */
  const buttonContent = useMemo(() => {
    if (recognizing) {
      return (
        <View style={styles.buttonInner}>
          <ActivityIndicator color='#fff' size='small' style={styles.activityIndicator} />
          <MaterialCommunityIcons name='microphone' size={24} color='#fff' />
        </View>
      );
    }
    return <MaterialCommunityIcons name='microphone' size={24} color='#fff' />;
  }, [recognizing]);

  // コンポーネントのレンダリング
  return (
    <View style={styles.container}>
      {/* エラー、認識結果、またはプレースホルダーを表示 */}
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : transcript ? (
        <Text style={styles.transcriptText}>{transcript}</Text>
      ) : (
        <Text style={styles.placeholderText}>{placeholder}</Text>
      )}

      {/* 音声認識ボタン */}
      <TouchableOpacity style={[styles.button, recognizing ? styles.buttonActive : null]} onPress={handleButtonPress}>
        {buttonContent}
      </TouchableOpacity>

      {/* 音量インジケーター */}
      {renderVolumeIndicator}
    </View>
  );
}

/**
 * スタイル定義
 */
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 12,
  },
  transcriptText: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#888',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonActive: {
    backgroundColor: '#FF3B30',
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIndicator: {
    marginRight: 5,
  },
  volumeContainer: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'flex-end',
    height: 20,
    justifyContent: 'center',
  },
  volumeBar: {
    width: 3,
    backgroundColor: '#007AFF',
    marginHorizontal: 2,
    borderRadius: 1,
  },
});
