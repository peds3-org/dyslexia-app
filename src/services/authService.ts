import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string | null | undefined;
  created_at: string;
  display_name?: string;
}

class AuthService {
  private currentUser: UserProfile | null = null;
  private initialized = false;

  /**
   * 認証サービスの初期化
   * - 現在のセッションを取得し、ユーザー情報を設定
   */
  async initialize(): Promise<boolean> {
    try {
      if (this.initialized) return true;
      
      console.log('認証サービス初期化開始');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('セッション取得エラー:', error);
        this.initialized = true;
        return false;
      }

      // セッションが存在すれば現在のユーザーを設定
      if (session?.user) {
        this.currentUser = {
          id: session.user.id,
          email: session.user.email,
          created_at: session.user.created_at,
        };
        
        // ユーザー表示名を取得
        try {
          const { data, error: profileError } = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('user_id', session.user.id)
            .single();
            
          if (!profileError && data && this.currentUser) {
            this.currentUser.display_name = data.display_name;
          }
        } catch (e) {
          console.error('プロフィール取得エラー:', e);
        }
        
        if (this.currentUser) {
          console.log('認証済みユーザー:', { 
            id: this.currentUser.id,
            email: this.currentUser.email || 'なし',
            display_name: this.currentUser.display_name || 'なし'
          });
        }
      } else {
        console.log('認証されていません');
        this.currentUser = null;
      }
      
      this.initialized = true;
      console.log('認証サービス初期化完了');
      return true;
    } catch (error) {
      console.error('認証サービス初期化エラー:', error);
      this.initialized = true;
      return false;
    }
  }

  /**
   * セッション更新
   */
  async updateSession(session: Session | null): Promise<void> {
    if (!session?.user) {
      this.currentUser = null;
      return;
    }
    
    this.currentUser = {
      id: session.user.id,
      email: session.user.email,
      created_at: session.user.created_at,
    };
    
    if (this.currentUser) {
      console.log('セッション更新:', { userId: this.currentUser.id });
    }
  }

  /**
   * 匿名ログイン
   */
  async signInAnonymously(): Promise<UserProfile | null> {
    try {
      console.log('匿名ログイン開始');
      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) {
        console.error('匿名ログインエラー:', error);
        return null;
      }

      if (!data.user) {
        console.error('匿名ログイン: ユーザーデータがありません');
        return null;
      }

      this.currentUser = {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at,
      };
      
      if (this.currentUser) {
        console.log('匿名ログイン成功:', { userId: this.currentUser.id });
      }
      return this.currentUser;
    } catch (error) {
      console.error('匿名ログイン例外:', error);
      return null;
    }
  }

  /**
   * ログアウト
   */
  async signOut(): Promise<boolean> {
    try {
      console.log('ログアウト開始');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('ログアウトエラー:', error);
        return false;
      }
      
      this.currentUser = null;
      console.log('ログアウト成功');
      return true;
    } catch (error) {
      console.error('ログアウト例外:', error);
      return false;
    }
  }
  
  /**
   * 現在のユーザー情報を取得
   */
  getUser(): UserProfile | null {
    return this.currentUser;
  }

  /**
   * 認証状態を確認
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
  
  /**
   * 初期化状態を確認
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

const authService = new AuthService();
export default authService; 