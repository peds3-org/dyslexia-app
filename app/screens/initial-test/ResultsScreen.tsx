import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@src/lib/supabase';

// TestResult interface
interface TestResult {
  yoon: string;
  time: number;
  audioUri?: string;
  aiResult?: {
    predictions?: Array<{ character: string; confidence: number }>;
    top3?: Array<{ character: string; confidence: number }>;
    isCorrect?: boolean;
    confidence?: number;
  };
}

interface ResultsScreenProps {
  results: TestResult[];
  testLevel: string;
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
  const accuracy = (correctCount / YOON_LIST.length) * 100;

  // 文字の種類を判定する関数
  const getCharacterType = (char: string) => {
    if (SEION_LIST.includes(char)) return 'せいおん';
    if (DAKUON_LIST.includes(char)) return 'だくおん';
    if (YOON_LIST.includes(char)) return 'ようおん';
    return 'その他';
  };

  // 結果を分類する関数（時間と文字種類を考慮）
  const getTimeCategory = (time: number, char: string) => {
    const charType = getCharacterType(char);

    // 添付画像の仕様に基づいた時間区分
    if (time <= 1.5) {
      // 上級（軽症）
      return { message: 'とてもじょうず！', color: '#4CAF50', bgColor: '#E8F5E9', level: 'じょうきゅう' };
    } else if (time <= 2.0) {
      // 中級
      return { message: 'じょうず！', color: '#2196F3', bgColor: '#E3F2FD', level: 'ちゅうきゅう' };
    } else if (time <= 2.5) {
      // 初級（重症）
      return { message: 'がんばったね', color: '#FF9800', bgColor: '#FFF3E0', level: 'しょきゅう' };
    } else {
      // 2.5秒以上
      return { message: 'もうすこし！', color: '#F44336', bgColor: '#FFEBEE', level: 'しょきゅう' };
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
        <View style={{ alignItems: 'center', marginBottom: 30, marginTop: 20 }}>
          <Text style={{ fontFamily: 'font-mplus-bold', fontSize: 24, color: '#333', marginBottom: 10 }}>てすとけっか</Text>
          <Text style={{ fontFamily: 'font-mplus-bold', fontSize: 18, color: '#666', marginBottom: 5 }}>
            レベル: {testLevel === 'intermediate' ? 'ちゅうきゅう' : 'しょきゅう'}
          </Text>
        </View>

        {groupedResults.map((group, groupIndex) => (
          <View key={`group-${groupIndex}`} style={{ marginBottom: 30 }}>
            <Text style={{ fontFamily: 'font-mplus-bold', fontSize: 18, color: '#333', marginBottom: 10, textAlign: 'center' }}>
              だい{groupIndex + 1}セット
            </Text>
            <View style={{ marginBottom: 20 }}>
              {group.map((result, index) => {
                const category = getTimeCategory(result.time, result.yoon);
                return (
                  <View
                    key={index}
                    style={{
                      backgroundColor: category.bgColor,
                      padding: 15,
                      marginBottom: 8,
                      borderRadius: 12,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: 'font-mplus-bold',
                          fontSize: 24,
                          marginRight: 15,
                          color: '#333',
                        }}>
                        {result.yoon}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: 'font-mplus',
                            fontSize: 16,
                            color: category.color,
                          }}>
                          {category.message}
                          {result.aiResult && (
                            <Text style={{ fontSize: 12 }}>
                              {result.aiResult.isCorrect ? ' ✓' : ' ✗'}
                            </Text>
                          )}
                        </Text>
                        <Text
                          style={{
                            fontFamily: 'font-mplus',
                            fontSize: 12,
                            color: '#666',
                          }}>
                          {getCharacterType(result.yoon)}・{category.level}
                        </Text>
                        {result.aiResult?.top3 && result.aiResult.top3.length > 0 && (
                          <View style={{ marginTop: 2 }}>
                            <Text
                              style={{
                                fontFamily: 'font-mplus',
                                fontSize: 9,
                                color: '#999',
                              }}>
                              AI Top-3:
                            </Text>
                            {result.aiResult.top3.slice(0, 3).map((pred, i) => (
                              <Text
                                key={i}
                                style={{
                                  fontFamily: 'font-mplus',
                                  fontSize: 8,
                                  color: i === 0 ? '#666' : '#999',
                                }}>
                                {i+1}. {pred.character} ({(pred.confidence * 100).toFixed(1)}%)
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                    <Text
                      style={{
                        fontFamily: 'font-mplus',
                        fontSize: 14,
                        color: '#666',
                      }}>
                      {result.time.toFixed(2)}秒
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

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

              // テストレベルに応じて適切な画面に遷移
              if (testLevel === 'intermediate') {
                router.replace('/screens/intermediate');
              } else {
                router.replace('/screens/beginner');
              }
            } catch (error) {
              console.error('画面遷移エラー:', error);
              Alert.alert('エラー', 'つぎの がめんに すすめませんでした');
            }
          }}
          style={{
            backgroundColor: '#41644A',
            padding: 15,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 20,
            marginBottom: 30,
          }}>
          <Text style={{ color: '#FFF', fontFamily: 'font-mplus-bold', fontSize: 16 }}>つぎへすすむ</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}