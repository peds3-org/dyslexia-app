import React, { useState, useEffect, useRef } from 'react';
import { View, Animated, SafeAreaView } from 'react-native';
import { StoryScreen } from '@src/components/game/StoryScreen';
import { GameScreen } from '@app/components/GameScreen';
import stageConfigs from '@app/config/stageConfig';
import stageService from '@src/services/stageService';
import { StageType, StageProgress } from '@app/types/progress';
import authService from '@src/services/authService';
import cbtService from '@src/services/cbtService';
import LoginBonusModal from '@src/components/cbt/LoginBonusModal';
import { LoginBonus } from '@app/types/cbt';
import LoadingScreen from './components/LoadingScreen';

const IntermediateScreen = () => {
  const [showStory, setShowStory] = useState(true);
  const [progress, setProgress] = useState<StageProgress | null>(null);
  const [isPaused, setIsPaused] = useState(false);
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
    try {
      console.log('中級画面: 進捗データ読み込み開始');
      const loadedProgress = await stageService.getProgress(StageType.INTERMEDIATE);
      console.log('中級画面: 進捗データ読み込み完了', loadedProgress);

      if (!loadedProgress) {
        console.error('中級画面: 進捗データが見つかりません');
        return;
      }

      setProgress(loadedProgress);
    } catch (error) {
      console.error('中級画面: 進捗データ読み込みエラー', error);
    }
  };

  const handleStoryComplete = () => {
    setShowStory(false);
  };

  const handleCharacterComplete = async (character: string, isCorrect: boolean, responseTime: number) => {
    try {
      const updatedProgress = await stageService.updateProgress(StageType.INTERMEDIATE, character, isCorrect, responseTime);
      console.log('中級画面: 進捗データ更新完了', updatedProgress);
      setProgress(updatedProgress);
    } catch (error) {
      console.error('中級画面: 進捗データ更新エラー', error);
    }
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
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
    console.log('中級画面: 進捗データ読み込み待機中');
    return <LoadingScreen />;
  }

  const config = stageConfigs[StageType.INTERMEDIATE];
  if (!config) {
    console.error('設定が見つかりません: INTERMEDIATE');
    return null;
  }

  if (showStory) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
        <StoryScreen
          backgroundImage={config.backgroundImage}
          title='ちゅうきゅうへん'
          text={`みなさん、こんにちは！
ここは ちゅうきゅうの もりです。
むずかしい もじも たくさん でてきますが、
みなさんなら きっと だいじょうぶ！
がんばって れんしゅう しましょう！`}
          buttonText='はじめる'
          onStart={handleStoryComplete}
          fadeAnim={fadeAnim}
          elderImage={require('@assets/temp/elder-worried.png')}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <GameScreen 
        config={config} 
        progress={progress} 
        onPause={handlePause} 
        onCharacterComplete={handleCharacterComplete} 
      />
      <LoginBonusModal visible={showLoginBonus} onClose={handleLoginBonusClose} />
    </SafeAreaView>
  );
};

export default IntermediateScreen;