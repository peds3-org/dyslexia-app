import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@src/lib/supabase';

/**
 * 全ての認証関連データを完全にクリアする
 * デバッグや完全なログアウト時に使用
 */
export async function clearAllAuthData(): Promise<void> {
  try {
    console.log('=== 認証データの完全クリア開始 ===');
    
    // 1. Supabaseからサインアウト（globalスコープで全セッション無効化）
    try {
      await supabase.auth.signOut({ scope: 'global' });
      console.log('✓ Supabaseサインアウト完了（全デバイス）');
    } catch (e) {
      console.error('Supabaseサインアウトエラー:', e);
    }
    
    // 2. AsyncStorageから全てのキーを取得
    const allKeys = await AsyncStorage.getAllKeys();
    console.log(`全キー数: ${allKeys.length}`);
    
    // 3. 認証関連のキーをフィルタリング（より包括的なパターン）
    const authRelatedKeys = allKeys.filter(key => 
      key.includes('supabase') ||
      key.includes('auth') ||
      key.includes('session') ||
      key.includes('user') ||
      key.includes('sb-') ||
      key.includes('token') ||
      key.includes('refresh') ||
      key.includes('access_token') ||
      key.includes('expires') ||
      key.includes('provider') ||
      // Supabaseの特定のキーパターン
      key.startsWith('supabase.auth.') ||
      key.startsWith('supabase.session') ||
      key === 'supabase.auth.user'
    );
    
    console.log(`削除対象の認証関連キー: ${authRelatedKeys.length}個`);
    console.log('削除対象キー:', authRelatedKeys);
    
    // 4. 認証関連キーを削除
    if (authRelatedKeys.length > 0) {
      await AsyncStorage.multiRemove(authRelatedKeys);
      console.log('✓ 認証関連キーを削除しました');
    }
    
    // 5. 特定のキーも念のため個別に削除
    const specificKeys = [
      'supabase.auth.token',
      'supabase.auth.user',
      'supabase.auth.session',
      'supabase.auth.expires_at',
      'supabase.auth.refresh_token',
      'supabase.auth.provider_token',
      'supabase.auth.provider_refresh_token',
      'sb-auth-token',
      'user_session',
      'current_user'
    ];
    
    for (const key of specificKeys) {
      try {
        await AsyncStorage.removeItem(key);
      } catch (e) {
        // エラーは無視（キーが存在しない場合など）
      }
    }
    
    // 6. Supabaseのセッションキャッシュをクリア
    try {
      await supabase.auth.getSession();
    } catch (e) {
      // エラーは無視
    }
    
    console.log('=== 認証データの完全クリア完了 ===');
  } catch (error) {
    console.error('認証データクリアエラー:', error);
    throw error;
  }
}

/**
 * デバッグ用: AsyncStorageの全内容を表示
 */
export async function debugShowAllStorageKeys(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    console.log('=== AsyncStorage 全キー ===');
    console.log(`総数: ${keys.length}`);
    
    // 認証関連のキーを分離
    const authKeys = keys.filter(key => 
      key.includes('supabase') ||
      key.includes('auth') ||
      key.includes('session') ||
      key.includes('user') ||
      key.includes('sb-') ||
      key.includes('token')
    );
    
    console.log('\n認証関連キー:');
    for (const key of authKeys) {
      try {
        const value = await AsyncStorage.getItem(key);
        console.log(`${key}: ${value ? value.substring(0, 50) + '...' : 'null'}`);
      } catch (e) {
        console.log(`${key}: [読み取りエラー]`);
      }
    }
    
    console.log('\nその他のキー:');
    const otherKeys = keys.filter(key => !authKeys.includes(key));
    for (const key of otherKeys) {
      try {
        const value = await AsyncStorage.getItem(key);
        console.log(`${key}: ${value ? value.substring(0, 50) + '...' : 'null'}`);
      } catch (e) {
        console.log(`${key}: [読み取りエラー]`);
      }
    }
    
    console.log('========================');
  } catch (error) {
    console.error('ストレージデバッグエラー:', error);
  }
}

/**
 * デバッグ用: Supabaseの認証状態を確認
 */
export async function debugCheckSupabaseAuth(): Promise<void> {
  try {
    console.log('=== Supabase認証状態 ===');
    
    // 現在のセッションを確認
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('セッションエラー:', error);
    } else if (session) {
      console.log('アクティブセッションあり:');
      console.log(' - ユーザーID:', session.user.id);
      console.log(' - メール:', session.user.email);
      console.log(' - アクセストークン:', session.access_token?.substring(0, 20) + '...');
      console.log(' - 有効期限:', new Date(session.expires_at! * 1000).toLocaleString());
    } else {
      console.log('アクティブセッションなし');
    }
    
    // 現在のユーザーを確認
    const { data: { user } } = await supabase.auth.getUser();
    console.log('現在のユーザー:', user ? `${user.id} (${user.email})` : 'なし');
    
    console.log('========================');
  } catch (error) {
    console.error('認証状態確認エラー:', error);
  }
}

/**
 * アプリを完全に初期状態に戻す
 * 認証情報、オンボーディング、テスト完了状態など全てをリセット
 */
export async function resetToInitialState(): Promise<void> {
  try {
    console.log('=== アプリの完全初期化開始 ===');
    
    // 1. まず認証データをクリア
    await clearAllAuthData();
    
    // 2. AsyncStorageから全てのキーを取得
    const allKeys = await AsyncStorage.getAllKeys();
    console.log(`全キー数: ${allKeys.length}`);
    
    // 3. アプリの状態に関連する全てのキーをフィルタリング
    const appStateKeys = allKeys.filter(key => 
      // オンボーディング関連
      key.includes('onboarding') ||
      key.includes('tutorial') ||
      key.includes('first_launch') ||
      // テスト関連
      key.includes('test') ||
      key.includes('is_completed') ||
      key.includes('completed') ||
      key.includes('initial_test') ||
      // ユーザープログレス関連
      key.includes('progress') ||
      key.includes('level') ||
      key.includes('stage') ||
      key.includes('score') ||
      key.includes('moji_dama') ||
      // CBT関連
      key.includes('cbt') ||
      key.includes('mood') ||
      key.includes('mission') ||
      key.includes('login_bonus') ||
      // 設定関連
      key.includes('settings') ||
      key.includes('preference') ||
      key.includes('config') ||
      // AI関連
      key.includes('ai_model') ||
      key.includes('model_downloaded') ||
      // その他のアプリデータ
      key.includes('practice') ||
      key.includes('result') ||
      key.includes('character') ||
      key.includes('unlock')
    );
    
    console.log(`削除対象のアプリ状態キー: ${appStateKeys.length}個`);
    console.log('削除対象キー:', appStateKeys);
    
    // 4. アプリ状態関連キーを削除
    if (appStateKeys.length > 0) {
      await AsyncStorage.multiRemove(appStateKeys);
      console.log('✓ アプリ状態関連キーを削除しました');
    }
    
    // 5. 特定のキーも念のため個別に削除
    const specificKeys = [
      'onboarding_completed',
      'tutorial_completed',
      'initial_test_completed',
      'initial_test_results',
      'user_level',
      'current_stage',
      'total_moji_dama',
      'unlocked_characters',
      'practice_results',
      'cbt_mood_today',
      'login_streak',
      'ai_model_path',
      'model_downloaded',
      'user_preferences',
      'app_settings',
      'last_sync_time',
      'offline_queue'
    ];
    
    for (const key of specificKeys) {
      try {
        await AsyncStorage.removeItem(key);
      } catch (e) {
        // エラーは無視（キーが存在しない場合など）
      }
    }
    
    // 6. 最終確認: 残っているキーを表示
    const remainingKeys = await AsyncStorage.getAllKeys();
    console.log(`\n初期化後の残存キー数: ${remainingKeys.length}`);
    if (remainingKeys.length > 0) {
      console.log('残存キー:', remainingKeys);
    }
    
    console.log('=== アプリの完全初期化完了 ===');
    console.log('アプリは完全に初期状態に戻りました');
  } catch (error) {
    console.error('アプリ初期化エラー:', error);
    throw error;
  }
}