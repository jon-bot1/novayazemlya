export interface Vec2 {
  x: number;
  y: number;
}

export type DamageType = 'bullet' | 'bleed' | 'explosion' | 'melee';

export type AmmoType = '9x18' | '5.45x39' | '7.62x39' | '12gauge';

export type ItemCategory = 'weapon' | 'ammo' | 'medical' | 'valuable' | 'armor';

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  icon: string; // emoji for now
  weight: number;
  value: number;
  ammoType?: AmmoType;
  ammoCount?: number;
  damage?: number;
  healAmount?: number;
  description: string;
}

export interface LootContainer {
  id: string;
  pos: Vec2;
  size: number;
  items: Item[];
  looted: boolean;
  type: 'crate' | 'body' | 'cabinet' | 'barrel';
}

export interface Bullet {
  pos: Vec2;
  vel: Vec2;
  damage: number;
  damageType: DamageType;
  fromPlayer: boolean;
  life: number;
}

export interface Enemy {
  id: string;
  pos: Vec2;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  alertRange: number;
  shootRange: number;
  state: 'patrol' | 'alert' | 'chase' | 'attack' | 'dead';
  patrolTarget: Vec2;
  lastShot: number;
  fireRate: number; // ms between shots
  angle: number;
  type: 'scav' | 'soldier' | 'heavy';
}

export interface Player {
  pos: Vec2;
  hp: number;
  maxHp: number;
  speed: number;
  angle: number;
  inventory: Item[];
  equippedWeapon: Item | null;
  currentAmmo: number;
  maxAmmo: number;
  ammoType: AmmoType;
  bleedRate: number; // hp/s lost to bleeding
  armor: number; // damage reduction 0-1
  lastShot: number;
  fireRate: number;
}

export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export interface ExtractionPoint {
  pos: Vec2;
  radius: number;
  timer: number; // seconds to extract
  active: boolean;
  name: string;
}

export interface GameState {
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  lootContainers: LootContainer[];
  walls: Wall[];
  extractionPoints: ExtractionPoint[];
  camera: Vec2;
  mapWidth: number;
  mapHeight: number;
  gameOver: boolean;
  extracted: boolean;
  extractionProgress: number;
  killCount: number;
  time: number;
  messages: GameMessage[];
}

export interface GameMessage {
  text: string;
  time: number;
  type: 'info' | 'warning' | 'loot' | 'damage' | 'kill';
}

export interface InputState {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  shooting: boolean;
  interact: boolean;
}
