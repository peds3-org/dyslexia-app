import React, { memo } from 'react';
import { View, Text, Animated, ViewStyle } from 'react-native';

interface CharacterDisplayProps {
  character: string;
  reading?: string;
  showReading?: boolean;
  judgementResult?: 'correct' | 'incorrect' | null;
  style?: ViewStyle;
  characterScale?: Animated.Value;
}

const CharacterDisplay: React.FC<CharacterDisplayProps> = ({
  character,
  reading,
  showReading = true,
  judgementResult = null,
  style,
  characterScale,
}) => {
  // 文字の表示部分
  const renderCharacter = () => {
    // アニメーション付きの文字
    if (characterScale) {
      return (
        <Animated.Text
          style={{
            fontFamily: 'Zen-B',
            fontSize: 120,
            color: '#333333',
            textAlign: 'center',
            textShadowColor: 'rgba(0, 0, 0, 0.1)',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 2,
            transform: [{ scale: characterScale }],
          }}>
          {character}
        </Animated.Text>
      );
    }

    // 通常の文字
    return (
      <Text
        style={{
          fontFamily: 'Zen-B',
          fontSize: 120,
          color: '#333333',
          textAlign: 'center',
          textShadowColor: 'rgba(0, 0, 0, 0.1)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 2,
        }}>
        {character}
      </Text>
    );
  };

  // 正解・不正解マークの表示
  const renderJudgementMark = () => {
    if (!judgementResult) return null;

    return (
      <View
        style={{
          position: 'absolute',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: 300,
          zIndex: 5,
        }}>
        {judgementResult === 'correct' ? (
          <Text
            style={{
              fontFamily: 'Zen-B',
              fontSize: 220,
              color: 'rgba(122, 193, 66, 0.5)',
              textAlign: 'center',
            }}>
            ○
          </Text>
        ) : (
          <Text
            style={{
              fontFamily: 'Zen-B',
              fontSize: 220,
              color: 'rgba(255, 204, 0, 0.5)',
              textAlign: 'center',
            }}>
            △
          </Text>
        )}
      </View>
    );
  };

  return (
    <View
      style={[
        {
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
        },
        style,
      ]}>
      {renderJudgementMark()}

      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {renderCharacter()}

        {showReading && reading && (
          <Text
            style={{
              fontFamily: 'Zen-R',
              fontSize: 24,
              color: '#666666',
              marginTop: -12,
            }}>
            {reading}
          </Text>
        )}
      </View>
    </View>
  );
};

export default memo(CharacterDisplay);
