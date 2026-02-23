import { Item, AmmoType, MedicalType } from './types';

let itemIdCounter = 0;
const nextId = () => `item_${itemIdCounter++}`;

export const createWeapon = (
  name: string, ammoType: AmmoType, damage: number, icon: string,
  bulletSpeed: number = 8, weaponRange: number = 60, weaponFireRate: number = 400
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
  description: `${count} patroner ${type}`,
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
    ? `Stoppar blödning, återställer ${heal} HP`
    : medType === 'morphine'
    ? `Full återställning + tillfällig hastighetsboost`
    : `Återställer ${heal} HP`,
});

export const createValuable = (name: string, value: number, icon: string): Item => ({
  id: nextId(),
  name,
  category: 'valuable',
  icon,
  weight: 1,
  value,
  description: `Värt ${value}₽`,
});

export const createKey = (name: string, keyId: string): Item => ({
  id: keyId,
  name,
  category: 'key',
  icon: '🔑',
  weight: 0.1,
  value: 0,
  description: `Nyckel: ${name}`,
});

export const createKeycard = (): Item => ({
  id: 'gate_keycard',
  name: 'Passerkort',
  category: 'key',
  icon: '💳',
  weight: 0.1,
  value: 100,
  description: 'Elektroniskt passerkort — öppnar basens huvudgrind',
});

export const createExtractionCode = (): Item => ({
  id: 'extraction_code',
  name: 'Exfiltreringskod',
  category: 'valuable',
  icon: '🔑',
  weight: 0.1,
  value: 0,
  description: 'Kod som krävs för att aktivera evakueringspunkten',
});

export const createGrenade = (name: string = 'RGD-5', damage: number = 200, radius: number = 150): Item => ({
  id: nextId(),
  name,
  category: 'grenade',
  icon: '💣',
  weight: 0.6,
  value: 150,
  damage,
  description: `Granat — ${damage} skada i ${radius}px radie`,
});

export const createFlashbang = (): Item => ({
  id: nextId(),
  name: 'Bländgranat',
  category: 'flashbang',
  icon: '💫',
  weight: 0.4,
  value: 120,
  damage: 0,
  description: 'Bländar fiender och spelaren — 3 sekunders effekt',
});

export const createBackpack = (): Item => ({
  id: nextId(),
  name: 'Taktisk Ryggsäck',
  category: 'backpack',
  icon: '🎒',
  weight: 0,
  value: 200,
  description: 'Ökar bärkapacitet — plats för mer loot',
});

export const createArmor = (name: string = 'Skyddsväst', armor: number = 30, icon: string = '🦺'): Item => ({
  id: nextId(),
  name,
  category: 'armor',
  icon,
  weight: 3,
  value: armor * 10,
  damage: armor, // reuse damage field for armor value
  description: `${name} — +${armor} skydd`,
});

export const createHelmet = (): Item => ({
  id: nextId(),
  name: 'Hjälm',
  category: 'armor',
  icon: '⛑️',
  weight: 1.5,
  value: 250,
  damage: 15, // armor value
  description: 'Skyddar huvudet — +15 skydd',
});

export const WEAPON_TEMPLATES = {
  //                                name         ammo       dmg  icon  bulletSpd range fireRate
  makarov: () => createWeapon('PM Makarov',    '9x18',     12, '🔫',   7,       45,   400),
  ak74:    () => createWeapon('AK-74',         '5.45x39',  25, '🔫',   10,      80,   180),
  akm:     () => createWeapon('AKM',           '7.62x39',  30, '🔫',   9,       70,   250),
  toz:     () => createWeapon('TOZ-34',        '12gauge',  45, '🔫',   6,       30,   900),
  mosin:   () => createWeapon('Mosin-Nagant',  '7.62x54R', 50, '🔫',   11,      100,  2000),
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

// Context-aware loot pools based on container type
export const LOOT_POOLS = {
  common: (): Item[] => {
    return pickMany<Item>([
      [createAmmo('9x18', 8 + Math.floor(Math.random() * 8)), 0.6],
      [createMedical('Bandage', 10, '🩹', 'bandage', 3), 0.4],
      [createValuable('Cigaretter', 50, '🚬'), 0.3],
      [createAmmo('5.45x39', 10 + Math.floor(Math.random() * 10)), 0.15],
      [createGrenade(), 0.1],
    ]);
  },
  military: (): Item[] => {
    return pickMany<Item>([
      [createAmmo('5.45x39', 15 + Math.floor(Math.random() * 15)), 0.5],
      [createAmmo('7.62x39', 10 + Math.floor(Math.random() * 10)), 0.4],
      [createMedical('Sjukvårdskit', 40, '🏥', 'medkit', 1), 0.3],
      [createMedical('Morfin', 100, '💉', 'morphine', 5, 8), 0.08],
      [WEAPON_TEMPLATES.ak74(), 0.15],
      [createValuable('Dogtags', 200, '🏷️'), 0.1],
      [createGrenade(), 0.3],
    ]);
  },
  valuable: (): Item[] => {
    const pool: Item[] = [createValuable('Guldkedja', 350, '📿')];
    if (Math.random() > 0.5) pool.push(createValuable('Elektronik', 250, '📻'));
    if (Math.random() > 0.7) pool.push(createValuable('Hemligt Dokument', 500, '📜'));
    return pool;
  },

  // Context-aware pools for specific container types
  desk: (): Item[] => {
    return pickMany<Item>([
      [createValuable('Anteckningar', 80, '📝'), 0.6],
      [createValuable('Hemligt Dokument', 500, '📜'), 0.2],
      [createKey('Skåpnyckel', 'key_cabinet'), 0.15],
      [createKey('Lagernyckel', 'key_storage'), 0.1],
      [createAmmo('9x18', 6), 0.2],
      [createMedical('Bandage', 10, '🩹', 'bandage', 3), 0.15],
      [createValuable('Cigaretter', 50, '🚬'), 0.3],
    ]);
  },
  archive: (): Item[] => {
    return pickMany<Item>([
      [createValuable('Hemligt Dokument', 500, '📜'), 0.5],
      [createValuable('Anteckningar', 80, '📝'), 0.7],
      [createValuable('Karta', 300, '🗺️'), 0.15],
      [createKey('Lagernyckel', 'key_storage'), 0.12],
      [createKey('Säkerhetsnyckel', 'key_security'), 0.08],
    ]);
  },
  locker: (): Item[] => {
    return pickMany<Item>([
      [createAmmo('9x18', 12 + Math.floor(Math.random() * 8)), 0.4],
      [createAmmo('5.45x39', 10 + Math.floor(Math.random() * 10)), 0.25],
      [createMedical('Sjukvårdskit', 40, '🏥', 'medkit', 1), 0.3],
      [createMedical('Bandage', 10, '🩹', 'bandage', 3), 0.4],
      [createValuable('Dogtags', 200, '🏷️'), 0.15],
      [createGrenade(), 0.2],
      [createFlashbang(), 0.25],
      [createKey('Skåpnyckel', 'key_cabinet'), 0.1],
      [WEAPON_TEMPLATES.makarov(), 0.1],
      [createBackpack(), 0.12],
      [createArmor(), 0.15],
      [createHelmet(), 0.1],
    ]);
  },
  body: (): Item[] => {
    return pickMany<Item>([
      [createAmmo('9x18', 4 + Math.floor(Math.random() * 6)), 0.5],
      [createMedical('Bandage', 10, '🩹', 'bandage', 3), 0.3],
      [createValuable('Cigaretter', 50, '🚬'), 0.4],
      [createKey('Skåpnyckel', 'key_cabinet'), 0.08],
      [createKey('Lagernyckel', 'key_storage'), 0.05],
      [createValuable('Dogtags', 200, '🏷️'), 0.2],
      [createValuable('Anteckningar', 80, '📝'), 0.15],
      [createFlashbang(), 0.1],
    ]);
  },
};
