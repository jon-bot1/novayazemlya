import React, { useState } from 'react';
import { Item } from '../../game/types';

interface InventoryPanelProps {
  items: Item[];
  onDropItem?: (index: number) => void;
  inCover?: boolean;
  maxSlots?: number;
}

const categoryOrder = ['weapon', 'ammo', 'medical', 'armor', 'grenade', 'flashbang', 'gas_grenade', 'backpack', 'valuable', 'key'] as const;

const categoryIcons: Record<string, string> = {
  weapon: '🔫',
  ammo: '🎯',
  medical: '🏥',
  armor: '🛡️',
  valuable: '💰',
  grenade: '💣',
  flashbang: '💫',
  gas_grenade: '☁️',
  backpack: '🎒',
  key: '🔑',
};

export const InventoryPanel: React.FC<InventoryPanelProps> = ({ items, onDropItem, inCover, maxSlots = 12 }) => {
  const [confirmDrop, setConfirmDrop] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const totalValue = items.reduce((s, i) => s + i.value, 0);
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);

  const handleDrop = (idx: number) => {
    const item = items[idx];
    // Confirm before dropping valuables worth >300₽ or weapons
    if (item && (item.value > 300 || item.category === 'weapon') && confirmDrop !== idx) {
      setConfirmDrop(idx);
      return;
    }
    setConfirmDrop(null);
    onDropItem?.(idx);
  };

  // Group items by category for list view
  const grouped = categoryOrder.map(cat => ({
    cat,
    items: items.map((item, idx) => ({ item, idx })).filter(({ item }) => item.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="w-52 h-full bg-card/95 backdrop-blur-sm border-l border-border flex flex-col pointer-events-auto select-none">
      {/* Header */}
      <div className="px-2.5 py-2 border-b border-border/60">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xs text-foreground tracking-wider">🎒 BACKPACK</h2>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('list')}
              className={`text-[10px] px-1 rounded ${viewMode === 'list' ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
              title="List view"
            >≡</button>
            <button
              onClick={() => setViewMode('grid')}
              className={`text-[10px] px-1 rounded ${viewMode === 'grid' ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
              title="Grid view"
            >⊞</button>
          </div>
        </div>
        <div className="flex justify-between text-[9px] font-mono text-muted-foreground mt-1">
          <span>{items.length}/{maxSlots}</span>
          <span>{totalWeight.toFixed(1)}kg</span>
          <span>{totalValue}₽</span>
        </div>
        {/* Capacity bar */}
        <div className="h-1 bg-secondary/60 rounded-full mt-1 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              items.length >= maxSlots ? 'bg-destructive' : items.length >= maxSlots * 0.8 ? 'bg-warning' : 'bg-accent/70'
            }`}
            style={{ width: `${Math.min(100, (items.length / maxSlots) * 100)}%` }}
          />
        </div>
        {inCover && (
          <div className="text-[8px] font-mono text-accent mt-1 text-center animate-pulse">
            🛡️ IN COVER — safe to manage gear
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-1.5 scrollbar-thin">
        {viewMode === 'list' ? (
          // LIST VIEW
          grouped.map(({ cat, items: catItems }) => (
            <div key={cat} className="mb-1.5">
              <div className="text-[9px] font-display text-accent/80 uppercase tracking-wider px-1 mb-0.5 flex items-center gap-1">
                <span className="text-[10px]">{categoryIcons[cat]}</span>
                <span>{cat.replace('_', ' ')}</span>
                <span className="text-muted-foreground/50">({catItems.length})</span>
              </div>
              {catItems.map(({ item, idx }) => (
                <div
                  key={`${item.id}-${idx}`}
                  className={`group flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-xs transition-colors ${
                    confirmDrop === idx
                      ? 'bg-destructive/20 border border-destructive/40'
                      : 'hover:bg-secondary/50'
                  }`}
                >
                  <span className="text-[10px] shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-[10px] text-foreground truncate block leading-tight">{item.name}</span>
                    {item.healAmount && (
                      <span className="text-[8px] text-accent">+{item.healAmount}HP</span>
                    )}
                    {item.damage && item.damage > 0 && item.category === 'weapon' && (
                      <span className="text-[8px] text-warning">DMG:{item.damage}</span>
                    )}
                  </div>
                  {confirmDrop === idx ? (
                    <div className="flex gap-0.5 shrink-0">
                      <button
                        onClick={() => { setConfirmDrop(null); onDropItem?.(idx); }}
                        className="text-[8px] bg-destructive text-destructive-foreground rounded px-1 py-0.5 hover:bg-destructive/80"
                      >
                        DROP
                      </button>
                      <button
                        onClick={() => setConfirmDrop(null)}
                        className="text-[8px] bg-secondary text-foreground rounded px-1 py-0.5 hover:bg-secondary/80"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-[8px] text-muted-foreground group-hover:hidden shrink-0">
                        {item.value > 0 ? `${item.value}₽` : ''}
                      </span>
                      {onDropItem && (
                        <button
                          onClick={() => handleDrop(idx)}
                          className="hidden group-hover:flex text-[9px] text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded px-1 shrink-0 items-center"
                          title={`Drop ${item.name}`}
                        >
                          ✕
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ))
        ) : (
          // GRID VIEW
          <div className="grid grid-cols-4 gap-1">
            {items.map((item, idx) => (
              <button
                key={`${item.id}-${idx}`}
                className={`relative flex flex-col items-center p-1 rounded border transition-colors group ${
                  confirmDrop === idx
                    ? 'bg-destructive/20 border-destructive/50'
                    : 'bg-secondary/20 border-border/30 hover:border-accent/40 hover:bg-secondary/40'
                }`}
                onClick={() => handleDrop(idx)}
                title={`${item.name}${item.value > 0 ? ` — ${item.value}₽` : ''}\n${item.description}`}
              >
                <span className="text-sm">{item.icon}</span>
                <span className="text-[7px] font-mono text-foreground/70 leading-tight text-center truncate w-full">
                  {item.name.length > 8 ? item.name.slice(0, 7) + '…' : item.name}
                </span>
                {confirmDrop === idx && (
                  <div className="absolute inset-0 flex items-center justify-center bg-destructive/40 rounded">
                    <span className="text-[8px] font-mono text-destructive-foreground font-bold">DROP?</span>
                  </div>
                )}
              </button>
            ))}
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, maxSlots - items.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center justify-center p-1 rounded border border-dashed border-border/20 bg-secondary/5"
              >
                <span className="text-[10px] text-muted-foreground/20">·</span>
              </div>
            ))}
          </div>
        )}

        {items.length === 0 && viewMode === 'list' && (
          <p className="text-center text-muted-foreground/50 text-[10px] font-mono py-8">
            Backpack empty
          </p>
        )}
      </div>

      {/* Quick stats footer */}
      {items.length > 0 && (
        <div className="px-2 py-1.5 border-t border-border/40 text-[8px] font-mono text-muted-foreground/70">
          <div className="flex justify-between">
            <span>💊 {items.filter(i => i.category === 'medical').length}</span>
            <span>💣 {items.filter(i => i.category === 'grenade' || i.category === 'flashbang' || i.category === 'gas_grenade').length}</span>
            <span>🔑 {items.filter(i => i.category === 'key').length}</span>
          </div>
        </div>
      )}
    </div>
  );
};
