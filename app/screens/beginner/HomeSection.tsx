import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import CBTHomeSection from '@src/components/cbt/CBTHomeSection';

interface HomeSectionProps {
  onToggleGameMode: () => void;
  levelTitle: string;
}

export default function HomeSection({ onToggleGameMode, levelTitle }: HomeSectionProps) {
  const router = useRouter();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      nestedScrollEnabled={true}
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={true}>
      {/* 認知行動療法セクション */}
      <View style={{ padding: 16 }}>
        {/* ヘッダー */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F0F0F0',
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 16,
            }}>
            <MaterialCommunityIcons name='arrow-left' size={18} color='#41644A' />
            <Text
              style={{
                fontFamily: 'Zen-B',
                fontSize: 14,
                color: '#41644A',
                marginLeft: 4,
              }}>
              ホーム
            </Text>
          </TouchableOpacity>
          
          <Text
            style={{
              flex: 1,
              fontSize: 24,
              fontFamily: 'Zen-B',
              color: '#41644A',
              textAlign: 'center',
              marginRight: 70, // ボタン幅分のオフセット
            }}>
            {levelTitle}
          </Text>
        </View>

        {/* CBTホームセクション */}
        <CBTHomeSection />

        {/* 区切り線 */}
        <View
          style={{
            height: 4,
            backgroundColor: '#F0F0F0',
            borderRadius: 2,
            marginVertical: 16,
          }}
        />

        {/* ゲームモードに切り替えるボタン */}
        <TouchableOpacity
          onPress={onToggleGameMode}
          style={{
            backgroundColor: '#41644A',
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 24,
            alignItems: 'center',
            marginBottom: 20,
          }}>
          <Text
            style={{
              fontFamily: 'Zen-B',
              fontSize: 16,
              color: '#FFFFFF',
            }}>
            きょうの れんしゅうを はじめる
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}