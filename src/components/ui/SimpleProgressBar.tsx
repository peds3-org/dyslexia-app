import React, { memo } from 'react';
import { View, ViewStyle } from 'react-native';

export interface SimpleProgressBarProps {
  progress: number; // 0〜1の間の値
  height?: number;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}

const SimpleProgressBar: React.FC<SimpleProgressBarProps> = ({ progress, height = 10, color = '#4CAF50', backgroundColor = '#E0E0E0', style }) => {
  // 進捗値を0〜1の範囲に強制
  const normalizedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <View
      style={[
        {
          width: '100%',
          height,
          backgroundColor,
          borderRadius: height / 2,
          overflow: 'hidden',
        },
        style,
      ]}>
      <View
        style={{
          width: `${normalizedProgress * 100}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
};

export default memo(SimpleProgressBar);
