import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import authService from '@src/services/authService';
import progressService from '@src/services/progressService';
import { Calendar } from 'react-native-calendars';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DayProgress {
  date: string;
  minutes: number;
  characters: number;
  accuracy: number;
}

export default function ImprovedProgressScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [streak, setStreak] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [totalCharacters, setTotalCharacters] = useState(0);
  const [averageAccuracy, setAverageAccuracy] = useState(0);
  const [monthlyData, setMonthlyData] = useState<{ [key: string]: DayProgress }>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [markedDates, setMarkedDates] = useState<any>({});

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      const user = authService.getUser();
      if (!user) return;

      // ストリーク取得
      const userStreak = await progressService.getStreak(user.id);
      setStreak(userStreak);

      // 全体の統計
      const stats = await progressService.getProgressStatistics(user.id);
      setTotalMinutes(Math.floor(stats.totalPracticeMinutes));
      setTotalCharacters(stats.totalCharactersPracticed);
      setAverageAccuracy(Math.round(stats.averageAccuracy * 100));

      // 今月のデータ取得
      const sessions = await progressService.getMonthlyData(user.id);
      const dailyData: { [key: string]: DayProgress } = {};
      const marks: any = {};

      sessions.forEach((session: any) => {
        const date = session.created_at.split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = {
            date,
            minutes: 0,
            characters: 0,
            accuracy: 0,
          };
        }
        
        dailyData[date].minutes += Math.floor(session.duration_seconds / 60);
        dailyData[date].characters += session.characters_practiced;
        dailyData[date].accuracy = session.accuracy_rate;

        // カレンダーマーク
        marks[date] = {
          selected: false,
          marked: true,
          dotColor: session.accuracy_rate >= 0.7 ? '#4CAF50' : '#FF9800',
        };
      });

      setMonthlyData(dailyData);
      setMarkedDates(marks);
    } catch (error) {
      console.error('進捗データ読み込みエラー:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProgressData();
    setRefreshing(false);
  };

  const handleDayPress = (day: any) => {
    setSelectedDate(day.dateString);
  };

  const selectedDayData = selectedDate ? monthlyData[selectedDate] : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>しんちょく</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* 統計カード */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="fire" size={40} color="#FF5722" />
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>にちれんぞく</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="clock-outline" size={40} color="#2196F3" />
            <Text style={styles.statValue}>{totalMinutes}</Text>
            <Text style={styles.statLabel}>ぷんれんしゅう</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="text-recognition" size={40} color="#4CAF50" />
            <Text style={styles.statValue}>{totalCharacters}</Text>
            <Text style={styles.statLabel}>もじ</Text>
          </View>
        </Animated.View>

        {/* 正確率 */}
        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.accuracyContainer}>
          <Text style={styles.sectionTitle}>せいかくりつ</Text>
          <View style={styles.accuracyBar}>
            <View style={[styles.accuracyFill, { width: `${averageAccuracy}%` }]} />
          </View>
          <Text style={styles.accuracyText}>{averageAccuracy}%</Text>
        </Animated.View>

        {/* カレンダー */}
        <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>れんしゅうカレンダー</Text>
          <Calendar
            markedDates={markedDates}
            onDayPress={handleDayPress}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#b6c1cd',
              selectedDayBackgroundColor: '#4CAF50',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#4CAF50',
              dayTextColor: '#2d4150',
              textDisabledColor: '#d9e1e8',
              dotColor: '#4CAF50',
              selectedDotColor: '#ffffff',
              arrowColor: '#4CAF50',
              monthTextColor: '#333',
              textDayFontFamily: 'font-mplus',
              textMonthFontFamily: 'font-mplus-bold',
              textDayHeaderFontFamily: 'font-mplus',
            }}
          />
        </Animated.View>

        {/* 選択した日の詳細 */}
        {selectedDayData && (
          <Animated.View entering={FadeInUp.duration(300)} style={styles.dayDetailContainer}>
            <Text style={styles.dayDetailTitle}>{selectedDate} のきろく</Text>
            <View style={styles.dayDetailStats}>
              <View style={styles.dayDetailStat}>
                <MaterialCommunityIcons name="clock-outline" size={24} color="#666" />
                <Text style={styles.dayDetailValue}>{selectedDayData.minutes} ぷん</Text>
              </View>
              <View style={styles.dayDetailStat}>
                <MaterialCommunityIcons name="text-recognition" size={24} color="#666" />
                <Text style={styles.dayDetailValue}>{selectedDayData.characters} もじ</Text>
              </View>
              <View style={styles.dayDetailStat}>
                <MaterialCommunityIcons name="check-circle" size={24} color="#666" />
                <Text style={styles.dayDetailValue}>{Math.round(selectedDayData.accuracy * 100)}%</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* 励ましメッセージ */}
        <Animated.View entering={FadeInUp.duration(600).delay(600)} style={styles.encouragementContainer}>
          <Image
            source={require('../../assets/sennin/master/happy.png')}
            style={styles.encouragementImage}
          />
          <View style={styles.encouragementBubble}>
            <Text style={styles.encouragementText}>
              {streak >= 7 ? 'すばらしい！ つづけることが たいせつじゃ！' :
               streak >= 3 ? 'いいちょうし！ このままがんばろう！' :
               'きょうも いっしょに がんばろう！'}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'font-mplus-bold',
    fontSize: 20,
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontFamily: 'font-mplus-bold',
    fontSize: 32,
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontFamily: 'font-mplus',
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  accuracyContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: 'font-mplus-bold',
    fontSize: 18,
    color: '#333',
    marginBottom: 12,
  },
  accuracyBar: {
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  accuracyFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 10,
  },
  accuracyText: {
    fontFamily: 'font-mplus-bold',
    fontSize: 24,
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 12,
  },
  calendarSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dayDetailContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dayDetailTitle: {
    fontFamily: 'font-mplus-bold',
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  dayDetailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayDetailStat: {
    alignItems: 'center',
  },
  dayDetailValue: {
    fontFamily: 'font-mplus',
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  encouragementContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  encouragementImage: {
    width: 80,
    height: 80,
  },
  encouragementBubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  encouragementText: {
    fontFamily: 'font-mplus',
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
});