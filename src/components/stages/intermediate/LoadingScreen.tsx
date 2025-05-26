import React from 'react';
import { View, Text, Image } from 'react-native';

export default function LoadingScreen() {
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