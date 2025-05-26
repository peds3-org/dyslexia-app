import React, { useState, useEffect } from 'react';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { View, StyleSheet, ScrollView, SafeAreaView, StatusBar, Platform, ActivityIndicator, RefreshControl, Image } from 'react-native';
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
            backgroundColor: '#87CEEB',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTintColor: '#FF69B4',
          headerTitleStyle: {
            fontFamily: 'font-mplus-bold',
            fontSize: 24,
            color: '#FF69B4',
          },
        }}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          contentInsetAdjustmentBehavior='always'
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF69B4']} tintColor='#FF69B4' />}>
          <View style={styles.header}>
            <View style={styles.characterContainer}>
              <Image source={require('../../assets/temp/elder-worried.png')} style={styles.characterImage} resizeMode='contain' />
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
    backgroundColor: '#87CEEB', // ポケモンスマイル風の水色背景
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 80,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#87CEEB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 18,
    color: '#FF69B4',
    fontFamily: 'font-mplus-bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 20,
    borderRadius: 25,
    backgroundColor: '#FFE5CC',
    borderWidth: 4,
    borderColor: '#FFB347',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
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
    width: 90,
    height: 90,
  },
  iconText: {
    fontSize: 20,
    fontFamily: 'font-mplus-bold',
    color: 'white',
  },
  welcomeText: {
    fontSize: 20,
    fontFamily: 'font-mplus-bold',
    marginBottom: 4,
    color: '#FF6B6B',
  },
  subtitleText: {
    fontSize: 16,
    color: '#FF8C00',
    fontFamily: 'font-mplus',
  },
  todaySummaryContainer: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 25,
    backgroundColor: '#FFE5E5',
    borderWidth: 4,
    borderColor: '#FFB6C1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  todayStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  todayStatItem: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 10,
    marginHorizontal: 4,
    borderWidth: 3,
    borderColor: '#FFB6C1',
  },
  todayStatValue: {
    fontSize: 22,
    fontFamily: 'font-mplus-bold',
    color: '#FF69B4',
    marginBottom: 4,
  },
  todayStatLabel: {
    fontSize: 12,
    color: '#FF6B6B',
    fontFamily: 'font-mplus',
    textAlign: 'center',
  },
  recentCharactersContainer: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 25,
    backgroundColor: '#E6F3FF',
    borderWidth: 4,
    borderColor: '#87CEFA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  charactersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 12,
  },
  characterItem: {
    width: '18%',
    aspectRatio: 1,
    margin: '1%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#87CEFA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  characterText: {
    fontSize: 26,
    fontFamily: 'font-mplus-bold',
    color: '#4169E1',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 8,
    padding: 16,
    borderRadius: 25,
    backgroundColor: '#FFFACD',
    borderWidth: 4,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  statItem: {
    alignItems: 'center',
    padding: 8,
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    marginHorizontal: 4,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  statValue: {
    fontSize: 32,
    fontFamily: 'font-mplus-bold',
    color: '#FF8C00',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#FF6347',
    fontFamily: 'font-mplus',
    textAlign: 'center',
    lineHeight: 16,
  },
  programContainer: {
    marginVertical: 16,
    alignItems: 'center',
    padding: 20,
    borderRadius: 25,
    backgroundColor: '#FFE5F1',
    borderWidth: 4,
    borderColor: '#FF69B4',
    marginHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'font-mplus-bold',
    marginBottom: 8,
    color: '#FF1493',
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#FF69B4',
    fontFamily: 'font-mplus',
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
    backgroundColor: '#FFF0F5',
    borderRadius: 25,
    padding: 15,
    marginHorizontal: 10,
    borderWidth: 4,
    borderColor: '#FFB6C1',
  },
  dayContainer: {
    width: '22%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: '1.5%',
    borderWidth: 3,
    borderColor: '#FFB6C1',
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  completedDay: {
    backgroundColor: '#98FB98',
    borderColor: '#32CD32',
    transform: [{ scale: 1.05 }],
  },
  dayNumber: {
    fontSize: 22,
    fontFamily: 'font-mplus-bold',
    color: '#FF69B4',
  },
  completedDayText: {
    color: '#228B22',
    fontFamily: 'font-mplus-bold',
  },
  completedMark: {
    position: 'absolute',
    bottom: 5,
    right: 5,
  },
  completedMarkText: {
    fontSize: 16,
    color: '#228B22',
    fontFamily: 'font-mplus-bold',
  },
  motivationContainer: {
    padding: 25,
    borderRadius: 25,
    backgroundColor: '#FFE4E1',
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FF69B4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
    marginHorizontal: 10,
  },
  motivationText: {
    fontSize: 18,
    fontFamily: 'font-mplus-bold',
    textAlign: 'center',
    color: '#FF1493',
  },
});
