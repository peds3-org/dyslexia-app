import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ImageBackground, Animated, StatusBar, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@src/lib/supabase';
import authService from '@src/services/authService';
import progressService from '@src/services/progressService';

/**
 * アプリの初期画面
 */
export default function Index() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const ninjaAnim = useRef(new Animated.Value(0)).current;
  const ninjaJumpAnim = useRef(new Animated.Value(0)).current;
  const elderAnim = useRef(new Animated.Value(0)).current;
  const elderFloatAnim = useRef(new Animated.Value(0)).current;
  const oniTranslateX = useRef(new Animated.Value(-100)).current;
  const ninjaTranslateX = useRef(new Animated.Value(-50)).current;

  // 鬼の走るアニメーション用の値
  const oniRotate = useRef(new Animated.Value(0)).current;
  const oniJump = useRef(new Animated.Value(0)).current;
  const oniScale = useRef(new Animated.Value(1)).current;

  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [userLevel, setUserLevel] = useState<'beginner' | 'intermediate' | null>(null);

  // 画面幅を取得（鬼のアニメーション用）
  const SCREEN_WIDTH = Dimensions.get('window').width;

  useEffect(() => {
    // メインのフェード・スケールアニメーション
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // 忍者のアニメーション
    Animated.sequence([
      Animated.timing(ninjaAnim, {
        toValue: 1,
        duration: 500,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(ninjaJumpAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(ninjaJumpAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    // 長老のアニメーション
    Animated.sequence([
      Animated.timing(elderAnim, {
        toValue: 1,
        duration: 500,
        delay: 600,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(elderFloatAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(elderFloatAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    // 小さな忍者の追いかけっこアニメーション（左から右）
    const smallNinjaAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(ninjaTranslateX, {
          toValue: SCREEN_WIDTH - 80, // 右端まで移動
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(ninjaTranslateX, {
          toValue: -50, // 左端に戻る
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    // 鬼の走るアニメーション - 複数のアニメーションを組み合わせる
    // 1. 左右の移動
    const runAcrossScreen = Animated.loop(
      Animated.sequence([
        Animated.timing(oniTranslateX, {
          toValue: SCREEN_WIDTH + 100,
          duration: 6000,
          useNativeDriver: true,
        }),
        Animated.timing(oniTranslateX, {
          toValue: -100,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    // 2. 走る動きのアニメーション（上下の動き）
    const jumpingMotion = Animated.loop(
      Animated.sequence([
        Animated.timing(oniJump, {
          toValue: -8, // 少し上に浮く
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(oniJump, {
          toValue: 0, // 元の位置に戻る
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    );

    // 3. 鬼を少し傾ける・揺らすアニメーション
    const rotationMotion = Animated.loop(
      Animated.sequence([
        Animated.timing(oniRotate, {
          toValue: 0.1, // 少し右に傾く
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(oniRotate, {
          toValue: -0.1, // 少し左に傾く
          duration: 150,
          useNativeDriver: true,
        }),
      ])
    );

    // 4. スケールを少し変えて動きを強調
    const scaleMotion = Animated.loop(
      Animated.sequence([
        Animated.timing(oniScale, {
          toValue: 1.05, // 少し大きく
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(oniScale, {
          toValue: 0.95, // 少し小さく
          duration: 150,
          useNativeDriver: true,
        }),
      ])
    );

    // 全てのアニメーションを開始
    smallNinjaAnim.start();
    runAcrossScreen.start();
    jumpingMotion.start();
    rotationMotion.start();
    scaleMotion.start();

    // セッション状態の確認
    const checkSession = async () => {
      try {
        // 認証サービスの初期化を確認
        if (!authService.isInitialized()) {
          console.log('認証サービスを初期化します');
          await authService.initialize();
        }

        // 認証状態を確認
        const isAuthed = authService.isAuthenticated();
        console.log('認証状態:', isAuthed);

        if (!isAuthed) {
          setHasActiveSession(false);
          return;
        }

        // ユーザーIDを取得
        const userId = authService.getUser()?.id;
        if (!userId) {
          setHasActiveSession(false);
          return;
        }

        // ユーザーの状態を確認
        const { data: userData, error: userError } = await supabase
          .from('user_state')
          .select('test_completed, test_level, current_stage')
          .eq('user_id', userId)
          .single();

        if (userError || !userData) {
          console.log('ユーザー状態なし:', userError);
          setHasActiveSession(false);
          return;
        }

        // 進行中のセッションがあるか確認
        if (userData.current_stage) {
          setHasActiveSession(true);
          setUserLevel(userData.test_level);
        }

        console.log('セッション状態:', {
          hasActiveSession: !!userData.current_stage,
          userLevel: userData.test_level,
        });
      } catch (error) {
        console.error('セッション確認エラー:', error);
        setHasActiveSession(false);
      }
    };

    checkSession();

    // クリーンアップ
    return () => {
      // アニメーションを停止
      smallNinjaAnim.stop();
      runAcrossScreen.stop();
      jumpingMotion.stop();
      rotationMotion.stop();
      scaleMotion.stop();
    };
  }, []);

  // ゲーム開始または再開
  const handleStart = () => {
    if (hasActiveSession && userLevel) {
      // セッションがある場合は適切なステージに遷移
      const targetScreen = userLevel === 'intermediate' ? '/screens/intermediate' : '/screens/beginner';
      router.push(targetScreen);
    } else {
      // 新規セッションの場合
      const isAuthed = authService.isAuthenticated();
      if (isAuthed) {
        // 認証済みの場合は直接ゲーム画面へ
        console.log('認証済みユーザーが新規セッションを開始します');

        // ユーザーIDとレベルを取得
        const userId = authService.getUser()?.id;

        // ユーザーが存在し、認証されている場合
        if (userId) {
          // ユーザーのテストレベルを確認
          supabase
            .from('user_state')
            .select('test_level')
            .eq('user_id', userId)
            .single()
            .then(({ data, error }) => {
              if (error || !data) {
                console.error('ユーザーレベル取得エラー:', error);
                router.push('/screens/auth');
                return;
              }

              // レベルに応じた画面に遷移
              const level = data.test_level as 'beginner' | 'intermediate' | null;
              const screen = level === 'intermediate' ? '/screens/intermediate' : '/screens/beginner';

              console.log(`認証済みユーザー(${userId})をステージに遷移:`, screen);
              router.push(screen);
            });
        } else {
          // ユーザーIDが取得できない場合は認証画面へ
          router.push('/screens/auth');
        }
      } else {
        // 未認証の場合は認証画面へ
        router.push('/screens/auth');
      }
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle='dark-content' />
      <ImageBackground source={require('../assets/backgrounds/sato.png')} style={{ flex: 1 }} resizeMode='cover'>
        {/* 小さな忍者のアニメーション */}
        <Animated.Image
          source={require('../assets/temp/ninja_syuriken_man.png')}
          style={{
            position: 'absolute',
            top: insets.top + 150,
            transform: [
              { translateX: ninjaTranslateX },
              {
                translateY: ninjaJumpAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -10],
                }),
              },
              { scale: 0.6 },
            ],
            width: 100,
            height: 100,
            zIndex: 2,
          }}
        />

        {/* 鬼のアニメーション - 複数のtransformを組み合わせて走るアニメーション */}
        <Animated.Image
          source={require('../assets/temp/oni_run_1.png')}
          style={{
            position: 'absolute',
            top: insets.top + 155,
            transform: [
              { translateX: oniTranslateX },
              { translateY: oniJump },
              {
                rotate: oniRotate.interpolate({
                  inputRange: [-0.1, 0.1],
                  outputRange: ['-5deg', '5deg'],
                }),
              },
              { scale: 0.5 },
            ],
            width: 120,
            height: 120,
            zIndex: 1,
          }}
        />

        <View
          style={{
            flex: 1,
            paddingTop: insets.top,
            paddingHorizontal: 24,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          {/* 長老キャラクター（上部中央） */}
          <Animated.View
            style={{
              position: 'absolute',
              top: insets.top + 25,
              alignSelf: 'center',
              opacity: elderAnim,
              transform: [
                {
                  translateY: elderFloatAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -10],
                  }),
                },
              ],
              zIndex: 3,
            }}>
            <Image
              source={require('../assets/temp/elder-worried.png')}
              style={{
                width: 120,
                height: 120,
                resizeMode: 'contain',
              }}
            />
          </Animated.View>

          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              alignItems: 'center',
              marginTop: 200,
              width: '100%',
            }}>
            {/* タイトルバナー */}
            <View
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: 20,
                paddingVertical: 16,
                paddingHorizontal: 25,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 5,
                elevation: 5,
                marginBottom: 20,
                borderWidth: 3,
                borderColor: '#41644A',
                width: '95%',
                maxWidth: 350,
              }}>
              <Text
                style={{
                  fontFamily: 'font-yomogi',
                  fontSize: 42,
                  color: '#333',
                  textShadowColor: 'rgba(255, 255, 255, 0.8)',
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 4,
                }}>
                ひらがな{'\n'}にんじゃ
              </Text>
            </View>

            {/* メッセージボックス */}
            <View
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                borderRadius: 15,
                padding: 20,
                marginTop: 10,
                marginBottom: 25,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
                width: '95%',
                maxWidth: 340,
                borderWidth: 2,
                borderColor: '#EAC7C7',
              }}>
              <View
                style={{
                  position: 'absolute',
                  top: -15,
                  left: 20,
                  backgroundColor: '#F7EDDB',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#EAC7C7',
                  zIndex: 1,
                }}>
                <Text
                  style={{
                    fontFamily: 'font-mplus-bold',
                    fontSize: 14,
                    color: '#A0C3D2',
                  }}>
                  せんせいのひとこと
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: 'font-mplus-bold',
                  fontSize: 18,
                  color: '#41644A',
                  textAlign: 'center',
                  lineHeight: 28,
                }}>
                {hasActiveSession
                  ? 'しゅぎょうの つづきから\nはじめることが できます！'
                  : 'ひらがなの しゅぎょうをして\nにんじゃの せんせいに なろう！\n\nこえを だして れんしゅうすれば\nもっと じょうずに なれるよ'}
              </Text>
            </View>
          </Animated.View>

          {/* スタートボタン */}
          <TouchableOpacity
            onPress={handleStart}
            activeOpacity={0.8}
            style={{
              backgroundColor: hasActiveSession ? '#E86A33' : '#41644A',
              borderRadius: 35,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
              borderWidth: 3,
              borderColor: hasActiveSession ? '#FFD8A9' : '#F7EDDB',
              width: '85%',
              maxWidth: 320,
              paddingVertical: 18,
              paddingHorizontal: 25,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
            }}>
            <Image
              source={require('../assets/temp/ninja_syuriken_man.png')}
              style={{
                width: 38,
                height: 38,
                marginRight: 12,
              }}
            />
            <Text
              style={{
                fontFamily: 'font-mplus-bold',
                fontSize: 26,
                color: '#FFFFFF',
                textAlign: 'center',
                letterSpacing: 2,
                textShadowColor: 'rgba(0, 0, 0, 0.3)',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2,
              }}>
              {hasActiveSession ? 'しゅぎょうを\nさいかい' : 'しゅぎょうを\nはじめる'}
            </Text>
          </TouchableOpacity>

          {/* バージョン表示 */}
          <Text
            style={{
              fontFamily: 'font-mplus',
              fontSize: 12,
              color: 'rgba(65, 100, 74, 0.6)',
              marginTop: 20,
            }}>
            ばーじょん 1.0.0
          </Text>
        </View>
      </ImageBackground>
    </View>
  );
}
