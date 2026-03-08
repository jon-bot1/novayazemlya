import { Item, AmmoType, MedicalType } from './types';

let itemIdCounter = 0;
const nextId = () => `item_${itemIdCounter++}`;

export const createWeapon = (
  name: string, ammoType: AmmoType, damage: number, icon: string,
  bulletSpeed: number = 8, weaponRange: number = 60, weaponFireRate: number = 400,
  fireMode: 'single' | 'auto' = 'single'
): Item => ({
  id: nextId(),
  name,
  category: 'weapon',
  icon,
  weight: 3,
  value: Math.floor(damage * 100),
  ammoType,
  damage,
  bulletSpeed,
  weaponRange,
  weaponFireRate,
  fireMode,
  description: `${name} — ${ammoType}`,
});

export const createAmmo = (type: AmmoType, count: number): Item => ({
  id: nextId(),
  name: `${type} x${count}`,
  category: 'ammo',
  icon: '🔫',
  weight: 0.5,
  value: count * 5,
  ammoType: type,
  ammoCount: count,
  description: `${count} rounds of ${type}`,
});

export const createMedical = (name: string, heal: number, icon: string, medType: MedicalType, stopsBleeding: number = 0, speedBoost: number = 0): Item => ({
  id: nextId(),
  name,
  category: 'medical',
  icon,
  weight: medType === 'morphine' ? 0.3 : medType === 'medkit' ? 1 : 0.5,
  value: heal * 10,
  healAmount: heal,
  medicalType: medType,
  stopsBleeding,
  speedBoost,
  description: medType === 'bandage' 
    ? `Stops bleeding, restores ${heal} HP`
    : medType === 'morphine'
    ? `Full restore + temporary speed boost`
    : `Restores ${heal} HP`,
});

export const createValuable = (name: string, value: number, icon: string): Item => ({
  id: nextId(),
  name,
  category: 'valuable',
  icon,
  weight: 1,
  value,
  description: `Worth ${value}₽`,
});

export const createKey = (name: string, keyId: string): Item => ({
  id: keyId,
  name,
  category: 'key',
  icon: '🔑',
  weight: 0.1,
  value: 0,
  description: `Key: ${name}`,
});

export const createKeycard = (): Item => ({
  id: 'gate_keycard',
  name: 'Access Card',
  category: 'key',
  icon: '💳',
  weight: 0.1,
  value: 100,
  description: 'Electronic access card — opens the main gate',
});

export const createExtractionCode = (): Item => ({
  id: 'extraction_code',
  name: 'Extraction Code',
  category: 'valuable',
  icon: '🔑',
  weight: 0.1,
  value: 0,
  description: 'Code required to activate the extraction point',
});

export const createGrenade = (name: string = 'RGD-5', damage: number = 200, radius: number = 150): Item => ({
  id: nextId(),
  name,
  category: 'grenade',
  icon: '💣',
  weight: 0.6,
  value: 150,
  damage,
  description: `Grenade — ${damage} damage in ${radius}px radius`,
});

export const createFlashbang = (): Item => ({
  id: nextId(),
  name: 'Flashbang',
  category: 'flashbang',
  icon: '💫',
  weight: 0.4,
  value: 120,
  damage: 0,
  description: 'Blinds enemies and player — 3 second effect',
});

export const createBackpack = (): Item => ({
  id: nextId(),
  name: 'Tactical Backpack',
  category: 'backpack',
  icon: '🎒',
  weight: 0,
  value: 200,
  description: 'Increases carry capacity — more room for loot',
});

export const createArmor = (name: string = 'Body Armor', armor: number = 30, icon: string = '🦺'): Item => ({
  id: nextId(),
  name,
  category: 'armor',
  icon,
  weight: 3,
  value: armor * 10,
  damage: armor,
  description: `${name} — +${armor} protection`,
});

export const createGasGrenade = (): Item => ({
  id: nextId(),
  name: 'Gas Grenade',
  category: 'gas_grenade',
  icon: '☣️',
  weight: 0.5,
  value: 400,
  damage: -2, // -2 marker = gas grenade (different from -1 flashbang)
  description: 'Tactical gas grenade — converts one enemy for 20s in a green cloud',
});

export const createPropaganda = (): Item => ({
  id: nextId(),
  name: 'Propaganda Leaflet',
  category: 'special',
  icon: '📢',
  weight: 0.1,
  value: 200,
  description: 'Convince a nearby enemy to fight for you for 60s. Press [X] to use.',
});

export const createDogFood = (): Item => ({
  id: nextId(),
  name: 'Dog Food',
  category: 'special',
  icon: '🦴',
  weight: 0.3,
  value: 50,
  description: 'Neutralizes a dog — it loses interest and wanders off. Press [X] near dog.',
});

export const createTNT = (): Item => ({
  id: nextId(),
  name: 'TNT Charge',
  category: 'valuable',
  icon: '🧨',
  weight: 2,
  value: 500,
  description: 'Explosive charge — can breach outer walls',
});

export const createHelmet = (): Item => ({
  id: nextId(),
  name: 'Helmet',
  category: 'armor',
  icon: '⛑️',
  weight: 1.5,
  value: 250,
  damage: 15,
  description: 'Head protection — +15 armor',
});

export const createGoggles = (): Item => ({
  id: 'goggles',
  name: 'Tactical Goggles',
  category: 'armor',
  icon: '🥽',
  weight: 0.3,
  value: 300,
  damage: 0,
  description: 'Protects against flashbangs — 50% reduced blind duration',
});

export const WEAPON_TEMPLATES = {
  // ═══════════════════════════════════════════════════════════════════
  // WEAPON BALANCE ALGORITHM
  // ─────────────────────────────────────────────────────────────────
  // Target effective DPS (damage per second) tiers:
  //   Tier 1 (sidearms):   ~25-35 eDPS   — always available, weak
  //   Tier 2 (SMGs/shotgun): ~40-55 eDPS — high ROF or burst, short range
  //   Tier 3 (rifles):     ~35-45 eDPS   — balanced, auto penalty applied
  //   Tier 4 (precision):  ~35-40 eDPS   — single-shot, long range, high per-hit
  //   Tier 5 (heavy):      ~50-60 eDPS   — rare, heavy, ammo-hungry
  //
  // Auto weapons: raw DPS is reduced by 0.6x accuracy factor (spread/recoil)
  // Formula: eDPS = (damage × 1000 / fireRate) × (auto ? 0.6 : 1.0)
  // Tradeoffs: high damage → slow fire / short range / small mag / heavy
  // ═══════════════════════════════════════════════════════════════════

  // ── SIDEARMS (Tier 1) ──────────────────────────────────────────
  // Makarov:   15 × 1000/420 = 35.7 eDPS, mag 8        → common sidearm
  makarov:  () => { const w = createWeapon('PM Makarov',    '9x18',     15, '🔫',  8,    40,  420,  'single'); w.weaponSlot = 'secondary'; return w; },
  // Revolver:  22 × 1000/800 = 27.5 eDPS, mag 7        → slow but punchy
  revolver: () => { const w = createWeapon('Nagant M1895',  '9x18',     22, '🔫',  9,    50,  800,  'single'); w.weaponSlot = 'secondary'; w.weight = 1; return w; },

  // ── MELEE (special tier — no ammo) ─────────────────────────────
  baton:    () => { const w = createWeapon('Baton',         '9x18',     10, '🔫',  3.6,   8,  500,  'single'); w.weaponSlot = 'secondary'; w.weight = 0.5; w.description = 'Melee — short range baton strike'; return w; },
  knife:    () => { const w = createWeapon('Combat Knife',  '9x18',     40, '🗡️',  3.6,   6,  300,  'single'); w.weaponSlot = 'secondary'; w.weight = 0.3; w.description = 'Melee — fast, silent, deadly up close'; return w; },

  // ── SMGs (Tier 2) ──────────────────────────────────────────────
  // PPSh:  8 × 1000/100 × 0.6 = 48 eDPS, mag 35        → bullet hose, low per-hit
  ppsh:     () => { const w = createWeapon('PPSh-41',       '9x18',      8, '🔫',  6,    22,  100,  'auto'); w.weaponSlot = 'primary'; return w; },
  // Kpist: 10 × 1000/120 × 0.6 = 50 eDPS, mag 36       → Swedish SMG, slightly better
  kpist45:  () => { const w = createWeapon('Kpist m/45',    '9x18',     10, '🔫',  7,    25,  120,  'auto'); w.weaponSlot = 'primary'; w.weight = 2.5; w.description = 'Carl Gustaf SMG — high ROF, burns through ammo'; return w; },

  // ── SHOTGUN (Tier 2) ──────────────────────────────────────────
  // TOZ: 11×5 pellets = 55 potential, but spread → ~33 eDPS at range, mag 2
  toz:      () => { const w = createWeapon('TOZ-34',        '12gauge',  11, '🔫',  7,    20, 1100,  'single'); w.weaponSlot = 'primary'; w.isBuckshot = true; w.pelletCount = 5; w.coneAngle = 0.55; return w; },

  // ── ASSAULT RIFLES (Tier 3) — auto penalty keeps eDPS in check ─
  // AK-74: 16 × 1000/280 × 0.6 = 34.3 eDPS, mag 30    → controllable, common
  ak74:     () => { const w = createWeapon('AK-74',         '5.45x39',  16, '🔫', 10,    60,  280,  'auto'); w.weaponSlot = 'primary'; return w; },
  // AKM:   20 × 1000/360 × 0.6 = 33.3 eDPS, mag 30     → harder hitting, slower
  akm:      () => { const w = createWeapon('AKM',           '7.62x39',  20, '🔫',  9,    50,  360,  'auto'); w.weaponSlot = 'primary'; return w; },
  // Ak 4:  24 × 1000/400 × 0.6 = 36 eDPS, mag 20        → battle rifle, heavy
  ak4:      () => { const w = createWeapon('Ak 4',          '7.62x39',  24, '🔫', 11,    70,  400,  'auto'); w.weaponSlot = 'primary'; w.weight = 4; w.description = 'Ak 4 (HK G3) — hard-hitting battle rifle, heavy recoil'; return w; },

  // ── PRECISION (Tier 4) ─────────────────────────────────────────
  // Mosin: 50 × 1000/1800 = 27.8 eDPS, mag 5           → one-shot potential, very slow
  mosin:    () => { const w = createWeapon('Mosin-Nagant',  '7.62x54R', 50, '🔫', 13,    95, 1800,  'single'); w.weaponSlot = 'primary'; return w; },

  // ── HEAVY / LEGENDARY (Tier 5) ─────────────────────────────────
  // Ksp 58: 20 × 1000/160 × 0.6 = 75 eDPS BUT weight 6, mag 50, rare ammo
  ksp58:    () => { const w = createWeapon('Ksp 58',        '7.62x54R', 20, '🔫', 10,    75,  160,  'auto'); w.weaponSlot = 'primary'; w.weight = 6; w.description = 'Ksp 58 (FN MAG) — devastating but extremely heavy, eats ammo'; return w; },

  // ── SPECIAL ────────────────────────────────────────────────────
  laser:    () => { const w = createWeapon('Laser Designator', '9x18', 0, '🔴', 0, 0, 3000, 'single'); w.weaponSlot = 'primary'; w.weight = 1; w.description = 'Laser designator — calls in mortar fire on target. 3s delay.'; (w as any).isLaserDesignator = true; return w; },
};

// ── WEAPON MODIFICATIONS ──
export const createScope = (): Item => ({
  id: nextId(),
  name: 'Red Dot Scope',
  category: 'weapon_mod',
  icon: '🔭',
  weight: 0.3,
  value: 250,
  description: 'Attach to weapon: +20% bullet speed',
  modType: 'scope',
  modBulletSpeedBonus: 0.20,
});

export const createSuppressor = (): Item => ({
  id: nextId(),
  name: 'Suppressor',
  category: 'weapon_mod',
  icon: '🔇',
  weight: 0.4,
  value: 350,
  description: 'Attach to weapon: -50% shot noise radius',
  modType: 'suppressor',
  modNoiseReduction: 0.50,
});

export const createExtMagazine = (): Item => ({
  id: nextId(),
  name: 'Extended Magazine',
  category: 'weapon_mod',
  icon: '📎',
  weight: 0.2,
  value: 200,
  description: 'Attach to weapon: +8 magazine capacity',
  modType: 'ext_magazine',
  modMagBonus: 8,
});

export function isSecondaryWeapon(item: Item): boolean {
  if (item.weaponSlot) return item.weaponSlot === 'secondary';
  // Fallback for legacy items without slot tag
  const secondaryNames = ['makarov', 'nagant', 'baton', 'knife'];
  return secondaryNames.some(n => item.name.toLowerCase().includes(n));
}

// Weighted random pick helper
function pick<T>(items: [T, number][]): T | null {
  for (const [item, chance] of items) {
    if (Math.random() < chance) return item;
  }
  return null;
}

function pickMany<T>(items: [T, number][]): T[] {
  const result: T[] = [];
  for (const [item, chance] of items) {
    if (Math.random() < chance) result.push(item);
  }
  return result;
}

type LootPoolType = 'common' | 'military' | 'medical' | 'intel' | 'body';

// 20 random valuable items for loot variety
const RANDOM_VALUABLES = [
  () => createValuable('Cigarettes', 50, '🚬'),
  () => createValuable('Vodka Bottle', 80, '🍾'),
  () => createValuable('Military Watch', 150, '⌚'),
  () => createValuable('Gold Ring', 200, '💍'),
  () => createValuable('Compass', 60, '🧭'),
  () => createValuable('Radio Parts', 120, '📻'),
  () => createValuable('Camera Film', 90, '📷'),
  () => createValuable('Silver Chain', 170, '⛓️'),
  () => createValuable('Ration Pack', 40, '🥫'),
  () => createValuable('Lighter', 30, '🔥'),
  () => createValuable('Old Coins', 110, '🪙'),
  () => createValuable('Binoculars', 140, '🔭'),
  () => createValuable('Pocket Knife', 55, '🔪'),
  () => createValuable('Flask', 45, '🫗'),
  () => createValuable('Battery Pack', 70, '🔋'),
  () => createValuable('Transistor', 95, '🔌'),
  () => createValuable('Dog Tags', 130, '🏷️'),
  () => createValuable('Propaganda Poster', 35, '📜'),
  () => createValuable('Broken Phone', 65, '📱'),
  () => createValuable('Fuel Canister', 100, '⛽'),
];

function randomValuable(): Item {
  return RANDOM_VALUABLES[Math.floor(Math.random() * RANDOM_VALUABLES.length)]();
}

// Context-aware loot pools based on container type
export const LOOT_POOLS = {
  common: (): Item[] => {
    return pickMany<Item>([
      [createMedical('Bandage', 10, '🩹', 'bandage', 3), 0.25],
      [randomValuable(), 0.5],
      [randomValuable(), 0.25],
      [createAmmo('9x18', 3 + Math.floor(Math.random() * 3)), 0.06],
      [createGrenade(), 0.12],
      [createTNT(), 0.12],
    ]);
  },
  military: (): Item[] => {
    return pickMany<Item>([
      [createAmmo('5.45x39', 2 + Math.floor(Math.random() * 3)), 0.12],
      [createAmmo('7.62x39', 2 + Math.floor(Math.random() * 2)), 0.10],
      [createMedical('Medkit', 40, '🏥', 'medkit', 1), 0.10],
      [createMedical('Morphine', 100, '💉', 'morphine', 5, 8), 0.02],
      [WEAPON_TEMPLATES.ak74(), 0.08],
      [WEAPON_TEMPLATES.akm(), 0.05],
      [randomValuable(), 0.30],
      [randomValuable(), 0.15],
      [createGrenade(), 0.15],
      [createGasGrenade(), 0.10],
      [createTNT(), 0.10],
      [createScope(), 0.06],
      [createSuppressor(), 0.04],
      [createExtMagazine(), 0.05],
    ]);
  },
  medical: (): Item[] => {
    return pickMany<Item>([
      [createMedical('Bandage', 10, '🩹', 'bandage', 3), 0.55],
      [createMedical('Medkit', 40, '🏥', 'medkit', 1), 0.35],
      [createMedical('Morphine', 100, '💉', 'morphine', 5, 8), 0.12],
      [randomValuable(), 0.3],
    ]);
  },
  intel: (): Item[] => {
    return pickMany<Item>([
      [randomValuable(), 0.6],
      [createValuable('Map', 300, '🗺️'), 0.15],
      [createKey('Storage Key', 'key_storage'), 0.12],
      [createKey('Security Key', 'key_security'), 0.08],
    ]);
  },
  body: (): Item[] => {
    return pickMany<Item>([
      [createMedical('Bandage', 10, '🩹', 'bandage', 3), 0.35],
      [randomValuable(), 0.4],
      [randomValuable(), 0.25],
      [createGrenade(), 0.25],
      [createFlashbang(), 0.25],
      [createGasGrenade(), 0.22],
      [createKey('Locker Key', 'key_cabinet'), 0.1],
      [WEAPON_TEMPLATES.makarov(), 0.20],
      [WEAPON_TEMPLATES.revolver(), 0.12],
      [WEAPON_TEMPLATES.knife(), 0.10],
      [createBackpack(), 0.1],
      [createArmor(), 0.12],
      [createHelmet(), 0.08],
      [createTNT(), 0.15],
      [createGoggles(), 0.08],
    ]);
  },
  // Weapon cabinet — high chance of finding weapons
  weapon_cabinet: (): Item[] => {
    return pickMany<Item>([
      [WEAPON_TEMPLATES.ak74(), 0.30],
      [WEAPON_TEMPLATES.akm(), 0.20],
      [WEAPON_TEMPLATES.toz(), 0.25],
      [WEAPON_TEMPLATES.mosin(), 0.15],
      [WEAPON_TEMPLATES.ppsh(), 0.15],
      [WEAPON_TEMPLATES.makarov(), 0.30],
      [WEAPON_TEMPLATES.revolver(), 0.25],
      [WEAPON_TEMPLATES.knife(), 0.25],
      [WEAPON_TEMPLATES.laser(), 0.08],
      [createAmmo('5.45x39', 4 + Math.floor(Math.random() * 4)), 0.35],
      [createAmmo('7.62x39', 3 + Math.floor(Math.random() * 4)), 0.30],
      [createAmmo('7.62x54R', 2 + Math.floor(Math.random() * 3)), 0.20],
      [createGrenade(), 0.25],
      [createFlashbang(), 0.15],
      [createGasGrenade(), 0.15],
      [createScope(), 0.10],
      [createSuppressor(), 0.08],
      [createExtMagazine(), 0.10],
    ]);
  },
  // Swedish weapon cabinet — Gruvsamhället map
  weapon_cabinet_swedish: (): Item[] => {
    return pickMany<Item>([
      [WEAPON_TEMPLATES.kpist45(), 0.30],
      [WEAPON_TEMPLATES.ak4(), 0.25],
      [WEAPON_TEMPLATES.ksp58(), 0.10],
      [WEAPON_TEMPLATES.toz(), 0.20],
      [WEAPON_TEMPLATES.mosin(), 0.12],
      [WEAPON_TEMPLATES.makarov(), 0.25],
      [WEAPON_TEMPLATES.knife(), 0.20],
      [createAmmo('9x18', 5 + Math.floor(Math.random() * 5)), 0.35],
      [createAmmo('7.62x39', 3 + Math.floor(Math.random() * 4)), 0.30],
      [createAmmo('7.62x54R', 2 + Math.floor(Math.random() * 3)), 0.25],
      [createGrenade(), 0.20],
      [createFlashbang(), 0.12],
      [createScope(), 0.10],
      [createSuppressor(), 0.08],
      [createExtMagazine(), 0.10],
    ]);
  },
};
