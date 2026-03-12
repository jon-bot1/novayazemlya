import { PlayerSkin } from './renderer';

// ── CLASS PASSIVE BONUSES ──
export interface ClassPassive {
  fireRateBonus?: number;      // multiplier reduction (0.10 = -10%)
  speedBonus?: number;          // multiplier increase (0.15 = +15%)
  noiseReduction?: number;      // multiplier reduction (0.20 = -20%)
  sneakSpeedBonus?: number;     // multiplier increase (0.25 = +25%)
  detectionReduction?: number;  // multiplier reduction (0.30 = -30%)
  critChanceBonus?: number;     // flat addition (0.10 = +10%)
  maxHpBonus?: number;          // flat HP addition
  xpMultiplier?: number;        // multiplier (0.10 = +10%)
  seeEnemyTypes?: boolean;      // show enemy types on minimap
}

// ── CLASS ACTIVE ABILITIES ──
export type AbilityId = 'none' | 'adrenaline_rush' | 'spotter' | 'ghost_mode' | 'resupply_drop' | 'airstrike';

export interface ClassAbility {
  id: AbilityId;
  name: string;
  icon: string;
  description: string;
  cooldown: number;    // seconds
  duration: number;    // seconds (0 = instant)
  key: 'Z';
}

// ── CLASS DEFINITION ──
export interface ClassDef {
  skinId: PlayerSkin;
  className: string;
  passive: ClassPassive;
  passiveDescription: string[];  // human-readable lines
  ability: ClassAbility;
}

export const CLASS_DEFS: ClassDef[] = [
  {
    skinId: 'anonymous',
    className: 'Recruit',
    passive: {},
    passiveDescription: ['No bonuses — pure skill'],
    ability: { id: 'none', name: 'None', icon: '—', description: 'No special ability.', cooldown: 0, duration: 0, key: 'Z' },
  },
  {
    skinId: 'operative',
    className: 'Assault',
    passive: { fireRateBonus: 0.10 },
    passiveDescription: ['+10% fire rate'],
    ability: { id: 'adrenaline_rush', name: 'Adrenaline Rush', icon: '💥', description: 'Sprint for 5s without stamina cost.', cooldown: 60, duration: 5, key: 'Z' },
  },
  {
    skinId: 'arctic',
    className: 'Recon',
    passive: { speedBonus: 0.15, noiseReduction: 0.20 },
    passiveDescription: ['+15% move speed', '-20% noise radius'],
    ability: { id: 'spotter', name: 'Spotter', icon: '👁️', description: 'Reveal all enemies for 8s.', cooldown: 90, duration: 8, key: 'Z' },
  },
  {
    skinId: 'shadow',
    className: 'Infiltrator',
    passive: { sneakSpeedBonus: 0.25, detectionReduction: 0.30 },
    passiveDescription: ['+25% sneak speed', '-30% detection radius'],
    ability: { id: 'ghost_mode', name: 'Ghost Mode', icon: '👻', description: 'Invisible for 5s.', cooldown: 120, duration: 5, key: 'Z' },
  },
  {
    skinId: 'donator',
    className: 'Vanguard',
    passive: { critChanceBonus: 0.10, maxHpBonus: 15 },
    passiveDescription: ['+10% crit chance', '+15 max HP'],
    ability: { id: 'resupply_drop', name: 'Resupply Drop', icon: '📦', description: 'Spawn an ammo crate at your position.', cooldown: 90, duration: 0, key: 'Z' },
  },
  {
    skinId: 'admin',
    className: 'Commander',
    passive: { xpMultiplier: 0.10, seeEnemyTypes: true },
    passiveDescription: ['+10% XP gain', 'See enemy types on minimap'],
    ability: { id: 'airstrike', name: 'Artillery Strike', icon: '💣', description: 'Call artillery on a target area.', cooldown: 180, duration: 0, key: 'Z' },
  },
];

export function getClassDef(skinId: PlayerSkin): ClassDef {
  return CLASS_DEFS.find(c => c.skinId === skinId) || CLASS_DEFS[0];
}

// ── DONATOR PERMANENT PERKS (skin-independent) ──
export const DONATOR_PERKS = [
  { icon: '🎒', label: '+8 inventory slots' },
  { icon: '💰', label: '+10% loot value' },
  { icon: '🔥', label: '2× login streak bonus' },
  { icon: '🏷️', label: '15% trader discount' },
];

// How to unlock each access level
export const UNLOCK_HINTS: Record<string, string> = {
  all: '',
  registered: 'Create an account to unlock',
  donator: 'Donate €5 to unlock — visit your Profile',
  admin: '', // never shown to non-admins
};
