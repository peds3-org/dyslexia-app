import React from 'react';
import Svg, { Path } from 'react-native-svg';

type StarProps = {
  width?: number;
  height?: number;
  color?: string;
};

export function Star({ width = 20, height = 20, color = '#FFD700' }: StarProps) {
  return (
    <Svg width={width} height={height} viewBox='0 0 24 24'>
      <Path d='M12 1.73l3.09 6.27 6.91 1-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1z' fill={color} stroke='#FFF' strokeWidth={1} />
    </Svg>
  );
}

export default Star;
