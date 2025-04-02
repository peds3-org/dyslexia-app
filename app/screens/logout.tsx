import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import authService from '../services/authService';

export default function LogoutScreen() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      try {
        console.log('ログアウト処理を実行します...');
        // ログアウト処理
        await authService.signOut();
        console.log('ログアウト完了、認証画面へ遷移します');
        // 認証画面に遷移
        router.replace('/screens/auth');
      } catch (error) {
        console.error('ログアウトエラー:', error);
      }
    };

    logout();
  }, [router]);

  return (
    <View className='flex-1 justify-center items-center'>
      <ActivityIndicator size='large' color='#E86A33' />
      <Text className='mt-5 font-mplus'>ログアウトしています...</Text>
    </View>
  );
}
