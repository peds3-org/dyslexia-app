import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// 環境変数の検証
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || Constants.expoConfig?.extra?.supabaseUrl || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || Constants.expoConfig?.extra?.supabaseAnonKey || '';

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

export interface UserSession {
  id: string;
  email: string;
  created_at: string;
}

let supabase: any;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration missing:', { 
    url: !!supabaseUrl, 
    key: !!supabaseAnonKey,
    processEnv: {
      url: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
      key: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    },
    expoConfig: {
      url: !!Constants.expoConfig?.extra?.supabaseUrl,
      key: !!Constants.expoConfig?.extra?.supabaseAnonKey
    }
  });
  
  // Don't throw in production - use dummy values to prevent crash
  if (!__DEV__) {
    console.error('CRITICAL: Using dummy Supabase client to prevent crash');
    // Create a dummy client that will fail gracefully
    supabase = {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInAnonymously: async () => ({ data: null, error: new Error('Supabase not configured') }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: new Error('Supabase not configured') }),
            maybeSingle: async () => ({ data: null, error: new Error('Supabase not configured') }),
          }),
          order: () => ({
            limit: () => ({
              single: async () => ({ data: null, error: new Error('Supabase not configured') }),
            }),
          }),
        }),
        insert: async () => ({ data: null, error: new Error('Supabase not configured') }),
        update: async () => ({ data: null, error: new Error('Supabase not configured') }),
        upsert: async () => ({ data: null, error: new Error('Supabase not configured') }),
        delete: async () => ({ data: null, error: new Error('Supabase not configured') }),
      }),
      storage: {
        from: () => ({
          upload: async () => ({ data: null, error: new Error('Supabase not configured') }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
        }),
      },
    };
  } else {
    throw new Error('Missing Supabase environment variables');
  }
} else {
  // AsyncStorageを使用してセッションを保存
  supabase = createClient(
    supabaseUrl, 
    supabaseAnonKey,
    authOptions
  );

  // 接続状態の監視
  supabase.auth.onAuthStateChange((event: any, session: any) => {
    // 重要なイベントのみログ出力
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
      console.log('認証状態変更:', { event, userId: session?.user?.id });
    }
  });
}

export { supabase };
export default supabase;