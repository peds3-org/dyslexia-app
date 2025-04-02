import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CharacterDisplayProps {
  character: string;
  size?: number;
  color?: string;
}

export const CharacterDisplay: React.FC<CharacterDisplayProps> = ({ character, size = 48, color = '#000000' }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Text style={[styles.character, { fontSize: size * 0.6, color }]}>{character}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  character: {
    fontFamily: 'font-yomogi',
  },
});

export default CharacterDisplay;
