import React, { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import TestScreen from '@src/components/test/TestScreen';
import AILoadingScreen from '@src/components/stages/common/AILoadingScreen';
import LoadingScreen from '@src/components/stages/beginner/LoadingScreen';
import { useInitialTest } from '@src/hooks/useInitialTest';

export default function InitialTestMain() {
  const router = useRouter();
  const isMountedRef = useRef(true);
  const initAbortRef = useRef<AbortController | null>(null);
  
  const {
    // 状態
    testState,
    currentYoon,
    remainingYoon,
    results,
    countdown,
    isRecording,
    isProcessingAI,
    showEncouragement,
    currentEncouragementCount,
    isAIReady,
    isLoadingAI,
    hasStarted,
    isPaused,
    showCharacter,
    needsCountdown,
    
    // アクション
    initializeAI,
    initializeTest,
    handleButtonPress,
    handlePause,
    handleResume,
    handleEncouragementContinue,
    setShowEncouragement,
    cleanup,
  } = useInitialTest();

  // 初期化エラー状態
  const [initError, setInitError] = React.useState<string | null>(null);

  // 初期化処理
  useEffect(() => {
    const abortController = new AbortController();
    initAbortRef.current = abortController;

    const initialize = async () => {
      try {
        // AI初期化
        const aiInitialized = await initializeAI();
        
        if (abortController.signal.aborted) return;
        
        if (!aiInitialized) {
          if (isMountedRef.current) {
            setInitError('AI初期化に失敗しました');
          }
          return;
        }

        // テスト初期化
        const testInitialized = await initializeTest();
        
        if (abortController.signal.aborted) return;
        
        if (!testInitialized) {
          if (isMountedRef.current) {
            setInitError('テスト初期化に失敗しました');
          }
        }
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.error('初期化エラー:', error);
        if (isMountedRef.current) {
          setInitError('初期化中にエラーが発生しました');
        }
      }
    };
    
    initialize();
    
    return () => {
      isMountedRef.current = false;
      initAbortRef.current?.abort();
      cleanup();
    };
  }, [initializeAI, initializeTest, cleanup]);

  // 停止ハンドラー
  const handleStop = useCallback(() => {
    if (!isMountedRef.current) return;
    
    cleanup();
    router.push('/(app)/initial-test/intro');
  }, [cleanup, router]);

  // イントロに戻るハンドラー
  const handleBackToIntro = useCallback(() => {
    if (!isMountedRef.current) return;
    
    router.push('/(app)/initial-test/intro');
  }, [router]);

  // リトライハンドラー
  const handleRetry = useCallback(() => {
    if (!isMountedRef.current) return;
    
    setInitError(null);
    router.replace('/(app)/initial-test/test');
  }, [router]);

  // エラー画面
  if (initError) {
    return (
      <LoadingScreen 
        message={initError}
        showRetry
        onRetry={handleRetry}
      />
    );
  }

  // AI初期化中のローディング画面
  if (isLoadingAI || !isAIReady) {
    return (
      <AILoadingScreen 
        isLoading={isLoadingAI}
        isReady={isAIReady}
        onBack={handleBackToIntro}
      />
    );
  }

  return (
    <TestScreen
      currentYoon={currentYoon}
      remainingYoon={remainingYoon}
      isRecording={isRecording}
      isPaused={isPaused}
      isProcessingAI={isProcessingAI}
      isAIReady={isAIReady}
      showEncouragement={showEncouragement}
      currentEncouragementCount={currentEncouragementCount}
      showCharacter={showCharacter}
      results={results}
      hasStarted={hasStarted}
      countdown={countdown}
      needsCountdown={needsCountdown}
      testState={testState}
      onPause={handlePause}
      onResume={handleResume}
      onStop={handleStop}
      onRecordingComplete={handleButtonPress}
      onEncouragementContinue={handleEncouragementContinue}
    />
  );
}