import React, { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { ThemedView } from '@/src/components/ui/ThemedView';
import { ThemedText } from '@/src/components/ui/ThemedText';
import CBTHomeSection from '@/src/components/cbt/CBTHomeSection';
import LoginBonusModal from '@/src/components/cbt/LoginBonusModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CBTScreen() {
  const [showLoginBonus, setShowLoginBonus] = useState(false);

  useEffect(() => {
    // ページ表示時に必ずログインボーナスを表示
    setShowLoginBonus(true);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ヘッダー */}
          <View style={styles.header}>
            <ThemedText style={styles.title}>きょうの もくひょう</ThemedText>
          </View>

          {/* メインコンテンツ */}
          <CBTHomeSection onComplete={() => {
            // 必要に応じて完了時の処理
            console.log('CBTセクション完了');
          }} />
        </ScrollView>

        {/* ログインボーナスモーダル */}
        <LoginBonusModal 
          visible={showLoginBonus} 
          onClose={() => setShowLoginBonus(false)} 
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Zen-B',
    color: '#41644A',
    textAlign: 'center',
  },
});