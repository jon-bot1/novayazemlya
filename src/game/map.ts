import { Wall, LootContainer, Enemy, ExtractionPoint, DocumentPickup } from './types';
import { LOOT_POOLS, WEAPON_TEMPLATES, createAmmo } from './items';

const MAP_W = 2400;
const MAP_H = 2400;

let enemyId = 0;
let containerId = 0;

const makeWall = (x: number, y: number, w: number, h: number, color = '#2a2f28'): Wall => ({ x, y, w, h, color });

const makeEnemy = (x: number, y: number, type: 'scav' | 'soldier' | 'heavy'): Enemy => {
  const stats = {
    scav: { hp: 40, speed: 1.2, damage: 8, alertRange: 200, shootRange: 180, fireRate: 1200 },
    soldier: { hp: 70, speed: 1.5, damage: 15, alertRange: 280, shootRange: 250, fireRate: 800 },
    heavy: { hp: 120, speed: 0.8, damage: 25, alertRange: 250, shootRange: 220, fireRate: 1500 },
  }[type];
  return {
    id: `enemy_${enemyId++}`,
    pos: { x, y },
    ...stats,
    maxHp: stats.hp,
    state: 'patrol',
    patrolTarget: { x: x + (Math.random() - 0.5) * 200, y: y + (Math.random() - 0.5) * 200 },
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
  const walls: Wall[] = [
    // Outer walls
    makeWall(0, 0, MAP_W, 20, '#1a1e18'),
    makeWall(0, MAP_H - 20, MAP_W, 20, '#1a1e18'),
    makeWall(0, 0, 20, MAP_H, '#1a1e18'),
    makeWall(MAP_W - 20, 0, 20, MAP_H, '#1a1e18'),

    // Building 1 - top left barracks (КАЗАРМА)
    makeWall(100, 100, 400, 20),
    makeWall(100, 100, 20, 300),
    makeWall(100, 380, 180, 20),
    makeWall(320, 380, 180, 20),
    makeWall(480, 100, 20, 300),
    makeWall(200, 200, 120, 15, '#363b33'),
    
    // Building 2 - warehouse center (СКЛАД)
    makeWall(700, 400, 500, 20),
    makeWall(700, 400, 20, 400),
    makeWall(700, 780, 220, 20),
    makeWall(980, 780, 220, 20),
    makeWall(1180, 400, 20, 400),
    makeWall(900, 500, 15, 200, '#363b33'),
    makeWall(1000, 550, 100, 15, '#363b33'),

    // Building 3 - bottom right bunker (БУНКЕР)
    makeWall(1500, 1500, 600, 25, '#1a1e18'),
    makeWall(1500, 1500, 25, 500),
    makeWall(1500, 1975, 250, 25),
    makeWall(1850, 1975, 250, 25),
    makeWall(2075, 1500, 25, 500),
    makeWall(1650, 1650, 200, 20, '#363b33'),
    makeWall(1800, 1750, 20, 150, '#363b33'),

    // Scattered debris
    makeWall(300, 700, 80, 15, '#4a4535'),
    makeWall(500, 900, 15, 100, '#4a4535'),
    makeWall(1300, 200, 120, 15, '#4a4535'),
    makeWall(1800, 400, 15, 80, '#4a4535'),
    makeWall(400, 1400, 150, 15, '#4a4535'),
    makeWall(1000, 1200, 15, 120, '#4a4535'),
    makeWall(2000, 800, 100, 15, '#4a4535'),
    makeWall(600, 1800, 15, 100, '#4a4535'),
  ];

  const enemies: Enemy[] = [
    makeEnemy(250, 250, 'scav'),
    makeEnemy(400, 300, 'scav'),
    makeEnemy(850, 550, 'soldier'),
    makeEnemy(1050, 650, 'soldier'),
    makeEnemy(900, 700, 'scav'),
    makeEnemy(600, 1200, 'scav'),
    makeEnemy(1300, 900, 'scav'),
    makeEnemy(1800, 300, 'soldier'),
    makeEnemy(1700, 1700, 'soldier'),
    makeEnemy(1900, 1800, 'heavy'),
    makeEnemy(1600, 1900, 'soldier'),
    makeEnemy(400, 1800, 'scav'),
    makeEnemy(2100, 1200, 'scav'),
  ];

  const lootContainers: LootContainer[] = [
    makeLoot(150, 150, 'cabinet', 'common'),
    makeLoot(400, 200, 'crate', 'military'),
    makeLoot(750, 500, 'crate', 'common'),
    makeLoot(1100, 600, 'barrel', 'common'),
    makeLoot(850, 700, 'crate', 'military'),
    makeLoot(1050, 450, 'cabinet', 'valuable'),
    makeLoot(1600, 1600, 'crate', 'military'),
    makeLoot(1950, 1900, 'cabinet', 'valuable'),
    makeLoot(1700, 1850, 'barrel', 'common'),
    makeLoot(300, 900, 'barrel', 'common'),
    makeLoot(1400, 300, 'crate', 'common'),
    makeLoot(2000, 600, 'body', 'military'),
    makeLoot(500, 1600, 'body', 'common'),
  ];

  // Document pickups scattered across the map
  const documentPickups: DocumentPickup[] = [
    makeDocPickup(350, 250, 'doc_1'),   // Barracks - military report
    makeDocPickup(300, 350, 'doc_2'),   // Barracks - soldier diary
    makeDocPickup(1000, 650, 'doc_6'),  // Warehouse - inventory list
    makeDocPickup(1100, 500, 'doc_4'),  // Warehouse - radio intercept
    makeDocPickup(1700, 1750, 'doc_3'), // Bunker - interrogation
    makeDocPickup(1900, 1950, 'doc_5'), // Bunker - wall note
  ];

  const extractionPoints: ExtractionPoint[] = [
    { pos: { x: 50, y: MAP_H - 50 }, radius: 60, timer: 5, active: true, name: 'SYDVÄST UTGÅNG' },
    { pos: { x: MAP_W - 50, y: 50 }, radius: 60, timer: 5, active: true, name: 'NORDOST UTGÅNG' },
  ];

  return { walls, enemies, lootContainers, documentPickups, extractionPoints, mapWidth: MAP_W, mapHeight: MAP_H };
}

export function createInitialPlayer() {
  const weapon = WEAPON_TEMPLATES.makarov();
  return {
    pos: { x: 1200, y: 1200 },
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
