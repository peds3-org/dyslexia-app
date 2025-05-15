import { View, Text, Image, ScrollView, TouchableOpacity } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { StoryScreen } from '../components/StoryScreen';
import { GameScreen } from '../components/GameScreen';
import stageConfigs from '../config/stageConfig';
import stageService from '@src/services/stageService';
import soundService from '@src/services/soundService';
import voiceService from '@src/services/voiceService';
import { StageType } from '../types/common';
import { StageProgress } from '../types/progress';
import CBTHomeSection from '@src/components/cbt/CBTHomeSection';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const BeginnerScreen = () => {
  const [showStory, setShowStory] = useState(true);
  const [progress, setProgress] = useState<StageProgress | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [gameMode, setGameMode] = useState(false); // ゲームモード（trueでゲーム画面のみ表示）
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

    return () => {
      // クリーンアップ処理
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

  // ゲームモードとCBTモードを切り替える
  const toggleGameMode = () => {
    setGameMode(!gameMode);
  };

  // クリーンアップ処理のユーティリティ関数
  const safeCleanup = async () => {
    try {
      console.log('初級画面: 安全なクリーンアップを実行');

      // voiceServiceのクリーンアップ
      if (voiceService && typeof voiceService.cleanup === 'function') {
        await voiceService.cleanup();
      }

      // soundServiceのクリーンアップ
      if (soundService && typeof soundService.unloadSounds === 'function') {
        await soundService.unloadSounds();
      }
    } catch (error) {
      console.error('初級画面: クリーンアップ中にエラーが発生', error);
    }
  };

  if (!progress) {
    console.log('初級画面: 進捗データ読み込み待機中');
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
        }}>
        <Image
          source={require('@assets/temp/elder-worried.png')}
          style={{
            width: 100,
            height: 100,
            marginBottom: 20,
            opacity: 0.8,
          }}
        />
        <Text
          style={{
            fontFamily: 'font-mplus-bold',
            fontSize: 18,
            color: '#41644A',
            marginBottom: 10,
          }}>
          データを よみこんでいます
        </Text>
        <Text
          style={{
            fontFamily: 'font-mplus',
            fontSize: 14,
            color: '#666',
          }}>
          しばらく おまちください
        </Text>
      </View>
    );
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

  // ゲームモード時はゲーム画面のみ表示
  if (gameMode) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
            paddingBottom: 8,
          }}>
          <TouchableOpacity
            onPress={toggleGameMode}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F0F0F0',
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 16,
            }}>
            <MaterialCommunityIcons name='arrow-left' size={18} color='#41644A' />
            <Text
              style={{
                fontFamily: 'Zen-B',
                fontSize: 14,
                color: '#41644A',
                marginLeft: 4,
              }}>
              もどる
            </Text>
          </TouchableOpacity>

          <Text
            style={{
              fontSize: 18,
              fontFamily: 'Zen-B',
              color: '#41644A',
            }}>
            きょうの れんしゅう
          </Text>

          <View style={{ width: 70 }} />
        </View>

        {/* ゲーム画面 */}
        <GameScreen config={config} progress={progress} onPause={handlePause} onCharacterComplete={handleCharacterComplete} />
      </View>
    );
  }

  // 通常モード（CBTホーム + ゲームボタン）
  console.log('ゲーム画面を表示: 初級ステージ');
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      nestedScrollEnabled={true}
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={true}>
      {/* 認知行動療法セクション */}
      <View style={{ padding: 16 }}>
        <Text
          style={{
            fontSize: 24,
            fontFamily: 'Zen-B',
            color: '#41644A',
            marginBottom: 16,
            textAlign: 'center',
          }}>
          しょきゅう れんしゅう
        </Text>

        {/* CBTホームセクション */}
        <CBTHomeSection />

        {/* 区切り線 */}
        <View
          style={{
            height: 4,
            backgroundColor: '#F0F0F0',
            borderRadius: 2,
            marginVertical: 16,
          }}
        />

        {/* ゲームモードに切り替えるボタン */}
        <TouchableOpacity
          onPress={toggleGameMode}
          style={{
            backgroundColor: '#41644A',
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 24,
            alignItems: 'center',
            marginBottom: 20,
          }}>
          <Text
            style={{
              fontFamily: 'Zen-B',
              fontSize: 16,
              color: '#FFFFFF',
            }}>
            きょうの れんしゅうを はじめる
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default BeginnerScreen;
