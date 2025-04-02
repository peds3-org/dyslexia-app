import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ImageBackground, SafeAreaView, TouchableOpacity, Animated, Dimensions, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StageProgress, StageConfig } from '../types/progress';
import voiceService from '../services/voiceService';
import soundService from '../services/soundService';
import authService from '../services/authService';
import progressService from '../services/progressService';
import { PauseScreen } from './PauseScreen';
import { LevelUpAnimation } from './LevelUpAnimation';
import { ProgressBar } from './ProgressBar';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type GameScreenProps = {
  config: StageConfig;
  progress: StageProgress;
  onPause: () => void;
  onCharacterComplete: (character: string, isCorrect: boolean, responseTime: number) => void;
};

export function GameScreen({ config, progress, onPause, onCharacterComplete }: GameScreenProps) {
  const router = useRouter();
  const [currentCharacter, setCurrentCharacter] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showPause, setShowPause] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [isInitializing, setIsInitializing] = useState(true);
  const [remainingTime, setRemainingTime] = useState(300); // 5分（300秒）
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const characterScale = useRef(new Animated.Value(1)).current;
  const shurikenPosition = useRef(new Animated.ValueXY({ x: -50, y: SCREEN_WIDTH / 2 })).current;
  const elderPosition = useRef(new Animated.Value(0)).current;
  const startTime = useRef<number>(0);
  const initialSetupComplete = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
      console.log('GameScreen: 5分間のセッションが完了しました');

      // 録音中なら停止
      if (isListening) {
        setIsListening(false);
        await voiceService.stopListening();
      }

      // 音声サービスをクリーンアップ
      await voiceService.cleanup();

      // 効果音を再生
      await soundService.playEffect('correct');

      // 進捗を更新
      const userId = authService.getUser()?.id;
      if (userId) {
        try {
          // 本日の学習時間を更新（5分 = 300秒）
          await progressService.updateProgress(userId, {
            totalStudyMinutes: 5, // 固定値として5分を追加
            lastTrainingDate: new Date(),
          });

          // ストリークを更新
          await progressService.updateStreak(userId);

          // セッション状態をクリア
          await progressService.clearSessionState(userId);

          console.log('セッション完了の進捗更新成功');
        } catch (progressError) {
          console.error('進捗更新エラー:', progressError);
          // 進捗更新エラーは無視して続行
        }
      }

      // 完了アラートを表示
      Alert.alert('修行完了！', '今日の5分間の修行が完了しました！明日も続けましょう。', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('セッション完了処理エラー:', error);
      // エラーがあっても完了メッセージを表示
      Alert.alert('修行完了', '今日の修行お疲れ様でした！', [{ text: 'OK', onPress: () => router.back() }]);
    }
  };

  // 残り時間の表示用フォーマット
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // 長老のフロートアニメーション
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(elderPosition, {
          toValue: 10,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(elderPosition, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // クリーンアップ
  useEffect(() => {
    // 初期化時のアクション
    const initVoice = async () => {
      try {
        // サウンドの読み込み
        await soundService.loadSounds();
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
      shurikenPosition.stopAnimation();
      elderPosition.stopAnimation();

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
      } else if (!isAnimating && !showLevelUp) {
        // ポーズ解除時で、アニメーション中やレベルアップ表示中でなければ録音再開
        console.log('ポーズ解除 - 新しい文字で録音再開準備');
        // すぐには開始せず、少し遅延を入れる
        setTimeout(() => {
          selectNewCharacter();
          handleStartListening();
        }, 800);
      }
    };

    handlePauseChange();
  }, [showPause]);

  // 音声ファイルの読み込み
  useEffect(() => {
    soundService.loadSounds();
  }, []);

  // 利用可能な文字を取得する関数
  const getAvailableCharacters = () => {
    return config.characters.filter((char) => !progress.collectedMojitama.includes(char));
  };

  // 初期文字の設定 (一度だけ実行される単純な関数)
  const setupInitialCharacter = () => {
    console.log('GameScreen: 初期文字設定を実行');
    const availableChars = getAvailableCharacters();
    if (availableChars.length === 0) {
      console.log('利用可能な文字がありません');
      return null;
    }

    const initialChar = availableChars[Math.floor(Math.random() * availableChars.length)];
    console.log(`GameScreen: 初期文字設定完了: ${initialChar} 読み方: ${config.readings[initialChar]}`);
    return initialChar;
  };

  // 初期化処理を一元管理する
  useEffect(() => {
    console.log('===== GameScreen: マウント完了 - 初期化処理開始 =====');

    let isMounted = true;
    let recordTimer: NodeJS.Timeout;
    let initialSetupDone = false;
    let currentInitialChar = ''; // 初期文字を空文字列で初期化

    // 初期化プロセスを開始
    const startInitialization = async () => {
      if (initialSetupDone) {
        console.log('GameScreen: 初期化は既に完了しています');
        return;
      }

      try {
        // 初期化中フラグを設定
        setIsInitializing(true);
        console.log('GameScreen: 初期化プロセス開始');

        // サウンドの読み込み (エラーがあっても続行)
        try {
          if (soundService && typeof soundService.loadSounds === 'function') {
            console.log('GameScreen: サウンド読み込み開始');
            await soundService.loadSounds();
            console.log('GameScreen: サウンド読み込み完了');
          }
        } catch (error: unknown) {
          console.error('GameScreen: サウンド読み込みエラー:', error);
        }

        // 音声サービスの初期化 (エラーがあっても続行)
        try {
          if (voiceService && typeof voiceService.ensureInitialized === 'function') {
            console.log('GameScreen: 音声サービス初期化開始');
            await voiceService.ensureInitialized();
            console.log('GameScreen: 音声サービス初期化完了');
          }
        } catch (error: unknown) {
          console.error('GameScreen: 音声サービス初期化エラー:', error);
        }

        if (!isMounted) {
          console.log('GameScreen: コンポーネントがアンマウントされたため初期化を中断');
          return;
        }

        console.log('GameScreen: 初期文字選択プロセス開始');
        // 初期文字を設定
        const initialChar = setupInitialCharacter();
        if (!initialChar) {
          throw new Error('初期文字の設定に失敗しました');
        }
        currentInitialChar = initialChar;
        console.log(`GameScreen: 初期文字セットアップ結果:「${currentInitialChar}」`);

        // 状態更新を同期的に行う
        await new Promise<void>((resolve) => {
          setCurrentCharacter(currentInitialChar);
          // 状態更新の反映を待つ
          setTimeout(() => {
            console.log(`GameScreen: 初期文字を設定:「${currentInitialChar}」`);
            resolve();
          }, 100);
        });

        // 状態が正しく設定されたか確認
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            if (currentCharacter !== currentInitialChar) {
              console.log(`GameScreen: 文字状態の不一致を検出。再設定を試みます。期待値:「${currentInitialChar}」現在値:「${currentCharacter}」`);
              setCurrentCharacter(currentInitialChar);
            }
            resolve();
          }, 200);
        });

        // 少し待ってから文字を読み上げ
        if (isMounted) {
          setTimeout(() => {
            if (isMounted && currentInitialChar && voiceService && typeof voiceService.speakText === 'function') {
              console.log(`GameScreen: 初期文字「${currentInitialChar}」を読み上げ`);
              try {
                voiceService.speakText(config.readings[currentInitialChar]);
              } catch (err: unknown) {
                console.error('GameScreen: 読み上げエラー:', err);
              }
            }
          }, 1000);
        }

        // 十分な遅延を入れて録音開始
        if (isMounted) {
          console.log('GameScreen: 3秒後に初期録音を開始します');
          recordTimer = setTimeout(() => {
            if (!isMounted) {
              console.log('GameScreen: コンポーネントがアンマウントされたため録音開始をスキップ');
              return;
            }

            // 初期化完了フラグを設定
            initialSetupComplete.current = true;
            initialSetupDone = true;
            setIsInitializing(false);
            console.log('GameScreen: 初期化完了、録音開始準備');

            // 画面描画を待つために少し遅延を入れる
            setTimeout(() => {
              if (!isMounted) return;
              console.log(`GameScreen: 録音開始確認 - 現在の文字:「${currentCharacter}」`);

              // 文字が設定されていない場合は初期文字を使用
              if (!currentCharacter && currentInitialChar) {
                console.log(`GameScreen: 文字が未設定のため初期文字を再設定:「${currentInitialChar}」`);
                setCurrentCharacter(currentInitialChar);
              }

              // 文字が設定されていることを確認してから録音開始
              if (currentCharacter || currentInitialChar) {
                handleStartListening();
              } else {
                console.error('GameScreen: 文字が設定できないため録音を開始できません');
                // エラー表示して戻る
                Alert.alert('エラー', '文字の設定に失敗しました。もう一度お試しください。', [{ text: 'OK', onPress: () => router.back() }]);
              }
            }, 500);
          }, 3000);
        }
      } catch (error: unknown) {
        console.error('GameScreen: 初期化プロセスエラー:', error);

        if (isMounted) {
          setIsInitializing(false);
          initialSetupDone = true;

          // エラー発生時は画面に表示
          Alert.alert('エラー', '初期化中にエラーが発生しました。もう一度お試しください。', [{ text: 'OK', onPress: () => router.back() }]);
        }
      }
    };

    // 初期化を開始
    startInitialization();

    // クリーンアップ関数を返す
    return () => {
      console.log('===== GameScreen: アンマウント - クリーンアップ実行 =====');
      isMounted = false;

      if (recordTimer) {
        clearTimeout(recordTimer);
      }

      // 録音状態とサウンドをクリーンアップ
      try {
        if (voiceService && typeof voiceService.cleanup === 'function') {
          voiceService
            .cleanup()
            .then(() => console.log('GameScreen: 音声認識クリーンアップ完了'))
            .catch((err: unknown) => console.error('GameScreen: クリーンアップエラー:', err));
        }
      } catch (err: unknown) {
        console.error('GameScreen: 音声認識クリーンアップ試行中にエラー:', err);
      }

      try {
        if (soundService && typeof soundService.unloadSounds === 'function') {
          soundService
            .unloadSounds()
            .then(() => console.log('GameScreen: サウンドクリーンアップ完了'))
            .catch((err: unknown) => console.error('GameScreen: サウンドアンロードエラー:', err));
        }
      } catch (err: unknown) {
        console.error('GameScreen: サウンドアンロード試行中にエラー:', err);
      }
    };
  }, []);

  // 文字選択関数を修正して選択中重複を防止
  const selectNewCharacter = () => {
    // 初期化中やアニメーション中なら選択をスキップ
    if (isInitializing || isAnimating || showLevelUp) {
      console.log('GameScreen: 処理中または表示中のため新文字選択をスキップします', {
        初期化中: isInitializing,
        アニメーション中: isAnimating,
        レベルアップ表示中: showLevelUp,
      });
      return;
    }

    console.log('GameScreen: 新しい文字を選択開始');

    // 利用可能な文字から選択
    const availableChars = getAvailableCharacters();
    if (availableChars.length === 0) {
      console.log('GameScreen: 利用可能な文字がありません');

      // 全ての文字をクリアした場合
      Alert.alert('おめでとう！', 'このステージの全ての文字をマスターしました！', [
        {
          text: 'OK',
          onPress: () => {
            router.back();
          },
        },
      ]);
      return;
    }

    console.log(`GameScreen: 選択可能な文字数: ${availableChars.length}`);

    // 現在と同じ文字を避けて選択
    let newChar: string;
    const currentChar = currentCharacter;

    if (availableChars.length === 1) {
      // 1文字しかない場合はそれを選択
      newChar = availableChars[0];
      console.log(`GameScreen: 残り文字が1つだけなので「${newChar}」を選択します`);
    } else {
      // 現在の文字を除外したリストを作成
      const filteredChars = availableChars.filter((char) => char !== currentChar);

      if (filteredChars.length > 0) {
        // 現在と異なる文字から選択
        const randomIndex = Math.floor(Math.random() * filteredChars.length);
        newChar = filteredChars[randomIndex];
        console.log(`GameScreen: 候補文字[${randomIndex}]:「${newChar}」 (現在:「${currentChar}」)`);
      } else {
        // 万が一、フィルタリング後に文字がない場合（通常は起きない）
        newChar = availableChars[0];
        console.log(`GameScreen: フィルタリング後に文字がないため、最初の文字「${newChar}」を選択します`);
      }
    }

    console.log(`GameScreen: 選択された文字:「${newChar}」 読み方:「${config.readings[newChar]}」`);

    // 状態更新
    setCurrentCharacter(newChar);

    // 読み上げは少し遅延させる
    setTimeout(() => {
      try {
        console.log(`GameScreen: 文字状態更新確認 - 現在:「${currentCharacter}」 選択:「${newChar}」`);

        // 文字が更新されていない場合の対応
        if (currentCharacter !== newChar) {
          console.log(`GameScreen: 状態更新が反映されていないため再設定します:「${newChar}」`);
          setCurrentCharacter(newChar);
        }

        // 読み上げ処理
        if (voiceService && config.readings[newChar]) {
          console.log(`GameScreen: 新しい文字「${newChar}」の読み上げ:「${config.readings[newChar]}」`);
          voiceService.speakText(config.readings[newChar]);
        }
      } catch (error) {
        console.error('GameScreen: 文字読み上げエラー', error);
      }
    }, 300);

    return newChar;
  };

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
    onCharacterComplete(character, isCorrect, responseTime);
    if (isCorrect) {
      const collectedCount = progress.collectedMojitama.length + 1;
      checkLevelUp(collectedCount);
    }
  };

  // レベルアップアニメーション完了時の処理
  const handleLevelUpComplete = () => {
    setShowLevelUp(false);
    selectNewCharacter();
  };

  // 手裏剣アニメーション
  const playShurikenAnimation = async (isCorrect: boolean) => {
    setIsAnimating(true);
    const responseTime = Date.now() - startTime.current;

    try {
      // 効果音の再生
      await soundService.playEffect('shuriken');
      setTimeout(async () => {
        await soundService.playEffect(isCorrect ? 'correct' : 'incorrect');
      }, 500);
    } catch (error) {
      console.error('GameScreen: 効果音再生エラー:', error);
      // 効果音エラーは無視して続行
    }

    // アニメーションシーケンスを実行
    Animated.sequence([
      Animated.parallel([
        Animated.timing(shurikenPosition.x, {
          toValue: SCREEN_WIDTH + 50,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(characterScale, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(characterScale, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      try {
        // キャラクターの処理を完了
        handleCharacterComplete(currentCharacter, isCorrect, responseTime);

        // アニメーション終了後の処理
        setTimeout(() => {
          // アニメーション状態をリセット
          setIsAnimating(false);
          shurikenPosition.setValue({ x: -50, y: SCREEN_WIDTH / 2 });

          // レベルアップ表示中でなければ次の文字を選択
          if (!showLevelUp) {
            console.log('GameScreen: 次の文字を選択します(アニメーション終了後)');

            // 文字選択処理
            selectNewCharacter();

            // 文字選択後、録音再開まで遅延
            setTimeout(() => {
              if (!showPause && !showLevelUp && !isAnimating) {
                handleStartListening();
              }
            }, 800);
          }
        }, 800); // アニメーション終了から次の文字選択までの遅延を短縮
      } catch (error) {
        console.error('GameScreen: アニメーション完了処理エラー:', error);

        // エラーがあっても状態をリセットして続行
        setIsAnimating(false);
        shurikenPosition.setValue({ x: -50, y: SCREEN_WIDTH / 2 });

        // エラー後のリカバリ処理
        if (!showLevelUp && !showPause) {
          selectNewCharacter();
          setTimeout(() => {
            if (!showPause && !showLevelUp && !isAnimating) {
              handleStartListening();
            }
          }, 1000);
        }
      }
    });
  };

  // 音声認識の初期化と録音開始処理の改善
  const handleStartListening = async () => {
    // 初期化中は録音を開始しない
    if (isInitializing || isAnimating || showPause || showLevelUp) {
      console.log('GameScreen: 処理中のため録音開始をスキップ:', {
        初期化中: isInitializing,
        アニメーション中: isAnimating,
        ポーズ中: showPause,
        レベルアップ表示中: showLevelUp,
      });
      return;
    }

    // 現在の文字が設定されていない場合は新しい文字を選択し、録音を遅延
    if (!currentCharacter || !config.readings[currentCharacter]) {
      console.log('GameScreen: 文字が未設定のため新しい文字を選択します');

      // 文字選択ロジックを実行
      selectNewCharacter();

      // 文字選択した後に少し遅延して再度録音開始を試みる
      setTimeout(() => {
        // 選択後も文字がない場合はエラー表示
        if (!currentCharacter) {
          console.error('GameScreen: 文字を選択できませんでした');
          Alert.alert('エラー', '文字を選択できませんでした。もう一度お試しください。');
          return;
        }

        // 選択できた場合は録音開始
        console.log(`GameScreen: 文字選択後の録音開始 - 文字:「${currentCharacter}」`);
        handleStartListening();
      }, 1000);

      return;
    }

    console.log(`GameScreen: 録音開始処理 - 文字:「${currentCharacter}」 読み方:「${config.readings[currentCharacter]}」`);
    try {
      // 既に録音中なら一旦停止して全てのリスナーをクリーンアップ
      if (isListening) {
        console.log('GameScreen: 既に録音中のため一旦クリーンアップします');
        try {
          setIsListening(false);
          await voiceService.stopListening();
          await voiceService.cleanup();

          // 処理が完了するまで少し待機
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error('GameScreen: 録音停止エラー:', error);
        }
      }

      // 念のため音声サービスの初期化を確認
      await voiceService.ensureInitialized();

      setIsListening(true);
      startTime.current = Date.now();

      // 音声認識の開始前にちょっと待機（状態更新の反映を待つ）
      await new Promise((resolve) => setTimeout(resolve, 300));

      await voiceService.startListening(
        // 音声認識成功時のコールバック
        (text) => {
          console.log('音声認識結果:', text);
          if (!text) {
            console.error('GameScreen: 音声認識の結果が空です');
            setIsListening(false);
            return;
          }
          setIsListening(false);

          // 現在の文字が有効かチェック
          if (!currentCharacter || !config.readings[currentCharacter]) {
            console.error('GameScreen: 文字または読み方が未設定です:', currentCharacter);
            return;
          }

          const expectedReading = config.readings[currentCharacter];
          const isCorrect = text.includes(expectedReading);

          console.log('音声認識結果判定:', {
            入力: text,
            期待値: expectedReading,
            正解: isCorrect,
          });

          if (isCorrect) {
            playShurikenAnimation(true);
          } else {
            Alert.alert('残念！', `正しい読み方は「${expectedReading}」です。\nもう一度挑戦してみましょう！`, [
              {
                text: 'OK',
                onPress: () => {
                  try {
                    voiceService.speakText(expectedReading);
                  } catch (e) {
                    console.error('GameScreen: 読み上げエラー:', e);
                  }
                  playShurikenAnimation(false);
                },
              },
            ]);
          }
        },
        // 音声認識エラー時のコールバック
        handleVoiceError,
        // タイムアウトを短めに設定
        { timeout: 8000 }
      );
    } catch (error) {
      console.error('GameScreen: 音声認識の開始エラー:', error);
      setIsListening(false);

      // エラー時は確実に音声サービスをクリーンアップ
      try {
        await voiceService.cleanup();
      } catch (e) {
        console.error('クリーンアップエラー:', e);
      }

      Alert.alert('エラー', '音声認識の開始に失敗しました');

      // エラー後のリトライを遅延して実行
      setTimeout(() => {
        if (!showPause && !isAnimating && !showLevelUp) {
          selectNewCharacter();

          // さらに遅延を入れてから録音再開
          setTimeout(() => {
            if (!showPause && !isAnimating && !showLevelUp) {
              handleStartListening();
            }
          }, 1000);
        }
      }, 1000);
    }
  };

  // 録音ボタンのタップ時の処理
  const handleStopRecording = async () => {
    if (!isListening) {
      console.log('GameScreen: 録音中ではないため処理をスキップします');
      return;
    }

    try {
      console.log('GameScreen: 録音停止処理開始');
      setIsListening(false);

      // 録音を停止
      if (voiceService) {
        await voiceService.stopListening();
        await voiceService.cleanup();
      }

      // 現在の文字の応答時間を記録
      const responseTime = Date.now() - startTime.current;

      console.log('GameScreen: ユーザーによる録音停止 - 手裏剣アニメーションを実行します');

      // 不正解として処理（ユーザーが自分で止めた場合）
      playShurikenAnimation(false);
    } catch (error) {
      console.error('GameScreen: 録音停止エラー:', error);

      // エラーハンドリングを追加
      try {
        // 確実にクリーンアップ
        await voiceService.cleanup();
      } catch (cleanupError) {
        console.error('GameScreen: クリーンアップエラー:', cleanupError);
      }

      // エラーがあっても次に進む
      playShurikenAnimation(false);
    }
  };

  // 音声認識エラー時のコールバック関数の修正
  const handleVoiceError = async (error: unknown) => {
    console.error('GameScreen: 音声認識エラー:', error);
    setIsListening(false);

    // タイムアウトの場合は特別な処理
    if (typeof error === 'string' && error.includes('タイムアウト')) {
      console.log('GameScreen: タイムアウトを検出: 次の文字へ進みます');

      // 念のため音声サービスをクリーンアップ
      try {
        await voiceService.cleanup();
      } catch (e) {
        console.error('GameScreen: クリーンアップエラー:', e);
      }

      // タイムアウト時は自動で次の文字へ
      playShurikenAnimation(false);
    } else {
      // その他のエラーはアラート表示
      Alert.alert('音声認識エラー', 'もう一度話してみましょう', [
        {
          text: 'OK',
          onPress: () => {
            setTimeout(() => {
              if (!showPause && !isAnimating && !showLevelUp) {
                handleStartListening();
              }
            }, 500);
          },
        },
      ]);
    }
  };

  // ポーズボタンのタップ時の処理
  const handlePause = () => {
    setShowPause(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    onPause();
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
            if (isListening) {
              setIsListening(false);
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
                  // 1分以上経過していれば記録
                  await progressService.updateProgress(userId, {
                    totalStudyMinutes: elapsedMinutes,
                    lastTrainingDate: new Date(),
                  });

                  console.log(`修行時間を記録: ${elapsedMinutes}分`);
                }

                // セッション状態をクリア
                await progressService.clearSessionState(userId);
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

  const speakText = (text: string) => {
    voiceService.speakText(text);
  };

  // 文字表示前にログを出力
  console.log(`GameScreen: 文字表示レンダリング - 現在の文字:「${currentCharacter}」 読み方:「${config.readings[currentCharacter] || '未設定'}」`);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ImageBackground source={config.backgroundImage} style={{ flex: 1 }} resizeMode='cover'>
        {/* プログレスバー */}
        <ProgressBar level={currentLevel} collectedCount={progress.collectedMojitama.length} totalRequired={config.characters.length} />

        {/* 残り時間表示 */}
        <View
          style={{
            position: 'absolute',
            top: 70,
            right: 20,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 15,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
            elevation: 3,
          }}>
          <MaterialCommunityIcons name='clock-outline' size={18} color='#41644A' />
          <Text
            style={{
              fontFamily: 'font-mplus-bold',
              fontSize: 16,
              color: '#41644A',
              marginLeft: 4,
            }}>
            {formatTime(remainingTime)}
          </Text>
        </View>

        {/* 長老 */}
        <Animated.Image
          source={require('../../assets/temp/elder-worried.png')}
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            width: 60,
            height: 60,
            transform: [{ translateY: elderPosition }],
          }}
        />

        {/* ポーズボタン */}
        <TouchableOpacity
          onPress={handlePause}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 40,
            height: 40,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Text style={{ fontSize: 24 }}>×</Text>
        </TouchableOpacity>

        {/* メインの文字表示 */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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
            {currentCharacter || '？'}
          </Animated.Text>
          <Text
            style={{
              fontFamily: 'font-mplus',
              fontSize: 24,
              color: '#666',
              marginTop: 10,
            }}>
            {currentCharacter ? config.readings[currentCharacter] : 'よみこみちゅう...'}
          </Text>
        </View>

        {/* 手裏剣 */}
        <Animated.Image
          source={require('../../assets/temp/shuriken.png')}
          style={{
            position: 'absolute',
            width: 60,
            height: 60,
            transform: [{ translateX: shurikenPosition.x }, { translateY: shurikenPosition.y }, { rotate: '45deg' }],
          }}
        />

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
            onPress={handleStopRecording}
            disabled={isAnimating || showPause}
            style={{
              width: 80,
              height: 80,
              backgroundColor: isAnimating || showPause ? '#999' : '#E86A33',
              borderRadius: 40,
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

        {/* ポーズ画面 */}
        {showPause && <PauseScreen onResume={handleResume} onQuit={handleQuit} />}

        {/* レベルアップアニメーション */}
        {showLevelUp && <LevelUpAnimation level={currentLevel} onComplete={handleLevelUpComplete} />}
      </ImageBackground>
    </SafeAreaView>
  );
}

export default GameScreen;
