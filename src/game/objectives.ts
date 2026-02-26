export interface MissionObjective {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: 'main' | 'bonus';
  completed: boolean;
  reward: number; // rubles bonus
}

interface ObjectiveTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  reward: number;
  isMain: boolean;
}

const MAIN_OBJECTIVES: ObjectiveTemplate[] = [
  { id: 'kill_boss', name: 'Eliminate Commandant', icon: '💀', description: 'Kill Commandant Osipovitj and retrieve his USB drive', reward: 500, isMain: true },
  { id: 'hack_terminals', name: 'Hack Intel Terminal', icon: '💻', description: 'Hack the nuclear codebook terminal', reward: 400, isMain: true },
  { id: 'plant_bomb', name: 'Sabotage Aircraft', icon: '✈️', description: 'Plant a TNT charge on the airplane in the hangar area', reward: 450, isMain: true },
  { id: 'collect_documents', name: 'Recover Intel', icon: '📄', description: 'Find and collect 3 classified documents', reward: 350, isMain: true },
  { id: 'find_secret', name: 'Find Secret Passage', icon: '🚪', description: 'Discover the hidden passage in the underground labs', reward: 400, isMain: true },
];

const BONUS_OBJECTIVES: ObjectiveTemplate[] = [
  { id: 'kill_sniper', name: 'Neutralize Sniper', icon: '🎯', description: 'Eliminate Sniper Tuman', reward: 300, isMain: false },
  { id: 'loot_value', name: 'Scavenger Run', icon: '💰', description: 'Extract with at least 500₽ worth of loot', reward: 200, isMain: false },
  { id: 'no_alarm', name: 'Ghost Protocol', icon: '🤫', description: 'Extract without triggering any alarm panels', reward: 350, isMain: false },
  { id: 'kill_count', name: 'Sweep & Clear', icon: '☠️', description: 'Eliminate at least 10 enemies', reward: 200, isMain: false },
  { id: 'headshots', name: 'Marksman', icon: '🎯', description: 'Get 5 headshot kills', reward: 250, isMain: false },
  { id: 'speedrun', name: 'Speedrunner', icon: '⏱', description: 'Extract within 2 minutes', reward: 400, isMain: false },
  { id: 'loot_bodies', name: 'Body Checker', icon: '🔍', description: 'Loot 5 enemy bodies', reward: 150, isMain: false },
  { id: 'hack_alarm', name: 'Hackerman', icon: '🔓', description: 'Hack an alarm panel', reward: 200, isMain: false },
];

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateMissionObjectives(): MissionObjective[] {
  const main = shuffle(MAIN_OBJECTIVES)[0];
  const bonusPool = shuffle(BONUS_OBJECTIVES);
  const bonusCount = 1 + Math.floor(Math.random() * 2); // 1-2 bonus
  const bonuses = bonusPool.slice(0, bonusCount);

  return [
    { id: main.id, name: main.name, icon: main.icon, description: main.description, type: 'main', completed: false, reward: main.reward },
    ...bonuses.map(b => ({
      id: b.id, name: b.name, icon: b.icon, description: b.description, type: 'bonus' as const, completed: false, reward: b.reward,
    })),
  ];
}

export function checkObjectiveCompletion(
  objectives: MissionObjective[],
  stats: {
    bossKilled: boolean;
    sniperKilled: boolean;
    terminalsHacked: number;
    documentsCollected: number;
    killCount: number;
    headshotKills: number;
    lootValue: number;
    alarmTriggered: boolean;
    bodiesLooted: number;
    timeSeconds: number;
    tntPlacedOnPlane: boolean;
    foundSecret: boolean;
    alarmsHacked: number;
  }
): MissionObjective[] {
  return objectives.map(obj => {
    let completed = obj.completed;
    switch (obj.id) {
      case 'kill_boss': completed = stats.bossKilled; break;
      case 'kill_sniper': completed = stats.sniperKilled; break;
      case 'hack_terminals': completed = stats.terminalsHacked > 0; break;
      case 'collect_documents': completed = stats.documentsCollected >= 3; break;
      case 'kill_count': completed = stats.killCount >= 10; break;
      case 'headshots': completed = stats.headshotKills >= 5; break;
      case 'loot_value': completed = stats.lootValue >= 500; break;
      case 'no_alarm': completed = !stats.alarmTriggered; break;
      case 'loot_bodies': completed = stats.bodiesLooted >= 5; break;
      case 'speedrun': completed = stats.timeSeconds <= 120; break;
      case 'plant_bomb': completed = stats.tntPlacedOnPlane; break;
      case 'find_secret': completed = stats.foundSecret; break;
      case 'hack_alarm': completed = stats.alarmsHacked > 0; break;
    }
    return { ...obj, completed };
  });
}
