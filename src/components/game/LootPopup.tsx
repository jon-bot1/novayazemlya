import React, { useEffect, useState } from 'react';
import { Item } from '../../game/types';

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
    <div className="absolute bottom-36 right-3 flex flex-col-reverse gap-2 pointer-events-none z-10 max-w-[260px]">
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
  const catColors: Record<string, string> = {
    weapon: 'border-accent/70 bg-accent/15',
    ammo: 'border-warning/70 bg-warning/15',
    medical: 'border-safe/70 bg-safe/15',
    armor: 'border-primary/70 bg-primary/15',
    valuable: 'border-loot/70 bg-loot/15',
    grenade: 'border-warning/70 bg-warning/15',
    key_item: 'border-loot/70 bg-loot/20',
  };

  return (
    <div
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md border-2 backdrop-blur-md shadow-lg transition-all duration-300 ${
        catColors[item.category] || 'border-border bg-card/90'
      } ${visible ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-12 scale-90'}`}
    >
      <span className="text-2xl flex-shrink-0">{item.icon}</span>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-display text-foreground truncate">{item.name}</span>
        <span className="text-[10px] font-mono text-muted-foreground leading-tight">{item.description}</span>
      </div>
      {item.value > 0 && (
        <span className="text-xs font-mono text-loot flex-shrink-0">{item.value}₽</span>
      )}
    </div>
  );
};
