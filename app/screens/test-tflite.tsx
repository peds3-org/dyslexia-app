import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import aiService from '@/src/services/aiService';
import { ThemedView } from '@/src/components/ui/ThemedView';
import { ThemedText } from '@/src/components/ui/ThemedText';

export default function TestTFLiteScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('未初期化');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInitialize = async () => {
    setIsLoading(true);
    setError(null);
    setStatus('初期化中...');

    try {
      const success = await aiService.initialize((progress) => {
        setDownloadProgress(Math.round(progress * 100));
        setStatus(`モデルダウンロード中: ${Math.round(progress * 100)}%`);
      });

      if (success) {
        setStatus('初期化完了');
        const state = aiService.getState();
        setModelInfo(state);
      } else {
        setStatus('初期化失敗');
        const state = aiService.getState();
        setError(state.error || '不明なエラー');
      }
    } catch (err) {
      setStatus('エラー発生');
      setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestInference = async () => {
    if (status !== '初期化完了') {
      setError('先にモデルを初期化してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await aiService.classifySpeech('あ', 'beginner');
      if (result) {
        setModelInfo({
          ...modelInfo,
          lastResult: result,
        });
      } else {
        setError('推論に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '推論エラー');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanup = async () => {
    await aiService.cleanup();
    setStatus('未初期化');
    setModelInfo(null);
    setDownloadProgress(0);
  };

  const handleDeleteModel = async () => {
    await aiService.deleteModelFile();
    await aiService.cleanup();
    setStatus('モデル削除済み');
    setModelInfo(null);
    setDownloadProgress(0);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText style={styles.title}>TFLite 統合テスト</ThemedText>

        <View style={styles.statusCard}>
          <ThemedText style={styles.statusLabel}>ステータス:</ThemedText>
          <ThemedText style={styles.statusValue}>{status}</ThemedText>
        </View>

        {downloadProgress > 0 && downloadProgress < 100 && (
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${downloadProgress}%` },
              ]}
            />
            <ThemedText style={styles.progressText}>
              {downloadProgress}%
            </ThemedText>
          </View>
        )}

        {error && (
          <View style={styles.errorCard}>
            <ThemedText style={styles.errorText}>エラー: {error}</ThemedText>
          </View>
        )}

        {modelInfo && (
          <View style={styles.infoCard}>
            <ThemedText style={styles.infoTitle}>モデル情報</ThemedText>
            <ThemedText style={styles.infoText}>
              状態: {modelInfo.state}
            </ThemedText>
            {modelInfo.lastResult && (
              <>
                <ThemedText style={styles.infoText}>
                  最後の推論結果:
                </ThemedText>
                <ThemedText style={styles.infoText}>
                  - レベル: {modelInfo.lastResult.level}
                </ThemedText>
                <ThemedText style={styles.infoText}>
                  - 信頼度: {(modelInfo.lastResult.confidence * 100).toFixed(1)}%
                </ThemedText>
                <ThemedText style={styles.infoText}>
                  - 処理時間: {modelInfo.lastResult.processingTimeMs}ms
                </ThemedText>
              </>
            )}
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleInitialize}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>モデルを初期化</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonSecondary,
              (isLoading || status !== '初期化完了') && styles.buttonDisabled,
            ]}
            onPress={handleTestInference}
            disabled={isLoading || status !== '初期化完了'}
          >
            <Text style={styles.buttonText}>推論テスト</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonWarning]}
            onPress={handleCleanup}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>クリーンアップ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonDanger]}
            onPress={handleDeleteModel}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>モデルファイル削除</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.noteCard}>
          <ThemedText style={styles.noteTitle}>注意事項:</ThemedText>
          <ThemedText style={styles.noteText}>
            • モデルファイルは約1.1GBあります
          </ThemedText>
          <ThemedText style={styles.noteText}>
            • 初回ダウンロードには時間がかかります
          </ThemedText>
          <ThemedText style={styles.noteText}>
            • Wi-Fi環境での使用を推奨します
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  statusLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
  },
  progressBar: {
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 15,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -10 }],
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorCard: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
  },
  buttonContainer: {
    gap: 10,
    marginTop: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#4CAF50',
  },
  buttonWarning: {
    backgroundColor: '#FF9800',
  },
  buttonDanger: {
    backgroundColor: '#f44336',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noteCard: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  noteText: {
    fontSize: 12,
    marginBottom: 3,
  },
});