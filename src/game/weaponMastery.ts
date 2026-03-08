// Weapon Mastery — tracks kills per weapon type, grants bonuses per mastery level

export type WeaponMasteryType = 'pistol' | 'rifle' | 'sniper' | 'shotgun' | 'knife' | 'grenade';

export interface WeaponMasteryData {
  kills: number;
  level: number;
}

export type WeaponMasteryState = Record<WeaponMasteryType, WeaponMasteryData>;

export const EMPTY_MASTERY: WeaponMasteryState = {
  pistol: { kills: 0, level: 0 },
  rifle: { kills: 0, level: 0 },
  sniper: { kills: 0, level: 0 },
  shotgun: { kills: 0, level: 0 },
  knife: { kills: 0, level: 0 },
  grenade: { kills: 0, level: 0 },
};

// Kills required for each mastery level (cumulative)
export const MASTERY_THRESHOLDS = [10, 25, 50, 100, 200];
export const MASTERY_MAX_LEVEL = 5;

export interface MasteryBonus {
  reloadReduction: number;   // % faster reload
  damageBonus: number;       // % more damage
  accuracyBonus: number;     // % less spread (bullet speed increase)
}

// Bonuses per level
export function getMasteryBonus(level: number): MasteryBonus {
  return {
    reloadReduction: level * 0.05,  // 5% per level
    damageBonus: level * 0.02,       // 2% per level
    accuracyBonus: level * 0.03,     // 3% per level (bullet speed)
  };
}

export function getMasteryLevel(kills: number): number {
  for (let i = MASTERY_THRESHOLDS.length - 1; i >= 0; i--) {
    if (kills >= MASTERY_THRESHOLDS[i]) return i + 1;
  }
  return 0;
}

export function getNextMasteryThreshold(kills: number): number | null {
  for (const t of MASTERY_THRESHOLDS) {
    if (kills < t) return t;
  }
  return null;
}

// Map weapon names to mastery types
export function getWeaponMasteryType(weaponName: string | undefined, killMethod: string): WeaponMasteryType {
  if (killMethod === 'Grenade' || killMethod === 'Mortar' || killMethod === 'TNT') return 'grenade';
  if (killMethod === 'Silent Takedown' || killMethod === 'Chokehold' || killMethod === 'Knife') return 'knife';
  
  if (!weaponName) return 'rifle'; // default
  
  const lower = weaponName.toLowerCase();
  if (lower.includes('makarov') || lower.includes('pm') || lower.includes('pistol')) return 'pistol';
  if (lower.includes('mosin') || lower.includes('svd') || lower.includes('sniper')) return 'sniper';
  if (lower.includes('toz') || lower.includes('shotgun') || lower.includes('12gauge')) return 'shotgun';
  if (lower.includes('knife') || lower.includes('kniv')) return 'knife';
  return 'rifle'; // AK-74, AKM, etc.
}

export function addMasteryKill(mastery: WeaponMasteryState, type: WeaponMasteryType): WeaponMasteryState {
  const updated = { ...mastery };
  const data = { ...updated[type] };
  data.kills++;
  data.level = getMasteryLevel(data.kills);
  updated[type] = data;
  return updated;
}

// Labels and icons for UI
export const MASTERY_INFO: Record<WeaponMasteryType, { name: string; icon: string }> = {
  pistol: { name: 'Pistol', icon: '🔫' },
  rifle: { name: 'Assault Rifle', icon: '🪖' },
  sniper: { name: 'Sniper', icon: '🎯' },
  shotgun: { name: 'Shotgun', icon: '💥' },
  knife: { name: 'Melee/Stealth', icon: '🗡️' },
  grenade: { name: 'Explosives', icon: '💣' },
};

export const MASTERY_RANK_NAMES = ['Untrained', 'Novice', 'Proficient', 'Expert', 'Master', 'Legendary'];
