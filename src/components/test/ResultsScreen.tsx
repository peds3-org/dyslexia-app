import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@src/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { TestResult, TestLevel } from '@src/types/initialTest';
import { useAppState } from '@src/contexts/AppStateContext';

const { width } = Dimensions.get('window');

interface ResultsScreenProps {
  results: TestResult[];
  testLevel: TestLevel;
  YOON_LIST: string[];
  SEION_LIST: string[];
  DAKUON_LIST: string[];
}

export default function ResultsScreen({ results, testLevel, YOON_LIST, SEION_LIST, DAKUON_LIST }: ResultsScreenProps) {
  const router = useRouter();

  // AI認識結果を考慮した正解数の計算
  const correctCount = results.filter((r) => {
    if (r.aiResult && r.aiResult.isCorrect !== undefined) {
      return r.aiResult.isCorrect;
    }
    return r.time <= 2.5;
  }).length;
  const accuracy = (correctCount / results.length) * 100;


  // 結果を分類する関数
  const getTimeCategory = (time: number) => {
    // 時間に基づいた評価
    if (time <= 1.5) {
      // とても上手
      return { 
        message: 'とてもじょうず！', 
        color: '#4CAF50',
        emoji: '☀️',
        gradientColors: ['#C8E6C9', '#A5D6A7'] 
      };
    } else if (time <= 2.0) {
      // 上手
      return { 
        message: 'じょうず！', 
        color: '#2196F3',
        emoji: '⭐',
        gradientColors: ['#90CAF9', '#64B5F6']
      };
    } else if (time <= 2.5) {
      // 頑張った
      return { 
        message: 'がんばったね', 
        color: '#FF9800',
        emoji: '💪',
        gradientColors: ['#FFCC80', '#FFB74D']
      };
    } else {
      // もう少し
      return { 
        message: 'もうすこし！', 
        color: '#F44336',
        emoji: '🌈',
        gradientColors: ['#FFCDD2', '#EF9A9A']
      };
    }
  };

  // 10問ごとにグループ化する
  const groupedResults = results.reduce((acc, result, index) => {
    const groupIndex = Math.floor(index / 10);
    if (!acc[groupIndex]) {
      acc[groupIndex] = [];
    }
    acc[groupIndex].push(result);
    return acc;
  }, [] as TestResult[][]);

  // 星を描画する関数
  const renderStars = (correct: number, total: number) => {
    const percentage = (correct / total) * 100;
    const stars = percentage >= 90 ? 3 : percentage >= 70 ? 2 : percentage >= 50 ? 1 : 0;
    
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3].map((star) => (
          <Text key={star} style={[styles.star, { opacity: star <= stars ? 1 : 0.3 }]}>
            ⭐
          </Text>
        ))}
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#87CEEB', '#FFE4E1']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <View style={styles.resultCard}>
              <Text style={styles.title}>✨ てすとけっか ✨</Text>
              <Text style={styles.subtitle}>
                {testLevel === 'intermediate' ? 'ちゅうきゅう' : 'しょきゅう'} レベル
              </Text>
              
              {/* スコア表示 */}
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreText}>
                  {correctCount} / {results.length} せいかい！
                </Text>
                {renderStars(correctCount, results.length)}
              </View>
              
              {/* 総合評価メッセージ */}
              <Text style={styles.overallMessage}>
                {accuracy >= 90 ? 'すばらしい！きみはひらがなマスターだ！' :
                 accuracy >= 70 ? 'よくできました！もうすこしでマスターだよ！' :
                 accuracy >= 50 ? 'がんばったね！れんしゅうをつづけよう！' :
                 'だいじょうぶ！いっしょにがんばろう！'}
              </Text>
            </View>
          </View>

          {/* 結果リスト */}
          <View style={styles.resultsContainer}>
            {results.map((result, index) => {
              const category = getTimeCategory(result.time);
              const isCorrect = result.aiResult?.isCorrect ?? (result.time <= 2.5);
              
              // 時間ベースでの評価を優先し、背景色を決定
              const useTimeBasedColors = result.time <= 2.5;
              const gradientColors = useTimeBasedColors ? category.gradientColors : ['#FFEBEE', '#FFCDD2'];
              
              return (
                <View key={index} style={styles.resultItemWrapper}>
                  <LinearGradient
                    colors={gradientColors}
                    style={styles.resultItem}
                  >
                    {/* 文字表示 */}
                    <View style={styles.characterContainer}>
                      <Text style={styles.characterText}>{result.yoon}</Text>
                      <View style={styles.resultIcon}>
                        <Text style={styles.resultIconText}>
                          {isCorrect ? category.emoji : '💭'}
                        </Text>
                      </View>
                    </View>
                    
                    {/* 詳細情報 */}
                    <View style={styles.detailsContainer}>
                      <Text style={[styles.messageText, { color: category.color }]}>
                        {category.message}
                      </Text>
                      {result.time > 0 && (
                        <Text style={styles.timeText}>
                          {result.time.toFixed(1)}びょう
                        </Text>
                      )}
                    </View>
                  </LinearGradient>
                </View>
              );
            })}
          </View>

          {/* 次へボタン */}
          <TouchableOpacity
            onPress={async () => {
              try {
                // 現在のユーザーIDを取得
                const {
                  data: { session },
                } = await supabase.auth.getSession();
                if (!session?.user?.id) {
                  throw new Error('ユーザーIDが取得できません');
                }

                // RouteGuardが自動的に適切な画面へ遷移するため、
                // ここでは単にルートへ戻る
                router.replace('/');
              } catch (error) {
                console.error('画面遷移エラー:', error);
                Alert.alert('エラー', 'つぎの がめんに すすめませんでした');
              }
            }}
            style={styles.nextButton}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>つぎへすすむ →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  resultCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    width: width - 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontFamily: 'font-mplus-bold',
    fontSize: 28,
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'font-mplus',
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  scoreText: {
    fontFamily: 'font-mplus-bold',
    fontSize: 24,
    color: '#4CAF50',
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  star: {
    fontSize: 30,
    marginHorizontal: 5,
  },
  overallMessage: {
    fontFamily: 'font-mplus',
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 10,
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  resultItemWrapper: {
    marginBottom: 12,
  },
  resultItem: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  characterContainer: {
    width: 80,
    alignItems: 'center',
  },
  characterText: {
    fontFamily: 'font-mplus-bold',
    fontSize: 36,
    color: '#333',
    marginBottom: 5,
  },
  resultIcon: {
    marginTop: 5,
  },
  resultIconText: {
    fontSize: 24,
  },
  detailsContainer: {
    flex: 1,
    paddingLeft: 20,
  },
  messageText: {
    fontFamily: 'font-mplus-bold',
    fontSize: 18,
    marginBottom: 4,
  },
  timeText: {
    fontFamily: 'font-mplus',
    fontSize: 12,
    color: '#999',
  },
  nextButton: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  nextButtonGradient: {
    padding: 18,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFF',
    fontFamily: 'font-mplus-bold',
    fontSize: 20,
  },
});