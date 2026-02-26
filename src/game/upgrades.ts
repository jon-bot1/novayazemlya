export interface Upgrade {
  id: string;
  name: string;
  icon: string;
  description: string;
  cost: number;
  maxLevel: number;
  effect: string; // human-readable
}

export const UPGRADES: Upgrade[] = [
  {
    id: 'red_dot',
    name: 'Red Dot Sight',
    icon: '🔴',
    description: 'Improved accuracy — bullets move faster',
    cost: 300,
    maxLevel: 1,
    effect: '+25% bullet speed',
  },
  {
    id: 'ext_mag',
    name: 'Extended Magazine',
    icon: '📎',
    description: 'Larger magazine capacity',
    cost: 250,
    maxLevel: 3,
    effect: '+10 ammo per level',
  },
  {
    id: 'ergonomics',
    name: 'Ergonomic Grip',
    icon: '🤚',
    description: 'Faster weapon handling — reduced fire rate delay',
    cost: 400,
    maxLevel: 2,
    effect: '-10% fire rate per level',
  },
  {
    id: 'backpack',
    name: 'Tactical Backpack',
    icon: '🎒',
    description: 'Carry more loot from raids',
    cost: 500,
    maxLevel: 3,
    effect: '+4 inventory slots per level',
  },
  {
    id: 'helmet',
    name: 'Ballistic Helmet',
    icon: '⛑️',
    description: 'Reduces incoming damage',
    cost: 600,
    maxLevel: 2,
    effect: '+10 armor per level',
  },
  {
    id: 'medkit_upgrade',
    name: 'IFAK Pouch',
    icon: '🩹',
    description: 'Start each raid with a medkit',
    cost: 350,
    maxLevel: 1,
    effect: 'Free medkit on deploy',
  },
  {
    id: 'sprint_boots',
    name: 'Tactical Boots',
    icon: '👢',
    description: 'Move faster overall',
    cost: 450,
    maxLevel: 2,
    effect: '+8% speed per level',
  },
  {
    id: 'grenade_vest',
    name: 'Grenade Vest',
    icon: '🦺',
    description: 'Start each raid with extra grenades',
    cost: 400,
    maxLevel: 2,
    effect: '+1 grenade per level on deploy',
  },
];

export type UpgradeState = Record<string, number>; // upgrade id → level

export function getUpgradeLevel(upgrades: UpgradeState, id: string): number {
  return upgrades[id] || 0;
}

export function canBuyUpgrade(upgrades: UpgradeState, id: string, rubles: number): boolean {
  const upgrade = UPGRADES.find(u => u.id === id);
  if (!upgrade) return false;
  const currentLevel = getUpgradeLevel(upgrades, id);
  if (currentLevel >= upgrade.maxLevel) return false;
  const cost = upgrade.cost * (currentLevel + 1); // price scales with level
  return rubles >= cost;
}

export function getUpgradeCost(upgrade: Upgrade, currentLevel: number): number {
  return upgrade.cost * (currentLevel + 1);
}
