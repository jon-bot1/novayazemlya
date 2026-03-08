import { Wall, LootContainer, Enemy, ExtractionPoint, DocumentPickup, Prop, AlarmPanel, LightSource, WindowDef, TerrainZone, Item } from './types';
import { LOOT_POOLS, WEAPON_TEMPLATES, createAmmo, createExtractionCode, createGrenade, createKey, createKeycard, createArmor, createValuable, createTNT, createDogFood } from './items';

// Swedish Mining Village: 2000x2800
// Surface (y 0-1800): village with guard booths, cabins, machinery, crew building
// Underground mine (y 1800-2800): tunnels, ore carts, boss arena
// Transition via mine elevator at ~y 1700-1800

const MAP_W = 2000;
const MAP_H = 2800;

let enemyId = 30000;
let containerId = 30000;

function randIn(zx: number, zy: number, zw: number, zh: number, m = 25): { x: number; y: number } {
  return { x: zx + m + Math.random() * Math.max(1, zw - m * 2), y: zy + m + Math.random() * Math.max(1, zh - m * 2) };
}
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const WOOD = '#7a6a4a';
const DARK_WOOD = '#5a4a2a';
const STONE = '#6a6a6a';
const MINE_ROCK = '#4a4a4a';
const MINE_WALL = '#3a3a3a';
const CONCRETE = '#888888';

const makeWall = (x: number, y: number, w: number, h: number, color = STONE): Wall => ({ x, y, w, h, color });

const makeEnemy = (x: number, y: number, type: Enemy['type'], fixedAngle?: number): Enemy => {
  // MINING VILLAGE — remote Swedish mine: hardy rednecks, tough scavs, environmental hazards
  const stats: Record<string, any> = {
    scav:    { hp: 48, speed: 0.70, damage: 11, alertRange: 145, shootRange: 78,  fireRate: 1450 },
    soldier: { hp: 75, speed: 0.88, damage: 20, alertRange: 250, shootRange: 125, fireRate: 980 },
    heavy:   { hp: 175, speed: 0.44, damage: 32, alertRange: 220, shootRange: 115, fireRate: 1650 },
    redneck: { hp: 85, speed: 0.72, damage: 22, alertRange: 220, shootRange: 75,  fireRate: 950 },
    dog:     { hp: 38, speed: 1.90, damage: 26, alertRange: 300, shootRange: 30,  fireRate: 800 },
    boss:    { hp: 550, speed: 1.00, damage: 44, alertRange: 380, shootRange: 190, fireRate: 530 },
    turret:  { hp: 200, speed: 0, damage: 22, alertRange: 250, shootRange: 130, fireRate: 950 },
    shocker: { hp: 65, speed: 1.10, damage: 42, alertRange: 200, shootRange: 36,  fireRate: 680 },
    miner_cult: { hp: 90, speed: 0.80, damage: 28, alertRange: 180, shootRange: 90, fireRate: 1100 },
    svarta_sol: { hp: 115, speed: 1.00, damage: 28, alertRange: 320, shootRange: 170, fireRate: 800 },
  };
  // Mining village personality: rednecks are brave & territorial, dogs are vicious
  const personality: Record<string, any> = {
    scav:    { _cowardice: 0.6, _accuracy: 0.5, _aggression: 0.3, _seekCoverChance: 0.15 },
    soldier: { _cowardice: 0.25, _accuracy: 0.75, _aggression: 0.55, _seekCoverChance: 0.4 },
    heavy:   { _cowardice: 0.0, _accuracy: 0.65, _aggression: 0.8, _seekCoverChance: 0.1 },
    redneck: { _cowardice: 0.15, _accuracy: 0.65, _aggression: 0.8, _seekCoverChance: 0.05 },
    dog:     { _cowardice: 0.1, _accuracy: 1.0, _aggression: 1.0, _seekCoverChance: 0.0 },
    boss:    { _cowardice: 0.0, _accuracy: 0.8, _aggression: 1.0, _seekCoverChance: 0.0 },
    turret:  { _cowardice: 0.0, _accuracy: 0.85, _aggression: 1.0, _seekCoverChance: 0.0 },
    shocker: { _cowardice: 0.1, _accuracy: 0.5, _aggression: 0.95, _seekCoverChance: 0.0 },
    miner_cult: { _cowardice: 0.05, _accuracy: 0.60, _aggression: 0.95, _seekCoverChance: 0.0 },
    svarta_sol: { _cowardice: 0.15, _accuracy: 0.88, _aggression: 0.65, _seekCoverChance: 0.55 },
  };
  const s = stats[type] || stats.scav;
  const p = personality[type] || personality.scav;
  const enemy: Enemy = {
    id: `enemy_${enemyId++}`,
    pos: { x, y },
    ...s,
    maxHp: s.hp,
    state: 'patrol',
    patrolTarget: { x: x + (Math.random() - 0.5) * 150, y: y + (Math.random() - 0.5) * 150 },
    lastShot: 0,
    angle: fixedAngle ?? Math.random() * Math.PI * 2,
    type,
    eyeBlink: Math.random() * 5,
    loot: [],
    looted: false,
    lastRadioCall: 0,
    radioGroup: Math.floor(x / 400),
    radioAlert: 0,
    tacticalRole: type === 'heavy' ? 'suppressor' : type === 'redneck' ? 'assault' : type === 'soldier' ? (Math.random() < 0.5 ? 'flanker' : 'assault') : 'none',
    suppressTimer: 0,
    callForHelpTimer: 0,
    lastTacticalSwitch: 0,
    stunTimer: 0,
    awareness: 0,
    awarenessDecay: type === 'redneck' ? 0.10 : type === 'dog' ? 0.08 : 0.15,
    elevated: false,
    friendly: false,
    friendlyTimer: 0,
  };
  Object.assign(enemy, p);
  if (type === 'boss') {
    enemy.bossPhase = 0;
    enemy.bossChargeTimer = 0;
    enemy.bossSpawnTimer = 0;
  }
  if (type === 'redneck') {
    // Swedish map — rednecks carry Swedish weapons
    const swWeapons = [WEAPON_TEMPLATES.kpist45, WEAPON_TEMPLATES.ak4, WEAPON_TEMPLATES.toz];
    enemy.loot = [swWeapons[Math.floor(Math.random() * swWeapons.length)](), createDogFood()];
  }
  return enemy;
};

type LootPoolType = 'common' | 'military' | 'valuable' | 'desk' | 'archive' | 'locker' | 'body' | 'weapon_cabinet' | 'weapon_cabinet_swedish';

const makeLoot = (x: number, y: number, type: LootContainer['type'], pool: LootPoolType): LootContainer => ({
  id: `loot_${containerId++}`,
  pos: { x, y },
  size: 24,
  items: LOOT_POOLS[pool] ? LOOT_POOLS[pool]() : LOOT_POOLS.common(),
  looted: false,
  type,
});

const makeDocPickup = (x: number, y: number, loreDocId: string): DocumentPickup => ({
  id: `docpickup_${loreDocId}`,
  pos: { x, y },
  loreDocId,
  collected: false,
});

export function generateMiningVillageMap() {
  const T = 10;

  // ══════════════════════════════════════
  // TERRAIN ZONES
  // ══════════════════════════════════════
  const terrainZones: TerrainZone[] = [
    // Surface — forest border
    { x: 0, y: 0, w: MAP_W, h: 200, type: 'forest' },
    { x: 0, y: 0, w: 150, h: 1800, type: 'forest' },
    { x: MAP_W - 150, y: 0, w: 150, h: 1800, type: 'forest' },
    // Village dirt/grass
    { x: 150, y: 200, w: MAP_W - 300, h: 1600, type: 'dirt' },
    // Main road through village
    { x: 900, y: 200, w: 120, h: 1600, type: 'asphalt' },
    // Crew building concrete pad
    { x: 350, y: 300, w: 400, h: 300, type: 'concrete' },
    // Mine entrance area
    { x: 700, y: 1500, w: 500, h: 300, type: 'concrete' },
    // ═══ UNDERGROUND MINE ═══
    { x: 0, y: 1800, w: MAP_W, h: 1000, type: 'concrete' },
    // Mine tunnels — darker rock
    { x: 200, y: 1900, w: 1600, h: 800, type: 'concrete' },
  ];

  // ══════════════════════════════════════
  // WALLS
  // ══════════════════════════════════════

  // --- CREW BUILDING (large, 350x250) ---
  const crewX = 350, crewY = 330, crewW = 350, crewH = 250;
  const crewWalls: Wall[] = [
    makeWall(crewX, crewY, crewW, T, CONCRETE),
    makeWall(crewX, crewY + crewH - T, crewW, T, CONCRETE),
    makeWall(crewX, crewY, T, crewH, CONCRETE),
    makeWall(crewX + crewW - T, crewY, T, 80, CONCRETE),
    makeWall(crewX + crewW - T, crewY + 160, T, crewH - 160, CONCRETE), // 80px door
    // Interior divider
    makeWall(crewX + 170, crewY + T, T, 100, CONCRETE),
    makeWall(crewX + 170, crewY + 180, T, crewH - 180 - T, CONCRETE), // 80px interior door
  ];

  // --- SMALL CABINS (workers' quarters) ---
  const cabinSize = 100;
  const cabinPositions = [
    { x: 200, y: 700 },
    { x: 200, y: 880 },
    { x: 350, y: 700 },
    { x: 350, y: 880 },
  ];
  const cabinWalls: Wall[] = cabinPositions.flatMap(c => [
    makeWall(c.x, c.y, cabinSize, T, WOOD),
    makeWall(c.x, c.y + cabinSize - T, cabinSize, T, WOOD),
    makeWall(c.x, c.y, T, cabinSize, WOOD),
    makeWall(c.x + cabinSize - T, c.y, T, 10, WOOD),
    makeWall(c.x + cabinSize - T, c.y + 90, T, 10, WOOD), // 80px door gap
  ]);

  // --- GUARD BOOTHS ---
  const boothSize = 60;
  const boothPositions = [
    { x: 850, y: 250 },  // gate booth north
    { x: 850, y: 1500 }, // mine entrance booth
    { x: 1500, y: 600 }, // east perimeter
  ];
  const boothWalls: Wall[] = boothPositions.flatMap(b => [
    makeWall(b.x, b.y, boothSize, T, DARK_WOOD),
    makeWall(b.x, b.y + boothSize - T, boothSize, T, DARK_WOOD),
    makeWall(b.x, b.y, T, boothSize, DARK_WOOD),
    makeWall(b.x + boothSize - T, b.y, T, boothSize, DARK_WOOD),
  ]);

  // --- MACHINE HALL (large industrial building) ---
  const machX = 1100, machY = 350, machW = 400, machH = 300;
  const machineHallWalls: Wall[] = [
    makeWall(machX, machY, machW, T, CONCRETE),
    makeWall(machX, machY + machH - T, machW, T, CONCRETE),
    makeWall(machX, machY, T, machH, CONCRETE),
    makeWall(machX + machW - T, machY, T, 100, CONCRETE),
    makeWall(machX + machW - T, machY + 180, T, machH - 180, CONCRETE), // 80px door east
    // Internal divider
    makeWall(machX + 200, machY + T, T, 120, CONCRETE),
  ];

  // --- STORAGE SHED ---
  const shedX = 1200, shedY = 800, shedW = 180, shedH = 120;
  const shedWalls: Wall[] = [
    makeWall(shedX, shedY, shedW, T, WOOD),
    makeWall(shedX, shedY + shedH - T, shedW, T, WOOD),
    makeWall(shedX, shedY, T, shedH, WOOD),
    makeWall(shedX + shedW - T, shedY, T, 20, WOOD),
    makeWall(shedX + shedW - T, shedY + 100, T, 20, WOOD), // 80px door
  ];

  // ═══ UNDERGROUND MINE WALLS ═══
  // Main shaft corridor
  const mineWalls: Wall[] = [
    // Elevator shaft walls
    makeWall(850, 1800, T, 200, MINE_WALL),
    makeWall(1050, 1800, T, 200, MINE_WALL),
    // Main tunnel north wall
    makeWall(200, 1900, 650, T, MINE_ROCK),
    makeWall(1050, 1900, 750, T, MINE_ROCK),
    // Main tunnel south wall
    makeWall(200, 2100, 1600, T, MINE_ROCK),
    // West tunnel branch
    makeWall(200, 1900, T, 500, MINE_ROCK),
    makeWall(400, 1900, T, 200, MINE_ROCK),
    makeWall(400, 2100, T, 300, MINE_ROCK),
    makeWall(200, 2400, 200, T, MINE_ROCK),
    // East tunnel branch
    makeWall(1600, 1900, T, 500, MINE_ROCK),
    makeWall(1800, 1900, T, 500, MINE_ROCK),
    makeWall(1600, 2400, 200, T, MINE_ROCK),
    // Boss arena (center underground)
    makeWall(600, 2200, T, 400, MINE_ROCK),
    makeWall(1400, 2200, T, 400, MINE_ROCK),
    makeWall(600, 2600, 800, T, MINE_ROCK),
    // Boss arena entrance gaps already exist via missing wall segments
    // Small side rooms
    makeWall(250, 2100, 150, T, MINE_ROCK),
    makeWall(250, 2100, T, 120, MINE_ROCK),
    makeWall(250, 2220, 150, T, MINE_ROCK),
  ];

  const walls: Wall[] = [...crewWalls, ...cabinWalls, ...boothWalls, ...machineHallWalls, ...shedWalls, ...mineWalls];

  // ══════════════════════════════════════
  // ZONES
  // ══════════════════════════════════════
  const ZONE_CREW = { x: crewX + T, y: crewY + T, w: crewW - T * 2, h: crewH - T * 2 };
  const ZONE_MACHINE_HALL = { x: machX + T, y: machY + T, w: machW - T * 2, h: machH - T * 2 };
  const ZONE_CABINS = { x: 200, y: 700, w: 260, h: 300 };
  const ZONE_SHED = { x: shedX + T, y: shedY + T, w: shedW - T * 2, h: shedH - T * 2 };
  const ZONE_VILLAGE_CENTER = { x: 500, y: 600, w: 400, h: 500 };
  const ZONE_MINE_ENTRANCE = { x: 700, y: 1500, w: 500, h: 280 };
  const ZONE_MINE_SHAFT = { x: 860, y: 1810, w: 180, h: 180 };
  const ZONE_MINE_MAIN_TUNNEL = { x: 410, y: 1910, w: 630, h: 180 };
  const ZONE_MINE_EAST_TUNNEL = { x: 1060, y: 1910, w: 530, h: 180 };
  const ZONE_MINE_WEST_BRANCH = { x: 210, y: 1910, w: 180, h: 480 };
  const ZONE_MINE_EAST_BRANCH = { x: 1610, y: 1910, w: 180, h: 480 };
  const ZONE_BOSS_ARENA = { x: 610, y: 2210, w: 780, h: 380 };
  const ZONE_EAST_PERIMETER = { x: 1400, y: 500, w: 400, h: 600 };
  const ZONE_FOREST_N = { x: 30, y: 30, w: MAP_W - 60, h: 170 };
  const ZONE_ROAD = { x: 900, y: 250, w: 120, h: 1200 };

  const PLAYER_SPAWN = { x: 960, y: 250 };
  const MIN_SPAWN_DIST = 400;

  const rz = (zone: { x: number; y: number; w: number; h: number }, type: Enemy['type'], angle?: number) => {
    for (let attempt = 0; attempt < 30; attempt++) {
      const p = randIn(zone.x, zone.y, zone.w, zone.h);
      const dx = p.x - PLAYER_SPAWN.x;
      const dy = p.y - PLAYER_SPAWN.y;
      if (Math.sqrt(dx * dx + dy * dy) >= MIN_SPAWN_DIST) return makeEnemy(p.x, p.y, type, angle);
    }
    const p = randIn(zone.x, zone.y, zone.w, zone.h);
    return makeEnemy(p.x, p.y, type, angle);
  };

  // ══════════════════════════════════════
  // ENEMIES — SURFACE
  // ══════════════════════════════════════
  const enemies: Enemy[] = [
    // Village guards
    rz(ZONE_VILLAGE_CENTER, 'soldier'),
    rz(ZONE_VILLAGE_CENTER, 'soldier'),
    rz(ZONE_CREW, 'soldier'),
    rz(ZONE_MACHINE_HALL, 'soldier'),
    rz(ZONE_MACHINE_HALL, 'scav'),
    rz(ZONE_CABINS, 'scav'),
    rz(ZONE_CABINS, 'scav'),
    rz(ZONE_SHED, 'scav'),
    rz(ZONE_EAST_PERIMETER, 'soldier'),
    rz(ZONE_EAST_PERIMETER, 'redneck'),
    rz(ZONE_MINE_ENTRANCE, 'heavy'),
    rz(ZONE_MINE_ENTRANCE, 'soldier'),
    rz(ZONE_ROAD, 'soldier'),

    // Redneck + dog near forest
    ...(() => {
      const redneck = rz(ZONE_FOREST_N, 'redneck');
      const dog = makeEnemy(redneck.pos.x + 20, redneck.pos.y + 15, 'dog');
      dog.ownerId = redneck.id;
      dog.radioGroup = redneck.radioGroup;
      return [redneck, dog];
    })(),

    // ═══ UNDERGROUND ENEMIES ═══
    rz(ZONE_MINE_MAIN_TUNNEL, 'soldier'),
    rz(ZONE_MINE_MAIN_TUNNEL, 'scav'),
    rz(ZONE_MINE_EAST_TUNNEL, 'soldier'),
    rz(ZONE_MINE_EAST_TUNNEL, 'heavy'),
    rz(ZONE_MINE_WEST_BRANCH, 'scav'),
    rz(ZONE_MINE_WEST_BRANCH, 'shocker'),
    rz(ZONE_MINE_EAST_BRANCH, 'soldier'),
    rz(ZONE_MINE_EAST_BRANCH, 'scav'),

    // ═══ BOSS: GRUVRÅ ═══
    (() => {
      const bossZones = [ZONE_BOSS_ARENA];
      const bz = bossZones[Math.floor(Math.random() * bossZones.length)];
      const bp = randIn(bz.x, bz.y, bz.w, bz.h);
      const boss = makeEnemy(bp.x, bp.y, 'boss');
      (boss as any)._bossId = 'gruvra';
      (boss as any)._bossTitle = 'GRUVRÅ';
      boss.hp = 500;
      boss.maxHp = 500;
      boss.speed = 0.85;
      boss.damage = 40;
      // Cave-in attack: summons rocks from ceiling
      (boss as any)._caveInAttack = true;
      (boss as any)._caveInCooldown = 0;
      (boss as any)._caveInRadius = 120;
      (boss as any)._caveInDamage = 45;
      boss.loot = [
        WEAPON_TEMPLATES.ksp58(),
        createKeycard(),
        createValuable('Gruvrås Krona', 1200, '👑'),
        createValuable('Sällsynt Malm', 600, '💎'),
        createExtractionCode(),
      ];
      (boss as any)._patrolWaypoints = [
        { x: bp.x - 120, y: bp.y - 40 },
        { x: bp.x + 120, y: bp.y - 40 },
        { x: bp.x + 80, y: bp.y + 60 },
        { x: bp.x - 80, y: bp.y + 60 },
      ];
      (boss as any)._waypointIdx = 0;
      boss.patrolTarget = (boss as any)._patrolWaypoints[0];
      boss.state = 'patrol';
      return boss;
    })(),
  ];

  // ═══ ORT & STOLL — Boss bodyguards ═══
  const bossIdx = enemies.findIndex(e => e.type === 'boss');
  if (bossIdx >= 0) {
    const boss = enemies[bossIdx];

    // ORT — aggressive melee guard
    const ort = makeEnemy(boss.pos.x - 40, boss.pos.y + 25, 'heavy');
    (ort as any)._bodyguardOf = boss.id;
    (ort as any)._isBodyguard = true;
    (ort as any)._guardName = 'ORT';
    ort.hp = 200;
    ort.maxHp = 200;
    ort.speed = 0.65;
    ort.damage = 35;
    ort.alertRange = 280;
    ort.shootRange = 240;
    ort.radioGroup = boss.radioGroup;

    // STOLL — ranged suppressor guard
    const stoll = makeEnemy(boss.pos.x + 40, boss.pos.y + 25, 'heavy');
    (stoll as any)._bodyguardOf = boss.id;
    (stoll as any)._isBodyguard = true;
    (stoll as any)._guardName = 'STOLL';
    stoll.hp = 180;
    stoll.maxHp = 180;
    stoll.speed = 0.50;
    stoll.damage = 30;
    stoll.alertRange = 300;
    stoll.shootRange = 260;
    stoll.fireRate = 800;
    stoll.radioGroup = boss.radioGroup;
    stoll.tacticalRole = 'suppressor';

    enemies.push(ort, stoll);
  }

  // === STÅLHANDSKE-KULTEN — 3-4 miners in the underground tunnels ===
  const minerCultZones = [ZONE_MINE_WEST_BRANCH, ZONE_MINE_EAST_BRANCH, ZONE_MINE_MAIN_TUNNEL, ZONE_MINE_EAST_TUNNEL];
  const minerCultCount = 3 + Math.floor(Math.random() * 2); // 3-4
  for (let i = 0; i < minerCultCount; i++) {
    const zone = minerCultZones[i % minerCultZones.length];
    const mc = rz(zone, 'miner_cult');
    (mc as any)._cultFaction = 'stalhandske';
    enemies.push(mc);
  }

  // === SVARTA SOLEN OPERATIVE — rare spawn (25% chance) near mine entrance ===
  if (Math.random() < 0.25) {
    const op = rz(ZONE_MINE_ENTRANCE, 'svarta_sol');
    (op as any)._cultFaction = 'svarta_sol';
    enemies.push(op);
  }

  // ══════════════════════════════════════
  // LOOT
  // ══════════════════════════════════════
  const rLoot = (zone: { x: number; y: number; w: number; h: number }, type: LootContainer['type'], pool: LootPoolType) => {
    const p = randIn(zone.x, zone.y, zone.w, zone.h);
    return makeLoot(p.x, p.y, type, pool);
  };

  const lootContainers: LootContainer[] = [
    // Surface
    ...cabinPositions.map(c => makeLoot(c.x + 30, c.y + 30, pick(['desk', 'locker'] as const), pick(['common', 'desk'] as const))),
    rLoot(ZONE_CREW, 'desk', 'desk'),
    rLoot(ZONE_CREW, 'locker', 'locker'),
    rLoot(ZONE_CREW, 'desk', 'archive'),
    rLoot(ZONE_MACHINE_HALL, 'crate', 'military'),
    rLoot(ZONE_MACHINE_HALL, 'crate', 'common'),
    makeLoot(machX + 50, machY + 50, 'weapon_cabinet', 'weapon_cabinet_swedish'),
    rLoot(ZONE_SHED, 'crate', 'military'),
    rLoot(ZONE_SHED, 'barrel', 'common'),
    rLoot(ZONE_VILLAGE_CENTER, 'barrel', 'common'),
    rLoot(ZONE_VILLAGE_CENTER, 'crate', 'common'),
    rLoot(ZONE_MINE_ENTRANCE, 'crate', 'military'),
    rLoot(ZONE_EAST_PERIMETER, 'barrel', 'common'),
    // Underground
    rLoot(ZONE_MINE_MAIN_TUNNEL, 'crate', 'military'),
    rLoot(ZONE_MINE_MAIN_TUNNEL, 'barrel', 'common'),
    rLoot(ZONE_MINE_EAST_TUNNEL, 'crate', 'valuable'),
    rLoot(ZONE_MINE_EAST_TUNNEL, 'crate', 'military'),
    rLoot(ZONE_MINE_WEST_BRANCH, 'crate', 'common'),
    rLoot(ZONE_MINE_WEST_BRANCH, 'barrel', 'valuable'),
    rLoot(ZONE_MINE_EAST_BRANCH, 'crate', 'military'),
    rLoot(ZONE_MINE_EAST_BRANCH, 'locker', 'locker'),
    rLoot(ZONE_BOSS_ARENA, 'crate', 'valuable'),
    rLoot(ZONE_BOSS_ARENA, 'crate', 'military'),
    makeLoot(1000, 2400, 'weapon_cabinet', 'weapon_cabinet_swedish'),
    {
      id: `loot_${containerId++}`,
      pos: randIn(ZONE_MINE_WEST_BRANCH.x, ZONE_MINE_WEST_BRANCH.y, ZONE_MINE_WEST_BRANCH.w, ZONE_MINE_WEST_BRANCH.h),
      size: 24,
      items: [createExtractionCode()],
      looted: false,
      type: 'archive' as const,
    },
    {
      id: `loot_${containerId++}`,
      pos: randIn(ZONE_MINE_EAST_BRANCH.x, ZONE_MINE_EAST_BRANCH.y, ZONE_MINE_EAST_BRANCH.w, ZONE_MINE_EAST_BRANCH.h),
      size: 24,
      items: [createTNT()],
      looted: false,
      type: 'crate' as const,
    },
  ];

  // ══════════════════════════════════════
  // DOCUMENTS
  // ══════════════════════════════════════
  const docZones = [ZONE_CREW, ZONE_MACHINE_HALL, ZONE_MINE_MAIN_TUNNEL, ZONE_MINE_WEST_BRANCH, ZONE_BOSS_ARENA];
  const docIds = ['doc_mine_1', 'doc_mine_2', 'doc_mine_3', 'doc_mine_4', 'doc_mine_5'];
  const documentPickups: DocumentPickup[] = docIds.map((id, i) => {
    const z = docZones[i % docZones.length];
    const p = randIn(z.x, z.y, z.w, z.h);
    return makeDocPickup(p.x, p.y, id);
  });

  // ══════════════════════════════════════
  // PROPS
  // ══════════════════════════════════════
  const props: Prop[] = [
    // Forest border trees
    ...Array.from({ length: 20 }, (_, i) => ({
      pos: { x: 60 + i * 100 + Math.random() * 30, y: 30 + Math.random() * 150 },
      w: 28 + Math.random() * 16, h: 28 + Math.random() * 16,
      type: 'pine_tree' as Prop['type'],
    })),
    // West forest
    ...Array.from({ length: 10 }, (_, i) => ({
      pos: { x: 30 + Math.random() * 110, y: 250 + i * 160 + Math.random() * 50 },
      w: 26 + Math.random() * 14, h: 26 + Math.random() * 14,
      type: 'pine_tree' as Prop['type'],
    })),
    // East forest
    ...Array.from({ length: 10 }, (_, i) => ({
      pos: { x: MAP_W - 30 - Math.random() * 110, y: 250 + i * 160 + Math.random() * 50 },
      w: 26 + Math.random() * 14, h: 26 + Math.random() * 14,
      type: 'pine_tree' as Prop['type'],
    })),
    // Guard booths
    ...boothPositions.map(b => ({
      pos: { x: b.x + boothSize / 2, y: b.y + boothSize / 2 },
      w: 14, h: 14,
      type: 'guard_booth' as Prop['type'],
    })),
    // Large machinery near machine hall
    { pos: { x: 1150, y: 300 }, w: 50, h: 30, type: 'vehicle_wreck' },
    { pos: { x: 1350, y: 400 }, w: 40, h: 40, type: 'barrel_stack' },
    { pos: { x: 1400, y: 350 }, w: 55, h: 28, type: 'vehicle_wreck' },
    // Mine entrance area
    { pos: { x: 800, y: 1550 }, w: 40, h: 40, type: 'concrete_barrier' },
    { pos: { x: 1100, y: 1550 }, w: 40, h: 40, type: 'concrete_barrier' },
    { pos: { x: 950, y: 1600 }, w: 60, h: 20, type: 'sandbags' },
    // Road signs
    { pos: { x: 950, y: 240 }, w: 12, h: 12, type: 'road_sign' },
    { pos: { x: 960, y: 1480 }, w: 12, h: 12, type: 'road_sign' },
    // Cabin yard barrels and crates
    ...cabinPositions.map(c => ({
      pos: { x: c.x + cabinSize + 15, y: c.y + 20 }, w: 22, h: 22, type: 'barrel_stack' as Prop['type'],
    })),
    // Village center — equipment
    { pos: { x: 600, y: 700 }, w: 40, h: 20, type: 'equipment_table' },
    { pos: { x: 700, y: 800 }, w: 30, h: 30, type: 'wood_crate' },
    { pos: { x: 750, y: 900 }, w: 22, h: 22, type: 'barrel_stack' },
    // Underground mine props
    { pos: { x: 500, y: 1950 }, w: 30, h: 30, type: 'wood_crate' },
    { pos: { x: 700, y: 2000 }, w: 22, h: 22, type: 'barrel_stack' },
    { pos: { x: 1200, y: 1960 }, w: 40, h: 20, type: 'equipment_table' },
    { pos: { x: 1400, y: 2000 }, w: 30, h: 30, type: 'wood_crate' },
    { pos: { x: 300, y: 2200 }, w: 22, h: 22, type: 'barrel_stack' },
    { pos: { x: 1700, y: 2200 }, w: 30, h: 30, type: 'wood_crate' },
    // Boss arena pillars (as sandbags for cover)
    { pos: { x: 800, y: 2350 }, w: 30, h: 30, type: 'concrete_barrier' },
    { pos: { x: 1000, y: 2300 }, w: 30, h: 30, type: 'concrete_barrier' },
    { pos: { x: 1200, y: 2400 }, w: 30, h: 30, type: 'concrete_barrier' },
    { pos: { x: 900, y: 2500 }, w: 30, h: 30, type: 'concrete_barrier' },
    { pos: { x: 1100, y: 2500 }, w: 30, h: 30, type: 'concrete_barrier' },
    // Bushes around village
    ...Array.from({ length: 15 }, () => ({
      pos: { x: 200 + Math.random() * 1600, y: 600 + Math.random() * 800 },
      w: 16 + Math.random() * 12, h: 14 + Math.random() * 10,
      type: 'bush' as Prop['type'],
    })),
    // Searchlights at mine entrance
    { pos: { x: 750, y: 1510 }, w: 16, h: 16, type: 'searchlight' },
    { pos: { x: 1150, y: 1510 }, w: 16, h: 16, type: 'searchlight' },
    // Fuel depot near machine hall
    { pos: { x: 1300, y: 700 }, w: 40, h: 30, type: 'fuel_depot' },
  ];

  // ══════════════════════════════════════
  // ALARM PANELS
  // ══════════════════════════════════════
  const alarmPanels: AlarmPanel[] = [
    { id: 'alarm_crew', pos: { x: crewX + 30, y: crewY + 30 }, activated: false, hacked: false, hackProgress: 0, hackTime: 3 },
    { id: 'alarm_mine', pos: { x: 950, y: 1520 }, activated: false, hacked: false, hackProgress: 0, hackTime: 4 },
    { id: 'alarm_underground', pos: { x: 900, y: 1950 }, activated: false, hacked: false, hackProgress: 0, hackTime: 5 },
  ];

  // ══════════════════════════════════════
  // EXTRACTION POINTS
  // ══════════════════════════════════════
  const allExfils: ExtractionPoint[] = [
    { pos: { x: 100, y: 100 }, radius: 80, timer: 5, active: false, name: 'FOREST ROAD NORTH' },
    { pos: { x: MAP_W - 100, y: 900 }, radius: 80, timer: 5, active: false, name: 'EAST LOGGING TRAIL' },
    { pos: { x: 300, y: 1700 }, radius: 80, timer: 5, active: false, name: 'OLD MINE CART TRACK' },
  ];
  allExfils[Math.floor(Math.random() * allExfils.length)].active = true;
  // Conditional exfil — boss must be dead
  const bossExfil: ExtractionPoint = { pos: { x: 1000, y: 2580 }, radius: 60, timer: 3, active: true, name: 'DEEP SHAFT EXIT' };
  (bossExfil as any)._requirements = 'boss_dead';
  allExfils.push(bossExfil);
  // Elevator transition point — special exfil that teleports between levels
  const elevatorExfil: ExtractionPoint = { pos: { x: 950, y: 1750 }, radius: 50, timer: 2, active: true, name: '⛏ MINE ELEVATOR ⛏' };
  (elevatorExfil as any)._isElevator = true;
  (elevatorExfil as any)._teleportTo = { x: 950, y: 1850 };
  allExfils.push(elevatorExfil);
  // Reverse elevator — from underground back up
  const elevatorUp: ExtractionPoint = { pos: { x: 950, y: 1850 }, radius: 50, timer: 2, active: true, name: '⛏ MINE ELEVATOR UP ⛏' };
  (elevatorUp as any)._isElevator = true;
  (elevatorUp as any)._teleportTo = { x: 950, y: 1700 };
  allExfils.push(elevatorUp);

  const extractionPoints = allExfils;

  // ══════════════════════════════════════
  // LIGHTS
  // ══════════════════════════════════════
  const lights: LightSource[] = [
    // Cabins
    ...cabinPositions.map(c => ({
      pos: { x: c.x + cabinSize / 2, y: c.y + cabinSize / 2 }, radius: 80, color: '#ffcc66', intensity: 0.5, type: 'window' as const,
    })),
    // Crew building
    { pos: { x: crewX + 80, y: crewY + 120 }, radius: 120, color: '#ffdd88', intensity: 0.6, type: 'ceiling' },
    { pos: { x: crewX + 280, y: crewY + 120 }, radius: 120, color: '#ffdd88', intensity: 0.6, type: 'ceiling' },
    // Machine hall
    { pos: { x: machX + 100, y: machY + 150 }, radius: 140, color: '#eeeedd', intensity: 0.5, type: 'ceiling' },
    { pos: { x: machX + 300, y: machY + 150 }, radius: 140, color: '#eeeedd', intensity: 0.5, type: 'ceiling' },
    // Guard booths
    ...boothPositions.map(b => ({
      pos: { x: b.x + boothSize / 2, y: b.y + boothSize / 2 }, radius: 60, color: '#ffaa44', intensity: 0.4, type: 'desk' as const,
    })),
    // Mine entrance searchlights
    { pos: { x: 750, y: 1510 }, radius: 150, color: '#ffffff', intensity: 0.6, type: 'ceiling' },
    { pos: { x: 1150, y: 1510 }, radius: 150, color: '#ffffff', intensity: 0.6, type: 'ceiling' },
    // Underground mine lights — dim and flickering
    { pos: { x: 950, y: 1900 }, radius: 100, color: '#ffaa44', intensity: 0.4, flicker: true, type: 'ceiling' },
    { pos: { x: 500, y: 1980 }, radius: 80, color: '#ffaa44', intensity: 0.3, flicker: true, type: 'ceiling' },
    { pos: { x: 1300, y: 1980 }, radius: 80, color: '#ffaa44', intensity: 0.3, flicker: true, type: 'ceiling' },
    { pos: { x: 300, y: 2150 }, radius: 70, color: '#ff8833', intensity: 0.3, flicker: true, type: 'fire' },
    { pos: { x: 1700, y: 2150 }, radius: 70, color: '#ff8833', intensity: 0.3, flicker: true, type: 'fire' },
    // Boss arena — eerie red glow
    { pos: { x: 1000, y: 2400 }, radius: 200, color: '#ff4422', intensity: 0.4, flicker: true, type: 'alarm' },
    { pos: { x: 800, y: 2350 }, radius: 100, color: '#ff6633', intensity: 0.3, flicker: true, type: 'fire' },
    { pos: { x: 1200, y: 2450 }, radius: 100, color: '#ff6633', intensity: 0.3, flicker: true, type: 'fire' },
    // Exfil lights
    { pos: { x: 100, y: 100 }, radius: 80, color: '#44ff66', intensity: 0.4, type: 'fire' },
    { pos: { x: MAP_W - 100, y: 900 }, radius: 80, color: '#44ff66', intensity: 0.4, type: 'fire' },
    { pos: { x: 300, y: 1700 }, radius: 80, color: '#44ff66', intensity: 0.4, type: 'fire' },
  ];

  // ══════════════════════════════════════
  // WINDOWS
  // ══════════════════════════════════════
  const windows: WindowDef[] = [
    ...cabinPositions.map(c => ({ x: c.x + cabinSize - T, y: c.y + 10, w: T, h: 20, direction: 'east' as const })),
    { x: crewX + crewW - T, y: crewY + 30, w: T, h: 30, direction: 'east' as const },
    { x: machX, y: machY + 50, w: T, h: 30, direction: 'west' as const },
  ];

  return { walls, enemies, lootContainers, documentPickups, extractionPoints, alarmPanels, props, lights, windows, terrainZones, mapWidth: MAP_W, mapHeight: MAP_H };
}

export function createMiningVillagePlayer() {
  const weapon = WEAPON_TEMPLATES.makarov();
  const knife = WEAPON_TEMPLATES.knife();
  return {
    pos: { x: 960, y: 250 },
    hp: 100,
    maxHp: 100,
    speed: 1.69,
    angle: Math.PI / 2,
    inventory: [weapon, knife],
    equippedWeapon: weapon,
    meleeWeapon: knife,
    sidearm: weapon,
    primaryWeapon: null as any,
    activeSlot: 2 as 1 | 2 | 3,
    currentAmmo: 8,
    maxAmmo: 8,
    ammoType: '9x18' as const,
    ammoReserves: { '9x18': 32, '5.45x39': 0, '7.62x39': 0, '12gauge': 0, '7.62x54R': 0 } as Record<import('./types').AmmoType, number>,
    bleedRate: 0,
    armor: 0,
    lastShot: 0,
    fireRate: 400,
    inCover: false,
    coverObject: null,
    coverQuality: 0,
    coverLabel: '',
    peeking: false,
    lastGrenadeTime: 0,
    tntCount: 0,
    keycardCount: 0,
    specialSlot: [] as Item[],
    selectedThrowable: 'grenade' as 'grenade' | 'gas_grenade' | 'flashbang',
    stamina: 125,
    maxStamina: 125,
    reloading: false,
    reloadTimer: 0,
    reloadTime: 0,
  };
}
