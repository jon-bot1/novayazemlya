import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface LogoutButtonProps {
  className?: string;
  compact?: boolean;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({ className, compact }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (compact) {
    return (
      <button
        onClick={handleLogout}
        className={`px-3 py-1.5 text-[10px] font-display uppercase tracking-wider text-destructive border border-destructive/30 rounded-sm hover:bg-destructive/10 transition-colors ${className || ''}`}
      >
        ⏻ Log Out
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      className={`w-full px-4 py-3 border border-destructive/40 text-destructive font-display uppercase tracking-wider text-[11px] rounded-sm hover:bg-destructive/10 transition-colors ${className || ''}`}
    >
      ⏻ Log Out
    </button>
  );
};
