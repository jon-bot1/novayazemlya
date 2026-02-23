import { Wall, LootContainer, Enemy, ExtractionPoint, DocumentPickup, Prop, AlarmPanel, LightSource, WindowDef, TerrainZone } from './types';
import { LOOT_POOLS, WEAPON_TEMPLATES, createAmmo, createExtractionCode, createGrenade, createKey, createKeycard, createArmor, createValuable } from './items';

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

const makeEnemy = (x: number, y: number, type: Enemy['type'], fixedAngle?: number): Enemy => {
  const stats = {
    scav: { hp: 32, speed: 1.2, damage: 8, alertRange: 120, shootRange: 100, fireRate: 1200 },
    soldier: { hp: 56, speed: 1.5, damage: 15, alertRange: 184, shootRange: 161, fireRate: 800 },
    heavy: { hp: 120, speed: 0.8, damage: 25, alertRange: 150, shootRange: 130, fireRate: 1500 },
    turret: { hp: 200, speed: 0, damage: 20, alertRange: 180, shootRange: 160, fireRate: 800 },
    boss: { hp: 350, speed: 1.8, damage: 30, alertRange: 280, shootRange: 220, fireRate: 500 },
    sniper: { hp: 40, speed: 0.6, damage: 45, alertRange: 400, shootRange: 350, fireRate: 3000 },
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
    tacticalRole: type === 'heavy' ? 'suppressor' : type === 'sniper' ? 'none' : type === 'soldier' ? (Math.random() < 0.5 ? 'flanker' : 'assault') : 'none',
    suppressTimer: 0,
    callForHelpTimer: 0,
    lastTacticalSwitch: 0,
    stunTimer: 0,
    elevated: false,
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
    // Outer walls with door gaps
    // Top wall — door gap at HX+500 to HX+560
    makeWall(HX, HY, 500, T, WD),
    makeWall(HX + 560, HY, HW - 560, T, WD),
    // Bottom wall — door gap at HX+300 to HX+380
    makeWall(HX, HY + HH - T, 300, T, WD),
    makeWall(HX + 380, HY + HH - T, HW - 380, T, WD),
    // Left wall — door gap at HY+400 to HY+470
    makeWall(HX, HY, T, 400, WD),
    makeWall(HX, HY + 470, T, HH - 470, WD),
    // Right wall — solid
    makeWall(HX + HW - T, HY, T, HH, WD),

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
    // Guard booth 1 (south gate, left) — proper room with door gap on east side
    makeWall(1350, 1700, 50, FT, '#7a7a70'),  // north
    makeWall(1350, 1772, 50, FT, '#7a7a70'),  // south
    makeWall(1350, 1700, FT, 80, '#7a7a70'),  // west
    makeWall(1392, 1700, FT, 30, '#7a7a70'),  // east top (gap 1730-1760 = door)
    makeWall(1392, 1760, FT, 20, '#7a7a70'),  // east bottom
    // Guard booth 2 (south gate, right) — proper room with door gap on west side
    makeWall(1620, 1700, 50, FT, '#7a7a70'),  // north
    makeWall(1620, 1772, 50, FT, '#7a7a70'),  // south
    makeWall(1662, 1700, FT, 80, '#7a7a70'),  // east
    makeWall(1620, 1700, FT, 30, '#7a7a70'),  // west top (gap 1730-1760 = door)
    makeWall(1620, 1760, FT, 20, '#7a7a70'),  // west bottom
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
     // Boss — Commandant Osipovitj — random spawn inside base
     (() => {
       const bossZones = [ZONE_HANGAR_A, ZONE_HANGAR_B, ZONE_STORAGE_A, ZONE_STORAGE_B, ZONE_OFFICES_BOT];
       const bz = bossZones[Math.floor(Math.random() * bossZones.length)];
       const bp = randIn(bz.x, bz.y, bz.w, bz.h);
       return makeEnemy(bp.x, bp.y, 'boss');
     })(),

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
    // Watchtower turrets (elevated)
    makeEnemy(350, 330, 'turret', Math.PI * 0.75),  // NW
    makeEnemy(2880, 330, 'turret', Math.PI * 0.5),  // NE

    // === WALL GUARDS on elevated platforms (can shoot over fence) ===
    makeEnemy(800, 290, 'soldier', Math.PI * 0.5),   // North fence west
    makeEnemy(1600, 290, 'soldier', Math.PI * 0.5),  // North fence center
    makeEnemy(2400, 290, 'soldier', Math.PI * 0.5),  // North fence east
    makeEnemy(310, 800, 'soldier', Math.PI),          // West fence
    makeEnemy(310, 1400, 'soldier', Math.PI),         // West fence south
    makeEnemy(2910, 800, 'soldier', 0),               // East fence
    makeEnemy(2910, 1400, 'soldier', 0),              // East fence south
    makeEnemy(1000, 1860, 'soldier', -Math.PI * 0.5), // South fence west
    makeEnemy(2000, 1860, 'soldier', -Math.PI * 0.5), // South fence east

    // === OUTSIDE PATROL GUARDS (south of fence, widely spread, away from player spawn ~1510,2250) ===
    // Pair 1 — far west, near forest edge
    makeEnemy(500, 2000, 'soldier'),
    makeEnemy(650, 2100, 'soldier'),
    // Pair 2 — far east
    makeEnemy(2400, 2000, 'soldier'),
    makeEnemy(2550, 2100, 'scav'),
    // Lone guard — patrols far south-west (NOT near spawn)
    makeEnemy(900, 2300, 'soldier'),

    // === SNIPERS — camouflaged, outside the base ===
    makeEnemy(200 + Math.random() * 300, 1950 + Math.random() * 200, 'sniper'),
    makeEnemy(2700 + Math.random() * 300, 1950 + Math.random() * 200, 'sniper'),
    makeEnemy(1200 + Math.random() * 800, 2200 + Math.random() * 150, 'sniper'),
  ];

  // Save base enemy count before adding officers (index math depends on this)
  const baseEnemyCount = enemies.length;

  // === INDOOR OFFICERS — spawn 2-3 inside the base with good loot ===
  const officerZones = [ZONE_HANGAR_A, ZONE_OFFICES_TOP, ZONE_OFFICES_BOT, ZONE_STORAGE_A, ZONE_CORRIDOR];
  const numOfficers = 2 + Math.floor(Math.random() * 2); // 2-3
  for (let i = 0; i < numOfficers; i++) {
    const zone = officerZones[Math.floor(Math.random() * officerZones.length)];
    const p = randIn(zone.x, zone.y, zone.w, zone.h);
    const officer = makeEnemy(p.x, p.y, 'soldier');
    (officer as any)._isOfficer = true;
    officer.alertRange = Math.round(officer.alertRange * 1.4);
    officer.shootRange = Math.round(officer.shootRange * 1.4);
    officer.hp = 70;
    officer.damage = 50; // Mosin hits hard
    officer.fireRate = 2000; // bolt action — slow fire rate
    // Good loot: Mosin, grenades, valuables
    officer.loot = [
      WEAPON_TEMPLATES.mosin(),
      createGrenade(),
      ...(Math.random() < 0.5 ? [createArmor()] : []),
      createValuable('Dogtags', 200, '🏷️'),
    ];
    enemies.push(officer);
  }

  // Mark watchtower turrets as elevated (use baseEnemyCount for stable indexing)
  enemies[baseEnemyCount - 5 - 9 - 2].elevated = true; // NW turret
  enemies[baseEnemyCount - 5 - 9 - 1].elevated = true; // NE turret

  // Mark wall guards as elevated (9 guards before the 5 outside patrol guards in the base array)
  for (let i = baseEnemyCount - 5 - 9; i < baseEnemyCount - 5; i++) {
    enemies[i].elevated = true;
    enemies[i].state = 'idle'; // wall guards don't patrol, they stand on platforms
    enemies[i].alertRange = 180; // limited range from elevation
    enemies[i].shootRange = 150;
  }

  // Boost outside patrol guards' vision depth by 25%
  for (let i = baseEnemyCount - 5; i < baseEnemyCount; i++) {
    enemies[i].alertRange = Math.round(enemies[i].alertRange * 1.25);
    enemies[i].shootRange = Math.round(enemies[i].shootRange * 1.25);
  }

  // === BOSS SETUP: patrol waypoints + 2 bodyguards ===
  const bossIdx = enemies.findIndex(e => e.type === 'boss');
  if (bossIdx >= 0) {
    const boss = enemies[bossIdx];
    // Boss patrols the entire base with wide waypoints
    (boss as any)._patrolWaypoints = [
      { x: HX + 200, y: HY + 200 },          // hangar NW
      { x: HX + HW - 200, y: HY + 200 },     // hangar NE
      { x: HX + HW - 200, y: HY + HH - 200 },// hangar SE
      { x: HX + 200, y: HY + HH - 200 },     // hangar SW
      { x: 800, y: 600 },                      // west yard
      { x: 2400, y: 600 },                     // east yard
      { x: 1600, y: 400 },                     // north command
      { x: 1600, y: HY + HH + 200 },          // south of hangar
    ];
    (boss as any)._waypointIdx = 0;
    boss.patrolTarget = (boss as any)._patrolWaypoints[0];
    boss.state = 'patrol';
    boss.speed = 1.2; // slower patrol speed, fast when chasing

    // 2 bodyguards — ZAPAD and VOSTOK
    const bg1 = makeEnemy(boss.pos.x - 30, boss.pos.y + 20, 'soldier');
    const bg2 = makeEnemy(boss.pos.x + 30, boss.pos.y + 20, 'soldier');
    (bg1 as any)._bodyguardName = 'ZAPAD';
    (bg2 as any)._bodyguardName = 'VOSTOK';
    for (const bg of [bg1, bg2]) {
      (bg as any)._bodyguardOf = boss.id;
      bg.hp = 100;
      bg.maxHp = 100;
      bg.damage = 20;
      bg.alertRange = 320;
      bg.shootRange = 280;
      bg.fireRate = 700;
      bg.radioGroup = boss.radioGroup;
      bg.tacticalRole = 'assault';
      bg.type = 'soldier';
      (bg as any)._isBodyguard = true;
    }
    enemies.push(bg1, bg2);
  }

  // Spread patrol ranges wider for outside guards so they don't clump
  // Outside guards are at indices baseEnemyCount-5 to baseEnemyCount-1
  for (let i = baseEnemyCount - 5; i < baseEnemyCount; i++) {
    enemies[i].patrolTarget = {
      x: enemies[i].pos.x + (Math.random() - 0.5) * 400,
      y: enemies[i].pos.y + (Math.random() - 0.5) * 300,
    };
  }

  // Randomize keycard: 1-2 outside patrol guards carry one
  const outsideIndices: number[] = [];
  for (let i = baseEnemyCount - 5; i < baseEnemyCount; i++) outsideIndices.push(i);
  // Shuffle and pick 1-2
  for (let i = outsideIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [outsideIndices[i], outsideIndices[j]] = [outsideIndices[j], outsideIndices[i]];
  }
  const keycardCount = 1 + Math.floor(Math.random() * 2); // 1 or 2
  for (let k = 0; k < keycardCount; k++) {
    enemies[outsideIndices[k]].loot = [createKeycard()];
    (enemies[outsideIndices[k]] as any)._isOfficer = true;
    enemies[outsideIndices[k]].alertRange = Math.round(enemies[outsideIndices[k]].alertRange * 1.4);
    enemies[outsideIndices[k]].shootRange = Math.round(enemies[outsideIndices[k]].shootRange * 1.4);
    enemies[outsideIndices[k]].damage = 50; // Mosin
    enemies[outsideIndices[k]].fireRate = 2000; // bolt action
  }

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
    // Guard booth loot
    rLoot({ x: 1355, y: 1710, w: 30, h: 55 }, 'desk', 'desk'),
    rLoot({ x: 1355, y: 1710, w: 30, h: 55 }, 'locker', 'locker'),
    rLoot({ x: 1625, y: 1710, w: 30, h: 55 }, 'desk', 'desk'),
    rLoot({ x: 1625, y: 1710, w: 30, h: 55 }, 'locker', 'military'),
    // Outdoor loot — crates outside fence
    rLoot(ZONE_GATE, 'crate', 'common'),
    rLoot(ZONE_YARD_W, 'crate', 'military'),
    rLoot(ZONE_YARD_W, 'barrel', 'common'),
    rLoot(ZONE_YARD_E, 'crate', 'military'),
    rLoot(ZONE_YARD_E, 'locker', 'valuable'),
    rLoot(ZONE_YARD_N, 'desk', 'desk'),
    rLoot({ x: 450, y: 920, w: 140, h: 60 }, 'crate', 'military'), // motor pool
    rLoot({ x: 2520, y: 620, w: 110, h: 60 }, 'crate', 'military'), // ammo bunker
    // Outside fence crates (south of base)
    rLoot({ x: 500, y: 1950, w: 200, h: 100 }, 'crate', 'common'),
    rLoot({ x: 1200, y: 2050, w: 150, h: 100 }, 'crate', 'military'),
    rLoot({ x: 2100, y: 1950, w: 200, h: 100 }, 'crate', 'common'),
    rLoot({ x: 1600, y: 2200, w: 150, h: 100 }, 'barrel', 'common'),
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
    // === MINEFIELD (lower-left of base compound) ===
    // Warning signs around perimeter
    { pos: { x: 400, y: 1395 }, w: 16, h: 16, type: 'mine_sign' },
    { pos: { x: 550, y: 1395 }, w: 16, h: 16, type: 'mine_sign' },
    { pos: { x: 700, y: 1395 }, w: 16, h: 16, type: 'mine_sign' },
    { pos: { x: 400, y: 1705 }, w: 16, h: 16, type: 'mine_sign' },
    { pos: { x: 550, y: 1705 }, w: 16, h: 16, type: 'mine_sign' },
    { pos: { x: 700, y: 1705 }, w: 16, h: 16, type: 'mine_sign' },
    { pos: { x: 395, y: 1500 }, w: 16, h: 16, type: 'mine_sign' },
    { pos: { x: 755, y: 1500 }, w: 16, h: 16, type: 'mine_sign' },
    // Mines scattered in the zone
    ...Array.from({ length: 15 }, () => ({
      pos: { x: 410 + Math.random() * 330, y: 1410 + Math.random() * 280 },
      w: 8, h: 8, type: 'mine' as Prop['type'],
    })),
  ];

  // ══════════════════════════════════════
  // ALARM PANELS
  // ══════════════════════════════════════
  const alarmPanels: AlarmPanel[] = [
    // Terminal 1: Intel — reveals which exfil is open
    { id: 'alarm_intel', pos: { x: HX + 705, y: HY + 250 }, activated: false, hacked: false, hackProgress: 0, hackTime: 3 },
    // Terminal 2: Alarm disable — shuts down base alarm
    { id: 'alarm_disable', pos: { x: HX + 965, y: HY + 250 }, activated: false, hacked: false, hackProgress: 0, hackTime: 5 },
    // Terminal 3: Nuclear codebook — prints launch codes (required for extraction)
    { id: 'alarm_codebook', pos: { x: HX + 850, y: HY + 500 }, activated: false, hacked: false, hackProgress: 0, hackTime: 6 },
  ];

  // ══════════════════════════════════════
  // EXTRACTION POINTS (outdoor)
  // ══════════════════════════════════════
  const allExfils: ExtractionPoint[] = [
    { pos: { x: 500, y: MAP_H - 100 }, radius: 50, timer: 5, active: false, name: 'FOREST ROAD SOUTH' },
    { pos: { x: MAP_W - 100, y: 1000 }, radius: 50, timer: 5, active: false, name: 'FOREST ROAD EAST' },
    { pos: { x: 200, y: 500 }, radius: 50, timer: 5, active: false, name: 'FOREST ROAD NORTHWEST' },
  ];
  // Only one random exfil is open
  allExfils[Math.floor(Math.random() * allExfils.length)].active = true;
  const extractionPoints = allExfils;

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
    { pos: { x: 200, y: 500 }, radius: 80, color: '#44ff66', intensity: 0.4, type: 'fire' },
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
    pos: { x: 1510, y: MAP_H - 150 },
    hp: 100,
    maxHp: 100,
    speed: 2.5,
    angle: -Math.PI / 2,
    inventory: [weapon, createAmmo('9x18', 24), createGrenade(), createGrenade()],
    equippedWeapon: weapon,
    sidearm: weapon,
    primaryWeapon: null as any,
    activeSlot: 1 as const,
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
