import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Star } from '@assets/items/star';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PARTICLE_COUNT = 30;

type LevelUpAnimationProps = {
  level: number;
  onComplete: () => void;
};

export function LevelUpAnimation({ level, onComplete }: LevelUpAnimationProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      scale: new Animated.Value(0),
      rotation: new Animated.Value(0),
    }))
  ).current;

  const getBeltColor = (level: number) => {
    switch (level) {
      case 1:
        return '#FFFFFF'; // 白帯
      case 2:
        return '#F1C40F'; // 黄帯
      case 3:
        return '#2ECC71'; // 緑帯
      case 4:
        return '#3498db'; // 青帯
      case 5:
        return '#E74C3C'; // 赤帯
      default:
        return '#FFFFFF';
    }
  };

  const getBeltName = (level: number) => {
    switch (level) {
      case 1:
        return '白帯';
      case 2:
        return '黄帯';
      case 3:
        return '緑帯';
      case 4:
        return '青帯';
      case 5:
        return '赤帯';
      default:
        return '白帯';
    }
  };

  useEffect(() => {
    // パーティクルアニメーション
    particles.forEach((particle, index) => {
      const angle = (index / PARTICLE_COUNT) * Math.PI * 2;
      const radius = Math.random() * 200 + 100;
      const duration = Math.random() * 1000 + 1000;

      Animated.parallel([
        Animated.timing(particle.x, {
          toValue: Math.cos(angle) * radius,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(particle.y, {
          toValue: Math.sin(angle) * radius,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(particle.scale, {
          toValue: Math.random() * 0.5 + 0.5,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(particle.rotation, {
          toValue: Math.random() * 4 * Math.PI,
          duration,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // メインのアニメーション
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(2000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete();
    });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.overlay} />

      {/* パーティクル */}
      {particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              transform: [
                { translateX: particle.x },
                { translateY: particle.y },
                { scale: particle.scale },
                {
                  rotate: particle.rotation.interpolate({
                    inputRange: [0, Math.PI * 2],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}>
          <Star width={20} height={20} color='#FFD700' />
        </Animated.View>
      ))}

      {/* レベルアップテキスト */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}>
        <Text style={styles.levelUpText}>LEVEL UP!</Text>
        <View
          style={[
            styles.belt,
            {
              backgroundColor: getBeltColor(level),
            },
          ]}
        />
        <Text style={styles.beltText}>{getBeltName(level)}になりました！</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  content: {
    alignItems: 'center',
  },
  levelUpText: {
    fontFamily: 'font-mplus-bold',
    fontSize: 48,
    color: '#FFD700',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  belt: {
    width: 200,
    height: 30,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  beltText: {
    fontFamily: 'font-mplus-bold',
    fontSize: 24,
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  particle: {
    position: 'absolute',
    width: 20,
    height: 20,
  },
});

export default LevelUpAnimation;
