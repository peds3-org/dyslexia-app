import React, { useState, useEffect } from 'react';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { View, StyleSheet, ScrollView, SafeAreaView, StatusBar, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { CHARACTERS } from '../../src/components/game/CharacterAssets';
import { TrainingProgress, DailyTrainingRecord } from '../../src/types/progress';
import progressService from '../../src/services/progressService';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import authService from '../../src/services/authService';

// 型を拡張して利用
interface ProgressState {
  daysCompleted: number;
  currentStreak: number;
  totalPracticeTime: number;
  lastTrainingDate: Date | null;
  dailyProgress: {
    completedMinutes: number;
    challengesCompleted: string[];
    specialAchievements: string[];
  };
  // 新しいフィールド
  todaysSessions: {
    totalDuration: number;
    totalCharacters: number;
    sessions: any[];
  };
  recentCharacters: string[];
  averageAccuracy: number;
}

export default function ProgressScreen() {
  const [progress, setProgress] = useState<ProgressState>({
    daysCompleted: 0,
    currentStreak: 0,
    totalPracticeTime: 0,
    lastTrainingDate: null,
    dailyProgress: {
      completedMinutes: 0,
      challengesCompleted: [],
      specialAchievements: [],
    },
    // 新しいフィールドの初期化
    todaysSessions: {
      totalDuration: 0,
      totalCharacters: 0,
      sessions: [],
    },
    recentCharacters: [],
    averageAccuracy: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadProgress().finally(() => setRefreshing(false));
  }, []);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const userId = authService.getUser()?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      const userProgress = await progressService.getProgress(userId);
      const todaysSessions = await progressService.getTodaysSessions(userId);

      // 最近の学習文字を取得
      const recentCharacters: string[] = [];
      let averageAccuracy = 0;

      // 本日のセッションから学習した文字を取得
      if (todaysSessions.sessions.length > 0) {
        // セッション詳細を取得
        for (const session of todaysSessions.sessions) {
          const sessionDetails = await progressService.getSessionCharacterDetails(session.id);
          sessionDetails.forEach((detail) => {
            if (!recentCharacters.includes(detail.character)) {
              recentCharacters.push(detail.character);
            }
          });

          // 平均正確度を加算
          if (session.accuracy_rate) {
            averageAccuracy += session.accuracy_rate;
          }
        }

        // 平均正確度を計算
        if (todaysSessions.sessions.length > 0) {
          averageAccuracy = averageAccuracy / todaysSessions.sessions.length;
        }
      }

      // 進捗データの整理
      setProgress({
        daysCompleted: userProgress?.daysCompleted || 0,
        currentStreak: userProgress?.currentStreak || 0,
        totalPracticeTime: userProgress?.totalStudyMinutes || 0,
        lastTrainingDate: userProgress?.lastTrainingDate || null,
        dailyProgress: userProgress?.dailyProgress || {
          completedMinutes: 0,
          challengesCompleted: [],
          specialAchievements: [],
        },
        // 新しいデータを追加
        todaysSessions,
        recentCharacters: recentCharacters.slice(0, 10), // 最新の10文字だけ表示
        averageAccuracy,
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
      console.error('しんちょくデータのよみこみにしっぱいしました:', error);
      setLoading(false);
    }
  };

  // 最新の練習日を取得
  const getLastPracticeText = () => {
    if (!progress.lastTrainingDate) return 'れんしゅうきろくがありません';

    const now = new Date();
    const lastPractice = new Date(progress.lastTrainingDate);
    const diffTime = Math.abs(now.getTime() - lastPractice.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'きょうれんしゅうしたよ！';
    if (diffDays === 1) return 'きのうれんしゅうしたよ';
    return `${diffDays}にちまえにれんしゅうしたよ`;
  };

  // 今日の練習時間をフォーマット
  const formatTodaysPracticeTime = () => {
    const seconds = progress.todaysSessions.totalDuration;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}ふん ${remainingSeconds}びょう`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#4a86e8' />
        <ThemedText style={styles.loadingText}>よみこみちゅう...</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle='dark-content' />
      <Stack.Screen
        options={{
          title: 'しゅぎょうのきろく',
          headerStyle: {
            backgroundColor: '#f8f8f8',
          },
          headerTintColor: '#4a4a4a',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 20,
          },
        }}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          contentInsetAdjustmentBehavior='always'
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4a86e8']} />}>
          <View style={styles.header}>
            <View style={styles.characterContainer}>
              <View style={styles.characterImage}>
                {CHARACTERS.elder && CHARACTERS.elder.length > 0 && <ThemedText style={styles.iconText}>せんせい</ThemedText>}
              </View>
            </View>
            <View style={styles.headerContent}>
              <ThemedText style={styles.welcomeText}>しゅぎょうのせいかを{'\n'}みてみよう！</ThemedText>
              <ThemedText style={styles.subtitleText}>{getLastPracticeText()}</ThemedText>
            </View>
          </View>

          {/* 今日の学習概要 */}
          <View style={styles.todaySummaryContainer}>
            <ThemedText style={styles.sectionTitle}>きょうのれんしゅう</ThemedText>
            <View style={styles.todayStatsContainer}>
              <View style={styles.todayStatItem}>
                <ThemedText style={styles.todayStatValue}>{formatTodaysPracticeTime()}</ThemedText>
                <ThemedText style={styles.todayStatLabel}>れんしゅうじかん</ThemedText>
              </View>
              <View style={styles.todayStatItem}>
                <ThemedText style={styles.todayStatValue}>{progress.todaysSessions.totalCharacters}</ThemedText>
                <ThemedText style={styles.todayStatLabel}>れんしゅうもじすう</ThemedText>
              </View>
              <View style={styles.todayStatItem}>
                <ThemedText style={styles.todayStatValue}>{progress.averageAccuracy.toFixed(1)}%</ThemedText>
                <ThemedText style={styles.todayStatLabel}>せいかいりつ</ThemedText>
              </View>
            </View>
          </View>

          {/* 最近練習した文字 */}
          {progress.recentCharacters.length > 0 && (
            <View style={styles.recentCharactersContainer}>
              <ThemedText style={styles.sectionTitle}>さいきんれんしゅうしたもじ</ThemedText>
              <View style={styles.charactersGrid}>
                {progress.recentCharacters.map((char, index) => (
                  <View key={index} style={styles.characterItem}>
                    <ThemedText style={styles.characterText}>{char}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{progress.daysCompleted}</ThemedText>
              <ThemedText style={styles.statLabel}>にちかん</ThemedText>
              <ThemedText style={styles.statLabel}>しゅぎょう{'\n'}したよ</ThemedText>
            </View>

            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{progress.currentStreak}</ThemedText>
              <ThemedText style={styles.statLabel}>れんぞく</ThemedText>
              <ThemedText style={styles.statLabel}>しゅぎょう{'\n'}にっすう</ThemedText>
            </View>

            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{Math.floor(progress.totalPracticeTime / 60)}</ThemedText>
              <ThemedText style={styles.statLabel}>しゅぎょう</ThemedText>
              <ThemedText style={styles.statLabel}>じかん{'\n'}(ふん)</ThemedText>
            </View>
          </View>

          <View style={styles.programContainer}>
            <ThemedText style={styles.sectionTitle}>21にちかんしゅぎょう</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>まいにち5ふんのしゅぎょうでにんじゃへのみちをすすもう！</ThemedText>
          </View>

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
              {progress.daysCompleted < 21
                ? `あと${21 - progress.daysCompleted}にちのしゅぎょうでにんじゃになれるよ！`
                : 'しゅぎょうかんりょう！きみはりっぱなにんじゃだ！'}
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 80, // ヘッダーの高さに合わせてパディングを調整
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  characterContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  characterImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4a86e8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a76d8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  iconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333333',
  },
  subtitleText: {
    fontSize: 14,
    color: '#666666',
  },
  todaySummaryContainer: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#bbdefb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  todayStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  todayStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  todayStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 2,
  },
  todayStatLabel: {
    fontSize: 12,
    color: '#555555',
    textAlign: 'center',
  },
  recentCharactersContainer: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  charactersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  characterItem: {
    width: '18%',
    aspectRatio: 1,
    margin: '1%',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  characterText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  statItem: {
    alignItems: 'center',
    padding: 5,
    flex: 1,
  },
  statValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#4a86e8',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 16,
  },
  programContainer: {
    marginVertical: 12,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333333',
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  calendarContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  dayContainer: {
    width: '22%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: '1.5%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  completedDay: {
    backgroundColor: '#e3f2fd',
    borderColor: '#4a86e8',
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666666',
  },
  completedDayText: {
    color: '#4a86e8',
    fontWeight: 'bold',
  },
  completedMark: {
    position: 'absolute',
    bottom: 3,
    right: 3,
  },
  completedMarkText: {
    fontSize: 12,
    color: '#4a86e8',
    fontWeight: 'bold',
  },
  motivationContainer: {
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#e3f2fd',
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbdefb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  motivationText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333333',
  },
});
