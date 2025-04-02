import React, { useEffect, useState } from 'react';
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

// サービス
import progressService from '@src/services/progressService';
import soundService from '@src/services/soundService';
import authService from '@src/services/authService';
import voiceService from '@src/services/voiceService';
import { supabase } from '@src/lib/supabase';

// フォント
import { MPLUSRounded1c_400Regular, MPLUSRounded1c_700Bold } from '@expo-google-fonts/m-plus-rounded-1c';
import { Yomogi_400Regular } from '@expo-google-fonts/yomogi';

// スプラッシュスクリーン設定
SplashScreen.preventAutoHideAsync().catch(() => {});

// 初期ルート設定
export const unstable_settings = {
  initialRouteName: 'index',
};

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

  // フォントの読み込み
  const [fontsLoaded, fontError] = useFonts({
    'font-mplus': MPLUSRounded1c_400Regular,
    'font-mplus-bold': MPLUSRounded1c_700Bold,
    'font-yomogi': Yomogi_400Regular,
  });

  // フォントの読み込み状態を監視
  useEffect(() => {
    if (fontError) {
      console.error('フォント読み込みエラー:', fontError);
    }

    if (fontsLoaded) {
      console.log('フォント読み込み完了');
    }
  }, [fontsLoaded, fontError]);

  // スプラッシュスクリーンを非表示にする
  const hideSplash = async () => {
    if (isLoading) {
      setIsLoading(false);
      try {
        await SplashScreen.hideAsync();
        console.log('スプラッシュスクリーン非表示完了');
      } catch (e) {
        console.error('スプラッシュスクリーン非表示エラー:', e);
      }
    }
  };

  // アプリケーション初期化
  useEffect(() => {
    // フォントが読み込まれるまで初期化しない
    if (!fontsLoaded) return;

    let mounted = true;

    // 通常の初期化プロセス
    const initialize = async () => {
      try {
        console.log('アプリ初期化開始');

        // 1. 認証サービスの初期化
        const authInitialized = await authService.initialize();
        if (!mounted) return;
        console.log('認証サービス初期化完了:', { initialized: authInitialized });

        // 2. 認証状態の設定
        const isAuthed = authService.isAuthenticated();
        setIsAuthenticated(isAuthed);
        console.log('認証状態設定:', { isAuthenticated: isAuthed });

        // 3. 認証されていない場合はログイン画面に遷移
        if (!isAuthed) {
          setIsInitialized(true);
          hideSplash();
          return;
        }

        // 4. サービスの初期化
        console.log('各種サービス初期化開始');
        try {
          await progressService.initialize();
          console.log('ProgressService初期化完了');
        } catch (e) {
          console.error('ProgressService初期化エラー:', e);
        }

        if (!mounted) return;

        try {
          await soundService.loadSounds();
          console.log('SoundService初期化完了');
        } catch (e) {
          console.error('SoundService初期化エラー:', e);
        }

        if (!mounted) return;

        // 5. ユーザー状態の確認
        const userId = authService.getUser()?.id;
        if (!userId) {
          console.error('ユーザーIDが取得できません');
          await authService.signOut();
          setIsAuthenticated(false);
          setIsInitialized(true);
          hideSplash();
          return;
        }

        console.log('ユーザー状態確認:', { userId });
        const { data: userData, error: userError } = await supabase
          .from('user_state')
          .select('test_completed, test_level')
          .eq('user_id', userId)
          .single();

        if (!mounted) return;

        if (userError || !userData) {
          console.error('ユーザー状態取得エラー:', userError);
          // ユーザー状態が存在しない場合はログアウト
          await authService.signOut();
          setIsAuthenticated(false);
          setIsInitialized(true);
          hideSplash();
          return;
        }

        console.log('ユーザー状態確認完了:', userData);
        setIsInitialized(true);
        hideSplash();
      } catch (error) {
        console.error('初期化エラー:', error);
        if (mounted) {
          Alert.alert('エラー', '初期化中にエラーが発生しました。再起動してください。');
          setIsInitialized(true);
          setIsAuthenticated(false);
          hideSplash();
        }
      }
    };

    // 安全策: 10秒後にスプラッシュスクリーンを強制的に非表示
    const splashTimeout = setTimeout(() => {
      if (mounted && isLoading) {
        console.log('タイムアウトによるスプラッシュスクリーン強制非表示');
        setIsInitialized(true);
        hideSplash();
      }
    }, 10000);

    initialize();

    return () => {
      mounted = false;
      clearTimeout(splashTimeout);
      soundService.stopBGM();
    };
  }, [fontsLoaded, router]);

  // 認証状態の変更を監視
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const isAuthed = !!session?.user?.id;
      console.log('認証状態変更検知:', { event, userId: session?.user?.id });

      setIsAuthenticated(isAuthed);

      if (!isAuthed && event === 'SIGNED_OUT') {
        router.replace('/'); // indexへ遷移
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // ナビゲーション
  useEffect(() => {
    const navigate = async () => {
      if (!isInitialized) return;

      try {
        if (!isAuthenticated) {
          console.log('未認証状態: indexへ遷移またはそのまま表示');
          return; // 未認証の場合は強制リダイレクトしない
        }

        // ユーザー状態の確認
        const userId = authService.getUser()?.id;
        if (!userId) {
          console.log('ユーザーID取得不可: 再認証が必要');
          return; // 強制リダイレクトしない
        }

        const { data: userData, error: userError } = await supabase
          .from('user_state')
          .select('test_completed, test_level')
          .eq('user_id', userId)
          .single();

        if (userError || !userData) {
          console.log('ユーザー状態なし: 再認証が必要');
          return; // 強制リダイレクトしない
        }

        // 適切な画面への遷移
        if (!userData.test_completed) {
          console.log('初期テスト未完了: テスト画面へ遷移');
          await router.replace('/screens/initial-test');
        } else {
          const targetScreen = userData.test_level === 'intermediate' ? '/screens/intermediate' : '/screens/beginner';
          console.log(`レベルに応じた画面へ遷移: ${targetScreen}`);
          await router.replace(targetScreen);
        }
      } catch (error) {
        console.error('ナビゲーションエラー:', error);
        // エラー時も強制リダイレクトしない
      }
    };

    navigate();
  }, [isInitialized, isAuthenticated, router]);

  // ローディング表示
  if (isLoading || !fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}>
          <ActivityIndicator size='large' color='#E86A33' style={{ marginBottom: 20 }} />
          <Text
            style={{
              fontFamily: 'System',
              fontSize: 16,
              color: isDark ? '#FFFFFF' : '#000000',
              textAlign: 'center',
            }}>
            読み込み中...
          </Text>
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
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Drawer
          initialRouteName='index'
          screenOptions={{
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
          }}>
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
              drawerItemPress: async () => {
                navigation.dispatch(DrawerActions.closeDrawer());
                try {
                  await authService.signOut();
                  router.replace('/'); // indexページへ遷移
                } catch (error) {
                  console.error('ログアウトエラー:', error);
                }
              },
            })}
          />
          <Drawer.Screen name='modal' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='screens/auth' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='screens/intro' options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name='+not-found' options={{ drawerItemStyle: { display: 'none' } }} />
        </Drawer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/**
 * アプリケーションのルートレイアウト
 */
export default function RootLayout() {
  // 音声設定の初期化
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch((error) => console.error('音声設定エラー:', error));

    // アプリのフォアグラウンド・バックグラウンド状態変化を検知
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      console.log('アプリの状態変化:', nextAppState);

      // バックグラウンドに移行する場合は音声リソースをクリーンアップ
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('アプリがバックグラウンドに移行 - 音声リソースをクリーンアップ');
        voiceService
          .cleanup()
          .then(() => console.log('バックグラウンド移行時のクリーンアップ完了'))
          .catch((error) => console.error('バックグラウンド移行時のクリーンアップエラー:', error));

        soundService.stopBGM();
      }
    });

    return () => {
      // イベントリスナーの解除
      subscription.remove();

      // 最終クリーンアップ
      soundService.stopBGM();
      voiceService
        .cleanup()
        .then(() => console.log('アプリ終了時のクリーンアップ完了'))
        .catch((error) => console.error('アプリ終了時のクリーンアップエラー:', error));
    };
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
