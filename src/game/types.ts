export interface Vec2 {
  x: number;
  y: number;
}

export type DamageType = 'bullet' | 'bleed' | 'explosion' | 'melee' | 'electric';

export type AmmoType = '9x18' | '5.45x39' | '7.62x39' | '12gauge' | '7.62x54R';

export type ItemCategory = 'weapon' | 'ammo' | 'medical' | 'valuable' | 'armor' | 'grenade' | 'flashbang' | 'gas_grenade' | 'key' | 'backpack' | 'special';

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
  fireMode?: 'single' | 'auto'; // single = one shot per click, auto = hold to fire
  weaponSlot?: 'primary' | 'secondary'; // which slot this weapon goes in
  isBuckshot?: boolean; // fires multiple pellets in a cone
  pelletCount?: number; // number of pellets (default 5)
  coneAngle?: number; // spread cone in radians (default 0.5 ~30°)
}

export interface PendingWeapon {
  item: Item;
  slot: 'primary' | 'secondary';
  replacing: Item | null;
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
  sourceId?: string; // enemy id who fired this bullet
  sourceType?: string; // enemy type (soldier, heavy, boss, sniper, etc.)
  weaponName?: string; // weapon that fired this bullet (for Mosin bonuses etc.)
  weaponFireMode?: 'single' | 'auto'; // player fire mode at shot time (used by sniper reaction AI)
}

export interface PlacedTNT {
  pos: Vec2;
  timer: number; // seconds until detonation
  maxTimer: number;
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
  sourceId?: string;
  sourceType?: string;
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
  type: 'scav' | 'soldier' | 'heavy' | 'turret' | 'boss' | 'sniper' | 'shocker' | 'redneck' | 'dog';
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
  friendly: boolean; // converted by gas grenade — fights for player
  friendlyTimer: number; // seconds remaining as friendly
  ownerId?: string; // for dogs: the redneck they follow
  speechBubble?: string; // current speech bubble text
  speechBubbleTimer?: number; // seconds remaining for speech bubble
  neutralized?: boolean; // for dogs: fed dog food, will disappear
  neutralizedTimer?: number; // seconds until neutralized dog disappears
}

export interface Player {
  pos: Vec2;
  hp: number;
  maxHp: number;
  speed: number;
  angle: number;
  inventory: Item[];
  equippedWeapon: Item | null;
  meleeWeapon: Item | null;
  sidearm: Item | null;
  primaryWeapon: Item | null;
  activeSlot: 1 | 2 | 3;
  currentAmmo: number;
  maxAmmo: number;
  ammoType: AmmoType;
  bleedRate: number;
  armor: number;
  lastShot: number;
  fireRate: number;
  inCover: boolean;
  coverObject: Vec2 | null;
  coverQuality: number; // 0-1, miss chance when in full cover (peeking = half)
  coverLabel: string; // display label for cover type
  peeking: boolean;
  lastGrenadeTime: number;
  tntCount: number;
  specialSlot: Item[]; // special items: propaganda, syringes, mission items
  selectedThrowable: 'grenade' | 'gas_grenade' | 'flashbang';
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
    | 'tree' | 'pine_tree' | 'bush' | 'fence_h' | 'fence_v' | 'guard_booth' | 'watchtower' | 'vehicle_wreck' | 'gate' | 'road_sign' | 'searchlight'
    | 'mine' | 'mine_sign' | 'toxic_barrel' | 'airplane' | 'fuel_depot' | 'radio_tower' | 'ammo_dump';
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
  placedTNTs: PlacedTNT[];
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
  hasNuclearCodes: boolean;
  speedBoostTimer: number;
  soundEvents: SoundEvent[]; // sounds that enemies can react to
  flashbangTimer: number; // seconds of flashbang blindness remaining
  backpackCapacity: number; // extra inventory slots from backpack
  mineFieldZone: { x: number; y: number; w: number; h: number };
  reinforcementTimer: number; // countdown to next reinforcement wave
  reinforcementsSpawned: number; // total reinforcements spawned so far
  coverNearby: boolean; // true when player is near a cover object
  deathCause?: string; // what killed the player
  exfilRevealed?: string; // name of revealed exfil point
  // Achievement tracking
  mosinKills: number;
  grenadeKills: number;
  tntKills: number;
  longShots: number; // kills at >250px distance
  headshotKills: number;
  sneakKills: number; // kills while in sneak mode
  knifeDistanceKills: number; // kills at <50px
  noHitsTaken: boolean; // true until player takes damage
  bodiesLooted: number; // enemy corpses looted
  cachesLooted: number; // loot containers looted
  wallsBreached: number; // walls destroyed with TNT
  documentsCollected: number; // lore documents picked up
  terminalsHacked: number; // alarm panels hacked
  distanceTravelled: number; // total pixels walked
  exfilsVisited: Set<string>; // names of exfil points player has been near
  pendingWeapon: PendingWeapon | null; // weapon awaiting player confirmation
  tunnelTimer: number; // (unused, kept for compat)
  propagandaTarget?: string; // enemy id being persuaded
  propagandaTimer: number; // propaganda effect countdown
  dogsNeutralized: number; // dogs neutralized with food
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
  shootPressed: boolean; // true only on the frame mouse/touch goes down
  interact: boolean;
  heal: boolean;
  throwGrenade: boolean;
  cycleThrowable: boolean;
  movementMode: MovementMode;
  moveTarget?: Vec2 | null;
  takeCover: boolean;
  switchWeapon?: 1 | 2 | 3;
  useTNT: boolean;
  useSpecial: boolean; // use item from special slot
}
