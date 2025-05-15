import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import authService from '../../src/services/authService';

export default function LogoutScreen() {
  const router = useRouter();
  const [status, setStatus] = useState('processing'); // 'processing', 'complete', 'error'

  useEffect(() => {
    let isMounted = true;
    let navigationTimer: NodeJS.Timeout | null = null;

    // アプリの状態を監視して、バックグラウンドからの復帰時にナビゲーションを試行
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && status === 'complete') {
        navigateToAuth();
      }
    });

    // 認証画面への遷移関数
    const navigateToAuth = () => {
      try {
        router.push('/screens/auth');
      } catch (navError) {
        // 遷移に失敗した場合、再試行
        if (navigationTimer) clearTimeout(navigationTimer);
        navigationTimer = setTimeout(navigateToAuth, 800);
      }
    };

    // ログアウト処理の実行
    const performLogout = async () => {
      try {
        // ログアウト処理
        await authService.signOut();

        if (isMounted) {
          setStatus('complete');
          // 十分な遅延を設けてから遷移
          navigationTimer = setTimeout(navigateToAuth, 1500);
        }
      } catch (error) {
        if (isMounted) {
          setStatus('error');
          navigationTimer = setTimeout(navigateToAuth, 1000);
        }
      }
    };

    // ログアウト処理を実行
    performLogout();

    // クリーンアップ関数
    return () => {
      isMounted = false;
      subscription.remove();
      if (navigationTimer) {
        clearTimeout(navigationTimer);
      }
    };
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
      <ActivityIndicator size='large' color='#E86A33' />
      <Text style={{ marginTop: 20, fontFamily: 'font-mplus', fontSize: 16, color: '#333333' }}>
        {status === 'processing'
          ? 'ログアウトしています...'
          : status === 'complete'
          ? 'ログアウト完了しました'
          : 'ログアウト中にエラーが発生しました'}
      </Text>
    </View>
  );
}
