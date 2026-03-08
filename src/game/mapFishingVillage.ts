import { Wall, LootContainer, Enemy, ExtractionPoint, DocumentPickup, Prop, AlarmPanel, LightSource, WindowDef, TerrainZone, Item } from './types';
import { LOOT_POOLS, WEAPON_TEMPLATES, createAmmo, createExtractionCode, createGrenade, createKey, createKeycard, createArmor, createValuable, createTNT, createDogFood } from './items';

// Fishing Village: 1400x2000
// Layout: Forest top, cabins along a road running north-south, dock/pier at bottom, sea at very bottom
const MAP_W = 1400;
const MAP_H = 2000;

let enemyId = 10000; // offset to avoid collision with main map
let containerId = 10000;

function randIn(zx: number, zy: number, zw: number, zh: number, m = 25): { x: number; y: number } {
  return { x: zx + m + Math.random() * Math.max(1, zw - m * 2), y: zy + m + Math.random() * Math.max(1, zh - m * 2) };
}
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const W = '#8a7a5a'; // weathered wood
const WD = '#6a5a3a'; // dark wood
const STONE = '#7a7a7a';

const makeWall = (x: number, y: number, w: number, h: number, color = W): Wall => ({ x, y, w, h, color });

const makeEnemy = (x: number, y: number, type: Enemy['type'], fixedAngle?: number): Enemy => {
  // FISHING VILLAGE — rough coastal outpost: undisciplined, nervous scavs, redneck fishermen
  const stats: Record<string, any> = {
    scav:    { hp: 40, speed: 0.65, damage: 9, alertRange: 150, shootRange: 75,  fireRate: 1600 },
    soldier: { hp: 65, speed: 0.82, damage: 16, alertRange: 220, shootRange: 110, fireRate: 1050 },
    heavy:   { hp: 150, speed: 0.38, damage: 28, alertRange: 200, shootRange: 105, fireRate: 1800 },
    sniper:  { hp: 80, speed: 0.34, damage: 80, alertRange: 500, shootRange: 300, fireRate: 5500 },
    redneck: { hp: 75, speed: 0.68, damage: 20, alertRange: 200, shootRange: 70,  fireRate: 1050 },
    dog:     { hp: 32, speed: 1.85, damage: 24, alertRange: 280, shootRange: 28,  fireRate: 850 },
    boss:    { hp: 420, speed: 1.10, damage: 38, alertRange: 360, shootRange: 190, fireRate: 580 },
    turret:  { hp: 180, speed: 0, damage: 20, alertRange: 240, shootRange: 125, fireRate: 1000 },
    shocker: { hp: 55, speed: 1.00, damage: 38, alertRange: 190, shootRange: 32,  fireRate: 750 },
  };
  // Fishing village personality: rednecks are territorial, scavs are jumpy/cowardly
  const personality: Record<string, any> = {
    scav:    { _cowardice: 0.85, _accuracy: 0.45, _aggression: 0.15, _seekCoverChance: 0.1 },
    soldier: { _cowardice: 0.35, _accuracy: 0.7, _aggression: 0.5, _seekCoverChance: 0.35 },
    heavy:   { _cowardice: 0.05, _accuracy: 0.65, _aggression: 0.7, _seekCoverChance: 0.15 },
    sniper:  { _cowardice: 0.5, _accuracy: 0.95, _aggression: 0.1, _seekCoverChance: 0.0 },
    redneck: { _cowardice: 0.25, _accuracy: 0.6, _aggression: 0.7, _seekCoverChance: 0.05 },
    dog:     { _cowardice: 0.2, _accuracy: 1.0, _aggression: 0.95, _seekCoverChance: 0.0 },
    boss:    { _cowardice: 0.0, _accuracy: 0.75, _aggression: 1.0, _seekCoverChance: 0.0 },
    turret:  { _cowardice: 0.0, _accuracy: 0.85, _aggression: 1.0, _seekCoverChance: 0.0 },
    shocker: { _cowardice: 0.15, _accuracy: 0.5, _aggression: 0.9, _seekCoverChance: 0.0 },
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
    tacticalRole: type === 'heavy' ? 'suppressor' : type === 'soldier' ? (Math.random() < 0.5 ? 'flanker' : 'assault') : 'none',
    suppressTimer: 0,
    callForHelpTimer: 0,
    lastTacticalSwitch: 0,
    stunTimer: 0,
    awareness: 0,
    awarenessDecay: type === 'scav' ? 0.25 : type === 'redneck' ? 0.18 : 0.15,
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
    enemy.loot = [WEAPON_TEMPLATES.toz(), createDogFood()];
  }
  return enemy;
};

type LootPoolType = 'common' | 'military' | 'valuable' | 'desk' | 'archive' | 'locker' | 'body' | 'weapon_cabinet';

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

export function generateFishingVillageMap() {
  const T = 10; // wall thickness

  // ══════════════════════════════════════
  // TERRAIN ZONES
  // ══════════════════════════════════════
  const terrainZones: TerrainZone[] = [
    // Dense forest top
    { x: 0, y: 0, w: MAP_W, h: 280, type: 'forest' },
    // Forest sides — east side tighter
    { x: 0, y: 0, w: 160, h: 1350, type: 'forest' },
    { x: MAP_W - 100, y: 0, w: 100, h: 1350, type: 'forest' },
    // Rocky terrain east of cabins
    { x: 1020, y: 350, w: 280, h: 500, type: 'dirt' },
    // Swampy/grassy area east-south
    { x: 1020, y: 850, w: 280, h: 300, type: 'grass' },
    // Main road (vertical, center)
    { x: 620, y: 200, w: 100, h: 1150, type: 'asphalt' },
    // Side road to dock
    { x: 500, y: 1300, w: 250, h: 80, type: 'asphalt' },
    // Dock building — two rooms extending into sea (interior floor must stay dry)
    { x: 500, y: 1380, w: 370, h: 330, type: 'concrete' },
    // Village grass
    { x: 180, y: 280, w: 870, h: 1050, type: 'grass' },
    // Dirt around cabins
    { x: 280, y: 380, w: 300, h: 700, type: 'dirt' },
    { x: 750, y: 380, w: 250, h: 700, type: 'dirt' },
    // Beach / sand near water
    { x: 0, y: 1330, w: MAP_W, h: 90, type: 'dirt' },
    // === WATER / SEA — starts below the dock building so interior floor isn't water-colored ===
    { x: 0, y: 1710, w: MAP_W, h: MAP_H - 1710, type: 'water' },
    // Water flanking the dock
    { x: 0, y: 1380, w: 480, h: 620, type: 'water' },
    { x: 880, y: 1380, w: MAP_W - 880, h: 620, type: 'water' },
  ];

  // ══════════════════════════════════════
  // WALLS — Cabins & dock structures
  // ══════════════════════════════════════
  const cabinW = 120;
  const cabinH = 120; // taller to fit 70px door gap

  const makeCabin = (cx: number, cy: number, doorSide: 'east' | 'west'): Wall[] => {
    const walls: Wall[] = [];
    walls.push(makeWall(cx, cy, cabinW, T, W));
    walls.push(makeWall(cx, cy + cabinH - T, cabinW, T, W));
    if (doorSide === 'east') {
      walls.push(makeWall(cx, cy, T, cabinH, W));
      walls.push(makeWall(cx + cabinW - T, cy, T, 20, W));
      walls.push(makeWall(cx + cabinW - T, cy + 90, T, cabinH - 90, W)); // 70px gap (20..90)
    } else {
      walls.push(makeWall(cx + cabinW - T, cy, T, cabinH, W));
      walls.push(makeWall(cx, cy, T, 20, W));
      walls.push(makeWall(cx, cy + 90, T, cabinH - 90, W)); // 70px gap (20..90)
    }
    return walls;
  };

  // West cabins (doors face road = east)
  const westCabins = [
    { x: 330, y: 420 },
    { x: 300, y: 620 },
    { x: 340, y: 850 },
  ];
  // East cabins (doors face road = west) — pulled closer
  const eastCabins = [
    { x: 780, y: 400 },
    { x: 810, y: 630 },
    { x: 770, y: 870 },
  ];

  const walls: Wall[] = [
    ...westCabins.flatMap(c => makeCabin(c.x, c.y, 'east')),
    ...eastCabins.flatMap(c => makeCabin(c.x, c.y, 'west')),

    // === DOCK — two rooms extending into the sea ===
    // Dock north wall with 80px entrance from land
    makeWall(500, 1380, 130, T, STONE),   // north-left
    makeWall(710, 1380, 160, T, STONE),   // north-right (gap 630..710 = 80px)
    // Dock west wall
    makeWall(500, 1380, T, 320, STONE),
    // Dock east wall
    makeWall(860, 1380, T, 320, STONE),
    // Dock south wall — 80px gap for south entrance from water
    makeWall(500, 1700, 180, T, STONE),   // south-left
    makeWall(760, 1700, 100, T, STONE),   // south-right (gap 680..760 = 80px)
    // Center divider wall — splits into two rooms, 80px gap for passage between rooms
    makeWall(680, 1390, T, 140, STONE),  // upper part
    makeWall(680, 1610, T, 90, STONE),   // lower part (gap 1530..1610 = 80px)

    // Warehouse at dock (70px door gap on east wall)
    makeWall(320, 1250, 150, T, WD),
    makeWall(320, 1350, 150, T, WD),
    makeWall(320, 1250, T, 100, WD),
    makeWall(460, 1250, T, 15, WD),
    makeWall(460, 1335, T, 15, WD), // gap 1265..1335 = 70px

    // Old fishing shack (70px door gap on east wall)
    makeWall(200, 1140, 100, T, W),
    makeWall(200, 1230, 100, T, W),
    makeWall(200, 1140, T, 90, W),
    makeWall(290, 1140, T, 10, W),
    makeWall(290, 1210, T, 20, W), // gap 1150..1210 = 60px

    // General store / bar (north village) — 70px door gap on east wall
    makeWall(460, 340, 180, T, WD),
    makeWall(460, 440, 180, T, WD),
    makeWall(460, 340, T, 100, WD),
    makeWall(630, 340, T, 15, WD),
    makeWall(630, 425, T, 15, WD), // gap 355..425 = 70px
  ];

  // ══════════════════════════════════════
  // ZONES
  // ══════════════════════════════════════
  const ZONE_WEST_VILLAGE = { x: 260, y: 380, w: 300, h: 600 };
  const ZONE_EAST_VILLAGE = { x: 730, y: 380, w: 280, h: 600 };
  const ZONE_ROAD_NORTH = { x: 600, y: 300, w: 140, h: 350 };
  const ZONE_ROAD_SOUTH = { x: 600, y: 700, w: 140, h: 500 };
  const ZONE_DOCK = { x: 510, y: 1390, w: 340, h: 300 };
  const ZONE_DOCK_WEST = { x: 510, y: 1390, w: 160, h: 300 };
  const ZONE_DOCK_EAST = { x: 690, y: 1390, w: 160, h: 300 };
  const ZONE_WAREHOUSE = { x: 330, y: 1260, w: 120, h: 80 };
  const ZONE_FOREST_NW = { x: 30, y: 30, w: 300, h: 250 };
  const ZONE_FOREST_NE = { x: MAP_W - 220, y: 30, w: 190, h: 250 };
  const ZONE_FOREST_W = { x: 30, y: 350, w: 150, h: 700 };
  const ZONE_FOREST_E = { x: MAP_W - 130, y: 350, w: 100, h: 700 };
  const ZONE_STORE = { x: 470, y: 350, w: 150, h: 80 };
  const ZONE_ROCKY_E = { x: 1050, y: 400, w: 200, h: 450 };

  const PLAYER_SPAWN = { x: 670, y: 230 };
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
  // ENEMIES
  // ══════════════════════════════════════
  const enemies: Enemy[] = [
    rz(ZONE_WEST_VILLAGE, 'scav'),
    rz(ZONE_EAST_VILLAGE, 'scav'),
    rz(ZONE_EAST_VILLAGE, 'soldier'),
    rz(ZONE_DOCK, 'soldier'),
    rz(ZONE_DOCK, 'heavy'),
    rz(ZONE_WAREHOUSE, 'scav'),
    rz(ZONE_FOREST_W, 'soldier'),
    rz(ZONE_FOREST_E, 'scav'),
    rz(ZONE_FOREST_NW, 'scav'),

    // Redneck with dog
    ...(() => {
      const redneck = rz(ZONE_EAST_VILLAGE, 'redneck');
      const dog = makeEnemy(redneck.pos.x + 20, redneck.pos.y + 15, 'dog');
      dog.ownerId = redneck.id;
      dog.radioGroup = redneck.radioGroup;
      return [redneck, dog];
    })(),

    // Boss — Nachalnik — random spawn in dock/warehouse area
    (() => {
      const bossZones = [ZONE_DOCK, ZONE_WAREHOUSE, ZONE_ROAD_SOUTH];
      const bz = bossZones[Math.floor(Math.random() * bossZones.length)];
      const bp = randIn(bz.x, bz.y, bz.w, bz.h);
      const boss = makeEnemy(bp.x, bp.y, 'boss');
      (boss as any)._bossId = 'nachalnik';
      (boss as any)._bossTitle = 'NACHALNIK';
      // Fish hook melee attack — massive close-range damage
      (boss as any)._hookAttack = true;
      (boss as any)._hookRange = 55; // close range hook sweep
      (boss as any)._hookDamage = 60; // devastating hook damage
      (boss as any)._hookCooldown = 0;
      boss.loot = [
        WEAPON_TEMPLATES.ak74(),
        createKeycard(),
        createValuable('Boat Keys', 500, '🔑'),
        createValuable('Giant Fish Hook', 800, '🪝'),
        createExtractionCode(),
      ];
      (boss as any)._patrolWaypoints = [
        { x: bp.x - 100, y: bp.y - 30 },
        { x: bp.x + 100, y: bp.y - 30 },
        { x: bp.x + 50, y: bp.y + 50 },
        { x: bp.x - 50, y: bp.y + 50 },
      ];
      (boss as any)._waypointIdx = 0;
      boss.patrolTarget = (boss as any)._patrolWaypoints[0];
      boss.state = 'patrol';
      boss.speed = 0.9;
      return boss;
    })(),
  ];

  // Bodyguards for boss
  const bossIdx = enemies.findIndex(e => e.type === 'boss');
  if (bossIdx >= 0) {
    const boss = enemies[bossIdx];
    const bg1 = makeEnemy(boss.pos.x - 25, boss.pos.y + 15, 'soldier');
    const bg2 = makeEnemy(boss.pos.x + 25, boss.pos.y + 15, 'soldier');
    for (const bg of [bg1, bg2]) {
      (bg as any)._bodyguardOf = boss.id;
      (bg as any)._isBodyguard = true;
      bg.hp = 100;
      bg.maxHp = 100;
      bg.alertRange = 280;
      bg.shootRange = 240;
      bg.radioGroup = boss.radioGroup;
    }
    enemies.push(bg1, bg2);
  }

  // ══════════════════════════════════════
  // LOOT
  // ══════════════════════════════════════
  const rLoot = (zone: { x: number; y: number; w: number; h: number }, type: LootContainer['type'], pool: LootPoolType) => {
    const p = randIn(zone.x, zone.y, zone.w, zone.h);
    return makeLoot(p.x, p.y, type, pool);
  };

  const lootContainers: LootContainer[] = [
    ...westCabins.map(c => makeLoot(c.x + 30, c.y + 30, pick(['desk', 'locker'] as const), pick(['common', 'desk'] as const))),
    ...eastCabins.map(c => makeLoot(c.x + 50, c.y + 30, pick(['desk', 'locker'] as const), pick(['common', 'desk', 'locker'] as const))),
    rLoot(ZONE_WAREHOUSE, 'crate', 'military'),
    rLoot(ZONE_WAREHOUSE, 'crate', 'military'),
    makeLoot(380, 1300, 'weapon_cabinet', 'weapon_cabinet'),
    rLoot(ZONE_DOCK, 'crate', 'valuable'),
    rLoot(ZONE_DOCK, 'barrel', 'common'),
    rLoot(ZONE_DOCK_EAST, 'crate', 'military'),
    rLoot(ZONE_STORE, 'desk', 'desk'),
    rLoot(ZONE_STORE, 'locker', 'valuable'),
    makeLoot(510, 390, 'weapon_cabinet', 'weapon_cabinet'),
    rLoot(ZONE_FOREST_W, 'crate', 'common'),
    rLoot(ZONE_FOREST_E, 'crate', 'military'),
    rLoot(ZONE_ROAD_SOUTH, 'barrel', 'common'),
    // Extra ground loot scattered around the village
    rLoot(ZONE_WEST_VILLAGE, 'barrel', 'common'),
    rLoot(ZONE_WEST_VILLAGE, 'crate', 'common'),
    rLoot(ZONE_EAST_VILLAGE, 'barrel', 'common'),
    rLoot(ZONE_EAST_VILLAGE, 'crate', 'desk'),
    rLoot(ZONE_ROAD_NORTH, 'barrel', 'common'),
    rLoot(ZONE_FOREST_NW, 'crate', 'common'),
    rLoot(ZONE_FOREST_NE, 'crate', 'military'),
    rLoot(ZONE_DOCK_WEST, 'barrel', 'common'),
    rLoot(ZONE_DOCK_EAST, 'barrel', 'common'),
    rLoot(ZONE_ROCKY_E, 'crate', 'common'),
    rLoot(ZONE_ROCKY_E, 'barrel', 'military'),
    {
      id: `loot_${containerId++}`,
      pos: randIn(ZONE_WAREHOUSE.x, ZONE_WAREHOUSE.y, ZONE_WAREHOUSE.w, ZONE_WAREHOUSE.h),
      size: 24,
      items: [createExtractionCode()],
      looted: false,
      type: 'archive' as const,
    },
    {
      id: `loot_${containerId++}`,
      pos: randIn(ZONE_DOCK.x, ZONE_DOCK.y, ZONE_DOCK.w, ZONE_DOCK.h),
      size: 24,
      items: [createTNT()],
      looted: false,
      type: 'crate' as const,
    },
  ];

  // ══════════════════════════════════════
  // DOCUMENTS
  // ══════════════════════════════════════
  const docZones = [ZONE_WEST_VILLAGE, ZONE_EAST_VILLAGE, ZONE_STORE, ZONE_WAREHOUSE, ZONE_DOCK];
  const docIds = ['doc_1', 'doc_2', 'doc_3', 'doc_4', 'doc_5'];
  const documentPickups: DocumentPickup[] = docIds.map((id, i) => {
    const z = docZones[i % docZones.length];
    const p = randIn(z.x, z.y, z.w, z.h);
    return makeDocPickup(p.x, p.y, id);
  });

  // ══════════════════════════════════════
  // PROPS
  // ══════════════════════════════════════
  const props: Prop[] = [
    // Trees along road
    ...Array.from({ length: 10 }, (_, i) => ({
      pos: { x: 600 + (Math.random() > 0.5 ? -50 : 120) + Math.random() * 20, y: 320 + i * 100 },
      w: 26 + Math.random() * 14, h: 26 + Math.random() * 14,
      type: (Math.random() > 0.4 ? 'pine_tree' : 'tree') as Prop['type'],
    })),
    // Dense forest top
    ...Array.from({ length: 16 }, (_, i) => ({
      pos: { x: 60 + i * 85 + Math.random() * 30, y: 40 + Math.random() * 200 },
      w: 28 + Math.random() * 18, h: 28 + Math.random() * 18,
      type: (Math.random() > 0.3 ? 'pine_tree' : 'tree') as Prop['type'],
    })),
    // West forest
    ...Array.from({ length: 8 }, (_, i) => ({
      pos: { x: 30 + Math.random() * 120, y: 300 + i * 140 + Math.random() * 50 },
      w: 26 + Math.random() * 16, h: 26 + Math.random() * 16,
      type: 'pine_tree' as Prop['type'],
    })),
    // East forest — tighter
    ...Array.from({ length: 6 }, (_, i) => ({
      pos: { x: MAP_W - 30 - Math.random() * 80, y: 300 + i * 170 + Math.random() * 50 },
      w: 26 + Math.random() * 16, h: 26 + Math.random() * 16,
      type: 'pine_tree' as Prop['type'],
    })),
    // Rocky east terrain — boulders
    ...Array.from({ length: 5 }, () => ({
      pos: { x: 1060 + Math.random() * 180, y: 400 + Math.random() * 400 },
      w: 18 + Math.random() * 14, h: 16 + Math.random() * 12,
      type: 'sandbags' as Prop['type'], // reuse as rocks
    })),
    // Bushes around cabins
    ...Array.from({ length: 12 }, () => ({
      pos: { x: 250 + Math.random() * 800, y: 380 + Math.random() * 600 },
      w: 16 + Math.random() * 12, h: 14 + Math.random() * 10,
      type: 'bush' as Prop['type'],
    })),
    // Dock platform props
    { pos: { x: 500, y: 1400 }, w: 28, h: 28, type: 'wood_crate' },
    { pos: { x: 550, y: 1420 }, w: 24, h: 24, type: 'wood_crate' },
    { pos: { x: 800, y: 1400 }, w: 22, h: 22, type: 'barrel_stack' },
    { pos: { x: 840, y: 1420 }, w: 22, h: 22, type: 'barrel_stack' },
    // Pier props
    { pos: { x: 650, y: 1600 }, w: 26, h: 26, type: 'wood_crate' },
    { pos: { x: 700, y: 1700 }, w: 22, h: 22, type: 'barrel_stack' },
    { pos: { x: 670, y: 1830 }, w: 40, h: 14, type: 'sandbags' },
    // Fishing shack area
    { pos: { x: 240, y: 1170 }, w: 26, h: 26, type: 'wood_crate' },
    { pos: { x: 270, y: 1190 }, w: 22, h: 22, type: 'barrel_stack' },
    // Cabin yard props
    ...westCabins.map(c => ({
      pos: { x: c.x - 25, y: c.y + 20 }, w: 22, h: 22, type: 'barrel_stack' as Prop['type'],
    })),
    ...eastCabins.map(c => ({
      pos: { x: c.x + cabinW + 12, y: c.y + 30 }, w: 26, h: 26, type: 'wood_crate' as Prop['type'],
    })),
    // Vehicle wreck on road
    { pos: { x: 650, y: 900 }, w: 55, h: 28, type: 'vehicle_wreck' },
    { pos: { x: 640, y: 550 }, w: 50, h: 25, type: 'vehicle_wreck' },
    // Sandbags around dock entrance
    { pos: { x: 480, y: 1350 }, w: 60, h: 16, type: 'sandbags' },
    { pos: { x: 800, y: 1350 }, w: 60, h: 16, type: 'sandbags' },
    // Road signs
    { pos: { x: 650, y: 290 }, w: 12, h: 12, type: 'road_sign' },
    { pos: { x: 680, y: 1280 }, w: 12, h: 12, type: 'road_sign' },
    // Concrete barriers at dock
    { pos: { x: 560, y: 1360 }, w: 50, h: 16, type: 'concrete_barrier' },
    { pos: { x: 780, y: 1360 }, w: 50, h: 16, type: 'concrete_barrier' },
    // Searchlight at dock
    { pos: { x: 670, y: 1390 }, w: 16, h: 16, type: 'searchlight' },
  ];

  // ══════════════════════════════════════
  // ALARM PANELS
  // ══════════════════════════════════════
  const alarmPanels: AlarmPanel[] = [
    { id: 'alarm_intel', pos: { x: 510, y: 390 }, activated: false, hacked: false, hackProgress: 0, hackTime: 3 },
    { id: 'alarm_disable', pos: { x: 400, y: 1310 }, activated: false, hacked: false, hackProgress: 0, hackTime: 4 },
  ];

  // ══════════════════════════════════════
  // EXTRACTION POINTS
  // ══════════════════════════════════════
  const allExfils: ExtractionPoint[] = [
    { pos: { x: 680, y: 1680 }, radius: 80, timer: 5, active: false, name: 'SPEEDBOAT' },
    { pos: { x: 80, y: 800 }, radius: 80, timer: 5, active: false, name: 'FOREST TRAIL WEST' },
    { pos: { x: MAP_W - 80, y: 500 }, radius: 80, timer: 5, active: false, name: 'FOREST TRAIL EAST' },
  ];
  allExfils[Math.floor(Math.random() * allExfils.length)].active = true;
  // Conditional exfil — keycard required for the speedboat shortcut
  const quickExfil: ExtractionPoint = { pos: { x: 700, y: 100 }, radius: 60, timer: 2, active: true, name: 'SMUGGLER BOAT' };
  (quickExfil as any)._requirements = 'keycard';
  allExfils.push(quickExfil);
  const extractionPoints = allExfils;

  // ══════════════════════════════════════
  // LIGHTS
  // ══════════════════════════════════════
  const lights: LightSource[] = [
    ...westCabins.map(c => ({
      pos: { x: c.x + cabinW / 2, y: c.y + cabinH / 2 }, radius: 80, color: '#ffcc66', intensity: 0.5, type: 'window' as const,
    })),
    ...eastCabins.map(c => ({
      pos: { x: c.x + cabinW / 2, y: c.y + cabinH / 2 }, radius: 80, color: '#ffcc66', intensity: 0.5, type: 'window' as const,
    })),
    { pos: { x: 540, y: 390 }, radius: 100, color: '#ffdd88', intensity: 0.6, type: 'ceiling' },
    { pos: { x: 590, y: 1500 }, radius: 120, color: '#eeeedd', intensity: 0.5, type: 'ceiling' },
    { pos: { x: 770, y: 1500 }, radius: 120, color: '#eeeedd', intensity: 0.5, type: 'ceiling' },
    { pos: { x: 680, y: 1650 }, radius: 100, color: '#ddddcc', intensity: 0.4, type: 'ceiling' },
    { pos: { x: 400, y: 1310 }, radius: 100, color: '#ff8844', intensity: 0.4, type: 'fire' },
    { pos: { x: 680, y: 1680 }, radius: 80, color: '#44ff66', intensity: 0.4, type: 'fire' },
    { pos: { x: 80, y: 800 }, radius: 80, color: '#44ff66', intensity: 0.4, type: 'fire' },
    { pos: { x: MAP_W - 80, y: 500 }, radius: 80, color: '#44ff66', intensity: 0.4, type: 'fire' },
  ];

  // ══════════════════════════════════════
  // WINDOWS
  // ══════════════════════════════════════
  const windows: WindowDef[] = [
    ...westCabins.map(c => ({ x: c.x + cabinW - T, y: c.y + 10, w: T, h: 20, direction: 'east' as const })),
    ...eastCabins.map(c => ({ x: c.x, y: c.y + 10, w: T, h: 20, direction: 'west' as const })),
    { x: 460, y: 380, w: T, h: 30, direction: 'west' as const },
  ];

  return { walls, enemies, lootContainers, documentPickups, extractionPoints, alarmPanels, props, lights, windows, terrainZones, mapWidth: MAP_W, mapHeight: MAP_H };
}

export function createFishingVillagePlayer() {
  const weapon = WEAPON_TEMPLATES.makarov();
  const knife = WEAPON_TEMPLATES.knife();
  const grenade = createGrenade();
  return {
    pos: { x: 670, y: 230 },
    hp: 100,
    maxHp: 100,
    speed: 1.69,
    angle: Math.PI / 2, // facing south
    inventory: [weapon, knife, grenade],
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
