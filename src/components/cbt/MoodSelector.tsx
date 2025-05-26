import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MoodType, CharacterMood } from '@src/types/cbt';
import cbtService from '@src/services/cbtService';
import { supabase } from '@src/lib/supabase';

const moodIcons = {
  [MoodType.HAPPY]: 'emoticon-happy-outline',
  [MoodType.EXCITED]: 'emoticon-excited-outline',
  [MoodType.CALM]: 'emoticon-cool-outline',
  [MoodType.TIRED]: 'emoticon-dead-outline',
  [MoodType.SAD]: 'emoticon-sad-outline',
  [MoodType.FRUSTRATED]: 'emoticon-angry-outline',
  [MoodType.WORRIED]: 'emoticon-confused-outline',
  [MoodType.CONFUSED]: 'head-question-outline',
};

const characterImages = {
  [CharacterMood.HAPPY]: require('../../../assets/temp/ninja_syuriken_man.png'),
  [CharacterMood.ENERGETIC]: require('../../../assets/temp/ninja_syuriken_man.png'),
  [CharacterMood.RELAXED]: require('../../../assets/temp/ninja_syuriken_man.png'),
  [CharacterMood.SLEEPY]: require('../../../assets/temp/ninja_syuriken_man.png'),
  [CharacterMood.DETERMINED]: require('../../../assets/temp/ninja_syuriken_man.png'),
};

interface MoodSelectorProps {
  onMoodSelected?: (mood: MoodType, character: CharacterMood) => void;
  onComplete?: () => void;
}

const MoodSelector: React.FC<MoodSelectorProps> = ({ onMoodSelected, onComplete }) => {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterMood | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMoodSelect = (mood: MoodType) => {
    setSelectedMood(mood);
  };

  const handleCharacterSelect = (character: CharacterMood) => {
    setSelectedCharacter(character);
  };

  const handleSubmit = async () => {
    if (!selectedMood || !selectedCharacter) return;

    try {
      setIsSubmitting(true);

      // 現在のユーザーIDを取得
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (!userId) {
        console.error('ユーザーIDが取得できませんでした');
        return;
      }

      // CBTサービスに気分を記録
      await cbtService.recordMood(userId, selectedMood, selectedCharacter);

      // 選択完了を通知
      if (onMoodSelected) {
        onMoodSelected(selectedMood, selectedCharacter);
      }

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('気分の記録に失敗しました:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ padding: 16, backgroundColor: '#FFF9E5', borderRadius: 16 }}>
      <Text
        style={{
          fontSize: 22,
          fontFamily: 'Zen-B',
          textAlign: 'center',
          color: '#41644A',
          marginBottom: 16,
        }}>
        きょうは どんな きぶん？
      </Text>

      {/* 気分選択 */}
      <View style={{ marginBottom: 24 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
          {Object.values(MoodType).map((mood) => (
            <TouchableOpacity
              key={mood}
              onPress={() => handleMoodSelect(mood)}
              style={{
                alignItems: 'center',
                marginHorizontal: 10,
                opacity: selectedMood === mood ? 1 : 0.6,
                transform: [{ scale: selectedMood === mood ? 1.1 : 1 }],
              }}>
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: selectedMood === mood ? '#FFE0B2' : '#F5F5F5',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: selectedMood === mood ? 3 : 0,
                  borderColor: '#FF9800',
                }}>
                <MaterialCommunityIcons
                  name={(moodIcons[mood] as any) || 'emoticon-outline'}
                  size={32}
                  color={selectedMood === mood ? '#FF6D00' : '#757575'}
                />
              </View>
              <Text
                style={{
                  marginTop: 8,
                  fontFamily: 'Zen-B',
                  fontSize: 14,
                  color: selectedMood === mood ? '#FF6D00' : '#757575',
                }}>
                {mood}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* キャラクター選択 */}
      {selectedMood && (
        <>
          <Text
            style={{
              fontSize: 18,
              fontFamily: 'Zen-B',
              textAlign: 'center',
              color: '#41644A',
              marginBottom: 16,
            }}>
            どんな すがたに なりたい？
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
            {Object.values(CharacterMood).map((character) => (
              <TouchableOpacity
                key={character}
                onPress={() => handleCharacterSelect(character)}
                style={{
                  alignItems: 'center',
                  marginHorizontal: 10,
                  opacity: selectedCharacter === character ? 1 : 0.6,
                  transform: [{ scale: selectedCharacter === character ? 1.1 : 1 }],
                }}>
                <View
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 35,
                    backgroundColor: selectedCharacter === character ? '#E3F2FD' : '#F5F5F5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: selectedCharacter === character ? 3 : 0,
                    borderColor: '#2196F3',
                    overflow: 'hidden',
                  }}>
                  <Image source={characterImages[character]} style={{ width: 60, height: 60 }} resizeMode='contain' />
                </View>
                <Text
                  style={{
                    marginTop: 8,
                    fontFamily: 'Zen-B',
                    fontSize: 14,
                    color: selectedCharacter === character ? '#2196F3' : '#757575',
                  }}>
                  {character}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* 決定ボタン */}
      {selectedMood && selectedCharacter && (
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={{
            backgroundColor: '#41644A',
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 24,
            alignItems: 'center',
            marginTop: 24,
            opacity: isSubmitting ? 0.7 : 1,
          }}>
          <Text
            style={{
              fontFamily: 'Zen-B',
              fontSize: 16,
              color: '#FFFFFF',
            }}>
            けっていする
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default MoodSelector;
