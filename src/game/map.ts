import { Wall, LootContainer, Enemy, ExtractionPoint, DocumentPickup, Prop, AlarmPanel, LightSource, WindowDef } from './types';
import { LOOT_POOLS, WEAPON_TEMPLATES, createAmmo, createExtractionCode, createGrenade, createKey } from './items';

// Hangar complex: 1200x900 - tighter for mobile visibility
const MAP_W = 1200;
const MAP_H = 900;

let enemyId = 0;
let containerId = 0;

// Random position within a rectangular zone
function randIn(zx: number, zy: number, zw: number, zh: number, m = 25): { x: number; y: number } {
  return { x: zx + m + Math.random() * Math.max(1, zw - m * 2), y: zy + m + Math.random() * Math.max(1, zh - m * 2) };
}
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const W = '#6a7a68'; // wall color
const WD = '#5a6a58'; // dark wall
const WL = '#7a8a78'; // light wall (interior)

const makeWall = (x: number, y: number, w: number, h: number, color = W): Wall => ({ x, y, w, h, color });

const makeEnemy = (x: number, y: number, type: 'scav' | 'soldier' | 'heavy' | 'turret' | 'boss', fixedAngle?: number): Enemy => {
  const stats = {
    scav: { hp: 40, speed: 1.2, damage: 8, alertRange: 150, shootRange: 130, fireRate: 1200 },
    soldier: { hp: 70, speed: 1.5, damage: 15, alertRange: 200, shootRange: 180, fireRate: 800 },
    heavy: { hp: 120, speed: 0.8, damage: 25, alertRange: 180, shootRange: 160, fireRate: 1500 },
    turret: { hp: 200, speed: 0, damage: 20, alertRange: 250, shootRange: 230, fireRate: 300 },
    boss: { hp: 350, speed: 1.8, damage: 30, alertRange: 280, shootRange: 220, fireRate: 500 },
  }[type];
  const enemy: Enemy = {
    id: `enemy_${enemyId++}`,
    pos: { x, y },
    ...stats,
    maxHp: stats.hp,
    state: 'patrol',
    patrolTarget: { x: x + (Math.random() - 0.5) * 150, y: y + (Math.random() - 0.5) * 150 },
    lastShot: 0,
    angle: fixedAngle ?? Math.random() * Math.PI * 2,
    type,
    eyeBlink: Math.random() * 5,
    loot: [],
    looted: false,
    lastRadioCall: 0,
    radioGroup: Math.floor(x / 300),
    radioAlert: 0,
    tacticalRole: type === 'heavy' ? 'suppressor' : type === 'soldier' ? (Math.random() < 0.5 ? 'flanker' : 'assault') : 'none',
    suppressTimer: 0,
    callForHelpTimer: 0,
    lastTacticalSwitch: 0,
  };
  if (type === 'boss') {
    enemy.bossPhase = 0;
    enemy.bossChargeTimer = 0;
    enemy.bossSpawnTimer = 0;
  }
  return enemy;
};

type LootPoolType = 'common' | 'military' | 'valuable' | 'desk' | 'archive' | 'locker' | 'body';

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

export function generateMap() {
  const T = 12; // wall thickness

  const walls: Wall[] = [
    // === OUTER WALLS (hangar shell) ===
    makeWall(0, 0, MAP_W, T, WD),           // top
    makeWall(0, MAP_H - T, MAP_W, T, WD),   // bottom
    makeWall(0, 0, T, MAP_H, WD),           // left
    makeWall(MAP_W - T, 0, T, MAP_H, WD),   // right

    // === MAIN HANGAR (large open space, left side) ===
    // Hangar south wall with gap (door)
    makeWall(T, 500, 300, T),
    makeWall(380, 500, 120, T),
    // Hangar east wall — gap at y=200-300 for corridor entrance
    makeWall(500, T, T, 188),              // above corridor
    makeWall(500, 312, T, 188),            // below corridor

    // === CORRIDOR (connecting hangar to offices) ===
    // Top corridor wall
    makeWall(500, 200, 200, T),
    // Bottom corridor wall
    makeWall(500, 300, 200, T),
    // Corridor is 500-700 x, 200-300 y (100px wide corridor)

    // === OFFICE BLOCK (right side, top) ===
    // Office block west wall — gap at y=200-300 for corridor exit
    makeWall(700, T, T, 188),              // above corridor
    makeWall(700, 312, T, 88),             // below corridor
    // Office block south wall — gap at x=900-960 for storage access
    makeWall(700, 400, 200, T),            // south wall left
    makeWall(960, 400, MAP_W - 960 - T, T), // south wall right
    
    // Office 1 (top-left office) — gap at y=140-180 for door
    makeWall(700, 180, 130, T, WL),        // divider
    makeWall(830, T, T, 120, WL),          // east wall top
    makeWall(830, 160, T, 32, WL),         // east wall bottom (gap ~140-160)
    
    // Office 2 (top-right office) — gap at x=910-960
    makeWall(960, T, T, 180, WL),          // divider
    makeWall(830, 180, 80, T, WL),         // south wall with gap
    makeWall(960, 180, MAP_W - 960 - T, T, WL),

    // Office 3 (bottom-left office) — gap at y=300-340 for corridor access
    makeWall(830, 340, T, 60, WL),         // divider (starts below gap)

    // Office 4 (bottom-right office) — gap at y=300-340
    makeWall(960, 340, T, 60, WL),         // divider (starts below gap)

    // === STORAGE AREA (right side, bottom) ===
    // West wall — gap at y=400-460 for entry from offices
    makeWall(700, 460, T, MAP_H - 460 - T),
    // Interior shelving
    makeWall(780, 500, 80, T, WL),
    makeWall(780, 600, 80, T, WL),
    makeWall(780, 700, 80, T, WL),
    // East storage room — gap at y=680-750
    makeWall(950, 480, T, 200, WL),
    makeWall(950, 750, T, MAP_H - 750 - T, WL),

    // === HANGAR INTERIOR OBSTACLES ===
    // Crates / vehicle shapes
    makeWall(100, 250, 60, 40, '#8a8a70'),  // vehicle 1
    makeWall(250, 350, 50, 50, '#8a8a70'),  // vehicle 2
    makeWall(150, 600, 80, 30, '#8a8a70'),  // crate stack
    makeWall(350, 650, 40, 60, '#8a8a70'),  // barrel cluster

    // Support pillars in hangar
    makeWall(200, 150, 15, 15, '#9a9a80'),
    makeWall(400, 150, 15, 15, '#9a9a80'),
    makeWall(200, 400, 15, 15, '#9a9a80'),
    makeWall(400, 400, 15, 15, '#9a9a80'),
  ];

  // === ZONES for randomization ===
  const ZONE_HANGAR_A = { x: 20, y: 20, w: 480, h: 480 };
  const ZONE_HANGAR_B = { x: 20, y: 510, w: 480, h: 370 };
  const ZONE_CORRIDOR = { x: 510, y: 210, w: 180, h: 80 };
  const ZONE_OFFICES_TOP = { x: 710, y: 20, w: 470, h: 170 };
  const ZONE_OFFICES_BOT = { x: 710, y: 200, w: 470, h: 190 };
  const ZONE_STORAGE_A = { x: 710, y: 420, w: 230, h: 460 };
  const ZONE_STORAGE_B = { x: 960, y: 420, w: 220, h: 460 };

  // Randomized enemy spawns (types per zone, positions random)
  const rHA1 = randIn(ZONE_HANGAR_A.x, ZONE_HANGAR_A.y, ZONE_HANGAR_A.w, ZONE_HANGAR_A.h);
  const rHA2 = randIn(ZONE_HANGAR_A.x, ZONE_HANGAR_A.y, ZONE_HANGAR_A.w, ZONE_HANGAR_A.h);
  const rHB1 = randIn(ZONE_HANGAR_B.x, ZONE_HANGAR_B.y, ZONE_HANGAR_B.w, ZONE_HANGAR_B.h);
  const rCor = randIn(ZONE_CORRIDOR.x, ZONE_CORRIDOR.y, ZONE_CORRIDOR.w, ZONE_CORRIDOR.h);
  const rOT1 = randIn(ZONE_OFFICES_TOP.x, ZONE_OFFICES_TOP.y, ZONE_OFFICES_TOP.w, ZONE_OFFICES_TOP.h);
  const rOT2 = randIn(ZONE_OFFICES_TOP.x, ZONE_OFFICES_TOP.y, ZONE_OFFICES_TOP.w, ZONE_OFFICES_TOP.h);
  const rOB1 = randIn(ZONE_OFFICES_BOT.x, ZONE_OFFICES_BOT.y, ZONE_OFFICES_BOT.w, ZONE_OFFICES_BOT.h);
  const rOB2 = randIn(ZONE_OFFICES_BOT.x, ZONE_OFFICES_BOT.y, ZONE_OFFICES_BOT.w, ZONE_OFFICES_BOT.h);
  const rSA1 = randIn(ZONE_STORAGE_A.x, ZONE_STORAGE_A.y, ZONE_STORAGE_A.w, ZONE_STORAGE_A.h);
  const rSB1 = randIn(ZONE_STORAGE_B.x, ZONE_STORAGE_B.y, ZONE_STORAGE_B.w, ZONE_STORAGE_B.h);
  const rSB2 = randIn(ZONE_STORAGE_B.x, ZONE_STORAGE_B.y, ZONE_STORAGE_B.w, ZONE_STORAGE_B.h);
  const rBoss = randIn(ZONE_STORAGE_B.x, ZONE_STORAGE_B.y, ZONE_STORAGE_B.w, ZONE_STORAGE_B.h);

  const enemies: Enemy[] = [
    makeEnemy(rHA1.x, rHA1.y, 'scav'),
    makeEnemy(rHA2.x, rHA2.y, 'scav'),
    makeEnemy(rHB1.x, rHB1.y, 'scav'),
    makeEnemy(rCor.x, rCor.y, 'soldier'),
    makeEnemy(rOT1.x, rOT1.y, 'soldier'),
    makeEnemy(rOT2.x, rOT2.y, 'scav'),
    makeEnemy(rOB1.x, rOB1.y, 'soldier'),
    makeEnemy(rOB2.x, rOB2.y, 'soldier'),
    makeEnemy(rSA1.x, rSA1.y, 'soldier'),
    makeEnemy(rSB1.x, rSB1.y, 'heavy'),
    makeEnemy(rSB2.x, rSB2.y, 'heavy'),
    // Turret — guards corridor to storage (fixed position)
    makeEnemy(720, 430, 'turret', Math.PI * 0.5),
    // Boss — deep storage
    makeEnemy(rBoss.x, rBoss.y, 'boss'),
  ];

  // Helper to make loot at random zone position
  const rLoot = (zone: typeof ZONE_HANGAR_A, type: LootContainer['type'], pool: LootPoolType) => {
    const p = randIn(zone.x, zone.y, zone.w, zone.h);
    return makeLoot(p.x, p.y, type, pool);
  };

  // Randomized loot positions
  const lootContainers: LootContainer[] = [
    rLoot(ZONE_HANGAR_A, pick(['crate', 'barrel'] as const), 'common'),
    rLoot(ZONE_HANGAR_A, pick(['crate', 'barrel'] as const), 'common'),
    rLoot(ZONE_HANGAR_B, pick(['crate', 'barrel'] as const), 'common'),
    rLoot(ZONE_HANGAR_B, pick(['crate', 'barrel'] as const), 'common'),
    rLoot(ZONE_OFFICES_TOP, 'desk', 'desk'),
    rLoot(ZONE_OFFICES_TOP, 'locker', 'locker'),
    rLoot(ZONE_OFFICES_TOP, 'desk', 'desk'),
    rLoot(ZONE_OFFICES_BOT, 'desk', 'desk'),
    rLoot(ZONE_OFFICES_BOT, 'archive', 'archive'),
    rLoot(ZONE_OFFICES_BOT, 'locker', 'locker'),
    rLoot(ZONE_OFFICES_BOT, 'cabinet', 'military'),
    rLoot(ZONE_STORAGE_A, 'crate', 'military'),
    rLoot(ZONE_STORAGE_A, 'barrel', 'common'),
    rLoot(ZONE_STORAGE_A, 'locker', 'locker'),
    rLoot(ZONE_STORAGE_B, 'crate', 'military'),
    rLoot(ZONE_STORAGE_B, 'body', 'body'),
    // Extraction code — random spot in deep storage
    {
      id: `loot_${containerId++}`,
      pos: randIn(ZONE_STORAGE_B.x, ZONE_STORAGE_B.y, ZONE_STORAGE_B.w, ZONE_STORAGE_B.h),
      size: 24,
      items: [createExtractionCode()],
      looted: false,
      type: 'archive' as const,
    },
  ];

  // Randomized document pickup positions
  const docZones = [ZONE_HANGAR_A, ZONE_HANGAR_B, ZONE_OFFICES_TOP, ZONE_OFFICES_TOP, ZONE_OFFICES_BOT, ZONE_STORAGE_A, ZONE_STORAGE_B];
  const docIds = ['doc_1', 'doc_2', 'doc_6', 'doc_4', 'doc_3', 'doc_5', 'doc_7'];
  const documentPickups: DocumentPickup[] = docIds.map((id, i) => {
    const z = docZones[i];
    const p = randIn(z.x, z.y, z.w, z.h);
    return makeDocPickup(p.x, p.y, id);
  });

  const props: Prop[] = [
    // Hangar A — wooden crates and barrel stacks
    { pos: { x: 80, y: 180 }, w: 28, h: 28, type: 'wood_crate' },
    { pos: { x: 115, y: 180 }, w: 24, h: 24, type: 'wood_crate' },
    { pos: { x: 95, y: 155 }, w: 20, h: 20, type: 'wood_crate' },
    { pos: { x: 320, y: 200 }, w: 22, h: 22, type: 'barrel_stack' },
    { pos: { x: 440, y: 300 }, w: 26, h: 26, type: 'wood_crate' },

    // Hangar B — sandbags and crates
    { pos: { x: 80, y: 560 }, w: 40, h: 14, type: 'sandbags' },
    { pos: { x: 300, y: 700 }, w: 24, h: 24, type: 'wood_crate' },
    { pos: { x: 330, y: 700 }, w: 24, h: 24, type: 'wood_crate' },
    { pos: { x: 450, y: 600 }, w: 20, h: 20, type: 'barrel_stack' },

    // Corridor — concrete barriers
    { pos: { x: 540, y: 230 }, w: 36, h: 16, type: 'concrete_barrier' },
    { pos: { x: 650, y: 270 }, w: 36, h: 16, type: 'concrete_barrier' },

    // Offices — equipment tables
    { pos: { x: 750, y: 120 }, w: 50, h: 20, type: 'equipment_table' },
    { pos: { x: 1020, y: 120 }, w: 50, h: 20, type: 'equipment_table' },
    { pos: { x: 750, y: 360 }, w: 50, h: 20, type: 'equipment_table' },
    { pos: { x: 1020, y: 360 }, w: 50, h: 20, type: 'equipment_table' },
    { pos: { x: 1100, y: 250 }, w: 30, h: 60, type: 'metal_shelf' },

    // Storage — mixed props
    { pos: { x: 730, y: 530 }, w: 28, h: 28, type: 'wood_crate' },
    { pos: { x: 730, y: 630 }, w: 28, h: 28, type: 'wood_crate' },
    { pos: { x: 900, y: 500 }, w: 40, h: 14, type: 'sandbags' },
    { pos: { x: 980, y: 600 }, w: 30, h: 60, type: 'metal_shelf' },
    { pos: { x: 1000, y: 800 }, w: 50, h: 20, type: 'equipment_table' },
    { pos: { x: 1050, y: 860 }, w: 22, h: 22, type: 'barrel_stack' },
    { pos: { x: 730, y: 780 }, w: 36, h: 16, type: 'concrete_barrier' },
  ];

  const alarmPanels: AlarmPanel[] = [
    { id: 'alarm_corridor', pos: { x: 705, y: 250 }, activated: false, hacked: false, hackProgress: 0, hackTime: 4 },
    { id: 'alarm_office', pos: { x: 965, y: 250 }, activated: false, hacked: false, hackProgress: 0, hackTime: 3 },
  ];

  const extractionPoints: ExtractionPoint[] = [
    { pos: { x: 250, y: MAP_H - 40 }, radius: 50, timer: 5, active: true, name: 'HANGAR SYD' },
    { pos: { x: MAP_W - 40, y: 600 }, radius: 50, timer: 5, active: true, name: 'LAGER ÖST' },
  ];

  // === LIGHT SOURCES (sparse, atmospheric) ===
  const lights: LightSource[] = [
    // Hangar A — single flickering overhead
    { pos: { x: 300, y: 300 }, radius: 180, color: '#ffdd88', intensity: 0.6, type: 'ceiling', flicker: true },
    // Hangar B — dim
    { pos: { x: 300, y: 650 }, radius: 140, color: '#ffcc66', intensity: 0.4, flicker: true, type: 'ceiling' },
    // Corridor — cold light
    { pos: { x: 600, y: 250 }, radius: 100, color: '#ccddff', intensity: 0.5, type: 'ceiling' },
    // Office — desk lamp
    { pos: { x: 770, y: 80 }, radius: 60, color: '#ffcc55', intensity: 0.7, type: 'desk' },
    // Storage — flickering fire
    { pos: { x: 1050, y: 800 }, radius: 80, color: '#ff6633', intensity: 0.35, flicker: true, type: 'fire' },
    // Window shafts
    { pos: { x: 250, y: 15 }, radius: 130, color: '#aaccff', intensity: 0.5, type: 'window' },
    { pos: { x: 15, y: 300 }, radius: 120, color: '#99bbee', intensity: 0.4, type: 'window' },
    // Extraction — green glow
    { pos: { x: 250, y: MAP_H - 40 }, radius: 80, color: '#44ff66', intensity: 0.4, type: 'fire' },
    { pos: { x: MAP_W - 40, y: 600 }, radius: 80, color: '#44ff66', intensity: 0.4, type: 'fire' },
  ];

  // === WINDOWS ===
  const windows: WindowDef[] = [
    // Hangar north wall windows
    { x: 200, y: 0, w: 60, h: 12, direction: 'north' },
    { x: 350, y: 0, w: 60, h: 12, direction: 'north' },
    // Hangar west wall windows
    { x: 0, y: 200, w: 12, h: 50, direction: 'west' },
    { x: 0, y: 450, w: 12, h: 50, direction: 'west' },
    { x: 0, y: 650, w: 12, h: 50, direction: 'west' },
    // Office east wall windows
    { x: MAP_W - 12, y: 80, w: 12, h: 40, direction: 'east' },
    { x: MAP_W - 12, y: 200, w: 12, h: 40, direction: 'east' },
    { x: MAP_W - 12, y: 500, w: 12, h: 40, direction: 'east' },
  ];

  return { walls, enemies, lootContainers, documentPickups, extractionPoints, alarmPanels, props, lights, windows, mapWidth: MAP_W, mapHeight: MAP_H };
}

export function createInitialPlayer() {
  const weapon = WEAPON_TEMPLATES.makarov();
  return {
    pos: { x: 60, y: MAP_H / 2 },  // Start at left side of hangar
    hp: 100,
    maxHp: 100,
    speed: 2.5,
    angle: 0,
    inventory: [weapon, createAmmo('9x18', 24), createGrenade(), createGrenade()],
    equippedWeapon: weapon,
    currentAmmo: 8,
    maxAmmo: 8,
    ammoType: '9x18' as const,
    bleedRate: 0,
    armor: 0,
    lastShot: 0,
    fireRate: 400,
    inCover: false,
    coverObject: null,
    peeking: false,
  };
}
