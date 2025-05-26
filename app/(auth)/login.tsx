import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AntDesign } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { supabase } from '../../src/lib/supabase';
import authService from '../../src/services/authService';
import { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js';
import { Session } from '@supabase/supabase-js';

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
const INITIAL_RETRY_DELAY = 2000; // 2秒
const MAX_RETRY_DELAY = 10000; // 10秒

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 指数バックオフでリトライ間隔を計算
const getRetryDelay = (retryCount: number) => {
  const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
  return Math.min(delay, MAX_RETRY_DELAY);
};

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
  const [mode] = useState<AuthMode>('signup');
  const [currentStep, setCurrentStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [authenticated, setAuthenticated] = useState(false);

  // コンポーネントがマウントされたときにログを出力
  useEffect(() => {
    console.log('認証画面がマウントされました');
    // セッション情報を確認
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log('認証画面 - セッション確認:', {
          sessionExists: !!session,
          userId: session?.user?.id || 'なし',
        });
      } catch (error) {
        console.error('セッション確認エラー:', error);
      }
    };
    checkSession();

    return () => {
      console.log('認証画面がアンマウントされました');
    };
  }, []);

  const handleAuth = async () => {
    if (!name && !birthday && mode === 'signin') {
      Alert.alert('エラー', 'おなまえとおたんじょうびを入力してください。');
      return;
    }

    if (mode === 'signup' && !name) {
      Alert.alert('エラー', 'おなまえを入力してください。');
      return;
    }

    if (mode === 'signup' && !selectedDate) {
      Alert.alert('エラー', 'おたんじょうびを選択してください。');
      return;
    }

    setIsLoading(true);
    let retryCount = 0;
    const maxRetries = 3;

    try {
      // 匿名ログイン試行
      let authResult = null;
      while (retryCount < maxRetries) {
        try {
          console.log(`認証試行 ${retryCount + 1}/${maxRetries} 回目...`);
          const userProfile = await authService.signInAnonymously();

          if (!userProfile) {
            console.error('認証試行失敗: ユーザープロフィールがnullです');
            throw new Error('ログインエラー: ユーザープロフィールが取得できませんでした');
          } else {
            try {
              // セッション情報を取得して認証状態を確認
              const sessionData = await supabase.auth.getSession();
              if (!sessionData.data.session) {
                console.error('セッション取得失敗: セッションがnullです');
                throw new Error('セッション取得エラー: セッションが取得できませんでした');
              }

              authResult = {
                user: userProfile,
                session: sessionData,
              };
              console.log('匿名ログイン成功:', {
                userId: userProfile.id,
                sessionExists: !!sessionData.data.session,
                sessionUserId: sessionData.data.session?.user?.id || 'なし',
              });
              break;
            } catch (sessionError: any) {
              console.error('セッション取得エラー:', sessionError);
              throw new Error(`セッション取得エラー: ${sessionError.message}`);
            }
          }
        } catch (err) {
          retryCount++;
          console.error('認証エラー:', err);
          if (retryCount >= maxRetries) throw err;

          const delay = getRetryDelay(retryCount);
          console.log(`リトライ ${retryCount}/${maxRetries} 回目... ${delay}ms後に再試行`);
          await sleep(delay);
        }
      }

      if (!authResult || !authResult.user) {
        throw new Error('認証に失敗しました。ユーザー情報が取得できませんでした。');
      }

      const authData = authResult;

      // ユーザープロフィールの取得
      const userProfileResponse = (await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .single()) as PostgrestSingleResponse<UserProfile>;

      if (userProfileResponse.error) {
        // プロフィールが存在しない場合は作成（PGRST116は「行が見つからない」エラーで正常な動作）
        if (userProfileResponse.error.code === 'PGRST116') {
          console.log('ユーザープロフィールが存在しないため新規作成します');

          // display_nameに必ず値が入るよう保証
          const displayName = name?.trim() || 'ゲスト';

          const { error: insertError } = await supabase.from('user_profiles').insert([
            {
              user_id: authData.user.id,
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
            console.error('プロフィール作成エラー:', {
              code: insertError.code,
              message: insertError.message,
              details: insertError.details,
              providedData: { user_id: authData.user.id, display_name: displayName },
            });
            throw new Error(`プロフィール作成エラー: ${insertError.message}`);
          }

          // プロフィール作成後に確認クエリを実行して確実に作成できたか確認
          console.log('プロフィール作成後の確認クエリを実行します');
          const { data: verifyProfile, error: verifyError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', authData.user.id)
            .single();

          if (verifyError) {
            console.error('プロフィール確認エラー:', {
              code: verifyError.code,
              message: verifyError.message,
              details: verifyError.details,
            });
            // エラーがあっても続行する（作成は成功している可能性があるため）
          } else {
            console.log('プロフィール確認成功:', {
              id: verifyProfile.id,
              user_id: verifyProfile.user_id,
              display_name: verifyProfile.display_name,
            });
          }

          // 遅延を入れて作成が確実に反映されるようにする - 1.5秒に延長
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // 作成確認のための再確認クエリを実行
          const { data: reVerifyProfile, error: reVerifyError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', authData.user.id)
            .single();

          if (reVerifyError) {
            console.error('プロフィール再確認エラー:', {
              code: reVerifyError.code,
              message: reVerifyError.message,
              details: reVerifyError.details,
            });
            throw new Error(`プロフィール作成に確認が取れません: ${reVerifyError.message}`);
          } else {
            console.log('プロフィール作成完了確認:', {
              id: reVerifyProfile.id,
              user_id: reVerifyProfile.user_id,
              display_name: reVerifyProfile.display_name,
            });
          }
        }
      }

      // ユーザー状態の初期化
      console.log('ユーザー状態初期化開始:', {
        userId: authData.user.id,
        name: name,
        hasName: !!name,
      });

      // display_nameに必ず値が入るよう保証
      const displayName = name?.trim() || 'ゲスト';

      // 認証状態を更新
      setAuthenticated(true);

      // データベースの作成処理が確実に完了するように少し待機
      await new Promise((resolve) => setTimeout(resolve, 800));

      // 診断テスト受診済みかチェック
      let testData = null;
      let retryTestCheck = 0;

      while (retryTestCheck < 3) {
        const { data, error } = await supabase.from('initial_test_results').select('is_completed').eq('user_id', authData.user.id).single();

        if (error && error.code !== 'PGRST116') {
          console.log(`テスト結果取得エラー (試行 ${retryTestCheck + 1}/3):`, error);
          retryTestCheck++;
          await new Promise((resolve) => setTimeout(resolve, 500));
        } else {
          testData = data;
          break;
        }
      }

      console.log('テスト完了状態:', { testData });

      try {
        // テスト完了状態に応じて画面遷移
        if (testData && testData.is_completed) {
          // テスト完了済みの場合はホーム画面へ
          console.log('テスト完了済み: ホーム画面へ遷移');
          router.push('/(app)' as any);
        } else {
          // テスト未完了の場合は初期テストのイントロ画面へ
          console.log('テスト未完了: 初期テストイントロ画面へ遷移');
          router.push('/(app)/initial-test/intro' as any);
        }
      } catch (routerError) {
        console.error('画面遷移エラー:', routerError);
        // 最終手段としてreplaceを使用
        try {
          router.replace('/(app)/initial-test/intro' as any);
        } catch (fallbackError) {
          console.error('代替遷移にも失敗:', fallbackError);
        }
      }
    } catch (dbError: unknown) {
      // データベース操作エラー - クリーンアップ
      console.error('データベース操作エラー - クリーンアップを実行:', {
        name: (dbError as Error)?.name,
        message: (dbError as Error)?.message,
        stack: (dbError as Error)?.stack,
      });

      // 認証をクリーンアップ（ログアウト）
      try {
        await authService.signOut();
        console.log('クリーンアップ: ユーザー認証セッション終了');
      } catch (cleanupError) {
        console.error('クリーンアップエラー:', cleanupError);
      }

      // ネットワークエラーの場合はリトライ
      if ((dbError as Error)?.message?.includes('network') || (dbError as Error)?.message?.includes('connection')) {
        retryCount++;
        if (retryCount < maxRetries) {
          const delay = getRetryDelay(retryCount);
          console.log(`リトライ ${retryCount}/${maxRetries} 回目... ${delay}ms後に再試行`);
          await sleep(delay);
          setIsLoading(false);
          handleAuth(); // 再帰的に呼び出し
          return;
        }
      }

      setIsLoading(false);

      // ユーザーにわかりやすいエラーメッセージを表示
      let userMessage = 'アカウント登録中にエラーが発生しました。';
      if ((dbError as any).code === '23503') {
        userMessage = 'データの関連付けに問題が発生しました。';
      } else if ((dbError as any).code === '23505') {
        userMessage = 'このユーザー情報は既に登録されています。';
      } else if ((dbError as Error)?.message?.includes('network') || (dbError as Error)?.message?.includes('connection')) {
        userMessage = 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
      } else if ((dbError as Error)?.message?.includes('トレーニング統計初期化エラー')) {
        userMessage = 'トレーニングデータの初期化に失敗しました。もう一度お試しください。';
      }

      Alert.alert('登録エラー', userMessage);
      throw new Error(`登録エラー (${(dbError as Error)?.name || '不明なタイプ'}): ${(dbError as Error)?.message || '詳細不明'}`);
    }
  };

  const handleNext = () => {
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
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'birthday':
        setCurrentStep('name');
        break;
      case 'gender':
        setCurrentStep('birthday');
        break;
    }
  };

  const handleBirthdayPress = () => {
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
  };

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      setBirthday(date.toISOString().split('T')[0]);
    }
  };

  const renderStep = () => {
    if (isLoading) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <ActivityIndicator size='large' color='#E86A33' />
          <Text
            style={{
              marginTop: 20,
              fontFamily: 'font-mplus',
              fontSize: 16,
              color: '#000',
            }}>
            とうろくちゅう...
          </Text>
        </View>
      );
    }

    return (
      <View
        style={{
          flex: 1,
          position: 'relative',
          zIndex: 10,
        }}>
        <ImageBackground
          source={require('../../assets/backgrounds/sato.png')}
          style={{
            width: '100%',
            height: '100%',
          }}
          resizeMode='cover'>
          <SafeAreaView style={{ flex: 1 }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
              <View
                style={{
                  flex: 1,
                  padding: 20,
                  justifyContent: 'center',
                }}>
                <View
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    padding: 20,
                    borderRadius: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}>
                  <Text
                    style={{
                      fontSize: 24,
                      fontFamily: 'font-mplus-bold',
                      textAlign: 'center',
                      marginBottom: 32,
                      color: '#000',
                    }}>
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
                      style={{
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
                      }}
                      autoFocus
                    />
                  )}

                  {currentStep === 'birthday' && (
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#FFF',
                        paddingVertical: 16,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderColor: '#E5E7EB',
                      }}
                      onPress={handleBirthdayPress}>
                      <Text
                        style={{
                          textAlign: 'center',
                          fontSize: 20,
                          fontFamily: 'font-mplus',
                          color: '#000',
                        }}>
                        {birthday === 'no_answer' ? 'こたえない' : birthday ? formatDate(new Date(birthday)) : 'ここをタッチしてね'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {currentStep === 'gender' && (
                    <View style={{ gap: 16 }}>
                      {(['male', 'female', 'other'] as Gender[]).map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={{
                            width: '100%',
                            paddingVertical: 16,
                            paddingHorizontal: 20,
                            borderRadius: 24,
                            borderWidth: 2,
                            borderColor: gender === option ? '#E86A33' : '#E5E7EB',
                            backgroundColor: gender === option ? 'rgba(232, 106, 51, 0.1)' : '#FFF',
                          }}
                          onPress={() => setGender(option)}>
                          <Text
                            style={{
                              textAlign: 'center',
                              fontSize: 20,
                              fontFamily: 'font-mplus',
                              color: gender === option ? '#E86A33' : '#000',
                            }}>
                            {genderLabels[option]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={{
                          width: '100%',
                          paddingVertical: 16,
                          paddingHorizontal: 20,
                          borderRadius: 24,
                          borderWidth: 2,
                          borderColor: gender === 'no_answer' ? '#E86A33' : '#E5E7EB',
                          backgroundColor: gender === 'no_answer' ? 'rgba(232, 106, 51, 0.1)' : '#FFF',
                        }}
                        onPress={() => setGender('no_answer')}>
                        <Text
                          style={{
                            textAlign: 'center',
                            fontSize: 20,
                            fontFamily: 'font-mplus',
                            color: gender === 'no_answer' ? '#E86A33' : '#000',
                          }}>
                          こたえない
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: 32,
                  }}>
                  {currentStep !== 'name' ? (
                    <TouchableOpacity
                      onPress={handleBack}
                      style={{
                        backgroundColor: '#FFF',
                        padding: 16,
                        borderRadius: 9999,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3,
                      }}>
                      <AntDesign name='arrowleft' size={24} color='#E86A33' />
                    </TouchableOpacity>
                  ) : (
                    <View style={{ width: 54 }} />
                  )}

                  <TouchableOpacity
                    onPress={handleNext}
                    style={{
                      backgroundColor: '#E86A33',
                      padding: 16,
                      borderRadius: 9999,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 3,
                    }}>
                    <AntDesign name='arrowright' size={24} color='#FFF' />
                  </TouchableOpacity>
                </View>

                {showDatePicker && Platform.OS === 'ios' && (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: '#FFF',
                      borderTopLeftRadius: 12,
                      borderTopRightRadius: 12,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: -2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 3,
                      paddingTop: 8,
                    }}>
                    <DateTimePicker
                      value={selectedDate}
                      mode='date'
                      display='spinner'
                      onChange={handleDateChange}
                      locale='ja'
                      textColor='#000000'
                      style={{ height: 200 }}
                    />
                  </View>
                )}
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </ImageBackground>
      </View>
    );
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#F5F5F7',
      }}>
      <StatusBar style='dark' />
      {renderStep()}
    </View>
  );
}

export default AuthScreen;
