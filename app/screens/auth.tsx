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
import { ArrowLeftIcon, ArrowRightIcon } from 'react-native-heroicons/outline';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { supabase } from '../../src/lib/supabase';
import authService from '../../src/services/authService';

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
    if (!name || !birthday) {
      Alert.alert('エラー', '必要な情報を入力してください');
      return;
    }

    setIsLoading(true);

    let retryCount = 0;
    while (retryCount < MAX_RETRIES) {
      try {
        console.log(`認証試行 ${retryCount + 1}/${MAX_RETRIES} 回目...`);

        // 匿名ログイン
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

        if (authError) {
          if (authError.message.includes('Network request failed')) {
            throw authError;
          }
          console.error('認証エラー:', authError);
          Alert.alert('エラー', '認証に失敗しました。もう一度お試しください。');
          setIsLoading(false);
          return;
        }

        if (!authData.user) {
          throw new Error('ユーザー登録に失敗しました');
        }

        console.log('匿名ログイン成功:', {
          userId: authData.user.id,
          sessionExists: !!authData.session,
        });

        // プロフィール情報の登録
        const { error: profileError } = await supabase.from('user_profiles').insert({
          user_id: authData.user.id,
          display_name: name,
          birthday: birthday === 'no_answer' ? null : birthday,
          gender: gender || 'no_answer',
          is_anonymous: true,
        });

        if (profileError) {
          console.error('プロフィール登録エラー:', profileError);
          throw profileError;
        }

        // ユーザー状態の初期化
        const { error: stateError } = await supabase.from('user_state').insert({
          user_id: authData.user.id,
          test_completed: false,
          current_stage: 'beginner',
          display_name: name,
        });

        if (stateError) {
          console.error('ユーザー状態初期化エラー:', stateError);
          throw stateError;
        }

        // トレーニング統計の初期化
        const { error: statsError } = await supabase.from('training_stats').insert({
          user_id: authData.user.id,
          total_minutes: 0,
          streak_count: 0,
          longest_streak: 0,
          perfect_days: 0,
          average_accuracy: 0,
          experience: 0,
          level: 1,
          rank: '下忍',
        });

        if (statsError) {
          console.error('トレーニング統計初期化エラー:', statsError);
          throw statsError;
        }

        // 認証状態を更新
        await authService.updateSession(authData.session);

        // テスト完了状態を確認
        const { data: testResults, error: testError } = await supabase
          .from('initial_test_results')
          .select('id')
          .eq('user_id', authData.user.id)
          .maybeSingle();

        if (testError) {
          console.error('テスト結果確認エラー:', testError);
          throw testError;
        }

        // テストが未完了の場合はテストページへ、完了している場合はホームへ
        if (!testResults) {
          router.replace('/screens/initial-test');
        } else {
          router.replace('/');
        }
        return;
      } catch (error) {
        console.error('登録エラー:', error);

        if (retryCount < MAX_RETRIES - 1) {
          retryCount++;
          const delay = getRetryDelay(retryCount);
          console.log(`リトライ ${retryCount}/${MAX_RETRIES} 回目... ${delay}ms後に再試行`);
          await sleep(delay);
          continue;
        }

        Alert.alert('エラー', 'ネットワーク接続に問題があります。\nWi-FiまたはモバイルデータをONにして、\nもう一度お試しください。');
        break;
      }
    }

    setIsLoading(false);
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
          options: ['キャンセル', '日付を選択', 'こたえない'],
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
            登録中...
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
                      <ArrowLeftIcon size={24} color='#E86A33' />
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
                    <ArrowRightIcon size={24} color='#FFF' />
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
