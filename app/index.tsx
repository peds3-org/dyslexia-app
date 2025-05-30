import React, { useRef } from 'react';
import { View, Text, ImageBackground, Animated, StatusBar, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from '@src/contexts/AppStateContext';
import { MaterialIcons } from '@expo/vector-icons';


/**
 * アプリの初期画面（簡素化版）
 * RouteGuardが自動的に適切な画面へ誘導するため、
 * この画面は初回表示とボタンクリック時の遷移のみを担当
 */
export default function Index() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isOnboarded, resetAppState } = useAppState();

  // アニメーション用の値
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // 初期アニメーション
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  /**
   * ゲーム開始処理
   * 状態に応じて適切な画面へ遷移
   */
  const handleStart = () => {
    // 状態に応じて適切な画面へ遷移
    if (!isOnboarded) {
      router.push('/(auth)/onboarding');
    } else {
      // 既にオンボーディング済みの場合はログイン画面へ
      router.push('/(auth)/login');
    }
  };

  // デバッグ用: アプリを完全リセット
  const handleResetApp = async () => {
    Alert.alert(
      '確認',
      'アプリを完全に初期状態に戻しますか？\n全てのデータが削除されます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセット',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetAppState();
              Alert.alert('完了', 'アプリを初期状態に戻しました');
              // 画面をリフレッシュ
              router.replace('/');
            } catch (error) {
              console.error('リセットエラー:', error);
              Alert.alert('エラー', 'リセットに失敗しました');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle='dark-content' />
      <ImageBackground 
        source={require('../assets/backgrounds/sato.png')} 
        style={{ flex: 1 }} 
        resizeMode='cover'
      >
        {/* タイトル */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            alignItems: 'center',
            justifyContent: 'flex-start',
            width: '100%',
            position: 'absolute',
            top: insets.top + 40,
            zIndex: 5,
          }}>
          <View
            style={{
              backgroundColor: '#FF5B79',
              borderRadius: 25,
              paddingVertical: 20,
              paddingHorizontal: 30,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 10,
              borderWidth: 6,
              borderColor: '#FFE500',
              width: '85%',
              maxWidth: 300,
            }}>
            <Text
              style={{
                fontFamily: 'font-yomogi',
                fontSize: 46,
                color: '#FFFFFF',
                textShadowColor: 'rgba(0, 0, 0, 0.3)',
                textShadowOffset: { width: 2, height: 2 },
                textShadowRadius: 3,
                letterSpacing: 4,
                textAlign: 'center',
                lineHeight: 60,
              }}>
              ひらがな{'\n'}にんじゃ
            </Text>
          </View>
        </Animated.View>

        {/* 中央のコンテンツ部分 */}
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            alignItems: 'center',
            width: '100%',
            paddingBottom: insets.bottom + 40,
          }}>
          {/* スタートボタン */}
          <TouchableOpacity
            onPress={handleStart}
            activeOpacity={0.7}
            style={{
              backgroundColor: '#00C853',
              borderRadius: 25,
              paddingVertical: 16,
              paddingHorizontal: 30,
              width: '85%',
              maxWidth: 300,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              borderWidth: 6,
              borderColor: '#FFE500',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 8,
              marginBottom: 15,
            }}>
            <Image
              source={require('../assets/temp/ninja_syuriken_man.png')}
              style={{
                width: 40,
                height: 40,
                marginRight: 15,
              }}
            />
            <Text
              style={{
                fontFamily: 'font-mplus-bold',
                fontSize: 32,
                color: '#FFFFFF',
                textAlign: 'center',
                letterSpacing: 2,
                textShadowColor: 'rgba(0, 0, 0, 0.3)',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2,
              }}>
              {!isOnboarded ? 'はじめる' : 'あそぶ'}
            </Text>
          </TouchableOpacity>
          
          {/* TFLite Test Button - より見やすい位置に配置 */}
          <TouchableOpacity
            onPress={async () => {
              try {
                console.log('TFLite Test button tapped!');
                const aiService = require('@src/services/aiService').default;
                const available = await aiService.isTfliteAvailable();
                Alert.alert(
                  'TFLite Test', 
                  `Available: ${available}\nBuild: ${__DEV__ ? 'Debug' : 'Release'}`,
                  [{ text: 'OK' }]
                );
              } catch (error: any) {
                Alert.alert('Error', error.message);
              }
            }}
            style={{
              backgroundColor: '#FF6B6B',
              borderRadius: 20,
              paddingVertical: 10,
              paddingHorizontal: 25,
              marginTop: 15,
              borderWidth: 2,
              borderColor: '#FFFFFF',
            }}>
            <Text style={{
              fontFamily: 'font-mplus-bold',
              fontSize: 16,
              color: '#FFFFFF',
              textAlign: 'center',
            }}>
              🧪 AI Test
            </Text>
          </TouchableOpacity>

          {/* バージョン表示 */}
          <Text
            style={{
              fontFamily: 'font-mplus',
              fontSize: 12,
              color: 'rgba(0, 0, 0, 0.5)',
              marginTop: 5,
            }}>
            ばーじょん 1.0.0
          </Text>

          {/* TFLite Test Button - 開発用 */}
          {__DEV__ && (
          <TouchableOpacity
            onPress={async () => {
              try {
                // Capture console logs and errors
                const logs: string[] = [];
                const originalLog = console.log;
                const originalWarn = console.warn;
                const originalError = console.error;
                
                console.log = (...args: any[]) => {
                  logs.push(`[LOG] ${args.join(' ')}`);
                  originalLog(...args);
                };
                console.warn = (...args: any[]) => {
                  logs.push(`[WARN] ${args.join(' ')}`);
                  originalWarn(...args);
                };
                console.error = (...args: any[]) => {
                  logs.push(`[ERROR] ${args.join(' ')}`);
                  originalError(...args);
                };

                logs.push('Testing TFLite initialization...');
                
                // 安全にモジュールをインポート
                let aiService: any;
                try {
                  aiService = require('@src/services/aiService').default;
                } catch (e) {
                  logs.push(`[ERROR] Failed to import aiService: ${e.message}`);
                  throw e;
                }
                
                // TFLite利用可能性チェック
                const available = await aiService.isTfliteAvailable();
                
                // Restore original console methods
                console.log = originalLog;
                console.warn = originalWarn;
                console.error = originalError;
                
                // Show results with logs
                Alert.alert(
                  'TFLite Test Results', 
                  `Available: ${available}\nDEV Mode: ${__DEV__}\n\nLogs:\n${logs.join('\n')}`,
                  [{ text: 'OK' }],
                  { cancelable: false }
                );
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                Alert.alert('TFLite Test Error', `Error: ${errorMessage}\n\nThis is expected in development mode.`);
              }
            }}
            style={{
              backgroundColor: '#9C27B0',
              borderRadius: 25,
              paddingVertical: 12,
              paddingHorizontal: 20,
              width: '85%',
              maxWidth: 300,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              borderWidth: 3,
              borderColor: '#7B1FA2',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 8,
              marginTop: 20,
            }}>
            <MaterialIcons name='science' size={28} color='#FFFFFF' style={{ marginRight: 10 }} />
            <Text
              style={{
                fontFamily: 'font-mplus-bold',
                fontSize: 20,
                color: '#FFFFFF',
                textAlign: 'center',
              }}>
              TFLite Test
            </Text>
          </TouchableOpacity>
          )}

          {/* デバッグ用ボタン - 開発環境のみ表示 */}
          {__DEV__ && (
            <TouchableOpacity
              onPress={handleResetApp}
              style={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                backgroundColor: 'rgba(255, 165, 0, 0.2)',
                padding: 10,
                borderRadius: 5,
                borderWidth: 1,
                borderColor: '#FF6600',
              }}>
              <Text style={{ fontSize: 10, color: '#FF6600', fontWeight: 'bold' }}>
                Debug: Reset All
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ImageBackground>
    </View>
  );
}