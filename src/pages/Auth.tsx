import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

type Mode = 'login' | 'register' | 'forgot';

const Auth: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('nz_remember') === 'true');
  const [email, setEmail] = useState(() => localStorage.getItem('nz_last_email') || '');
  const [password, setPassword] = useState(() => rememberMe ? (localStorage.getItem('nz_saved_pw') || '') : '');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) navigate('/');
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else localStorage.setItem('nz_last_email', email);
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setMessage('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      setError(error.message);
    } else {
      localStorage.setItem('nz_last_email', email);
      setMessage('Check your email for a verification link.');
    }
    setLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setMessage('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    else setMessage('Check your email for a reset link.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full flex flex-col gap-4 p-6 border border-border bg-card rounded">
        <div className="text-center">
          <h1 className="text-2xl font-display text-accent tracking-wider">NOVAYA ZEMLYA</h1>
          <p className="text-[10px] font-mono text-muted-foreground mt-1">
            {mode === 'login' ? 'OPERATOR LOGIN' : mode === 'register' ? 'NEW RECRUIT' : 'PASSWORD RECOVERY'}
          </p>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleForgot} className="flex flex-col gap-3">
          {mode === 'register' && (
            <div>
              <label className="text-xs font-display text-accent uppercase tracking-wider mb-1 block">Callsign</label>
              <input
                type="text"
                maxLength={20}
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Your display name..."
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="text-xs font-display text-accent uppercase tracking-wider mb-1 block">Email</label>
            <input
              type="email"
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="operator@mail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="text-xs font-display text-accent uppercase tracking-wider mb-1 block">Password</label>
              <input
                type="password"
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          )}

          {error && <p className="text-xs font-mono text-destructive">{error}</p>}
          {message && <p className="text-xs font-mono text-safe">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-primary text-primary-foreground font-display uppercase tracking-widest rounded-sm hover:bg-primary/80 transition-colors disabled:opacity-40"
          >
            {loading ? '...' : mode === 'login' ? '▶ LOG IN' : mode === 'register' ? '▶ REGISTER' : '▶ SEND RESET LINK'}
          </button>
        </form>

        <div className="flex flex-col gap-1 text-center">
          {mode === 'login' && (
            <>
              <button onClick={() => { setMode('register'); setError(''); setMessage(''); }} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
                New recruit? Create account
              </button>
              <button onClick={() => { setMode('forgot'); setError(''); setMessage(''); }} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
                Forgot password?
              </button>
            </>
          )}
          {mode !== 'login' && (
            <button onClick={() => { setMode('login'); setError(''); setMessage(''); }} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
              ← Back to login
            </button>
          )}
        </div>

        <div className="border-t border-border pt-3">
          <a href="/" className="block text-center text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
            🎮 Play without account (free)
          </a>
        </div>
      </div>
    </div>
  );
};

export default Auth;
