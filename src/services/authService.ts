import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorageUtil from '../utils/asyncStorage';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export interface UserProfile {
  id: string;
  email: string | null | undefined;
  created_at: string;
  display_name?: string;
}

class AuthService {
  private currentUser: UserProfile | null = null;
  private initialized = false;
  private initializePromise: Promise<boolean> | null = null;

  /**
   * 認証サービスの初期化
   */
  async initialize(): Promise<boolean> {
    if (this.initializePromise) {
      return this.initializePromise;
    }

    this.initializePromise = this._initialize();
    return this.initializePromise;
  }

  private async _initialize(): Promise<boolean> {
    try {
      if (this.initialized) return true;

      // ネットワーク接続確認
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        // オフライン時はローカルセッションを確認
        const localSession = await AsyncStorageUtil.getItem<{ access_token: string }>('supabase.auth.token');
        if (localSession?.access_token) {
          this.initialized = true;
          return true;
        }
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('セッション取得エラー:', error);
        this.initialized = true;
        return false;
      }

      if (session?.user) {
        this.currentUser = {
          id: session.user.id,
          email: session.user.email,
          created_at: session.user.created_at,
        };
        
        try {
          const { data, error: profileError } = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('user_id', session.user.id)
            .single();
            
          if (!profileError && data) {
            this.currentUser.display_name = data.display_name;
          }
        } catch (e) {
          console.error('プロフィール取得エラー:', e);
        }
      } else {
        this.currentUser = null;
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('認証サービス初期化エラー:', error);
      this.initialized = true;
      return false;
    } finally {
      this.initializePromise = null;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  getUser(): UserProfile | null {
    return this.currentUser;
  }

  async updateSession(session: Session | null): Promise<void> {
    if (session?.user) {
      this.currentUser = {
        id: session.user.id,
        email: session.user.email,
        created_at: session.user.created_at,
      };
    } else {
      this.currentUser = null;
    }
  }

  /**
   * 匿名ログイン
   */
  async signInAnonymously(): Promise<UserProfile | null> {
    let retryCount = 0;
    
    while (retryCount < MAX_RETRIES) {
      try {
        const { data, error } = await supabase.auth.signInAnonymously();

        if (error) {
          throw error;
        }

        if (!data.user) {
          throw new Error('ユーザーデータがありません');
        }

        this.currentUser = {
          id: data.user.id,
          email: data.user.email,
          created_at: data.user.created_at,
        };
        
        return this.currentUser;
      } catch (error) {
        console.error(`匿名ログイン失敗:`, error);
        
        if (retryCount < MAX_RETRIES - 1) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCount));
          continue;
        }
        
        return null;
      }
    }
    
    return null;
  }

  /**
   * ログアウト
   */
  async signOut(): Promise<boolean> {
    try {
      // 先に現在のユーザー状態をクリア
      this.currentUser = null;
      
      // まずSupabaseからサインアウト（globalスコープで全てのセッションを無効化）
      try {
        const { error } = await supabase.auth.signOut({ 
          scope: 'global'  // 全てのデバイスからサインアウト
        });
        
        if (error) {
          console.error('Supabaseサインアウトエラー:', error);
        }
      } catch (err) {
        console.error('サインアウト処理エラー:', err);
      }
      
      // ローカルストレージから全ての認証関連データを削除
      try {
        // AsyncStorageから全ての認証関連キーを取得して削除
        const keys = await AsyncStorage.getAllKeys();
        const authKeys = keys.filter(key => 
          key.includes('supabase') || 
          key.includes('auth') || 
          key.includes('session') ||
          key.includes('user') ||
          key.includes('sb-') || // Supabaseが使用するプレフィックス
          key.includes('access_token') ||
          key.includes('refresh_token') ||
          key.includes('expires') ||
          key.includes('provider_token') ||
          key.includes('provider_refresh_token') ||
          // Supabaseの特定のキーパターン
          key.startsWith('supabase.auth.token') ||
          key.startsWith('supabase.session') ||
          key === 'supabase.auth.user'
        );
        
        if (authKeys.length > 0) {
          await AsyncStorage.multiRemove(authKeys);
          console.log('削除した認証関連キー:', authKeys);
        }
        
        // 念のため個別のキーも削除
        await AsyncStorageUtil.removeItem('supabase.auth.token');
        
        // Supabaseが使用する可能性のある追加のキーも削除
        const additionalKeys = [
          'supabase.auth.user',
          'supabase.auth.session',
          'supabase.auth.expires_at',
          'supabase.auth.refresh_token',
          'supabase.auth.provider_token',
          'supabase.auth.provider_refresh_token'
        ];
        
        for (const key of additionalKeys) {
          try {
            await AsyncStorage.removeItem(key);
          } catch (e) {
            // キーが存在しない場合のエラーは無視
          }
        }
        
      } catch (storageError) {
        console.error('認証データ削除エラー:', storageError);
      }
      
      // Supabaseのセッションキャッシュをクリア
      try {
        // getSessionを呼び出してキャッシュをリフレッシュ
        await supabase.auth.getSession();
      } catch (e) {
        // エラーは無視
      }
      
      // 確実に初期化状態をリセット
      this.initialized = false;
      this.initializePromise = null;
      
      // 少し待機してから完了（非同期処理の完了を確実にするため）
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('ログアウト処理で予期しないエラー:', error);
      
      // エラーが発生した場合でも、念のためもう一度状態をリセット
      this.currentUser = null;
      this.initialized = false;
      this.initializePromise = null;
      
      try {
        await AsyncStorageUtil.removeItem('supabase.auth.token');
      } catch (e) {
        // エラーを無視
      }
      
      return true;
    }
  }
}

export default new AuthService(); 