import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { LogoutButton } from '@/components/game/LogoutButton';
import { AdminModeBadge } from '@/components/game/AdminModeBadge';
import { useAdminMode } from '@/hooks/useAdminMode';

interface ProfileData {
  display_name: string;
  bonus_rubles: number;
}

interface HighscoreEntry {
  id: string;
  player_name: string;
  kills: number;
  loot_value: number;
  time_seconds: number;
  result: string;
  achievements: string | null;
  created_at: string;
}

interface ProgressData {
  player_name: string;
  level: number;
  xp: number;
  rubles: number;
  raid_count: number;
  extraction_count: number;
  stash_items: any;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [runs, setRuns] = useState<HighscoreEntry[]>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newCallsign, setNewCallsign] = useState('');
  const [callsignMsg, setCallsignMsg] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const { mode: adminMode, cycleMode } = useAdminMode();

  // Account management
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [accountMsg, setAccountMsg] = useState('');
  const [accountErr, setAccountErr] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);

  // Feedback
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Tab
  const [tab, setTab] = useState<'stats' | 'account' | 'feedback'>('stats');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
      supabase.rpc('get_my_roles').then(({ data }) => {
        if (data && Array.isArray(data)) setIsAdmin(data.includes('admin'));
      });
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Load profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('display_name, bonus_rubles')
      .eq('id', user.id)
      .single();
    if (profileData) setProfile(profileData);

    const callsign = profileData?.display_name || '';

    // Load highscores for this player
    if (callsign) {
      const { data: runsData } = await supabase
        .from('highscores')
        .select('*')
        .eq('player_name', callsign)
        .order('created_at', { ascending: false })
        .limit(50);
      if (runsData) setRuns(runsData);

      // Load progress
      const { data: progData } = await supabase
        .from('player_progress')
        .select('player_name, level, xp, rubles, raid_count, extraction_count, stash_items')
        .eq('player_name', callsign)
        .single();
      if (progData) setProgress(progData);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUpdateEmail = async () => {
    setAccountLoading(true); setAccountErr(''); setAccountMsg('');
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) setAccountErr(error.message);
    else setAccountMsg('Confirmation link sent to new email.');
    setAccountLoading(false);
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) { setAccountErr('Password must be at least 6 characters.'); return; }
    setAccountLoading(true); setAccountErr(''); setAccountMsg('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setAccountErr(error.message);
    else { setAccountMsg('Password updated!'); setNewPassword(''); }
    setAccountLoading(false);
  };


  const handleFeedback = async () => {
    setFeedbackLoading(true); setFeedbackMsg('');
    const { error } = await supabase.from('tester_feedback').insert({
      rating,
      comment: comment.trim() || null,
      player_name: profile?.display_name || null,
    });
    if (error) setFeedbackMsg('Failed to send. Try again.');
    else { setFeedbackMsg('Thanks for your feedback!'); setComment(''); }
    setFeedbackLoading(false);
  };

  // Derived stats
  const totalKills = runs.reduce((s, r) => s + r.kills, 0);
  const totalLoot = runs.reduce((s, r) => s + r.loot_value, 0);
  const extractions = runs.filter(r => r.result === 'extracted').length;
  const deaths = runs.filter(r => r.result !== 'extracted').length;
  const survivalRate = runs.length > 0 ? Math.round((extractions / runs.length) * 100) : 0;
  const bestTime = runs.filter(r => r.result === 'extracted').reduce((best, r) => Math.min(best, r.time_seconds), Infinity);
  const avgKills = runs.length > 0 ? (totalKills / runs.length).toFixed(1) : '0';
  const bestKills = runs.reduce((best, r) => Math.max(best, r.kills), 0);
  const bestLoot = runs.reduce((best, r) => Math.max(best, r.loot_value), 0);

  // Parse all achievements from runs
  const allAchievements = new Set<string>();
  runs.forEach(r => {
    if (r.achievements) {
      r.achievements.split(',').filter(Boolean).forEach(a => allAchievements.add(a.trim()));
    }
  });

  const formatTime = (s: number) => {
    if (!isFinite(s)) return '—';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm font-mono text-muted-foreground">Loading dossier...</p>
      </div>
    );
  }

  const tabClass = (t: string) =>
    `flex-1 px-3 py-2 font-display uppercase tracking-wider text-[11px] border-b-2 transition-colors ${
      tab === t ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
    }`;

  return (
    <div className="min-h-screen bg-background p-4 overflow-auto" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' as any, position: 'fixed', inset: 0 }}>
      <div className="max-w-2xl mx-auto flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display text-accent tracking-wider">{profile?.display_name || 'OPERATOR'}</h1>
            <p className="text-[10px] font-mono text-muted-foreground">
              Level {progress?.level ?? 1} · {progress?.xp ?? 0} XP · {progress?.rubles ?? 0} ₽
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && <AdminModeBadge mode={adminMode} onCycle={cycleMode} compact />}
            <a href="/" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">← Back</a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button className={tabClass('stats')} onClick={() => setTab('stats')}>📊 Stats</button>
          <button className={tabClass('account')} onClick={() => setTab('account')}>⚙️ Account</button>
          <button className={tabClass('feedback')} onClick={() => setTab('feedback')}>💬 Feedback</button>
        </div>

        {/* Stats Tab */}
        {tab === 'stats' && (
          <div className="flex flex-col gap-4">
            {/* Overview grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Raids', value: progress?.raid_count ?? runs.length },
                { label: 'Extractions', value: extractions },
                { label: 'Deaths', value: deaths },
                { label: 'Survival %', value: `${survivalRate}%` },
                { label: 'Total Kills', value: totalKills },
                { label: 'Avg Kills', value: avgKills },
                { label: 'Best Kills', value: bestKills },
                { label: 'Best Loot', value: `${bestLoot} ₽` },
                { label: 'Total Loot', value: `${totalLoot} ₽` },
                { label: 'Fastest Exfil', value: formatTime(bestTime) },
                { label: 'Stash Items', value: Array.isArray(progress?.stash_items) ? (progress.stash_items as any[]).length : 0 },
                { label: 'Bonus Rubles', value: `${profile?.bonus_rubles ?? 0} ₽` },
              ].map(s => (
                <div key={s.label} className="border border-border rounded p-3 bg-card">
                  <p className="text-[9px] font-display text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className="text-lg font-display text-foreground">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Achievements */}
            {allAchievements.size > 0 && (
              <div className="border border-border rounded p-3 bg-card">
                <p className="text-[10px] font-display text-accent uppercase tracking-wider mb-2">Achievements Earned</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(allAchievements).map(a => (
                    <span key={a} className="px-2 py-0.5 bg-accent/10 border border-accent/30 text-accent text-[10px] font-mono rounded-sm">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Run history */}
            <div className="border border-border rounded p-3 bg-card">
              <p className="text-[10px] font-display text-accent uppercase tracking-wider mb-2">Recent Raids</p>
              {runs.length === 0 ? (
                <p className="text-xs font-mono text-muted-foreground">No raids recorded yet.</p>
              ) : (
                <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                  {runs.slice(0, 20).map(r => (
                    <div key={r.id} className="flex items-center justify-between text-[11px] font-mono py-1 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={r.result === 'extracted' ? 'text-safe' : 'text-destructive'}>
                          {r.result === 'extracted' ? '✓' : '✗'}
                        </span>
                        <span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>🔫 {r.kills}</span>
                        <span>💰 {r.loot_value}₽</span>
                        <span>⏱ {formatTime(r.time_seconds)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Account Tab */}
        {tab === 'account' && (
          <div className="flex flex-col gap-4">
            <div className="border border-border rounded p-4 bg-card flex flex-col gap-3">
              <p className="text-[10px] font-display text-accent uppercase tracking-wider">Email: <span className="text-foreground normal-case">{user?.email}</span></p>

              <div>
                <label className="text-xs font-display text-muted-foreground uppercase tracking-wider mb-1 block">Callsign / Nickname</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={20}
                    className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder={profile?.display_name || 'Your callsign...'}
                    value={newCallsign}
                    onChange={e => setNewCallsign(e.target.value)}
                  />
                  <button
                    onClick={async () => {
                      if (!newCallsign.trim()) return;
                      setAccountLoading(true); setCallsignMsg('');
                      const { error } = await supabase.from('profiles').update({ display_name: newCallsign.trim() }).eq('id', user.id);
                      if (error) setCallsignMsg('Failed to update.');
                      else { setCallsignMsg('Callsign updated!'); setProfile(p => p ? { ...p, display_name: newCallsign.trim() } : p); setNewCallsign(''); }
                      setAccountLoading(false);
                    }}
                    disabled={accountLoading || !newCallsign.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground font-display uppercase tracking-wider text-[11px] rounded-sm hover:bg-primary/80 disabled:opacity-40"
                  >
                    Spara
                  </button>
                </div>
                {callsignMsg && <p className="text-xs font-mono text-safe mt-1">{callsignMsg}</p>}
              </div>

              <div>
                <label className="text-xs font-display text-muted-foreground uppercase tracking-wider mb-1 block">Change Email</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="ny@email.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                  />
                  <button onClick={handleUpdateEmail} disabled={accountLoading || !newEmail} className="px-4 py-2 bg-primary text-primary-foreground font-display uppercase tracking-wider text-[11px] rounded-sm hover:bg-primary/80 disabled:opacity-40">
                    Update
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-display text-muted-foreground uppercase tracking-wider mb-1 block">Change Password</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    minLength={6}
                  />
                  <button onClick={handleUpdatePassword} disabled={accountLoading || !newPassword} className="px-4 py-2 bg-primary text-primary-foreground font-display uppercase tracking-wider text-[11px] rounded-sm hover:bg-primary/80 disabled:opacity-40">
                    Update
                  </button>
                </div>
              </div>

              {accountErr && <p className="text-xs font-mono text-destructive">{accountErr}</p>}
              {accountMsg && <p className="text-xs font-mono text-safe">{accountMsg}</p>}
            </div>

            <LogoutButton />
          </div>
        )}

        {/* Feedback Tab */}
        {tab === 'feedback' && (
          <div className="border border-border rounded p-4 bg-card flex flex-col gap-3">
            <p className="text-[10px] font-display text-accent uppercase tracking-wider">Tell us what you think</p>

            <div>
              <label className="text-xs font-display text-muted-foreground uppercase tracking-wider mb-1 block">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(v => (
                  <button
                    key={v}
                    onClick={() => setRating(v)}
                    className={`w-10 h-10 rounded-sm font-display text-sm transition-colors ${
                      v <= rating ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {v}★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-display text-muted-foreground uppercase tracking-wider mb-1 block">Comment</label>
              <textarea
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                rows={4}
                maxLength={1000}
                placeholder="Bugs, suggestions, thoughts..."
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
            </div>

            <button
              onClick={handleFeedback}
              disabled={feedbackLoading}
              className="w-full px-4 py-3 bg-primary text-primary-foreground font-display uppercase tracking-wider text-[11px] rounded-sm hover:bg-primary/80 disabled:opacity-40"
            >
              {feedbackLoading ? '...' : '▶ Submit Feedback'}
            </button>
            {feedbackMsg && <p className="text-xs font-mono text-safe">{feedbackMsg}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
