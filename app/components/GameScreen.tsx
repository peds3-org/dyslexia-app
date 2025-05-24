/**
 * ゲーム画面コンポーネント
 * ユーザーが実際に文字の読み練習を行う中心的な画面
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ImageBackground, SafeAreaView, TouchableOpacity, Animated, Dimensions, Alert, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { StageProgress, StageConfig } from '../types/progress';
import voiceService from '../../src/services/voiceService';
import soundService from '../../src/services/soundService';
import authService from '../../src/services/authService';
import progressService from '../../src/services/progressService';
import stageService from '../../src/services/stageService';
import { PauseScreen } from '../../src/components/ui/PauseScreen';
import { LevelUpAnimation } from '../../src/components/game/LevelUpAnimation';
import ProgressBar from '../../src/components/ui/ProgressBar';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * ゲーム画面のプロパティ
 */
type GameScreenProps = {
  config: StageConfig; // ステージの設定
  progress: StageProgress; // ユーザーの進捗状況
  onPause: () => void; // 一時停止時のコールバック
  onCharacterComplete: (character: string, isCorrect: boolean, responseTime: number) => void; // 文字練習完了時のコールバック
};

/**
 * ステージモード情報の型定義
 */
interface StageMode {
  isTestMode: boolean;
  trainingLevel: number;
  timeLimit: number;
  completedSets: number;
  requiredSets: number;
  isLastStage: boolean;
  testResults?: {
    totalAttempts: number;
    correctAttempts: number;
  };
}

/**
 * ゲーム画面コンポーネント
 * 文字を表示し、音声認識で判定する主要コンポーネント
 */
export function GameScreen({ config, progress, onPause, onCharacterComplete }: GameScreenProps) {
  const router = useRouter();
  const navigation = useNavigation();

  // 状態管理
  const [currentCharacter, setCurrentCharacter] = useState<string>(''); // 現在表示中の文字
  const [isProcessing, setIsProcessing] = useState(false); // 処理中フラグ
  const [isListening, setIsListening] = useState(false); // 音声認識中フラグ
  const isListeningRef = useRef(false); // 音声認識状態の参照（非同期処理用）
  const [showPause, setShowPause] = useState(false); // 一時停止画面表示フラグ
  const [showLevelUp, setShowLevelUp] = useState(false); // レベルアップ表示フラグ
  const [currentLevel, setCurrentLevel] = useState(1); // 現在のレベル
  const [isInitializing, setIsInitializing] = useState(true); // 初期化中フラグ
  const [remainingTime, setRemainingTime] = useState(300); // 残り時間（秒）
  const [isSessionComplete, setIsSessionComplete] = useState(false); // セッション完了フラグ

  // 判定結果表示用
  const [judgementResult, setJudgementResult] = useState<'correct' | 'incorrectA' | 'incorrectB' | null>(null);

  // アニメーション用の値
  const characterScale = useRef(new Animated.Value(1)).current; // 文字のスケールアニメーション
  // const elderPosition = useRef(new Animated.Value(0)).current; // 長老の位置アニメーション

  // 参照値（ステート更新のタイミング問題を回避するため）
  const startTime = useRef<number | null>(null); // 音声認識開始時間
  const initialSetupComplete = useRef<boolean>(false); // 初期セットアップ完了フラグ
  const timerRef = useRef<NodeJS.Timeout | null>(null); // タイマー参照
  const recording = useRef<Audio.Recording | null>(null); // 録音オブジェクト

  // 励まし表示用
  const encouragementAnim = useRef(new Animated.Value(0)).current; // 励ましアニメーション
  const [showEncouragement, setShowEncouragement] = useState(false); // 励まし表示フラグ
  const [lastCollectedMilestone, setLastCollectedMilestone] = useState<number>(0); // 前回励ましを表示した達成数

  // 処理ロック用フラグ
  const isRecordingLocked = useRef(false); // 録音プロセスロック（同時実行防止）
  const latestCharacter = useRef<string>(''); // 最新の選択文字を参照で保持
  const isFirstInitAttempt = useRef(false); // 初期化試行フラグ
  const isAnimating = useRef<boolean>(false); // アニメーション中フラグ
  const isJudging = useRef<boolean>(false); // 判定中フラグ

  // 文字ロード関連
  const [isLoadingCharacter, setIsLoadingCharacter] = useState(false); // 文字ロード中状態
  const nextCharacterRef = useRef<string>(''); // 次の文字保持用

  // ステージモード情報
  const [stageMode, setStageMode] = useState<StageMode>({
    isTestMode: false,
    trainingLevel: 1,
    timeLimit: 2500,
    completedSets: 0,
    requiredSets: 3,
    isLastStage: false,
  });

  // 手裏剣アニメーション状態
  const [shurikenVisible, setShurikenVisible] = useState(false);
  const shurikenAnim = useRef(new Animated.Value(0)).current;
  const shurikenRotation = useRef(new Animated.Value(0)).current;

  /**
   * 新しい文字をランダムに選択する関数
   * 現在表示中の文字と異なる文字を選ぶようにする
   * @returns 選択された文字、または選択できない場合はnull
   */
  const selectNewCharacter = () => {
    try {
      // 現在の文字を保存
      const prevChar = currentCharacter;
      // 利用可能な文字から現在の文字を除外
      const availableChars = getAvailableCharacters().filter((char) => char !== prevChar);

      if (availableChars.length > 0) {
        // ランダムに選択
        const randomIndex = Math.floor(Math.random() * availableChars.length);
        const newChar = availableChars[randomIndex];

        // 状態を更新
        setCurrentCharacter(newChar);
        latestCharacter.current = newChar;

        return newChar;
      } else {
        // 利用可能な文字がない場合（すべてのもじたまを集めた場合など）

        // すべての文字から現在の文字を除いたものから選択
        const allChars = config.characters.filter((char) => char !== prevChar);

        if (allChars.length > 0) {
          const randomIndex = Math.floor(Math.random() * allChars.length);
          const newChar = allChars[randomIndex];

          // 状態を更新
          setCurrentCharacter(newChar);
          latestCharacter.current = newChar;

          return newChar;
        } else {
          // それでも文字がない場合（文字が1つしかない極端なケース）
          return null;
        }
      }
    } catch (fallbackError) {
      return null;
    }
  };

  /**
   * 録音プロセスを開始する関数
   * 音声認識のセットアップと開始を行う
   * @returns 成功時はtrue、失敗時はfalse
   */
  const startRecordingProcess = async () => {
    // 録音ロックをチェック - すでに録音プロセスが実行中なら中止
    if (isRecordingLocked.current) {
      return false;
    }

    // 録音ロックを設定
    isRecordingLocked.current = true;

    try {
      // まず、録音状態をリセット
      setIsListening(false);
      isListeningRef.current = false;

      // 既存の録音オブジェクトとリソースをクリアする（重要）
      try {
        if (recording.current) {
          await recording.current.stopAndUnloadAsync();
          recording.current = null;
        }
        // 音声サービスを確実にクリーンアップ
        await voiceService.cleanup();

        // 確実にオーディオモードをリセット
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
      } catch (cleanupError) {
        // エラーが発生しても続行
      }

      // 参照から最新の文字を取得（確実に最新の値を使用）
      const charToRecord = nextCharacterRef.current || latestCharacter.current || currentCharacter;

      // 再度文字がセットされているか確認
      if (!charToRecord) {
        isRecordingLocked.current = false; // ロックを解除
        return false;
      }

      // 録音の前に待機する時間を短縮
      await new Promise((resolve) => setTimeout(resolve, 50));

      // オーディオモードを設定
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // この時点で録音オブジェクトが未設定なことをダブルチェック
      if (recording.current !== null) {
        isRecordingLocked.current = false; // ロックを解除
        return false;
      }

      // 新しい録音セッションを作成
      const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recording.current = newRecording;

      startTime.current = Date.now();

      // 重要：ここで文字と録音状態を同時に更新（React 18以降はバッチ処理されるため同時に表示される）
      setCurrentCharacter(charToRecord);
      setIsLoadingCharacter(false);
      setIsListening(true);
      isListeningRef.current = true;

      return true; // 録音開始成功を返す
    } catch (error) {
      // エラーが発生した場合は完全にリセット
      setIsListening(false);
      isListeningRef.current = false;
      setIsLoadingCharacter(false);

      // エラーが発生した場合も、状態を正しく設定して続行できるようにする
      if (recording.current) {
        try {
          await recording.current.stopAndUnloadAsync();
        } catch (e) {
          // エラー無視
        }
        recording.current = null;
      }

      // 音声サービスを確実にクリーンアップ
      try {
        await voiceService.cleanup();
      } catch (e) {
        // エラー無視
      }

      // オーディオモードをリセット
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
      } catch (e) {
        // エラー無視
      }

      return false; // 録音開始失敗を返す
    } finally {
      // 録音ロックを解除（finally ブロックで確実に実行）
      isRecordingLocked.current = false;
    }
  };

  // 文字変更のログ（レンダリング毎の出力を避けるため、useEffectで実装）
  useEffect(() => {
    if (currentCharacter) {
      console.log(`GameScreen: 文字変更 - 現在の文字:「${currentCharacter}」 読み方:「${config.readings[currentCharacter] || '未設定'}」`);
    }
  }, [currentCharacter]);

  // タイマー処理
  useEffect(() => {
    // 初期化が完了したらタイマーを開始
    if (!isInitializing && !showPause && !isSessionComplete) {
      timerRef.current = setInterval(() => {
        setRemainingTime((prevTime) => {
          if (prevTime <= 1) {
            // タイマー終了処理
            clearInterval(timerRef.current as NodeJS.Timeout);
            setIsSessionComplete(true);
            handleSessionComplete();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isInitializing, showPause, isSessionComplete]);

  // ポーズ状態が変更されたときにタイマーを一時停止/再開
  useEffect(() => {
    if (showPause && timerRef.current) {
      clearInterval(timerRef.current);
    } else if (!showPause && !isInitializing && !isSessionComplete) {
      // ポーズ解除時にタイマーを再開
      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setRemainingTime((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            setIsSessionComplete(true);
            handleSessionComplete();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
  }, [showPause]);

  // セッション完了時の処理
  const handleSessionComplete = async () => {
    try {
      console.log('GameScreen: 修行完了 - 全てのリソースをクリーンアップします');

      // 録音状態をリセット（録音中かどうかに関わらず実行）
      setIsListening(false);
      isListeningRef.current = false;
      setIsProcessing(false);
      isAnimating.current = false;
      isJudging.current = false;
      setIsLoadingCharacter(false);
      isRecordingLocked.current = false;

      // 録音オブジェクトを停止・クリーンアップ
      if (recording.current) {
        try {
          await recording.current.stopAndUnloadAsync();
          recording.current = null;
          console.log('GameScreen: 録音を停止しました');
        } catch (err) {
          console.error('GameScreen: 録音停止エラー:', err);
          // エラーが発生しても続行
        }
      }

      // アニメーションを停止
      characterScale.stopAnimation();
      // elderPosition.stopAnimation();
      encouragementAnim.stopAnimation();

      // 音声サービスをクリーンアップ
      try {
        await voiceService.cleanup();
        console.log('GameScreen: 音声サービスをクリーンアップしました');
      } catch (err) {
        console.error('GameScreen: 音声サービスクリーンアップエラー:', err);
        // エラーが発生しても続行
      }

      // オーディオモードをリセット
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
        console.log('GameScreen: オーディオモードをリセットしました');
      } catch (err) {
        console.error('GameScreen: オーディオモードリセットエラー:', err);
        // エラーが発生しても続行
      }

      // 音楽を停止
      try {
        await soundService.stopBGM();
        soundService.unloadSounds();
        console.log('GameScreen: サウンドをアンロードしました');
      } catch (err) {
        console.error('GameScreen: サウンド停止エラー:', err);
        // エラーが発生しても続行
      }

      // タイマーをクリア
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // 進捗の更新（セッション時間を記録）
      const userId = authService.getUser()?.id;
      if (userId) {
        try {
          // 経過時間を分単位で計算（300秒から残り時間を引く）
          const elapsedMinutes = Math.ceil((300 - remainingTime) / 60);
          console.log(`GameScreen: 修行時間 ${elapsedMinutes}分を記録します`);

          // 練習時間を記録
          await progressService.recordStudyTime(userId, elapsedMinutes);

          // ストリークを更新
          await progressService.updateStreak(userId);
          console.log('GameScreen: ストリークを更新しました');
        } catch (progressError) {
          console.error('GameScreen: 進捗更新エラー:', progressError);
        }
      }

      // Supabaseにセッションデータを送信
      await sendSessionDataToSupabase();
      console.log('GameScreen: セッションデータを送信しました');

      // 完了アラートを表示
      showCompletionAlert();
    } catch (error) {
      console.error('GameScreen: セッション完了処理エラー:', error);
      // エラーが発生しても画面遷移はする
      router.back();
    }
  };

  // 完了アラートを表示する補助関数
  const showCompletionAlert = () => {
    Alert.alert('修行完了', '今日の修行お疲れ様でした！', [
      {
        text: 'OK',
        onPress: () => {
          console.log('GameScreen: 修行完了 - 前の画面に戻ります');
          router.replace('/screens/progress');
        },
      },
    ]);
  };

  // 残り時間の表示用フォーマット
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // 長老のフロートアニメーション
  // useEffect(() => {
  //   Animated.loop(
  //     Animated.sequence([
  //       Animated.timing(elderPosition, {
  //         toValue: 10,
  //         duration: 1000,
  //         useNativeDriver: true,
  //       }),
  //       Animated.timing(elderPosition, {
  //         toValue: 0,
  //         duration: 1000,
  //         useNativeDriver: true,
  //       }),
  //     ])
  //   ).start();
  // }, []);

  // クリーンアップ
  useEffect(() => {
    // 初期化時のアクション
    const initVoice = async () => {
      try {
        // サウンドの読み込み
        await soundService.initialize();
        console.log('サウンド読み込み完了');
      } catch (error) {
        console.error('初期化エラー:', error);
      }
    };

    // クリーンアップ関数
    const cleanup = async () => {
      console.log('GameScreen クリーンアップを実行');

      // アニメーションの停止
      characterScale.stopAnimation();
      //elderPosition.stopAnimation();

      // 音声認識のクリーンアップ（非同期だが、アンマウント時はawaitできない）
      voiceService
        .cleanup()
        .then(() => console.log('音声認識クリーンアップ完了'))
        .catch((error: unknown) => console.error('音声認識クリーンアップエラー:', error));

      // サウンドのアンロード
      try {
        soundService.unloadSounds();
        console.log('サウンドアンロード完了');
      } catch (error: unknown) {
        console.error('サウンドアンロードエラー:', error);
      }
    };

    // 初期化を実行
    initVoice();

    // クリーンアップ関数を返す
    return () => {
      cleanup();
    };
  }, []);

  // ポーズ状態の監視
  useEffect(() => {
    const handlePauseChange = async () => {
      if (showPause) {
        // ポーズ時は必ず音声認識をクリーンアップ
        try {
          await voiceService.cleanup();
          console.log('ポーズ時の音声認識クリーンアップ完了');
        } catch (error) {
          console.error('ポーズ時の音声認識クリーンアップエラー:', error);
        }
      } else if (!isProcessing && !showLevelUp) {
        // ポーズ解除時で、処理中でなければ録音再開
        console.log('ポーズ解除 - 新しい文字で録音再開準備');

        // すでに録音プロセスが開始されていたら重複して実行しない
        if (isListeningRef.current || isRecordingLocked.current) {
          console.log('GameScreen: すでに録音中またはロック中のため、ポーズ解除後の録音開始をスキップします');
          return;
        }

        // すぐには開始せず、少し遅延を入れる
        setTimeout(() => {
          try {
            // 再度チェック - 遅延中に状態が変わっている可能性がある
            if (isListeningRef.current || isRecordingLocked.current) {
              console.log('GameScreen: 遅延中に録音状態が変化したため、ポーズ解除後の録音開始をスキップします');
              return;
            }

            console.log('GameScreen: ポーズ解除後の文字選択と録音再開');
            const newChar = selectNewCharacter();

            // 文字選択後、状態更新を確実に行ってから録音開始
            if (newChar) {
              // 少し間を空けてから録音開始
              setTimeout(() => {
                try {
                  // 再度チェック
                  if (isListeningRef.current || isRecordingLocked.current) {
                    console.log('GameScreen: 遅延中に録音状態が変化したため、録音開始をスキップします');
                    return;
                  }

                  if (!showPause && !showLevelUp) {
                    console.log(`GameScreen: ポーズ解除後の録音開始 - 文字:「${currentCharacter}」`);
                    startRecordingProcess().catch((err) => {
                      console.error('GameScreen: ポーズ解除後の録音開始エラー:', err);
                      // エラー時は少し待ってから再試行
                      setTimeout(() => {
                        if (!isListeningRef.current && !isRecordingLocked.current) {
                          console.log('GameScreen: ポーズ解除後の録音再試行');
                          startRecordingProcess().catch((retryErr) => {
                            console.error('GameScreen: ポーズ解除後の録音再試行エラー:', retryErr);
                          });
                        }
                      }, 1000);
                    });
                  }
                } catch (recError) {
                  console.error('GameScreen: ポーズ解除後の録音準備エラー:', recError);
                }
              }, 800);
            } else {
              console.error('GameScreen: ポーズ解除後の文字選択に失敗しました');
            }
          } catch (error) {
            console.error('GameScreen: ポーズ解除後の文字選択エラー:', error);
          }
        }, 800);
      }
    };

    handlePauseChange();
  }, [showPause]);

  // BeginnerScreenからマウント後に強制的に初期化を完了させ録音を開始する（画面遷移後の問題対策）
  useEffect(() => {
    // コンポーネントマウント後、当日の学習データを確認
    const checkTodaySessions = async () => {
      try {
        const userId = authService.getUser()?.id;
        if (!userId) return;

        // 当日の学習セッションを取得
        const todaySessions = await progressService.getTodaysSessions(userId);
        // 最後のセッションからの時間を取得
        const timeSinceLastSession = await progressService.getTimeSinceLastSession(userId);

        // 当日のセッションがあり、4時間以内なら継続セッションとみなす
        const isContinuedSession = todaySessions.sessions.length > 0 && timeSinceLastSession < 240;

        if (isContinuedSession) {
          const totalMinutesStudied = Math.floor(todaySessions.totalDuration / 60);
          console.log(`GameScreen: 本日既に${totalMinutesStudied}分の修行があります。継続セッションとして扱います。`);

          // 必要に応じて、前回のセッション情報をユーザーに表示
          // 例: 「今日は既に○分修行しています。続けましょう！」

          // セッション状態を更新（このセッションタイプで継続中として記録）
          await progressService.updateSessionState(userId, config.type || 'beginner');
        } else if (todaySessions.sessions.length > 0) {
          console.log(`GameScreen: 本日の修行記録はありますが、時間が空いているため新規セッションとして扱います。`);
          // 新規セッションとして扱うが、当日の累積時間はプログレスに反映される
        } else {
          console.log(`GameScreen: 本日初めての修行セッションです。`);
        }
      } catch (error) {
        console.error('GameScreen: 本日のセッション確認エラー:', error);
        // エラーが発生しても初期化は続行
      }
    };

    // セッションチェックを実行
    checkTodaySessions();

    // 既に初期化試行済みならスキップ
    if (isFirstInitAttempt.current) {
      console.log('GameScreen: 既に初期化を試行済みのため、強制初期化をスキップします');
      return;
    }

    // 初期化試行フラグを立てる
    isFirstInitAttempt.current = true;

    // コンポーネントマウント後、3秒後に初期化状態をチェック
    const initTimer = setTimeout(async () => {
      try {
        // まだ初期化中なら強制的に初期化完了として扱う
        if (isInitializing) {
          console.log('GameScreen: 初期化が長時間完了していないため、強制的に初期化完了とします');

          // 先にクリーンアップを実施
          if (recording.current) {
            try {
              await recording.current.stopAndUnloadAsync();
              recording.current = null;
            } catch (err) {
              console.error('GameScreen: 録音オブジェクトリセットエラー:', err);
            }
          }

          try {
            await voiceService.cleanup();
          } catch (err) {
            console.error('GameScreen: 音声サービスリセットエラー:', err);
          }

          try {
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              playsInSilentModeIOS: true,
            });
          } catch (err) {
            console.error('GameScreen: オーディオモードリセットエラー:', err);
          }

          // 処理ロックもリセット
          isRecordingLocked.current = false;

          // 初期化完了としてマーク
          setIsInitializing(false);

          // 録音開始 - すでに録音が開始されている場合はスキップ
          setTimeout(() => {
            console.log('GameScreen: 強制初期化完了後の録音開始チェック');
            // 録音ロックがかかっていない場合かつ録音中でない場合のみ実行
            if (!isRecordingLocked.current && !isListeningRef.current && !showPause && !showLevelUp && !isProcessing) {
              console.log('GameScreen: 強制初期化完了後の録音開始を実行');
              startRecordingProcess().catch((err) => {
                console.error('GameScreen: 強制録音開始エラー:', err);
              });
            } else {
              console.log('GameScreen: 録音中または他の状態のため、強制録音開始をスキップします', {
                isRecordingLocked: isRecordingLocked.current,
                isListening: isListeningRef.current,
                showPause,
                showLevelUp,
                isProcessing,
              });
            }
          }, 1000); // 1秒待機してから録音開始
        }
      } catch (error) {
        console.error('GameScreen: 初期化タイマーエラー:', error);
      }
    }, 3000); // 3秒待機

    return () => clearTimeout(initTimer);
  }, []);

  // 音声ファイルの読み込み
  useEffect(() => {
    soundService.initialize();
  }, []);

  // 利用可能な文字を取得する関数
  const getAvailableCharacters = () => {
    return config.characters.filter((char) => !progress.collectedMojitama.includes(char));
  };

  // 初期文字の設定
  const setupInitialCharacter = () => {
    console.log('GameScreen: 初期文字設定を実行');
    const availableChars = config.characters;
    if (availableChars.length === 0) {
      console.log('利用可能な文字がありません');
      return null;
    }

    // ランダムに初期文字を選択
    const randomIndex = Math.floor(Math.random() * availableChars.length);
    const initialChar = availableChars[randomIndex];
    console.log(`GameScreen: 初期文字設定完了: ${initialChar} 読み方: ${config.readings[initialChar]}`);

    // 状態を更新
    setCurrentCharacter(initialChar);
    return initialChar;
  };

  // 初期化処理を一元管理する
  useEffect(() => {
    console.log('===== GameScreen: マウント完了 - 初期化処理開始 =====');

    let isMounted = true;
    let recordTimer: NodeJS.Timeout | undefined;

    // デフォルト文字の設定（初期表示用）
    const setDefaultCharacter = () => {
      if (config.characters.length > 0) {
        const randomIndex = Math.floor(Math.random() * config.characters.length);
        const defaultChar = config.characters[randomIndex];
        console.log(`GameScreen: デフォルト文字を設定:「${defaultChar}」`);
        setCurrentCharacter(defaultChar);
        latestCharacter.current = defaultChar;
      }
    };

    // まず文字を表示してから初期化する
    setDefaultCharacter();

    // ここで直接初期化処理を呼び出しておく
    const initGameScreen = async () => {
      await startInitialization();
      await loadSessionDataFromStorage();
    };

    initGameScreen();

    return () => {
      console.log('===== GameScreen: アンマウント - クリーンアップ実行 =====');
      isMounted = false;
      if (recordTimer) clearTimeout(recordTimer);
      if (recording.current) {
        recording.current.stopAndUnloadAsync().catch((err) => console.error('録音停止エラー:', err));
      }
      voiceService.cleanup();
      soundService.unloadSounds();
    };
  }, []);

  // isListeningの状態変更を監視してrefを更新
  useEffect(() => {
    isListeningRef.current = isListening;
    console.log(`GameScreen: isListening状態が更新されました: ${isListening} (ref=${isListeningRef.current})`);
  }, [isListening]);

  // 文字選択と録音開始を一連の流れで行う関数
  const selectAndStartRecording = async () => {
    console.log('GameScreen: 新しい文字選択と録音開始の処理を開始');

    // 処理中やアニメーション中なら中止
    if (isProcessing || isAnimating.current) {
      console.log('GameScreen: 処理中またはアニメーション中のため文字選択をスキップします');
      return;
    }

    // ポーズやレベルアップ表示中なら中止
    if (showPause || showLevelUp) {
      console.log('GameScreen: ポーズ/レベルアップ中のため文字選択をスキップします');
      return;
    }

    // 録音ロックをチェック
    if (isRecordingLocked.current) {
      console.log('GameScreen: 録音ロック中のため、文字選択をスキップします');
      return;
    }

    try {
      // 重複実行を防ぐためのフラグを設定
      setIsProcessing(true);

      // 文字をロード中状態にする
      setIsLoadingCharacter(true);

      // 録音中なら一度クリーンアップしてから再開する
      if (isListeningRef.current) {
        console.log('GameScreen: 録音状態をリセットして再開します');
        setIsListening(false);
        isListeningRef.current = false;

        if (recording.current) {
          try {
            await recording.current.stopAndUnloadAsync();
            recording.current = null;
          } catch (e) {
            console.error('GameScreen: 録音リセットエラー:', e);
          }
        }

        try {
          await voiceService.cleanup();
        } catch (e) {
          console.error('GameScreen: 音声サービスリセットエラー:', e);
        }

        // リソース解放のための待機を短縮
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // 音声サービスが初期化されているか確認
      try {
        await voiceService.ensureInitialized();
      } catch (initError) {
        console.error('GameScreen: 音声サービス初期化エラー:', initError);
        // エラーを無視して続行
      }

      // 文字選択（現在の文字と異なる文字を確実に選択）
      const newChar = selectNewCharacter();

      if (!newChar) {
        console.error('GameScreen: 文字選択に失敗しました。録音は開始しません');
        setIsProcessing(false);
        setIsLoadingCharacter(false);
        return;
      }

      // 新しい文字を参照に保存するが、まだ表示はしない
      nextCharacterRef.current = newChar;
      latestCharacter.current = newChar;

      console.log(`GameScreen: 新しい文字「${newChar}」を選択し、録音準備中...`);

      // 続行の再確認
      if (showPause || showLevelUp || isRecordingLocked.current) {
        console.log('GameScreen: 処理中に状態変化を検出したため中断します');
        setIsProcessing(false);
        setIsLoadingCharacter(false);
        return;
      }

      // 処理フラグを解除
      setIsProcessing(false);

      // 再度続行確認
      if (showPause || showLevelUp || isRecordingLocked.current || isListeningRef.current) {
        console.log('GameScreen: 状態変化を検出したため録音を中断します');
        setIsLoadingCharacter(false);
        return;
      }

      // 遅延を最小限に抑えて録音開始
      setTimeout(async () => {
        // 最終確認
        if (showPause || showLevelUp || isRecordingLocked.current || isListeningRef.current || isProcessing) {
          console.log('GameScreen: 遅延後に状態変化を検出したため録音を中断します');
          setIsLoadingCharacter(false);
          return;
        }

        try {
          console.log('GameScreen: 録音プロセスを開始します');
          const success = await startRecordingProcess();

          if (!success) {
            console.log('GameScreen: 録音プロセスが失敗または中断されました');
            setIsLoadingCharacter(false);
          }
          // 成功時は startRecordingProcess 内で setIsLoadingCharacter(false) が呼ばれる
        } catch (err) {
          console.error('GameScreen: 録音開始エラー:', err);
          setIsLoadingCharacter(false);
        }
      }, 50); // 0.05秒の最小遅延で録音開始
    } catch (error) {
      console.error('GameScreen: 文字選択と録音プロセスのエラー:', error);
      setIsProcessing(false);
      setIsLoadingCharacter(false);
    }
  };

  /**
   * 文字の判定後の遷移処理を行う関数
   * 判定結果の表示、音声の再生、次の文字への準備を行う
   * @param result 判定結果（correct/incorrectA/incorrectB）
   */
  const handleCharacterTransition = async (result: 'correct' | 'incorrectA' | 'incorrectB') => {
    console.log(`GameScreen: 文字変更処理開始 [結果=${result}, 処理中=${isProcessing}, アニメ中=${isAnimating.current}]`);

    // すでに処理中またはアニメーション中なら重複実行を防止
    if (isProcessing || isAnimating.current) {
      console.log('GameScreen: すでに処理中またはアニメーション中のため文字変更をスキップします');
      return;
    }

    try {
      // 処理中フラグとアニメーション中フラグを設定
      setIsProcessing(true);
      isAnimating.current = true;
      isJudging.current = true;

      // 安全タイマー - 5秒後に強制的に処理状態をリセット
      const safetyTimer = setTimeout(() => {
        console.log('GameScreen: 安全タイマーにより処理状態をリセットします');
        setIsProcessing(false);
        isAnimating.current = false;
        isJudging.current = false;
        setJudgementResult(null);
        setShurikenVisible(false);

        // 次の文字へ進む
        if (!showPause && !showLevelUp) {
          setTimeout(() => selectAndStartRecording(), 500);
        }
      }, 5000);

      // 手裏剣アニメーションの開始
      try {
        await playShurikenAnimation(result);
      } catch (animError) {
        console.error('GameScreen: 手裏剣アニメーションエラー:', animError);
        // エラーがあっても続行
      }

      // 判定結果を表示
      setJudgementResult(result);

      // まだ録音中なら停止する
      if (isListeningRef.current) {
        console.log('GameScreen: 文字変更中に録音状態を停止します');
        setIsListening(false);
        isListeningRef.current = false;

        if (recording.current) {
          try {
            await recording.current.stopAndUnloadAsync();
            recording.current = null;
          } catch (recError) {
            console.error('GameScreen: 録音停止エラー:', recError);
            // エラーがあっても続行
          }
        }

        try {
          await voiceService.cleanup();
        } catch (voiceError) {
          console.error('GameScreen: 音声サービスクリーンアップエラー:', voiceError);
          // エラーがあっても続行
        }
      }

      // 応答時間を記録
      const responseTime = startTime.current ? Date.now() - startTime.current : 0;
      startTime.current = null; // nullに設定

      // 少し待機してから正しい発音を再生（手裏剣アニメーション後）
      try {
        await new Promise((resolve) => setTimeout(resolve, 800));
      } catch (timerError) {
        console.error('GameScreen: タイマーエラー:', timerError);
        // エラーがあっても続行
      }

      // 文字の発音を再生
      try {
        if (currentCharacter && config.readings[currentCharacter]) {
          console.log(`GameScreen: 文字「${currentCharacter}」の正しい発音を再生します`);
          await voiceService.speakText(config.readings[currentCharacter]);
        }
      } catch (speakError) {
        console.error('GameScreen: 判定後の発音再生エラー:', speakError);
        // エラーがあっても続行
      }

      // 文字完了処理を呼び出し（正解か不正解かの2値で渡す）
      try {
        const isCorrect = result === 'correct';
        await handleCharacterComplete(currentCharacter, isCorrect, responseTime);
      } catch (completeError) {
        console.error('GameScreen: 文字完了処理エラー:', completeError);
        // エラーがあっても続行
      }

      // 判定結果表示のために少し長く待機
      try {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (timerError) {
        console.error('GameScreen: タイマーエラー:', timerError);
        // エラーがあっても続行
      }

      // 安全タイマーをクリア
      clearTimeout(safetyTimer);

      // 判定結果を消去
      setJudgementResult(null);
      setShurikenVisible(false);

      // 処理中フラグとアニメーションフラグを解除
      setIsProcessing(false);
      isAnimating.current = false;
      isJudging.current = false;

      // ポーズ中でなく、レベルアップもしていない場合は次の文字へ
      if (!showPause && !showLevelUp) {
        console.log('GameScreen: 処理完了 - 次の文字へ進みます');
        setTimeout(() => selectAndStartRecording(), 300);
      } else {
        console.log(
          `GameScreen: 処理完了 - 一時停止中またはレベルアップのため次の文字へ進みません [一時停止=${showPause}, レベルアップ=${showLevelUp}]`
        );
      }
    } catch (error) {
      console.error('GameScreen: 文字変更処理中にエラー:', error);

      // エラーが発生しても状態をリセット
      setIsProcessing(false);
      isAnimating.current = false;
      isJudging.current = false;
      setJudgementResult(null);
      setShurikenVisible(false);

      if (!showPause && !showLevelUp) {
        console.log('GameScreen: エラー発生後 - 次の文字へ進みます');
        setTimeout(() => selectAndStartRecording(), 500);
      }
    }
  };

  // 手裏剣アニメーションを再生する関数
  const playShurikenAnimation = async (result: 'correct' | 'incorrectA' | 'incorrectB') => {
    // アニメーション開始
    setShurikenVisible(true);
    shurikenAnim.setValue(0);
    shurikenRotation.setValue(0);

    // 結果に基づいて異なる目標位置を設定
    let targetX = -SCREEN_WIDTH / 2 + 30; // 画面中央から少し左に（正確に的の中心）
    let targetY = -250;

    if (result === 'correct') {
      // 的の中心へ
      targetX = -SCREEN_WIDTH / 2 + 30;
      targetY = -250;
    } else if (result === 'incorrectA') {
      // 的の端へ
      targetX = -SCREEN_WIDTH / 2 + 90;
      targetY = -230;
    } else {
      // 的を外れる
      targetX = -SCREEN_WIDTH / 2 + 130;
      targetY = -180;
    }

    console.log(`GameScreen: 手裏剣発射 - 結果: ${result}, 目標: (${targetX}, ${targetY})`);

    // 手裏剣を回転させながら投げるアニメーション
    Animated.parallel([
      Animated.timing(shurikenAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(shurikenRotation, {
        toValue: 8, // 8回転
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    // 効果音を再生
    try {
      await soundService.playEffect('shuriken');
    } catch (soundError) {
      console.error('GameScreen: 手裏剣効果音エラー:', soundError);
    }

    // アニメーション完了まで待機
    return new Promise<void>((resolve) => {
      setTimeout(resolve, 700);
    });
  };

  /**
   * 録音停止ボタンを押した時の処理
   * 音声認識を停止し、判定処理を開始する
   */
  const handleStopRecording = async () => {
    console.log(`GameScreen: 録音停止ボタンが押されました - 録音中:${isListeningRef.current}, アニメ中:${isAnimating.current}`);

    // アニメーション中は無視
    if (isAnimating.current) {
      console.log('GameScreen: アニメーション中のため、録音停止操作を無視します');
      return;
    }

    // 録音中でない場合は何もしない
    if (!isListeningRef.current) {
      console.log('GameScreen: 録音中ではないため、操作を無視します');
      return;
    }

    try {
      console.log('GameScreen: 録音停止処理を開始');
      const endTime = Date.now();
      const duration = startTime.current ? (endTime - startTime.current) / 1000 : 1;

      // 最小時間を0.5秒に制限
      const adjustedDuration = Math.max(duration, 0.5);

      setIsListening(false);
      isListeningRef.current = false;

      // 安全タイマー設定 - 10秒後に強制的にフラグをリセット
      const safetyTimer = setTimeout(() => {
        console.log('GameScreen: 安全タイマーにより判定処理をリセットします');
        setIsProcessing(false);
        isAnimating.current = false;
        isJudging.current = false;
        setJudgementResult(null);
        setShurikenVisible(false);

        // 次の文字へ進む
        if (!showPause && !showLevelUp) {
          selectAndStartRecording();
        }
      }, 10000);

      // 録音停止
      let recordingUri = null;
      if (recording.current) {
        await recording.current.stopAndUnloadAsync();
        recordingUri = recording.current.getURI();
        recording.current = null;
        console.log('GameScreen: 録音を停止しました', recordingUri);
      }

      // 音声認識のAI判定
      let result: 'correct' | 'incorrectA' | 'incorrectB';

      try {
        // 発音の評価（AIによる判定）
        const evaluationResult = await voiceService.evaluateRecording(currentCharacter, recordingUri || undefined);
        result = evaluationResult.result;
        console.log('GameScreen: AI判定結果', evaluationResult);
      } catch (aiError) {
        console.error('GameScreen: AI判定エラー', aiError);
        // エラー時はランダム判定（開発環境用）
        const random = Math.random();
        if (random > 0.3) {
          result = 'correct'; // 70%の確率で正解
        } else if (random > 0.1) {
          result = 'incorrectA'; // 20%の確率で間違いA（似た音や形）
        } else {
          result = 'incorrectB'; // 10%の確率で間違いB（全く異なる）
        }
      }

      console.log(`GameScreen: 判定結果=${result} (${process.env.NODE_ENV}環境)`);

      // 安全タイマーをクリア
      clearTimeout(safetyTimer);

      // 文字変更処理
      startTime.current = Date.now();
      await handleCharacterTransition(result);
    } catch (error) {
      console.error('GameScreen: 録音停止エラー:', error);
      setIsListening(false);
      isListeningRef.current = false;
      setIsProcessing(false); // 確実にリセット
      isAnimating.current = false; // アニメーション状態もリセット
      isJudging.current = false;

      // エラーが発生しても次の文字に進む
      try {
        // エラー発生時は正解として処理して次に進む
        setJudgementResult(null);
        setTimeout(() => {
          if (!showPause && !showLevelUp) {
            selectAndStartRecording();
          }
        }, 500);
      } catch (animError) {
        console.error('GameScreen: 文字変更エラー:', animError);
        // 失敗しても次の文字に進む
        setIsProcessing(false);
        isAnimating.current = false;
        isJudging.current = false;
        setTimeout(() => {
          if (!showPause && !showLevelUp) {
            selectAndStartRecording();
          }
        }, 500);
      }
    }
  };

  // コンポーネント内に isFirstRecordingStarted 参照を定義
  const isFirstRecordingStarted = useRef(false);

  // 初期化完了後に最初の文字を選択して録音開始
  useEffect(() => {
    if (!isInitializing && initialSetupComplete.current && !isFirstRecordingStarted.current) {
      console.log('GameScreen: 初期化完了後、最初の文字選択と録音開始');
      isFirstRecordingStarted.current = true;

      // 少し遅延してから最初の文字選択と録音開始
      setTimeout(() => {
        if (!showPause && !showLevelUp && !isProcessing) {
          selectAndStartRecording();
        }
      }, 500);
    }
  }, [isInitializing, isListening]);

  // レベルアップの判定
  const checkLevelUp = async (collectedCount: number) => {
    const newLevel = Math.floor(collectedCount / 10) + 1;
    if (newLevel > currentLevel) {
      await soundService.playEffect('levelUp');
      setCurrentLevel(newLevel);
      setShowLevelUp(true);
    }
  };

  // 文字完了時の処理を更新
  const handleCharacterComplete = (character: string, isCorrect: boolean, responseTime: number) => {
    // キャラクターの完了をAsyncStorageに保存
    saveSessionDataToStorage({ character, isCorrect, responseTime });

    // 親コンポーネントにも通知
    if (typeof onCharacterComplete === 'function') {
      onCharacterComplete(character, isCorrect, responseTime);
    }

    // ステージモード情報を再読み込み
    loadStageMode();

    // 進捗のチェック
    const collectedCount = progress.collectedMojitama.length + (isCorrect ? 1 : 0);
    checkLevelUp(collectedCount);
  };

  // レベルアップアニメーション完了時の処理
  const handleLevelUpComplete = () => {
    setShowLevelUp(false);
    selectAndStartRecording();
  };

  // ポーズ処理
  const handlePause = async () => {
    console.log('GameScreen: ゲームを一時停止します');

    // 一時停止時にSupabaseにデータを送信（エラーを無視）
    try {
      await sendSessionDataToSupabase();
    } catch (error) {
      console.error('GameScreen: 一時停止時のデータ送信エラー:', error);
      // エラーを無視して続行
    }

    // 録音中であれば停止
    if (isListeningRef.current && recording.current) {
      try {
        console.log('GameScreen: 一時停止 - 録音を停止します');
        await recording.current.stopAndUnloadAsync();
        recording.current = null;
      } catch (error) {
        console.error('GameScreen: 一時停止中の録音停止エラー:', error);
      }
    }

    // タイマーを停止
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 一時停止画面を表示
    setShowPause(true);

    // バックグラウンド音楽を一時停止
    try {
      // soundServiceに一時停止メソッドがないのでストップで代用
      await soundService.stopBGM();
    } catch (error) {
      console.error('GameScreen: 背景音楽停止エラー:', error);
    }
  };

  // ポーズ画面を閉じたときの処理
  const handleResume = async () => {
    console.log('ポーズ画面から復帰します');
    setShowPause(false);
  };

  const handleQuit = () => {
    Alert.alert('修行をやめますか？', '進捗は保存されます。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'やめる',
        style: 'destructive',
        onPress: async () => {
          try {
            console.log('修行を終了します');

            // 録音中なら停止
            if (isListeningRef.current) {
              setIsListening(false);
              isListeningRef.current = false;
              await voiceService.stopListening();
            }

            // 音声サービスとサウンドをクリーンアップ
            await voiceService.cleanup();
            soundService.unloadSounds();

            // 進捗を更新（経過時間を記録）
            const userId = authService.getUser()?.id;
            if (userId) {
              try {
                // 経過時間を分単位で計算（300秒から残り時間を引く）
                const elapsedMinutes = Math.ceil((300 - remainingTime) / 60);

                if (elapsedMinutes > 0) {
                  console.log(`修行時間を記録: ${elapsedMinutes}分`);

                  // 1. 練習時間を記録
                  await progressService.recordStudyTime(userId, elapsedMinutes);

                  // 2. ストリークを更新
                  await progressService.updateStreak(userId);

                  // 3. 送信するデータを取得
                  const stageType = config.type || 'beginner';
                  const sessionDataStr = await AsyncStorage.getItem(`session_data_${stageType}`);

                  if (sessionDataStr) {
                    const sessionData = JSON.parse(sessionDataStr);

                    // 4. 新スキーマに合わせてセッションを記録
                    if (sessionData && sessionData.characters && sessionData.characters.length > 0) {
                      try {
                        const accuracyRate = sessionData.totalAttempts > 0 ? (sessionData.correctAttempts / sessionData.totalAttempts) * 100 : 0;
                        const currentTime = new Date();

                        const sessionId = await progressService.recordLearningSession(userId, {
                          sessionType: stageType,
                          durationSeconds: Math.round((currentTime.getTime() - new Date(sessionData.startTime).getTime()) / 1000),
                          character_data: sessionData.characters.map((c: { character: string; isCorrect: boolean; responseTime: number }) => ({
                            character: c.character,
                            successful: c.isCorrect,
                            total: 1,
                            responseTimeMs: Math.round(c.responseTime * 1000),
                          })),
                        });

                        console.log('途中経過の学習セッションを記録しました:', sessionId);

                        // データを送信したらクリア
                        await AsyncStorage.removeItem(`session_data_${stageType}`);
                      } catch (sessionError) {
                        console.error('学習セッション記録エラー:', sessionError);
                      }
                    }
                  }

                  // 5. セッション状態をクリアせず、stageTypeを保持したまま更新
                  // これにより同じ日に再開したときに前回のデータと関連付けられる
                  await progressService.updateSessionState(userId, config.type || 'beginner');

                  console.log('途中経過の進捗更新成功');
                } else {
                  console.log('修行時間が1分未満のため記録しません');
                  // セッション状態はクリア
                  await progressService.clearSessionState(userId);
                }
              } catch (progressError) {
                console.error('進捗更新エラー:', progressError);
                // 進捗更新エラーは無視して続行
              }
            }

            // 遷移
            router.back();
          } catch (error) {
            console.error('修行終了処理エラー:', error);
            // エラーがあっても遷移
            router.back();
          }
        },
      },
    ]);
  };

  const showEncouragementPopover = () => {
    console.log('GameScreen: 励ましポップアップを表示します');
    setShowEncouragement(true);

    // 励ましを表示するタイミングでSupabaseにデータを送信
    sendSessionDataToSupabase().catch((error) => {
      console.error('GameScreen: 励まし表示時のデータ送信エラー:', error);
    });

    Animated.timing(encouragementAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
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

    setTimeout(() => {
      if (showPause || showLevelUp) {
        console.log('GameScreen: ポーズ中またはレベルアップ表示中のため、文字選択をスキップします');
        return;
      }

      // 励まし後の新しい文字選択と録音開始
      selectAndStartRecording();
    }, 800);
  };

  // 学習セッションのデータを一時保存する関数
  const saveSessionDataToStorage = async (characterData: { character: string; isCorrect: boolean; responseTime: number }) => {
    try {
      // 現在のセッションデータを取得
      const stageType = config.type || 'beginner';
      const sessionDataStr = await AsyncStorage.getItem(`session_data_${stageType}`);
      let sessionData = sessionDataStr
        ? JSON.parse(sessionDataStr)
        : {
            characters: [],
            startTime: new Date().toISOString(),
            totalAttempts: 0,
            correctAttempts: 0,
          };

      // データを追加
      sessionData.characters.push(characterData);
      sessionData.totalAttempts += 1;
      if (characterData.isCorrect) {
        sessionData.correctAttempts += 1;
      }

      // 更新したデータを保存
      await AsyncStorage.setItem(`session_data_${stageType}`, JSON.stringify(sessionData));
      console.log('GameScreen: セッションデータをAsyncStorageに保存しました', characterData);
    } catch (error) {
      console.error('GameScreen: セッションデータ保存エラー:', error);
    }
  };

  // セッションデータをSupabaseに送信する関数
  const sendSessionDataToSupabase = async () => {
    try {
      const userId = authService.getUser()?.id;
      if (!userId) {
        console.error('GameScreen: ユーザーIDが取得できません');
        return null;
      }

      const stageType = config.type || 'beginner';
      const sessionDataStr = await AsyncStorage.getItem(`session_data_${stageType}`);
      if (!sessionDataStr) {
        console.log('GameScreen: 送信するセッションデータがありません');
        return null;
      }

      const sessionData = JSON.parse(sessionDataStr);
      if (sessionData.characters.length === 0) {
        console.log('GameScreen: キャラクターデータがありません');
        return null;
      }

      try {
        const startTime = new Date(sessionData.startTime);
        const endTime = new Date();
        const accuracyRate = sessionData.totalAttempts > 0 ? (sessionData.correctAttempts / sessionData.totalAttempts) * 100 : 0;

        // 新スキーマのrecordLearningSessionに合わせて引数を渡す
        const sessionId = await progressService.recordLearningSession(userId, {
          sessionType: stageType,
          durationSeconds: Math.round((endTime.getTime() - startTime.getTime()) / 1000),
          character_data: sessionData.characters.map((c: { character: string; isCorrect: boolean; responseTime: number }) => ({
            character: c.character,
            successful: c.isCorrect,
            total: 1,
            responseTimeMs: Math.round(c.responseTime * 1000),
          })),
        });

        // 保存に成功したら一時データをクリア
        await AsyncStorage.removeItem(`session_data_${stageType}`);
        console.log('GameScreen: セッションデータをSupabaseに送信し、AsyncStorageからクリアしました', { sessionId });

        return sessionId;
      } catch (apiError) {
        console.error('GameScreen: Supabaseセッション記録エラー:', apiError);
        // エラーが発生しても子供のゲーム体験を妨げないよう続行
        // AsyncStorageのデータはクリアせず、後で再送信できるようにする
        return null;
      }
    } catch (error) {
      console.error('GameScreen: Supabaseへのセッションデータ送信エラー:', error);
      // エラーが発生しても子供のゲーム体験に影響しないよう続行
      return null;
    }
  };

  // 初期化処理を追加
  const startInitialization = async () => {
    try {
      // 初期状態ですべての録音リソースをクリーンアップ
      try {
        if (recording.current) {
          await recording.current.stopAndUnloadAsync();
          recording.current = null;
        }
        await voiceService.cleanup();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
      } catch (cleanupError) {
        console.error('GameScreen: 初期化中のリソースクリーンアップエラー:', cleanupError);
        // エラーを無視して続行
      }

      // サウンドの初期化
      await soundService.initialize();
      console.log('GameScreen: サウンド初期化完了');

      // 音声認識の初期化を試みるが、失敗しても続行
      try {
        await voiceService.ensureInitialized();
        console.log('GameScreen: 音声認識初期化完了');
      } catch (voiceError) {
        console.error('GameScreen: 音声認識初期化エラー、文字表示のみで続行:', voiceError);
      }

      // 初期化完了
      setIsInitializing(false);
      initialSetupComplete.current = true;
      console.log('GameScreen: 初期化完了');
    } catch (error) {
      console.error('初期化エラー:', error);
      // エラーがあっても初期化は完了とする
      setIsInitializing(false);
      initialSetupComplete.current = true;
      console.log('GameScreen: エラーありで初期化完了');
    }
  };

  // AsyncStorageからセッションデータをロード
  const loadSessionDataFromStorage = async () => {
    try {
      // 現在のセッションデータを取得
      const stageType = config.type || 'beginner';
      const sessionDataStr = await AsyncStorage.getItem(`session_data_${stageType}`);
      if (sessionDataStr) {
        const sessionData = JSON.parse(sessionDataStr);
        console.log('GameScreen: 保存済みのセッションデータをロードしました', {
          開始時間: sessionData.startTime,
          文字数: sessionData.characters.length,
        });
      } else {
        console.log('GameScreen: 保存済みセッションデータはありません');

        // 初期セッションデータを作成して保存
        const initialSessionData = {
          characters: [],
          startTime: new Date().toISOString(),
          totalAttempts: 0,
          correctAttempts: 0,
        };

        await AsyncStorage.setItem(`session_data_${stageType}`, JSON.stringify(initialSessionData));
        console.log('GameScreen: 新規セッションデータを初期化しました');
      }
    } catch (error) {
      console.error('GameScreen: セッションデータロードエラー:', error);
    }
  };

  /**
   * 表示する文字を決定する関数
   * 状態に応じて適切な文字や空白を返す
   * @returns 表示する文字
   */
  const renderCharacter = () => {
    // 判定中はそのまま文字を表示
    if (judgementResult) {
      return currentCharacter;
    }

    // ロード中は空白を表示
    if (isLoadingCharacter) {
      return '';
    }

    // 初期化中も空白を表示
    if (isInitializing) {
      return '';
    }

    // 文字がない場合は「？」を表示
    if (!currentCharacter) {
      return '？';
    }

    // 通常時は現在の文字を表示
    return currentCharacter;
  };

  // ステージモード情報をロード
  const loadStageMode = async () => {
    try {
      const modeInfo = await stageService.getCurrentModeInfo(config.type);
      setStageMode(modeInfo);
      console.log('GameScreen: ステージモード情報をロードしました', modeInfo);
    } catch (error) {
      console.error('GameScreen: ステージモード情報の読み込みエラー:', error);
    }
  };

  // 初期ロード時と進捗更新時にステージモード情報を更新
  useEffect(() => {
    loadStageMode();
  }, [progress]);

  // 制限時間を秒で表示するヘルパー関数
  const formatTimeLimit = (ms: number): string => {
    return (ms / 1000).toFixed(1);
  };

  // 録音ボタンのUIを修正（常に「とめる」ボタンのみ表示）
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ImageBackground
        source={config.backgroundImage}
        style={{
          flex: 1,
          padding: 16,
        }}>
        {/* ヘッダー部分 - ステージ情報 */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}>
          <TouchableOpacity
            onPress={handlePause}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              borderRadius: 8,
              padding: 8,
            }}>
            <MaterialCommunityIcons name='pause' size={24} color='#41644A' />
          </TouchableOpacity>

          {/* ステージモード表示 - 新規追加 */}
          <View style={{ alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 8, padding: 8 }}>
            {stageMode.isLastStage ? (
              <Text style={{ fontFamily: 'Zen-B', fontSize: 14, color: '#E74646' }}>
                らすとすてーじ ({formatTimeLimit(stageMode.timeLimit)}びょう)
              </Text>
            ) : stageMode.isTestMode ? (
              <Text style={{ fontFamily: 'Zen-B', fontSize: 14, color: '#41644A' }}>
                てすと ({stageMode.testResults?.correctAttempts || 0}/{stageMode.testResults?.totalAttempts || 0})
              </Text>
            ) : (
              <Text style={{ fontFamily: 'Zen-B', fontSize: 14, color: '#41644A' }}>
                れんしゅう {stageMode.trainingLevel} ({formatTimeLimit(stageMode.timeLimit)}びょう)
                {stageMode.completedSets}/{stageMode.requiredSets}セット
              </Text>
            )}
          </View>

          <View
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              borderRadius: 8,
              padding: 8,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
            <MaterialCommunityIcons name='clock-outline' size={24} color='#41644A' />
            <Text
              style={{
                fontFamily: 'Zen-B',
                fontSize: 14,
                color: '#41644A',
                marginLeft: 4,
              }}>
              {formatTime(remainingTime)}
            </Text>
          </View>
        </View>

        {/* 不要な3本線メニューボタンを非表示にするためのオーバーレイ */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 60,
            height: 60,
            backgroundColor: 'transparent',
            zIndex: 10,
          }}
        />

        {/* プログレスバー - 進捗状況を表示 */}
        <ProgressBar
          level={currentLevel}
          collectedCount={progress.collectedMojitama.length}
          totalRequired={config.characters.length}
          hideMenuButton={true} // 3本線メニューを非表示にする
          value={(progress.collectedMojitama.length % 10) / 10} // 進捗値（0〜1の範囲）
        />

        {/* 長老キャラクター - 左上に配置 */}
        {/* <Animated.Image
          source={require('../../assets/temp/elder-worried.png')}
          style={{
            position: 'absolute',
            top: 80,
            left: 20,
            width: 60,
            height: 60,
            // transform: [{ translateY: elderPosition }],
            zIndex: 1,
          }}
        /> */}

        {/* メインの文字表示エリア - 画面中央 */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 10 }}>
          {/* 文字の背景 */}
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

          {/* 正解・不正解マークの表示 - 手裏剣アニメーション */}
          {judgementResult && (
            <View
              style={{
                position: 'absolute',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                height: 300,
                zIndex: 5, // 文字より下のレイヤーに表示
              }}>
              {judgementResult === 'correct' ? (
                // 正解：シンプルな円と「せいかい！」テキスト
                <View style={{ alignItems: 'center' }}>
                  <View
                    style={{
                      width: 200,
                      height: 200,
                      borderRadius: 100,
                      backgroundColor: 'rgba(255,255,255,0.7)',
                      borderWidth: 8,
                      borderColor: '#B22222',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    <Text
                      style={{
                        fontFamily: 'Zen-B',
                        fontSize: 40,
                        color: '#B22222',
                      }}>
                      せいかい！
                    </Text>
                  </View>
                </View>
              ) : judgementResult === 'incorrectA' ? (
                // 間違いA：シンプルな円と「おしい！」テキスト
                <View style={{ alignItems: 'center' }}>
                  <View
                    style={{
                      width: 200,
                      height: 200,
                      borderRadius: 100,
                      backgroundColor: 'rgba(255,255,255,0.7)',
                      borderWidth: 8,
                      borderColor: '#FFA500',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    <Text
                      style={{
                        fontFamily: 'Zen-B',
                        fontSize: 40,
                        color: '#FFA500',
                      }}>
                      おしい！
                    </Text>
                  </View>
                </View>
              ) : (
                // 間違いB：シンプルな円と「ざんねん！」テキスト
                <View style={{ alignItems: 'center' }}>
                  <View
                    style={{
                      width: 200,
                      height: 200,
                      borderRadius: 100,
                      backgroundColor: 'rgba(255,255,255,0.7)',
                      borderWidth: 8,
                      borderColor: '#666',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    <Text
                      style={{
                        fontFamily: 'Zen-B',
                        fontSize: 40,
                        color: '#666',
                      }}>
                      ざんねん！
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* 練習する文字 - アニメーション付き */}
          <Animated.Text
            style={{
              fontFamily: 'font-mplus-bold',
              fontSize: 120,
              color: '#333',
              transform: [{ scale: characterScale }],
              textShadowColor: 'rgba(255, 255, 255, 0.8)',
              textShadowOffset: { width: 2, height: 2 },
              textShadowRadius: 4,
              zIndex: 5, // 前面に表示するが、モーダルよりは下に
            }}>
            {renderCharacter()}
          </Animated.Text>
        </View>

        {/* 下部のコントロールエリア */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            paddingHorizontal: 30,
            zIndex: 5, // コントロールも適切なzIndexに設定
          }}>
          {/* ポーズボタン（×ボタン） */}
          <TouchableOpacity
            onPress={handlePause}
            style={{
              width: 60,
              height: 60,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: 30,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 5,
              borderWidth: 2,
              borderColor: '#EEEEEE',
            }}>
            <Text style={{ fontSize: 30, fontWeight: 'bold', color: '#666' }}>×</Text>
          </TouchableOpacity>

          {/* 録音ボタン - 判定中は無効化 */}
          <TouchableOpacity
            onPress={handleStopRecording}
            disabled={!isListeningRef.current || showPause || isProcessing || isJudging.current}
            style={{
              width: 120,
              height: 120,
              backgroundColor: isListeningRef.current && !isJudging.current ? '#FF3B30' : '#999', // 録音中は赤、それ以外はグレー
              borderRadius: 60,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 8,
              borderWidth: 5,
              borderColor: 'white',
              opacity: isListeningRef.current && !isJudging.current ? 1 : 0.7, // 録音中以外は透明度を下げる
            }}>
            <View style={{ alignItems: 'center' }}>
              <MaterialCommunityIcons name='stop' size={60} color='#FFF' />
              <Text
                style={{
                  fontFamily: 'font-mplus-bold',
                  fontSize: 12,
                  color: '#FFF',
                  marginTop: 5,
                }}>
                とめる
              </Text>
            </View>
          </TouchableOpacity>

          {/* 忍者画像 */}
          <Image
            source={require('../../assets/temp/ninja_syuriken_man.png')}
            style={{
              width: 60,
              height: 60,
              resizeMode: 'contain',
            }}
          />
        </View>

        {/* 指示テキスト */}
        <Text
          style={{
            fontFamily: 'font-mplus-bold',
            fontSize: 20,
            color: '#fff',
            textAlign: 'center',
            marginBottom: 30,
            // textShadowColor: 'rgba(255, 255, 255, 0.8)',
            // textShadowOffset: { width: 1, height: 1 },
            // textShadowRadius: 2,
          }}>
          {isJudging.current ? 'はんていちゅう...' : isListeningRef.current ? 'よみおわったら とめるボタンを おしてね' : 'もじを みてもらおう'}
        </Text>

        {/* ポーズ画面 */}
        {showPause && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1000, // モーダルは非常に高いzIndexにする
            }}>
            <PauseScreen onResume={handleResume} onQuit={handleQuit} />
          </View>
        )}

        {/* レベルアップアニメーション */}
        {showLevelUp && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1000, // 高いzIndexで最前面に表示
            }}>
            <LevelUpAnimation level={currentLevel} onComplete={handleLevelUpComplete} />
          </View>
        )}

        {/* 励ましポップオーバー */}
        {showEncouragement && (
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.7)',
              justifyContent: 'center',
              alignItems: 'center',
              opacity: encouragementAnim,
              zIndex: 10,
            }}>
            <View
              style={{
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 24,
                width: '80%',
                alignItems: 'center',
                borderWidth: 4,
                borderColor: '#41644A',
              }}>
              <View
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                  backgroundColor: '#41644A',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 16,
                }}>
                <Text
                  style={{
                    fontFamily: 'Zen-B',
                    fontSize: 36,
                    color: 'white',
                  }}>
                  ✓
                </Text>
              </View>
              <Text style={{ fontFamily: 'Zen-B', fontSize: 24, color: '#41644A', marginBottom: 8 }}>すごい！</Text>
              <Text style={{ fontFamily: 'Zen', fontSize: 16, color: '#666', marginBottom: 16, textAlign: 'center' }}>
                もうすこしでレベルアップです！{'\n'}がんばりましょう！
              </Text>
              <TouchableOpacity
                onPress={handleEncouragementContinue}
                style={{
                  backgroundColor: '#41644A',
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 30,
                }}>
                <Text style={{ fontFamily: 'Zen-B', fontSize: 16, color: 'white' }}>つづける</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* 手裏剣アニメーション - 忍者から発射 */}
        {shurikenVisible && (
          <Animated.Image
            source={require('../../assets/temp/shuriken.png')}
            style={{
              position: 'absolute',
              bottom: 100,
              right: 30, // 忍者の位置（右端）から発射
              width: 60,
              height: 60,
              zIndex: 10,
              transform: [
                {
                  translateX: shurikenAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [
                      0,
                      judgementResult === 'correct'
                        ? -SCREEN_WIDTH / 2 + 30
                        : judgementResult === 'incorrectA'
                        ? -SCREEN_WIDTH / 2 + 90
                        : -SCREEN_WIDTH / 2 + 130,
                    ],
                  }),
                },
                {
                  translateY: shurikenAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, judgementResult === 'correct' ? -250 : judgementResult === 'incorrectA' ? -230 : -180],
                  }),
                },
                {
                  rotate: shurikenRotation.interpolate({
                    inputRange: [0, 8],
                    outputRange: ['0deg', '2880deg'], // 8回転（360 * 8）
                  }),
                },
              ],
            }}
          />
        )}
      </ImageBackground>
    </SafeAreaView>
  );
}

export default GameScreen;
