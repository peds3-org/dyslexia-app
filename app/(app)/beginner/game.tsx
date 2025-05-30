import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import stageConfigs from '@src/config/stageConfig';
import stageService from '@src/services/stageService';
import soundService from '@src/services/soundService';
import voiceService from '@src/services/voiceService';
import { StageType } from '@src/types/common';
import { StageProgress } from '@src/types/progress';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useAppState } from '@src/contexts/AppStateContext';

import LoadingScreen from '@src/components/stages/beginner/LoadingScreen';
import GameSection from '@src/components/stages/beginner/GameSection';
import AILoadingScreen from '@src/components/stages/common/AILoadingScreen';

export default function BeginnerGameScreen() {
  const { isAIReady } = useAppState();
  const [progress, setProgress] = useState<StageProgress | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);
  const loadAbortRef = useRef<AbortController | null>(null);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // 進捗データ読み込み
  const loadProgress = useCallback(async (signal: AbortSignal) => {
    try {
      console.log('ゲーム画面: 進捗データ読み込み開始');
      const loadedProgress = await stageService.getProgress(StageType.BEGINNER);
      
      if (signal.aborted) return;
      
      console.log('ゲーム画面: 進捗データ読み込み完了', loadedProgress);

      if (!loadedProgress) {
        console.error('ゲーム画面: 進捗データが見つかりません');
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
      console.error('ゲーム画面: 進捗データ読み込みエラー', error);
      if (isMountedRef.current) {
        setError('進捗データの読み込みに失敗しました');
      }
    }
  }, []);

  // イントロ完了チェック
  const checkIntroCompletion = useCallback(async (signal: AbortSignal) => {
    try {
      const introCompleted = await AsyncStorage.getItem('beginner_intro_completed');
      
      if (signal.aborted) return;
      
      const isCompleted = introCompleted === 'true';

      // イントロが未完了の場合は、ストーリー画面へリダイレクト
      if (!isCompleted && isMountedRef.current) {
        router.replace('/(app)/beginner/story');
      }
    } catch (error) {
      if (signal.aborted) return;
      console.error('イントロ完了状態のチェックエラー:', error);
      // エラーが発生してもゲームは続行可能なので、エラー状態にはしない
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
          checkIntroCompletion(abortController.signal)
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

    // フェードインアニメーション
    animationRef.current = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    });
    animationRef.current.start();

    return () => {
      isMountedRef.current = false;
      loadAbortRef.current?.abort();
      animationRef.current?.stop();
      safeCleanup();
    };
  }, [loadProgress, checkIntroCompletion, fadeAnim, safeCleanup]);

  // キャラクター完了ハンドラー
  const handleCharacterComplete = useCallback(async (
    character: string, 
    isCorrect: boolean, 
    responseTime: number
  ) => {
    if (!isMountedRef.current) return;
    
    try {
      const updatedProgress = await stageService.updateProgress(
        StageType.BEGINNER, 
        character, 
        isCorrect, 
        responseTime
      );
      
      if (isMountedRef.current) {
        console.log('ゲーム画面: 進捗データ更新完了', updatedProgress);
        setProgress(updatedProgress);
      }
    } catch (error) {
      console.error('ゲーム画面: 進捗データ更新エラー', error);
      // エラーが発生してもゲームは続行可能
    }
  }, []);

  // ポーズハンドラー
  const handlePause = useCallback(() => {
    if (isMountedRef.current) {
      setIsPaused(true);
    }
  }, []);

  // 再開ハンドラー
  const handleResume = useCallback(() => {
    if (isMountedRef.current) {
      setIsPaused(false);
    }
  }, []);

  // ホームに戻るハンドラー
  const handleBackToHome = useCallback(() => {
    if (isMountedRef.current) {
      router.replace('/(app)/beginner/home');
    }
  }, []);

  // クリーンアップ処理
  const safeCleanup = useCallback(async () => {
    try {
      const cleanupPromises = [];
      
      if (voiceService) {
        cleanupPromises.push(
          voiceService.stopRecording().catch(e => 
            console.error('録音停止エラー:', e)
          )
        );
        cleanupPromises.push(
          voiceService.stopSpeaking().catch(e => 
            console.error('音声停止エラー:', e)
          )
        );
      }
      
      if (soundService) {
        cleanupPromises.push(
          soundService.cleanup().catch(e => 
            console.error('サウンドクリーンアップエラー:', e)
          )
        );
      }
      
      await Promise.all(cleanupPromises);
    } catch (error) {
      console.error('ゲーム画面: クリーンアップ中にエラーが発生', error);
    }
  }, []);

  // エラー画面
  if (error) {
    return (
      <LoadingScreen 
        message={error}
        showRetry
        onRetry={() => {
          setError(null);
          setIsLoading(true);
          const abortController = new AbortController();
          loadAbortRef.current = abortController;
          loadProgress(abortController.signal);
        }}
      />
    );
  }

  // ローディング中
  if (isLoading || !progress) {
    console.log('ゲーム画面: 進捗データ読み込み待機中');
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

  // AIが準備できていない場合
  if (!isAIReady) {
    return (
      <AILoadingScreen 
        isLoading={true} 
        isReady={false} 
        onBack={handleBackToHome} 
      />
    );
  }

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <GameSection
        config={config}
        progress={progress}
        onToggleGameMode={handleBackToHome}
        onCharacterComplete={handleCharacterComplete}
        isPaused={isPaused}
        onPause={handlePause}
        onResume={handleResume}
      />
    </Animated.View>
  );
}