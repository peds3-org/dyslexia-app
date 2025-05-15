import React, { memo, useMemo } from 'react';
import { Image, ImageSourcePropType, View, StyleSheet, Animated, ViewStyle } from 'react-native';

// 感情タイプの定義
export type EmotionType = 'happy' | 'sad' | 'excited' | 'tired' | 'determined' | 'normal';

// ポーズタイプの定義
export type PoseType = 'idle' | 'attack' | 'jump' | 'run' | 'victory' | 'defeat';

// 各表情の画像マッピング（実際のアセットに合わせて調整が必要）
const EMOTION_IMAGES: Record<EmotionType, ImageSourcePropType> = {
  happy: require('../../../assets/temp/ninja_syuriken_man.png'),
  sad: require('../../../assets/temp/ninja_syuriken_man.png'),
  excited: require('../../../assets/temp/ninja_syuriken_man.png'),
  tired: require('../../../assets/temp/ninja_syuriken_man.png'),
  determined: require('../../../assets/temp/ninja_syuriken_man.png'),
  normal: require('../../../assets/temp/ninja_syuriken_man.png'),
};

// 各ポーズの画像マッピング（実際のアセットに合わせて調整が必要）
const POSE_IMAGES: Record<PoseType, ImageSourcePropType> = {
  idle: require('../../../assets/temp/ninja_syuriken_man.png'),
  attack: require('../../../assets/temp/ninja_syuriken_man.png'),
  jump: require('../../../assets/temp/ninja_syuriken_man.png'),
  run: require('../../../assets/temp/ninja_syuriken_man.png'),
  victory: require('../../../assets/temp/ninja_syuriken_man.png'),
  defeat: require('../../../assets/temp/ninja_syuriken_man.png'),
};

// レベルに応じた忍者の画像マッピング
const LEVEL_IMAGES: Record<string, ImageSourcePropType> = {
  beginner: require('../../../assets/temp/ninja_syuriken_man.png'),
  intermediate: require('../../../assets/temp/ninja_syuriken_man.png'),
  advanced: require('../../../assets/temp/ninja_syuriken_man.png'),
};

interface NinjaCharacterProps {
  emotion?: EmotionType;
  pose?: PoseType;
  level?: 'beginner' | 'intermediate' | 'advanced';
  size?: number;
  style?: ViewStyle;
  animatedValue?: Animated.Value;
  animationType?: 'bounce' | 'scale' | 'rotate' | 'none';
}

const NinjaCharacter: React.FC<NinjaCharacterProps> = ({
  emotion = 'normal',
  pose = 'idle',
  level = 'beginner',
  size = 100,
  style,
  animatedValue,
  animationType = 'none',
}) => {
  // 現在の表示画像を決定
  const currentImage = useMemo(() => {
    // 感情優先で表示
    if (emotion !== 'normal') {
      // 画像ファイルが存在する場合は感情別の画像を使用
      try {
        return EMOTION_IMAGES[emotion];
      } catch (error) {
        console.log(`感情画像が見つかりません: ${emotion}、代替としてポーズを使用します`);
      }
    }

    // ポーズ画像を使用
    try {
      return POSE_IMAGES[pose];
    } catch (error) {
      console.log(`ポーズ画像が見つかりません: ${pose}、デフォルト画像を使用します`);
      return LEVEL_IMAGES[level];
    }
  }, [emotion, pose, level]);

  // アニメーションスタイルを計算
  const animationStyle = useMemo(() => {
    if (!animatedValue) return {};

    switch (animationType) {
      case 'bounce':
        return {
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, -10, 0],
              }),
            },
          ],
        };
      case 'scale':
        return {
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [1, 1.2, 1],
              }),
            },
          ],
        };
      case 'rotate':
        return {
          transform: [
            {
              rotate: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              }),
            },
          ],
        };
      default:
        return {};
    }
  }, [animatedValue, animationType]);

  const imageComponent = (
    <Image
      source={currentImage}
      style={{
        width: size,
        height: size,
        resizeMode: 'contain',
      }}
    />
  );

  // アニメーション値が提供されている場合はAnimated.Viewでラップ
  if (animatedValue) {
    return <Animated.View style={[{ width: size, height: size }, animationStyle, style]}>{imageComponent}</Animated.View>;
  }

  // 通常表示
  return <View style={[{ width: size, height: size }, style]}>{imageComponent}</View>;
};

export default memo(NinjaCharacter);
