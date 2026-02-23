import { Wall, LootContainer, Enemy, ExtractionPoint, DocumentPickup } from './types';
import { LOOT_POOLS, WEAPON_TEMPLATES, createAmmo } from './items';

// Hangar complex: 1200x900 - tighter for mobile visibility
const MAP_W = 1200;
const MAP_H = 900;

let enemyId = 0;
let containerId = 0;

const W = '#6a7a68'; // wall color
const WD = '#5a6a58'; // dark wall
const WL = '#7a8a78'; // light wall (interior)

const makeWall = (x: number, y: number, w: number, h: number, color = W): Wall => ({ x, y, w, h, color });

const makeEnemy = (x: number, y: number, type: 'scav' | 'soldier' | 'heavy'): Enemy => {
  const stats = {
    scav: { hp: 40, speed: 1.2, damage: 8, alertRange: 150, shootRange: 130, fireRate: 1200 },
    soldier: { hp: 70, speed: 1.5, damage: 15, alertRange: 200, shootRange: 180, fireRate: 800 },
    heavy: { hp: 120, speed: 0.8, damage: 25, alertRange: 180, shootRange: 160, fireRate: 1500 },
  }[type];
  return {
    id: `enemy_${enemyId++}`,
    pos: { x, y },
    ...stats,
    maxHp: stats.hp,
    state: 'patrol',
    patrolTarget: { x: x + (Math.random() - 0.5) * 150, y: y + (Math.random() - 0.5) * 150 },
    lastShot: 0,
    angle: Math.random() * Math.PI * 2,
    type,
    eyeBlink: Math.random() * 5,
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
    // Hangar east wall partial
    makeWall(500, 200, T, 150),
    makeWall(500, 420, T, 80 + T),

    // === CORRIDOR (connecting hangar to offices) ===
    // Top corridor wall
    makeWall(500, 200, 200, T),
    // Bottom corridor wall
    makeWall(500, 300, 200, T),
    // Corridor is 500-700 x, 200-300 y (100px wide corridor)

    // === OFFICE BLOCK (right side, top) ===
    // Office block outer
    makeWall(700, T, T, 400),              // west wall
    makeWall(700, 400, 200, T),            // south wall partial
    makeWall(960, 400, MAP_W - 960 - T, T), // south wall rest
    
    // Office 1 (top-left office)
    makeWall(700, 180, 130, T, WL),        // divider
    makeWall(830, T, T, 180, WL),          // east wall (with gap south)
    
    // Office 2 (top-right office)  
    makeWall(960, T, T, 180, WL),          // divider
    makeWall(830, 180, 70, T, WL),         // south wall with gap
    makeWall(960, 180, MAP_W - 960 - T, T, WL),

    // Office 3 (bottom-left office)
    makeWall(830, 220, T, 180, WL),        // divider
    makeWall(700, 300, 60, T, WL),         // partial wall (corridor exit)

    // Office 4 (bottom-right office)
    makeWall(960, 220, T, 180, WL),        // divider

    // === STORAGE AREA (right side, bottom) ===
    makeWall(700, 400, T, MAP_H - 400 - T), // west wall
    // Interior shelving
    makeWall(780, 500, 80, T, WL),
    makeWall(780, 600, 80, T, WL),
    makeWall(780, 700, 80, T, WL),
    // East storage room
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
  ];

  const documentPickups: DocumentPickup[] = [
    makeDocPickup(300, 250, 'doc_1'),   // Hangar floor
    makeDocPickup(450, 460, 'doc_2'),   // Hangar near corridor
    makeDocPickup(770, 150, 'doc_6'),   // Office 1
    makeDocPickup(1100, 150, 'doc_4'),  // Office 2
    makeDocPickup(850, 550, 'doc_3'),   // Storage
    makeDocPickup(1080, 800, 'doc_5'),  // Deep storage
  ];

  const extractionPoints: ExtractionPoint[] = [
    { pos: { x: 250, y: MAP_H - 40 }, radius: 50, timer: 5, active: true, name: 'HANGAR SYD' },
    { pos: { x: MAP_W - 40, y: 600 }, radius: 50, timer: 5, active: true, name: 'LAGER ÖST' },
  ];

  return { walls, enemies, lootContainers, documentPickups, extractionPoints, mapWidth: MAP_W, mapHeight: MAP_H };
}

export function createInitialPlayer() {
  const weapon = WEAPON_TEMPLATES.makarov();
  return {
    pos: { x: 60, y: MAP_H / 2 },  // Start at left side of hangar
    hp: 100,
    maxHp: 100,
    speed: 2.5,
    angle: 0,
    inventory: [weapon, createAmmo('9x18', 24)],
    equippedWeapon: weapon,
    currentAmmo: 8,
    maxAmmo: 8,
    ammoType: '9x18' as const,
    bleedRate: 0,
    armor: 0,
    lastShot: 0,
    fireRate: 400,
  };
}
