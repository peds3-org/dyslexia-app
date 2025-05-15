import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';

// AIモデルの結果タイプ
type AIRecognitionResult = {
  text: string;
  confidence: number;
};

// プロパティの型定義
type AIVoiceRecognitionProps = {
  onResult: (result: AIRecognitionResult) => void;
  onError: (error: string) => void;
  isListening: boolean;
  onListeningChange: (isListening: boolean) => void;
};

// AIモデルを使った音声認識コンポーネント
export const AIVoiceRecognition = ({ onResult, onError, isListening, onListeningChange }: AIVoiceRecognitionProps) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [processingAudio, setProcessingAudio] = useState(false);

  // 録音許可の確認
  useEffect(() => {
    const getPermissions = async () => {
      try {
        console.log('音声録音の許可を確認しています...');
        const { granted } = await Audio.requestPermissionsAsync();

        if (!granted) {
          console.error('音声録音の許可が与えられていません');
          onError('マイクを使う許可がありません');
        }
      } catch (error) {
        console.error('マイク許可の取得エラー:', error);
        onError('マイクの許可を確認できませんでした');
      }
    };

    getPermissions();
  }, []);

  // 録音の状態を監視
  useEffect(() => {
    if (isListening) {
      startRecording();
    } else {
      stopRecording();
    }

    // クリーンアップ
    return () => {
      if (recording) {
        stopRecording();
      }
    };
  }, [isListening]);

  // 録音を開始
  const startRecording = async () => {
    try {
      // 録音中の場合は何もしない
      if (recording) return;

      console.log('音声録音を開始します');

      // 録音の設定
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // ハプティックフィードバック
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // 録音開始
      const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

      setRecording(newRecording);
      console.log('録音を開始しました');
    } catch (error) {
      console.error('録音開始エラー:', error);
      onError('録音を開始できませんでした');
      onListeningChange(false);
    }
  };

  // 録音を停止してAIモデルで処理
  const stopRecording = async () => {
    if (!recording) return;

    try {
      console.log('録音を停止します');
      setProcessingAudio(true);

      // ハプティックフィードバック
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // 録音を停止
      await recording.stopAndUnloadAsync();
      console.log('録音を停止しました');

      // 録音したファイルのURI
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        throw new Error('録音ファイルが見つかりません');
      }

      // AIモデルに送る処理をここで実装
      await processAudioWithAI(uri);
    } catch (error) {
      console.error('録音停止エラー:', error);
      onError('録音の処理中にエラーが発生しました');
    } finally {
      setProcessingAudio(false);
    }
  };

  // AIモデルで音声を処理する関数
  const processAudioWithAI = async (audioUri: string) => {
    try {
      console.log('AIモデルで音声を処理します:', audioUri);

      // 実際のDockerコンテナとの通信処理
      // 1. 音声ファイルの情報を取得
      const audioInfo = await FileSystem.getInfoAsync(audioUri);
      if (!audioInfo.exists) {
        throw new Error('音声ファイルが見つかりません');
      }

      // 2. ファイルをBase64エンコードする（APIに送信用）
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 3. APIエンドポイントを設定（DockerコンテナのURL）
      const apiUrl = 'http://localhost:3000/predict';

      // 4. Dockerコンテナへリクエスト送信
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_data: base64Audio,
          format: 'wav',
        }),
      });

      // 5. レスポンスの確認
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`APIエラー: ${response.status} - ${errorText}`);
      }

      // 6. 結果の解析
      const result = await response.json();
      console.log('AIモデル処理結果:', result);

      // 7. 結果をフォーマットして返す
      const aiResult: AIRecognitionResult = {
        text: result.predicted_text || 'わからない',
        confidence: result.confidence || 0.5,
      };

      onResult(aiResult);
    } catch (error) {
      console.error('AI処理エラー:', error);

      // エラー発生時はフォールバックとしてモックデータを返す
      console.log('フォールバック: モックデータを使用');

      // モックデータ (エラー時の代替)
      setTimeout(() => {
        const mockResult: AIRecognitionResult = {
          text: 'あ', // 実際はAIが認識した文字
          confidence: 0.7, // 確信度
        };

        onResult(mockResult);
      }, 300);

      onError('AIによる音声認識に失敗しました');
    }
  };

  return (
    <View>
      {processingAudio && (
        <Text
          style={{
            textAlign: 'center',
            marginVertical: 10,
            fontFamily: 'font-mplus',
            color: '#666',
          }}>
          おとを せいりちゅう...
        </Text>
      )}
    </View>
  );
};

export default AIVoiceRecognition;
