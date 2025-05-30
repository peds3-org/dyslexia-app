import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import HomeSection from '@src/components/stages/beginner/HomeSection';
import stageService from '@src/services/stageService';
import { StageType } from '@src/types/common';
import { StageProgress } from '@src/types/progress';
import authService from '@src/services/authService';
import cbtService from '@src/services/cbtService';
import LoginBonusModal from '@src/components/cbt/LoginBonusModal';
import LoadingScreen from '@src/components/stages/beginner/LoadingScreen';

export default function BeginnerHomeScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState<StageProgress | null>(null);
  const [showLoginBonus, setShowLoginBonus] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const loadAbortRef = useRef<AbortController | null>(null);

  // 進捗データ読み込み
  const loadProgress = useCallback(async (signal: AbortSignal) => {
    try {
      console.log('初級ホーム画面: 進捗データ読み込み開始');
      const loadedProgress = await stageService.getProgress(StageType.BEGINNER);
      
      if (signal.aborted) return;
      
      console.log('初級ホーム画面: 進捗データ読み込み完了', loadedProgress);

      if (!loadedProgress) {
        console.error('初級ホーム画面: 進捗データが見つかりません');
        if (isMountedRef.current) {
          setError('進捗データが見つかりません');
        }
        return;
      }

      if (isMountedRef.current) {
        setProgress(loadedProgress);
      }
    } catch (error) {
      if (signal.aborted) return;
      console.error('初級ホーム画面: 進捗データ読み込みエラー', error);
      if (isMountedRef.current) {
        setError('進捗データの読み込みに失敗しました');
      }
    }
  }, []);

  // ログインボーナスチェック
  const checkLoginBonus = useCallback(async (signal: AbortSignal) => {
    try {
      const user = authService.getUser();
      if (!user) return;

      const loginBonus = await cbtService.processLoginBonus(user.id);
      
      if (signal.aborted) return;
      
      const hasUnclaimedRewards = loginBonus.rewards.some((r) => !r.isCollected);

      if (hasUnclaimedRewards && isMountedRef.current) {
        setShowLoginBonus(true);
      }
    } catch (error) {
      if (signal.aborted) return;
      console.error('ログインボーナス確認エラー:', error);
      // ログインボーナスのエラーは無視（ゲームは続行可能）
    }
  }, []);

  // 初期化処理
  useEffect(() => {
    const abortController = new AbortController();
    loadAbortRef.current = abortController;

    const initialize = async () => {
      try {
        // 並行して実行
        await Promise.all([
          loadProgress(abortController.signal),
          checkLoginBonus(abortController.signal)
        ]);

        if (!abortController.signal.aborted && isMountedRef.current) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('初期化エラー:', error);
        if (!abortController.signal.aborted && isMountedRef.current) {
          setError('初期化に失敗しました');
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMountedRef.current = false;
      loadAbortRef.current?.abort();
    };
  }, [loadProgress, checkLoginBonus]);

  // ログインボーナスクローズハンドラー
  const handleLoginBonusClose = useCallback(() => {
    if (isMountedRef.current) {
      setShowLoginBonus(false);
    }
  }, []);

  // ゲームモード切り替えハンドラー
  const handleToggleGameMode = useCallback(() => {
    if (isMountedRef.current) {
      router.push('/(app)/beginner/game');
    }
  }, [router]);

  // ストーリー再生ハンドラー
  const handleStoryReplay = useCallback(() => {
    if (isMountedRef.current) {
      router.push('/(app)/beginner/story');
    }
  }, [router]);

  // リトライハンドラー
  const handleRetry = useCallback(() => {
    if (isMountedRef.current) {
      setError(null);
      setIsLoading(true);
      const abortController = new AbortController();
      loadAbortRef.current = abortController;
      
      Promise.all([
        loadProgress(abortController.signal),
        checkLoginBonus(abortController.signal)
      ]).finally(() => {
        if (!abortController.signal.aborted && isMountedRef.current) {
          setIsLoading(false);
        }
      });
    }
  }, [loadProgress, checkLoginBonus]);

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
  if (isLoading || !progress) {
    console.log('初級ホーム画面: 進捗データ読み込み待機中');
    return <LoadingScreen />;
  }

  return (
    <View style={{ flex: 1 }}>
      <HomeSection 
        onToggleGameMode={handleToggleGameMode} 
        levelTitle='初級' 
        onStoryReplay={handleStoryReplay} 
      />
      <LoginBonusModal 
        visible={showLoginBonus} 
        onClose={handleLoginBonusClose}
      />
    </View>
  );
}