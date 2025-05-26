import React, { useState, useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { StoryScreen } from '@src/components/game/StoryScreen';
import stageConfigs from '@src/config/stageConfig';
import { StageType } from '@src/types/common';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useNavigation } from 'expo-router';

export default function BeginnerStoryScreen() {
  const [isIntroCompleted, setIsIntroCompleted] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();

  useEffect(() => {
    checkIntroCompletion();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // ヘッダーを透明に設定
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerStyle: {
        backgroundColor: 'transparent',
      },
      headerTitleStyle: {
        color: '#fff',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
      },
    });
  }, [navigation]);

  const checkIntroCompletion = async () => {
    try {
      const introCompleted = await AsyncStorage.getItem('beginner_intro_completed');
      setIsIntroCompleted(introCompleted === 'true');
      
      // ストーリーを見るボタンから来た場合（既にイントロ完了済み）は何もしない
      // 初回訪問の場合のみストーリーを表示
    } catch (error) {
      console.error('イントロ完了状態のチェックエラー:', error);
    }
  };

  const handleStoryComplete = async () => {
    try {
      // イントロ完了を保存
      await AsyncStorage.setItem('beginner_intro_completed', 'true');
      setIsIntroCompleted(true);
      
      // ホーム画面へ遷移
      router.replace('/(app)/beginner/home');
    } catch (error) {
      console.error('イントロ完了状態の保存エラー:', error);
    }
  };

  const config = stageConfigs[StageType.BEGINNER];
  if (!config) {
    console.error('設定が見つかりません: BEGINNER');
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StoryScreen
        backgroundImage={config.backgroundImage}
        elderImage={config.elderImage}
        title={config.storyTitle}
        text={config.storyText}
        buttonText={config.buttonText}
        onStart={handleStoryComplete}
        fadeAnim={fadeAnim}
      />
    </View>
  );
}