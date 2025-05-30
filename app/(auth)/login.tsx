import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  Alert,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  ActionSheetIOS,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AntDesign } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { supabase } from '../../src/lib/supabase';
import authService from '../../src/services/authService';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { useAppState } from '@src/contexts/AppStateContext';

type AuthMode = 'signin' | 'signup';
type Step = 'name' | 'birthday' | 'gender';
type Gender = 'male' | 'female' | 'other' | 'no_answer';

const genderLabels: Record<Gender, string> = {
  male: 'おとこのこ',
  female: 'おんなのこ',
  other: 'そのほか',
  no_answer: 'こたえない',
};

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;
const MAX_RETRY_DELAY = 10000;

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

function AuthScreen() {
  const router = useRouter();
  const { setAuthenticated: setAppAuthenticated, initializeAppState } = useAppState();
  const [mode] = useState<AuthMode>('signup');
  const [currentStep, setCurrentStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // クリーンアップ用のref
  const isMountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // クリーンアップエフェクト
  useEffect(() => {
    isMountedRef.current = true;
    console.log('認証画面がマウントされました');
    
    // セッション情報を確認
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMountedRef.current) {
          console.log('認証画面 - セッション確認:', {
            sessionExists: !!session,
            userId: session?.user?.id || 'なし',
          });
        }
      } catch (error) {
        console.error('セッション確認エラー:', error);
      }
    };
    
    checkSession();

    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      console.log('認証画面がアンマウントされました');
    };
  }, []);

  // リトライ遅延計算
  const getRetryDelay = useCallback((retryCount: number) => {
    const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
    return Math.min(delay, MAX_RETRY_DELAY);
  }, []);

  // プロフィール作成処理
  const createUserProfile = useCallback(async (userId: string) => {
    const displayName = name?.trim() || 'ゲスト';
    
    try {
      const { error: insertError } = await supabase.from('user_profiles').insert([
        {
          user_id: userId,
          display_name: displayName,
          birthday: selectedDate ? selectedDate.toISOString() : null,
          gender: gender || 'no_answer',
          character_level: 'beginner',
          character_exp: 0,
          is_anonymous: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      if (insertError) {
        console.error('プロフィール作成エラー:', insertError);
        throw new Error(`プロフィール作成エラー: ${insertError.message}`);
      }

      // 確認のための小さな待機
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // 作成確認
      const { data: verifyProfile, error: verifyError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (verifyError && verifyError.code !== 'PGRST116') {
        console.error('プロフィール確認エラー:', verifyError);
      } else if (verifyProfile) {
        console.log('プロフィール作成成功:', {
          id: verifyProfile.id,
          user_id: verifyProfile.user_id,
          display_name: verifyProfile.display_name,
        });
      }
    } catch (error) {
      console.error('プロフィール作成処理エラー:', error);
      throw error;
    }
  }, [name, selectedDate, gender]);

  // 認証処理
  const handleAuth = useCallback(async (retryCount = 0) => {
    // バリデーション
    if (!name && !birthday && mode === 'signin') {
      Alert.alert('エラー', 'おなまえとおたんじょうびを入力してください。');
      return;
    }

    if (mode === 'signup' && !name) {
      Alert.alert('エラー', 'おなまえを入力してください。');
      return;
    }

    if (!isMountedRef.current) return;

    setIsLoading(true);

    try {
      // 匿名ログイン
      console.log(`認証試行 ${retryCount + 1}/${MAX_RETRIES} 回目...`);
      const userProfile = await authService.signInAnonymously();

      if (!userProfile) {
        throw new Error('ログインエラー: ユーザープロフィールが取得できませんでした');
      }

      if (!isMountedRef.current) return;

      // セッション確認
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('セッション取得エラー: セッションが取得できませんでした');
      }

      console.log('匿名ログイン成功:', {
        userId: userProfile.id,
        sessionExists: true,
      });

      // プロフィール確認
      const { error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userProfile.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // プロフィールが存在しない場合は作成
        console.log('ユーザープロフィールが存在しないため新規作成します');
        await createUserProfile(userProfile.id);
      }

      if (!isMountedRef.current) return;

      // 認証状態を更新
      setAppAuthenticated(true);

      // アプリ状態を再初期化
      await initializeAppState();
      
      if (!isMountedRef.current) return;
      
      // RouteGuardが自動的に適切な画面へ遷移
      router.replace('/');
      
    } catch (error) {
      console.error('認証エラー:', error);
      
      if (!isMountedRef.current) return;
      
      // リトライ処理
      if (retryCount < MAX_RETRIES - 1) {
        const errorMessage = error instanceof Error ? error.message : '';
        if (errorMessage.includes('network') || errorMessage.includes('connection')) {
          const delay = getRetryDelay(retryCount);
          console.log(`リトライ ${retryCount + 1}/${MAX_RETRIES} 回目... ${delay}ms後に再試行`);
          
          retryTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              handleAuth(retryCount + 1);
            }
          }, delay);
          return;
        }
      }
      
      // エラー処理
      setIsLoading(false);
      
      // クリーンアップ
      try {
        await authService.signOut();
        console.log('クリーンアップ: ユーザー認証セッション終了');
      } catch (cleanupError) {
        console.error('クリーンアップエラー:', cleanupError);
      }
      
      // ユーザーにエラーメッセージを表示
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      let userMessage = 'アカウント登録中にエラーが発生しました。';
      
      if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        userMessage = 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
      }
      
      Alert.alert('登録エラー', userMessage);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [mode, name, birthday, setAppAuthenticated, initializeAppState, router, createUserProfile, getRetryDelay]);

  // 次へ進む処理
  const handleNext = useCallback(() => {
    switch (currentStep) {
      case 'name':
        if (!name) {
          Alert.alert('エラー', 'おなまえを入力してください');
          return;
        }
        setCurrentStep('birthday');
        break;
      case 'birthday':
        if (!birthday) {
          Alert.alert('エラー', 'お誕生日を入力してください');
          return;
        }
        setCurrentStep('gender');
        break;
      case 'gender':
        handleAuth();
        break;
    }
  }, [currentStep, name, birthday, handleAuth]);

  // 戻る処理
  const handleBack = useCallback(() => {
    switch (currentStep) {
      case 'birthday':
        setCurrentStep('name');
        break;
      case 'gender':
        setCurrentStep('birthday');
        break;
    }
  }, [currentStep]);

  // 誕生日選択処理
  const handleBirthdayPress = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['キャンセル', 'えらぶ', 'こたえない'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: -1,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            setShowDatePicker(true);
          } else if (buttonIndex === 2) {
            setBirthday('no_answer');
          }
        }
      );
    } else {
      setShowDatePicker(true);
    }
  }, []);

  // 日付フォーマット
  const formatDate = useCallback((date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }, []);

  // 日付変更処理
  const handleDateChange = useCallback((event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      setBirthday(date.toISOString().split('T')[0]);
    }
  }, []);

  // ローディング画面
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#E86A33' />
        <Text style={styles.loadingText}>とうろくちゅう...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground
        source={require('../../assets/backgrounds/sato.png')}
        style={styles.backgroundImage}
        resizeMode='cover'>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={styles.keyboardAvoidingView}>
            <View style={styles.contentContainer}>
              <View style={styles.formCard}>
                <Text style={styles.title}>
                  {currentStep === 'name' && 'おなまえを入れてね'}
                  {currentStep === 'birthday' && 'おたんじょう日を入れてね'}
                  {currentStep === 'gender' && 'せいべつをえらんでね'}
                </Text>

                {currentStep === 'name' && (
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder='ここをタッチしてね'
                    placeholderTextColor='#9CA3AF'
                    style={styles.textInput}
                    autoFocus
                    maxLength={20}
                  />
                )}

                {currentStep === 'birthday' && (
                  <TouchableOpacity
                    style={styles.birthdayButton}
                    onPress={handleBirthdayPress}>
                    <Text style={styles.birthdayText}>
                      {birthday === 'no_answer' ? 'こたえない' : birthday ? formatDate(new Date(birthday)) : 'ここをタッチしてね'}
                    </Text>
                  </TouchableOpacity>
                )}

                {currentStep === 'gender' && (
                  <View style={styles.genderContainer}>
                    {(['male', 'female', 'other'] as Gender[]).map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.genderButton,
                          gender === option && styles.genderButtonActive
                        ]}
                        onPress={() => setGender(option)}>
                        <Text style={[
                          styles.genderText,
                          gender === option && styles.genderTextActive
                        ]}>
                          {genderLabels[option]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={[
                        styles.genderButton,
                        gender === 'no_answer' && styles.genderButtonActive
                      ]}
                      onPress={() => setGender('no_answer')}>
                      <Text style={[
                        styles.genderText,
                        gender === 'no_answer' && styles.genderTextActive
                      ]}>
                        こたえない
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.navigationContainer}>
                {currentStep !== 'name' ? (
                  <TouchableOpacity
                    onPress={handleBack}
                    style={styles.backButton}>
                    <AntDesign name='arrowleft' size={24} color='#E86A33' />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.spacer} />
                )}

                <TouchableOpacity
                  onPress={handleNext}
                  style={styles.nextButton}>
                  <AntDesign name='arrowright' size={24} color='#FFF' />
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode='date'
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                  locale='ja'
                />
              )}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    zIndex: 10,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontFamily: 'font-mplus-bold',
    textAlign: 'center',
    marginBottom: 32,
    color: '#000',
  },
  textInput: {
    backgroundColor: '#FFF',
    textAlign: 'center',
    fontSize: 20,
    fontFamily: 'font-mplus',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    color: '#000',
  },
  birthdayButton: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  birthdayText: {
    textAlign: 'center',
    fontSize: 20,
    fontFamily: 'font-mplus',
    color: '#000',
  },
  genderContainer: {
    gap: 16,
  },
  genderButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  genderButtonActive: {
    borderColor: '#E86A33',
    backgroundColor: 'rgba(232, 106, 51, 0.1)',
  },
  genderText: {
    textAlign: 'center',
    fontSize: 20,
    fontFamily: 'font-mplus',
    color: '#000',
  },
  genderTextActive: {
    color: '#E86A33',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
  },
  backButton: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextButton: {
    backgroundColor: '#E86A33',
    padding: 16,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  spacer: {
    width: 54,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 20,
    fontFamily: 'font-mplus',
    fontSize: 16,
    color: '#000',
  },
});

export default AuthScreen;