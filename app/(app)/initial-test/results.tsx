import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@src/lib/supabase';
import stageService from '@src/services/stageService';
import { StageType } from '@src/types/progress';
import ResultsScreen from '@src/components/test/ResultsScreen';
import { TestResult, TestLevel, TestResultSummary } from '@src/types/initialTest';
import { YOON_LIST, DAKUON_LIST, SEION_LIST, TEST_CONFIG, STORAGE_KEYS } from '@src/constants/initialTest';

export default function InitialTestResults() {
  const router = useRouter();
  const [results, setResults] = useState<TestResult[]>([]);
  const [testLevel, setTestLevel] = useState<TestLevel>('beginner');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadResultsAndSave();
  }, []);

  const loadResultsAndSave = async () => {
    try {
      // AsyncStorageから結果を読み込む
      const savedData = await AsyncStorage.getItem(STORAGE_KEYS.TEST_RESULTS);
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

  const calculateTestLevel = (correctRate: number): TestLevel => {
    return correctRate >= TEST_CONFIG.CORRECT_RATE_THRESHOLD ? 'intermediate' : 'beginner';
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

      // 正解数の計算
      const correctAnswers = testResults.filter((result) => {
        if (result.aiResult && result.aiResult.isCorrect !== undefined) {
          return result.aiResult.isCorrect;
        }
        // AIが使用できない場合は時間で判定
        return result.time <= 2.5;
      });
      const correctRate = correctAnswers.length / testResults.length;

      // 平均時間の計算
      const averageTime = testResults.reduce((sum, result) => sum + result.time, 0) / testResults.length;

      // カテゴリ別の統計
      const seionResults = testResults.filter((r) => SEION_LIST.includes(r.yoon as any));
      const dakuonResults = testResults.filter((r) => DAKUON_LIST.includes(r.yoon as any));
      const yoonResults = testResults.filter((r) => YOON_LIST.includes(r.yoon as any));

      const seionAvg = seionResults.length > 0 ? seionResults.reduce((sum, r) => sum + r.time, 0) / seionResults.length : 0;
      const dakuonAvg = dakuonResults.length > 0 ? dakuonResults.reduce((sum, r) => sum + r.time, 0) / dakuonResults.length : 0;
      const yoonAvg = yoonResults.length > 0 ? yoonResults.reduce((sum, r) => sum + r.time, 0) / yoonResults.length : 0;

      // レベル判定
      const determinedLevel = calculateTestLevel(correctRate);
      setTestLevel(determinedLevel);

      // 結果サマリーを作成
      const resultSummary: TestResultSummary = {
        results: testResults,
        correctRate,
        averageTime,
        seionAvg,
        dakuonAvg,
        yoonAvg,
        determinedLevel,
        timestamp: currentTime,
      };

      // AsyncStorageに保存
      await AsyncStorage.setItem(STORAGE_KEYS.TEST_RESULTS, JSON.stringify(resultSummary));

      // データベースに保存
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

      // initial_test_resultsテーブルを更新
      const { error: updateError } = await supabase.from('initial_test_results').upsert({
        user_id: userId,
        is_completed: true,
        level: determinedLevel,
        completed_at: new Date().toISOString(),
        results: JSON.stringify(testResults),
      });

      if (updateError) {
        console.error('テスト完了状態の更新エラー:', updateError);
      }

      // ユーザープロフィールを更新
      const { error: profileUpdateError } = await supabase
        .from('user_profiles')
        .update({
          character_level: determinedLevel,
        })
        .eq('user_id', userId);

      if (profileUpdateError) {
        console.error('ユーザープロフィールのレベル更新エラー:', profileUpdateError);
      }

      // ステージを初期化
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
      YOON_LIST={Array.from(YOON_LIST)}
      SEION_LIST={Array.from(SEION_LIST)}
      DAKUON_LIST={Array.from(DAKUON_LIST)}
    />
  );
}
