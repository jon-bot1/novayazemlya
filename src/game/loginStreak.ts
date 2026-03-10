import { supabase } from '@/integrations/supabase/client';

export interface LoginStreakData {
  current_streak: number;
  longest_streak: number;
  bonus_earned: number;
}

const STREAK_BONUSES = [0, 10, 25, 50, 75, 100, 150, 200]; // index = day-1, capped at 200₽

export function getStreakBonus(day: number): number {
  return STREAK_BONUSES[Math.min(day - 1, STREAK_BONUSES.length - 1)] || 0;
}

export async function checkAndUpdateStreak(playerName: string): Promise<LoginStreakData & { todayBonus: number; isNewDay: boolean }> {
  if (!playerName || playerName === '__anonymous__') {
    return { current_streak: 0, longest_streak: 0, bonus_earned: 0, todayBonus: 0, isNewDay: false };
  }

  const name = playerName.trim().slice(0, 20);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    const { data: existing } = await (supabase as any)
      .from('login_streaks')
      .select('*')
      .eq('player_name', name)
      .maybeSingle();

    if (!existing) {
      // First login ever
      const bonus = getStreakBonus(1);
      await (supabase as any).from('login_streaks').insert({
        player_name: name,
        current_streak: 1,
        longest_streak: 1,
        last_login_date: today,
        total_bonus_earned: bonus,
      });
      return { current_streak: 1, longest_streak: 1, bonus_earned: bonus, todayBonus: bonus, isNewDay: true };
    }

    const lastDate = existing.last_login_date;
    if (lastDate === today) {
      // Already logged in today
      return {
        current_streak: existing.current_streak,
        longest_streak: existing.longest_streak,
        bonus_earned: existing.total_bonus_earned,
        todayBonus: 0,
        isNewDay: false,
      };
    }

    // Check if yesterday
    const lastD = new Date(lastDate + 'T00:00:00Z');
    const todayD = new Date(today + 'T00:00:00Z');
    const diffDays = Math.floor((todayD.getTime() - lastD.getTime()) / (1000 * 60 * 60 * 24));

    let newStreak: number;
    if (diffDays === 1) {
      newStreak = existing.current_streak + 1;
    } else {
      newStreak = 1; // streak broken
    }

    const bonus = getStreakBonus(newStreak);
    const newLongest = Math.max(existing.longest_streak, newStreak);

    await (supabase as any).from('login_streaks').update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_login_date: today,
      total_bonus_earned: existing.total_bonus_earned + bonus,
      updated_at: new Date().toISOString(),
    }).eq('player_name', name);

    return {
      current_streak: newStreak,
      longest_streak: newLongest,
      bonus_earned: existing.total_bonus_earned + bonus,
      todayBonus: bonus,
      isNewDay: true,
    };
  } catch {
    return { current_streak: 0, longest_streak: 0, bonus_earned: 0, todayBonus: 0, isNewDay: false };
  }
}
