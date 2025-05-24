import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Drawer } from 'expo-router/drawer';
import { Slot, useRouter } from 'expo-router';
import { useColorScheme, View, Text, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
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
console.log('[_layout] Starting app initialization...');
SplashScreen.preventAutoHideAsync().catch((error) => {
  console.error('[_layout] SplashScreen.preventAutoHideAsync error:', error);
});

// 初期化状態管理
const INITIALIZATION_TIMEOUT = 10000; // 10秒
let initializationTimer: NodeJS.Timeout | null = null;


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
  console.log('[RootLayoutNavigation] Component rendering...');
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

  // フォントの読み込み
  const [fontsLoaded, fontError] = useFonts({
    'font-mplus': MPLUSRounded1c_400Regular,
    'font-mplus-bold': MPLUSRounded1c_700Bold,
    'font-yomogi': Yomogi_400Regular,
    'Zen-R': MPLUSRounded1c_400Regular, // LoginBonusModal用
    'Zen-B': MPLUSRounded1c_700Bold, // LoginBonusModal用
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
      console.log('[_layout] initializeApp called, mounted:', mounted);
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
        console.log('[_layout] Initializing auth service...');
        const authInitResult = await authService.initialize();
        console.log('[_layout] Auth init result:', authInitResult);
        if (!authInitResult) {
          throw new Error('認証サービスの初期化に失敗しました');
        }

        // ユーザー状態の確認
        console.log('[_layout] Auth status:', authService.isAuthenticated());
        if (authService.isAuthenticated()) {
          const userId = authService.getUser()?.id;
          console.log('[_layout] User ID:', userId);
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
            // ユーザープロフィールが存在しない場合はinitial-testへ
            console.log('ユーザープロフィールが存在しないため、initial-test画面へリダイレクト');
            setIsAuthenticated(true);
            // 後続の処理でinitial-testへリダイレクトされる
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

        // PGRST116 エラーは新規ユーザーの場合の正常な状態なので、エラーログを出さない
        if (profileError.code === 'PGRST116') {
          console.log('新規ユーザーのためプロフィールが存在しません。正常な状態です。');
          break; // 新規ユーザーの場合はリトライ不要
        }

        // その他のエラーの場合のみログを出力
        console.error(`ユーザープロフィール取得エラー (試行 ${profileRetryCount + 1}/${maxProfileRetries}):`, profileError);
        profileRetryCount++;

        if (profileRetryCount < maxProfileRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (profileError && profileError.code !== 'PGRST116') {
        // PGRST116以外のエラーの場合のみアラートを表示
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
        // ユーザープロフィールが存在しない場合
        // テストが完了していない可能性が高いので、後続の処理でinitial-testへリダイレクトされる
        console.log('ユーザープロフィールが存在しません');
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
        character_level: userProfile?.character_level,
      });


      // テスト状態に応じた画面へ遷移
      redirectToLevelScreen(userState);
    } catch (error) {
      console.error('ナビゲーションエラー:', error);
      router.replace('/');
    }
  }, [router, redirectToLevelScreen]);

  // レベルに応じた画面遷移を行う関数
  const redirectToLevelScreen = useCallback(
    (userState: UserState) => {
      console.log(`レベルに応じた画面に遷移: ${userState.test_level}`);

      // テスト完了状態の厳密なチェック
      if (!userState.test_completed) {
        console.log('テスト未完了状態を検出: initial-testへ遷移します');
        router.replace('/screens/initial-test' as any);
        return;
      }

      // 開発中は一時的にinitial-testへ遷移（テスト用）
      console.log('【開発用】initial-testへ強制遷移');
      router.replace('/screens/initial-test' as any);
      return;

      // ホーム画面へ遷移
      // console.log(`テスト完了済みユーザー - ホーム画面へ遷移`);
      // router.replace('/screens/home' as any);
    },
    [router]
  );


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
      headerTransparent: false,
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
        backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
        elevation: 1,
        shadowOpacity: 0.1,
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
      console.error('ログアウトエラー:', error);
      Alert.alert('エラー', 'ログアウト中にエラーが発生しました。\nアプリを再起動してください。', [
        {
          text: 'OK',
          onPress: () => {
            // エラーが発生してもindex画面へ遷移
            setTimeout(() => router.push('/'), 300);
          },
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [navigation, router]);

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
    [isAuthenticated, isInitializing, hideSplash]
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

  // ホーム画面を使用するため、レベルごとのリダイレクトは無効化
  // useEffect(() => {
  //   const checkUserLevel = async () => {
  //     try {
  //       // AsyncStorageからユーザーレベルを取得
  //       const userLevel = await AsyncStorage.getItem('userLevel');

  //       // ログイン済みの場合、レベルに応じた画面にリダイレクト
  //       if (isAuthenticated) {
  //         // 初期テスト結果に基づいてリダイレクト
  //         if (userLevel === 'intermediate') {
  //           console.log('中級レベルにリダイレクト');
  //           router.replace('/screens/intermediate/index' as any);
  //         } else if (userLevel === 'beginner') {
  //           console.log('初級レベルにリダイレクト');
  //           router.replace('/screens/beginner/index' as any);
  //         }
  //       }
  //     } catch (error) {
  //       console.error('ユーザーレベル取得エラー:', error);
  //     }
  //   };

  //   if (isAuthenticated && !isLoading) {
  //     checkUserLevel();
  //   }
  // }, [isAuthenticated, isLoading, router]);

  // ローディング表示
  if (isLoading || !fontsLoaded) {
    console.log('[RootLayoutNavigation] Showing loading screen...');
    return (
      <SafeAreaProvider>
        <View style={[loadingContainerStyle, { backgroundColor: '#ffffff' }]}>
          <ActivityIndicator size='large' color='#E86A33' style={{ marginBottom: 20 }} />
          <Text style={[loadingTextStyle, { color: '#000000' }]}>読み込み中...</Text>
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
              headerTransparent: true,
              headerStyle: {
                backgroundColor: 'transparent',
                elevation: 0,
                shadowOpacity: 0,
              },
              headerTintColor: '#000000', // メニューボタンを黒に
              headerLeft: () => (
                <TouchableOpacity
                  onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                  style={{
                    marginLeft: 15,
                    padding: 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: 20,
                  }}>
                  <MaterialCommunityIcons name="menu" size={24} color="#000000" />
                </TouchableOpacity>
              ),
            }}
          />
          <Drawer.Screen
            name='screens/home'
            options={{
              title: 'ホーム',
              drawerIcon: ({ color }) => <MaterialCommunityIcons name='home-circle' color={color} size={24} style={{ marginRight: 10 }} />,
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
              headerShown: false,  // ヘッダー全体を非表示（メニューボタンも含む）
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
          {/* ログアウト以下のすべての項目を非表示に */}
          <Drawer.Screen name='types/cbt' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='components/AudioFiles' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='screens/AIDockerGuide' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='screens/AISetupScreen' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='screens/voice-practice' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='screens/onboarding' options={{ drawerItemStyle: { display: 'none' } }} />
        </Drawer>
      </ThemeProvider>

    </SafeAreaProvider>
  );
}

/**
 * アプリケーションのルートレイアウト
 */
export default function RootLayout() {
  console.log('[RootLayout] Component rendering...');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // スプラッシュスクリーンを非表示にする関数
  const hideSplash = useCallback(async () => {
    console.log('[RootLayout] hideSplash called');
    try {
      await SplashScreen.hideAsync();
      console.log('[RootLayout] SplashScreen hidden successfully');
    } catch (e) {
      console.error('[RootLayout] SplashScreen hide error:', e);
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
    [isAuthenticated, isInitializing, hideSplash]
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
    console.log('[RootLayout] Initial splash check...');
    // アプリ起動時にスプラッシュを確認
    const checkSplash = async () => {
      try {
        // Androidでの問題を避けるために少し遅延を入れる
        await new Promise(resolve => setTimeout(resolve, 100));
        await SplashScreen.hideAsync();
        console.log('[RootLayout] Initial splash hidden');
      } catch (e) {
        console.log('[RootLayout] Initial splash check error:', e);
      }
    };

    checkSplash();
  }, []);

  console.log('[RootLayout] Rendering GestureHandlerRootView...');
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#ffffff' }}>
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
