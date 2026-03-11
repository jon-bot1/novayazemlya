import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { LogoutButton } from '@/components/game/LogoutButton';
import { AdminModeBadge } from '@/components/game/AdminModeBadge';
import { useAdminMode } from '@/hooks/useAdminMode';

const PACKAGES = [
  { id: 'bonus_500', label: '500 Bonus Rubles', rubles: 500, price: '€4.99 / $4.99 / 50 SEK', popular: false },
  { id: 'bonus_1500', label: '1,500 Bonus Rubles', rubles: 1500, price: '€12.99 / $12.99 / 130 SEK', popular: true },
  { id: 'bonus_5000', label: '5,000 Bonus Rubles', rubles: 5000, price: '€39.99 / $39.99 / 400 SEK', popular: false },
];

const Store: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { mode: adminMode, cycleMode } = useAdminMode();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        supabase.rpc('get_my_roles').then(({ data }) => {
          if (data && Array.isArray(data)) setIsAdmin(data.includes('admin'));
        });
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handlePurchase = async (packageId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    // TODO: Integrate Stripe checkout here
    alert('Stripe is not connected yet. Payment will be available soon!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm font-mono text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' as any }}>
      <div className="max-w-lg w-full flex flex-col gap-6 p-6 border border-border bg-card rounded">
        <div className="text-center">
          <h1 className="text-2xl font-display text-accent tracking-wider">SUPPLY DROP</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">Purchase bonus rubles for your stash</p>
        </div>

        <div className="flex flex-col gap-3">
          {PACKAGES.map(pkg => (
            <button
              key={pkg.id}
              onClick={() => handlePurchase(pkg.id)}
              className={`relative flex items-center justify-between p-4 border rounded transition-colors ${
                pkg.popular
                  ? 'border-accent bg-accent/10 hover:bg-accent/20'
                  : 'border-border hover:bg-secondary/50'
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-2 right-3 px-2 py-0.5 bg-accent text-accent-foreground text-[9px] font-display uppercase tracking-wider rounded-sm">
                  Popular
                </span>
              )}
              <div className="text-left">
                <p className="text-sm font-display text-foreground">{pkg.label}</p>
                <p className="text-xs font-mono text-muted-foreground">{pkg.price}</p>
              </div>
              <span className="text-xs font-display text-accent uppercase tracking-wider">Buy →</span>
            </button>
          ))}
        </div>

        {!user && (
          <p className="text-xs font-mono text-muted-foreground text-center">
            You need to <a href="/auth" className="text-accent hover:underline">log in</a> to purchase.
          </p>
        )}

        <div className="flex items-center justify-between">
          <a href="/" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
            ← Back to game
          </a>
          {user && <LogoutButton compact />}
        </div>
      </div>
    </div>
  );
};

export default Store;
