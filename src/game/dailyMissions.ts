// Daily missions system — resets every 24 hours

export interface DailyMission {
  id: string;
  name: string;
  icon: string;
  description: string;
  target: number;
  reward: { rubles: number; xp: number };
  statKey: string; // maps to achievement stats
}

const DAILY_POOL: Omit<DailyMission, 'id'>[] = [
  { name: 'Silent Operator', icon: '🗡️', description: 'Kill 3 enemies with the combat knife', target: 3, reward: { rubles: 200, xp: 150 }, statKey: 'knifeDistanceKills' },
  { name: 'Sharpshooter', icon: '🎯', description: 'Get 3 headshot kills', target: 3, reward: { rubles: 200, xp: 150 }, statKey: 'headshotKills' },
  { name: 'Demolition Man', icon: '💣', description: 'Kill 2 enemies with grenades', target: 2, reward: { rubles: 250, xp: 200 }, statKey: 'grenadeKills' },
  { name: 'Body Looter', icon: '🔍', description: 'Loot 4 enemy bodies', target: 4, reward: { rubles: 150, xp: 100 }, statKey: 'bodiesLooted' },
  { name: 'Cache Hunter', icon: '📦', description: 'Loot 6 containers', target: 6, reward: { rubles: 150, xp: 100 }, statKey: 'cachesLooted' },
  { name: 'Ghost', icon: '👻', description: 'Extract without taking damage', target: 1, reward: { rubles: 400, xp: 300 }, statKey: 'noHitsTaken' },
  { name: 'Exterminator', icon: '☠️', description: 'Kill 10 enemies in one raid', target: 10, reward: { rubles: 300, xp: 250 }, statKey: 'killCount' },
  { name: 'Sniper Elite', icon: '🔫', description: 'Get 2 long-range kills', target: 2, reward: { rubles: 250, xp: 200 }, statKey: 'longShots' },
  { name: 'Breacher', icon: '🧨', description: 'Breach 2 walls with TNT', target: 2, reward: { rubles: 300, xp: 200 }, statKey: 'wallsBreached' },
  { name: 'Intel Recovery', icon: '📄', description: 'Collect 2 documents', target: 2, reward: { rubles: 200, xp: 150 }, statKey: 'documentsCollected' },
  { name: 'Dog Whisperer', icon: '🦴', description: 'Neutralize a dog with food', target: 1, reward: { rubles: 150, xp: 100 }, statKey: 'dogsNeutralized' },
  { name: 'Old Faithful', icon: '🔫', description: 'Get 2 Mosin kills', target: 2, reward: { rubles: 250, xp: 200 }, statKey: 'mosinKills' },
];

function seedRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function getDaySeed(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

export function getDailyMissions(): DailyMission[] {
  const seed = getDaySeed();
  const rng = seedRandom(seed);
  const shuffled = [...DAILY_POOL].sort(() => rng() - 0.5);
  return shuffled.slice(0, 3).map((m, i) => ({ ...m, id: `daily_${seed}_${i}` }));
}

export interface DailyProgress {
  date: number; // seed day
  completed: string[]; // mission ids that have been claimed
}

export function loadDailyProgress(): DailyProgress {
  try {
    const raw = localStorage.getItem('nz_daily');
    if (raw) {
      const p = JSON.parse(raw) as DailyProgress;
      if (p.date === getDaySeed()) return p;
    }
  } catch {}
  return { date: getDaySeed(), completed: [] };
}

export function saveDailyProgress(p: DailyProgress) {
  localStorage.setItem('nz_daily', JSON.stringify(p));
}

export function checkDailyCompletion(mission: DailyMission, stats: Record<string, number | boolean>): boolean {
  const val = stats[mission.statKey];
  if (typeof val === 'boolean') return val === true;
  if (typeof val === 'number') return val >= mission.target;
  return false;
}
