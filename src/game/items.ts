import { Item, AmmoType } from './types';

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
  description: `${count} rounds of ${type}`,
});

export const createMedical = (name: string, heal: number, icon: string): Item => ({
  id: nextId(),
  name,
  category: 'medical',
  icon,
  weight: 0.5,
  value: heal * 10,
  healAmount: heal,
  description: `Restores ${heal} HP`,
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
    if (Math.random() > 0.6) pool.push(createMedical('Bandage', 15, '🩹'));
    if (Math.random() > 0.7) pool.push(createValuable('Cigarettes', 50, '🚬'));
    if (Math.random() > 0.85) pool.push(createAmmo('5.45x39', 10 + Math.floor(Math.random() * 10)));
    return pool;
  },
  military: (): Item[] => {
    const pool: Item[] = [];
    if (Math.random() > 0.5) pool.push(createAmmo('5.45x39', 15 + Math.floor(Math.random() * 15)));
    if (Math.random() > 0.6) pool.push(createAmmo('7.62x39', 10 + Math.floor(Math.random() * 10)));
    if (Math.random() > 0.7) pool.push(createMedical('First Aid Kit', 40, '🏥'));
    if (Math.random() > 0.85) pool.push(WEAPON_TEMPLATES.ak74());
    if (Math.random() > 0.9) pool.push(createValuable('Dog Tags', 200, '🏷️'));
    return pool;
  },
  valuable: (): Item[] => {
    const pool: Item[] = [];
    pool.push(createValuable('Gold Chain', 350, '📿'));
    if (Math.random() > 0.5) pool.push(createValuable('Electronics', 250, '📻'));
    if (Math.random() > 0.7) pool.push(createValuable('Documents', 500, '📜'));
    return pool;
  },
};
