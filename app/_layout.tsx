import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Drawer } from 'expo-router/drawer';
import { Slot, useRouter } from 'expo-router';
import { useColorScheme, View, Text, ActivityIndicator, Alert } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// サービス
import { progressService, soundService, authService, voiceService } from '@src/services';
import { supabase } from '@src/lib/supabase';

// フォント
import { MPLUSRounded1c_400Regular, MPLUSRounded1c_700Bold } from '@expo-google-fonts/m-plus-rounded-1c';
import { Yomogi_400Regular } from '@expo-google-fonts/yomogi';

// 定数
const FONT_TIMEOUT = 5000;
const SPLASH_TIMEOUT = 10000;

// グローバルフラグ - Strictモードでの二重初期化防止のため
let isGlobalInitialized = false;
let initializeStarted = false;
let authInitialized = false; // 認証サービス初期化フラグ

// 初期ルート設定
export const unstable_settings = {
  initialRouteName: 'index',
};

// スプラッシュスクリーン設定
SplashScreen.preventAutoHideAsync().catch(() => {
  /* スプラッシュスクリーン自動非表示防止に失敗 */
});

// 初期化状態管理
const INITIALIZATION_TIMEOUT = 10000; // 10秒
let initializationTimer: NodeJS.Timeout | null = null;

import LoginBonus from './components/LoginBonus';

// ユーザー状態とテスト結果の型定義
interface UserState {
  test_completed: boolean;
  test_level: string;
}

interface TestResult {
  is_completed: boolean;
  level: string;
}

// メインメニューの項目
const MENU_ITEMS = [
  { name: 'はじめてがくしゅう', route: '/screens/beginner', icon: 'school' },
  { name: 'ちょっとむずかしい', route: '/screens/intermediate', icon: 'arm-flex' },
  { name: 'あいさつ', route: '/screens/dictionary', icon: 'book-open-variant' },
  { name: 'しんちょく', route: '/screens/progress', icon: 'chart-line' },
  { name: 'もじのれんしゅう', route: '/screens/tutorial', icon: 'teach' },
  { name: 'おんせいれんしゅう', route: '/screens/voice-practice', icon: 'microphone' },
  { name: 'AIせっていする', route: '/screens/AISetupScreen', icon: 'robot' },
  { name: 'ログアウト', route: '/screens/logout', icon: 'exit-to-app' },
];

/**
 * アプリケーションの初期化と認証状態に基づいたレイアウトを提供
 */
function RootLayoutNavigation() {
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  // 状態管理
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showLoginBonus, setShowLoginBonus] = useState(false);

  // フォントの読み込み
  const [fontsLoaded, fontError] = useFonts({
    'font-mplus': MPLUSRounded1c_400Regular,
    'font-mplus-bold': MPLUSRounded1c_700Bold,
    'font-yomogi': Yomogi_400Regular,
  });

  // スプラッシュスクリーンを非表示にする関数
  const hideSplash = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
    } catch (e) {
      /* スプラッシュスクリーン非表示エラー */
    }
  }, []);

  // フォントの読み込み状態を監視
  useEffect(() => {
    if (fontError) {
      // フォントエラー時でも初期化を継続
      setIsLoading(false);
      SplashScreen.hideAsync().catch(() => {
        // 強制非表示を試行
        hideSplash();
      });
    }

    if (fontsLoaded) {
      // フォントが読み込まれたら初期化を進める
      setIsLoading(false);
    }
  }, [fontsLoaded, fontError]);

  // 初期化処理の改善
  const initializeApp = useCallback(
    async (mounted: boolean) => {
      try {
        // タイムアウトタイマーの設定
        initializationTimer = setTimeout(() => {
          if (mounted) {
            setIsInitialized(true);
            setIsInitializing(false);
            setIsAuthenticated(false);
            hideSplash();
          }
        }, INITIALIZATION_TIMEOUT);

        // 認証サービスの初期化
        const authInitResult = await authService.initialize();
        if (!authInitResult) {
          throw new Error('認証サービスの初期化に失敗しました');
        }

        // ユーザー状態の確認
        if (authService.isAuthenticated()) {
          const userId = authService.getUser()?.id;
          if (!userId) {
            throw new Error('ユーザーIDが取得できません');
          }

          // ユーザー状態の取得
          let userState = {
            test_completed: false,
            test_level: 'beginner',
          };

          // ユーザープロフィールの取得
          let userProfile = null;
          let profileError = null;
          let profileRetryCount = 0;
          const maxProfileRetries = 3;

          while (profileRetryCount < maxProfileRetries) {
            const result = await supabase.from('user_profiles').select('character_level, character_exp, display_name').eq('user_id', userId).single();

            userProfile = result.data;
            profileError = result.error;

            if (!profileError) {
              break;
            }

            profileRetryCount++;

            if (profileRetryCount < maxProfileRetries) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }

          if (profileError) {
            Alert.alert('エラー', 'ユーザー情報の取得に失敗しました。再度ログインしてください。', [
              {
                text: 'OK',
                onPress: async () => {
                  await authService.signOut();
                  router.replace('/');
                },
              },
            ]);
            return;
          }

          if (!userProfile) {
            console.error('ユーザープロフィールが取得できませんでした');
            Alert.alert('エラー', 'ユーザー情報が見つかりません。もう一度ログインしてください。', [
              {
                text: 'OK',
                onPress: async () => {
                  await authService.signOut();
                  router.replace('/');
                },
              },
            ]);
            return;
          }

          // テスト情報の取得
          let { data: testResult, error: testError } = await supabase
            .from('initial_test_results')
            .select('is_completed, level')
            .eq('user_id', userId)
            .single();

          if (testError && testError.code !== 'PGRST116') {
            console.error('テスト結果取得エラー:', testError);
          }

          // ユーザー状態を更新
          if (testResult) {
            userState.test_completed = testResult.is_completed;
            userState.test_level = testResult.level;
          }

          console.log('ユーザー状態:', {
            test_completed: userState.test_completed,
            test_level: userState.test_level,
            character_level: userProfile.character_level,
          });

          setIsAuthenticated(true);
        }

        // サービスの順次初期化
        console.log('サービスの初期化を開始します');

        try {
          // Progress Serviceの初期化（リトライロジック付き）
          let retryCount = 0;
          const maxRetries = 3;
          const initializeProgressService = async () => {
            try {
              await progressService.initialize();
              console.log('Progress Service initialized successfully');
            } catch (error) {
              console.error('Progress Service initialization error:', error);
              if (retryCount < maxRetries) {
                retryCount++;
                const delay = retryCount * 2000; // 2秒、4秒、6秒と増加
                console.log(`Retrying Progress Service initialization (${retryCount}/${maxRetries}) after ${delay}ms`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                return initializeProgressService();
              }
              throw error;
            }
          };

          await initializeProgressService();

          // Sound Serviceの初期化
          await soundService.initialize();
          console.log('Sound Service initialized');

          // Voice Serviceの初期化
          await voiceService.ensureInitialized();
          console.log('Voice Service initialized');

          // 効果音の再生（初期化完了後）
          if (soundService.isInitialized()) {
            await soundService.playEffect('click');
          }

          if (mounted) {
            setIsInitialized(true);
            setIsInitializing(false);
            hideSplash();
          }
        } catch (error) {
          console.error('サービス初期化エラー:', error);
          if (mounted) {
            setIsInitialized(true);
            setIsInitializing(false);
            setIsAuthenticated(false);
            hideSplash();
          }
        }
      } catch (error) {
        console.error('アプリケーション初期化エラー:', error);
        if (mounted) {
          setIsInitialized(true);
          setIsInitializing(false);
          setIsAuthenticated(false);
          hideSplash();
        }
      } finally {
        if (initializationTimer) {
          clearTimeout(initializationTimer);
          initializationTimer = null;
        }
      }
    },
    [hideSplash]
  );

  // 初期化の実行
  useEffect(() => {
    let mounted = true;

    if (!isInitialized && !isInitializing) {
      setIsInitializing(true);
      initializeApp(mounted);
    }

    return () => {
      mounted = false;
      if (initializationTimer) {
        clearTimeout(initializationTimer);
        initializationTimer = null;
      }
    };
  }, [isInitialized, isInitializing, initializeApp]);

  // 認証状態の変更を監視
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const isAuthed = !!session?.user?.id;
      // まず状態を更新
      setIsAuthenticated(isAuthed);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // ナビゲーション処理 - useCallbackで関数を最適化
  const navigateBasedOnUserState = useCallback(async () => {
    console.log('ユーザー状態に基づくナビゲーション開始');

    try {
      // 認証チェック
      if (!authService.isAuthenticated()) {
        console.log('未認証のためログイン画面へリダイレクト');
        router.replace('/');
        return;
      }

      // ユーザーIDの取得
      const user = authService.getUser();
      const userId = user?.id;
      if (!userId) {
        console.error('ユーザーIDの取得に失敗しました');
        authService.signOut();
        router.replace('/');
        return;
      }

      console.log('ユーザー状態取得中...', { userId });

      // ユーザー状態の取得
      let userState = {
        test_completed: false,
        test_level: 'beginner',
      };

      // ユーザープロフィールの取得
      let userProfile = null;
      let profileError = null;
      let profileRetryCount = 0;
      const maxProfileRetries = 3;

      while (profileRetryCount < maxProfileRetries) {
        const result = await supabase.from('user_profiles').select('character_level, character_exp, display_name').eq('user_id', userId).single();

        userProfile = result.data;
        profileError = result.error;

        if (!profileError) {
          console.log('ユーザープロフィール取得成功:', {
            display_name: userProfile?.display_name,
            character_level: userProfile?.character_level,
          });
          break;
        }

        console.error(`ユーザープロフィール取得エラー (試行 ${profileRetryCount + 1}/${maxProfileRetries}):`, profileError);
        profileRetryCount++;

        if (profileRetryCount < maxProfileRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (profileError) {
        console.error('ユーザープロフィール取得に最終的に失敗しました:', profileError);
        Alert.alert('エラー', 'ユーザー情報の取得に失敗しました。再度ログインしてください。', [
          {
            text: 'OK',
            onPress: async () => {
              await authService.signOut();
              router.replace('/');
            },
          },
        ]);
        return;
      }

      if (!userProfile) {
        console.error('ユーザープロフィールが取得できませんでした');
        Alert.alert('エラー', 'ユーザー情報が見つかりません。もう一度ログインしてください。', [
          {
            text: 'OK',
            onPress: async () => {
              await authService.signOut();
              router.replace('/');
            },
          },
        ]);
        return;
      }

      // テスト情報の取得
      let { data: testResult, error: testError } = await supabase
        .from('initial_test_results')
        .select('is_completed, level')
        .eq('user_id', userId)
        .single();

      if (testError && testError.code !== 'PGRST116') {
        console.error('テスト結果取得エラー:', testError);
      }

      // ユーザー状態を更新
      if (testResult) {
        userState.test_completed = testResult.is_completed;
        userState.test_level = testResult.level;
      }

      console.log('ユーザー状態:', {
        test_completed: userState.test_completed,
        test_level: userState.test_level,
        character_level: userProfile.character_level,
      });

      // ログインボーナスを表示（今日のログイン履歴があるか確認）
      const today = new Date().toISOString().split('T')[0];
      const { data: todayLogin, error: loginError } = await supabase
        .from('login_history')
        .select('id')
        .eq('user_id', userId)
        .eq('login_date', today)
        .maybeSingle();

      // 今日のログイン履歴がなければログインボーナスを表示
      if (!todayLogin) {
        setShowLoginBonus(true);
        // ログインボーナス表示中は他の画面遷移を待機
        // 処理はログインボーナスコンポーネントのonClose時に続行
        return;
      }

      // レベルに応じた画面に遷移
      redirectToLevelScreen(userState, testResult);
    } catch (error) {
      console.error('ナビゲーションエラー:', error);
      router.replace('/');
    }
  }, [router]);

  // レベルに応じた画面遷移を行う関数
  const redirectToLevelScreen = useCallback(
    (userState: UserState, testResult: TestResult | null) => {
      console.log(`レベルに応じた画面に遷移: ${userState.test_level}`);

      // テスト完了状態の厳密なチェック
      if (!userState.test_completed) {
        console.log('テスト未完了状態を検出: initial-testへ遷移します');
        router.replace('/screens/initial-test' as any);
        return;
      }

      // レベルに基づいたナビゲーション
      if (userState.test_level === 'intermediate') {
        router.replace('/screens/intermediate' as any);
      } else {
        router.replace('/screens/beginner' as any);
      }
    },
    [router]
  );

  // ログインボーナスを閉じた後の処理
  const handleLoginBonusClose = () => {
    setShowLoginBonus(false);

    // ユーザー状態の再取得とレベルに応じた画面遷移
    (async () => {
      try {
        const userId = authService.getUser()?.id;
        if (!userId) return;

        // テスト情報の取得
        let { data: testResult, error: testError } = await supabase
          .from('initial_test_results')
          .select('is_completed, level')
          .eq('user_id', userId)
          .single();

        // ユーザー状態を更新
        let userState = {
          test_completed: false,
          test_level: 'beginner',
        };

        if (testResult) {
          userState.test_completed = testResult.is_completed;
          userState.test_level = testResult.level;
        }

        // レベルに応じた画面に遷移
        redirectToLevelScreen(userState, testResult);
      } catch (error) {
        console.error('ログインボーナス後の遷移エラー:', error);
        router.replace('/');
      }
    })();
  };

  // 認証時のナビゲーション初期化
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigateBasedOnUserState();
    }
  }, [isAuthenticated, isLoading, navigateBasedOnUserState]);

  // テーマ設定 - useMemoで計算を最適化
  const theme = useMemo(() => (colorScheme === 'dark' ? DarkTheme : DefaultTheme), [colorScheme]);

  // ドロア設定 - useMemoでオブジェクトを最適化
  const drawerScreenOptions = useMemo(
    () => ({
      headerShown: true,
      headerTransparent: true,
      headerTitle: '',
      headerTintColor: isDark ? '#FFFFFF' : '#000000',
      headerTitleStyle: {
        fontFamily: 'font-mplus',
      },
      drawerStyle: {
        backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
        width: 280,
      },
      drawerActiveTintColor: '#E86A33',
      drawerInactiveTintColor: isDark ? '#666666' : '#999999',
      drawerLabelStyle: {
        fontSize: 16,
        fontFamily: 'font-mplus',
        marginLeft: -16,
      },
      headerStyle: {
        backgroundColor: 'transparent',
        elevation: 0,
        shadowOpacity: 0,
      },
      headerLeftContainerStyle: {
        paddingLeft: 15,
      },
      headerRightContainerStyle: {
        paddingRight: 15,
      },
    }),
    [isDark]
  );

  // ローディング表示の初期スタイル定義を修正
  const initialLoadingStyle = {
    flex: 1,
    backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  };

  // ローディング表示 - useMemoでスタイルを最適化
  const loadingContainerStyle = useMemo(() => initialLoadingStyle, [isDark]);

  const loadingTextStyle = useMemo(
    () => ({
      fontFamily: 'System',
      fontSize: 16,
      color: isDark ? '#FFFFFF' : '#000000',
      textAlign: 'center' as const,
    }),
    [isDark]
  );

  // ログアウト処理 - useCallbackで関数を最適化
  const handleLogout = useCallback(async () => {
    navigation.dispatch(DrawerActions.closeDrawer());
    setIsLoading(true);
    try {
      // サウンドとボイスのクリーンアップ
      await soundService.stopBGM();
      await voiceService.cleanup();

      // 先に状態のリセット（認証状態やアプリ状態をクリア）
      setIsAuthenticated(false);
      setIsInitialized(false);

      // ユーザーIDを取得（クリーンアップ用）
      const userId = authService.getUser()?.id;
      if (userId) {
        try {
          // トレーニング統計のクリーンアップ (重要でない処理はログアウト前に実行)
          await supabase
            .from('training_stats')
            .update({
              total_minutes: 0,
              streak_count: 0,
              longest_streak: 0,
              perfect_days: 0,
              average_accuracy: 0,
              experience: 0,
              level: 1,
              rank: '下忍',
            })
            .eq('user_id', userId);
        } catch (statsError) {
          console.error('トレーニング統計のリセットエラー:', statsError);
        }
      }

      // ログアウト処理 - ここでnavigate前のセッションクリア
      await authService.signOut();

      // ドロワーが完全に閉じてから遷移するための遅延
      setTimeout(() => {
        router.push('/');
      }, 300);
    } catch (error) {
      // エラー時のフォールバック
      Alert.alert('エラー', 'ログアウト中にエラーが発生しました。\nアプリを再起動してください。', [
        {
          text: 'OK',
          onPress: () => {
            // ここでもまず状態リセットを行う
            setIsAuthenticated(false);
            setIsInitialized(false);
            setTimeout(() => router.push('/'), 300);
          },
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [navigation, router, setIsAuthenticated, setIsInitialized]);

  // アプリの状態変更のハンドラー
  const handleAppStateChange = useCallback(
    (nextAppState: string) => {
      // アプリがアクティブになった場合（バックグラウンドから復帰など）
      if (nextAppState === 'active') {
        // スプラッシュが残っていれば隠す
        hideSplash();

        // 認証状態を再確認
        if (authService.isInitialized() && !isInitializing) {
          const isAuthed = authService.isAuthenticated();
          if (isAuthed !== isAuthenticated) {
            setIsAuthenticated(isAuthed);
          }
        }

        // 音声サービスの再開
        if (soundService) {
          // サウンドが確実に初期化されていることを確認してからBGMを再生
          (async () => {
            try {
              if (!soundService.isInitialized()) {
                await soundService.initialize();
              }
              await soundService.stopBGM();
              await soundService.playBGM('menu');
            } catch (e) {
              console.error('アプリアクティブ時のBGM再生エラー:', e);
            }
          })();
        }
      }
      // アプリが非アクティブになった場合（バックグラウンドへの移行など）
      else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // 音声リソースのクリーンアップ
        if (voiceService) {
          voiceService.cleanup();
        }

        if (soundService) {
          soundService.stopBGM();
        }
      }
    },
    [isAuthenticated, isInitializing, hideSplash, setIsAuthenticated]
  );

  // AppStateの変更を監視
  useEffect(() => {
    // Strictモードによる重複実行を防止するためのフラグ
    let mounted = true;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (mounted) {
        handleAppStateChange(nextAppState);
      }
    });

    // 初期起動時にアクティブイベントを一度発火させる
    if (mounted && !isGlobalInitialized) {
      handleAppStateChange('active');
    }

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [handleAppStateChange]);

  useEffect(() => {
    // アプリ起動時にスプラッシュを確認
    const checkSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.log('初期スプラッシュチェックエラー:', e);
      }
    };

    checkSplash();
  }, []);

  useEffect(() => {
    const checkUserLevel = async () => {
      try {
        // AsyncStorageからユーザーレベルを取得
        const userLevel = await AsyncStorage.getItem('userLevel');

        // ログイン済みの場合、レベルに応じた画面にリダイレクト
        if (isAuthenticated) {
          // 初期テスト結果に基づいてリダイレクト
          if (userLevel === 'intermediate') {
            console.log('中級レベルにリダイレクト');
            router.replace('/screens/intermediate' as any);
          } else if (userLevel === 'beginner') {
            console.log('初級レベルにリダイレクト');
            router.replace('/screens/beginner' as any);
          }
        }
      } catch (error) {
        console.error('ユーザーレベル取得エラー:', error);
      }
    };

    if (isAuthenticated && !isLoading) {
      checkUserLevel();
    }
  }, [isAuthenticated, isLoading, router]);

  // ローディング表示
  if (isLoading || !fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={loadingContainerStyle}>
          <ActivityIndicator size='large' color='#E86A33' style={{ marginBottom: 20 }} />
          <Text style={loadingTextStyle}>読み込み中...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  // 未認証の場合: 認証画面を表示
  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={{ flex: 1, backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }}>
          <Slot />
        </View>
      </SafeAreaProvider>
    );
  }

  // 認証済みの場合: Drawerメニューと画面を表示
  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ThemeProvider value={theme}>
        <Drawer initialRouteName='index' screenOptions={drawerScreenOptions}>
          <Drawer.Screen
            name='index'
            options={{
              title: 'とっぷ',
              drawerIcon: ({ color }) => <MaterialCommunityIcons name='home' color={color} size={24} style={{ marginRight: 10 }} />,
            }}
          />
          <Drawer.Screen
            name='screens/dictionary'
            options={{
              title: 'ことばのずかん',
              drawerIcon: ({ color }) => <MaterialCommunityIcons name='book-open-variant' color={color} size={24} style={{ marginRight: 10 }} />,
            }}
          />
          <Drawer.Screen
            name='screens/progress'
            options={{
              title: 'しゅぎょうのきろく',
              drawerIcon: ({ color }) => <MaterialCommunityIcons name='chart-line' color={color} size={24} style={{ marginRight: 10 }} />,
            }}
          />
          <Drawer.Screen
            name='screens/initial-test'
            options={{
              title: 'はじめのテスト',
              drawerIcon: ({ color }) => <MaterialCommunityIcons name='microphone' color={color} size={24} style={{ marginRight: 10 }} />,
            }}
          />
          <Drawer.Screen
            name='screens/logout'
            options={{
              title: 'ログアウト',
              drawerIcon: ({ color }) => <MaterialCommunityIcons name='logout' color={color} size={24} style={{ marginRight: 10 }} />,
              drawerItemStyle: {
                marginTop: 'auto',
                borderTopWidth: 1,
                borderTopColor: isDark ? '#333333' : '#E0E0E0',
                paddingTop: 8,
              },
            }}
            listeners={() => ({
              drawerItemPress: handleLogout,
            })}
          />
          <Drawer.Screen
            name='screens/VoicePractice'
            options={{
              drawerItemStyle: { display: 'none' },
            }}
          />
          <Drawer.Screen
            name='screens/beginner'
            options={{
              drawerItemStyle: { display: 'none' },
            }}
          />

          <Drawer.Screen
            name='screens/intermediate'
            options={{
              drawerItemStyle: { display: 'none' },
            }}
          />
          <Drawer.Screen name='screens/tutorial' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='screens/auth' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='screens/intro' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='screens/advanced' options={{ drawerItemStyle: { display: 'none' } }} />

          <Drawer.Screen name='modal' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='+not-found' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='types/sound' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='types/common' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='types/progress' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='config/stageConfig' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='components/GameScreen' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='components/StoryScreen' options={{ drawerItemStyle: { display: 'none' } }} />

          {/* ログアウト以下のすべての項目を非表示に */}
          <Drawer.Screen name='services/aiService' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='types/cbt' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='components/AudioFiles' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='components/LoginBonus' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='screens/AIDockerGuide' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='screens/AISetupScreen' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='screens/voice-practice' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='components/VoiceRecognition' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='components/AIVoiceRecognition' options={{ drawerItemStyle: { display: 'none' } }} />
        </Drawer>
      </ThemeProvider>

      {/* ログインボーナスモーダル */}
      <LoginBonus visible={showLoginBonus} onClose={handleLoginBonusClose} />
    </SafeAreaProvider>
  );
}

/**
 * アプリケーションのルートレイアウト
 */
export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // スプラッシュスクリーンを非表示にする関数
  const hideSplash = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
      console.log('スプラッシュスクリーン非表示完了');
    } catch (e) {
      console.error('スプラッシュスクリーン非表示エラー:', e);
    }
  }, []);

  // 音声設定の初期化 - useCallbackで最適化
  const cleanupVoiceResources = useCallback(async () => {
    console.log('アプリがバックグラウンドに移行 - 音声リソースをクリーンアップ');
    try {
      await voiceService.cleanup();
      console.log('バックグラウンド移行時のクリーンアップ完了');
    } catch (error) {
      console.error('バックグラウンド移行時のクリーンアップエラー:', error);
    }

    soundService.stopBGM();
  }, []);

  // アプリの状態変更のハンドラー
  const handleAppStateChange = useCallback(
    (nextAppState: string) => {
      // アプリがアクティブになった場合（バックグラウンドから復帰など）
      if (nextAppState === 'active') {
        // スプラッシュが残っていれば隠す
        hideSplash();

        // 認証状態を再確認
        if (authService.isInitialized() && !isInitializing) {
          const isAuthed = authService.isAuthenticated();
          if (isAuthed !== isAuthenticated) {
            setIsAuthenticated(isAuthed);
          }
        }

        // 音声サービスの再開
        if (soundService) {
          // サウンドが確実に初期化されていることを確認してからBGMを再生
          (async () => {
            try {
              if (!soundService.isInitialized()) {
                await soundService.initialize();
              }
              await soundService.stopBGM();
              await soundService.playBGM('menu');
            } catch (e) {
              console.error('アプリアクティブ時のBGM再生エラー:', e);
            }
          })();
        }
      }
      // アプリが非アクティブになった場合（バックグラウンドへの移行など）
      else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // 音声リソースのクリーンアップ
        if (voiceService) {
          voiceService.cleanup();
        }

        if (soundService) {
          soundService.stopBGM();
        }
      }
    },
    [isAuthenticated, isInitializing, hideSplash, setIsAuthenticated]
  );

  // AppStateの変更を監視
  useEffect(() => {
    // Strictモードによる重複実行を防止するためのフラグ
    let mounted = true;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (mounted) {
        handleAppStateChange(nextAppState);
      }
    });

    // 初期起動時にアクティブイベントを一度発火させる
    if (mounted && !isGlobalInitialized) {
      handleAppStateChange('active');
    }

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [handleAppStateChange]);

  useEffect(() => {
    // アプリ起動時にスプラッシュを確認
    const checkSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.log('初期スプラッシュチェックエラー:', e);
      }
    };

    checkSplash();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RootLayoutNavigation />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * エラー境界コンポーネント
 */
export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>エラーが発生しました</Text>
      <Text style={{ color: '#666666', textAlign: 'center' }}>{error.message}</Text>
    </View>
  );
}
