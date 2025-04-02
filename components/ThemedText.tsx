import React from 'react';
import { Text, TextProps } from 'react-native';

export interface ThemedTextProps extends TextProps {
  color?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
}

export function ThemedText(props: ThemedTextProps) {
  const { style, color = '#333333', fontSize, fontWeight, ...otherProps } = props;

  return (
    <Text
      style={[
        {
          color,
          fontSize,
          fontWeight,
          fontFamily: 'font-mplus',
        },
        style,
      ]}
      {...otherProps}
    />
  );
}

// Named exportとしても保持しつつ、default exportを追加
export default ThemedText;
