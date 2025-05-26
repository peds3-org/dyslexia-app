import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import HomeSection from '@src/components/stages/beginner/HomeSection';
import stageService from '@src/services/stageService';
import { StageType } from '@src/types/common';
import { StageProgress } from '@src/types/progress';
import authService from '@src/services/authService';
import cbtService from '@src/services/cbtService';
import LoginBonusModal from '@src/components/cbt/LoginBonusModal';
import { LoginBonus } from '@src/types/cbt';
import LoadingScreen from '@src/components/stages/beginner/LoadingScreen';
import { SafeAreaView, View } from 'react-native';

export default function BeginnerHomeScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState<StageProgress | null>(null);
  const [showLoginBonus, setShowLoginBonus] = useState(false);
  const [loginBonusData, setLoginBonusData] = useState<LoginBonus | null>(null);

  useEffect(() => {
    loadProgress();
    checkLoginBonus();
  }, []);

  const loadProgress = async () => {
    try {
      console.log('初級ホーム画面: 進捗データ読み込み開始');
      const loadedProgress = await stageService.getProgress(StageType.BEGINNER);
      console.log('初級ホーム画面: 進捗データ読み込み完了', loadedProgress);

      if (!loadedProgress) {
        console.error('初級ホーム画面: 進捗データが見つかりません');
        return;
      }

      setProgress(loadedProgress);
    } catch (error) {
      console.error('初級ホーム画面: 進捗データ読み込みエラー', error);
    }
  };

  const checkLoginBonus = async () => {
    try {
      const user = authService.getUser();
      if (!user) return;

      const loginBonus = await cbtService.processLoginBonus(user.id);
      const hasUnclaimedRewards = loginBonus.rewards.some((r) => !r.isCollected);

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

  const handleToggleGameMode = () => {
    // ゲーム画面へ遷移
    router.push('/(app)/beginner/game');
  };

  const handleStoryReplay = () => {
    // ストーリー画面へ遷移（再視聴）
    router.push('/(app)/beginner/story');
  };

  if (!progress) {
    console.log('初級ホーム画面: 進捗データ読み込み待機中');
    return <LoadingScreen />;
  }

  return (
    <View style={{ flex: 1 }}>
      <HomeSection onToggleGameMode={handleToggleGameMode} levelTitle='' onStoryReplay={handleStoryReplay} />
      <LoginBonusModal visible={showLoginBonus} onClose={handleLoginBonusClose} />
    </View>
  );
}
