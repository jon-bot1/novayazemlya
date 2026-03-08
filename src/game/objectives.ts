import { MapId } from './maps';

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

// ═══════════════════════════════════════
// OBJEKT 47 — Military base objectives
// ═══════════════════════════════════════
const OBJEKT47_MAIN: ObjectiveTemplate[] = [
  { id: 'kill_boss', name: 'Eliminate Commandant', icon: '💀', description: 'Kill Commandant Osipovitj and retrieve his USB drive', reward: 500, isMain: true },
  { id: 'hack_terminals', name: 'Hack Intel Terminal', icon: '💻', description: 'Hack the nuclear codebook terminal', reward: 400, isMain: true },
  { id: 'plant_bomb', name: 'Sabotage Aircraft', icon: '✈️', description: 'Destroy the airplane with TNT, grenades, or melee', reward: 450, isMain: true },
  { id: 'kill_sniper', name: 'Neutralize Sniper Tuman', icon: '🎯', description: 'Hunt down and eliminate the deadly Sniper Tuman', reward: 400, isMain: true },
  { id: 'collect_all_docs', name: 'Recover All Intel', icon: '📚', description: 'Collect every classified document on the map', reward: 450, isMain: true },
  { id: 'breach_and_clear', name: 'Breach & Clear HQ', icon: '🧨', description: 'Breach 2 walls with TNT and kill 5 enemies inside', reward: 500, isMain: true },
  { id: 'wipe_garrison', name: 'Wipe the Garrison', icon: '☠️', description: 'Eliminate at least 15 enemies before extracting', reward: 500, isMain: true },
  { id: 'destroy_fuel', name: 'Burn the Fuel', icon: '🛢️', description: 'Destroy the fuel depot with TNT or grenades', reward: 450, isMain: true },
  { id: 'disable_comms', name: 'Silence the Tower', icon: '📡', description: 'Hack the radio tower to disable enemy communications', reward: 400, isMain: true },
  { id: 'destroy_ammo', name: 'Detonate Ammo Dump', icon: '💥', description: 'Destroy the ammo stockpile with explosives', reward: 450, isMain: true },
];

const OBJEKT47_BONUS: ObjectiveTemplate[] = [
  { id: 'ghost_extract', name: 'Ghost Extraction', icon: '👻', description: 'Extract without triggering any alarm and 0 kills', reward: 550, isMain: false },
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

// ═══════════════════════════════════════
// FISHING VILLAGE — Coastal village objectives
// ═══════════════════════════════════════
const VILLAGE_MAIN: ObjectiveTemplate[] = [
  { id: 'kill_dockmaster', name: 'Eliminate Dock Master', icon: '💀', description: 'Kill the Dock Master and take the boat keys', reward: 500, isMain: true },
  { id: 'clear_dock', name: 'Secure the Dock', icon: '⚓', description: 'Eliminate all enemies in the dock area', reward: 450, isMain: true },
  { id: 'raid_warehouse', name: 'Raid the Warehouse', icon: '📦', description: 'Loot the dock warehouse and hack the terminal inside', reward: 400, isMain: true },
  { id: 'village_sweep', name: 'Clear the Village', icon: '🏚️', description: 'Search all 6 cabins and loot their contents', reward: 400, isMain: true },
  { id: 'sniper_hunt', name: 'Forest Hunter', icon: '🎯', description: 'Find and eliminate the forest sniper', reward: 450, isMain: true },
  { id: 'smuggler_stash', name: 'Smuggler\'s Cache', icon: '💎', description: 'Find and extract loot worth at least 800₽', reward: 500, isMain: true },
];

const VILLAGE_BONUS: ObjectiveTemplate[] = [
  { id: 'ghost_extract', name: 'Ghost Extraction', icon: '👻', description: 'Extract without triggering any alarm and 0 kills', reward: 550, isMain: false },
  { id: 'speedboat_escape', name: 'Speedboat Escape', icon: '🚤', description: 'Extract via the speedboat at the dock', reward: 300, isMain: false },
  { id: 'no_kills', name: 'Pacifist Route', icon: '🕊️', description: 'Extract without killing anyone', reward: 400, isMain: false },
  { id: 'collect_documents', name: 'Village Records', icon: '📄', description: 'Find 3 documents hidden in the village', reward: 250, isMain: false },
  { id: 'loot_value', name: 'Big Haul', icon: '💰', description: 'Extract with at least 500₽ worth of loot', reward: 200, isMain: false },
  { id: 'speedrun', name: 'Quick Job', icon: '⏱', description: 'Extract within 2 minutes', reward: 350, isMain: false },
  { id: 'kill_count', name: 'No Witnesses', icon: '☠️', description: 'Eliminate at least 8 enemies', reward: 200, isMain: false },
  { id: 'headshots', name: 'Marksman', icon: '🎯', description: 'Get 3 headshot kills', reward: 250, isMain: false },
  { id: 'loot_bodies', name: 'Body Checker', icon: '🔍', description: 'Loot 4 enemy bodies', reward: 150, isMain: false },
  { id: 'loot_caches', name: 'Cabin Raider', icon: '🏠', description: 'Loot 6 containers in the village', reward: 200, isMain: false },
  { id: 'no_alarm', name: 'Silent Approach', icon: '🤫', description: 'Extract without triggering alarms', reward: 300, isMain: false },
  { id: 'neutralize_dogs', name: 'Dog Whisperer', icon: '🦴', description: 'Neutralize dogs with dog food', reward: 250, isMain: false },
  { id: 'knife_kills', name: 'Fisherman\'s Blade', icon: '🗡️', description: 'Kill 2 enemies with the combat knife', reward: 200, isMain: false },
  { id: 'forest_trail', name: 'Scenic Route', icon: '🌲', description: 'Extract via a forest trail instead of the speedboat', reward: 250, isMain: false },
];

// ═══════════════════════════════════════
// HOSPITAL — Abandoned Soviet hospital objectives
// ═══════════════════════════════════════
const HOSPITAL_MAIN: ObjectiveTemplate[] = [
  { id: 'kill_doctor', name: 'Eliminate Dr. Kravtsov', icon: '🧪', description: 'Kill Doctor Kravtsov, the experimenter, in the east wing lab', reward: 550, isMain: true },
  { id: 'kill_uzbek', name: 'Destroy the Uzbek', icon: '🩸', description: 'Kill the Uzbek — the ancient test subject locked in the basement', reward: 600, isMain: true },
  { id: 'clear_basement', name: 'Purge the Basement', icon: '🔦', description: 'Eliminate all enemies in the hospital basement', reward: 500, isMain: true },
  { id: 'hack_lab', name: 'Steal Research Data', icon: '💻', description: 'Hack the lab terminal and extract the data', reward: 450, isMain: true },
  { id: 'collect_all_docs', name: 'Recover Patient Files', icon: '📚', description: 'Collect all classified documents in the hospital', reward: 450, isMain: true },
  { id: 'wipe_garrison', name: 'Sanitize the Building', icon: '☠️', description: 'Eliminate at least 12 hostiles in the hospital', reward: 500, isMain: true },
];

const HOSPITAL_BONUS: ObjectiveTemplate[] = [
  { id: 'ghost_extract', name: 'Ghost Patient', icon: '👻', description: 'Extract without triggering alarms or killing anyone', reward: 600, isMain: false },
  { id: 'rooftop_escape', name: 'Rooftop Escape', icon: '🚁', description: 'Extract via the rooftop helicopter pad', reward: 350, isMain: false },
  { id: 'parking_escape', name: 'Emergency Exit', icon: '🚗', description: 'Extract via the parking lot', reward: 250, isMain: false },
  { id: 'no_kills', name: 'Do No Harm', icon: '🕊️', description: 'Extract without killing anyone', reward: 450, isMain: false },
  { id: 'speedrun', name: 'Code Blue', icon: '⏱', description: 'Extract within 90 seconds', reward: 400, isMain: false },
  { id: 'loot_value', name: 'Organ Harvester', icon: '💰', description: 'Extract with at least 600₽ worth of loot', reward: 250, isMain: false },
  { id: 'headshots', name: 'Brain Surgeon', icon: '🎯', description: 'Get 4 headshot kills', reward: 300, isMain: false },
  { id: 'knife_kills', name: 'Scalpel', icon: '🗡️', description: 'Kill 3 enemies with the combat knife', reward: 300, isMain: false },
  { id: 'loot_caches', name: 'Medicine Cabinet', icon: '💊', description: 'Loot 7 containers', reward: 200, isMain: false },
  { id: 'hack_alarm', name: 'System Override', icon: '🔓', description: 'Hack 2 terminals', reward: 250, isMain: false },
  { id: 'no_alarm', name: 'Silent Treatment', icon: '🤫', description: 'Extract without triggering alarms', reward: 300, isMain: false },
];

// ═══════════════════════════════════════
// MAP → OBJECTIVE REGISTRY
// ═══════════════════════════════════════
const MAP_OBJECTIVES: Record<MapId, { main: ObjectiveTemplate[]; bonus: ObjectiveTemplate[] }> = {
  novaya_zemlya: { main: OBJEKT47_MAIN, bonus: OBJEKT47_BONUS },
  fishing_village: { main: VILLAGE_MAIN, bonus: VILLAGE_BONUS },
  hospital: { main: HOSPITAL_MAIN, bonus: HOSPITAL_BONUS },
};

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateMissionObjectives(mapId: MapId = 'novaya_zemlya'): MissionObjective[] {
  const { main: mainPool, bonus: bonusPool } = MAP_OBJECTIVES[mapId];
  const main = shuffle(mainPool)[0];
  const bonuses = shuffle(bonusPool).slice(0, 1 + Math.floor(Math.random() * 2)); // 1-2 bonus

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
    // Fishing village specific
    extractionName?: string;
  }
): MissionObjective[] {
  return objectives.map(obj => {
    let completed = obj.completed;
    switch (obj.id) {
      case 'kill_boss': completed = stats.bossKilled; break;
      case 'kill_dockmaster': completed = stats.bossKilled; break; // boss = dock master
      case 'kill_sniper': completed = stats.sniperKilled; break;
      case 'sniper_hunt': completed = stats.sniperKilled; break;
      case 'hack_terminals': completed = stats.terminalsHacked > 0; break;
      case 'collect_documents': completed = stats.documentsCollected >= 3; break;
      case 'kill_count': completed = stats.killCount >= 10; break;
      case 'headshots': completed = stats.headshotKills >= 5; break;
      case 'loot_value': completed = stats.lootValue >= 500; break;
      case 'smuggler_stash': completed = stats.lootValue >= 800; break;
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
      case 'breach_and_clear': completed = stats.wallsBreached >= 2 && stats.killCount >= 5; break;
      case 'ghost_extract': completed = !stats.alarmTriggered && stats.killCount === 0; break;
      case 'wipe_garrison': completed = stats.killCount >= 15; break;
      // Fishing village specific
      case 'clear_dock': completed = stats.bossKilled && stats.killCount >= 3; break;
      case 'raid_warehouse': completed = stats.cachesLooted >= 2 && stats.alarmsHacked > 0; break;
      case 'village_sweep': completed = stats.cachesLooted >= 6; break;
      case 'speedboat_escape': completed = stats.extractionName === 'SPEEDBOAT'; break;
      case 'forest_trail': completed = stats.extractionName !== 'SPEEDBOAT' && !!stats.extractionName; break;
      // Hospital specific
      case 'kill_doctor': completed = stats.bossKilled; break;
      case 'kill_patient_zero': completed = stats.bossKilled && stats.killCount >= 2; break; // at least 2 boss-type kills
      case 'clear_basement': completed = stats.killCount >= 6; break;
      case 'hack_lab': completed = stats.alarmsHacked >= 1; break;
      case 'rooftop_escape': completed = stats.extractionName === 'ROOFTOP HELICOPTER'; break;
      case 'parking_escape': completed = stats.extractionName === 'PARKING LOT'; break;
    }
    return { ...obj, completed };
  });
}
