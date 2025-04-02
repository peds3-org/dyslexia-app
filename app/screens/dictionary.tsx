import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { ThemedView } from '../../src/components/ui/ThemedView';
import { basicHiragana, HiraganaType, GameProgress } from '../../src/types/hiragana';
import progressService from '../../src/services/progressService';
import speechService from '../../src/services/speechService';
import { useFocusEffect } from '@react-navigation/native';

// デフォルトの空の進捗データ
const DEFAULT_PROGRESS: GameProgress = {
  collectedMojitama: [],
  unlockedCharacters: [],
  level: 1,
  experience: 0,
};

/**
 * ことばの図鑑画面
 * このファイルはExpo Routerによって自動的にルーティングされます
 */
export default function DictionaryScreen() {
  const [progress, setProgress] = useState<GameProgress>(DEFAULT_PROGRESS);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'collected'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // 画面がフォーカスされたときにデータを更新
  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [])
  );

  // コンポーネントマウント時に進捗を読み込む
  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setIsLoading(true);
      const currentProgress = await progressService.getProgress();

      if (currentProgress) {
        // TrainingProgressからGameProgressに変換
        const gameProgress: GameProgress = {
          collectedMojitama: currentProgress.collectedMojitama || [],
          unlockedCharacters: currentProgress.collectedMojitama || [], // 収集済みは解放済みとする
          level: currentProgress.level || 1,
          experience: currentProgress.experience || 0,
        };
        setProgress(gameProgress);
      } else {
        // 進捗がnullの場合はデフォルト値を使用
        setProgress(DEFAULT_PROGRESS);
      }
    } catch (error) {
      console.error('進捗情報の読み込みに失敗しました:', error);
      // エラー時もデフォルト値を設定
      setProgress(DEFAULT_PROGRESS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHiraganaPress = (hiragana: HiraganaType) => {
    try {
      speechService.speak(hiragana.character);
    } catch (error) {
      console.error('音声再生に失敗しました:', error);
    }
  };

  const renderHiraganaCard = (hiragana: HiraganaType) => {
    // 安全にチェック - progress.collectedMojitamaが存在することを保証
    const collectedMojitama = progress?.collectedMojitama || [];
    const unlockedCharacters = progress?.unlockedCharacters || [];

    const isCollected = collectedMojitama.includes(hiragana.character);
    const isUnlocked = unlockedCharacters.includes(hiragana.character);

    if (selectedCategory === 'collected' && !isCollected) {
      return null;
    }

    return (
      <TouchableOpacity
        key={hiragana.character}
        onPress={() => handleHiraganaPress(hiragana)}
        style={[styles.hiraganaCard, isCollected && styles.hiraganaCardCollected]}
        disabled={!isUnlocked}
        activeOpacity={0.7}>
        <ThemedText style={styles.hiraganaCharacter}>{isUnlocked ? hiragana.character : '？'}</ThemedText>
        {isCollected && (
          <>
            <ThemedText style={styles.hiraganaReading}>{hiragana.reading}</ThemedText>
            <View style={styles.collectedMark} />
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>ことばの図鑑</ThemedText>
        <ThemedText style={styles.subtitle}>集めた「もじ玉」の力を確認できます。</ThemedText>
      </View>

      <View style={styles.categoryButtons}>
        <TouchableOpacity
          onPress={() => setSelectedCategory('all')}
          style={[styles.categoryButton, selectedCategory === 'all' && styles.categoryButtonActive]}
          activeOpacity={0.7}>
          <ThemedText style={[styles.categoryButtonText, selectedCategory === 'all' && styles.categoryButtonTextActive]}>すべて</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSelectedCategory('collected')}
          style={[styles.categoryButton, selectedCategory === 'collected' && styles.categoryButtonActive]}
          activeOpacity={0.7}>
          <ThemedText style={[styles.categoryButtonText, selectedCategory === 'collected' && styles.categoryButtonTextActive]}>
            集めたもじ玉
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer}>
        <ThemedText style={styles.progressText}>集めたもじ玉: {progress.collectedMojitama.length}個</ThemedText>
        <ThemedText style={styles.progressText}>コンプリートまで: {basicHiragana.length - progress.collectedMojitama.length}個</ThemedText>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(progress.collectedMojitama.length / basicHiragana.length) * 100}%` }]} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.grid}>{!isLoading && basicHiragana.map(renderHiraganaCard)}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  categoryButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 15,
    paddingHorizontal: 20,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: 'rgba(0,0,0,0.05)',
    flex: 1,
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: '#E86A33',
  },
  categoryButtonText: {
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  progressContainer: {
    margin: 20,
    marginTop: 5,
    padding: 15,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  progressText: {
    marginBottom: 8,
  },
  progressBar: {
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 5,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E86A33',
    borderRadius: 5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 10,
  },
  hiraganaCard: {
    width: 80,
    height: 110,
    margin: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  hiraganaCardCollected: {
    backgroundColor: '#E8F6FF',
    borderColor: '#E86A33',
    borderWidth: 2,
  },
  hiraganaCharacter: {
    fontSize: 36,
  },
  hiraganaReading: {
    fontSize: 14,
    marginTop: 5,
  },
  collectedMark: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E86A33',
  },
});
