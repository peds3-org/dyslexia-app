import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface GameHeaderProps {
  onBack: () => void;
  title: string;
}

export default function GameHeader({ onBack, title }: GameHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 8,
      }}>
      <TouchableOpacity
        onPress={onBack}
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
        {title}
      </Text>

      <View style={{ width: 70 }} />
    </View>
  );
}