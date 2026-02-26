import React, { useState } from 'react';
import { Item } from '../../game/types';
import { UPGRADES, UpgradeState, getUpgradeLevel, getUpgradeCost, canBuyUpgrade } from '../../game/upgrades';
import { MissionObjective } from '../../game/objectives';

export interface StashState {
  items: Item[];
  rubles: number;
  raidCount: number;
  extractionCount: number;
  upgrades: UpgradeState;
}

const EMPTY_STASH: StashState = {
  items: [],
  rubles: 0,
  raidCount: 0,
  extractionCount: 0,
  upgrades: {},
};

export function loadStash(): StashState {
  try {
    const raw = localStorage.getItem('nz_stash');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...EMPTY_STASH, ...parsed };
    }
  } catch {}
  return { ...EMPTY_STASH };
}

export function saveStash(stash: StashState) {
  localStorage.setItem('nz_stash', JSON.stringify(stash));
}

interface HomeBaseProps {
  playerName: string;
  stash: StashState;
  objectives: MissionObjective[];
  onDeploy: () => void;
  onSellItem: (index: number) => void;
  onSellAll: () => void;
  onBuyUpgrade: (upgradeId: string) => void;
  onRerollObjectives: () => void;
}

export const HomeBase: React.FC<HomeBaseProps> = ({ playerName, stash, objectives, onDeploy, onSellItem, onSellAll, onBuyUpgrade, onRerollObjectives }) => {
  const [tab, setTab] = useState<'stash' | 'trader' | 'mission'>('mission');
  const displayName = playerName === '__anonymous__' ? 'Top Secret Agent' : playerName;
  const stashValue = stash.items.reduce((s, i) => s + i.value, 0);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background z-50">
      <div className="max-w-2xl w-full mx-4 flex flex-col gap-4 p-6 border border-border bg-card rounded max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center border-b border-border pb-4">
          <h1 className="text-2xl font-display text-accent text-glow-green tracking-wider">🏠 SAFE HOUSE</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            Agent <span className="text-foreground">{displayName}</span> — <span className="text-warning">{stash.rubles}₽</span>
          </p>
          <div className="flex gap-4 justify-center mt-2 text-[10px] font-mono text-muted-foreground">
            <span>Raids: {stash.raidCount}</span>
            <span>Extracted: {stash.extractionCount}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border">
          {([
            { key: 'mission', label: '🎯 Mission', },
            { key: 'stash', label: '📦 Stash' },
            { key: 'trader', label: '🏪 Trader' },
          ] as const).map(t => (
            <button
              key={t.key}
              className={`px-4 py-2 text-xs font-display uppercase tracking-wider transition-colors ${tab === t.key ? 'text-accent border-b-2 border-accent' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Mission Tab */}
        {tab === 'mission' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-display text-accent uppercase tracking-wider">Mission Briefing</span>
              <button
                className="px-2 py-1 text-[10px] font-mono text-muted-foreground border border-border rounded hover:text-foreground hover:border-foreground/30 transition-colors"
                onClick={onRerollObjectives}
              >
                🔄 New Mission
              </button>
            </div>
            {objectives.map(obj => (
              <div
                key={obj.id}
                className={`flex items-start gap-3 p-3 rounded border ${
                  obj.type === 'main'
                    ? 'border-warning/40 bg-warning/5'
                    : 'border-border/50 bg-secondary/20'
                }`}
              >
                <span className="text-lg">{obj.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-display text-foreground">{obj.name}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                      obj.type === 'main'
                        ? 'bg-warning/20 text-warning border border-warning/30'
                        : 'bg-secondary/40 text-muted-foreground border border-border/30'
                    }`}>
                      {obj.type === 'main' ? 'MAIN' : 'BONUS'}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{obj.description}</p>
                  <p className="text-[10px] font-mono text-warning mt-0.5">Reward: {obj.reward}₽</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stash Tab */}
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

        {/* Trader Tab */}
        {tab === 'trader' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🏪</span>
              <div>
                <span className="text-xs font-display text-foreground">Trader Sidorov</span>
                <p className="text-[10px] font-mono text-muted-foreground italic">"What are you buying, stranger?"</p>
              </div>
            </div>
            <div className="grid gap-2 max-h-[400px] overflow-y-auto">
              {UPGRADES.map(upgrade => {
                const currentLevel = getUpgradeLevel(stash.upgrades, upgrade.id);
                const maxed = currentLevel >= upgrade.maxLevel;
                const cost = getUpgradeCost(upgrade, currentLevel);
                const affordable = canBuyUpgrade(stash.upgrades, upgrade.id, stash.rubles);

                return (
                  <div
                    key={upgrade.id}
                    className={`flex items-center gap-3 p-3 rounded border transition-colors ${
                      maxed
                        ? 'border-accent/30 bg-accent/5 opacity-60'
                        : affordable
                        ? 'border-warning/40 bg-warning/5 hover:bg-warning/10 cursor-pointer'
                        : 'border-border/30 bg-secondary/10 opacity-50'
                    }`}
                    onClick={() => !maxed && affordable && onBuyUpgrade(upgrade.id)}
                  >
                    <span className="text-2xl">{upgrade.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-display text-foreground">{upgrade.name}</span>
                        {maxed && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 bg-accent/20 text-accent border border-accent/30 rounded">MAX</span>
                        )}
                        {!maxed && (
                          <span className="text-[9px] font-mono text-muted-foreground">
                            Lv {currentLevel}/{upgrade.maxLevel}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-muted-foreground">{upgrade.description}</p>
                      <p className="text-[9px] font-mono text-accent">{upgrade.effect}</p>
                    </div>
                    {!maxed && (
                      <div className="text-right">
                        <span className={`text-sm font-mono ${affordable ? 'text-warning' : 'text-muted-foreground'}`}>
                          {cost}₽
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
