import { Wall, LootContainer, Enemy, ExtractionPoint, DocumentPickup, Prop, AlarmPanel, LightSource, WindowDef, TerrainZone } from './types';
import { LOOT_POOLS, WEAPON_TEMPLATES, createAmmo, createExtractionCode, createGrenade, createKey, createKeycard } from './items';

// Full outdoor military base: 3200x2400
// The hangar building sits at offset HX, HY within the larger map
const MAP_W = 3200;
const MAP_H = 2400;
const HX = 1000; // hangar offset X
const HY = 750;  // hangar offset Y
const HW = 1200; // hangar width
const HH = 900;  // hangar height

let enemyId = 0;
let containerId = 0;

function randIn(zx: number, zy: number, zw: number, zh: number, m = 25): { x: number; y: number } {
  return { x: zx + m + Math.random() * Math.max(1, zw - m * 2), y: zy + m + Math.random() * Math.max(1, zh - m * 2) };
}
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const W = '#6a7a68';
const WD = '#5a6a58';
const WL = '#7a8a78';
const FENCE = '#8a8a7a';

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
    radioGroup: Math.floor(x / 400),
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
  const FT = 8; // fence thickness

  // ══════════════════════════════════════
  // TERRAIN ZONES
  // ══════════════════════════════════════
  const terrainZones: TerrainZone[] = [
    // Forest edges
    { x: 0, y: 0, w: MAP_W, h: 200, type: 'forest' },
    { x: 0, y: 0, w: 250, h: MAP_H, type: 'forest' },
    { x: MAP_W - 250, y: 0, w: 250, h: MAP_H, type: 'forest' },
    { x: 0, y: MAP_H - 200, w: MAP_W, h: 200, type: 'forest' },
    // Main road (south to hangar)
    { x: 1450, y: MAP_H - 200, w: 120, h: 600, type: 'asphalt' },
    { x: 1450, y: 1650, w: 120, h: 200, type: 'asphalt' },
    // Road to gate area
    { x: 600, y: 1750, w: 850, h: 100, type: 'asphalt' },
    // Inner compound — dirt/gravel
    { x: 350, y: 300, w: 2500, h: 1500, type: 'dirt' },
    // Hangar concrete pad
    { x: HX - 50, y: HY - 50, w: HW + 100, h: HH + 100, type: 'concrete' },
    // Parking area west
    { x: 400, y: 800, w: 400, h: 300, type: 'asphalt' },
    // Guard area south
    { x: 1300, y: 1600, w: 400, h: 200, type: 'concrete' },
  ];

  // ══════════════════════════════════════
  // WALLS
  // ══════════════════════════════════════
  const walls: Wall[] = [
    // === PERIMETER FENCE (outer boundary of base) ===
    // North fence
    makeWall(300, 280, 2600, FT, FENCE),
    // South fence — full with locked gate wall in the gap
    makeWall(300, 1850, 1100, FT, FENCE),
    makeWall(1400, 1850, 220, FT, '#aa4444'),  // GATE WALL — special color for identification
    makeWall(1620, 1850, 1280, FT, FENCE),
    // West fence
    makeWall(300, 280, FT, 1570, FENCE),
    // East fence
    makeWall(2900, 280, FT, 1570, FENCE),

    // === HANGAR BUILDING (offset by HX, HY) ===
    // Outer walls
    makeWall(HX, HY, HW, T, WD),              // top
    makeWall(HX, HY + HH - T, HW, T, WD),     // bottom — gap for entrance at 300-380 relative
    makeWall(HX, HY, T, HH, WD),              // left
    makeWall(HX + HW - T, HY, T, HH, WD),     // right

    // Hangar south wall gaps (entrance doors)
    // Gap at HX+300 to HX+380
    makeWall(HX + T, HY + 500, 300, T),
    makeWall(HX + 380, HY + 500, 120, T),

    // Hangar internal east wall — gap at y=200-300 for corridor
    makeWall(HX + 500, HY + T, T, 188),
    makeWall(HX + 500, HY + 312, T, 188),

    // Corridor walls
    makeWall(HX + 500, HY + 200, 200, T),
    makeWall(HX + 500, HY + 300, 200, T),

    // Office block
    makeWall(HX + 700, HY + T, T, 188),
    makeWall(HX + 700, HY + 312, T, 88),
    makeWall(HX + 700, HY + 400, 200, T),
    makeWall(HX + 960, HY + 400, HW - 960 - T, T),

    // Office dividers
    makeWall(HX + 700, HY + 180, 130, T, WL),
    makeWall(HX + 830, HY + T, T, 120, WL),
    makeWall(HX + 830, HY + 160, T, 32, WL),
    makeWall(HX + 960, HY + T, T, 180, WL),
    makeWall(HX + 830, HY + 180, 80, T, WL),
    makeWall(HX + 960, HY + 180, HW - 960 - T, T, WL),
    makeWall(HX + 830, HY + 340, T, 60, WL),
    makeWall(HX + 960, HY + 340, T, 60, WL),

    // Storage area
    makeWall(HX + 700, HY + 460, T, HH - 460 - T),
    makeWall(HX + 780, HY + 500, 80, T, WL),
    makeWall(HX + 780, HY + 600, 80, T, WL),
    makeWall(HX + 780, HY + 700, 80, T, WL),
    makeWall(HX + 950, HY + 480, T, 200, WL),
    makeWall(HX + 950, HY + 750, T, HH - 750 - T, WL),

    // Hangar interior obstacles
    makeWall(HX + 100, HY + 250, 60, 40, '#8a8a70'),
    makeWall(HX + 250, HY + 350, 50, 50, '#8a8a70'),
    makeWall(HX + 150, HY + 600, 80, 30, '#8a8a70'),
    makeWall(HX + 350, HY + 650, 40, 60, '#8a8a70'),

    // Support pillars
    makeWall(HX + 200, HY + 150, 15, 15, '#9a9a80'),
    makeWall(HX + 400, HY + 150, 15, 15, '#9a9a80'),
    makeWall(HX + 200, HY + 400, 15, 15, '#9a9a80'),
    makeWall(HX + 400, HY + 400, 15, 15, '#9a9a80'),

    // === OUTDOOR BUILDINGS ===
    // Guard booth 1 (south gate, left)
    makeWall(1350, 1700, 50, 80, '#7a7a70'),
    // Guard booth 2 (south gate, right)
    makeWall(1620, 1700, 50, 80, '#7a7a70'),
    // Barracks (west side of compound)
    makeWall(400, 500, 200, 150, '#6a6a60'),
    // Motor pool shelter (west)
    makeWall(450, 900, 180, 100, '#5a5a50'),
    // Ammo bunker (east side)
    makeWall(2500, 600, 150, 100, '#5a6a58'),
    // Command post (north)
    makeWall(1400, 350, 200, 120, '#6a7a68'),
    // Watchtower bases
    makeWall(330, 310, 40, 40, '#7a7a6a'),   // NW tower
    makeWall(2860, 310, 40, 40, '#7a7a6a'),  // NE tower
    makeWall(330, 1810, 40, 40, '#7a7a6a'),  // SW tower
    makeWall(2860, 1810, 40, 40, '#7a7a6a'), // SE tower
  ];

  // ══════════════════════════════════════
  // ZONES & ENEMIES
  // ══════════════════════════════════════
  const ZONE_HANGAR_A = { x: HX + 20, y: HY + 20, w: 480, h: 480 };
  const ZONE_HANGAR_B = { x: HX + 20, y: HY + 510, w: 480, h: 370 };
  const ZONE_CORRIDOR = { x: HX + 510, y: HY + 210, w: 180, h: 80 };
  const ZONE_OFFICES_TOP = { x: HX + 710, y: HY + 20, w: 470, h: 170 };
  const ZONE_OFFICES_BOT = { x: HX + 710, y: HY + 200, w: 470, h: 190 };
  const ZONE_STORAGE_A = { x: HX + 710, y: HY + 420, w: 230, h: 460 };
  const ZONE_STORAGE_B = { x: HX + 960, y: HY + 420, w: 220, h: 460 };
  const ZONE_GATE = { x: 1350, y: 1680, w: 320, h: 160 };
  const ZONE_YARD_W = { x: 400, y: 400, w: 500, h: 500 };
  const ZONE_YARD_E = { x: 2400, y: 400, w: 500, h: 500 };
  const ZONE_YARD_N = { x: 1300, y: 300, w: 400, h: 200 };

  const enemies: Enemy[] = [
    // Hangar interior
    makeEnemy(randIn(ZONE_HANGAR_A.x, ZONE_HANGAR_A.y, ZONE_HANGAR_A.w, ZONE_HANGAR_A.h).x, randIn(ZONE_HANGAR_A.x, ZONE_HANGAR_A.y, ZONE_HANGAR_A.w, ZONE_HANGAR_A.h).y, 'scav'),
    makeEnemy(randIn(ZONE_HANGAR_A.x, ZONE_HANGAR_A.y, ZONE_HANGAR_A.w, ZONE_HANGAR_A.h).x, randIn(ZONE_HANGAR_A.x, ZONE_HANGAR_A.y, ZONE_HANGAR_A.w, ZONE_HANGAR_A.h).y, 'scav'),
    makeEnemy(randIn(ZONE_HANGAR_B.x, ZONE_HANGAR_B.y, ZONE_HANGAR_B.w, ZONE_HANGAR_B.h).x, randIn(ZONE_HANGAR_B.x, ZONE_HANGAR_B.y, ZONE_HANGAR_B.w, ZONE_HANGAR_B.h).y, 'scav'),
    makeEnemy(randIn(ZONE_CORRIDOR.x, ZONE_CORRIDOR.y, ZONE_CORRIDOR.w, ZONE_CORRIDOR.h).x, randIn(ZONE_CORRIDOR.x, ZONE_CORRIDOR.y, ZONE_CORRIDOR.w, ZONE_CORRIDOR.h).y, 'soldier'),
    makeEnemy(randIn(ZONE_OFFICES_TOP.x, ZONE_OFFICES_TOP.y, ZONE_OFFICES_TOP.w, ZONE_OFFICES_TOP.h).x, randIn(ZONE_OFFICES_TOP.x, ZONE_OFFICES_TOP.y, ZONE_OFFICES_TOP.w, ZONE_OFFICES_TOP.h).y, 'soldier'),
    makeEnemy(randIn(ZONE_OFFICES_TOP.x, ZONE_OFFICES_TOP.y, ZONE_OFFICES_TOP.w, ZONE_OFFICES_TOP.h).x, randIn(ZONE_OFFICES_TOP.x, ZONE_OFFICES_TOP.y, ZONE_OFFICES_TOP.w, ZONE_OFFICES_TOP.h).y, 'scav'),
    makeEnemy(randIn(ZONE_OFFICES_BOT.x, ZONE_OFFICES_BOT.y, ZONE_OFFICES_BOT.w, ZONE_OFFICES_BOT.h).x, randIn(ZONE_OFFICES_BOT.x, ZONE_OFFICES_BOT.y, ZONE_OFFICES_BOT.w, ZONE_OFFICES_BOT.h).y, 'soldier'),
    makeEnemy(randIn(ZONE_OFFICES_BOT.x, ZONE_OFFICES_BOT.y, ZONE_OFFICES_BOT.w, ZONE_OFFICES_BOT.h).x, randIn(ZONE_OFFICES_BOT.x, ZONE_OFFICES_BOT.y, ZONE_OFFICES_BOT.w, ZONE_OFFICES_BOT.h).y, 'soldier'),
    makeEnemy(randIn(ZONE_STORAGE_A.x, ZONE_STORAGE_A.y, ZONE_STORAGE_A.w, ZONE_STORAGE_A.h).x, randIn(ZONE_STORAGE_A.x, ZONE_STORAGE_A.y, ZONE_STORAGE_A.w, ZONE_STORAGE_A.h).y, 'soldier'),
    makeEnemy(randIn(ZONE_STORAGE_B.x, ZONE_STORAGE_B.y, ZONE_STORAGE_B.w, ZONE_STORAGE_B.h).x, randIn(ZONE_STORAGE_B.x, ZONE_STORAGE_B.y, ZONE_STORAGE_B.w, ZONE_STORAGE_B.h).y, 'heavy'),
    makeEnemy(randIn(ZONE_STORAGE_B.x, ZONE_STORAGE_B.y, ZONE_STORAGE_B.w, ZONE_STORAGE_B.h).x, randIn(ZONE_STORAGE_B.x, ZONE_STORAGE_B.y, ZONE_STORAGE_B.w, ZONE_STORAGE_B.h).y, 'heavy'),
    // Turret inside hangar
    makeEnemy(HX + 720, HY + 430, 'turret', Math.PI * 0.5),
    // Boss deep storage
    makeEnemy(randIn(ZONE_STORAGE_B.x, ZONE_STORAGE_B.y, ZONE_STORAGE_B.w, ZONE_STORAGE_B.h).x, randIn(ZONE_STORAGE_B.x, ZONE_STORAGE_B.y, ZONE_STORAGE_B.w, ZONE_STORAGE_B.h).y, 'boss'),

    // === OUTDOOR ENEMIES ===
    // Gate guards
    makeEnemy(randIn(ZONE_GATE.x, ZONE_GATE.y, ZONE_GATE.w, ZONE_GATE.h).x, randIn(ZONE_GATE.x, ZONE_GATE.y, ZONE_GATE.w, ZONE_GATE.h).y, 'soldier'),
    makeEnemy(randIn(ZONE_GATE.x, ZONE_GATE.y, ZONE_GATE.w, ZONE_GATE.h).x, randIn(ZONE_GATE.x, ZONE_GATE.y, ZONE_GATE.w, ZONE_GATE.h).y, 'soldier'),
    // West yard patrol
    makeEnemy(randIn(ZONE_YARD_W.x, ZONE_YARD_W.y, ZONE_YARD_W.w, ZONE_YARD_W.h).x, randIn(ZONE_YARD_W.x, ZONE_YARD_W.y, ZONE_YARD_W.w, ZONE_YARD_W.h).y, 'scav'),
    makeEnemy(randIn(ZONE_YARD_W.x, ZONE_YARD_W.y, ZONE_YARD_W.w, ZONE_YARD_W.h).x, randIn(ZONE_YARD_W.x, ZONE_YARD_W.y, ZONE_YARD_W.w, ZONE_YARD_W.h).y, 'soldier'),
    // East yard patrol
    makeEnemy(randIn(ZONE_YARD_E.x, ZONE_YARD_E.y, ZONE_YARD_E.w, ZONE_YARD_E.h).x, randIn(ZONE_YARD_E.x, ZONE_YARD_E.y, ZONE_YARD_E.w, ZONE_YARD_E.h).y, 'soldier'),
    makeEnemy(randIn(ZONE_YARD_E.x, ZONE_YARD_E.y, ZONE_YARD_E.w, ZONE_YARD_E.h).x, randIn(ZONE_YARD_E.x, ZONE_YARD_E.y, ZONE_YARD_E.w, ZONE_YARD_E.h).y, 'heavy'),
    // North command area
    makeEnemy(randIn(ZONE_YARD_N.x, ZONE_YARD_N.y, ZONE_YARD_N.w, ZONE_YARD_N.h).x, randIn(ZONE_YARD_N.x, ZONE_YARD_N.y, ZONE_YARD_N.w, ZONE_YARD_N.h).y, 'soldier'),
    // Watchtower turrets
    makeEnemy(350, 330, 'turret', Math.PI * 0.75),  // NW
    makeEnemy(2880, 330, 'turret', Math.PI * 0.5),  // NE

    // === OUTSIDE PATROL GUARDS (south of fence) ===
    // Pair 1 — patrolling near gate approach
    makeEnemy(1400, 2000, 'soldier'),
    makeEnemy(1550, 2010, 'soldier'),
    // Pair 2 — patrolling wider perimeter
    makeEnemy(1200, 2100, 'soldier'),
    makeEnemy(1100, 2050, 'scav'),
    // Lone guard with keycard — patrols near road (ALWAYS has keycard)
    makeEnemy(1500, 2150, 'soldier'),
  ];

  // Give keycard to ALL outside patrol guards to guarantee it drops
  for (let i = enemies.length - 5; i < enemies.length; i++) {
    if (i === enemies.length - 1) {
      // Main keycard carrier — always has it
      enemies[i].loot = [createKeycard()];
    }
  }
  // Also give a second keycard to one of the pairs as backup
  enemies[enemies.length - 3].loot = [createKeycard()];

  // ══════════════════════════════════════
  // LOOT
  // ══════════════════════════════════════
  const rLoot = (zone: { x: number; y: number; w: number; h: number }, type: LootContainer['type'], pool: LootPoolType) => {
    const p = randIn(zone.x, zone.y, zone.w, zone.h);
    return makeLoot(p.x, p.y, type, pool);
  };

  const lootContainers: LootContainer[] = [
    // Hangar interior
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
    // Extraction code
    {
      id: `loot_${containerId++}`,
      pos: randIn(ZONE_STORAGE_B.x, ZONE_STORAGE_B.y, ZONE_STORAGE_B.w, ZONE_STORAGE_B.h),
      size: 24,
      items: [createExtractionCode()],
      looted: false,
      type: 'archive' as const,
    },
    // Outdoor loot
    rLoot(ZONE_GATE, 'crate', 'common'),
    rLoot(ZONE_YARD_W, 'crate', 'military'),
    rLoot(ZONE_YARD_W, 'barrel', 'common'),
    rLoot(ZONE_YARD_E, 'crate', 'military'),
    rLoot(ZONE_YARD_E, 'locker', 'valuable'),
    rLoot(ZONE_YARD_N, 'desk', 'desk'),
    rLoot({ x: 450, y: 920, w: 140, h: 60 }, 'crate', 'military'), // motor pool
    rLoot({ x: 2520, y: 620, w: 110, h: 60 }, 'crate', 'military'), // ammo bunker
  ];

  // ══════════════════════════════════════
  // DOCUMENTS
  // ══════════════════════════════════════
  const docZones = [ZONE_HANGAR_A, ZONE_HANGAR_B, ZONE_OFFICES_TOP, ZONE_OFFICES_TOP, ZONE_OFFICES_BOT, ZONE_STORAGE_A, ZONE_STORAGE_B];
  const docIds = ['doc_1', 'doc_2', 'doc_6', 'doc_4', 'doc_3', 'doc_5', 'doc_7'];
  const documentPickups: DocumentPickup[] = docIds.map((id, i) => {
    const z = docZones[i];
    const p = randIn(z.x, z.y, z.w, z.h);
    return makeDocPickup(p.x, p.y, id);
  });

  // ══════════════════════════════════════
  // PROPS
  // ══════════════════════════════════════
  const props: Prop[] = [
    // Hangar interior props (offset by HX, HY)
    { pos: { x: HX + 80, y: HY + 180 }, w: 28, h: 28, type: 'wood_crate' },
    { pos: { x: HX + 115, y: HY + 180 }, w: 24, h: 24, type: 'wood_crate' },
    { pos: { x: HX + 95, y: HY + 155 }, w: 20, h: 20, type: 'wood_crate' },
    { pos: { x: HX + 320, y: HY + 200 }, w: 22, h: 22, type: 'barrel_stack' },
    { pos: { x: HX + 440, y: HY + 300 }, w: 26, h: 26, type: 'wood_crate' },
    { pos: { x: HX + 80, y: HY + 560 }, w: 40, h: 14, type: 'sandbags' },
    { pos: { x: HX + 300, y: HY + 700 }, w: 24, h: 24, type: 'wood_crate' },
    { pos: { x: HX + 330, y: HY + 700 }, w: 24, h: 24, type: 'wood_crate' },
    { pos: { x: HX + 450, y: HY + 600 }, w: 20, h: 20, type: 'barrel_stack' },
    { pos: { x: HX + 540, y: HY + 230 }, w: 36, h: 16, type: 'concrete_barrier' },
    { pos: { x: HX + 650, y: HY + 270 }, w: 36, h: 16, type: 'concrete_barrier' },
    { pos: { x: HX + 750, y: HY + 120 }, w: 50, h: 20, type: 'equipment_table' },
    { pos: { x: HX + 1020, y: HY + 120 }, w: 50, h: 20, type: 'equipment_table' },
    { pos: { x: HX + 750, y: HY + 360 }, w: 50, h: 20, type: 'equipment_table' },
    { pos: { x: HX + 1020, y: HY + 360 }, w: 50, h: 20, type: 'equipment_table' },
    { pos: { x: HX + 1100, y: HY + 250 }, w: 30, h: 60, type: 'metal_shelf' },
    { pos: { x: HX + 730, y: HY + 530 }, w: 28, h: 28, type: 'wood_crate' },
    { pos: { x: HX + 730, y: HY + 630 }, w: 28, h: 28, type: 'wood_crate' },
    { pos: { x: HX + 900, y: HY + 500 }, w: 40, h: 14, type: 'sandbags' },
    { pos: { x: HX + 980, y: HY + 600 }, w: 30, h: 60, type: 'metal_shelf' },
    { pos: { x: HX + 1000, y: HY + 800 }, w: 50, h: 20, type: 'equipment_table' },
    { pos: { x: HX + 1050, y: HY + 860 }, w: 22, h: 22, type: 'barrel_stack' },
    { pos: { x: HX + 730, y: HY + 780 }, w: 36, h: 16, type: 'concrete_barrier' },

    // === OUTDOOR PROPS ===
    // Watchtowers (drawn as tall structures)
    { pos: { x: 350, y: 330 }, w: 36, h: 36, type: 'watchtower' },
    { pos: { x: 2880, y: 330 }, w: 36, h: 36, type: 'watchtower' },
    { pos: { x: 350, y: 1830 }, w: 36, h: 36, type: 'watchtower' },
    { pos: { x: 2880, y: 1830 }, w: 36, h: 36, type: 'watchtower' },

    // Guard booths at gate
    { pos: { x: 1375, y: 1740 }, w: 40, h: 60, type: 'guard_booth' },
    { pos: { x: 1645, y: 1740 }, w: 40, h: 60, type: 'guard_booth' },

    // Gate
    { pos: { x: 1500, y: 1855 }, w: 120, h: 12, type: 'gate' },

    // Road signs
    { pos: { x: 1480, y: 1900 }, w: 12, h: 12, type: 'road_sign' },
    { pos: { x: 1580, y: 1900 }, w: 12, h: 12, type: 'road_sign' },

    // Vehicle wrecks in yard
    { pos: { x: 500, y: 850 }, w: 60, h: 30, type: 'vehicle_wreck' },
    { pos: { x: 550, y: 950 }, w: 50, h: 25, type: 'vehicle_wreck' },
    { pos: { x: 700, y: 600 }, w: 55, h: 28, type: 'vehicle_wreck' },

    // Searchlights
    { pos: { x: 1200, y: 1700 }, w: 16, h: 16, type: 'searchlight' },
    { pos: { x: 1800, y: 1700 }, w: 16, h: 16, type: 'searchlight' },

    // Concrete barriers around compound
    { pos: { x: 900, y: 700 }, w: 50, h: 16, type: 'concrete_barrier' },
    { pos: { x: 2400, y: 800 }, w: 50, h: 16, type: 'concrete_barrier' },
    { pos: { x: 1500, y: 550 }, w: 50, h: 16, type: 'concrete_barrier' },

    // Sandbag positions
    { pos: { x: 1400, y: 1700 }, w: 60, h: 16, type: 'sandbags' },
    { pos: { x: 1600, y: 1700 }, w: 60, h: 16, type: 'sandbags' },

    // Barrel stacks around compound
    { pos: { x: 650, y: 500 }, w: 22, h: 22, type: 'barrel_stack' },
    { pos: { x: 2600, y: 700 }, w: 22, h: 22, type: 'barrel_stack' },

    // === FOREST TREES ===
    // North treeline
    ...Array.from({ length: 25 }, (_, i) => ({
      pos: { x: 300 + i * 110 + Math.random() * 60, y: 80 + Math.random() * 120 },
      w: 30 + Math.random() * 20, h: 30 + Math.random() * 20,
      type: (Math.random() > 0.3 ? 'pine_tree' : 'tree') as Prop['type'],
    })),
    // West treeline
    ...Array.from({ length: 15 }, (_, i) => ({
      pos: { x: 60 + Math.random() * 150, y: 200 + i * 120 + Math.random() * 60 },
      w: 28 + Math.random() * 18, h: 28 + Math.random() * 18,
      type: (Math.random() > 0.3 ? 'pine_tree' : 'tree') as Prop['type'],
    })),
    // East treeline
    ...Array.from({ length: 15 }, (_, i) => ({
      pos: { x: MAP_W - 60 - Math.random() * 150, y: 200 + i * 120 + Math.random() * 60 },
      w: 28 + Math.random() * 18, h: 28 + Math.random() * 18,
      type: (Math.random() > 0.3 ? 'pine_tree' : 'tree') as Prop['type'],
    })),
    // South treeline
    ...Array.from({ length: 20 }, (_, i) => ({
      pos: { x: 300 + i * 140 + Math.random() * 80, y: MAP_H - 80 - Math.random() * 100 },
      w: 28 + Math.random() * 18, h: 28 + Math.random() * 18,
      type: (Math.random() > 0.3 ? 'pine_tree' : 'tree') as Prop['type'],
    })),
    // Scattered bushes near fences
    ...Array.from({ length: 20 }, () => ({
      pos: { x: 320 + Math.random() * 2560, y: 300 + Math.random() * 1500 },
      w: 16 + Math.random() * 12, h: 14 + Math.random() * 10,
      type: 'bush' as Prop['type'],
    })),
  ];

  // ══════════════════════════════════════
  // ALARM PANELS
  // ══════════════════════════════════════
  const alarmPanels: AlarmPanel[] = [
    { id: 'alarm_corridor', pos: { x: HX + 705, y: HY + 250 }, activated: false, hacked: false, hackProgress: 0, hackTime: 4 },
    { id: 'alarm_office', pos: { x: HX + 965, y: HY + 250 }, activated: false, hacked: false, hackProgress: 0, hackTime: 3 },
    { id: 'alarm_gate', pos: { x: 1510, y: 1750 }, activated: false, hacked: false, hackProgress: 0, hackTime: 5 },
  ];

  // ══════════════════════════════════════
  // EXTRACTION POINTS (outdoor)
  // ══════════════════════════════════════
  const extractionPoints: ExtractionPoint[] = [
    { pos: { x: 500, y: MAP_H - 100 }, radius: 50, timer: 5, active: true, name: 'SKOGSVÄG SYD' },
    { pos: { x: MAP_W - 100, y: 1000 }, radius: 50, timer: 5, active: true, name: 'SKOGSVÄG ÖST' },
  ];

  // ══════════════════════════════════════
  // LIGHTS
  // ══════════════════════════════════════
  const lights: LightSource[] = [
    // Hangar interior
    { pos: { x: HX + 300, y: HY + 300 }, radius: 180, color: '#ffdd88', intensity: 0.6, type: 'ceiling' },
    { pos: { x: HX + 300, y: HY + 650 }, radius: 140, color: '#ffcc66', intensity: 0.4, type: 'ceiling' },
    { pos: { x: HX + 600, y: HY + 250 }, radius: 100, color: '#ccddff', intensity: 0.5, type: 'ceiling' },
    { pos: { x: HX + 770, y: HY + 80 }, radius: 60, color: '#ffcc55', intensity: 0.7, type: 'desk' },
    { pos: { x: HX + 1050, y: HY + 800 }, radius: 80, color: '#ff6633', intensity: 0.35, type: 'fire' },
    // Hangar windows
    { pos: { x: HX + 250, y: HY + 15 }, radius: 130, color: '#aaccff', intensity: 0.5, type: 'window' },
    { pos: { x: HX + 15, y: HY + 300 }, radius: 120, color: '#99bbee', intensity: 0.4, type: 'window' },

    // Outdoor lights — searchlights and tower lights
    { pos: { x: 1200, y: 1700 }, radius: 200, color: '#eeeedd', intensity: 0.5, type: 'ceiling' },
    { pos: { x: 1800, y: 1700 }, radius: 200, color: '#eeeedd', intensity: 0.5, type: 'ceiling' },
    // Watchtower lights
    { pos: { x: 350, y: 330 }, radius: 180, color: '#ddddcc', intensity: 0.4, type: 'ceiling' },
    { pos: { x: 2880, y: 330 }, radius: 180, color: '#ddddcc', intensity: 0.4, type: 'ceiling' },
    // Gate area
    { pos: { x: 1510, y: 1760 }, radius: 150, color: '#ffcc88', intensity: 0.5, type: 'ceiling' },
    // Barracks
    { pos: { x: 500, y: 575 }, radius: 100, color: '#ffcc66', intensity: 0.4, type: 'window' },
    // Command post
    { pos: { x: 1500, y: 410 }, radius: 120, color: '#ccddff', intensity: 0.5, type: 'window' },
    // Ammo bunker
    { pos: { x: 2575, y: 650 }, radius: 80, color: '#ff8844', intensity: 0.3, type: 'fire' },

    // Extraction — green glow
    { pos: { x: 500, y: MAP_H - 100 }, radius: 80, color: '#44ff66', intensity: 0.4, type: 'fire' },
    { pos: { x: MAP_W - 100, y: 1000 }, radius: 80, color: '#44ff66', intensity: 0.4, type: 'fire' },
  ];

  // ══════════════════════════════════════
  // WINDOWS
  // ══════════════════════════════════════
  const windows: WindowDef[] = [
    // Hangar windows
    { x: HX + 200, y: HY, w: 60, h: 12, direction: 'north' },
    { x: HX + 350, y: HY, w: 60, h: 12, direction: 'north' },
    { x: HX, y: HY + 200, w: 12, h: 50, direction: 'west' },
    { x: HX, y: HY + 450, w: 12, h: 50, direction: 'west' },
    { x: HX, y: HY + 650, w: 12, h: 50, direction: 'west' },
    { x: HX + HW - 12, y: HY + 80, w: 12, h: 40, direction: 'east' },
    { x: HX + HW - 12, y: HY + 200, w: 12, h: 40, direction: 'east' },
    { x: HX + HW - 12, y: HY + 500, w: 12, h: 40, direction: 'east' },
    // Barracks windows
    { x: 400, y: 570, w: 12, h: 30, direction: 'west' },
    { x: 600, y: 570, w: 12, h: 30, direction: 'east' },
    // Command post windows
    { x: 1400, y: 410, w: 40, h: 12, direction: 'south' },
    { x: 1540, y: 410, w: 40, h: 12, direction: 'south' },
  ];

  return { walls, enemies, lootContainers, documentPickups, extractionPoints, alarmPanels, props, lights, windows, terrainZones, mapWidth: MAP_W, mapHeight: MAP_H };
}

export function createInitialPlayer() {
  const weapon = WEAPON_TEMPLATES.makarov();
  return {
    pos: { x: 1510, y: MAP_H - 150 },  // Start at south gate
    hp: 100,
    maxHp: 100,
    speed: 2.5,
    angle: -Math.PI / 2, // Facing north
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
