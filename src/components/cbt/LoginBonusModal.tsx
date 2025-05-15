import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Image, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LoginBonus } from '../../../app/types/cbt';
import cbtService from '../../services/cbtService';
import { supabase } from '../../lib/supabase';

interface LoginBonusModalProps {
  visible: boolean;
  onClose: () => void;
}

const LoginBonusModal: React.FC<LoginBonusModalProps> = ({ visible, onClose }) => {
  const [loginBonus, setLoginBonus] = useState<LoginBonus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [collectingRewardId, setCollectingRewardId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadLoginBonus();
    }
  }, [visible]);

  const loadLoginBonus = async () => {
    try {
      setIsLoading(true);

      // 現在のユーザーIDを取得
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (!userId) {
        console.error('ユーザーIDが取得できませんでした');
        return;
      }

      // ログインボーナスを取得・処理
      const bonus = await cbtService.processLoginBonus(userId);
      setLoginBonus(bonus);
    } catch (error) {
      console.error('ログインボーナスの取得に失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCollectReward = async (rewardId: string) => {
    try {
      setCollectingRewardId(rewardId);

      // 現在のユーザーIDを取得
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (!userId || !loginBonus) {
        console.error('ユーザーIDまたはログインボーナスデータがありません');
        return;
      }

      // 報酬を受け取る
      const success = await cbtService.collectLoginReward(userId, rewardId);

      if (success) {
        // 報酬を受け取り済みにする（UIを更新）
        const updatedBonus = { ...loginBonus };
        const reward = updatedBonus.rewards.find((r) => r.id === rewardId);
        if (reward) {
          reward.isCollected = true;
        }
        setLoginBonus(updatedBonus);
      }
    } catch (error) {
      console.error('報酬の受け取りに失敗しました:', error);
    } finally {
      setCollectingRewardId(null);
    }
  };

  const renderRewardIcon = (type: 'もじたま' | 'にんじゃどうぐ' | 'タイトル') => {
    switch (type) {
      case 'もじたま':
        return <MaterialCommunityIcons name='alpha-a-circle' size={32} color='#FF9800' />;
      case 'にんじゃどうぐ':
        return <MaterialCommunityIcons name='shuriken' size={32} color='#2196F3' />;
      case 'タイトル':
        return <MaterialCommunityIcons name='certificate' size={32} color='#4CAF50' />;
      default:
        return <MaterialCommunityIcons name='gift' size={32} color='#9C27B0' />;
    }
  };

  return (
    <Modal animationType='fade' transparent={true} visible={visible} onRequestClose={onClose}>
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
            maxHeight: '70%', // 画面の70%までに制限
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            alignItems: 'center',
            elevation: 5,
          }}>
          {/* 閉じるボタンを上部に配置 */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 10,
              backgroundColor: '#F5F5F5',
              borderRadius: 20,
              padding: 8,
            }}>
            <MaterialCommunityIcons name='close' size={24} color='#757575' />
          </TouchableOpacity>

          <Text
            style={{
              fontFamily: 'Zen-B',
              fontSize: 20,
              color: '#41644A',
              marginBottom: 8,
              marginTop: 10,
            }}>
            ログインボーナス！
          </Text>

          {isLoading ? (
            <ActivityIndicator size='large' color='#41644A' style={{ marginVertical: 24 }} />
          ) : loginBonus ? (
            <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginVertical: 12,
                }}>
                <View
                  style={{
                    backgroundColor: '#E3F2FD',
                    padding: 10,
                    borderRadius: 12,
                    marginRight: 12,
                  }}>
                  <Text
                    style={{
                      fontFamily: 'Zen-B',
                      fontSize: 28,
                      color: '#2196F3',
                    }}>
                    {loginBonus.daysInRow}
                  </Text>
                </View>

                <View>
                  <Text
                    style={{
                      fontFamily: 'Zen-B',
                      fontSize: 14,
                      color: '#333333',
                    }}>
                    れんぞく ログイン にち！
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Zen-R',
                      fontSize: 12,
                      color: '#757575',
                    }}>
                    これまでに {loginBonus.totalLogins}かい ログインしたよ
                  </Text>
                </View>
              </View>

              <View
                style={{
                  width: '100%',
                  marginVertical: 12,
                }}>
                <Text
                  style={{
                    fontFamily: 'Zen-B',
                    fontSize: 16,
                    color: '#41644A',
                    marginBottom: 10,
                  }}>
                  もらえるプレゼント:
                </Text>

                {loginBonus.rewards.map((reward) => (
                  <View
                    key={reward.id}
                    style={{
                      backgroundColor: reward.isCollected ? '#F5F5F5' : '#FFF9E5',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      opacity: reward.isCollected ? 0.7 : 1,
                    }}>
                    <View
                      style={{
                        marginRight: 12,
                      }}>
                      {renderRewardIcon(reward.type)}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: 'Zen-B',
                          fontSize: 14,
                          color: '#333333',
                          marginBottom: 2,
                        }}>
                        {reward.type}
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'Zen-R',
                          fontSize: 12,
                          color: '#757575',
                        }}>
                        {reward.description}
                      </Text>
                    </View>

                    {reward.isCollected ? (
                      <MaterialCommunityIcons name='check-circle' size={24} color='#4CAF50' />
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleCollectReward(reward.id)}
                        disabled={collectingRewardId === reward.id}
                        style={{
                          backgroundColor: '#41644A',
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          borderRadius: 12,
                          opacity: collectingRewardId === reward.id ? 0.7 : 1,
                        }}>
                        {collectingRewardId === reward.id ? (
                          <ActivityIndicator size='small' color='#FFFFFF' />
                        ) : (
                          <Text
                            style={{
                              fontFamily: 'Zen-B',
                              fontSize: 12,
                              color: '#FFFFFF',
                            }}>
                            うけとる
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              {/* 下部の閉じるボタン - サイズを大きくして目立たせる */}
              <TouchableOpacity
                onPress={onClose}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 24,
                  borderRadius: 20,
                  backgroundColor: '#41644A',
                  marginTop: 8,
                  marginBottom: 16,
                  alignSelf: 'center',
                }}>
                <Text
                  style={{
                    fontFamily: 'Zen-B',
                    fontSize: 16,
                    color: '#FFFFFF',
                  }}>
                  とじる
                </Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <Text
              style={{
                fontFamily: 'Zen-R',
                fontSize: 16,
                color: '#757575',
                marginVertical: 24,
                textAlign: 'center',
              }}>
              ログインボーナスを よみこめませんでした。 あとで もういちど ためしてね。
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default LoginBonusModal;
