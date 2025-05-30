/**
 * 初期診断テストの状態管理とロジックを提供するカスタムフック
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Vibration } from 'react-native';
import aiService from '@src/services/aiService';
import { 
  TestResult, 
  TestState, 
  CountdownState 
} from '@src/types/initialTest';
import { 
  YOON_LIST, 
  TEST_CONFIG, 
  STORAGE_KEYS 
} from '@src/constants/initialTest';
import { AUDIO_RECORDING_OPTIONS } from '@src/config/audioConfig';

export const useInitialTest = () => {
  const router = useRouter();
  
  // 状態管理
  const [testState, setTestState] = useState<TestState>('idle');
  const [currentYoon, setCurrentYoon] = useState('');
  const [remainingYoon, setRemainingYoon] = useState<string[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [currentEncouragementCount, setCurrentEncouragementCount] = useState(0);
  const [isAIReady, setIsAIReady] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Ref管理
  const testStateRef = useRef<TestState>('idle');
  const recordingRef = useRef<Audio.Recording | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const currentYoonRef = useRef<string>('');
  const remainingYoonRef = useRef<string[]>([]);
  const resultsRef = useRef<TestResult[]>([]);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastButtonPressRef = useRef(0);
  const countdownStateRef = useRef<CountdownState>({
    isActive: false,
    questionNumber: null,
    lockId: null
  });

  // prepareNextQuestionの前方宣言を移動
  const prepareNextQuestion = useCallback(async (newResults: TestResult[]) => {
    console.log('[次の問題準備] prepareNextQuestion called');
    console.log('  現在の結果数:', newResults.length);
    console.log('  総問題数:', TEST_CONFIG.TOTAL_QUESTIONS);
    
    // 33問完了したら結果画面へ
    if (newResults.length >= TEST_CONFIG.TOTAL_QUESTIONS) {
      console.log('[次の問題準備] 全問題完了 - 結果画面へ移動');
      if (saveResultsRef.current) {
        await saveResultsRef.current();
      }
      return;
    }
    
    console.log('[次の問題準備] 残りの拗音:', remainingYoonRef.current);
    const newRemaining = remainingYoonRef.current.slice(1);
    console.log('[次の問題準備] 新しい残り:', newRemaining);
    
    if (newRemaining.length > 0) {
      setRemainingYoon(newRemaining);
      remainingYoonRef.current = newRemaining;
      setCurrentYoon(newRemaining[0]);
      currentYoonRef.current = newRemaining[0];
      console.log('[次の問題準備] 次の文字:', newRemaining[0]);
      
      // 励ましを表示するかチェック
      const shouldShowEncouragement = TEST_CONFIG.ENCOURAGEMENT_POINTS.includes(newResults.length as 11 | 22);
      console.log('[次の問題準備] 励まし表示チェック:');
      console.log('  現在の問題数:', newResults.length);
      console.log('  励ましポイント:', TEST_CONFIG.ENCOURAGEMENT_POINTS);
      console.log('  励まし表示:', shouldShowEncouragement);
      
      if (shouldShowEncouragement) {
        console.log('[次の問題準備] 励まし画面を表示');
        setTestState('encouragement');
        testStateRef.current = 'encouragement';
        setIsProcessingAI(false);
        setCurrentEncouragementCount(newResults.length);
        setShowEncouragement(true);
        console.log('[次の問題準備] 次の問題番号は:', newResults.length + 1);
        console.log('[次の問題準備] カウントダウンが必要になります');
      } else {
        // 通常時：次の録音を開始
        console.log('[次の問題準備] 通常フロー - 次の録音を開始');
        setTestState('idle');
        testStateRef.current = 'idle';
        setIsProcessingAI(false);
        
        console.log('[次の問題準備] 100ms後に録音開始');
        setTimeout(() => {
          console.log('[次の問題準備] タイムアウト実行 - 録音開始を呼び出し');
          if (startRecordingRef.current) {
            startRecordingRef.current();
          } else {
            console.error('[次の問題準備] startRecordingRef.currentが存在しません');
          }
        }, 100);
      }
    } else {
      console.log('[次の問題準備] 残りの文字なし - 結果保存');
      if (saveResultsRef.current) {
        await saveResultsRef.current();
      }
    }
  }, []);

  // 結果の保存
  const saveResults = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.TEST_RESULTS,
        JSON.stringify({
          results: resultsRef.current,
          timestamp: Date.now(),
        })
      );
      
      router.push('/initial-test/results' as any);
    } catch (error) {
      console.error('結果の保存エラー:', error);
    }
  }, [router]);

  // AIの初期化
  const initializeAI = useCallback(async () => {
    try {
      // AIが既に準備完了しているかチェック
      const ready = await aiService.isReady();
      if (ready) {
        setIsAIReady(true);
        setIsLoadingAI(false);
        return true;
      }


      // モデルダウンロードチェック
      const modelDownloaded = await aiService.isModelDownloaded();
      if (!modelDownloaded) {
        setIsAIReady(false);
        setIsLoadingAI(false);
        return false;
      }

      const initialized = await aiService.initialize();
      setIsAIReady(initialized);
      setIsLoadingAI(false);
      return initialized;
    } catch (error) {
      console.error('AI初期化エラー:', error);
      setIsAIReady(false);
      setIsLoadingAI(false);
      return false;
    }
  }, []);

  // テストの初期化
  const initializeTest = useCallback(async () => {
    console.log('[初期化] initializeTest called');
    
    console.log('[初期化] 音声録音権限をリクエスト');
    const permission = await Audio.requestPermissionsAsync();
    console.log('[初期化] 録音権限:', permission.status);
    
    // 拗音リストをシャッフル
    console.log('[初期化] 拗音リストをシャッフル');
    console.log('[初期化] 元のリスト:', YOON_LIST.slice(0, 5), '... (全', YOON_LIST.length, '文字)');
    const shuffled = [...YOON_LIST].sort(() => Math.random() - 0.5);
    console.log('[初期化] シャッフル後:', shuffled.slice(0, 5), '...');
    
    setRemainingYoon(shuffled);
    remainingYoonRef.current = shuffled;
    setCurrentYoon(shuffled[0]);
    currentYoonRef.current = shuffled[0];
    
    console.log('[初期化] 最初の文字:', shuffled[0]);
    console.log('[初期化] 初期化完了');
  }, []);

  // 関数の前方参照用
  const startRecordingRef = useRef<() => Promise<void>>();
  const stopRecordingRef = useRef<() => Promise<void>>();
  const prepareNextQuestionRef = useRef<(results: TestResult[]) => Promise<void>>();
  const saveResultsRef = useRef<() => Promise<void>>();

  // カウントダウンの開始
  const startCountdown = useCallback(() => {
    const lockId = Date.now().toString();
    const currentQuestionNumber = resultsRef.current.length + 1;
    console.log('[カウントダウン開始]');
    console.log('  問題番号:', currentQuestionNumber);
    console.log('  lockId:', lockId);
    console.log('  現在の状態:', countdownStateRef.current);
    
    if (countdownStateRef.current.isActive) {
      console.log('[カウントダウン] すでにアクティブなためスキップ');
      return;
    }
    
    countdownStateRef.current = {
      isActive: true,
      questionNumber: currentQuestionNumber,
      lockId
    };
    
    setTestState('countdown');
    testStateRef.current = 'countdown';
    
    let count = TEST_CONFIG.COUNTDOWN_DURATION;
    setCountdown(count);
    console.log('[カウントダウン] 開始:', count);
    
    const intervalId = setInterval(() => {
      if (countdownStateRef.current.lockId !== lockId) {
        console.log('[カウントダウン] lockIDが不一致のため停止');
        clearInterval(intervalId);
        return;
      }
      
      count--;
      console.log('[カウントダウン] カウント:', count);
      
      if (count > 0) {
        setCountdown(count);
      } else {
        console.log('[カウントダウン] 完了 - 録音を開始します');
        clearInterval(intervalId);
        countdownIntervalRef.current = null;
        setCountdown(null);
        setTestState('idle');
        testStateRef.current = 'idle';
        countdownStateRef.current = {
          isActive: false,
          questionNumber: null,
          lockId: null
        };
        
        // 文字表示のために少し遅延してから録音を開始
        setTimeout(() => {
          console.log('[カウントダウン] 200ms遅延後 - 録音開始');
          if (startRecordingRef.current) {
            console.log('[カウントダウン] 録音開始関数を呼び出し');
            startRecordingRef.current();
          } else {
            console.error('[カウントダウン] 録音開始関数が設定されていません');
          }
        }, 200);
      }
    }, 1000);
    
    countdownIntervalRef.current = intervalId;
  }, []);

  // 録音の開始
  const startRecording = useCallback(async () => {
    console.log('[録音開始] startRecording called');
    console.log('  testState:', testStateRef.current);
    console.log('  recording存在:', !!recordingRef.current);
    console.log('  現在の文字:', currentYoonRef.current);
    console.log('  問題番号:', resultsRef.current.length + 1);
    
    if (testStateRef.current !== 'idle' || recordingRef.current) {
      console.log('[録音開始] スキップ - 条件不適合');
      return;
    }
    
    try {
      console.log('[録音開始] オーディオモード設定中...');
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
      });
      
      console.log('[録音開始] 録音インスタンス作成中...');
      // AUDIO_RECORDING_OPTIONSを使用
      const { recording } = await Audio.Recording.createAsync(AUDIO_RECORDING_OPTIONS);
      
      console.log('[録音開始] 成功 - 録音開始');
      console.log('  文字:', currentYoonRef.current);
      recordingRef.current = recording;
      setIsRecording(true);
      setTestState('recording');
      testStateRef.current = 'recording';
      
      const startTime = Date.now();
      startTimeRef.current = startTime;
      
      // 録音タイムアウトの設定
      console.log('[録音開始] タイムアウト設定:', TEST_CONFIG.RECORDING_TIMEOUT + 'ms');
      recordingTimerRef.current = setTimeout(() => {
        console.log('[録音タイムアウト] 自動停止を開始');
        if (stopRecordingRef.current) {
          stopRecordingRef.current();
        } else {
          console.error('[録音タイムアウト] 停止関数が設定されていません');
        }
      }, TEST_CONFIG.RECORDING_TIMEOUT);
      
    } catch (error) {
      console.error('[録音開始] エラー:', error);
      setTestState('idle');
      testStateRef.current = 'idle';
    }
  }, []);

  // 録音の停止とAI処理
  const stopRecording = useCallback(async () => {
    console.log('[録音停止] stopRecording called');
    console.log('  recording存在:', !!recordingRef.current);
    console.log('  testState:', testStateRef.current);
    
    if (!recordingRef.current || testStateRef.current !== 'recording') {
      console.log('[録音停止] スキップ - 条件不適合');
      return;
    }
    
    // 録音タイマーをクリア
    if (recordingTimerRef.current) {
      console.log('[録音停止] タイマークリア');
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    try {
      console.log('[録音停止] 処理開始');
      setTestState('processing');
      testStateRef.current = 'processing';
      setIsRecording(false);
      setIsProcessingAI(true);
      
      const endTime = Date.now();
      const elapsedTime = (endTime - (startTimeRef.current || endTime)) / 1000;
      console.log('[録音停止] 録音時間:', elapsedTime.toFixed(2) + '秒');
      
      const currentRecording = recordingRef.current;
      console.log('[録音停止] 録音を停止中...');
      await currentRecording.stopAndUnloadAsync();
      const fileUri = currentRecording.getURI();
      console.log('[録音停止] ファイルURI:', fileUri);
      
      recordingRef.current = null;
      startTimeRef.current = null;
      
      // AI処理
      let aiResult = undefined;
      if (fileUri && isAIReady) {
        console.log('[AI処理] 開始');
        console.log('  対象文字:', currentYoonRef.current);
        try {
          const startAI = Date.now();
          const aiClassificationResult = await aiService.classifySpeech(
            currentYoonRef.current,
            currentYoonRef.current,
            fileUri
          );
          const endAI = Date.now();
          console.log('[AI処理] 完了 - 処理時間:', (endAI - startAI) + 'ms');
          
          if (aiClassificationResult?.top3) {
            aiResult = {
              predictions: aiClassificationResult.top3,
              top3: aiClassificationResult.top3,
              isCorrect: aiClassificationResult.isCorrect,
              confidence: aiClassificationResult.confidence,
              processingTime: (endAI - startAI) / 1000
            };
            console.log('[AI処理] 結果:', {
              isCorrect: aiResult.isCorrect,
              confidence: aiResult.confidence,
              top1: aiResult.top3[0]?.character
            });
          }
        } catch (aiError) {
          console.error('[AI処理] エラー:', aiError);
        }
      } else {
        console.log('[AI処理] スキップ - AI未準備またはファイルなし');
      }
      
      // 結果を保存
      const newResult: TestResult = {
        yoon: currentYoonRef.current,
        time: elapsedTime,
        audioUri: fileUri || undefined,
        aiResult
      };
      
      const newResults = [...resultsRef.current, newResult];
      console.log('[結果保存] 問題数:', newResults.length);
      setResults(newResults);
      resultsRef.current = newResults;
      
      // 次の問題を準備
      console.log('[次の問題準備] 開始');
      if (prepareNextQuestionRef.current) {
        await prepareNextQuestionRef.current(newResults);
      } else {
        console.error('[次の問題準備] 関数が設定されていません');
      }
      
    } catch (error) {
      console.error('[録音停止] エラー:', error);
      setTestState('idle');
      testStateRef.current = 'idle';
      setIsProcessingAI(false);
    }
  }, [isAIReady]);

  // 関数をrefに設定
  useEffect(() => {
    startRecordingRef.current = startRecording;
  }, [startRecording]);
  
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);
  
  useEffect(() => {
    prepareNextQuestionRef.current = prepareNextQuestion;
  }, [prepareNextQuestion]);
  
  useEffect(() => {
    saveResultsRef.current = saveResults;
  }, [saveResults]);

  // ボタンタップ処理
  const handleButtonPress = useCallback(() => {
    const now = Date.now();
    const timeSinceLastPress = now - lastButtonPressRef.current;
    
    console.log('[ボタン押下] handleButtonPress called');
    console.log('  最後の押下からの経過時間:', timeSinceLastPress, 'ms');
    
    if (timeSinceLastPress < TEST_CONFIG.DEBOUNCE_DELAY) {
      console.log('[ボタン押下] 連打防止により無視');
      console.log('  デバウンス時間:', TEST_CONFIG.DEBOUNCE_DELAY, 'ms');
      return;
    }
    lastButtonPressRef.current = now;
    
    console.log('[ボタン押下] 現在の状態:');
    console.log('  hasStarted:', hasStarted);
    console.log('  testState:', testStateRef.current);
    console.log('  結果数:', resultsRef.current.length);
    console.log('  録音中:', !!recordingRef.current);
    console.log('  カウントダウン中:', countdownStateRef.current.isActive);
    console.log('  現在の文字:', currentYoonRef.current);
    
    Vibration.vibrate(TEST_CONFIG.VIBRATION_DURATION);
    
    // 初回タップ時の処理
    if (!hasStarted && resultsRef.current.length === 0) {
      console.log('[ボタン押下] 初回タップ検出');
      console.log('[ボタン押下] テスト開始 - カウントダウン開始');
      setHasStarted(true);
      startCountdown();
      return;
    }
    
    // カウントダウン中は無視
    if (testStateRef.current === 'countdown' || countdownStateRef.current.isActive) {
      console.log('[ボタン押下] カウントダウン中のため処理をスキップ');
      console.log('  testState === countdown:', testStateRef.current === 'countdown');
      console.log('  countdownState.isActive:', countdownStateRef.current.isActive);
      return;
    }
    
    // 12問目または23問目でカウントダウンが必要な場合
    const nextQuestionNumber = resultsRef.current.length + 1;
    const countdownNeededPoints = TEST_CONFIG.ENCOURAGEMENT_POINTS.map(p => p + 1);
    const needsCountdown = countdownNeededPoints.includes(nextQuestionNumber);
    
    console.log('[ボタン押下] カウントダウン必要性チェック:');
    console.log('  次の問題番号:', nextQuestionNumber);
    console.log('  カウントダウン必要な問題番号:', countdownNeededPoints);
    console.log('  カウントダウン必要:', needsCountdown);
    console.log('  現在の状態:', testStateRef.current);
    console.log('  録音状態:', recordingRef.current ? '録音中' : '録音なし');
    
    // 励まし画面から戻った直後は自動的にカウントダウンが始まっているはず
    if (needsCountdown && testStateRef.current === 'idle' && !recordingRef.current) {
      console.log('[ボタン押下] カウントダウンが必要な状態ですが、通常は励まし画面から自動的に開始されます');
      console.log('[ボタン押下] 念のためカウントダウンを開始します');
      startCountdown();
      return;
    }
    
    // 録音中の場合は停止
    if (testStateRef.current === 'recording') {
      console.log('[ボタン押下] 録音中検出 - 録音を停止します');
      if (stopRecordingRef.current) {
        console.log('[ボタン押下] stopRecording関数を呼び出し');
        stopRecordingRef.current();
      } else {
        console.error('[ボタン押下] stopRecordingRef.currentが存在しません');
      }
    } else {
      console.log('[ボタン押下] 録音していない状態でボタンが押されました');
      console.log('[ボタン押下] 録音を開始します');
      if (startRecordingRef.current) {
        console.log('[ボタン押下] startRecording関数を呼び出し');
        startRecordingRef.current();
      } else {
        console.error('[ボタン押下] startRecordingRef.currentが存在しません');
      }
    }
  }, [hasStarted, startCountdown]);

  // 一時停止処理
  const handlePause = useCallback(async () => {
    console.log('[一時停止] handlePause called');
    console.log('  現在の状態:', testStateRef.current);
    console.log('  録音中:', !!recordingRef.current);
    console.log('  カウントダウン中:', !!countdownIntervalRef.current);
    
    // タイマーをクリア
    if (recordingTimerRef.current) {
      console.log('[一時停止] 録音タイマーをクリア');
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    if (countdownIntervalRef.current) {
      console.log('[一時停止] カウントダウンインターバルをクリア');
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    // 録音中の場合は停止
    if (recordingRef.current) {
      console.log('[一時停止] 録音を停止');
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
    }
    
    console.log('[一時停止] 状態を更新');
    setIsRecording(false);
    setIsPaused(true);
    setTestState('paused');
    testStateRef.current = 'paused';
    console.log('[一時停止] 処理完了');
  }, []);

  // 再開処理
  const handleResume = useCallback(() => {
    console.log('[再開] handleResume called');
    console.log('  現在の状態:', testStateRef.current);
    console.log('  現在の結果数:', resultsRef.current.length);
    console.log('  現在の文字:', currentYoonRef.current);
    console.log('  録音中:', !!recordingRef.current);
    console.log('  hasStarted:', hasStarted);
    
    setIsPaused(false);
    setTestState('idle');
    testStateRef.current = 'idle';
    console.log('[再開] 状態をidleに変更');
    
    // カウントダウンが必要な場合は再開
    const nextQuestionNumber = resultsRef.current.length + 1;
    const countdownNeededPoints = TEST_CONFIG.ENCOURAGEMENT_POINTS.map(p => p + 1);
    const needsCountdown = countdownNeededPoints.includes(nextQuestionNumber);
    
    console.log('[再開] カウントダウン判定:');
    console.log('  次の問題番号:', nextQuestionNumber);
    console.log('  カウントダウン必要な問題番号:', countdownNeededPoints);
    console.log('  カウントダウン必要:', needsCountdown);
    
    // 最初の問題（結果が0）の場合
    if (resultsRef.current.length === 0 && hasStarted) {
      console.log('[再開] 最初の問題の再開 - カウントダウンを開始');
      startCountdown();
    } else if (needsCountdown) {
      console.log('[再開] 励まし後の問題 - カウントダウンを開始');
      startCountdown();
    } else {
      console.log('[再開] 通常フロー - 録音を直接開始');
      // 通常の問題の場合は直接録音を開始
      setTimeout(() => {
        console.log('[再開] 100ms後に録音開始を呼び出し');
        if (startRecordingRef.current) {
          startRecordingRef.current();
        } else {
          console.error('[再開] startRecordingRef.currentが存在しません');
        }
      }, 100);
    }
    
    console.log('[再開] 処理完了');
  }, [startCountdown, hasStarted]);

  // クリーンアップ
  const cleanup = useCallback(() => {
    console.log('[クリーンアップ] cleanup called');
    
    if (recordingRef.current) {
      console.log('[クリーンアップ] 録音を停止');
      recordingRef.current.stopAndUnloadAsync().catch((error) => {
        console.log('[クリーンアップ] 録音停止エラー（無視）:', error);
      });
    }
    
    if (recordingTimerRef.current) {
      console.log('[クリーンアップ] 録音タイマーをクリア');
      clearTimeout(recordingTimerRef.current);
    }
    
    if (countdownIntervalRef.current) {
      console.log('[クリーンアップ] カウントダウンインターバルをクリア');
      clearInterval(countdownIntervalRef.current);
    }
    
    console.log('[クリーンアップ] 処理完了');
  }, []);

  // 励まし画面を閉じる処理
  const handleEncouragementContinue = useCallback(() => {
    console.log('[励まし継続] handleEncouragementContinue called');
    console.log('  現在のテスト状態:', testStateRef.current);
    console.log('  現在の結果数:', resultsRef.current.length);
    
    setShowEncouragement(false);
    console.log('[励まし継続] 励まし画面を非表示に');
    
    // 次の問題番号を確認
    const nextQuestionNumber = resultsRef.current.length + 1;
    console.log('[励まし継続] 状態確認:');
    console.log('  次の問題番号:', nextQuestionNumber);
    console.log('  現在の文字:', currentYoonRef.current);
    console.log('  残りの文字数:', remainingYoonRef.current.length);
    console.log('  残りの文字:', remainingYoonRef.current.slice(0, 5), '...');
    
    // 12問目または23問目の場合はカウントダウンを開始
    const needsCountdown = nextQuestionNumber === 12 || nextQuestionNumber === 23;
    console.log('[励まし継続] カウントダウン判定:');
    console.log('  カウントダウン必要:', needsCountdown);
    console.log('  理由:', needsCountdown ? `${nextQuestionNumber}問目のため` : '通常問題');
    
    if (needsCountdown) {
      // カウントダウンが必要な場合は、すぐに待機状態にする
      setTestState('waiting_for_countdown');
      testStateRef.current = 'waiting_for_countdown';
      console.log('[励まし継続] カウントダウン待機状態に設定');
      console.log('[励まし継続] 自動的にカウントダウンを開始します');
      // 少し遅延してからカウントダウンを開始（アニメーション終了を待つ）
      setTimeout(() => {
        console.log('[励まし継続] 300ms遅延後 - カウントダウン開始');
        startCountdown();
      }, 300);
    } else {
      console.log('[励まし継続] 通常フロー - idle状態に設定');
      setTestState('idle');
      testStateRef.current = 'idle';
      // 通常の問題の場合は直接録音を開始
      setTimeout(() => {
        console.log('[励まし継続] 300ms遅延後 - 録音開始');
        if (startRecordingRef.current) {
          startRecordingRef.current();
        } else {
          console.error('[励まし継続] startRecordingRef.currentが存在しません');
        }
      }, 300);
    }
    
    console.log('[励まし継続] 処理完了');
  }, [startCountdown]);

  return {
    // 状態
    testState,
    currentYoon,
    remainingYoon,
    results,
    countdown,
    isRecording,
    isProcessingAI,
    showEncouragement,
    currentEncouragementCount,
    isAIReady,
    isLoadingAI,
    hasStarted,
    isPaused,
    showCharacter: hasStarted && testState !== 'encouragement' && testState !== 'waiting_for_countdown' && countdown === null,
    needsCountdown: TEST_CONFIG.ENCOURAGEMENT_POINTS.map(p => p + 1).includes(resultsRef.current.length + 1),
    
    // アクション
    initializeAI,
    initializeTest,
    handleButtonPress,
    handlePause,
    handleResume,
    handleEncouragementContinue,
    setShowEncouragement,
    setIsPaused,
    cleanup,
  };
};