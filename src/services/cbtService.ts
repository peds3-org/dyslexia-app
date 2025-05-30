import { supabase } from '@src/lib/supabase';
import AsyncStorageUtil from '@src/utils/asyncStorage';
import {
  MoodType,
  CharacterMood,
  DailyActivity,
  CBTSession,
  ThinkingCard,
  THINKING_CARDS,
  Mission,
  LoginBonus
} from '@src/types/cbt';

class CBTService {
  // ストレージキー（オフライン対応用）
  private STORAGE_KEYS = {
    CBT_SESSION: 'cbt_session',
    MISSIONS: 'missions',
    LOGIN_BONUS: 'login_bonus',
  };

  // 日々の気分を記録（新しいテーブル構造に対応）
  async recordMood(userId: string, mood: MoodType, character?: CharacterMood): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // daily_emotion_logに記録
      const { error: emotionError } = await supabase
        .from('daily_emotion_log')
        .upsert({
          user_id: userId,
          log_date: today,
          pre_study_mood: mood,
          // 他のフィールドは必要に応じて更新
        }, {
          onConflict: 'user_id,log_date'
        });

      if (emotionError) {
        console.error('daily_emotion_log記録エラー:', emotionError);
      }

      // オフライン対応のためローカルストレージにも保存
      const session = await this.getCBTSession(userId);
      const todayActivityIndex = session.sessions.findIndex(a => a.date.startsWith(today));
      
      if (todayActivityIndex >= 0) {
        session.sessions[todayActivityIndex].mood = mood;
        if (character) {
          session.sessions[todayActivityIndex].character = character;
        }
      } else {
        session.sessions.push({
          date: today,
          mood: mood,
          character: character,
          practiceTimeMinutes: 0,
          correctAnswers: 0,
          totalAnswers: 0,
        });
      }
      
      session.lastUpdated = new Date().toISOString();
      await this.saveCBTSession(session);
      
      console.log(`ユーザー ${userId} の気分を記録しました: ${mood}`);
    } catch (error) {
      console.error('気分の記録に失敗しました:', error);
      throw error;
    }
  }
  
  // 学習後の気分を記録
  async recordPostStudyMood(userId: string, mood: MoodType): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('daily_emotion_log')
        .upsert({
          user_id: userId,
          log_date: today,
          post_study_mood: mood,
        }, {
          onConflict: 'user_id,log_date'
        });

      if (error) {
        console.error('学習後の気分記録エラー:', error);
      }
    } catch (error) {
      console.error('学習後の気分記録に失敗しました:', error);
      throw error;
    }
  }

  // 考え方カードを記録
  async recordThinkingCard(userId: string, cardId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // family_engagement_logに記録（家族との関わりとして）
      const { error } = await supabase
        .from('family_engagement_log')
        .insert({
          user_id: userId,
          log_date: today,
          special_events: [cardId], // 考え方カードIDを特別イベントとして記録
          notes: `考え方カード: ${THINKING_CARDS.find(c => c.id === cardId)?.title || cardId}`
        });

      if (error) {
        console.error('考え方カード記録エラー:', error);
      }

      // ローカルストレージにも保存
      const session = await this.getCBTSession(userId);
      const todayActivityIndex = session.sessions.findIndex(a => a.date.startsWith(today));
      
      if (todayActivityIndex >= 0) {
        session.sessions[todayActivityIndex].thinkingCardId = cardId;
      } else {
        session.sessions.push({
          date: today,
          thinkingCardId: cardId,
          practiceTimeMinutes: 0,
          correctAnswers: 0,
          totalAnswers: 0,
        });
      }
      
      session.lastUpdated = new Date().toISOString();
      await this.saveCBTSession(session);
      
      console.log(`ユーザー ${userId} の考え方カードを記録しました: ${cardId}`);
    } catch (error) {
      console.error('考え方カードの記録に失敗しました:', error);
      throw error;
    }
  }
  
  // 練習記録を更新
  async updatePracticeRecord(userId: string, timeMinutes: number, correctAnswers: number, totalAnswers: number): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // daily_emotion_logに学習時間と正確性を記録
      const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;
      
      const { error } = await supabase
        .from('daily_emotion_log')
        .upsert({
          user_id: userId,
          log_date: today,
          study_minutes: timeMinutes,
          accuracy_rate: accuracy
        }, {
          onConflict: 'user_id,log_date'
        });

      if (error) {
        console.error('練習記録更新エラー:', error);
      }

      // ローカルストレージも更新
      const session = await this.getCBTSession(userId);
      const todayActivityIndex = session.sessions.findIndex(a => a.date.startsWith(today));
      
      if (todayActivityIndex >= 0) {
        session.sessions[todayActivityIndex].practiceTimeMinutes += timeMinutes;
        session.sessions[todayActivityIndex].correctAnswers += correctAnswers;
        session.sessions[todayActivityIndex].totalAnswers += totalAnswers;
      } else {
        session.sessions.push({
          date: today,
          practiceTimeMinutes: timeMinutes,
          correctAnswers: correctAnswers,
          totalAnswers: totalAnswers,
        });
      }
      
      session.lastUpdated = new Date().toISOString();
      await this.saveCBTSession(session);
      
      console.log(`ユーザー ${userId} の練習記録を更新しました`);
    } catch (error) {
      console.error('練習記録の更新に失敗しました:', error);
      throw error;
    }
  }
  
  // CBTセッションデータを取得（ローカルストレージから）
  async getCBTSession(userId: string): Promise<CBTSession> {
    try {
      const storageKey = `${this.STORAGE_KEYS.CBT_SESSION}_${userId}`;
      const storedData = await AsyncStorageUtil.getItem(storageKey);
      
      if (storedData) {
        return JSON.parse(storedData);
      }
      
      // 初期データ
      return {
        userId: userId,
        sessions: [],
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('CBTセッション取得エラー:', error);
      return {
        userId: userId,
        sessions: [],
        lastUpdated: new Date().toISOString(),
      };
    }
  }
  
  // CBTセッションデータを保存（ローカルストレージに）
  private async saveCBTSession(session: CBTSession): Promise<void> {
    try {
      const storageKey = `${this.STORAGE_KEYS.CBT_SESSION}_${session.userId}`;
      await AsyncStorageUtil.setItem(storageKey, JSON.stringify(session));
    } catch (error) {
      console.error('CBTセッション保存エラー:', error);
      throw error;
    }
  }
  
  // 今日の気分を取得
  async getTodayMood(userId: string): Promise<MoodType | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // データベースから取得を試みる
      const { data, error } = await supabase
        .from('daily_emotion_log')
        .select('pre_study_mood')
        .eq('user_id', userId)
        .eq('log_date', today)
        .single();

      if (!error && data?.pre_study_mood) {
        return data.pre_study_mood as MoodType;
      }

      // ローカルストレージから取得
      const session = await this.getCBTSession(userId);
      const todayActivity = session.sessions.find(a => a.date.startsWith(today));
      return todayActivity?.mood || null;
    } catch (error) {
      console.error('今日の気分取得エラー:', error);
      return null;
    }
  }
  
  // 週間の気分データを取得
  async getWeeklyMoodData(userId: string): Promise<DailyActivity[]> {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      // データベースから取得
      const { data, error } = await supabase
        .from('daily_emotion_log')
        .select('*')
        .eq('user_id', userId)
        .gte('log_date', oneWeekAgo.toISOString().split('T')[0])
        .order('log_date', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(log => ({
          date: log.log_date,
          mood: log.pre_study_mood as MoodType,
          practiceTimeMinutes: log.study_minutes || 0,
          correctAnswers: 0, // learning_sessionsから集計する必要がある
          totalAnswers: 0,
          thinkingCardId: undefined
        }));
      }

      // ローカルストレージから取得
      const session = await this.getCBTSession(userId);
      const weeklyData = session.sessions.filter(activity => {
        const activityDate = new Date(activity.date);
        return activityDate >= oneWeekAgo;
      });
      
      return weeklyData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('週間気分データ取得エラー:', error);
      return [];
    }
  }
  
  // ミッションリストを取得
  async getMissions(userId: string): Promise<Mission[]> {
    try {
      // 現在はローカルで定義されたミッションを返す
      // 将来的にはデータベースから取得
      return [
        {
          id: 'mission1',
          title: '3日連続で練習しよう！',
          description: '毎日少しずつでも練習を続けることが大切です',
          progress: await this.getMissionProgress(userId, 'mission1'),
          target: 3,
          reward: 50,
          completed: false,
        },
        {
          id: 'mission2',
          title: '気分を毎日記録しよう',
          description: '自分の気持ちを見つめることから始めましょう',
          progress: await this.getMissionProgress(userId, 'mission2'),
          target: 7,
          reward: 30,
          completed: false,
        },
        {
          id: 'mission3',
          title: '考え方カードを5枚集めよう',
          description: 'いろいろな考え方を身につけましょう',
          progress: await this.getMissionProgress(userId, 'mission3'),
          target: 5,
          reward: 100,
          completed: false,
        },
      ];
    } catch (error) {
      console.error('ミッション取得エラー:', error);
      return [];
    }
  }
  
  // ミッションの進捗を取得
  private async getMissionProgress(userId: string, missionId: string): Promise<number> {
    try {
      const session = await this.getCBTSession(userId);
      
      switch (missionId) {
        case 'mission1': {
          // 連続練習日数を計算
          let streak = 0;
          const today = new Date();
          
          for (let i = 0; i < session.sessions.length; i++) {
            const sessionDate = new Date(session.sessions[i].date);
            const diffDays = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diffDays === streak) {
              streak++;
            } else {
              break;
            }
          }
          
          return Math.min(streak, 3);
        }
        
        case 'mission2': {
          // 気分記録日数を計算
          const recordedDays = session.sessions.filter(s => s.mood).length;
          return Math.min(recordedDays, 7);
        }
        
        case 'mission3': {
          // 収集した考え方カード数を計算
          const uniqueCards = new Set(session.sessions.map(s => s.thinkingCardId).filter(Boolean));
          return Math.min(uniqueCards.size, 5);
        }
        
        default:
          return 0;
      }
    } catch (error) {
      console.error('ミッション進捗取得エラー:', error);
      return 0;
    }
  }
  
  // ログインボーナスを確認・付与
  async checkLoginBonus(userId: string): Promise<LoginBonus | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const storageKey = `${this.STORAGE_KEYS.LOGIN_BONUS}_${userId}`;
      
      // 最後のログインボーナス情報を取得
      const lastBonusData = await AsyncStorageUtil.getItem(storageKey);
      const lastBonus = lastBonusData ? JSON.parse(lastBonusData) : null;
      
      // 今日既にボーナスを受け取っている場合
      if (lastBonus && lastBonus.date === today) {
        return null;
      }
      
      // 連続ログイン日数を計算
      let consecutiveDays = 1;
      if (lastBonus) {
        const lastDate = new Date(lastBonus.date);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          consecutiveDays = (lastBonus.consecutiveDays || 0) + 1;
        }
      }
      
      // ボーナス報酬を計算
      const bonusCoins = Math.min(consecutiveDays * 10, 100);
      
      const loginBonus: LoginBonus = {
        date: today,
        consecutiveDays: consecutiveDays,
        bonusCoins: bonusCoins,
      };
      
      // ボーナス情報を保存
      await AsyncStorageUtil.setItem(storageKey, JSON.stringify(loginBonus));
      
      // コインを付与（実際のコイン付与処理は別途実装が必要）
      await this.addCoins(userId, bonusCoins);
      
      return loginBonus;
    } catch (error) {
      console.error('ログインボーナス確認エラー:', error);
      return null;
    }
  }
  
  // コインを付与（仮実装）
  private async addCoins(userId: string, amount: number): Promise<void> {
    try {
      // user_profilesテーブルのcoinsフィールドを更新
      const { data: profile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('coins')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        console.error('ユーザープロファイル取得エラー:', fetchError);
        return;
      }

      const newCoins = (profile?.coins || 0) + amount;

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ coins: newCoins })
        .eq('user_id', userId);

      if (updateError) {
        console.error('コイン更新エラー:', updateError);
      }

      console.log(`ユーザー ${userId} に ${amount} コインを付与しました`);
    } catch (error) {
      console.error('コイン付与エラー:', error);
    }
  }

  // 家族との関わりを記録
  async recordFamilyEngagement(
    userId: string, 
    parentPresent: boolean, 
    encouragements: number = 0,
    familyMood?: 'supportive' | 'busy' | 'stressed' | 'celebratory'
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('family_engagement_log')
        .insert({
          user_id: userId,
          log_date: today,
          parent_present: parentPresent,
          parent_encouragements: encouragements,
          family_mood: familyMood
        });

      if (error) {
        console.error('家族エンゲージメント記録エラー:', error);
      }
    } catch (error) {
      console.error('家族エンゲージメント記録に失敗しました:', error);
    }
  }

  // 喜びの瞬間を記録
  async recordJoyMoment(
    userId: string,
    momentType: string,
    childEmotion: string,
    parentReaction?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('family_joy_moments')
        .insert({
          user_id: userId,
          moment_type: momentType,
          child_emotion: childEmotion,
          parent_reaction: parentReaction
        });

      if (error) {
        console.error('喜びの瞬間記録エラー:', error);
      }
    } catch (error) {
      console.error('喜びの瞬間記録に失敗しました:', error);
    }
  }
}

const cbtService = new CBTService();
export default cbtService;