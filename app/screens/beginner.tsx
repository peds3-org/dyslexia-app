import { View, Text, ScrollView, Button, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { StoryScreen } from '../components/StoryScreen';
import { GameScreen } from '../components/GameScreen';
import stageConfigs from '../config/stageConfig';
import stageService from '../services/stageService';
import { StageType, StageProgress } from '../types/progress';

const BeginnerScreen = () => {
  console.log('===== BeginnerScreen: コンポーネント初期化 =====');
  const [showStory, setShowStory] = useState(true);
  const [progress, setProgress] = useState<StageProgress | null>(null);
  const [showPause, setShowPause] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    console.log('BeginnerScreen: マウント時の処理開始');
    // 進捗の読み込み
    loadProgress();

    // フェードインアニメーション
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    return () => {
      console.log('BeginnerScreen: アンマウント - クリーンアップ');
      safeCleanup();
    };
  }, []);

  const loadProgress = async () => {
    console.log('BeginnerScreen: 進捗データ読み込み開始');
    const loadedProgress = await stageService.getProgress(StageType.BEGINNER);
    console.log('BeginnerScreen: 進捗データ読み込み完了', {
      収集済み文字数: loadedProgress.collectedMojitama.length,
      現在レベル: loadedProgress.currentLevel,
      解放済み文字数: loadedProgress.unlockedCharacters.length,
    });
    setProgress(loadedProgress);
  };

  const handleStoryComplete = () => {
    console.log('ストーリー完了: ゲーム画面へ移行します');
    // トランジション中のフラグを設定し、短時間の連続遷移を防止
    setIsTransitioning(true);

    // 遅延を設定して安全にゲーム画面に切り替え
    setTimeout(() => {
      setShowStory(false);
      // さらに少し遅延を入れてからトランジション完了フラグを解除
      setTimeout(() => {
        setIsTransitioning(false);
        console.log('BeginnerScreen: トランジション完了、ゲーム画面が表示されました');
      }, 500);
    }, 300);
  };

  const handleCharacterComplete = async (character: string, isCorrect: boolean, responseTime: number) => {
    console.log(`文字完了処理: ${character}, 正解: ${isCorrect}, 応答時間: ${responseTime}ms`);
    const updatedProgress = await stageService.updateProgress(StageType.BEGINNER, character, isCorrect, responseTime);
    setProgress(updatedProgress);
  };

  const handlePause = () => {
    setShowPause(true);
  };

  const handleResume = () => {
    setShowPause(false);
  };

  // ===== 追加: クリーンアップ処理のユーティリティ関数 =====
  const safeCleanup = async () => {
    try {
      console.log('BeginnerScreen: 安全なクリーンアップを実行');

      // voiceServiceのクリーンアップ (nullチェック)
      const voiceService = require('../services/voiceService').default;
      if (voiceService && typeof voiceService.cleanup === 'function') {
        await voiceService.cleanup();
      } else {
        console.log('BeginnerScreen: voiceServiceが未初期化のためスキップ');
      }

      // soundServiceのクリーンアップ (nullチェック)
      const soundService = require('../services/soundService').default;
      if (soundService && typeof soundService.unloadSounds === 'function') {
        await soundService.unloadSounds();
      } else {
        console.log('BeginnerScreen: soundServiceが未初期化のためスキップ');
      }
    } catch (error) {
      console.error('BeginnerScreen: クリーンアップ中にエラーが発生', error);
    }
  };
  // =====================================================

  if (!progress) {
    console.log('進捗データ読み込み中...');
    return null;
  }

  // 初級ステージの設定を取得
  const config = stageConfigs[StageType.BEGINNER];
  if (!config) {
    console.error('設定が見つかりません: BEGINNER');
    return null;
  }

  if (showStory) {
    console.log('ストーリー画面を表示');
    return (
      <StoryScreen
        backgroundImage={config.backgroundImage}
        elderImage={config.elderImage}
        title={config.storyTitle}
        text={config.storyText}
        buttonText={config.buttonText}
        onStart={handleStoryComplete}
        fadeAnim={fadeAnim}
      />
    );
  }

  console.log('ゲーム画面を表示: 初級ステージ');
  return <GameScreen config={config} progress={progress} onPause={handlePause} onCharacterComplete={handleCharacterComplete} />;
};

export default BeginnerScreen;
