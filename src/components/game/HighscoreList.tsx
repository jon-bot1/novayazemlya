import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ACHIEVEMENTS, TIER_LABEL, type Achievement, type AchievementTier } from './HUD';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  return Math.ceil(baseScore + achBonus);
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

interface PlayerProfile {
  name: string;
  totalKills: number;
  totalRaids: number;
  bestScore: number;
  avgTime: number;
  successRate: number;
  achievements: string[];
}

export const HighscoreList: React.FC<HighscoreListProps> = ({ currentName }) => {
  const [scores, setScores] = useState<HighscoreEntry[]>([]);
  const [weeklyScores, setWeeklyScores] = useState<HighscoreEntry[]>([]);
  const [decorated, setDecorated] = useState<HighscoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'alltime' | 'weekly'>('alltime');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfile | null>(null);

  const loadScores = async () => {
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
        setScores([...entries].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5));
        setDecorated(
          entries
            .filter(s => s.achievements && s.achievements.length > 0)
            .sort((a, b) => achievementWeight(b.achievements || '') - achievementWeight(a.achievements || ''))
            .slice(0, 5)
        );

        // Weekly: filter to this week (Monday-Sunday)
        const now = new Date();
        const day = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((day + 6) % 7));
        monday.setHours(0, 0, 0, 0);
        const weeklyEntries = entries.filter(s => new Date(s.created_at) >= monday);
        setWeeklyScores([...weeklyEntries].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5));
      }
    } catch {}
    setLoading(false);
  };

  const loadPlayerProfile = async (name: string) => {
    try {
      const { data } = await (supabase as any)
        .from('highscores')
        .select('*')
        .eq('player_name', name)
        .neq('result', 'abandoned')
        .limit(100);
      if (data && data.length > 0) {
        const entries = data as HighscoreEntry[];
        const totalKills = entries.reduce((s, e) => s + e.kills, 0);
        const bestScore = Math.max(...entries.map(e => calculateScore(e.kills, Number(e.time_seconds), e.result, e.achievements || '')));
        const avgTime = entries.reduce((s, e) => s + Number(e.time_seconds), 0) / entries.length;
        const successes = entries.filter(e => e.result === 'success').length;
        const allAchs = new Set<string>();
        entries.forEach(e => {
          if (e.achievements) e.achievements.split(',').filter(Boolean).forEach(a => allAchs.add(a));
        });
        setSelectedPlayer({
          name,
          totalKills,
          totalRaids: entries.length,
          bestScore,
          avgTime,
          successRate: Math.round((successes / entries.length) * 100),
          achievements: Array.from(allAchs),
        });
      }
    } catch {}
  };

  useEffect(() => {
    loadScores();
  }, []);

  // Re-fetch when currentName changes (i.e. after a new score is submitted)
  useEffect(() => {
    if (currentName) {
      const timer = setTimeout(() => loadScores(), 1000);
      return () => clearTimeout(timer);
    }
  }, [currentName]);

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

  const displayScores = tab === 'weekly' ? weeklyScores : scores;

  return (
    <div className="mt-4 border-t border-border pt-3 space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 justify-center">
        <button
          className={`px-3 py-1 text-[10px] font-display uppercase tracking-wider rounded transition-colors ${tab === 'alltime' ? 'bg-accent/20 text-accent border border-accent/40' : 'text-muted-foreground border border-border/30 hover:text-foreground'}`}
          onClick={() => setTab('alltime')}
        >
          🏆 All Time
        </button>
        <button
          className={`px-3 py-1 text-[10px] font-display uppercase tracking-wider rounded transition-colors ${tab === 'weekly' ? 'bg-accent/20 text-accent border border-accent/40' : 'text-muted-foreground border border-border/30 hover:text-foreground'}`}
          onClick={() => setTab('weekly')}
        >
          📅 This Week
        </button>
      </div>

      {/* Player profile dialog */}
      <Dialog open={!!selectedPlayer} onOpenChange={(open) => { if (!open) setSelectedPlayer(null); }}>
        <DialogContent className="max-w-xs bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-accent tracking-wider">👤 {selectedPlayer?.name}</DialogTitle>
          </DialogHeader>
          {selectedPlayer && (
            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between"><span className="text-muted-foreground">Total Raids:</span><span className="text-foreground">{selectedPlayer.totalRaids}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total Kills:</span><span className="text-foreground">{selectedPlayer.totalKills}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Best Score:</span><span className="text-accent">{selectedPlayer.bestScore}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Avg Time:</span><span className="text-foreground">{formatTime(selectedPlayer.avgTime)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Success Rate:</span><span className={selectedPlayer.successRate > 50 ? 'text-accent' : 'text-warning'}>{selectedPlayer.successRate}%</span></div>
              {selectedPlayer.achievements.length > 0 && (
                <div className="border-t border-border pt-2">
                  <span className="text-[10px] text-accent uppercase">Achievements Earned:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ACHIEVEMENTS.filter(a => selectedPlayer.achievements.includes(a.id)).map(a => (
                      <span key={a.id} className="text-[10px] px-1.5 py-0.5 rounded border" style={{ borderColor: `${a.tier === 'gold' ? '#ffd700' : a.tier === 'silver' ? '#c0c0c0' : '#cd7f32'}66` }}>
                        {a.icon}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Highscores */}
      {displayScores.length > 0 && (
        <div>
          <h3 className="text-xs font-display text-accent uppercase tracking-wider mb-2 text-center">
            {tab === 'weekly' ? '📅 This Week' : '🏆 Highscores'}
          </h3>
          <div className="space-y-0.5">
            <div className="grid grid-cols-[1.2rem_1fr_2.5rem_2.5rem_3rem_1.5rem] gap-1 text-[9px] font-mono text-muted-foreground uppercase px-1">
              <span>#</span><span>Name</span><span>Kills</span><span>Time</span><span>Score</span><span></span>
            </div>
            {displayScores.map((s, i) => {
              const isMe = currentName && s.player_name === currentName;
              const rl = resultLabel(s.result);
              const earnedIds = s.achievements ? s.achievements.split(',').filter(Boolean) : [];
              const allEarned = ACHIEVEMENTS.filter(a => earnedIds.includes(a.id));
              // Deduplicate: only show highest tier per achievement group
              const groupMap = new Map<string, typeof allEarned[0]>();
              const tierOrder: AchievementTier[] = ['bronze', 'silver', 'gold'];
              for (const a of allEarned) {
                const baseId = a.id.replace(/_(bronze|silver|gold)$/, '');
                const existing = groupMap.get(baseId);
                if (!existing || tierOrder.indexOf(a.tier) > tierOrder.indexOf(existing.tier)) {
                  groupMap.set(baseId, a);
                }
              }
              const earnedAchievements = Array.from(groupMap.values());
              return (
                <div key={s.id}>
                  <div className={`grid grid-cols-[1.2rem_1fr_2.5rem_2.5rem_3rem_1.5rem] gap-1 text-[11px] font-mono px-1 py-0.5 rounded ${isMe ? 'bg-accent/10 text-accent' : 'text-foreground/80'}`}>
                    <span className="text-muted-foreground">{i + 1}</span>
                    <span className="truncate cursor-pointer hover:text-accent hover:underline transition-colors" onClick={() => loadPlayerProfile(s.player_name)}>{s.player_name}</span>
                    <span>{s.kills}</span>
                    <span>{formatTime(Number(s.time_seconds))}</span>
                    <span className="text-accent">{s.score ?? 0}</span>
                    <span className={rl.color}>{rl.icon}</span>
                  </div>
                  {/* Achievements display disabled — code preserved
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
                  */}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Most Decorated section disabled — achievements hidden
      {decorated.length > 0 && (
        <div>
          <h3 className="text-xs font-display text-accent uppercase tracking-wider mb-2 text-center">🏅 Most Decorated</h3>
          <div className="space-y-0.5">
            <div className="grid grid-cols-[1.2rem_1fr] gap-1 text-[9px] font-mono text-muted-foreground uppercase px-1">
              <span>#</span><span>Name</span>
            </div>
            {decorated.map((s, i) => {
              const isMe = currentName && s.player_name === currentName;
              const earnedIds = s.achievements ? s.achievements.split(',').filter(Boolean) : [];
              const allEarned = ACHIEVEMENTS.filter(a => earnedIds.includes(a.id));
              const groupMap = new Map<string, typeof allEarned[0]>();
              const tierOrder: AchievementTier[] = ['bronze', 'silver', 'gold'];
              for (const a of allEarned) {
                const baseId = a.id.replace(/_(bronze|silver|gold)$/, '');
                const existing = groupMap.get(baseId);
                if (!existing || tierOrder.indexOf(a.tier) > tierOrder.indexOf(existing.tier)) {
                  groupMap.set(baseId, a);
                }
              }
              const earnedAchievements = Array.from(groupMap.values());
              return (
                <div key={s.id + '_dec'}>
                  <div className={`grid grid-cols-[1.2rem_1fr] gap-1 text-[11px] font-mono px-1 py-0.5 rounded ${isMe ? 'bg-accent/10 text-accent' : 'text-foreground/80'}`}>
                    <span className="text-muted-foreground">{i + 1}</span>
                    <span className="truncate">{s.player_name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      */}

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
