import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface HomeSectionProps {
  onToggleGameMode: () => void;
  levelTitle: string;
  onStoryReplay?: () => void;
}

export default function HomeSection({ onToggleGameMode, levelTitle, onStoryReplay }: HomeSectionProps) {
  const router = useRouter();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#FFE5F1' }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingTop: 40, padding: 20 }}>
        {/* カスタムヘッダー */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 28,
            paddingTop: 20,
          }}>
          <TouchableOpacity
            onPress={() => router.push('../../../')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 25,
              borderWidth: 3,
              borderColor: '#FF69B4',
              shadowColor: '#FF69B4',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.2,
              shadowRadius: 5,
              elevation: 5,
            }}>
            <MaterialCommunityIcons name='home' size={22} color='#FF69B4' />
            <Text
              style={{
                fontFamily: 'Zen-B',
                fontSize: 16,
                color: '#FF69B4',
                marginLeft: 8,
              }}>
              ホーム
            </Text>
          </TouchableOpacity>

          <Text
            style={{
              flex: 1,
              fontSize: 32,
              fontFamily: 'Zen-B',
              color: '#FF1493',
              textAlign: 'center',
              marginRight: 90,
              textShadowColor: 'rgba(255, 20, 147, 0.3)',
              textShadowOffset: { width: 2, height: 2 },
              textShadowRadius: 4,
            }}>
            {levelTitle}
          </Text>
        </View>

        {/* メインコンテンツ - ポケモンスマイル風 */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 40,
            padding: 36,
            alignItems: 'center',
            borderWidth: 4,
            borderColor: '#FFB6C1',
            shadowColor: '#FF69B4',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 10,
            marginBottom: 28,
          }}>
          {/* 忍者のイラスト - 背景の円と一緒に */}
          <View
            style={{
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: '#FFF0F5',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 28,
              borderWidth: 3,
              borderColor: '#FFB6C1',
            }}>
            <Image
              source={require('../../../../assets/temp/ninja_syuriken_man.png')}
              style={{
                width: 100,
                height: 100,
              }}
              resizeMode='contain'
            />
          </View>

          <Text
            style={{
              fontSize: 28,
              fontFamily: 'Zen-B',
              color: '#FF1493',
              textAlign: 'center',
              marginBottom: 12,
              textShadowColor: 'rgba(255, 20, 147, 0.2)',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 3,
            }}>
            きょうも がんばろう！✨
          </Text>

          <Text
            style={{
              fontSize: 18,
              fontFamily: 'Zen-R',
              color: '#FF69B4',
              textAlign: 'center',
              marginBottom: 36,
              lineHeight: 28,
            }}>
            ひらがなの れんしゅうを{'\n'}はじめましょう 🌟
          </Text>

          {/* はじめるボタン - 大きく目立つデザイン */}
          <TouchableOpacity
            onPress={() => {
              // AIの初期化状態に関わらず、ゲームを開始
              // GameScreen内でAI読み込み中ポップアップを表示する
              onToggleGameMode();
            }}
            style={{
              backgroundColor: '#00CED1',
              paddingVertical: 22,
              paddingHorizontal: 64,
              borderRadius: 45,
              borderWidth: 5,
              borderColor: '#FFFFFF',
              shadowColor: '#00CED1',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 12,
              transform: [{ scale: 1 }],
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name='play-circle' size={36} color='#FFFFFF' />
              <Text
                style={{
                  fontFamily: 'Zen-B',
                  fontSize: 26,
                  color: '#FFFFFF',
                  marginLeft: 12,
                  textShadowColor: 'rgba(0, 0, 0, 0.3)',
                  textShadowOffset: { width: 2, height: 2 },
                  textShadowRadius: 4,
                }}>
                はじめる
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* プログレス情報とアチーブメント */}
        <View style={{ gap: 20 }}>
          {/* 今日の目標 */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 30,
              padding: 24,
              borderWidth: 3,
              borderColor: '#FFD700',
              shadowColor: '#FFD700',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 6,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#FFF8DC',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}>
                <MaterialCommunityIcons name='star' size={28} color='#FFD700' />
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontFamily: 'Zen-B',
                  color: '#FF8C00',
                }}>
                きょうの もくひょう
              </Text>
            </View>

            <View style={{ backgroundColor: '#FFF8DC', borderRadius: 20, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name='target' size={28} color='#FF6347' />
                <Text
                  style={{
                    fontSize: 18,
                    fontFamily: 'Zen-B',
                    color: '#FF6347',
                    marginLeft: 12,
                  }}>
                  10もじ れんしゅうしよう！
                </Text>
              </View>
            </View>
          </View>

          {/* アチーブメントカード */}
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
            }}>
            {/* 連続日数 */}
            <View
              style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                borderRadius: 25,
                padding: 20,
                borderWidth: 3,
                borderColor: '#87CEEB',
                alignItems: 'center',
                shadowColor: '#87CEEB',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 5,
              }}>
              <MaterialCommunityIcons name='fire' size={32} color='#FF4500' />
              <Text
                style={{
                  fontSize: 24,
                  fontFamily: 'Zen-B',
                  color: '#FF4500',
                  marginTop: 8,
                }}>
                3
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: 'Zen-R',
                  color: '#87CEEB',
                  marginTop: 4,
                }}>
                れんぞく
              </Text>
            </View>

            {/* 総練習文字数 */}
            <View
              style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                borderRadius: 25,
                padding: 20,
                borderWidth: 3,
                borderColor: '#98FB98',
                alignItems: 'center',
                shadowColor: '#98FB98',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 5,
              }}>
              <MaterialCommunityIcons name='trophy' size={32} color='#32CD32' />
              <Text
                style={{
                  fontSize: 24,
                  fontFamily: 'Zen-B',
                  color: '#32CD32',
                  marginTop: 8,
                }}>
                45
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: 'Zen-R',
                  color: '#98FB98',
                  marginTop: 4,
                }}>
                ぜんぶで
              </Text>
            </View>
          </View>

          {/* ストーリー再生ボタン */}
          {onStoryReplay && (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 25,
                padding: 20,
                borderWidth: 3,
                borderColor: '#DDA0DD',
                shadowColor: '#DDA0DD',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 5,
                marginTop: 20,
              }}>
              <TouchableOpacity
                onPress={onStoryReplay}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MaterialCommunityIcons name='book-open-variant' size={24} color='#DDA0DD' />
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: 'Zen-B',
                    color: '#DDA0DD',
                    marginLeft: 12,
                  }}>
                  ストーリーを もういちど みる
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
