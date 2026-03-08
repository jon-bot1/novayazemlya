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
    { x: 0, y: 0, w: MAP_W, h: 280, type: 'forest' },
    // Forest sides (narrower)
    { x: 0, y: 0, w: 160, h: 1500, type: 'forest' },
    { x: MAP_W - 160, y: 0, w: 160, h: 1500, type: 'forest' },
    // Main road (vertical, center)
    { x: 700, y: 200, w: 100, h: 1300, type: 'asphalt' },
    // Side road to dock
    { x: 500, y: 1450, w: 500, h: 70, type: 'asphalt' },
    // Dock area (concrete pier)
    { x: 500, y: 1520, w: 500, h: 180, type: 'concrete' },
    // Village grass
    { x: 200, y: 280, w: 1200, h: 1200, type: 'grass' },
    // Dirt around cabins
    { x: 300, y: 380, w: 350, h: 700, type: 'dirt' },
    { x: 850, y: 380, w: 350, h: 700, type: 'dirt' },
    // Beach / sand near water
    { x: 200, y: 1650, w: 1200, h: 100, type: 'dirt' },
    // === WATER / SEA at the bottom ===
    { x: 0, y: 1750, w: MAP_W, h: 250, type: 'water' },
    // Water flanking the dock
    { x: 0, y: 1520, w: 480, h: 480, type: 'water' },
    { x: 1020, y: 1520, w: MAP_W - 1020, h: 480, type: 'water' },
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

  // West cabins (doors face road = east) — close to center road
  const westCabins = [
    { x: 350, y: 420 },
    { x: 320, y: 620 },
    { x: 360, y: 850 },
  ];
  // East cabins (doors face road = west) — close to center road
  const eastCabins = [
    { x: 880, y: 400 },
    { x: 910, y: 630 },
    { x: 870, y: 870 },
  ];

  const walls: Wall[] = [
    ...westCabins.flatMap(c => makeCabin(c.x, c.y, 'east')),
    ...eastCabins.flatMap(c => makeCabin(c.x, c.y, 'west')),

    // === DOCK / PIER === (80px gap in north wall for entry)
    makeWall(520, 1530, 180, T, STONE), // north-left
    makeWall(780, 1530, 200, T, STONE), // north-right (gap 700..780 = 80px)
    makeWall(520, 1690, 460, T, STONE), // south edge
    makeWall(520, 1530, T, 160, STONE), // west edge
    makeWall(980, 1530, T, 160, STONE), // east edge

    // Warehouse at dock (70px door gap on east wall)
    makeWall(380, 1400, 150, T, WD),
    makeWall(380, 1500, 150, T, WD),
    makeWall(380, 1400, T, 100, WD),
    makeWall(520, 1400, T, 15, WD),
    makeWall(520, 1485, T, 15, WD), // gap 1415..1485 = 70px

    // Old fishing shack (70px door gap on east wall)
    makeWall(250, 1280, 100, T, W),
    makeWall(250, 1370, 100, T, W), // taller shack (90px)
    makeWall(250, 1280, T, 90, W),
    makeWall(340, 1280, T, 10, W),
    makeWall(340, 1350, T, 20, W), // gap 1290..1350 = 60px (tight but OK)

    // General store / bar (north village) — 70px door gap on east wall
    makeWall(500, 340, 180, T, WD),
    makeWall(500, 440, 180, T, WD),
    makeWall(500, 340, T, 100, WD),
    makeWall(670, 340, T, 15, WD),
    makeWall(670, 425, T, 15, WD), // gap 355..425 = 70px
  ];

  // ══════════════════════════════════════
  // ZONES
  // ══════════════════════════════════════
  const ZONE_WEST_VILLAGE = { x: 280, y: 380, w: 350, h: 600 };
  const ZONE_EAST_VILLAGE = { x: 830, y: 380, w: 350, h: 600 };
  const ZONE_ROAD_NORTH = { x: 680, y: 300, w: 140, h: 350 };
  const ZONE_ROAD_SOUTH = { x: 680, y: 700, w: 140, h: 500 };
  const ZONE_DOCK = { x: 530, y: 1530, w: 440, h: 150 };
  const ZONE_WAREHOUSE = { x: 390, y: 1410, w: 120, h: 80 };
  const ZONE_FOREST_NW = { x: 30, y: 30, w: 300, h: 250 };
  const ZONE_FOREST_NE = { x: MAP_W - 330, y: 30, w: 300, h: 250 };
  const ZONE_FOREST_W = { x: 30, y: 350, w: 200, h: 700 };
  const ZONE_FOREST_E = { x: MAP_W - 230, y: 350, w: 200, h: 700 };
  const ZONE_STORE = { x: 510, y: 350, w: 150, h: 80 };

  const PLAYER_SPAWN = { x: 750, y: 230 }; // north road entrance
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
    rz(ZONE_WEST_VILLAGE, 'scav'),
    rz(ZONE_EAST_VILLAGE, 'scav'),
    rz(ZONE_EAST_VILLAGE, 'soldier'),
    rz(ZONE_ROAD_SOUTH, 'soldier'),
    rz(ZONE_DOCK, 'soldier'),
    rz(ZONE_DOCK, 'heavy'),
    rz(ZONE_WAREHOUSE, 'scav'),
    rz(ZONE_FOREST_W, 'sniper'),
    rz(ZONE_FOREST_E, 'soldier'),
    rz(ZONE_FOREST_NW, 'scav'),
    rz(ZONE_STORE, 'scav'),

    // Redneck with dog
    ...(() => {
      const redneck = rz(ZONE_EAST_VILLAGE, 'redneck');
      const dog = makeEnemy(redneck.pos.x + 20, redneck.pos.y + 15, 'dog');
      dog.ownerId = redneck.id;
      dog.radioGroup = redneck.radioGroup;
      return [redneck, dog];
    })(),

    // Boss — Dock Master — random spawn in dock/warehouse area
    (() => {
      const bossZones = [ZONE_DOCK, ZONE_WAREHOUSE, ZONE_ROAD_SOUTH];
      const bz = bossZones[Math.floor(Math.random() * bossZones.length)];
      const bp = randIn(bz.x, bz.y, bz.w, bz.h);
      const boss = makeEnemy(bp.x, bp.y, 'boss');
      (boss as any)._bossId = 'dock_master';
      (boss as any)._bossTitle = 'DOCK MASTER';
      boss.loot = [
        WEAPON_TEMPLATES.ak74(),
        createKeycard(),
        createValuable('Boat Keys', 500, '🔑'),
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
    makeLoot(430, 1450, 'weapon_cabinet', 'weapon_cabinet'),
    rLoot(ZONE_DOCK, 'crate', 'valuable'),
    rLoot(ZONE_DOCK, 'barrel', 'common'),
    rLoot(ZONE_DOCK, 'crate', 'military'),
    rLoot(ZONE_STORE, 'desk', 'desk'),
    rLoot(ZONE_STORE, 'locker', 'valuable'),
    makeLoot(550, 390, 'weapon_cabinet', 'weapon_cabinet'),
    rLoot(ZONE_FOREST_W, 'crate', 'common'),
    rLoot(ZONE_FOREST_E, 'crate', 'military'),
    rLoot(ZONE_ROAD_SOUTH, 'barrel', 'common'),
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
      pos: { x: 680 + (Math.random() > 0.5 ? -50 : 120) + Math.random() * 20, y: 320 + i * 110 },
      w: 26 + Math.random() * 14, h: 26 + Math.random() * 14,
      type: (Math.random() > 0.4 ? 'pine_tree' : 'tree') as Prop['type'],
    })),
    // Dense forest top
    ...Array.from({ length: 18 }, (_, i) => ({
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
    // East forest
    ...Array.from({ length: 8 }, (_, i) => ({
      pos: { x: MAP_W - 30 - Math.random() * 120, y: 300 + i * 140 + Math.random() * 50 },
      w: 26 + Math.random() * 16, h: 26 + Math.random() * 16,
      type: 'pine_tree' as Prop['type'],
    })),
    // Bushes around cabins
    ...Array.from({ length: 14 }, () => ({
      pos: { x: 250 + Math.random() * 1000, y: 380 + Math.random() * 600 },
      w: 16 + Math.random() * 12, h: 14 + Math.random() * 10,
      type: 'bush' as Prop['type'],
    })),
    // Dock props
    { pos: { x: 600, y: 1570 }, w: 28, h: 28, type: 'wood_crate' },
    { pos: { x: 650, y: 1590 }, w: 24, h: 24, type: 'wood_crate' },
    { pos: { x: 880, y: 1560 }, w: 22, h: 22, type: 'barrel_stack' },
    { pos: { x: 920, y: 1580 }, w: 22, h: 22, type: 'barrel_stack' },
    { pos: { x: 750, y: 1670 }, w: 40, h: 14, type: 'sandbags' },
    // Fishing shack area
    { pos: { x: 280, y: 1300 }, w: 26, h: 26, type: 'wood_crate' },
    { pos: { x: 310, y: 1320 }, w: 22, h: 22, type: 'barrel_stack' },
    // Cabin yard props
    ...westCabins.map(c => ({
      pos: { x: c.x - 25, y: c.y + 20 }, w: 22, h: 22, type: 'barrel_stack' as Prop['type'],
    })),
    ...eastCabins.map(c => ({
      pos: { x: c.x + cabinW + 12, y: c.y + 30 }, w: 26, h: 26, type: 'wood_crate' as Prop['type'],
    })),
    // Vehicle wreck on road
    { pos: { x: 720, y: 950 }, w: 55, h: 28, type: 'vehicle_wreck' },
    { pos: { x: 700, y: 600 }, w: 50, h: 25, type: 'vehicle_wreck' },
    // Sandbags around dock entrance
    { pos: { x: 540, y: 1440 }, w: 60, h: 16, type: 'sandbags' },
    { pos: { x: 900, y: 1440 }, w: 60, h: 16, type: 'sandbags' },
    // Road signs
    { pos: { x: 730, y: 290 }, w: 12, h: 12, type: 'road_sign' },
    { pos: { x: 760, y: 1380 }, w: 12, h: 12, type: 'road_sign' },
    // Concrete barriers at dock
    { pos: { x: 620, y: 1510 }, w: 50, h: 16, type: 'concrete_barrier' },
    { pos: { x: 850, y: 1510 }, w: 50, h: 16, type: 'concrete_barrier' },
    // Searchlight at dock
    { pos: { x: 750, y: 1540 }, w: 16, h: 16, type: 'searchlight' },
  ];

  // ══════════════════════════════════════
  // ALARM PANELS
  // ══════════════════════════════════════
  const alarmPanels: AlarmPanel[] = [
    { id: 'alarm_intel', pos: { x: 550, y: 390 }, activated: false, hacked: false, hackProgress: 0, hackTime: 3 },
    { id: 'alarm_disable', pos: { x: 440, y: 1450 }, activated: false, hacked: false, hackProgress: 0, hackTime: 4 },
  ];

  // ══════════════════════════════════════
  // EXTRACTION POINTS
  // ══════════════════════════════════════
  const allExfils: ExtractionPoint[] = [
    { pos: { x: 750, y: 1680 }, radius: 80, timer: 5, active: false, name: 'SPEEDBOAT' },
    { pos: { x: 80, y: 800 }, radius: 80, timer: 5, active: false, name: 'FOREST TRAIL WEST' },
    { pos: { x: MAP_W - 80, y: 500 }, radius: 80, timer: 5, active: false, name: 'FOREST TRAIL EAST' },
  ];
  allExfils[Math.floor(Math.random() * allExfils.length)].active = true;
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
    { pos: { x: 580, y: 390 }, radius: 100, color: '#ffdd88', intensity: 0.6, type: 'ceiling' },
    { pos: { x: 650, y: 1580 }, radius: 150, color: '#eeeedd', intensity: 0.5, type: 'ceiling' },
    { pos: { x: 870, y: 1580 }, radius: 150, color: '#eeeedd', intensity: 0.5, type: 'ceiling' },
    { pos: { x: 750, y: 1550 }, radius: 180, color: '#ddddcc', intensity: 0.4, type: 'ceiling' },
    { pos: { x: 440, y: 1450 }, radius: 100, color: '#ff8844', intensity: 0.4, type: 'fire' },
    { pos: { x: 750, y: 1680 }, radius: 80, color: '#44ff66', intensity: 0.4, type: 'fire' },
    { pos: { x: 80, y: 800 }, radius: 80, color: '#44ff66', intensity: 0.4, type: 'fire' },
    { pos: { x: MAP_W - 80, y: 500 }, radius: 80, color: '#44ff66', intensity: 0.4, type: 'fire' },
  ];

  // ══════════════════════════════════════
  // WINDOWS
  // ══════════════════════════════════════
  const windows: WindowDef[] = [
    ...westCabins.map(c => ({ x: c.x + cabinW - T, y: c.y + 10, w: T, h: 20, direction: 'east' as const })),
    ...eastCabins.map(c => ({ x: c.x, y: c.y + 10, w: T, h: 20, direction: 'west' as const })),
    { x: 500, y: 380, w: T, h: 30, direction: 'west' as const },
  ];

  return { walls, enemies, lootContainers, documentPickups, extractionPoints, alarmPanels, props, lights, windows, terrainZones, mapWidth: MAP_W, mapHeight: MAP_H };
}

export function createFishingVillagePlayer() {
  const weapon = WEAPON_TEMPLATES.makarov();
  const knife = WEAPON_TEMPLATES.knife();
  return {
    pos: { x: 750, y: 230 },
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
