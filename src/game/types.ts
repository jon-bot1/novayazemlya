export interface Vec2 {
  x: number;
  y: number;
}

export type DamageType = 'bullet' | 'bleed' | 'explosion' | 'melee';

export type AmmoType = '9x18' | '5.45x39' | '7.62x39' | '12gauge';

export type ItemCategory = 'weapon' | 'ammo' | 'medical' | 'valuable' | 'armor' | 'grenade';

export type MedicalType = 'bandage' | 'medkit' | 'morphine';

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  icon: string;
  weight: number;
  value: number;
  ammoType?: AmmoType;
  ammoCount?: number;
  damage?: number;
  healAmount?: number;
  medicalType?: MedicalType;
  stopsBleeding?: number; // how much bleed it removes
  speedBoost?: number; // temporary speed boost duration in seconds
  description: string;
}

export interface DocumentPickup {
  id: string;
  pos: Vec2;
  loreDocId: string;
  collected: boolean;
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

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Grenade {
  pos: Vec2;
  vel: Vec2;
  timer: number; // seconds until explosion
  damage: number;
  radius: number; // explosion radius
  fromPlayer: boolean;
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
  fireRate: number;
  angle: number;
  type: 'scav' | 'soldier' | 'heavy' | 'turret';
  eyeBlink: number;
  loot: Item[];
  looted: boolean;
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
  bleedRate: number;
  armor: number;
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
  timer: number;
  active: boolean;
  name: string;
}

export interface GameState {
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  grenades: Grenade[];
  particles: Particle[];
  lootContainers: LootContainer[];
  documentPickups: DocumentPickup[];
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
  codesFound: string[];
  documentsRead: string[];
  hasExtractionCode: boolean;
  speedBoostTimer: number; // remaining speed boost time
}

export interface GameMessage {
  text: string;
  time: number;
  type: 'info' | 'warning' | 'loot' | 'damage' | 'kill' | 'intel';
}

export interface InputState {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  shooting: boolean;
  interact: boolean;
  heal: boolean;
  throwGrenade: boolean; // G key
  moveTarget?: Vec2 | null;
}
