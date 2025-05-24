import React, { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { StoryScreen } from '@src/components/game/StoryScreen';
import { GameScreen } from '@app/components/GameScreen';
import stageConfigs from '@app/config/stageConfig';
import stageService from '@src/services/stageService';
import { StageType, StageProgress } from '@app/types/progress';
import authService from '@src/services/authService';
import cbtService from '@src/services/cbtService';
import LoginBonusModal from '@src/components/cbt/LoginBonusModal';
import { LoginBonus } from '@app/types/cbt';

const AdvancedScreen = () => {
  const [showStory, setShowStory] = useState(true);
  const [progress, setProgress] = useState<StageProgress | null>(null);
  const [showPause, setShowPause] = useState(false);
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

  const handleLoginBonusClose = () => {
    setShowLoginBonus(false);
  };

  if (!progress) {
    return null;
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