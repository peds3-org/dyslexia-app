import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import MoodSelector from './MoodSelector';
import ThinkingCardSelector from './ThinkingCardSelector';
import MissionsList from './MissionsList';
import { MoodType, CharacterMood, ThinkingCard, Mission } from '@src/types/cbt';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@src/lib/supabase';
import authService from '@src/services/authService';

interface CBTHomeSectionProps {
  onComplete?: () => void;
}

const SECTIONS = {
  WELCOME: 'welcome',
  MOOD: 'mood',
  THINKING_CARD: 'thinking_card',
  MISSIONS: 'missions',
};

const CBTHomeSection: React.FC<CBTHomeSectionProps> = ({ onComplete }) => {
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState(SECTIONS.WELCOME);
  const [hasCompletedMood, setHasCompletedMood] = useState(false);
  const [hasCompletedCard, setHasCompletedCard] = useState(false);
  const [userLevel, setUserLevel] = useState<'beginner' | 'intermediate' | 'advanced' | null>(null);

  useEffect(() => {
    // 当日の状態をチェック
    checkTodayStatus();
    // ユーザーレベルを取得
    getUserLevel();
  }, []);

  const checkTodayStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // 今日の気分選択状態をチェック
      const moodCompleted = await AsyncStorage.getItem(`mood_completed_${today}`);
      if (moodCompleted === 'true') {
        setHasCompletedMood(true);
      }

      // 今日の考え方カード選択状態をチェック
      const cardCompleted = await AsyncStorage.getItem(`card_completed_${today}`);
      if (cardCompleted === 'true') {
        setHasCompletedCard(true);
      }
    } catch (error) {
      console.error('チェック状態のエラー:', error);
    }
  };

  const getUserLevel = async () => {
    try {
      const userId = authService.getUser()?.id;
      if (!userId) return;

      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('character_level')
        .eq('user_id', userId)
        .single();

      if (!error && userProfile) {
        setUserLevel(userProfile.character_level || 'beginner');
      }
    } catch (error) {
      console.error('ユーザーレベル取得エラー:', error);
    }
  };

  const handleGameStart = () => {
    if (!userLevel) return;
    
    // レベルに応じたゲームページへ遷移
    switch (userLevel) {
      case 'beginner':
        router.push('/(app)/beginner');
        break;
      case 'intermediate':
        router.push('/(app)/intermediate');
        break;
      case 'advanced':
        router.push('/(app)/advanced');
        break;
      default:
        router.push('/(app)/beginner');
    }
  };

  const handleMoodSelected = async (mood: MoodType, character: CharacterMood) => {
    const today = new Date().toISOString().split('T')[0];
    await AsyncStorage.setItem(`mood_completed_${today}`, 'true');
    setHasCompletedMood(true);

    // 気分選択後、考え方カード選択に進む
    setCurrentSection(SECTIONS.THINKING_CARD);
  };

  const handleMoodComplete = () => {
    // すでにhandleMoodSelectedで処理されているので何もしない
  };

  const handleCardSelected = async (card: ThinkingCard) => {
    const today = new Date().toISOString().split('T')[0];
    await AsyncStorage.setItem(`card_completed_${today}`, 'true');
    setHasCompletedCard(true);

    // 考え方カード選択後、ミッション一覧に進む
    setCurrentSection(SECTIONS.MISSIONS);
  };

  const handleCardComplete = () => {
    // すでにhandleCardSelectedで処理されているので何もしない
  };

  const handleMissionSelected = (mission: Mission) => {
    // ミッションが選択されたときの処理
    // 必要に応じて実装
  };

  const renderWelcomeSection = () => (
    <View
      style={{
        padding: 24,
        backgroundColor: '#FFE0F7',
        borderRadius: 32,
        marginBottom: 20,
        borderWidth: 4,
        borderColor: '#FF6EC7',
        shadowColor: '#FF6EC7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}>
      <Text
        style={{
          fontSize: 32,
          fontFamily: 'Zen-B',
          color: '#FF1493',
          textAlign: 'center',
          marginBottom: 16,
          textShadowColor: 'rgba(255, 20, 147, 0.3)',
          textShadowOffset: { width: 2, height: 2 },
          textShadowRadius: 4,
        }}>
        おはよう！✨
      </Text>

      <Text
        style={{
          fontSize: 18,
          fontFamily: 'Zen-R',
          color: '#8B008B',
          textAlign: 'center',
          marginBottom: 28,
          lineHeight: 28,
        }}>
        きょうも いっしょに がんばろう！{'\n'}まずは きぶんを おしえてね 🌟
      </Text>

      <TouchableOpacity
        onPress={() => setCurrentSection(SECTIONS.MOOD)}
        style={{
          backgroundColor: '#FF69B4',
          paddingVertical: 16,
          paddingHorizontal: 32,
          borderRadius: 32,
          alignItems: 'center',
          alignSelf: 'center',
          borderWidth: 3,
          borderColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 6,
          elevation: 6,
          transform: [{ scale: 1 }],
        }}>
        <Text
          style={{
            fontFamily: 'Zen-B',
            fontSize: 20,
            color: '#FFFFFF',
            textShadowColor: 'rgba(0, 0, 0, 0.2)',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 2,
          }}>
          きょうの きぶんを えらぶ 😊
        </Text>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', marginTop: 20, gap: 12, justifyContent: 'center' }}>
        <TouchableOpacity
          onPress={() => setCurrentSection(SECTIONS.MISSIONS)}
          style={{
            alignItems: 'center',
            backgroundColor: '#87CEEB',
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 24,
            borderWidth: 3,
            borderColor: '#FFFFFF',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 4,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name='flag' size={24} color='#FFFFFF' />
            <Text
              style={{
                fontFamily: 'Zen-B',
                fontSize: 15,
                color: '#FFFFFF',
                marginLeft: 6,
                textShadowColor: 'rgba(0, 0, 0, 0.2)',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2,
              }}>
              にんむ
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleGameStart}
          style={{
            alignItems: 'center',
            backgroundColor: '#32CD32',
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 24,
            borderWidth: 3,
            borderColor: '#FFFFFF',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 4,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name='gamepad-variant' size={24} color='#FFFFFF' />
            <Text
              style={{
                fontFamily: 'Zen-B',
                fontSize: 15,
                color: '#FFFFFF',
                marginLeft: 6,
                textShadowColor: 'rgba(0, 0, 0, 0.2)',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2,
              }}>
              ゲーム
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ゲームスタートボタン - 大きく目立つデザイン */}
      <TouchableOpacity
        onPress={handleGameStart}
        style={{
          marginTop: 24,
          alignSelf: 'center',
          backgroundColor: '#00CED1',
          paddingVertical: 20,
          paddingHorizontal: 48,
          borderRadius: 40,
          borderWidth: 4,
          borderColor: '#FFFFFF',
          shadowColor: '#00CED1',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
          elevation: 10,
          transform: [{ scale: 1 }],
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name='play-circle' size={36} color='#FFFFFF' />
          <Text
            style={{
              fontFamily: 'Zen-B',
              fontSize: 24,
              color: '#FFFFFF',
              marginLeft: 12,
              textShadowColor: 'rgba(0, 0, 0, 0.3)',
              textShadowOffset: { width: 2, height: 2 },
              textShadowRadius: 4,
            }}>
            ゲームスタート！
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderCurrentSection = () => {
    switch (currentSection) {
      case SECTIONS.WELCOME:
        return renderWelcomeSection();
      case SECTIONS.MOOD:
        return <MoodSelector onMoodSelected={handleMoodSelected} onComplete={handleMoodComplete} />;
      case SECTIONS.THINKING_CARD:
        return <ThinkingCardSelector onCardSelected={handleCardSelected} onComplete={handleCardComplete} />;
      case SECTIONS.MISSIONS:
        return <MissionsList onMissionSelected={handleMissionSelected} />;
      default:
        return renderWelcomeSection();
    }
  };

  return (
    <View style={{ marginBottom: 20 }}>
      {/* 進捗ナビゲーション - ポケモンスマイル風 */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 20,
          paddingHorizontal: 12,
          backgroundColor: '#FFFFFF',
          paddingVertical: 12,
          borderRadius: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 4,
        }}>
        <TouchableOpacity
          onPress={() => setCurrentSection(SECTIONS.WELCOME)}
          style={{
            alignItems: 'center',
            opacity: currentSection === SECTIONS.WELCOME ? 1 : 0.7,
          }}>
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: currentSection === SECTIONS.WELCOME ? '#FF69B4' : '#FFE0F7',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: currentSection === SECTIONS.WELCOME ? '#FFFFFF' : '#FF69B4',
              shadowColor: currentSection === SECTIONS.WELCOME ? '#FF69B4' : '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: currentSection === SECTIONS.WELCOME ? 0.3 : 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}>
            <MaterialCommunityIcons name='home' size={24} color={currentSection === SECTIONS.WELCOME ? '#FFFFFF' : '#FF69B4'} />
          </View>
          <Text
            style={{
              fontFamily: 'Zen-B',
              fontSize: 11,
              color: currentSection === SECTIONS.WELCOME ? '#FF69B4' : '#FF69B4',
              marginTop: 4,
            }}>
            ホーム
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentSection(SECTIONS.MOOD)}
          style={{
            alignItems: 'center',
            opacity: currentSection === SECTIONS.MOOD ? 1 : hasCompletedMood ? 0.9 : 0.7,
          }}>
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: currentSection === SECTIONS.MOOD ? '#FFD700' : hasCompletedMood ? '#90EE90' : '#FFF8DC',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: currentSection === SECTIONS.MOOD ? '#FFFFFF' : hasCompletedMood ? '#32CD32' : '#FFD700',
              shadowColor: currentSection === SECTIONS.MOOD ? '#FFD700' : '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: currentSection === SECTIONS.MOOD ? 0.3 : 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}>
            {hasCompletedMood ? (
              <MaterialCommunityIcons name='check-circle' size={28} color='#32CD32' />
            ) : (
              <MaterialCommunityIcons name='emoticon-happy' size={28} color={currentSection === SECTIONS.MOOD ? '#FFFFFF' : '#FFD700'} />
            )}
          </View>
          <Text
            style={{
              fontFamily: 'Zen-B',
              fontSize: 11,
              color: currentSection === SECTIONS.MOOD ? '#FFD700' : hasCompletedMood ? '#32CD32' : '#FFD700',
              marginTop: 4,
            }}>
            きぶん
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => hasCompletedMood && setCurrentSection(SECTIONS.THINKING_CARD)}
          style={{
            alignItems: 'center',
            opacity: currentSection === SECTIONS.THINKING_CARD ? 1 : hasCompletedCard ? 0.9 : hasCompletedMood ? 0.7 : 0.4,
          }}>
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: currentSection === SECTIONS.THINKING_CARD ? '#9370DB' : hasCompletedCard ? '#90EE90' : '#E6E6FA',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: currentSection === SECTIONS.THINKING_CARD ? '#FFFFFF' : hasCompletedCard ? '#32CD32' : '#9370DB',
              shadowColor: currentSection === SECTIONS.THINKING_CARD ? '#9370DB' : '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: currentSection === SECTIONS.THINKING_CARD ? 0.3 : 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}>
            {hasCompletedCard ? (
              <MaterialCommunityIcons name='check-circle' size={28} color='#32CD32' />
            ) : (
              <MaterialCommunityIcons name='thought-bubble' size={24} color={currentSection === SECTIONS.THINKING_CARD ? '#FFFFFF' : '#9370DB'} />
            )}
          </View>
          <Text
            style={{
              fontFamily: 'Zen-B',
              fontSize: 11,
              color: currentSection === SECTIONS.THINKING_CARD ? '#9370DB' : hasCompletedCard ? '#32CD32' : '#9370DB',
              marginTop: 4,
            }}>
            かんがえ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentSection(SECTIONS.MISSIONS)}
          style={{
            alignItems: 'center',
            opacity: currentSection === SECTIONS.MISSIONS ? 1 : 0.7,
          }}>
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: currentSection === SECTIONS.MISSIONS ? '#87CEEB' : '#E0FFFF',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: currentSection === SECTIONS.MISSIONS ? '#FFFFFF' : '#87CEEB',
              shadowColor: currentSection === SECTIONS.MISSIONS ? '#87CEEB' : '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: currentSection === SECTIONS.MISSIONS ? 0.3 : 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}>
            <MaterialCommunityIcons name='flag' size={24} color={currentSection === SECTIONS.MISSIONS ? '#FFFFFF' : '#87CEEB'} />
          </View>
          <Text
            style={{
              fontFamily: 'Zen-B',
              fontSize: 11,
              color: currentSection === SECTIONS.MISSIONS ? '#87CEEB' : '#87CEEB',
              marginTop: 4,
            }}>
            にんむ
          </Text>
        </TouchableOpacity>
      </View>

      {/* 現在のセクションを表示 */}
      {renderCurrentSection()}
    </View>
  );
};

export default CBTHomeSection;
