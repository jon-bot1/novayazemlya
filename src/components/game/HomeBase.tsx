import React, { useState } from 'react';
import { Item } from '../../game/types';

export interface StashState {
  items: Item[];
  rubles: number;
  raidCount: number;
  extractionCount: number;
}

const EMPTY_STASH: StashState = {
  items: [],
  rubles: 0,
  raidCount: 0,
  extractionCount: 0,
};

export function loadStash(): StashState {
  try {
    const raw = localStorage.getItem('nz_stash');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { ...EMPTY_STASH };
}

export function saveStash(stash: StashState) {
  localStorage.setItem('nz_stash', JSON.stringify(stash));
}

interface HomeBaseProps {
  playerName: string;
  stash: StashState;
  onDeploy: () => void;
  onSellItem: (index: number) => void;
  onSellAll: () => void;
}

export const HomeBase: React.FC<HomeBaseProps> = ({ playerName, stash, onDeploy, onSellItem, onSellAll }) => {
  const [tab, setTab] = useState<'stash' | 'trader'>('stash');
  const displayName = playerName === '__anonymous__' ? 'Top Secret Agent' : playerName;
  const stashValue = stash.items.reduce((s, i) => s + i.value, 0);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background z-50">
      <div className="max-w-2xl w-full mx-4 flex flex-col gap-4 p-6 border border-border bg-card rounded max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center border-b border-border pb-4">
          <h1 className="text-2xl font-display text-accent text-glow-green tracking-wider">🏠 SAFE HOUSE</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            Agent <span className="text-foreground">{displayName}</span> — {stash.rubles}₽
          </p>
          <div className="flex gap-4 justify-center mt-2 text-[10px] font-mono text-muted-foreground">
            <span>Raids: {stash.raidCount}</span>
            <span>Extracted: {stash.extractionCount}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border">
          <button
            className={`px-4 py-2 text-xs font-display uppercase tracking-wider transition-colors ${tab === 'stash' ? 'text-accent border-b-2 border-accent' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setTab('stash')}
          >
            📦 Stash
          </button>
          <button
            className={`px-4 py-2 text-xs font-display uppercase tracking-wider transition-colors ${tab === 'trader' ? 'text-accent border-b-2 border-accent' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setTab('trader')}
          >
            🏪 Trader
          </button>
        </div>

        {tab === 'stash' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-display text-muted-foreground uppercase tracking-wider">
                Stash ({stash.items.length} items — {stashValue}₽ total)
              </span>
              {stash.items.length > 0 && (
                <button
                  className="px-3 py-1 text-[10px] font-mono bg-warning/20 text-warning border border-warning/30 rounded hover:bg-warning/30 transition-colors"
                  onClick={onSellAll}
                >
                  💰 SELL ALL ({stashValue}₽)
                </button>
              )}
            </div>
            {stash.items.length === 0 ? (
              <div className="text-center py-8 text-sm font-mono text-muted-foreground/60">
                Your stash is empty. Extract from a raid to bring back loot!
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-[300px] overflow-y-auto">
                {stash.items.map((item, idx) => (
                  <button
                    key={`${item.id}_${idx}`}
                    className="flex flex-col items-center gap-0.5 p-2 bg-secondary/30 border border-border/50 rounded hover:border-warning/50 hover:bg-warning/10 transition-colors group"
                    onClick={() => onSellItem(idx)}
                    title={`${item.name} — ${item.value}₽ (click to sell)`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-[9px] font-mono text-foreground/80 leading-tight text-center truncate w-full">{item.name}</span>
                    <span className="text-[9px] font-mono text-warning group-hover:text-warning">{item.value}₽</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'trader' && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🏪</div>
            <p className="text-sm font-mono text-muted-foreground mb-2">Trader Sidorov</p>
            <p className="text-xs font-mono text-muted-foreground/60 italic">
              "Come back when you have more rubles, friend. I have many things for sale..."
            </p>
            <p className="text-[10px] font-mono text-accent/60 mt-4">
              ⚙ Upgrades shop coming soon
            </p>
          </div>
        )}

        {/* Deploy */}
        <button
          className="w-full px-6 py-4 bg-primary text-primary-foreground font-display uppercase tracking-widest rounded-sm hover:bg-primary/80 transition-colors text-lg mt-2"
          onClick={onDeploy}
        >
          🪖 DEPLOY TO MISSION
        </button>

        <p className="text-[10px] font-mono text-muted-foreground/50 text-center">
          Infiltrate Objekt 47 — Extract with loot to bring it back to your stash
        </p>
      </div>
    </div>
  );
};
