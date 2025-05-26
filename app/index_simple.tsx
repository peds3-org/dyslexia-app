import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Animated,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { authService } from '@src/services';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function TitleScreen() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    // 認証サービスの初期化
    authService.initialize();

    // BGMを再生
    playBackgroundMusic();

    // アニメーション開始
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      // クリーンアップ
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const playBackgroundMusic = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/index_page.mp3'),
        { shouldPlay: true, isLooping: true, volume: 0.5 }
      );
      soundRef.current = sound;
    } catch (error) {
      console.error('BGM再生エラー:', error);
    }
  };

  const handleStart = async () => {
    setIsCheckingAuth(true);
    
    try {
      // タップ音を再生
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/select.mp3')
      );
      await sound.playAsync();
      
      // BGMを停止
      if (soundRef.current) {
        await soundRef.current.stopAsync();
      }

      // 認証状態をチェック
      const isAuthenticated = authService.isAuthenticated();
      
      if (isAuthenticated) {
        // 既にログイン済みの場合は直接ホームへ
        router.push('/(app)');
      } else {
        // 未ログインの場合はイントロへ
        router.push('/(auth)/intro');
      }
    } catch (error) {
      console.error('エラー:', error);
      router.push('/(auth)/intro');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/backgrounds/title_screen.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.5)']}
        style={styles.overlay}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          {/* タイトルロゴ */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/ninja/beginner/normal.png')}
              style={styles.ninjaImage}
            />
            <Text style={styles.title}>ひらがな</Text>
            <Text style={styles.titleNinja}>にんじゃ</Text>
          </View>

          {/* サブタイトル */}
          <Text style={styles.subtitle}>
            たのしく ひらがなを まなぼう！
          </Text>

          {/* スタートボタン */}
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStart}
            activeOpacity={0.8}
            disabled={isCheckingAuth}
          >
            <LinearGradient
              colors={['#FF6B6B', '#E86A33']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isCheckingAuth ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="play"
                    size={32}
                    color="#FFFFFF"
                  />
                  <Text style={styles.buttonText}>はじめる</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* バージョン情報 */}
          <Text style={styles.version}>v1.0.0</Text>
        </Animated.View>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  ninjaImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 48,
    fontFamily: 'font-yomogi',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
    marginBottom: -10,
  },
  titleNinja: {
    fontSize: 56,
    fontFamily: 'font-yomogi',
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 15,
  },
  subtitle: {
    fontSize: 20,
    fontFamily: 'font-mplus',
    color: '#FFFFFF',
    marginBottom: 50,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  startButton: {
    marginBottom: 30,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  buttonText: {
    fontSize: 24,
    fontFamily: 'font-mplus-bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  loadingContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  version: {
    fontSize: 14,
    fontFamily: 'font-mplus',
    color: 'rgba(255, 255, 255, 0.6)',
    position: 'absolute',
    bottom: -100,
  },
});