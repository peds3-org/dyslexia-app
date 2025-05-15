import React, { memo } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type ControlButtonState = 'ready' | 'recording' | 'processing' | 'judging' | 'disabled';

interface GameControlButtonProps {
  state: ControlButtonState;
  onPress: () => void;
  size?: number;
  style?: ViewStyle;
  pulseAnim?: Animated.Value;
}

const GameControlButton: React.FC<GameControlButtonProps> = ({ state = 'ready', onPress, size = 80, style, pulseAnim }) => {
  // 状態に応じた構成を取得
  const getConfig = () => {
    switch (state) {
      case 'ready':
        return {
          mainColor: '#4CAF50',
          icon: 'microphone',
          label: 'はなす',
          iconSize: size * 0.5,
        };
      case 'recording':
        return {
          mainColor: '#F44336',
          icon: 'stop',
          label: 'とめる',
          iconSize: size * 0.5,
        };
      case 'processing':
        return {
          mainColor: '#FFC107',
          icon: 'progress-clock',
          label: 'しょり中...',
          iconSize: size * 0.5,
        };
      case 'judging':
        return {
          mainColor: '#2196F3',
          icon: 'check-decagram',
          label: 'はんてい中...',
          iconSize: size * 0.5,
        };
      case 'disabled':
        return {
          mainColor: '#9E9E9E',
          icon: 'microphone-off',
          label: 'ふかのう',
          iconSize: size * 0.5,
        };
      default:
        return {
          mainColor: '#4CAF50',
          icon: 'microphone',
          label: 'はなす',
          iconSize: size * 0.5,
        };
    }
  };

  const config = getConfig();
  const isDisabled = state === 'disabled' || state === 'processing' || state === 'judging';

  // アニメーションスタイルを計算
  const getAnimationStyle = () => {
    if (!pulseAnim) return {};

    if (state === 'recording') {
      // 録音中は脈動アニメーション
      return {
        transform: [
          {
            scale: pulseAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [1, 1.1, 1],
            }),
          },
        ],
      };
    }

    if (state === 'processing' || state === 'judging') {
      // 処理中または判定中は回転アニメーション
      return {
        transform: [
          {
            rotate: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg'],
            }),
          },
        ],
      };
    }

    return {};
  };

  const animationStyle = getAnimationStyle();

  const buttonContent = (
    <>
      <MaterialCommunityIcons name={config.icon as any} size={config.iconSize} color='white' />
      <Text
        style={{
          color: 'white',
          fontSize: size * 0.2,
          marginTop: 5,
          fontFamily: 'Zen-B',
        }}>
        {config.label}
      </Text>
    </>
  );

  // アニメーション用のラッパー
  const renderButton = () => {
    // アニメーション付きのView
    if (pulseAnim && (state === 'recording' || state === 'processing' || state === 'judging')) {
      return (
        <Animated.View
          style={[
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: config.mainColor,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            },
            animationStyle,
          ]}>
          {buttonContent}
        </Animated.View>
      );
    }

    // 通常のView
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: config.mainColor,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 5,
        }}>
        {buttonContent}
      </View>
    );
  };

  return (
    <TouchableOpacity onPress={onPress} disabled={isDisabled} style={[{ opacity: isDisabled ? 0.7 : 1 }, style]}>
      {renderButton()}
    </TouchableOpacity>
  );
};

export default memo(GameControlButton);
