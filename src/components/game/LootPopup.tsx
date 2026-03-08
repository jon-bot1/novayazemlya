import React, { useEffect, useState } from 'react';
import { Item } from '../../game/types';
import { getItemRarity, RARITY_BG, RARITY_GLOW, RARITY_LABEL, RARITY_COLORS } from '../../game/rarity';

export interface LootNotification {
  id: string;
  item: Item;
  timestamp: number;
}

interface LootPopupProps {
  notifications: LootNotification[];
}

export const LootPopup: React.FC<LootPopupProps> = ({ notifications }) => {
  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 flex flex-col gap-1.5 pointer-events-none z-10 max-w-[280px]">
      {notifications.map((n) => (
        <LootPopupItem key={n.id} notification={n} />
      ))}
    </div>
  );
};

const LootPopupItem: React.FC<{ notification: LootNotification }> = ({ notification }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const item = notification.item;
  const rarity = getItemRarity(item.value, item.category);
  const rarityColor = RARITY_COLORS[rarity];

  return (
    <div
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md border-2 backdrop-blur-md shadow-lg transition-all duration-300 ${RARITY_BG[rarity]} ${RARITY_GLOW[rarity]} ${visible ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-12 scale-90'}`}
    >
      <span className="text-2xl flex-shrink-0">{item.icon}</span>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-display text-foreground truncate">{item.name}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono font-bold" style={{ color: rarityColor }}>{RARITY_LABEL[rarity]}</span>
          <span className="text-[10px] font-mono text-muted-foreground leading-tight truncate">{item.description}</span>
        </div>
      </div>
      {item.value > 0 && (
        <span className="text-xs font-mono text-loot flex-shrink-0">{item.value}₽</span>
      )}
    </div>
  );
};
