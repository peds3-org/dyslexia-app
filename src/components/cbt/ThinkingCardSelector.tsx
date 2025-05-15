import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, FlatList, Modal, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThinkingCard, THINKING_CARDS } from '../../../app/types/cbt';
import cbtService from '../../services/cbtService';
import { supabase } from '../../lib/supabase';

interface ThinkingCardSelectorProps {
  onCardSelected?: (card: ThinkingCard) => void;
  onComplete?: () => void;
}

const ThinkingCardSelector: React.FC<ThinkingCardSelectorProps> = ({ onCardSelected, onComplete }) => {
  const [selectedCard, setSelectedCard] = useState<ThinkingCard | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailCard, setDetailCard] = useState<ThinkingCard | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCardSelect = (card: ThinkingCard) => {
    setSelectedCard(card);
  };

  const showCardDetail = (card: ThinkingCard) => {
    setDetailCard(card);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!selectedCard) return;

    try {
      setIsSubmitting(true);

      // 現在のユーザーIDを取得
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (!userId) {
        console.error('ユーザーIDが取得できませんでした');
        return;
      }

      // CBTサービスに考え方カードの選択を記録
      await cbtService.recordThinkingCard(userId, selectedCard.id);

      // ミッションの進捗も更新
      await cbtService.updateThinkingCardMission(userId);

      // 選択完了を通知
      if (onCardSelected) {
        onCardSelected(selectedCard);
      }

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('考え方カードの記録に失敗しました:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // カードアイテムのレンダリング
  const renderCardItem = ({ item }: { item: ThinkingCard }) => (
    <TouchableOpacity
      onPress={() => handleCardSelect(item)}
      onLongPress={() => showCardDetail(item)}
      style={{
        backgroundColor: selectedCard?.id === item.id ? '#E3F2FD' : '#F5F5F5',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: selectedCard?.id === item.id ? 3 : 1,
        borderColor: selectedCard?.id === item.id ? '#2196F3' : '#E0E0E0',
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#FFE0B2',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
          }}>
          <MaterialCommunityIcons name={item.iconName as any} size={24} color='#FF9800' />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: 'Zen-B',
              fontSize: 18,
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
        </View>

        {selectedCard?.id === item.id && <MaterialCommunityIcons name='check-circle' size={24} color='#4CAF50' />}
      </View>

      <TouchableOpacity
        onPress={() => showCardDetail(item)}
        style={{
          alignSelf: 'flex-end',
          marginTop: 8,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
        <Text
          style={{
            fontFamily: 'Zen-R',
            fontSize: 12,
            color: '#2196F3',
            marginRight: 4,
          }}>
          くわしく みる
        </Text>
        <MaterialCommunityIcons name='chevron-right' size={16} color='#2196F3' />
      </TouchableOpacity>
    </TouchableOpacity>
  );

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
        きょうの かんがえかた
      </Text>

      <Text
        style={{
          fontFamily: 'Zen-R',
          fontSize: 14,
          color: '#757575',
          marginBottom: 16,
          textAlign: 'center',
        }}>
        いまのじぶんに ぴったりな カードを えらんでね
      </Text>

      <FlatList data={THINKING_CARDS} renderItem={renderCardItem} keyExtractor={(item) => item.id} style={{ maxHeight: 400 }} nestedScrollEnabled />

      {/* 決定ボタン */}
      {selectedCard && (
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={{
            backgroundColor: '#41644A',
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 24,
            alignItems: 'center',
            marginTop: 16,
            opacity: isSubmitting ? 0.7 : 1,
          }}>
          <Text
            style={{
              fontFamily: 'Zen-B',
              fontSize: 16,
              color: '#FFFFFF',
            }}>
            これに する
          </Text>
        </TouchableOpacity>
      )}

      {/* 詳細モーダル */}
      <Modal animationType='slide' transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}>
          <View
            style={{
              width: '80%',
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 24,
              alignItems: 'center',
              elevation: 5,
            }}>
            {detailCard && (
              <>
                <MaterialCommunityIcons name={detailCard.iconName as any} size={48} color='#FF9800' />

                <Text
                  style={{
                    fontFamily: 'Zen-B',
                    fontSize: 22,
                    color: '#333333',
                    marginTop: 16,
                    marginBottom: 8,
                    textAlign: 'center',
                  }}>
                  {detailCard.title}
                </Text>

                <Text
                  style={{
                    fontFamily: 'Zen-R',
                    fontSize: 16,
                    color: '#757575',
                    marginBottom: 16,
                    textAlign: 'center',
                  }}>
                  {detailCard.description}
                </Text>

                <View
                  style={{
                    backgroundColor: '#E8F5E9',
                    padding: 16,
                    borderRadius: 8,
                    width: '100%',
                    marginBottom: 24,
                  }}>
                  <Text
                    style={{
                      fontFamily: 'Zen-B',
                      fontSize: 14,
                      color: '#4CAF50',
                      marginBottom: 8,
                    }}>
                    まえむきなかんがえかた:
                  </Text>

                  <Text
                    style={{
                      fontFamily: 'Zen-R',
                      fontSize: 16,
                      color: '#333333',
                    }}>
                    {detailCard.positiveReframe}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    handleCardSelect(detailCard);
                  }}
                  style={{
                    backgroundColor: '#41644A',
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 24,
                    marginBottom: 8,
                  }}>
                  <Text
                    style={{
                      fontFamily: 'Zen-B',
                      fontSize: 16,
                      color: '#FFFFFF',
                    }}>
                    このカードをえらぶ
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text
                    style={{
                      fontFamily: 'Zen-R',
                      fontSize: 14,
                      color: '#757575',
                    }}>
                    とじる
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ThinkingCardSelector;
