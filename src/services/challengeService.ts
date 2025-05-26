import { supabase } from '@src/lib/supabase';
import { DailyChallenge, DbChallengeProgress } from '@src/types/progress';

class ChallengeService {
  // デイリーチャレンジの生成
  async generateDailyChallenges(userId: string): Promise<DailyChallenge[]> {
    const challenges: DailyChallenge[] = [
      {
        id: `speed-${Date.now()}`,
        type: 'SPEED',
        target: 10,
        reward: {
          type: 'SHURIKEN',
          itemId: 'golden-shuriken'
        },
        description: '10文字を1秒以内で読もう！',
        expiresAt: new Date(new Date().setHours(23, 59, 59, 999))
      },
      {
        id: `accuracy-${Date.now()}`,
        type: 'ACCURACY',
        target: 5,
        reward: {
          type: 'SCROLL',
          itemId: 'accuracy-scroll'
        },
        description: '5回連続で正確に読もう！',
        expiresAt: new Date(new Date().setHours(23, 59, 59, 999))
      },
      {
        id: `combo-${Date.now()}`,
        type: 'COMBO',
        target: 15,
        reward: {
          type: 'NINJA_TOOL',
          itemId: 'smoke-bomb'
        },
        description: '15文字コンボを達成しよう！',
        expiresAt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    ];

    // データベースに保存
    const { error } = await supabase
      .from('daily_challenges')
      .upsert(challenges.map(challenge => ({
        ...challenge,
        user_id: userId
      })));

    if (error) {
      console.error('チャレンジの生成に失敗しました:', error);
      throw error;
    }

    return challenges;
  }

  // チャレンジの進捗更新
  async updateProgress(userId: string, challengeId: string, progress: number): Promise<void> {
    const { error } = await supabase
      .from('challenge_progress')
      .upsert({
        user_id: userId,
        challenge_id: challengeId,
        current_progress: progress,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('チャレンジの進捗更新に失敗しました:', error);
      throw error;
    }
  }

  // チャレンジの完了状態をチェック
  async checkChallengeCompletion(userId: string, challengeId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('challenge_progress')
      .select(`
        current_progress,
        daily_challenges (
          target
        )
      `)
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)
      .single();

    if (error || !data) {
      console.error('チャレンジの進捗取得に失敗しました:', error);
      return false;
    }

    const progress = data as unknown as DbChallengeProgress;
    return progress.current_progress >= (progress.daily_challenges[0]?.target || 0);
  }

  // 報酬の付与
  async grantReward(userId: string, reward: DailyChallenge['reward']): Promise<void> {
    const { error } = await supabase
      .from('user_items')
      .insert({
        user_id: userId,
        item_type: reward.type,
        item_id: reward.itemId,
        acquired_at: new Date().toISOString()
      });

    if (error) {
      console.error('報酬の付与に失敗しました:', error);
      throw error;
    }
  }

  // デイリーチャレンジの取得
  async getDailyChallenges(userId: string): Promise<DailyChallenge[]> {
    const { data, error } = await supabase
      .from('daily_challenges')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true });

    if (error) {
      console.error('デイリーチャレンジの取得に失敗しました:', error);
      return [];
    }

    return data.map(challenge => ({
      id: challenge.id,
      type: challenge.type,
      target: challenge.target,
      reward: challenge.reward,
      description: challenge.description,
      expiresAt: new Date(challenge.expires_at)
    }));
  }
}

const challengeService = new ChallengeService();
export default challengeService; 