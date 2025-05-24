import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, SafeAreaView, Image, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TestScreenProps {
  currentYoon: string;
  remainingYoon: string[];
  isRecording: boolean;
  isPaused: boolean;
  isProcessingAI: boolean;
  isTransitioning: boolean;
  isAIReady: boolean;
  showEncouragement: boolean;
  currentEncouragementCount: number;
  showCharacter: boolean;
  results: any[];
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRecordingComplete: () => void;
  onEncouragementContinue: () => void;
}

export default function TestScreen({
  currentYoon,
  remainingYoon,
  isRecording,
  isPaused,
  isProcessingAI,
  isTransitioning,
  isAIReady,
  showEncouragement,
  currentEncouragementCount,
  showCharacter,
  results,
  onPause,
  onResume,
  onStop,
  onRecordingComplete,
  onEncouragementContinue,
}: TestScreenProps) {
  const encouragementAnim = useRef(new Animated.Value(0)).current;
  const loadingAnim = useRef(new Animated.Value(0)).current;

  // ローディングアニメーション
  useEffect(() => {
    if (isProcessingAI || isTransitioning) {
      Animated.loop(
        Animated.timing(loadingAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      loadingAnim.setValue(0);
    }
  }, [isProcessingAI, isTransitioning]);

  useEffect(() => {
    if (showEncouragement) {
      Animated.timing(encouragementAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      encouragementAnim.setValue(0);
    }
  }, [showEncouragement]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* 上部のヘッダー - ポケモンスマイル風 */}
          <View style={styles.header}>
            {/* プログレスバー */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${((33 - remainingYoon.length) / 32) * 100}%` }]} />
                {/* 村長アイコン */}
                <Animated.View
                  style={[
                    styles.elderIconContainer,
                    {
                      left: `${((33 - remainingYoon.length) / 33) * 100}%`,
                      transform: [
                        {
                          translateX: remainingYoon.length === 0 ? -60 : 0,
                        },
                      ],
                    },
                  ]}>
                  <Image source={require('@assets/temp/elder-worried.png')} style={styles.elderIcon} />
                </Animated.View>
              </View>
              <Text style={styles.progressLabel}>{33 - remainingYoon.length} / 33</Text>
            </View>

            {/* 一時停止ボタン */}
            <TouchableOpacity onPress={onPause} style={styles.pauseButton}>
              <MaterialCommunityIcons name='pause' size={26} color='#FF69B4' />
            </TouchableOpacity>
          </View>

          {/* 一時停止中の表示 - ポケモンスマイル風 */}
          {isPaused && (
            <View style={styles.pauseOverlay}>
              <View style={styles.pauseModal}>
                <Text style={styles.pauseTitle}>ポーズちゅう</Text>

                <View style={styles.pauseButtons}>
                  <TouchableOpacity onPress={onResume} style={[styles.actionButton, styles.resumeButton, { marginBottom: 20 }]}>
                    <MaterialCommunityIcons name='play' size={30} color='#FFF' />
                    <Text style={[styles.actionButtonText, { marginLeft: 10 }]}>つづける</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={onStop} style={[styles.actionButton, styles.stopButton]}>
                    <MaterialCommunityIcons name='stop' size={30} color='#FFF' />
                    <Text style={[styles.actionButtonText, { marginLeft: 10 }]}>やめる</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* 励ましポップオーバー - ポケモンスマイル風 */}
          {showEncouragement && (
            <View style={styles.encouragementOverlay}>
              {/* 背景の装飾 */}
              {[...Array(8)].map((_, i) => (
                <Animated.Text
                  key={i}
                  style={[
                    styles.decorationEmoji,
                    {
                      transform: [
                        { translateX: Math.cos((i * Math.PI) / 4) * 150 },
                        { translateY: Math.sin((i * Math.PI) / 4) * 150 },
                        {
                          scale: encouragementAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.5, 1.2],
                          }),
                        },
                        {
                          rotate: encouragementAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          }),
                        },
                      ],
                      opacity: encouragementAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 0.6],
                      }),
                    },
                  ]}>
                  {['⭐', '🌟', '✨', '💫', '🎉', '🎊', '🏆', '💪'][i]}
                </Animated.Text>
              ))}

              <Animated.View
                style={[
                  styles.encouragementModal,
                  {
                    transform: [
                      {
                        scale: encouragementAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.3, 1.1, 1],
                        }),
                      },
                    ],
                    opacity: encouragementAnim.interpolate({
                      inputRange: [0, 0.3, 1],
                      outputRange: [0, 1, 1],
                    }),
                  },
                ]}>
                {/* カラフルな背景 */}
                <View style={[styles.encouragementBg1]} />
                <View style={[styles.encouragementBg2]} />

                {/* メインコンテンツ */}
                <View style={styles.encouragementContent}>
                  {/* キャラクター */}
                  <Animated.View
                    style={{
                      transform: [
                        {
                          scale: encouragementAnim.interpolate({
                            inputRange: [0, 0.5, 0.7, 1],
                            outputRange: [0.8, 1.2, 0.9, 1],
                          }),
                        },
                      ],
                    }}>
                    <Image source={require('@assets/temp/ninja_syuriken_man.png')} style={styles.encouragementCharacter} />
                  </Animated.View>

                  {/* 大きなタイトル */}
                  <Animated.Text
                    style={[
                      styles.encouragementTitle,
                      {
                        transform: [
                          {
                            scale: encouragementAnim.interpolate({
                              inputRange: [0, 0.6, 0.8, 1],
                              outputRange: [0.5, 1.3, 0.95, 1],
                            }),
                          },
                        ],
                      },
                    ]}>
                    {currentEncouragementCount === 11 ? 'すごーい！' : 'やったね！'}
                  </Animated.Text>

                  {/* 星の装飾 */}
                  <View style={styles.starDecoration}>
                    {[...Array(5)].map((_, i) => (
                      <Animated.Text
                        key={i}
                        style={[
                          styles.star,
                          {
                            transform: [
                              {
                                scale: encouragementAnim.interpolate({
                                  inputRange: [0, 0.2 + i * 0.1, 1],
                                  outputRange: [0, 1.5, 1],
                                }),
                              },
                              {
                                rotate: encouragementAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [`${i * 72}deg`, `${i * 72 + 360}deg`],
                                }),
                              },
                            ],
                          },
                        ]}>
                        ⭐
                      </Animated.Text>
                    ))}
                  </View>

                  {/* メッセージ */}
                  <Text style={styles.encouragementMessage}>
                    {currentEncouragementCount === 11
                      ? `${currentEncouragementCount}もんも できたよ！\nがんばって！`
                      : `${currentEncouragementCount}もんも できたよ！\nあと すこしだよ！`}
                  </Text>

                  {/* ボタン */}
                  <TouchableOpacity onPress={onEncouragementContinue} style={styles.encouragementButton}>
                    <Text style={styles.encouragementButtonText}>つぎへ すすむ！</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          )}

          {/* メインコンテンツエリア */}
          <View style={styles.mainContent}>
            {/* 文字表示カード - ポケモンスマイル風 */}
            <View style={[styles.characterCard, { minWidth: 250 }]}>
              {showCharacter && isRecording ? (
                <Text style={[styles.characterText]} adjustsFontSizeToFit={false} numberOfLines={1}>
                  {currentYoon}
                </Text>
              ) : (
                <View style={styles.waitingContainer}>
                  <MaterialCommunityIcons name={isProcessingAI ? 'brain' : isTransitioning ? 'timer-sand' : 'eye-off'} size={60} color='#FFB6C1' />
                  <Text style={styles.waitingText}>{isProcessingAI ? 'かんがえちゅう...' : isTransitioning ? 'じゅんびちゅう...' : 'まってね'}</Text>
                </View>
              )}
            </View>
          </View>

          {/* 録音ボタンエリア - ポケモンスマイル風 */}
          <View style={styles.recordingArea}>
            {/* 録音ボタン */}
            <TouchableOpacity
              onPress={onRecordingComplete}
              disabled={isProcessingAI || isTransitioning || showEncouragement}
              style={[
                styles.recordButton,
                {
                  backgroundColor: isProcessingAI || isTransitioning || showEncouragement ? '#CCCCCC' : isRecording ? '#FF6B6B' : '#4CAF50',
                  borderColor: isProcessingAI || isTransitioning || showEncouragement ? '#AAAAAA' : isRecording ? '#FF5252' : '#45A049',
                },
              ]}>
              {isProcessingAI || isTransitioning ? (
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: loadingAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  }}>
                  <MaterialCommunityIcons name='loading' size={70} color='#FFF' />
                </Animated.View>
              ) : isRecording && showCharacter ? (
                <MaterialCommunityIcons name='stop' size={70} color='#FFF' />
              ) : (
                <MaterialCommunityIcons name='microphone' size={70} color='#FFF' />
              )}
            </TouchableOpacity>

            {/* ボタンの説明テキスト */}
            <View style={styles.buttonLabel}>
              <Text style={styles.buttonLabelText}>
                {showEncouragement
                  ? ''
                  : isProcessingAI
                  ? 'しょりちゅう...'
                  : isTransitioning
                  ? 'じゅんびちゅう...'
                  : isRecording
                  ? 'よみおわったら タップ'
                  : 'マイクを タップ'}
              </Text>
            </View>

            {/* AI状態表示 */}
            {isAIReady && (
              <View style={styles.aiStatus}>
                <View style={styles.aiStatusDot} />
                <Text style={styles.aiStatusText}>AI じゅんびOK</Text>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 10,
    marginBottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 60,
  },
  progressContainer: {
    flex: 1,
    marginRight: 15,
    justifyContent: 'center',
  },
  progressBarBackground: {
    height: 30,
    marginTop: 90,
    backgroundColor: '#FFF',
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#FFB6C1',
    overflow: 'visible',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFB6C1',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  elderIconContainer: {
    position: 'absolute',
    top: '50%',
    width: 60,
    height: 60,
    marginLeft: 0,
    marginTop: -30,
    backgroundColor: '#FFF',
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#FFB6C1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  elderIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  progressLabel: {
    marginTop: 20,
    textAlign: 'center',
    fontFamily: 'font-mplus-bold',
    fontSize: 14,
    color: '#FF69B4',
  },
  pauseButton: {
    backgroundColor: '#FFF',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFB6C1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  pauseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  pauseModal: {
    backgroundColor: '#FFF',
    padding: 40,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#FFB6C1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  pauseTitle: {
    fontFamily: 'font-mplus-bold',
    fontSize: 36,
    color: '#FF69B4',
    marginBottom: 30,
    textAlign: 'center',
  },
  pauseButtons: {
    // gap removed for compatibility
  },
  actionButton: {
    paddingHorizontal: 50,
    paddingVertical: 20,
    borderRadius: 30,
    borderWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  resumeButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#45A049',
  },
  stopButton: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF5252',
  },
  actionButtonText: {
    color: '#FFF',
    fontFamily: 'font-mplus-bold',
    fontSize: 24,
  },
  encouragementOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 999,
  },
  decorationEmoji: {
    position: 'absolute',
    fontSize: 40,
  },
  encouragementModal: {
    width: 350,
  },
  encouragementBg1: {
    position: 'absolute',
    width: '110%',
    height: '110%',
    borderRadius: 30,
    backgroundColor: '#FFE500',
    top: -15,
    left: -15,
    transform: [{ rotate: '3deg' }],
  },
  encouragementBg2: {
    position: 'absolute',
    width: '105%',
    height: '105%',
    borderRadius: 30,
    backgroundColor: '#FF6B6B',
    top: -10,
    left: -10,
    transform: [{ rotate: '-2deg' }],
  },
  encouragementContent: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  encouragementCharacter: {
    width: 150,
    height: 150,
    marginBottom: 15,
  },
  encouragementTitle: {
    fontSize: 42,
    fontFamily: 'Zen-B',
    color: '#FF6B6B',
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: '#FFE500',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 5,
  },
  starDecoration: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  star: {
    fontSize: 25,
    marginHorizontal: 3,
  },
  encouragementMessage: {
    fontSize: 24,
    fontFamily: 'Zen-B',
    color: '#333',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 36,
  },
  encouragementButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: '#FFE500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    transform: [{ scale: 1.1 }],
  },
  encouragementButtonText: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'Zen-B',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  characterCard: {
    backgroundColor: '#FFF',
    borderRadius: 30,
    paddingHorizontal: 50,
    paddingVertical: 40,
    borderWidth: 5,
    borderColor: '#FFB6C1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  decorativeStar: {
    position: 'absolute',
  },
  decorativeStarText: {
    fontSize: 30,
  },
  characterText: {
    fontFamily: 'font-mplus-bold',
    fontSize: 80,
    color: '#FF69B4',
    textShadowColor: 'rgba(255, 182, 193, 0.5)',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 5,
    textAlign: 'center',
    minWidth: 200,
    paddingHorizontal: 20,
  },
  waitingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: {
    marginTop: 10,
    fontFamily: 'font-mplus-bold',
    fontSize: 18,
    color: '#FFB6C1',
  },
  recordingArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  recordButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  buttonLabel: {
    marginTop: 15,
    backgroundColor: '#FFF',
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFB6C1',
  },
  buttonLabelText: {
    fontFamily: 'font-mplus-bold',
    fontSize: 18,
    color: '#FF69B4',
    textAlign: 'center',
  },
  aiStatus: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    marginRight: 5,
  },
  aiStatusText: {
    fontFamily: 'font-mplus',
    fontSize: 14,
    color: '#666',
  },
});
