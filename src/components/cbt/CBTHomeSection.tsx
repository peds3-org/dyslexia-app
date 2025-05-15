import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MoodSelector from './MoodSelector';
import ThinkingCardSelector from './ThinkingCardSelector';
import MissionsList from './MissionsList';
import LoginBonusModal from './LoginBonusModal';
import { MoodType, CharacterMood, ThinkingCard, Mission } from '../../../app/types/cbt';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [currentSection, setCurrentSection] = useState(SECTIONS.WELCOME);
  const [showLoginBonus, setShowLoginBonus] = useState(false);
  const [hasCompletedMood, setHasCompletedMood] = useState(false);
  const [hasCompletedCard, setHasCompletedCard] = useState(false);

  useEffect(() => {
    // アプリ起動時にログインボーナスを表示するかどうかをチェック
    checkLoginBonus();
    // 当日の状態をチェック
    checkTodayStatus();
  }, []);

  const checkLoginBonus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastShownDate = await AsyncStorage.getItem('login_bonus_last_shown');

      if (lastShownDate !== today) {
        // 今日はまだ表示していない場合、ログインボーナスを表示
        setShowLoginBonus(true);
        // 表示日を保存
        await AsyncStorage.setItem('login_bonus_last_shown', today);
      }
    } catch (error) {
      console.error('ログインボーナスチェックエラー:', error);
    }
  };

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
        padding: 20,
        backgroundColor: '#FFF9E5',
        borderRadius: 16,
        marginBottom: 20,
      }}>
      <Text
        style={{
          fontSize: 24,
          fontFamily: 'Zen-B',
          color: '#41644A',
          textAlign: 'center',
          marginBottom: 16,
        }}>
        おはよう！
      </Text>

      <Text
        style={{
          fontSize: 16,
          fontFamily: 'Zen-R',
          color: '#757575',
          textAlign: 'center',
          marginBottom: 24,
        }}>
        きょうも いっしょに がんばろう！ まずは きぶんを おしえてね
      </Text>

      <TouchableOpacity
        onPress={() => setCurrentSection(SECTIONS.MOOD)}
        style={{
          backgroundColor: '#41644A',
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 24,
          alignItems: 'center',
          alignSelf: 'center',
        }}>
        <Text
          style={{
            fontFamily: 'Zen-B',
            fontSize: 16,
            color: '#FFFFFF',
          }}>
          きょうの きぶんを えらぶ
        </Text>
      </TouchableOpacity>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginTop: 24,
        }}>
        <TouchableOpacity
          onPress={() => setShowLoginBonus(true)}
          style={{
            alignItems: 'center',
          }}>
          <MaterialCommunityIcons name='gift' size={32} color='#FF9800' />
          <Text
            style={{
              fontFamily: 'Zen-R',
              fontSize: 12,
              color: '#757575',
              marginTop: 4,
            }}>
            ログインボーナス
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentSection(SECTIONS.MISSIONS)}
          style={{
            alignItems: 'center',
          }}>
          <MaterialCommunityIcons name='flag' size={32} color='#2196F3' />
          <Text
            style={{
              fontFamily: 'Zen-R',
              fontSize: 12,
              color: '#757575',
              marginTop: 4,
            }}>
            きょうのにんむ
          </Text>
        </TouchableOpacity>
      </View>
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
      <LoginBonusModal visible={showLoginBonus} onClose={() => setShowLoginBonus(false)} />

      {/* 進捗ナビゲーション */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 16,
          paddingHorizontal: 8,
        }}>
        <TouchableOpacity
          onPress={() => setCurrentSection(SECTIONS.WELCOME)}
          style={{
            alignItems: 'center',
            opacity: currentSection === SECTIONS.WELCOME ? 1 : 0.6,
          }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: currentSection === SECTIONS.WELCOME ? '#FFE0B2' : '#F5F5F5',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: currentSection === SECTIONS.WELCOME ? 2 : 0,
              borderColor: '#FF9800',
            }}>
            <MaterialCommunityIcons name='home' size={20} color={currentSection === SECTIONS.WELCOME ? '#FF9800' : '#757575'} />
          </View>
          <Text
            style={{
              fontFamily: 'Zen-R',
              fontSize: 10,
              color: currentSection === SECTIONS.WELCOME ? '#FF9800' : '#757575',
              marginTop: 2,
            }}>
            ホーム
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentSection(SECTIONS.MOOD)}
          style={{
            alignItems: 'center',
            opacity: currentSection === SECTIONS.MOOD ? 1 : hasCompletedMood ? 0.8 : 0.6,
          }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: currentSection === SECTIONS.MOOD ? '#FFE0B2' : hasCompletedMood ? '#E8F5E9' : '#F5F5F5',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: currentSection === SECTIONS.MOOD ? 2 : 0,
              borderColor: '#FF9800',
            }}>
            {hasCompletedMood ? (
              <MaterialCommunityIcons name='check' size={20} color='#4CAF50' />
            ) : (
              <MaterialCommunityIcons name='emoticon-outline' size={20} color={currentSection === SECTIONS.MOOD ? '#FF9800' : '#757575'} />
            )}
          </View>
          <Text
            style={{
              fontFamily: 'Zen-R',
              fontSize: 10,
              color: currentSection === SECTIONS.MOOD ? '#FF9800' : hasCompletedMood ? '#4CAF50' : '#757575',
              marginTop: 2,
            }}>
            きぶん
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => hasCompletedMood && setCurrentSection(SECTIONS.THINKING_CARD)}
          style={{
            alignItems: 'center',
            opacity: currentSection === SECTIONS.THINKING_CARD ? 1 : hasCompletedCard ? 0.8 : hasCompletedMood ? 0.6 : 0.3,
          }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: currentSection === SECTIONS.THINKING_CARD ? '#FFE0B2' : hasCompletedCard ? '#E8F5E9' : '#F5F5F5',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: currentSection === SECTIONS.THINKING_CARD ? 2 : 0,
              borderColor: '#FF9800',
            }}>
            {hasCompletedCard ? (
              <MaterialCommunityIcons name='check' size={20} color='#4CAF50' />
            ) : (
              <MaterialCommunityIcons name='thought-bubble' size={20} color={currentSection === SECTIONS.THINKING_CARD ? '#FF9800' : '#757575'} />
            )}
          </View>
          <Text
            style={{
              fontFamily: 'Zen-R',
              fontSize: 10,
              color: currentSection === SECTIONS.THINKING_CARD ? '#FF9800' : hasCompletedCard ? '#4CAF50' : '#757575',
              marginTop: 2,
            }}>
            かんがえかた
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentSection(SECTIONS.MISSIONS)}
          style={{
            alignItems: 'center',
            opacity: currentSection === SECTIONS.MISSIONS ? 1 : 0.6,
          }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: currentSection === SECTIONS.MISSIONS ? '#FFE0B2' : '#F5F5F5',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: currentSection === SECTIONS.MISSIONS ? 2 : 0,
              borderColor: '#FF9800',
            }}>
            <MaterialCommunityIcons name='flag' size={20} color={currentSection === SECTIONS.MISSIONS ? '#FF9800' : '#757575'} />
          </View>
          <Text
            style={{
              fontFamily: 'Zen-R',
              fontSize: 10,
              color: currentSection === SECTIONS.MISSIONS ? '#FF9800' : '#757575',
              marginTop: 2,
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
