import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import {
  MoodType,
  CharacterMood,
  DailyActivity,
  CBTSession,
  ThinkingCard,
  THINKING_CARDS,
  Mission,
  LoginBonus
} from '../../app/types/cbt';

class CBTService {
  // ストレージキー
  private STORAGE_KEYS = {
    CBT_SESSION: 'cbt_session',
    MISSIONS: 'missions',
    LOGIN_BONUS: 'login_bonus',
  };

  // 日々の気分を記録
  async recordMood(userId: string, mood: MoodType, character?: CharacterMood): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 既存のセッションデータを取得
      const session = await this.getCBTSession(userId);
      
      // 今日のアクティビティを探す
      const todayActivityIndex = session.sessions.findIndex(a => a.date.startsWith(today));
      
      if (todayActivityIndex >= 0) {
        // 既存のアクティビティを更新
        session.sessions[todayActivityIndex].mood = mood;
        if (character) {
          session.sessions[todayActivityIndex].character = character;
        }
      } else {
        // 新しいアクティビティを作成
        session.sessions.push({
          date: today,
          mood: mood,
          character: character,
          practiceTimeMinutes: 0,
          correctAnswers: 0,
          totalAnswers: 0,
        });
      }
      
      // 更新日時を設定
      session.lastUpdated = new Date().toISOString();
      
      // ストレージに保存
      await this.saveCBTSession(session);
      
      console.log(`ユーザー ${userId} の気分を記録しました: ${mood}`);
    } catch (error) {
      console.error('気分の記録に失敗しました:', error);
      throw error;
    }
  }
  
  // 考え方カードを記録
  async recordThinkingCard(userId: string, cardId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 既存のセッションデータを取得
      const session = await this.getCBTSession(userId);
      
      // 今日のアクティビティを探す
      const todayActivityIndex = session.sessions.findIndex(a => a.date.startsWith(today));
      
      if (todayActivityIndex >= 0) {
        // 既存のアクティビティを更新
        session.sessions[todayActivityIndex].thinkingCardId = cardId;
      } else {
        // 新しいアクティビティを作成
        session.sessions.push({
          date: today,
          thinkingCardId: cardId,
          practiceTimeMinutes: 0,
          correctAnswers: 0,
          totalAnswers: 0,
        });
      }
      
      // 更新日時を設定
      session.lastUpdated = new Date().toISOString();
      
      // ストレージに保存
      await this.saveCBTSession(session);
      
      console.log(`ユーザー ${userId} の考え方カードを記録しました: ${cardId}`);
    } catch (error) {
      console.error('考え方カードの記録に失敗しました:', error);
      throw error;
    }
  }
  
  // 練習後の気分を記録
  async recordFeelingAfter(userId: string, feeling: 'たのしかった' | 'つかれた' | 'すっきりした'): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 既存のセッションデータを取得
      const session = await this.getCBTSession(userId);
      
      // 今日のアクティビティを探す
      const todayActivityIndex = session.sessions.findIndex(a => a.date.startsWith(today));
      
      if (todayActivityIndex >= 0) {
        // 既存のアクティビティを更新
        session.sessions[todayActivityIndex].feelingAfter = feeling;
      } else {
        // 新しいアクティビティを作成
        session.sessions.push({
          date: today,
          feelingAfter: feeling,
          practiceTimeMinutes: 0,
          correctAnswers: 0,
          totalAnswers: 0,
        });
      }
      
      // 更新日時を設定
      session.lastUpdated = new Date().toISOString();
      
      // ストレージに保存
      await this.saveCBTSession(session);
      
      console.log(`ユーザー ${userId} の練習後の気分を記録しました: ${feeling}`);
    } catch (error) {
      console.error('練習後の気分の記録に失敗しました:', error);
      throw error;
    }
  }
  
  // 練習セッションの結果を記録
  async recordPracticeSession(
    userId: string, 
    timeSpentMinutes: number, 
    correctAnswers: number,
    totalAnswers: number,
    notes?: string
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 既存のセッションデータを取得
      const session = await this.getCBTSession(userId);
      
      // 今日のアクティビティを探す
      const todayActivityIndex = session.sessions.findIndex(a => a.date.startsWith(today));
      
      if (todayActivityIndex >= 0) {
        // 既存のアクティビティを更新
        const existing = session.sessions[todayActivityIndex];
        existing.practiceTimeMinutes += timeSpentMinutes;
        existing.correctAnswers += correctAnswers;
        existing.totalAnswers += totalAnswers;
        if (notes) {
          existing.notes = existing.notes ? `${existing.notes}\n${notes}` : notes;
        }
      } else {
        // 新しいアクティビティを作成
        session.sessions.push({
          date: today,
          practiceTimeMinutes: timeSpentMinutes,
          correctAnswers: correctAnswers,
          totalAnswers: totalAnswers,
          notes: notes,
        });
      }
      
      // 更新日時を設定
      session.lastUpdated = new Date().toISOString();
      
      // ストレージに保存
      await this.saveCBTSession(session);
      
      // ミッションの進捗も更新
      await this.updateMissions(userId, correctAnswers, timeSpentMinutes);
      
      console.log(`ユーザー ${userId} の練習セッションを記録しました: ${timeSpentMinutes}分`);
    } catch (error) {
      console.error('練習セッションの記録に失敗しました:', error);
      throw error;
    }
  }
  
  // 考え方カードをすべて取得
  getThinkingCards(): ThinkingCard[] {
    return THINKING_CARDS;
  }
  
  // 指定したIDの考え方カードを取得
  getThinkingCardById(cardId: string): ThinkingCard | undefined {
    return THINKING_CARDS.find(card => card.id === cardId);
  }
  
  // CBTセッションを取得
  async getCBTSession(userId: string): Promise<CBTSession> {
    try {
      // ローカルストレージからデータを取得
      const sessionJson = await AsyncStorage.getItem(`${this.STORAGE_KEYS.CBT_SESSION}_${userId}`);
      
      if (sessionJson) {
        return JSON.parse(sessionJson);
      }
      
      // データがない場合は新しいセッションを作成
      const newSession: CBTSession = {
        userId,
        sessions: [],
        lastUpdated: new Date().toISOString(),
      };
      
      return newSession;
    } catch (error) {
      console.error('CBTセッションの取得に失敗しました:', error);
      
      // エラー時も新しいセッションを返す
      return {
        userId,
        sessions: [],
        lastUpdated: new Date().toISOString(),
      };
    }
  }
  
  // CBTセッションを保存
  private async saveCBTSession(session: CBTSession): Promise<void> {
    try {
      // ローカルストレージに保存
      await AsyncStorage.setItem(
        `${this.STORAGE_KEYS.CBT_SESSION}_${session.userId}`,
        JSON.stringify(session)
      );
      
      // Supabaseにも保存（非同期で行い、失敗してもローカルには影響しない）
      supabase.from('cbt_sessions').upsert({
        user_id: session.userId,
        sessions: session.sessions,
        last_updated: session.lastUpdated,
      }, { 
        onConflict: 'user_id' 
      }).then(({ error }) => {
        if (error) {
          console.error('Supabaseへの同期に失敗しました:', error);
        }
      });
    } catch (error) {
      console.error('CBTセッションの保存に失敗しました:', error);
      throw error;
    }
  }
  
  // 今日の任務（ミッション）を取得
  async getTodayMissions(userId: string): Promise<Mission[]> {
    try {
      // ローカルストレージからデータを取得
      const missionsJson = await AsyncStorage.getItem(`${this.STORAGE_KEYS.MISSIONS}_${userId}`);
      
      if (missionsJson) {
        const missions: Mission[] = JSON.parse(missionsJson);
        const today = new Date().toISOString().split('T')[0];
        
        // 今日の日付のミッションだけをフィルタ
        return missions.filter(m => m.id.startsWith(today));
      }
      
      // データがない場合は新しいミッションを生成
      return await this.generateNewMissions(userId);
    } catch (error) {
      console.error('ミッションの取得に失敗しました:', error);
      return [];
    }
  }
  
  // 新しいミッションを生成
  private async generateNewMissions(userId: string): Promise<Mission[]> {
    const today = new Date().toISOString().split('T')[0];
    
    // 基本的な3つのミッションを生成
    const newMissions: Mission[] = [
      {
        id: `${today}_read_10`,
        title: '10もじ せいかくによむ',
        description: 'きょう10もじを せいかくに よみましょう',
        targetCount: 10,
        currentCount: 0,
        isCompleted: false,
        rewardType: 'もじたま',
        rewardId: 'basic_reward_1',
      },
      {
        id: `${today}_practice_5min`,
        title: '5ふん れんしゅう',
        description: 'きょう5ふん れんしゅうしましょう',
        targetCount: 5,
        currentCount: 0,
        isCompleted: false,
        rewardType: 'にんじゃどうぐ',
        rewardId: 'basic_reward_2',
      },
      {
        id: `${today}_think_positive`,
        title: 'まえむき かんがえる',
        description: 'まえむきな かんがえかたを えらびましょう',
        targetCount: 1,
        currentCount: 0,
        isCompleted: false,
        rewardType: 'タイトル',
        rewardId: 'basic_reward_3',
      },
    ];
    
    // ローカルストレージに保存
    await AsyncStorage.setItem(
      `${this.STORAGE_KEYS.MISSIONS}_${userId}`,
      JSON.stringify(newMissions)
    );
    
    return newMissions;
  }
  
  // ミッションの進捗を更新
  private async updateMissions(
    userId: string, 
    correctAnswers: number, 
    timeSpentMinutes: number
  ): Promise<void> {
    try {
      const missions = await this.getTodayMissions(userId);
      let hasUpdates = false;
      
      // 各ミッションを更新
      for (const mission of missions) {
        if (mission.isCompleted) continue;
        
        if (mission.id.includes('read') && correctAnswers > 0) {
          mission.currentCount = Math.min(mission.targetCount, mission.currentCount + correctAnswers);
          hasUpdates = true;
        }
        
        if (mission.id.includes('practice') && timeSpentMinutes > 0) {
          mission.currentCount = Math.min(mission.targetCount, mission.currentCount + timeSpentMinutes);
          hasUpdates = true;
        }
        
        // 完了判定
        if (mission.currentCount >= mission.targetCount) {
          mission.isCompleted = true;
        }
      }
      
      if (hasUpdates) {
        // 更新があった場合だけ保存
        await AsyncStorage.setItem(
          `${this.STORAGE_KEYS.MISSIONS}_${userId}`,
          JSON.stringify(missions)
        );
      }
    } catch (error) {
      console.error('ミッションの更新に失敗しました:', error);
    }
  }
  
  // 考え方カードが選択されたときにミッションを更新
  async updateThinkingCardMission(userId: string): Promise<void> {
    try {
      const missions = await this.getTodayMissions(userId);
      const thinkPositiveMission = missions.find(m => m.id.includes('think_positive'));
      
      if (thinkPositiveMission && !thinkPositiveMission.isCompleted) {
        thinkPositiveMission.currentCount = 1;
        thinkPositiveMission.isCompleted = true;
        
        // 保存
        await AsyncStorage.setItem(
          `${this.STORAGE_KEYS.MISSIONS}_${userId}`,
          JSON.stringify(missions)
        );
      }
    } catch (error) {
      console.error('考え方ミッションの更新に失敗しました:', error);
    }
  }
  
  // ログインボーナスを処理
  async processLoginBonus(userId: string): Promise<LoginBonus> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 既存のログインボーナスデータを取得
      const loginBonusJson = await AsyncStorage.getItem(`${this.STORAGE_KEYS.LOGIN_BONUS}_${userId}`);
      let loginBonus: LoginBonus;
      
      if (loginBonusJson) {
        loginBonus = JSON.parse(loginBonusJson);
        const lastLoginDate = loginBonus.lastLoginDate.split('T')[0];
        
        // 前日のログインかどうかを確認
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastLoginDate === yesterdayStr) {
          // 連続ログイン
          loginBonus.daysInRow += 1;
        } else if (lastLoginDate !== today) {
          // 連続ログインが途切れた (今日以外の日付の場合)
          loginBonus.daysInRow = 1;
        }
        
        // 総ログイン数を更新（今日まだカウントしていない場合）
        if (lastLoginDate !== today) {
          loginBonus.totalLogins += 1;
        }
      } else {
        // 新規ユーザー
        loginBonus = {
          daysInRow: 1,
          totalLogins: 1,
          lastLoginDate: today,
          rewards: [
            {
              id: 'login_reward_1',
              type: 'もじたま',
              description: 'はじめてのログインボーナス',
              isCollected: false,
            }
          ]
        };
      }
      
      // 連続ログイン日数に応じて新しい報酬を追加
      if (loginBonus.daysInRow === 3 && !loginBonus.rewards.some(r => r.id === 'login_reward_3')) {
        loginBonus.rewards.push({
          id: 'login_reward_3',
          type: 'にんじゃどうぐ',
          description: '3にちれんぞくログインボーナス',
          isCollected: false,
        });
      } else if (loginBonus.daysInRow === 7 && !loginBonus.rewards.some(r => r.id === 'login_reward_7')) {
        loginBonus.rewards.push({
          id: 'login_reward_7',
          type: 'タイトル',
          description: '7にちれんぞくログインボーナス',
          isCollected: false,
        });
      }
      
      // 最終ログイン日を更新
      loginBonus.lastLoginDate = new Date().toISOString();
      
      // 保存
      await AsyncStorage.setItem(
        `${this.STORAGE_KEYS.LOGIN_BONUS}_${userId}`,
        JSON.stringify(loginBonus)
      );
      
      return loginBonus;
    } catch (error) {
      console.error('ログインボーナスの処理に失敗しました:', error);
      // エラー時の基本ボーナス
      return {
        daysInRow: 1,
        totalLogins: 1,
        lastLoginDate: new Date().toISOString(),
        rewards: []
      };
    }
  }
  
  // ログインボーナス報酬を受け取る
  async collectLoginReward(userId: string, rewardId: string): Promise<boolean> {
    try {
      // ログインボーナスデータを取得
      const loginBonusJson = await AsyncStorage.getItem(`${this.STORAGE_KEYS.LOGIN_BONUS}_${userId}`);
      
      if (!loginBonusJson) return false;
      
      const loginBonus: LoginBonus = JSON.parse(loginBonusJson);
      const reward = loginBonus.rewards.find(r => r.id === rewardId);
      
      if (!reward || reward.isCollected) return false;
      
      // 報酬を受け取り済みにする
      reward.isCollected = true;
      
      // 保存
      await AsyncStorage.setItem(
        `${this.STORAGE_KEYS.LOGIN_BONUS}_${userId}`,
        JSON.stringify(loginBonus)
      );
      
      return true;
    } catch (error) {
      console.error('報酬の受け取りに失敗しました:', error);
      return false;
    }
  }
}

export const cbtService = new CBTService();
export default cbtService; 