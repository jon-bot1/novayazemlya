import React, { useState, useRef, useCallback } from 'react';
import { Item } from '../../game/types';

interface InventoryPanelProps {
  items: Item[];
  onDropItem?: (index: number) => void;
  inCover?: boolean;
  maxSlots?: number;
}

const categoryIcons: Record<string, string> = {
  weapon: '🔫', ammo: '🎯', medical: '🏥', armor: '🛡️', valuable: '💰',
  grenade: '💣', flashbang: '💫', gas_grenade: '☁️', backpack: '🎒', key: '🔑',
};

export const InventoryPanel: React.FC<InventoryPanelProps> = ({ items, onDropItem, inCover, maxSlots = 12 }) => {
  const [confirmDrop, setConfirmDrop] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<'drop-zone' | null>(null);
  const totalValue = items.reduce((s, i) => s + i.value, 0);
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleDrop = (idx: number) => {
    const item = items[idx];
    if (item && (item.value > 300 || item.category === 'weapon') && confirmDrop !== idx) {
      setConfirmDrop(idx);
      return;
    }
    setConfirmDrop(null);
    onDropItem?.(idx);
  };

  // Drag handlers
  const onDragStart = useCallback((e: React.DragEvent, idx: number) => {
    setDragging(idx);
    setConfirmDrop(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
    // Ghost image
    const el = e.currentTarget as HTMLElement;
    if (el) e.dataTransfer.setDragImage(el, 20, 20);
  }, []);

  const onDragEnd = useCallback(() => {
    setDragging(null);
    setDragOver(null);
  }, []);

  const onDropZoneDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver('drop-zone');
  }, []);

  const onDropZoneDragLeave = useCallback(() => {
    setDragOver(null);
  }, []);

  const onDropZoneDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const idx = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(idx)) {
      onDropItem?.(idx);
    }
    setDragging(null);
    setDragOver(null);
  }, [onDropItem]);

  const cols = 4;
  const rows = Math.ceil(maxSlots / cols);

  return (
    <div ref={panelRef} className="w-48 h-full bg-card/95 backdrop-blur-sm border-l border-border flex flex-col pointer-events-auto select-none">
      {/* Header */}
      <div className="px-2 py-1.5 border-b border-border/60">
        <h2 className="font-display text-[11px] text-foreground tracking-wider">🎒 BACKPACK</h2>
        <div className="flex justify-between text-[9px] font-mono text-muted-foreground mt-0.5">
          <span>{items.length}/{maxSlots}</span>
          <span>{totalWeight.toFixed(1)}kg</span>
          <span>{totalValue}₽</span>
        </div>
        <div className="h-1 bg-secondary/60 rounded-full mt-1 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              items.length >= maxSlots ? 'bg-destructive' : items.length >= maxSlots * 0.8 ? 'bg-warning' : 'bg-accent/70'
            }`}
            style={{ width: `${Math.min(100, (items.length / maxSlots) * 100)}%` }}
          />
        </div>
        {inCover && (
          <div className="text-[8px] font-mono text-accent mt-0.5 text-center animate-pulse">
            🛡️ SAFE — manage gear
          </div>
        )}
      </div>

      {/* Grid — always 4 columns */}
      <div className="flex-1 overflow-y-auto p-1.5 scrollbar-thin">
        <div className="grid grid-cols-4 gap-1">
          {Array.from({ length: maxSlots }).map((_, slotIdx) => {
            const item = items[slotIdx];
            const isEmpty = !item;

            if (isEmpty) {
              return (
                <div
                  key={`empty-${slotIdx}`}
                  className="aspect-square flex items-center justify-center rounded border border-dashed border-border/20 bg-secondary/5"
                >
                  <span className="text-[8px] text-muted-foreground/15">{slotIdx + 1}</span>
                </div>
              );
            }

            return (
              <div
                key={`${item.id}-${slotIdx}`}
                draggable
                onDragStart={(e) => onDragStart(e, slotIdx)}
                onDragEnd={onDragEnd}
                className={`aspect-square relative flex flex-col items-center justify-center p-0.5 rounded border cursor-grab active:cursor-grabbing transition-all group ${
                  dragging === slotIdx
                    ? 'opacity-30 border-accent/50 scale-95'
                    : confirmDrop === slotIdx
                    ? 'bg-destructive/20 border-destructive/50'
                    : 'bg-secondary/20 border-border/30 hover:border-accent/40 hover:bg-secondary/40'
                }`}
                onClick={() => handleDrop(slotIdx)}
                title={`${item.name}${item.value > 0 ? ` — ${item.value}₽` : ''}\n${item.description}\n\nClick to drop · Or drag out`}
              >
                <span className="text-sm leading-none">{item.icon}</span>
                <span className="text-[6px] font-mono text-foreground/60 leading-none mt-0.5 text-center truncate w-full">
                  {item.name.length > 7 ? item.name.slice(0, 6) + '…' : item.name}
                </span>
                {/* Category dot */}
                <span className="absolute top-0 right-0 text-[5px] opacity-50">
                  {categoryIcons[item.category] || '·'}
                </span>
                {/* Value on hover */}
                {item.value > 0 && (
                  <span className="absolute bottom-0 left-0 text-[5px] font-mono text-warning/60 hidden group-hover:block px-0.5">
                    {item.value}₽
                  </span>
                )}
                {/* Confirm overlay */}
                {confirmDrop === slotIdx && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/50 rounded z-10">
                    <span className="text-[7px] font-mono text-destructive-foreground font-bold">DROP?</span>
                    <div className="flex gap-0.5 mt-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDrop(null); onDropItem?.(slotIdx); }}
                        className="text-[7px] bg-destructive text-destructive-foreground rounded px-1 hover:bg-destructive/80"
                      >✓</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDrop(null); }}
                        className="text-[7px] bg-secondary text-foreground rounded px-1 hover:bg-secondary/80"
                      >✕</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Drop zone — visible when dragging */}
      {dragging !== null && (
        <div
          onDragOver={onDropZoneDragOver}
          onDragLeave={onDropZoneDragLeave}
          onDrop={onDropZoneDrop}
          className={`mx-1.5 mb-1.5 py-3 rounded border-2 border-dashed text-center transition-colors ${
            dragOver === 'drop-zone'
              ? 'border-destructive bg-destructive/20 text-destructive'
              : 'border-muted-foreground/30 bg-secondary/10 text-muted-foreground'
          }`}
        >
          <span className="text-[10px] font-mono">
            {dragOver === 'drop-zone' ? '✕ RELEASE TO DROP' : '↓ Drag here to drop'}
          </span>
        </div>
      )}

      {/* Quick stats footer */}
      <div className="px-2 py-1 border-t border-border/40 text-[8px] font-mono text-muted-foreground/70">
        <div className="flex justify-between">
          <span>💊{items.filter(i => i.category === 'medical').length}</span>
          <span>💣{items.filter(i => i.category === 'grenade' || i.category === 'flashbang' || i.category === 'gas_grenade').length}</span>
          <span>🔑{items.filter(i => i.category === 'key').length}</span>
        </div>
      </div>
    </div>
  );
};
