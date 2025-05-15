import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import NetInfo from '@react-native-community/netinfo';

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
        const localSession = await AsyncStorage.getItem('supabase.auth.token');
        if (localSession) {
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
      
      // ローカルストレージからトークンを削除
      try {
        await AsyncStorage.removeItem('supabase.auth.token');
      } catch (storageError) {
        console.error('トークン削除エラー:', storageError);
      }
      
      // 最大3回リトライするログアウト処理
      let success = false;
      let retryCount = 0;
      
      while (!success && retryCount < MAX_RETRIES) {
        try {
          // シンプルにローカルセッションのみサインアウト
          const { error } = await supabase.auth.signOut({ 
            scope: 'local'  // ローカルセッションのみクリア
          });
          
          if (error) {
            retryCount++;
            // 次のリトライの前に少し待機
            if (retryCount < MAX_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCount));
            }
          } else {
            success = true;
          }
        } catch (err) {
          retryCount++;
          if (retryCount < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCount));
          }
        }
      }
      
      // 確実に初期化状態をリセット
      this.initialized = false;
      this.initializePromise = null;
      
      return true;
    } catch (error) {
      // エラーが発生した場合でも、念のためもう一度状態をリセット
      this.currentUser = null;
      this.initialized = false;
      this.initializePromise = null;
      
      try {
        await AsyncStorage.removeItem('supabase.auth.token');
      } catch (e) {
        // エラーを無視
      }
      
      return true;
    }
  }
}

export default new AuthService(); 