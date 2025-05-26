import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Dimensions, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import authService from '@src/services/authService';
import progressService from '@src/services/progressService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [userLevel, setUserLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

  // アニメーション値
  const buttonScale = useSharedValue(1);

  const stages: StageCard[] = [
    {
      id: 'beginner',
      title: 'しょきゅう',
      subtitle: 'ひらがな きほん',
      level: 'beginner',
      icon: 'account-child',
      color: '#4CAF50',
      route: '/(app)/beginner',
      isLocked: false,
    },
    {
      id: 'intermediate',
      title: 'ちゅうきゅう',
      subtitle: 'だくおん・はんだくおん',
      level: 'intermediate',
      icon: 'ninja',
      color: '#FF9800',
      route: '/(app)/intermediate',
      isLocked: false,
    },
    {
      id: 'advanced',
      title: 'じょうきゅう',
      subtitle: 'すべての もじ',
      level: 'advanced',
      icon: 'trophy',
      color: '#F44336',
      route: '/(app)/advanced',
      isLocked: true,
    },
  ];

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = authService.getUser();
      if (user) {
        setUserName(user.display_name || 'にんじゃ');

        // 今日の学習時間を取得
        const todaySessions = await progressService.getTodaysSessions(user.id);
        setTodayMinutes(Math.floor(todaySessions.totalDuration / 60));

        // ストリークを取得
        const userStreak = await progressService.getStreak(user.id);
        setStreak(userStreak);

        // ユーザーのレベルを取得
        const profile = await progressService.getUserProfile(user.id);
        if (profile && profile.character_level) {
          setUserLevel(profile.character_level);
        }
      }
    } catch (error) {
      console.error('ユーザーデータ読み込みエラー:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  const handleProgressPress = () => {
    router.push('/(app)/progress');
  };

  const handleSettingsPress = () => {
    router.push('/(app)/ai-setup');
  };

  const handleDictionaryPress = () => {
    router.push('/(app)/dictionary');
  };

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* ヘッダー */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <View style={styles.userInfo}>
            <Image source={require('../../assets/ninja/beginner/normal.png')} style={styles.avatar} />
            <View>
              <Text style={styles.greeting}>こんにちは！</Text>
              <Text style={styles.userName}>{userName}さん</Text>
            </View>
          </View>

          <TouchableOpacity 
            onPress={() => router.push('../')} 
            style={styles.settingsButton}
          >
            <MaterialCommunityIcons name="home-variant" size={28} color="#666" />
          </TouchableOpacity>
        </Animated.View>

        {/* 今日の進捗 */}
        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name='clock-outline' size={32} color='#4CAF50' />
            <Text style={styles.statValue}>{todayMinutes}</Text>
            <Text style={styles.statLabel}>ぷん</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialCommunityIcons name='fire' size={32} color='#FF5722' />
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>れんぞく</Text>
          </View>

          <TouchableOpacity style={styles.statCard} onPress={handleProgressPress}>
            <MaterialCommunityIcons name='chart-line' size={32} color='#2196F3' />
            <Text style={styles.statValue}>→</Text>
            <Text style={styles.statLabel}>しんちょく</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* 今日の学習を始める */}
        <Animated.View entering={FadeInUp.duration(600).delay(400)}>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => {
              // ユーザーのレベルに基づいて適切なステージに遷移
              const route = userLevel === 'beginner' ? '/(app)/beginner' : userLevel === 'intermediate' ? '/(app)/intermediate' : '/(app)/advanced';
              router.push(route as any);
            }}
            activeOpacity={0.8}>
            <MaterialCommunityIcons name='play-circle' size={48} color='#FFFFFF' />
            <Text style={styles.startButtonText}>きょうの がくしゅうを はじめる</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* クイックアクション */}
        <Animated.View entering={FadeInUp.duration(600).delay(800)} style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleDictionaryPress}>
            <MaterialCommunityIcons name='book-open' size={28} color='#673AB7' />
            <Text style={styles.quickActionText}>ことばのずかん</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/(app)/voice-practice' as any)}>
            <MaterialCommunityIcons name='microphone' size={28} color='#E91E63' />
            <Text style={styles.quickActionText}>おんせいれんしゅう</Text>
          </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#FFF',
  },
  greeting: {
    fontFamily: 'font-mplus',
    fontSize: 14,
    color: '#666',
  },
  userName: {
    fontFamily: 'font-mplus-bold',
    fontSize: 18,
    color: '#333',
  },
  settingsButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
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
    fontSize: 24,
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontFamily: 'font-mplus',
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontFamily: 'font-mplus-bold',
    fontSize: 20,
    color: '#333',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
  },
  stageIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stageInfo: {
    flex: 1,
  },
  stageTitle: {
    fontFamily: 'font-mplus-bold',
    fontSize: 18,
    color: '#333',
    marginBottom: 4,
  },
  stageTitleLocked: {
    color: '#999',
  },
  stageSubtitle: {
    fontFamily: 'font-mplus',
    fontSize: 14,
    color: '#666',
  },
  stageSubtitleLocked: {
    color: '#AAA',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: 10,
  },
  quickActionButton: {
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
  quickActionText: {
    fontFamily: 'font-mplus',
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  startButton: {
    backgroundColor: '#E86A33',
    borderRadius: 30,
    paddingVertical: 20,
    paddingHorizontal: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  startButtonText: {
    fontFamily: 'font-mplus-bold',
    fontSize: 20,
    color: '#FFFFFF',
    marginLeft: 12,
  },
});
