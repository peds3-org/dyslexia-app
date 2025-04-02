import React, { useRef, useEffect } from 'react';
import { View, Text, ImageBackground, ScrollView, SafeAreaView, TouchableOpacity, Animated, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type StoryScreenProps = {
  backgroundImage: any;
  title: string;
  text: string;
  buttonText: string;
  onStart: () => void;
  fadeAnim: Animated.Value;
  elderImage: any;
};

export function StoryScreen({ backgroundImage, title, text, buttonText, onStart, fadeAnim, elderImage }: StoryScreenProps) {
  const elderFloatAnim = useRef(new Animated.Value(0)).current;
  const speakingAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 長老のふわふわアニメーション
    Animated.loop(
      Animated.sequence([
        Animated.timing(elderFloatAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(elderFloatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 喋るアニメーション
    Animated.loop(
      Animated.sequence([
        Animated.timing(speakingAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(speakingAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ImageBackground source={backgroundImage} style={{ flex: 1 }} resizeMode='cover'>
        <ScrollView style={{ flex: 1, padding: 20 }} contentContainerStyle={{ paddingBottom: 40 }}>
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* 長老のキャラクター */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Animated.Image
                source={elderImage}
                style={{
                  width: 150,
                  height: 150,
                  transform: [
                    {
                      translateY: elderFloatAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -10],
                      }),
                    },
                    { scale: speakingAnim },
                  ],
                }}
              />
            </View>

            {/* 吹き出し */}
            <View
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 20,
                padding: 20,
                marginBottom: 20,
                position: 'relative',
              }}>
              {/* 吹き出しの三角形 */}
              <View
                style={{
                  position: 'absolute',
                  top: -20,
                  left: '50%',
                  marginLeft: -10,
                  width: 0,
                  height: 0,
                  backgroundColor: 'transparent',
                  borderStyle: 'solid',
                  borderLeftWidth: 10,
                  borderRightWidth: 10,
                  borderBottomWidth: 20,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderBottomColor: 'rgba(255, 255, 255, 0.95)',
                }}
              />

              <Text
                style={{
                  fontFamily: 'font-mplus-bold',
                  fontSize: 24,
                  color: '#41644A',
                  marginBottom: 15,
                  textAlign: 'center',
                }}>
                {title}
              </Text>

              <Text
                style={{
                  fontFamily: 'font-mplus',
                  fontSize: 16,
                  color: '#333',
                  lineHeight: 24,
                  marginBottom: 20,
                }}>
                {text}
              </Text>

              <TouchableOpacity
                onPress={onStart}
                style={{
                  backgroundColor: '#41644A',
                  padding: 15,
                  borderRadius: 30,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 10,
                }}>
                <MaterialCommunityIcons name='sword' size={24} color='#FFF' />
                <Text
                  style={{
                    color: '#FFF',
                    fontFamily: 'font-mplus-bold',
                    fontSize: 18,
                  }}>
                  {buttonText}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
}

export default StoryScreen;
