import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import CustomButton from '@src/components/ui/CustomButton';
import { ThemedView } from '@src/components/ui/ThemedView';
import { ThemedText } from '@src/components/ui/ThemedText';

export default function InitialTestIndex() {
  const router = useRouter();

  const handleStart = () => {
    router.push('/(app)/initial-test/intro');
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText style={styles.title}>初期診断テスト</ThemedText>
        <ThemedText style={styles.description}>
          これから、あなたの現在のひらがな読み取り能力を
          確認するための簡単なテストを行います。
        </ThemedText>
        <ThemedText style={styles.description}>
          リラックスして、自分のペースで進めてください。
        </ThemedText>
        
        <View style={styles.infoBox}>
          <ThemedText style={styles.infoTitle}>テストについて</ThemedText>
          <ThemedText style={styles.infoText}>• 所要時間：約5-10分</ThemedText>
          <ThemedText style={styles.infoText}>• 問題数：33問</ThemedText>
          <ThemedText style={styles.infoText}>• 内容：ひらがなの読み取り</ThemedText>
        </View>

        <CustomButton
          title="テストを始める"
          onPress={handleStart}
          style={styles.button}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    color: '#666',
    lineHeight: 24,
  },
  infoBox: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginVertical: 32,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  button: {
    minWidth: 200,
  },
});