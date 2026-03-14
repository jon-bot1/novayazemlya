import { GameState, InputState, Vec2, GameMessage, Particle, Enemy, Bullet, SoundEvent, MovementMode, TacticalRole, PlacedTNT, Item, PendingWeapon } from './types';
import { generateMap, createInitialPlayer } from './map';
import { AbilityId } from './classes';
import { generateFishingVillageMap, createFishingVillagePlayer } from './mapFishingVillage';
import { generateHospitalMap, createHospitalPlayer } from './mapHospital';
import { generateMiningVillageMap, createMiningVillagePlayer, generateMineUndergroundMap, generateMiningSurfaceMap } from './mapMiningVillage';
import { MapId } from './maps';
import { LORE_DOCUMENTS } from './lore';
import { LOOT_POOLS, createFlashbang, createTNT, createGoggles, isSecondaryWeapon, WEAPON_TEMPLATES } from './items';
import { playGunshot, playExplosion, playHit, playPickup, playFootstep, playRadio } from './audio';
import { SpatialGrid, buildSpatialGrid, collidesWithWallsGrid, hasLOSGrid, TerrainGrid, buildTerrainGrid, getTerrainFast } from './spatial';
import { ALERT_LINES, LOST_LINES, INVESTIGATE_LINES, PANIC_LINES, BERSERK_LINES, FLEE_LINES, DEATH_LINES, BOSS_DEATH_MONOLOGUE, KRAVTSOV_DEATH_MONOLOGUE, UZBEK_DEATH_MONOLOGUE, NACHALNIK_DEATH_MONOLOGUE, GRUVRA_DEATH_MONOLOGUE, KRAVTSOV_TAUNTS, UZBEK_TAUNTS, NACHALNIK_TAUNTS, GRUVRA_TAUNTS, KRAVTSOV_PHASES, UZBEK_PHASES, NACHALNIK_PHASES, GRUVRA_PHASES, IDLE_LINES, HIT_LINES, pickLine, AMBIENT_MESSAGES, IDLE_LINES_SWEDISH, ALERT_LINES_SWEDISH, DEATH_LINES_SWEDISH, COMBAT_LINES, RELOAD_LINES, FLANKING_LINES, SUPPRESSING_LINES, ALLY_DOWN_LINES } from './dialogue';
import { hasBloodStains, hasMuzzleFlash, addHitMarker, getNightEnemyBuffs } from './graphics';

// VFX helpers
function addBloodStain(state: GameState, x: number, y: number) {
  if (!hasBloodStains()) return;
  const stains = (state as any)._bloodStains as { x: number; y: number; size: number; angle: number }[];
  if (!stains) return;
  stains.push({ x, y, size: 6 + Math.random() * 10, angle: Math.random() * Math.PI * 2 });
  if (stains.length > 80) stains.shift(); // cap for perf
}

function addMuzzleFlash(state: GameState, x: number, y: number, fromPlayer: boolean) {
  if (!hasMuzzleFlash()) return;
  const flashes = (state as any)._muzzleFlashes as { x: number; y: number; time: number; fromPlayer: boolean }[];
  if (!flashes) return;
  flashes.push({ x, y, time: state.time, fromPlayer });
}

// Kill feed helper — tracks recent kills for HUD rendering
function addKillFeed(state: GameState, enemyType: string, method: string) {
  const feed = (state as any)._killFeed as { text: string; time: number; icon: string }[] || [];
  const icons: Record<string, string> = {
    boss: '💀', sniper: '🎯', heavy: '🪖', soldier: '🔫', scav: '🐀',
    turret: '🏗️', shocker: '⚡', redneck: '🤠', dog: '🐕',
    cultist: '🔮', miner_cult: '⛏️', svarta_sol: '☀️',
  };
  const icon = icons[enemyType] || '☠';
  const typeLabel = enemyType === 'boss' ? 'BOSS' : enemyType.toUpperCase();
  feed.push({ text: `${typeLabel} — ${method}`, time: state.time, icon });
  if (feed.length > 15) feed.splice(0, feed.length - 15);
  (state as any)._killFeed = feed;
}

// Helper: get boss-specific death monologue
function getBossDeathMonologue(enemy: Enemy): string[] {
  const bossId = (enemy as any)._bossId;
  if (bossId === 'kravtsov') return [...KRAVTSOV_DEATH_MONOLOGUE];
  if (bossId === 'uzbek') return [...UZBEK_DEATH_MONOLOGUE];
  if (bossId === 'nachalnik') return [...NACHALNIK_DEATH_MONOLOGUE];
  if (bossId === 'gruvra') return [...GRUVRA_DEATH_MONOLOGUE];
  return [...BOSS_DEATH_MONOLOGUE];
}

// Helper: get boss display name for kill messages
function getBossTitle(enemy: Enemy): string {
  const bossId = (enemy as any)._bossId;
  if (bossId === 'kravtsov') return 'ДОКТОР КРАВЦОВ';
  if (bossId === 'uzbek') return 'УЗБЕК';
  if (bossId === 'nachalnik') return 'NACHALNIK';
  if (bossId === 'gruvra') return 'GRUVRÅ';
  return 'COMMANDANT OSIPOVITJ';
}

function normalizeBossIdentityForMap(state: GameState, mapId: MapId) {
  for (const enemy of state.enemies) {
    if (enemy.type !== 'boss') continue;

    if (mapId === 'fishing_village') {
      (enemy as any)._bossId = 'nachalnik';
      (enemy as any)._bossTitle = 'NACHALNIK';
      (enemy as any)._hookAttack = true;
      (enemy as any)._hookRange = (enemy as any)._hookRange || 55;
      (enemy as any)._hookDamage = (enemy as any)._hookDamage || 60;
    } else if (mapId === 'objekt47') {
      (enemy as any)._bossId = 'osipovitj';
      (enemy as any)._bossTitle = 'COMMANDANT OSIPOVITJ';
    } else if (mapId === 'mining_village') {
      (enemy as any)._bossId = 'gruvra';
      (enemy as any)._bossTitle = 'GRUVRÅ';
      (enemy as any)._caveInAttack = true;
      (enemy as any)._caveInCooldown = (enemy as any)._caveInCooldown || 0;
      (enemy as any)._caveInRadius = (enemy as any)._caveInRadius || 120;
      (enemy as any)._caveInDamage = (enemy as any)._caveInDamage || 45;
    }
  }
}

function getDamageSourceLabel(state: GameState, sourceType?: string, sourceId?: string): string {
  if (sourceType === 'boss') {
    const sourceBoss = state.enemies.find(e => e.id === sourceId && e.type === 'boss');
    return sourceBoss ? getBossTitle(sourceBoss) : 'BOSS';
  }
  if (sourceType === 'sniper') return 'Sniper Tuman';
  return sourceType ? sourceType.toUpperCase() : 'unknown';
}

// Helper: set speech bubble if enemy doesn't already have one
function setSpeech(enemy: Enemy, text: string | null, duration: number = 2.5) {
  if (!text || enemy.speechBubble) return;
  enemy.speechBubble = text;
  enemy.speechBubbleTimer = duration;
}

// === DYNAMIC PATROL ROUTES ON ALLY DEATH ===
// When an enemy dies, nearby allies react: investigate death location, become more alert
function notifyAllyDeath(state: GameState, deadEnemy: Enemy, killMethod: string) {
  const deathPos = { ...deadEnemy.pos };
  for (const ally of state.enemies) {
    if (ally === deadEnemy || ally.state === 'dead' || ally.friendly) continue;
    if (ally.type === 'turret' || ally.type === 'sniper') continue;
    
    const d = dist(ally.pos, deathPos);
    const sameGroup = ally.radioGroup === deadEnemy.radioGroup;
    const inRange = d < 400 || (sameGroup && d < 600);
    if (!inRange) continue;
    
    // 60% investigate death site, 25% boost alertness and continue, 15% ignore
    const reaction = Math.random();
    if (reaction < 0.60) {
      // Investigate where ally died
      ally.investigateTarget = { x: deathPos.x + (Math.random() - 0.5) * 40, y: deathPos.y + (Math.random() - 0.5) * 40 };
      if (ally.state === 'idle' || ally.state === 'patrol' || ally.state === 'alert') {
        ally.state = 'investigate';
      }
      ally.awareness = Math.max(ally.awareness, 0.6);
      setSpeech(ally, pickLine(ALLY_DOWN_LINES, ally.type), 2.5);
    } else if (reaction < 0.85) {
      // Heightened alertness — stay in current state but boost detection
      ally.awareness = Math.max(ally.awareness, 0.45);
      ally.awarenessDecay = Math.max(0.03, ally.awarenessDecay * 0.6);
      ally.alertRange = Math.min(500, ally.alertRange * 1.25);
      if (!ally.speechBubble) setSpeech(ally, pickLine(ALLY_DOWN_LINES, ally.type), 2.0);
    }
    // 15% ignore — no reaction (fog of war, didn't notice)
  }
}

// === WEAPON MASTERY TRACKING ===
// Tracks kills per weapon type on the game state for extraction
function trackWeaponMasteryKill(state: GameState, weaponName: string | undefined, killMethod: string) {
  if (!(state as any)._weaponMasteryKills) (state as any)._weaponMasteryKills = {};
  const kills = (state as any)._weaponMasteryKills as Record<string, number>;
  
  // Determine mastery type
  let type = 'rifle';
  if (killMethod === 'Grenade' || killMethod === 'Mortar' || killMethod === 'TNT') type = 'grenade';
  else if (killMethod === 'Silent Takedown' || killMethod === 'Chokehold' || killMethod === 'Knife') type = 'knife';
  else if (weaponName) {
    const lower = weaponName.toLowerCase();
    if (lower.includes('makarov') || lower.includes('pm') || lower.includes('pistol')) type = 'pistol';
    else if (lower.includes('mosin') || lower.includes('svd') || lower.includes('sniper')) type = 'sniper';
    else if (lower.includes('toz') || lower.includes('shotgun') || lower.includes('12gauge')) type = 'shotgun';
    else if (lower.includes('knife') || lower.includes('kniv')) type = 'knife';
  }
  
  kills[type] = (kills[type] || 0) + 1;
}

// Cached spatial/terrain grids — rebuild on map/state switch or geometry changes
let _wallGrid: SpatialGrid | null = null;
let _wallCount = -1;
let _wallGridStateRef: GameState | null = null;
let _terrainGrid: TerrainGrid | null = null;
let _terrainGridStateRef: GameState | null = null;

function getWallGrid(state: GameState): SpatialGrid {
  if (!_wallGrid || _wallGridStateRef !== state || state.walls.length !== _wallCount) {
    _wallGrid = buildSpatialGrid(state.walls);
    _wallCount = state.walls.length;
    _wallGridStateRef = state;
  }
  return _wallGrid;
}

function getTerrainGrid(state: GameState): TerrainGrid {
  if (!_terrainGrid || _terrainGridStateRef !== state) {
    _terrainGrid = buildTerrainGrid(state.terrainZones, state.mapWidth, state.mapHeight);
    _terrainGridStateRef = state;
  }
  return _terrainGrid;
}

function dist(a: Vec2, b: Vec2) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** Return an approximate position — simulates imprecise radio communication.
 *  Offset is random 40-120px in a random direction. */
function approximatePos(pos: Vec2, inaccuracy = 80): Vec2 {
  const angle = Math.random() * Math.PI * 2;
  const offset = 40 + Math.random() * inaccuracy;
  return { x: pos.x + Math.cos(angle) * offset, y: pos.y + Math.sin(angle) * offset };
}

// ── CONDITIONAL EXFIL HELPERS ──
function checkExfilRequirements(state: GameState, req: string): boolean {
  switch (req) {
    case 'keycard': return (state.player.keycardCount || 0) > 0;
    case 'boss_dead': return state.enemies.some(e => e.type === 'boss' && e.state === 'dead');
    case 'no_alarm': return !state.alarmActive;
    case 'breach': return state.wallsBreached > 0;
    default: return true;
  }
}
function getExfilRequirementMessage(req: string): string {
  switch (req) {
    case 'keycard': return 'Requires keycard 💳';
    case 'boss_dead': return 'Kill the boss first';
    case 'no_alarm': return 'Only available if alarm is OFF';
    case 'breach': return 'Breach a wall first 🧨';
    default: return 'Requirements not met';
  }
}

// Fast squared distance — avoid sqrt when only comparing
function distSq(a: Vec2, b: Vec2) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function normalize(v: Vec2): Vec2 {
  const d = Math.sqrt(v.x * v.x + v.y * v.y);
  if (d === 0) return { x: 0, y: 0 };
  return { x: v.x / d, y: v.y / d };
}

function rectContains(rx: number, ry: number, rw: number, rh: number, px: number, py: number, pr: number = 0) {
  return px + pr > rx && px - pr < rx + rw && py + pr > ry && py - pr < ry + rh;
}

function addMessage(state: GameState, text: string, type: GameMessage['type']) {
  state.messages.push({ text, time: state.time, type });
  if (state.messages.length > 10) state.messages.shift();
}

// Headshot chance — skill-based, no kill-count scaling
function calcHeadshotChance(state: GameState, b: Bullet, enemy: Enemy): number {
  let chance = 0.10; // base 10%
  // Standing still bonus
  const moveLen = Math.abs((state as any)._lastMoveX || 0) + Math.abs((state as any)._lastMoveY || 0);
  if (moveLen < 0.05) chance += 0.10; // standing still +10%
  // Sprinting penalty
  const mode: string = (state as any)._lastMovementMode || 'walk';
  if (mode === 'sprint') chance -= 0.10;
  // Cover bonus (cumulative with standing still)
  if (state.player.inCover) chance += 0.05;
  // Soldier bonus (weaker helmets)
  if (enemy.type === 'soldier') chance += 0.15;
  // Mosin bonus
  if (b.weaponName === 'Mosin-Nagant') chance += 0.20;
  // Upgrade bonus
  chance += (state as any)._critChanceBonus || 0;
  return Math.max(0, Math.min(0.55, chance));
}

// Helper: spawn a weapon as a visible drop on the ground near a position
function spawnWeaponDrop(state: GameState, item: Item, sourcePos: Vec2) {
  // Offset slightly from source so it's visible next to the body/crate
  const angle = Math.random() * Math.PI * 2;
  const offsetDist = 25 + Math.random() * 15;
  const dropPos = {
    x: sourcePos.x + Math.cos(angle) * offsetDist,
    y: sourcePos.y + Math.sin(angle) * offsetDist,
  };
  state.lootContainers.push({
    id: `weapon_drop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    pos: dropPos,
    size: 18,
    items: [item],
    looted: false,
    type: 'weapon_drop',
    _spawnTime: state.time,
  } as any);
}

// Helper: pick up a weapon_drop — equip or swap
function pickupWeaponDrop(state: GameState, lc: import('./types').LootContainer) {
  const item = lc.items[0];
  if (!item) return;

  const lowerName = (item.name || '').toLowerCase();
  const isMeleeWeapon = lowerName.includes('knife') || lowerName.includes('baton');
  const slot: 'melee' | 'secondary' | 'primary' = isMeleeWeapon
    ? 'melee'
    : isSecondaryWeapon(item)
      ? 'secondary'
      : 'primary';

  const currentInSlot = slot === 'primary'
    ? state.player.primaryWeapon
    : slot === 'secondary'
      ? state.player.sidearm
      : state.player.meleeWeapon;

  const setSlotWeapon = (wpn: Item) => {
    if (slot === 'primary') {
      state.player.primaryWeapon = wpn;
      if (state.player.activeSlot === 3) state.player.equippedWeapon = wpn;
    } else if (slot === 'secondary') {
      state.player.sidearm = wpn;
      if (state.player.activeSlot === 2) state.player.equippedWeapon = wpn;
    } else {
      state.player.meleeWeapon = wpn;
      if (state.player.activeSlot === 1) state.player.equippedWeapon = wpn;
    }
  };

  if (!currentInSlot) {
    setSlotWeapon(item);
    state.player.activeSlot = slot === 'primary' ? 3 : slot === 'secondary' ? 2 : 1;
    state.player.equippedWeapon = item;
    state.player.inventory.push(item);
    if (slot !== 'melee' && item.ammoType) setWeaponAmmo(state, item);
    addMessage(state, `🔫 ${item.name} equipped [${slot === 'primary' ? 3 : slot === 'secondary' ? 2 : 1}]!`, 'info');
    lc.looted = true;
    playPickup();
    return;
  }

  if (currentInSlot.name === item.name) {
    // Allow picking up same weapon if current magazine is empty — get full mag
    const currentAmmo = (currentInSlot as any)._loadedAmmo;
    const equippedAmmo = state.player.equippedWeapon === currentInSlot ? state.player.currentAmmo : currentAmmo;
    if (equippedAmmo !== undefined && equippedAmmo <= 0) {
      // Swap to get a full magazine
      const oldIdx = state.player.inventory.indexOf(currentInSlot);
      if (oldIdx >= 0) state.player.inventory.splice(oldIdx, 1);
      setSlotWeapon(item);
      state.player.inventory.push(item);
      if (slot !== 'melee' && item.ammoType) setWeaponAmmo(state, item);
      lc.items = [currentInSlot];
      lc.looted = false;
      addMessage(state, `🔫 Swapped ${item.name} for full magazine!`, 'info');
      playPickup();
      return;
    }
    addMessage(state, `Already have ${item.name}`, 'info');
    return;
  }

  const oldWpn = currentInSlot;
  if (state.player.equippedWeapon === oldWpn) {
    (oldWpn as any)._loadedAmmo = state.player.currentAmmo;
  }
  const oldIdx = state.player.inventory.indexOf(oldWpn);
  if (oldIdx >= 0) state.player.inventory.splice(oldIdx, 1);

  setSlotWeapon(item);
  state.player.inventory.push(item);
  if (slot !== 'melee' && item.ammoType) setWeaponAmmo(state, item);

  lc.items = [oldWpn];
  lc.looted = false;
  addMessage(state, `🔫 Swapped to ${item.name}! (dropped ${oldWpn.name})`, 'info');
  playPickup();
}

const BASE_INVENTORY_SLOTS = 12;

// Centralized magazine size lookup — balanced per weapon tier
const MAG_SIZES: Record<string, number> = {
  'makarov': 8,
  'nagant m1895': 7,
  'baton': 1,
  'combat knife': 1,
  'ppsh': 35,
  'kpist': 36,
  'toz': 2,
  'ak-74': 30,
  'akm': 30,
  'ak 4': 20,
  'mosin': 5,
  'ksp 58': 50,
  'laser': 1,
};

function getMagSize(wpn: Item | null): number {
  if (!wpn) return 8;
  const n = (wpn.name || '').toLowerCase();
  for (const [key, mag] of Object.entries(MAG_SIZES)) {
    if (n.includes(key)) return mag;
  }
  return 8;
}

// Set currentAmmo/maxAmmo when equipping a weapon
function setWeaponAmmo(state: GameState, wpn: Item) {
  const mag = getMagSize(wpn);
  state.player.maxAmmo = mag;
  if (wpn.ammoType) {
    state.player.ammoType = wpn.ammoType;
    // If weapon already has loaded ammo (picked up from world), use that
    const preLoaded = (wpn as any)._loadedAmmo;
    if (preLoaded !== undefined && preLoaded > 0) {
      state.player.currentAmmo = Math.min(mag, preLoaded);
      (wpn as any)._loadedAmmo = undefined;
    } else if (preLoaded === undefined) {
      // Fresh pickup — weapon comes with a full magazine (no reserve cost)
      state.player.currentAmmo = mag;
    } else {
      // Explicitly 0 (emptied by player) — load from reserves
      const available = state.player.ammoReserves[wpn.ammoType] || 0;
      const loaded = Math.min(mag, available);
      state.player.currentAmmo = loaded;
      state.player.ammoReserves[wpn.ammoType] -= loaded;
    }
  }
}

function consumeTNT(state: GameState): boolean {
  const idx = state.player.specialSlot.findIndex(i => i.name === 'TNT Charge');
  if (idx < 0) return false;
  state.player.specialSlot.splice(idx, 1);
  return true;
}

function getTNTCount(state: GameState): number {
  return state.player.specialSlot.filter(i => i.name === 'TNT Charge').length;
}

function countBackpackSlotsUsed(state: GameState): number {
  return state.player.inventory.filter((item) => {
    const isEquippedWeapon = item === state.player.primaryWeapon || item === state.player.sidearm;
    const isThrowable = item.category === 'grenade' || item.category === 'flashbang' || item.category === 'gas_grenade';
    return !isEquippedWeapon && !isThrowable;
  }).length;
}

function canPickupItem(state: GameState, item: Item): boolean {
  // Keys, quest items, access cards always fit (ammo & TNT bypass inventory entirely)
  if (item.category === 'key' || item.id === 'extraction_code' || item.id === 'boss_usb' || item.id === 'nuclear_codebook') return true;
  if (item.category === 'ammo') return true; // goes to vest, not backpack
  if (item.name === 'TNT Charge') return true; // goes to special slot
  // Throwables do not consume backpack slots
  if (item.category === 'grenade' || item.category === 'flashbang' || item.category === 'gas_grenade') {
    // Max 5 total grenades (frag + gas, not counting flashbangs)
    const totalGrenades = state.player.inventory.filter(i => i.category === 'grenade' || i.category === 'gas_grenade').length;
    if (item.category === 'grenade' || item.category === 'gas_grenade') {
      return totalGrenades < 5;
    }
    return true;
  }
  const maxSlots = BASE_INVENTORY_SLOTS + state.backpackCapacity;
  return countBackpackSlotsUsed(state) < maxSlots;
}

function tryPickupItem(state: GameState, item: Item): boolean {
  // Access cards go to dedicated slot, not backpack
  if (item.id === 'gate_keycard') {
    state.player.keycardCount++;
    addMessage(state, `💳 Access Card acquired! (${state.player.keycardCount} held)`, 'intel');
    return true;
  }
  // Ammo goes to vest reserves, not backpack
  if (item.category === 'ammo' && item.ammoType && item.ammoCount) {
    state.player.ammoReserves[item.ammoType] = (state.player.ammoReserves[item.ammoType] || 0) + item.ammoCount;
    // Also add to currentAmmo if matching current weapon
    if (item.ammoType === state.player.ammoType) {
      state.player.currentAmmo += item.ammoCount;
    }
    addMessage(state, `🎯 +${item.ammoCount} ${item.ammoType} (vest)`, 'loot');
    return true;
  }
  // TNT goes to special slot
  if (item.name === 'TNT Charge') {
    state.player.specialSlot.push(item);
    addMessage(state, '🧨 TNT acquired! Press T near any wall to breach!', 'intel');
    return true;
  }
  if (!canPickupItem(state, item)) {
    const maxSlots = BASE_INVENTORY_SLOTS + state.backpackCapacity;
    addMessage(state, `⚠ Backpack full! (${maxSlots} slots)`, 'warning');
    return false;
  }
  state.player.inventory.push(item);
  return true;
}

const MAX_PARTICLES = 200;

function spawnParticles(state: GameState, x: number, y: number, color: string, count: number) {
  // Cap total particles to prevent lag
  const available = MAX_PARTICLES - state.particles.length;
  const actual = Math.min(count, available);
  if (actual <= 0) return;
  for (let i = 0; i < actual; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 2;
    state.particles.push({
      pos: { x, y },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      life: 20 + Math.random() * 20,
      maxLife: 40,
      color,
      size: 1 + Math.random() * 2,
    });
  }
}

// Assign tactical roles to enemies in combat — squad-aware coordination with randomization
function assignTacticalRole(state: GameState, enemy: Enemy) {
  if (enemy.type === 'turret' || enemy.type === 'boss' || enemy.type === 'dog') {
    enemy.tacticalRole = 'none';
    return;
  }

  // Personality-based random override: ~15% chance enemy ignores coordination and picks random role
  if (Math.random() < 0.15) {
    const randomRoles: TacticalRole[] = ['assault', 'flanker', 'suppressor'];
    enemy.tacticalRole = randomRoles[Math.floor(Math.random() * randomRoles.length)];
    return;
  }

  // Count current roles in squad (same radio group or nearby)
  let flankers = 0, suppressors = 0, assaults = 0, squadSize = 0;
  const squadMembers: Enemy[] = [];
  for (const ally of state.enemies) {
    if (ally === enemy || ally.state === 'dead') continue;
    if (ally.type === 'turret' || ally.type === 'boss' || ally.type === 'dog') continue;
    const sameGroup = ally.radioGroup === enemy.radioGroup;
    const closeEnough = distSq(ally.pos, enemy.pos) < 160000; // 400²
    if (!sameGroup && !closeEnough) continue;
    squadMembers.push(ally);
    squadSize++;
    if (ally.tacticalRole === 'flanker') flankers++;
    else if (ally.tacticalRole === 'suppressor') suppressors++;
    else assaults++;
  }

  // Squad composition logic: aim for balanced squad
  // Ideal: 1 suppressor per 3 members, 1 flanker per 2 members, rest assault
  const idealSuppressors = Math.max(1, Math.floor((squadSize + 1) / 3));
  const idealFlankers = Math.max(1, Math.floor((squadSize + 1) / 2));

  // Type-based preferences with squad awareness
  if (enemy.type === 'heavy') {
    // Heavies prefer suppression but can assault if squad has enough suppressors
    if (suppressors < idealSuppressors) enemy.tacticalRole = 'suppressor';
    else enemy.tacticalRole = Math.random() < 0.7 ? 'assault' : 'flanker';
  } else if (enemy.type === 'soldier' || enemy.type === 'svarta_sol') {
    // Soldiers are versatile — fill gaps
    if (flankers < idealFlankers && suppressors >= 1) enemy.tacticalRole = 'flanker';
    else if (suppressors < 1) enemy.tacticalRole = 'suppressor';
    else enemy.tacticalRole = Math.random() < 0.6 ? 'assault' : 'flanker';
  } else if (enemy.type === 'scav' || enemy.type === 'redneck') {
    // Scavs/rednecks mostly rush but occasionally flank
    enemy.tacticalRole = Math.random() < 0.2 ? 'flanker' : 'assault';
  } else if (enemy.type === 'cultist' || enemy.type === 'miner_cult') {
    enemy.tacticalRole = Math.random() < 0.3 ? 'flanker' : 'assault';
  } else {
    enemy.tacticalRole = 'assault';
  }
}

// Check if a target angle is within an enemy's vision/shooting arc
function isInFiringArc(enemy: Enemy, targetX: number, targetY: number): boolean {
  const toTargetAngle = Math.atan2(targetY - enemy.pos.y, targetX - enemy.pos.x);
  let angleDiff = Math.abs(toTargetAngle - enemy.angle);
  if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
  
  const DEG15 = Math.PI * (15 / 180);
  // Bodyguards and boss get wider AND longer arc
  const isBodyguard = !!(enemy as any)._isBodyguard;
  const arcMap: Record<string, number> = {
    scav: Math.PI * 0.385,
    soldier: Math.PI * 0.495,
    heavy: Math.PI * 0.66,
    turret: Math.PI * 0.55,
    boss: Math.PI * 0.77,
    sniper: Math.PI * 0.165,
    shocker: Math.PI * 0.55,
    cultist: Math.PI * 0.44,
    miner_cult: Math.PI * 0.385,
    svarta_sol: Math.PI * 0.55,
  };
  let arc = arcMap[enemy.type] || Math.PI * 0.495;
  if (isBodyguard) arc = Math.PI * 0.75; // much wider arc for elite bodyguards
  
  return angleDiff <= arc;
  }


function sendReinforcementToPlatform(state: GameState, deadGuard: Enemy) {
  if (!deadGuard.elevated) return;
  const platformPos = { ...deadGuard.pos };
  let bestDistSq = 250000; // 500²
  let bestAlly: Enemy | null = null;
  for (const ally of state.enemies) {
    if (ally === deadGuard || ally.state === 'dead' || ally.elevated) continue;
    if (ally.type === 'turret' || ally.type === 'boss') continue;
    const dSq = distSq(ally.pos, platformPos);
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestAlly = ally;
    }
  }
  if (bestAlly) {
    bestAlly.state = 'chase';
    bestAlly.investigateTarget = platformPos;
    (bestAlly as any)._platformTarget = platformPos;
    // Boost speed so they rush there
    bestAlly.speed = Math.max(bestAlly.speed, 2.0);
    addMessage(state, '📻 Guard rushes to the platform!', 'warning');
  } else {
    // No nearby ally — keep the platform prop so it stays visible
  }
  // Mark dead guard as no longer elevated so platform draws independently
  deadGuard.elevated = false;
  // Store platform position for rendering
  state.props.push({ pos: platformPos, w: 36, h: 40, type: 'watchtower' as any, blocksPlayer: true });
}

function generateEnemyLoot(enemy: Enemy) {
  // Preserve any pre-assigned loot (e.g. keycards from map setup)
  const existingLoot = [...enemy.loot];
  
  if (enemy.type === 'turret') return [...existingLoot, ...LOOT_POOLS.military()];
  if (enemy.type === 'dog') return [...existingLoot]; // dogs have no loot
  if (enemy.type === 'redneck') {
    const rLoot = [...existingLoot, ...LOOT_POOLS.common()];
    if (Math.random() < 0.6) rLoot.push(WEAPON_TEMPLATES.toz());
    return rLoot;
  }
  if (enemy.type === 'boss') {
    const bossId = (enemy as any)._bossId;
    const baseLoot = [...existingLoot, ...LOOT_POOLS.military(), ...LOOT_POOLS.body()];
    if (bossId === 'osipovitj') {
      baseLoot.push(
        { id: 'boss_usb', name: 'Osipovitj\'s USB Drive', category: 'valuable' as const, icon: '💾', weight: 0.1, value: 5000, description: 'CRITICAL INTEL — Extract with this to complete the mission!' },
        { id: 'boss_dogtag', name: 'Osipovitj\'s Dogtag', category: 'valuable' as const, icon: '💀', weight: 0.1, value: 1500, description: 'Commandant Osipovitj\'s ID tag — extremely rare' },
      );
    }
    // Kravtsov, Uzbek, Nachalnik keep their pre-assigned loot from map generators
    return baseLoot;
  }
  const poolType = enemy.type === 'heavy' ? 'military' : enemy.type === 'soldier' ? 'military' : enemy.type === 'shocker' ? 'military' : enemy.type === 'svarta_sol' ? 'military' : 'common';
  const baseLoot = [...existingLoot, ...LOOT_POOLS[poolType]()];

  // === OCCULT FACTION LOOT ===
  if (enemy.type === 'cultist') {
    baseLoot.push(
      { id: `cult_relic_${enemy.id}`, name: 'Borealis Relic', category: 'valuable' as const, icon: '🔮', weight: 0.5, value: 350, description: 'A strange crystal idol pulsing with inner light — Ordo Borealis artifact' },
    );
    if (Math.random() < 0.3) baseLoot.push(
      { id: `cult_text_${enemy.id}`, name: 'Cult Scripture', category: 'valuable' as const, icon: '📜', weight: 0.2, value: 200, description: 'Handwritten prayers to Substance Zero — Ordo Borealis document' },
    );
  } else if (enemy.type === 'miner_cult') {
    baseLoot.push(
      { id: `ore_shard_${enemy.id}`, name: 'Black Ore Shard', category: 'valuable' as const, icon: '💎', weight: 0.8, value: 400, description: 'A fragment of the anomalous black ore — warm to the touch' },
    );
    if (Math.random() < 0.25) baseLoot.push(
      { id: `cult_pick_${enemy.id}`, name: 'Ritual Pickaxe', category: 'valuable' as const, icon: '⛏️', weight: 1.5, value: 500, description: 'Ancient pickaxe with runic inscriptions — Stålhandske cult tool' },
    );
  } else if (enemy.type === 'svarta_sol') {
    baseLoot.push(
      { id: `rune_device_${enemy.id}`, name: 'Rune Scanner', category: 'valuable' as const, icon: '📡', weight: 0.4, value: 800, description: 'Advanced runic frequency scanner — Svarta Solen tech' },
    );
    if (Math.random() < 0.4) baseLoot.push(WEAPON_TEMPLATES.ak74());
    if (Math.random() < 0.2) baseLoot.push(
      { id: `hyper_docs_${enemy.id}`, name: 'Hyperborean Dossier', category: 'valuable' as const, icon: '📁', weight: 0.3, value: 1200, description: 'Classified Svarta Solen research on Hyperborean technology — extremely rare' },
    );
  }

  // === WEAPON DROPS — enemies actually carry weapons (rates reduced 15%) ===
  if (enemy.type === 'heavy') {
    const roll = Math.random();
    if (roll < 0.51) baseLoot.push(WEAPON_TEMPLATES.akm());
    else if (roll < 0.51 + 0.425) baseLoot.push(WEAPON_TEMPLATES.ak74());
    if (Math.random() < 0.17) baseLoot.push(WEAPON_TEMPLATES.toz());
  } else if (enemy.type === 'soldier') {
    const roll = Math.random();
    if (roll < 0.34) baseLoot.push(WEAPON_TEMPLATES.ak74());
    else if (roll < 0.34 + 0.30) baseLoot.push(WEAPON_TEMPLATES.akm());
    if (Math.random() < 0.13) baseLoot.push(WEAPON_TEMPLATES.makarov());
  } else if (enemy.type === 'scav') {
    const roll = Math.random();
    if (roll < 0.21) baseLoot.push(WEAPON_TEMPLATES.makarov());
    else if (roll < 0.21 + 0.17) baseLoot.push(WEAPON_TEMPLATES.toz());
    else if (roll < 0.21 + 0.17 + 0.13) baseLoot.push(WEAPON_TEMPLATES.ppsh());
  } else if (enemy.type === 'shocker') {
    const roll = Math.random();
    if (roll < 0.17) baseLoot.push(WEAPON_TEMPLATES.baton());
    else if (roll < 0.34) baseLoot.push(WEAPON_TEMPLATES.knife());
  }

  // Shockers always drop goggles (50% chance)
  if (enemy.type === 'shocker' && Math.random() < 0.5) {
    baseLoot.push(createGoggles());
  }
  // All non-turret/boss enemies have a chance to carry a bandage (for self-healing)
  const bandageChance = enemy.type === 'soldier' ? 0.4 : enemy.type === 'heavy' ? 0.5 : 0.2;
  if (Math.random() < bandageChance) {
    baseLoot.push({ id: `bandage_${enemy.id}`, name: 'Bandage', category: 'medical' as const, icon: '🩹', weight: 0.3, value: 30, healAmount: 15, medicalType: 'bandage' as const, stopsBleeding: 1, description: 'Stops bleeding, restores 15 HP' });
  }
  return baseLoot;
}

// ══════════════════════════════════════════════════════════
// MINE ELEVATOR TRANSITION — swaps map data between surface and underground
// ══════════════════════════════════════════════════════════
function performMineElevatorTransition(state: GameState, direction: 'up' | 'down') {
  const newMap = direction === 'down' ? generateMineUndergroundMap() : generateMiningSurfaceMap();

  // Preserve player state (HP, inventory, ammo, etc.) — only change position
  if (direction === 'down') {
    state.player.pos = { x: 950, y: 50 }; // elevator exit underground
  } else {
    state.player.pos = { x: 950, y: 1700 }; // elevator exit surface
  }

  // Swap all map data
  state.walls = newMap.walls;
  state.enemies = newMap.enemies;
  state.lootContainers = newMap.lootContainers;
  state.documentPickups = newMap.documentPickups;
  state.extractionPoints = newMap.extractionPoints;
  state.alarmPanels = newMap.alarmPanels;
  state.props = newMap.props;
  state.lights = newMap.lights;
  state.windows = newMap.windows;
  state.terrainZones = newMap.terrainZones;
  state.mapWidth = newMap.mapWidth;
  state.mapHeight = newMap.mapHeight;

  // Reset spatial caches
  _wallGrid = null;
  _wallCount = -1;
  _wallGridStateRef = null;
  _terrainGrid = null;
  _terrainGridStateRef = null;

  // Clear transient state
  state.bullets = [];
  state.grenades = [];
  state.placedTNTs = [];
  state.mortarStrikes = [];
  state.particles = [];
  state.soundEvents = [];
  state.alarmActive = false;

  // Camera snap to new position
  state.camera = { x: state.player.pos.x, y: state.player.pos.y };

  // Track current mine level
  (state as any)._mineLevel = direction === 'down' ? 'underground' : 'surface';

  addMessage(state, direction === 'down'
    ? '⛏ UNDERGROUND MINE — The air is thick with dust. Gruvrå awaits in the deep.'
    : '⛏ SURFACE — Fresh air. The village spreads out before you.',
    'intel');
}

export function createGameState(mapId: MapId = 'objekt47', playerLevel: number = 1, extractionCount: number = 0): GameState {
  const map = mapId === 'fishing_village' ? generateFishingVillageMap() : mapId === 'hospital' ? generateHospitalMap() : mapId === 'mining_village' ? generateMiningVillageMap() : generateMap();
  const player = mapId === 'fishing_village' ? createFishingVillagePlayer() : mapId === 'hospital' ? createHospitalPlayer() : mapId === 'mining_village' ? createMiningVillagePlayer() : createInitialPlayer();
  // Hard safety: Sniper Tuman should only exist on Objekt 47
  const mapEnemies = mapId === 'objekt47' ? map.enemies : map.enemies.filter(e => e.type !== 'sniper');

  // === DYNAMIC DIFFICULTY — scale enemy stats based on player progression ===
  // Each level adds ~2% stat boost, each extraction adds ~4%, with per-enemy randomization
  const difficultyBase = 1 + Math.min(0.5, (playerLevel - 1) * 0.02 + extractionCount * 0.04);
  for (const enemy of mapEnemies) {
    // Per-enemy random variance: ±15% so not all enemies are identical
    const variance = 0.85 + Math.random() * 0.30;
    const scale = difficultyBase * variance;
    
    // Don't scale bosses — they're already tuned
    if (enemy.type === 'boss') continue;
    
    // Scale HP, damage, and awareness decay (harder = slower decay)
    enemy.maxHp = Math.round(enemy.maxHp * scale);
    enemy.hp = enemy.maxHp;
    enemy.damage = Math.round(enemy.damage * (0.9 + (scale - 1) * 0.6)); // damage scales slower
    enemy.awarenessDecay = Math.max(0.05, enemy.awarenessDecay / (0.8 + (scale - 1) * 0.5));
    
    // Higher difficulty: slightly faster fire rate (lower = faster)
    if (scale > 1.1) {
      enemy.fireRate = Math.max(300, enemy.fireRate * (1 - (scale - 1) * 0.15));
    }
    
    // Occasional extra enemy alertness at higher levels
    if (difficultyBase > 1.2 && Math.random() < 0.2) {
      enemy.alertRange = Math.min(400, enemy.alertRange * 1.15);
    }
  }
  const state: GameState = {
    player,
    enemies: mapEnemies,
    bullets: [],
    grenades: [],
    placedTNTs: [],
    particles: [],
    lootContainers: map.lootContainers,
    props: map.props,
    alarmPanels: map.alarmPanels,
    alarmActive: false,
    documentPickups: map.documentPickups,
    walls: map.walls,
    extractionPoints: map.extractionPoints,
    lights: map.lights,
    windows: map.windows,
    terrainZones: map.terrainZones,
    camera: { x: player.pos.x, y: player.pos.y },
    mapWidth: map.mapWidth,
    mapHeight: map.mapHeight,
    gameOver: false,
    extracted: false,
    extractionProgress: 0,
    killCount: 0,
    time: 0,
    messages: [{ text: 'MISSION STARTED — Complete objectives and extract alive!', time: 0, type: 'info' }],
    codesFound: [],
    documentsRead: [],
    hasExtractionCode: false,
    hasNuclearCodes: false,
    speedBoostTimer: 0,
    soundEvents: [],
    flashbangTimer: 0,
    backpackCapacity: 0,
    mineFieldZone: mapId === 'objekt47' ? { x: 400, y: 1400, w: 350, h: 300 } : { x: -999, y: -999, w: 0, h: 0 },
    reinforcementTimer: 90 + Math.random() * 30,
    reinforcementsSpawned: 0,
    maxReinforcements: 6,
    coverNearby: false,
    mosinKills: 0,
    grenadeKills: 0,
    tntKills: 0,
    longShots: 0,
    headshotKills: 0,
    sneakKills: 0,
    knifeDistanceKills: 0,
    noHitsTaken: true,
    bodiesLooted: 0,
    cachesLooted: 0,
    wallsBreached: 0,
    documentsCollected: 0,
    terminalsHacked: 0,
    distanceTravelled: 0,
    exfilsVisited: new Set<string>(),
    pendingWeapon: null,
    
    propagandaTimer: 0,
    dogsNeutralized: 0,
    dogsKilled: 0,
    totalDogsOnMap: mapEnemies.filter(e => e.type === 'dog').length,
    emptyMagTimer: 0,
    disguised: false,
    disguiseTimer: 0,
    throwingKnives: 2,
    chokeholdTarget: null,
    chokeholdProgress: 0,
    mortarStrikes: [],
    laserTarget: null,
    fearTimer: 0,
    fearSourcePos: null,
    abilityId: 'none',
    abilityCooldown: 0,
    abilityActive: false,
    abilityTimer: 0,
  };
  // Store map ID for renderer atmosphere differentiation
  (state as any)._mapId = mapId;
  (state as any)._killFeed = [];
  (state as any)._bloodStains = [];
  (state as any)._muzzleFlashes = [];
  normalizeBossIdentityForMap(state, mapId);
  (state as any)._bossNets = [];
  (state as any)._playerNetSlowTimer = 0;
  (state as any)._playerNoiseLevel = 0; // 0-1 noise meter for HUD
  // Post-raid stat tracking
  (state as any)._shotsFired = 0;
  (state as any)._shotsHit = 0;
  (state as any)._damageDealt = 0;
  (state as any)._damageTaken = 0;
  // Weather system — affects gameplay
  const weatherRoll = Math.random();
  const weatherMap: Record<string, { type: string; intensity: number }> = {
    objekt47: weatherRoll < 0.3 ? { type: 'blizzard', intensity: 0.5 + Math.random() * 0.5 } : weatherRoll < 0.6 ? { type: 'snow', intensity: 0.3 + Math.random() * 0.3 } : { type: 'clear', intensity: 0 },
    fishing_village: weatherRoll < 0.4 ? { type: 'fog', intensity: 0.4 + Math.random() * 0.4 } : weatherRoll < 0.7 ? { type: 'rain', intensity: 0.3 + Math.random() * 0.5 } : { type: 'clear', intensity: 0 },
    hospital: weatherRoll < 0.5 ? { type: 'fog', intensity: 0.5 + Math.random() * 0.3 } : { type: 'clear', intensity: 0 },
    mining_village: weatherRoll < 0.3 ? { type: 'dust', intensity: 0.4 + Math.random() * 0.4 } : weatherRoll < 0.6 ? { type: 'rain', intensity: 0.3 + Math.random() * 0.4 } : { type: 'clear', intensity: 0 },
  };
  const weather = weatherMap[mapId] || { type: 'clear', intensity: 0 };
  (state as any)._weather = weather;
  // Ambient events system
  (state as any)._ambientEvents = [];
  (state as any)._nextAmbientEventTime = 20 + Math.random() * 30;
  // Tag extraction points with difficulty multipliers
  for (const ep of state.extractionPoints) {
    // Harder exfils = longer timer = more reward
    if (ep.timer >= 8) (ep as any)._xpMultiplier = 2.0;      // hardest
    else if (ep.timer >= 5) (ep as any)._xpMultiplier = 1.5;  // medium
    else (ep as any)._xpMultiplier = 1.0;                      // easy
  }

  // === SPAWN VALIDATION — nudge enemies out of walls ===
  const spawnGrid = buildSpatialGrid(state.walls);
  for (const enemy of state.enemies) {
    if (collidesWithWallsGrid(spawnGrid, enemy.pos.x, enemy.pos.y, 10)) {
      // Try nudging in 8 directions at increasing distances
      let escaped = false;
      for (let nudgeDist = 20; nudgeDist <= 120 && !escaped; nudgeDist += 20) {
        for (let a = 0; a < 8; a++) {
          const angle = (a / 8) * Math.PI * 2;
          const nx = enemy.pos.x + Math.cos(angle) * nudgeDist;
          const ny = enemy.pos.y + Math.sin(angle) * nudgeDist;
          if (!collidesWithWallsGrid(spawnGrid, nx, ny, 12)) {
            enemy.pos.x = nx;
            enemy.pos.y = ny;
            escaped = true;
            break;
          }
        }
      }
    }
    // Also validate patrol target is reachable and can produce immediate movement
    const patrolDir = normalize({ x: enemy.patrolTarget.x - enemy.pos.x, y: enemy.patrolTarget.y - enemy.pos.y });
    const patrolProbe = tryMoveEnemy(state, enemy.pos, patrolDir.x * 8, patrolDir.y * 8, 10);
    if (
      collidesWithWallsGrid(spawnGrid, enemy.patrolTarget.x, enemy.patrolTarget.y, 10)
      || distSq(patrolProbe, enemy.pos) < 0.01
    ) {
      enemy.patrolTarget = pickPatrolTarget(state, enemy, 80, 180);
    }
  }

  return state;
}

function hasLineOfSight(state: GameState, a: Vec2, b: Vec2, elevated: boolean = false): boolean {
  return hasLOSGrid(getWallGrid(state), a, b, elevated);
}

function collidesWithWalls(state: GameState, x: number, y: number, r: number): boolean {
  return collidesWithWallsGrid(getWallGrid(state), x, y, r);
}

// Check if a position is indoors (walls in all 4 cardinal directions within range)
function isIndoors(state: GameState, pos: Vec2, range: number = 200): boolean {
  const grid = getWallGrid(state);
  const step = 8;
  let hitN = false, hitS = false, hitE = false, hitW = false;
  for (let d = step; d <= range; d += step) {
    if (!hitN && collidesWithWallsGrid(grid, pos.x, pos.y - d, 2)) hitN = true;
    if (!hitS && collidesWithWallsGrid(grid, pos.x, pos.y + d, 2)) hitS = true;
    if (!hitE && collidesWithWallsGrid(grid, pos.x + d, pos.y, 2)) hitE = true;
    if (!hitW && collidesWithWallsGrid(grid, pos.x - d, pos.y, 2)) hitW = true;
    if (hitN && hitS && hitE && hitW) return true;
  }
  return false;
}

function tryMove(state: GameState, pos: Vec2, dx: number, dy: number, r: number): Vec2 {
  let nx = pos.x + dx;
  let ny = pos.y + dy;
  nx = Math.max(r, Math.min(state.mapWidth - r, nx));
  ny = Math.max(r, Math.min(state.mapHeight - r, ny));
  if (!collidesWithWalls(state, nx, ny, r)) return { x: nx, y: ny };
  if (!collidesWithWalls(state, nx, pos.y, r)) return { x: nx, y: pos.y };
  if (!collidesWithWalls(state, pos.x, ny, r)) return { x: pos.x, y: ny };
  return pos;
}

// Check if position is inside minefield
function isInMinefield(state: GameState, x: number, y: number, margin: number = 20): boolean {
  const mz = state.mineFieldZone;
  if (!mz) return false;
  return x > mz.x - margin && x < mz.x + mz.w + margin && y > mz.y - margin && y < mz.y + mz.h + margin;
}

// Enemy-safe move: avoids minefield
function tryMoveEnemy(state: GameState, pos: Vec2, dx: number, dy: number, r: number): Vec2 {
  const newPos = tryMove(state, pos, dx, dy, r);
  // Don't walk into minefield
  if (isInMinefield(state, newPos.x, newPos.y)) return pos;
  return newPos;
}

function findEnemyEscapeStep(state: GameState, pos: Vec2, step: number, r: number): Vec2 | null {
  const seed = Math.random() * Math.PI * 2;
  const stepVariants = [step, Math.max(4, step * 0.75), Math.max(2, step * 0.5), 1.5];

  for (const s of stepVariants) {
    for (let i = 0; i < 32; i++) {
      const a = seed + (i / 32) * Math.PI * 2;
      const candidate = tryMoveEnemy(state, pos, Math.cos(a) * s, Math.sin(a) * s, r);
      if (distSq(candidate, pos) > 0.01) return candidate;
    }
  }
  return null;
}

function pickPatrolTarget(state: GameState, enemy: Enemy, minDistance: number = 90, maxDistance: number = 220): Vec2 {
  const maxX = Math.max(30, state.mapWidth - 30);
  const maxY = Math.max(30, state.mapHeight - 30);

  for (let attempt = 0; attempt < 36; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const range = minDistance + Math.random() * Math.max(10, maxDistance - minDistance);
    const tx = Math.max(30, Math.min(maxX, enemy.pos.x + Math.cos(angle) * range));
    const ty = Math.max(30, Math.min(maxY, enemy.pos.y + Math.sin(angle) * range));

    if (collidesWithWalls(state, tx, ty, 10)) continue;

    const dir = normalize({ x: tx - enemy.pos.x, y: ty - enemy.pos.y });
    const probe = tryMoveEnemy(state, enemy.pos, dir.x * 4, dir.y * 4, 10);
    if (distSq(probe, enemy.pos) < 0.01) continue;

    return { x: tx, y: ty };
  }

  const escape = findEnemyEscapeStep(state, enemy.pos, Math.max(4, enemy.speed), 10);
  if (escape) {
    const tx = Math.max(30, Math.min(maxX, escape.x + (Math.random() - 0.5) * 120));
    const ty = Math.max(30, Math.min(maxY, escape.y + (Math.random() - 0.5) * 120));
    return { x: tx, y: ty };
  }

  return { ...enemy.pos };
}

function relocateEnemyToOpenArea(state: GameState, enemy: Enemy): boolean {
  for (let radius = 16; radius <= 220; radius += 16) {
    const seed = Math.random() * Math.PI * 2;
    for (let i = 0; i < 24; i++) {
      const a = seed + (i / 24) * Math.PI * 2;
      const nx = Math.max(12, Math.min(state.mapWidth - 12, enemy.pos.x + Math.cos(a) * radius));
      const ny = Math.max(12, Math.min(state.mapHeight - 12, enemy.pos.y + Math.sin(a) * radius));
      if (!collidesWithWalls(state, nx, ny, 10) && !isInMinefield(state, nx, ny, 10)) {
        enemy.pos = { x: nx, y: ny };
        return true;
      }
    }
  }
  return false;
}

export function updateGame(state: GameState, input: InputState, dt: number, canvasW: number, canvasH: number): GameState {
  if (state.gameOver || state.extracted) return state;

  // Pause support — if paused flag is set, skip update (timer, AI, etc.)
  if ((state as any)._paused) return state;

  state.time += dt;

  // ═══════ CLASS ABILITY SYSTEM ═══════
  if (state.abilityCooldown > 0) state.abilityCooldown = Math.max(0, state.abilityCooldown - dt);
  if (state.abilityActive && state.abilityTimer > 0) {
    state.abilityTimer -= dt;
    if (state.abilityTimer <= 0) {
      state.abilityActive = false;
      state.abilityTimer = 0;
      const aid = state.abilityId as AbilityId;
      if (aid === 'ghost_mode') addMessage(state, '👻 Ghost Mode ended.', 'info');
      else if (aid === 'adrenaline_rush') addMessage(state, '💥 Adrenaline fading...', 'info');
      else if (aid === 'spotter') addMessage(state, '👁️ Spotter scan complete.', 'info');
    }
  }
  if (input.useAbility && state.abilityId !== 'none' && state.abilityCooldown <= 0 && !state.abilityActive) {
    const aid = state.abilityId as AbilityId;
    let activated = false;
    if (aid === 'adrenaline_rush') {
      state.abilityActive = true; state.abilityTimer = 5;
      addMessage(state, '💥 ADRENALINE RUSH — free sprint for 5s!', 'intel'); activated = true;
    } else if (aid === 'spotter') {
      state.abilityActive = true; state.abilityTimer = 8;
      addMessage(state, '👁️ SPOTTER — all enemies revealed for 8s!', 'intel'); activated = true;
    } else if (aid === 'ghost_mode') {
      state.abilityActive = true; state.abilityTimer = 5;
      addMessage(state, '👻 GHOST MODE — invisible for 5s!', 'intel'); activated = true;
    } else if (aid === 'resupply_drop') {
      const ammoType = state.player.ammoType || '5.45x39';
      state.player.ammoReserves[ammoType] = (state.player.ammoReserves[ammoType] || 0) + 30;
      state.player.currentAmmo = Math.min(state.player.maxAmmo, state.player.currentAmmo + state.player.maxAmmo);
      addMessage(state, '📦 RESUPPLY DROP — ammo restocked!', 'intel'); activated = true;
    } else if (aid === 'airstrike') {
      const aimPos = { x: state.player.pos.x + Math.cos(state.player.angle) * 200, y: state.player.pos.y + Math.sin(state.player.angle) * 200 };
      let hits = 0;
      for (const enemy of state.enemies) {
        if (enemy.state === 'dead') continue;
        const dx = enemy.pos.x - aimPos.x, dy = enemy.pos.y - aimPos.y;
        if (dx * dx + dy * dy < 200 * 200) { enemy.hp -= 150; hits++; if (enemy.hp <= 0) { enemy.state = 'dead'; state.killCount++; } }
      }
      addMessage(state, `💣 ARTILLERY STRIKE — ${hits} targets hit!`, 'intel');
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2, speed = 50 + Math.random() * 150;
        state.particles.push({ pos: { x: aimPos.x + (Math.random() - 0.5) * 100, y: aimPos.y + (Math.random() - 0.5) * 100 }, vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }, life: 0.5 + Math.random() * 0.5, maxLife: 1, color: Math.random() > 0.5 ? '#ff6600' : '#ffaa00', size: 3 + Math.random() * 4 });
      }
      activated = true;
    }
    if (activated) {
      const cds: Record<string, number> = { adrenaline_rush: 60, spotter: 90, ghost_mode: 120, resupply_drop: 90, airstrike: 180 };
      state.abilityCooldown = cds[aid] || 60;
    }
    input.useAbility = false;
  }
  if (state.abilityActive) {
    const aid = state.abilityId as AbilityId;
    if (aid === 'adrenaline_rush') state.player.stamina = state.player.maxStamina;
    (state as any)._ghostMode = aid === 'ghost_mode';
    (state as any)._spotterActive = aid === 'spotter';
  } else {
    (state as any)._ghostMode = false;
    (state as any)._spotterActive = false;
  }

  // === GROUND LOOT TIMEOUT — unlooted items disappear over time ===
  for (let li = state.lootContainers.length - 1; li >= 0; li--) {
    const lc = state.lootContainers[li];
    if (lc.looted) continue;
    // Weapon drops: 60s, regular containers: 180s
    const timeout = lc.type === 'weapon_drop' ? 60 : 180;
    const spawnT = (lc as any)._spawnTime ?? 0; // map-spawned containers use time 0
    if (state.time - spawnT > timeout) {
      state.lootContainers.splice(li, 1);
    }
  }

  // === DEAD ENEMY BODY TIMEOUT — unlooted bodies disappear after 60s ===
  for (const enemy of state.enemies) {
    if (enemy.state !== 'dead' || enemy.looted) continue;
    if ((enemy as any)._deathTime === undefined) continue;
    if (state.time - (enemy as any)._deathTime > 60) {
      enemy.looted = true;
      enemy.loot = [];
    }
  }

  // Stamp _deathTime on freshly dead enemies (centralized — catches all death sources)
  for (const enemy of state.enemies) {
    if (enemy.state === 'dead' && (enemy as any)._deathTime === undefined) {
      (enemy as any)._deathTime = state.time;
    }
  }

  if ((state as any)._elevatorFade > 0) {
    (state as any)._elevatorFade -= dt;
    // Swap map at midpoint (when fully black)
    if (!(state as any)._elevatorSwapped && (state as any)._elevatorFade <= 1.0) {
      (state as any)._elevatorSwapped = true;
      performMineElevatorTransition(state, (state as any)._elevatorFadeDir);
    }
    // Freeze player during fade
    return state;
  }

  // Track HP at start of frame for damage-taken calculation
  const _hpAtFrameStart = state.player.hp;

  // === WEATHER GAMEPLAY EFFECTS ===
  const weather = (state as any)._weather as { type: string; intensity: number } | undefined;
  if (weather && weather.type !== 'clear') {
    // Show weather message on first frame
    if (!(state as any)._weatherAnnounced) {
      (state as any)._weatherAnnounced = true;
      const labels: Record<string, string> = {
        blizzard: '🌨️ Blizzard conditions — reduced visibility and speed!',
        snow: '❄️ Snowfall — slightly reduced visibility.',
        fog: '🌫️ Dense fog — reduced detection range!',
        rain: '🌧️ Rain — sound masked, reduced visibility.',
        dust: '💨 Dust storm — reduced visibility and accuracy!',
      };
      if (labels[weather.type]) addMessage(state, labels[weather.type], 'info');
    }
  }

  // === AMBIENT EVENTS ===
  if (state.time >= ((state as any)._nextAmbientEventTime || 999)) {
    const mapId = (state as any)._mapId as string || 'objekt47';
    const events: Record<string, { msg: string; type: GameMessage['type'] }[]> = {
      objekt47: [
        { msg: '🚁 A helicopter passes in the distance...', type: 'info' },
        { msg: '💥 A distant explosion echoes across the tundra.', type: 'info' },
        { msg: '🐺 Wolf howls pierce the frozen air.', type: 'info' },
        { msg: '📻 Static crackles from a nearby radio...', type: 'info' },
        { msg: '🐦 Ravens scatter from a rooftop above.', type: 'info' },
        { msg: '⚡ A power line sparks in the wind.', type: 'warning' },
        { msg: '🌌 The aurora borealis ripples overhead — greens bleeding into violet.', type: 'info' },
        { msg: '☄️ A pale comet traces a line across the polar sky.', type: 'info' },
        { msg: '🌌 The northern lights pulse — as if breathing. As if listening.', type: 'info' },
        { msg: '📻 Your radio hisses... voices ride the aurora like a carrier wave.', type: 'warning' },
        { msg: '🧭 Your compass needle drifts — drawn toward the lights above.', type: 'info' },
        { msg: '🌙 The Arctic night stretches infinite. The sun will not return for months.', type: 'info' },
      ],
      fishing_village: [
        { msg: '🌊 Waves crash against the rocky shore.', type: 'info' },
        { msg: '🚢 A foghorn sounds from somewhere offshore.', type: 'info' },
        { msg: '🐦 Seagulls cry overhead.', type: 'info' },
        { msg: '⚓ Chains rattle on an abandoned dock.', type: 'info' },
        { msg: '💥 Something heavy falls in a warehouse nearby.', type: 'warning' },
        { msg: '🎣 Far out on the black ice, a lantern flickers — fishermen, or ghosts.', type: 'info' },
        { msg: '🌊 The Barents Sea groans beneath the ice — ancient, patient, cold.', type: 'info' },
        { msg: '🌌 The aurora dances above the frozen coast, painting the ice in emerald.', type: 'info' },
        { msg: '📻 Radio frequencies shimmer with the aurora — words in no known language.', type: 'warning' },
        { msg: '🧊 Ice fishermen\'s holes dot the horizon. Their lanterns blink like fallen stars.', type: 'info' },
        { msg: '☄️ A comet burns silently above the Barents. The old fishermen call it an omen.', type: 'info' },
        { msg: '🌙 Polarnatt. The darkness here has weight — it presses down on everything.', type: 'info' },
      ],
      hospital: [
        { msg: '💡 Fluorescent lights flicker and buzz.', type: 'info' },
        { msg: '🚪 A door slams shut somewhere below.', type: 'warning' },
        { msg: '📞 A phone rings unanswered in the darkness.', type: 'info' },
        { msg: '🐀 Rats scurry across the floor.', type: 'info' },
        { msg: '⚡ The generator stutters — lights dim briefly.', type: 'warning' },
        { msg: '🌌 Through the barred windows, the aurora writhes — colors that shouldn\'t exist.', type: 'info' },
        { msg: '📻 The PA system crackles with aurora interference — a voice whispers coordinates.', type: 'warning' },
        { msg: '🌙 Outside, the polar night swallows the world whole.', type: 'info' },
      ],
      mining_village: [
        { msg: '⛏️ Pickaxes echo from deep in the tunnels.', type: 'info' },
        { msg: '💨 A gust of warm air rises from the mine shaft.', type: 'info' },
        { msg: '🪨 Pebbles rain down from above.', type: 'warning' },
        { msg: '📻 Chanting can be heard faintly below...', type: 'info' },
        { msg: '💥 A distant cave-in rumbles through the ground.', type: 'warning' },
        { msg: '🌌 Above the pines, the aurora pulses in time with the mountain\'s heartbeat.', type: 'info' },
        { msg: '🧭 Your father\'s compass spins — the aurora and the mountain pull in opposite directions.', type: 'info' },
        { msg: '📻 Signals dance on aurora frequencies — someone is transmitting from below.', type: 'warning' },
        { msg: '☄️ The comet hangs above Norrberget like a watchful eye.', type: 'info' },
        { msg: '🌙 The polar night is absolute here. The mountain drinks what little light remains.', type: 'info' },
      ],
    };
    const pool = events[mapId] || events.objekt47;
    const evt = pool[Math.floor(Math.random() * pool.length)];
    addMessage(state, evt.msg, evt.type);
    (state as any)._nextAmbientEventTime = state.time + 30 + Math.random() * 40;
  }

  // Nachalnik net status
  if ((state as any)._playerNetSlowTimer > 0) {
    (state as any)._playerNetSlowTimer = Math.max(0, (state as any)._playerNetSlowTimer - dt);
  }
  if ((state as any)._netCast) {
    (state as any)._netCast.timer -= dt;
    if ((state as any)._netCast.timer <= 0) (state as any)._netCast = null;
  }

  // Decay screenshake
  if ((state as any)._screenShake > 0) {
    (state as any)._screenShake = Math.max(0, (state as any)._screenShake - dt * 4);
  }

  // Init blood stains array if needed
  if (!(state as any)._bloodStains) (state as any)._bloodStains = [];
  // Init muzzle flashes array if needed  
  if (!(state as any)._muzzleFlashes) (state as any)._muzzleFlashes = [];
  // Decay muzzle flashes
  const flashes = (state as any)._muzzleFlashes as { x: number; y: number; time: number; fromPlayer: boolean }[];
  for (let i = flashes.length - 1; i >= 0; i--) {
    if (state.time - flashes[i].time > 0.08) flashes.splice(i, 1);
  }

  // Player movement — blocked when flashbanged (stunned)
  let moveX = input.moveX;
  let moveY = input.moveY;

  // Flashbang stun: freeze player, dizzy camera
  if (state.flashbangTimer > 0) {
    moveX = 0;
    moveY = 0;
    input.shooting = false;
    input.shootPressed = false;
    input.moveTarget = null;
    // Camera wobble for dizzy effect
    state.camera.x += Math.sin(state.time * 12) * 3;
    state.camera.y += Math.cos(state.time * 9) * 3;
  }

  // Kravtsov fear effect: forced flee away from source, can't shoot
  if (state.fearTimer > 0) {
    state.fearTimer = Math.max(0, state.fearTimer - dt);
    input.shooting = false;
    input.shootPressed = false;
    input.moveTarget = null;
    if (state.fearSourcePos) {
      const fdx = state.player.pos.x - state.fearSourcePos.x;
      const fdy = state.player.pos.y - state.fearSourcePos.y;
      const fd = Math.sqrt(fdx * fdx + fdy * fdy) || 1;
      moveX = fdx / fd;
      moveY = fdy / fd;
    }
    // Camera shake — panic effect
    state.camera.x += (Math.random() - 0.5) * 4;
    state.camera.y += (Math.random() - 0.5) * 4;
    if (state.fearTimer <= 0) {
      state.fearSourcePos = null;
      addMessage(state, '😤 Fear subsides — you regain control!', 'info');
    }
  }

  if (input.moveTarget) {
    const dx = input.moveTarget.x - state.player.pos.x;
    const dy = input.moveTarget.y - state.player.pos.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 8) {
      moveX = dx / d;
      moveY = dy / d;
      // Auto-interact when close enough to target (for tap-to-interact)
      if (d < 50) {
        input.interact = true;
      }
    } else {
      // Arrived at target — trigger interact in case we tapped on something
      input.interact = true;
      input.moveTarget = null;
      moveX = 0;
      moveY = 0;
    }
  }

  // Input deadzone to prevent drift (especially touch/controller edge-cases)
  if (Math.abs(moveX) < 0.12) moveX = 0;
  if (Math.abs(moveY) < 0.12) moveY = 0;

  const moveLen = Math.sqrt(moveX ** 2 + moveY ** 2);
  
  // Movement speed based on mode
  const sneakBonus = (state as any)._sneakSpeedBonus || 0;
  const speedMultipliers: Record<MovementMode, number> = { sneak: 0.35 * (1 + sneakBonus), walk: 0.85, sprint: 1.815 }; // sprint +10%
  // Weight penalty: every 5kg over 3kg = 5% speed loss
  const totalWeight = state.player.inventory.reduce((s, i) => s + i.weight, 0);
  const weightPenalty = Math.max(0, (totalWeight - 3) / 5) * 0.05;
  const baseSpeed = state.player.speed * speedMultipliers[input.movementMode] * (1 - Math.min(0.35, weightPenalty));
  
  // Stamina system: sprinting drains stamina, walking/sneaking recovers it
  if (input.movementMode === 'sprint' && moveLen > 0.1) {
    state.player.stamina = Math.max(0, state.player.stamina - 7.34 * dt);
  } else if (input.movementMode === 'sneak') {
    state.player.stamina = Math.min(state.player.maxStamina, state.player.stamina + 8 * dt);
  } else {
    state.player.stamina = Math.min(state.player.maxStamina, state.player.stamina + 12 * dt);
  }
  // Force walk if stamina depleted
  const effectiveMode = (input.movementMode === 'sprint' && state.player.stamina <= 0) ? 'walk' : input.movementMode;
  const finalSpeed = effectiveMode === 'sprint' ? baseSpeed : state.player.speed * speedMultipliers[effectiveMode] * (1 - Math.min(0.35, weightPenalty));
  const netSlowTimer = Math.max(0, (state as any)._playerNetSlowTimer || 0);
  (state as any)._playerNetSlowTimer = netSlowTimer;
  const netSlowMult = netSlowTimer > 0 ? 0.48 : 1;
  // Weather speed modifier
  const weatherSpeedMod = (() => {
    const w = (state as any)._weather as { type: string; intensity: number } | undefined;
    if (!w || w.type === 'clear') return 1;
    if (w.type === 'blizzard') return 1 - w.intensity * 0.20; // up to -20%
    if (w.type === 'rain') return 1 - w.intensity * 0.08;    // up to -8%
    if (w.type === 'dust') return 1 - w.intensity * 0.12;    // up to -12%
    return 1;
  })();
  const playerSpeed = (state.speedBoostTimer > 0 ? finalSpeed * 1.5 : finalSpeed) * netSlowMult * weatherSpeedMod;
  // Store movement state for headshot calc
  (state as any)._lastMoveX = moveX;
  (state as any)._lastMoveY = moveY;
  (state as any)._lastMovementMode = effectiveMode;

  // Pre-compute terrain multiplier for footsteps + noise meter (used in both branches)
  const tg = getTerrainGrid(state);
  const terrain = getTerrainFast(tg, state.player.pos.x, state.player.pos.y);
  let terrainMult = 1.0;
  if (terrain === 'concrete' || terrain === 'asphalt') terrainMult = 1.4;
  else if (terrain === 'dirt') terrainMult = 0.8;
  else if (terrain === 'forest') terrainMult = 0.6;

  if (moveLen > 0.1) {
    const speed = playerSpeed * dt * 60;
    const dir = normalize({ x: moveX, y: moveY });
    let newPos = tryMove(state, state.player.pos, dir.x * speed, dir.y * speed, 15);
    // Block player from walking onto platform props (enemies can use them)
    for (const p of state.props) {
      if (p.blocksPlayer && rectContains(p.pos.x - p.w / 2, p.pos.y - p.h / 2, p.w, p.h, newPos.x, newPos.y, 15)) {
        newPos = state.player.pos;
        break;
      }
    }
    // MINEFIELD CHECK — instant death
    const mz = state.mineFieldZone;
    if (mz && rectContains(mz.x, mz.y, mz.w, mz.h, newPos.x, newPos.y, 6)) {
      state.player.hp = -50; // massive damage, injector can still save
      state.deathCause = '💥 Stepped on a landmine';
      addMessage(state, '💥 MINE! You stepped on a landmine!', 'damage');
      playExplosion();
      (state as any)._screenShake = 1.0;
      spawnParticles(state, newPos.x, newPos.y, '#ff4400', 25);
      spawnParticles(state, newPos.x, newPos.y, '#ffcc44', 20);
      state.soundEvents.push({ pos: { ...newPos }, radius: 500, time: state.time });
    }
    // Track distance travelled
    state.distanceTravelled += dist(state.player.pos, newPos);
    state.player.pos = newPos;

    
    // Moving breaks hiding (not auto-cover)
    if ((state as any)._playerHiding) {
      (state as any)._playerHiding = false;
      state.player.peeking = false;
      addMessage(state, '🧍 No longer hidden', 'info');
    }
    
    // Footstep sounds + sound propagation
  // === AUTO-COVER: automatically apply cover when near obstacles ===
  const coverQualityMap: Record<string, { quality: number; label: string; coverType: 'high' | 'low' }> = {
    concrete_barrier: { quality: 0.90, label: 'HIGH COVER', coverType: 'high' },
    sandbags:         { quality: 0.85, label: 'HIGH COVER', coverType: 'high' },
    vehicle_wreck:    { quality: 0.85, label: 'HIGH COVER', coverType: 'high' },
    guard_booth:      { quality: 0.85, label: 'HIGH COVER', coverType: 'high' },
    watchtower:       { quality: 0.80, label: 'HIGH COVER', coverType: 'high' },
    metal_shelf:      { quality: 0.75, label: 'HIGH COVER', coverType: 'high' },
    barrel_stack:     { quality: 0.70, label: 'LOW COVER', coverType: 'low' },
    wood_crate:       { quality: 0.65, label: 'LOW COVER', coverType: 'low' },
    equipment_table:  { quality: 0.55, label: 'LOW COVER', coverType: 'low' },
    tree:             { quality: 0.50, label: 'LOW COVER', coverType: 'low' },
    pine_tree:        { quality: 0.50, label: 'LOW COVER', coverType: 'low' },
    bush:             { quality: 0.30, label: 'CONCEALMENT', coverType: 'low' },
    fence_h:          { quality: 0.25, label: 'CONCEALMENT', coverType: 'low' },
    fence_v:          { quality: 0.25, label: 'CONCEALMENT', coverType: 'low' },
  };

  // Find nearest cover object + hide check — combined single prop loop
  let bestCoverDistSq = 40 * 40;
  let bestCoverPos: Vec2 | null = null;
  let bestCoverQuality = 0;
  let bestCoverLabel = '';
  let bestCoverType: 'high' | 'low' = 'low';
  let canHideNow = false;
  const px = state.player.pos.x, py = state.player.pos.y;
  const hidePropsSet = new Set(['tree', 'pine_tree', 'bush']);
  for (const prop of state.props) {
    const dx = px - prop.pos.x, dy = py - prop.pos.y;
    const dsq = dx * dx + dy * dy;
    if (dsq < bestCoverDistSq) {
      bestCoverDistSq = dsq;
      bestCoverPos = { x: prop.pos.x, y: prop.pos.y };
      const cq = coverQualityMap[prop.type];
      bestCoverQuality = cq ? cq.quality : 0.60;
      bestCoverLabel = cq ? cq.label : 'COVER';
      bestCoverType = cq ? cq.coverType : 'low';
    }
    // Combined hide check — only if not already hiding
    if (!canHideNow && !(state as any)._playerHiding && hidePropsSet.has(prop.type) && dsq < 45 * 45) {
      canHideNow = true;
    }
  }
  // Wall cover — use spatial grid for fast lookup instead of iterating all walls
  const nearbyWalls = getWallGrid(state);
  const wallCheckDist = 60;
  const minCx = Math.floor((px - wallCheckDist) / nearbyWalls.cellSize);
  const maxCx = Math.floor((px + wallCheckDist) / nearbyWalls.cellSize);
  const minCy = Math.floor((py - wallCheckDist) / nearbyWalls.cellSize);
  const maxCy = Math.floor((py + wallCheckDist) / nearbyWalls.cellSize);
  for (let ccx = minCx; ccx <= maxCx; ccx++) {
    for (let ccy = minCy; ccy <= maxCy; ccy++) {
      const key = `${ccx},${ccy}`;
      const walls = nearbyWalls.cells.get(key);
      if (!walls) continue;
      for (const wall of walls) {
        const wx = wall.x + wall.w / 2;
        const wy = wall.y + wall.h / 2;
        const dx = px - wx, dy = py - wy;
        const dsq = dx * dx + dy * dy;
        if (dsq < bestCoverDistSq) {
          bestCoverDistSq = dsq;
          bestCoverPos = { x: wx, y: wy };
          bestCoverQuality = 0.90;
          bestCoverLabel = 'HIGH COVER';
          bestCoverType = 'high';
        }
      }
    }
  }
  (state as any)._canHide = canHideNow;
  (state as any)._isHiding = !!(state as any)._playerHiding;
  
  playFootstep(input.movementMode);
    // Sound propagation — sprinting is VERY loud, walking moderate, sneak nearly silent
    const footstepRadius: Record<MovementMode, number> = { sneak: 20, walk: 60, sprint: 200 };
    const footstepChance: Record<MovementMode, number> = { sneak: 0.005, walk: 0.04, sprint: 0.2 };
    // terrainMult already computed above
    if (Math.random() < footstepChance[effectiveMode]) {
      let stepRadius = footstepRadius[effectiveMode] * terrainMult;
      const silentBonus = (state as any)._noiseReduction || 0;
      if (silentBonus > 0) stepRadius *= (1 - silentBonus);
      state.soundEvents.push({ pos: { ...state.player.pos }, radius: stepRadius, time: state.time });
    }
  }

  // === NOISE METER — compute player noise level for HUD ===
  {
    const baseNoise: Record<MovementMode, number> = { sneak: 0.05, walk: 0.25, sprint: 0.75 };
    let noise = baseNoise[effectiveMode] || 0.25;
    // Reuse terrain multiplier from footstep calculation above (same position, same frame)
    noise *= terrainMult;
    const silentBonusN = (state as any)._noiseReduction || 0;
    if (silentBonusN > 0) noise *= (1 - silentBonusN);
    if ((state as any)._playerHiding) noise = 0;
    else if (state.player.inCover && !state.player.peeking) noise *= 0.5;
    // Gunfire spike — recent shots massively increase noise
    const recentShots = state.soundEvents.filter(se => state.time - se.time < 0.5 && se.radius >= 100);
    if (recentShots.length > 0) noise = Math.min(1, noise + 0.5);
    // Smooth the noise value
    const prevNoise = (state as any)._playerNoiseLevel || 0;
    (state as any)._playerNoiseLevel = prevNoise + (noise - prevNoise) * Math.min(1, dt * 8);
  }

  // Hide flags already set in combined cover+hide loop above

  // === HIDE SYSTEM (Q key) — hide at trees/bushes, become invisible ===
  if (input.takeCover) {
    input.takeCover = false;
    if ((state as any)._playerHiding) {
      // Stop hiding
      (state as any)._playerHiding = false;
      state.player.peeking = false;
      addMessage(state, '🧍 No longer hidden', 'info');
    } else {
      // Check for nearby tree, pine_tree, or bush to hide in
      const hideProps = ['tree', 'pine_tree', 'bush'];
      let bestHideDist = 45;
      let bestHideProp: any = null;
      for (const prop of state.props) {
        if (!hideProps.includes(prop.type)) continue;
        const d = dist(state.player.pos, prop.pos);
        if (d < bestHideDist) {
          bestHideDist = d;
          bestHideProp = prop;
        }
      }
      if (bestHideProp) {
        (state as any)._playerHiding = true;
        (state as any)._hidePos = { ...bestHideProp.pos };
        (state as any)._hidePropType = bestHideProp.type;
        state.player.inCover = true;
        state.player.coverObject = { ...bestHideProp.pos };
        state.player.coverQuality = 1.0;
        state.player.coverLabel = 'HIDDEN';
        state.player.peeking = false;
        state.player.pos = { x: bestHideProp.pos.x, y: bestHideProp.pos.y };
        addMessage(state, '🌲 HIDING — enemies cannot see you. Move or shoot to reveal.', 'info');
        // Make enemies lose track
        for (const enemy of state.enemies) {
          if (enemy.state === 'dead') continue;
          if (enemy.state === 'chase' || enemy.state === 'attack' || enemy.state === 'flank' || enemy.state === 'suppress') {
            enemy.state = 'investigate';
            enemy.investigateTarget = { ...state.player.pos };
          }
        }
      } else {
        addMessage(state, '⚠ No tree or bush nearby to hide in!', 'warning');
      }
    }
  }

  // === DISGUISE SYSTEM ===
  if (state.disguised) {
    state.disguiseTimer -= dt;
    // Disguise breaks on shooting, sprinting, or timer expiry
    if (state.disguiseTimer <= 0 || input.shooting || effectiveMode === 'sprint') {
      state.disguised = false;
      state.disguiseTimer = 0;
      const reason = input.shooting ? 'shooting' : effectiveMode === 'sprint' ? 'sprinting' : 'time';
      addMessage(state, `⚠ DISGUISE BLOWN — ${reason}!`, 'warning');
      spawnParticles(state, state.player.pos.x, state.player.pos.y, '#ff4444', 8);
      // All nearby enemies become immediately aware
      for (const e of state.enemies) {
        if (e.state === 'dead') continue;
        if (dist(e.pos, state.player.pos) < 200) {
          e.awareness = 1.0;
        }
      }
    }
  }

  // === CHOKEHOLD (hold E behind unaware enemy) ===
  if (state.chokeholdTarget) {
    const target = state.enemies.find(e => e.id === state.chokeholdTarget);
    if (!target || target.state === 'dead' || dist(state.player.pos, target.pos) > 60 || (state as any)._lastMovementMode !== 'sneak') {
      // Cancel chokehold
      state.chokeholdTarget = null;
      state.chokeholdProgress = 0;
      if (target && target.state !== 'dead') addMessage(state, '⚠ Chokehold broken!', 'warning');
    } else {
      state.chokeholdProgress += dt;
      // Lock player position next to enemy
      state.player.pos = { x: target.pos.x - Math.cos(target.angle) * 20, y: target.pos.y - Math.sin(target.angle) * 20 };
      if (state.chokeholdProgress >= 2.0) {
        // Complete — silent kill
        target.hp = 0;
        target.state = 'dead';
        setSpeech(target, '...💀', 1.5);
        sendReinforcementToPlatform(state, target);
        target.loot = generateEnemyLoot(target);
        state.killCount++;
        state.sneakKills++;
        if (target.type === 'dog') state.dogsKilled++;
        addKillFeed(state, target.type, 'Chokehold');
        addMessage(state, `🤫 CHOKEHOLD KILL — completely silent!`, 'kill');
        spawnParticles(state, target.pos.x, target.pos.y, '#8844cc', 10);
        notifyAllyDeath(state, target, 'Chokehold');
        trackWeaponMasteryKill(state, undefined, 'Chokehold');
        state.chokeholdTarget = null;
        state.chokeholdProgress = 0;
      }
    }
  } else if (input.interact && (state as any)._lastMovementMode === 'sneak') {
    // Try to initiate chokehold on nearby unaware enemy
    for (const e of state.enemies) {
      if (e.state === 'dead' || e.type === 'boss' || e.type === 'turret') continue;
      if (e.awareness >= 0.5 || dist(state.player.pos, e.pos) > 55) continue;
      // Must be behind enemy
      const toEnemyAngle = Math.atan2(e.pos.y - state.player.pos.y, e.pos.x - state.player.pos.x);
      let aDiff = Math.abs(toEnemyAngle - e.angle);
      if (aDiff > Math.PI) aDiff = Math.PI * 2 - aDiff;
      if (aDiff < Math.PI * 0.4) { // behind them
        state.chokeholdTarget = e.id;
        state.chokeholdProgress = 0;
        addMessage(state, '🤫 CHOKEHOLD... hold still (2s)', 'info');
        input.interact = false; // consume
        break;
      }
    }
  }

  // === THROWN KNIFE (F key) — silent ranged kill ===
  if (input.throwKnife) {
    input.throwKnife = false;
    if (state.throwingKnives > 0) {
      state.throwingKnives--;
      const knifeAngle = state.player.angle;
      const knifeSpeed = 7;
      state.bullets.push({
        pos: { ...state.player.pos },
        vel: { x: Math.cos(knifeAngle) * knifeSpeed, y: Math.sin(knifeAngle) * knifeSpeed },
        damage: 80, // high damage — one-shot most enemies
        damageType: 'melee',
        fromPlayer: true,
        life: 35,
        weaponName: 'Throwing Knife',
      });
      addMessage(state, `🗡️ Knife thrown! (${state.throwingKnives} left)`, 'info');
      // Very quiet — small sound radius
      state.soundEvents.push({ pos: { ...state.player.pos }, radius: 30, time: state.time });
    } else {
      addMessage(state, '⚠ No throwing knives left!', 'warning');
    }
  }

  // === THROW DISTRACTION ROCK (Middle click / C key) ===
  if (input.throwRock) {
    input.throwRock = false;
    // Throw rock to where mouse is pointing (world position)
    const rockTargetX = state.camera.x + input.aimX;
    const rockTargetY = state.camera.y + input.aimY;
    const rockDist = dist(state.player.pos, { x: rockTargetX, y: rockTargetY });
    const maxRockDist = 250;
    const clampedDist = Math.min(rockDist, maxRockDist);
    const angle = Math.atan2(rockTargetY - state.player.pos.y, rockTargetX - state.player.pos.x);
    const landPos = {
      x: state.player.pos.x + Math.cos(angle) * clampedDist,
      y: state.player.pos.y + Math.sin(angle) * clampedDist,
    };
    // Create sound event at landing position (moderate noise — attracts enemies)
    state.soundEvents.push({ pos: { ...landPos }, radius: 180, time: state.time });
    // Visual tracking
    if (!(state as any)._thrownRocks) (state as any)._thrownRocks = [];
    (state as any)._thrownRocks.push({ pos: { ...landPos }, time: state.time });
    // Clean old rocks
    (state as any)._thrownRocks = (state as any)._thrownRocks.filter((r: any) => state.time - r.time < 4);
    addMessage(state, '🪨 Rock thrown — enemies will investigate', 'info');
    // Very quiet throw sound from player position
    state.soundEvents.push({ pos: { ...state.player.pos }, radius: 15, time: state.time });
  }

  // Peek fire — shooting while in cover (breaks hiding)
  if (state.player.inCover) {
    state.player.peeking = input.shooting;
    if ((state as any)._playerHiding && input.shooting) {
      (state as any)._playerHiding = false;
      addMessage(state, '⚠ Revealed by shooting!', 'warning');
    }
  }

  // === WEAPON DROP PICKUP (E near weapon_drop) ===
  // Only pick up weapons if NO container/alarm/document is closer (prevents cycling)
  if (input.interact) {
    let nearestContainerDist = Infinity;
    for (const lc of state.lootContainers) {
      if (lc.type === 'weapon_drop' || lc.looted) continue;
      const d = dist(state.player.pos, lc.pos);
      if (d < 70 && d < nearestContainerDist) nearestContainerDist = d;
    }
    for (const dp of state.documentPickups) {
      if (dp.collected) continue;
      const d = dist(state.player.pos, dp.pos);
      if (d < 70 && d < nearestContainerDist) nearestContainerDist = d;
    }
    for (const ap of state.alarmPanels) {
      if (ap.hacked) continue;
      const d = dist(state.player.pos, ap.pos);
      if (d < 70 && d < nearestContainerDist) nearestContainerDist = d;
    }
    // Only pick up weapon drop if nothing else interactive is closer
    if (nearestContainerDist > 70) {
      for (const lc of state.lootContainers) {
        if (lc.type !== 'weapon_drop' || lc.looted) continue;
        if (dist(state.player.pos, lc.pos) < 60 && hasLineOfSight(state, state.player.pos, lc.pos)) {
          pickupWeaponDrop(state, lc);
          input.interact = false; // consume E press
          break;
        }
      }
    }
  }

  // Speed boost countdown
  if (state.speedBoostTimer > 0) {
    state.speedBoostTimer = Math.max(0, state.speedBoostTimer - dt);
  }
  // Decay reload complete flash
  if ((state as any)._reloadCompleteFlash > 0) {
    (state as any)._reloadCompleteFlash = Math.max(0, (state as any)._reloadCompleteFlash - dt * 2);
  }


  // === USE SPECIAL ITEM (X key) ===
  if (input.useSpecial) {
    input.useSpecial = false;
    
    // === DISGUISE — priority check: put on uniform if available and near body ===
    if ((state as any)._disguiseAvailable && !state.disguised) {
      const dPos = (state as any)._disguisePos;
      if (dPos && dist(state.player.pos, dPos) < 90) {
        state.disguised = true;
        state.disguiseTimer = 45;
        (state as any)._disguiseAvailable = false;
        delete (state as any)._disguisePos;
        addMessage(state, '🥷 DISGUISE ON — enemies ignore you! Shooting or sprinting breaks it.', 'intel');
        spawnParticles(state, state.player.pos.x, state.player.pos.y, '#66aa44', 10);
      } else {
        addMessage(state, '⚠ Move closer to the body to put on disguise!', 'warning');
      }
    } else {
      // Normal special item usage
      const specialItems = state.player.specialSlot;
      const usableIdx = specialItems.findIndex(i => i.name !== 'TNT Charge');
      if (usableIdx >= 0) {
        const item = specialItems[usableIdx];
        if (item.name === 'Propaganda Leaflet') {
          let closest: Enemy | null = null;
          let closestD = 100;
          for (const e of state.enemies) {
            if (e.state === 'dead' || e.type === 'boss' || e.type === 'turret' || e.type === 'sniper' || e.type === 'dog' || e.friendly || (e as any)._isBodyguard) continue;
            const d = dist(state.player.pos, e.pos);
            if (d < closestD) { closestD = d; closest = e; }
          }
          if (closest) {
            closest.friendly = true;
            closest.friendlyTimer = 60;
            closest.state = 'chase';
            specialItems.splice(usableIdx, 1);
            addMessage(state, `📢 ${closest.type.toUpperCase()} CONVINCED — fights for you for 60s!`, 'info');
            spawnParticles(state, closest.pos.x, closest.pos.y, '#44ff44', 12);
          } else {
            addMessage(state, '⚠ No enemy nearby to convince!', 'warning');
          }
        } else if (item.name === 'Dog Food') {
          let closest: Enemy | null = null;
          let closestD = 80;
          for (const e of state.enemies) {
            if (e.state === 'dead' || e.type !== 'dog' || e.neutralized) continue;
            const d = dist(state.player.pos, e.pos);
            if (d < closestD) { closestD = d; closest = e; }
          }
          if (closest) {
            closest.neutralized = true;
            closest.neutralizedTimer = 20;
            closest.state = 'idle';
            closest.speed = 0.3;
            specialItems.splice(usableIdx, 1);
            state.dogsNeutralized++;
            addMessage(state, '🦴 Dog neutralized — it loses interest!', 'info');
            spawnParticles(state, closest.pos.x, closest.pos.y, '#ffcc66', 8);
          } else {
            addMessage(state, '⚠ No dog nearby!', 'warning');
          }
        }
      } else {
        addMessage(state, '⚠ No special items! Buy from Delyets.', 'warning');
      }
    }
  }

  // === PROPAGANDA TIMER ===
  if (state.propagandaTimer > 0) {
    state.propagandaTimer -= dt;
  }

  // === COMBINED ENEMY TIMER PASS (neutralized + friendly + speech bubbles) ===
  for (const e of state.enemies) {
    if (e.state === 'dead') continue;
    // Neutralized timer
    if (e.neutralized && e.neutralizedTimer !== undefined) {
      e.neutralizedTimer -= dt;
      if (e.neutralizedTimer <= 0) {
        e.state = 'dead';
        e.hp = 0;
        addMessage(state, '🐕 Neutralized dog wandered off.', 'info');
      }
    }
    // Friendly timer
    if (e.friendly && e.friendlyTimer > 0) {
      e.friendlyTimer -= dt;
      if (e.friendlyTimer <= 0) {
        e.friendly = false;
        e.state = 'chase';
        e.speechBubble = '...HUH?!';
        e.speechBubbleTimer = 3;
        addMessage(state, `⚠ ${e.type.toUpperCase()} is no longer friendly!`, 'warning');
        spawnParticles(state, e.pos.x, e.pos.y, '#ff4444', 4);
      }
    }
    // Speech bubble timer
    if (e.speechBubbleTimer && e.speechBubbleTimer > 0) {
      e.speechBubbleTimer -= dt;
      if (e.speechBubbleTimer <= 0) {
        // Boss death monologue — cycle through lines
        if (e.state === 'dead' && (e as any)._deathMonologue && (e as any)._deathMonologue.length > 0) {
          e.speechBubble = (e as any)._deathMonologue.shift();
          e.speechBubbleTimer = 2.5;
        } else {
          e.speechBubble = undefined;
          e.speechBubbleTimer = undefined;
        }
      }
    }
  }

  // === CONTEXTUAL HINTS — show tips for unused grenades/TNT after some time ===
  if (!(state as any)._grenadeHintShown) {
    const hasGrenades = state.player.inventory.some(i => i.category === 'grenade');
    if (hasGrenades && state.time > 45 && !(state as any)._playerThrewGrenade) {
      (state as any)._grenadeHintShown = true;
      addMessage(state, '💡 TIP: Press G or Right-click to throw a grenade!', 'info');
    }
  }
  if (!(state as any)._tntHintShown) {
    if (getTNTCount(state) > 0 && state.time > 60 && !(state as any)._playerUsedTNT) {
      (state as any)._tntHintShown = true;
      addMessage(state, '💡 TIP: Press T near a wall to place TNT and breach it!', 'info');
    }
  }

  // Flashbang blindness countdown (goggles reduce duration by 50%)
  if (state.flashbangTimer > 0) {
    const hasGoggles = state.player.inventory.some(i => i.id === 'goggles' || i.name === 'Tactical Goggles');
    const flashDecay = hasGoggles ? dt * 2 : dt; // goggles = double decay = 50% duration
    state.flashbangTimer = Math.max(0, state.flashbangTimer - flashDecay);
  }

  // Empty magazine display timer decay
  if (state.emptyMagTimer > 0) {
    state.emptyMagTimer = Math.max(0, state.emptyMagTimer - dt);
  }

  // Weapon slot switching (1 = melee, 2 = secondary, 3 = primary)
  if (input.switchWeapon) {
    const slot = input.switchWeapon;
    const wpnForSlot = slot === 1 ? state.player.meleeWeapon : slot === 2 ? state.player.sidearm : state.player.primaryWeapon;
    if (wpnForSlot) {
      // Save current weapon's ammo
      const curWpn = state.player.equippedWeapon;
      if (curWpn) (curWpn as any)._loadedAmmo = state.player.currentAmmo;
      
      state.player.activeSlot = slot;
      state.player.equippedWeapon = wpnForSlot;
      if (wpnForSlot.ammoType) state.player.ammoType = wpnForSlot.ammoType;
      
      // Restore saved ammo for this weapon, or load from reserves
      const savedAmmo = (wpnForSlot as any)._loadedAmmo;
      if (savedAmmo !== undefined) {
        const mag = getMagSize(wpnForSlot);
        state.player.currentAmmo = Math.min(savedAmmo, mag); // clamp to mag size
        state.player.maxAmmo = mag;
      } else {
        // First equip — load from ammo reserves (no free ammo)
        setWeaponAmmo(state, wpnForSlot);
      }
      
      addMessage(state, `🔫 ${wpnForSlot.name} [${slot}]`, 'info');
    } else if (slot === 3) {
      addMessage(state, '⚠ No primary weapon!', 'warning');
    } else if (slot === 2) {
      addMessage(state, '⚠ No sidearm!', 'warning');
    }
    input.switchWeapon = undefined;
  }

  // Player aim angle
  if (input.aimX !== 0 || input.aimY !== 0) {
    state.player.angle = Math.atan2(input.aimY, input.aimX);
  } else if (moveLen > 0.1) {
    state.player.angle = Math.atan2(moveY, moveX);
  }

  // Player shooting — weapon-specific stats + fire modes + durability + RELOAD
  // Block shooting during reload
  if (state.player.reloading) {
    state.player.reloadTimer -= dt;
    if (state.player.reloadTimer <= 0) {
      state.player.reloading = false;
      // Transfer ammo from reserves to magazine
      const wpnReload = state.player.equippedWeapon;
      if (wpnReload && wpnReload.ammoType) {
        const magSize = getMagSize(wpnReload);
        const needed = magSize - state.player.currentAmmo;
        const available = state.player.ammoReserves[wpnReload.ammoType] || 0;
        const transferred = Math.min(needed, available);
        state.player.currentAmmo += transferred;
        state.player.ammoReserves[wpnReload.ammoType] -= transferred;
        state.player.maxAmmo = magSize;
        // Safety clamp — never exceed magazine size
        state.player.currentAmmo = Math.min(state.player.currentAmmo, magSize);
        addMessage(state, `🔄 Reloaded! ${state.player.currentAmmo}/${magSize}`, 'info');
        // Visual flash for reload complete
        (state as any)._reloadCompleteFlash = 0.8;
      }
    }
    // Can't shoot while reloading
    input.shooting = false;
    input.shootPressed = false;
  }
  
  const wpn = state.player.equippedWeapon;
  const baseFireRate = wpn?.weaponFireRate || state.player.fireRate;
  const isAutoFire = wpn?.fireMode === 'auto';
  const canFire = isAutoFire ? input.shooting : input.shootPressed;
  
  // Check weapon durability — sidearms never break
  const isSidearm = wpn?.weaponSlot === 'secondary';
  const isMosinWpn = wpn?.name?.toLowerCase().includes('mosin');
  
  // Compute durability ratio for fire rate degradation
  const durRatioForRate = (wpn && !isSidearm && (wpn as any)._maxDurability)
    ? (wpn as any)._durability / (wpn as any)._maxDurability
    : 1;
  const fireRate = isMosinWpn ? baseFireRate : baseFireRate * (1 + (1 - durRatioForRate) * 0.6); // up to 60% slower
  
  // === MANUAL RELOAD (R key) ===
  if (input.reload && !state.player.reloading && wpn) {
    input.reload = false;
    const isMelee = wpn && (wpn.weaponRange || 60) <= 10;
    if (!isMelee && state.player.currentAmmo < getMagSize(wpn)) {
      const ammoType = wpn.ammoType;
      const ammoAvail = ammoType ? (state.player.ammoReserves[ammoType] || 0) : 0;
      if (ammoAvail > 0) {
        state.player.reloading = true;
        const wpnNameLower = (wpn.name || '').toLowerCase();
        let reloadTime = wpnNameLower.includes('mosin') ? 3.2 :       // bolt-action, stripper clip
                         wpnNameLower.includes('toz') ? 2.8 :          // break-action shotgun
                         wpnNameLower.includes('ksp 58') ? 3.5 :       // belt-fed MG
                         wpnNameLower.includes('ak 4') ? 2.2 :         // G3 battle rifle, heavy mag
                         wpnNameLower.includes('akm') ? 1.8 :          // AKM standard mag change
                         wpnNameLower.includes('ak-74') ? 1.6 :        // AK-74, practiced swap
                         wpnNameLower.includes('ppsh') ? 2.5 :         // drum magazine, heavy
                         wpnNameLower.includes('kpist') ? 1.4 :        // SMG, fast mag change
                         wpnNameLower.includes('makarov') ? 1.2 :      // pistol, fast
                         wpnNameLower.includes('nagant') ? 2.0 :       // revolver, individual rounds
                         1.5;                                           // default
        // Quick Hands upgrade — reduce reload time
        const reloadBonus = (state as any)._reloadSpeedBonus || 0;
        if (reloadBonus > 0) reloadTime *= (1 - reloadBonus);
        state.player.reloadTimer = reloadTime;
        state.player.reloadTime = reloadTime;
        addMessage(state, '🔄 RELOADING...', 'info');
      } else {
        addMessage(state, state.player.currentAmmo <= 0
          ? '⚠ Magazine empty — no reserve ammo!'
          : '⚠ No reserve ammo for this weapon!', 'warning');
      }
    } else if (!isMelee && state.player.currentAmmo >= getMagSize(wpn)) {
      addMessage(state, '⚠ Magazine already full!', 'info');
    }
  } else {
    input.reload = false;
  }

  const weaponBroken = !isSidearm && wpn && (wpn as any)._durability !== undefined && (wpn as any)._durability <= 0;
  
  // === LASER DESIGNATOR — special handling ===
  const isLaserDesignator = wpn && (wpn as any).isLaserDesignator;
  if (isLaserDesignator) {
    // Laser points at mouse cursor world position (aimX/aimY = screen offset from center)
    const lx = state.camera.x + input.aimX;
    const ly = state.camera.y + input.aimY;
    state.laserTarget = { x: lx, y: ly };
    
    if (input.shootPressed && state.time - state.player.lastShot > 3.0) {
      state.player.lastShot = state.time;
      const targetPos = { x: lx, y: ly };
      // Warn about friendly fire if target is close to player
      const distToPlayer = Math.sqrt((lx - state.player.pos.x) ** 2 + (ly - state.player.pos.y) ** 2);
      if (distToPlayer < 200) {
        addMessage(state, '⚠ DANGER CLOSE! Mortar incoming near your position!', 'damage');
      }
      state.mortarStrikes.push({
        pos: targetPos,
        timer: 3.0,
        maxTimer: 3.0,
        damage: 250,
        radius: 180,
        fromPlayer: true,
      });
      addMessage(state, '🔴 MORTAR STRIKE CALLED IN — 3 seconds to impact!', 'warning');
      state.soundEvents.push({ pos: { ...state.player.pos }, radius: 100, time: state.time });
    }
  } else {
    state.laserTarget = null;
  }

  if (weaponBroken) {
    if (canFire && state.time - state.player.lastShot > 0.5) {
      state.player.lastShot = state.time;
      addMessage(state, `⚠ ${wpn!.name} is BROKEN! Find a new weapon!`, 'warning');
    }
  } else if (!isLaserDesignator && canFire && state.time - state.player.lastShot > fireRate / 1000) {
    // Init durability on first shot if not set (sidearms and melee skip durability)
    const isMelee = wpn && (wpn.weaponRange || 60) <= 10;
    
    // === EMPTY MAGAZINE CHECK ===
    const magAmmo = Number.isFinite(state.player.currentAmmo) ? state.player.currentAmmo : 0;
    if (!isMelee && magAmmo <= 0) {
      state.player.currentAmmo = 0; // fail-safe clamp
      // Throttle the message to avoid spam
      // Set emptyMagTimer for big on-screen display
      state.emptyMagTimer = 1.5;
    } else {
    if (wpn && !isSidearm && !isMelee && (wpn as any)._durability === undefined) {
      // Durability based on weapon type: rifles=120
      (wpn as any)._durability = 120;
      (wpn as any)._maxDurability = 120;
    }
    
    // Durability ratio for spread/fire rate
    const durRatio = (wpn && !isSidearm && (wpn as any)._maxDurability) 
      ? (wpn as any)._durability / (wpn as any)._maxDurability 
      : 1;
    // === COMPREHENSIVE SPREAD SYSTEM ===
    // Base spread per weapon class (tighter = more accurate)
    const wpnName = (wpn?.name || '').toLowerCase();
    const weaponBaseSpread: number = (() => {
      if (isMosinWpn) return 0.03;  // bolt-action sniper — very precise
      if (wpnName.includes('ak 4')) return 0.06; // battle rifle — precise
      if (wpnName.includes('revolver')) return 0.07;
      if (wpnName.includes('ak-74') || wpnName.includes('akm')) return 0.09; // assault rifles — moderate
      if (wpnName.includes('ksp 58')) return 0.11; // MG — less accurate
      if (wpnName.includes('ppsh') || wpnName.includes('kpist')) return 0.12; // SMGs — spray-y
      if (wpnName.includes('makarov')) return 0.10; // pistol
      if (wpnName.includes('toz')) return 0.08; // shotgun base (pellets add cone)
      return 0.10; // default
    })();

    // Durability degrades accuracy
    const durPenalty = (1 - durRatio) * 0.15;

    // Movement spread — depends on movement mode AND weapon weight
    const wpnWeight = wpn?.weight || 2;
    const weightFactor = Math.min(1.5, wpnWeight / 4); // heavier weapons = more movement penalty
    const movingSpread = moveLen > 0.1
      ? (effectiveMode === 'sprint' ? 0.18 * weightFactor
        : effectiveMode === 'walk' ? 0.07 * weightFactor
        : 0.015) // sneaking — very stable
      : -0.02; // standing still — slight accuracy bonus

    // Recoil bloom from consecutive shots — weapon-specific rates
    const recoilBloom = (state as any)._recoilBloom || 0;

    // Sustained fire penalty — tracks how many shots fired recently
    const sustainedShots = (state as any)._sustainedShots || 0;
    const sustainedPenalty = isAutoFire ? Math.min(0.12, sustainedShots * 0.008) : 0; // auto-fire gets worse over time

    // Cover bonus — in cover = more stable
    const coverBonus = state.player.inCover ? -0.04 : 0;

    const totalSpread = Math.max(0.02, weaponBaseSpread + durPenalty + movingSpread + recoilBloom + sustainedPenalty + coverBonus);
    
    const baseBulletSpeed = (wpn?.bulletSpeed || 8) * 1.5; // +50% base projectile speed (25% + 20%)
    const bulletSpeedBonus = (state as any)._bulletSpeedBonus || 0;
    const bulletSpeed = baseBulletSpeed * (1 + bulletSpeedBonus);
    const bulletLife = wpn?.weaponRange || 60;

    // BUCKSHOT — fire multiple pellets in a cone
    if (wpn?.isBuckshot) {
      const pelletCount = wpn.pelletCount || 5;
      const coneAngle = wpn.coneAngle || 0.5;
      const baseAngle = state.player.angle;
      for (let p = 0; p < pelletCount; p++) {
        const pelletSpread = (Math.random() - 0.5) * coneAngle + (Math.random() - 0.5) * totalSpread;
        const a = baseAngle + pelletSpread;
        const pelletSpeed = bulletSpeed * (0.85 + Math.random() * 0.3);
        state.bullets.push({
          pos: { x: state.player.pos.x + Math.cos(a) * 28, y: state.player.pos.y + Math.sin(a) * 28 },
          vel: { x: Math.cos(a) * pelletSpeed, y: Math.sin(a) * pelletSpeed },
          damage: wpn.damage || 10,
          damageType: 'bullet',
          fromPlayer: true,
          life: bulletLife,
          weaponName: wpn.name,
          weaponFireMode: wpn.fireMode,
        });
      }
    } else {
      const spread = (Math.random() - 0.5) * totalSpread;
      const angle = state.player.angle + spread;
      state.bullets.push({
        pos: { x: state.player.pos.x + Math.cos(angle) * 28, y: state.player.pos.y + Math.sin(angle) * 28 },
        vel: { x: Math.cos(angle) * bulletSpeed, y: Math.sin(angle) * bulletSpeed },
        damage: wpn?.damage || 10,
        damageType: 'bullet',
        fromPlayer: true,
        life: bulletLife,
        weaponName: wpn?.name,
        weaponFireMode: wpn?.fireMode,
      });
    }
    state.player.lastShot = state.time;
    if (!isMelee) (state as any)._shotsFired = ((state as any)._shotsFired || 0) + (wpn?.isBuckshot ? (wpn.pelletCount || 5) : 1);
    
    // === AMMO CONSUMPTION — deduct from magazine ===
    if (!isMelee) {
      state.player.currentAmmo = Math.max(0, Math.floor(state.player.currentAmmo) - 1);
    }
    
    // === WEAPON-SPECIFIC RECOIL BLOOM ===
    if (!(state as any)._recoilBloom) (state as any)._recoilBloom = 0;
    // Bloom rate varies by weapon: heavy weapons bloom faster, precision weapons slower
    const bloomRate = (() => {
      if (isMosinWpn) return 0.005; // bolt-action — minimal bloom
      const n = (wpn?.name || '').toLowerCase();
      if (n.includes('ksp 58')) return 0.04;  // MG — heavy bloom
      if (n.includes('ppsh') || n.includes('kpist')) return 0.035; // SMGs — fast bloom
      if (n.includes('akm')) return 0.03; // AKM — noticeable
      if (n.includes('ak-74') || n.includes('ak 4')) return 0.022; // controlled
      if (n.includes('makarov') || n.includes('revolver')) return 0.015; // pistols — low
      return isAutoFire ? 0.028 : 0.015;
    })();
    const bloomCap = isMosinWpn ? 0.08 : isAutoFire ? 0.30 : 0.20;
    (state as any)._recoilBloom = Math.min(bloomCap, (state as any)._recoilBloom + bloomRate);
    
    // Track sustained shots for auto-fire penalty
    if (!(state as any)._sustainedShots) (state as any)._sustainedShots = 0;
    (state as any)._sustainedShots = Math.min(20, (state as any)._sustainedShots + 1);
    (state as any)._lastShotTime = state.time;
    
    const muzzleAngle = state.player.angle;
    addMuzzleFlash(state, state.player.pos.x + Math.cos(muzzleAngle) * 25, state.player.pos.y + Math.sin(muzzleAngle) * 25, true);
    spawnParticles(state, state.player.pos.x + Math.cos(muzzleAngle) * 20, state.player.pos.y + Math.sin(muzzleAngle) * 20, '#ffaa44', 3);
    
    // Reduce durability (sidearms and melee skip)
    if (wpn && !isSidearm && !isMelee) {
      (wpn as any)._durability = Math.max(0, ((wpn as any)._durability || 120) - 1);
      if ((wpn as any)._durability === 10) {
        addMessage(state, `⚠ ${wpn.name} is wearing out! Accuracy & fire rate degraded!`, 'warning');
      }
      if ((wpn as any)._durability <= 0) {
        addMessage(state, `💥 ${wpn.name} BROKE! Find a replacement!`, 'damage');
        spawnParticles(state, state.player.pos.x, state.player.pos.y, '#886644', 5);
      }
    }
    
    // Sound event — gunshots alert enemies (VERY loud — stealth penalty)
    let gunshotRadius = isMelee ? 50 : 500;
    // Suppressor + Silent Step reduce noise
    const noiseReduction = ((state as any)._noiseReduction || 0) + ((state as any)._suppressorEquipped ? 0.50 : 0);
    if (noiseReduction > 0) gunshotRadius *= (1 - Math.min(0.80, noiseReduction));
    state.soundEvents.push({ pos: { ...state.player.pos }, radius: gunshotRadius, time: state.time });
    playGunshot('pistol');
    
    // No auto-reload — player must press R manually
    } // end else (has ammo)
  }

  // Recoil bloom decay — recovers when not shooting (weapon-specific recovery)
  if ((state as any)._recoilBloom > 0) {
    const wpnDecay = state.player.equippedWeapon;
    const dn = (wpnDecay?.name || '').toLowerCase();
    // Light weapons recover faster, heavy weapons slower
    const recoveryRate = dn.includes('ksp 58') ? 0.08 : dn.includes('ppsh') || dn.includes('kpist') ? 0.12
      : dn.includes('mosin') ? 0.25 : dn.includes('makarov') || dn.includes('revolver') ? 0.20
      : 0.14;
    (state as any)._recoilBloom = Math.max(0, (state as any)._recoilBloom - recoveryRate * dt);
  }
  // Sustained shot counter decay — resets after 0.5s of not shooting
  if ((state as any)._sustainedShots > 0) {
    const timeSinceShot = state.time - ((state as any)._lastShotTime || 0);
    if (timeSinceShot > 0.4) {
      (state as any)._sustainedShots = Math.max(0, (state as any)._sustainedShots - 8 * dt); // fast recovery when burst stops
    }
  }
  
  // Store current spread for HUD visualization
  {
    const wpnVis = state.player.equippedWeapon;
    const wpnVisName = (wpnVis?.name || '').toLowerCase();
    const baseSpreadVis = wpnVisName.includes('mosin') ? 0.03 : wpnVisName.includes('ak 4') ? 0.06
      : wpnVisName.includes('ksp 58') ? 0.11 : wpnVisName.includes('ppsh') || wpnVisName.includes('kpist') ? 0.12
      : 0.10;
    const wpnWt = wpnVis?.weight || 2;
    const wtFactor = Math.min(1.5, wpnWt / 4);
    const moveSpreadVis = moveLen > 0.1 ? (effectiveMode === 'sprint' ? 0.18 * wtFactor : effectiveMode === 'walk' ? 0.07 * wtFactor : 0.015) : -0.02;
    const bloomVis = (state as any)._recoilBloom || 0;
    const sustainVis = (wpnVis?.fireMode === 'auto') ? Math.min(0.12, ((state as any)._sustainedShots || 0) * 0.008) : 0;
    const coverVis = state.player.inCover ? -0.04 : 0;
    (state as any)._currentSpread = Math.max(0.02, baseSpreadVis + moveSpreadVis + bloomVis + sustainVis + coverVis);
  }

  // Cycle throwable type (V key)
  if (input.cycleThrowable) {
    const types: Array<'grenade' | 'gas_grenade' | 'flashbang'> = ['grenade', 'gas_grenade', 'flashbang'];
    const labels: Record<string, string> = { grenade: '💣 Frag Grenade', gas_grenade: '☣️ Gas Grenade', flashbang: '💫 Flashbang' };
    const cur = types.indexOf(state.player.selectedThrowable);
    // Find next type that player actually has
    for (let i = 1; i <= types.length; i++) {
      const next = types[(cur + i) % types.length];
      if (state.player.inventory.some(item => item.category === next)) {
        state.player.selectedThrowable = next;
        addMessage(state, `Selected: ${labels[next]}`, 'info');
        break;
      }
    }
    input.cycleThrowable = false;
  }

  // Throw grenade (G key) — throws selected throwable type, 1s cooldown
  if (input.throwGrenade) {
    if (state.time - state.player.lastGrenadeTime < 1.0) {
      addMessage(state, '⚠ Wait before throwing again!', 'warning');
      input.throwGrenade = false;
    } else {
      const selected = state.player.selectedThrowable;
      let grenadeIdx = state.player.inventory.findIndex(i => i.category === selected);
      // If selected type is empty, try others as fallback
      if (grenadeIdx < 0) {
        const fallback: Array<'grenade' | 'gas_grenade' | 'flashbang'> = ['grenade', 'gas_grenade', 'flashbang'];
        for (const type of fallback) {
          grenadeIdx = state.player.inventory.findIndex(i => i.category === type);
          if (grenadeIdx >= 0) {
            state.player.selectedThrowable = type;
            break;
          }
        }
      }
      if (grenadeIdx >= 0) {
        const grenadeItem = state.player.inventory[grenadeIdx];
        const isFlashbang = grenadeItem.category === 'flashbang';
        const isGasGrenade = grenadeItem.category === 'gas_grenade';
        const angle = state.player.angle;
        const chargePower = (state as any)._grenadeChargePower || 0;
        delete (state as any)._grenadeChargePower;
        const throwSpeed = 4 + (chargePower / 2.0) * 4;
        state.grenades.push({
          pos: { x: state.player.pos.x + Math.cos(angle) * 20, y: state.player.pos.y + Math.sin(angle) * 20 },
          vel: { x: Math.cos(angle) * throwSpeed, y: Math.sin(angle) * throwSpeed },
          timer: isFlashbang ? 1.0 : 1.5,
          damage: isFlashbang ? -1 : isGasGrenade ? -2 : (grenadeItem.damage || 200),
          radius: isFlashbang ? 200 : isGasGrenade ? 180 : 150,
          fromPlayer: true,
        });
        state.player.inventory.splice(grenadeIdx, 1);
        state.player.lastGrenadeTime = state.time;
        (state as any)._playerThrewGrenade = true;
        addMessage(state, isFlashbang ? '💫 FLASHBANG THROWN!' : isGasGrenade ? '☣️ GAS GRENADE THROWN!' : '💣 GRENADE THROWN!', 'warning');
        spawnParticles(state, state.player.pos.x, state.player.pos.y, isFlashbang ? '#ffffaa' : isGasGrenade ? '#66dd66' : '#886644', 3);
      } else {
        addMessage(state, '⚠ No grenades!', 'warning');
      }
      input.throwGrenade = false;
    }
  }

  // Interact
  if (input.interact) {
    // Gate keycard check — remove nearest gate wall if player has keycard and is near any gate
    for (let gi = state.walls.length - 1; gi >= 0; gi--) {
      const gw = state.walls[gi];
      if (gw.color !== '#aa4444') continue;
      const gateCenterX = gw.x + gw.w / 2;
      const gateCenterY = gw.y + gw.h / 2;
      if (dist(state.player.pos, { x: gateCenterX, y: gateCenterY }) < 80) {
        if (state.player.keycardCount > 0) {
          state.player.keycardCount--;
          state.walls.splice(gi, 1);
          _wallGrid = null; _wallCount = -1;
          addMessage(state, '💳 GATE OPENED with access card! (card consumed)', 'intel');
          spawnParticles(state, gateCenterX, gateCenterY, '#44ff44', 10);
        } else {
          addMessage(state, '🔒 Gate is locked — you need an access card!', 'warning');
        }
        break;
      }
    }

  }

  // TNT wall breach — place charge with 5s fuse (also works on airplane)
  if (input.useTNT) {
    input.useTNT = false;
    const tntIdx = state.player.specialSlot.findIndex(i => i.name === 'TNT Charge');
    if (tntIdx >= 0) {
      // Check if near airplane, fuel depot, or ammo dump prop first
      let placedOnTarget = false;
      for (const prop of state.props) {
        const d = dist(state.player.pos, prop.pos);
        if (prop.type === 'airplane' && d < 120 && !(state as any)._tntOnPlane) {
          consumeTNT(state);
          state.placedTNTs.push({ pos: { ...prop.pos }, timer: 5.0, maxTimer: 5.0 });
          addMessage(state, '🧨 TNT PLACED ON AIRCRAFT! 5 seconds — GET CLEAR!', 'warning');
          state.soundEvents.push({ pos: { ...prop.pos }, radius: 150, time: state.time });
          (state as any)._playerUsedTNT = true;
          (state as any)._tntOnPlane = true;
          addMessage(state, '✈️ Sabotage objective complete!', 'intel');
          placedOnTarget = true;
          break;
        }
        if (prop.type === 'fuel_depot' && d < 80 && !(state as any)._fuelDestroyed) {
          consumeTNT(state);
          state.placedTNTs.push({ pos: { ...prop.pos }, timer: 5.0, maxTimer: 5.0 });
          addMessage(state, '🧨 TNT PLACED ON FUEL DEPOT! 5 seconds — GET CLEAR!', 'warning');
          state.soundEvents.push({ pos: { ...prop.pos }, radius: 150, time: state.time });
          (state as any)._playerUsedTNT = true;
          (state as any)._fuelDestroyed = true;
          addMessage(state, '🛢️ Fuel depot sabotaged!', 'intel');
          placedOnTarget = true;
          break;
        }
        if (prop.type === 'ammo_dump' && d < 80 && !(state as any)._ammoDestroyed) {
          consumeTNT(state);
          state.placedTNTs.push({ pos: { ...prop.pos }, timer: 5.0, maxTimer: 5.0 });
          addMessage(state, '🧨 TNT PLACED ON AMMO DUMP! 5 seconds — GET CLEAR!', 'warning');
          state.soundEvents.push({ pos: { ...prop.pos }, radius: 200, time: state.time });
          (state as any)._playerUsedTNT = true;
          (state as any)._ammoDestroyed = true;
          addMessage(state, '💥 Ammo stockpile destroyed!', 'intel');
          placedOnTarget = true;
          break;
        }
      }

      if (!placedOnTarget) {
        // Find nearest wall
        let bestIdx = -1;
        let bestDist = Number.POSITIVE_INFINITY;
        let impact = { x: state.player.pos.x, y: state.player.pos.y };
        for (let wi = 0; wi < state.walls.length; wi++) {
          const w = state.walls[wi];
          const cx = Math.max(w.x, Math.min(state.player.pos.x, w.x + w.w));
          const cy = Math.max(w.y, Math.min(state.player.pos.y, w.y + w.h));
          const d = dist(state.player.pos, { x: cx, y: cy });
          if (d < bestDist) {
            bestDist = d;
            bestIdx = wi;
            impact = { x: cx, y: cy };
          }
        }

        if (bestIdx >= 0 && bestDist < 70) {
          consumeTNT(state);
          state.placedTNTs.push({ pos: { ...impact }, timer: 5.0, maxTimer: 5.0 });
          addMessage(state, '🧨 TNT PLACED! 5 seconds to detonation — GET CLEAR!', 'warning');
          state.soundEvents.push({ pos: { ...impact }, radius: 150, time: state.time });
          (state as any)._playerUsedTNT = true;

          // Check if TNT placed near airplane → objective trigger
          for (const prop of state.props) {
            if (prop.type === 'airplane' && dist(impact, prop.pos) < 150) {
              (state as any)._tntOnPlane = true;
              addMessage(state, '✈️ TNT planted on the aircraft! Sabotage objective complete!', 'intel');
            }
          }
        } else {
          addMessage(state, '⚠ No wall or target nearby to breach!', 'warning');
        }
      }
    } else {
      addMessage(state, '⚠ No TNT charges!', 'warning');
    }
  }

   // === ENEMIES FLEE FROM PLACED TNT ===
  for (const tnt of state.placedTNTs) {
    if (tnt.timer > 0 && tnt.timer < 4.5) { // react after 0.5s of placement
      for (const enemy of state.enemies) {
        if (enemy.state === 'dead' || enemy.type === 'turret' || enemy.type === 'boss') continue;
        if (enemy.elevated) continue; // platform enemies can't flee
        if ((enemy as any)._fleeingTNT) continue;
        const dToTNTSq = distSq(tnt.pos, enemy.pos);
        if (dToTNTSq < 40000) { // 200²
          (enemy as any)._fleeingTNT = true;
          // Find cover away from TNT
          const awayAngle = Math.atan2(enemy.pos.y - tnt.pos.y, enemy.pos.x - tnt.pos.x);
          const fleeDist = 250;
          enemy.investigateTarget = {
            x: Math.max(50, Math.min(state.mapWidth - 50, enemy.pos.x + Math.cos(awayAngle) * fleeDist)),
            y: Math.max(50, Math.min(state.mapHeight - 50, enemy.pos.y + Math.sin(awayAngle) * fleeDist)),
          };
          enemy.state = 'investigate';
          enemy.speed = Math.max(enemy.speed, 2.5);
          addMessage(state, `⚠ ${enemy.type.toUpperCase()} flees from TNT!`, 'warning');
        }
      }
    }
  }

  // Update placed TNTs — countdown and detonate
  state.placedTNTs = state.placedTNTs.filter(tnt => {
    tnt.timer -= dt;
    if (tnt.timer > 0) return true; // still ticking

    // DETONATE
    const TNT_DAMAGE = 200;
    const TNT_RADIUS = 150;
    const BREACH_WIDTH = 96;

    // Find nearest wall to breach
    let bestIdx = -1;
    let bestDist = 40; // must be very close to the placed position
    for (let wi = 0; wi < state.walls.length; wi++) {
      const w = state.walls[wi];
      const cx = Math.max(w.x, Math.min(tnt.pos.x, w.x + w.w));
      const cy = Math.max(w.y, Math.min(tnt.pos.y, w.y + w.h));
      const d = dist(tnt.pos, { x: cx, y: cy });
      if (d < bestDist) {
        bestDist = d;
        bestIdx = wi;
      }
    }

    if (bestIdx >= 0) {
      const w = state.walls[bestIdx];
      const newSegments: typeof state.walls = [];
      if (w.w >= w.h) {
        const holeStart = Math.max(w.x, tnt.pos.x - BREACH_WIDTH / 2);
        const holeEnd = Math.min(w.x + w.w, tnt.pos.x + BREACH_WIDTH / 2);
        const leftW = holeStart - w.x;
        const rightW = w.x + w.w - holeEnd;
        if (leftW > 8) newSegments.push({ ...w, w: leftW });
        if (rightW > 8) newSegments.push({ ...w, x: holeEnd, w: rightW });
      } else {
        const holeStart = Math.max(w.y, tnt.pos.y - BREACH_WIDTH / 2);
        const holeEnd = Math.min(w.y + w.h, tnt.pos.y + BREACH_WIDTH / 2);
        const topH = holeStart - w.y;
        const bottomH = w.y + w.h - holeEnd;
        if (topH > 8) newSegments.push({ ...w, h: topH });
        if (bottomH > 8) newSegments.push({ ...w, y: holeEnd, h: bottomH });
      }
      state.walls.splice(bestIdx, 1, ...newSegments);
      _wallGrid = null; // Invalidate spatial grid after wall change
      _wallCount = -1;
    }

    if (bestIdx >= 0) state.wallsBreached++;
    addMessage(state, '🧨 TNT DETONATED! Wall section breached!', 'intel');
    playExplosion();
    (state as any)._screenShake = 1.2;
    spawnParticles(state, tnt.pos.x, tnt.pos.y, '#ff8833', 12);
    spawnParticles(state, tnt.pos.x, tnt.pos.y, '#ffcc44', 8);
    state.soundEvents.push({ pos: { ...tnt.pos }, radius: 500, time: state.time });

    // TNT only damages walls — no enemy damage (breach-only explosive)
    // Enemies flee from the blast but are not harmed

    // Damage player
    const dPlayer = dist(tnt.pos, state.player.pos);
    if (dPlayer < TNT_RADIUS && hasLineOfSight(state, tnt.pos, state.player.pos)) {
      const falloff = 1 - (dPlayer / TNT_RADIUS);
      const dmg = TNT_DAMAGE * falloff * 0.5;
      state.player.hp -= dmg;
      state.noHitsTaken = false;
      spawnParticles(state, state.player.pos.x, state.player.pos.y, '#ff2222', 4);
      addMessage(state, `💥 Shrapnel! -${Math.floor(dmg)}HP`, 'damage');
      if (state.player.hp <= 0) {
        state.deathCause = '🧨 Killed by own TNT explosion';
      }
    }

    return false; // remove detonated TNT
  });

  // Update mortar strikes — countdown and explode
  state.mortarStrikes = state.mortarStrikes.filter(m => {
    m.timer -= dt;
    if (m.timer > 0) return true;

    // IMPACT — clean up mortar flee flags
    for (const enemy of state.enemies) {
      delete (enemy as any)._mortarFleeRolled;
    }
    // Same damage logic as grenades
    addMessage(state, '💥 MORTAR IMPACT!', 'damage');
    spawnParticles(state, m.pos.x, m.pos.y, '#ff8833', 25);
    spawnParticles(state, m.pos.x, m.pos.y, '#ffcc44', 18);
    spawnParticles(state, m.pos.x, m.pos.y, '#444', 12);
    playExplosion();
    (state as any)._screenShake = 1.5;
    state.soundEvents.push({ pos: { ...m.pos }, radius: 600, time: state.time });

    for (const enemy of state.enemies) {
      if (enemy.state === 'dead') continue;
      const d = dist(m.pos, enemy.pos);
      if (d < m.radius && hasLineOfSight(state, m.pos, enemy.pos, enemy.elevated) && !isIndoors(state, enemy.pos)) {
        if (enemy.type === 'boss') {
          const proneReduction = (enemy as any)._proneTimer > 0 ? 0.5 : 1.0;
          const dmg = enemy.maxHp * 0.30 * proneReduction;
          enemy.hp -= dmg;
          spawnParticles(state, enemy.pos.x, enemy.pos.y, '#ff4444', 8);
          addMessage(state, `💥 Boss hit by mortar! -${Math.floor(dmg)}HP`, 'damage');
          if (enemy.hp > 0) { enemy.state = 'chase'; continue; }
        }
        if ((enemy as any)._isBodyguard) {
          const dmg = enemy.maxHp * 0.30;
          enemy.hp -= dmg;
          spawnParticles(state, enemy.pos.x, enemy.pos.y, '#ff4444', 6);
          addMessage(state, `💥 Bodyguard hit by mortar! -${Math.floor(dmg)}HP`, 'damage');
          if (enemy.hp > 0) { enemy.state = 'chase'; continue; }
        }
        const falloff = 1 - (d / m.radius);
        const dmg = m.damage * falloff;
        enemy.hp -= dmg;
        spawnParticles(state, enemy.pos.x, enemy.pos.y, '#ff4444', 6);
        if (enemy.hp <= 0) {
          enemy.hp = 0;
          enemy.state = 'dead';
          sendReinforcementToPlatform(state, enemy);
          enemy.loot = generateEnemyLoot(enemy);
          state.killCount++;
          if (enemy.type === 'dog') state.dogsKilled++;
          state.grenadeKills++;
          addKillFeed(state, enemy.type, 'Mortar');
          addMessage(state, `💀 ${enemy.type.toUpperCase()} eliminated by mortar!`, 'kill');
          spawnParticles(state, enemy.pos.x, enemy.pos.y, '#884444', 10);
            notifyAllyDeath(state, enemy, 'Mortar');
            trackWeaponMasteryKill(state, undefined, 'Mortar');
        }
      }
    }

    // Damage player
    const dPlayer = dist(m.pos, state.player.pos);
    if (dPlayer < m.radius && hasLineOfSight(state, m.pos, state.player.pos) && !isIndoors(state, state.player.pos)) {
      const falloff = 1 - (dPlayer / m.radius);
      const dmg = m.damage * falloff * 0.5;
      state.player.hp -= dmg;
      state.noHitsTaken = false;
      spawnParticles(state, state.player.pos.x, state.player.pos.y, '#ff2222', 4);
      addMessage(state, `💥 Mortar shrapnel! -${Math.floor(dmg)}HP`, 'damage');
      if (state.player.hp <= 0) {
        state.deathCause = '💥 Killed by own mortar strike';
      }
    }

    return false;
  });

  if (input.interact) {
    // Loot containers — require line of sight (no looting through walls)
    for (const lc of state.lootContainers) {
      if (lc.type === 'weapon_drop') continue; // handled separately
      if (!lc.looted && dist(state.player.pos, lc.pos) < 70 && hasLineOfSight(state, state.player.pos, lc.pos)) {
        lc.looted = true;
        state.cachesLooted++;
        for (const item of lc.items) {
          // Weapons drop on the ground separately — player picks up manually
          if (item.category === 'weapon' && item.damage) {
            spawnWeaponDrop(state, item, lc.pos);
            continue;
          }
          if (!tryPickupItem(state, item)) continue;
          if (item.id === 'extraction_code') {
            state.hasExtractionCode = true;
            addMessage(state, '🔑 EXTRACTION CODE FOUND! Head to the extraction point!', 'intel');
          }
          // Auto-equip backpack
          if (item.category === 'backpack' && state.backpackCapacity === 0) {
            state.backpackCapacity = 10;
            addMessage(state, '🎒 Backpack equipped — more room for loot!', 'intel');
          }
          // Auto-equip armor
          if (item.category === 'armor' && item.damage) {
            state.player.armor += item.damage;
            addMessage(state, `🛡️ +${item.damage} armor equipped!`, 'info');
          }
        }
        spawnParticles(state, lc.pos.x, lc.pos.y, '#bbaa44', 6);
        playPickup();
        if (lc.items.length > 0) {
          addMessage(state, `Loot: ${lc.items.map(i => i.name).join(', ')}`, 'loot');
        } else {
          addMessage(state, `Empty...`, 'info');
        }
      }
    }

    // Document pickups — require line of sight
    for (const dp of state.documentPickups) {
      if (!dp.collected && dist(state.player.pos, dp.pos) < 70 && hasLineOfSight(state, state.player.pos, dp.pos)) {
        dp.collected = true;
        state.documentsCollected++;
        const doc = LORE_DOCUMENTS.find(d => d.id === dp.loreDocId);
        if (doc) {
          doc.found = true;
          // Persist found documents to localStorage
          try {
            const saved = JSON.parse(localStorage.getItem('nz_found_docs') || '[]') as string[];
            if (!saved.includes(doc.id)) {
              saved.push(doc.id);
              localStorage.setItem('nz_found_docs', JSON.stringify(saved));
            }
          } catch {}

          state.documentsRead.push(doc.id);
          if (doc.hasCode && doc.code && !state.codesFound.includes(doc.code)) {
            state.codesFound.push(doc.code);
            addMessage(state, `☢ SECRET CODE: ${doc.code}`, 'intel');
          }
          addMessage(state, `📄 DOCUMENT: "${doc.title}"`, 'intel');
          spawnParticles(state, dp.pos.x, dp.pos.y, '#44aaff', 8);
        }
      }
    }

    // Dead enemy looting — require line of sight
    for (const enemy of state.enemies) {
      if (enemy.state !== 'dead' || enemy.looted) continue;
      if (dist(state.player.pos, enemy.pos) < 70 && hasLineOfSight(state, state.player.pos, enemy.pos)) {
        enemy.looted = true;
        state.bodiesLooted++;
        for (const item of enemy.loot) {
          // Weapons drop on the ground separately
          if (item.category === 'weapon' && item.damage) {
            spawnWeaponDrop(state, item, enemy.pos);
            continue;
          }
          if (!tryPickupItem(state, item)) continue;
          if (item.id === 'extraction_code') {
            state.hasExtractionCode = true;
            addMessage(state, '🔑 EXTRACTION CODE FOUND! Head to the extraction point!', 'intel');
          }
          if (item.category === 'backpack' && state.backpackCapacity === 0) {
            state.backpackCapacity = 10;
            addMessage(state, '🎒 Backpack equipped!', 'intel');
          }
          if (item.category === 'armor' && item.damage) {
            state.player.armor += item.damage;
            addMessage(state, `🛡️ +${item.damage} armor!`, 'info');
          }
          if (item.id === 'boss_usb') {
            state.hasExtractionCode = true;
            addMessage(state, '💾 BOSS USB DRIVE! Get to the extraction point!', 'intel');
          }
        }
        spawnParticles(state, enemy.pos.x, enemy.pos.y, '#bbaa44', 6);
        if (enemy.loot.length > 0) {
          addMessage(state, `Loot: ${enemy.loot.map(i => i.name).join(', ')}`, 'loot');
        } else {
          addMessage(state, `Nothing of value...`, 'info');
        }
        // === DISGUISE AVAILABLE — dead soldier/heavy has uniform ===
        if (!state.disguised && !(state as any)._disguiseAvailable && (enemy.type === 'soldier' || enemy.type === 'heavy')) {
          (state as any)._disguiseAvailable = true;
          (state as any)._disguisePos = { ...enemy.pos };
          addMessage(state, '🥷 Uniform found! Press [X] near body to put on disguise.', 'intel');
        }
      }
    }

    // Hack terminals
    for (const panel of state.alarmPanels) {
      if (panel.hacked) continue;
      if (dist(state.player.pos, panel.pos) < 70) {
        panel.hackProgress += 0.04;
        if (panel.hackProgress >= 1) {
          panel.hacked = true;
          state.terminalsHacked++;
          spawnParticles(state, panel.pos.x, panel.pos.y, '#44ffaa', 10);

          if (panel.id === 'alarm_intel') {
            // Intel terminal: reveals which exfil is active
            const activeExfil = state.extractionPoints.find(ep => ep.active);
            state.exfilRevealed = activeExfil?.name || undefined;
            if (activeExfil) {
              addMessage(state, `📡 INTEL: Extraction open at ${activeExfil.name}!`, 'intel');
            } else {
              addMessage(state, '📡 INTEL: No extraction points available!', 'warning');
            }
          } else if (panel.id === 'alarm_disable') {
            // Alarm disable terminal
            state.alarmActive = false;
            addMessage(state, '🔇 BASE ALARM DISABLED! Enemies return to patrol.', 'intel');
            for (const e of state.enemies) {
              if (e.state !== 'dead' && e.type !== 'turret' && !e.elevated) {
                if (e.state === 'chase' || e.state === 'investigate' || e.state === 'alert') {
                  e.state = 'patrol';
                  e.tacticalRole = 'none';
                }
              }
            }
          } else if (panel.id === 'alarm_codebook') {
            // Nuclear codebook terminal
            state.hasNuclearCodes = true;
            addMessage(state, '☢ NUCLEAR LAUNCH CODES ACQUIRED! Extract with USB + codes!', 'intel');
            state.player.inventory.push({
              id: 'nuclear_codebook',
              name: 'Nuclear Codebook',
              category: 'valuable',
              icon: '☢',
              weight: 0.5,
              value: 10000,
              description: 'Missile activation codes — CRITICAL INTEL',
            });
          } else if (panel.id === 'alarm_radio') {
            // Radio tower — disable comms
            (state as any)._radioDisabled = true;
            addMessage(state, '📡 COMMUNICATIONS DISABLED! Enemy reinforcements cut off!', 'intel');
            // Reduce all enemy alert ranges by 30%
            for (const e of state.enemies) {
              if (e.state !== 'dead') {
                e.alertRange = Math.round(e.alertRange * 0.7);
              }
            }
          }
        } else {
          const label = panel.id === 'alarm_intel' ? 'intel' : panel.id === 'alarm_disable' ? 'alarm' : panel.id === 'alarm_radio' ? 'radio' : 'codebook';
          addMessage(state, `💻 Hacking ${label}... ${Math.floor(panel.hackProgress * 100)}%`, 'info');
        }
      }
    }

  }

  // Manual healing (H key) OR auto-heal when HP < 40
  const shouldAutoHeal = state.player.hp < 40 && state.player.hp > 0;
  if (input.heal || shouldAutoHeal) {
    const player = state.player;
    const morphineMax = Math.floor(player.maxHp * 1.5); // morphine allows up to 150%
    const needsHeal = player.hp < player.maxHp;
    const isBleeding = player.bleedRate > 0;

    // Priority: bandage if bleeding, then medkit, then morphine
    let medIdx = -1;
    if (isBleeding) {
      medIdx = player.inventory.findIndex(i => i.category === 'medical' && i.medicalType === 'bandage');
    }
    if (medIdx < 0 && needsHeal) {
      medIdx = player.inventory.findIndex(i => i.category === 'medical' && i.medicalType === 'medkit');
    }
    if (medIdx < 0 && needsHeal) {
      medIdx = player.inventory.findIndex(i => i.category === 'medical' && i.medicalType === 'morphine');
    }
    if (medIdx < 0 && isBleeding) {
      medIdx = player.inventory.findIndex(i => i.category === 'medical');
    }

    if (medIdx >= 0) {
      const med = player.inventory[medIdx];
      const capHp = med.medicalType === 'morphine' ? morphineMax : player.maxHp;
      player.hp = Math.min(capHp, player.hp + (med.healAmount || 0));
      if (med.stopsBleeding) {
        player.bleedRate = Math.max(0, player.bleedRate - med.stopsBleeding);
      }
      if (med.speedBoost && med.speedBoost > 0) {
        state.speedBoostTimer = med.speedBoost;
        addMessage(state, `⚡ ADRENALINE RUSH! Speed boost for ${med.speedBoost}s`, 'info');
      }
      player.inventory.splice(medIdx, 1);
      addMessage(state, `💊 ${med.name} (+${med.healAmount}HP)`, 'info');
      spawnParticles(state, player.pos.x, player.pos.y, '#44ff66', 5);
    } else if (input.heal && (needsHeal || isBleeding)) {
      addMessage(state, '⚠ No medicine!', 'warning');
    }
    input.heal = false;
  }

  // Bleeding — gradually heals itself over time
  if (state.player.bleedRate > 0) {
    state.player.hp -= state.player.bleedRate * dt;
    // Bleed decays naturally: ~0.15/sec, so a 0.5 bleed stops in ~3s, a 1.5 bleed in ~10s
    state.player.bleedRate = Math.max(0, state.player.bleedRate - 0.15 * dt);
    if (state.player.bleedRate <= 0.05) {
      state.player.bleedRate = 0;
      addMessage(state, '🩹 Bleeding stopped on its own', 'info');
    }
    if (Math.random() < 0.1) {
      spawnParticles(state, state.player.pos.x + (Math.random()-0.5)*10, state.player.pos.y + (Math.random()-0.5)*10, '#cc3333', 1);
    }
  }

  // Death check — emergency injector saves from lethal damage
  if (state.player.hp <= 0 && !state.gameOver) {
    const injectorIdx = state.player.inventory.findIndex(i => i.id === 'emergency_injector' || i.name === 'Emergency Injector');
    if (injectorIdx >= 0) {
      state.player.inventory.splice(injectorIdx, 1);
      state.player.hp = 75;
      state.player.bleedRate = 0;
      state.speedBoostTimer = Math.max(state.speedBoostTimer, 3);
      addMessage(state, '💉 EMERGENCY INJECTOR! Revived to 75 HP!', 'info');
      spawnParticles(state, state.player.pos.x, state.player.pos.y, '#44ff88', 15);
      spawnParticles(state, state.player.pos.x, state.player.pos.y, '#ffffff', 10);
    } else {
      state.player.hp = 0;
      state.gameOver = true;
      if (!state.deathCause) state.deathCause = state.player.bleedRate > 0 ? '🩸 Bled out' : '☠ Killed in action';
      addMessage(state, '☠ DEAD', 'damage');
    }
    if (state.gameOver) return state;
  }

  // Extraction check — map-specific success conditions
  const mapId = (state as any)._mapId as MapId | undefined;
  const isObjekt47 = mapId === 'objekt47';
  const hasUSB = state.player.inventory.some(i => i.id === 'boss_usb');
  const hasCodes = state.hasNuclearCodes;
  // Only Objekt 47 requires USB + nuclear codes; other maps just require extraction code
  const fullSuccess = isObjekt47 ? (hasUSB && hasCodes) : state.hasExtractionCode;
  let inExtraction = false;
  for (const ep of state.extractionPoints) {
    // Track visiting exfil points (within 150px)
    if (dist(state.player.pos, ep.pos) < 150) {
      state.exfilsVisited.add(ep.name);
    }
    if (!ep.active) continue;
    
    // ── CONDITIONAL EXFILS ── some extraction points have requirements
    const exfilReqs = (ep as any)._requirements as string | undefined;
    if (exfilReqs && !checkExfilRequirements(state, exfilReqs)) {
      // Show requirement message when player is near
      const d = dist(state.player.pos, ep.pos);
      if (d < ep.radius + 30 && Math.floor(state.time * 2) !== Math.floor((state.time - dt) * 2)) {
        const reqMsg = getExfilRequirementMessage(exfilReqs);
        addMessage(state, `🔒 ${ep.name}: ${reqMsg}`, 'warning');
      }
      continue; // Skip this exfil
    }
    
    const d = dist(state.player.pos, ep.pos);
    if (d < ep.radius) {
      // ── ELEVATOR TRANSITION (mining village level swap) ──
      const isElevator = (ep as any)._isElevator;
      if (isElevator) {
        if (state.extractionProgress === 0) {
          const dir = (ep as any)._elevatorDirection;
          addMessage(state, dir === 'down' ? '⛏ DESCENDING INTO THE MINE...' : '⛏ ASCENDING TO SURFACE...', 'intel');
        }
        inExtraction = true;
        state.extractionProgress += dt;
        if (state.extractionProgress >= ep.timer) {
          // Start blackout fade, then perform transition mid-fade
          (state as any)._elevatorFadeDir = (ep as any)._elevatorDirection;
          (state as any)._elevatorFade = 2.0; // total fade duration (1s black-in, 1s black-out)
          (state as any)._elevatorSwapped = false;
          state.extractionProgress = 0;
        }
        continue; // skip normal extraction logic for elevator
      }

      if (!fullSuccess && Math.floor(state.time * 2) !== Math.floor((state.time - dt) * 2)) {
        if (isObjekt47) {
          const missing: string[] = [];
          if (!hasUSB) missing.push('USB drive');
          if (!hasCodes) missing.push('nuclear codes');
          addMessage(state, `⚠ Missing: ${missing.join(' & ')} — extract incomplete!`, 'warning');
        } else if (!state.hasExtractionCode) {
          addMessage(state, `⚠ Missing extraction code — extract incomplete!`, 'warning');
        }
      }
      // Show entering message once
      if (state.extractionProgress === 0) {
        addMessage(state, `🚁 EXTRACTING — hold position!`, 'loot');
      }
      inExtraction = true;
      state.extractionProgress += dt;
      if (state.extractionProgress >= ep.timer) {
        state.extracted = true;
        state.hasExtractionCode = fullSuccess;
        addMessage(state, fullSuccess
          ? `💾 FULL SUCCESS — EXTRACTED: ${ep.name}!`
          : `⚠ EXTRACTED — MISSION INCOMPLETE`, fullSuccess ? 'info' : 'warning');
      }
    } else if (d < 300 && Math.floor(state.time) % 5 === 0 && Math.floor(state.time) !== Math.floor(state.time - dt)) {
      // Nearby hint when within 300px of active exfil
      addMessage(state, `🚁 Extraction nearby — move to ${ep.name}!`, 'info');
    }
  }
  if (!inExtraction) {
    state.extractionProgress = Math.max(0, state.extractionProgress - dt * 2);
  }

  // Clean up old sound events (older than 1s, or >20 keep only last 1s)
  if (state.soundEvents.length > 10) {
    state.soundEvents = state.soundEvents.filter(se => state.time - se.time < 1.0);
  }

  // === REINFORCEMENT SPAWNING from forest paths ===
  state.reinforcementTimer -= dt;
  if (state.reinforcementTimer <= 0 && state.reinforcementsSpawned < state.maxReinforcements) {
    const spawnExfils = state.extractionPoints.filter(ep => !ep.active);
    const sp = spawnExfils.length > 0 ? spawnExfils[Math.floor(Math.random() * spawnExfils.length)] : state.extractionPoints[Math.floor(Math.random() * state.extractionPoints.length)];
    // Only 1 reinforcement at a time
    const ox = (Math.random() - 0.5) * 60, oy = (Math.random() - 0.5) * 60;
    const rp = { x: sp.pos.x + ox, y: sp.pos.y + oy };
    const rt: Enemy['type'] = Math.random() < 0.3 ? 'heavy' : 'soldier';
    const re: Enemy = {
      id: `reinf_${state.reinforcementsSpawned}_0`, pos: rp,
      hp: rt === 'heavy' ? 180 : 80, maxHp: rt === 'heavy' ? 180 : 80,
      speed: rt === 'heavy' ? 0.63 : 1.17, damage: rt === 'heavy' ? 35 : 22,
      alertRange: 180, shootRange: 150, fireRate: rt === 'heavy' ? 1600 : 900,
      state: 'chase', patrolTarget: { x: state.mapWidth / 2, y: state.mapHeight / 2 },
      investigateTarget: { ...state.player.pos }, lastShot: 0,
      angle: Math.atan2(state.player.pos.y - rp.y, state.player.pos.x - rp.x),
      type: rt, eyeBlink: 3, loot: [], looted: false,
      lastRadioCall: state.time, radioGroup: 99, radioAlert: 2,
      tacticalRole: rt === 'heavy' ? 'suppressor' : 'assault',
      flankTarget: undefined, suppressTimer: 0, callForHelpTimer: 0,
      lastTacticalSwitch: 0, stunTimer: 0, awareness: 1, awarenessDecay: 0.15, elevated: false, friendly: false, friendlyTimer: 0,
    };
    state.enemies.push(re);
    state.reinforcementsSpawned++;
    addMessage(state, `\u{1F6A8} Reinforcement from ${sp.name}!`, 'warning');
    state.reinforcementTimer = 60 + Math.random() * 40; // slower spawning
  }

  // === AMBIENT ATMOSPHERE MESSAGES ===
  {
    if (!(state as any)._lastAmbientTime) (state as any)._lastAmbientTime = state.time + 15 + Math.random() * 10; // first message after 15-25s
    if (state.time >= (state as any)._lastAmbientTime) {
      const mapId = (state as any)._mapId as string || 'objekt47';
      const pool = AMBIENT_MESSAGES[mapId];
      if (pool && pool.length > 0) {
        const msg = pool[Math.floor(Math.random() * pool.length)];
        addMessage(state, msg, 'info');
      }
      (state as any)._lastAmbientTime = state.time + 25 + Math.random() * 20; // every 25-45s
    }
  }

  // Sound cleanup already done above — skip redundant filter

  // Cap bullets to prevent lag from rapid-fire scenarios
  if (state.bullets.length > 150) {
    state.bullets = state.bullets.slice(-100);
  }

  // === CONTEXTUAL TUTORIAL — first-time tips ===
  {
    if (!(state as any)._tutorialsSeen) (state as any)._tutorialsSeen = new Set<string>();
    const seen = (state as any)._tutorialsSeen as Set<string>;
    const currentTip = (state as any)._activeTutorialTip;
    const tipAge = currentTip ? state.time - currentTip.startTime : 999;
    
    // Only show one tip at a time, wait until current fades
    if (!currentTip || tipAge > 6) {
      let newTip: { text: string; worldPos?: { x: number; y: number }; startTime: number } | null = null;

      // Tip: First enemy nearby — teach sneaking
      if (!seen.has('sneak') && state.enemies.some(e => e.state !== 'dead' && dist(state.player.pos, e.pos) < 200)) {
        seen.add('sneak');
        newTip = { text: 'Hold Ctrl to sneak · Enemies have vision cones', startTime: state.time };
      }
      // Tip: Low HP — teach healing
      else if (!seen.has('heal') && state.player.hp < 50 && state.player.hp > 0) {
        seen.add('heal');
        newTip = { text: 'Press H to heal · Bandages stop bleeding', startTime: state.time };
      }
      // Tip: Near cover object — teach cover
      else if (!seen.has('cover') && state.coverNearby && !state.player.inCover) {
        seen.add('cover');
        newTip = { text: 'Press Q near obstacles to take cover', startTime: state.time };
      }
      // Tip: First kill — teach looting
      else if (!seen.has('loot') && state.killCount === 1) {
        seen.add('loot');
        newTip = { text: 'Press E near bodies to loot · Weapons drop separately', startTime: state.time };
      }
      // Tip: Got a weapon — teach reload
      else if (!seen.has('reload') && state.player.primaryWeapon && state.player.currentAmmo < state.player.maxAmmo) {
        seen.add('reload');
        newTip = { text: 'Press R to reload · Ammo stored in vest', startTime: state.time };
      }
      // Tip: Multiple enemies ahead — teach rock distraction
      else if (!seen.has('rock') && state.enemies.filter(e => e.state !== 'dead' && dist(state.player.pos, e.pos) < 300).length >= 2) {
        seen.add('rock');
        newTip = { text: 'Middle click to throw distraction rock', startTime: state.time };
      }
      // Tip: Behind an unaware enemy — teach chokehold
      else if (!seen.has('chokehold') && state.enemies.some(e => e.state !== 'dead' && e.awareness < 0.3 && dist(state.player.pos, e.pos) < 80)) {
        seen.add('chokehold');
        newTip = { text: 'Press E behind unaware enemy for silent chokehold', startTime: state.time };
      }

      if (newTip) {
        (state as any)._activeTutorialTip = newTip;
      } else if (tipAge > 6) {
        (state as any)._activeTutorialTip = null;
      }
    }
  }

  // Reset stealth detection tracking — recalculated per frame
  (state as any)._stealthDetection = 0;
  (state as any)._stealthNearestState = 'idle';
  (state as any)._stealthNearestType = '';
  (state as any)._stealthNearestDist = 9999;
  
  const viewCx = state.camera.x - 600;
  const viewCy = state.camera.y - 600;
  const viewW = 1200;
  const viewH = 1200;
  let revealedByContact = false;
  for (const enemy of state.enemies) {
    if (enemy.state === 'dead') continue;

    // Hard contact fail-safe: direct body contact always reveals player and forces aggro
    const contactDistSq = distSq(enemy.pos, state.player.pos);
    const playerHiddenNow = !!(state as any)._playerHiding;
    if (contactDistSq < 1764) { // 42²
      if (playerHiddenNow) {
        (state as any)._playerHiding = false;
        state.player.peeking = false;
        if (!revealedByContact) {
          addMessage(state, '⚠ Revealed by enemy contact!', 'warning');
          revealedByContact = true;
        }
      }
      delete (enemy as any)._reactionDelay;
      delete (enemy as any)._pendingState;
      (enemy as any)._seekCover = false;
      (enemy as any)._coverPos = null;
      enemy.awareness = Math.max(enemy.awareness, 0.98);
      if (enemy.type !== 'turret' && enemy.state !== 'attack' && enemy.state !== 'suppress') {
        enemy.state = 'chase';
      }
      enemy.investigateTarget = { ...state.player.pos };
    }

    // Anti-stall fail-safe: if enemy hasn't moved for a while, force a local escape step
    const lastPos = (enemy as any)._lastPos as Vec2 | undefined;
    if (lastPos) {
      const movedSq = distSq(enemy.pos, lastPos);
      if (movedSq < 0.04) (enemy as any)._stuckTime = ((enemy as any)._stuckTime || 0) + dt;
      else (enemy as any)._stuckTime = 0;
    }
    // Reuse object to avoid GC pressure
    if (!(enemy as any)._lastPos) (enemy as any)._lastPos = { x: 0, y: 0 };
    (enemy as any)._lastPos.x = enemy.pos.x;
    (enemy as any)._lastPos.y = enemy.pos.y;
    if ((enemy as any)._stuckTime > 1.2 && enemy.type !== 'turret') {
      const escapeStep = findEnemyEscapeStep(state, enemy.pos, Math.max(8, enemy.speed * 1.5), 10);
      if (escapeStep) enemy.pos = escapeStep;
      else relocateEnemyToOpenArea(state, enemy);
      if (enemy.state === 'idle' || enemy.state === 'patrol' || enemy.state === 'investigate') {
        enemy.patrolTarget = pickPatrolTarget(state, enemy, 100, 260);
        enemy.state = 'patrol';
      }
      (enemy as any)._stuckTime = 0;
    }

    // Keep AI fully active so enemies always patrol/aggro reliably
    // (previous off-screen idle skip could make encounters feel frozen).

    // Friendly timer countdown
    if (enemy.friendly) {
      enemy.friendlyTimer -= dt;
      if (enemy.friendlyTimer <= 0) {
        enemy.friendly = false;
        enemy.friendlyTimer = 0;
        enemy.state = 'chase'; // turn hostile again
        addMessage(state, `⚠ ${enemy.type.toUpperCase()} is no longer friendly!`, 'warning');
      } else {
        // Friendly AI: attack nearest non-friendly enemy
        let nearestHostile: Enemy | null = null;
        let nearestDistSq = enemy.shootRange * enemy.shootRange;
        for (const other of state.enemies) {
          if (other === enemy || other.state === 'dead' || other.friendly) continue;
          const dSq = distSq(enemy.pos, other.pos);
          if (dSq < nearestDistSq) { nearestHostile = other; nearestDistSq = dSq; }
        }
        if (nearestHostile) {
          enemy.angle = Math.atan2(nearestHostile.pos.y - enemy.pos.y, nearestHostile.pos.x - enemy.pos.x);
          if (nearestDistSq > 10000) { // 100²
            // Move towards target
            const mv = normalize({ x: nearestHostile.pos.x - enemy.pos.x, y: nearestHostile.pos.y - enemy.pos.y });
            enemy.pos = tryMoveEnemy(state, enemy.pos, mv.x * enemy.speed * dt * 60, mv.y * enemy.speed * dt * 60, 10);
          }
          // Shoot at hostile enemy — use state.time for consistency
          if (state.time - enemy.lastShot > enemy.fireRate / 1000) {
            enemy.lastShot = state.time;
            const spread = (Math.random() - 0.5) * 0.15;
            state.bullets.push({
              pos: { ...enemy.pos },
              vel: { x: Math.cos(enemy.angle + spread) * 9, y: Math.sin(enemy.angle + spread) * 9 },
              damage: enemy.damage,
              damageType: 'bullet',
              fromPlayer: false,
              life: 40,
              sourceId: enemy.id,
              sourceType: 'friendly',
            });
          }
        } else {
          // Follow player
          const dToPlayer = dist(enemy.pos, state.player.pos);
          if (dToPlayer > 80) {
            const mv = normalize({ x: state.player.pos.x - enemy.pos.x, y: state.player.pos.y - enemy.pos.y });
            enemy.pos = tryMoveEnemy(state, enemy.pos, mv.x * enemy.speed * dt * 60, mv.y * enemy.speed * dt * 60, 10);
          }
          enemy.angle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
        }
        // Green particles to show friendly status
        if (Math.random() < 0.05) spawnParticles(state, enemy.pos.x, enemy.pos.y, '#44ff44', 1);
        continue;
      }
    }

    // Stunned enemies can't act
    if (enemy.stunTimer > 0) {
      enemy.stunTimer -= dt;
      enemy.state = 'idle';
      continue;
    }

    // === GRENADE FLEE — enemies run from incoming grenades, can't shoot ===
    if ((enemy as any)._grenadeFlee > 0) {
      (enemy as any)._grenadeFlee -= dt;
      const fleeAngle = (enemy as any)._grenadeFleeAngle || 0;
      const fleeSpeed = enemy.speed * dt * 60 * 2.0;
      const oldPos = { ...enemy.pos };
      enemy.pos = tryMoveEnemy(state, enemy.pos, Math.cos(fleeAngle) * fleeSpeed, Math.sin(fleeAngle) * fleeSpeed, 10);
      enemy.angle = fleeAngle;

      // Detect if trapped (didn't move much → wall blocked)
      const moved = dist(oldPos, enemy.pos);
      if (moved < 0.5) {
        (enemy as any)._fleeBlocked = ((enemy as any)._fleeBlocked || 0) + dt;
      } else {
        (enemy as any)._fleeBlocked = 0;
      }
      // If blocked for 0.3s+, enemy is trapped — rush the player instead
      if ((enemy as any)._fleeBlocked > 0.3) {
        delete (enemy as any)._grenadeFlee;
        delete (enemy as any)._grenadeFleeAngle;
        delete (enemy as any)._grenadeFleeRolled;
        delete (enemy as any)._fleeBlocked;
        enemy.state = 'chase';
        enemy.speechBubble = 'ВПЕРЁД!';
        enemy.speechBubbleTimer = 1.5;
        addMessage(state, `⚔️ ${enemy.type.toUpperCase()} trapped — charging!`, 'info');
        continue;
      }

      // Yellow warning particles
      if (Math.random() < 0.15) {
        spawnParticles(state, enemy.pos.x, enemy.pos.y, '#ffcc44', 1);
      }
      if ((enemy as any)._grenadeFlee <= 0) {
        delete (enemy as any)._grenadeFlee;
        delete (enemy as any)._grenadeFleeAngle;
        delete (enemy as any)._grenadeFleeRolled;
        delete (enemy as any)._fleeBlocked;
        enemy.state = 'investigate';
        enemy.investigateTarget = { ...state.player.pos };
      }
      continue;
    }

    // === PANIC STATE — random shooting, running everywhere, friendly fire ===
    if ((enemy as any)._panicTimer > 0) {
      (enemy as any)._panicTimer -= dt;
      // Spin around wildly — completely random direction changes
      enemy.angle += (Math.random() - 0.5) * 12 * dt;
      // Run in chaotic random directions (change direction frequently)
      if (!(enemy as any)._panicDirTimer || (enemy as any)._panicDirTimer <= 0) {
        (enemy as any)._panicAngle = Math.random() * Math.PI * 2;
        (enemy as any)._panicDirTimer = 0.3 + Math.random() * 0.5;
      }
      (enemy as any)._panicDirTimer -= dt;
      const pAngle = (enemy as any)._panicAngle || 0;
      const panicSpeed = enemy.speed * dt * 60 * 2.0;
      enemy.pos = tryMoveEnemy(state, enemy.pos, Math.cos(pAngle) * panicSpeed, Math.sin(pAngle) * panicSpeed, 10);
      // Panic fire — random bullets in all directions (friendly fire!)
      if (Math.random() < 0.18) {
        const panicAngle = enemy.angle + Math.PI + (Math.random() - 0.5) * 2.5; // mostly AWAY from where they're facing (toward player)
        state.bullets.push({
          pos: { x: enemy.pos.x + Math.cos(panicAngle) * 14, y: enemy.pos.y + Math.sin(panicAngle) * 14 },
          vel: { x: Math.cos(panicAngle) * 7.5, y: Math.sin(panicAngle) * 7.5 },
          damage: enemy.damage * 0.5, damageType: 'bullet', fromPlayer: false, life: 35,
          sourceId: enemy.id, sourceType: enemy.type,
        });
        state.soundEvents.push({ pos: { ...enemy.pos }, radius: 250, time: state.time });
        playGunshot('rifle');
      }
      // Yellow panic particles
      if (Math.random() < 0.25) {
        spawnParticles(state, enemy.pos.x + (Math.random() - 0.5) * 10, enemy.pos.y + (Math.random() - 0.5) * 10, '#ffff44', 1);
      }
      if ((enemy as any)._panicTimer <= 0) {
        enemy.state = 'investigate';
        enemy.investigateTarget = { x: enemy.pos.x + (Math.random() - 0.5) * 300, y: enemy.pos.y + (Math.random() - 0.5) * 300 };
      }
      continue;
    }

    // === BERSERK STATE — charges player, double HP, 10 seconds ===
    if ((enemy as any)._berserkTimer > 0) {
      (enemy as any)._berserkTimer -= dt;
      // Rush toward player but stop at minimum distance to avoid overlapping
      const toPlayer = normalize({ x: state.player.pos.x - enemy.pos.x, y: state.player.pos.y - enemy.pos.y });
      enemy.angle = Math.atan2(toPlayer.y, toPlayer.x);
      const distToPlayer = dist(enemy.pos, state.player.pos);
      const MIN_BERSERK_DIST = 40; // don't run on top of the player
      if (distToPlayer > MIN_BERSERK_DIST) {
        const berserkSpeed = ((enemy as any)._originalSpeed || enemy.speed) * dt * 60 * 1.875; // 25% reduced
        // Slow down when approaching minimum distance
        const approachFactor = Math.min(1, (distToPlayer - MIN_BERSERK_DIST) / 60);
        enemy.pos = tryMoveEnemy(state, enemy.pos, toPlayer.x * berserkSpeed * approachFactor, toPlayer.y * berserkSpeed * approachFactor, 10);
      }
      // Rapid fire toward player
      if (state.time - enemy.lastShot > enemy.fireRate / 1000 * 0.5 && dist(enemy.pos, state.player.pos) < enemy.shootRange * 1.5) {
        const spread = (Math.random() - 0.5) * 0.25;
        const angle = enemy.angle + spread;
        state.bullets.push({
          pos: { x: enemy.pos.x + Math.cos(angle) * 14, y: enemy.pos.y + Math.sin(angle) * 14 },
          vel: { x: Math.cos(angle) * 10.5, y: Math.sin(angle) * 10.5 },
          damage: enemy.damage, damageType: 'bullet', fromPlayer: false, life: 50,
          sourceId: enemy.id, sourceType: enemy.type,
        });
        enemy.lastShot = state.time;
        state.soundEvents.push({ pos: { ...enemy.pos }, radius: 250, time: state.time });
        playGunshot('rifle');
      }
      // Red berserk particles
      if (Math.random() < 0.3) {
        spawnParticles(state, enemy.pos.x, enemy.pos.y, '#ff2222', 1);
      }
      if ((enemy as any)._berserkTimer <= 0) {
        // Berserk ends — restore original HP
        enemy.maxHp = (enemy as any)._preBerserkMaxHp || enemy.maxHp;
        enemy.hp = Math.min(enemy.hp, enemy.maxHp);
        enemy.state = 'chase';
      }
      continue;
    }

    // === PRONE STATE — lying in grass, harder to hit ===
    if ((enemy as any)._proneTimer > 0) {
      (enemy as any)._proneTimer -= dt;
      // Almost no movement while prone
      enemy.angle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
      // Can still shoot while prone (slowly)
      if (state.time - enemy.lastShot > enemy.fireRate / 1000 * 1.5 && dist(enemy.pos, state.player.pos) < enemy.shootRange && hasLineOfSight(state, enemy.pos, state.player.pos, enemy.elevated)) {
        const spread = (Math.random() - 0.5) * 0.12;
        const angle = enemy.angle + spread;
        state.bullets.push({
          pos: { x: enemy.pos.x + Math.cos(angle) * 14, y: enemy.pos.y + Math.sin(angle) * 14 },
          vel: { x: Math.cos(angle) * 9, y: Math.sin(angle) * 9 },
          damage: enemy.damage, damageType: 'bullet', fromPlayer: false, life: 50,
          sourceId: enemy.id, sourceType: enemy.type,
        });
        enemy.lastShot = state.time;
        state.soundEvents.push({ pos: { ...enemy.pos }, radius: 150, time: state.time });
        playGunshot('rifle');
      }
      if ((enemy as any)._proneTimer <= 0) {
        // Getting up — 1s for boss, 2s for others
        (enemy as any)._proneGetUpTimer = enemy.type === 'boss' ? 1.0 : 2.0;
        enemy.state = 'attack';
      }
      continue;
    }
    // Prone get-up speed penalty
    if ((enemy as any)._proneGetUpTimer > 0) {
      (enemy as any)._proneGetUpTimer -= dt;
      if ((enemy as any)._originalSpeed) enemy.speed = (enemy as any)._originalSpeed * 0.25;
      if ((enemy as any)._proneGetUpTimer <= 0) {
        if ((enemy as any)._originalSpeed) enemy.speed = (enemy as any)._originalSpeed;
      }
    }
    // Prone go-down speed penalty
    if ((enemy as any)._proneGoDownTimer > 0) {
      (enemy as any)._proneGoDownTimer -= dt;
      if ((enemy as any)._originalSpeed) enemy.speed = (enemy as any)._originalSpeed * 0.25;
      if ((enemy as any)._proneGoDownTimer <= 0) {
        (enemy as any)._proneTimer = 4 + Math.random() * 4; // stay prone 4-8s
      }
      continue;
    }

    // === LOW HP EFFECTS ===
    const hpRatio = enemy.hp / enemy.maxHp;
    // Blood drip from damaged enemies
    if (hpRatio < 0.75 && enemy.type !== 'turret' && Math.random() < (hpRatio < 0.3 ? 0.03 : 0.01)) {
      spawnParticles(state, enemy.pos.x + (Math.random() - 0.5) * 8, enemy.pos.y + (Math.random() - 0.5) * 8, '#991111', 1);
    }
    // Speed penalty at <75% HP
    if (hpRatio < 0.75 && enemy.type !== 'turret' && enemy.type !== 'boss') {
      if (!(enemy as any)._originalSpeed) (enemy as any)._originalSpeed = enemy.speed;
      enemy.speed = (enemy as any)._originalSpeed * 0.25; // 75% speed loss
    }
    // === RETREAT & REGROUP — low HP enemies have varied reactions ===
    if (enemy.type !== 'turret' && enemy.type !== 'boss' && enemy.type !== 'sniper' && !(enemy as any)._isBodyguard) {
      if (!(enemy as any)._fleeCheckTimer) (enemy as any)._fleeCheckTimer = 1.0;
      (enemy as any)._fleeCheckTimer -= dt;
      if ((enemy as any)._fleeCheckTimer <= 0) {
        (enemy as any)._fleeCheckTimer = 1.0;
        const cowardice = (enemy as any)._cowardice ?? 0.3;
        const aggression = (enemy as any)._aggression ?? 0.5;
        const fleeThresholdHigh = 0.50 + cowardice * 0.25;
        const fleeThresholdLow = 0.30 + cowardice * 0.20;
        const fleeChance = hpRatio < fleeThresholdLow ? (0.10 + cowardice * 0.25) : hpRatio < fleeThresholdHigh ? (0.05 + cowardice * 0.15) : 0;
        if (fleeChance > 0 && Math.random() < fleeChance && (enemy.state === 'chase' || enemy.state === 'attack' || enemy.state === 'flank' || enemy.state === 'suppress')) {
          // Random reaction: flee (40%), retreat to ally (30%), go berserk (15%), fight through (15%)
          const reaction = Math.random();
          const berserkChance = 0.15 + aggression * 0.15; // aggressive enemies more likely to berserk
          const retreatChance = 0.30;
          const fleeFullChance = 0.40 - aggression * 0.15; // aggressive enemies less likely to flee

          if (reaction < fleeFullChance) {
            // Full flee — run away from player
            const awayAngle = Math.atan2(enemy.pos.y - state.player.pos.y, enemy.pos.x - state.player.pos.x);
            enemy.investigateTarget = {
              x: Math.max(50, Math.min(state.mapWidth - 50, enemy.pos.x + Math.cos(awayAngle) * 300)),
              y: Math.max(50, Math.min(state.mapHeight - 50, enemy.pos.y + Math.sin(awayAngle) * 300)),
            };
            enemy.state = 'investigate';
            if ((enemy as any)._originalSpeed) enemy.speed = (enemy as any)._originalSpeed * (cowardice > 0.5 ? 0.7 : 0.5);
            setSpeech(enemy, pickLine(FLEE_LINES, enemy.type), 2.0);
            addMessage(state, `💨 ${enemy.type.toUpperCase()} is fleeing!`, 'info');
          } else if (reaction < fleeFullChance + retreatChance) {
            // Retreat to nearest alive ally — regroup
            let nearestAlly: Enemy | null = null;
            let nearestDsq = 250000; // 500²
            for (const ally of state.enemies) {
              if (ally === enemy || ally.state === 'dead' || ally.type === 'turret' || ally.type === 'dog') continue;
              const dsq = distSq(enemy.pos, ally.pos);
              if (dsq < nearestDsq && dsq > 2500) { // at least 50px away
                nearestDsq = dsq;
                nearestAlly = ally;
              }
            }
            if (nearestAlly) {
              enemy.investigateTarget = { ...nearestAlly.pos };
              enemy.state = 'investigate';
              if ((enemy as any)._originalSpeed) enemy.speed = (enemy as any)._originalSpeed * 0.6;
              setSpeech(enemy, 'ОТХОДИМ!', 2.0);
              addMessage(state, `🔙 ${enemy.type.toUpperCase()} retreats to regroup!`, 'info');
            } else {
              // No ally found — flee instead
              const awayAngle = Math.atan2(enemy.pos.y - state.player.pos.y, enemy.pos.x - state.player.pos.x);
              enemy.investigateTarget = {
                x: Math.max(50, Math.min(state.mapWidth - 50, enemy.pos.x + Math.cos(awayAngle) * 250)),
                y: Math.max(50, Math.min(state.mapHeight - 50, enemy.pos.y + Math.sin(awayAngle) * 250)),
              };
              enemy.state = 'investigate';
              setSpeech(enemy, pickLine(FLEE_LINES, enemy.type), 2.0);
            }
          } else if (reaction < fleeFullChance + retreatChance + berserkChance) {
            // Berserk — adrenaline surge, fight harder
            if (!(enemy as any)._berserkTimer) {
              (enemy as any)._berserkTimer = 4 + Math.random() * 8; // 4-12s randomized
              if (!(enemy as any)._originalSpeed) (enemy as any)._originalSpeed = enemy.speed;
              enemy.speed = ((enemy as any)._originalSpeed || enemy.speed) * 1.5;
              enemy.damage *= 1.3;
              setSpeech(enemy, 'АААА!!!', 2.5);
              addMessage(state, `🔥 ${enemy.type.toUpperCase()} goes BERSERK instead of fleeing!`, 'warning');
            }
          }
          // else: fight through — do nothing, keep current behavior (15% base)
        }
      }
    }

    enemy.eyeBlink -= dt;
    if (enemy.eyeBlink <= 0) enemy.eyeBlink = 3 + Math.random() * 4;

    // Check if enemy is rushing to take over a platform
    const platformTarget = (enemy as any)._platformTarget as Vec2 | undefined;
    if (platformTarget && dist(enemy.pos, platformTarget) < 20) {
      enemy.elevated = true;
      enemy.pos = { ...platformTarget };
      enemy.state = 'idle';
      enemy.alertRange = 180;
      enemy.shootRange = 150;
      delete (enemy as any)._platformTarget;
      // Remove the temp prop (watchtower) since guard is now on it
      const propIdx = state.props.findIndex(p => p.type === 'watchtower' && dist(p.pos, platformTarget) < 10);
      if (propIdx >= 0) state.props.splice(propIdx, 1);
      addMessage(state, '⚠ New guard on the platform!', 'warning');
    }

    // Boss phase transitions based on HP
    if (enemy.type === 'boss') {
      const hpRatio = enemy.hp / enemy.maxHp;
      const oldPhase = enemy.bossPhase || 0;
      if (hpRatio < 0.3) enemy.bossPhase = 2;
      else if (hpRatio < 0.6) enemy.bossPhase = 1;
      else enemy.bossPhase = 0;
      
      if (enemy.bossPhase !== oldPhase) {
        const bossId = (enemy as any)._bossId;
        let phaseNames: string[];
        if (bossId === 'kravtsov') phaseNames = KRAVTSOV_PHASES;
        else if (bossId === 'uzbek') phaseNames = UZBEK_PHASES;
        else if (bossId === 'nachalnik') phaseNames = NACHALNIK_PHASES;
        else if (bossId === 'gruvra') phaseNames = GRUVRA_PHASES;
        else phaseNames = ['', '⚠ COMMANDANT OSIPOVITJ IS ENRAGED!', '☠ OSIPOVITJ IS DESPERATE — WATCH OUT!'];
        
        if (phaseNames[enemy.bossPhase!]) {
          addMessage(state, phaseNames[enemy.bossPhase!], 'warning');
        }
        // Phase transition speech bubbles
        if (bossId === 'uzbek') {
          if (enemy.bossPhase === 1) { enemy.speechBubble = '*ЦЕПИ ТРЕЩАТ*'; enemy.speechBubbleTimer = 3; }
          else if (enemy.bossPhase === 2) { enemy.speechBubble = '*НЕЧЕЛОВЕЧЕСКИЙ ВОЙ*'; enemy.speechBubbleTimer = 3; }
        } else if (bossId === 'kravtsov') {
          if (enemy.bossPhase === 1) { enemy.speechBubble = 'МУТАГЕН... АКТИВИРОВАН!'; enemy.speechBubbleTimer = 3; }
          else if (enemy.bossPhase === 2) { enemy.speechBubble = 'НАУКА... ТРЕБУЕТ... ЖЕРТВ!'; enemy.speechBubbleTimer = 3; }
        } else if (bossId === 'gruvra') {
          if (enemy.bossPhase === 1) { enemy.speechBubble = '*BERGET SKAKAR*'; enemy.speechBubbleTimer = 3; }
          else if (enemy.bossPhase === 2) { enemy.speechBubble = '*RASET BÖRJAR*'; enemy.speechBubbleTimer = 3; }
        } else {
          if (enemy.bossPhase === 1) { enemy.speechBubble = 'ВЫ МЕНЯ РАЗОЗЛИЛИ!'; enemy.speechBubbleTimer = 3; }
          else if (enemy.bossPhase === 2) { enemy.speechBubble = 'Я УБЬЮ ТЕБЯ ГОЛЫМИ РУКАМИ!'; enemy.speechBubbleTimer = 3; }
        }
        // Phase 1+: faster fire rate, more speed
        if (enemy.bossPhase! >= 1) {
          if (bossId === 'uzbek') {
            enemy.speed = 2.20; enemy.damage = 65; enemy.fireRate = 350;
          } else {
            enemy.fireRate = 350; enemy.speed = 1.49; enemy.damage = 35;
          }
        }
        if (enemy.bossPhase === 2) {
          if (bossId === 'uzbek') {
            enemy.speed = 2.80; enemy.damage = 80; enemy.fireRate = 300;
          } else {
            enemy.fireRate = 250; enemy.speed = 1.89; enemy.damage = 40;
          }
        }
      }

      // Boss combat taunts — random speech bubbles
      if (!enemy.speechBubble && (enemy.state === 'chase' || enemy.state === 'attack') && Math.random() < 0.002) {
        const phase = enemy.bossPhase || 0;
        const bossId = (enemy as any)._bossId;
        let pool: string[];
        if (bossId === 'kravtsov') {
          pool = KRAVTSOV_TAUNTS[Math.min(phase, 2)];
        } else if (bossId === 'uzbek') {
          pool = UZBEK_TAUNTS[Math.min(phase, 2)];
        } else if (bossId === 'nachalnik') {
          pool = NACHALNIK_TAUNTS[Math.min(phase, 2)];
        } else if (bossId === 'gruvra') {
          pool = GRUVRA_TAUNTS[Math.min(phase, 2)];
        } else {
          const taunts0 = ['СТОЯТЬ!', 'КТО ПУСТИЛ ТЕБЯ СЮДА?!', 'ЖАЛКИЙ ЧЕРВЬ...', 'ТЫ НЕ УЙДЁШЬ ОТСЮДА!', 'ОХРАНА!'];
          const taunts1 = ['ДАВАЙ! ПОДХОДИ!', 'Я ЛИЧНО ТЕБЯ ЗАКОПАЮ!', 'БОЛЬШЕ ОГНЯ!', 'ВСЕ СЮДА, НЕМЕДЛЕННО!'];
          const taunts2 = ['НЕЕЕТ!', 'ТЫ ОТВЕТИШЬ ЗА ЭТО!', 'Я ЕЩЁ СТОЮ!', 'НЕ СДАМСЯ...'];
          pool = phase === 2 ? taunts2 : phase === 1 ? taunts1 : taunts0;
        }
        enemy.speechBubble = pool[Math.floor(Math.random() * pool.length)];
        enemy.speechBubbleTimer = 2.5;
      }

      // === BOSS CALLOUTS — orders nearby enemies, triggering real behavior changes ===
      if (!enemy.speechBubble && (enemy.state === 'chase' || enemy.state === 'attack') && Math.random() < 0.003) {
        const nearbyAllies = state.enemies.filter(e => e !== enemy && e.state !== 'dead' && !e.friendly && e.type !== 'turret' && e.type !== 'dog' && dist(e.pos, enemy.pos) < 400);
        if (nearbyAllies.length > 0) {
          // Pick a random callout type — each triggers different behavior
          const calloutRoll = Math.random();
          if (calloutRoll < 0.25) {
            // FLANK ORDER — send one enemy to flank
            enemy.speechBubble = 'ФЛАНГ! ОБХОДИ!';
            enemy.speechBubbleTimer = 2.5;
            const flanker = nearbyAllies[Math.floor(Math.random() * nearbyAllies.length)];
            const perpAngle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x) + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
            flanker.flankTarget = {
              x: Math.max(50, Math.min(state.mapWidth - 50, state.player.pos.x + Math.cos(perpAngle) * 200)),
              y: Math.max(50, Math.min(state.mapHeight - 50, state.player.pos.y + Math.sin(perpAngle) * 200)),
            };
            flanker.state = 'flank';
            flanker.tacticalRole = 'flanker';
            setSpeech(flanker, 'ПОНЯЛ!', 1.5);
          } else if (calloutRoll < 0.50) {
            // GRENADE ORDER — tell an enemy to throw grenade if they can
            enemy.speechBubble = 'КИНЬ ГРАНАТУ!';
            enemy.speechBubbleTimer = 2.5;
            const thrower = nearbyAllies.find(e => e.type === 'soldier' || e.type === 'heavy');
            if (thrower && dist(thrower.pos, state.player.pos) < 300 && dist(thrower.pos, state.player.pos) > 110) {
              const gAngle = Math.atan2(state.player.pos.y - thrower.pos.y, state.player.pos.x - thrower.pos.x);
              state.grenades.push({
                pos: { ...thrower.pos }, vel: { x: Math.cos(gAngle) * 3.5, y: Math.sin(gAngle) * 3.5 },
                timer: 1.8, radius: 80, damage: 20, fromPlayer: false, sourceId: thrower.id, sourceType: thrower.type,
              });
              setSpeech(thrower, 'ГРАНАТА!', 1.5);
              addMessage(state, `💣 Boss orders grenade throw!`, 'warning');
            }
          } else if (calloutRoll < 0.70) {
            // SUPPRESS ORDER — one ally lays suppressive fire
            enemy.speechBubble = 'ПРИКРОЙ ОГНЁМ!';
            enemy.speechBubbleTimer = 2.5;
            const suppressor = nearbyAllies.find(e => e.type === 'soldier' || e.type === 'heavy');
            if (suppressor) {
              suppressor.state = 'suppress';
              suppressor.suppressTimer = 4 + Math.random() * 3;
              suppressor.tacticalRole = 'suppressor';
              setSpeech(suppressor, 'ЕСТЬ!', 1.5);
            }
          } else {
            // CHARGE ORDER — all nearby rush the player
            enemy.speechBubble = 'ВСЕ ВПЕРЁД!';
            enemy.speechBubbleTimer = 2.5;
            for (const ally of nearbyAllies) {
              // 80% obey, 20% ignore (randomization)
              if (Math.random() < 0.80) {
                ally.state = 'chase';
                ally.investigateTarget = { ...state.player.pos };
                if (!ally.speechBubble) setSpeech(ally, 'ВПЕРЁД!', 1.5);
              }
            }
            addMessage(state, `⚠ Boss orders all-out charge!`, 'warning');
          }
        }
      }

      // ═══ KRAVTSOV FEAR ATTACK — inject terror, force player to flee ═══
      if ((enemy as any)._bossId === 'kravtsov' && (enemy.bossPhase || 0) >= 1) {
        const fearCd = (enemy as any)._fearCooldown || 0;
        const fearCharging = (enemy as any)._fearCharging || 0;
        if (fearCd > 0) {
          (enemy as any)._fearCooldown = fearCd - dt;
        } else if (fearCharging > 0) {
          // Charging the fear syringe — can be interrupted by dealing enough damage
          (enemy as any)._fearCharging = fearCharging - dt;
          enemy.speechBubble = '💉 ПОЛУЧИ ИНЪЕКЦИЮ!';
          enemy.speechBubbleTimer = 0.5;
          // Slow down while charging
          enemy.speed = 0.3;
          if ((enemy as any)._fearCharging <= 0) {
            // Fire the fear attack!
            const d = dist(enemy.pos, state.player.pos);
            if (d < 200 && state.fearTimer <= 0) {
              state.fearTimer = 2.5;
              state.fearSourcePos = { ...enemy.pos };
              addMessage(state, '😱 KRAVTSOV INJECTED TERROR! You must flee!', 'damage');
              enemy.speechBubble = 'БОЙСЯ, ПОДОПЫТНЫЙ!';
              enemy.speechBubbleTimer = 2.5;
              spawnParticles(state, state.player.pos.x, state.player.pos.y, '#44ff66', 12);
            }
            (enemy as any)._fearCooldown = 15;
            // Restore speed
            const ph = enemy.bossPhase || 0;
            enemy.speed = ph === 2 ? 1.89 : 1.49;
          }
        } else if ((enemy.state === 'chase' || enemy.state === 'attack') && dist(enemy.pos, state.player.pos) < 250 && Math.random() < 0.003) {
          // Start charging fear attack
          (enemy as any)._fearCharging = 1.5;
          (enemy as any)._fearHpAtStart = enemy.hp;
          addMessage(state, '⚠ Kravtsov is preparing a syringe — deal damage to interrupt!', 'warning');
        }
        // Interrupt if took significant damage during charge
        if ((enemy as any)._fearCharging > 0 && (enemy as any)._fearHpAtStart) {
          const dmgTaken = (enemy as any)._fearHpAtStart - enemy.hp;
          if (dmgTaken >= 40) {
            (enemy as any)._fearCharging = 0;
            (enemy as any)._fearCooldown = 8;
            enemy.speechBubble = 'АА! МОЯ СЫВОРОТКА!';
            enemy.speechBubbleTimer = 2;
            const ph = enemy.bossPhase || 0;
            enemy.speed = ph === 2 ? 1.89 : 1.49;
            addMessage(state, '✅ Fear attack interrupted!', 'info');
          }
        }
      }


      if (enemy.bossChargeTimer !== undefined) {
        enemy.bossChargeTimer = Math.max(0, (enemy.bossChargeTimer || 0) - dt);
      }
      if (enemy.bossSpawnTimer !== undefined) {
        enemy.bossSpawnTimer = Math.max(0, (enemy.bossSpawnTimer || 0) - dt);
      }

      // Decrement ordering arm timer
      if ((enemy as any)._orderingArm > 0) {
        (enemy as any)._orderingArm -= dt;
        if ((enemy as any)._orderingArm <= 0) delete (enemy as any)._orderingArm;
      }
    }

    // === BODYGUARD HEALS BOSS — nearby bodyguards can patch up the boss ===
    // Cache boss ref once for this bodyguard's heal logic
    if ((enemy as any)._isBodyguard) {
      const boss = state.enemies.find(e => e.type === 'boss' && e.state !== 'dead');
      if (!(enemy as any)._bgHealTimer && !(enemy as any)._bgHealCooldown) {
        if (boss && boss.hp < boss.maxHp * 0.8 && distSq(enemy.pos, boss.pos) < 2500) { // 50²
          (enemy as any)._bgHealTimer = 1.0;
          enemy.state = 'idle';
          enemy.speechBubble = 'ЛЕЧУ, КОМАНДИР!';
          enemy.speechBubbleTimer = 1.5;
          (enemy as any)._bgHealCooldown = 15 + Math.random() * 10;
        }
      }
      // Process bodyguard healing
      if ((enemy as any)._bgHealTimer > 0) {
        (enemy as any)._bgHealTimer -= dt;
        if (Math.random() < 0.4 && boss) {
          spawnParticles(state, boss.pos.x + (Math.random() - 0.5) * 10, boss.pos.y + (Math.random() - 0.5) * 10, '#44ff66', 1);
        }
        if ((enemy as any)._bgHealTimer <= 0) {
          delete (enemy as any)._bgHealTimer;
          if (boss) {
            const heal = 15 + Math.floor(Math.random() * 10);
            boss.hp = Math.min(boss.maxHp, boss.hp + heal);
            boss.speechBubble = 'ХОРОШО...';
            boss.speechBubbleTimer = 1.5;
            addMessage(state, `🩹 Bodyguard heals ${getBossTitle(boss)} +${heal}HP!`, 'warning');
            spawnParticles(state, boss.pos.x, boss.pos.y, '#44ff66', 6);
          }
          enemy.state = 'chase';
        }
      }
      // Bodyguard heal cooldown
      if ((enemy as any)._bgHealCooldown > 0) {
        (enemy as any)._bgHealCooldown -= dt;
        if ((enemy as any)._bgHealCooldown <= 0) delete (enemy as any)._bgHealCooldown;
      }
    }

    // Alarm boost — increases alert range and makes enemies aggressive
    const alarmBoost = state.alarmActive ? 1.5 : 1.0;

    const distToPlayer = dist(enemy.pos, state.player.pos);
    const los = hasLineOfSight(state, enemy.pos, state.player.pos, enemy.elevated);

    // === STEALTH AWARENESS TRACKING — use awareness meter ===
    if (enemy.awareness > ((state as any)._stealthDetection || 0)) {
      (state as any)._stealthDetection = enemy.awareness;
      (state as any)._stealthNearestState = enemy.state;
      (state as any)._stealthNearestType = enemy.type;
      (state as any)._stealthNearestDist = distToPlayer;
    }

    // Enemy tries to activate alarm panel when in chase/attack and near one
    if ((enemy.state === 'chase' || enemy.state === 'attack') && enemy.type !== 'turret') {
      for (const panel of state.alarmPanels) {
        if (panel.activated || panel.hacked) continue;
        const dToPanel = dist(enemy.pos, panel.pos);
        if (dToPanel < 40) {
          panel.activated = true;
          state.alarmActive = true;
          (state as any)._alarmEverTriggered = true;
          addMessage(state, '🚨 ALARM TRIGGERED! All enemies alerted!', 'warning');
          // Alarm is intentionally silent
          // Alert ALL enemies on the map
          for (const ally of state.enemies) {
            if (ally.state === 'dead') continue;
            if (ally.state !== 'chase' && ally.state !== 'attack') {
              ally.state = 'investigate';
              ally.investigateTarget = approximatePos(state.player.pos, 120);
              ally.radioAlert = 2;
            }
          }
          state.soundEvents.push({ pos: { ...panel.pos }, radius: 600, time: state.time });
        }
      }
    }

    // === DOG AI — follows owner, melee charges player ===
    const playerIsHiding = !!(state as any)._playerHiding;
    if (enemy.type === 'dog' && !enemy.neutralized) {
      const owner = enemy.ownerId ? state.enemies.find(e => e.id === enemy.ownerId) : null;
      const ownerAlive = owner && owner.state !== 'dead';
      const dToPlayer = dist(enemy.pos, state.player.pos);
      const isSneaking = (state as any)._lastMovementMode === 'sneak';
      const playerVisible = !playerIsHiding && !isSneaking && dToPlayer < enemy.alertRange && hasLineOfSight(state, enemy.pos, state.player.pos, false);
      
      // Dog follows owner when idle, attacks when owner is fighting or player is close (but not sneaking)
      const ownerFighting = ownerAlive && (owner!.state === 'chase' || owner!.state === 'attack');
      const shouldAttack = playerVisible || (ownerFighting && !isSneaking) || (!ownerAlive && dToPlayer < 150 && !isSneaking);
      
      if (shouldAttack && !enemy.friendly) {
        enemy.state = 'chase';
        const toP = normalize({ x: state.player.pos.x - enemy.pos.x, y: state.player.pos.y - enemy.pos.y });
        enemy.angle = Math.atan2(toP.y, toP.x);
        const dogSpeed = enemy.speed * dt * 60;
        enemy.pos = tryMoveEnemy(state, enemy.pos, toP.x * dogSpeed, toP.y * dogSpeed, 8);
        
        // Melee bite attack
        if (dToPlayer < 30) {
          const now = performance.now();
          if (now - enemy.lastShot > enemy.fireRate) {
            enemy.lastShot = now;
            state.player.hp -= enemy.damage;
            state.player.bleedRate = Math.min(2, state.player.bleedRate + 0.3);
            addMessage(state, '🐕 Dog bite! -' + enemy.damage + 'HP', 'damage');
            spawnParticles(state, state.player.pos.x, state.player.pos.y, '#cc3333', 3);
            playHit();
          }
        }
      } else if (ownerAlive) {
        // Follow owner
        const dToOwner = dist(enemy.pos, owner!.pos);
        if (dToOwner > 40) {
          const toOwner = normalize({ x: owner!.pos.x - enemy.pos.x, y: owner!.pos.y - enemy.pos.y });
          enemy.pos = tryMoveEnemy(state, enemy.pos, toOwner.x * enemy.speed * 0.8 * dt * 60, toOwner.y * enemy.speed * 0.8 * dt * 60, 8);
          enemy.angle = Math.atan2(toOwner.y, toOwner.x);
        }
        enemy.state = 'patrol';
      } else {
        // Owner dead, wander
        if (enemy.state !== 'investigate') {
          enemy.patrolTarget = { x: enemy.pos.x + (Math.random() - 0.5) * 200, y: enemy.pos.y + (Math.random() - 0.5) * 200 };
          enemy.state = 'patrol';
        }
      }
      
      // Alert nearby redneck when dog sees player
      if (playerVisible && ownerAlive && owner!.state !== 'chase' && owner!.state !== 'attack') {
        owner!.state = 'chase';
        owner!.investigateTarget = { ...state.player.pos };
        if (!owner!.speechBubble) {
          owner!.speechBubble = 'Sick \'em!';
          owner!.speechBubbleTimer = 2;
        }
      }
      
      continue; // skip normal AI
    }

    // === BODY DISCOVERY — enemies react to dead allies nearby (throttled: ~1% of frames) ===
    if ((enemy.state === 'idle' || enemy.state === 'patrol') && !(enemy as any)._discoveredBody && Math.random() < 0.03) {
      for (const dead of state.enemies) {
        if (dead.state !== 'dead' || dead === enemy) continue;
        if (distSq(enemy.pos, dead.pos) < 6400 && hasLineOfSight(state, enemy.pos, dead.pos, enemy.elevated)) { // 80²
          (enemy as any)._discoveredBody = true;
          enemy.state = 'investigate';
          enemy.investigateTarget = { ...dead.pos };
          setSpeech(enemy, 'МАН НЕР!', 3.0);
          // Alert nearby allies
          for (const ally of state.enemies) {
            if (ally === enemy || ally.state === 'dead') continue;
            if (distSq(ally.pos, enemy.pos) < 90000 && ally.state !== 'chase' && ally.state !== 'attack') { // 300²
              ally.state = 'investigate';
              ally.investigateTarget = { ...dead.pos };
              if (!ally.speechBubble) {
                ally.speechBubble = 'ЧТО СЛУЧИЛОСЬ?!';
                ally.speechBubbleTimer = 2.5;
              }
            }
          }
          addMessage(state, `👀 Enemy discovered a body!`, 'warning');
          break;
        }
      }
    }

    // === IDLE CHATTER — all enemy types (map-specific on Swedish map) ===
    if ((enemy.state === 'idle' || enemy.state === 'patrol') && !enemy.speechBubble && enemy.type !== 'turret' && enemy.type !== 'dog' && Math.random() < 0.0008) {
      const mapId = (state as any)._mapId as string || 'objekt47';
      const idlePool = mapId === 'mining_village' && IDLE_LINES_SWEDISH[enemy.type]
        ? IDLE_LINES_SWEDISH
        : IDLE_LINES;
      setSpeech(enemy, pickLine(idlePool, enemy.type), 3.0);
    }
    // === COMBAT CHATTER — type-specific callouts during firefight ===
    if ((enemy.state === 'chase' || enemy.state === 'attack' || enemy.state === 'flank' || enemy.state === 'suppress') && !enemy.speechBubble && enemy.type !== 'turret' && enemy.type !== 'dog' && enemy.type !== 'boss' && Math.random() < 0.0015) {
      // Rednecks have map-specific combat lines
      if (enemy.type === 'redneck') {
        const mapId = (state as any)._mapId as string || 'objekt47';
        const lines = mapId === 'mining_village'
          ? ['Stick härifrån!', 'Jag skjuter!', 'Inkräktare!', 'Kom hit!', 'Du dör här!', 'FÖRSVINN!']
          : ['Git off my land!', 'I\'ll blast ya!', 'Trespassin\'!', 'Yee-haw!', 'Come \'ere!', 'EAT LEAD!'];
        enemy.speechBubble = lines[Math.floor(Math.random() * lines.length)];
        enemy.speechBubbleTimer = 3;
      } else {
        setSpeech(enemy, pickLine(COMBAT_LINES, enemy.type), 2.5);
      }
    }

    // Vision cone — still stealth-friendly, but less "blind" at close range
    const isBodyguard = !!(enemy as any)._isBodyguard;
    const visionConfig = isBodyguard
      ? { frontArc: Math.PI * 0.55, rearRange: 0.28 }
      : {
          scav:    { frontArc: Math.PI * 0.34, rearRange: 0.18 },
          soldier: { frontArc: Math.PI * 0.38, rearRange: 0.24 },
          heavy:   { frontArc: Math.PI * 0.46, rearRange: 0.30 },
          turret:  { frontArc: Math.PI * 0.48, rearRange: 0.08 },
          sniper:  { frontArc: Math.PI * 0.20, rearRange: 0.10 },
          shocker: { frontArc: Math.PI * 0.42, rearRange: 0.24 },
          redneck: { frontArc: Math.PI * 0.38, rearRange: 0.20 },
          dog:     { frontArc: Math.PI * 0.55, rearRange: 0.45 },
        }[enemy.type] || { frontArc: Math.PI * 0.36, rearRange: 0.20 };

    const toPlayerAngle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
    let angleDiff = Math.abs(toPlayerAngle - enemy.angle);
    if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
    const isBehind = angleDiff > visionConfig.frontArc;

    const effectiveRange = (isBehind ? enemy.alertRange * visionConfig.rearRange : enemy.alertRange) * alarmBoost * (1 - ((state as any)._detectionReduction || 0));
    const proximityRange = Math.max(70, enemy.alertRange * 0.4);
    const forcedContactRange = 38;
    const closeProximity = !playerIsHiding && distToPlayer < proximityRange;
    const forcedContact = distToPlayer < forcedContactRange;
    const playerInRange = forcedContact || (!playerIsHiding && (closeProximity || (distToPlayer < effectiveRange && los)));

    // === AWARENESS SYSTEM — gradual detection instead of binary ===
    // Calculate visibility factor based on movement, terrain, and cover
    const tg2 = getTerrainGrid(state);
    const playerTerrain = getTerrainFast(tg2, state.player.pos.x, state.player.pos.y);
    const terrainVisibility: Record<string, number> = { forest: 0.4, grass: 0.8, dirt: 1.0, asphalt: 1.0, concrete: 1.0 };
    let visibilityFactor = terrainVisibility[playerTerrain] ?? 1.0;
    // Movement mode affects visibility
    const pMode = (state as any)._lastMovementMode || 'walk';
    if (pMode === 'sneak') visibilityFactor *= 0.3;
    else if (pMode === 'sprint') visibilityFactor *= 1.8;
    // Cover reduces visibility
    if ((state as any)._playerHiding) visibilityFactor *= 0;
    else if (state.player.inCover) visibilityFactor *= 0.5;
    // Disguise — enemies mostly can't detect you (officers and very close = partial)
    if (state.disguised) {
      const isOfficer = !!(enemy as any)._isOfficer;
      if (isOfficer) visibilityFactor *= 0.3; // officers suspicious
      else if (distToPlayer < 60) visibilityFactor *= 0.2; // very close = slight suspicion
      else visibilityFactor *= 0.02; // practically invisible
    }
    // Ghost Mode ability — completely invisible
    if ((state as any)._ghostMode) visibilityFactor *= 0;
    // Behind enemy = harder, but no longer near-impossible
    if (isBehind) visibilityFactor *= 0.35;
    // Distance falloff — closer = faster detection
    const distanceFactor = Math.max(0, 1 - (distToPlayer / Math.max(1, effectiveRange)));

    // Awareness buildup rate (per second)
    const awarenessRate = playerInRange ? distanceFactor * visibilityFactor * 2.4 : 0;

    // Update awareness
    if (awarenessRate > 0) {
      enemy.awareness = Math.min(1, enemy.awareness + awarenessRate * dt);
      if ((closeProximity || forcedContact) && !state.disguised) {
        enemy.awareness = Math.max(enemy.awareness, 0.72);
      }
      if (forcedContact) {
        enemy.awareness = Math.max(enemy.awareness, 0.95);
      }
    } else {
      // Decay awareness when player is not visible
      const baseDecay = enemy.state === 'chase' || enemy.state === 'attack' ? 0.05 : enemy.awarenessDecay;
      const decayRate = (enemy as any)._combatAlert ? baseDecay * 0.4 : baseDecay; // combat-alert enemies lose track much slower
      enemy.awareness = Math.max(0, enemy.awareness - decayRate * dt);
    }

    // Awareness thresholds for state transitions
    const AWARE_ALERT = 0.22;   // enemy becomes suspicious
    const AWARE_CHASE = 0.5;    // enemy starts investigating
    const AWARE_ATTACK = 0.78;  // full detection, combat

    // canSeePlayer is awareness-based + guaranteed near-contact reaction
    const canSeePlayer = enemy.awareness >= AWARE_ATTACK || forcedContact || (closeProximity && !state.disguised);

    // Check for nearby sound events (gunshots, explosions)
    let heardSound: Vec2 | null = null;
    for (const se of state.soundEvents) {
      const dToSound = dist(enemy.pos, se.pos);
      if (dToSound < se.radius && state.time - se.time < 0.5) {
        heardSound = { ...se.pos };
        break;
      }
    }

    // State transitions with voice shouts + tactical role assignment
    const prevState = enemy.state;

    // === REACTION DELAY — short human-like delay on first state change ===
    if ((enemy as any)._reactionDelay > 0) {
      (enemy as any)._reactionDelay -= dt;
      if ((enemy as any)._reactionDelay <= 0) {
        // Apply pending state if set by radio alert
        if ((enemy as any)._pendingState) {
          enemy.state = (enemy as any)._pendingState;
          delete (enemy as any)._pendingState;
          setSpeech(enemy, pickLine(ALERT_LINES, enemy.type), 2.5);
        }
      } else {
        // Override: if player is very close, break out of reaction delay immediately
        if (forcedContact || (closeProximity && !state.disguised)) {
          (enemy as any)._reactionDelay = 0;
          delete (enemy as any)._pendingState;
          enemy.awareness = 1.0;
          enemy.state = 'chase';
        } else {
          continue; // frozen during reaction delay (only if player isn't right next to us)
        }
      }
    }

    if (canSeePlayer) {
      // Assign tactical roles to engaged enemies
      if (prevState !== 'chase' && prevState !== 'attack' && prevState !== 'flank' && prevState !== 'suppress') {
        // Add short random reaction delay for non-boss, non-turret enemies
        if (!(enemy as any)._reactionDelayDone && enemy.type !== 'boss' && enemy.type !== 'turret') {
          const delay = Math.random() * 0.35;
          if (delay > 0.04) {
            (enemy as any)._reactionDelay = delay;
            (enemy as any)._reactionDelayDone = true;
            continue;
          }
        }
        (enemy as any)._reactionDelayDone = true;

        // Fresh engagement — pick tactical role
        assignTacticalRole(state, enemy);

        // Speech bubble on first alert (not sleepers — they have their own)
        if (!((enemy as any)._isSleeper && prevState === 'idle')) {
          setSpeech(enemy, pickLine(ALERT_LINES, enemy.type), 2.5);
        }

        // Sleeper wake-up reaction
        if ((enemy as any)._isSleeper && prevState === 'idle') {
          enemy.speechBubble = 'ЧТО?! КТО ТАМ?!';
          enemy.speechBubbleTimer = 3;
          enemy.speed = 0.81; // adrenaline kicks in
          enemy.alertRange = 120; // fully awake now
          (enemy as any)._isSleeper = false; // no longer sleeping
          addMessage(state, '😱 Sleeper wakes up in panic!', 'warning');
        }

        // Elevated wall guards trigger base-wide alarm via radio
        if (enemy.elevated && !state.alarmActive) {
          state.alarmActive = true;
          (state as any)._alarmEverTriggered = true;
          addMessage(state, '🚨 PLATFORM GUARD ALERTS THE BASE!', 'warning');
          for (const ally of state.enemies) {
            if (ally === enemy || ally.state === 'dead') continue;
            if (ally.state === 'idle' || ally.state === 'patrol') {
              ally.state = 'investigate';
              ally.investigateTarget = { ...state.player.pos };
            }
          }
        }
      }
    } else if (enemy.awareness >= AWARE_CHASE && (prevState === 'idle' || prevState === 'patrol')) {
      // Suspicious — investigate
      enemy.state = 'investigate';
      enemy.investigateTarget = { ...state.player.pos };
      setSpeech(enemy, pickLine(INVESTIGATE_LINES, enemy.type), 2.0);
    } else if (enemy.awareness >= AWARE_ALERT && enemy.awareness < AWARE_CHASE && (prevState === 'idle' || prevState === 'patrol')) {
      // Alert — turn toward player
      enemy.state = 'alert' as any;
      enemy.angle = toPlayerAngle;
    }
    
    if (canSeePlayer) {

      // Apply tactical behavior based on role
      if (enemy.tacticalRole === 'flanker' && enemy.type !== 'turret' && enemy.type !== 'boss') {
        enemy.state = 'flank';
        // Announce flanking (30% chance, if no speech bubble)
        if (!enemy.speechBubble && Math.random() < 0.30) {
          setSpeech(enemy, pickLine(FLANKING_LINES, enemy.type), 2.0);
        }
        // Calculate flank target — move perpendicular to player direction
        if (!enemy.flankTarget || dist(enemy.pos, enemy.flankTarget) < 30 || state.time - enemy.lastTacticalSwitch > 4) {
          const toPlayer = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
          const flankSide = (enemy.id.charCodeAt(enemy.id.length - 1) % 2 === 0) ? 1 : -1;
          const flankAngle = toPlayer + (Math.PI * 0.5 * flankSide);
          const flankDist = 80 + Math.random() * 60;
          enemy.flankTarget = {
            x: state.player.pos.x + Math.cos(flankAngle) * flankDist,
            y: state.player.pos.y + Math.sin(flankAngle) * flankDist,
          };
          enemy.lastTacticalSwitch = state.time;
        }
      } else if (enemy.tacticalRole === 'suppressor' && enemy.type !== 'turret') {
        enemy.state = 'suppress';
        enemy.suppressTimer = 3; // keep suppressing for 3 seconds
        // Announce suppression (35% chance)
        if (!enemy.speechBubble && Math.random() < 0.35) {
          setSpeech(enemy, pickLine(SUPPRESSING_LINES, enemy.type), 2.0);
        }
      } else if (distToPlayer < enemy.shootRange && !isBehind) {
        enemy.state = 'attack';
      } else {
        enemy.state = 'chase';
      }

      // Call for help — soldiers and heavies yell for reinforcements
      if (enemy.callForHelpTimer <= 0 && enemy.type !== 'turret' && enemy.type !== 'scav') {
        enemy.callForHelpTimer = 5 + Math.random() * 3;
        addMessage(state, `🗣️ ${enemy.type.toUpperCase()} calls for help!`, 'warning');
        // Alert all allies in group + nearby — radio gives approximate position only
        for (const ally of state.enemies) {
          if (ally === enemy || ally.state === 'dead') continue;
          if (ally.state === 'chase' || ally.state === 'attack' || ally.state === 'flank' || ally.state === 'suppress') continue;
          const sameGroup = ally.radioGroup === enemy.radioGroup;
          const closeEnough = distSq(ally.pos, enemy.pos) < 250000; // 500²
          if (sameGroup || closeEnough) {
            ally.state = 'investigate';
            ally.investigateTarget = approximatePos(state.player.pos);
            ally.awareness = Math.max(ally.awareness, 0.7);
            assignTacticalRole(state, ally);
            ally.radioAlert = 2;
          }
        }
      }

      // Radio call — alert allies in same group or within range (wider when alarm active)
      if (state.time - enemy.lastRadioCall > 3) {
        enemy.lastRadioCall = state.time;
        enemy.radioAlert = 1.5;
        playRadio();
        const radioRange = state.alarmActive ? 800 : 500;
        const radioRangeSq = radioRange * radioRange;
        for (const ally of state.enemies) {
          if (ally === enemy || ally.state === 'dead') continue;
          const sameGroup = ally.radioGroup === enemy.radioGroup;
          const closeEnough = distSq(ally.pos, enemy.pos) < radioRangeSq;
          const alarmWide = state.alarmActive; // alarm = base-wide awareness
          if (sameGroup || closeEnough || alarmWide) {
            if (ally.state === 'idle' || ally.state === 'patrol' || ally.state === 'investigate') {
              // Radio gives approximate position — investigate, not chase
              ally.state = 'investigate';
              ally.investigateTarget = approximatePos(state.player.pos);
              ally.awareness = Math.max(ally.awareness, 0.6);
              assignTacticalRole(state, ally);
              ally.radioAlert = 1.5;
            } else if (ally.state === 'chase' || ally.state === 'flank') {
              // Already chasing — give approximate update, not exact
              ally.investigateTarget = approximatePos(state.player.pos, 50);
            }
          }
        }
      }
    } else if (heardSound && (enemy.state === 'idle' || enemy.state === 'patrol' || enemy.state === 'investigate')) {
      // === AMBUSH AI — some enemies set up ambush instead of rushing toward sound ===
      const ambushRoll = Math.random();
      const isSmartType = enemy.type === 'soldier' || enemy.type === 'heavy' || enemy.type === 'svarta_sol';
      const ambushChance = isSmartType ? 0.35 : 0.12; // smart types ambush more often

      if (ambushRoll < ambushChance && !los && !(enemy as any)._ambushSet) {
        // Find a prop near the sound that provides cover (choke point ambush)
        const coverTypes = ['concrete_barrier', 'sandbags', 'wood_crate', 'barrel_stack', 'vehicle_wreck', 'metal_shelf'];
        let bestAmbushPos: Vec2 | null = null;
        let bestScore = -Infinity;
        for (const prop of state.props) {
          if (!coverTypes.includes(prop.type)) continue;
          const dToSound = dist(prop.pos, heardSound);
          const dToEnemy = dist(prop.pos, enemy.pos);
          // Good ambush: between enemy and sound, within 200px of sound, not too far from enemy
          if (dToSound < 200 && dToEnemy < 300 && dToSound > 30) {
            // Score: prefer positions that are between enemy and the sound source
            const score = (300 - dToEnemy) + (200 - dToSound) * 1.5;
            if (score > bestScore) {
              bestScore = score;
              bestAmbushPos = { ...prop.pos };
            }
          }
        }
        if (bestAmbushPos) {
          (enemy as any)._ambushSet = true;
          (enemy as any)._ambushTimer = 8 + Math.random() * 6; // wait up to 14s
          enemy.state = 'investigate';
          enemy.investigateTarget = bestAmbushPos;
          enemy.awareness = Math.max(enemy.awareness, 0.6);
          setSpeech(enemy, isSmartType ? 'ТИХО... ЖДЁМ.' : 'ЧТО ТАМ?', 2.0);
          addMessage(state, `🎯 ${enemy.type.toUpperCase()} sets up an ambush!`, 'info');
        } else {
          // No good ambush position — investigate normally
          enemy.state = 'investigate';
          enemy.investigateTarget = heardSound;
          enemy.awareness = Math.max(enemy.awareness, 0.7);
          setSpeech(enemy, pickLine(INVESTIGATE_LINES, enemy.type), 2.0);
        }
      } else {
        // Normal investigate (majority of the time)
        enemy.state = 'investigate';
        enemy.investigateTarget = heardSound;
        enemy.awareness = Math.max(enemy.awareness, 0.7);
        setSpeech(enemy, pickLine(INVESTIGATE_LINES, enemy.type), 2.0);
      }
    } else if (heardSound && (enemy.state === 'chase' || enemy.state === 'attack')) {
      // Already in combat — update known player position from sound
      enemy.investigateTarget = heardSound;
      enemy.awareness = Math.max(enemy.awareness, 0.9);
    } else if (enemy.state === 'chase' || enemy.state === 'attack' || enemy.state === 'flank' || enemy.state === 'suppress') {
      // If rushing to a platform, don't get distracted
      if ((enemy as any)._platformTarget) {
        enemy.state = 'chase';
        enemy.investigateTarget = (enemy as any)._platformTarget;
      } else if (!canSeePlayer) {
        // Lost sight — investigate player's LAST KNOWN position
        enemy.state = 'investigate';
        enemy.investigateTarget = { ...state.player.pos }; // snapshot current pos as last known
        enemy.tacticalRole = 'none';
        setSpeech(enemy, pickLine(LOST_LINES, enemy.type), 2.0);
        // Mark "just lost sight" for ? icon rendering
        (enemy as any)._lostSightTime = state.time;
      } else if (distToPlayer > enemy.alertRange * 1.5) {
        // Too far but still has LOS — chase
        enemy.state = 'chase';
        enemy.investigateTarget = { ...state.player.pos };
        enemy.tacticalRole = 'none';
        // Radio last known position to group
        if (state.time - enemy.lastRadioCall > 4) {
          enemy.lastRadioCall = state.time;
          enemy.radioAlert = 1.2;
          for (const ally of state.enemies) {
            if (ally === enemy || ally.state === 'dead') continue;
            const sameGroup = ally.radioGroup === enemy.radioGroup;
            const closeEnough = distSq(ally.pos, enemy.pos) < 160000; // 400²
            if ((sameGroup || closeEnough) && (ally.state === 'idle' || ally.state === 'patrol')) {
              ally.state = 'investigate';
              ally.investigateTarget = approximatePos(state.player.pos);
              ally.radioAlert = 1.2;
            }
          }
        }
      }
      // NOTE: removed unconditional patrol fallback (was a bug overriding investigate)
    }

    // === ENEMY HEALING — ALL enemies can heal if they have medical items in loot ===
    const hasMedicalLoot = enemy.loot.some(i => i.category === 'medical');
    const wantsToHeal = (
      // Boss special heal
      (enemy.type === 'boss' && enemy.hp < enemy.maxHp * 0.4 && !(enemy as any)._bossHealUsed && !(enemy as any)._healingTimer)
      // Any enemy with medical items and below 60% HP
      || (hasMedicalLoot && enemy.hp < enemy.maxHp * 0.6 && !(enemy as any)._healingTimer && !(enemy as any)._healDone && enemy.type !== 'turret')
    );
    
    if (wantsToHeal && !(enemy as any)._seekingCover) {
      // Find nearest cover to hide behind
      (enemy as any)._seekingCover = true;
      let bestCover: Vec2 | null = null;
      let bestDist = 200;
      const coverTypes = ['concrete_barrier', 'sandbags', 'vehicle_wreck', 'wood_crate', 'barrel_stack', 'tree', 'pine_tree'];
      for (const prop of state.props) {
        if (!coverTypes.includes(prop.type)) continue;
        const d = dist(enemy.pos, prop.pos);
        // Prefer cover that's away from player
        const dFromPlayer = dist(prop.pos, state.player.pos);
        if (d < bestDist && dFromPlayer > 100) {
          bestDist = d;
          bestCover = { ...prop.pos };
        }
      }
      if (bestCover) {
        enemy.investigateTarget = bestCover;
        enemy.state = 'investigate';
        (enemy as any)._healCoverTarget = bestCover;
      } else {
        // No cover — heal in place
        (enemy as any)._seekingCover = false;
      }
    }
    
    // Arrived at cover — start healing
    if ((enemy as any)._seekingCover && (enemy as any)._healCoverTarget) {
      const coverTarget = (enemy as any)._healCoverTarget as Vec2;
      if (dist(enemy.pos, coverTarget) < 30) {
        delete (enemy as any)._seekingCover;
        delete (enemy as any)._healCoverTarget;
        if (enemy.type === 'boss') {
          (enemy as any)._healingTimer = 5.0; // slow stim — 5 seconds
          (enemy as any)._bossHealUsed = true;
          (enemy as any)._bossHealTotal = 50; // total HP to restore
          (enemy as any)._bossHealGiven = 0;  // HP given so far
          enemy.speechBubble = 'СТИМУЛЯТОР...';
          enemy.speechBubbleTimer = 3;
          addMessage(state, `💉 ${getBossTitle(enemy)} IS INJECTING A STIM! (+50HP over 5s)`, 'warning');
        } else {
          (enemy as any)._healingTimer = 3.0;
          (enemy as any)._healDone = true;
          // Consume the medical item from loot
          const medIdx = enemy.loot.findIndex(i => i.category === 'medical');
          const medItem = medIdx >= 0 ? enemy.loot[medIdx] : null;
          if (medIdx >= 0) enemy.loot.splice(medIdx, 1);
          const label = (enemy as any)._isBodyguard ? 'Bodyguard' : (enemy as any)._isOfficer ? 'Officer' : enemy.type.toUpperCase();
          addMessage(state, `🩹 ${label} is bandaging wounds!`, 'warning');
        }
      }
    }
    
    // Process healing timer — enemy stands still
    if ((enemy as any)._healingTimer > 0) {
      (enemy as any)._healingTimer -= dt;
      // Force idle while healing
      enemy.state = 'idle';
      // Boss: gradual heal over time
      if (enemy.type === 'boss' && (enemy as any)._bossHealTotal) {
        const totalHeal = (enemy as any)._bossHealTotal as number;
        const healPerSec = totalHeal / 5.0; // 50HP over 5s = 10HP/s
        const tickHeal = healPerSec * dt;
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + tickHeal);
        (enemy as any)._bossHealGiven = ((enemy as any)._bossHealGiven || 0) + tickHeal;
      }
      // Animation: spawn green particles while healing
      if (Math.random() < 0.4) {
        spawnParticles(state, enemy.pos.x + (Math.random() - 0.5) * 8, enemy.pos.y + (Math.random() - 0.5) * 8, '#44ff66', 1);
      }
      if ((enemy as any)._healingTimer <= 0) {
        delete (enemy as any)._healingTimer;
        delete (enemy as any)._seekingCover;
        if (enemy.type === 'boss') {
          // Final heal burst — give remaining HP
          const remaining = ((enemy as any)._bossHealTotal || 50) - ((enemy as any)._bossHealGiven || 0);
          if (remaining > 0) {
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + remaining);
          }
          delete (enemy as any)._bossHealTotal;
          delete (enemy as any)._bossHealGiven;
          enemy.speechBubble = 'НАМНОГО ЛУЧШЕ!';
          enemy.speechBubbleTimer = 2;
          addMessage(state, `💉 ${getBossTitle(enemy)} healed +50HP!`, 'damage');
          spawnParticles(state, enemy.pos.x, enemy.pos.y, '#44ff66', 8);
        } else {
          const healAmt = Math.min(25, enemy.maxHp - enemy.hp);
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + healAmt);
          addMessage(state, `🩹 Enemy healed +${healAmt}HP!`, 'info');
          spawnParticles(state, enemy.pos.x, enemy.pos.y, '#44ff66', 5);
        }
        enemy.state = 'chase';
      }
    }

    // Heavy throws flashbangs (halved rate)
    if (enemy.type === 'heavy' && enemy.state === 'attack' && !(enemy as any)._heavyFlashUsed &&
        distToPlayer < enemy.shootRange && distToPlayer > 60 && Math.random() < 0.001) {
      (enemy as any)._heavyFlashUsed = true;
      const gAngle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
      state.grenades.push({
        pos: { x: enemy.pos.x, y: enemy.pos.y },
        vel: { x: Math.cos(gAngle) * 3.5, y: Math.sin(gAngle) * 3.5 },
        timer: 1.0,
        radius: 180,
        damage: -1,
        fromPlayer: false,
        sourceId: enemy.id,
        sourceType: enemy.type,
      });
      addMessage(state, '💫 HEAVY throws FLASHBANG!', 'warning');
      spawnParticles(state, enemy.pos.x, enemy.pos.y, '#ffffaa', 4);
    }

    // ZAPAD & VOSTOK — aggressive grenade push while chasing/attacking
    if ((enemy as any)._isBodyguard && (enemy.state === 'chase' || enemy.state === 'attack') &&
        distToPlayer < enemy.shootRange * 1.2 && distToPlayer > 80) {
      if (!(enemy as any)._bgGrenadeTimer) (enemy as any)._bgGrenadeTimer = 2 + Math.random() * 2;
      (enemy as any)._bgGrenadeTimer -= dt;
      if ((enemy as any)._bgGrenadeTimer <= 0) {
        (enemy as any)._bgGrenadeTimer = 3 + Math.random() * 3;
        const gAngle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
        state.grenades.push({
          pos: { x: enemy.pos.x, y: enemy.pos.y },
          vel: { x: Math.cos(gAngle) * 4, y: Math.sin(gAngle) * 4 },
          timer: 1.5,
          radius: 120,
          damage: 80,
          fromPlayer: false,
          sourceId: enemy.id,
          sourceType: 'soldier',
        });
        const bgName = (enemy as any)._bodyguardName || 'BODYGUARD';
        addMessage(state, `💣 ${bgName} throws GRENADE!`, 'warning');
        spawnParticles(state, enemy.pos.x, enemy.pos.y, '#ff8833', 4);
        enemy.speed = Math.max(enemy.speed, 2.8);
      }
    }

    // ALL combat enemies throw grenades at player in cover (or occasionally otherwise)
    if (enemy.type !== 'turret' && enemy.type !== 'sniper' && !(enemy as any)._isBodyguard &&
        (enemy.state === 'chase' || enemy.state === 'attack') &&
        distToPlayer < enemy.shootRange * 1.3 && distToPlayer > 60) {
      if (!(enemy as any)._grenadeSupply) (enemy as any)._grenadeSupply = enemy.type === 'heavy' ? 4 : enemy.type === 'soldier' ? 3 : 2;
      if (!(enemy as any)._enemyGrenadeTimer) (enemy as any)._enemyGrenadeTimer = 4 + Math.random() * 4;
      (enemy as any)._enemyGrenadeTimer -= dt;
      // Throw much more often when player is in cover
      const throwInterval = state.player.inCover ? 3 + Math.random() * 2 : 8 + Math.random() * 6;
      // Smart grenade AI: don't throw if blast radius would kill self
      const grenadeRadius = 100;
      const safeThrowDist = grenadeRadius + 30; // need to be outside blast + margin
      if ((enemy as any)._enemyGrenadeTimer <= 0 && (enemy as any)._grenadeSupply > 0 && distToPlayer > safeThrowDist) {
        (enemy as any)._grenadeSupply--;
        (enemy as any)._enemyGrenadeTimer = throwInterval;
        const gAngle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
        // Lead the target slightly
        const leadDist = distToPlayer * 0.1;
        state.grenades.push({
          pos: { x: enemy.pos.x, y: enemy.pos.y },
          vel: { x: Math.cos(gAngle) * 3.5, y: Math.sin(gAngle) * 3.5 },
          timer: 1.8,
          radius: grenadeRadius,
          damage: 60,
          fromPlayer: false,
          sourceId: enemy.id,
          sourceType: enemy.type,
        });
        addMessage(state, `💣 ${enemy.type.toUpperCase()} throws GRENADE!`, 'warning');
        spawnParticles(state, enemy.pos.x, enemy.pos.y, '#ff8833', 3);
      }
    }

    // Decay timers
    if (enemy.callForHelpTimer > 0) enemy.callForHelpTimer -= dt;
    if (enemy.suppressTimer > 0) enemy.suppressTimer -= dt;

    // === TACTICAL COMBAT SPEECH — periodic callouts during combat ===
    if (!enemy.speechBubble && enemy.type !== 'turret' && enemy.type !== 'dog' && !enemy.friendly) {
      if (!(enemy as any)._combatCalloutTimer) (enemy as any)._combatCalloutTimer = 3 + Math.random() * 5;
      (enemy as any)._combatCalloutTimer -= dt;
      if ((enemy as any)._combatCalloutTimer <= 0) {
        (enemy as any)._combatCalloutTimer = 4 + Math.random() * 8; // 4-12s between callouts
        // Pick callout based on current state
        if (enemy.state === 'suppress') {
          setSpeech(enemy, pickLine(SUPPRESSING_LINES, enemy.type), 1.8);
        } else if (enemy.state === 'flank') {
          if (Math.random() < 0.4) setSpeech(enemy, pickLine(FLANKING_LINES, enemy.type), 1.8);
        } else if ((enemy.state === 'chase' || enemy.state === 'attack') && Math.random() < 0.15) {
          setSpeech(enemy, pickLine(COMBAT_LINES, enemy.type), 1.8);
        }
      }
    }

    // Ambush timer decay — if ambush position reached, hold and wait
    if ((enemy as any)._ambushSet && (enemy as any)._ambushTimer > 0) {
      (enemy as any)._ambushTimer -= dt;
      if ((enemy as any)._ambushTimer <= 0) {
        // Ambush expired — return to patrol
        delete (enemy as any)._ambushSet;
        delete (enemy as any)._ambushTimer;
        enemy.state = 'patrol';
        enemy.patrolTarget = pickPatrolTarget(state, enemy, 80, 200);
      } else if (enemy.state === 'investigate' && enemy.investigateTarget && dist(enemy.pos, enemy.investigateTarget) < 30) {
        // Reached ambush position — hold still, face toward sound origin, stay in alert
        enemy.state = 'alert' as any;
        enemy.awareness = Math.max(enemy.awareness, 0.5);
      }
    }

    // Decay radio alert visual
    if (enemy.radioAlert > 0) {
      enemy.radioAlert = Math.max(0, enemy.radioAlert - dt);
    }

    const speed = enemy.speed * dt * 60;
    // Elevated enemies don't move — they stay on their platform
    if (enemy.elevated) {
      // React to sounds — turn toward them
      if (heardSound && (enemy.state === 'idle' || enemy.state === 'patrol')) {
        const soundAngle = Math.atan2(heardSound.y - enemy.pos.y, heardSound.x - enemy.pos.x);
        enemy.angle = soundAngle;
        enemy.state = 'alert' as any;
        enemy.investigateTarget = heardSound;
      }

      // Alert state: scan toward last known position, then return to idle
      if (enemy.state === 'alert' || enemy.state === 'investigate') {
        if (enemy.investigateTarget) {
          const targetAngle = Math.atan2(enemy.investigateTarget.y - enemy.pos.y, enemy.investigateTarget.x - enemy.pos.x);
          let da = targetAngle - enemy.angle;
          if (da > Math.PI) da -= Math.PI * 2;
          if (da < -Math.PI) da += Math.PI * 2;
          enemy.angle += Math.sign(da) * Math.min(Math.abs(da), 3.0 * dt);
        }
        // If can see player from alert, attack
        if (canSeePlayer && distToPlayer < enemy.shootRange) {
          enemy.state = 'attack';
        }
      }

      if (enemy.state === 'chase' || enemy.state === 'flank') {
        if (distToPlayer < enemy.shootRange && canSeePlayer) {
          enemy.state = 'attack';
        } else if (enemy.investigateTarget) {
          // Turn toward last known position
          const targetAngle = Math.atan2(enemy.investigateTarget.y - enemy.pos.y, enemy.investigateTarget.x - enemy.pos.x);
          let da = targetAngle - enemy.angle;
          if (da > Math.PI) da -= Math.PI * 2;
          if (da < -Math.PI) da += Math.PI * 2;
          enemy.angle += Math.sign(da) * Math.min(Math.abs(da), 3.0 * dt);
        } else {
          enemy.state = 'idle';
        }
      }
      // Attack state: drop back to alert if player leaves range (not idle — stay vigilant)
      if (enemy.state === 'attack' && (distToPlayer > enemy.shootRange * 1.3 || !canSeePlayer)) {
        enemy.state = 'alert' as any;
        enemy.investigateTarget = { ...state.player.pos };
      }
      if (enemy.state === 'patrol' || enemy.state === 'idle') {
        // Scan back and forth
        enemy.angle += Math.sin(state.time * 0.5 + enemy.pos.x * 0.01) * 0.008;
      }
      // Elevated enemies: handle shooting in place, then skip movement
      if (enemy.state === 'attack' || enemy.state === 'suppress') {
        const targetAngle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
        const TURN_SPEED = 3.5 * dt;
        let angleDelta = targetAngle - enemy.angle;
        while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
        while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
        enemy.angle += Math.abs(angleDelta) > TURN_SPEED ? Math.sign(angleDelta) * TURN_SPEED : angleDelta;

        if (state.time - enemy.lastShot > enemy.fireRate / 1000 && isInFiringArc(enemy, state.player.pos.x, state.player.pos.y) && los && distToPlayer <= enemy.shootRange) {
          const accE = (enemy as any)._accuracy ?? 0.7;
          const spread = (Math.random() - 0.5) * (0.25 - accE * 0.2);
          const angle = enemy.angle + spread;
          state.bullets.push({
            pos: { x: enemy.pos.x + Math.cos(angle) * 14, y: enemy.pos.y + Math.sin(angle) * 14 },
            vel: { x: Math.cos(angle) * 9, y: Math.sin(angle) * 9 },
            damage: enemy.damage, damageType: 'bullet', fromPlayer: false, life: 50, elevated: enemy.elevated,
            sourceId: enemy.id, sourceType: enemy.type,
          });
          enemy.lastShot = state.time;
          addMuzzleFlash(state, enemy.pos.x + Math.cos(angle) * 16, enemy.pos.y + Math.sin(angle) * 16, false);
          spawnParticles(state, enemy.pos.x + Math.cos(angle) * 16, enemy.pos.y + Math.sin(angle) * 16, '#ff6644', 2);
          state.soundEvents.push({ pos: { ...enemy.pos }, radius: 200, time: state.time });
          playGunshot('rifle');
        }
      }
      continue;
    }

    // Sniper Tuman: teleport-stalker (never normal movement)
    if (enemy.type === 'sniper') {
      // === OBSERVING PHASE — sniper watches before engaging ===
      if ((enemy as any)._sniperObserving) {
        (enemy as any)._sniperObserveTimer -= dt;
        // Slowly scan area, don't move or shoot
        enemy.angle += Math.sin(state.time * 0.8 + enemy.pos.x * 0.01) * 0.015;
        enemy.state = 'idle';
        // Only engage after timer runs out AND player is in range+LOS
        const obsDist = dist(enemy.pos, state.player.pos);
        const obsLos = obsDist < enemy.alertRange && hasLineOfSight(state, enemy.pos, state.player.pos, false);
        if ((enemy as any)._sniperObserveTimer <= 0 && obsLos) {
          delete (enemy as any)._sniperObserving;
          delete (enemy as any)._sniperObserveTimer;
          addMessage(state, '🎯 Sniper Tuman has spotted you!', 'warning');
          enemy.state = 'attack';
        } else if ((enemy as any)._sniperObserveTimer <= 0 && !obsLos) {
          // Timer done but no LOS — teleport to a better vantage point
          (enemy as any)._sniperObserveTimer = 5 + Math.random() * 5;
        }
      // If player gets very close, break observation early
        if (obsDist < 120) {
          delete (enemy as any)._sniperObserving;
          delete (enemy as any)._sniperObserveTimer;
          addMessage(state, '🎯 Sniper Tuman detected at close range!', 'warning');
        }
        // If sniper takes a hit during observation, break out and flee immediately
        if ((enemy as any)._sniperShouldFlee) {
          delete (enemy as any)._sniperObserving;
          delete (enemy as any)._sniperObserveTimer;
          enemy.awareness = 1.0;
          enemy.state = 'attack';
          // Don't continue — fall through to normal sniper AI so teleport logic runs
        } else {
          continue; // skip normal sniper AI during observation
        }
      }
      const isCoverProp = (p: { type: string }) =>
        p.type === 'tree' || p.type === 'pine_tree' || p.type === 'bush' ||
        p.type === 'wood_crate' || p.type === 'barrel_stack' || p.type === 'sandbags' ||
        p.type === 'concrete_barrier' || p.type === 'vehicle_wreck';

      const hidePos = (state as any)._hidePos;
      const isNotPlayerHideSpot = (p: { pos: Vec2 }) => {
        if (!hidePos) return true;
        return dist(p.pos, hidePos) > 30;
      };

      const spawnSniperSmoke = (x: number, y: number, count: number, color: string) => {
        for (let i = 0; i < count; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = 4 + Math.random() * 18;
          state.particles.push({
            pos: { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r },
            vel: { x: Math.cos(a) * (0.2 + Math.random() * 0.7), y: Math.sin(a) * (0.2 + Math.random() * 0.7) - 0.2 },
            life: 35 + Math.random() * 25,
            maxLife: 60,
            color,
            size: 4 + Math.random() * 4,
          });
        }
      };

      const pickSniperTeleportTarget = (preferChase: boolean): Vec2 | null => {
        const minPlayerDist = 170;
        const maxPlayerDist = 360;
        const minFromCurrent = 80;

        const covers = state.props.filter(p =>
          isCoverProp(p) &&
          isNotPlayerHideSpot(p) &&
          dist(p.pos, enemy.pos) > minFromCurrent &&
          dist(p.pos, state.player.pos) > minPlayerDist &&
          dist(p.pos, state.player.pos) < maxPlayerDist
        );

        if (covers.length > 0) {
          covers.sort((a, b) => dist(a.pos, state.player.pos) - dist(b.pos, state.player.pos));
          return preferChase
            ? { ...covers[0].pos }
            : { ...covers[Math.floor(Math.random() * Math.min(3, covers.length))].pos };
        }

        const backup = state.props.filter(p =>
          isCoverProp(p) &&
          isNotPlayerHideSpot(p) &&
          dist(p.pos, enemy.pos) > minFromCurrent &&
          dist(p.pos, state.player.pos) > 130
        );
        if (backup.length > 0) {
          backup.sort((a, b) => dist(a.pos, state.player.pos) - dist(b.pos, state.player.pos));
          return { ...backup[0].pos };
        }

        const awayAngle = Math.atan2(enemy.pos.y - state.player.pos.y, enemy.pos.x - state.player.pos.x);
        const teleportDist = 350 + Math.random() * 280;
        return {
          x: Math.max(60, Math.min(state.mapWidth - 60, enemy.pos.x + Math.cos(awayAngle) * teleportDist)),
          y: Math.max(60, Math.min(state.mapHeight - 60, enemy.pos.y + Math.sin(awayAngle) * teleportDist)),
        };
      };

      const beginSniperTeleport = (target: Vec2, message?: string) => {
        (enemy as any)._sniperTargetTree = { ...target };
        (enemy as any)._sniperInvisible = 0.55;
        spawnSniperSmoke(enemy.pos.x, enemy.pos.y, 14, '#777777aa');
        if (message) addMessage(state, message, 'warning');
      };

      if (!(enemy as any)._sniperTeleportTimer) (enemy as any)._sniperTeleportTimer = 2.8 + Math.random() * 1.8;
      if (!(enemy as any)._sniperFlashCooldown) (enemy as any)._sniperFlashCooldown = 0;
      if (!(enemy as any)._sniperTeleportCooldown) (enemy as any)._sniperTeleportCooldown = 0;

      (enemy as any)._sniperTeleportTimer -= dt;
      (enemy as any)._sniperFlashCooldown = Math.max(0, ((enemy as any)._sniperFlashCooldown || 0) - dt);
      (enemy as any)._sniperTeleportCooldown = Math.max(0, ((enemy as any)._sniperTeleportCooldown || 0) - dt);

      if ((enemy as any)._sniperInvisible > 0) {
        (enemy as any)._sniperInvisible -= dt;
        if ((enemy as any)._sniperInvisible <= 0) {
          const targetPos = (enemy as any)._sniperTargetTree;
          if (targetPos) {
            enemy.pos = { ...targetPos };
            spawnSniperSmoke(enemy.pos.x, enemy.pos.y, 12, '#aaaaaa88');
            addMessage(state, '💨 Sniper Tuman repositioned!', 'warning');
          }
          enemy.angle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
          (enemy as any)._sniperCanHeal = true;
          (enemy as any)._sniperHealTimer = 0;
        }
        continue;
      }

      const sniperDistToPlayer = dist(enemy.pos, state.player.pos);
      const sniperHasLos = hasLineOfSight(state, enemy.pos, state.player.pos, false);
      const sniperPlayerHidden = !!(state as any)._playerHiding;
      const playerTooClose = sniperDistToPlayer < 170;
      const lostPressure = !sniperHasLos || sniperDistToPlayer > enemy.shootRange || sniperPlayerHidden;
      const tookHit = !!(enemy as any)._sniperShouldFlee;

      // Sniper no longer throws flashbangs — just teleports away when pressured

      const mustTeleport = tookHit || playerTooClose || lostPressure || (enemy as any)._sniperTeleportTimer <= 0;
      // Enforce minimum 3 second cooldown between teleports
      if (mustTeleport && (enemy as any)._sniperTeleportCooldown <= 0) {
        const target = pickSniperTeleportTarget(!playerTooClose);
        if (target) {
          beginSniperTeleport(
            target,
            tookHit ? '💨 Träff! Sniper Tuman bryter kontakt.' : undefined
          );
          (enemy as any)._sniperShouldFlee = false;
          (enemy as any)._sniperTeleportCooldown = 3.0; // minimum 3s between teleports
          (enemy as any)._sniperTeleportTimer = playerTooClose || tookHit
            ? Math.max(3.0, 1.2 + Math.random() * 1.2)
            : Math.max(3.0, 2.4 + Math.random() * 2.0);
          continue;
        }
      } else if (mustTeleport && (enemy as any)._sniperTeleportCooldown > 0) {
        // Can't teleport yet — just mark flee as handled so we don't spam
        (enemy as any)._sniperShouldFlee = false;
      }

      // Keep pressure: aim and shoot, but no normal walk movement
      // Sniper cannot see or shoot hidden player
      if (sniperPlayerHidden) {
        enemy.state = 'idle';
        // Scan around looking for player
        enemy.angle += Math.sin(state.time * 1.5 + enemy.pos.x * 0.01) * 0.02;
      } else {
        enemy.angle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
        enemy.state = sniperDistToPlayer <= enemy.shootRange && sniperHasLos ? 'attack' : 'chase';
      }
      // Fall through to attack/chase state handling (aim only, no walking)
    }

    switch (enemy.state as string) {
      case 'idle': {
        // Bodyguards follow their boss instead of idling (only if tethered)
        if ((enemy as any)._bodyguardOf) {
          const boss = state.enemies.find(e => e.id === (enemy as any)._bodyguardOf);
          if (boss && boss.state !== 'dead') {
            const dBoss = dist(enemy.pos, boss.pos);
            if (dBoss > 50) {
              const dir = normalize({ x: boss.pos.x - enemy.pos.x, y: boss.pos.y - enemy.pos.y });
              enemy.pos = tryMoveEnemy(state, enemy.pos, dir.x * speed * 0.8, dir.y * speed * 0.8, 10);
              enemy.angle = Math.atan2(dir.y, dir.x);
            } else {
              enemy.angle += Math.sin(state.time * 0.5 + enemy.pos.x * 0.01) * 0.005;
            }
            break;
          }
        }
        // Standing still, looking around slowly
        enemy.angle += Math.sin(state.time * 0.5 + enemy.pos.x * 0.01) * 0.005;
        // Start patrolling frequently — enemies should feel alive
        const patrolMin = (enemy as any)._patrolRadiusMin || 90;
        const patrolMax = (enemy as any)._patrolRadiusMax || 220;
        if (Math.random() < 0.012) {
          enemy.state = 'patrol';
          enemy.patrolTarget = pickPatrolTarget(state, enemy, patrolMin, patrolMax);
        }
        break;
      }
      case 'patrol': {
        if (enemy.type === 'turret') break;
        if (enemy.type === 'sniper') { enemy.state = 'idle'; break; } // Snipers never patrol — stay still
        // Bodyguards follow their boss during patrol (only if tethered)
        if ((enemy as any)._bodyguardOf) {
          const boss = state.enemies.find(e => e.id === (enemy as any)._bodyguardOf);
          if (boss && boss.state !== 'dead') {
            const dBoss = dist(enemy.pos, boss.pos);
            if (dBoss > 50) {
              const dir = normalize({ x: boss.pos.x - enemy.pos.x, y: boss.pos.y - enemy.pos.y });
              enemy.pos = tryMoveEnemy(state, enemy.pos, dir.x * speed, dir.y * speed, 10);
              enemy.angle = Math.atan2(dir.y, dir.x);
            } else {
              // Face outward from boss for protection
              enemy.angle = Math.atan2(enemy.pos.y - boss.pos.y, enemy.pos.x - boss.pos.x);
            }
            break;
          }
        }
        // Boss waypoint patrol
        if (enemy.type === 'boss' && (enemy as any)._patrolWaypoints) {
          const waypoints = (enemy as any)._patrolWaypoints as Vec2[];
          let wpIdx = (enemy as any)._waypointIdx || 0;
          if (dist(enemy.pos, waypoints[wpIdx]) < 40) {
            wpIdx = (wpIdx + 1) % waypoints.length;
            (enemy as any)._waypointIdx = wpIdx;
            enemy.patrolTarget = waypoints[wpIdx];
          }
        }
        if (dist(enemy.pos, enemy.patrolTarget) < 20) {
          enemy.state = 'idle';
        } else {
          const dir = normalize({ x: enemy.patrolTarget.x - enemy.pos.x, y: enemy.patrolTarget.y - enemy.pos.y });
          const newPos = tryMoveEnemy(state, enemy.pos, dir.x * speed * 0.65, dir.y * speed * 0.65, 10);
          // Wall-stuck detection: if barely moved, pick new direction quickly
          if (dist(newPos, enemy.pos) < 0.1) {
            if (!(enemy as any)._stuckCounter) (enemy as any)._stuckCounter = 0;
            (enemy as any)._stuckCounter++;
            if ((enemy as any)._stuckCounter > 8) {
              // Force an escape step, then pick a better patrol target
              const escapeStep = findEnemyEscapeStep(state, enemy.pos, Math.max(6, speed * 0.9), 10);
              if (escapeStep) enemy.pos = escapeStep;
              else relocateEnemyToOpenArea(state, enemy);
              enemy.patrolTarget = pickPatrolTarget(state, enemy, 90, 220);
              (enemy as any)._stuckCounter = 0;
            }
          } else {
            (enemy as any)._stuckCounter = 0;
            enemy.pos = newPos;
          }
          enemy.angle = Math.atan2(dir.y, dir.x);
        }
        break;
      }
      case 'investigate': {
        if (enemy.type === 'turret') {
          // Turret just aims toward sound — only if within its arc
          if (enemy.investigateTarget && isInFiringArc(enemy, enemy.investigateTarget.x, enemy.investigateTarget.y)) {
            enemy.angle = Math.atan2(enemy.investigateTarget.y - enemy.pos.y, enemy.investigateTarget.x - enemy.pos.x);
          }
          // After a moment, go back to idle
          if (Math.random() < 0.01) enemy.state = 'idle';
          break;
        }
        if (enemy.type === 'sniper') { enemy.state = 'idle'; break; } // Snipers don't walk to investigate
        if (enemy.investigateTarget) {
          const dToTarget = dist(enemy.pos, enemy.investigateTarget);
          if (dToTarget < 30) {
            // === SOUND INVESTIGATION MEMORY ===
            // Arrived at investigation point but found nothing → become more vigilant
            const investigationCount = ((enemy as any)._investigationCount || 0) + 1;
            (enemy as any)._investigationCount = investigationCount;
            // Each fruitless investigation makes the enemy harder to fool
            enemy.awarenessDecay = Math.max(0.02, enemy.awarenessDecay * (0.70 - investigationCount * 0.05));
            // Heightened alertness: awareness doesn't drop below a floor
            const awarenessFloor = Math.min(0.5, investigationCount * 0.15);
            if (enemy.awareness < awarenessFloor) enemy.awareness = awarenessFloor;
            // Random: 25% chance to stay alert longer, 15% chance to go into patrol with boosted range
            const vigilanceRoll = Math.random();
            if (vigilanceRoll < 0.25) {
              // Extended alert — look around for longer
              (enemy as any)._alertStart = state.time;
              (enemy as any)._extendedAlert = true; // will alert for 5-8s instead of 3-5s
              enemy.state = 'alert';
              setSpeech(enemy, investigationCount >= 2 ? 'ЧТО-ТО НЕ ТАК...' : 'СТРАННО...', 2.5);
            } else if (vigilanceRoll < 0.40) {
              // Boosted patrol — larger detection range temporarily
              enemy.alertRange *= 1.3;
              enemy.state = 'patrol';
              enemy.patrolTarget = pickPatrolTarget(state, enemy, 80, 200);
              setSpeech(enemy, 'Я СЛЕЖУ...', 2.0);
            } else {
              enemy.state = 'alert';
            }
          } else {
            // Check if target is reachable (LOS to target)
            const canReach = hasLineOfSight(state, enemy.pos, enemy.investigateTarget, enemy.elevated);
            if (!canReach) {
              // Can't see through wall — find nearest doorway/opening to peek or go through
              // Search for gaps in walls (doorways are gaps between wall segments)
              const target = enemy.investigateTarget;
              let bestDoorPos: Vec2 | null = null;
              let bestDoorDist = Infinity;
              
              // Scan for walkable positions between enemy and target near walls
              const dirToTarget = normalize({ x: target.x - enemy.pos.x, y: target.y - enemy.pos.y });
              const perpX = -dirToTarget.y;
              const perpY = dirToTarget.x;
              const scanDist = dist(enemy.pos, target);
              
              // Check positions along the perpendicular near walls for openings
              for (let along = 0.2; along <= 0.8; along += 0.15) {
                const midX = enemy.pos.x + (target.x - enemy.pos.x) * along;
                const midY = enemy.pos.y + (target.y - enemy.pos.y) * along;
                for (let side = -200; side <= 200; side += 30) {
                  const testX = midX + perpX * side;
                  const testY = midY + perpY * side;
                  if (testX < 20 || testX > state.mapWidth - 20 || testY < 20 || testY > state.mapHeight - 20) continue;
                  // Check if this point has LOS to both enemy and target
                  if (hasLineOfSight(state, enemy.pos, { x: testX, y: testY }, enemy.elevated) &&
                      hasLineOfSight(state, { x: testX, y: testY }, target, enemy.elevated)) {
                    const d = dist(enemy.pos, { x: testX, y: testY });
                    if (d < bestDoorDist) {
                      bestDoorDist = d;
                      bestDoorPos = { x: testX, y: testY };
                    }
                  }
                }
              }
              
              if (bestDoorPos) {
                // Found an opening — go to it (peek/exit through door)
                enemy.investigateTarget = bestDoorPos;
                setSpeech(enemy, Math.random() < 0.5 ? 'ПРОВЕРЮ ВЫХОД!' : 'ВЫХОЖУ!', 2.0);
              } else {
                // No opening found — patrol instead
                enemy.state = 'patrol';
                enemy.patrolTarget = pickPatrolTarget(state, enemy, 100, 240);
              }
              break;
            }
            const dir = normalize({ x: enemy.investigateTarget.x - enemy.pos.x, y: enemy.investigateTarget.y - enemy.pos.y });
            const newPos = tryMoveEnemy(state, enemy.pos, dir.x * speed * 0.7, dir.y * speed * 0.7, 10);
            if (dist(newPos, enemy.pos) < 0.1) {
              if (!(enemy as any)._stuckCounter) (enemy as any)._stuckCounter = 0;
              (enemy as any)._stuckCounter++;
              if ((enemy as any)._stuckCounter > 10) {
                // Stuck at wall — escape and resume patrol
                const escapeStep = findEnemyEscapeStep(state, enemy.pos, Math.max(6, speed * 0.9), 10);
                if (escapeStep) enemy.pos = escapeStep;
                else relocateEnemyToOpenArea(state, enemy);
                enemy.state = 'patrol';
                enemy.patrolTarget = pickPatrolTarget(state, enemy, 100, 240);
                (enemy as any)._stuckCounter = 0;
              }
            } else {
              (enemy as any)._stuckCounter = 0;
              enemy.pos = newPos;
            }
            enemy.angle = Math.atan2(dir.y, dir.x);
          }
        } else {
          enemy.state = 'patrol';
        }
        break;
      }
      case 'alert': {
        // Looking around nervously — extended alert if triggered by investigation memory
        enemy.angle += Math.sin(state.time * 3 + enemy.pos.x) * 0.03;
        if (!(enemy as any)._alertStart) (enemy as any)._alertStart = state.time;
        const alertDuration = (enemy as any)._extendedAlert ? (5 + Math.random() * 3) : (3 + Math.random() * 2);
        if (state.time - (enemy as any)._alertStart > alertDuration) {
          (enemy as any)._alertStart = 0;
          delete (enemy as any)._extendedAlert;
          enemy.state = 'patrol';
          enemy.patrolTarget = pickPatrolTarget(state, enemy, 120, 300);
        }
        break;
      }
      case 'chase': {
        if (enemy.type === 'turret' || enemy.type === 'sniper') {
          // Turrets and snipers don't move — just aim
          if (isInFiringArc(enemy, state.player.pos.x, state.player.pos.y)) {
            const ta = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
            // Snipers turn slowly
            const turnRate = (enemy.type === 'sniper' ? 2.0 : 99) * dt;
            let td = ta - enemy.angle;
            while (td > Math.PI) td -= Math.PI * 2;
            while (td < -Math.PI) td += Math.PI * 2;
            enemy.angle += Math.abs(td) > turnRate ? Math.sign(td) * turnRate : td;
            // Sniper switches to attack when aimed
            if (enemy.type === 'sniper' && Math.abs(td) < 0.1) {
              enemy.state = 'attack';
            }
          } else {
            enemy.state = 'idle';
          }
          break;
        }
        // Chase toward player if LOS, otherwise toward investigateTarget or last known pos
        // Some enemies may take cover instead of rushing (30% chance per chase start)
        if (!(enemy as any)._coverDecided) {
          (enemy as any)._coverDecided = true;
          // Soldiers and heavies may seek cover instead of rushing
          // Enemies with _seekCoverChance personality trait may take cover
          const coverChance = (enemy as any)._seekCoverChance ?? 0.3;
          if (coverChance > 0 && Math.random() < coverChance) {
            (enemy as any)._seekCover = true;
            (enemy as any)._coverTimer = 30; // max 30s in cover
          }
        }

        // Cover-seeking behavior: find nearby prop/wall and hold position
        if ((enemy as any)._seekCover && (enemy as any)._coverTimer > 0) {
          (enemy as any)._coverTimer -= dt;
          // Find a cover position between enemy and player if not found yet
          if (!(enemy as any)._coverPos) {
            let bestCoverSq = Infinity;
            let coverFound: Vec2 | null = null;
            const coverPropTypes = ['concrete_barrier', 'sandbags', 'vehicle_wreck', 'wood_crate', 'barrel_stack', 'metal_shelf', 'tree', 'pine_tree'];
            for (const prop of state.props) {
              if (!coverPropTypes.includes(prop.type)) continue;
              const pdx = prop.pos.x - enemy.pos.x, pdy = prop.pos.y - enemy.pos.y;
              const dsq = pdx * pdx + pdy * pdy;
              if (dsq < 150 * 150 && dsq < bestCoverSq) {
                bestCoverSq = dsq;
                coverFound = { x: prop.pos.x, y: prop.pos.y };
              }
            }
            // No valid cover nearby: abort cover mode and fall through to normal chase
            if (!coverFound) {
              (enemy as any)._seekCover = false;
              (enemy as any)._coverPos = null;
              (enemy as any)._coverTimer = 0;
              (enemy as any)._coverDecided = false;
              // Fall through to normal chase logic below (don't break!)
            } else {
              (enemy as any)._coverPos = coverFound;
            }
          }
          // Only process cover behavior if we still have a valid cover position
          const cp = (enemy as any)._coverPos as Vec2 | null;
          if (cp) {
          const dToCover = dist(enemy.pos, cp);
            if (dToCover > 15) {
              // Move toward cover
              const dir = normalize({ x: cp.x - enemy.pos.x, y: cp.y - enemy.pos.y });
              enemy.pos = tryMoveEnemy(state, enemy.pos, dir.x * speed, dir.y * speed, 10);
              enemy.angle = Math.atan2(dir.y, dir.x);
            } else {
              // In cover — face player and shoot
              enemy.angle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
              // Fire from cover
              if (distToPlayer < enemy.shootRange && los && state.time - enemy.lastShot > enemy.fireRate / 1000) {
                enemy.state = 'attack';
              }
            }
            // After 30s, randomly pick new behavior
            if ((enemy as any)._coverTimer <= 0) {
              const roll = Math.random();
              if (roll < 0.3) {
                // Stay in cover — reset timer
                (enemy as any)._coverTimer = 20 + Math.random() * 15;
              } else if (roll < 0.55) {
                // Rush the player
                (enemy as any)._seekCover = false;
                (enemy as any)._coverPos = null;
                (enemy as any)._coverDecided = false;
              } else if (roll < 0.75) {
                // Disengage to patrol
                (enemy as any)._seekCover = false;
                (enemy as any)._coverPos = null;
                (enemy as any)._coverDecided = false;
                enemy.state = 'patrol';
                enemy.patrolTarget = pickPatrolTarget(state, enemy, 80, 200);
              } else {
                // Reposition to new cover spot
                (enemy as any)._coverPos = null;
                (enemy as any)._coverTimer = 15 + Math.random() * 10;
              }
            }
            break;
          }
          // If cover was aborted (no cp), fall through to normal chase below
        }

        // Only chase directly toward player with LOS — otherwise use last known position
        const chaseTarget = los ? state.player.pos : (enemy.investigateTarget || enemy.patrolTarget);
        const dir = normalize({ x: chaseTarget.x - enemy.pos.x, y: chaseTarget.y - enemy.pos.y });
        // Gradual turning while chasing
        const chaseTargetAngle = Math.atan2(dir.y, dir.x);
        const CHASE_TURN = 3.5 * dt;
        let chaseDelta = chaseTargetAngle - enemy.angle;
        while (chaseDelta > Math.PI) chaseDelta -= Math.PI * 2;
        while (chaseDelta < -Math.PI) chaseDelta += Math.PI * 2;
        if (Math.abs(chaseDelta) > CHASE_TURN) {
          enemy.angle += Math.sign(chaseDelta) * CHASE_TURN;
        } else {
          enemy.angle = chaseTargetAngle;
        }
        const newPos = tryMoveEnemy(state, enemy.pos, dir.x * speed, dir.y * speed, 10);
        if (dist(newPos, enemy.pos) < 0.1) {
          if (!(enemy as any)._stuckCounter) (enemy as any)._stuckCounter = 0;
          (enemy as any)._stuckCounter++;
          if ((enemy as any)._stuckCounter > 15) {
            const perpAngle = Math.atan2(dir.y, dir.x) + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
            const sidePos = tryMoveEnemy(state, enemy.pos, Math.cos(perpAngle) * speed, Math.sin(perpAngle) * speed, 10);
            enemy.pos = sidePos;
            (enemy as any)._stuckCounter = 0;
          }
        } else {
          (enemy as any)._stuckCounter = 0;
          enemy.pos = newPos;
        }
        break;
      }
      case 'flank': {
        // Move to flank position — only face player if LOS, otherwise face movement direction
        if (los) {
          enemy.angle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
        } else if (enemy.flankTarget) {
          enemy.angle = Math.atan2(enemy.flankTarget.y - enemy.pos.y, enemy.flankTarget.x - enemy.pos.x);
        }
        if (enemy.flankTarget) {
          const dToFlank = dist(enemy.pos, enemy.flankTarget);
          if (dToFlank < 25) {
            // Arrived at flank position — switch to attack
            enemy.state = 'attack';
          } else {
            const dir = normalize({ x: enemy.flankTarget.x - enemy.pos.x, y: enemy.flankTarget.y - enemy.pos.y });
            enemy.pos = tryMoveEnemy(state, enemy.pos, dir.x * speed * 1.2, dir.y * speed * 1.2, 10);
          }
        } else {
          enemy.state = 'chase';
        }
        // Opportunistic shots while flanking
        if (distToPlayer < enemy.shootRange && state.time - enemy.lastShot > enemy.fireRate / 1000 * 2 && isInFiringArc(enemy, state.player.pos.x, state.player.pos.y) && los) {
          const accF = (enemy as any)._accuracy ?? 0.7;
          const spread = (Math.random() - 0.5) * (0.30 - accF * 0.15); // flanking = less accurate
          const angle = enemy.angle + spread;
          state.bullets.push({
            pos: { x: enemy.pos.x + Math.cos(angle) * 14, y: enemy.pos.y + Math.sin(angle) * 14 },
            vel: { x: Math.cos(angle) * 9, y: Math.sin(angle) * 9 },
            damage: enemy.damage * 0.7, damageType: 'bullet', fromPlayer: false, life: 50, elevated: enemy.elevated,
            sourceId: enemy.id, sourceType: enemy.type,
          });
          enemy.lastShot = state.time;
          state.soundEvents.push({ pos: { ...enemy.pos }, radius: 200, time: state.time });
          playGunshot('rifle');
        }
        break;
      }
      case 'suppress': {
        // Stay in place, rapid fire toward player — only face if LOS
        if (los) {
          enemy.angle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
        } else {
          // No LOS — drop to investigate
          enemy.state = 'investigate';
          enemy.investigateTarget = { ...state.player.pos };
          break;
        }
        // Rapid suppressive fire with wide spread — only if player is in arc
        const suppressRate = enemy.fireRate / 1000 * 0.5; // fire twice as fast
        if (state.time - enemy.lastShot > suppressRate && isInFiringArc(enemy, state.player.pos.x, state.player.pos.y) && los && distToPlayer <= enemy.shootRange * 1.3) {
          const spread = (Math.random() - 0.5) * 0.35; // wide spread — suppression, not precision
          const angle = enemy.angle + spread;
          const bSpeed = enemy.type === 'heavy' ? 10.5 : 9;
          state.bullets.push({
            pos: { x: enemy.pos.x + Math.cos(angle) * 14, y: enemy.pos.y + Math.sin(angle) * 14 },
            vel: { x: Math.cos(angle) * bSpeed, y: Math.sin(angle) * bSpeed },
            damage: enemy.damage * 0.6, damageType: 'bullet', fromPlayer: false, life: 50, elevated: enemy.elevated,
            sourceId: enemy.id, sourceType: enemy.type,
          });
          enemy.lastShot = state.time;
          spawnParticles(state, enemy.pos.x + Math.cos(angle) * 16, enemy.pos.y + Math.sin(angle) * 16, '#ff6644', 2);
          state.soundEvents.push({ pos: { ...enemy.pos }, radius: 250, time: state.time });
          const gunType = enemy.type === 'heavy' ? 'heavy' : 'rifle';
          playGunshot(gunType);
        }
        // Switch back to attack when suppress timer runs out
        if (enemy.suppressTimer <= 0) {
          enemy.state = 'attack';
        }
        break;
      }
      case 'attack': {
        // If no LOS, drop to chase/investigate — don't track player through walls
        if (!los && enemy.type !== 'turret') {
          enemy.state = 'chase';
          enemy.investigateTarget = { ...state.player.pos };
          break;
        }
        const targetAngle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
        if (enemy.type === 'turret' || enemy.type === 'sniper') {
          if (isInFiringArc(enemy, state.player.pos.x, state.player.pos.y)) {
            const ta = targetAngle;
            const turnRate = (enemy.type === 'sniper' ? 2.0 : 99) * dt;
            let td = ta - enemy.angle;
            while (td > Math.PI) td -= Math.PI * 2;
            while (td < -Math.PI) td += Math.PI * 2;
            enemy.angle += Math.abs(td) > turnRate ? Math.sign(td) * turnRate : td;
          } else {
            enemy.state = 'idle';
            break;
          }
        } else {
          // Gradual turning — enemies must physically rotate toward player
          const TURN_SPEED = enemy.type === 'boss' ? 4.5 : enemy.type === 'heavy' ? 3.0 : 4.0;
          let angleDelta = targetAngle - enemy.angle;
          while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
          while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
          const maxTurn = TURN_SPEED * dt;
          if (Math.abs(angleDelta) > maxTurn) {
            enemy.angle += Math.sign(angleDelta) * maxTurn;
          } else {
            enemy.angle = targetAngle;
          }
        }
        // Must be in range AND have LOS to fire
        if (distToPlayer > enemy.shootRange * 1.2) {
          // Out of range — chase instead
          enemy.state = 'chase';
          break;
        }
        // === FRIENDLY FIRE AWARENESS ===
        // Check if an ally is in the line of fire before shooting (90% chance to check, 10% panic fire)
        let allyBlocking = false;
        if (enemy.type !== 'turret' && enemy.type !== 'boss' && Math.random() > 0.10) {
          const fireAngle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
          for (const ally of state.enemies) {
            if (ally === enemy || ally.state === 'dead' || ally.friendly !== enemy.friendly) continue;
            const dToAlly = dist(enemy.pos, ally.pos);
            if (dToAlly > distToPlayer || dToAlly < 20) continue; // ally behind player or too close to self
            const allyAngle = Math.atan2(ally.pos.y - enemy.pos.y, ally.pos.x - enemy.pos.x);
            let angleDiffFF = Math.abs(fireAngle - allyAngle);
            if (angleDiffFF > Math.PI) angleDiffFF = Math.PI * 2 - angleDiffFF;
            if (angleDiffFF < 0.15 && dToAlly < distToPlayer * 0.9) { // ally within ~8.5° cone and closer
              allyBlocking = true;
              break;
            }
          }
        }
        if (allyBlocking) {
          // Reposition instead of shooting — move perpendicular to firing line
          const perpAngle = enemy.angle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
          enemy.pos = tryMoveEnemy(state, enemy.pos, Math.cos(perpAngle) * speed * 0.8, Math.sin(perpAngle) * speed * 0.8, 10);
          break; // skip shooting this frame
        }
        if (state.time - enemy.lastShot > enemy.fireRate / 1000 && isInFiringArc(enemy, state.player.pos.x, state.player.pos.y) && los && distToPlayer <= enemy.shootRange) {
          if (enemy.type === 'shocker') {
            // Electric shock — melee range, no bullet, direct damage
            const dmg = enemy.damage;
            state.player.hp -= dmg;
            state.player.bleedRate = Math.min(state.player.bleedRate + 0.5, 3);
            enemy.lastShot = state.time;
            spawnParticles(state, state.player.pos.x, state.player.pos.y, '#44ddff', 8);
            spawnParticles(state, enemy.pos.x, enemy.pos.y, '#44ddff', 4);
            addMessage(state, `⚡ ELECTRIC SHOCK! -${Math.floor(dmg)}HP`, 'damage');
            state.soundEvents.push({ pos: { ...enemy.pos }, radius: 100, time: state.time });
            playHit();
            if (state.player.hp <= 0) {
              state.deathCause = `⚡ Electrocuted by Shocker`;
            }
          } else {
            // Accuracy trait affects spread: high accuracy = tight spread, low = wild
            const acc = (enemy as any)._accuracy ?? 0.7;
            const baseSpread = enemy.type === 'sniper' ? 0.03 : enemy.type === 'turret' ? 0.1 : 0.25 - acc * 0.2; // 0.7 acc → 0.11, 0.5 acc → 0.15, 0.95 → 0.06
            const spread = (Math.random() - 0.5) * baseSpread;
            const angle = enemy.angle + spread;
            const bSpeed = enemy.type === 'sniper' ? 15 : enemy.type === 'turret' ? 12 : 9;
            state.bullets.push({
              pos: { x: enemy.pos.x + Math.cos(angle) * 14, y: enemy.pos.y + Math.sin(angle) * 14 },
              vel: { x: Math.cos(angle) * bSpeed, y: Math.sin(angle) * bSpeed },
              damage: enemy.damage,
              damageType: 'bullet',
              fromPlayer: false,
              life: enemy.type === 'sniper' ? 80 : 50,
              elevated: enemy.elevated,
              sourceId: enemy.id,
              sourceType: enemy.type,
            });
            enemy.lastShot = state.time;
            spawnParticles(state, enemy.pos.x + Math.cos(angle) * 16, enemy.pos.y + Math.sin(angle) * 16, '#ff6644', 2);
            state.soundEvents.push({ pos: { ...enemy.pos }, radius: 200, time: state.time });
            const gunType = enemy.type === 'boss' ? 'boss' : enemy.type === 'turret' ? 'turret' : enemy.type === 'heavy' ? 'heavy' : enemy.type === 'sniper' ? 'rifle' : 'rifle';
            playGunshot(gunType);
          }
        }
        if (enemy.type !== 'turret' && enemy.type !== 'boss' && enemy.type !== 'sniper' && distToPlayer < enemy.shootRange * 0.5) {
          const dir = normalize({ x: enemy.pos.x - state.player.pos.x, y: enemy.pos.y - state.player.pos.y });
          enemy.pos = tryMoveEnemy(state, enemy.pos, dir.x * speed * 0.3, dir.y * speed * 0.3, 10);
        }
        // Boss: tactical — throw grenades/flashbangs, retreat, command minions
        if (enemy.type === 'boss') {
          // Alternate between frag grenades and flashbangs
          if ((enemy.bossChargeTimer || 0) <= 0 && distToPlayer < enemy.shootRange * 1.2 && distToPlayer > 80) {
            const throwFlashbang = Math.random() < 0.2; // 20% chance flashbang (halved)
            enemy.bossChargeTimer = throwFlashbang ? 5 + Math.random() * 3 : 6 + Math.random() * 4;
            const gAngle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
            const gSpeed = 4;
            if (throwFlashbang) {
              state.grenades.push({
                pos: { x: enemy.pos.x, y: enemy.pos.y },
                vel: { x: Math.cos(gAngle) * gSpeed, y: Math.sin(gAngle) * gSpeed },
                timer: 1.0,
                radius: 200,
                damage: -1,
                fromPlayer: false,
                sourceId: enemy.id,
                sourceType: 'boss',
              });
              addMessage(state, `💫 ${getBossTitle(enemy)} throws FLASHBANG!`, 'warning');
              spawnParticles(state, enemy.pos.x, enemy.pos.y, '#ffffaa', 5);
            } else {
              state.grenades.push({
                pos: { x: enemy.pos.x, y: enemy.pos.y },
                vel: { x: Math.cos(gAngle) * gSpeed, y: Math.sin(gAngle) * gSpeed },
                timer: 1.5,
                radius: 80,
                damage: 25,
                fromPlayer: false,
                sourceId: enemy.id,
                sourceType: 'boss',
              });
              addMessage(state, `💣 ${getBossTitle(enemy)} throws grenade!`, 'warning');
              spawnParticles(state, enemy.pos.x, enemy.pos.y, '#ffaa00', 5);
            }
          }

          // === NACHALNIK SPECIALS: one-use net, spin hook, close hook strike ===
          if ((enemy as any)._hookAttack) {
            const phase = enemy.bossPhase || 0;

            // One-use fishing net cast: slows player, then boss runs to ambush
            if (!(enemy as any)._netUsed && distToPlayer > 85 && distToPlayer < 240 && los) {
              const netAngle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
              (state as any)._netCast = {
                from: { x: enemy.pos.x, y: enemy.pos.y },
                to: { x: state.player.pos.x, y: state.player.pos.y },
                timer: 0.7,
                maxTimer: 0.7,
                angle: netAngle,
              };
              (state as any)._playerNetSlowTimer = 2.8;
              (enemy as any)._netUsed = true;
              (enemy as any)._ambushTimer = 2.2;
              enemy.speechBubble = 'СЕТЬ!';
              enemy.speechBubbleTimer = 1.2;
              addMessage(state, `🕸 ${getBossTitle(enemy)} casts a fishing net!`, 'warning');
              spawnParticles(state, state.player.pos.x, state.player.pos.y, '#cfc7a0', 14);
            }

            // Spin attack (occasional)
            if ((enemy as any)._spinAttackTimer > 0) {
              (enemy as any)._spinAttackTimer -= dt;
              enemy.angle += dt * 14;
              (enemy as any)._spinHitCd = Math.max(0, ((enemy as any)._spinHitCd || 0) - dt);
              if (distToPlayer < 80 && ((enemy as any)._spinHitCd || 0) <= 0) {
                const spinDmg = 26 + phase * 8;
                state.player.hp -= Math.max(0, spinDmg - state.player.armor * 0.25);
                state.player.bleedRate = Math.max(state.player.bleedRate, 2.2);
                (enemy as any)._spinHitCd = 0.35;
                addMessage(state, `🌀 ${getBossTitle(enemy)} spin-slashes for ${spinDmg}!`, 'damage');
                playHit();
              }
              if ((enemy as any)._spinAttackTimer <= 0) {
                (enemy as any)._spinCooldown = 5 + Math.random() * 2;
              }
            } else {
              (enemy as any)._spinCooldown = Math.max(0, ((enemy as any)._spinCooldown || 0) - dt);
              if (((enemy as any)._spinCooldown || 0) <= 0 && distToPlayer < 95 && Math.random() < 0.0035) {
                (enemy as any)._spinAttackTimer = 1.0;
                (enemy as any)._spinHitCd = 0;
                enemy.speechBubble = 'ВЕРТУШКА!';
                enemy.speechBubbleTimer = 1.0;
              }
            }

            // Close hook strike
            if (distToPlayer < ((enemy as any)._hookRange || 55)) {
              const hookCd = (enemy as any)._hookCooldown || 0;
              if (hookCd <= 0) {
                const hookDmg = (enemy as any)._hookDamage || 60;
                const finalDmg = Math.round(hookDmg * (1 + phase * 0.3));
                state.player.hp -= Math.max(0, finalDmg - state.player.armor * 0.3);
                state.player.bleedRate = Math.max(state.player.bleedRate, 3);
                (enemy as any)._hookCooldown = 2.0 - phase * 0.3;
                addMessage(state, `🪝 ${getBossTitle(enemy)} hooks you for ${finalDmg} damage!`, 'damage');
                enemy.speechBubble = phase >= 2 ? 'ПОПАЛСЯ НА КРЮК!!' : phase >= 1 ? 'КРЮК НАЙДЁТ ТЕБЯ!' : 'НА КРЮК!';
                enemy.speechBubbleTimer = 2.0;
                (state as any)._screenShake = 0.5;
                spawnParticles(state, state.player.pos.x, state.player.pos.y, '#cc2222', 8);
                playHit();
              }
            }

            // Ambush sprint after net cast
            if (((enemy as any)._ambushTimer || 0) > 0) {
              (enemy as any)._ambushTimer -= dt;
              const runAway = normalize({ x: enemy.pos.x - state.player.pos.x, y: enemy.pos.y - state.player.pos.y });
              enemy.pos = tryMoveEnemy(state, enemy.pos, runAway.x * speed * 2.4, runAway.y * speed * 2.4, 12);
            } else if (distToPlayer < enemy.shootRange * 0.6) {
              const chargeDir = normalize({ x: state.player.pos.x - enemy.pos.x, y: state.player.pos.y - enemy.pos.y });
              enemy.pos = tryMoveEnemy(state, enemy.pos, chargeDir.x * speed * 1.8, chargeDir.y * speed * 1.8, 12);
            } else if (distToPlayer < enemy.shootRange * 0.5) {
              const retreatDir = normalize({ x: enemy.pos.x - state.player.pos.x, y: enemy.pos.y - state.player.pos.y });
              enemy.pos = tryMoveEnemy(state, enemy.pos, retreatDir.x * speed * 1.5, retreatDir.y * speed * 1.5, 12);
            } else if (distToPlayer > enemy.shootRange * 0.8) {
              const strafeAngle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x) + Math.PI * 0.5 * (Math.sin(state.time * 0.5) > 0 ? 1 : -1);
              enemy.pos = tryMoveEnemy(state, enemy.pos, Math.cos(strafeAngle) * speed * 0.8, Math.sin(strafeAngle) * speed * 0.8, 12);
            }

            if ((enemy as any)._hookCooldown > 0) (enemy as any)._hookCooldown -= dt;
          }

          // Boss: spawn reinforcements in phase 1+
          if ((enemy.bossPhase || 0) >= 1 && (enemy.bossSpawnTimer || 0) <= 0) {
            enemy.bossSpawnTimer = 12 + Math.random() * 8;
            const spawnAngle = Math.random() * Math.PI * 2;
            const spawnDist = 80 + Math.random() * 60;
            const sx = enemy.pos.x + Math.cos(spawnAngle) * spawnDist;
            const sy = enemy.pos.y + Math.sin(spawnAngle) * spawnDist;
            const minion: Enemy = {
              id: `enemy_minion_${Date.now()}`,
              pos: { x: sx, y: sy },
              hp: 30, maxHp: 30, speed: 1.6, damage: 10,
              alertRange: 200, shootRange: 150, fireRate: 1000,
              state: 'chase', patrolTarget: { x: sx, y: sy },
              lastShot: 0, angle: Math.random() * Math.PI * 2,
              type: 'scav', eyeBlink: 3, loot: [], looted: false,
              lastRadioCall: 0, radioGroup: enemy.radioGroup, radioAlert: 0,
              tacticalRole: 'assault', suppressTimer: 0, callForHelpTimer: 0, lastTacticalSwitch: 0, stunTimer: 0, awareness: 1, awarenessDecay: 0.15, elevated: false, friendly: false, friendlyTimer: 0,
            };
            state.enemies.push(minion);
            addMessage(state, `📻 ${getBossTitle(enemy)} calls reinforcements!`, 'warning');
            spawnParticles(state, sx, sy, '#ff8844', 8);
          }
        }
        break;
      }
    }
  }

  // Update grenades
  state.grenades = state.grenades.filter(g => {
    g.vel.x *= 0.97; // friction
    g.vel.y *= 0.97;
    g.timer -= dt;

    // Bounce off walls — check BEFORE moving to prevent clipping through
    if (collidesWithWalls(state, g.pos.x + g.vel.x, g.pos.y, 4)) g.vel.x *= -0.5;
    if (collidesWithWalls(state, g.pos.x, g.pos.y + g.vel.y, 4)) g.vel.y *= -0.5;

    // Only move if not colliding
    const nx = g.pos.x + g.vel.x;
    const ny = g.pos.y + g.vel.y;
    if (!collidesWithWalls(state, nx, ny, 4)) {
      g.pos.x = nx;
      g.pos.y = ny;
    } else {
      // Stuck against wall — stop movement
      g.vel.x *= 0.1;
      g.vel.y *= 0.1;
    }

    // Enemies see incoming grenade and flee (player grenades only, random chance per type)
    if (g.fromPlayer && g.timer > 0.3 && g.timer < 1.5 && g.damage !== -2) {
      // Gas grenades do NOT cause enemies to flee
      for (const enemy of state.enemies) {
        if (enemy.state === 'dead' || enemy.type === 'turret') continue;
        if ((enemy as any)._grenadeFlee) continue; // already fleeing
        if ((enemy as any)._grenadeFleeRolled) continue; // already decided not to flee
        const grenadeFleeRadiusSq = (g.radius * 1.5) * (g.radius * 1.5);
        if (distSq(g.pos, enemy.pos) < grenadeFleeRadiusSq && hasLineOfSight(state, g.pos, enemy.pos, enemy.elevated)) {
          // Random flee chance — bosses flee MORE often, others less
          let fleeChance = 0.4; // default 40%
          if (enemy.type === 'boss') fleeChance = 0.8;
          else if (enemy.type === 'heavy' || (enemy as any)._isBodyguard) fleeChance = 0.6;
          else if (enemy.type === 'scav') fleeChance = 0.3;
          else if (enemy.type === 'sniper') fleeChance = 0.7;

          if (Math.random() < fleeChance) {
            (enemy as any)._grenadeFlee = 2.0; // flee for 2 seconds
            const fleeAngle = Math.atan2(enemy.pos.y - g.pos.y, enemy.pos.x - g.pos.x) + (Math.random() - 0.5) * 0.6;
            (enemy as any)._grenadeFleeAngle = fleeAngle;
          } else {
            (enemy as any)._grenadeFleeRolled = true;
            // Boss special: 50/50 go prone (damage reduction) or rush player
            if (enemy.type === 'boss') {
              if (Math.random() < 0.5) {
                // Go prone — 0.2s to get down, then prone for 3s
                (enemy as any)._proneGoDownTimer = 0.2;
                if (!(enemy as any)._originalSpeed) (enemy as any)._originalSpeed = enemy.speed;
                enemy.speechBubble = 'ЛОЖИСЬ!';
                enemy.speechBubbleTimer = 2.0;
                enemy.state = 'idle';
              } else {
                // Rush the player aggressively
                enemy.state = 'chase';
                enemy.speechBubble = 'НА ТЕБЯ!';
                enemy.speechBubbleTimer = 1.5;
              }
            } else {
              const taunts = ['Я НЕ БОЮСЬ!', 'ХА! МИМО!', 'НЕ УБЕЖУ!', 'ДАВАЙ СЮДА!', 'СТОЮ КРЕПКО!'];
              enemy.speechBubble = taunts[Math.floor(Math.random() * taunts.length)];
              enemy.speechBubbleTimer = 2.0;
            }
          }
        }
      }
    }

    // === MORTAR FLEE — enemies only react in the last 0.8s before impact ===
    for (const m of state.mortarStrikes) {
      if (!m.fromPlayer || m.timer > 0.8 || m.timer <= 0) continue;
      for (const enemy of state.enemies) {
        if (enemy.state === 'dead' || enemy.type === 'turret') continue;
        if ((enemy as any)._grenadeFlee) continue; // already fleeing
        if ((enemy as any)._mortarFleeRolled) continue;
        const mortarRadiusSq = (m.radius * 1.3) * (m.radius * 1.3);
        const dToMortarSq = distSq(m.pos, enemy.pos);
        if (dToMortarSq < mortarRadiusSq && hasLineOfSight(state, m.pos, enemy.pos, enemy.elevated)) {
          let fleeChance = 0.5;
          if (enemy.type === 'boss') fleeChance = 0.7;
          else if (enemy.type === 'heavy' || (enemy as any)._isBodyguard) fleeChance = 0.5;
          else if (enemy.type === 'scav') fleeChance = 0.35;
          if (Math.random() < fleeChance) {
            (enemy as any)._grenadeFlee = 1.5;
            const fleeAngle = Math.atan2(enemy.pos.y - m.pos.y, enemy.pos.x - m.pos.x) + (Math.random() - 0.5) * 0.6;
            (enemy as any)._grenadeFleeAngle = fleeAngle;
            enemy.speechBubble = 'ОБСТРЕЛ!';
            enemy.speechBubbleTimer = 1.5;
          } else {
            (enemy as any)._mortarFleeRolled = true;
          }
        }
      }
    }

    if (g.timer <= 0) {
      const isFlashbang = g.damage === -1;
      const isGas = g.damage === -2;

      if (isGas) {
        // GAS GRENADE — convert nearest enemy within small radius to friendly
        addMessage(state, '☁️ GAS GRENADE!', 'warning');
        spawnParticles(state, g.pos.x, g.pos.y, '#88ff88', 20);
        spawnParticles(state, g.pos.x, g.pos.y, '#44cc44', 15);
        state.soundEvents.push({ pos: { ...g.pos }, radius: 200, time: state.time });
        const gasRadius = 60; // small radius — only hits 1 enemy
        let closest: Enemy | null = null;
        let closestDistSq = gasRadius * gasRadius;
        for (const enemy of state.enemies) {
          if (enemy.state === 'dead' || enemy.type === 'boss' || enemy.type === 'turret' || enemy.type === 'sniper' || (enemy as any)._isBodyguard || enemy.friendly) continue;
          const dSq = distSq(g.pos, enemy.pos);
          if (dSq < closestDistSq && hasLineOfSight(state, g.pos, enemy.pos, enemy.elevated)) {
            closest = enemy;
            closestDistSq = dSq;
          }
        }
        if (closest) {
          closest.friendly = true;
          closest.friendlyTimer = 20;
          closest.state = 'chase'; // start fighting for player
          addMessage(state, `☁️ ${closest.type.toUpperCase()} CONVERTED — fights for you for 20s!`, 'info');
        } else {
          addMessage(state, '☁️ Gas dissipated — no target hit', 'info');
        }
      } else if (isFlashbang) {
        // FLASHBANG — stun enemies, blind player
        addMessage(state, '💫 FLASHBANG!', 'warning');
        spawnParticles(state, g.pos.x, g.pos.y, '#ffffcc', 25);
        spawnParticles(state, g.pos.x, g.pos.y, '#ffffff', 20);
        state.soundEvents.push({ pos: { ...g.pos }, radius: 400, time: state.time });

        // Stun enemies in radius (but NOT boss or his bodyguards if thrown by boss)
        for (const enemy of state.enemies) {
          if (enemy.state === 'dead') continue;
          // Boss flashbangs don't affect boss or his bodyguards
          if (!g.fromPlayer) {
            if (enemy.type === 'boss' || (enemy as any)._isBodyguard) continue;
          }
          const d = dist(g.pos, enemy.pos);
          if (d < g.radius && hasLineOfSight(state, g.pos, enemy.pos, enemy.elevated)) {
            enemy.stunTimer = 3;
            enemy.state = 'idle';
            addMessage(state, `💫 ${enemy.type.toUpperCase()} STUNNED!`, 'info');
          }
        }

        // Blind player if in radius (only from player's own flashbangs is optional — boss flashbangs DO affect player)
        const dPlayer = dist(g.pos, state.player.pos);
        if (dPlayer < g.radius && hasLineOfSight(state, g.pos, state.player.pos)) {
          const intensity = 1 - (dPlayer / g.radius);
          // Enemy flashbangs have random 50-100% effectiveness
          const hasGogglesItem = state.player.inventory.some(i => i.id === 'goggles' || i.name === 'Tactical Goggles');
          const baseFlashDuration = g.fromPlayer ? 3 : 3 * (0.5 + Math.random() * 0.5);
          state.flashbangTimer = hasGogglesItem ? baseFlashDuration * 0.5 : baseFlashDuration;
          addMessage(state, '💫 STUNNED! Cannot move!', 'damage');
        }
      } else {
        // REGULAR GRENADE — instant kill
        addMessage(state, '💥 EXPLOSION!', 'damage');
        spawnParticles(state, g.pos.x, g.pos.y, '#ff8833', 20);
        spawnParticles(state, g.pos.x, g.pos.y, '#ffcc44', 15);
        spawnParticles(state, g.pos.x, g.pos.y, '#444', 10);
        playExplosion();
        (state as any)._screenShake = 1.0;
        state.soundEvents.push({ pos: { ...g.pos }, radius: 500, time: state.time });

        for (const enemy of state.enemies) {
          if (enemy.state === 'dead') continue;
          const d = dist(g.pos, enemy.pos);
          if (d < g.radius && hasLineOfSight(state, g.pos, enemy.pos, enemy.elevated)) {
            if (enemy.type === 'boss') {
              // Boss takes 25% grenade damage (75% defense), halved again if prone
              const proneReduction = (enemy as any)._proneTimer > 0 ? 0.5 : 1.0;
              const dmg = enemy.maxHp * 0.25 * proneReduction;
              enemy.hp -= dmg;
              spawnParticles(state, enemy.pos.x, enemy.pos.y, '#ff4444', 8);
              const proneText = (enemy as any)._proneTimer > 0 ? ' (PRONE — reduced!)' : '';
              addMessage(state, `💥 Boss resists blast! -${Math.floor(dmg)}HP${proneText}`, 'damage');
              if (enemy.hp > 0) { enemy.state = 'chase'; continue; }
            }
            // Bodyguards take 25% grenade damage (75% grenade defense)
            if ((enemy as any)._isBodyguard) {
              const dmg = enemy.maxHp * 0.25;
              enemy.hp -= dmg;
              spawnParticles(state, enemy.pos.x, enemy.pos.y, '#ff4444', 6);
              addMessage(state, `💥 Bodyguard resists blast! -${Math.floor(dmg)}HP`, 'damage');
              if (enemy.hp > 0) { enemy.state = 'chase'; continue; }
            }
            enemy.hp = 0;
            enemy.state = 'dead';
            if (enemy.type === 'boss') {
              (enemy as any)._deathMonologue = getBossDeathMonologue(enemy);
              (enemy as any)._deathMonologueTimer = 2.5;
              enemy.speechBubble = (enemy as any)._deathMonologue.shift();
              enemy.speechBubbleTimer = 2.5;
            } else {
              setSpeech(enemy, pickLine(DEATH_LINES, enemy.type), 3.0);
            }
            
            sendReinforcementToPlatform(state, enemy);
            enemy.loot = generateEnemyLoot(enemy);
            state.killCount++;
            if (enemy.type === 'dog') state.dogsKilled++;
            state.grenadeKills++;
            addKillFeed(state, enemy.type, 'Grenade');
            addMessage(state, enemy.type === 'boss' ? `💀 ${getBossTitle(enemy)} IS DEAD!` : `Eliminated: ${enemy.type.toUpperCase()} (grenade)`, 'kill');
            spawnParticles(state, enemy.pos.x, enemy.pos.y, '#884444', 10);
            notifyAllyDeath(state, enemy, 'Grenade');
            trackWeaponMasteryKill(state, undefined, 'Grenade');
          }
        }

        // Grenade near sabotage targets → destroy
        if (g.fromPlayer) {
          for (const prop of state.props) {
            const gd = dist(g.pos, prop.pos);
            if (prop.type === 'airplane' && gd < 150 && !(state as any)._tntOnPlane) {
              (state as any)._tntOnPlane = true;
              addMessage(state, '✈️ Aircraft destroyed by grenade! Sabotage complete!', 'intel');
              spawnParticles(state, prop.pos.x, prop.pos.y, '#ff8833', 15);
            }
            if (prop.type === 'fuel_depot' && gd < 120 && !(state as any)._fuelDestroyed) {
              (state as any)._fuelDestroyed = true;
              addMessage(state, '🛢️ Fuel depot destroyed by grenade!', 'intel');
              spawnParticles(state, prop.pos.x, prop.pos.y, '#ff6622', 15);
            }
            if (prop.type === 'ammo_dump' && gd < 120 && !(state as any)._ammoDestroyed) {
              (state as any)._ammoDestroyed = true;
              addMessage(state, '💥 Ammo dump destroyed by grenade!', 'intel');
              spawnParticles(state, prop.pos.x, prop.pos.y, '#ffaa33', 15);
            }
          }
        }

        // Damage player if in radius AND line of sight
        const d = dist(g.pos, state.player.pos);
        if (d < g.radius && hasLineOfSight(state, g.pos, state.player.pos)) {
          const falloff = 1 - (d / g.radius);
          const dmg = g.damage * falloff * 0.5;
          state.player.hp -= dmg;
          state.noHitsTaken = false;
          spawnParticles(state, state.player.pos.x, state.player.pos.y, '#ff2222', 4);
          addMessage(state, `💥 Shrapnel! -${Math.floor(dmg)}HP`, 'damage');
          if (state.player.hp <= 0) {
            const srcLabel = getDamageSourceLabel(state, g.sourceType, g.sourceId);
            state.deathCause = g.fromPlayer ? '💣 Killed by own grenade' : `💣 Grenade from ${srcLabel}`;
          }
        }
      }

      return false;
    }
    return true;
  });

  // Update bullets
  state.bullets = state.bullets.filter(b => {
    b.pos.x += b.vel.x;
    b.pos.y += b.vel.y;
    b.life--;

    if (b.life <= 0) return false;

    // Melee bullets can sabotage airplane
    if (b.fromPlayer && b.weaponName && (b.weaponName === 'Combat Knife' || b.weaponName === 'Baton') && !(state as any)._tntOnPlane) {
      for (const prop of state.props) {
        if (prop.type === 'airplane' && dist(b.pos, prop.pos) < 80) {
          (state as any)._tntOnPlane = true;
          addMessage(state, '✈️ Aircraft sabotaged with melee! Objective complete!', 'intel');
          spawnParticles(state, prop.pos.x, prop.pos.y, '#ff8833', 10);
        }
      }
    }

    // Check elevated enemy hits BEFORE wall collision so bullets can reach wall guards
    if (b.fromPlayer) {
      for (const enemy of state.enemies) {
        if (enemy.state === 'dead' || !enemy.elevated || enemy.friendly) continue;
        const edx = b.pos.x - enemy.pos.x, edy = b.pos.y - enemy.pos.y;
        if (edx * edx + edy * edy < 784) { // 28*28 = 784
          if (Math.random() < 0.25) {
            spawnParticles(state, b.pos.x, b.pos.y, '#aaa', 2);
            return false; // concealment miss (reduced from 40% to 25%)
          }
          const critChance = calcHeadshotChance(state, b, enemy);
          const isCrit = Math.random() < critChance;
          if (isCrit) {
            enemy.hp = 0;
            if (b.fromPlayer) { (state as any)._shotsHit = ((state as any)._shotsHit || 0) + 1; (state as any)._damageDealt = ((state as any)._damageDealt || 0) + b.damage * 2; }
            spawnParticles(state, b.pos.x, b.pos.y, '#ffff00', 10);
            playHit();
            addMessage(state, '💀 HEADSHOT!', 'kill');
            setSpeech(enemy, '💀 HEADSHOT', 2.0);
            addHitMarker(b.pos.x, b.pos.y, state.time, true, true, b.damage * 2);
           } else {
            // Boss and bodyguard body armor: 33% damage reduction
            const armorReduction = (enemy.type === 'boss' || (enemy as any)._isBodyguard) ? 0.67 : 1.0;
            const actualDmg = b.damage * armorReduction;
            enemy.hp -= actualDmg;
            if (b.fromPlayer) { (state as any)._shotsHit = ((state as any)._shotsHit || 0) + 1; (state as any)._damageDealt = ((state as any)._damageDealt || 0) + actualDmg; }
            spawnParticles(state, b.pos.x, b.pos.y, '#ff4444', 5);
            playHit();
            addHitMarker(b.pos.x, b.pos.y, state.time, false, false, actualDmg);
          }
          if (enemy.hp <= 0) {
            enemy.state = 'dead';
            setSpeech(enemy, pickLine(DEATH_LINES, enemy.type), 3.0);
            addHitMarker(enemy.pos.x, enemy.pos.y, state.time, true, isCrit, b.damage);
            
            sendReinforcementToPlatform(state, enemy);
            enemy.loot = generateEnemyLoot(enemy);
            state.killCount++;
            if (enemy.type === 'dog') state.dogsKilled++;
            // Track elevated kill achievements
            if (isCrit) state.headshotKills++;
            if (b.weaponName === 'Mosin-Nagant') state.mosinKills++;
            const killDist = dist(b.pos, state.player.pos);
            if (killDist > 250) state.longShots++;
            if (killDist < 50) state.knifeDistanceKills++;
            if (!isCrit) addMessage(state, `Eliminated: ${enemy.type.toUpperCase()}`, 'kill');
            notifyAllyDeath(state, enemy, isCrit ? 'Headshot' : (b.weaponName || 'Bullet'));
            trackWeaponMasteryKill(state, b.weaponName, isCrit ? 'Headshot' : 'Bullet');
          } else {
            if (enemy.elevated) {
              enemy.alertRange = Math.max(enemy.alertRange, 300);
              enemy.shootRange = Math.max(enemy.shootRange, 250);
            }
            enemy.state = 'chase';
          }
          return false;
        }
      }
    }

    // Wall collision — but let player bullets pass through walls near elevated enemies
    if (!b.elevated && collidesWithWalls(state, b.pos.x, b.pos.y, 2)) {
      // If player bullet is near an elevated enemy, skip wall collision (they're ON the wall)
      if (b.fromPlayer) {
        let nearElevated = false;
        for (const enemy of state.enemies) {
          if (enemy.state === 'dead' || !enemy.elevated) continue;
          const edx2 = b.pos.x - enemy.pos.x, edy2 = b.pos.y - enemy.pos.y;
          if (edx2 * edx2 + edy2 * edy2 < 2500) { nearElevated = true; break; } // 50*50
        }
        if (nearElevated) {
          // Don't destroy bullet — let it continue to the elevated hitbox check next frame
        } else {
          spawnParticles(state, b.pos.x, b.pos.y, '#888', 3);
          return false;
        }
      } else {
        spawnParticles(state, b.pos.x, b.pos.y, '#888', 3);
        return false;
      }
    }

    if (b.fromPlayer) {
      const isMosin = b.weaponName === 'Mosin-Nagant';
      const hitRadius = isMosin ? 26 : 20;
      const hitRadiusSq = hitRadius * hitRadius;
      const nearMissRadiusSq = (hitRadius + 3) * (hitRadius + 3);
      for (const enemy of state.enemies) {
        if (enemy.state === 'dead' || enemy.friendly) continue;
        const dx = b.pos.x - enemy.pos.x, dy = b.pos.y - enemy.pos.y;
        const dSq = dx * dx + dy * dy;
        // Quick skip — if more than 50px away, no chance of hit
        if (dSq > 2500) continue;
        // Sniper near-miss
        if (enemy.type === 'sniper' && !(enemy as any)._sniperInvisible) {
          if (dSq >= hitRadiusSq && dSq < nearMissRadiusSq) {
            (enemy as any)._sniperShouldFlee = true;
            (enemy as any)._sniperTeleportTimer = 0;
            spawnParticles(state, b.pos.x, b.pos.y, '#777', 3);
          }
        }
        if (dSq < hitRadiusSq) {
          // Sniper is untouchable during vanish window to prevent free DPS while teleporting
          if (enemy.type === 'sniper' && (enemy as any)._sniperInvisible > 0) {
            spawnParticles(state, b.pos.x, b.pos.y, '#999', 2);
            return false;
          }

          // === SILENT TAKEDOWN — sneak + behind + close range = instant kill, no sound ===
          const isSneaking = (state as any)._lastMovementMode === 'sneak';
          const toEnemyAngle = Math.atan2(enemy.pos.y - state.player.pos.y, enemy.pos.x - state.player.pos.x);
          let takedownAngleDiff = Math.abs(toEnemyAngle - enemy.angle);
          if (takedownAngleDiff > Math.PI) takedownAngleDiff = Math.PI * 2 - takedownAngleDiff;
          const behindEnemy = takedownAngleDiff < Math.PI * 0.4; // within 72° of enemy's facing direction (behind them)
          const closeRange = dist(state.player.pos, enemy.pos) < 120;
          const unaware = enemy.awareness < 0.5;
          
          if (isSneaking && behindEnemy && closeRange && unaware && enemy.type !== 'boss' && enemy.type !== 'turret') {
            // SILENT TAKEDOWN — instant kill, NO sound event, bonus message
            enemy.hp = 0;
            enemy.state = 'dead';
            setSpeech(enemy, '...', 1.0);
            sendReinforcementToPlatform(state, enemy);
            enemy.loot = generateEnemyLoot(enemy);
            state.killCount++;
            state.sneakKills++;
            if (enemy.type === 'dog') state.dogsKilled++;
            addKillFeed(state, enemy.type, 'Silent Takedown');
            addMessage(state, `🗡️ SILENT TAKEDOWN! +Stealth bonus`, 'kill');
            spawnParticles(state, enemy.pos.x, enemy.pos.y, '#44ccff', 8);
            notifyAllyDeath(state, enemy, 'Silent Takedown');
            trackWeaponMasteryKill(state, undefined, 'Silent Takedown');
            return false;
          }

          // Elevated enemies have concealment bonus — 40% miss chance
          if (enemy.elevated && Math.random() < 0.4) {
            spawnParticles(state, b.pos.x, b.pos.y, '#aaa', 2);
            return false; // bullet missed due to concealment
          }

          // Prone enemies — 50% miss chance (shots go over them)
          if ((enemy as any)._proneTimer > 0 && Math.random() < 0.5) {
            spawnParticles(state, b.pos.x, b.pos.y, '#6a8a4a', 2);
            return false; // bullet went over prone enemy
          }

          // Critical hit / headshot — skill-based: standing still, cover, weapon bonuses
          const critChance = calcHeadshotChance(state, b, enemy);
          const isCrit = Math.random() < critChance;
          
          if (isCrit) {
            enemy.hp = 0;
            if (b.fromPlayer) { (state as any)._shotsHit = ((state as any)._shotsHit || 0) + 1; (state as any)._damageDealt = ((state as any)._damageDealt || 0) + b.damage * 2; }
            spawnParticles(state, b.pos.x, b.pos.y, '#ffff00', 10);
            playHit();
            addMessage(state, '💀 HEADSHOT!', 'kill');
            setSpeech(enemy, '💀 HEADSHOT', 2.0);
            addHitMarker(b.pos.x, b.pos.y, state.time, true, true, b.damage * 2);
          } else {
            // Boss and bodyguard body armor: 33% damage reduction
            const armorReduction = (enemy.type === 'boss' || (enemy as any)._isBodyguard) ? 0.67 : 1.0;
            const actualDmg = b.damage * armorReduction;
            enemy.hp -= actualDmg;
            if (b.fromPlayer) { (state as any)._shotsHit = ((state as any)._shotsHit || 0) + 1; (state as any)._damageDealt = ((state as any)._damageDealt || 0) + actualDmg; }
            spawnParticles(state, b.pos.x, b.pos.y, '#ff4444', 5);
            playHit();
            addHitMarker(b.pos.x, b.pos.y, state.time, false, false, actualDmg);
          }
          
          if (enemy.hp <= 0) {
            addHitMarker(enemy.pos.x, enemy.pos.y, state.time, true, isCrit, b.damage);
            enemy.state = 'dead';
            if (enemy.type === 'boss') {
              (enemy as any)._deathMonologue = getBossDeathMonologue(enemy);
              (enemy as any)._deathMonologueTimer = 2.5;
              enemy.speechBubble = (enemy as any)._deathMonologue.shift();
              enemy.speechBubbleTimer = 2.5;
            } else {
              setSpeech(enemy, pickLine(DEATH_LINES, enemy.type), 3.0);
            }
            
            sendReinforcementToPlatform(state, enemy);
            enemy.loot = generateEnemyLoot(enemy);
            state.killCount++;
            if (enemy.type === 'dog') state.dogsKilled++;
            // Track bullet kill achievements
            if (isCrit) state.headshotKills++;
            if (b.weaponName === 'Mosin-Nagant') state.mosinKills++;
            const killDist = dist(b.pos, state.player.pos);
            if (killDist > 250) state.longShots++;
            if (killDist < 50) state.knifeDistanceKills++;
            
            const method = isCrit ? 'Headshot' : b.weaponName || 'Bullet';
            addKillFeed(state, enemy.type, method);
            if (!isCrit) {
              addMessage(state, enemy.type === 'boss' ? `💀 ${getBossTitle(enemy)} IS DEAD!` : `Eliminated: ${enemy.type.toUpperCase()}`, 'kill');
            }
            spawnParticles(state, enemy.pos.x, enemy.pos.y, '#884444', 10);
            notifyAllyDeath(state, enemy, method);
            trackWeaponMasteryKill(state, b.weaponName, method);
          } else {
            // Hit reaction speech bubble (15% chance)
            if (!enemy.speechBubble && Math.random() < 0.15) {
              setSpeech(enemy, pickLine(HIT_LINES, enemy.type), 1.5);
            }
            // Break passive timers/modes immediately when taking fire
            delete (enemy as any)._reactionDelay;
            delete (enemy as any)._pendingState;
            (enemy as any)._reactionDelayDone = true;
            (enemy as any)._seekCover = false;
            (enemy as any)._coverPos = null;
            (enemy as any)._coverTimer = 0;
            (enemy as any)._coverDecided = false;
            delete (enemy as any)._seekingCover;
            delete (enemy as any)._healCoverTarget;
            delete (enemy as any)._healingTimer;

            // When hit, elevated guards go to attack and expand their range
            if (enemy.elevated) {
              enemy.alertRange = Math.max(enemy.alertRange, 300);
              enemy.shootRange = Math.max(enemy.shootRange, 250);
              enemy.state = 'attack';
            } else {
              enemy.state = 'chase';
            }
            enemy.awareness = 1.0; // getting shot = full awareness
            enemy.investigateTarget = { ...state.player.pos };
            // Boost observation after being hit — harder to lose
            enemy.alertRange = Math.max(enemy.alertRange, enemy.alertRange * 1.4);
            enemy.awarenessDecay = Math.max(0.02, enemy.awarenessDecay * 0.3); // much slower decay
            (enemy as any)._combatAlert = true; // permanently heightened after taking fire
            // Panic or Berserk chance on taking damage (not boss, sniper, bodyguard, turret)
            if (enemy.type !== 'boss' && enemy.type !== 'sniper' && enemy.type !== 'turret' && enemy.type !== 'dog' && !(enemy as any)._isBodyguard && !(enemy as any)._panicTimer && !(enemy as any)._berserkTimer) {
              const hpPct = enemy.hp / enemy.maxHp;
              const panicChance = hpPct < 0.3 ? 0.25 : hpPct < 0.5 ? 0.12 : 0.05;
              const berserkChance = hpPct < 0.3 ? 0.15 : hpPct < 0.5 ? 0.08 : 0.02;
              const roll = Math.random();
              if (roll < panicChance) {
                (enemy as any)._panicTimer = 2 + Math.random() * 5; // 2-7s randomized
                setSpeech(enemy, pickLine(PANIC_LINES, enemy.type), 2.5);
                addMessage(state, `😱 ${enemy.type.toUpperCase()} PANICS!`, 'warning');
              } else if (roll < panicChance + berserkChance) {
                (enemy as any)._berserkTimer = 4 + Math.random() * 8; // 4-12s randomized
                (enemy as any)._preBerserkMaxHp = enemy.maxHp;
                enemy.maxHp *= 2;
                enemy.hp = Math.min(enemy.hp + enemy.maxHp * 0.3, enemy.maxHp);
                if (!(enemy as any)._originalSpeed) (enemy as any)._originalSpeed = enemy.speed;
                setSpeech(enemy, pickLine(BERSERK_LINES, enemy.type), 3.0);
                addMessage(state, `🔥 ${enemy.type.toUpperCase()} goes BERSERK!`, 'warning');
              }
            }
            // Prone trigger — soldiers/scavs in grass terrain go prone when hit
            if ((enemy.type === 'soldier' || enemy.type === 'scav') && !(enemy as any)._proneTimer && !(enemy as any)._proneGoDownTimer && !(enemy as any)._proneGetUpTimer) {
              // Use terrain grid for fast lookup instead of iterating all zones
              const terrainGrid = getTerrainGrid(state);
              const terrain = getTerrainFast(terrainGrid, enemy.pos.x, enemy.pos.y);
              const inGrass = terrain === 'grass' || terrain === 'forest';
              if (inGrass && Math.random() < 0.20) {
                // Go down to prone — 1s speed penalty first
                (enemy as any)._proneGoDownTimer = 1.0;
                if (!(enemy as any)._originalSpeed) (enemy as any)._originalSpeed = enemy.speed;
                addMessage(state, `🌿 ${enemy.type.toUpperCase()} drops prone in the grass!`, 'info');
              }
            }
            // Sniper Tuman: mark flee state on hit (teleport handled in sniper AI loop)
            if (enemy.type === 'sniper' && !(enemy as any)._sniperInvisible) {
              (enemy as any)._sniperShouldFlee = true;
              (enemy as any)._sniperTeleportTimer = 0;
              for (let si = 0; si < 8; si++) {
                state.particles.push({
                  pos: { x: enemy.pos.x, y: enemy.pos.y },
                  vel: { x: (Math.random() - 0.5) * 2.2, y: (Math.random() - 0.5) * 2.2 },
                  life: 1.2,
                  maxLife: 1.2,
                  color: '#777',
                  size: 3 + Math.random() * 3,
                });
              }
            }
          }
          return false;
        }
      }
    } else {
      // Friendly fire — panicked enemy bullets can hit other enemies
      if (b.sourceId) {
      for (const enemy of state.enemies) {
          if (enemy.state === 'dead' || enemy.id === b.sourceId) continue;
          const fdx = b.pos.x - enemy.pos.x, fdy = b.pos.y - enemy.pos.y;
          if (fdx * fdx + fdy * fdy < 196) { // 14*14
            enemy.hp -= b.damage * 0.5; // 50% reduced friendly fire damage
            spawnParticles(state, b.pos.x, b.pos.y, '#ffaa00', 4);
            playHit();
            addMessage(state, `🔥 FRIENDLY FIRE — ${enemy.type.toUpperCase()} hit!`, 'info');
            if (enemy.hp <= 0) {
              enemy.state = 'dead';
              setSpeech(enemy, pickLine(DEATH_LINES, enemy.type), 3.0);
              sendReinforcementToPlatform(state, enemy);
              enemy.loot = generateEnemyLoot(enemy);
              state.killCount++;
              if (enemy.type === 'dog') state.dogsKilled++;
              addKillFeed(state, enemy.type, 'Friendly Fire');
              addMessage(state, `💀 ${enemy.type.toUpperCase()} killed by friendly fire!`, 'kill');
              spawnParticles(state, enemy.pos.x, enemy.pos.y, '#884444', 8);
              notifyAllyDeath(state, enemy, 'Friendly Fire');
            } else {
              // Hit enemy panics too!
              // Much lower panic chance from friendly fire (was 0.3, now 0.06) to prevent chain reactions
              if (!(enemy as any)._panicTimer && Math.random() < 0.06) {
                (enemy as any)._panicTimer = 1.5 + Math.random() * 1.5;
                addMessage(state, `😱 ${enemy.type.toUpperCase()} PANICS from friendly fire!`, 'warning');
              }
            }
            return false;
          }
        }
      }

      // Friendly bullets don't hit player
      if (b.sourceType === 'friendly') return true;

      if (distSq(b.pos, state.player.pos) < 144) { // 12*12
        // Cover reduces hit chance based on cover quality
        if (state.player.inCover) {
          const missChance = state.player.peeking ? state.player.coverQuality * 0.5 : state.player.coverQuality;
          if (Math.random() < missChance) {
            // Bullet deflected by cover
            spawnParticles(state, b.pos.x, b.pos.y, '#aaa', 3);
            addMessage(state, '🛡️ Deflected!', 'info');
            return false;
          }
        }
        const armorReduction = Math.min(0.8, state.player.armor / 100);
        const dmg = b.damage * Math.max(0.05, 1 - armorReduction);
        state.player.hp -= dmg;
        state.noHitsTaken = false;
        spawnParticles(state, state.player.pos.x, state.player.pos.y, '#ff2222', 4);
        playHit();
        if (Math.random() > 0.7) {
          state.player.bleedRate += 0.5;
          addMessage(state, '🩸 BLEEDING!', 'damage');
        }
        addMessage(state, `Hit! -${Math.floor(dmg)}HP`, 'damage');
        if (state.player.hp <= 0) {
          const srcLabel = getDamageSourceLabel(state, b.sourceType, b.sourceId);
          state.deathCause = `🔫 Shot by ${srcLabel}`;
        }
        return false;
      }
    }

    return true;
  });

  // Update particles
  state.particles = state.particles.filter(p => {
    p.pos.x += p.vel.x;
    p.pos.y += p.vel.y;
    p.vel.x *= 0.96;
    p.vel.y *= 0.96;
    p.life--;
    return p.life > 0;
  });

  // Camera follow
  const camLerp = 0.1;
  state.camera.x += (state.player.pos.x - state.camera.x) * camLerp;
  state.camera.y += (state.player.pos.y - state.camera.y) * camLerp;

  // Track damage taken this frame
  const dmgThisFrame = _hpAtFrameStart - state.player.hp;
  if (dmgThisFrame > 0) {
    (state as any)._damageTaken = ((state as any)._damageTaken || 0) + dmgThisFrame;
  }

  return state;
}
