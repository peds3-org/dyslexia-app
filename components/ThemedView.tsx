import React from 'react';
import { View, ViewProps } from 'react-native';
import { useColorScheme } from 'nativewind';

export interface ThemedViewProps extends ViewProps {
  backgroundColor?: string;
}

export function ThemedView(props: ThemedViewProps) {
  const { style, backgroundColor = '#FFFFFF', ...otherProps } = props;

  return (
    <View
      style={[
        {
          backgroundColor,
        },
        style,
      ]}
      {...otherProps}
    />
  );
}

export default ThemedView;
