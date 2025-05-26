import React, { useState, useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { StoryScreen } from '@src/components/game/StoryScreen';
import stageConfigs from '@src/config/stageConfig';
import stageService from '@src/services/stageService';
import soundService from '@src/services/soundService';
import voiceService from '@src/services/voiceService';
import { StageType } from '@src/types/common';
import { StageProgress } from '@src/types/progress';
import authService from '@src/services/authService';
import cbtService from '@src/services/cbtService';
import LoginBonusModal from '@src/components/cbt/LoginBonusModal';
import { LoginBonus } from '@src/types/cbt';
import AsyncStorage from '@react-native-async-storage/async-storage';
import aiService from '@src/services/aiService';

import LoadingScreen from '@src/components/stages/beginner/LoadingScreen';
import HomeSection from '@src/components/stages/beginner/HomeSection';
import GameSection from '@src/components/stages/beginner/GameSection';

const BeginnerScreen = () => {
  const [showStory, setShowStory] = useState(false);
  const [progress, setProgress] = useState<StageProgress | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [gameMode, setGameMode] = useState(false);
  const [showLoginBonus, setShowLoginBonus] = useState(false);
  const [loginBonusData, setLoginBonusData] = useState<LoginBonus | null>(null);
  const [isIntroCompleted, setIsIntroCompleted] = useState(false);
  const [isAIInitialized, setIsAIInitialized] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProgress();
    checkLoginBonus();
    checkIntroCompletion();
    initializeAI(); // AIの初期化を開始

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
      console.log('初級画面: 進捗データ読み込み開始');
      const loadedProgress = await stageService.getProgress(StageType.BEGINNER);
      console.log('初級画面: 進捗データ読み込み完了', loadedProgress);

      if (!loadedProgress) {
        console.error('初級画面: 進捗データが見つかりません');
        return;
      }

      setProgress(loadedProgress);
    } catch (error) {
      console.error('初級画面: 進捗データ読み込みエラー', error);
    }
  };

  const checkIntroCompletion = async () => {
    try {
      const introCompleted = await AsyncStorage.getItem('beginner_intro_completed');
      setIsIntroCompleted(introCompleted === 'true');
      
      // イントロが未完了の場合は、ストーリーを表示
      if (introCompleted !== 'true') {
        setShowStory(true);
      }
    } catch (error) {
      console.error('イントロ完了状態のチェックエラー:', error);
    }
  };

  const initializeAI = async () => {
    try {
      // AIモデルがダウンロード済みかチェック
      const isModelDownloaded = await aiService.isModelDownloaded();
      
      if (!isModelDownloaded) {
        console.log('初級画面: AIモデルがダウンロードされていません');
        setIsAIInitialized(false);
        return;
      }
      
      // AIが既に準備完了しているかチェック
      const isReady = await aiService.isReady();
      if (isReady) {
        console.log('初級画面: AIサービスは既に初期化済みです');
        setIsAIInitialized(true);
        return;
      }
      
      // まだ初期化されていない場合は、初期化状態を待つ（バックグラウンドで初期化中の可能性）
      console.log('初級画面: AIサービスの初期化を待機しています');
      
      // 最大10秒待機
      const maxWaitTime = 10000;
      const checkInterval = 500;
      let waitedTime = 0;
      
      while (waitedTime < maxWaitTime) {
        const ready = await aiService.isReady();
        if (ready) {
          console.log('初級画面: AIサービスの初期化が完了しました');
          setIsAIInitialized(true);
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waitedTime += checkInterval;
      }
      
      // タイムアウトした場合は初期化を試みる
      console.log('初級画面: AIサービスの初期化がタイムアウトしました。手動で初期化を試みます');
      const isInitialized = await aiService.initialize();
      
      if (isInitialized) {
        console.log('初級画面: AIサービスの手動初期化が完了しました');
        setIsAIInitialized(true);
      } else {
        console.log('初級画面: AIサービスの初期化に失敗しました');
        setIsAIInitialized(false);
      }
    } catch (error) {
      console.error('初級画面: AIサービス初期化エラー:', error);
      setIsAIInitialized(false);
    }
  };

  const handleStoryComplete = async () => {
    try {
      // イントロ完了を保存
      await AsyncStorage.setItem('beginner_intro_completed', 'true');
      setIsIntroCompleted(true);
      setShowStory(false);
    } catch (error) {
      console.error('イントロ完了状態の保存エラー:', error);
    }
  };

  const handleCharacterComplete = async (character: string, isCorrect: boolean, responseTime: number) => {
    try {
      const updatedProgress = await stageService.updateProgress(StageType.BEGINNER, character, isCorrect, responseTime);
      console.log('初級画面: 進捗データ更新完了', updatedProgress);
      setProgress(updatedProgress);
    } catch (error) {
      console.error('初級画面: 進捗データ更新エラー', error);
    }
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const toggleGameMode = () => {
    // イントロが完了していない場合は、まずストーリーを表示
    if (!isIntroCompleted) {
      setShowStory(true);
    } else {
      // イントロが完了している場合は、直接ゲームモードへ
      setGameMode(!gameMode);
    }
  };

  const checkLoginBonus = async () => {
    try {
      const user = authService.getUser();
      if (!user) return;

      const loginBonus = await cbtService.processLoginBonus(user.id);
      const hasUnclaimedRewards = loginBonus.rewards.some(r => !r.isCollected);
      
      if (hasUnclaimedRewards) {
        setLoginBonusData(loginBonus);
        setShowLoginBonus(true);
      }
    } catch (error) {
      console.error('ログインボーナス確認エラー:', error);
    }
  };

  const handleLoginBonusClose = () => {
    setShowLoginBonus(false);
  };

  const safeCleanup = async () => {
    try {
      console.log('初級画面: 安全なクリーンアップを実行');

      if (voiceService && typeof voiceService.cleanup === 'function') {
        await voiceService.cleanup();
      }

      if (soundService && typeof soundService.unloadSounds === 'function') {
        await soundService.unloadSounds();
      }
    } catch (error) {
      console.error('初級画面: クリーンアップ中にエラーが発生', error);
    }
  };

  if (!progress) {
    console.log('初級画面: 進捗データ読み込み待機中');
    return <LoadingScreen />;
  }

  const config = stageConfigs[StageType.BEGINNER];
  if (!config) {
    console.error('設定が見つかりません: BEGINNER');
    return null;
  }

  if (showStory) {
    console.log('ストーリー画面を表示');
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

  if (gameMode) {
    return (
      <>
        <GameSection
          config={config}
          progress={progress}
          onToggleGameMode={toggleGameMode}
          onPause={handlePause}
          onCharacterComplete={handleCharacterComplete}
        />
        <LoginBonusModal visible={showLoginBonus} onClose={handleLoginBonusClose} />
      </>
    );
  }

  console.log('ゲーム画面を表示: 初級ステージ');
  return (
    <>
      <HomeSection 
        onToggleGameMode={toggleGameMode} 
        levelTitle="しょきゅう れんしゅう" 
      />
      <LoginBonusModal visible={showLoginBonus} onClose={handleLoginBonusClose} />
    </>
  );
};

export default BeginnerScreen;