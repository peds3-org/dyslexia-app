import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, ImageBackground, Animated, StatusBar, TouchableOpacity, Image, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@src/lib/supabase';
import authService from '@src/services/authService';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import aiService from '@src/services/aiService';
import { clearAllAuthData, debugShowAllStorageKeys, debugCheckSupabaseAuth } from '@src/utils/clearAllAuth';

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
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

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
   * AIモデルの初期化（非同期で実行）
   */
  useEffect(() => {
    const initializeAI = async () => {
      try {
        // AIモデルがダウンロード済みかチェック
        const isModelDownloaded = await aiService.isModelDownloaded();
        
        if (isModelDownloaded) {
          console.log('AIモデルがダウンロード済みです。バックグラウンドで初期化を開始します。');
          
          // 非同期で初期化（完了を待たない）
          aiService.initialize().then((success) => {
            if (success) {
              console.log('AIモデルの初期化が完了しました');
            } else {
              console.log('AIモデルの初期化に失敗しました');
            }
          }).catch((error) => {
            console.error('AIモデル初期化エラー:', error);
          });
        } else {
          console.log('AIモデルがまだダウンロードされていません');
        }
      } catch (error) {
        console.error('AIモデル確認エラー:', error);
      }
    };

    initializeAI();
  }, []);

  /**
   * 初回起動チェック
   */
  const checkFirstLaunch = async () => {
    try {
      const onboardingStatus = await AsyncStorage.getItem('onboarding_completed');
      setOnboardingCompleted(!!onboardingStatus);

      // オンボーディング未完了の場合はfalseを返すだけ（画面遷移しない）
      if (!onboardingStatus) {
        console.log('オンボーディング未完了 - index画面に留まる');
        return false;
      }
      return false;
    } catch (error) {
      console.error('初回起動チェックエラー:', error);
      return false;
    }
  };

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
        // 初回起動チェック
        const isFirstLaunch = await checkFirstLaunch();
        if (isFirstLaunch) {
          return; // オンボーディング画面へ遷移済み
        }
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
              // PGRST116 エラーは新規ユーザーの場合の正常な状態
              if (profileError.code === 'PGRST116') {
                console.log('新規ユーザーのためプロフィールが存在しません。チュートリアルへ遷移します。');
              } else {
                console.error('ユーザープロフィール取得エラー:', profileError);
              }
              router.push('/(auth)/tutorial');
              return;
            }

            if (!userProfile) {
              console.error('ユーザープロフィールが取得できませんでした - チュートリアル画面へ遷移');
              router.push('/(auth)/tutorial');
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

            // テスト未完了の場合はテストイントロ画面へ
            if (!testCompleted) {
              console.log('テスト未完了ユーザー - テストイントロ画面へ遷移');
              router.push('/(app)/initial-test/intro');
              return;
            }

            // 認証済みユーザーの状態を設定（自動遷移はしない）
            console.log(`認証済みユーザー(${userId}) - index画面に留まる`);
            setHasActiveSession(true);
            setUserLevel(testLevel as 'beginner' | 'intermediate');
          } catch (err) {
            console.error('データベース接続エラー:', err);
            router.push('/(auth)/tutorial');
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
  const handleStart = async () => {
    // まずオンボーディング状態を確認
    const onboardingCompleted = await AsyncStorage.getItem('onboarding_completed');

    if (!onboardingCompleted) {
      // オンボーディング未完了の場合はオンボーディング画面へ
      console.log('オンボーディング未完了 - オンボーディング画面へ遷移');
      router.push('/(auth)/onboarding');
      return;
    }

    if (hasActiveSession && userLevel) {
      // CBTの今日の目標ページへ遷移
      console.log(`既存セッションでCBT目標ページへ遷移`);
      router.push(`/(app)/${userLevel}`);
    } else {
      // 新規セッションの場合
      console.log('新規セッションの開始処理');

      // 認証サービスが初期化されていることを確認
      if (!authService.isInitialized()) {
        console.log('認証サービスが初期化されていません - チュートリアル画面へ遷移');
        router.push('/(auth)/tutorial');
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
          router.push('/(auth)/tutorial');
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
              // PGRST116 エラーは新規ユーザーの場合の正常な状態
              if (profileError.code === 'PGRST116') {
                console.log('新規ユーザーのためプロフィールが存在しません。チュートリアルへ遷移します。');
              } else {
                console.error('ユーザープロフィール取得エラー:', profileError);
              }
              router.push('/(auth)/tutorial');
              return;
            }

            if (!userProfile) {
              console.error('ユーザープロフィールが取得できませんでした - チュートリアル画面へ遷移');
              router.push('/(auth)/tutorial');
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

            // テスト未完了の場合はテストイントロ画面へ
            if (!testCompleted) {
              console.log('テスト未完了ユーザー - テストイントロ画面へ遷移');
              router.push('/(app)/initial-test/intro');
              return;
            }

            console.log('testLevel', testLevel);

            if (testLevel === 'beginner') {
              router.push('/(app)/beginner');
            } else {
              router.push('/(app)/cbt');
            }

            // CBTの今日の目標ページへ遷移
            // console.log(`認証済みユーザー(${userId})をCBT目標ページへ遷移`);
            // router.replace('/(app)/cbt');
          } catch (err) {
            console.error('データベース接続エラー:', err);
            router.push('/(auth)/tutorial');
          }
        })();
      } else {
        // 未認証でオンボーディング完了済みの場合はログイン画面へ
        console.log('未認証ユーザー（オンボーディング完了済み） - ログイン画面へ遷移');
        router.push('/(auth)/login');
      }
    }
  };

  // デバッグ用: 認証状態をクリアする関数
  const clearAuthForTesting = async () => {
    try {
      // より徹底的な認証クリア
      await clearAllAuthData();
      setHasActiveSession(false);
      setUserLevel(null);
      Alert.alert('デバッグ', '認証情報を完全にクリアしました');
    } catch (error) {
      console.error('認証クリアエラー:', error);
      Alert.alert('エラー', '認証クリアに失敗しました');
    }
  };

  // デバッグ用: AsyncStorageの内容を表示
  const showStorageKeys = async () => {
    await debugShowAllStorageKeys();
    Alert.alert('デバッグ', 'コンソールにAsyncStorageの内容を出力しました');
  };

  // デバッグ用: Supabase認証状態を確認
  const checkAuthState = async () => {
    await debugCheckSupabaseAuth();
    Alert.alert('デバッグ', 'コンソールにSupabase認証状態を出力しました');
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
              {!onboardingCompleted ? 'はじめる' : 'あそぶ'}
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

          {/* デバッグ用ボタン群 */}
          <View
            style={{
              position: 'absolute',
              bottom: 20,
              right: 20,
              gap: 5,
            }}>
            {/* 認証クリアボタン */}
            <TouchableOpacity
              onPress={clearAuthForTesting}
              style={{
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                padding: 10,
                borderRadius: 5,
                marginBottom: 5,
              }}>
              <Text style={{ fontSize: 10, color: '#FF0000' }}>Debug: Clear Auth</Text>
            </TouchableOpacity>

            {/* ストレージ確認ボタン */}
            <TouchableOpacity
              onPress={showStorageKeys}
              style={{
                backgroundColor: 'rgba(0, 0, 255, 0.1)',
                padding: 10,
                borderRadius: 5,
                marginBottom: 5,
              }}>
              <Text style={{ fontSize: 10, color: '#0000FF' }}>Debug: Show Storage</Text>
            </TouchableOpacity>

            {/* 認証状態確認ボタン */}
            <TouchableOpacity
              onPress={checkAuthState}
              style={{
                backgroundColor: 'rgba(0, 255, 0, 0.1)',
                padding: 10,
                borderRadius: 5,
              }}>
              <Text style={{ fontSize: 10, color: '#00AA00' }}>Debug: Check Auth</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}
