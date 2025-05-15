import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Image, FlatList } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import aiService, { AIClassificationResult } from '../../src/services/aiService';
import { supabase } from '../../src/lib/supabase';
import soundService from '../../src/services/soundService';

// テスト用のひらがな文字リスト
const HIRAGANA_CHARACTERS = [
  'あ',
  'い',
  'う',
  'え',
  'お',
  'か',
  'き',
  'く',
  'け',
  'こ',
  'さ',
  'し',
  'す',
  'せ',
  'そ',
  'た',
  'ち',
  'つ',
  'て',
  'と',
  'な',
  'に',
  'ぬ',
  'ね',
  'の',
  'は',
  'ひ',
  'ふ',
  'へ',
  'ほ',
  'ま',
  'み',
  'む',
  'め',
  'も',
  'や',
  'ゆ',
  'よ',
  'ら',
  'り',
  'る',
  'れ',
  'ろ',
  'わ',
  'を',
  'ん',
];

// AIセットアップ画面
export default function AISetupScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [setupStep, setSetupStep] = useState(1);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<AIClassificationResult[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // 画面表示時にAIの状態を確認
  useEffect(() => {
    checkAIStatus();
    createTestSession();
  }, []);

  // テスト用のセッションを作成
  const createTestSession = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      if (!userId) {
        console.error('ユーザーIDが取得できません');
        return;
      }

      // 学習セッションを作成
      const { data, error } = await supabase
        .from('learning_sessions')
        .insert({
          user_id: userId,
          session_type: 'ai_test',
          duration_seconds: 0,
          characters_practiced: 0,
          correct_attempts: 0,
          total_attempts: 0,
          accuracy_rate: 0,
          session_data: { test: true },
        })
        .select('id')
        .single();

      if (error) {
        console.error('セッション作成エラー:', error);
      } else if (data) {
        console.log('テストセッションを作成しました:', data.id);
        setSessionId(data.id);
        aiService.setCurrentSessionId(data.id);
      }
    } catch (error) {
      console.error('セッション作成中の例外:', error);
    }
  };

  // AIサービスの状態確認
  const checkAIStatus = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      // AIサービスの状態を確認
      const { state, error } = aiService.getState();
      const initialized = state === 'ready';
      setIsInitialized(initialized);

      if (initialized) {
        console.log('AIモデルは初期化済みです');
        setSetupStep(2);
      } else {
        console.log('AIモデルは初期化されていません');
        if (error) {
          setErrorMessage(`AIモデルの初期化に問題があります: ${error}`);
        } else {
          setErrorMessage('AIモデルが初期化されていません。セットアップを行ってください。');
        }
      }
    } catch (error) {
      console.error('状態確認エラー:', error);
      setErrorMessage('AIの状態確認中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // AIサービスの初期化
  const initializeAI = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      // AIサービスを初期化
      const success = await aiService.initialize();
      const { state, error } = aiService.getState();
      setIsInitialized(state === 'ready');

      if (success) {
        console.log('AIモデルの初期化に成功しました');
        // 次のステップへ
        setSetupStep(2);
      } else {
        console.error('AIモデルの初期化に失敗しました');
        setErrorMessage(`AIモデルの初期化に失敗しました: ${error || 'もう一度試してください'}`);
      }
    } catch (error) {
      console.error('初期化エラー:', error);
      setErrorMessage('初期化中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 文字を選択
  const selectCharacter = (character: string) => {
    setSelectedCharacter(character);
    // 音声再生
    soundService.playCharacterSound(character);
  };

  // AIモデルのテスト
  const testAIModel = async () => {
    try {
      if (!selectedCharacter) {
        Alert.alert('ちゅうい', 'じをえらんでください');
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      // モデルを使って推論を実行
      const result = await aiService.classifySpeech(selectedCharacter);

      if (result) {
        // 結果を配列の先頭に追加
        setTestResults((prevResults) => [result, ...prevResults]);

        Alert.alert(
          'せいこう',
          `もじ: ${result.character}\nAIがよそくしました: ${result.level}\nかくしんど: ${Math.round(result.confidence * 100)}%\nしょりじかん: ${
            result.processingTimeMs
          }ミリびょう`
        );
      } else {
        setErrorMessage('AIモデルのテストに失敗しました');
      }
    } catch (error) {
      console.error('AIテストエラー:', error);
      setErrorMessage('AIテスト中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // Supabaseからの保存結果を確認
  const checkSavedResults = async () => {
    try {
      setIsLoading(true);

      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      if (!userId) {
        setErrorMessage('ユーザーIDが取得できません');
        return;
      }

      // 最新の分類結果を10件取得
      const { data, error } = await supabase
        .from('ai_classifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('データ取得エラー:', error);
        setErrorMessage('分類結果の取得に失敗しました');
      } else {
        console.log('分類結果:', data);
        Alert.alert(
          'ほぞんけっか',
          `${data.length}けんのデータがみつかりました\n\n${data
            .slice(0, 3)
            .map((item) => `もじ: ${item.character || 'なし'}\nかくしんど: ${Math.round(item.confidence * 100)}%`)
            .join('\n\n')}`
        );
      }
    } catch (error) {
      console.error('データ確認エラー:', error);
      setErrorMessage('データ確認中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // セットアップの完了
  const finishSetup = () => {
    // ホーム画面に戻る
    router.push('/');
  };

  // セットアップのステップに応じた内容を表示
  const renderSetupStep = () => {
    switch (setupStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>ステップ 1: AIモデルの ローディング</Text>
            <Text style={styles.stepDescription}>
              AIモデルを つかうには、ローディング する ひつようが あります。 したのボタンを おして ローディングしてください。
            </Text>
            <TouchableOpacity style={[styles.button, isLoading ? styles.buttonDisabled : null]} onPress={initializeAI} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color='#FFFFFF' size='small' />
              ) : (
                <>
                  <MaterialCommunityIcons name='brain' size={22} color='#FFFFFF' />
                  <Text style={styles.buttonText}>AIをローディングする</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>ステップ 2: AIのテスト</Text>
            <Text style={styles.stepDescription}>AIモデルの ローディングに せいこうしました！ じをえらんで いってみましょう。</Text>

            <Text style={styles.subtitle}>テストする もじをえらんでください:</Text>

            <View style={styles.charactersContainer}>
              <FlatList
                data={HIRAGANA_CHARACTERS}
                numColumns={7}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.characterButton, selectedCharacter === item && styles.selectedCharacter]}
                    onPress={() => selectCharacter(item)}>
                    <Text style={[styles.characterText, selectedCharacter === item && styles.selectedCharacterText]}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            <TouchableOpacity style={[styles.testButton, isLoading ? styles.buttonDisabled : null]} onPress={testAIModel} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color='#FFFFFF' size='small' />
              ) : (
                <>
                  <MaterialCommunityIcons name='microphone' size={22} color='#FFFFFF' />
                  <Text style={styles.buttonText}>AIをテストする</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkButton} onPress={checkSavedResults}>
              <MaterialCommunityIcons name='database-check' size={22} color='#FFFFFF' />
              <Text style={styles.buttonText}>ほぞんデータをみる</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={finishSetup}>
              <MaterialCommunityIcons name='check' size={22} color='#FFFFFF' />
              <Text style={styles.buttonText}>かんりょう</Text>
            </TouchableOpacity>

            {testResults.length > 0 && (
              <View style={styles.resultsContainer}>
                <Text style={styles.subtitle}>テストけっか:</Text>
                {testResults.map((result, index) => (
                  <View key={index} style={styles.resultItem}>
                    <Text style={styles.resultText}>
                      もじ: {result.character || 'なし'} - {result.level}
                      (かくしんど: {Math.round(result.confidence * 100)}%)
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name='arrow-left' size={24} color='#41644A' />
          <Text style={styles.backButtonText}>もどる</Text>
        </TouchableOpacity>

        <Text style={styles.title}>AIのせってい</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.logoContainer}>
          <Image source={require('../../assets/temp/elder-worried.png')} style={styles.logo} />
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>AIモデルの じょうたい</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusIndicator, isInitialized ? styles.statusOnline : styles.statusOffline]} />
            <Text style={styles.statusText}>{isInitialized ? 'ローディング かんりょう' : 'ローディング されていません'}</Text>
          </View>

          {sessionId && (
            <View style={styles.statusRow}>
              <MaterialCommunityIcons name='database' size={12} color='#4CAF50' style={styles.sessionIcon} />
              <Text style={styles.statusText}>セッションID: {sessionId.slice(0, 8)}...</Text>
            </View>
          )}
        </View>

        {errorMessage && (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name='alert-circle-outline' size={24} color='#D32F2F' />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {renderSetupStep()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontFamily: 'font-mplus',
    fontSize: 16,
    color: '#41644A',
    marginLeft: 4,
  },
  title: {
    fontFamily: 'font-mplus-bold',
    fontSize: 18,
    color: '#333333',
    marginLeft: 16,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
  },
  statusContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusTitle: {
    fontFamily: 'font-mplus-bold',
    fontSize: 16,
    color: '#333333',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  sessionIcon: {
    marginRight: 8,
  },
  statusOnline: {
    backgroundColor: '#4CAF50',
  },
  statusOffline: {
    backgroundColor: '#F44336',
  },
  statusText: {
    fontFamily: 'font-mplus',
    fontSize: 14,
    color: '#666666',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'font-mplus',
    fontSize: 14,
    color: '#D32F2F',
    marginLeft: 8,
    flex: 1,
  },
  stepContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stepTitle: {
    fontFamily: 'font-mplus-bold',
    fontSize: 18,
    color: '#333333',
    marginBottom: 12,
  },
  stepDescription: {
    fontFamily: 'font-mplus',
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
    lineHeight: 20,
  },
  subtitle: {
    fontFamily: 'font-mplus-bold',
    fontSize: 16,
    color: '#41644A',
    marginTop: 16,
    marginBottom: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    fontFamily: 'font-mplus',
    fontSize: 14,
    color: '#4A6572',
    marginLeft: 8,
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#41644A',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: 'font-mplus-bold',
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7B8B6F',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  resetButtonText: {
    fontFamily: 'font-mplus',
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7B8B6F',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A6572',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  charactersContainer: {
    marginVertical: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 8,
  },
  characterButton: {
    width: 40,
    height: 40,
    margin: 4,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedCharacter: {
    backgroundColor: '#41644A',
    borderColor: '#41644A',
  },
  characterText: {
    fontFamily: 'font-mplus',
    fontSize: 18,
    color: '#333333',
  },
  selectedCharacterText: {
    color: '#FFFFFF',
  },
  resultsContainer: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
  },
  resultItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#41644A',
  },
  resultText: {
    fontFamily: 'font-mplus',
    fontSize: 14,
    color: '#333333',
  },
});
