import { Wall, LootContainer, Enemy, ExtractionPoint, DocumentPickup, Prop, AlarmPanel, LightSource, WindowDef, TerrainZone, Item } from './types';
import { LOOT_POOLS, WEAPON_TEMPLATES, createAmmo, createExtractionCode, createGrenade, createKeycard, createArmor, createValuable, createDogFood, createTNT } from './items';

// Hospital: 2400x2400
// Layout: Large abandoned hospital building with corridors, wards, basement, and courtyard
const MAP_W = 2400;
const MAP_H = 2400;

let enemyId = 20000;
let containerId = 20000;

function randIn(zx: number, zy: number, zw: number, zh: number, m = 20): { x: number; y: number } {
  return { x: zx + m + Math.random() * Math.max(1, zw - m * 2), y: zy + m + Math.random() * Math.max(1, zh - m * 2) };
}
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const CONCRETE = '#7a7a7a';
const TILE = '#8a9a8a';
const DARK = '#4a4a4a';

const makeWall = (x: number, y: number, w: number, h: number, color = CONCRETE): Wall => ({ x, y, w, h, color });

const makeEnemy = (x: number, y: number, type: Enemy['type'], fixedAngle?: number): Enemy => {
  const stats: Record<string, any> = {
    scav: { hp: 55, speed: 0.72, damage: 14, alertRange: 130, shootRange: 70, fireRate: 1400 },
    soldier: { hp: 85, speed: 0.88, damage: 24, alertRange: 200, shootRange: 110, fireRate: 950 },
    heavy: { hp: 200, speed: 0.40, damage: 35, alertRange: 180, shootRange: 100, fireRate: 1600 },
    sniper: { hp: 75, speed: 0.30, damage: 70, alertRange: 350, shootRange: 200, fireRate: 5500 },
    shocker: { hp: 80, speed: 1.20, damage: 50, alertRange: 160, shootRange: 35, fireRate: 600 },
    boss: { hp: 500, speed: 1.00, damage: 40, alertRange: 300, shootRange: 160, fireRate: 550 },
    turret: { hp: 180, speed: 0, damage: 20, alertRange: 200, shootRange: 110, fireRate: 1000 },
    redneck: { hp: 65, speed: 0.55, damage: 16, alertRange: 150, shootRange: 55, fireRate: 1200 },
    dog: { hp: 28, speed: 1.80, damage: 20, alertRange: 200, shootRange: 24, fireRate: 900 },
  };
  const s = stats[type] || stats.scav;
  const enemy: Enemy = {
    id: `enemy_${enemyId++}`,
    pos: { x, y },
    ...s,
    maxHp: s.hp,
    state: 'patrol',
    patrolTarget: { x: x + (Math.random() - 0.5) * 100, y: y + (Math.random() - 0.5) * 100 },
    lastShot: 0,
    angle: fixedAngle ?? Math.random() * Math.PI * 2,
    type,
    eyeBlink: Math.random() * 5,
    loot: [],
    looted: false,
    lastRadioCall: 0,
    radioGroup: Math.floor(y / 400),
    radioAlert: 0,
    tacticalRole: type === 'heavy' ? 'suppressor' : type === 'soldier' ? (Math.random() < 0.5 ? 'flanker' : 'assault') : 'none',
    suppressTimer: 0,
    callForHelpTimer: 0,
    lastTacticalSwitch: 0,
    stunTimer: 0,
    awareness: 0,
    awarenessDecay: 0.12,
    elevated: false,
    friendly: false,
    friendlyTimer: 0,
  };
  if (type === 'boss') { enemy.bossPhase = 0; enemy.bossChargeTimer = 0; enemy.bossSpawnTimer = 0; }
  if (type === 'redneck') { enemy.loot = [WEAPON_TEMPLATES.toz(), createDogFood()]; }
  return enemy;
};

type LootPoolType = 'common' | 'military' | 'valuable' | 'desk' | 'archive' | 'locker' | 'body' | 'weapon_cabinet';
const makeLoot = (x: number, y: number, type: LootContainer['type'], pool: LootPoolType): LootContainer => ({
  id: `loot_${containerId++}`, pos: { x, y }, size: 24,
  items: LOOT_POOLS[pool] ? LOOT_POOLS[pool]() : LOOT_POOLS.common(), looted: false, type,
});
const makeDocPickup = (x: number, y: number, loreDocId: string): DocumentPickup => ({
  id: `docpickup_${loreDocId}`, pos: { x, y }, loreDocId, collected: false,
});

export function generateHospitalMap() {
  const T = 10;

  // Building: 1600x1800 centered in map
  const BX = 400, BY = 300, BW = 1600, BH = 1800;

  const terrainZones: TerrainZone[] = [
    { x: 0, y: 0, w: MAP_W, h: MAP_H, type: 'forest' },
    { x: BX - 80, y: BY - 80, w: BW + 160, h: BH + 160, type: 'concrete' },
    { x: BX, y: BY, w: BW, h: BH, type: 'concrete' },
    // Courtyard (center hole)
    { x: BX + 500, y: BY + 600, w: 600, h: 500, type: 'grass' },
    // Parking
    { x: 100, y: MAP_H - 400, w: 500, h: 300, type: 'asphalt' },
    // Path to hospital (main approach from south)
    { x: BX + BW / 2 - 80, y: BY + BH, w: 160, h: MAP_H - BY - BH, type: 'asphalt' },
    // Reception/entrance area
    { x: BX + BW / 2 - 200, y: BY + BH - 200, w: 400, h: 200, type: 'concrete' },
  ];

  // ═══ WALLS — Hospital building ═══
  // G = minimum door gap width (player radius=28, need ≥60, use 80 for comfort)
  const G = 80;

  const walls: Wall[] = [
    // ═══ OUTER WALLS ═══
    // North wall — emergency exit gap center (80px)
    makeWall(BX, BY, BW / 2 - G / 2, T, DARK),
    makeWall(BX + BW / 2 + G / 2, BY, BW / 2 - G / 2, T, DARK),
    // South wall — MAIN ENTRANCE (wide 120px gap center)
    makeWall(BX, BY + BH - T, BW / 2 - 60, T, DARK),
    makeWall(BX + BW / 2 + 60, BY + BH - T, BW / 2 - 60, T, DARK),
    // West wall — side entrance gap at y+700 (80px gap)
    makeWall(BX, BY, T, 700, DARK),
    makeWall(BX, BY + 700 + G, T, BH - 700 - G, DARK),
    // East wall — fire escape gap at y+900 (80px gap)
    makeWall(BX + BW - T, BY, T, 900, DARK),
    makeWall(BX + BW - T, BY + 900 + G, T, BH - 900 - G, DARK),

    // ═══ MAIN ENTRANCE — RECEPTION & WAITING ROOM ═══
    // Reception desk (horizontal counter — NOT a wall blocker, just decoration)
    // Waiting room side walls — 80px gaps at top for corridor passage
    makeWall(BX + BW / 2 - 250, BY + BH - 170, T, 80, TILE),  // west side (gap at top 80px)
    makeWall(BX + BW / 2 + 250, BY + BH - 170, T, 80, TILE),  // east side (gap at top 80px)
    // North wall of reception — wide center opening aligned with corridor (160px)
    makeWall(BX + BW / 2 - 250, BY + BH - 250, 170, T, TILE),  // left block
    makeWall(BX + BW / 2 + 80, BY + BH - 250, 170, T, TILE),   // right block
    // (gap x=BX+BW/2-80 .. BX+BW/2+80)

    // ═══ GROUND FLOOR CORRIDORS ═══
    // Main north-south corridor (center, 100px wide)
    // North segment: from building top down to cross-corridor top (y=BY+300)
    makeWall(BX + BW / 2 - 50, BY + T, T, 300 - T, TILE),
    makeWall(BX + BW / 2 + 50, BY + T, T, 300 - T, TILE),
    // South segment removed to avoid sealed pocket above reception; central atrium remains fully traversable

    // East-west corridor (y=300-400) — connects to N-S corridor via open intersection
    makeWall(BX + T, BY + 300, BW / 2 - 50 - T, T, TILE),
    makeWall(BX + BW / 2 + 50, BY + 300, BW / 2 - 50 - T, T, TILE),
    makeWall(BX + T, BY + 400, BW / 2 - 50 - T, T, TILE),
    makeWall(BX + BW / 2 + 50, BY + 400, BW / 2 - 50 - T, T, TILE),

    // ═══ ROOMS — West Wing (wards) ═══
    // Ward 1 (NW: x=BX..BX+200, y=BY..BY+300) — 80px door gap near corridor
    makeWall(BX + 200, BY + T, T, 210, CONCRETE),
    // (gap y=BY+220 to BY+300 = 80px opening into cross-corridor area)

    // Ward 2 (x=BX..BX+490, y=BY+400..BY+1100) — 80px door gap at top
    makeWall(BX + T, BY + 600, 110, T, CONCRETE),
    makeWall(BX + 190, BY + 600, 300, T, CONCRETE), // gap x=120..190 = 80px

    // Ward 3 (x=BX..BX+500, y=BY+1100..BY+1500)
    // Top wall — 80px gap at east end to connect to corridor
    makeWall(BX + T, BY + 1100, 410, T, CONCRETE),
    // Inner divider
    makeWall(BX + 250, BY + 1100, T, 220, CONCRETE),
    // South wall — 80px gap
    makeWall(BX + T, BY + 1400, 170, T, CONCRETE),
    makeWall(BX + 250, BY + 1400, 240, T, CONCRETE),

    // ═══ ROOMS — East Wing (labs/offices) ═══
    // Lab area (x=BX+BW-350..BX+BW, y=BY..BY+600)
    // Inner wall along corridor — 80px gap for entry from cross-corridor
    makeWall(BX + BW - 200, BY + T, T, 210, CONCRETE),
    // (gap y=BY+220 to BY+300 = 80px)
    makeWall(BX + BW - 200, BY + 400, T, 200, CONCRETE),
    // Lab west wall (deeper lab room)
    makeWall(BX + BW - 350, BY + 400, T, 120, CONCRETE),
    // (gap at y=BY+520 to BY+600 = 80px)
    // Lab south wall — 80px gap at west end
    makeWall(BX + BW - 250, BY + 600, 250, T, CONCRETE),
    // (gap from x=BX+BW-350 to BX+BW-250 = 100px)

    // Office (x=BX+BW-350..BX+BW, y=BY+1100..BY+1400) — 80px door at top-left
    makeWall(BX + BW - 350, BY + 1100, T, 300, CONCRETE),
    makeWall(BX + BW - 200, BY + 1100, T, 300, CONCRETE),
    // Top wall with 80px gap
    makeWall(BX + BW - 350, BY + 1100, 70, T, CONCRETE),
    makeWall(BX + BW - 200, BY + 1100, 200, T, CONCRETE),
    // (gap from BX+BW-280 to BX+BW-200 = 80px)

    // ═══ COURTYARD walls (open area in center) ═══
    // North wall — west gap + center gap for through-route
    makeWall(BX + 580, BY + 600, 170, T, TILE),
    makeWall(BX + 850, BY + 600, 250, T, TILE),
    // South wall — center gap + east gap for through-route
    makeWall(BX + 500, BY + 1100, 250, T, TILE),
    makeWall(BX + 850, BY + 1100, 170, T, TILE),
    // West wall — 80px gap near bottom
    makeWall(BX + 500, BY + 600, T, 400, TILE),
    // (gap y=BY+1000 to BY+1080 = 80px)
    makeWall(BX + 500, BY + 1080, T, 20, TILE),
    // East wall — 80px gap near top
    makeWall(BX + 1100, BY + 680, T, 420, TILE),
    // (gap from y=BY+600 to BY+680 = 80px)

    // ═══ BASEMENT AREA (south end, y=BY+1500..BY+1780) ═══
    // North wall — 100px gap at center for stairs
    makeWall(BX + 100, BY + 1500, BW / 2 - 150, T, DARK),
    makeWall(BX + BW / 2 + 50, BY + 1500, BW / 2 - 150, T, DARK),
    // Side walls
    makeWall(BX + 100, BY + 1500, T, 280, DARK),
    makeWall(BX + BW - 100, BY + 1500, T, 280, DARK),
    // Room dividers — start 80px below north wall (gap at top for passage)
    makeWall(BX + 400, BY + 1580, T, 200, DARK),
    makeWall(BX + 700, BY + 1580, T, 200, DARK),
    makeWall(BX + 1000, BY + 1580, T, 200, DARK),
    makeWall(BX + 1300, BY + 1580, T, 200, DARK),
  ];

  // ═══ ZONES ═══
  const ZONE_ENTRANCE = { x: BX + BW / 2 - 190, y: BY + BH - 190, w: 380, h: 180 };
  const ZONE_RECEPTION = { x: BX + BW / 2 - 190, y: BY + BH - 190, w: 380, h: 180 };
  const ZONE_CORRIDOR_N = { x: BX + BW / 2 - 45, y: BY + 20, w: 90, h: 280 };
  const ZONE_CORRIDOR_S = { x: BX + BW / 2 - 45, y: BY + 1110, w: 90, h: 380 };
  const ZONE_WARD_W = { x: BX + 20, y: BY + 20, w: 180, h: 270 };
  const ZONE_WARD_W2 = { x: BX + 20, y: BY + 410, w: 480, h: 480 };
  const ZONE_WARD_W3 = { x: BX + 20, y: BY + 1110, w: 230, h: 380 };
  const ZONE_LAB_E = { x: BX + BW - 340, y: BY + 410, w: 330, h: 180 };
  const ZONE_OFFICE_E = { x: BX + BW - 340, y: BY + 1110, w: 330, h: 280 };
  const ZONE_COURTYARD = { x: BX + 510, y: BY + 610, w: 580, h: 480 };
  const ZONE_BASEMENT = { x: BX + 110, y: BY + 1510, w: BW - 220, h: 260 };
  const ZONE_FOREST_W = { x: 50, y: 300, w: 300, h: 1500 };
  const ZONE_FOREST_E = { x: MAP_W - 350, y: 300, w: 300, h: 1500 };
  const ZONE_PARKING = { x: 100, y: MAP_H - 400, w: 500, h: 300 };

  const PLAYER_SPAWN = { x: BX + BW / 2, y: MAP_H - 100 };
  const MIN_SPAWN_DIST = 400;

  const rz = (zone: { x: number; y: number; w: number; h: number }, type: Enemy['type'], angle?: number) => {
    for (let i = 0; i < 30; i++) {
      const p = randIn(zone.x, zone.y, zone.w, zone.h);
      if (Math.sqrt((p.x - PLAYER_SPAWN.x) ** 2 + (p.y - PLAYER_SPAWN.y) ** 2) >= MIN_SPAWN_DIST)
        return makeEnemy(p.x, p.y, type, angle);
    }
    const p = randIn(zone.x, zone.y, zone.w, zone.h);
    return makeEnemy(p.x, p.y, type, angle);
  };

  // ═══ ENEMIES ═══
  const enemies: Enemy[] = [
    // Corridor patrols
    rz(ZONE_CORRIDOR_N, 'soldier'),
    rz(ZONE_CORRIDOR_S, 'soldier'),
    // Wards
    rz(ZONE_WARD_W, 'scav'),
    rz(ZONE_WARD_W2, 'scav'),
    rz(ZONE_WARD_W2, 'shocker'), // horror element
    rz(ZONE_WARD_W3, 'scav'),
    // Labs
    rz(ZONE_LAB_E, 'soldier'),
    rz(ZONE_LAB_E, 'heavy'),
    // Office
    rz(ZONE_OFFICE_E, 'soldier'),
    // Courtyard
    rz(ZONE_COURTYARD, 'scav'),
    rz(ZONE_COURTYARD, 'soldier'),
    // Basement — dangerous
    rz(ZONE_BASEMENT, 'heavy'),
    rz(ZONE_BASEMENT, 'shocker'),
    rz(ZONE_BASEMENT, 'shocker'),
    // Forest
    rz(ZONE_FOREST_W, 'sniper'),
    rz(ZONE_FOREST_E, 'soldier'),
    // Parking
    rz(ZONE_PARKING, 'scav'),

    // ═══ BOSS 1 — Доктор Кравцов (The Experimenter) ═══
    // Found in the lab/east wing, surrounded by his "subjects"
    (() => {
      const kravtsovZones = [ZONE_LAB_E, ZONE_OFFICE_E, ZONE_COURTYARD];
      const kz = kravtsovZones[Math.floor(Math.random() * kravtsovZones.length)];
      const kp = randIn(kz.x, kz.y, kz.w, kz.h);
      const boss = makeEnemy(kp.x, kp.y, 'boss');
      (boss as any)._bossId = 'kravtsov';
      (boss as any)._bossTitle = 'ДОКТОР КРАВЦОВ';
      boss.hp = 400; boss.maxHp = 400;
      boss.speed = 0.70;
      boss.damage = 30;
      boss.fireRate = 800;
      boss.alertRange = 220;
      boss.shootRange = 140;
      boss.loot = [
        WEAPON_TEMPLATES.ak74(),
        createKeycard(),
        createValuable('Experiment Logs', 800, '📋'),
        createValuable('Mutagen Sample', 1200, '🧪'),
      ];
      (boss as any)._patrolWaypoints = [
        { x: kp.x - 80, y: kp.y - 60 },
        { x: kp.x + 80, y: kp.y - 60 },
        { x: kp.x + 80, y: kp.y + 60 },
        { x: kp.x - 80, y: kp.y + 60 },
      ];
      (boss as any)._waypointIdx = 0;
      boss.patrolTarget = (boss as any)._patrolWaypoints[0];
      boss.state = 'patrol';
      return boss;
    })(),

    // ═══ BOSS 2 — Узбек (The Uzbek) ═══
    // Locked in the basement — fast, melee-focused, horrifying
    (() => {
      const uzbekZones = [ZONE_BASEMENT, ZONE_WARD_W3, ZONE_CORRIDOR_S];
      const uz = uzbekZones[Math.floor(Math.random() * uzbekZones.length)];
      const up = randIn(uz.x, uz.y, uz.w, uz.h);
      const boss = makeEnemy(up.x, up.y, 'boss');
      (boss as any)._bossId = 'uzbek';
      (boss as any)._bossTitle = 'УЗБЕК';
      boss.hp = 600; boss.maxHp = 600;
      boss.speed = 1.60;
      boss.damage = 55;
      boss.fireRate = 400;
      boss.alertRange = 250;
      boss.shootRange = 40;
      boss.loot = [
        createExtractionCode(),
        createValuable('Uzbek Blood Sample', 2000, '🩸'),
        createValuable('Old Dog Tags', 500, '💀'),
      ];
      (boss as any)._patrolWaypoints = [
        { x: up.x - 120, y: up.y - 60 },
        { x: up.x + 120, y: up.y + 40 },
        { x: up.x + 60, y: up.y + 80 },
        { x: up.x - 60, y: up.y - 40 },
      ];
      (boss as any)._waypointIdx = 0;
      boss.patrolTarget = (boss as any)._patrolWaypoints[0];
      boss.state = 'patrol';
      return boss;
    })(),
  ];

  // Kravtsov's bodyguards (lab guards)
  const kravtsovIdx = enemies.findIndex(e => (e as any)._bossId === 'kravtsov');
  if (kravtsovIdx >= 0) {
    const boss = enemies[kravtsovIdx];
    for (const offset of [-35, 35]) {
      const bg = makeEnemy(boss.pos.x + offset, boss.pos.y + 20, 'soldier');
      (bg as any)._bodyguardOf = boss.id;
      (bg as any)._isBodyguard = true;
      bg.hp = 100; bg.maxHp = 100;
      bg.alertRange = 220; bg.shootRange = 180;
      bg.radioGroup = boss.radioGroup;
      enemies.push(bg);
    }
  }

  // Uzbek has no bodyguards — but add extra shockers nearby as "failed experiments"
  const pzIdx = enemies.findIndex(e => (e as any)._bossId === 'uzbek');
  if (pzIdx >= 0) {
    const pz = enemies[pzIdx];
    for (const offset of [{ x: -60, y: -30 }, { x: 60, y: -30 }, { x: 0, y: 40 }]) {
      const minion = makeEnemy(pz.pos.x + offset.x, pz.pos.y + offset.y, 'shocker');
      minion.hp = 50; minion.maxHp = 50;
      minion.speed = 1.5;
      minion.radioGroup = pz.radioGroup;
      enemies.push(minion);
    }
  }

  // ═══ LOOT ═══
  const rLoot = (zone: { x: number; y: number; w: number; h: number }, type: LootContainer['type'], pool: LootPoolType) => {
    const p = randIn(zone.x, zone.y, zone.w, zone.h);
    return makeLoot(p.x, p.y, type, pool);
  };

  const lootContainers: LootContainer[] = [
    rLoot(ZONE_WARD_W, 'desk', 'desk'),
    rLoot(ZONE_WARD_W, 'locker', 'locker'),
    rLoot(ZONE_WARD_W2, 'cabinet', 'common'),
    rLoot(ZONE_WARD_W2, 'locker', 'locker'),
    rLoot(ZONE_WARD_W3, 'desk', 'desk'),
    rLoot(ZONE_LAB_E, 'cabinet', 'military'),
    rLoot(ZONE_LAB_E, 'locker', 'valuable'),
    makeLoot(BX + BW - 250, BY + 500, 'weapon_cabinet', 'weapon_cabinet'),
    rLoot(ZONE_OFFICE_E, 'desk', 'desk'),
    rLoot(ZONE_OFFICE_E, 'archive', 'archive'),
    rLoot(ZONE_COURTYARD, 'crate', 'common'),
    rLoot(ZONE_COURTYARD, 'barrel', 'common'),
    rLoot(ZONE_BASEMENT, 'crate', 'military'),
    rLoot(ZONE_BASEMENT, 'crate', 'military'),
    rLoot(ZONE_BASEMENT, 'crate', 'valuable'),
    makeLoot(BX + 800, BY + 1600, 'weapon_cabinet', 'weapon_cabinet'),
    rLoot(ZONE_CORRIDOR_N, 'locker', 'locker'),
    rLoot(ZONE_PARKING, 'crate', 'common'),
    rLoot(ZONE_PARKING, 'barrel', 'common'),
    rLoot(ZONE_PARKING, 'crate', 'military'),
    // Outdoor loot — around hospital perimeter
    rLoot(ZONE_FOREST_W, 'crate', 'common'),
    rLoot(ZONE_FOREST_W, 'barrel', 'common'),
    rLoot(ZONE_FOREST_E, 'crate', 'military'),
    rLoot(ZONE_FOREST_E, 'crate', 'common'),
    // Near entrances
    makeLoot(BX - 40, BY + 720, 'crate', 'common'),
    makeLoot(BX + BW + 30, BY + 920, 'barrel', 'military'),
    makeLoot(BX + BW / 2 - 60, BY + BH + 50, 'crate', 'common'),
    makeLoot(BX + BW / 2 + 60, BY + BH + 50, 'barrel', 'common'),
    { id: `loot_${containerId++}`, pos: randIn(ZONE_BASEMENT.x, ZONE_BASEMENT.y, ZONE_BASEMENT.w, ZONE_BASEMENT.h), size: 24, items: [createTNT()], looted: false, type: 'crate' as const },
    { id: `loot_${containerId++}`, pos: randIn(ZONE_BASEMENT.x, ZONE_BASEMENT.y, ZONE_BASEMENT.w, ZONE_BASEMENT.h), size: 24, items: [createExtractionCode()], looted: false, type: 'archive' as const },
  ];

  // ═══ DOCUMENTS (hospital-specific lore) ═══
  const docZones = [ZONE_WARD_W, ZONE_LAB_E, ZONE_OFFICE_E, ZONE_BASEMENT, ZONE_COURTYARD, ZONE_LAB_E, ZONE_BASEMENT];
  const docIds = ['doc_h1', 'doc_h2', 'doc_h3', 'doc_h4', 'doc_h5', 'doc_3', 'doc_4'];
  const documentPickups: DocumentPickup[] = docIds.map((id, i) => {
    const z = docZones[i % docZones.length];
    const p = randIn(z.x, z.y, z.w, z.h);
    return makeDocPickup(p.x, p.y, id);
  });

  // ═══ PROPS ═══
  const props: Prop[] = [
    // Forest trees
    ...Array.from({ length: 25 }, (_, i) => ({
      pos: { x: 50 + Math.random() * 300, y: 100 + i * 90 + Math.random() * 40 },
      w: 28 + Math.random() * 16, h: 28 + Math.random() * 16,
      type: 'pine_tree' as Prop['type'],
    })),
    ...Array.from({ length: 25 }, (_, i) => ({
      pos: { x: MAP_W - 50 - Math.random() * 300, y: 100 + i * 90 + Math.random() * 40 },
      w: 28 + Math.random() * 16, h: 28 + Math.random() * 16,
      type: 'pine_tree' as Prop['type'],
    })),
    // North treeline
    ...Array.from({ length: 20 }, (_, i) => ({
      pos: { x: 100 + i * 115 + Math.random() * 50, y: 50 + Math.random() * 200 },
      w: 30 + Math.random() * 18, h: 30 + Math.random() * 18,
      type: (Math.random() > 0.3 ? 'pine_tree' : 'tree') as Prop['type'],
    })),
    // South area
    ...Array.from({ length: 15 }, (_, i) => ({
      pos: { x: 100 + i * 160 + Math.random() * 80, y: MAP_H - 80 - Math.random() * 100 },
      w: 28 + Math.random() * 16, h: 28 + Math.random() * 16,
      type: 'pine_tree' as Prop['type'],
    })),
    // Courtyard bushes
    ...Array.from({ length: 8 }, () => ({
      pos: { x: BX + 520 + Math.random() * 560, y: BY + 620 + Math.random() * 460 },
      w: 16 + Math.random() * 12, h: 14 + Math.random() * 10,
      type: 'bush' as Prop['type'],
    })),
    // Indoor props
    { pos: { x: BX + 80, y: BY + 100 }, w: 50, h: 20, type: 'equipment_table' },
    { pos: { x: BX + 80, y: BY + 250 }, w: 30, h: 60, type: 'metal_shelf' },
    { pos: { x: BX + BW - 100, y: BY + 100 }, w: 50, h: 20, type: 'equipment_table' },
    { pos: { x: BX + BW - 300, y: BY + 480 }, w: 50, h: 20, type: 'equipment_table' },
    { pos: { x: BX + 300, y: BY + 1200 }, w: 26, h: 26, type: 'wood_crate' },
    { pos: { x: BX + 150, y: BY + 700 }, w: 22, h: 22, type: 'barrel_stack' },
    { pos: { x: BX + 200, y: BY + 1550 }, w: 22, h: 22, type: 'barrel_stack' },
    { pos: { x: BX + 500, y: BY + 1600 }, w: 28, h: 28, type: 'wood_crate' },
    { pos: { x: BX + 900, y: BY + 1550 }, w: 36, h: 16, type: 'concrete_barrier' },
    { pos: { x: BX + 1200, y: BY + 1650 }, w: 30, h: 60, type: 'metal_shelf' },
    // Parking vehicles
    { pos: { x: 200, y: MAP_H - 300 }, w: 55, h: 28, type: 'vehicle_wreck' },
    { pos: { x: 400, y: MAP_H - 250 }, w: 50, h: 25, type: 'vehicle_wreck' },
    // Sandbags near entrance
    { pos: { x: BX + BW / 2 - 80, y: BY + BH + 20 }, w: 60, h: 16, type: 'sandbags' },
    { pos: { x: BX + BW / 2 + 30, y: BY + BH + 20 }, w: 60, h: 16, type: 'sandbags' },
    // Reception area props — chairs in waiting room
    { pos: { x: BX + BW / 2 - 160, y: BY + BH - 100 }, w: 30, h: 60, type: 'metal_shelf' },
    { pos: { x: BX + BW / 2 + 140, y: BY + BH - 100 }, w: 30, h: 60, type: 'metal_shelf' },
    { pos: { x: BX + BW / 2, y: BY + BH - 80 }, w: 50, h: 20, type: 'equipment_table' },
  ];

  // ═══ ALARM PANELS ═══
  const alarmPanels: AlarmPanel[] = [
    { id: 'alarm_intel', pos: { x: BX + BW - 300, y: BY + 200 }, activated: false, hacked: false, hackProgress: 0, hackTime: 3 },
    { id: 'alarm_disable', pos: { x: BX + 100, y: BY + 1200 }, activated: false, hacked: false, hackProgress: 0, hackTime: 5 },
    { id: 'alarm_lab', pos: { x: BX + BW - 250, y: BY + 550 }, activated: false, hacked: false, hackProgress: 0, hackTime: 4 },
  ];

  // ═══ EXTRACTION ═══
  const allExfils: ExtractionPoint[] = [
    { pos: { x: 200, y: MAP_H - 200 }, radius: 80, timer: 5, active: false, name: 'PARKING LOT' },
    { pos: { x: MAP_W - 100, y: MAP_H / 2 }, radius: 80, timer: 5, active: false, name: 'EAST FIRE ESCAPE' },
    { pos: { x: MAP_W / 2, y: 100 }, radius: 80, timer: 5, active: false, name: 'ROOFTOP HELICOPTER' },
  ];
  allExfils[Math.floor(Math.random() * allExfils.length)].active = true;

  // ═══ LIGHTS — dimmer, horror atmosphere ═══
  const lights: LightSource[] = [
    // Corridor lights (flickering)
    { pos: { x: BX + BW / 2, y: BY + 150 }, radius: 100, color: '#ccddcc', intensity: 0.35, flicker: true, type: 'ceiling' },
    { pos: { x: BX + BW / 2, y: BY + 350 }, radius: 80, color: '#aabbaa', intensity: 0.3, flicker: true, type: 'ceiling' },
    { pos: { x: BX + BW / 2, y: BY + 1200 }, radius: 80, color: '#aabbaa', intensity: 0.3, flicker: true, type: 'ceiling' },
    { pos: { x: BX + BW / 2, y: BY + 1600 }, radius: 100, color: '#ccddcc', intensity: 0.35, flicker: true, type: 'ceiling' },
    // Ward - dim
    { pos: { x: BX + 100, y: BY + 200 }, radius: 60, color: '#ffcc66', intensity: 0.25, type: 'desk' },
    { pos: { x: BX + 100, y: BY + 700 }, radius: 70, color: '#ff8844', intensity: 0.2, type: 'fire' },
    // Lab — cold light
    { pos: { x: BX + BW - 250, y: BY + 500 }, radius: 100, color: '#88ccff', intensity: 0.4, type: 'ceiling' },
    // Basement — very dark with red emergency light
    { pos: { x: BX + 300, y: BY + 1600 }, radius: 80, color: '#ff4444', intensity: 0.3, flicker: true, type: 'alarm' },
    { pos: { x: BX + 900, y: BY + 1600 }, radius: 80, color: '#ff4444', intensity: 0.3, flicker: true, type: 'alarm' },
    // Courtyard — natural
    { pos: { x: BX + 800, y: BY + 850 }, radius: 200, color: '#eeeedd', intensity: 0.5, type: 'window' },
    // Extraction glow
    { pos: { x: 200, y: MAP_H - 200 }, radius: 80, color: '#44ff66', intensity: 0.4, type: 'fire' },
    { pos: { x: MAP_W - 100, y: MAP_H / 2 }, radius: 80, color: '#44ff66', intensity: 0.4, type: 'fire' },
    { pos: { x: MAP_W / 2, y: 100 }, radius: 80, color: '#44ff66', intensity: 0.4, type: 'fire' },
  ];

  const windows: WindowDef[] = [
    { x: BX, y: BY + 100, w: T, h: 30, direction: 'west' },
    { x: BX, y: BY + 400, w: T, h: 30, direction: 'west' },
    { x: BX + BW - T, y: BY + 100, w: T, h: 30, direction: 'east' },
    { x: BX + BW - T, y: BY + 500, w: T, h: 30, direction: 'east' },
    { x: BX + 300, y: BY, w: 40, h: T, direction: 'north' },
    { x: BX + BW - 300, y: BY, w: 40, h: T, direction: 'north' },
  ];

  return { walls, enemies, lootContainers, documentPickups, extractionPoints: allExfils, alarmPanels, props, lights, windows, terrainZones, mapWidth: MAP_W, mapHeight: MAP_H };
}

export function createHospitalPlayer() {
  const weapon = WEAPON_TEMPLATES.makarov();
  const knife = WEAPON_TEMPLATES.knife();
  return {
    pos: { x: 1200, y: 2300 },
    hp: 100, maxHp: 100, speed: 1.69,
    angle: -Math.PI / 2,
    inventory: [weapon, knife],
    equippedWeapon: weapon, meleeWeapon: knife,
    sidearm: weapon, primaryWeapon: null as any,
    activeSlot: 2 as 1 | 2 | 3,
    currentAmmo: 8, maxAmmo: 8,
    ammoType: '9x18' as const,
    ammoReserves: { '9x18': 32, '5.45x39': 0, '7.62x39': 0, '12gauge': 0, '7.62x54R': 0 } as Record<import('./types').AmmoType, number>,
    bleedRate: 0, armor: 0, lastShot: 0, fireRate: 400,
    inCover: false, coverObject: null, coverQuality: 0, coverLabel: '', peeking: false,
    lastGrenadeTime: 0, tntCount: 0, keycardCount: 0,
    specialSlot: [] as Item[],
    selectedThrowable: 'grenade' as 'grenade' | 'gas_grenade' | 'flashbang',
    stamina: 125, maxStamina: 125,
    reloading: false, reloadTimer: 0, reloadTime: 0,
  };
}
