import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ScrollView, View, StyleSheet, SafeAreaView } from 'react-native';
import { ThemedView } from '@/src/components/ui/ThemedView';
import { ThemedText } from '@/src/components/ui/ThemedText';
import CBTHomeSection from '@/src/components/cbt/CBTHomeSection';
import LoginBonusModal from '@/src/components/cbt/LoginBonusModal';

export default function CBTScreen() {
  const [showLoginBonus, setShowLoginBonus] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // ページ表示時に必ずログインボーナスを表示
    if (isMountedRef.current) {
      setShowLoginBonus(true);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ログインボーナスクローズハンドラー
  const handleLoginBonusClose = useCallback(() => {
    if (isMountedRef.current) {
      setShowLoginBonus(false);
    }
  }, []);

  // CBTセクション完了ハンドラー
  const handleCBTComplete = useCallback(() => {
    // 必要に応じて完了時の処理
    console.log('CBTセクション完了');
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
          <CBTHomeSection onComplete={handleCBTComplete} />
        </ScrollView>

        {/* ログインボーナスモーダル */}
        <LoginBonusModal 
          visible={showLoginBonus} 
          onClose={handleLoginBonusClose} 
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