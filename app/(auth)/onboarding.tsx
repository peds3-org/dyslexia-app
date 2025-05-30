import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  Dimensions, 
  Alert, 
  Animated as RNAnimated, 
  Easing 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import aiService, { DownloadProgressCallback } from '../../src/services/aiService';
import { useAppState } from '@src/contexts/AppStateContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingStep {
  title: string;
  description: string;
  image: any;
  bgColor: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'こんにちは！',
    description: 'きみは　にんじゃの　むらに　やってきたよ。\nここには　たいせつな　ひらがなの　まきものが　あるんだ。',
    image: require('../../assets/temp/ninja_syuriken_man.png'),
    bgColor: '#FFE5CC',
  },
  {
    title: 'でも　あるひ...',
    description: 'おにが　まきものを　もっていっちゃった！\nおにも　きみと　おなじで　ひらがなが　よめなくて　こまっていたんだ。',
    image: require('../../assets/temp/mojitama.png'),
    bgColor: '#FFEAA7',
  },
  {
    title: 'いっしょに　べんきょうしよう！',
    description: 'いっしょに　べんきょうして　おにも　たすけてあげよう！',
    image: require('../../assets/temp/elder-worried.png'),
    bgColor: '#FFD5FF',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { setOnboarded, setAIReady } = useAppState();
  const [currentStep, setCurrentStep] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);

  // クリーンアップ用のref
  const isMountedRef = useRef(true);
  const bounceAnimRef = useRef<RNAnimated.CompositeAnimation | null>(null);
  const floatAnimRef = useRef<RNAnimated.CompositeAnimation | null>(null);
  const sparkleAnimRef = useRef<RNAnimated.CompositeAnimation | null>(null);

  // アニメーション値
  const bounceAnim = useRef(new RNAnimated.Value(0)).current;
  const floatAnim = useRef(new RNAnimated.Value(0)).current;
  const sparkleAnim = useRef(new RNAnimated.Value(0)).current;
  const rotateAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(1);

  // アニメーションスタイル
  const animatedImageStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scaleAnim.value }, 
        { rotate: `${rotateAnim.value}deg` }
      ],
    };
  });

  // アニメーションのセットアップ
  useEffect(() => {
    // バウンスアニメーション
    bounceAnimRef.current = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(bounceAnim, {
          toValue: -10,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        RNAnimated.timing(bounceAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    bounceAnimRef.current.start();

    // フロートアニメーション
    floatAnimRef.current = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        RNAnimated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatAnimRef.current.start();

    // きらきらアニメーション
    sparkleAnimRef.current = RNAnimated.loop(
      RNAnimated.timing(sparkleAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    sparkleAnimRef.current.start();

    // Reanimated アニメーション
    rotateAnim.value = withRepeat(withTiming(360, { duration: 20000 }), -1, false);
    scaleAnim.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500 }), 
        withTiming(1, { duration: 1500 })
      ), 
      -1, 
      true
    );

    // クリーンアップ
    return () => {
      isMountedRef.current = false;
      bounceAnimRef.current?.stop();
      floatAnimRef.current?.stop();
      sparkleAnimRef.current?.stop();
      cancelAnimation(rotateAnim);
      cancelAnimation(scaleAnim);
    };
  }, []); // 空の依存配列で初回のみ実行

  // 次へ進む処理
  const handleNext = useCallback(() => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleStartSetup();
    }
  }, [currentStep]);

  // スキップ処理
  const handleSkip = useCallback(() => {
    Alert.alert(
      'スキップしますか？', 
      'AIモデルのダウンロードが必要です', 
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'スキップ', onPress: handleStartSetup },
      ]
    );
  }, []);

  // セットアップ開始
  const handleStartSetup = useCallback(() => {
    setCurrentStep(ONBOARDING_STEPS.length); // AI初期化画面を表示
  }, []);

  // 戻る処理
  const handleBack = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  // AI初期化処理
  const initializeAI = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      setIsInitializing(true);
      setIsDownloading(true);
      setDownloadProgress(0);

      // ダウンロード進捗のコールバック
      const progressCallback: DownloadProgressCallback = (progress) => {
        if (isMountedRef.current) {
          setDownloadProgress(progress);
        }
      };

      // AIサービスを初期化
      const success = await aiService.initialize(progressCallback);

      if (!isMountedRef.current) return;

      if (success) {
        // オンボーディング完了をマーク
        await setOnboarded(true);
        setAIReady(true);

        // RouteGuardが自動的に適切な画面へ遷移
        router.replace('/');
      } else {
        Alert.alert(
          'エラー', 
          'AIモデルの初期化に失敗しました。もう一度お試しください。', 
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('AI初期化エラー:', error);
      if (isMountedRef.current) {
        Alert.alert(
          'エラー', 
          '初期化中にエラーが発生しました。', 
          [{ text: 'OK' }]
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsInitializing(false);
        setIsDownloading(false);
      }
    }
  }, [setOnboarded, setAIReady, router]);

  // AI初期化画面のレンダリング
  const renderAISetupScreen = () => (
    <View style={[styles.container, styles.gradientBg]}>
      <SafeAreaView style={styles.container}>
        <View style={styles.aiSetupContainer}>
          {/* 背景の装飾 */}
          <RNAnimated.View
            style={[
              styles.bgDecoration,
              {
                transform: [
                  {
                    rotate: sparkleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}>
            <MaterialCommunityIcons name='star-four-points' size={60} color='#FFD700' />
          </RNAnimated.View>

          <RNAnimated.View
            style={[
              {
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -15],
                    }),
                  },
                ],
              },
            ]}>
            <Animated.View entering={FadeInDown.duration(600).springify()}>
              <View style={styles.characterBubble}>
                <Image 
                  source={require('../../assets/temp/elder-worried.png')} 
                  style={styles.aiSetupImage} 
                />
              </View>
            </Animated.View>
          </RNAnimated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.aiSetupContent}>
            <View style={styles.speechBubble}>
              <Text style={styles.aiSetupTitle}>さいごの じゅんび ✨</Text>
              <Text style={styles.aiSetupDescription}>
                AIせんせいを ダウンロードします{'\n'}
                すこし じかんが かかるよ 📚
              </Text>
            </View>

            {isDownloading && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${Math.round(downloadProgress * 100)}%` }
                    ]} 
                  />
                  <View style={styles.progressShine} />
                </View>
                <Text style={styles.progressText}>
                  {Math.round(downloadProgress * 100)}% 🚀
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.downloadButton,
                isInitializing ? styles.downloadButtonActive : styles.downloadButtonDefault,
                isInitializing && styles.buttonDisabled,
              ]}
              onPress={initializeAI}
              disabled={isInitializing}
              activeOpacity={0.8}>
              {isInitializing ? (
                <RNAnimated.View
                  style={{
                    transform: [
                      {
                        rotate: sparkleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  }}>
                  <MaterialCommunityIcons name='loading' size={24} color='#FFFFFF' />
                </RNAnimated.View>
              ) : (
                <MaterialCommunityIcons name='cloud-download' size={24} color='#FFFFFF' />
              )}
              <Text style={styles.downloadButtonText}>
                {isInitializing ? 'ダウンロードちゅう...' : 'ダウンロードをはじめる'}
              </Text>
            </TouchableOpacity>

            <View style={styles.noteContainer}>
              <MaterialCommunityIcons name='wifi' size={20} color='#FFA500' />
              <Text style={styles.noteText}>WiFiせつぞくを おすすめします</Text>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );

  // 通常のオンボーディング画面のレンダリング
  const renderOnboardingStep = () => {
    const step = ONBOARDING_STEPS[currentStep];
    
    return (
      <View style={[styles.container, { backgroundColor: step.bgColor }]}>
        <SafeAreaView style={styles.container}>
          {/* 背景の星装飾 */}
          <RNAnimated.View
            style={[
              styles.starDecoration,
              { top: 80, left: 30 },
              {
                opacity: sparkleAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.3, 1, 0.3],
                }),
              },
            ]}>
            <MaterialCommunityIcons name='star' size={24} color='#FFD700' />
          </RNAnimated.View>

          <RNAnimated.View
            style={[
              styles.starDecoration,
              { top: 150, right: 40 },
              {
                opacity: sparkleAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 0.3, 1],
                }),
              },
            ]}>
            <MaterialCommunityIcons name='star' size={18} color='#FFA500' />
          </RNAnimated.View>

          <View style={styles.header}>
            {currentStep > 0 && (
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <MaterialCommunityIcons name='chevron-left' size={32} color='#FFFFFF' />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <View style={styles.skipButtonBg}>
                <Text style={styles.skipText}>スキップ</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Animated.View 
              key={currentStep} 
              entering={FadeInDown.duration(600).springify()} 
              style={[styles.imageContainer]}
            >
              <RNAnimated.View
                style={[
                  styles.characterContainer,
                  {
                    transform: [
                      {
                        translateY: bounceAnim,
                      },
                    ],
                  },
                ]}>
                <Animated.View style={animatedImageStyle}>
                  <Image source={step.image} style={styles.image} />
                </Animated.View>

                {/* キャラクターの影 */}
                <View style={styles.characterShadow} />
              </RNAnimated.View>
            </Animated.View>

            <Animated.View 
              key={`text-${currentStep}`} 
              entering={FadeInUp.duration(600).delay(300)} 
              style={styles.textContainer}
            >
              <View style={styles.titleBubble}>
                <Text style={styles.title}>{step.title}</Text>
              </View>
              <Text style={styles.description}>{step.description}</Text>
            </Animated.View>
          </View>

          <View style={styles.footer}>
            <View style={styles.pagination}>
              {ONBOARDING_STEPS.map((_, index) => (
                <RNAnimated.View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === currentStep && styles.paginationDotActive,
                    {
                      transform: [
                        {
                          scale:
                            index === currentStep
                              ? bounceAnim.interpolate({
                                  inputRange: [-10, 0],
                                  outputRange: [1.2, 1],
                                })
                              : 1,
                        },
                      ],
                    },
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.nextButton, styles.nextButtonDefault]} 
              onPress={handleNext} 
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === ONBOARDING_STEPS.length - 1 ? 'はじめる' : 'つぎへ'}
              </Text>
              <View style={styles.nextButtonIcon}>
                <MaterialCommunityIcons name='chevron-right' size={24} color='#FFFFFF' />
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  };

  // メインのレンダリング
  if (currentStep >= ONBOARDING_STEPS.length) {
    return renderAISetupScreen();
  }

  return renderOnboardingStep();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBg: {
    backgroundColor: '#FFE5F1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    height: 60,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    padding: 8,
  },
  skipButtonBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  skipText: {
    fontFamily: 'font-mplus',
    fontSize: 14,
    color: '#666666',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  imageContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  characterContainer: {
    alignItems: 'center',
  },
  image: {
    width: 220,
    height: 220,
    resizeMode: 'contain',
  },
  characterShadow: {
    position: 'absolute',
    bottom: -10,
    width: 120,
    height: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 60,
    transform: [{ scaleX: 1.5 }],
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  titleBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  title: {
    fontFamily: 'font-mplus-bold',
    fontSize: 26,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 34,
  },
  description: {
    fontFamily: 'font-mplus',
    fontSize: 18,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  footer: {
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    alignItems: 'center',
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 30,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  nextButton: {
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  nextButtonDefault: {
    backgroundColor: '#FF6B6B',
  },
  nextButtonText: {
    fontFamily: 'font-mplus-bold',
    fontSize: 18,
    color: '#FFFFFF',
    marginRight: 8,
  },
  nextButtonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starDecoration: {
    position: 'absolute',
    zIndex: 1,
  },
  // AI初期化画面のスタイル
  aiSetupContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  bgDecoration: {
    position: 'absolute',
    top: 50,
    right: 30,
    opacity: 0.3,
  },
  characterBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 100,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  aiSetupImage: {
    width: 160,
    height: 160,
  },
  aiSetupContent: {
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
  },
  speechBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  aiSetupTitle: {
    fontFamily: 'font-mplus-bold',
    fontSize: 26,
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  aiSetupDescription: {
    fontFamily: 'font-mplus',
    fontSize: 16,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 24,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 30,
  },
  progressBarBg: {
    width: '100%',
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#4CAF50',
  },
  progressShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
  },
  progressText: {
    fontFamily: 'font-mplus-bold',
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
  },
  downloadButton: {
    borderRadius: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  downloadButtonDefault: {
    backgroundColor: '#FF6B6B',
  },
  downloadButtonActive: {
    backgroundColor: '#FFB347',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  downloadButtonText: {
    fontFamily: 'font-mplus-bold',
    fontSize: 18,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  noteText: {
    fontFamily: 'font-mplus',
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
  },
});