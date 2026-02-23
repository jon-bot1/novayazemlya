import { Wall, LootContainer, Enemy, ExtractionPoint, DocumentPickup, Prop } from './types';
import { LOOT_POOLS, WEAPON_TEMPLATES, createAmmo, createExtractionCode, createGrenade } from './items';

// Hangar complex: 1200x900 - tighter for mobile visibility
const MAP_W = 1200;
const MAP_H = 900;

let enemyId = 0;
let containerId = 0;

const W = '#6a7a68'; // wall color
const WD = '#5a6a58'; // dark wall
const WL = '#7a8a78'; // light wall (interior)

const makeWall = (x: number, y: number, w: number, h: number, color = W): Wall => ({ x, y, w, h, color });

const makeEnemy = (x: number, y: number, type: 'scav' | 'soldier' | 'heavy' | 'turret', fixedAngle?: number): Enemy => {
  const stats = {
    scav: { hp: 40, speed: 1.2, damage: 8, alertRange: 150, shootRange: 130, fireRate: 1200 },
    soldier: { hp: 70, speed: 1.5, damage: 15, alertRange: 200, shootRange: 180, fireRate: 800 },
    heavy: { hp: 120, speed: 0.8, damage: 25, alertRange: 180, shootRange: 160, fireRate: 1500 },
    turret: { hp: 200, speed: 0, damage: 20, alertRange: 250, shootRange: 230, fireRate: 300 },
  }[type];
  return {
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
    radioGroup: Math.floor(x / 300), // group by map area
    radioAlert: 0,
  };
};

const makeLoot = (x: number, y: number, type: LootContainer['type'], pool: 'common' | 'military' | 'valuable'): LootContainer => ({
  id: `loot_${containerId++}`,
  pos: { x, y },
  size: 24,
  items: LOOT_POOLS[pool](),
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

  const enemies: Enemy[] = [
    // Hangar - easy enemies (scavs)
    makeEnemy(180, 300, 'scav'),
    makeEnemy(350, 450, 'scav'),
    makeEnemy(100, 700, 'scav'),

    // Corridor - medium
    makeEnemy(600, 250, 'soldier'),

    // Offices - medium enemies
    makeEnemy(800, 100, 'soldier'),
    makeEnemy(1050, 100, 'scav'),
    makeEnemy(800, 340, 'soldier'),
    makeEnemy(1050, 340, 'soldier'),

    // Storage - hard enemies
    makeEnemy(820, 650, 'soldier'),
    makeEnemy(1050, 550, 'heavy'),
    makeEnemy(1100, 800, 'heavy'),

    // Mounted machine gun — guards corridor entrance to storage
    makeEnemy(720, 430, 'turret', Math.PI * 0.5), // faces south
  ];

  const lootContainers: LootContainer[] = [
    // Hangar
    makeLoot(130, 280, 'crate', 'common'),
    makeLoot(280, 380, 'barrel', 'common'),
    makeLoot(420, 470, 'crate', 'common'),
    makeLoot(180, 630, 'barrel', 'common'),

    // Offices
    makeLoot(770, 80, 'cabinet', 'military'),
    makeLoot(1100, 80, 'cabinet', 'valuable'),
    makeLoot(770, 350, 'cabinet', 'military'),
    makeLoot(1100, 350, 'cabinet', 'valuable'),

    // Storage
    makeLoot(820, 530, 'crate', 'military'),
    makeLoot(820, 730, 'barrel', 'common'),
    makeLoot(1050, 650, 'crate', 'military'),
    makeLoot(1100, 850, 'body', 'valuable'),
    // Extraction code — hidden in a locked cabinet in deep storage
    {
      id: `loot_${containerId++}`,
      pos: { x: 1050, y: 780 },
      size: 24,
      items: [createExtractionCode()],
      looted: false,
      type: 'cabinet' as const,
    },
  ];

  const documentPickups: DocumentPickup[] = [
    makeDocPickup(300, 250, 'doc_1'),   // Hangar floor
    makeDocPickup(450, 460, 'doc_2'),   // Hangar near corridor
    makeDocPickup(770, 150, 'doc_6'),   // Office 1
    makeDocPickup(1100, 150, 'doc_4'),  // Office 2
    makeDocPickup(850, 550, 'doc_3'),   // Storage
    makeDocPickup(1080, 800, 'doc_5'),  // Deep storage
  ];

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

  const extractionPoints: ExtractionPoint[] = [
    { pos: { x: 250, y: MAP_H - 40 }, radius: 50, timer: 5, active: true, name: 'HANGAR SYD' },
    { pos: { x: MAP_W - 40, y: 600 }, radius: 50, timer: 5, active: true, name: 'LAGER ÖST' },
  ];

  return { walls, enemies, lootContainers, documentPickups, extractionPoints, props, mapWidth: MAP_W, mapHeight: MAP_H };
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
