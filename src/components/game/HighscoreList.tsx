import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HighscoreEntry {
  id: string;
  player_name: string;
  kills: number;
  time_seconds: number;
  result: string;
  loot_value: number;
  created_at: string;
}

interface HighscoreListProps {
  currentName?: string;
}

export const HighscoreList: React.FC<HighscoreListProps> = ({ currentName }) => {
  const [scores, setScores] = useState<HighscoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await (supabase as any)
          .from('highscores')
          .select('*')
          .order('result', { ascending: false })
          .order('kills', { ascending: false })
          .order('time_seconds', { ascending: true })
          .limit(10);
        if (data) setScores(data);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <p className="text-xs font-mono text-muted-foreground text-center mt-3">Loading highscores...</p>;
  }
  if (scores.length === 0) {
    return <p className="text-xs font-mono text-muted-foreground text-center mt-3">No highscores yet.</p>;
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const resultLabel = (r: string) => {
    if (r === 'success') return { icon: '🏆', text: 'SUCCESS', color: 'text-loot' };
    if (r === 'almost') return { icon: '⚠', text: 'ALMOST', color: 'text-warning' };
    if (r === 'mia') return { icon: '❓', text: 'MIA', color: 'text-muted-foreground' };
    return { icon: '☠', text: 'KIA', color: 'text-danger' };
  };

  return (
    <div className="mt-4 border-t border-border pt-3">
      <h3 className="text-xs font-display text-accent uppercase tracking-wider mb-2 text-center">🏆 Highscores</h3>
      <div className="space-y-0.5">
        <div className="grid grid-cols-[1.2rem_1fr_2.5rem_2.5rem_3.5rem] gap-1 text-[9px] font-mono text-muted-foreground uppercase px-1">
          <span>#</span><span>Name</span><span>Kills</span><span>Time</span><span>Status</span>
        </div>
        {scores.map((s, i) => {
          const isMe = currentName && s.player_name === currentName;
          const rl = resultLabel(s.result);
          return (
            <div
              key={s.id}
              className={`grid grid-cols-[1.2rem_1fr_2.5rem_2.5rem_3.5rem] gap-1 text-[11px] font-mono px-1 py-0.5 rounded ${
                isMe ? 'bg-accent/10 text-accent' : 'text-foreground/80'
              }`}
            >
              <span className="text-muted-foreground">{i + 1}</span>
              <span className="truncate">{s.player_name}</span>
              <span>{s.kills}</span>
              <span>{formatTime(Number(s.time_seconds))}</span>
              <span className={rl.color}>{rl.icon} {rl.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export async function submitHighscore(
  playerName: string,
  kills: number,
  timeSeconds: number,
  result: 'success' | 'almost' | 'mia' | 'kia',
  lootValue: number
) {
  try {
    await (supabase as any).from('highscores').insert({
      player_name: playerName.trim().slice(0, 20),
      kills,
      time_seconds: Math.round(timeSeconds),
      result,
      loot_value: lootValue,
    });
  } catch {}
}
