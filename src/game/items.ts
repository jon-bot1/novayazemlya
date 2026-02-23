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

export const WEAPON_TEMPLATES = {
  //                                name         ammo       dmg  icon  bulletSpd range fireRate fireMode
  makarov: () => createWeapon('PM Makarov',    '9x18',     12, '🔫',   7,       45,   400,   'single'),
  ak74:    () => createWeapon('AK-74',         '5.45x39',  25, '🔫',   10,      80,   180,   'auto'),
  akm:     () => createWeapon('AKM',           '7.62x39',  30, '🔫',   9,       70,   250,   'auto'),
  toz:     () => createWeapon('TOZ-34',        '12gauge',  45, '🔫',   6,       30,   900,   'single'),
  mosin:   () => createWeapon('Mosin-Nagant',  '7.62x54R', 50, '🔫',   11,      100,  2000,  'single'),
  ppsh:    () => createWeapon('PPSh-41',       '9x18',      8, '🔫',   6,       25,   80,    'auto'),
};

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

// Context-aware loot pools based on container type
export const LOOT_POOLS = {
  common: (): Item[] => {
    return pickMany<Item>([
      [createMedical('Bandage', 10, '🩹', 'bandage', 3), 0.4],
      [createValuable('Cigarettes', 50, '🚬'), 0.3],
      [createAmmo('5.45x39', 10 + Math.floor(Math.random() * 10)), 0.15],
      [createGrenade(), 0.1],
    ]);
  },
  military: (): Item[] => {
    return pickMany<Item>([
      [createAmmo('5.45x39', 15 + Math.floor(Math.random() * 15)), 0.5],
      [createAmmo('7.62x39', 10 + Math.floor(Math.random() * 10)), 0.4],
      [createMedical('Medkit', 40, '🏥', 'medkit', 1), 0.3],
      [createMedical('Morphine', 100, '💉', 'morphine', 5, 8), 0.08],
      [WEAPON_TEMPLATES.ak74(), 0.15],
      [createValuable('Dogtags', 200, '🏷️'), 0.1],
      [createGrenade(), 0.3],
    ]);
  },
  medical: (): Item[] => {
    return pickMany<Item>([
      [createMedical('Bandage', 10, '🩹', 'bandage', 3), 0.6],
      [createMedical('Medkit', 40, '🏥', 'medkit', 1), 0.4],
      [createMedical('Morphine', 100, '💉', 'morphine', 5, 8), 0.15],
      [createValuable('Painkillers', 100, '💊'), 0.2],
    ]);
  },
  intel: (): Item[] => {
    return pickMany<Item>([
      [createValuable('Notes', 80, '📝'), 0.7],
      [createValuable('Map', 300, '🗺️'), 0.15],
      [createKey('Storage Key', 'key_storage'), 0.12],
      [createKey('Security Key', 'key_security'), 0.08],
    ]);
  },
  body: (): Item[] => {
    return pickMany<Item>([
      [createMedical('Bandage', 10, '🩹', 'bandage', 3), 0.4],
      [createValuable('Dogtags', 200, '🏷️'), 0.15],
      [createGrenade(), 0.2],
      [createFlashbang(), 0.25],
      [createKey('Locker Key', 'key_cabinet'), 0.1],
      [WEAPON_TEMPLATES.makarov(), 0.1],
      [createBackpack(), 0.12],
      [createArmor(), 0.15],
      [createHelmet(), 0.1],
    ]);
  },
};
