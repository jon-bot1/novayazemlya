// Map registry — central place to define available maps
export type MapId = 'objekt47' | 'fishing_village' | 'hospital' | 'mining_village';

export interface MapInfo {
  id: MapId;
  name: string;
  description: string;
  icon: string;
  size: string;
  unlockRequirement?: number; // extractions needed to unlock
}

export const MAPS: MapInfo[] = [
  {
    id: 'objekt47',
    name: 'Objekt 47',
    description: 'Military base on Novaya Zemlya. Hangars, offices, watchtowers. Heavy enemy presence.',
    icon: '🏭',
    size: '3200×2400',
  },
  {
    id: 'fishing_village',
    name: 'The Fishing Village',
    description: 'Coastal fishing village. Cabins, forest road, dock with speedboat.',
    icon: '🏚️',
    size: '1400×2000',
    unlockRequirement: 3,
  },
  {
    id: 'hospital',
    name: 'The Hospital',
    description: 'Abandoned Soviet hospital. Narrow corridors, dark rooms, horror atmosphere.',
    icon: '🏥',
    size: '2400×2400',
    unlockRequirement: 6,
  },
  {
    id: 'mining_village',
    name: 'Gruvsamhället',
    description: 'Abandoned Swedish mining village. Two levels — surface village and underground mine. Boss Gruvrå lurks below.',
    icon: '⛏️',
    size: '2000×2800',
    unlockRequirement: 10,
  },
];
