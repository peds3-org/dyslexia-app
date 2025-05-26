import React, { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import stageConfigs from '@src/config/stageConfig';
import stageService from '@src/services/stageService';
import soundService from '@src/services/soundService';
import voiceService from '@src/services/voiceService';
import { StageType } from '@src/types/common';
import { StageProgress } from '@src/types/progress';
import AsyncStorage from '@react-native-async-storage/async-storage';
import aiService from '@src/services/aiService';
import { router } from 'expo-router';

import LoadingScreen from '@src/components/stages/beginner/LoadingScreen';
import GameSection from '@src/components/stages/beginner/GameSection';
import AILoadingScreen from '@src/components/stages/common/AILoadingScreen';

export default function BeginnerGameScreen() {
  const [progress, setProgress] = useState<StageProgress | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isIntroCompleted, setIsIntroCompleted] = useState(false);
  const [isAIInitialized, setIsAIInitialized] = useState<boolean | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProgress();
    checkIntroCompletion();
    initializeAI();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    return () => {
      safeCleanup();
    };
  }, []);


  const loadProgress = async () => {
    try {
      console.log('ゲーム画面: 進捗データ読み込み開始');
      const loadedProgress = await stageService.getProgress(StageType.BEGINNER);
      console.log('ゲーム画面: 進捗データ読み込み完了', loadedProgress);

      if (!loadedProgress) {
        console.error('ゲーム画面: 進捗データが見つかりません');
        return;
      }

      setProgress(loadedProgress);
    } catch (error) {
      console.error('ゲーム画面: 進捗データ読み込みエラー', error);
    }
  };

  const checkIntroCompletion = async () => {
    try {
      const introCompleted = await AsyncStorage.getItem('beginner_intro_completed');
      setIsIntroCompleted(introCompleted === 'true');

      // イントロが未完了の場合は、ストーリー画面へリダイレクト
      if (introCompleted !== 'true') {
        router.replace('/(app)/beginner/story');
      }
    } catch (error) {
      console.error('イントロ完了状態のチェックエラー:', error);
    }
  };

  const initializeAI = async () => {
    try {
      // AIが既に準備完了しているかチェック
      const isReady = await aiService.isReady();
      if (isReady) {
        console.log('ゲーム画面: AIサービスは既に初期化済みです');
        setIsAIInitialized(true);
        return;
      }

      // AIモデルがダウンロード済みかチェック
      const isModelDownloaded = await aiService.isModelDownloaded();

      if (!isModelDownloaded) {
        console.log('ゲーム画面: AIモデルがダウンロードされていません');
        setIsAIInitialized(false);
        return;
      }

      // モデルはあるが初期化されていない場合のみローディングを表示
      console.log('ゲーム画面: AIサービスの初期化が必要です');
      setIsAIInitialized(false);

      // 初期化を実行
      const isInitialized = await aiService.initialize();

      if (isInitialized) {
        console.log('ゲーム画面: AIサービスの初期化が完了しました');
        setIsAIInitialized(true);
      } else {
        console.log('ゲーム画面: AIサービスの初期化に失敗しました');
        setIsAIInitialized(false);
      }
    } catch (error) {
      console.error('ゲーム画面: AIサービス初期化エラー:', error);
      setIsAIInitialized(false);
    }
  };


  const handleCharacterComplete = async (character: string, isCorrect: boolean, responseTime: number) => {
    try {
      const updatedProgress = await stageService.updateProgress(StageType.BEGINNER, character, isCorrect, responseTime);
      console.log('ゲーム画面: 進捗データ更新完了', updatedProgress);
      setProgress(updatedProgress);
    } catch (error) {
      console.error('ゲーム画面: 進捗データ更新エラー', error);
    }
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleBackToHome = () => {
    router.replace('/(app)/beginner/home');
  };

  const safeCleanup = async () => {
    try {
      if (voiceService) {
        await voiceService.stopRecording();
        await voiceService.stopSpeaking();
      }
      if (soundService) {
        await soundService.cleanup();
      }
    } catch (error) {
      console.error('ゲーム画面: クリーンアップ中にエラーが発生', error);
    }
  };

  if (!progress) {
    console.log('ゲーム画面: 進捗データ読み込み待機中');
    return <LoadingScreen />;
  }

  const config = stageConfigs[StageType.BEGINNER];
  if (!config) {
    console.error('設定が見つかりません: BEGINNER');
    return null;
  }

  // AIの初期化中の場合のみローディング画面を表示
  if (isAIInitialized === null) {
    // まだチェック中なので通常のローディング画面を表示
    return <LoadingScreen />;
  } else if (isAIInitialized === false) {
    // 初期化が必要な場合のみAIローディング画面を表示
    return <AILoadingScreen isLoading={true} isReady={false} onBack={handleBackToHome} />;
  }


  return (
    <GameSection
      config={config}
      progress={progress}
      onToggleGameMode={handleBackToHome}
      onCharacterComplete={handleCharacterComplete}
      isPaused={isPaused}
      onPause={handlePause}
      onResume={handleResume}
    />
  );
}