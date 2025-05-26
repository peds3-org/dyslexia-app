import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@src/lib/supabase';
import stageService from '@src/services/stageService';
import { StageType } from '@src/types/progress';
import ResultsScreen from '@src/components/test/ResultsScreen';

// 全ての拗音のリスト
const YOON_LIST = [
  'きゃ', 'きゅ', 'きょ',
  'しゃ', 'しゅ', 'しょ',
  'ちゃ', 'ちゅ', 'ちょ',
  'にゃ', 'にゅ', 'にょ',
  'ひゃ', 'ひゅ', 'ひょ',
  'みゃ', 'みゅ', 'みょ',
  'りゃ', 'りゅ', 'りょ',
  'ぎゃ', 'ぎゅ', 'ぎょ',
  'じゃ', 'じゅ', 'じょ',
  'びゃ', 'びゅ', 'びょ',
  'ぴゃ', 'ぴゅ', 'ぴょ',
];

// 濁音・半濁音のリスト
const DAKUON_LIST = [
  'が', 'ぎ', 'ぐ', 'げ', 'ご',
  'ざ', 'じ', 'ず', 'ぜ', 'ぞ',
  'だ', 'ぢ', 'づ', 'で', 'ど',
  'ば', 'び', 'ぶ', 'べ', 'ぼ',
  'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ',
];

// 清音のリスト
const SEION_LIST = [
  'あ', 'い', 'う', 'え', 'お',
  'か', 'き', 'く', 'け', 'こ',
  'さ', 'し', 'す', 'せ', 'そ',
  'た', 'ち', 'つ', 'て', 'と',
  'な', 'に', 'ぬ', 'ね', 'の',
  'は', 'ひ', 'ふ', 'へ', 'ほ',
  'ま', 'み', 'む', 'め', 'も',
  'や', 'ゆ', 'よ',
  'ら', 'り', 'る', 'れ', 'ろ',
  'わ', 'を', 'ん',
];

interface TestResult {
  yoon: string;
  time: number;
  audioUri?: string;
  aiResult?: {
    predictions?: Array<{ character: string; confidence: number }>;
    top3?: Array<{ character: string; confidence: number }>;
    isCorrect?: boolean;
    confidence?: number;
    processingTime?: number;
  };
}

export default function InitialTestResults() {
  const router = useRouter();
  const [results, setResults] = useState<TestResult[]>([]);
  const [testLevel, setTestLevel] = useState<'beginner' | 'intermediate'>('beginner');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadResultsAndSave();
  }, []);

  const loadResultsAndSave = async () => {
    try {
      // AsyncStorageから結果を読み込む
      const savedData = await AsyncStorage.getItem('initialTestResults');
      if (!savedData) {
        Alert.alert('エラー', 'テスト結果が見つかりません');
        router.back();
        return;
      }

      const { results: testResults } = JSON.parse(savedData);
      setResults(testResults);

      // データベースに保存
      await saveToDatabase(testResults);
      
      setIsLoading(false);
    } catch (error) {
      console.error('結果の読み込みエラー:', error);
      Alert.alert('エラー', '結果の読み込みに失敗しました');
      router.back();
    }
  };

  const saveToDatabase = async (testResults: TestResult[]) => {
    try {
      const currentTime = Date.now();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!sessionData.session?.user?.id) {
        throw new Error('ユーザーIDが取得できません');
      }

      const userId = sessionData.session.user.id;

      const correctAnswers = testResults.filter((result) => {
        if (result.aiResult && result.aiResult.isCorrect !== undefined) {
          return result.aiResult.isCorrect;
        } else {
          return result.time <= 2.5;
        }
      });
      const correctRate = correctAnswers.length / testResults.length;
      
      const aiResults = testResults.filter(r => r.aiResult);
      console.log('AI認識統計:', {
        総問題数: testResults.length,
        AI認識実行数: aiResults.length,
        AI正解数: aiResults.filter(r => r.aiResult?.isCorrect).length,
        平均信頼度: aiResults.reduce((sum, r) => sum + (r.aiResult?.confidence || 0), 0) / (aiResults.length || 1)
      });

      const averageTime = testResults.reduce((sum, result) => sum + result.time, 0) / testResults.length;

      const seionResults = testResults.filter((r) => SEION_LIST.includes(r.yoon));
      const dakuonResults = testResults.filter((r) => DAKUON_LIST.includes(r.yoon));
      const yoonResults = testResults.filter((r) => YOON_LIST.includes(r.yoon));

      const seionAvg = seionResults.length > 0 ? seionResults.reduce((sum, r) => sum + r.time, 0) / seionResults.length : 0;
      const dakuonAvg = dakuonResults.length > 0 ? dakuonResults.reduce((sum, r) => sum + r.time, 0) / dakuonResults.length : 0;
      const yoonAvg = yoonResults.length > 0 ? yoonResults.reduce((sum, r) => sum + r.time, 0) / yoonResults.length : 0;

      let determinedLevel: 'beginner' | 'intermediate';
      if (correctRate >= 1 / 3) {
        determinedLevel = 'intermediate';
        setTestLevel('intermediate');
      } else {
        determinedLevel = 'beginner';
        setTestLevel('beginner');
      }

      // 最終的な結果をAsyncStorageに保存
      await AsyncStorage.setItem(
        'initialTestResults',
        JSON.stringify({
          results: testResults,
          correctRate,
          averageTime,
          seionAvg,
          dakuonAvg,
          yoonAvg,
          determinedLevel,
          timestamp: currentTime,
        })
      );

      const { error: insertError } = await supabase.from('user_test_results').insert({
        user_id: userId,
        results: JSON.stringify(testResults),
        correct_rate: correctRate,
        average_time: averageTime,
        seion_avg: seionAvg,
        dakuon_avg: dakuonAvg,
        yoon_avg: yoonAvg,
        determined_level: determinedLevel,
        created_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      const { error: updateError } = await supabase.from('initial_test_results').upsert({
        user_id: userId,
        is_completed: true,
        level: determinedLevel,
        completed_at: new Date().toISOString(),
        results: JSON.stringify(testResults),
      });

      if (updateError) {
        console.error('テスト完了状態の更新エラー:', updateError);
      } else {
        console.log('テスト完了状態を更新しました: is_completed=true, level=' + determinedLevel);
      }

      const { error: profileUpdateError } = await supabase
        .from('user_profiles')
        .update({
          character_level: determinedLevel,
        })
        .eq('user_id', userId);

      if (profileUpdateError) {
        console.error('ユーザープロフィールのレベル更新エラー:', profileUpdateError);
      } else {
        console.log('ユーザープロフィールのレベルを更新しました: character_level=' + determinedLevel);
      }

      await stageService.initializeStageForUser(userId, determinedLevel === 'beginner' ? StageType.BEGINNER : StageType.INTERMEDIATE);
    } catch (error) {
      console.error('進捗データの保存エラー:', error);
      Alert.alert('エラー', '進捗データの保存に失敗しました');
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <ResultsScreen
      results={results}
      testLevel={testLevel}
      YOON_LIST={YOON_LIST}
      SEION_LIST={SEION_LIST}
      DAKUON_LIST={DAKUON_LIST}
    />
  );
}