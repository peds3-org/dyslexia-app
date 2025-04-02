import React, { useState, useEffect } from 'react';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { ThemedView } from '../../src/components/ui/ThemedView';
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { CHARACTERS } from '../../src/components/game/CharacterAssets';
import { TrainingProgress, DailyTrainingRecord } from '../../src/types/progress';
import progressService from '../../src/services/progressService';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

export default function ProgressScreen() {
  const [progress, setProgress] = useState<TrainingProgress>({
    daysCompleted: 0,
    currentStreak: 0,
    totalPracticeTime: 0,
    lastPracticeDate: null,
    dailyProgress: [],
  });
  const [loading, setLoading] = useState(true);

  // 21日間の配列を作成
  const trainingDays = Array.from({ length: 21 }, (_, i) => ({
    day: i + 1,
    completed: false,
    date: null as Date | null,
    minutes: 0,
  }));

  const [days, setDays] = useState(trainingDays);

  useFocusEffect(
    React.useCallback(() => {
      loadProgress();
    }, [])
  );

  const loadProgress = async () => {
    try {
      setLoading(true);
      const userProgress = await progressService.getProgress();

      // 進捗データの整理
      setProgress({
        daysCompleted: userProgress?.daysCompleted || 0,
        currentStreak: userProgress?.currentStreak || 0,
        totalPracticeTime: userProgress?.totalPracticeTime || 0,
        lastPracticeDate: userProgress?.lastPracticeDate || null,
        dailyProgress: userProgress?.dailyProgress || [],
      });

      // サンプルデータで日々の進捗を設定
      // 実際はストレージから読み込む
      const updatedDays = [...trainingDays];
      for (let i = 0; i < Math.min(userProgress?.daysCompleted || 0, 21); i++) {
        updatedDays[i].completed = true;
        updatedDays[i].minutes = 5;

        // 仮の日付（現在の日付からさかのぼる）
        const date = new Date();
        date.setDate(date.getDate() - (userProgress?.daysCompleted || 0) + i + 1);
        updatedDays[i].date = date;
      }

      setDays(updatedDays);
      setLoading(false);
    } catch (error) {
      console.error('進捗データの読み込みに失敗しました:', error);
      setLoading(false);
    }
  };

  // 最新の練習日を取得
  const getLastPracticeText = () => {
    if (!progress.lastPracticeDate) return '練習履歴がありません';

    const now = new Date();
    const lastPractice = new Date(progress.lastPracticeDate);
    const diffTime = Math.abs(now.getTime() - lastPractice.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今日練習しました！';
    if (diffDays === 1) return '昨日練習しました';
    return `${diffDays}日前に練習しました`;
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: '忍者の修行記録',
        }}
      />

      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View style={styles.characterContainer}>
            {/* 長老キャラクターアイコン */}
            <View style={styles.characterImage}>
              {CHARACTERS.elder && CHARACTERS.elder.length > 0 && <ThemedText style={styles.iconText}>先生</ThemedText>}
            </View>
          </View>
          <View style={styles.headerContent}>
            <ThemedText style={styles.welcomeText}>修行の成果を見てみましょう！</ThemedText>
            <ThemedText style={styles.subtitleText}>{getLastPracticeText()}</ThemedText>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{progress.daysCompleted}</ThemedText>
            <ThemedText style={styles.statLabel}>日間修行済み</ThemedText>
          </View>

          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{progress.currentStreak}</ThemedText>
            <ThemedText style={styles.statLabel}>連続修行日数</ThemedText>
          </View>

          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{Math.floor(progress.totalPracticeTime / 60)}</ThemedText>
            <ThemedText style={styles.statLabel}>修行時間(分)</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.sectionTitle}>21日間修行プログラム</ThemedText>
        <ThemedText style={styles.sectionSubtitle}>毎日5分の修行で忍者への道を進もう！</ThemedText>

        <View style={styles.calendarContainer}>
          {days.map((day, index) => (
            <View key={index} style={[styles.dayContainer, day.completed && styles.completedDay]}>
              <ThemedText style={[styles.dayNumber, day.completed && styles.completedDayText]}>{day.day}</ThemedText>
              {day.completed && (
                <View style={styles.completedMark}>
                  <ThemedText style={styles.completedMarkText}>✓</ThemedText>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.motivationContainer}>
          <ThemedText style={styles.motivationText}>
            {progress.daysCompleted < 21 ? `あと${21 - progress.daysCompleted}日の修行で忍者になれます！` : '修行完了！あなたは立派な忍者です！'}
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
  scrollView: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  characterContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  characterImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E86A33',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    opacity: 0.7,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(232, 106, 51, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E86A33',
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
  },
  calendarContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 24,
  },
  dayContainer: {
    width: '14.28%', // 7日/週で表示
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
  },
  completedDay: {
    backgroundColor: 'rgba(232, 106, 51, 0.2)',
    borderColor: '#E86A33',
  },
  dayNumber: {
    fontSize: 16,
  },
  completedDayText: {
    color: '#E86A33',
    fontWeight: 'bold',
  },
  completedMark: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  completedMarkText: {
    fontSize: 12,
    color: '#E86A33',
  },
  motivationContainer: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    marginBottom: 24,
    alignItems: 'center',
  },
  motivationText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
