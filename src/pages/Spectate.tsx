import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface ActiveSession {
  id: string;
  player_name: string;
  map_id: string;
  hp: number;
  max_hp: number;
  kills: number;
  rubles: number;
  level: number;
  position_x: number;
  position_y: number;
  enemies_alive: number;
  time_elapsed: number;
  status: string;
  last_heartbeat: string;
  created_at: string;
}

const MAP_LABELS: Record<string, string> = {
  objekt47: 'Objekt 47',
  fishing_village: 'Fiskebyn',
  hospital: 'Sjukhuset',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  playing: { label: 'LIVE', color: 'text-green-400' },
  extracted: { label: 'EXTRACTED', color: 'text-accent' },
  dead: { label: 'KIA', color: 'text-destructive' },
  abandoned: { label: 'ABANDONED', color: 'text-muted-foreground' },
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function timeSince(isoString: string): string {
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 10) return 'just now';
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const Spectate: React.FC = () => {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('active_sessions')
      .select('*')
      .order('last_heartbeat', { ascending: false });
    if (data) setSessions(data as ActiveSession[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();

    // Realtime subscription
    const channel = supabase
      .channel('spectate-sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_sessions' },
        () => fetchSessions()
      )
      .subscribe();

    // Refresh stale check every 10s
    const interval = setInterval(fetchSessions, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  // Separate active (heartbeat < 15s ago) from stale
  const now = Date.now();
  const activeSessions = sessions.filter(s => {
    const age = (now - new Date(s.last_heartbeat).getTime()) / 1000;
    return age < 15 && s.status === 'playing';
  });
  const recentSessions = sessions.filter(s => {
    const age = (now - new Date(s.last_heartbeat).getTime()) / 1000;
    return !(age < 15 && s.status === 'playing');
  }).slice(0, 20);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display text-accent tracking-wider">📡 SPECTATOR</h1>
            <p className="text-xs font-mono text-muted-foreground mt-1">Live session monitor — Novaya Zemlya</p>
          </div>
          <button
            className="px-3 py-1.5 text-xs font-mono border border-border rounded hover:bg-card transition-colors text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/')}
          >
            ← Back
          </button>
        </div>

        {/* Active sessions */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-sm font-display text-foreground uppercase tracking-wider">
              Live Now ({activeSessions.length})
            </h2>
          </div>

          {loading ? (
            <div className="text-xs font-mono text-muted-foreground p-4 text-center">Loading...</div>
          ) : activeSessions.length === 0 ? (
            <div className="border border-border rounded p-6 text-center bg-card/50">
              <p className="text-sm font-mono text-muted-foreground">No active players right now</p>
              <p className="text-xs font-mono text-muted-foreground/60 mt-1">Sessions appear when someone starts a raid</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {activeSessions.map(s => (
                <SessionCard key={s.id} session={s} isLive />
              ))}
            </div>
          )}
        </div>

        {/* Recent sessions */}
        {recentSessions.length > 0 && (
          <div>
            <h2 className="text-sm font-display text-muted-foreground uppercase tracking-wider mb-3">
              Recent Sessions
            </h2>
            <div className="grid gap-2">
              {recentSessions.map(s => (
                <SessionCard key={s.id} session={s} isLive={false} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SessionCard: React.FC<{ session: ActiveSession; isLive: boolean }> = ({ session: s, isLive }) => {
  const statusInfo = STATUS_LABELS[s.status] || STATUS_LABELS.playing;
  const hpPct = s.max_hp > 0 ? Math.round((s.hp / s.max_hp) * 100) : 0;
  const hpColor = hpPct > 60 ? 'text-green-400' : hpPct > 30 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className={`border rounded p-3 sm:p-4 bg-card/80 ${isLive ? 'border-green-800/60' : 'border-border/60'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isLive && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
          <span className="font-display text-sm text-foreground">{s.player_name}</span>
          <span className={`text-[10px] font-mono ${statusInfo.color} px-1.5 py-0.5 border border-current/30 rounded`}>
            {statusInfo.label}
          </span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">{timeSince(s.last_heartbeat)}</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px] font-mono">
        <div>
          <span className="text-muted-foreground block">Map</span>
          <span className="text-foreground">{MAP_LABELS[s.map_id] || s.map_id}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">HP</span>
          <span className={hpColor}>{s.hp}/{s.max_hp}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">Kills</span>
          <span className="text-foreground">{s.kills}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">₽</span>
          <span className="text-accent">{s.rubles}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">Level</span>
          <span className="text-foreground">{s.level}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">Time</span>
          <span className="text-foreground">{formatTime(s.time_elapsed)}</span>
        </div>
      </div>

      {isLive && (
        <div className="mt-2">
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${hpPct > 60 ? 'bg-green-600' : hpPct > 30 ? 'bg-yellow-600' : 'bg-red-600'}`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Spectate;
