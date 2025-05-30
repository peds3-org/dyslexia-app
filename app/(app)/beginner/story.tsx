import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Animated } from 'react-native';
import { StoryScreen } from '@src/components/game/StoryScreen';
import stageConfigs from '@src/config/stageConfig';
import { StageType } from '@src/types/common';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useNavigation } from 'expo-router';
import LoadingScreen from '@src/components/stages/beginner/LoadingScreen';

export default function BeginnerStoryScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isMountedRef = useRef(true);
  const navigation = useNavigation();

  // イントロ完了チェック
  const checkIntroCompletion = useCallback(async () => {
    try {
      const introCompleted = await AsyncStorage.getItem('beginner_intro_completed');
      
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('イントロ完了状態のチェックエラー:', error);
      if (isMountedRef.current) {
        setError('データの読み込みに失敗しました');
        setIsLoading(false);
      }
    }
  }, []);

  // ストーリー完了ハンドラー
  const handleStoryComplete = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      // イントロ完了を保存
      await AsyncStorage.setItem('beginner_intro_completed', 'true');
      
      if (isMountedRef.current) {
        // ホーム画面へ遷移
        router.replace('/(app)/beginner/home');
      }
    } catch (error) {
      console.error('イントロ完了状態の保存エラー:', error);
      if (isMountedRef.current) {
        setError('進捗の保存に失敗しました');
      }
    }
  }, []);

  // リトライハンドラー
  const handleRetry = useCallback(() => {
    if (isMountedRef.current) {
      setError(null);
      setIsLoading(true);
      checkIntroCompletion();
    }
  }, [checkIntroCompletion]);

  useEffect(() => {
    checkIntroCompletion();

    // フェードインアニメーション
    animationRef.current = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    });
    animationRef.current.start();

    // ヘッダーを透明に設定
    if (navigation && isMountedRef.current) {
      try {
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
      } catch (error) {
        console.error('ナビゲーション設定エラー:', error);
      }
    }

    return () => {
      isMountedRef.current = false;
      animationRef.current?.stop();
    };
  }, [navigation, fadeAnim, checkIntroCompletion]);

  // エラー画面
  if (error) {
    return (
      <LoadingScreen 
        message={error}
        showRetry
        onRetry={handleRetry}
      />
    );
  }

  // ローディング中
  if (isLoading) {
    return <LoadingScreen />;
  }

  const config = stageConfigs[StageType.BEGINNER];
  if (!config) {
    console.error('設定が見つかりません: BEGINNER');
    return (
      <LoadingScreen 
        message="設定が見つかりません" 
        showRetry={false}
      />
    );
  }

  // 新しいストーリーページ
  const storyPages = [
    'むかしむかし、にんじゃの　むらに　たいせつな　ひらがなの　まきものが　ありました。',
    'あるひ、ひらがなが　よめなくて　こまっていた　ちいさな　おにが　まきものを　こっそり　もっていってしまいました。',
    'じつは　おにも　ひらがなを　べんきょうしたかったんだ。\nでも　どうやって　おぼえたらいいか　わからなかったんだよ。',
    'きみは　ちいさな　にんじゃ。\nそんちょうさんと　いっしょに　まきものを　さがしながら\nひらがなを　べんきょうしよう！',
    'きみが　ひらがなを　おぼえると　おにも　いっしょに　ひらがなを　よめるようになるよ。\nみんなで　たのしく　ひらがなを　おぼえよう！'
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StoryScreen
        backgroundImage={config.backgroundImage}
        elderImage={config.elderImage}
        title={config.storyTitle}
        text={config.storyText}
        buttonText="しゅぎょうをはじめる"
        onStart={handleStoryComplete}
        fadeAnim={fadeAnim}
        pages={storyPages}
      />
    </View>
  );
}