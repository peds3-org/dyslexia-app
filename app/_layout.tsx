import React, { useEffect } from 'react';
import { Slot } from 'expo-router';
import { useColorScheme, View, Text } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// サービス
import { progressService, soundService, authService, voiceService, aiService } from '@src/services';
import practiceStorageService from '@src/services/practiceStorageService';

// フォント
import { MPLUSRounded1c_400Regular, MPLUSRounded1c_700Bold } from '@expo-google-fonts/m-plus-rounded-1c';
import { Yomogi_400Regular } from '@expo-google-fonts/yomogi';

// スプラッシュスクリーン設定
SplashScreen.preventAutoHideAsync().catch((error) => {
  console.error('[_layout] SplashScreen.preventAutoHideAsync error:', error);
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // フォントの読み込み
  const [fontsLoaded, fontError] = useFonts({
    'font-mplus': MPLUSRounded1c_400Regular,
    'font-mplus-bold': MPLUSRounded1c_700Bold,
    'font-yomogi': Yomogi_400Regular,
    'Zen-R': MPLUSRounded1c_400Regular, // LoginBonusModal用
    'Zen-B': MPLUSRounded1c_700Bold, // LoginBonusModal用
  });

  // サービスの初期化
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // 認証サービスの初期化
        await authService.initialize();
        
        // その他のサービスの初期化
        await progressService.initialize();
        await soundService.initialize();
        await voiceService.ensureInitialized();
        
        // AIサービスの初期化（非同期で実行）
        // モデルが既にダウンロード済みの場合のみ初期化
        aiService.initialize().then((initialized: boolean) => {
          if (initialized) {
            console.log('アプリ起動時: AIサービスの初期化が完了しました');
          } else {
            console.log('アプリ起動時: AIモデルが見つかりません（後でダウンロードが必要）');
          }
        }).catch((error: any) => {
          console.error('アプリ起動時: AIサービス初期化エラー:', error);
        });
        
        // 古い練習データのクリーンアップ（非同期で実行）
        const user = authService.getUser();
        if (user?.id) {
          practiceStorageService.cleanupOldData(user.id).catch(error => {
            console.error('古いデータのクリーンアップエラー:', error);
          });
        }
      } catch (error) {
        console.error('サービス初期化エラー:', error);
      }
    };

    initializeServices();
  }, []);

  // フォント読み込み完了後にスプラッシュを非表示
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ThemeProvider value={theme}>
        <Slot />
      </ThemeProvider>
    </SafeAreaProvider>
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