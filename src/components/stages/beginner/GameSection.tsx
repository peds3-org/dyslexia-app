import React from 'react';
import { View, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameScreen } from '@src/components/game/GameScreen';
import { StageConfig } from '@src/types/common';
import { StageProgress } from '@src/types/progress';

interface GameSectionProps {
  config: StageConfig;
  progress: StageProgress;
  onToggleGameMode: () => void;
  onPause: () => void;
  onCharacterComplete: (character: string, isCorrect: boolean, responseTime: number) => void;
}

export default function GameSection({ config, progress, onPause, onCharacterComplete }: GameSectionProps) {
  const insets = useSafeAreaInsets();
  
  return (
    <ImageBackground
      source={config.backgroundImage}
      style={{ flex: 1 }}
    >
      <View style={{ 
        flex: 1,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}>
        <GameScreen config={config} progress={progress} onPause={onPause} onCharacterComplete={onCharacterComplete} />
      </View>
    </ImageBackground>
  );
}
