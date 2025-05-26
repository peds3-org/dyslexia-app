import React, { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { StoryScreen } from '@src/components/game/StoryScreen';
import { GameScreen } from '@src/components/game/GameScreen';
import stageConfigs from '@src/config/stageConfig';
import stageService from '@src/services/stageService';
import { StageType, StageProgress } from '@src/types/progress';
import authService from '@src/services/authService';
import cbtService from '@src/services/cbtService';
import LoginBonusModal from '@src/components/cbt/LoginBonusModal';
import { LoginBonus } from '@src/types/cbt';
import LoadingScreen from '@src/components/stages/advanced/LoadingScreen';
import AILoadingScreen from '@src/components/stages/common/AILoadingScreen';
import aiService from '@src/services/aiService';

const AdvancedScreen = () => {
  const router = useRouter();
  const [showStory, setShowStory] = useState(true);
  const [progress, setProgress] = useState<StageProgress | null>(null);
  const [showPause, setShowPause] = useState(false);
  const [showLoginBonus, setShowLoginBonus] = useState(false);
  const [loginBonusData, setLoginBonusData] = useState<LoginBonus | null>(null);
  const [isAIInitialized, setIsAIInitialized] = useState<boolean | null>(null); // null = checking, false = needs init, true = ready
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProgress();
    checkLoginBonus();
    initializeAI();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadProgress = async () => {
    const loadedProgress = await stageService.getProgress(StageType.ADVANCED);
    setProgress(loadedProgress);
  };

  const handleStoryComplete = () => {
    setShowStory(false);
  };

  const handleCharacterComplete = async (character: string, isCorrect: boolean, responseTime: number) => {
    const updatedProgress = await stageService.updateProgress(StageType.ADVANCED, character, isCorrect, responseTime);
    setProgress(updatedProgress);
  };

  const handlePause = () => {
    setShowPause(true);
  };

  const handleResume = () => {
    setShowPause(false);
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

  const initializeAI = async () => {
    try {
      // AIが既に準備完了しているかチェック
      const isReady = await aiService.isReady();
      if (isReady) {
        console.log('上級画面: AIサービスは既に初期化済みです');
        setIsAIInitialized(true);
        return;
      }
      
      // AIモデルがダウンロード済みかチェック
      const isModelDownloaded = await aiService.isModelDownloaded();
      
      if (!isModelDownloaded) {
        console.log('上級画面: AIモデルがダウンロードされていません');
        setIsAIInitialized(false);
        return;
      }
      
      // モデルはあるが初期化されていない場合のみローディングを表示
      console.log('上級画面: AIサービスの初期化が必要です');
      setIsAIInitialized(false);
      
      // 初期化を実行
      const isInitialized = await aiService.initialize();
      
      if (isInitialized) {
        console.log('上級画面: AIサービスの初期化が完了しました');
        setIsAIInitialized(true);
      } else {
        console.log('上級画面: AIサービスの初期化に失敗しました');
        setIsAIInitialized(false);
      }
    } catch (error) {
      console.error('上級画面: AIサービス初期化エラー:', error);
      setIsAIInitialized(false);
    }
  };

  const handleLoginBonusClose = () => {
    setShowLoginBonus(false);
  };

  if (!progress) {
    console.log('上級画面: 進捗データ読み込み待機中');
    return <LoadingScreen />;
  }

  // AIの初期化中の場合のみローディング画面を表示
  if (isAIInitialized === null) {
    // まだチェック中なので通常のローディング画面を表示
    return <LoadingScreen />;
  } else if (isAIInitialized === false) {
    // 初期化が必要な場合のみAIローディング画面を表示
    return (
      <AILoadingScreen
        isLoading={true}
        isReady={false}
        onBack={() => router.back()}
      />
    );
  }

  const config = stageConfigs[StageType.ADVANCED];
  if (!config) {
    console.error('設定が見つかりません: ADVANCED');
    return null;
  }

  if (showStory) {
    return (
      <StoryScreen
        backgroundImage={config.backgroundImage}
        title={config.storyTitle}
        text={config.storyText}
        buttonText={config.buttonText}
        onStart={handleStoryComplete}
        fadeAnim={fadeAnim}
        elderImage={config.elderImage}
      />
    );
  }

  return (
    <>
      <GameScreen 
        config={config} 
        progress={progress} 
        onPause={handlePause} 
        onCharacterComplete={handleCharacterComplete} 
      />
      <LoginBonusModal visible={showLoginBonus} onClose={handleLoginBonusClose} />
    </>
  );
};

export default AdvancedScreen;