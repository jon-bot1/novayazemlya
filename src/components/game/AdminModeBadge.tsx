import React from 'react';
import { AdminMode, MODE_CONFIG } from '@/hooks/useAdminMode';

interface AdminModeBadgeProps {
  mode: AdminMode;
  onCycle: () => void;
  compact?: boolean;
}

export const AdminModeBadge: React.FC<AdminModeBadgeProps> = ({ mode, onCycle, compact }) => {
  const config = MODE_CONFIG[mode];

  if (compact) {
    return (
      <button
        onClick={onCycle}
        className={`px-2 py-1 border rounded-sm font-display uppercase tracking-wider text-[9px] transition-colors hover:opacity-70 ${config.badgeClass}`}
        title={config.hint}
      >
        {config.icon} {config.label}
      </button>
    );
  }

  return (
    <button
      onClick={onCycle}
      className={`w-full border rounded p-2 text-center transition-colors hover:opacity-80 cursor-pointer ${config.badgeClass}`}
      title={config.hint}
    >
      <p className="text-xs font-display uppercase tracking-wider">
        {config.icon} {config.label}
      </p>
      <p className="text-[8px] font-mono opacity-60 mt-0.5">{config.hint} — tap to switch</p>
    </button>
  );
};
