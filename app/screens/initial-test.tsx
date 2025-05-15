import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Alert,
  ScrollView,
  SafeAreaView,
  Image,
  ImageBackground,
  Easing,
  Dimensions,
  Button,
} from 'react-native';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { supabase } from '@src/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { stageService } from '@src/services/stageService';
import { StageType } from '@src/types/progress';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get('window').width;

const INTRO_PAGES = [
  {
    title: 'こんにちは！',
    message: 'ぼくは にんじゃの\nしょうねんです！\nいっしょに たのしく べんきょうしようね！',
    backgroundColor: '#FFE0B2',
    image: require('@assets/temp/ninja_syuriken_man.png'),
  },
  {
    title: 'なにをするの？',
    message: 'がめんに でてくる もじを\nよんでみてね！\nきみの よみかたを きかせてね！',
    backgroundColor: '#B2DFDB',
    image: require('@assets/temp/ninja_syuriken_man.png'),
  },
  {
    title: 'どうやるの？',
    message: 'もじが でてきたら\nおおきな こえで よんでね！\nよみおわったら したの ボタンを\nタップしてね！',
    backgroundColor: '#F8BBD0',
    image: require('@assets/temp/ninja_syuriken_man.png'),
  },
  {
    title: 'だいじょうぶ！',
    message: 'はやく よめなくても\nだいじょうぶ！\nゆっくり たのしく\nがんばろうね！',
    backgroundColor: '#C5CAE9',
    image: require('@assets/temp/elder-worried.png'),
  },
  {
    title: 'じゅんびは いい？',
    message: 'それじゃあ はじめよう！\nきみなら できるよ！\nいっしょに がんばろう！',
    backgroundColor: '#DCEDC8',
    image: require('@assets/temp/elder-worried.png'),
  },
];

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

// 濁音・半濁音のリスト
const DAKUON_LIST = [
  'が',
  'ぎ',
  'ぐ',
  'げ',
  'ご',
  'ざ',
  'じ',
  'ず',
  'ぜ',
  'ぞ',
  'だ',
  'ぢ',
  'づ',
  'で',
  'ど',
  'ば',
  'び',
  'ぶ',
  'べ',
  'ぼ',
  'ぱ',
  'ぴ',
  'ぷ',
  'ぺ',
  'ぽ',
];

// 清音のリスト（拗音と濁音・半濁音以外の基本的なひらがな）
const SEION_LIST = [
  'あ',
  'い',
  'う',
  'え',
  'お',
  'か',
  'き',
  'く',
  'け',
  'こ',
  'さ',
  'し',
  'す',
  'せ',
  'そ',
  'た',
  'ち',
  'つ',
  'て',
  'と',
  'な',
  'に',
  'ぬ',
  'ね',
  'の',
  'は',
  'ひ',
  'ふ',
  'へ',
  'ほ',
  'ま',
  'み',
  'む',
  'め',
  'も',
  'や',
  'ゆ',
  'よ',
  'ら',
  'り',
  'る',
  'れ',
  'ろ',
  'わ',
  'を',
  'ん',
];

const IntroPage = ({ page, index }: { page: (typeof INTRO_PAGES)[0]; index: number }) => {
  return (
    <View
      style={{
        width: SCREEN_WIDTH,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: page.backgroundColor,
      }}>
      <View
        style={{
          width: '90%',
          height: '90%',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 20,
        }}>
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 25,
            paddingHorizontal: 30,
            paddingVertical: 15,
            borderWidth: 4,
            borderColor: '#FFE500',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}>
          <Text
            style={{
              fontSize: 32,
              fontFamily: 'Zen-B',
              color: '#FF5B79',
              textAlign: 'center',
            }}>
            {page.title}
          </Text>
        </View>

        <View
          style={{
            width: '80%',
            height: '40%',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Image
            source={page.image}
            style={{
              width: '100%',
              height: '100%',
            }}
            resizeMode='contain'
          />
        </View>

        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 20,
            width: '90%',
            borderWidth: 3,
            borderColor: '#FFE500',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}>
          <Text
            style={{
              fontSize: 24,
              fontFamily: 'Zen-B',
              color: '#333333',
              textAlign: 'center',
              lineHeight: 36,
            }}>
            {page.message}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 20,
          }}>
          {INTRO_PAGES.map((_, i) => (
            <View
              key={i}
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                marginHorizontal: 5,
                borderWidth: 2,
                borderColor: '#FFE500',
                backgroundColor: i === index ? '#FF5B79' : '#FFFFFF',
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

interface TestResult {
  yoon: string;
  time: number;
}

export default function InitialTest() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [currentYoon, setCurrentYoon] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [remainingYoon, setRemainingYoon] = useState<string[]>([]);
  const [results, setResults] = useState<Array<{ yoon: string; time: number }>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [testLevel, setTestLevel] = useState<'beginner' | 'intermediate' | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [currentEncouragementCount, setCurrentEncouragementCount] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const speakingAnim = useRef(new Animated.Value(1)).current;
  const characterScale = useRef(new Animated.Value(1)).current;
  const elderFloatAnim = useRef(new Animated.Value(0)).current;
  const encouragementAnim = useRef(new Animated.Value(0)).current;

  // 録音の状態を追跡するフラグを追加
  const [isRecordingUnloaded, setIsRecordingUnloaded] = useState(false);

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
      setStartTime(Date.now());

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

  const showEncouragementPopover = () => {
    // 現在完了した問題数を計算
    const completedQuestions = YOON_LIST.length - remainingYoon.length;
    // 10の倍数の問題数を設定
    setCurrentEncouragementCount(completedQuestions);

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
    // 次の文字を設定して録音開始
    const remainingYoonCopy = [...remainingYoon.slice(1)];
    setRemainingYoon(remainingYoonCopy);
    setCurrentYoon(remainingYoonCopy[0]);
    // アニメーション完了後に録音開始
    setTimeout(() => {
      startRecording();
    }, 300);
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
        // 10問ごとに励ましを表示
        const questionNumber = YOON_LIST.length - newRemaining.length;
        if (questionNumber > 0 && questionNumber % 10 === 0) {
          // 励ましポップアップを表示
          encouragementAnim.setValue(0); // アニメーション値をリセット
          showEncouragementPopover();
        } else {
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
      const currentTime = Date.now();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!sessionData.session?.user?.id) {
        throw new Error('ユーザーIDが取得できません');
      }

      const userId = sessionData.session.user.id;

      // 1/3の正答率を確認（2.5秒以内の回答を正解とする）
      const correctAnswers = results.filter((result) => result.time <= 2.5);
      const correctRate = correctAnswers.length / results.length;

      // 平均回答時間を計算
      const averageTime = results.reduce((sum, result) => sum + result.time, 0) / results.length;

      // 清音・濁音・拗音ごとの平均時間を計算
      const seionResults = results.filter((r) => SEION_LIST.includes(r.yoon));
      const dakuonResults = results.filter((r) => DAKUON_LIST.includes(r.yoon));
      const yoonResults = results.filter((r) => YOON_LIST.includes(r.yoon));

      const seionAvg = seionResults.length > 0 ? seionResults.reduce((sum, r) => sum + r.time, 0) / seionResults.length : 0;
      const dakuonAvg = dakuonResults.length > 0 ? dakuonResults.reduce((sum, r) => sum + r.time, 0) / dakuonResults.length : 0;
      const yoonAvg = yoonResults.length > 0 ? yoonResults.reduce((sum, r) => sum + r.time, 0) / yoonResults.length : 0;

      // 結果に基づいてレベル判定（添付画像の仕様に従って）
      let determinedLevel;

      if (correctRate >= 1 / 3) {
        // 正答率が1/3以上の場合、中級からスタート
        determinedLevel = 'intermediate';
        setTestLevel('intermediate');
      } else {
        // 正答率が1/3未満の場合、初級からスタート
        determinedLevel = 'beginner';
        setTestLevel('beginner');
      }

      // 結果をストレージに保存
      await AsyncStorage.setItem(
        'initialTestResults',
        JSON.stringify({
          results,
          correctRate,
          averageTime,
          seionAvg,
          dakuonAvg,
          yoonAvg,
          determinedLevel,
          timestamp: currentTime,
        })
      );

      // Supabaseにも結果を保存
      const { error: insertError } = await supabase.from('user_test_results').insert({
        user_id: userId,
        results: JSON.stringify(results),
        correct_rate: correctRate,
        average_time: averageTime,
        seion_avg: seionAvg,
        dakuon_avg: dakuonAvg,
        yoon_avg: yoonAvg,
        determined_level: determinedLevel,
        created_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      // initial_test_resultsテーブルの更新
      const { error: updateError } = await supabase.from('initial_test_results').upsert({
        user_id: userId,
        is_completed: true,
        level: determinedLevel,
        completed_at: new Date().toISOString(),
        results: JSON.stringify(results),
      });

      if (updateError) {
        console.error('テスト完了状態の更新エラー:', updateError);
        // エラーログを出すだけで処理は続行
      } else {
        console.log('テスト完了状態を更新しました: is_completed=true, level=' + determinedLevel);
      }

      // user_profilesテーブルのcharacter_levelも更新
      const { error: profileUpdateError } = await supabase
        .from('user_profiles')
        .update({
          character_level: determinedLevel,
        })
        .eq('user_id', userId);

      if (profileUpdateError) {
        console.error('ユーザープロフィールのレベル更新エラー:', profileUpdateError);
      } else {
        console.log('ユーザープロフィールのレベルを更新しました: character_level=' + determinedLevel);
      }

      setShowResults(true);

      // レベルに基づいて初期ステージを設定
      await stageService.initializeStageForUser(userId, determinedLevel === 'beginner' ? StageType.BEGINNER : StageType.INTERMEDIATE);

      // このコメントは削除しない - 以下コメントアウトされた元の遷移コード
      // router.replace('/screens/intermediate');や/screens/beginnerへの遷移をコメントアウト
    } catch (error) {
      console.error('進捗データの保存エラー:', error);
      Alert.alert('エラー', '進捗データの保存に失敗しました');
    }
  };

  const ResultsScreen = () => {
    const correctCount = results.filter((r) => r.time <= 2.5).length;
    const accuracy = (correctCount / YOON_LIST.length) * 100;

    // 文字の種類を判定する関数
    const getCharacterType = (char: string) => {
      if (SEION_LIST.includes(char)) return 'せいおん';
      if (DAKUON_LIST.includes(char)) return 'だくおん';
      if (YOON_LIST.includes(char)) return 'ようおん';
      return 'その他';
    };

    // 結果を分類する関数（時間と文字種類を考慮）
    const getTimeCategory = (time: number, char: string) => {
      const charType = getCharacterType(char);

      // 添付画像の仕様に基づいた時間区分
      if (time <= 1.5) {
        // 上級（軽症）
        return { message: 'とてもじょうず！', color: '#4CAF50', bgColor: '#E8F5E9', level: 'じょうきゅう' };
      } else if (time <= 2.0) {
        // 中級
        return { message: 'じょうず！', color: '#2196F3', bgColor: '#E3F2FD', level: 'ちゅうきゅう' };
      } else if (time <= 2.5) {
        // 初級（重症）
        return { message: 'がんばったね', color: '#FF9800', bgColor: '#FFF3E0', level: 'しょきゅう' };
      } else {
        // 2.5秒以上
        return { message: 'もうすこし！', color: '#F44336', bgColor: '#FFEBEE', level: 'しょきゅう' };
      }
    };

    // 10問ごとにグループ化する
    const groupedResults = results.reduce((acc, result, index) => {
      const groupIndex = Math.floor(index / 10);
      if (!acc[groupIndex]) {
        acc[groupIndex] = [];
      }
      acc[groupIndex].push(result);
      return acc;
    }, [] as TestResult[][]);

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
          <View style={{ alignItems: 'center', marginBottom: 30, marginTop: 20 }}>
            <Text style={{ fontFamily: 'font-mplus-bold', fontSize: 24, color: '#333', marginBottom: 10 }}>てすとけっか</Text>
            <Text style={{ fontFamily: 'font-mplus-bold', fontSize: 18, color: '#666', marginBottom: 5 }}>
              レベル: {testLevel === 'intermediate' ? 'ちゅうきゅう' : 'しょきゅう'}
            </Text>
          </View>

          {groupedResults.map((group, groupIndex) => (
            <View key={`group-${groupIndex}`} style={{ marginBottom: 30 }}>
              <Text style={{ fontFamily: 'font-mplus-bold', fontSize: 18, color: '#333', marginBottom: 10, textAlign: 'center' }}>
                だい{groupIndex + 1}セット
              </Text>
              <View style={{ marginBottom: 20 }}>
                {group.map((result, index) => {
                  const category = getTimeCategory(result.time, result.yoon);
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
                        <View>
                          <Text
                            style={{
                              fontFamily: 'font-mplus',
                              fontSize: 16,
                              color: category.color,
                            }}>
                            {category.message}
                          </Text>
                          <Text
                            style={{
                              fontFamily: 'font-mplus',
                              fontSize: 12,
                              color: '#666',
                            }}>
                            {getCharacterType(result.yoon)}・{category.level}
                          </Text>
                        </View>
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
            </View>
          ))}

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

  // 一時停止処理
  const handlePause = async () => {
    try {
      if (recording && !isRecordingUnloaded) {
        await recording.stopAndUnloadAsync();
        setIsRecordingUnloaded(true);
        setIsRecording(false);
        setIsPaused(true);
        // 一時停止した時点でrecordingオブジェクトは再利用できない
      }
    } catch (error) {
      console.error('録音の一時停止中にエラーが発生しました:', error);
      // エラーが発生しても状態は更新する
      setIsRecording(false);
      setIsPaused(true);
      setIsRecordingUnloaded(true);
    }
  };

  // 録音再開処理
  const handleResume = async () => {
    try {
      // 常に新しい録音を開始する
      console.log('新しい録音を開始します');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

      setRecording(newRecording);
      setIsRecordingUnloaded(false); // 新しい録音なのでフラグをリセット
      setIsRecording(true);
      setIsPaused(false);
      setStartTime(Date.now());

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
    } catch (error) {
      console.error('録音の再開中にエラーが発生しました:', error);
    }
  };

  // 録音完全停止処理
  const handleStop = async () => {
    try {
      // 録音オブジェクトが存在し、まだアンロードされていない場合のみ停止処理を実行
      if (recording && !isRecordingUnloaded) {
        try {
          await recording.stopAndUnloadAsync();
          setIsRecordingUnloaded(true);
        } catch (unloadError) {
          console.log('録音の停止処理をスキップ:', String(unloadError));
          // エラーを無視して処理を続行
        }
      }

      // 状態をすべてリセット
      setIsRecording(false);
      setIsPaused(false);
      setRecording(null);

      // 現在の文字をスキップして次の文字に進む
      const newRemaining = remainingYoon.slice(1);
      if (newRemaining.length > 0) {
        setRemainingYoon(newRemaining);
        setCurrentYoon(newRemaining[0]);
        // 次の文字を表示後に録音を開始
        setTimeout(() => {
          startRecording();
        }, 500);
      } else {
        // テスト完了の場合
        await saveResults();
      }
    } catch (error) {
      console.error('録音の停止中にエラーが発生しました:', error);
      // エラーが発生した場合でも次の文字に進める
      const newRemaining = remainingYoon.slice(1);
      if (newRemaining.length > 0) {
        setRemainingYoon(newRemaining);
        setCurrentYoon(newRemaining[0]);
        setTimeout(() => {
          startRecording();
        }, 500);
      } else {
        await saveResults();
      }
    }
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentPage(page);
  };

  const handleSkip = () => {
    setShowIntro(false);
  };

  const handleStart = () => {
    if (currentPage === INTRO_PAGES.length - 1) {
      setShowIntro(false);
    } else {
      scrollViewRef.current?.scrollTo({
        x: (currentPage + 1) * SCREEN_WIDTH,
        animated: true,
      });
    }
  };

  if (showIntro) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}>
          {INTRO_PAGES.map((page, index) => (
            <IntroPage key={index} page={page} index={index} />
          ))}
        </ScrollView>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingBottom: 40,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          }}>
          <TouchableOpacity
            style={{
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 25,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderWidth: 2,
              borderColor: '#FFE500',
            }}
            onPress={handleSkip}>
            <Text
              style={{
                fontSize: 18,
                fontFamily: 'Zen-B',
                color: '#666666',
              }}>
              スキップ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              paddingVertical: 12,
              paddingHorizontal: 40,
              borderRadius: 25,
              backgroundColor: '#00C853',
              borderWidth: 3,
              borderColor: '#FFE500',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
            onPress={handleStart}>
            <Text
              style={{
                fontSize: 24,
                fontFamily: 'Zen-B',
                color: '#FFFFFF',
              }}>
              {currentPage === INTRO_PAGES.length - 1 ? 'はじめる' : 'つぎへ'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
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
                  bottom: 0,
                  left: 0,
                  right: 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 999,
                }}>
                <Animated.View
                  style={{
                    width: 300,
                    transform: [
                      {
                        scale: encouragementAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                    ],
                    opacity: encouragementAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                    backgroundColor: 'white',
                    padding: 20,
                    borderRadius: 15,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 5,
                    zIndex: 1000,
                  }}>
                  <Image source={require('../../assets/temp/elder-worried.png')} style={{ width: 120, height: 120, marginBottom: 10 }} />
                  <Text style={{ fontSize: 24, fontFamily: 'font-mplus-bold', color: '#4CAF50', marginBottom: 10, textAlign: 'center' }}>
                    すごい！
                  </Text>
                  <Text style={{ fontSize: 16, fontFamily: 'font-mplus', color: '#666', textAlign: 'center', marginBottom: 20 }}>
                    {currentEncouragementCount}もんめ おわったよ！{'\n'}このちょうしで がんばろう！
                  </Text>
                  <TouchableOpacity
                    onPress={handleEncouragementContinue}
                    style={{
                      backgroundColor: '#4CAF50',
                      paddingVertical: 10,
                      paddingHorizontal: 30,
                      borderRadius: 25,
                    }}>
                    <Text style={{ color: 'white', fontSize: 18, fontFamily: 'font-mplus-bold' }}>つぎへ</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
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
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: '#E86A33',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 5,
                elevation: 6,
              }}>
              <MaterialCommunityIcons name='stop' size={60} color='#FFF' />
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
