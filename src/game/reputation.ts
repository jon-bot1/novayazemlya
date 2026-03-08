// Reputation system — increases with extractions, unlocks bonuses

export interface ReputationTier {
  name: string;
  icon: string;
  minRep: number;
  discount: number; // percentage off trader prices
  description: string;
}

export const REP_TIERS: ReputationTier[] = [
  { name: 'Unknown', icon: '❓', minRep: 0, discount: 0, description: 'Nobody knows you yet' },
  { name: 'Rookie', icon: '🔰', minRep: 3, discount: 5, description: '5% trader discount' },
  { name: 'Operative', icon: '🎖️', minRep: 8, discount: 10, description: '10% trader discount' },
  { name: 'Veteran', icon: '⭐', minRep: 15, discount: 15, description: '15% trader discount' },
  { name: 'Elite', icon: '🏆', minRep: 25, discount: 20, description: '20% trader discount' },
  { name: 'Legend', icon: '👑', minRep: 40, discount: 25, description: '25% trader discount' },
];

export function getRepTier(extractionCount: number): ReputationTier {
  let tier = REP_TIERS[0];
  for (const t of REP_TIERS) {
    if (extractionCount >= t.minRep) tier = t;
  }
  return tier;
}

export function getNextRepTier(extractionCount: number): ReputationTier | null {
  for (const t of REP_TIERS) {
    if (extractionCount < t.minRep) return t;
  }
  return null;
}

// Dynamic pricing — prices fluctuate daily
export function getDailyPriceMultiplier(itemId: string): number {
  const now = new Date();
  const daySeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  // Simple hash from item id + day
  let hash = daySeed;
  for (let i = 0; i < itemId.length; i++) {
    hash = ((hash << 5) - hash + itemId.charCodeAt(i)) | 0;
  }
  // Normalize to 0.80 - 1.20 range (±20% fluctuation)
  const norm = ((hash % 41) - 20) / 100; // -0.20 to +0.20
  return 1 + norm;
}

export function getAdjustedPrice(baseCost: number, itemId: string, extractionCount: number): number {
  const repTier = getRepTier(extractionCount);
  const dynamicMult = getDailyPriceMultiplier(itemId);
  const discountMult = 1 - repTier.discount / 100;
  return Math.max(1, Math.round(baseCost * dynamicMult * discountMult));
}
