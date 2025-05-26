import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Image, SafeAreaView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import progressService from '../../src/services/progressService';
import soundService from '../../src/services/soundService';
import { CharacterDisplay } from '../../src/components/game/CharacterDisplay';
import { CHARACTERS } from '../../src/components/game/CharacterAssets';

export default function IntroScreen() {
  const router = useRouter();
  const [characterState, setCharacterState] = useState<'normal' | 'happy' | 'worried'>('worried');
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // フワフワとしたアニメーション
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleStart = async () => {
    try {
      setCharacterState('happy');
      // 効果音を再生
      soundService.playEffect('select');

      // 初回アクセスを記録
      await progressService.updateProgress({
        currentLevel: 1,
        experience: 0,
        unlockedCharacters: ['あ', 'い', 'う', 'え', 'お'],
        collectedMojitama: [],
        firstAccess: false,
        lastAccessDate: new Date().toISOString(),
        daysCompleted: 0,
        dailyProgress: [],
      });

      // ホーム画面に遷移
      router.replace('/(auth)/login');
    } catch (error) {
      setCharacterState('worried');
      console.error('初期化に失敗しました:', error);
    }
  };

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <ImageBackground
      source={require('../../assets/backgrounds/sato.png')}
      style={{
        flex: 1,
      }}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        }}>
        <View
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 24,
            padding: 24,
            width: '100%',
            maxWidth: 350,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}>
          <Animated.View
            style={{
              alignItems: 'center',
              marginBottom: 24,
              transform: [{ translateY }],
            }}>
            <Image
              source={require('../../assets/temp/elder-worried.png')}
              style={{
                width: 120,
                height: 120,
                resizeMode: 'contain',
              }}
            />
          </Animated.View>

          <Text
            style={{
              fontSize: 30,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 16,
              fontFamily: 'font-mplus',
              color: '#1F2937',
            }}>
            ようこそ！
          </Text>

          <Text
            style={{
              fontSize: 16,
              textAlign: 'center',
              marginBottom: 24,
              fontFamily: 'font-yomogi',
              lineHeight: 24,
              color: '#4B5563',
            }}>
            カクカクオニから「言葉の巻物」を{'\n'}
            取り戻すお手伝いをしてください！{'\n\n'}
            まずは基本的なひらがなから{'\n'}
            修行を始めましょう。
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: '#E86A33',
              paddingVertical: 16,
              paddingHorizontal: 32,
              borderRadius: 9999,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
            onPress={handleStart}
            activeOpacity={0.7}>
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 20,
                fontWeight: 'bold',
                textAlign: 'center',
                fontFamily: 'font-mplus',
              }}>
              修行を始める
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}
