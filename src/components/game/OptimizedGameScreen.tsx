import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { View, Text, ImageBackground, SafeAreaView, TouchableOpacity, Animated, Dimensions, Alert, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { StageProgress, StageConfig } from '../../../app/types/progress';
import voiceService from '../../services/voiceService';
import soundService from '../../services/soundService';
import { PauseScreen } from '../ui/PauseScreen';
import { LevelUpAnimation } from './LevelUpAnimation';
import SimpleProgressBar from '../ui/SimpleProgressBar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CharacterDisplay from './CharacterDisplay';
import GameControlButton, { ControlButtonState } from './GameControlButton';
import NinjaCharacter from '../characters/NinjaCharacter';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ヘッダー部分をメモ化コンポーネントとして分離
const GameHeader = memo(({ remainingTime, onPause }: { remainingTime: number; onPause: () => void }) => {
  // 時間のフォーマット
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        width: '100%',
      }}>
      {/* 一時停止ボタン */}
      <TouchableOpacity
        onPress={onPause}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          width: 40,
          height: 40,
          borderRadius: 20,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 3,
          elevation: 3,
        }}>
        <MaterialCommunityIcons name='pause' size={24} color='#41644A' />
      </TouchableOpacity>

      {/* 残り時間 */}
      <View
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          paddingHorizontal: 15,
          paddingVertical: 8,
          borderRadius: 20,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 3,
          elevation: 3,
        }}>
        <MaterialCommunityIcons name='clock-outline' size={20} color='#41644A' />
        <Text
          style={{
            fontFamily: 'Zen-B',
            fontSize: 18,
            color: '#41644A',
            marginLeft: 6,
          }}>
          {formatTime(remainingTime)}
        </Text>
      </View>
    </View>
  );
});

// 励まし表示コンポーネント
const EncouragementPopup = memo(
  ({
    visible,
    encouragementAnim,
    collectedCount,
    onContinue,
  }: {
    visible: boolean;
    encouragementAnim: Animated.Value;
    collectedCount: number;
    onContinue: () => void;
  }) => {
    if (!visible) return null;

    return (
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
            transform: [
              { translateX: -150 },
              { translateY: -200 },
              {
                scale: encouragementAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
            opacity: encouragementAnim,
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
          <Image source={require('../../../assets/temp/elder-worried.png')} style={{ width: 120, height: 120, marginBottom: 10 }} />
          <Text style={{ fontSize: 24, fontFamily: 'Zen-B', color: '#4CAF50', marginBottom: 10 }}>すごい！</Text>
          <Text style={{ fontSize: 16, fontFamily: 'Zen-R', color: '#666', textAlign: 'center', marginBottom: 20 }}>
            もう{collectedCount}もんも できたよ！{'\n'}このちょうしで がんばろう！
          </Text>
          <TouchableOpacity
            onPress={onContinue}
            style={{
              backgroundColor: '#4CAF50',
              paddingVertical: 10,
              paddingHorizontal: 30,
              borderRadius: 25,
            }}>
            <Text style={{ color: 'white', fontSize: 18, fontFamily: 'Zen-B' }}>つぎへ</Text>
          </TouchableOpacity>
        </Animated.View>
      </>
    );
  }
);

// 状態メッセージコンポーネント
const StatusMessage = memo(({ isJudging, isListening }: { isJudging: boolean; isListening: boolean }) => {
  let message = 'もじを みてもらおう';
  if (isJudging) {
    message = 'はんていちゅう...';
  } else if (isListening) {
    message = 'よみおわったら とめるボタンを おしてね';
  }

  return (
    <Text
      style={{
        fontFamily: 'Zen-B',
        fontSize: 20,
        color: '#fff',
        textAlign: 'center',
        marginBottom: 30,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
      }}>
      {message}
    </Text>
  );
});

// カスタム型定義
interface GameProgress {
  level: number;
  exp: number;
  collectedMojitama: string[];
}

// ゲーム画面のメインコンポーネント
interface OptimizedGameScreenProps {
  config: StageConfig;
  progress: StageProgress;
  onPause: () => void;
  onCharacterComplete: (character: string, isCorrect: boolean, responseTime: number) => void;
}

const OptimizedGameScreen: React.FC<OptimizedGameScreenProps> = ({ config, progress, onPause, onCharacterComplete }) => {
  const router = useRouter();
  const [currentCharacter, setCurrentCharacter] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);
  const [showPause, setShowPause] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [isInitializing, setIsInitializing] = useState(true);
  const [remainingTime, setRemainingTime] = useState(300); // 5分（300秒）
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [judgementResult, setJudgementResult] = useState<'correct' | 'incorrect' | null>(null);
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [lastCollectedMilestone, setLastCollectedMilestone] = useState<number>(0);

  // アニメーション用の値
  const characterScale = useRef(new Animated.Value(1)).current;
  const elderPosition = useRef(new Animated.Value(0)).current;
  const encouragementAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // その他の参照
  const startTime = useRef<number | null>(null);
  const initialSetupComplete = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recording = useRef<Audio.Recording | null>(null);
  const isRecordingLocked = useRef(false);
  const latestCharacter = useRef<string>('');
  const isJudging = useRef<boolean>(false);

  // パルスアニメーションの開始
  useEffect(() => {
    // アニメーションが継続するように設定
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      pulseAnim.stopAnimation();
    };
  }, []);

  // コンポーネントのマウント時に初期化
  useEffect(() => {
    console.log('===== OptimizedGameScreen: マウント完了 - 初期化処理開始 =====');

    // デフォルト文字の設定（初期表示用）
    const setDefaultCharacter = () => {
      if (config.characters.length > 0) {
        const randomIndex = Math.floor(Math.random() * config.characters.length);
        const defaultChar = config.characters[randomIndex];
        console.log(`OptimizedGameScreen: デフォルト文字を設定:「${defaultChar}」`);
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

    // タイマーの開始
    startTimer();

    // クリーンアップ関数
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recording.current) {
        stopRecording();
      }
    };
  }, []);

  // タイマーの開始
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          // タイマーが0になったら、セッション完了と見なす
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          handleSessionComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // 初期化処理
  const startInitialization = async () => {
    try {
      console.log('OptimizedGameScreen: 初期化開始');
      // ここではvoiceServiceが初期化済みと仮定
      setCurrentLevel(getGameProgress().level || 1);
      await setupInitialCharacter();
      setIsInitializing(false);
      initialSetupComplete.current = true;
      console.log('OptimizedGameScreen: 初期化完了');
    } catch (error) {
      console.error('初期化エラー:', error);
      setIsInitializing(false);
      initialSetupComplete.current = true;
      console.log('OptimizedGameScreen: エラーありで初期化完了');
    }
  };

  // AsyncStorageからセッションデータをロード
  const loadSessionDataFromStorage = async () => {
    try {
      const stageType = config.type || 'beginner';
      const sessionDataStr = await AsyncStorage.getItem(`session_data_${stageType}`);
      if (sessionDataStr) {
        const sessionData = JSON.parse(sessionDataStr);
        console.log('OptimizedGameScreen: 保存済みのセッションデータをロードしました', {
          開始時間: sessionData.startTime,
          文字数: sessionData.characters.length,
        });
      } else {
        console.log('OptimizedGameScreen: 保存済みセッションデータはありません');

        // 初期セッションデータを作成して保存
        const initialSessionData = {
          characters: [],
          startTime: new Date().toISOString(),
          totalAttempts: 0,
          correctAttempts: 0,
        };

        await AsyncStorage.setItem(`session_data_${stageType}`, JSON.stringify(initialSessionData));
        console.log('OptimizedGameScreen: 新規セッションデータを初期化しました');
      }
    } catch (error) {
      console.error('OptimizedGameScreen: セッションデータロードエラー:', error);
    }
  };

  // 初期文字の設定
  const setupInitialCharacter = () => {
    console.log('OptimizedGameScreen: 初期文字設定を実行');
    const availableChars = config.characters;
    if (availableChars.length === 0) {
      console.log('利用可能な文字がありません');
      return null;
    }

    // ランダムに初期文字を選択
    const randomIndex = Math.floor(Math.random() * availableChars.length);
    const initialChar = availableChars[randomIndex];
    console.log(`OptimizedGameScreen: 初期文字設定完了: ${initialChar} 読み方: ${config.readings[initialChar]}`);

    // 状態を更新
    setCurrentCharacter(initialChar);
    return initialChar;
  };

  // 次の文字へ進む
  const goToNextCharacter = useCallback(() => {
    const availableChars = config.characters;
    if (availableChars.length === 0) return;

    let nextChar;
    // ランダムに次の文字を選択
    do {
      const randomIndex = Math.floor(Math.random() * availableChars.length);
      nextChar = availableChars[randomIndex];
    } while (nextChar === currentCharacter && availableChars.length > 1);

    // 文字サイズのアニメーション
    Animated.sequence([
      Animated.timing(characterScale, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(characterScale, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(characterScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // 次の文字を設定
    setCurrentCharacter(nextChar);
    latestCharacter.current = nextChar;

    // 判定結果をリセット
    setJudgementResult(null);
  }, [currentCharacter, config.characters]);

  // 録音の開始
  const startRecording = async () => {
    if (isRecordingLocked.current || !initialSetupComplete.current) {
      console.log('OptimizedGameScreen: 録音ロック中またはセットアップ未完了');
      return;
    }

    try {
      // ロックを設定して他の録音プロセスがスタートしないようにする
      isRecordingLocked.current = true;
      setIsProcessing(true);

      console.log('OptimizedGameScreen: 録音開始...', currentCharacter);
      await soundService.playEffect('click');

      // 時間計測開始
      startTime.current = Date.now();

      // 録音状態の更新
      setIsListening(true);
      isListeningRef.current = true;

      // 録音開始 - ここではAudio.Recordingオブジェクトが返るものと仮定
      const recordingObject = new Audio.Recording();
      await recordingObject.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: 4, // MPEG_4
          audioEncoder: 3, // AAC
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: 1, // kAudioFormatMPEG4AAC
          audioQuality: 127, // max
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });
      await recordingObject.startAsync();
      recording.current = recordingObject;

      setIsProcessing(false);
    } catch (error) {
      console.error('録音開始エラー:', error);
      setIsProcessing(false);
      setIsListening(false);
      isListeningRef.current = false;
      isRecordingLocked.current = false;
    }
  };

  // 録音の停止
  const stopRecording = async () => {
    if (!recording.current || !isListeningRef.current) {
      console.log('OptimizedGameScreen: 録音がアクティブではないか、既に停止処理中');
      return;
    }

    try {
      console.log('OptimizedGameScreen: 録音停止処理開始');
      setIsProcessing(true);
      isJudging.current = true;

      // 録音状態の更新
      setIsListening(false);
      isListeningRef.current = false;

      await soundService.playEffect('click');

      // 現在の文字を保存（非同期処理中に変わる可能性があるため）
      const targetCharacter = latestCharacter.current;

      // 時間計測終了
      const responseTime = startTime.current ? (Date.now() - startTime.current) / 1000 : 0;
      startTime.current = null;

      // 録音の停止と音声認識の実行
      await recording.current.stopAndUnloadAsync();
      const uri = recording.current.getURI();
      recording.current = null;

      if (!uri) {
        console.error('録音URIが取得できませんでした');
        setIsProcessing(false);
        isJudging.current = false;
        isRecordingLocked.current = false;
        return;
      }

      // 音声判定 - 実際のアプリでは適切な判定ロジックが必要
      console.log(`OptimizedGameScreen: 音声判定の開始 - 対象文字:「${targetCharacter}」`);
      // 簡易的な判定結果（ランダム）
      const judgementResult = Math.random() > 0.3; // 70%の確率で正解

      // 結果の表示と処理
      handleJudgementResult(targetCharacter, judgementResult, responseTime);
    } catch (error) {
      console.error('録音停止エラー:', error);
      setIsProcessing(false);
      isJudging.current = false;
      isRecordingLocked.current = false;
    }
  };

  // 判定結果の処理
  const handleJudgementResult = async (character: string, isCorrect: boolean, responseTime: number) => {
    try {
      console.log(`OptimizedGameScreen: 判定結果 - 文字:「${character}」, 結果: ${isCorrect ? '正解' : '不正解'}, 応答時間: ${responseTime}秒`);

      // 効果音再生
      await soundService.playEffect(isCorrect ? 'correct' : 'incorrect');

      // 判定結果表示
      setJudgementResult(isCorrect ? 'correct' : 'incorrect');

      // 進捗の更新
      await onCharacterComplete(character, isCorrect, responseTime);

      // セッションデータ更新
      await updateSessionData(character, isCorrect);

      // 励まし表示のチェック
      checkEncouragement();

      // 判定完了まで少し待機
      setTimeout(() => {
        // 次の文字へ進む
        goToNextCharacter();

        // 状態のリセット
        setIsProcessing(false);
        isJudging.current = false;
        isRecordingLocked.current = false;
      }, 1500);
    } catch (error) {
      console.error('判定結果処理エラー:', error);
      setIsProcessing(false);
      isJudging.current = false;
      isRecordingLocked.current = false;
    }
  };

  // セッションデータの更新
  const updateSessionData = async (character: string, isCorrect: boolean) => {
    try {
      const stageType = config.type || 'beginner';
      const sessionDataStr = await AsyncStorage.getItem(`session_data_${stageType}`);

      if (sessionDataStr) {
        const sessionData = JSON.parse(sessionDataStr);
        sessionData.characters.push({
          character,
          isCorrect,
          timestamp: new Date().toISOString(),
        });
        sessionData.totalAttempts += 1;
        if (isCorrect) {
          sessionData.correctAttempts += 1;
        }

        await AsyncStorage.setItem(`session_data_${stageType}`, JSON.stringify(sessionData));
      }
    } catch (error) {
      console.error('セッションデータ更新エラー:', error);
    }
  };

  // 励まし表示のチェック
  const checkEncouragement = () => {
    const gameProgress = getGameProgress();
    const collectedCount = gameProgress.collectedMojitama.length;

    // 達成数が5の倍数で、前回表示した時よりも増えている場合にのみ表示
    if (collectedCount > 0 && collectedCount % 5 === 0 && collectedCount > lastCollectedMilestone) {
      setLastCollectedMilestone(collectedCount);
      setShowEncouragement(true);

      // アニメーション開始
      Animated.timing(encouragementAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  };

  // 励まし表示を閉じる
  const handleEncouragementContinue = () => {
    // アニメーションで閉じる
    Animated.timing(encouragementAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowEncouragement(false);
    });
  };

  // セッション完了の処理
  const handleSessionComplete = async () => {
    setIsSessionComplete(true);
    // 録音中なら停止
    if (recording.current) {
      await stopRecording();
    }

    // セッションデータを送信
    await sendSessionDataToSupabase();

    // 結果表示画面へ遷移など
    Alert.alert(
      'おつかれさま！',
      'じかんがおわりました。けっかをみてみよう！',
      [
        {
          text: 'OK',
          onPress: () => router.push('results' as any), // 型エラー回避のためanyを使用
        },
      ],
      { cancelable: false }
    );
  };

  // セッションデータをSupabaseに送信
  const sendSessionDataToSupabase = async () => {
    try {
      const stageType = config.type || 'beginner';
      const sessionDataStr = await AsyncStorage.getItem(`session_data_${stageType}`);

      if (sessionDataStr) {
        const sessionData = JSON.parse(sessionDataStr);
        console.log('OptimizedGameScreen: セッションデータをSupabaseに送信します', sessionData);

        // TODO: Supabaseへのデータ送信実装

        // セッションデータをクリア
        await AsyncStorage.removeItem(`session_data_${stageType}`);
      }
    } catch (error) {
      console.error('セッションデータ送信エラー:', error);
    }
  };

  // 一時停止の表示
  const handlePause = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setShowPause(true);
  };

  // 再開
  const handleResume = () => {
    setShowPause(false);
    startTimer();
  };

  // やめる
  const handleQuit = () => {
    router.back();
  };

  // レベルアップ完了
  const handleLevelUpComplete = () => {
    setShowLevelUp(false);
  };

  // 録音ボタン状態の計算
  const getControlButtonState = useCallback((): ControlButtonState => {
    if (isProcessing || !initialSetupComplete.current) return 'disabled';
    if (isJudging.current) return 'judging';
    if (isListeningRef.current) return 'recording';
    return 'ready';
  }, [isProcessing]);

  // 録音ボタンのハンドラ
  const handleControlButtonPress = useCallback(() => {
    if (isListeningRef.current) {
      stopRecording();
    } else {
      startRecording();
    }
  }, []);

  // 進捗情報の取得
  const getGameProgress = (): GameProgress => {
    // progress型をGameProgressにキャスト
    return {
      level: 1,
      exp: 50,
      collectedMojitama: progress?.collectedMojitama || [],
    };
  };

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontFamily: 'Zen-R', fontSize: 18 }}>ロード中...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ImageBackground source={config.backgroundImage} style={{ flex: 1, width: '100%' }}>
        {/* ヘッダー部分 */}
        <GameHeader remainingTime={remainingTime} onPause={handlePause} />

        {/* キャラクター表示（長老） */}
        <View style={{ position: 'absolute', top: 80, left: 20 }}>
          <Image
            source={require('../../../assets/temp/elder-worried.png')}
            style={{
              width: 60,
              height: 60,
              zIndex: 1,
            }}
          />
        </View>

        {/* 忍者キャラクター表示 */}
        <View style={{ position: 'absolute', top: 80, right: 20 }}>
          <NinjaCharacter emotion={judgementResult === 'correct' ? 'happy' : judgementResult === 'incorrect' ? 'sad' : 'normal'} size={70} />
        </View>

        {/* メインのコンテンツエリア */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {/* 文字表示コンポーネント */}
          <CharacterDisplay
            character={currentCharacter}
            reading={config.readings[currentCharacter]}
            judgementResult={judgementResult}
            characterScale={characterScale}
          />

          {/* 進捗バー */}
          <View style={{ width: '90%', marginVertical: 20 }}>
            <SimpleProgressBar progress={getGameProgress().exp / 100} height={15} color='#4CAF50' />
            <Text
              style={{
                fontFamily: 'Zen-R',
                fontSize: 14,
                color: '#fff',
                textAlign: 'center',
                marginTop: 5,
                textShadowColor: 'rgba(0, 0, 0, 0.5)',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2,
              }}>
              レベル {getGameProgress().level} - あと{Math.ceil(100 - getGameProgress().exp)}ポイントでレベルアップ！
            </Text>
          </View>
        </View>

        {/* フッターエリア（ステータスメッセージと録音コントロール） */}
        <View style={{ marginBottom: 40, alignItems: 'center' }}>
          <StatusMessage isJudging={isJudging.current} isListening={isListeningRef.current} />

          <GameControlButton state={getControlButtonState()} onPress={handleControlButtonPress} pulseAnim={pulseAnim} />
        </View>

        {/* モーダル表示部分 */}
        {showPause && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1000,
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
              zIndex: 1000,
            }}>
            <LevelUpAnimation level={currentLevel} onComplete={handleLevelUpComplete} />
          </View>
        )}

        {/* 励ましポップアップ */}
        <EncouragementPopup
          visible={showEncouragement}
          encouragementAnim={encouragementAnim}
          collectedCount={getGameProgress().collectedMojitama.length}
          onContinue={handleEncouragementContinue}
        />
      </ImageBackground>
    </SafeAreaView>
  );
};

export default memo(OptimizedGameScreen);
