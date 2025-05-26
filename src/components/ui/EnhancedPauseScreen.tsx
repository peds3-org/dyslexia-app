import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type PracticeResult = {
  character: string;
  isCorrect: boolean;
  responseTime: number;
  aiResult?: {
    isCorrect: boolean;
    top3: Array<{
      character: string;
      confidence: number;
    }>;
  };
};

type EnhancedPauseScreenProps = {
  onResume: () => void;
  onQuit: () => void;
  results?: PracticeResult[];
  totalTime?: number;
  correctCount?: number;
  totalCount?: number;
};

export function EnhancedPauseScreen({ 
  onResume, 
  onQuit, 
  results = [], 
  totalTime = 0,
  correctCount = 0,
  totalCount = 0 
}: EnhancedPauseScreenProps) {
  const accuracyRate = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const formattedTime = `${Math.floor(totalTime / 60)}:${(totalTime % 60).toString().padStart(2, '0')}`;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <Text style={styles.title}>ポーズちゅう</Text>

        {/* 結果履歴 */}
        {results.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>これまでの結果 ({results.length}問)</Text>
            <ScrollView 
              style={styles.resultsScrollView}
              contentContainerStyle={styles.resultsScrollContent}
              showsVerticalScrollIndicator={true}
            >
              {results.slice().reverse().map((result, index) => (
                <View key={index} style={[
                  styles.resultItem,
                  index === 0 && styles.resultItemFirst
                ]}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultNumber}>
                      {results.length - index}問目
                    </Text>
                    <Text style={styles.resultCharacter}>{result.character}</Text>
                    <View style={styles.resultStatus}>
                      {result.isCorrect ? (
                        <View style={styles.resultStatusContainer}>
                          <MaterialCommunityIcons name='check-circle' size={28} color='#4CAF50' />
                          <Text style={styles.resultStatusText}>正解</Text>
                        </View>
                      ) : (
                        <View style={styles.resultStatusContainer}>
                          <MaterialCommunityIcons name='close-circle' size={28} color='#FF6B6B' />
                          <Text style={styles.resultStatusText}>不正解</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  {result.aiResult && result.aiResult.top3 ? (
                    <View style={styles.aiResultContainer}>
                      <Text style={styles.aiResultTitle}>AI判定Top3:</Text>
                      {result.aiResult.top3.slice(0, 3).map((ai, i) => (
                        <View key={i} style={styles.aiResultRow}>
                          <Text style={[
                            styles.aiResultRank,
                            i === 0 && result.isCorrect && styles.correctHighlight
                          ]}>
                            {i + 1}位
                          </Text>
                          <Text style={[
                            styles.aiResultChar,
                            i === 0 && result.isCorrect && styles.correctHighlight
                          ]}>
                            {ai.character}
                          </Text>
                          <Text style={[
                            styles.aiResultConfidence,
                            i === 0 && result.isCorrect && styles.correctHighlight
                          ]}>
                            {(ai.confidence * 100).toFixed(1)}%
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.aiResultNoData}>AI判定データなし</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.pauseButtons}>
          <TouchableOpacity onPress={onResume} style={[styles.actionButton, styles.resumeButton]}>
            <MaterialCommunityIcons name='play' size={26} color='#FFF' />
            <Text style={styles.actionButtonText}>つづける</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onQuit} style={[styles.actionButton, styles.stopButton]}>
            <MaterialCommunityIcons name='stop' size={26} color='#FFF' />
            <Text style={styles.actionButtonText}>やめる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  container: {
    backgroundColor: '#FFF',
    padding: 20,
    paddingTop: 30,
    paddingBottom: 20,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#FFB6C1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    width: '90%',
    maxWidth: 500,
    height: '80%',
    maxHeight: 700,
    flexDirection: 'column',
  },
  title: {
    fontFamily: 'font-mplus-bold',
    fontSize: 36,
    color: '#FF69B4',
    marginBottom: 15,
    textAlign: 'center',
  },
  resultsContainer: {
    marginBottom: 10,
    width: '100%',
    flex: 1,
    minHeight: 300,
  },
  resultsTitle: {
    fontSize: 22,
    fontFamily: 'Zen-B',
    color: '#FF69B4',
    textAlign: 'center',
    marginBottom: 15,
  },
  resultsScrollView: {
    backgroundColor: '#FFF5F5',
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#FFB6C1',
    flex: 1,
    minHeight: 200,
  },
  resultsScrollContent: {
    padding: 10,
  },
  resultItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#FFE0EC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  resultItemFirst: {
    borderColor: '#FFB6C1',
    borderWidth: 3,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0EC',
    paddingBottom: 8,
  },
  resultNumber: {
    fontSize: 16,
    fontFamily: 'Zen-B',
    color: '#999',
    marginRight: 10,
  },
  resultCharacter: {
    fontSize: 40,
    fontFamily: 'font-mplus-bold',
    color: '#FF69B4',
    marginHorizontal: 15,
    flex: 1,
    textAlign: 'center',
  },
  resultStatus: {
    alignItems: 'center',
    minWidth: 80,
  },
  resultStatusContainer: {
    alignItems: 'center',
  },
  resultStatusText: {
    fontSize: 14,
    fontFamily: 'Zen-B',
    color: '#666',
    marginTop: 4,
  },
  aiResultContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FFE0EC',
  },
  aiResultTitle: {
    fontSize: 16,
    fontFamily: 'Zen-B',
    color: '#FF69B4',
    marginBottom: 8,
  },
  aiResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  aiResultRank: {
    fontSize: 16,
    fontFamily: 'Zen-B',
    color: '#999',
    width: 40,
  },
  aiResultChar: {
    fontSize: 24,
    fontFamily: 'font-mplus-bold',
    color: '#333',
    width: 50,
    textAlign: 'center',
  },
  aiResultConfidence: {
    fontSize: 16,
    fontFamily: 'Zen-B',
    color: '#666',
    marginLeft: 10,
  },
  correctHighlight: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  aiResultNoData: {
    fontSize: 14,
    fontFamily: 'Zen-B',
    color: '#999',
    fontStyle: 'italic',
    marginTop: 5,
  },
  pauseButtons: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    marginTop: 10,
    paddingHorizontal: 20,
    width: '100%',
    flexShrink: 0,
  },
  actionButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    borderWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    gap: 8,
    marginBottom: 10,
  },
  resumeButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#45A049',
  },
  stopButton: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF5252',
  },
  actionButtonText: {
    color: '#FFF',
    fontFamily: 'font-mplus-bold',
    fontSize: 20,
  },
});

export default EnhancedPauseScreen;