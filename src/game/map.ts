import { Wall, LootContainer, Enemy, ExtractionPoint, DocumentPickup, Prop, AlarmPanel, LightSource, WindowDef, TerrainZone, Item } from './types';
import { LOOT_POOLS, WEAPON_TEMPLATES, createAmmo, createExtractionCode, createGrenade, createKey, createKeycard, createArmor, createValuable, createTNT, createDogFood } from './items';

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
  const stats: Record<string, any> = {
    scav: { hp: 50, speed: 0.72, damage: 12, alertRange: 125, shootRange: 85, fireRate: 1400 },
    soldier: { hp: 80, speed: 0.90, damage: 22, alertRange: 200, shootRange: 140, fireRate: 900 },
    heavy: { hp: 180, speed: 0.45, damage: 35, alertRange: 163, shootRange: 120, fireRate: 1600 },
    turret: { hp: 250, speed: 0, damage: 25, alertRange: 200, shootRange: 145, fireRate: 900 },
    boss: { hp: 550, speed: 1.10, damage: 40, alertRange: 313, shootRange: 200, fireRate: 550 },
    sniper: { hp: 90, speed: 0.36, damage: 85, alertRange: 475, shootRange: 330, fireRate: 5500 },
    shocker: { hp: 70, speed: 1.10, damage: 45, alertRange: 163, shootRange: 40, fireRate: 650 },
    redneck: { hp: 80, speed: 0.63, damage: 20, alertRange: 150, shootRange: 70, fireRate: 1000 },
    dog: { hp: 35, speed: 1.80, damage: 25, alertRange: 200, shootRange: 28, fireRate: 900 },
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
    tacticalRole: type === 'heavy' ? 'suppressor' : type === 'sniper' ? 'none' : type === 'soldier' ? (Math.random() < 0.5 ? 'flanker' : 'assault') : 'none',
    suppressTimer: 0,
    callForHelpTimer: 0,
    lastTacticalSwitch: 0,
    stunTimer: 0,
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
    // Outer walls with door gaps — non-rectangular shape with extensions
    // Top wall — door gap at HX+500 to HX+560
    makeWall(HX, HY, 500, T, WD),
    makeWall(HX + 560, HY, HW - 560, T, WD),
    // Bottom wall — door gap at HX+300 to HX+380
    makeWall(HX, HY + HH - T, 300, T, WD),
    makeWall(HX + 380, HY + HH - T, HW - 380, T, WD),
    // Left wall — door gap at HY+400 to HY+470
    makeWall(HX, HY, T, 400, WD),
    makeWall(HX, HY + 470, T, HH - 470, WD),
    // Right wall — solid with extension bump-out
    makeWall(HX + HW - T, HY, T, 300, WD),
    makeWall(HX + HW - T, HY + 400, T, HH - 400, WD),
    // Right-side extension (bump-out room, 100x100)
    makeWall(HX + HW - T, HY + 300, 100, T, WD),      // extension top
    makeWall(HX + HW - T, HY + 400, 100, T, WD),      // extension bottom
    makeWall(HX + HW + 100 - T - T, HY + 300, T, 100, WD), // extension right wall
    // Bottom-left extension (loading bay, 80x120)
    makeWall(HX - 80, HY + HH - 120, T, 120, WD),     // extension left wall
    makeWall(HX - 80, HY + HH - 120, 80, T, WD),      // extension top
    makeWall(HX - 80, HY + HH - T, 80, T, WD),        // extension bottom

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

  const PLAYER_SPAWN = { x: 1510, y: MAP_H - 150 };
  const MIN_SPAWN_DIST = 700; // minimum distance from player spawn

  const randInFarFromPlayer = (zone: { x: number; y: number; w: number; h: number }) => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const p = randIn(zone.x, zone.y, zone.w, zone.h);
      const dx = p.x - PLAYER_SPAWN.x;
      const dy = p.y - PLAYER_SPAWN.y;
      if (Math.sqrt(dx * dx + dy * dy) >= MIN_SPAWN_DIST) return p;
    }
    return randIn(zone.x, zone.y, zone.w, zone.h); // fallback
  };

  const rz = (zone: { x: number; y: number; w: number; h: number }, type: Enemy['type'], angle?: number, minDist?: number) => {
    const dist = minDist || MIN_SPAWN_DIST;
    for (let attempt = 0; attempt < 30; attempt++) {
      const p = randIn(zone.x, zone.y, zone.w, zone.h);
      const dx = p.x - PLAYER_SPAWN.x;
      const dy = p.y - PLAYER_SPAWN.y;
      if (Math.sqrt(dx * dx + dy * dy) >= dist) return makeEnemy(p.x, p.y, type, angle);
    }
    const p = randInFarFromPlayer(zone);
    return makeEnemy(p.x, p.y, type, angle);
  };

  // === OUTSIDE ZONES for random spawns (truly outside perimeter fence: N<280, S>1858, W<300, E>2908) ===
  const ZONE_OUTSIDE_SW = { x: 50, y: 1870, w: 600, h: 300 };
  const ZONE_OUTSIDE_SE = { x: 2500, y: 1870, w: 450, h: 300 };
  const ZONE_OUTSIDE_S  = { x: 800, y: 1870, w: 600, h: 300 };
  const ZONE_OUTSIDE_NW = { x: 50, y: 50, w: 500, h: 220 };
  const ZONE_OUTSIDE_N  = { x: 800, y: 50, w: 1600, h: 220 };
  const ZONE_OUTSIDE_NE = { x: 2500, y: 50, w: 500, h: 220 };

  const allInsideZones = [ZONE_HANGAR_A, ZONE_HANGAR_B, ZONE_CORRIDOR, ZONE_OFFICES_TOP, ZONE_OFFICES_BOT, ZONE_STORAGE_A, ZONE_STORAGE_B];
  const allOutsideZones = [ZONE_OUTSIDE_SW, ZONE_OUTSIDE_SE, ZONE_OUTSIDE_S, ZONE_OUTSIDE_NW, ZONE_OUTSIDE_N, ZONE_OUTSIDE_NE];

  const enemies: Enemy[] = [
    // Inside base — minimal garrison (stealth-focused)
    rz(ZONE_HANGAR_A, 'scav'),
    rz(ZONE_CORRIDOR, 'soldier'),
    rz(ZONE_STORAGE_A, 'soldier'),
    rz(ZONE_STORAGE_B, 'heavy'),
    // Sleeper — just one, surprise factor
    ...([0].map(() => {
      const sleepZones = [ZONE_HANGAR_A, ZONE_HANGAR_B, ZONE_OFFICES_TOP, ZONE_STORAGE_A];
      const sz = sleepZones[Math.floor(Math.random() * sleepZones.length)];
      const sp = randIn(sz.x, sz.y, sz.w, sz.h);
      const sleeper = makeEnemy(sp.x, sp.y, 'scav');
      (sleeper as any)._isSleeper = true;
      sleeper.state = 'idle';
      sleeper.hp = 30;
      sleeper.maxHp = 30;
      sleeper.speed = 0.45;
      sleeper.alertRange = 50;
      sleeper.speechBubble = '💤';
      sleeper.speechBubbleTimer = 999;
      return sleeper;
    })),
    // Turret inside hangar
    makeEnemy(HX + 720, HY + 430, 'turret', Math.PI * 0.5),
    // Boss — Commandant Osipovitj — random spawn inside base
    (() => {
      const bossZones = [ZONE_HANGAR_A, ZONE_HANGAR_B, ZONE_STORAGE_A, ZONE_STORAGE_B, ZONE_OFFICES_BOT];
      const bz = bossZones[Math.floor(Math.random() * bossZones.length)];
      const bp = randIn(bz.x, bz.y, bz.w, bz.h);
      return makeEnemy(bp.x, bp.y, 'boss');
    })(),

    // === OUTDOOR ENEMIES — reduced ===
    // Gate guards (just one)
    rz(ZONE_GATE, 'soldier'),
    // Yard patrols — fewer
    rz(ZONE_YARD_W, 'scav'),
    rz(ZONE_YARD_E, 'soldier'),
    rz(ZONE_YARD_N, 'soldier'),
    // Watchtower turrets (elevated, fixed)
    makeEnemy(350, 330, 'turret', Math.PI * 0.75),
    makeEnemy(2880, 330, 'turret', Math.PI * 0.5),

    // === WALL GUARDS — fewer (40% chance each) ===
    ...(Math.random() < 0.4 ? [makeEnemy(800, 320, 'soldier', Math.PI * 0.5)] : []),
    ...(Math.random() < 0.4 ? [makeEnemy(2400, 320, 'soldier', Math.PI * 0.5)] : []),
    ...(Math.random() < 0.4 ? [makeEnemy(340, 800, 'soldier', Math.PI)] : []),
    ...(Math.random() < 0.4 ? [makeEnemy(2880, 800, 'soldier', 0)] : []),
    ...(Math.random() < 0.4 ? [makeEnemy(1000, 1830, 'soldier', -Math.PI * 0.5)] : []),

    // === OUTSIDE PATROL GUARDS — reduced ===
    rz(ZONE_OUTSIDE_SW, 'soldier'),
    rz(ZONE_OUTSIDE_SE, 'scav'),
    rz(ZONE_OUTSIDE_S, 'soldier'),
    rz(ZONE_OUTSIDE_N, 'soldier'),
    rz(ZONE_OUTSIDE_N, 'heavy'),
    rz(ZONE_OUTSIDE_NE, 'soldier'),

    // === SNIPER ===
    (() => {
      const sniper = rz(pick(allOutsideZones), 'sniper');
      (sniper as any)._sniperObserving = true;
      (sniper as any)._sniperObserveTimer = 10 + Math.random() * 10;
      sniper.state = 'idle';
      return sniper;
    })(),

    // === SHOCKERS — just 1-2 ===
    rz(pick([...allInsideZones, ...allOutsideZones.slice(0, 3)]), 'shocker'),
    ...(Math.random() < 0.4 ? [rz(pick(allInsideZones), 'shocker')] : []),

    // === REDNECKS WITH DOGS — 1-2 ===
    ...(() => {
      const redneckZones = [ZONE_OUTSIDE_SW, ZONE_OUTSIDE_SE, ZONE_OUTSIDE_S, ZONE_OUTSIDE_NW, ZONE_OUTSIDE_NE];
      const count = 1 + Math.floor(Math.random() * 2); // 1-2
      const result: Enemy[] = [];
      for (let i = 0; i < count; i++) {
        const zone = redneckZones[Math.floor(Math.random() * redneckZones.length)];
        const redneck = rz(zone, 'redneck');
        result.push(redneck);
        const dog = makeEnemy(redneck.pos.x + (Math.random() - 0.5) * 40, redneck.pos.y + (Math.random() - 0.5) * 40, 'dog');
        dog.ownerId = redneck.id;
        dog.radioGroup = redneck.radioGroup;
        const dogNames = ['Бобик', 'Рекс', 'Мухтар', 'Шарик', 'Тузик', 'Полкан', 'Дружок', 'Барсик', 'Жучка', 'Лайка', 'Найда', 'Стрелка', 'Пуля', 'Вулкан', 'Гром'];
        (dog as any)._dogName = dogNames[Math.floor(Math.random() * dogNames.length)];
        result.push(dog);
      }
      return result;
    })(),
  ];

  // Save base enemy count before adding officers (index math depends on this)
  const baseEnemyCount = enemies.length;

  // === OUTDOOR OFFICERS — 1-3 total ===
  const pureOutsideZones = [ZONE_OUTSIDE_SW, ZONE_OUTSIDE_SE, ZONE_OUTSIDE_S, ZONE_OUTSIDE_NW, ZONE_OUTSIDE_N, ZONE_OUTSIDE_NE];
  const allOfficerZones = [...pureOutsideZones, ZONE_YARD_W, ZONE_YARD_E, ZONE_YARD_N];
  const numOfficers = 2 + Math.floor(Math.random() * 2); // 2-3
  for (let i = 0; i < numOfficers; i++) {
    // First 2 officers always spawn outside walls
    const zone = i < 2
      ? pureOutsideZones[Math.floor(Math.random() * pureOutsideZones.length)]
      : allOfficerZones[Math.floor(Math.random() * allOfficerZones.length)];
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
      createKeycard(),
      ...(Math.random() < 0.5 ? [createArmor()] : []),
      createValuable('Dogtags', 200, '🏷️'),
    ];
    enemies.push(officer);
  }

  // Mark watchtower turrets as elevated (they are always in the enemies array right after outdoor enemies)
  // Find turrets by type and position instead of hardcoded indices
  for (const e of enemies) {
    if (e.type === 'turret' && (
      (Math.abs(e.pos.x - 350) < 5 && Math.abs(e.pos.y - 330) < 5) ||
      (Math.abs(e.pos.x - 2880) < 5 && Math.abs(e.pos.y - 330) < 5)
    )) {
      e.elevated = true;
    }
  }

  // Mark wall guards as elevated — find by position pattern (on walls)
  for (const e of enemies) {
    if (e.type !== 'soldier') continue;
    const onNorthWall = Math.abs(e.pos.y - 320) < 5;
    const onWestWall = Math.abs(e.pos.x - 340) < 5;
    const onEastWall = Math.abs(e.pos.x - 2880) < 5;
    const onSouthWall = Math.abs(e.pos.y - 1830) < 5;
    if (onNorthWall || onWestWall || onEastWall || onSouthWall) {
      e.elevated = true;
      e.state = 'idle';
      e.alertRange = 180;
      e.shootRange = 150;
    }
  }

  // Boost outside patrol guards' vision depth by 25%
  // (they are rz() spawned in outside zones, not elevated, not officers)
  for (const e of enemies) {
    if (e.elevated || (e as any)._isOfficer || e.type === 'turret' || e.type === 'boss' || e.type === 'sniper') continue;
    // Check if in an outside zone
    for (const oz of allOutsideZones) {
      if (e.pos.x >= oz.x && e.pos.x <= oz.x + oz.w && e.pos.y >= oz.y && e.pos.y <= oz.y + oz.h) {
        e.alertRange = Math.round(e.alertRange * 1.25);
        e.shootRange = Math.round(e.shootRange * 1.25);
        break;
      }
    }
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
      bg.hp = 125;
      bg.maxHp = 125;
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
  for (const e of enemies) {
    if (e.elevated || (e as any)._isOfficer || e.type === 'turret' || e.type === 'boss' || e.type === 'sniper') continue;
    for (const oz of allOutsideZones) {
      if (e.pos.x >= oz.x && e.pos.x <= oz.x + oz.w && e.pos.y >= oz.y && e.pos.y <= oz.y + oz.h) {
        e.patrolTarget = {
          x: e.pos.x + (Math.random() - 0.5) * 400,
          y: e.pos.y + (Math.random() - 0.5) * 300,
        };
        break;
      }
    }
  }

  // Randomize keycard: 1-2 outside patrol guards (soldier or scav) carry one
  const outsideGuards = enemies.filter(e => !e.elevated && !(e as any)._isOfficer && (e.type === 'soldier' || e.type === 'scav'));
  // Filter to those actually in outside/yard zones
  const outsideZoneGuards = outsideGuards.filter(e => {
    for (const oz of [...allOutsideZones, ZONE_YARD_W, ZONE_YARD_E, ZONE_YARD_N, ZONE_GATE]) {
      if (e.pos.x >= oz.x && e.pos.x <= oz.x + oz.w && e.pos.y >= oz.y && e.pos.y <= oz.y + oz.h) return true;
    }
    return false;
  });
  const keycardPool = outsideZoneGuards.length > 0 ? outsideZoneGuards : outsideGuards;
  // Shuffle and pick 1-2
  for (let i = keycardPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keycardPool[i], keycardPool[j]] = [keycardPool[j], keycardPool[i]];
  }
  const keycardCount = 1 + Math.floor(Math.random() * 2); // 1 or 2
  for (let k = 0; k < Math.min(keycardCount, keycardPool.length); k++) {
    const guard = keycardPool[k];
    guard.loot.push(createKeycard());
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

    // === WEAPON CABINETS — fixed positions, guaranteed weapon loot ===
    makeLoot(HX + 180, HY + 400, 'weapon_cabinet', 'weapon_cabinet'),   // hangar A
    makeLoot(HX + 900, HY + 650, 'weapon_cabinet', 'weapon_cabinet'),   // hangar B
    makeLoot(450, 560, 'weapon_cabinet', 'weapon_cabinet'),              // barracks
    makeLoot(2560, 650, 'weapon_cabinet', 'weapon_cabinet'),             // ammo bunker
    makeLoot(HX + 750, HY + 820, 'weapon_cabinet', 'weapon_cabinet'),   // office armory
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

    // Concrete barriers around compound — MANY MORE for cover
    { pos: { x: 900, y: 700 }, w: 50, h: 16, type: 'concrete_barrier' },
    { pos: { x: 2400, y: 800 }, w: 50, h: 16, type: 'concrete_barrier' },
    { pos: { x: 1500, y: 550 }, w: 50, h: 16, type: 'concrete_barrier' },
    { pos: { x: 1100, y: 450 }, w: 50, h: 16, type: 'concrete_barrier' },
    { pos: { x: 1800, y: 500 }, w: 50, h: 16, type: 'concrete_barrier' },
    { pos: { x: 2100, y: 650 }, w: 50, h: 16, type: 'concrete_barrier' },
    { pos: { x: 750, y: 1100 }, w: 50, h: 16, type: 'concrete_barrier' },
    { pos: { x: 1300, y: 900 }, w: 50, h: 16, type: 'concrete_barrier' },
    { pos: { x: 2000, y: 1100 }, w: 50, h: 16, type: 'concrete_barrier' },
    { pos: { x: 2700, y: 1200 }, w: 50, h: 16, type: 'concrete_barrier' },
    { pos: { x: 600, y: 1300 }, w: 50, h: 16, type: 'concrete_barrier' },
    { pos: { x: 1700, y: 1300 }, w: 50, h: 16, type: 'concrete_barrier' },

    // Sandbag positions — MORE scattered across compound
    { pos: { x: 1400, y: 1700 }, w: 60, h: 16, type: 'sandbags' },
    { pos: { x: 1600, y: 1700 }, w: 60, h: 16, type: 'sandbags' },
    { pos: { x: 850, y: 500 }, w: 50, h: 14, type: 'sandbags' },
    { pos: { x: 1200, y: 600 }, w: 50, h: 14, type: 'sandbags' },
    { pos: { x: 1900, y: 700 }, w: 50, h: 14, type: 'sandbags' },
    { pos: { x: 2300, y: 500 }, w: 50, h: 14, type: 'sandbags' },
    { pos: { x: 500, y: 1000 }, w: 50, h: 14, type: 'sandbags' },
    { pos: { x: 1500, y: 1200 }, w: 50, h: 14, type: 'sandbags' },
    { pos: { x: 2500, y: 1000 }, w: 50, h: 14, type: 'sandbags' },
    { pos: { x: 800, y: 1500 }, w: 50, h: 14, type: 'sandbags' },

    // Wood crates scattered outdoors for cover
    { pos: { x: 1000, y: 500 }, w: 26, h: 26, type: 'wood_crate' },
    { pos: { x: 2200, y: 600 }, w: 26, h: 26, type: 'wood_crate' },
    { pos: { x: 800, y: 800 }, w: 26, h: 26, type: 'wood_crate' },
    { pos: { x: 1600, y: 700 }, w: 26, h: 26, type: 'wood_crate' },
    { pos: { x: 2600, y: 500 }, w: 26, h: 26, type: 'wood_crate' },
    { pos: { x: 1100, y: 1100 }, w: 26, h: 26, type: 'wood_crate' },
    { pos: { x: 1900, y: 1000 }, w: 26, h: 26, type: 'wood_crate' },
    { pos: { x: 400, y: 700 }, w: 26, h: 26, type: 'wood_crate' },

    // Barrel stacks — MORE around compound
    { pos: { x: 650, y: 500 }, w: 22, h: 22, type: 'barrel_stack' },
    { pos: { x: 2600, y: 700 }, w: 22, h: 22, type: 'barrel_stack' },
    { pos: { x: 1100, y: 700 }, w: 22, h: 22, type: 'barrel_stack' },
    { pos: { x: 1800, y: 900 }, w: 22, h: 22, type: 'barrel_stack' },
    { pos: { x: 2300, y: 1100 }, w: 22, h: 22, type: 'barrel_stack' },
    { pos: { x: 700, y: 1200 }, w: 22, h: 22, type: 'barrel_stack' },
    { pos: { x: 1400, y: 1000 }, w: 22, h: 22, type: 'barrel_stack' },

    // Vehicle wrecks — more for cover
    { pos: { x: 1800, y: 1500 }, w: 55, h: 28, type: 'vehicle_wreck' },
    { pos: { x: 2200, y: 1300 }, w: 50, h: 25, type: 'vehicle_wreck' },
    { pos: { x: 1000, y: 1400 }, w: 55, h: 28, type: 'vehicle_wreck' },

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

    // === SCATTERED TREES OUTSIDE FENCE (between treeline and perimeter) ===
    // South outside — between fence (y~1850) and south treeline (y~2300)
    ...Array.from({ length: 12 }, () => ({
      pos: { x: 400 + Math.random() * 2400, y: 1900 + Math.random() * 350 },
      w: 26 + Math.random() * 16, h: 26 + Math.random() * 16,
      type: (Math.random() > 0.4 ? 'pine_tree' : 'tree') as Prop['type'],
    })),
    // West outside — between treeline (x~200) and fence (x~300)
    ...Array.from({ length: 8 }, () => ({
      pos: { x: 200 + Math.random() * 120, y: 400 + Math.random() * 1400 },
      w: 24 + Math.random() * 14, h: 24 + Math.random() * 14,
      type: (Math.random() > 0.4 ? 'pine_tree' : 'tree') as Prop['type'],
    })),
    // East outside
    ...Array.from({ length: 8 }, () => ({
      pos: { x: 2920 + Math.random() * 120, y: 400 + Math.random() * 1400 },
      w: 24 + Math.random() * 14, h: 24 + Math.random() * 14,
      type: (Math.random() > 0.4 ? 'pine_tree' : 'tree') as Prop['type'],
    })),
    // North outside — between fence (y~280) and north treeline (y~200)
    ...Array.from({ length: 10 }, () => ({
      pos: { x: 400 + Math.random() * 2400, y: 200 + Math.random() * 100 },
      w: 24 + Math.random() * 14, h: 24 + Math.random() * 14,
      type: (Math.random() > 0.4 ? 'pine_tree' : 'tree') as Prop['type'],
    })),

    // === ROCKS & BUSHES OUTSIDE FENCE (cover for sniper and player) ===
    // South area rocks
    ...Array.from({ length: 8 }, () => ({
      pos: { x: 500 + Math.random() * 2200, y: 1920 + Math.random() * 300 },
      w: 20 + Math.random() * 16, h: 18 + Math.random() * 14,
      type: 'concrete_barrier' as Prop['type'],
    })),
    // Bushes scattered outside
    ...Array.from({ length: 15 }, () => ({
      pos: { x: 350 + Math.random() * 2500, y: 1880 + Math.random() * 400 },
      w: 16 + Math.random() * 12, h: 14 + Math.random() * 10,
      type: 'bush' as Prop['type'],
    })),
    // More bushes around north/east/west outside areas
    ...Array.from({ length: 10 }, () => ({
      pos: { x: 100 + Math.random() * 3000, y: 100 + Math.random() * 200 },
      w: 16 + Math.random() * 12, h: 14 + Math.random() * 10,
      type: 'bush' as Prop['type'],
    })),

    // Scattered bushes near fences (inside compound) — MORE for stealth gameplay
    ...Array.from({ length: 35 }, () => ({
      pos: { x: 320 + Math.random() * 2560, y: 300 + Math.random() * 1500 },
      w: 18 + Math.random() * 14, h: 16 + Math.random() * 12,
      type: 'bush' as Prop['type'],
    })),
    // Extra trees inside compound for hiding — roguelike cover
    ...Array.from({ length: 12 }, () => ({
      pos: { x: 400 + Math.random() * 2400, y: 400 + Math.random() * 1300 },
      w: 26 + Math.random() * 14, h: 26 + Math.random() * 14,
      type: (Math.random() > 0.5 ? 'pine_tree' : 'tree') as Prop['type'],
    })),
    // Dense bush clusters near patrol routes — ambush spots
    ...Array.from({ length: 8 }, () => {
      const cx = 600 + Math.random() * 2000;
      const cy = 500 + Math.random() * 1200;
      return [
        { pos: { x: cx, y: cy }, w: 20 + Math.random() * 10, h: 18 + Math.random() * 8, type: 'bush' as Prop['type'] },
        { pos: { x: cx + 15 + Math.random() * 10, y: cy + (Math.random() - 0.5) * 15 }, w: 18 + Math.random() * 8, h: 16 + Math.random() * 6, type: 'bush' as Prop['type'] },
      ];
    }).flat(),
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


    // === AIRPLANE (parked outside hangar) ===
    { pos: { x: HX + HW + 160, y: HY + 200 }, w: 120, h: 80, type: 'airplane' as Prop['type'] },

    // === FUEL DEPOT (west yard — cluster of fuel tanks) ===
    { pos: { x: 520, y: 1150 }, w: 60, h: 40, type: 'fuel_depot' as Prop['type'] },

    // === RADIO TOWER (north compound) ===
    { pos: { x: 1600, y: 380 }, w: 40, h: 40, type: 'radio_tower' as Prop['type'] },

    // === AMMO DUMP (east yard — stockpile) ===
    { pos: { x: 2550, y: 1100 }, w: 50, h: 50, type: 'ammo_dump' as Prop['type'] },

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
    // Terminal 4: Radio tower — disable communications
    { id: 'alarm_radio', pos: { x: 1600, y: 380 }, activated: false, hacked: false, hackProgress: 0, hackTime: 4 },
  ];

  // ══════════════════════════════════════
  // EXTRACTION POINTS (outdoor)
  // ══════════════════════════════════════
  const allExfils: ExtractionPoint[] = [
    { pos: { x: 500, y: MAP_H - 100 }, radius: 80, timer: 5, active: false, name: 'FOREST ROAD SOUTH' },
    { pos: { x: MAP_W - 100, y: 1000 }, radius: 80, timer: 5, active: false, name: 'FOREST ROAD EAST' },
    { pos: { x: 200, y: 500 }, radius: 80, timer: 5, active: false, name: 'FOREST ROAD NORTHWEST' },
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
  const knife = WEAPON_TEMPLATES.knife();
  return {
    pos: { x: 1510, y: MAP_H - 150 },
    hp: 100,
    maxHp: 100,
    speed: 1.69,
    angle: -Math.PI / 2,
    inventory: [weapon, knife],
    equippedWeapon: weapon,
    meleeWeapon: knife,
    sidearm: weapon,
    primaryWeapon: null as any,
    activeSlot: 2 as 1 | 2 | 3,
    currentAmmo: 8,
    maxAmmo: 8,
    ammoType: '9x18' as const,
    ammoReserves: { '9x18': 6, '5.45x39': 0, '7.62x39': 0, '12gauge': 0, '7.62x54R': 0 } as Record<import('./types').AmmoType, number>,
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
    // Roguelike additions
    stamina: 100,
    maxStamina: 100,
    reloading: false,
    reloadTimer: 0,
    reloadTime: 0,
  };
}
