import React, { useState, useEffect, useRef } from 'react';
import { Alert, Animated } from 'react-native';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { supabase } from '@src/lib/supabase';
import { stageService } from '@src/services/stageService';
import { StageType } from '@src/types/progress';
import AsyncStorage from '@react-native-async-storage/async-storage';
import aiService from '@src/services/aiService';

import IntroScreen from './IntroScreen';
import TestScreen from './TestScreen';
import ResultsScreen from './ResultsScreen';

// 全ての拗音のリスト
const YOON_LIST = [
  'きゃ', 'きゅ', 'きょ',
  'しゃ', 'しゅ', 'しょ',
  'ちゃ', 'ちゅ', 'ちょ',
  'にゃ', 'にゅ', 'にょ',
  'ひゃ', 'ひゅ', 'ひょ',
  'みゃ', 'みゅ', 'みょ',
  'りゃ', 'りゅ', 'りょ',
  'ぎゃ', 'ぎゅ', 'ぎょ',
  'じゃ', 'じゅ', 'じょ',
  'びゃ', 'びゅ', 'びょ',
  'ぴゃ', 'ぴゅ', 'ぴょ',
];

// 濁音・半濁音のリスト
const DAKUON_LIST = [
  'が', 'ぎ', 'ぐ', 'げ', 'ご',
  'ざ', 'じ', 'ず', 'ぜ', 'ぞ',
  'だ', 'ぢ', 'づ', 'で', 'ど',
  'ば', 'び', 'ぶ', 'べ', 'ぼ',
  'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ',
];

// 清音のリスト
const SEION_LIST = [
  'あ', 'い', 'う', 'え', 'お',
  'か', 'き', 'く', 'け', 'こ',
  'さ', 'し', 'す', 'せ', 'そ',
  'た', 'ち', 'つ', 'て', 'と',
  'な', 'に', 'ぬ', 'ね', 'の',
  'は', 'ひ', 'ふ', 'へ', 'ほ',
  'ま', 'み', 'む', 'め', 'も',
  'や', 'ゆ', 'よ',
  'ら', 'り', 'る', 'れ', 'ろ',
  'わ', 'を', 'ん',
];

interface TestResult {
  yoon: string;
  time: number;
  audioUri?: string;
  aiResult?: {
    predictions?: Array<{ character: string; confidence: number }>;
    top3?: Array<{ character: string; confidence: number }>;
    isCorrect?: boolean;
    confidence?: number;
    processingTime?: number;
  };
}

export default function InitialTest() {
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [currentYoon, setCurrentYoon] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [remainingYoon, setRemainingYoon] = useState<string[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [testLevel, setTestLevel] = useState<'beginner' | 'intermediate' | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [currentEncouragementCount, setCurrentEncouragementCount] = useState(0);
  const [isAIReady, setIsAIReady] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isRecordingUnloaded, setIsRecordingUnloaded] = useState(false);
  const [showCharacter, setShowCharacter] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const encouragementAnim = useRef(new Animated.Value(0)).current;
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const remainingYoonRef = useRef<string[]>([]);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const currentYoonRef = useRef<string>('');
  const resultsRef = useRef<TestResult[]>([]);
  const isInitializingRef = useRef(false);

  useEffect(() => {
    const initializeRecording = async () => {
      // 既に初期化中または初期化済みの場合はスキップ
      if (isInitializingRef.current || isInitialized) {
        return;
      }
      
      isInitializingRef.current = true;
      
      await Audio.requestPermissionsAsync();
      
      console.log('AIサービスを初期化中...');
      const aiInitialized = await aiService.initialize();
      if (aiInitialized) {
        console.log('AIサービス初期化成功');
        setIsAIReady(true);
      } else {
        console.log('AIサービス初期化失敗 - モックモードで続行');
        setIsAIReady(true);
      }
      
      const shuffled = [...YOON_LIST].sort(() => Math.random() - 0.5);
      console.log('YOON_LIST:', YOON_LIST);
      console.log('Shuffled list:', shuffled);
      console.log('First character:', shuffled[0]);
      setRemainingYoon(shuffled);
      remainingYoonRef.current = shuffled;
      setCurrentYoon(shuffled[0]);
      currentYoonRef.current = shuffled[0];
      
      setIsInitialized(true);
    };

    initializeRecording();

    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {
          // エラーを無視（コンポーネントのアンマウント時なので）
        });
      }
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // 11問目と22問目で励ましを表示
    if ((results.length === 11 || results.length === 22) && !showEncouragement) {
      // 録音中の場合は停止
      if (recordingRef.current && isRecording) {
        console.log('励まし表示のため録音を停止');
        recordingRef.current.stopAndUnloadAsync().then(() => {
          setRecording(null);
          recordingRef.current = null;
          setIsRecording(false);
          setIsRecordingUnloaded(true);
        }).catch(err => {
          console.error('録音停止エラー:', err);
        });
      }
      
      // タイマーもクリア
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      setCurrentEncouragementCount(results.length);
      setShowEncouragement(true);
      
      // アニメーションを開始
      Animated.sequence([
        Animated.timing(encouragementAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [results.length]);

  const startRecording = async () => {
    try {
      // 既に録音中または処理中の場合は何もしない
      if (isRecording || recordingRef.current || isProcessingAI || isTransitioning || showEncouragement) {
        console.log('録音中または処理中、または励まし表示中のため、新しい録音を開始しません');
        return;
      }

      console.log('録音を開始します:', currentYoonRef.current);
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // WAV形式の録音設定
      const recordingOptions: Audio.RecordingOptions = {
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/wav',
          bitsPerSecond: 256000,
        },
      };

      const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);

      setRecording(newRecording);
      recordingRef.current = newRecording;
      setIsRecording(true);
      setIsRecordingUnloaded(false);
      
      // 録音開始と同時に文字を表示して時間計測開始
      setShowCharacter(true);
      const currentTime = Date.now();
      setStartTime(currentTime);
      startTimeRef.current = currentTime;

      recordingTimerRef.current = setTimeout(() => {
        console.log('2.5秒経過したため、録音を自動停止します');
        stopRecording();
      }, 2500);
    } catch (err) {
      console.error('録音の開始に失敗しました', err);
    }
  };

  const stopRecording = async () => {
    // 録音が開始されていない場合の録音開始処理
    if (!isRecording && !recording && !recordingRef.current) {
      console.log('録音を開始');
      startRecording();
      return;
    }

    if (!recordingRef.current || !startTimeRef.current) {
      console.log('録音が開始されていません');
      return;
    }

    if (isProcessingAI || isTransitioning) {
      console.log('既にAI処理中または遷移中です');
      return;
    }

    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    try {
      console.log('録音を停止します:', currentYoonRef.current);
      setIsProcessingAI(true);
      setIsTransitioning(true);
      setIsRecording(false);

      const endTime = Date.now();
      const elapsedTime = (endTime - startTimeRef.current) / 1000;

      await recordingRef.current.stopAndUnloadAsync();
      setIsRecordingUnloaded(true);

      const fileUri = recordingRef.current.getURI();
      let aiResult = undefined;

      if (fileUri && isAIReady) {
        try {
          console.log('AI処理を開始:', currentYoonRef.current);
          const startAI = Date.now();
          
          // classifySpeechメソッドを使用
          const aiClassificationResult = await aiService.classifySpeech(
            currentYoonRef.current,  // 期待される文字
            currentYoonRef.current,  // 正解文字
            fileUri                  // 音声ファイルのURI
          );
          
          const endAI = Date.now();
          console.log('AI処理完了:', (endAI - startAI) / 1000, '秒');

          if (aiClassificationResult && aiClassificationResult.top3) {
            aiResult = {
              predictions: aiClassificationResult.top3,
              top3: aiClassificationResult.top3,
              isCorrect: aiClassificationResult.isCorrect,
              confidence: aiClassificationResult.confidence,
              processingTime: (endAI - startAI) / 1000
            };

            console.log('AI認識結果:', {
              正解文字: currentYoonRef.current,
              認識文字: aiClassificationResult.character,
              信頼度: aiClassificationResult.confidence,
              正解判定: aiClassificationResult.isCorrect
            });
          }
        } catch (aiError) {
          console.error('AI処理エラー:', aiError);
        }
      }

      const newResult: TestResult = {
        yoon: currentYoonRef.current,
        time: elapsedTime,
        audioUri: fileUri || undefined,
        aiResult
      };

      const newResults = [...resultsRef.current, newResult];
      setResults(newResults);
      resultsRef.current = newResults;
      setIsProcessingAI(false);

      setRecording(null);
      recordingRef.current = null;
      setStartTime(null);
      startTimeRef.current = null;
      setIsRecordingUnloaded(false);

      const newRemaining = remainingYoonRef.current.slice(1);
      if (newRemaining.length > 0) {
        // 11問目または22問目完了時は励ましを表示するため、録音を開始しない
        if (newResults.length === 11 || newResults.length === 22) {
          // 励まし表示時は先に文字を更新
          setRemainingYoon(newRemaining);
          remainingYoonRef.current = newRemaining;
          setCurrentYoon(newRemaining[0]);
          currentYoonRef.current = newRemaining[0];
          console.log('次の文字を設定(励まし時):', newRemaining[0]);
          
          console.log(`${newResults.length}問目完了 - 励ましを表示します`);
          setIsTransitioning(false);
          setIsProcessingAI(false);
          // 励ましはuseEffectで自動的に表示される
        } else {
          // 文字を更新して非表示にする
          setRemainingYoon(newRemaining);
          remainingYoonRef.current = newRemaining;
          setCurrentYoon(newRemaining[0]);
          currentYoonRef.current = newRemaining[0];
          console.log('次の文字を設定(通常時):', newRemaining[0]);
          setShowCharacter(false);  // 文字を非表示
          
          // 録音開始時に文字が表示される
          setTimeout(() => {
            console.log('次の録音を開始します:', newRemaining[0]);
            setIsTransitioning(false);
            setIsProcessingAI(false);
            startRecording();
          }, 500);
        }
      } else {
        setIsTransitioning(false);
        await saveResults();
      }
    } catch (err) {
      console.error('録音停止エラー:', err);
      if (err instanceof Error && err.message.includes('already been unloaded')) {
        console.log('録音は既に停止されています（正常）');
      } else {
        Alert.alert('エラー', '録音を停止できませんでした。');
      }
    } finally {
      if (isRecording || isTransitioning) {
        console.log('finally: エラーのため録音状態をリセット');
        setIsRecording(false);
        setRecording(null);
        recordingRef.current = null;
        setStartTime(null);
        startTimeRef.current = null;
        setIsRecordingUnloaded(false);
        setIsTransitioning(false);
      }
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

      const correctAnswers = results.filter((result) => {
        if (result.aiResult && result.aiResult.isCorrect !== undefined) {
          return result.aiResult.isCorrect;
        } else {
          return result.time <= 2.5;
        }
      });
      const correctRate = correctAnswers.length / results.length;
      
      const aiResults = results.filter(r => r.aiResult);
      console.log('AI認識統計:', {
        総問題数: results.length,
        AI認識実行数: aiResults.length,
        AI正解数: aiResults.filter(r => r.aiResult?.isCorrect).length,
        平均信頼度: aiResults.reduce((sum, r) => sum + (r.aiResult?.confidence || 0), 0) / (aiResults.length || 1)
      });

      const averageTime = results.reduce((sum, result) => sum + result.time, 0) / results.length;

      const seionResults = results.filter((r) => SEION_LIST.includes(r.yoon));
      const dakuonResults = results.filter((r) => DAKUON_LIST.includes(r.yoon));
      const yoonResults = results.filter((r) => YOON_LIST.includes(r.yoon));

      const seionAvg = seionResults.length > 0 ? seionResults.reduce((sum, r) => sum + r.time, 0) / seionResults.length : 0;
      const dakuonAvg = dakuonResults.length > 0 ? dakuonResults.reduce((sum, r) => sum + r.time, 0) / dakuonResults.length : 0;
      const yoonAvg = yoonResults.length > 0 ? yoonResults.reduce((sum, r) => sum + r.time, 0) / yoonResults.length : 0;

      let determinedLevel;
      if (correctRate >= 1 / 3) {
        determinedLevel = 'intermediate';
        setTestLevel('intermediate');
      } else {
        determinedLevel = 'beginner';
        setTestLevel('beginner');
      }

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

      const { error: updateError } = await supabase.from('initial_test_results').upsert({
        user_id: userId,
        is_completed: true,
        level: determinedLevel,
        completed_at: new Date().toISOString(),
        results: JSON.stringify(results),
      });

      if (updateError) {
        console.error('テスト完了状態の更新エラー:', updateError);
      } else {
        console.log('テスト完了状態を更新しました: is_completed=true, level=' + determinedLevel);
      }

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

      await stageService.initializeStageForUser(userId, determinedLevel === 'beginner' ? StageType.BEGINNER : StageType.INTERMEDIATE);
    } catch (error) {
      console.error('進捗データの保存エラー:', error);
      Alert.alert('エラー', '進捗データの保存に失敗しました');
    }
  };

  const handlePause = async () => {
    try {
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      if (recording && !isRecordingUnloaded) {
        await recording.stopAndUnloadAsync();
        setIsRecordingUnloaded(true);
        setIsRecording(false);
        setIsPaused(true);
      }
    } catch (error) {
      console.error('録音の一時停止中にエラーが発生しました:', error);
      setIsRecording(false);
      setIsPaused(true);
      setIsRecordingUnloaded(true);
    }
  };

  const handleResume = async () => {
    try {
      console.log('新しい録音を開始します');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // WAV形式の録音設定
      const recordingOptions: Audio.RecordingOptions = {
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/wav',
          bitsPerSecond: 256000,
        },
      };

      const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);

      setRecording(newRecording);
      setIsRecordingUnloaded(false);
      setIsRecording(true);
      setIsPaused(false);
      setStartTime(Date.now());

      recordingTimerRef.current = setTimeout(() => {
        console.log('2.5秒経過したため、録音を自動停止します');
        stopRecording();
      }, 2500);
    } catch (error) {
      console.error('録音の再開中にエラーが発生しました:', error);
    }
  };

  const handleStop = async () => {
    try {
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      if (recording && !isRecordingUnloaded) {
        try {
          await recording.stopAndUnloadAsync();
          setIsRecordingUnloaded(true);
        } catch (unloadError) {
          console.log('録音の停止処理をスキップ:', String(unloadError));
        }
      }

      setIsRecording(false);
      setIsPaused(false);
      setRecording(null);
      setIsRecordingUnloaded(false);

      const newRemaining = remainingYoon.slice(1);
      if (newRemaining.length > 0) {
        setRemainingYoon(newRemaining);
        remainingYoonRef.current = newRemaining;
        setCurrentYoon(newRemaining[0]);
        currentYoonRef.current = newRemaining[0];
        setTimeout(() => {
          startRecording();
        }, 500);
      } else {
        await saveResults();
      }
    } catch (error) {
      console.error('録音の停止中にエラーが発生しました:', error);
      const newRemaining = remainingYoon.slice(1);
      if (newRemaining.length > 0) {
        setRemainingYoon(newRemaining);
        remainingYoonRef.current = newRemaining;
        setCurrentYoon(newRemaining[0]);
        currentYoonRef.current = newRemaining[0];
        setTimeout(() => {
          startRecording();
        }, 500);
      } else {
        await saveResults();
      }
    }
  };

  const handleEncouragementContinue = () => {
    setShowEncouragement(false);
    encouragementAnim.setValue(0);
    
    // 状態をリセット
    setIsProcessingAI(false);
    setIsTransitioning(false);
    setIsRecording(false);
    setRecording(null);
    recordingRef.current = null;
    setStartTime(null);
    startTimeRef.current = null;
    setIsRecordingUnloaded(false);
    setShowCharacter(false);  // 文字を非表示にして、録音開始時に表示
    
    // 録音は自動開始せず、ユーザーのタップを待つ
    console.log('励ましを閉じました。タップで録音開始可能です。');
  };

  if (showIntro) {
    return <IntroScreen onComplete={() => setShowIntro(false)} />;
  }

  if (showResults) {
    return (
      <ResultsScreen
        results={results}
        testLevel={testLevel || 'beginner'}
        YOON_LIST={YOON_LIST}
        SEION_LIST={SEION_LIST}
        DAKUON_LIST={DAKUON_LIST}
      />
    );
  }

  return (
    <TestScreen
      currentYoon={currentYoon}
      remainingYoon={remainingYoon}
      isRecording={isRecording}
      isPaused={isPaused}
      isProcessingAI={isProcessingAI}
      isTransitioning={isTransitioning}
      isAIReady={isAIReady}
      showEncouragement={showEncouragement}
      currentEncouragementCount={currentEncouragementCount}
      showCharacter={showCharacter}
      results={results}
      onPause={handlePause}
      onResume={handleResume}
      onStop={handleStop}
      onRecordingComplete={stopRecording}
      onEncouragementContinue={handleEncouragementContinue}
    />
  );
}