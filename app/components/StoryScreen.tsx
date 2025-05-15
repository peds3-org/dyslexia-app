import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ImageBackground, ScrollView, SafeAreaView, TouchableOpacity, Animated, Image, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * ストーリー画面のプロパティ
 */
type StoryScreenProps = {
  backgroundImage: any; // 背景画像
  title: string; // タイトル
  text: string; // 物語テキスト
  buttonText: string; // ボタンのテキスト
  onStart: () => void; // 開始ボタンが押されたときのコールバック
  fadeAnim: Animated.Value; // フェードアニメーション値
  elderImage: any; // 長老キャラクター画像
};

/**
 * ストーリー画面コンポーネント
 * 物語の表示と長老キャラクターのアニメーションを担当
 */
export function StoryScreen({ backgroundImage, title, text, buttonText, onStart, fadeAnim, elderImage }: StoryScreenProps) {
  // アニメーション用の値
  const elderFloatAnim = useRef(new Animated.Value(0)).current; // 長老の浮遊アニメーション
  const speakingAnim = useRef(new Animated.Value(1)).current; // 長老の会話アニメーション

  /**
   * アニメーションの設定
   * コンポーネントのマウント時に一度だけ実行
   */
  useEffect(() => {
    // 長老のふわふわアニメーション
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(elderFloatAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(elderFloatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    // 喋るアニメーション
    const speakAnimation = Animated.loop(
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
    );

    // アニメーションを開始
    floatAnimation.start();
    speakAnimation.start();

    // クリーンアップ関数 - コンポーネントのアンマウント時に実行
    return () => {
      floatAnimation.stop();
      speakAnimation.stop();
    };
  }, []);

  /**
   * 長老のアニメーションスタイル
   * パフォーマンス最適化のためuseMemoを使用
   */
  const elderAnimatedStyle = useMemo(
    () => ({
      width: 180,
      height: 180,
      transform: [
        {
          translateY: elderFloatAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -10],
          }),
        },
        { scale: speakingAnim },
      ],
    }),
    [elderFloatAnim, speakingAnim]
  );

  /**
   * 開始ボタンのハンドラ
   * パフォーマンス最適化のためuseCallbackを使用
   */
  const handleOnStart = useCallback(() => {
    onStart();
  }, [onStart]);

  // コンポーネントのレンダリング
  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground source={backgroundImage} style={styles.background} resizeMode='cover'>
        <View style={styles.content}>
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* 長老のキャラクター */}
            <View style={styles.elderContainer}>
              <Animated.Image source={elderImage} style={elderAnimatedStyle} />
            </View>

            {/* 物語の吹き出し */}
            <View style={styles.bubble}>
              {/* 吹き出しの三角形 */}
              <View style={styles.triangle} />

              {/* タイトル */}
              <Text style={styles.title}>{title}</Text>

              {/* 物語テキスト */}
              <Text style={styles.description}>{text}</Text>

              {/* 開始ボタン */}
              <TouchableOpacity onPress={handleOnStart} style={styles.button}>
                <MaterialCommunityIcons name='sword' size={24} color='#FFF' />
                <Text style={styles.buttonText}>{buttonText}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

/**
 * スタイル定義
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  elderContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  bubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 30,
    marginHorizontal: 10,
    marginBottom: 20,
    position: 'relative',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  triangle: {
    position: 'absolute',
    top: -20,
    left: '50%',
    marginLeft: -10,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(255, 255, 255, 0.95)',
  },
  title: {
    fontFamily: 'font-mplus-bold',
    fontSize: 24,
    color: '#41644A',
    marginBottom: 15,
    textAlign: 'center',
  },
  description: {
    fontFamily: 'font-mplus',
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#41644A',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#FFF',
    fontFamily: 'font-mplus-bold',
    fontSize: 18,
  },
});

export default StoryScreen;
