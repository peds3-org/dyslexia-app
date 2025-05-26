import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Mission } from '@src/types/cbt';
import cbtService from '@src/services/cbtService';
import { supabase } from '@src/lib/supabase';

interface MissionsListProps {
  onMissionSelected?: (mission: Mission) => void;
}

const MissionsList: React.FC<MissionsListProps> = ({ onMissionSelected }) => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    try {
      setIsLoading(true);

      // 現在のユーザーIDを取得
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (!userId) {
        console.error('ユーザーIDが取得できませんでした');
        return;
      }

      // 今日のミッションを取得
      const todayMissions = await cbtService.getTodayMissions(userId);
      setMissions(todayMissions);
    } catch (error) {
      console.error('ミッションの取得に失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderRewardIcon = (rewardType: 'もじたま' | 'にんじゃどうぐ' | 'タイトル') => {
    switch (rewardType) {
      case 'もじたま':
        return <MaterialCommunityIcons name='alpha-a-circle' size={24} color='#FF9800' />;
      case 'にんじゃどうぐ':
        return <MaterialCommunityIcons name='shuriken' size={24} color='#2196F3' />;
      case 'タイトル':
        return <MaterialCommunityIcons name='certificate' size={24} color='#4CAF50' />;
      default:
        return <MaterialCommunityIcons name='gift' size={24} color='#9C27B0' />;
    }
  };

  const renderMissionItem = ({ item }: { item: Mission }) => (
    <TouchableOpacity
      onPress={() => onMissionSelected && onMissionSelected(item)}
      style={{
        backgroundColor: item.isCompleted ? '#E8F5E9' : '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: item.isCompleted ? '#4CAF50' : '#E0E0E0',
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: item.isCompleted ? '#C8E6C9' : '#FFE0B2',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
          }}>
          {item.isCompleted ? (
            <MaterialCommunityIcons name='check' size={24} color='#4CAF50' />
          ) : (
            <Text
              style={{
                fontFamily: 'Zen-B',
                fontSize: 16,
                color: '#FF9800',
              }}>
              {Math.floor((item.currentCount / item.targetCount) * 100)}%
            </Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: 'Zen-B',
              fontSize: 16,
              color: '#333333',
              marginBottom: 4,
            }}>
            {item.title}
          </Text>

          <Text
            style={{
              fontFamily: 'Zen-R',
              fontSize: 14,
              color: '#757575',
            }}>
            {item.description}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 8,
            }}>
            <View
              style={{
                flex: 1,
                height: 8,
                backgroundColor: '#F5F5F5',
                borderRadius: 4,
                overflow: 'hidden',
              }}>
              <View
                style={{
                  width: `${Math.min(100, (item.currentCount / item.targetCount) * 100)}%`,
                  height: '100%',
                  backgroundColor: item.isCompleted ? '#4CAF50' : '#FF9800',
                  borderRadius: 4,
                }}
              />
            </View>

            <Text
              style={{
                fontFamily: 'Zen-R',
                fontSize: 12,
                color: '#757575',
                marginLeft: 8,
              }}>
              {item.currentCount}/{item.targetCount}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginTop: 8,
        }}>
        <Text
          style={{
            fontFamily: 'Zen-R',
            fontSize: 12,
            color: '#757575',
            marginRight: 4,
          }}>
          ほうしゅう:
        </Text>
        {renderRewardIcon(item.rewardType)}
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View
        style={{
          padding: 16,
          backgroundColor: '#FFF9E5',
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          height: 200,
        }}>
        <ActivityIndicator size='large' color='#41644A' />
        <Text
          style={{
            fontFamily: 'Zen-R',
            fontSize: 14,
            color: '#757575',
            marginTop: 16,
          }}>
          にんむを よみこんでいます...
        </Text>
      </View>
    );
  }

  if (missions.length === 0) {
    return (
      <View
        style={{
          padding: 16,
          backgroundColor: '#FFF9E5',
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          height: 150,
        }}>
        <MaterialCommunityIcons name='magnify' size={48} color='#757575' />
        <Text
          style={{
            fontFamily: 'Zen-R',
            fontSize: 16,
            color: '#757575',
            marginTop: 16,
            textAlign: 'center',
          }}>
          きょうのにんむはありません
        </Text>
      </View>
    );
  }

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
        きょうのにんむ
      </Text>

      <FlatList
        data={missions}
        renderItem={renderMissionItem}
        keyExtractor={(item) => item.id}
        style={{ maxHeight: 350 }}
        nestedScrollEnabled
        scrollEnabled={true}
        showsVerticalScrollIndicator={true}
        initialNumToRender={5}
        maxToRenderPerBatch={10}
        windowSize={5}
      />

      <TouchableOpacity
        onPress={loadMissions}
        style={{
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 12,
        }}>
        <MaterialCommunityIcons name='refresh' size={20} color='#41644A' />
        <Text
          style={{
            fontFamily: 'Zen-R',
            fontSize: 14,
            color: '#41644A',
            marginLeft: 4,
          }}>
          こうしん
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default MissionsList;
