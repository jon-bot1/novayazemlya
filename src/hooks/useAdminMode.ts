import { useState, useCallback } from 'react';

export type AdminMode = 'admin' | 'incognito' | 'normal';

const STORAGE_KEY = 'nz_admin_mode';

const MODE_ORDER: AdminMode[] = ['admin', 'incognito', 'normal'];

export function useAdminMode() {
  const [mode, setMode] = useState<AdminMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'incognito' || saved === 'normal') return saved;
    // Migrate old key
    if (localStorage.getItem('adminIncognito') === 'true') {
      localStorage.setItem(STORAGE_KEY, 'incognito');
      localStorage.removeItem('adminIncognito');
      return 'incognito';
    }
    return 'admin';
  });

  const cycleMode = useCallback(() => {
    setMode(prev => {
      const idx = MODE_ORDER.indexOf(prev);
      const next = MODE_ORDER[(idx + 1) % MODE_ORDER.length];
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { mode, cycleMode } as const;
}

export const MODE_CONFIG: Record<AdminMode, { icon: string; label: string; hint: string; badgeClass: string }> = {
  admin: {
    icon: '⭐',
    label: 'ADMIN',
    hint: 'Full access, all unlocked',
    badgeClass: 'border-accent text-accent bg-accent/10',
  },
  incognito: {
    icon: '👻',
    label: 'INCOGNITO',
    hint: 'Anonymous play, nothing logged',
    badgeClass: 'border-muted-foreground text-muted-foreground bg-muted/20',
  },
  normal: {
    icon: '🛡️',
    label: 'NORMAL',
    hint: 'Regular account, progress saved',
    badgeClass: 'border-primary text-primary bg-primary/10',
  },
};
