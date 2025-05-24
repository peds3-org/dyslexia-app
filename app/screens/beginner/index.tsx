import React, { useState, useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { StoryScreen } from '@src/components/game/StoryScreen';
import stageConfigs from '@app/config/stageConfig';
import stageService from '@src/services/stageService';
import soundService from '@src/services/soundService';
import voiceService from '@src/services/voiceService';
import { StageType } from '@app/types/common';
import { StageProgress } from '@app/types/progress';
import authService from '@src/services/authService';
import cbtService from '@src/services/cbtService';
import LoginBonusModal from '@src/components/cbt/LoginBonusModal';
import { LoginBonus } from '@app/types/cbt';

import LoadingScreen from './components/LoadingScreen';
import HomeSection from './HomeSection';
import GameSection from './GameSection';

const BeginnerScreen = () => {
  const [showStory, setShowStory] = useState(true);
  const [progress, setProgress] = useState<StageProgress | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [gameMode, setGameMode] = useState(false);
  const [showLoginBonus, setShowLoginBonus] = useState(false);
  const [loginBonusData, setLoginBonusData] = useState<LoginBonus | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProgress();
    checkLoginBonus();

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

  const handleStoryComplete = () => {
    setShowStory(false);
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
    setGameMode(!gameMode);
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
      <HomeSection onToggleGameMode={toggleGameMode} levelTitle="しょきゅう れんしゅう" />
      <LoginBonusModal visible={showLoginBonus} onClose={handleLoginBonusClose} />
    </>
  );
};

export default BeginnerScreen;