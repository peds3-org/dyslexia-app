import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// 環境変数の検証
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export interface UserSession {
  id: string;
  email: string;
  created_at: string;
}

// ここにログ出力を制御するオプションを追加
const authOptions = {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce' as 'pkce',
    debug: false, // デバッグログを無効化
  },
  db: {
    schema: 'public'
  }
};

// AsyncStorageを使用してセッションを保存
export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey,
  authOptions
);

// 接続状態の監視
supabase.auth.onAuthStateChange((event, session) => {
  // 重要なイベントのみログ出力
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
    console.log('認証状態変更:', { event, userId: session?.user?.id });
  }
});

export default supabase; 