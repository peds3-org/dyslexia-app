import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Animated, Vibration } from 'react-native';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { supabase } from '@src/lib/supabase';
import stageService from '@src/services/stageService';
import { StageType } from '@src/types/progress';
import AsyncStorage from '@react-native-async-storage/async-storage';
import aiService from '@src/services/aiService';
import TestScreen from '@src/components/test/TestScreen';

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

export default function InitialTestMain() {
  const router = useRouter();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [currentYoon, setCurrentYoon] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [remainingYoon, setRemainingYoon] = useState<string[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [currentEncouragementCount, setCurrentEncouragementCount] = useState(0);
  const [isAIReady, setIsAIReady] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showCharacter, setShowCharacter] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [needsCountdown, setNeedsCountdown] = useState(false); // 特定の問題でカウントダウンが必要か
  
  // テストの状態を管理する単一の状態
  type TestState = 'idle' | 'countdown' | 'recording' | 'processing' | 'encouragement' | 'paused';
  const [testState, setTestState] = useState<TestState>('idle');
  const testStateRef = useRef<TestState>('idle');

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const encouragementAnim = useRef(new Animated.Value(0)).current;
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const remainingYoonRef = useRef<string[]>([]);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const currentYoonRef = useRef<string>('');
  const resultsRef = useRef<TestResult[]>([]);
  const isInitializingRef = useRef(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingAIRef = useRef(false);
  const lastButtonPressRef = useRef(0);
  const hasStartedRef = useRef(false); // hasStartedのref版を追加
  const needsCountdownRef = useRef(false); // needsCountdownのref版を追加
  
  // カウントダウン管理用の状態を統合
  const countdownStateRef = useRef<{
    isActive: boolean;
    questionNumber: number | null;
    lockId: string | null; // ユニークIDで二重実行を防ぐ
  }>({ isActive: false, questionNumber: null, lockId: null });

  useEffect(() => {
    const initializeRecording = async () => {
      if (isInitializingRef.current || isInitialized) {
        return;
      }
      
      isInitializingRef.current = true;
      console.log('初期化を開始します');
      
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
      setRemainingYoon(shuffled);
      remainingYoonRef.current = shuffled;
      setCurrentYoon(shuffled[0]);
      currentYoonRef.current = shuffled[0];
      
      setIsInitialized(true);
      console.log('初期化完了');
    };

    initializeRecording();

    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      if (recordingTimerRef.current) {
        console.log('コンポーネントアンマウント時に録音タイマーをクリア');
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      // コンポーネントアンマウント時はカウントダウン状態をリセット
      countdownStateRef.current = { isActive: false, questionNumber: null, lockId: null };
      setCountdown(null);
    };
  }, []);

  // needsCountdownとneedsCountdownRefを同期
  useEffect(() => {
    needsCountdownRef.current = needsCountdown;
  }, [needsCountdown]);
  
  useEffect(() => {
    if ((results.length === 11 || results.length === 22) && !showEncouragement) {
      if (recordingRef.current && isRecording) {
        recordingRef.current.stopAndUnloadAsync().then(() => {
          setRecording(null);
          recordingRef.current = null;
          setIsRecording(false);
        }).catch(err => {
          console.error('録音停止エラー:', err);
        });
      }
      
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      setCurrentEncouragementCount(results.length);
      setShowEncouragement(true);
      
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
      console.log('startRecordingが呼ばれました');
      console.log('  現在の状態:', testStateRef.current);
      console.log('  問題番号:', resultsRef.current.length + 1);
      console.log('  カウントダウン状態:', countdownStateRef.current);
      console.log('  hasStarted:', hasStartedRef.current);
      
      // まだ開始していない場合は録音しない（初回タップの場合）
      if (!hasStartedRef.current) {
        console.log('まだ開始していないため録音をスキップ');
        return;
      }
      
      // 録音可能な状態か確認
      if (testStateRef.current !== 'idle') {
        console.log('録音できない状態です:', testStateRef.current);
        return;
      }
      
      // hasStartedがfalseの場合は録音を開始しない
      if (!hasStartedRef.current) {
        console.log('hasStartedがfalseのため、録音を開始しません');
        return;
      }
      
      // 既に録音中の場合は何もしない
      if (isRecording || recordingRef.current) {
        console.log('既に録音中です');
        return;
      }

      console.log('録音を開始します: 「' + currentYoonRef.current + '」');
      
      // 録音状態に移行
      setTestState('recording');
      testStateRef.current = 'recording';
      setIsRecording(true);
      setShowCharacter(true);
      setIsProcessingAI(false);
      isProcessingAIRef.current = false;
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

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

      // 録音オブジェクトを設定
      setRecording(newRecording);
      recordingRef.current = newRecording;
      
      // タイムスタンプを設定
      const currentTime = Date.now();
      setStartTime(currentTime);
      startTimeRef.current = currentTime;

      // 自動停止タイマーを設定（共通設定を使用）
      const timerId = setTimeout(async () => {
        console.log('=== 2.5秒タイマー発動 ===');
        console.log('  録音タイマーID:', timerId);
        console.log('  現在の状態:', testStateRef.current);
        console.log('  問題番号:', resultsRef.current.length + 1);
        console.log('  recordingRef.current:', recordingRef.current ? '存在' : 'null');
        console.log('  isProcessingAIRef.current:', isProcessingAIRef.current);
        console.log('  needsCountdown:', needsCountdown);
        
        // AI処理中の場合はスキップ
        if (isProcessingAIRef.current || testStateRef.current === 'processing') {
          console.log('AI処理中のため自動停止をスキップ');
          return;
        }
        
        // hasStartedがfalseの場合はスキップ（無限ループ防止）
        if (!hasStartedRef.current) {
          console.log('hasStartedがfalseのため自動停止をスキップ');
          return;
        }
        
        // カウントダウン中の場合はスキップ
        if (countdownStateRef.current.isActive || testStateRef.current === 'countdown') {
          console.log('カウントダウン中のため自動停止をスキップ');
          return;
        }
        
        // カウントダウン中または必要な場合はスキップ（無限ループ防止）
        if (testStateRef.current === 'countdown' || countdownStateRef.current.isActive) {
          console.log('カウントダウン中のため自動停止をスキップ');
          return;
        }
        
        // 録音中の場合のみ停止
        if (recordingRef.current && testStateRef.current === 'recording') {
          console.log('stopRecordingを呼び出します');
          await stopRecording();
        } else {
          console.log('録音していないため自動停止をスキップ');
          console.log('  recordingRef.current:', recordingRef.current);
          console.log('  testStateRef.current:', testStateRef.current);
        }
      }, RECORDING_TIMER_CONFIG.INITIAL_TEST_DURATION_MS);
      recordingTimerRef.current = timerId;
      console.log('録音タイマーを設定しました:', timerId);
      
      console.log('録音開始完了');
    } catch (err) {
      console.error('録音の開始に失敗しました', err);
      // エラー時は状態をリセット
      setTestState('idle');
      testStateRef.current = 'idle';
      setIsRecording(false);
      setShowCharacter(false);
      setIsProcessingAI(false);
      isProcessingAIRef.current = false;
    }
  };

  // カウントダウンを開始する関数
  const startCountdown = () => {
    const currentQuestionNumber = resultsRef.current.length + 1;
    const lockId = `countdown-${currentQuestionNumber}-${Date.now()}`; // ユニークIDを生成
    
    console.log('=== startCountdown が呼ばれました ===');
    console.log('  問題番号:', currentQuestionNumber);
    console.log('  lockId:', lockId);
    console.log('  countdownStateRef:', countdownStateRef.current);
    console.log('  testStateRef.current:', testStateRef.current);
    console.log('  countdown:', countdown);
    console.log('  countdownIntervalRef.current:', countdownIntervalRef.current);
    
    // ロックIDで二重実行を防ぐ（最優先チェック）
    if (countdownStateRef.current.lockId !== null) {
      console.log('カウントダウンが既にロックされています');
      console.log('  既存のlockId:', countdownStateRef.current.lockId);
      return;
    }
    
    // 即座にロック（React StrictMode対策）
    countdownStateRef.current = {
      isActive: true,
      questionNumber: currentQuestionNumber,
      lockId: lockId
    };
    
    // 既にカウントダウン中の場合もダブルチェック
    if (testStateRef.current === 'countdown' || countdownIntervalRef.current !== null || countdown !== null) {
      console.log('カウントダウン状態が検出されたため、ロックを解除');
      countdownStateRef.current = { isActive: false, questionNumber: null, lockId: null };
      return;
    }
    
    // 録音中の場合は録音を停止
    if (recordingRef.current) {
      console.log('録音中のため、録音を停止します');
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      setRecording(null);
      recordingRef.current = null;
      setIsRecording(false);
    }
    
    console.log('カウントダウンを開始します (問題番号:', currentQuestionNumber, ')');
    
    // 二重防止のため、既存のタイマーをクリア
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    // 状態を更新
    setTestState('countdown');
    testStateRef.current = 'countdown';
    
    // needsCountdownを即座にクリア（重要: 無限ループ防止）
    setNeedsCountdown(false);
    needsCountdownRef.current = false;
    
    // カウントダウン開始
    let count = 5;
    setCountdown(count);
    
    const intervalId = setInterval(() => {
      // ロックIDで確認（二重実行防止）
      if (countdownStateRef.current.lockId !== lockId) {
        console.log('ロックIDが一致しないため、インターバルをクリア');
        console.log('  期待するlockId:', lockId);
        console.log('  現在のlockId:', countdownStateRef.current.lockId);
        clearInterval(intervalId);
        return;
      }
      
      count--;
      console.log('カウントダウン:', count);
      
      if (count > 0) {
        setCountdown(count);
      } else {
        // カウントダウン終了
        console.log('カウントダウン完了');
        if (intervalId === countdownIntervalRef.current) {
          clearInterval(intervalId);
          countdownIntervalRef.current = null;
        }
        setCountdown(null);
        setTestState('idle');
        testStateRef.current = 'idle';
        
        // カウントダウン状態をリセット
        countdownStateRef.current = {
          isActive: false,
          questionNumber: null,
          lockId: null
        };
        
        // 録音を開始
        console.log('カウントダウン後に録音を開始します');
        setTimeout(() => {
          startRecording();
        }, 100);
      }
    }, 1000);
    
    countdownIntervalRef.current = intervalId;
  };
  
  // 録音を停止してAI処理を行う関数
  const stopRecording = async () => {
    console.log('stopRecordingが呼ばれました');
    console.log('  現在の状態:', testStateRef.current);
    console.log('  録音中:', isRecording);
    console.log('  問題番号:', resultsRef.current.length + 1);
    
    console.log('  hasStarted:', hasStartedRef.current);
    console.log('  needsCountdown:', needsCountdown);
    console.log('  countdown:', countdown);
    
    // ケース1: 初回（1問目）でまだ開始していない場合
    if (!hasStartedRef.current && resultsRef.current.length === 0) {
      if (testStateRef.current === 'countdown' || countdown !== null || countdownStateRef.current.isActive) {
        console.log('初回だがすでにカウントダウン中');
        return;
      }
      console.log('初回のタップです');
      // 重要: hasStartedを即座にtrueに設定して、2.5秒タイマーが再度このケースに入らないようにする
      setHasStarted(true);
      hasStartedRef.current = true;
      
      // 録音タイマーをクリア（重要: 2.5秒タイマーによる再実行を防ぐ）
      if (recordingTimerRef.current) {
        console.log('初回タップ時に録音タイマーをクリア');
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      startCountdown();
      return;
    }
    
    // ケース2: 12問目または23問目でカウントダウンが必要な場合
    // 重要: 録音中の場合はこのチェックをスキップ
    if (needsCountdown && testStateRef.current !== 'countdown' && countdown === null && !countdownStateRef.current.isActive && !recordingRef.current) {
      console.log('カウントダウンが必要な問題です（12問目または23問目）');
      // 録音タイマーをクリア（重要: 2.5秒タイマーによる再実行を防ぐ）
      if (recordingTimerRef.current) {
        console.log('カウントダウン開始前に録音タイマーをクリア');
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      startCountdown();
      return;
    }
    
    // ケース3: カウントダウン中の場合は何もしない
    if (testStateRef.current === 'countdown' || countdown !== null) {
      console.log('カウントダウン中のため何もしません');
      return;
    }
    
    // ケース4: 録音中またはAI処理中の場合は通常の録音停止処理を行う
    if (recordingRef.current && (testStateRef.current === 'recording' || testStateRef.current === 'processing')) {
      console.log('録音中またはAI処理中のため、通常の録音停止処理を行います');
      // 以下の録音停止処理へ進む
    } else if (!recordingRef.current) {
      // ケース5: 録音していない場合は何もしない
      console.log('録音していないため何もしません');
      console.log('  recordingRef.current:', recordingRef.current);
      return;
    }
    
    // ケース6: 既に処理中の場合は何もしない
    if (testStateRef.current === 'processing' || isProcessingAIRef.current) {
      console.log('既に処理中のため何もしません');
      console.log('  testStateRef.current:', testStateRef.current);
      console.log('  isProcessingAIRef.current:', isProcessingAIRef.current);
      return;
    }

    // 以下、録音を停止してAI処理を実行
    console.log('録音を停止してAI処理を開始します');
    
    // 録音タイマーをクリア
    if (recordingTimerRef.current) {
      console.log('録音タイマーをクリア');
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    try {
      console.log('録音を停止します:', currentYoonRef.current);
      
      // 即座に処理中状態に移行（中間状態を作らない）
      setTestState('processing');
      testStateRef.current = 'processing';
      setIsRecording(false);
      setIsProcessingAI(true);
      isProcessingAIRef.current = true;

      const endTime = Date.now();
      const elapsedTime = (endTime - startTimeRef.current) / 1000;

      // 録音を停止
      const currentRecording = recordingRef.current;
      await currentRecording.stopAndUnloadAsync();
      const fileUri = currentRecording.getURI();
      
      // 録音オブジェクトを即座にクリア（重要）
      setRecording(null);
      recordingRef.current = null;
      setStartTime(null);
      startTimeRef.current = null;
      
      console.log('録音オブジェクトをクリアしました');

      // AI処理
      let aiResult = undefined;
      if (fileUri && isAIReady) {
        try {
          console.log('AI処理を開始:', currentYoonRef.current);
          const startAI = Date.now();
          
          const aiClassificationResult = await aiService.classifySpeech(
            currentYoonRef.current,
            currentYoonRef.current,
            fileUri
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
          }
        } catch (aiError) {
          console.error('AI処理エラー:', aiError);
        }
      }

      // 結果を保存
      const newResult: TestResult = {
        yoon: currentYoonRef.current,
        time: elapsedTime,
        audioUri: fileUri || undefined,
        aiResult
      };

      const newResults = [...resultsRef.current, newResult];
      setResults(newResults);
      resultsRef.current = newResults;

      // 次の問題を準備
      const newRemaining = remainingYoonRef.current.slice(1);
      
      // 33問完了したら結果画面へ
      if (newResults.length >= 33) {
        setTestState('idle');
        testStateRef.current = 'idle';
        setIsProcessingAI(false);
        isProcessingAIRef.current = false;
        await saveResults();
        return;
      }
      
      if (newRemaining.length > 0) {
        // 次の文字を設定
        setRemainingYoon(newRemaining);
        remainingYoonRef.current = newRemaining;
        setCurrentYoon(newRemaining[0]);
        currentYoonRef.current = newRemaining[0];
        
        if (newResults.length === 11 || newResults.length === 22) {
          // 励ましを表示する場合
          console.log(`${newResults.length}問目完了 - 励ましを表示します`);
          setTestState('encouragement');
          testStateRef.current = 'encouragement';
          setIsProcessingAI(false);
          isProcessingAIRef.current = false;
          // 励まし画面が表示される（ユーザーが「つぎへ」を押すまで待機）
        } else {
          // 通常時：次の録音を即座に開始
          console.log('次の録音を開始します:', newRemaining[0]);
          console.log('  現在の問題番号:', newResults.length);
          console.log('  次の問題番号:', newResults.length + 1);
          
          // idle状態に戻してから録音開始
          setTestState('idle');
          testStateRef.current = 'idle';
          setIsProcessingAI(false);
          isProcessingAIRef.current = false;
          setIsRecording(false);
          
          // 録音状態をクリア
          setRecording(null);
          recordingRef.current = null;
          
          // 次の録音を開始
          console.log('次の録音を100ms後に開始します');
          setTimeout(() => {
            console.log('setTimeout内でstartRecordingを呼び出します');
            console.log('  testStateRef.current:', testStateRef.current);
            console.log('  isProcessingAIRef.current:', isProcessingAIRef.current);
            console.log('  recordingRef.current:', recordingRef.current);
            startRecording();
          }, 100);
        }
      } else {
        setTestState('idle');
        testStateRef.current = 'idle';
        setIsProcessingAI(false);
        isProcessingAIRef.current = false;
        await saveResults();
      }
    } catch (err) {
      console.error('録音停止エラー:', err);
      setTestState('idle');
      testStateRef.current = 'idle';
      setIsProcessingAI(false);
      isProcessingAIRef.current = false;
      setIsRecording(false);
      setRecording(null);
      recordingRef.current = null;
      setStartTime(null);
      startTimeRef.current = null;
      
      if (!(err instanceof Error && err.message.includes('already been unloaded'))) {
        Alert.alert('エラー', '録音を停止できませんでした。');
      }
    }
  };

  const saveResults = async () => {
    try {
      // 結果をAsyncStorageに保存
      await AsyncStorage.setItem(
        'initialTestResults',
        JSON.stringify({
          results,
          timestamp: Date.now(),
        })
      );

      // 結果画面へ遷移
      router.push('/(app)/initial-test/results');
    } catch (error) {
      console.error('結果の保存エラー:', error);
      Alert.alert('エラー', '結果の保存に失敗しました');
    }
  };

  const handlePause = async () => {
    try {
      // 録音タイマーをクリア
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      // カウントダウンタイマーをクリア
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      
      // 録音中の場合は停止して破棄
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
      }
      
      // 録音関連の状態をすべてクリア
      setRecording(null);
      recordingRef.current = null;
      setIsRecording(false);
      setStartTime(null);
      startTimeRef.current = null;
      
      // カウントダウン状態もクリア
      setCountdown(null);
      countdownStateRef.current = {
        isActive: false,
        questionNumber: null,
        lockId: null
      };
      
      // 一時停止状態にする
      setTestState('paused');
      testStateRef.current = 'paused';
      setIsPaused(true);
    } catch (error) {
      console.error('録音の一時停止中にエラーが発生しました:', error);
      // エラーが発生しても確実に状態をクリア
      setRecording(null);
      recordingRef.current = null;
      setIsRecording(false);
      setStartTime(null);
      startTimeRef.current = null;
      setCountdown(null);
      countdownStateRef.current = {
        isActive: false,
        questionNumber: null,
        lockId: null
      };
      setTestState('paused');
      testStateRef.current = 'paused';
      setIsPaused(true);
    }
  };

  const handleResume = () => {
    console.log('一時停止を解除します');
    setIsPaused(false);
    setTestState('idle');
    testStateRef.current = 'idle';
    
    // テスト中の場合は自動的に録音を再開
    if (hasStartedRef.current && !showEncouragement) {
      // refをクリアしてから録音開始
      isProcessingAIRef.current = false;
      setTimeout(() => {
        startRecording();
      }, 100);
    }
  };

  const handleStop = async () => {
    try {
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (unloadError) {
          console.log('録音の停止処理をスキップ:', String(unloadError));
        }
      }

      // 状態をリセット
      setIsRecording(false);
      setIsPaused(false);
      setRecording(null);
      setHasStarted(false);
      hasStartedRef.current = false;
      setIsProcessingAI(false);
      isProcessingAIRef.current = false;
      setShowCharacter(false);
      
      // 結果画面へ遷移
      router.push('/(app)/initial-test/intro');
    } catch (error) {
      console.error('録音の停止中にエラーが発生しました:', error);
      // エラーが発生してもイントロ画面へ戻る
      router.push('/(app)/initial-test/intro');
    }
  };

  const handleEncouragementContinue = () => {
    setShowEncouragement(false);
    encouragementAnim.setValue(0);
    
    // カウントダウン状態をリセット（重要）
    countdownStateRef.current = {
      isActive: false,
      questionNumber: null,
      lockId: null
    };
    
    // idle状態に戻す
    setTestState('idle');
    testStateRef.current = 'idle';
    setIsProcessingAI(false);
    isProcessingAIRef.current = false;
    setIsRecording(false);
    setRecording(null);
    recordingRef.current = null;
    setStartTime(null);
    startTimeRef.current = null;
    setShowCharacter(false);
    
    console.log('励ましを閉じました。');
    
    // 励まし画面を閉じた後の処理
    const nextQuestionNumber = resultsRef.current.length + 1;
    console.log('励ましを閉じました。次の問題番号:', nextQuestionNumber);
    
    // 12問目または23問目の場合はカウントダウンが必要
    if (nextQuestionNumber === 12 || nextQuestionNumber === 23) {
      console.log(nextQuestionNumber + '問目のため、カウントダウンが必要です');
      setNeedsCountdown(true);
      needsCountdownRef.current = true;
    } else {
      // それ以外の場合は直接録音開始（あり得ないケース）
      console.error('予期しない状態: 励まし後に' + nextQuestionNumber + '問目');
      setNeedsCountdown(false);
      needsCountdownRef.current = false;
      needsCountdownRef.current = false;
      setTimeout(() => {
        startRecording();
      }, 100);
    }
  };

  return (
    <TestScreen
      currentYoon={currentYoon}
      remainingYoon={remainingYoon}
      isRecording={isRecording}
      isPaused={isPaused}
      isProcessingAI={isProcessingAI}
      isAIReady={isAIReady}
      showEncouragement={showEncouragement}
      currentEncouragementCount={currentEncouragementCount}
      showCharacter={showCharacter}
      results={results}
      hasStarted={hasStarted}
      countdown={countdown}
      needsCountdown={needsCountdown}
      onPause={handlePause}
      onResume={handleResume}
      onStop={handleStop}
      onRecordingComplete={() => {
        const now = Date.now();
        // デバウンス時間を500msに増やす（React StrictMode対策）
        if (now - lastButtonPressRef.current < 500) {
          console.log('ボタンタップが早すぎます（デバウンス）');
          return;
        }
        lastButtonPressRef.current = now;
        
        console.log('ボタンがタップされました');
        console.log('  現在の状態:', testStateRef.current);
        console.log('  カウントダウン:', countdown);
        console.log('  カウントダウン状態:', countdownStateRef.current);
        
        // バイブレーション（10ミリ秒の短い振動）
        Vibration.vibrate(10);
        
        // カウントダウン中またはカウントダウンがアクティブな場合は何もしない
        if (testStateRef.current === 'countdown' || countdownStateRef.current.isActive) {
          console.log('カウントダウン中のためボタンタップを無視');
          return;
        }
        
        // 二重タップ防止のため、非同期で実行
        requestAnimationFrame(() => {
          stopRecording();
        });
      }}
      onEncouragementContinue={handleEncouragementContinue}
    />
  );
}