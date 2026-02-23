import React from 'react';
import { Item } from '../../game/types';

interface InventoryPanelProps {
  items: Item[];
  open: boolean;
  onClose: () => void;
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({ items, open, onClose }) => {
  if (!open) return null;

  const categories = ['weapon', 'ammo', 'medical', 'armor', 'valuable'] as const;
  const totalValue = items.reduce((s, i) => s + i.value, 0);
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm pointer-events-auto z-20">
      <div className="w-80 max-h-[80vh] bg-card border border-border rounded overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-display text-lg text-foreground tracking-wider">INVENTORY</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xs font-mono"
          >
            [CLOSE]
          </button>
        </div>

        {/* Stats */}
        <div className="flex justify-between px-4 py-2 text-xs font-mono text-muted-foreground border-b border-border/50">
          <span>{items.length} items</span>
          <span>{totalWeight.toFixed(1)} kg</span>
          <span>{totalValue}₽</span>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-2">
          {categories.map(cat => {
            const catItems = items.filter(i => i.category === cat);
            if (catItems.length === 0) return null;
            return (
              <div key={cat} className="mb-3">
                <h3 className="text-xs font-display text-accent uppercase tracking-wider px-2 mb-1">
                  {cat}
                </h3>
                {catItems.map((item, i) => (
                  <div
                    key={`${item.id}-${i}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-secondary/50 text-sm"
                  >
                    <span>{item.icon}</span>
                    <span className="flex-1 font-mono text-xs text-foreground">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.value}₽</span>
                  </div>
                ))}
              </div>
            );
          })}
          {items.length === 0 && (
            <p className="text-center text-muted-foreground text-xs font-mono py-8">No items</p>
          )}
        </div>
      </div>
    </div>
  );
};
