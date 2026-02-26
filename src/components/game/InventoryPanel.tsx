import React from 'react';
import { Item } from '../../game/types';

interface InventoryPanelProps {
  items: Item[];
  onDropItem?: (index: number) => void;
}

const categoryLabels: Record<string, string> = {
  weapon: 'weapons',
  ammo: 'ammunition',
  medical: 'medical',
  armor: 'armor',
  valuable: 'valuables',
  grenade: 'grenades',
  flashbang: 'flashbangs',
  backpack: 'equipment',
  key: 'keys',
};

const categoryIcons: Record<string, string> = {
  weapon: '🔫',
  ammo: '🎯',
  medical: '🏥',
  armor: '🛡️',
  valuable: '💰',
  grenade: '💣',
  flashbang: '💫',
  backpack: '🎒',
  key: '🔑',
};

export const InventoryPanel: React.FC<InventoryPanelProps> = ({ items, onDropItem }) => {
  const categories = ['weapon', 'ammo', 'medical', 'armor', 'grenade', 'flashbang', 'backpack', 'valuable', 'key'] as const;
  const totalValue = items.reduce((s, i) => s + i.value, 0);
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);

  return (
    <div className="w-56 h-full bg-card/90 backdrop-blur-sm border-l border-border flex flex-col pointer-events-auto">
      <div className="px-3 py-2 border-b border-border/60">
        <h2 className="font-display text-sm text-foreground tracking-wider">📦 INVENTORY</h2>
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
          <span>{items.length} pcs</span>
          <span>{totalWeight.toFixed(1)} kg</span>
          <span>{totalValue}₽</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 scrollbar-thin">
        {categories.map(cat => {
          const catItems = items
            .map((item, idx) => ({ item, idx }))
            .filter(({ item }) => item.category === cat);
          if (catItems.length === 0) return null;
          return (
            <div key={cat} className="mb-2">
              <h3 className="text-[10px] font-display text-accent uppercase tracking-wider px-1.5 mb-0.5 flex items-center gap-1">
                <span>{categoryIcons[cat]}</span>
                {categoryLabels[cat] || cat}
              </h3>
              {catItems.map(({ item, idx }) => (
                <div key={`${item.id}-${idx}`} className="group flex items-center gap-1.5 px-1.5 py-1 rounded-sm hover:bg-secondary/50 text-xs">
                  <span className="text-[11px]">{item.icon}</span>
                  <span className="flex-1 font-mono text-[10px] text-foreground truncate">{item.name}</span>
                  <span className="text-[9px] text-muted-foreground group-hover:hidden">{item.value}₽</span>
                  {onDropItem && (
                    <button
                      onClick={() => onDropItem(idx)}
                      className="hidden group-hover:block text-[9px] text-destructive hover:text-destructive-foreground hover:bg-destructive/60 rounded px-1"
                      title="Drop item"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="text-center text-muted-foreground text-[10px] font-mono py-6">Empty</p>
        )}
      </div>
    </div>
  );
};
