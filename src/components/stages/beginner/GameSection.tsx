import React from 'react';
import { View } from 'react-native';
import { GameScreen } from '@src/components/game/GameScreen';
import GameHeader from './GameHeader';
import { StageConfig } from '@src/types/common';
import { StageProgress } from '@src/types/progress';

interface GameSectionProps {
  config: StageConfig;
  progress: StageProgress;
  onToggleGameMode: () => void;
  onPause: () => void;
  onCharacterComplete: (character: string, isCorrect: boolean, responseTime: number) => void;
}

export default function GameSection({
  config,
  progress,
  onToggleGameMode,
  onPause,
  onCharacterComplete,
}: GameSectionProps) {
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <GameHeader onBack={onToggleGameMode} title="きょうの れんしゅう" />
      <GameScreen 
        config={config} 
        progress={progress} 
        onPause={onPause} 
        onCharacterComplete={onCharacterComplete} 
      />
    </View>
  );
}