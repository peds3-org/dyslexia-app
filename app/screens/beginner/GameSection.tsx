import React from 'react';
import { View } from 'react-native';
import { GameScreen } from '@app/components/GameScreen';
import GameHeader from './components/GameHeader';
import { StageConfig } from '@app/config/stageConfig';
import { StageProgress } from '@app/types/progress';

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