export interface Vec2 {
  x: number;
  y: number;
}

export type DamageType = 'bullet' | 'bleed' | 'explosion' | 'melee';

export type AmmoType = '9x18' | '5.45x39' | '7.62x39' | '12gauge' | '7.62x54R';

export type ItemCategory = 'weapon' | 'ammo' | 'medical' | 'valuable' | 'armor' | 'grenade' | 'flashbang' | 'key' | 'backpack';

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
  stopsBleeding?: number;
  speedBoost?: number;
  description: string;
  // Weapon-specific stats
  bulletSpeed?: number;   // projectile speed (default 8)
  weaponRange?: number;   // bullet lifetime in frames (default 60)
  weaponFireRate?: number; // ms between shots (overrides player fireRate)
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
  type: 'crate' | 'body' | 'cabinet' | 'barrel' | 'desk' | 'locker' | 'archive';
}

export interface AlarmPanel {
  id: string;
  pos: Vec2;
  activated: boolean;
  hacked: boolean;
  hackProgress: number; // 0-1, 1 = hacked
  hackTime: number; // seconds to hack
}

export interface Bullet {
  pos: Vec2;
  vel: Vec2;
  damage: number;
  damageType: DamageType;
  fromPlayer: boolean;
  life: number;
  elevated?: boolean; // bullet from elevated enemy, ignores walls
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

export type TacticalRole = 'assault' | 'flanker' | 'suppressor' | 'none';

export interface Enemy {
  id: string;
  pos: Vec2;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  alertRange: number;
  shootRange: number;
  state: 'idle' | 'patrol' | 'alert' | 'investigate' | 'chase' | 'attack' | 'flank' | 'suppress' | 'dead';
  patrolTarget: Vec2;
  investigateTarget?: Vec2; // where a sound was heard
  lastShot: number;
  fireRate: number;
  angle: number;
  type: 'scav' | 'soldier' | 'heavy' | 'turret' | 'boss';
  bossPhase?: number; // 0=normal, 1=enraged, 2=desperate
  bossChargeTimer?: number; // charge attack cooldown
  bossSpawnTimer?: number; // spawn minion cooldown
  eyeBlink: number;
  loot: Item[];
  looted: boolean;
  lastRadioCall: number; // timestamp of last radio call
  radioGroup: number; // enemies in same group can communicate
  radioAlert: number; // visual timer for radio icon (seconds remaining)
  // Tactical AI
  tacticalRole: TacticalRole;
  flankTarget?: Vec2; // position to flank to
  suppressTimer: number; // time remaining in suppression mode
  callForHelpTimer: number; // cooldown for calling help
  lastTacticalSwitch: number; // prevent rapid role switching
  stunTimer: number; // flashbang stun duration remaining
  elevated: boolean; // on raised platform, can shoot over walls
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
  inCover: boolean;
  coverObject: Vec2 | null; // position of the cover object
  peeking: boolean; // actively peeking to fire
}

export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export interface Prop {
  pos: Vec2;
  w: number;
  h: number;
  type: 'wood_crate' | 'concrete_barrier' | 'equipment_table' | 'sandbags' | 'barrel_stack' | 'metal_shelf'
    | 'tree' | 'pine_tree' | 'bush' | 'fence_h' | 'fence_v' | 'guard_booth' | 'watchtower' | 'vehicle_wreck' | 'gate' | 'road_sign' | 'searchlight';
  blocksPlayer?: boolean;
}

export type TerrainType = 'grass' | 'dirt' | 'asphalt' | 'concrete' | 'forest';

export interface TerrainZone {
  x: number;
  y: number;
  w: number;
  h: number;
  type: TerrainType;
}

export interface LightSource {
  pos: Vec2;
  radius: number;       // how far the light reaches
  color: string;         // e.g. '#ffcc66'
  intensity: number;     // 0-1
  flicker?: boolean;     // slight random flicker
  type: 'ceiling' | 'desk' | 'window' | 'alarm' | 'fire';
}

export interface WindowDef {
  x: number;
  y: number;
  w: number;
  h: number;
  direction: 'north' | 'south' | 'east' | 'west';
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
  props: Prop[];
  alarmPanels: AlarmPanel[];
  alarmActive: boolean;
  walls: Wall[];
  extractionPoints: ExtractionPoint[];
  lights: LightSource[];
  windows: WindowDef[];
  terrainZones: TerrainZone[];
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
  speedBoostTimer: number;
  soundEvents: SoundEvent[]; // sounds that enemies can react to
  flashbangTimer: number; // seconds of flashbang blindness remaining
  backpackCapacity: number; // extra inventory slots from backpack
}

export interface SoundEvent {
  pos: Vec2;
  radius: number; // how far the sound carries
  time: number;
}

export interface GameMessage {
  text: string;
  time: number;
  type: 'info' | 'warning' | 'loot' | 'damage' | 'kill' | 'intel';
}

export type MovementMode = 'sneak' | 'walk' | 'sprint';

export interface InputState {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  shooting: boolean;
  interact: boolean;
  heal: boolean;
  throwGrenade: boolean;
  movementMode: MovementMode;
  moveTarget?: Vec2 | null;
  takeCover: boolean;
}
