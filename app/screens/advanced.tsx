import { View, Text, ScrollView, Button, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { StoryScreen } from '../components/StoryScreen';
import { GameScreen } from '../components/GameScreen';
import stageConfigs from '../config/stageConfig';
import stageService from '../services/stageService';
import { StageType, StageProgress } from '../types/progress';

const AdvancedScreen = () => {
  const [showStory, setShowStory] = useState(true);
  const [progress, setProgress] = useState<StageProgress | null>(null);
  const [showPause, setShowPause] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 進捗の読み込み
    loadProgress();

    // フェードインアニメーション
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

  if (!progress) {
    return null;
  }

  // 上級ステージの設定を取得
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

  return <GameScreen config={config} progress={progress} onPause={handlePause} onCharacterComplete={handleCharacterComplete} />;
};

export default AdvancedScreen;
