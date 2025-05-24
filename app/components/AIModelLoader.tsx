import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import aiService from '@/src/services/aiService';
import { ThemedView } from '@/src/components/ui/ThemedView';
import { ThemedText } from '@/src/components/ui/ThemedText';
import NetInfo from '@react-native-community/netinfo';

interface AIModelLoaderProps {
  onInitialized: () => void;
  children?: React.ReactNode;
}

export default function AIModelLoader({ onInitialized, children }: AIModelLoaderProps) {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingModel, setIsCheckingModel] = useState(true);

  useEffect(() => {
    checkModelStatus();
  }, []);

  const checkModelStatus = async () => {
    try {
      const state = aiService.getState();
      if (state.state === 'ready') {
        setIsInitialized(true);
        onInitialized();
      }
    } catch (err) {
      console.error('モデル状態確認エラー:', err);
    } finally {
      setIsCheckingModel(false);
    }
  };

  const handleInitialize = async () => {
    setIsInitializing(true);
    setError(null);
    setDownloadProgress(0);

    try {
      // ネットワーク接続を確認
      const netInfo = await NetInfo.fetch();
      
      if (!netInfo.isConnected) {
        Alert.alert(
          'ネットワーク接続なし',
          'AIモデルのダウンロードにはインターネット接続が必要です。',
          [{ text: 'OK' }]
        );
        setError('ネットワーク接続がありません');
        return;
      }

      // Wi-Fi接続でない場合は警告
      if (netInfo.type !== 'wifi') {
        const proceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'モバイルデータ通信での接続',
            'AIモデルは約1.1GBあります。Wi-Fi接続を推奨します。続行しますか？',
            [
              { text: 'キャンセル', onPress: () => resolve(false) },
              { text: '続行', onPress: () => resolve(true) },
            ]
          );
        });

        if (!proceed) {
          setIsInitializing(false);
          return;
        }
      }

      // モデルの初期化
      const success = await aiService.initialize((progress) => {
        setDownloadProgress(Math.round(progress * 100));
      });

      if (success) {
        setIsInitialized(true);
        onInitialized();
      } else {
        const state = aiService.getState();
        setError(state.error || '初期化に失敗しました');
      }
    } catch (err) {
      console.error('AI初期化エラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsInitializing(false);
    }
  };

  if (isCheckingModel) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <ThemedText style={styles.statusText}>モデルの状態を確認中...</ThemedText>
      </ThemedView>
    );
  }

  if (isInitialized && children) {
    return <>{children}</>;
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText style={styles.title}>AIモデルの準備</ThemedText>
        
        {!isInitializing && !error && (
          <>
            <ThemedText style={styles.description}>
              音声認識AIを使用するには、モデルファイルのダウンロードが必要です。
            </ThemedText>
            <ThemedText style={styles.sizeInfo}>
              ファイルサイズ: 約1.1GB
            </ThemedText>
            <ThemedText style={styles.recommendText}>
              Wi-Fi環境での初期化を推奨します
            </ThemedText>
          </>
        )}

        {isInitializing && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            {downloadProgress > 0 && (
              <>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${downloadProgress}%` },
                    ]}
                  />
                </View>
                <ThemedText style={styles.progressText}>
                  ダウンロード中: {downloadProgress}%
                </ThemedText>
              </>
            )}
            {downloadProgress === 0 && (
              <ThemedText style={styles.statusText}>
                初期化中...
              </ThemedText>
            )}
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        )}

        {!isInitializing && (
          <TouchableOpacity
            style={styles.button}
            onPress={handleInitialize}
            disabled={isInitializing}
          >
            <Text style={styles.buttonText}>
              {error ? 'もう一度試す' : 'AIモデルを初期化'}
            </Text>
          </TouchableOpacity>
        )}

        {!isInitializing && !error && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onInitialized}
          >
            <Text style={styles.skipButtonText}>
              スキップして続行（AIなしモード）
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    opacity: 0.8,
  },
  sizeInfo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#FF9800',
  },
  recommendText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    opacity: 0.7,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 30,
  },
  progressBar: {
    width: '100%',
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 20,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    fontSize: 16,
    marginTop: 5,
  },
  statusText: {
    fontSize: 16,
    marginTop: 10,
    opacity: 0.8,
  },
  errorContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    padding: 15,
    borderRadius: 10,
    marginVertical: 20,
  },
  errorText: {
    color: '#f44336',
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipButton: {
    marginTop: 15,
    padding: 10,
  },
  skipButtonText: {
    color: '#2196F3',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});