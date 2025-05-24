import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { StageProgress, StageConfig } from '../../types/progress';
import voiceService from '../../services/voiceService';
import soundService from '../../services/soundService';
import { PauseScreen } from '../ui/PauseScreen';
import { LevelUpAnimation } from './LevelUpAnimation';
import ProgressBar from '../ui/ProgressBar';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface GameScreenProps {
  config: StageConfig;
  progress: StageProgress;
  onPause: () => void;
  onCharacterComplete: (character: string, isCorrect: boolean, responseTime: number) => void;
}

export function ImprovedGameScreen({ config, progress, onPause, onCharacterComplete }: GameScreenProps) {
  const router = useRouter();
  
  // 状態管理
  const [currentCharacter, setCurrentCharacter] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [showPause, setShowPause] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showResult, setShowResult] = useState<'correct' | 'incorrect' | null>(null);
  
  // アニメーション
  const characterScale = useRef(new Animated.Value(0)).current;
  const buttonPulse = useRef(new Animated.Value(1)).current;
  const resultScale = useRef(new Animated.Value(0)).current;
  const microphoneScale = useRef(new Animated.Value(1)).current;
  
  // 録音関連
  const recording = useRef<Audio.Recording | null>(null);
  const startTime = useRef<number | null>(null);
  
  useEffect(() => {
    // 初回起動時のチュートリアル表示
    checkFirstPlay();
    selectNewCharacter();
    startCharacterAnimation();
  }, []);
  
  // 初回プレイチェック
  const checkFirstPlay = async () => {
    // ここで AsyncStorage などから初回プレイかどうかをチェック
    // const isFirstPlay = await AsyncStorage.getItem('game_tutorial_shown');
    // if (!isFirstPlay) {
    //   setShowTutorial(true);
    //   await AsyncStorage.setItem('game_tutorial_shown', 'true');
    // }
  };
  
  // 文字のアニメーション
  const startCharacterAnimation = () => {
    Animated.spring(characterScale, {
      toValue: 1,
      tension: 10,
      friction: 2,
      useNativeDriver: true,
    }).start();
  };
  
  // 新しい文字を選択
  const selectNewCharacter = () => {
    const availableChars = config.characters.filter(
      char => !progress.collectedMojitama.includes(char)
    );
    
    if (availableChars.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableChars.length);
      setCurrentCharacter(availableChars[randomIndex]);
      
      // 文字が変わったらアニメーション
      characterScale.setValue(0);
      startCharacterAnimation();
    }
  };
  
  // 録音開始
  const startRecording = async () => {
    try {
      setIsListening(true);
      
      // マイクアイコンのアニメーション
      Animated.loop(
        Animated.sequence([
          Animated.timing(microphoneScale, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(microphoneScale, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // 録音開始
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recording.current = newRecording;
      startTime.current = Date.now();
      
      // 振動フィードバック
      // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
    } catch (error) {
      console.error('録音開始エラー:', error);
      setIsListening(false);
    }
  };
  
  // 録音停止と判定
  const stopRecording = async () => {
    if (!recording.current || !isListening) return;
    
    try {
      setIsListening(false);
      setIsProcessing(true);
      
      // アニメーション停止
      microphoneScale.stopAnimation();
      microphoneScale.setValue(1);
      
      // 録音停止
      await recording.current.stopAndUnloadAsync();
      const recordingUri = recording.current.getURI();
      recording.current = null;
      
      // 判定処理（仮）
      const isCorrect = Math.random() > 0.3; // 70%の確率で正解
      
      // 結果表示
      showResultAnimation(isCorrect);
      
      // 効果音
      await soundService.playEffect(isCorrect ? 'correct' : 'incorrect');
      
      // 正しい発音を再生
      setTimeout(async () => {
        if (currentCharacter && config.readings[currentCharacter]) {
          await voiceService.speakText(config.readings[currentCharacter]);
        }
      }, 1000);
      
      // 進捗更新
      const responseTime = startTime.current ? Date.now() - startTime.current : 0;
      onCharacterComplete(currentCharacter, isCorrect, responseTime);
      
      // 次の文字へ
      setTimeout(() => {
        setShowResult(null);
        selectNewCharacter();
        setIsProcessing(false);
      }, 2500);
      
    } catch (error) {
      console.error('録音停止エラー:', error);
      setIsProcessing(false);
    }
  };
  
  // 結果表示アニメーション
  const showResultAnimation = (isCorrect: boolean) => {
    setShowResult(isCorrect ? 'correct' : 'incorrect');
    
    Animated.spring(resultScale, {
      toValue: 1,
      tension: 50,
      friction: 3,
      useNativeDriver: true,
    }).start();
    
    setTimeout(() => {
      Animated.timing(resultScale, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 2000);
  };
  
  // ポーズ処理
  const handlePause = () => {
    setShowPause(true);
    onPause();
  };
  
  const handleResume = () => {
    setShowPause(false);
  };
  
  const handleQuit = () => {
    router.back();
  };
  
  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePause} style={styles.pauseButton}>
          <MaterialCommunityIcons name="pause" size={28} color="#FFF" />
        </TouchableOpacity>
        
        <View style={styles.timerContainer}>
          <MaterialCommunityIcons name="clock-outline" size={20} color="#FFF" />
          <Text style={styles.timerText}>5:00</Text>
        </View>
      </View>
      
      {/* プログレスバー */}
      <ProgressBar
        level={currentLevel}
        collectedCount={progress.collectedMojitama.length}
        totalRequired={config.characters.length}
        value={(progress.collectedMojitama.length % 10) / 10}
      />
      
      {/* メインコンテンツ */}
      <View style={styles.mainContent}>
        {/* 文字表示エリア */}
        <View style={styles.characterContainer}>
          <Animated.View
            style={[
              styles.characterCard,
              {
                transform: [{ scale: characterScale }],
              },
            ]}
          >
            <Text style={styles.characterText}>
              {currentCharacter}
            </Text>
            
            {/* 結果表示 */}
            {showResult && (
              <Animated.View
                style={[
                  styles.resultOverlay,
                  {
                    transform: [{ scale: resultScale }],
                  },
                ]}
              >
                {showResult === 'correct' ? (
                  <View style={styles.correctResult}>
                    <MaterialCommunityIcons name="check-circle" size={80} color="#4CAF50" />
                    <Text style={styles.resultText}>せいかい！</Text>
                  </View>
                ) : (
                  <View style={styles.incorrectResult}>
                    <MaterialCommunityIcons name="close-circle" size={80} color="#FF5252" />
                    <Text style={styles.resultText}>もういちど！</Text>
                  </View>
                )}
              </Animated.View>
            )}
          </Animated.View>
          
          {/* ヒント */}
          <TouchableOpacity style={styles.hintButton}>
            <MaterialCommunityIcons name="lightbulb-outline" size={24} color="#666" />
            <Text style={styles.hintText}>ヒント</Text>
          </TouchableOpacity>
        </View>
        
        {/* 録音ボタン */}
        <View style={styles.recordingSection}>
          <TouchableOpacity
            onPress={isListening ? stopRecording : startRecording}
            disabled={isProcessing}
            style={[
              styles.recordButton,
              isListening && styles.recordButtonActive,
              isProcessing && styles.recordButtonDisabled,
            ]}
          >
            <Animated.View
              style={{
                transform: [{ scale: microphoneScale }],
              }}
            >
              {isProcessing ? (
                <ActivityIndicator size="large" color="#FFF" />
              ) : (
                <MaterialCommunityIcons
                  name={isListening ? "stop" : "microphone"}
                  size={48}
                  color="#FFF"
                />
              )}
            </Animated.View>
          </TouchableOpacity>
          
          <Text style={styles.instructionText}>
            {isProcessing ? 'はんていちゅう...' : 
             isListening ? 'よみおわったら とめる' : 
             'ボタンをおして よんでみよう'}
          </Text>
        </View>
        
        {/* キャラクター */}
        <Image
          source={require('../../../assets/ninja/beginner/normal.png')}
          style={styles.ninjaCharacter}
        />
      </View>
      
      {/* ポーズ画面 */}
      {showPause && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showPause}
        >
          <PauseScreen
            onResume={handleResume}
            onQuit={handleQuit}
          />
        </Modal>
      )}
      
      {/* レベルアップ */}
      {showLevelUp && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showLevelUp}
        >
          <LevelUpAnimation
            level={currentLevel}
            onComplete={() => setShowLevelUp(false)}
          />
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  pauseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  timerText: {
    fontFamily: 'font-mplus-bold',
    fontSize: 16,
    color: '#FFF',
    marginLeft: 4,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  characterContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  characterCard: {
    width: 250,
    height: 250,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  characterText: {
    fontFamily: 'font-mplus-bold',
    fontSize: 120,
    color: '#333',
  },
  resultOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 30,
  },
  correctResult: {
    alignItems: 'center',
  },
  incorrectResult: {
    alignItems: 'center',
  },
  resultText: {
    fontFamily: 'font-mplus-bold',
    fontSize: 24,
    marginTop: 10,
    color: '#333',
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
  },
  hintText: {
    fontFamily: 'font-mplus',
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  recordingSection: {
    alignItems: 'center',
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  recordButtonActive: {
    backgroundColor: '#F44336',
  },
  recordButtonDisabled: {
    backgroundColor: '#CCC',
  },
  instructionText: {
    fontFamily: 'font-mplus',
    fontSize: 18,
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  ninjaCharacter: {
    width: 80,
    height: 80,
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
});