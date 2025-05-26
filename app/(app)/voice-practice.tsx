import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedView } from '@src/components/ui/ThemedView';
import { ThemedText } from '@src/components/ui/ThemedText';
import voiceService from '@src/services/voiceService';

export default function VoicePractice() {
  const [isRecording, setIsRecording] = useState(false);
  const [currentText, setCurrentText] = useState('あいうえお');
  const [result, setResult] = useState<string>('');

  const practiceTexts = [
    'あいうえお',
    'かきくけこ',
    'さしすせそ',
    'たちつてと',
    'なにぬねの',
    'はひふへほ',
    'まみむめも',
    'やゆよ',
    'らりるれろ',
    'わをん',
  ];

  const startRecording = async () => {
    try {
      setIsRecording(true);
      setResult('');
      
      // 音声認識を開始
      const recognized = await voiceService.startRecording();
      
      if (recognized) {
        setResult(recognized);
        
        // 正解かどうかチェック
        if (recognized === currentText) {
          Alert.alert('すばらしい！', '正しく読めました！');
        } else {
          Alert.alert('もう一度', `「${currentText}」と読んでみましょう`);
        }
      }
    } catch (error) {
      console.error('録音エラー:', error);
      Alert.alert('エラー', '録音に失敗しました');
    } finally {
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      await voiceService.stopRecording();
      setIsRecording(false);
    } catch (error) {
      console.error('録音停止エラー:', error);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText style={styles.title}>音声練習</ThemedText>
        
        <View style={styles.card}>
          <ThemedText style={styles.instruction}>
            下の文字を声に出して読んでみましょう
          </ThemedText>
          
          <Text style={styles.targetText}>{currentText}</Text>
          
          <TouchableOpacity
            style={[styles.recordButton, isRecording && styles.recordingButton]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={false}
          >
            <MaterialCommunityIcons
              name={isRecording ? 'stop' : 'microphone'}
              size={48}
              color="#FFF"
            />
            <ThemedText style={styles.buttonText}>
              {isRecording ? '停止' : '録音開始'}
            </ThemedText>
          </TouchableOpacity>
          
          {result && (
            <View style={styles.resultContainer}>
              <ThemedText style={styles.resultLabel}>認識結果：</ThemedText>
              <Text style={styles.resultText}>{result}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.textList}>
          <ThemedText style={styles.sectionTitle}>練習テキスト</ThemedText>
          {practiceTexts.map((text, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.textItem,
                currentText === text && styles.selectedTextItem,
              ]}
              onPress={() => {
                setCurrentText(text);
                setResult('');
              }}
            >
              <Text style={[
                styles.textItemText,
                currentText === text && styles.selectedTextItemText,
              ]}>
                {text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#333',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instruction: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  targetText: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
    color: '#E86A33',
    fontFamily: 'font-mplus',
  },
  recordButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 100,
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  recordingButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    marginTop: 8,
  },
  resultContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'font-mplus',
  },
  textList: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  textItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  selectedTextItem: {
    backgroundColor: '#E86A33',
  },
  textItemText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
    fontFamily: 'font-mplus',
  },
  selectedTextItemText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});