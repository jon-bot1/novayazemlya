// Loot rarity system

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9ca3af',     // gray
  uncommon: '#22c55e',   // green
  rare: '#3b82f6',       // blue
  epic: '#a855f7',       // purple
  legendary: '#f59e0b',  // gold
};

export const RARITY_BG: Record<Rarity, string> = {
  common: 'border-muted-foreground/30 bg-muted/10',
  uncommon: 'border-green-500/50 bg-green-500/10',
  rare: 'border-blue-500/50 bg-blue-500/10',
  epic: 'border-purple-500/50 bg-purple-500/10',
  legendary: 'border-yellow-500/50 bg-yellow-500/10',
};

export const RARITY_GLOW: Record<Rarity, string> = {
  common: '',
  uncommon: 'shadow-[0_0_6px_rgba(34,197,94,0.3)]',
  rare: 'shadow-[0_0_8px_rgba(59,130,246,0.4)]',
  epic: 'shadow-[0_0_10px_rgba(168,85,247,0.5)]',
  legendary: 'shadow-[0_0_12px_rgba(245,158,11,0.6)] animate-pulse',
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

// Determine rarity based on item value and category
export function getItemRarity(value: number, category: string): Rarity {
  if (category === 'weapon_mod') {
    if (value >= 350) return 'epic';
    if (value >= 250) return 'rare';
    return 'uncommon';
  }
  if (category === 'weapon') {
    // Rarity based on calculated value (damage × 100)
    // Ksp 58 (2000) → legendary, Mosin (5000) → legendary, Ak4 (2400) → epic
    // AKM (2000) → epic, AK-74 (1600) → rare, PPSh/Kpist (~800-1000) → uncommon
    // Makarov/Revolver (~1500-2200) → rare (sidearms punch above weight in value)
    // TOZ (1100) → uncommon
    if (value >= 4000) return 'legendary';
    if (value >= 2000) return 'epic';
    if (value >= 1400) return 'rare';
    if (value >= 800) return 'uncommon';
    return 'common';
  }
  if (category === 'key') return 'rare';
  if (category === 'armor') {
    if (value >= 300) return 'rare';
    return 'uncommon';
  }
  // Valuables and other
  if (value >= 250) return 'epic';
  if (value >= 150) return 'rare';
  if (value >= 80) return 'uncommon';
  return 'common';
}
