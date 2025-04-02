import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Alert, ScrollView, SafeAreaView, Image, ImageBackground, Easing } from 'react-native';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// 全ての拗音のリスト
const YOON_LIST = [
  'きゃ',
  'きゅ',
  'きょ',
  'しゃ',
  'しゅ',
  'しょ',
  'ちゃ',
  'ちゅ',
  'ちょ',
  'にゃ',
  'にゅ',
  'にょ',
  'ひゃ',
  'ひゅ',
  'ひょ',
  'みゃ',
  'みゅ',
  'みょ',
  'りゃ',
  'りゅ',
  'りょ',
  'ぎゃ',
  'ぎゅ',
  'ぎょ',
  'じゃ',
  'じゅ',
  'じょ',
  'びゃ',
  'びゅ',
  'びょ',
  'ぴゃ',
  'ぴゅ',
  'ぴょ',
];

export default function InitialTest() {
  const router = useRouter();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [currentYoon, setCurrentYoon] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [remainingYoon, setRemainingYoon] = useState<string[]>([]);
  const [results, setResults] = useState<Array<{ yoon: string; time: number }>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [testLevel, setTestLevel] = useState<'beginner' | 'intermediate' | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showEncouragement, setShowEncouragement] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const speakingAnim = useRef(new Animated.Value(1)).current;
  const shurikenAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const shurikenRotation = useRef(new Animated.Value(0)).current;
  const shurikenScale = useRef(new Animated.Value(0)).current;
  const characterScale = useRef(new Animated.Value(1)).current;
  const elderFloatAnim = useRef(new Animated.Value(0)).current;
  const encouragementAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 音声録音の権限を取得と録音開始
    const initializeRecording = async () => {
      await Audio.requestPermissionsAsync();
      // 拗音をシャッフル
      const shuffled = [...YOON_LIST].sort(() => Math.random() - 0.5);
      setRemainingYoon(shuffled);
      setCurrentYoon(shuffled[0]);

      // 初回の録音を開始
      if (!showIntro && !showResults) {
        startRecording();
      }
    };

    initializeRecording();

    // 喋るアニメーションを開始
    Animated.loop(
      Animated.sequence([
        Animated.timing(speakingAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(speakingAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 長老のふわふわアニメーション
    Animated.loop(
      Animated.sequence([
        Animated.timing(elderFloatAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(elderFloatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      // コンポーネントのアンマウント時に録音を停止
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [showIntro, showResults]);

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

      setRecording(recording);
      setIsRecording(true);
      // アニメーションと文字表示が完了してから時間計測を開始
      setTimeout(() => {
        setStartTime(Date.now());
      }, 100); // 文字が完全に表示されるのを待つ

      // アニメーション開始
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (err) {
      console.error('録音開始エラー:', err);
      Alert.alert('エラー', '録音を開始できませんでした。');
    }
  };

  const playShurikenAnimation = () => {
    // アニメーションの初期値をリセット
    shurikenAnim.setValue({ x: -200, y: 100 });
    shurikenRotation.setValue(0);
    shurikenScale.setValue(1);
    characterScale.setValue(1);

    return new Promise((resolve) => {
      Animated.parallel([
        // 手裏剣が文字に向かって飛ぶ
        Animated.timing(shurikenAnim, {
          toValue: { x: 0, y: 0 },
          duration: 500,
          useNativeDriver: true,
        }),
        // 手裏剣が回転する
        Animated.timing(shurikenRotation, {
          toValue: 8,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // ヒット時の演出
        Animated.sequence([
          Animated.parallel([
            // 文字が大きくなってから小さくなる
            Animated.sequence([
              Animated.timing(characterScale, {
                toValue: 1.2,
                duration: 100,
                useNativeDriver: true,
              }),
              Animated.timing(characterScale, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
            ]),
            // 手裏剣が消える
            Animated.timing(shurikenScale, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          // アニメーション完了後、文字を表示状態に戻す
          characterScale.setValue(1);
          resolve(true);
        });
      });
    });
  };

  const showEncouragementPopover = () => {
    Animated.spring(encouragementAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 15,
      stiffness: 150,
    }).start();
    setShowEncouragement(true);
  };

  const hideEncouragementPopover = () => {
    Animated.timing(encouragementAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowEncouragement(false);
    });
  };

  const handleEncouragementContinue = () => {
    hideEncouragementPopover();
    // 残りの拗音をシャッフル
    const remainingYoonCopy = [...remainingYoon.slice(1)];
    setRemainingYoon(remainingYoonCopy);
    setCurrentYoon(remainingYoonCopy[0]);
    startRecording();
  };

  const stopRecording = async () => {
    if (!recording || !startTime) return;

    try {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      // 最小時間を0.5秒に制限
      const adjustedDuration = Math.max(duration, 0.5);

      await recording.stopAndUnloadAsync();

      // 結果を保存
      const newResults = [...results, { yoon: currentYoon, time: adjustedDuration }];
      setResults(newResults);

      setRecording(null);
      setIsRecording(false);
      setStartTime(null);

      // 次の拗音を設定
      const newRemaining = remainingYoon.slice(1);

      if (newRemaining.length > 0) {
        // 10問、20問、30問終了時に励ましを表示
        const questionNumber = YOON_LIST.length - newRemaining.length;
        if (questionNumber === 10 || questionNumber === 20 || questionNumber === 30) {
          await playShurikenAnimation();
          showEncouragementPopover();
        } else {
          // 通常の進行
          await playShurikenAnimation();
          setRemainingYoon(newRemaining);
          setCurrentYoon(newRemaining[0]);
          startRecording();
        }
      } else {
        // テスト完了
        await saveResults();
      }
    } catch (err) {
      console.error('録音停止エラー:', err);
      Alert.alert('エラー', '録音を停止できませんでした。');
    }
  };

  const saveResults = async () => {
    try {
      // 2.5秒以内の正解数をカウント
      const correctCount = results.filter((r) => r.time <= 2.5).length;
      const level = correctCount >= YOON_LIST.length / 3 ? 'intermediate' : 'beginner';
      setTestLevel(level);

      // 現在のユーザーIDを取得
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user?.id) throw new Error('ユーザーIDが取得できません');

      // 既存のテスト結果を確認
      const { data: existingResult } = await supabase.from('initial_test_results').select('id').eq('user_id', session.user.id).maybeSingle();

      let error;
      if (existingResult) {
        // 既存のレコードを更新
        ({ error } = await supabase
          .from('initial_test_results')
          .update({
            results: results,
            level: level,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingResult.id));
      } else {
        // 新しいレコードを挿入
        ({ error } = await supabase.from('initial_test_results').insert({
          user_id: session.user.id,
          results: results,
          level: level,
        }));
      }

      if (error) throw error;

      // 結果表示画面を表示
      setShowResults(true);
    } catch (err) {
      console.error('結果保存エラー:', err);
      Alert.alert('エラー', '結果を保存できませんでした。');
    }
  };

  const handlePause = async () => {
    if (isRecording) {
      await recording?.stopAndUnloadAsync();
      setRecording(null);
      setIsRecording(false);
    }
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
    startRecording();
  };

  const handleStop = () => {
    // 録音を完全に停止
    if (recording) {
      recording.stopAndUnloadAsync();
    }
    setRecording(null);
    setIsRecording(false);
    setIsPaused(false);
    // 初期テストのトップ画面に戻る
    setShowIntro(true);
  };

  const ResultsScreen = () => {
    const correctCount = results.filter((r) => r.time <= 2.5).length;
    const accuracy = (correctCount / YOON_LIST.length) * 100;

    // 結果を分類する関数
    const getTimeCategory = (time: number) => {
      if (time <= 1.0) return { message: 'とてもじょうず！', color: '#4CAF50', bgColor: '#E8F5E9' };
      if (time <= 2.0) return { message: 'じょうず！', color: '#2196F3', bgColor: '#E3F2FD' };
      if (time <= 3.0) return { message: 'がんばったね', color: '#FF9800', bgColor: '#FFF3E0' };
      return { message: 'もうすこし！', color: '#F44336', bgColor: '#FFEBEE' };
    };

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
          <View style={{ alignItems: 'center', marginBottom: 30, marginTop: 20 }}>
            <Text style={{ fontFamily: 'font-mplus-bold', fontSize: 24, color: '#333', marginBottom: 10 }}>テスト結果</Text>
            <Text style={{ fontFamily: 'font-mplus-bold', fontSize: 18, color: '#666', marginBottom: 5 }}>
              レベル: {testLevel === 'intermediate' ? '中級' : '初級'}
            </Text>
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontFamily: 'font-mplus-bold', fontSize: 18, color: '#333', marginBottom: 10 }}>詳細結果:</Text>
            {results.map((result, index) => {
              const category = getTimeCategory(result.time);
              return (
                <View
                  key={index}
                  style={{
                    backgroundColor: category.bgColor,
                    padding: 15,
                    marginBottom: 8,
                    borderRadius: 12,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: 'font-mplus-bold',
                        fontSize: 24,
                        marginRight: 15,
                        color: '#333',
                      }}>
                      {result.yoon}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'font-mplus',
                        fontSize: 16,
                        color: category.color,
                      }}>
                      {category.message}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: 'font-mplus',
                      fontSize: 14,
                      color: '#666',
                    }}>
                    {result.time.toFixed(2)}秒
                  </Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={async () => {
              try {
                // 現在のユーザーIDを取得
                const {
                  data: { session },
                } = await supabase.auth.getSession();
                if (!session?.user?.id) {
                  throw new Error('ユーザーIDが取得できません');
                }

                // ユーザーの進捗情報を更新
                const { error } = await supabase
                  .from('user_state')
                  .update({
                    test_completed: true,
                    test_level: testLevel,
                    test_results: results,
                    current_stage: testLevel,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('user_id', session.user.id);

                if (error) throw error;

                // テストレベルに応じて適切な画面に遷移
                if (testLevel === 'intermediate') {
                  router.replace('/screens/intermediate');
                } else {
                  router.replace('/screens/beginner');
                }
              } catch (error) {
                console.error('画面遷移エラー:', error);
                Alert.alert('エラー', 'つぎの がめんに すすめませんでした');
              }
            }}
            style={{
              backgroundColor: '#41644A',
              padding: 15,
              borderRadius: 8,
              alignItems: 'center',
              marginTop: 20,
              marginBottom: 30,
            }}>
            <Text style={{ color: '#FFF', fontFamily: 'font-mplus-bold', fontSize: 16 }}>つぎへすすむ</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  };

  const IntroScreen = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 20,
          paddingVertical: 20,
        }}>
        <View
          style={{
            flex: 1,
            justifyContent: 'space-between',
            minHeight: 500,
          }}>
          {/* ヘッダー部分 */}
          <View style={{ alignItems: 'center', marginBottom: 30 }}>
            <View
              style={{
                backgroundColor: '#F5F5F7',
                borderRadius: 20,
                padding: 20,
                marginBottom: 20,
                width: '100%',
                alignItems: 'center',
                position: 'relative',
              }}>
              {/* 吹き出しの三角形 */}
              <View
                style={{
                  position: 'absolute',
                  bottom: -10,
                  width: 0,
                  height: 0,
                  backgroundColor: 'transparent',
                  borderStyle: 'solid',
                  borderLeftWidth: 10,
                  borderRightWidth: 10,
                  borderTopWidth: 20,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderTopColor: '#F5F5F7',
                }}
              />
              <Text
                style={{
                  fontFamily: 'font-mplus',
                  fontSize: 18,
                  color: '#666',
                  textAlign: 'center',
                  lineHeight: 28,
                }}>
                みんな、こんにちは！{'\n'}
                これから たのしい げーむを はじめるよ！{'\n'}
                ひらがなを よんで ちゃれんじ してみよう
              </Text>
            </View>
            <Animated.View
              style={{
                transform: [{ scale: speakingAnim }],
              }}>
              <Image
                source={require('../../assets/temp/elder-worried.png')}
                style={{
                  width: 200,
                  height: 200,
                  resizeMode: 'contain',
                }}
              />
            </Animated.View>
            <Text
              style={{
                fontFamily: 'font-mplus-bold',
                fontSize: 32,
                color: '#333',
                textAlign: 'center',
                marginTop: 20,
                marginBottom: 16,
              }}>
              はじめのてすと
            </Text>
          </View>

          {/* 説明部分 */}
          <View
            style={{
              backgroundColor: '#FFF9E6',
              padding: 24,
              borderRadius: 16,
              marginBottom: 30,
            }}>
            <Text
              style={{
                fontFamily: 'font-mplus-bold',
                fontSize: 22,
                color: '#333',
                marginBottom: 16,
              }}>
              どんな げーむ？
            </Text>
            <Text
              style={{
                fontFamily: 'font-mplus',
                fontSize: 16,
                color: '#666',
                lineHeight: 24,
                marginBottom: 20,
              }}>
              がめんに でてくる ひらがなを{'\n'}
              おおきな こえで よんでみよう！{'\n'}
              ぜんぶで 33もじ あるよ{'\n'}
              がんばって よんでみよう！{'\n'}
              じょうずに よめると、ごほうびが もらえるかも...？
            </Text>
          </View>

          {/* 手順部分 */}
          <View
            style={{
              backgroundColor: '#F5F5F7',
              padding: 24,
              borderRadius: 16,
              marginBottom: 30,
            }}>
            <Text
              style={{
                fontFamily: 'font-mplus-bold',
                fontSize: 22,
                color: '#333',
                marginBottom: 16,
              }}>
              あそびかた：
            </Text>
            <View style={{ gap: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  padding: 16,
                  borderRadius: 12,
                }}>
                <MaterialCommunityIcons name='numeric-1-circle' size={24} color='#41644A' style={{ marginRight: 12 }} />
                <View>
                  <Text
                    style={{
                      fontFamily: 'font-mplus-bold',
                      fontSize: 18,
                      color: '#41644A',
                      marginBottom: 4,
                    }}>
                    がめんに でる もじを よむ
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'font-mplus',
                      fontSize: 14,
                      color: '#666',
                    }}>
                    おおきなこえで はっきりと よんでね！
                  </Text>
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  padding: 16,
                  borderRadius: 12,
                }}>
                <MaterialCommunityIcons name='numeric-2-circle' size={24} color='#41644A' style={{ marginRight: 12 }} />
                <View>
                  <Text
                    style={{
                      fontFamily: 'font-mplus-bold',
                      fontSize: 18,
                      color: '#41644A',
                      marginBottom: 4,
                    }}>
                    よみおわったら ボタンを おす
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'font-mplus',
                      fontSize: 14,
                      color: '#666',
                    }}>
                    オレンジいろの ボタンを タップしてね
                  </Text>
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  padding: 16,
                  borderRadius: 12,
                }}>
                <MaterialCommunityIcons name='numeric-3-circle' size={24} color='#41644A' style={{ marginRight: 12 }} />
                <View>
                  <Text
                    style={{
                      fontFamily: 'font-mplus-bold',
                      fontSize: 18,
                      color: '#41644A',
                      marginBottom: 4,
                    }}>
                    つぎの もじに ちょうせん！
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'font-mplus',
                      fontSize: 14,
                      color: '#666',
                    }}>
                    ぜんぶで 33もじに ちょうせんしよう！
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* アドバイス */}
          <View
            style={{
              backgroundColor: '#E8F3E8',
              padding: 20,
              borderRadius: 16,
              marginBottom: 30,
              borderWidth: 2,
              borderColor: '#41644A',
              borderStyle: 'dashed',
            }}>
            <Text
              style={{
                fontFamily: 'font-mplus-bold',
                fontSize: 16,
                color: '#41644A',
                textAlign: 'center',
                lineHeight: 24,
              }}>
              ⭐️ あどばいす ⭐️{'\n'}
              おとなの ひとと いっしょに{'\n'}
              やってみよう！{'\n'}
              ゆっくり、はっきり よむのが こつだよ
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 15 }}>
              {['🌟', '🎯', '🎮', '🦊', '🐱'].map((emoji, index) => (
                <Text key={index} style={{ fontSize: 20, marginHorizontal: 5 }}>
                  {emoji}
                </Text>
              ))}
            </View>
          </View>

          {/* 開始ボタン */}
          <TouchableOpacity
            onPress={() => setShowIntro(false)}
            style={{
              backgroundColor: '#41644A',
              padding: 20,
              borderRadius: 30,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 5,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 10,
            }}>
            <MaterialCommunityIcons name='flag-checkered' size={28} color='#FFF' />
            <Text
              style={{
                color: '#FFF',
                fontFamily: 'font-mplus-bold',
                fontSize: 20,
              }}>
              よーい、どん！
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  if (showIntro) {
    return <IntroScreen />;
  }

  if (showResults) {
    return <ResultsScreen />;
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ImageBackground
        source={require('../../assets/temp/doujou.png')}
        style={{
          flex: 1,
          width: '100%',
        }}
        resizeMode='cover'>
        <View
          style={{
            flex: 1,
            paddingHorizontal: 20,
            // backgroundColor: 'rgba(255, 255, 255, 0.85)',
          }}>
          {/* 長老のイラスト */}
          <Animated.Image
            source={require('../../assets/temp/elder-worried.png')}
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              width: 60,
              height: 60,
              zIndex: 2,
              transform: [
                {
                  translateY: elderFloatAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -10],
                  }),
                },
              ],
              opacity: 0.9,
            }}
          />

          {/* 進捗表示 */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 80, // 長老の下に表示されるように調整
              marginBottom: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: 10,
              borderRadius: 15,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}>
            <Text
              style={{
                fontFamily: 'font-mplus-bold',
                fontSize: 18,
                color: '#41644A',
                textShadowColor: 'rgba(255, 255, 255, 0.8)',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2,
              }}>
              のこり: {remainingYoon.length} もじ
            </Text>
            <TouchableOpacity onPress={handlePause}>
              <MaterialCommunityIcons name='close' size={24} color='#41644A' />
            </TouchableOpacity>
          </View>

          {/* 一時停止中の表示 */}
          {isPaused && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10,
                paddingHorizontal: 20,
              }}>
              <View
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  padding: 30,
                  borderRadius: 25,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 5,
                }}>
                <Text
                  style={{
                    fontFamily: 'font-mplus-bold',
                    fontSize: 28,
                    color: '#41644A',
                    marginBottom: 30,
                    textAlign: 'center',
                  }}>
                  ていしちゅう
                </Text>
                <View style={{ gap: 16, alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={handleResume}
                    style={{
                      backgroundColor: '#41644A',
                      paddingHorizontal: 30,
                      paddingVertical: 15,
                      borderRadius: 25,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      minWidth: 200,
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: 3,
                    }}>
                    <MaterialCommunityIcons name='play' size={24} color='#FFF' />
                    <Text style={{ color: '#FFF', fontFamily: 'font-mplus-bold', fontSize: 18 }}>さいかい</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleStop}
                    style={{
                      backgroundColor: '#E86A33',
                      paddingHorizontal: 30,
                      paddingVertical: 15,
                      borderRadius: 25,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      minWidth: 200,
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: 3,
                    }}>
                    <MaterialCommunityIcons name='close-circle' size={24} color='#FFF' />
                    <Text style={{ color: '#FFF', fontFamily: 'font-mplus-bold', fontSize: 18 }}>ちゅうし</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* 励ましポップオーバー */}
          {showEncouragement && (
            <>
              {/* バックドロップ */}
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 999,
                }}
              />
              <Animated.View
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: [{ translateX: -150 }, { translateY: -200 }, { scale: encouragementAnim }],
                  backgroundColor: 'white',
                  padding: 20,
                  borderRadius: 15,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 5,
                  width: 300,
                  zIndex: 1000,
                }}>
                <Image source={require('../../assets/temp/ninja_syuriken_man.png')} style={{ width: 120, height: 120, marginBottom: 10 }} />
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#4CAF50', marginBottom: 10 }}>すごい！</Text>
                <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 }}>
                  もう10もんも できたよ！{'\n'}このちょうしで がんばろう！
                </Text>
                <TouchableOpacity
                  onPress={handleEncouragementContinue}
                  style={{
                    backgroundColor: '#4CAF50',
                    paddingVertical: 10,
                    paddingHorizontal: 30,
                    borderRadius: 25,
                  }}>
                  <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>さいかい</Text>
                </TouchableOpacity>
              </Animated.View>
            </>
          )}

          {/* 拗音表示 */}
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            {/* 文字の背景円 */}
            <View
              style={{
                position: 'absolute',
                width: '80%',
                height: 240,
                borderRadius: 24,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 5,
              }}
            />

            <Animated.Text
              style={{
                fontFamily: 'font-mplus-bold',
                fontSize: 120,
                color: '#333',
                transform: [{ scale: characterScale }],
                textShadowColor: 'rgba(255, 255, 255, 0.8)',
                textShadowOffset: { width: 2, height: 2 },
                textShadowRadius: 4,
              }}>
              {currentYoon}
            </Animated.Text>

            {/* 手裏剣 */}
            <Animated.Image
              source={require('../../assets/temp/shuriken.png')}
              style={{
                position: 'absolute',
                width: 60,
                height: 60,
                transform: [
                  { translateX: shurikenAnim.x },
                  { translateY: shurikenAnim.y },
                  {
                    rotate: shurikenRotation.interpolate({
                      inputRange: [0, 8],
                      outputRange: ['0deg', '1440deg'],
                    }),
                  },
                  { scale: shurikenScale },
                ],
              }}
            />
          </View>

          {/* 録音ボタン */}
          <View
            style={{
              alignItems: 'center',
              marginBottom: 40,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: 20,
              borderRadius: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}>
            <TouchableOpacity
              onPress={stopRecording}
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: '#E86A33',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 5,
                elevation: 6,
              }}>
              <MaterialCommunityIcons name='stop' size={40} color='#FFF' />
            </TouchableOpacity>
            <Text
              style={{
                fontFamily: 'font-mplus',
                fontSize: 16,
                color: '#41644A',
                marginTop: 10,
                textShadowColor: 'rgba(255, 255, 255, 0.8)',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2,
              }}>
              よみおわったら タップ
            </Text>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}
