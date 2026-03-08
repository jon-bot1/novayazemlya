import { Wall, LootContainer, Enemy, ExtractionPoint, DocumentPickup, Prop, AlarmPanel, LightSource, WindowDef, TerrainZone, Item } from './types';
import { LOOT_POOLS, WEAPON_TEMPLATES, createAmmo, createExtractionCode, createGrenade, createKey, createKeycard, createArmor, createValuable, createTNT, createDogFood } from './items';

// Fishing Village: 1600x2000
// Layout: Forest top, cabins along a road running north-south, dock/pier at bottom, sea at very bottom
const MAP_W = 1600;
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
  const stats: Record<string, any> = {
    scav: { hp: 45, speed: 0.68, damage: 10, alertRange: 160, shootRange: 80, fireRate: 1500 },
    soldier: { hp: 70, speed: 0.85, damage: 18, alertRange: 240, shootRange: 120, fireRate: 1000 },
    heavy: { hp: 160, speed: 0.42, damage: 30, alertRange: 210, shootRange: 110, fireRate: 1700 },
    sniper: { hp: 80, speed: 0.34, damage: 80, alertRange: 500, shootRange: 300, fireRate: 5500 },
    redneck: { hp: 70, speed: 0.60, damage: 18, alertRange: 190, shootRange: 65, fireRate: 1100 },
    dog: { hp: 30, speed: 1.75, damage: 22, alertRange: 240, shootRange: 26, fireRate: 900 },
    boss: { hp: 400, speed: 1.05, damage: 35, alertRange: 350, shootRange: 180, fireRate: 600 },
    turret: { hp: 200, speed: 0, damage: 22, alertRange: 250, shootRange: 130, fireRate: 950 },
    shocker: { hp: 60, speed: 1.05, damage: 40, alertRange: 200, shootRange: 35, fireRate: 700 },
  };
  const s = stats[type] || stats.scav;
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
    awarenessDecay: 0.15,
    elevated: false,
    friendly: false,
    friendlyTimer: 0,
  };
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
    { x: 0, y: 0, w: MAP_W, h: 300, type: 'forest' },
    // Forest sides
    { x: 0, y: 0, w: 250, h: MAP_H, type: 'forest' },
    { x: MAP_W - 250, y: 0, w: 250, h: MAP_H, type: 'forest' },
    // Main road (vertical, center-ish)
    { x: 1300, y: 200, w: 100, h: 1600, type: 'asphalt' },
    // Side road to dock
    { x: 1100, y: 1600, w: 600, h: 80, type: 'asphalt' },
    // Dock area (concrete pier)
    { x: 1100, y: 1700, w: 600, h: 300, type: 'concrete' },
    // Village grass
    { x: 300, y: 300, w: 2200, h: 1400, type: 'grass' },
    // Dirt around cabins
    { x: 500, y: 400, w: 600, h: 800, type: 'dirt' },
    { x: 1600, y: 400, w: 600, h: 800, type: 'dirt' },
    // Beach / sand near water
    { x: 900, y: 1850, w: 1000, h: 150, type: 'dirt' },
  ];

  // ══════════════════════════════════════
  // WALLS — Cabins & dock structures
  // ══════════════════════════════════════
  // Cabin layout: 3 cabins on west side of road, 3 on east side
  // Each cabin ~120x80, weathered wood

  const cabinW = 120;
  const cabinH = 80;

  const makeCabin = (cx: number, cy: number, doorSide: 'east' | 'west'): Wall[] => {
    const walls: Wall[] = [];
    // Top wall
    walls.push(makeWall(cx, cy, cabinW, T, W));
    // Bottom wall
    walls.push(makeWall(cx, cy + cabinH - T, cabinW, T, W));
    if (doorSide === 'east') {
      // Left wall solid
      walls.push(makeWall(cx, cy, T, cabinH, W));
      // Right wall with door gap
      walls.push(makeWall(cx + cabinW - T, cy, T, 25, W));
      walls.push(makeWall(cx + cabinW - T, cy + 55, T, cabinH - 55, W));
    } else {
      // Right wall solid
      walls.push(makeWall(cx + cabinW - T, cy, T, cabinH, W));
      // Left wall with door gap
      walls.push(makeWall(cx, cy, T, 25, W));
      walls.push(makeWall(cx, cy + 55, T, cabinH - 25, W));
    }
    return walls;
  };

  // West cabins (doors face road = east)
  const westCabins = [
    { x: 600, y: 450 },
    { x: 550, y: 650 },
    { x: 620, y: 880 },
  ];
  // East cabins (doors face road = west)
  const eastCabins = [
    { x: 1600, y: 420 },
    { x: 1650, y: 660 },
    { x: 1580, y: 900 },
  ];

  const walls: Wall[] = [
    ...westCabins.flatMap(c => makeCabin(c.x, c.y, 'east')),
    ...eastCabins.flatMap(c => makeCabin(c.x, c.y, 'west')),

    // === DOCK / PIER ===
    // Pier walls (low walls along dock)
    makeWall(1150, 1750, 500, T, STONE), // north edge of pier
    makeWall(1150, 1950, 500, T, STONE), // south edge
    makeWall(1150, 1750, T, 200, STONE), // west edge
    makeWall(1650, 1750, T, 200, STONE), // east edge

    // Warehouse at dock
    makeWall(900, 1650, 150, T, WD),
    makeWall(900, 1750, 150, T, WD),
    makeWall(900, 1650, T, 100, WD),
    makeWall(1040, 1650, T, 40, WD), // door gap east side
    makeWall(1040, 1720, T, 30, WD),

    // Old fishing shack (near dock, west)
    makeWall(700, 1500, 100, T, W),
    makeWall(700, 1570, 100, T, W),
    makeWall(700, 1500, T, 70, W),
    makeWall(790, 1500, T, 25, W),
    makeWall(790, 1545, T, 25, W),

    // General store / bar (north village)
    makeWall(1050, 350, 180, T, WD),
    makeWall(1050, 450, 180, T, WD),
    makeWall(1050, 350, T, 100, WD),
    makeWall(1220, 350, T, 35, WD),
    makeWall(1220, 415, T, 35, WD),
  ];

  // ══════════════════════════════════════
  // ZONES
  // ══════════════════════════════════════
  const ZONE_WEST_VILLAGE = { x: 500, y: 400, w: 600, h: 700 };
  const ZONE_EAST_VILLAGE = { x: 1500, y: 400, w: 600, h: 700 };
  const ZONE_ROAD_NORTH = { x: 1250, y: 300, w: 200, h: 400 };
  const ZONE_ROAD_SOUTH = { x: 1250, y: 800, w: 200, h: 600 };
  const ZONE_DOCK = { x: 1100, y: 1650, w: 600, h: 300 };
  const ZONE_WAREHOUSE = { x: 910, y: 1660, w: 120, h: 80 };
  const ZONE_FOREST_NW = { x: 50, y: 50, w: 400, h: 300 };
  const ZONE_FOREST_NE = { x: MAP_W - 450, y: 50, w: 400, h: 300 };
  const ZONE_FOREST_W = { x: 50, y: 400, w: 300, h: 800 };
  const ZONE_FOREST_E = { x: MAP_W - 350, y: 400, w: 300, h: 800 };
  const ZONE_STORE = { x: 1060, y: 360, w: 150, h: 80 };

  const PLAYER_SPAWN = { x: 1350, y: 250 }; // north road entrance
  const MIN_SPAWN_DIST = 500;

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
  // ENEMIES — village guards & smugglers
  // ══════════════════════════════════════
  const enemies: Enemy[] = [
    // Village scavs
    rz(ZONE_WEST_VILLAGE, 'scav'),
    rz(ZONE_WEST_VILLAGE, 'scav'),
    rz(ZONE_EAST_VILLAGE, 'scav'),
    rz(ZONE_EAST_VILLAGE, 'soldier'),
    // Road patrol
    rz(ZONE_ROAD_SOUTH, 'soldier'),
    // Dock guards
    rz(ZONE_DOCK, 'soldier'),
    rz(ZONE_DOCK, 'heavy'),
    rz(ZONE_WAREHOUSE, 'scav'),
    // Forest snipers/patrols
    rz(ZONE_FOREST_W, 'sniper'),
    rz(ZONE_FOREST_E, 'soldier'),
    rz(ZONE_FOREST_NW, 'scav'),
    // Store
    rz(ZONE_STORE, 'scav'),

    // Redneck with dog
    ...(() => {
      const redneck = rz(ZONE_EAST_VILLAGE, 'redneck');
      const dog = makeEnemy(redneck.pos.x + 20, redneck.pos.y + 15, 'dog');
      dog.ownerId = redneck.id;
      dog.radioGroup = redneck.radioGroup;
      return [redneck, dog];
    })(),

    // Boss — Dock Master (controls the speedboat)
    (() => {
      const boss = makeEnemy(1400, 1800, 'boss');
      boss.loot = [
        WEAPON_TEMPLATES.ak74(),
        createKeycard(),
        createValuable('Boat Keys', 500, '🔑'),
        createExtractionCode(),
      ];
      (boss as any)._patrolWaypoints = [
        { x: 1200, y: 1780 },
        { x: 1550, y: 1780 },
        { x: 1400, y: 1700 },
        { x: 1300, y: 1850 },
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
    // Cabin loot (west)
    ...westCabins.map(c => makeLoot(c.x + 30, c.y + 30, pick(['desk', 'locker'] as const), pick(['common', 'desk'] as const))),
    // Cabin loot (east)
    ...eastCabins.map(c => makeLoot(c.x + 50, c.y + 30, pick(['desk', 'locker'] as const), pick(['common', 'desk', 'locker'] as const))),
    // Warehouse
    rLoot(ZONE_WAREHOUSE, 'crate', 'military'),
    rLoot(ZONE_WAREHOUSE, 'crate', 'military'),
    makeLoot(950, 1700, 'weapon_cabinet', 'weapon_cabinet'),
    // Dock crates
    rLoot(ZONE_DOCK, 'crate', 'valuable'),
    rLoot(ZONE_DOCK, 'barrel', 'common'),
    rLoot(ZONE_DOCK, 'crate', 'military'),
    // Store
    rLoot(ZONE_STORE, 'desk', 'desk'),
    rLoot(ZONE_STORE, 'locker', 'valuable'),
    makeLoot(1100, 400, 'weapon_cabinet', 'weapon_cabinet'),
    // Forest stashes
    rLoot(ZONE_FOREST_W, 'crate', 'common'),
    rLoot(ZONE_FOREST_E, 'crate', 'military'),
    // Road
    rLoot(ZONE_ROAD_SOUTH, 'barrel', 'common'),
    // Extraction code in warehouse
    {
      id: `loot_${containerId++}`,
      pos: randIn(ZONE_WAREHOUSE.x, ZONE_WAREHOUSE.y, ZONE_WAREHOUSE.w, ZONE_WAREHOUSE.h),
      size: 24,
      items: [createExtractionCode()],
      looted: false,
      type: 'archive' as const,
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
    ...Array.from({ length: 12 }, (_, i) => ({
      pos: { x: 1250 + (Math.random() > 0.5 ? -60 : 160) + Math.random() * 30, y: 350 + i * 120 },
      w: 26 + Math.random() * 14, h: 26 + Math.random() * 14,
      type: (Math.random() > 0.4 ? 'pine_tree' : 'tree') as Prop['type'],
    })),
    // Dense forest top
    ...Array.from({ length: 30 }, (_, i) => ({
      pos: { x: 100 + i * 90 + Math.random() * 40, y: 50 + Math.random() * 200 },
      w: 28 + Math.random() * 18, h: 28 + Math.random() * 18,
      type: (Math.random() > 0.3 ? 'pine_tree' : 'tree') as Prop['type'],
    })),
    // West forest
    ...Array.from({ length: 12 }, (_, i) => ({
      pos: { x: 50 + Math.random() * 180, y: 300 + i * 130 + Math.random() * 60 },
      w: 26 + Math.random() * 16, h: 26 + Math.random() * 16,
      type: 'pine_tree' as Prop['type'],
    })),
    // East forest
    ...Array.from({ length: 12 }, (_, i) => ({
      pos: { x: MAP_W - 50 - Math.random() * 180, y: 300 + i * 130 + Math.random() * 60 },
      w: 26 + Math.random() * 16, h: 26 + Math.random() * 16,
      type: 'pine_tree' as Prop['type'],
    })),
    // Bushes around cabins
    ...Array.from({ length: 20 }, () => ({
      pos: { x: 400 + Math.random() * 2000, y: 400 + Math.random() * 800 },
      w: 16 + Math.random() * 12, h: 14 + Math.random() * 10,
      type: 'bush' as Prop['type'],
    })),
    // Dock props
    { pos: { x: 1200, y: 1780 }, w: 28, h: 28, type: 'wood_crate' },
    { pos: { x: 1250, y: 1800 }, w: 24, h: 24, type: 'wood_crate' },
    { pos: { x: 1500, y: 1780 }, w: 22, h: 22, type: 'barrel_stack' },
    { pos: { x: 1550, y: 1810 }, w: 22, h: 22, type: 'barrel_stack' },
    { pos: { x: 1350, y: 1900 }, w: 40, h: 14, type: 'sandbags' },
    // Fishing shack area
    { pos: { x: 730, y: 1520 }, w: 26, h: 26, type: 'wood_crate' },
    { pos: { x: 760, y: 1540 }, w: 22, h: 22, type: 'barrel_stack' },
    // Cabin yard props
    ...westCabins.map(c => ({
      pos: { x: c.x - 30, y: c.y + 20 }, w: 22, h: 22, type: 'barrel_stack' as Prop['type'],
    })),
    ...eastCabins.map(c => ({
      pos: { x: c.x + cabinW + 15, y: c.y + 30 }, w: 26, h: 26, type: 'wood_crate' as Prop['type'],
    })),
    // Vehicle wreck on road
    { pos: { x: 1320, y: 1100 }, w: 55, h: 28, type: 'vehicle_wreck' },
    { pos: { x: 1280, y: 700 }, w: 50, h: 25, type: 'vehicle_wreck' },
    // Sandbags around dock entrance
    { pos: { x: 1150, y: 1630 }, w: 60, h: 16, type: 'sandbags' },
    { pos: { x: 1550, y: 1630 }, w: 60, h: 16, type: 'sandbags' },
    // Road signs
    { pos: { x: 1330, y: 300 }, w: 12, h: 12, type: 'road_sign' },
    { pos: { x: 1370, y: 1550 }, w: 12, h: 12, type: 'road_sign' },
    // Concrete barriers at dock
    { pos: { x: 1250, y: 1700 }, w: 50, h: 16, type: 'concrete_barrier' },
    { pos: { x: 1450, y: 1700 }, w: 50, h: 16, type: 'concrete_barrier' },
    // Searchlight at dock
    { pos: { x: 1400, y: 1750 }, w: 16, h: 16, type: 'searchlight' },
  ];

  // ══════════════════════════════════════
  // ALARM PANELS
  // ══════════════════════════════════════
  const alarmPanels: AlarmPanel[] = [
    { id: 'alarm_intel', pos: { x: 1100, y: 400 }, activated: false, hacked: false, hackProgress: 0, hackTime: 3 },
    { id: 'alarm_disable', pos: { x: 960, y: 1700 }, activated: false, hacked: false, hackProgress: 0, hackTime: 4 },
  ];

  // ══════════════════════════════════════
  // EXTRACTION POINTS
  // ══════════════════════════════════════
  const allExfils: ExtractionPoint[] = [
    { pos: { x: 1400, y: 1920 }, radius: 80, timer: 5, active: false, name: 'SPEEDBOAT' },
    { pos: { x: 100, y: 1000 }, radius: 80, timer: 5, active: false, name: 'FOREST TRAIL WEST' },
    { pos: { x: MAP_W - 100, y: 600 }, radius: 80, timer: 5, active: false, name: 'FOREST TRAIL EAST' },
  ];
  // One random exfil active
  allExfils[Math.floor(Math.random() * allExfils.length)].active = true;
  const extractionPoints = allExfils;

  // ══════════════════════════════════════
  // LIGHTS
  // ══════════════════════════════════════
  const lights: LightSource[] = [
    // Cabin windows
    ...westCabins.map(c => ({
      pos: { x: c.x + cabinW / 2, y: c.y + cabinH / 2 }, radius: 80, color: '#ffcc66', intensity: 0.5, type: 'window' as const,
    })),
    ...eastCabins.map(c => ({
      pos: { x: c.x + cabinW / 2, y: c.y + cabinH / 2 }, radius: 80, color: '#ffcc66', intensity: 0.5, type: 'window' as const,
    })),
    // Store interior
    { pos: { x: 1130, y: 400 }, radius: 100, color: '#ffdd88', intensity: 0.6, type: 'ceiling' },
    // Dock lights
    { pos: { x: 1250, y: 1800 }, radius: 150, color: '#eeeedd', intensity: 0.5, type: 'ceiling' },
    { pos: { x: 1500, y: 1800 }, radius: 150, color: '#eeeedd', intensity: 0.5, type: 'ceiling' },
    { pos: { x: 1400, y: 1750 }, radius: 180, color: '#ddddcc', intensity: 0.4, type: 'ceiling' },
    // Warehouse
    { pos: { x: 970, y: 1700 }, radius: 100, color: '#ff8844', intensity: 0.4, type: 'fire' },
    // Extraction glow
    { pos: { x: 1400, y: 1920 }, radius: 80, color: '#44ff66', intensity: 0.4, type: 'fire' },
    { pos: { x: 100, y: 1000 }, radius: 80, color: '#44ff66', intensity: 0.4, type: 'fire' },
    { pos: { x: MAP_W - 100, y: 600 }, radius: 80, color: '#44ff66', intensity: 0.4, type: 'fire' },
  ];

  // ══════════════════════════════════════
  // WINDOWS
  // ══════════════════════════════════════
  const windows: WindowDef[] = [
    ...westCabins.map(c => ({ x: c.x + cabinW - T, y: c.y + 10, w: T, h: 20, direction: 'east' as const })),
    ...eastCabins.map(c => ({ x: c.x, y: c.y + 10, w: T, h: 20, direction: 'west' as const })),
    { x: 1050, y: 390, w: T, h: 30, direction: 'west' as const },
  ];

  return { walls, enemies, lootContainers, documentPickups, extractionPoints, alarmPanels, props, lights, windows, terrainZones, mapWidth: MAP_W, mapHeight: MAP_H };
}

export function createFishingVillagePlayer() {
  const weapon = WEAPON_TEMPLATES.makarov();
  const knife = WEAPON_TEMPLATES.knife();
  return {
    pos: { x: 1350, y: 250 },
    hp: 100,
    maxHp: 100,
    speed: 1.69,
    angle: Math.PI / 2, // facing south
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
