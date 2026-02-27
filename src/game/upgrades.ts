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
  {
    id: 'match_barrel',
    name: 'Match-Grade Barrel',
    icon: '🎯',
    description: 'Precision barrel — increases critical hit chance',
    cost: 550,
    maxLevel: 3,
    effect: '+5% critical hit chance per level',
  },
];

// Consumable items for sale at trader
export interface TraderItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  cost: number;
  category: 'weapon' | 'ammo' | 'medical' | 'grenade' | 'gear';
}

export const TRADER_ITEMS: TraderItem[] = [
  { id: 'buy_injector', name: 'Emergency Injector', icon: '💉', description: 'Auto-revive to 75 HP on lethal hit', cost: 350, category: 'medical' },
  { id: 'buy_bandage', name: 'Bandage', icon: '🩹', description: 'Stops bleeding, heals 10 HP', cost: 50, category: 'medical' },
  { id: 'buy_medkit', name: 'Medkit', icon: '🏥', description: 'Heals 40 HP', cost: 150, category: 'medical' },
  { id: 'buy_morphine', name: 'Morphine', icon: '💉', description: 'Full restore + speed boost', cost: 400, category: 'medical' },
  { id: 'buy_frag', name: 'F-1 Grenade', icon: '💣', description: '200 damage in 150px radius', cost: 200, category: 'grenade' },
  { id: 'buy_flashbang', name: 'Flashbang', icon: '💫', description: 'Stuns enemies for 3 seconds', cost: 180, category: 'grenade' },
  { id: 'buy_gas', name: 'Gas Grenade', icon: '☁️', description: 'Converts one enemy to ally for 20s', cost: 500, category: 'grenade' },
  { id: 'buy_tnt', name: 'TNT Charge', icon: '🧨', description: 'Breach walls, massive damage', cost: 350, category: 'grenade' },
  { id: 'buy_ammo_545', name: '5.45x39 x20', icon: '🔫', description: '20 rounds of 5.45x39', cost: 80, category: 'ammo' },
  { id: 'buy_ammo_762', name: '7.62x39 x15', icon: '🔫', description: '15 rounds of 7.62x39', cost: 100, category: 'ammo' },
  { id: 'buy_ammo_54r', name: '7.62x54R x10', icon: '🔫', description: '10 rounds for Mosin', cost: 120, category: 'ammo' },
  { id: 'buy_armor', name: 'Body Armor', icon: '🦺', description: '+30 armor protection', cost: 300, category: 'gear' },
  { id: 'buy_helmet', name: 'Helmet', icon: '⛑️', description: '+15 armor protection', cost: 200, category: 'gear' },
  { id: 'buy_goggles', name: 'Tactical Goggles', icon: '🥽', description: '-50% flashbang duration', cost: 250, category: 'gear' },
  { id: 'buy_backpack', name: 'Tactical Backpack', icon: '🎒', description: '+4 inventory slots (1 use)', cost: 300, category: 'gear' },
  { id: 'buy_knife', name: 'Combat Knife', icon: '🗡️', description: 'Silent melee sidearm', cost: 350, category: 'weapon' },
  { id: 'buy_ak74', name: 'AK-74', icon: '🔫', description: 'Reliable assault rifle', cost: 800, category: 'weapon' },
  { id: 'buy_mosin', name: 'Mosin-Nagant', icon: '🔫', description: 'Bolt-action sniper rifle', cost: 600, category: 'weapon' },
  { id: 'buy_toz', name: 'TOZ-34 Shotgun', icon: '🔫', description: 'Devastating close range buckshot', cost: 500, category: 'weapon' },
  { id: 'buy_propaganda', name: 'Propaganda Leaflet', icon: '📢', description: 'Converts one enemy to ally for 60s', cost: 600, category: 'gear' },
  { id: 'buy_dogfood', name: 'Dog Food', icon: '🦴', description: 'Neutralizes a guard dog', cost: 100, category: 'gear' },
];

// XP level thresholds — level N requires XP_LEVELS[N-1] total XP
export const XP_LEVELS = [
  0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000,
  5200, 6600, 8200, 10000, 12500, 15500, 19000, 23000, 28000, 35000,
];

export function getLevelForXp(xp: number): number {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i]) return i + 1;
  }
  return 1;
}

export function getXpForNextLevel(xp: number): { current: number; needed: number; progress: number } {
  const level = getLevelForXp(xp);
  if (level >= XP_LEVELS.length) return { current: xp, needed: xp, progress: 1 };
  const currentThreshold = XP_LEVELS[level - 1];
  const nextThreshold = XP_LEVELS[level];
  return {
    current: xp - currentThreshold,
    needed: nextThreshold - currentThreshold,
    progress: (xp - currentThreshold) / (nextThreshold - currentThreshold),
  };
}

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
