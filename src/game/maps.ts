// Map registry — central place to define available maps
export type MapId = 'novaya_zemlya' | 'fishing_village' | 'hospital';

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
    id: 'novaya_zemlya',
    name: 'Objekt 47',
    description: 'Militärbas på Novaja Zemlja. Hangar, kontor, vakttorn. Hög fientlig närvaro.',
    icon: '🏭',
    size: '3200×2400',
  },
  {
    id: 'fishing_village',
    name: 'Fiskebyn',
    description: 'Övergiven fiskeby vid kusten. Stugor, skogsväg, kaj med snabbåt.',
    icon: '🏚️',
    size: '2800×2000',
    unlockRequirement: 3,
  },
  {
    id: 'hospital',
    name: 'Sjukhuset',
    description: 'Övergivet sovjetiskt sjukhus. Trånga korridorer, mörka rum, horror-stämning.',
    icon: '🏥',
    size: '2400×2400',
    unlockRequirement: 6,
  },
];
