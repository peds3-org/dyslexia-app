import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Image, Animated, Easing, Platform } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import authService from '../../src/services/authService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type LoginBonusProps = {
  visible: boolean;
  onClose: () => void;
};

// 気分のアイコンを変更
const mood = [
  { name: 'emoticon-happy-outline', label: 'よろこび' },
  { name: 'emoticon-excited-outline', label: 'わくわく' },
  { name: 'emoticon-cool-outline', label: 'おちつき' },
  { name: 'emoticon-dead-outline', label: 'つかれ' },
  { name: 'emoticon-sad-outline', label: 'かなしみ' },
  { name: 'emoticon-angry-outline', label: 'いかり' },
];

const LoginBonus: React.FC<LoginBonusProps> = ({ visible, onClose }) => {
  const [coinsEarned, setCoinsEarned] = useState(10);
  const [consecutiveDays, setConsecutiveDays] = useState(1);
  const [animation] = useState(new Animated.Value(0));
  const [scaleAnimation] = useState(new Animated.Value(0.5));

  useEffect(() => {
    if (visible) {
      // アニメーションの開始
      Animated.parallel([
        Animated.timing(animation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.elastic(1),
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.elastic(1.2),
        }),
      ]).start();

      // ログインボーナスの処理
      handleLoginBonus();
    }
  }, [visible]);

  const handleLoginBonus = async () => {
    try {
      const userId = authService.getUser()?.id;
      if (!userId) return;

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式

      // ログイン履歴を確認
      const { data: existingLoginToday, error: loginCheckError } = await supabase
        .from('login_history')
        .select('id')
        .eq('user_id', userId)
        .eq('login_date', today)
        .single();

      // 同じ日に既にログインボーナスを取得していたら処理しない
      if (existingLoginToday) {
        // 既存の連続ログイン情報を取得
        const { data: streakData } = await supabase.from('login_streak').select('current_streak').eq('user_id', userId).single();

        if (streakData) {
          setConsecutiveDays(streakData.current_streak);
        }
        return;
      }

      // 最後のログイン日付を確認
      const { data: streakData, error: streakError } = await supabase
        .from('login_streak')
        .select('current_streak, last_login_date, longest_streak, total_logins')
        .eq('user_id', userId)
        .single();

      let currentStreak = 1;
      let longestStreak = 1;
      let totalLogins = 1;

      if (streakData) {
        const lastLoginDate = streakData.last_login_date;

        // 前日の日付を計算
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastLoginDate === yesterdayStr) {
          // 連続ログイン日数を増やす
          currentStreak = streakData.current_streak + 1;
          longestStreak = Math.max(currentStreak, streakData.longest_streak);
        } else if (lastLoginDate !== today) {
          // 連続していない場合はリセット（同日でなければ）
          currentStreak = 1;
          longestStreak = streakData.longest_streak;
        } else {
          // 当日に既にログインしている場合は現状維持
          currentStreak = streakData.current_streak;
          longestStreak = streakData.longest_streak;
        }

        totalLogins = streakData.total_logins + 1;
      }

      setConsecutiveDays(currentStreak);

      // ボーナスコインの計算（連続日数が長いほど増加、最大30コイン）
      const bonus = Math.min(10 + Math.floor(currentStreak / 3) * 5, 30);
      setCoinsEarned(bonus);

      // ログイン履歴を記録
      const deviceInfo = `${Platform.OS} ${Platform.Version}`;
      await supabase.from('login_history').upsert(
        {
          user_id: userId,
          login_date: today,
          login_time: new Date().toISOString(),
          device_info: deviceInfo,
        },
        { onConflict: 'user_id, login_date' }
      );

      // 連続ログイン情報を更新
      await supabase.from('login_streak').upsert({
        user_id: userId,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_login_date: today,
        total_logins: totalLogins,
        updated_at: new Date().toISOString(),
      });

      // ユーザープロファイルのコイン更新
      const { data: userProfile, error: profileError } = await supabase.from('user_profiles').select('coins').eq('user_id', userId).single();

      if (profileError) {
        console.error('ユーザープロフィール取得エラー:', profileError);
        return;
      }

      const currentCoins = userProfile?.coins || 0;
      const newCoins = currentCoins + bonus;

      // コインを更新
      const { error: updateError } = await supabase.from('user_profiles').update({ coins: newCoins }).eq('user_id', userId);

      if (updateError) {
        console.error('コイン更新エラー:', updateError);
      }
    } catch (error) {
      console.error('ログインボーナス処理エラー:', error);
    }
  };

  return (
    <Modal transparent={true} visible={visible} animationType='none' onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}>
        <Animated.View
          style={{
            width: '80%',
            backgroundColor: '#FFF9E8',
            borderRadius: 20,
            padding: 20,
            alignItems: 'center',
            transform: [
              { scale: scaleAnimation },
              {
                translateY: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
            opacity: animation,
          }}>
          <View
            style={{
              position: 'absolute',
              top: -40,
              backgroundColor: '#FFD700',
              borderRadius: 50,
              padding: 15,
              borderWidth: 3,
              borderColor: '#FFA500',
            }}>
            <Text
              style={{
                color: '#8B4513',
                fontSize: 22,
                fontWeight: 'bold',
                textAlign: 'center',
              }}>
              ログインボーナス
            </Text>
          </View>

          <View style={{ height: 30 }} />

          <Text
            style={{
              marginTop: 20,
              fontSize: 20,
              color: '#8B4513',
              marginBottom: 10,
              textAlign: 'center',
            }}>
            {consecutiveDays}にちれんぞく ログイン！
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 10,
              backgroundColor: '#FFE4B5',
              padding: 15,
              borderRadius: 15,
              borderWidth: 2,
              borderColor: '#FFA500',
            }}>
            <MaterialCommunityIcons name='currency-usd' size={40} color='#FFD700' />
            <Text
              style={{
                marginLeft: 10,
                fontSize: 28,
                fontWeight: 'bold',
                color: '#8B4513',
              }}>
              +{coinsEarned}
            </Text>
          </View>

          <Text
            style={{
              marginTop: 15,
              fontSize: 16,
              color: '#8B4513',
              textAlign: 'center',
            }}>
            まいにち ログインすると ボーナスが アップするよ！
          </Text>

          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 25,
              backgroundColor: '#E86A33',
              paddingVertical: 12,
              paddingHorizontal: 30,
              borderRadius: 30,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.2,
              shadowRadius: 5,
              elevation: 5,
            }}>
            <Text
              style={{
                color: 'white',
                fontSize: 18,
                fontWeight: 'bold',
              }}>
              とじる
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default LoginBonus;
