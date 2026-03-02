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
  { id: 'plant_bomb', name: 'Sabotage Aircraft', icon: '✈️', description: 'Destroy the airplane with TNT, grenades, or melee', reward: 450, isMain: true },
  
  { id: 'kill_sniper', name: 'Neutralize Sniper Tuman', icon: '🎯', description: 'Hunt down and eliminate the deadly Sniper Tuman', reward: 400, isMain: true },
  { id: 'collect_all_docs', name: 'Recover All Intel', icon: '📚', description: 'Collect every classified document on the map', reward: 450, isMain: true },
  { id: 'breach_and_clear', name: 'Breach & Clear HQ', icon: '🧨', description: 'Breach 2 walls with TNT and kill 5 enemies inside', reward: 500, isMain: true },
  { id: 'ghost_extract', name: 'Ghost Extraction', icon: '👻', description: 'Extract without triggering any alarm and undetected', reward: 550, isMain: true },
  { id: 'wipe_garrison', name: 'Wipe the Garrison', icon: '☠️', description: 'Eliminate at least 15 enemies before extracting', reward: 500, isMain: true },
  { id: 'destroy_fuel', name: 'Burn the Fuel', icon: '🛢️', description: 'Destroy the fuel depot with TNT or grenades', reward: 450, isMain: true },
  { id: 'disable_comms', name: 'Silence the Tower', icon: '📡', description: 'Hack the radio tower to disable enemy communications', reward: 400, isMain: true },
  { id: 'destroy_ammo', name: 'Detonate Ammo Dump', icon: '💥', description: 'Destroy the ammo stockpile with explosives', reward: 450, isMain: true },
];

const BONUS_OBJECTIVES: ObjectiveTemplate[] = [
  { id: 'collect_documents', name: 'Recover Intel', icon: '📄', description: 'Find and collect 3 classified documents', reward: 250, isMain: false },
  { id: 'loot_value', name: 'Scavenger Run', icon: '💰', description: 'Extract with at least 500₽ worth of loot', reward: 200, isMain: false },
  { id: 'no_alarm', name: 'Ghost Protocol', icon: '🤫', description: 'Extract without triggering any alarm panels', reward: 300, isMain: false },
  { id: 'kill_count', name: 'Sweep & Clear', icon: '☠️', description: 'Eliminate at least 10 enemies', reward: 200, isMain: false },
  { id: 'headshots', name: 'Marksman', icon: '🎯', description: 'Get 5 headshot kills', reward: 250, isMain: false },
  { id: 'speedrun', name: 'Speedrunner', icon: '⏱', description: 'Extract within 2 minutes', reward: 350, isMain: false },
  { id: 'loot_bodies', name: 'Body Checker', icon: '🔍', description: 'Loot 5 enemy bodies', reward: 150, isMain: false },
  { id: 'hack_alarm', name: 'Hackerman', icon: '🔓', description: 'Hack an alarm panel', reward: 200, isMain: false },
  { id: 'mosin_kills', name: 'Old Faithful', icon: '🔫', description: 'Kill 3 enemies with the Mosin-Nagant', reward: 250, isMain: false },
  { id: 'no_kills', name: 'Pacifist Route', icon: '🕊️', description: 'Extract without killing anyone', reward: 400, isMain: false },
  { id: 'grenade_kills', name: 'Fragmentation', icon: '💣', description: 'Kill 3 enemies with grenades', reward: 200, isMain: false },
  { id: 'neutralize_dogs', name: 'Dog Whisperer', icon: '🦴', description: 'Neutralize 2 dogs with dog food', reward: 250, isMain: false },
  { id: 'long_shots', name: 'Distant Thunder', icon: '⚡', description: 'Get 2 kills at extreme range (>250px)', reward: 300, isMain: false },
  { id: 'knife_kills', name: 'Silent Blade', icon: '🗡️', description: 'Kill 3 enemies with the combat knife', reward: 250, isMain: false },
  { id: 'loot_caches', name: 'Supply Runner', icon: '📦', description: 'Loot 8 containers in a single raid', reward: 200, isMain: false },
  { id: 'convert_enemy', name: 'Hearts & Minds', icon: '📢', description: 'Convert an enemy with propaganda and let them get a kill', reward: 350, isMain: false },
  { id: 'scorched_earth', name: 'Scorched Earth', icon: '🔥', description: 'Destroy both fuel depot and ammo dump in one raid', reward: 400, isMain: false },
  { id: 'total_sabotage', name: 'Total Sabotage', icon: '🧨', description: 'Sabotage the aircraft AND destroy the fuel depot', reward: 350, isMain: false },
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
    
    alarmsHacked: number;
    mosinKills: number;
    wallsBreached: number;
    grenadeKills: number;
    dogsNeutralized: number;
    longShots: number;
    knifeDistanceKills: number;
    cachesLooted: number;
    convertKill: boolean;
    fuelDestroyed: boolean;
    ammoDestroyed: boolean;
    radioDisabled: boolean;
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
      
      case 'hack_alarm': completed = stats.alarmsHacked > 0; break;
      case 'mosin_kills': completed = stats.mosinKills >= 3; break;
      case 'no_kills': completed = stats.killCount === 0; break;
      case 'breach_walls': completed = stats.wallsBreached >= 2; break;
      case 'grenade_kills': completed = stats.grenadeKills >= 3; break;
      case 'collect_all_docs': completed = stats.documentsCollected >= 5; break;
      case 'neutralize_dogs': completed = stats.dogsNeutralized >= 2; break;
      case 'long_shots': completed = stats.longShots >= 2; break;
      case 'knife_kills': completed = stats.knifeDistanceKills >= 3; break;
      case 'loot_caches': completed = stats.cachesLooted >= 8; break;
      case 'convert_enemy': completed = stats.convertKill; break;
      case 'destroy_fuel': completed = stats.fuelDestroyed; break;
      case 'disable_comms': completed = stats.radioDisabled; break;
      case 'destroy_ammo': completed = stats.ammoDestroyed; break;
      case 'scorched_earth': completed = stats.fuelDestroyed && stats.ammoDestroyed; break;
      case 'total_sabotage': completed = stats.tntPlacedOnPlane && stats.fuelDestroyed; break;
      // Combined main objectives
      case 'breach_and_clear': completed = stats.wallsBreached >= 2 && stats.killCount >= 5; break;
      case 'ghost_extract': completed = !stats.alarmTriggered && stats.killCount === 0; break;
      case 'wipe_garrison': completed = stats.killCount >= 15; break;
    }
    return { ...obj, completed };
  });
}
