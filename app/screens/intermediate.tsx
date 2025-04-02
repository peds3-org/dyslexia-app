import { View, Text, ScrollView, Button, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { StoryScreen } from '../components/StoryScreen';
import { GameScreen } from '../components/GameScreen';
import stageConfigs from '../config/stageConfig';
import stageService from '../services/stageService';
import { StageType, StageProgress } from '../types/progress';

const IntermediateScreen = () => {
  const [しょうすとーり, setしょうすとーり] = useState(true);
  const [しんちょく, setしんちょく] = useState<StageProgress | null>(null);
  const [いちじていし, setいちじていし] = useState(false);
  const ふぇーどあにめ = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // しんちょくのよみこみ
    しんちょくよみこみ();

    // ふぇーどいんあにめーしょん
    Animated.timing(ふぇーどあにめ, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const しんちょくよみこみ = async () => {
    const よみこみずみしんちょく = await stageService.getProgress(StageType.INTERMEDIATE);
    setしんちょく(よみこみずみしんちょく);
  };

  const すとーりかんりょう = () => {
    setしょうすとーり(false);
  };

  const もじかんりょう = async (もじ: string, せいかい: boolean, はんのうじかん: number) => {
    const こうしんずみしんちょく = await stageService.updateProgress(StageType.INTERMEDIATE, もじ, せいかい, はんのうじかん);
    setしんちょく(こうしんずみしんちょく);
  };

  const ていしする = () => {
    setいちじていし(true);
  };

  const さいかいする = () => {
    setいちじていし(false);
  };

  if (!しんちょく) {
    console.error('進捗データが読み込まれていません');
    return null;
  }

  // 中級ステージの設定を取得
  const config = stageConfigs[StageType.INTERMEDIATE];
  if (!config) {
    console.error('設定が見つかりません: INTERMEDIATE');
    return null;
  }

  if (しょうすとーり) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <StoryScreen
          backgroundImage={config.backgroundImage}
          title='ちゅうきゅうへん'
          text={`みなさん、こんにちは！
ここは ちゅうきゅうの もりです。
むずかしい もじも たくさん でてきますが、
みなさんなら きっと だいじょうぶ！
がんばって れんしゅう しましょう！`}
          buttonText='はじめる'
          onStart={すとーりかんりょう}
          fadeAnim={ふぇーどあにめ}
          elderImage={require('../../assets/temp/elder-worried.png')}
        />
      </View>
    );
  }

  return <GameScreen config={config} progress={しんちょく} onPause={ていしする} onCharacterComplete={もじかんりょう} />;
};

export default IntermediateScreen;
