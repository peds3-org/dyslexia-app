import React, { memo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
  iconColor?: string;
  iconSize?: number;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'small' | 'medium' | 'large';
}

const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  style,
  textStyle,
  icon,
  iconColor = '#FFFFFF',
  iconSize = 20,
  isLoading = false,
  disabled = false,
  variant = 'primary',
  size = 'medium',
}) => {
  // バリアントに基づくスタイル設定
  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: '#41644A', color: '#FFFFFF' };
      case 'secondary':
        return { backgroundColor: '#E86A33', color: '#FFFFFF' };
      case 'success':
        return { backgroundColor: '#4CAF50', color: '#FFFFFF' };
      case 'warning':
        return { backgroundColor: '#FF9800', color: '#FFFFFF' };
      case 'danger':
        return { backgroundColor: '#F44336', color: '#FFFFFF' };
      default:
        return { backgroundColor: '#41644A', color: '#FFFFFF' };
    }
  };

  // サイズに基づくスタイル設定
  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16, fontSize: 14 };
      case 'medium':
        return { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, fontSize: 16 };
      case 'large':
        return { paddingVertical: 16, paddingHorizontal: 32, borderRadius: 28, fontSize: 18 };
      default:
        return { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, fontSize: 16 };
    }
  };

  const variantStyle = getVariantStyle();
  const sizeStyle = getSizeStyle();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isLoading}
      style={{
        backgroundColor: variantStyle.backgroundColor,
        paddingVertical: sizeStyle.paddingVertical,
        paddingHorizontal: sizeStyle.paddingHorizontal,
        borderRadius: sizeStyle.borderRadius,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}>
      {isLoading ? (
        <ActivityIndicator size='small' color='#FFFFFF' />
      ) : (
        <>
          {icon && <MaterialCommunityIcons name={icon as any} size={iconSize} color={iconColor} style={{ marginRight: 8 }} />}
          <Text
            style={{
              fontFamily: 'Zen-B',
              fontSize: sizeStyle.fontSize,
              color: variantStyle.color,
              ...textStyle,
            }}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export default memo(CustomButton);
