import React from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';

interface LoadingScreenProps {
  message?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  showSpinner?: boolean;
}

export default function LoadingScreen({ 
  message, 
  showRetry = false, 
  onRetry,
  showSpinner = true 
}: LoadingScreenProps) {
  const isError = showRetry || (message && !showSpinner);
  
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 20,
      }}>
      {/* エラー時は異なる画像を表示 */}
      <Image
        source={
          isError 
            ? require('@assets/temp/elder-worried.png')
            : require('@assets/temp/elder-worried.png')
        }
        style={{
          width: 100,
          height: 100,
          marginBottom: 20,
          opacity: 0.8,
        }}
      />
      
      {/* メッセージまたはデフォルトテキスト */}
      <Text
        style={{
          fontFamily: 'font-mplus-bold',
          fontSize: 18,
          color: isError ? '#E86452' : '#41644A',
          marginBottom: 10,
          textAlign: 'center',
        }}>
        {message || 'データを よみこんでいます'}
      </Text>
      
      {/* サブメッセージ */}
      {!isError && (
        <Text
          style={{
            fontFamily: 'font-mplus',
            fontSize: 14,
            color: '#666',
            marginBottom: 20,
          }}>
          しばらく おまちください
        </Text>
      )}
      
      {/* スピナー */}
      {showSpinner && !isError && (
        <ActivityIndicator 
          size="large" 
          color="#41644A" 
          style={{ marginTop: 10 }}
        />
      )}
      
      {/* リトライボタン */}
      {showRetry && onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          style={{
            marginTop: 20,
            paddingHorizontal: 30,
            paddingVertical: 12,
            backgroundColor: '#41644A',
            borderRadius: 25,
          }}>
          <Text
            style={{
              fontFamily: 'font-mplus-bold',
              fontSize: 16,
              color: '#FFFFFF',
            }}>
            もういちど ためす
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}