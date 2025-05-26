import { useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function BeginnerScreen() {
  useEffect(() => {
    checkFirstVisit();
  }, []);

  const checkFirstVisit = async () => {
    try {
      // 初級ステージの初回訪問チェック
      const hasVisitedBeginner = await AsyncStorage.getItem('beginner_visited');
      
      if (hasVisitedBeginner === 'true') {
        // 2回目以降の訪問者は直接ホームへ
        router.replace('/(app)/beginner/home');
      } else {
        // 初回訪問者はストーリーへ
        await AsyncStorage.setItem('beginner_visited', 'true');
        router.replace('/(app)/beginner/story');
      }
    } catch (error) {
      console.error('初回訪問チェックエラー:', error);
      // エラーの場合はホームへ
      router.replace('/(app)/beginner/home');
    }
  };

  return null;
}