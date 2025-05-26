import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface AILoadingScreenProps {
  isLoading: boolean;
  isReady: boolean;
  onBack: () => void;
}

export default function AILoadingScreen({ isLoading, isReady, onBack }: AILoadingScreenProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Text style={styles.loadingTitle}>準備中...</Text>
          <Text style={styles.loadingText}>AIを初期化しています</Text>
          <View style={styles.loadingIndicator}>
            <View style={styles.loadingDot} />
            <View style={[styles.loadingDot, styles.loadingDot2]} />
            <View style={[styles.loadingDot, styles.loadingDot3]} />
          </View>
        </View>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.errorContent}>
          <Text style={styles.errorTitle}>エラー</Text>
          <Text style={styles.errorText}>AIモデルがダウンロードされていません</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onBack}
          >
            <Text style={styles.backButtonText}>戻る</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#FFB6C1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  loadingTitle: {
    fontSize: 32,
    fontFamily: 'Zen-B',
    color: '#FF69B4',
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Zen-B',
    color: '#666',
    marginBottom: 20,
  },
  loadingIndicator: {
    flexDirection: 'row',
    gap: 10,
  },
  loadingDot: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#FFB6C1',
    opacity: 0.3,
  },
  loadingDot2: {
    opacity: 0.6,
  },
  loadingDot3: {
    opacity: 0.9,
  },
  errorContent: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#FF6B6B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  errorTitle: {
    fontSize: 32,
    fontFamily: 'Zen-B',
    color: '#FF6B6B',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Zen-B',
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#FF5252',
  },
  backButtonText: {
    fontSize: 18,
    fontFamily: 'Zen-B',
    color: '#FFFFFF',
  },
});