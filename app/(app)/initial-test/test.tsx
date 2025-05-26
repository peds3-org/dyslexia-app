import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import TestScreen from '@src/components/test/TestScreen';
import AILoadingScreen from '@src/components/stages/common/AILoadingScreen';
import { useInitialTest } from '@src/hooks/useInitialTest';

export default function InitialTestMain() {
  const router = useRouter();
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

  // 初期化
  useEffect(() => {
    const initialize = async () => {
      await initializeAI();
      await initializeTest();
    };
    
    initialize();
    
    return cleanup;
  }, []);

  // AI初期化中のローディング画面
  if (isLoadingAI || !isAIReady) {
    return (
      <AILoadingScreen 
        isLoading={isLoadingAI}
        isReady={isAIReady}
        onBack={() => router.push('/(app)/initial-test/intro')}
      />
    );
  }

  const handleStop = () => {
    cleanup();
    router.push('/(app)/initial-test/intro');
  };

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