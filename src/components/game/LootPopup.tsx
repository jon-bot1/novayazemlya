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
    <div className="absolute bottom-36 right-3 flex flex-col-reverse gap-1.5 pointer-events-none z-10 max-w-[200px]">
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
    weapon: 'border-accent/60 bg-accent/10',
    ammo: 'border-warning/60 bg-warning/10',
    medical: 'border-safe/60 bg-safe/10',
    armor: 'border-primary/60 bg-primary/10',
    valuable: 'border-loot/60 bg-loot/10',
  };

  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded border backdrop-blur-sm transition-all duration-300 ${
        catColors[item.category] || 'border-border bg-card/80'
      } ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
    >
      <span className="text-base">{item.icon}</span>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-mono text-foreground truncate">{item.name}</span>
        <span className="text-[9px] font-mono text-muted-foreground">{item.description}</span>
      </div>
    </div>
  );
};
