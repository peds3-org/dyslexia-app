import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, ImageBackground, Animated, StatusBar, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@src/lib/supabase';
import authService from '@src/services/authService';
import * as SplashScreen from 'expo-splash-screen';

/**
 * アプリの初期画面
 * アプリ起動時に表示されるメイン画面
 */
export default function Index() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // アニメーション用の値
  const fadeAnim = useRef(new Animated.Value(0)).current; // フェードイン
  const scaleAnim = useRef(new Animated.Value(0.95)).current; // スケール
  const ninjaAnim = useRef(new Animated.Value(0)).current; // 忍者の表示
  const ninjaJumpAnim = useRef(new Animated.Value(0)).current; // 忍者のジャンプ
  const elderAnim = useRef(new Animated.Value(0)).current; // 長老の表示
  const elderFloatAnim = useRef(new Animated.Value(0)).current; // 長老の浮遊
  const oniTranslateX = useRef(new Animated.Value(-100)).current; // 鬼の水平移動
  const ninjaTranslateX = useRef(new Animated.Value(-50)).current; // 忍者の水平移動

  // 鬼のアニメーション用の値
  const oniRotate = useRef(new Animated.Value(0)).current; // 鬼の回転
  const oniJump = useRef(new Animated.Value(0)).current; // 鬼のジャンプ
  const oniScale = useRef(new Animated.Value(1)).current; // 鬼のサイズ変更

  // ユーザー状態
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [userLevel, setUserLevel] = useState<'beginner' | 'intermediate' | null>(null);
  const [isLocalInitialized, setIsLocalInitialized] = useState(false);

  // 画面サイズの取得
  const SCREEN_WIDTH = Dimensions.get('window').width;

  /**
   * スプラッシュスクリーンを非表示にする
   */
  useEffect(() => {
    const hideSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        // エラー処理
      }
    };

    hideSplash();
  }, []);

  /**
   * 初期アニメーションと認証状態の確認
   */
  useEffect(() => {
    // 二重初期化防止
    if (isLocalInitialized) {
      return;
    }

    // 初期化済みフラグを設定
    setIsLocalInitialized(true);

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

    // 鬼の走るアニメーション設定
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

    /**
     * ユーザーセッション状態の確認
     * 認証状態に基づいて適切な画面に遷移する
     */
    const checkSession = async () => {
      try {
        // 認証サービスの初期化を確認
        if (!authService.isInitialized()) {
          const initResult = await authService.initialize();
          if (!initResult) {
            setHasActiveSession(false);
            setUserLevel(null);
            return;
          }
        }

        // 認証状態を確認
        const isAuthed = authService.isAuthenticated();

        if (!isAuthed) {
          setHasActiveSession(false);
          setUserLevel(null);
          return;
        }

        // ユーザーIDを取得
        const userId = authService.getUser()?.id;
        if (!userId) {
          setHasActiveSession(false);
          setUserLevel(null);
          return;
        }

        // ユーザーが存在し、認証されている場合
        // ユーザーのテストレベルを確認
        (async () => {
          try {
            // ユーザープロフィールと初期テスト結果を取得
            const { data: userProfile, error: profileError } = await supabase
              .from('user_profiles')
              .select('character_level')
              .eq('user_id', userId)
              .single();

            if (profileError) {
              console.error('ユーザープロフィール取得エラー:', profileError);
              router.push('/screens/tutorial');
              return;
            }

            if (!userProfile) {
              console.error('ユーザープロフィールが取得できませんでした - チュートリアル画面へ遷移');
              router.push('/screens/tutorial');
              return;
            }

            const { data: testResult, error: testError } = await supabase
              .from('initial_test_results')
              .select('is_completed, level')
              .eq('user_id', userId)
              .single();

            // テスト完了状態を確認
            let testCompleted = false;
            let testLevel = userProfile.character_level || 'beginner';

            if (!testError && testResult) {
              testCompleted = testResult.is_completed;
              testLevel = testResult.level;
            }

            // テスト未完了の場合はテスト画面へ
            if (!testCompleted) {
              console.log('テスト未完了ユーザー - テスト画面へ遷移');
              router.push('/screens/initial-test');
              return;
            }

            // レベルに応じた画面に遷移
            const level = testLevel as 'beginner' | 'intermediate' | null;
            const screen = level === 'intermediate' ? '/screens/intermediate' : '/screens/beginner';

            console.log(`認証済みユーザー(${userId})をステージに遷移:`, screen);
            router.push(screen);
          } catch (err) {
            console.error('データベース接続エラー:', err);
            router.push('/screens/tutorial');
          }
        })();
      } catch (error) {
        console.error('セッション確認エラー:', error);
        setHasActiveSession(false);
        setUserLevel(null);
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

  /**
   * ゲーム開始または再開処理
   * ユーザーの認証状態に応じて適切な画面に遷移
   */
  const handleStart = () => {
    if (hasActiveSession && userLevel) {
      // セッションがある場合は適切なステージに遷移
      const targetScreen = userLevel === 'intermediate' ? '/screens/intermediate' : '/screens/beginner';
      console.log(`既存セッションで遷移: ${targetScreen}, レベル=${userLevel}`);
      router.push(targetScreen);
    } else {
      // 新規セッションの場合
      console.log('新規セッションの開始処理');

      // 認証サービスが初期化されていることを確認
      if (!authService.isInitialized()) {
        console.log('認証サービスが初期化されていません - チュートリアル画面へ遷移');
        router.push('/screens/tutorial');
        return;
      }

      const isAuthed = authService.isAuthenticated();
      if (isAuthed) {
        // 認証済みの場合は直接ゲーム画面へ
        console.log('認証済みユーザーが新規セッションを開始します');

        // ユーザーIDとレベルを取得
        const userId = authService.getUser()?.id;

        // ユーザーIDが見つからない場合
        if (!userId) {
          console.error('認証済みだがユーザーIDが取得できません - チュートリアル画面へ遷移');
          router.push('/screens/tutorial');
          return;
        }

        // ユーザーが存在し、認証されている場合
        // ユーザーのテストレベルを確認
        (async () => {
          try {
            // ユーザープロフィールと初期テスト結果を取得
            const { data: userProfile, error: profileError } = await supabase
              .from('user_profiles')
              .select('character_level')
              .eq('user_id', userId)
              .single();

            if (profileError) {
              console.error('ユーザープロフィール取得エラー:', profileError);
              router.push('/screens/tutorial');
              return;
            }

            if (!userProfile) {
              console.error('ユーザープロフィールが取得できませんでした - チュートリアル画面へ遷移');
              router.push('/screens/tutorial');
              return;
            }

            const { data: testResult, error: testError } = await supabase
              .from('initial_test_results')
              .select('is_completed, level')
              .eq('user_id', userId)
              .single();

            // テスト完了状態を確認
            let testCompleted = false;
            let testLevel = userProfile.character_level || 'beginner';

            if (!testError && testResult) {
              testCompleted = testResult.is_completed;
              testLevel = testResult.level;
            }

            // テスト未完了の場合はテスト画面へ
            if (!testCompleted) {
              console.log('テスト未完了ユーザー - テスト画面へ遷移');
              router.push('/screens/initial-test');
              return;
            }

            // レベルに応じた画面に遷移
            const level = testLevel as 'beginner' | 'intermediate' | null;
            const screen = level === 'intermediate' ? '/screens/intermediate' : '/screens/beginner';

            console.log(`認証済みユーザー(${userId})をステージに遷移:`, screen);
            router.push(screen);
          } catch (err) {
            console.error('データベース接続エラー:', err);
            router.push('/screens/tutorial');
          }
        })();
      } else {
        // 未認証の場合はチュートリアル画面へ
        console.log('未認証ユーザー - チュートリアル画面へ遷移');
        router.push('/screens/tutorial');
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
            top: insets.top + 220,
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

        {/* 鬼のアニメーション */}
        <Animated.Image
          source={require('../assets/temp/oni_run_1.png')}
          style={{
            position: 'absolute',
            top: insets.top + 225,
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

        {/* タイトル */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            alignItems: 'center',
            justifyContent: 'flex-start',
            width: '100%',
            position: 'absolute',
            top: insets.top + 40,
            zIndex: 5,
          }}>
          <View
            style={{
              backgroundColor: '#FF5B79',
              borderRadius: 25,
              paddingVertical: 20,
              paddingHorizontal: 30,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 10,
              borderWidth: 6,
              borderColor: '#FFE500',
              width: '85%',
              maxWidth: 300,
            }}>
            <Text
              style={{
                fontFamily: 'font-yomogi',
                fontSize: 46,
                color: '#FFFFFF',
                textShadowColor: 'rgba(0, 0, 0, 0.3)',
                textShadowOffset: { width: 2, height: 2 },
                textShadowRadius: 3,
                letterSpacing: 4,
                textAlign: 'center',
                lineHeight: 60,
              }}>
              ひらがな{'\n'}にんじゃ
            </Text>
          </View>
        </Animated.View>

        {/* 中央のコンテンツ部分 */}
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            alignItems: 'center',
            width: '100%',
            paddingBottom: insets.bottom + 40,
          }}>
          {/* スタートボタン */}
          <TouchableOpacity
            onPress={handleStart}
            activeOpacity={0.7}
            style={{
              backgroundColor: '#00C853',
              borderRadius: 25,
              paddingVertical: 16,
              paddingHorizontal: 30,
              width: '85%',
              maxWidth: 300,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              borderWidth: 6,
              borderColor: '#FFE500',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 8,
              marginBottom: 15,
            }}>
            <Image
              source={require('../assets/temp/ninja_syuriken_man.png')}
              style={{
                width: 40,
                height: 40,
                marginRight: 15,
              }}
            />
            <Text
              style={{
                fontFamily: 'font-mplus-bold',
                fontSize: 32,
                color: '#FFFFFF',
                textAlign: 'center',
                letterSpacing: 2,
                textShadowColor: 'rgba(0, 0, 0, 0.3)',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2,
              }}>
              あそぶ
            </Text>
          </TouchableOpacity>

          {/* バージョン表示 */}
          <Text
            style={{
              fontFamily: 'font-mplus',
              fontSize: 12,
              color: 'rgba(0, 0, 0, 0.5)',
              marginTop: 5,
            }}>
            ばーじょん 1.0.0
          </Text>

          {/* おんせいれんしゅうボタン */}
          <TouchableOpacity
            onPress={() => router.push('/screens/voice-practice' as any)}
            style={{
              backgroundColor: '#FF9500',
              padding: 15,
              borderRadius: 10,
              margin: 10,
              alignItems: 'center',
            }}>
            <Text style={{ fontSize: 18, color: '#fff', fontWeight: 'bold' }}>おんせいれんしゅうを ためす</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}
