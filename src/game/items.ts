import { Item, AmmoType, MedicalType } from './types';

let itemIdCounter = 0;
const nextId = () => `item_${itemIdCounter++}`;

export const createWeapon = (name: string, ammoType: AmmoType, damage: number, icon: string): Item => ({
  id: nextId(),
  name,
  category: 'weapon',
  icon,
  weight: 3,
  value: Math.floor(damage * 100),
  ammoType,
  damage,
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

export const createExtractionCode = (): Item => ({
  id: 'extraction_code',
  name: 'Exfiltreringskod',
  category: 'valuable',
  icon: '🔑',
  weight: 0.1,
  value: 0,
  description: 'Kod som krävs för att aktivera evakueringspunkten',
});

export const createGrenade = (name: string = 'RGD-5', damage: number = 60, radius: number = 80): Item => ({
  id: nextId(),
  name,
  category: 'grenade',
  icon: '💣',
  weight: 0.6,
  value: 150,
  damage,
  description: `Granat — ${damage} skada i ${radius}px radie`,
});

export const WEAPON_TEMPLATES = {
  makarov: () => createWeapon('PM Makarov', '9x18', 12, '🔫'),
  ak74: () => createWeapon('AK-74', '5.45x39', 25, '🔫'),
  akm: () => createWeapon('AKM', '7.62x39', 30, '🔫'),
  toz: () => createWeapon('TOZ-34', '12gauge', 45, '🔫'),
};

export const LOOT_POOLS = {
  common: (): Item[] => {
    const pool: Item[] = [];
    if (Math.random() > 0.4) pool.push(createAmmo('9x18', 8 + Math.floor(Math.random() * 8)));
    if (Math.random() > 0.6) pool.push(createMedical('Bandage', 10, '🩹', 'bandage', 3));
    if (Math.random() > 0.7) pool.push(createValuable('Cigaretter', 50, '🚬'));
    if (Math.random() > 0.85) pool.push(createAmmo('5.45x39', 10 + Math.floor(Math.random() * 10)));
    if (Math.random() > 0.9) pool.push(createGrenade());
    return pool;
  },
  military: (): Item[] => {
    const pool: Item[] = [];
    if (Math.random() > 0.5) pool.push(createAmmo('5.45x39', 15 + Math.floor(Math.random() * 15)));
    if (Math.random() > 0.6) pool.push(createAmmo('7.62x39', 10 + Math.floor(Math.random() * 10)));
    if (Math.random() > 0.7) pool.push(createMedical('Sjukvårdskit', 40, '🏥', 'medkit', 1));
    if (Math.random() > 0.92) pool.push(createMedical('Morfin', 100, '💉', 'morphine', 5, 8));
    if (Math.random() > 0.85) pool.push(WEAPON_TEMPLATES.ak74());
    if (Math.random() > 0.9) pool.push(createValuable('Dogtags', 200, '🏷️'));
    if (Math.random() > 0.7) pool.push(createGrenade());
    return pool;
  },
  valuable: (): Item[] => {
    const pool: Item[] = [];
    pool.push(createValuable('Guldkedja', 350, '📿'));
    if (Math.random() > 0.5) pool.push(createValuable('Elektronik', 250, '📻'));
    if (Math.random() > 0.7) pool.push(createValuable('Dokument', 500, '📜'));
    return pool;
  },
};
