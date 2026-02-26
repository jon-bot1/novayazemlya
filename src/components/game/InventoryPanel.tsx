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

const categoryColors: Record<string, string> = {
  weapon: 'border-danger/60 bg-danger/10',
  ammo: 'border-warning/50 bg-warning/8',
  medical: 'border-safe/50 bg-safe/8',
  armor: 'border-accent/50 bg-accent/8',
  valuable: 'border-loot/50 bg-loot/8',
  grenade: 'border-danger/40 bg-danger/8',
  flashbang: 'border-warning/40 bg-warning/8',
  gas_grenade: 'border-safe/50 bg-safe/10',
  backpack: 'border-accent/40 bg-accent/8',
  key: 'border-warning/60 bg-warning/10',
};

export const InventoryPanel: React.FC<InventoryPanelProps> = ({ items, onDropItem, inCover, maxSlots = 12 }) => {
  const [confirmDrop, setConfirmDrop] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
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
    setSelectedSlot(null);
    onDropItem?.(idx);
  };

  const onDragStart = useCallback((e: React.DragEvent, idx: number) => {
    setDragging(idx);
    setConfirmDrop(null);
    setSelectedSlot(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
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

  const fillPercent = Math.min(100, (items.length / maxSlots) * 100);

  return (
    <div ref={panelRef} className="w-44 h-[62vh] bg-card/55 backdrop-blur-md border border-border/40 rounded-lg shadow-xl flex flex-col pointer-events-auto select-none overflow-hidden">
      {/* Backpack header with shape */}
      <div className="px-2 pt-2 pb-1">
        <div className="relative mx-auto w-36">
          {/* SVG Backpack outline */}
          <svg viewBox="0 0 120 40" className="w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Straps */}
            <path d="M35 2 C35 0, 38 0, 38 2 L38 12" className="stroke-muted-foreground/30" strokeWidth="2" fill="none" />
            <path d="M82 2 C82 0, 85 0, 85 2 L85 12" className="stroke-muted-foreground/30" strokeWidth="2" fill="none" />
            {/* Main body outline */}
            <rect x="12" y="8" width="96" height="28" rx="6" className="stroke-accent/40 fill-accent/5" strokeWidth="1.5" strokeDasharray="3 2" />
            {/* Top flap */}
            <path d="M18 8 Q60 2, 102 8" className="stroke-accent/30" strokeWidth="1" fill="none" />
            {/* Buckle */}
            <rect x="55" y="5" width="10" height="5" rx="1" className="fill-accent/20 stroke-accent/40" strokeWidth="0.5" />
          </svg>
          {/* Stats overlay */}
          <div className="absolute inset-0 flex items-center justify-center gap-3 text-[8px] font-mono text-muted-foreground">
            <span>{items.length}/{maxSlots}</span>
            <span>{totalWeight.toFixed(1)}kg</span>
            <span className="text-warning">{totalValue}₽</span>
          </div>
        </div>
        {/* Fill bar shaped like backpack bottom */}
        <div className="h-1.5 bg-secondary/40 rounded-b-lg mx-2 mt-0.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-b-lg ${
              items.length >= maxSlots ? 'bg-destructive' : items.length >= maxSlots * 0.8 ? 'bg-warning' : 'bg-accent/60'
            }`}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
        {inCover && (
          <div className="text-[8px] font-mono text-accent mt-0.5 text-center animate-pulse">
            🛡️ SAFE — manage gear
          </div>
        )}
      </div>

      {/* Item grid — backpack contents */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-1 scrollbar-thin">
        <div className="grid grid-cols-4 gap-[3px]">
          {Array.from({ length: maxSlots }).map((_, slotIdx) => {
            const item = items[slotIdx];
            const isEmpty = !item;
            const isSelected = selectedSlot === slotIdx;

            if (isEmpty) {
              return (
                <div
                  key={`empty-${slotIdx}`}
                  className="aspect-square flex items-center justify-center rounded-md border border-dashed border-border/15 bg-secondary/5"
                >
                  <span className="text-[7px] text-muted-foreground/10 font-mono">{slotIdx + 1}</span>
                </div>
              );
            }

            const catStyle = categoryColors[item.category] || 'border-border/30 bg-secondary/20';

            return (
              <div
                key={`${item.id}-${slotIdx}`}
                draggable
                onDragStart={(e) => onDragStart(e, slotIdx)}
                onDragEnd={onDragEnd}
                className={`aspect-square relative flex flex-col items-center justify-center p-0.5 rounded-md border cursor-pointer transition-all ${
                  dragging === slotIdx
                    ? 'opacity-30 scale-90 border-accent/50'
                    : confirmDrop === slotIdx
                    ? 'bg-destructive/25 border-destructive/60 scale-105'
                    : isSelected
                    ? `${catStyle} ring-1 ring-accent/60 scale-105`
                    : `${catStyle} hover:scale-105 hover:ring-1 hover:ring-accent/30 active:scale-95`
                }`}
                onClick={() => {
                  if (isSelected) {
                    handleDrop(slotIdx);
                  } else {
                    setSelectedSlot(slotIdx);
                    setConfirmDrop(null);
                  }
                }}
              >
                <span className="text-sm leading-none drop-shadow-sm">{item.icon}</span>
                <span className="text-[6px] font-mono text-foreground/70 leading-none mt-0.5 text-center truncate w-full">
                  {item.name.length > 7 ? item.name.slice(0, 6) + '…' : item.name}
                </span>
                {/* Category dot */}
                <span className="absolute top-0 right-0.5 text-[5px] opacity-40">
                  {categoryIcons[item.category] || '·'}
                </span>
                {/* Value badge */}
                {item.value > 0 && isSelected && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[6px] font-mono text-warning bg-card/90 px-1 rounded-sm border border-warning/30 whitespace-nowrap z-10">
                    {item.value}₽
                  </span>
                )}
                {/* Confirm overlay */}
                {confirmDrop === slotIdx && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/60 rounded-md z-10 backdrop-blur-[1px]">
                    <span className="text-[7px] font-mono text-destructive-foreground font-bold">DROP?</span>
                    <div className="flex gap-0.5 mt-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDrop(null); setSelectedSlot(null); onDropItem?.(slotIdx); }}
                        className="text-[7px] bg-destructive text-destructive-foreground rounded px-1 hover:bg-destructive/80"
                      >✓</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDrop(null); setSelectedSlot(null); }}
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

      {/* Selected item detail */}
      {selectedSlot !== null && items[selectedSlot] && (
        <div className="mx-1.5 mb-1 p-1.5 rounded-md border border-accent/30 bg-accent/5 text-center">
          <div className="text-[9px] font-mono text-foreground font-bold">{items[selectedSlot].icon} {items[selectedSlot].name}</div>
          <div className="text-[8px] font-mono text-muted-foreground mt-0.5 leading-tight">{items[selectedSlot].description}</div>
          <div className="flex justify-center gap-2 mt-1 text-[8px] font-mono">
            {items[selectedSlot].value > 0 && <span className="text-warning">{items[selectedSlot].value}₽</span>}
            <span className="text-muted-foreground">{items[selectedSlot].weight}kg</span>
          </div>
          <button
            className="mt-1 px-2 py-0.5 text-[8px] font-mono bg-destructive/20 text-destructive border border-destructive/30 rounded hover:bg-destructive/40 transition-colors"
            onClick={() => handleDrop(selectedSlot)}
          >
            ✕ DROP ITEM
          </button>
        </div>
      )}

      {/* Drop zone — visible when dragging */}
      {dragging !== null && (
        <div
          onDragOver={onDropZoneDragOver}
          onDragLeave={onDropZoneDragLeave}
          onDrop={onDropZoneDrop}
          className={`mx-1.5 mb-1.5 py-3 rounded-md border-2 border-dashed text-center transition-colors ${
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
          <span>💣{items.filter(i => i.category === 'grenade').length}</span>
          <span>☣️{items.filter(i => i.category === 'gas_grenade').length}</span>
          <span>💫{items.filter(i => i.category === 'flashbang').length}</span>
          <span>🔑{items.filter(i => i.category === 'key').length}</span>
          <span>💉{items.filter(i => i.id === 'emergency_injector').length}</span>
        </div>
      </div>
    </div>
  );
};
