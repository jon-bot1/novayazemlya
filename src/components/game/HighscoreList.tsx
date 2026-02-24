import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ACHIEVEMENTS, TIER_LABEL, type Achievement, type AchievementTier } from './HUD';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Score algorithm: result bonus + kill points + time bonus + achievement tiebreaker
export function calculateScore(kills: number, timeSeconds: number, result: string, achievements: string): number {
  const resultMultiplier = result === 'success' ? 3.0 : result === 'almost' ? 1.5 : result === 'mia' ? 1.0 : 0.5;
  const killPoints = kills; // 1 point per kill
  const timeBonus = Math.max(0, Math.round((300 - timeSeconds) * 0.05 * 10) / 10); // ~0.05 per second saved
  const baseScore = Math.round((killPoints + timeBonus) * resultMultiplier * 10) / 10;
  const tierValues: Record<string, number> = { bronze: 0.1, silver: 0.3, gold: 0.7 };
  const achIds = achievements ? achievements.split(',').filter(Boolean) : [];
  let achBonus = 0;
  for (const id of achIds) {
    const tier = id.match(/_(bronze|silver|gold)$/)?.[1];
    achBonus += tier ? tierValues[tier] : 0.7;
  }
  return Math.round((baseScore + achBonus) * 10) / 10;
}

// Achievement weight for "Most Decorated" ranking
function achievementWeight(achievements: string): number {
  const tierValues: Record<string, number> = { bronze: 1, silver: 3, gold: 7 };
  const achIds = achievements ? achievements.split(',').filter(Boolean) : [];
  let total = 0;
  for (const id of achIds) {
    const tier = id.match(/_(bronze|silver|gold)$/)?.[1];
    total += tier ? tierValues[tier] : 7;
  }
  return total;
}

interface HighscoreEntry {
  id: string;
  player_name: string;
  kills: number;
  time_seconds: number;
  result: string;
  loot_value: number;
  created_at: string;
  achievements: string;
  score?: number;
}

interface HighscoreListProps {
  currentName?: string;
}

export const HighscoreList: React.FC<HighscoreListProps> = ({ currentName }) => {
  const [scores, setScores] = useState<HighscoreEntry[]>([]);
  const [decorated, setDecorated] = useState<HighscoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await (supabase as any)
          .from('highscores')
          .select('*')
          .neq('result', 'abandoned')
          .neq('player_name', 'Anonymous')
          .limit(50);
        if (data) {
          const entries = (data as HighscoreEntry[]).map(s => ({
            ...s,
            score: calculateScore(s.kills, Number(s.time_seconds), s.result, s.achievements || ''),
          }));
          // Top scores
          setScores([...entries].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5));
          // Most decorated — ranked by achievement weight, must have at least 1
          setDecorated(
            entries
              .filter(s => s.achievements && s.achievements.length > 0)
              .sort((a, b) => achievementWeight(b.achievements || '') - achievementWeight(a.achievements || ''))
              .slice(0, 5)
          );
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <p className="text-xs font-mono text-muted-foreground text-center mt-3">Loading...</p>;
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const resultLabel = (r: string) => {
    if (r === 'success') return { icon: '🏆', color: 'text-loot' };
    if (r === 'almost') return { icon: '⚠', color: 'text-warning' };
    if (r === 'mia') return { icon: '❓', color: 'text-muted-foreground' };
    return { icon: '☠', color: 'text-danger' };
  };

  return (
    <div className="mt-4 border-t border-border pt-3 space-y-4">
      {/* Highscores */}
      {scores.length > 0 && (
        <div>
          <h3 className="text-xs font-display text-accent uppercase tracking-wider mb-2 text-center">🏆 Highscores</h3>
          <div className="space-y-0.5">
            <div className="grid grid-cols-[1.2rem_1fr_2.5rem_2.5rem_3rem_1.5rem] gap-1 text-[9px] font-mono text-muted-foreground uppercase px-1">
              <span>#</span><span>Name</span><span>Kills</span><span>Time</span><span>Score</span><span></span>
            </div>
            {scores.map((s, i) => {
              const isMe = currentName && s.player_name === currentName;
              const rl = resultLabel(s.result);
              const earnedIds = s.achievements ? s.achievements.split(',').filter(Boolean) : [];
              const earnedAchievements = ACHIEVEMENTS.filter(a => earnedIds.includes(a.id));
              return (
                <div key={s.id}>
                  <div className={`grid grid-cols-[1.2rem_1fr_2.5rem_2.5rem_3rem_1.5rem] gap-1 text-[11px] font-mono px-1 py-0.5 rounded ${isMe ? 'bg-accent/10 text-accent' : 'text-foreground/80'}`}>
                    <span className="text-muted-foreground">{i + 1}</span>
                    <span className="truncate">{s.player_name}</span>
                    <span>{s.kills}</span>
                    <span>{formatTime(Number(s.time_seconds))}</span>
                    <span className="text-accent">{s.score ?? 0}</span>
                    <span className={rl.color}>{rl.icon}</span>
                  </div>
                  {earnedAchievements.length > 0 && (
                    <div className="flex gap-1 px-1 ml-5 mb-0.5">
                      <TooltipProvider delayDuration={200}>
                        {earnedAchievements.map(a => (
                          <Tooltip key={a.id}>
                            <TooltipTrigger asChild>
                              <span className="text-[10px] cursor-default">{TIER_LABEL[a.tier]}{a.icon}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs font-mono bg-background border-border">
                              <span className="font-bold">{a.name}</span> — {a.desc}
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </TooltipProvider>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Most Decorated */}
      {decorated.length > 0 && (
        <div>
          <h3 className="text-xs font-display text-accent uppercase tracking-wider mb-2 text-center">🏅 Most Decorated</h3>
          <div className="space-y-0.5">
            <div className="grid grid-cols-[1.2rem_1fr_3rem] gap-1 text-[9px] font-mono text-muted-foreground uppercase px-1">
              <span>#</span><span>Name</span><span>Medals</span>
            </div>
            {decorated.map((s, i) => {
              const isMe = currentName && s.player_name === currentName;
              const earnedIds = s.achievements ? s.achievements.split(',').filter(Boolean) : [];
              const earnedAchievements = ACHIEVEMENTS.filter(a => earnedIds.includes(a.id));
              const weight = achievementWeight(s.achievements || '');
              return (
                <div key={s.id + '_dec'}>
                  <div className={`grid grid-cols-[1.2rem_1fr_3rem] gap-1 text-[11px] font-mono px-1 py-0.5 rounded ${isMe ? 'bg-accent/10 text-accent' : 'text-foreground/80'}`}>
                    <span className="text-muted-foreground">{i + 1}</span>
                    <span className="truncate">{s.player_name}</span>
                    <span className="text-accent">{earnedIds.length} <span className="text-muted-foreground text-[9px]">({weight}pts)</span></span>
                  </div>
                  {earnedAchievements.length > 0 && (
                    <div className="flex flex-wrap gap-1 px-1 ml-5 mb-0.5">
                      <TooltipProvider delayDuration={200}>
                        {earnedAchievements.map(a => (
                          <Tooltip key={a.id}>
                            <TooltipTrigger asChild>
                              <span className="text-[10px] cursor-default">{TIER_LABEL[a.tier]}{a.icon}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs font-mono bg-background border-border">
                              <span className="font-bold">{a.name}</span> — {a.desc}
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </TooltipProvider>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {scores.length === 0 && decorated.length === 0 && (
        <p className="text-xs font-mono text-muted-foreground text-center">No highscores yet.</p>
      )}
    </div>
  );
};

export async function submitHighscore(
  playerName: string,
  kills: number,
  timeSeconds: number,
  result: 'success' | 'almost' | 'mia' | 'kia',
  lootValue: number,
  achievements: string = ''
) {
  try {
    const saveName = playerName === '__anonymous__' ? 'Anonymous' : playerName.trim().slice(0, 20);
    await (supabase as any).from('highscores').insert({
      player_name: saveName,
      kills,
      time_seconds: Math.round(timeSeconds),
      result,
      loot_value: lootValue,
      achievements,
    });
  } catch {}
}
