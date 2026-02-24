import { GameState, InputState, Vec2, GameMessage, Particle, Enemy, SoundEvent, MovementMode, TacticalRole, PlacedTNT } from './types';
import { generateMap, createInitialPlayer } from './map';
import { LORE_DOCUMENTS } from './lore';
import { LOOT_POOLS, createFlashbang, createTNT } from './items';
import { playGunshot, playExplosion, playHit, playPickup, playFootstep, playRadio } from './audio';

function dist(a: Vec2, b: Vec2) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
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

function spawnParticles(state: GameState, x: number, y: number, color: string, count: number) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 2;
    state.particles.push({
      pos: { x, y },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      life: 30 + Math.random() * 30,
      maxLife: 60,
      color,
      size: 1 + Math.random() * 2,
    });
  }
}

// Assign tactical roles to enemies in combat — distribute flankers and suppressors
function assignTacticalRole(state: GameState, enemy: Enemy) {
  if (enemy.type === 'turret' || enemy.type === 'boss' || enemy.type === 'scav') {
    enemy.tacticalRole = enemy.type === 'scav' ? 'assault' : 'none';
    return;
  }
  // Count current roles in radio group
  let flankers = 0, suppressors = 0;
  for (const ally of state.enemies) {
    if (ally === enemy || ally.state === 'dead') continue;
    if (ally.radioGroup !== enemy.radioGroup && dist(ally.pos, enemy.pos) > 400) continue;
    if (ally.tacticalRole === 'flanker') flankers++;
    if (ally.tacticalRole === 'suppressor') suppressors++;
  }
  // Heavies prefer suppression, soldiers prefer flanking
  if (enemy.type === 'heavy') {
    enemy.tacticalRole = suppressors < 2 ? 'suppressor' : 'assault';
  } else if (enemy.type === 'soldier') {
    if (flankers < 2) enemy.tacticalRole = 'flanker';
    else if (suppressors < 1) enemy.tacticalRole = 'suppressor';
    else enemy.tacticalRole = 'assault';
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
    scav: Math.PI * 0.35 - DEG15,
    soldier: Math.PI * 0.45 - DEG15,
    heavy: Math.PI * 0.6 - DEG15,
    turret: Math.PI * 0.5 - DEG15,
    boss: Math.PI * 0.7,
    sniper: Math.PI * 0.15, // extremely narrow, laser-focused
  };
  let arc = arcMap[enemy.type] || Math.PI * 0.45 - DEG15;
  if (isBodyguard) arc = Math.PI * 0.75; // much wider arc for elite bodyguards
  
  return angleDiff <= arc;
}


function sendReinforcementToPlatform(state: GameState, deadGuard: Enemy) {
  if (!deadGuard.elevated) return;
  const platformPos = { ...deadGuard.pos };
  let bestDist = 500; // max range to rush
  let bestAlly: Enemy | null = null;
  for (const ally of state.enemies) {
    if (ally === deadGuard || ally.state === 'dead' || ally.elevated) continue;
    if (ally.type === 'turret' || ally.type === 'boss') continue;
    const d = dist(ally.pos, platformPos);
    if (d < bestDist) {
      bestDist = d;
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
  if (enemy.type === 'boss') {
    return [
      ...existingLoot,
      ...LOOT_POOLS.military(),
      ...LOOT_POOLS.body(),
      { id: 'boss_usb', name: 'Osipovitj\'s USB Drive', category: 'valuable' as const, icon: '💾', weight: 0.1, value: 5000, description: 'CRITICAL INTEL — Extract with this to complete the mission!' },
      { id: 'boss_dogtag', name: 'Osipovitj\'s Dogtag', category: 'valuable' as const, icon: '💀', weight: 0.1, value: 1500, description: 'Commandant Osipovitj\'s ID tag — extremely rare' },
    ];
  }
  const poolType = enemy.type === 'heavy' ? 'military' : enemy.type === 'soldier' ? 'military' : 'common';
  return [...existingLoot, ...LOOT_POOLS[poolType]()];
}

export function createGameState(): GameState {
  const map = generateMap();
  const player = createInitialPlayer();
  return {
    player,
    enemies: map.enemies,
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
    messages: [{ text: 'OPERATION STARTED — Eliminate Osipovitj, recover USB & hack nuclear codes!', time: 0, type: 'info' }],
    codesFound: [],
    documentsRead: [],
    hasExtractionCode: false,
    hasNuclearCodes: false,
    speedBoostTimer: 0,
    soundEvents: [],
    flashbangTimer: 0,
    backpackCapacity: 0,
    mineFieldZone: { x: 400, y: 1400, w: 350, h: 300 },
    reinforcementTimer: 45 + Math.random() * 15, // first wave after ~45-60s
    reinforcementsSpawned: 0,
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
  };
}

function hasLineOfSight(state: GameState, a: Vec2, b: Vec2, elevated: boolean = false): boolean {
  if (elevated) {
    // Elevated enemies can see over walls BUT only within their limited range
    // They still need actual distance check (handled elsewhere), just skip wall collision
    return true;
  }
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(d / 6); // step size ~6px to catch thin walls/fences (8px)
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (collidesWithWalls(state, a.x + dx * t, a.y + dy * t, 2)) return false;
  }
  return true;
}

function collidesWithWalls(state: GameState, x: number, y: number, r: number): boolean {
  for (const w of state.walls) {
    if (rectContains(w.x, w.y, w.w, w.h, x, y, r)) return true;
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

export function updateGame(state: GameState, input: InputState, dt: number, canvasW: number, canvasH: number): GameState {
  if (state.gameOver || state.extracted) return state;

  state.time += dt;

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

  const moveLen = Math.sqrt(moveX ** 2 + moveY ** 2);
  
  // Movement speed based on mode
  const speedMultipliers: Record<MovementMode, number> = { sneak: 0.4, walk: 1.0, sprint: 1.7 };
  const baseSpeed = state.player.speed * speedMultipliers[input.movementMode];
  const playerSpeed = state.speedBoostTimer > 0 ? baseSpeed * 1.5 : baseSpeed;
  
  if (moveLen > 0.1) {
    const speed = playerSpeed * dt * 60;
    const dir = normalize({ x: moveX, y: moveY });
    let newPos = tryMove(state, state.player.pos, dir.x * speed, dir.y * speed, 12);
    // Block player from walking onto platform props (enemies can use them)
    for (const p of state.props) {
      if (p.blocksPlayer && rectContains(p.pos.x - p.w / 2, p.pos.y - p.h / 2, p.w, p.h, newPos.x, newPos.y, 12)) {
        newPos = state.player.pos;
        break;
      }
    }
    // MINEFIELD CHECK — instant death
    const mz = state.mineFieldZone;
    if (mz && rectContains(mz.x, mz.y, mz.w, mz.h, newPos.x, newPos.y, 6)) {
      state.player.hp = 0;
      state.gameOver = true;
      state.deathCause = '💥 Stepped on a landmine';
      addMessage(state, '💥 MINE! You stepped on a landmine!', 'damage');
      playExplosion();
      spawnParticles(state, newPos.x, newPos.y, '#ff4400', 25);
      spawnParticles(state, newPos.x, newPos.y, '#ffcc44', 20);
      state.soundEvents.push({ pos: { ...newPos }, radius: 500, time: state.time });
    }
    // Track distance travelled
    state.distanceTravelled += dist(state.player.pos, newPos);
    state.player.pos = newPos;
    
    // Moving breaks cover
    if (state.player.inCover) {
      state.player.inCover = false;
      state.player.coverObject = null;
      state.player.peeking = false;
    }
    
    // Footstep sounds + sound propagation
  // Cover proximity detection — show hint when near cover objects
  let nearCover = false;
  let nearestCoverPos: { x: number; y: number } | null = null;
  let nearestCoverDist = Infinity;
  if (!state.player.inCover) {
    for (const prop of state.props) {
      const d = dist(state.player.pos, prop.pos);
      if (d < 40 && d < nearestCoverDist) {
        nearCover = true;
        nearestCoverPos = prop.pos;
        nearestCoverDist = d;
      }
    }
    if (!nearCover) {
      for (const wall of state.walls) {
        const wx = wall.x + wall.w / 2;
        const wy = wall.y + wall.h / 2;
        const d = dist(state.player.pos, { x: wx, y: wy });
        if (d < 60 && d < nearestCoverDist) {
          nearCover = true;
          nearestCoverPos = { x: wx, y: wy };
          nearestCoverDist = d;
        }
      }
    }
  }
  state.coverNearby = nearCover;
  (state as any)._nearestCoverPos = nearestCoverPos;
  
  playFootstep(input.movementMode);
    const footstepRadius: Record<MovementMode, number> = { sneak: 30, walk: 80, sprint: 160 };
    if (Math.random() < (input.movementMode === 'sprint' ? 0.15 : input.movementMode === 'walk' ? 0.05 : 0.01)) {
      state.soundEvents.push({ pos: { ...state.player.pos }, radius: footstepRadius[input.movementMode], time: state.time });
    }
  }

  // Cover system
  if (input.takeCover) {
    input.takeCover = false;
    if (state.player.inCover) {
      // Toggle off
      state.player.inCover = false;
      state.player.coverObject = null;
      state.player.peeking = false;
      addMessage(state, '🧍 Leaving cover', 'info');
    } else {
      // Find nearest cover object (props or walls within 40px)
      let bestDist = 40;
      let bestPos: Vec2 | null = null;
      for (const prop of state.props) {
        const d = dist(state.player.pos, prop.pos);
        if (d < bestDist) {
          bestDist = d;
          bestPos = { ...prop.pos };
        }
      }
      // Also check walls as cover
      for (const wall of state.walls) {
        const wx = wall.x + wall.w / 2;
        const wy = wall.y + wall.h / 2;
        const d = dist(state.player.pos, { x: wx, y: wy });
        if (d < bestDist + 20) {
          bestDist = d;
          bestPos = { x: wx, y: wy };
        }
      }
      if (bestPos) {
        state.player.inCover = true;
        state.player.coverObject = bestPos;
        state.player.peeking = false;
        addMessage(state, '🛡️ In cover! Shoot to peek', 'info');
      } else {
        addMessage(state, '⚠ No cover nearby!', 'warning');
      }
    }
  }

  // Peek fire — shooting while in cover
  if (state.player.inCover) {
    state.player.peeking = input.shooting;
  }

  // Speed boost countdown
  if (state.speedBoostTimer > 0) {
    state.speedBoostTimer = Math.max(0, state.speedBoostTimer - dt);
  }

  // Flashbang blindness countdown
  if (state.flashbangTimer > 0) {
    state.flashbangTimer = Math.max(0, state.flashbangTimer - dt);
  }

  // Weapon slot switching (1 = sidearm, 2 = primary)
  if (input.switchWeapon) {
    const slot = input.switchWeapon;
    const wpnForSlot = slot === 1 ? state.player.sidearm : state.player.primaryWeapon;
    if (wpnForSlot) {
      state.player.activeSlot = slot;
      state.player.equippedWeapon = wpnForSlot;
      if (wpnForSlot.ammoType) state.player.ammoType = wpnForSlot.ammoType;
      addMessage(state, `🔫 ${wpnForSlot.name} [${slot}]`, 'info');
    } else if (slot === 2) {
      addMessage(state, '⚠ No primary weapon!', 'warning');
    }
    input.switchWeapon = undefined;
  }

  // Player aim angle
  if (input.aimX !== 0 || input.aimY !== 0) {
    state.player.angle = Math.atan2(input.aimY, input.aimX);
  } else if (moveLen > 0.1) {
    state.player.angle = Math.atan2(moveY, moveX);
  }

  // Player shooting — weapon-specific stats + fire modes
  const wpn = state.player.equippedWeapon;
  const fireRate = wpn?.weaponFireRate || state.player.fireRate;
  const isAutoFire = wpn?.fireMode === 'auto';
  const canFire = isAutoFire ? input.shooting : input.shootPressed;
  if (canFire && state.time - state.player.lastShot > fireRate / 1000) {
    const spread = (Math.random() - 0.5) * 0.08;
    const angle = state.player.angle + spread;
    const bulletSpeed = wpn?.bulletSpeed || 8;
    const bulletLife = wpn?.weaponRange || 60;
    state.bullets.push({
      pos: { x: state.player.pos.x + Math.cos(angle) * 16, y: state.player.pos.y + Math.sin(angle) * 16 },
      vel: { x: Math.cos(angle) * bulletSpeed, y: Math.sin(angle) * bulletSpeed },
      damage: wpn?.damage || 10,
      damageType: 'bullet',
      fromPlayer: true,
      life: bulletLife,
      weaponName: wpn?.name,
    });
    state.player.lastShot = state.time;
    spawnParticles(state, state.player.pos.x + Math.cos(angle) * 20, state.player.pos.y + Math.sin(angle) * 20, '#ffaa44', 3);
    
    // Sound event — gunshots alert enemies
    state.soundEvents.push({ pos: { ...state.player.pos }, radius: 300, time: state.time });
    playGunshot('pistol');
  }

  // Throw grenade (G key) — supports both grenades and flashbangs, 1s cooldown
  if (input.throwGrenade) {
    // Check 1 second cooldown
    if (state.time - state.player.lastGrenadeTime < 1.0) {
      addMessage(state, '⚠ Wait before throwing again!', 'warning');
      input.throwGrenade = false;
    } else {
      // Try flashbang first if no grenades
      let grenadeIdx = state.player.inventory.findIndex(i => i.category === 'grenade');
      let isFlashbang = false;
      if (grenadeIdx < 0) {
        grenadeIdx = state.player.inventory.findIndex(i => i.category === 'flashbang');
        isFlashbang = true;
      }
      if (grenadeIdx >= 0) {
        const grenadeItem = state.player.inventory[grenadeIdx];
        isFlashbang = grenadeItem.category === 'flashbang';
        const angle = state.player.angle;
        const throwSpeed = 4;
        state.grenades.push({
          pos: { x: state.player.pos.x + Math.cos(angle) * 20, y: state.player.pos.y + Math.sin(angle) * 20 },
          vel: { x: Math.cos(angle) * throwSpeed, y: Math.sin(angle) * throwSpeed },
          timer: isFlashbang ? 1.0 : 1.5,
          damage: isFlashbang ? -1 : (grenadeItem.damage || 200), // -1 = flashbang marker
          radius: isFlashbang ? 200 : 150,
          fromPlayer: true,
        });
        state.player.inventory.splice(grenadeIdx, 1);
        state.player.lastGrenadeTime = state.time;
        addMessage(state, isFlashbang ? '💫 FLASHBANG THROWN!' : '💣 GRENADE THROWN!', 'warning');
        spawnParticles(state, state.player.pos.x, state.player.pos.y, isFlashbang ? '#ffffaa' : '#886644', 3);
      } else {
        addMessage(state, '⚠ No grenades!', 'warning');
      }
      input.throwGrenade = false;
    }
  }

  // Interact
  if (input.interact) {
    // Gate keycard check — remove gate wall if player has keycard and is near gate
    const gateWallIdx = state.walls.findIndex(w => w.color === '#aa4444');
    if (gateWallIdx >= 0) {
      const gw = state.walls[gateWallIdx];
      const gateCenterX = gw.x + gw.w / 2;
      const gateCenterY = gw.y + gw.h / 2;
      if (dist(state.player.pos, { x: gateCenterX, y: gateCenterY }) < 80) {
        const keycardIdx = state.player.inventory.findIndex(i => i.id === 'gate_keycard');
        if (keycardIdx >= 0) {
          state.walls.splice(gateWallIdx, 1);
          addMessage(state, '💳 GATE OPENED with access card!', 'intel');
          spawnParticles(state, gateCenterX, gateCenterY, '#44ff44', 10);
        } else {
          addMessage(state, '🔒 Gate is locked — you need an access card!', 'warning');
        }
      }
    }

  }

  // TNT wall breach — place charge with 5s fuse
  if (input.useTNT) {
    input.useTNT = false;
    if (state.player.tntCount > 0) {
      // Find nearest wall
      let bestIdx = -1;
      let bestDist = Number.POSITIVE_INFINITY;
      let impact = { x: state.player.pos.x, y: state.player.pos.y };
      for (let wi = 0; wi < state.walls.length; wi++) {
        const w = state.walls[wi];
        if (w.color === '#aa4444') continue;
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
        state.player.tntCount--;
        state.placedTNTs.push({ pos: { ...impact }, timer: 5.0, maxTimer: 5.0 });
        addMessage(state, '🧨 TNT PLACED! 5 seconds to detonation — GET CLEAR!', 'warning');
        state.soundEvents.push({ pos: { ...impact }, radius: 150, time: state.time });
      } else {
        addMessage(state, '⚠ No wall nearby to breach!', 'warning');
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
        const dToTNT = dist(tnt.pos, enemy.pos);
        if (dToTNT < 200) {
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
      if (w.color === '#aa4444') continue;
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
    }

    if (bestIdx >= 0) state.wallsBreached++;
    addMessage(state, '🧨 TNT DETONATED! Wall section breached!', 'intel');
    playExplosion();
    spawnParticles(state, tnt.pos.x, tnt.pos.y, '#ff8833', 24);
    spawnParticles(state, tnt.pos.x, tnt.pos.y, '#ffcc44', 18);
    state.soundEvents.push({ pos: { ...tnt.pos }, radius: 500, time: state.time });

    // Damage enemies
    for (const enemy of state.enemies) {
      if (enemy.state === 'dead') continue;
      const d = dist(tnt.pos, enemy.pos);
      if (d < TNT_RADIUS) {
        const directLos = hasLineOfSight(state, tnt.pos, enemy.pos, false); // ground-level LOS
        // Damage multiplier: no LOS (behind wall) = 10%, elevated = 50%, direct = 100%
        let dmgMultiplier = 1.0;
        if (!directLos && !enemy.elevated) {
          dmgMultiplier = 0.10; // behind wall
        } else if (enemy.elevated) {
          dmgMultiplier = 0.50; // on platform
        }
        if (dmgMultiplier <= 0) continue;

        if (enemy.type === 'boss') {
          const dmg = enemy.maxHp * 0.33 * dmgMultiplier;
          enemy.hp -= dmg;
          spawnParticles(state, enemy.pos.x, enemy.pos.y, '#ff4444', 8);
          addMessage(state, `💥 Boss takes ${Math.floor(dmg)} damage!`, 'damage');
          if (enemy.hp > 0) { enemy.state = 'chase'; continue; }
        }
        if ((enemy as any)._isBodyguard) {
          const dmg = enemy.maxHp * 0.5 * dmgMultiplier;
          enemy.hp -= dmg;
          spawnParticles(state, enemy.pos.x, enemy.pos.y, '#ff4444', 6);
          addMessage(state, `💥 Bodyguard takes ${Math.floor(dmg)} damage!`, 'damage');
          if (enemy.hp > 0) { enemy.state = 'chase'; continue; }
        }
        const fullDmg = TNT_DAMAGE * dmgMultiplier;
        if (fullDmg < enemy.hp) {
          enemy.hp -= fullDmg;
          spawnParticles(state, enemy.pos.x, enemy.pos.y, '#ff4444', 6);
          addMessage(state, `💥 ${enemy.type.toUpperCase()} takes ${Math.floor(fullDmg)} damage!`, 'damage');
          enemy.state = 'chase';
          continue;
        }
        enemy.hp = 0;
        enemy.state = 'dead';
        
        sendReinforcementToPlatform(state, enemy);
        enemy.loot = generateEnemyLoot(enemy);
        state.killCount++;
        state.tntKills++;
        addMessage(state, enemy.type === 'boss' ? '💀 COMMANDANT OSIPOVITJ IS DEAD!' : `Eliminated: ${enemy.type.toUpperCase()} (TNT)`, 'kill');
        spawnParticles(state, enemy.pos.x, enemy.pos.y, '#884444', 10);
      }
    }

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
        state.gameOver = true;
        state.deathCause = '🧨 Killed by own TNT explosion';
        addMessage(state, '☠ DEAD', 'damage');
      }
    }

    return false; // remove detonated TNT
  });

  // Interact (E key) — looting, keycard, terminals
  if (input.interact) {
    // Loot containers — require line of sight (no looting through walls)
    for (const lc of state.lootContainers) {
      if (!lc.looted && dist(state.player.pos, lc.pos) < 70 && hasLineOfSight(state, state.player.pos, lc.pos)) {
        lc.looted = true;
        state.cachesLooted++;
        for (const item of lc.items) {
          state.player.inventory.push(item);
          if (item.id === 'extraction_code') {
            state.hasExtractionCode = true;
            addMessage(state, '🔑 EXTRACTION CODE FOUND! Head to the extraction point!', 'intel');
          }
          if (item.category === 'ammo' && item.ammoType === state.player.ammoType && item.ammoCount) {
            state.player.currentAmmo += item.ammoCount;
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
          // Auto-pickup TNT
          if (item.name === 'TNT Charge') {
            state.player.tntCount++;
            addMessage(state, '🧨 TNT acquired! Press T near any wall to breach!', 'intel');
          }
          // Auto-equip weapon to primary slot (sidearm stays as pistol)
          if (item.category === 'weapon' && item.damage) {
            if (!state.player.primaryWeapon || item.damage > (state.player.primaryWeapon.damage || 0)) {
              state.player.primaryWeapon = item;
              // Auto-switch to primary
              state.player.activeSlot = 2;
              state.player.equippedWeapon = item;
              if (item.ammoType) state.player.ammoType = item.ammoType;
              addMessage(state, `🔫 ${item.name} equipped [2]!`, 'info');
            } else if (!state.player.sidearm || item.damage > (state.player.sidearm.damage || 0)) {
              state.player.sidearm = item;
              addMessage(state, `🔫 ${item.name} as sidearm [1]!`, 'info');
            }
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
          state.player.inventory.push(item);
          if (item.id === 'extraction_code') {
            state.hasExtractionCode = true;
            addMessage(state, '🔑 EXTRACTION CODE FOUND! Head to the extraction point!', 'intel');
          }
          if (item.category === 'ammo' && item.ammoType === state.player.ammoType && item.ammoCount) {
            state.player.currentAmmo += item.ammoCount;
          }
          if (item.category === 'backpack' && state.backpackCapacity === 0) {
            state.backpackCapacity = 10;
            addMessage(state, '🎒 Backpack equipped!', 'intel');
          }
          if (item.category === 'armor' && item.damage) {
            state.player.armor += item.damage;
            addMessage(state, `🛡️ +${item.damage} armor!`, 'info');
          }
          // Auto-pickup TNT from enemy bodies
          if (item.name === 'TNT Charge') {
            state.player.tntCount++;
            addMessage(state, '🧨 TNT acquired! Press T near any wall to breach!', 'intel');
          }
          if (item.category === 'weapon' && item.damage) {
            if (!state.player.primaryWeapon || item.damage > (state.player.primaryWeapon.damage || 0)) {
              state.player.primaryWeapon = item;
              state.player.activeSlot = 2;
              state.player.equippedWeapon = item;
              if (item.ammoType) state.player.ammoType = item.ammoType;
              addMessage(state, `🔫 ${item.name} equipped [2]!`, 'info');
            } else if (!state.player.sidearm || item.damage > (state.player.sidearm.damage || 0)) {
              state.player.sidearm = item;
              addMessage(state, `🔫 ${item.name} as sidearm [1]!`, 'info');
            }
          }
          if (item.id === 'boss_usb') {
            state.hasExtractionCode = true;
            addMessage(state, '💾 OSIPOVITJ\'S USB DRIVE! Get to the extraction point!', 'intel');
          }
        }
        spawnParticles(state, enemy.pos.x, enemy.pos.y, '#bbaa44', 6);
        if (enemy.loot.length > 0) {
          addMessage(state, `Loot: ${enemy.loot.map(i => i.name).join(', ')}`, 'loot');
        } else {
          addMessage(state, `Nothing of value...`, 'info');
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
          }
        } else {
          const label = panel.id === 'alarm_intel' ? 'intel' : panel.id === 'alarm_disable' ? 'alarm' : 'codebook';
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

  // Bleeding
  if (state.player.bleedRate > 0) {
    state.player.hp -= state.player.bleedRate * dt;
    if (Math.random() < 0.1) {
      spawnParticles(state, state.player.pos.x + (Math.random()-0.5)*10, state.player.pos.y + (Math.random()-0.5)*10, '#cc3333', 1);
    }
  }

  // Death check — clamp HP and trigger game over
  if (state.player.hp <= 0) {
    state.player.hp = 0;
    state.gameOver = true;
    if (!state.deathCause) state.deathCause = state.player.bleedRate > 0 ? '🩸 Bled out' : '☠ Killed in action';
    addMessage(state, '☠ DEAD', 'damage');
    return state;
  }

  // Extraction check — need BOTH USB and nuclear codebook for full success
  const hasUSB = state.player.inventory.some(i => i.id === 'boss_usb');
  const hasCodes = state.hasNuclearCodes;
  const fullSuccess = hasUSB && hasCodes;
  let inExtraction = false;
  for (const ep of state.extractionPoints) {
    // Track visiting exfil points (within 150px)
    if (dist(state.player.pos, ep.pos) < 150) {
      state.exfilsVisited.add(ep.name);
    }
    if (!ep.active) continue;
    const d = dist(state.player.pos, ep.pos);
    if (d < ep.radius) {
      if (!fullSuccess && Math.floor(state.time * 2) !== Math.floor((state.time - dt) * 2)) {
        const missing: string[] = [];
        if (!hasUSB) missing.push('USB drive');
        if (!hasCodes) missing.push('nuclear codes');
        addMessage(state, `⚠ Missing: ${missing.join(' & ')} — extract incomplete!`, 'warning');
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
          ? `💾☢ FULL SUCCESS — EXTRACTED: ${ep.name}!`
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

  // Clean up old sound events (older than 2 seconds)
  state.soundEvents = state.soundEvents.filter(se => state.time - se.time < 2);

  // === REINFORCEMENT SPAWNING from forest paths ===
  state.reinforcementTimer -= dt;
  if (state.reinforcementTimer <= 0 && state.reinforcementsSpawned < 12) {
    const spawnExfils = state.extractionPoints.filter(ep => !ep.active);
    const sp = spawnExfils.length > 0 ? spawnExfils[Math.floor(Math.random() * spawnExfils.length)] : state.extractionPoints[Math.floor(Math.random() * state.extractionPoints.length)];
    const cnt = 1 + Math.floor(Math.random() * 2);
    for (let ri = 0; ri < cnt; ri++) {
      const ox = (Math.random() - 0.5) * 60, oy = (Math.random() - 0.5) * 60;
      const rp = { x: sp.pos.x + ox, y: sp.pos.y + oy };
      const rt: Enemy['type'] = Math.random() < 0.3 ? 'heavy' : 'soldier';
      const re: Enemy = {
        id: `reinf_${state.reinforcementsSpawned}_${ri}`, pos: rp,
        hp: rt === 'heavy' ? 120 : 56, maxHp: rt === 'heavy' ? 120 : 56,
        speed: rt === 'heavy' ? 0.8 : 1.5, damage: rt === 'heavy' ? 25 : 15,
        alertRange: 200, shootRange: 170, fireRate: rt === 'heavy' ? 1500 : 800,
        state: 'chase', patrolTarget: { x: state.mapWidth / 2, y: state.mapHeight / 2 },
        investigateTarget: { ...state.player.pos }, lastShot: 0,
        angle: Math.atan2(state.player.pos.y - rp.y, state.player.pos.x - rp.x),
        type: rt, eyeBlink: 3, loot: [], looted: false,
        lastRadioCall: state.time, radioGroup: 99, radioAlert: 2,
        tacticalRole: rt === 'heavy' ? 'suppressor' : 'assault',
        flankTarget: undefined, suppressTimer: 0, callForHelpTimer: 0,
        lastTacticalSwitch: 0, stunTimer: 0, elevated: false,
      };
      state.enemies.push(re);
      state.reinforcementsSpawned++;
    }
    addMessage(state, `\u{1F6A8} Reinforcements from ${sp.name}!`, 'warning');
    state.reinforcementTimer = 30 + Math.random() * 20 - state.reinforcementsSpawned * 1.5;
  }

  // Update enemies
  for (const enemy of state.enemies) {
    if (enemy.state === 'dead') continue;

    // Stunned enemies can't act
    if (enemy.stunTimer > 0) {
      enemy.stunTimer -= dt;
      enemy.state = 'idle';
      continue;
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
        const phaseNames = ['', '⚠ COMMANDANT OSIPOVITJ IS ENRAGED!', '☠ OSIPOVITJ IS DESPERATE — WATCH OUT!'];
        if (phaseNames[enemy.bossPhase!]) {
          addMessage(state, phaseNames[enemy.bossPhase!], 'warning');
          
        }
        // Phase 1+: faster fire rate, more speed
        if (enemy.bossPhase! >= 1) {
          enemy.fireRate = 350;
          enemy.speed = 2.2;
          enemy.damage = 35;
        }
        if (enemy.bossPhase === 2) {
          enemy.fireRate = 250;
          enemy.speed = 2.8;
          enemy.damage = 40;
        }
      }

      // Boss charge attack
      if (enemy.bossChargeTimer !== undefined) {
        enemy.bossChargeTimer = Math.max(0, (enemy.bossChargeTimer || 0) - dt);
      }
      if (enemy.bossSpawnTimer !== undefined) {
        enemy.bossSpawnTimer = Math.max(0, (enemy.bossSpawnTimer || 0) - dt);
      }
    }

    // Alarm boost — increases alert range and makes enemies aggressive
    const alarmBoost = state.alarmActive ? 1.5 : 1.0;

    const distToPlayer = dist(enemy.pos, state.player.pos);
    const los = hasLineOfSight(state, enemy.pos, state.player.pos, enemy.elevated);

    // Enemy tries to activate alarm panel when in chase/attack and near one
    if ((enemy.state === 'chase' || enemy.state === 'attack') && enemy.type !== 'turret') {
      for (const panel of state.alarmPanels) {
        if (panel.activated || panel.hacked) continue;
        const dToPanel = dist(enemy.pos, panel.pos);
        if (dToPanel < 40) {
          panel.activated = true;
          state.alarmActive = true;
          addMessage(state, '🚨 ALARM TRIGGERED! All enemies alerted!', 'warning');
          // Alarm is intentionally silent
          // Alert ALL enemies on the map
          for (const ally of state.enemies) {
            if (ally.state === 'dead') continue;
            if (ally.state !== 'chase' && ally.state !== 'attack') {
              ally.state = 'investigate';
              ally.investigateTarget = { ...state.player.pos };
              ally.radioAlert = 2;
            }
          }
          state.soundEvents.push({ pos: { ...panel.pos }, radius: 600, time: state.time });
        }
      }
    }

    // Vision cone varies by enemy type/skill
    const DEG15 = Math.PI * (15 / 180);
    const isBodyguard = !!(enemy as any)._isBodyguard;
    const visionConfig = isBodyguard
      ? { frontArc: Math.PI * 0.75, rearRange: 0.4 }
      : {
          scav:    { frontArc: Math.PI * 0.35 - DEG15, rearRange: 0.15 },
          soldier: { frontArc: Math.PI * 0.45 - DEG15, rearRange: 0.25 },
          heavy:   { frontArc: Math.PI * 0.6 - DEG15, rearRange: 0.4 },
          turret:  { frontArc: Math.PI * 0.5 - DEG15, rearRange: 0.0 },
          sniper:  { frontArc: Math.PI * 0.15, rearRange: 0.05 }, // extremely narrow, laser-focused
        }[enemy.type] || { frontArc: Math.PI * 0.45 - DEG15, rearRange: 0.25 };

    const toPlayerAngle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
    let angleDiff = Math.abs(toPlayerAngle - enemy.angle);
    if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
    const isBehind = angleDiff > visionConfig.frontArc;

    const effectiveRange = (isBehind ? enemy.alertRange * visionConfig.rearRange : enemy.alertRange) * alarmBoost;
    const canSeePlayer = distToPlayer < effectiveRange && los;

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
    if (canSeePlayer) {
      // Assign tactical roles to engaged enemies
      if (prevState !== 'chase' && prevState !== 'attack' && prevState !== 'flank' && prevState !== 'suppress') {
        // Fresh engagement — pick tactical role
        assignTacticalRole(state, enemy);
        // Silent alert — no voice shout

        // Elevated wall guards trigger base-wide alarm via radio
        if (enemy.elevated && !state.alarmActive) {
          state.alarmActive = true;
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

      // Apply tactical behavior based on role
      if (enemy.tacticalRole === 'flanker' && enemy.type !== 'turret' && enemy.type !== 'boss') {
        enemy.state = 'flank';
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
      } else if (distToPlayer < enemy.shootRange && !isBehind) {
        enemy.state = 'attack';
      } else {
        enemy.state = 'chase';
      }

      // Call for help — soldiers and heavies yell for reinforcements
      if (enemy.callForHelpTimer <= 0 && enemy.type !== 'turret' && enemy.type !== 'scav') {
        enemy.callForHelpTimer = 5 + Math.random() * 3;
        addMessage(state, `🗣️ ${enemy.type.toUpperCase()} calls for help!`, 'warning');
        // Alert all allies in group + nearby
        for (const ally of state.enemies) {
          if (ally === enemy || ally.state === 'dead') continue;
          if (ally.state === 'chase' || ally.state === 'attack' || ally.state === 'flank' || ally.state === 'suppress') continue;
          const sameGroup = ally.radioGroup === enemy.radioGroup;
          const closeEnough = dist(ally.pos, enemy.pos) < 500;
          if (sameGroup || closeEnough) {
            ally.state = 'chase';
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
        for (const ally of state.enemies) {
          if (ally === enemy || ally.state === 'dead') continue;
          const sameGroup = ally.radioGroup === enemy.radioGroup;
          const closeEnough = dist(ally.pos, enemy.pos) < radioRange;
          const alarmWide = state.alarmActive; // alarm = base-wide awareness
          if (sameGroup || closeEnough || alarmWide) {
            if (ally.state === 'idle' || ally.state === 'patrol' || ally.state === 'investigate') {
              ally.state = 'chase';
              ally.investigateTarget = { ...state.player.pos };
              assignTacticalRole(state, ally);
              ally.radioAlert = 1.5;
            } else if (ally.state === 'chase' || ally.state === 'flank') {
              // Update known player position for already-chasing allies
              ally.investigateTarget = { ...state.player.pos };
            }
          }
        }
      }
    } else if (heardSound && (enemy.state === 'idle' || enemy.state === 'patrol')) {
      // Heard a sound — go investigate
      enemy.state = 'investigate';
      enemy.investigateTarget = heardSound;
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
            const closeEnough = dist(ally.pos, enemy.pos) < 400;
            if ((sameGroup || closeEnough) && (ally.state === 'idle' || ally.state === 'patrol')) {
              ally.state = 'investigate';
              ally.investigateTarget = { ...state.player.pos };
              ally.radioAlert = 1.2;
            }
          }
        }
      }
      // NOTE: removed unconditional patrol fallback (was a bug overriding investigate)
    }

    // === ENEMY HEALING (officers, bodyguards, boss) ===
    // Officers heal with bandage when in cover (not attacking/chasing)
    if ((enemy as any)._isOfficer && !((enemy as any)._isBodyguard) && enemy.hp < enemy.maxHp * 0.5 && 
        (enemy.state === 'idle' || enemy.state === 'patrol' || enemy.state === 'alert') &&
        !(enemy as any)._healingTimer) {
      (enemy as any)._healingTimer = 2.0;
      addMessage(state, '🩹 Officer is bandaging wounds!', 'warning');
    }
    // Bodyguards heal with bandage when in cover
    if ((enemy as any)._isBodyguard && enemy.hp < enemy.maxHp * 0.5 && 
        (enemy.state === 'idle' || enemy.state === 'patrol' || enemy.state === 'alert') &&
        !(enemy as any)._healingTimer) {
      (enemy as any)._healingTimer = 2.0;
      addMessage(state, '🩹 Bodyguard is bandaging wounds!', 'warning');
    }
    // Boss heals with injector
    if (enemy.type === 'boss' && enemy.hp < enemy.maxHp * 0.4 && !(enemy as any)._bossHealUsed &&
        (enemy.state === 'idle' || enemy.state === 'patrol' || enemy.state === 'alert' || enemy.state === 'attack') &&
        !(enemy as any)._healingTimer) {
      (enemy as any)._healingTimer = 2.0;
      (enemy as any)._bossHealUsed = true;
      addMessage(state, '💉 OSIPOVITJ IS INJECTING HIMSELF!', 'warning');
    }
    // Process healing timer
    if ((enemy as any)._healingTimer > 0) {
      (enemy as any)._healingTimer -= dt;
      // Animation: spawn green particles while healing
      if (Math.random() < 0.3) {
        spawnParticles(state, enemy.pos.x, enemy.pos.y, '#44ff66', 1);
      }
      if ((enemy as any)._healingTimer <= 0) {
        delete (enemy as any)._healingTimer;
        if (enemy.type === 'boss') {
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + 35);
          addMessage(state, '💉 Osipovitj healed +35HP!', 'damage');
          spawnParticles(state, enemy.pos.x, enemy.pos.y, '#44ff66', 8);
        } else {
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + 20);
          spawnParticles(state, enemy.pos.x, enemy.pos.y, '#44ff66', 5);
        }
      }
    }

    // Heavy throws flashbangs
    if (enemy.type === 'heavy' && enemy.state === 'attack' && !(enemy as any)._heavyFlashUsed &&
        distToPlayer < enemy.shootRange && distToPlayer > 60 && Math.random() < 0.002) {
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

    // Decay timers
    if (enemy.callForHelpTimer > 0) enemy.callForHelpTimer -= dt;
    if (enemy.suppressTimer > 0) enemy.suppressTimer -= dt;

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
          const spread = (Math.random() - 0.5) * 0.15;
          const angle = enemy.angle + spread;
          state.bullets.push({
            pos: { x: enemy.pos.x + Math.cos(angle) * 14, y: enemy.pos.y + Math.sin(angle) * 14 },
            vel: { x: Math.cos(angle) * 6, y: Math.sin(angle) * 6 },
            damage: enemy.damage, damageType: 'bullet', fromPlayer: false, life: 50, elevated: enemy.elevated,
            sourceId: enemy.id, sourceType: enemy.type,
          });
          enemy.lastShot = state.time;
          spawnParticles(state, enemy.pos.x + Math.cos(angle) * 16, enemy.pos.y + Math.sin(angle) * 16, '#ff6644', 2);
          state.soundEvents.push({ pos: { ...enemy.pos }, radius: 200, time: state.time });
          playGunshot('rifle');
        }
      }
      continue;
    }

    // Sniper Tuman: stalks the player using any cover, teleports between positions
    if (enemy.type === 'sniper') {
      if (!(enemy as any)._sniperTeleportTimer) (enemy as any)._sniperTeleportTimer = 4 + Math.random() * 4;
      (enemy as any)._sniperTeleportTimer -= dt;

      // Helper: find cover props (trees, bushes, barriers, wrecks, crates, barrels)
      const isCoverProp = (p: { type: string }) =>
        p.type === 'tree' || p.type === 'pine_tree' || p.type === 'bush' ||
        p.type === 'concrete_barrier' || p.type === 'vehicle_wreck' ||
        p.type === 'wood_crate' || p.type === 'barrel_stack' || p.type === 'sandbags';

      const sniperDistToPlayer = dist(enemy.pos, state.player.pos);
      const sniperHasLos = hasLineOfSight(state, enemy.pos, state.player.pos, false);

      // --- If player not in range/LOS, teleport to a cover position closer to player ---
      if (!sniperHasLos || sniperDistToPlayer > enemy.shootRange) {
        // Scan while waiting
        if (!(enemy as any)._sniperScanDir) (enemy as any)._sniperScanDir = 1;
        if (!(enemy as any)._sniperScanTimer) (enemy as any)._sniperScanTimer = 2 + Math.random() * 3;
        (enemy as any)._sniperScanTimer -= dt;
        if ((enemy as any)._sniperScanTimer <= 0) {
          (enemy as any)._sniperScanDir *= -1;
          (enemy as any)._sniperScanTimer = 1.5 + Math.random() * 2.5;
        }
        // Stay still — just look around
        enemy.angle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x) + (enemy as any)._sniperScanDir * 0.3;
        enemy.state = 'chase';

        // Periodically teleport closer when out of range
        if ((enemy as any)._sniperTeleportTimer <= 0 && !(enemy as any)._sniperInvisible) {
          const repositionCovers = state.props.filter(p =>
            isCoverProp(p) &&
            dist(p.pos, state.player.pos) < enemy.shootRange * 0.9 &&
            dist(p.pos, state.player.pos) > 150 &&
            dist(p.pos, enemy.pos) > 80
          );
          if (repositionCovers.length > 0) {
            const target = repositionCovers[Math.floor(Math.random() * Math.min(4, repositionCovers.length))];
            (enemy as any)._sniperTargetTree = { x: target.pos.x, y: target.pos.y };
            (enemy as any)._sniperInvisible = 2.0;
            for (let si = 0; si < 12; si++) {
              state.particles.push({ pos: { x: enemy.pos.x, y: enemy.pos.y }, vel: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 }, life: 1.5, maxLife: 1.5, color: '#888', size: 4 + Math.random() * 3 });
            }
            addMessage(state, '💨 Sniper Tuman vanishes into the shadows...', 'warning');
            (enemy as any)._sniperTeleportTimer = 5 + Math.random() * 4;
            continue;
          }
          (enemy as any)._sniperTeleportTimer = 3 + Math.random() * 3;
        }
      }

      // --- Flee when shot or player too close ---
      const playerTooClose = sniperDistToPlayer < 200;
      const shouldFlee = (enemy as any)._sniperShouldFlee || (playerTooClose && !(enemy as any)._sniperFleeCooldown);

      if (shouldFlee && !(enemy as any)._sniperInvisible) {
        (enemy as any)._sniperShouldFlee = false;

        // Throw flashbang when cooldown is free
        if (!(enemy as any)._sniperFleeCooldown || (enemy as any)._sniperFleeCooldown <= 0) {
          const fbAngle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
          const throwSpeed = 3.5;
          state.grenades.push({
            pos: { x: enemy.pos.x + Math.cos(fbAngle) * 16, y: enemy.pos.y + Math.sin(fbAngle) * 16 },
            vel: { x: Math.cos(fbAngle) * throwSpeed, y: Math.sin(fbAngle) * throwSpeed },
            timer: 0.6,
            damage: -1,
            radius: 200,
            fromPlayer: false,
            sourceId: enemy.id, sourceType: 'sniper',
          });
          addMessage(state, '💫 Sniper Tuman throws a flashbang and flees!', 'warning');
          playExplosion();
          (enemy as any)._sniperFleeCooldown = 12;
        }

        // Teleport to cover far from player
        let fleeCovers = state.props.filter(p =>
          isCoverProp(p) &&
          dist(p.pos, state.player.pos) > 350 && dist(p.pos, enemy.pos) > 80
        );
        if (fleeCovers.length === 0) {
          fleeCovers = state.props.filter(p =>
            isCoverProp(p) && dist(p.pos, enemy.pos) > 60
          );
        }
        if (fleeCovers.length > 0) {
          fleeCovers.sort((a, b) => dist(b.pos, state.player.pos) - dist(a.pos, state.player.pos));
          const target = fleeCovers[Math.floor(Math.random() * Math.min(3, fleeCovers.length))];
          (enemy as any)._sniperTargetTree = { x: target.pos.x, y: target.pos.y };
        } else {
          const awayAngle = Math.atan2(enemy.pos.y - state.player.pos.y, enemy.pos.x - state.player.pos.x);
          const teleportDist = 300 + Math.random() * 200;
          (enemy as any)._sniperTargetTree = {
            x: Math.max(50, Math.min(state.mapWidth - 50, enemy.pos.x + Math.cos(awayAngle) * teleportDist)),
            y: Math.max(50, Math.min(state.mapHeight - 50, enemy.pos.y + Math.sin(awayAngle) * teleportDist)),
          };
        }
        // Smoke at departure
        (enemy as any)._sniperInvisible = 2.0;
        for (let si = 0; si < 15; si++) {
          state.particles.push({ pos: { x: enemy.pos.x, y: enemy.pos.y }, vel: { x: (Math.random() - 0.5) * 2.5, y: (Math.random() - 0.5) * 2.5 }, life: 2, maxLife: 2, color: '#777', size: 5 + Math.random() * 4 });
        }
        addMessage(state, '💨 Sniper Tuman vanishes!', 'warning');
        continue;
      }
      // Decrement flee cooldown
      if ((enemy as any)._sniperFleeCooldown > 0) (enemy as any)._sniperFleeCooldown -= dt;

      // While invisible, skip everything
      if ((enemy as any)._sniperInvisible > 0) {
        (enemy as any)._sniperInvisible -= dt;
        if ((enemy as any)._sniperInvisible <= 0) {
          const targetPos = (enemy as any)._sniperTargetTree;
          if (targetPos) {
            enemy.pos = { x: targetPos.x, y: targetPos.y };
            for (let si = 0; si < 12; si++) {
              const sa = Math.random() * Math.PI * 2;
              const sr = 5 + Math.random() * 20;
              state.particles.push({
                pos: { x: enemy.pos.x + Math.cos(sa) * sr, y: enemy.pos.y + Math.sin(sa) * sr },
                vel: { x: Math.cos(sa) * (0.3 + Math.random() * 0.5), y: Math.sin(sa) * (0.3 + Math.random() * 0.5) },
                life: 40 + Math.random() * 30,
                maxLife: 70,
                color: '#88888866',
                size: 4 + Math.random() * 6,
              });
            }
          }
          enemy.angle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
          addMessage(state, '🔭 Sniper Tuman repositioned!', 'warning');
        }
        continue;
      }

      // Proactive teleport toward player using cover
      if ((enemy as any)._sniperTeleportTimer <= 0) {
        const playerDist = dist(enemy.pos, state.player.pos);
        const covers = state.props.filter(p =>
          isCoverProp(p) &&
          dist(enemy.pos, p.pos) > 40 && dist(enemy.pos, p.pos) < 500 &&
          dist(p.pos, state.player.pos) < playerDist
        );
        if (covers.length > 0) {
          covers.sort((a, b) => dist(a.pos, state.player.pos) - dist(b.pos, state.player.pos));
          const target = covers[Math.min(Math.floor(Math.random() * 3), covers.length - 1)];
          (enemy as any)._sniperTargetTree = { x: target.pos.x, y: target.pos.y };
          (enemy as any)._sniperInvisible = 2.5;
          (enemy as any)._sniperTeleportTimer = 5 + Math.random() * 3;
          for (let si = 0; si < 12; si++) {
            const sa = Math.random() * Math.PI * 2;
            const sr = 5 + Math.random() * 20;
            state.particles.push({
              pos: { x: enemy.pos.x + Math.cos(sa) * sr, y: enemy.pos.y + Math.sin(sa) * sr },
              vel: { x: Math.cos(sa) * (0.2 + Math.random() * 0.4), y: Math.sin(sa) * (0.2 + Math.random() * 0.4) - 0.3 },
              life: 50 + Math.random() * 40,
              maxLife: 90,
              color: '#99999966',
              size: 5 + Math.random() * 7,
            });
          }
          continue;
        } else {
          (enemy as any)._sniperTeleportTimer = 3;
        }
      }

      // In range with LOS — attack
      const dtp = dist(enemy.pos, state.player.pos);
      const sniperLos = hasLineOfSight(state, enemy.pos, state.player.pos, false);
      if (dtp <= enemy.shootRange && sniperLos) {
        enemy.state = 'attack';
        enemy.angle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
      } else {
        // Out of range — stay still, wait for teleport timer to reposition
        enemy.state = 'idle';
        enemy.angle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
      }
      // Fall through to attack state
    }

    switch (enemy.state as string) {
      case 'idle': {
        // Bodyguards follow their boss instead of idling
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
        // Occasionally start patrolling
        if (Math.random() < 0.002) {
          enemy.state = 'patrol';
          enemy.patrolTarget = { x: enemy.pos.x + (Math.random() - 0.5) * 200, y: enemy.pos.y + (Math.random() - 0.5) * 200 };
        }
        break;
      }
      case 'patrol': {
        if (enemy.type === 'turret') break;
        if (enemy.type === 'sniper') { enemy.state = 'idle'; break; } // Snipers never patrol — stay still
        // Bodyguards follow their boss during patrol
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
          const newPos = tryMoveEnemy(state, enemy.pos, dir.x * speed * 0.4, dir.y * speed * 0.4, 10);
          // Wall-stuck detection: if barely moved, pick new direction
          if (dist(newPos, enemy.pos) < 0.1) {
            if (!(enemy as any)._stuckCounter) (enemy as any)._stuckCounter = 0;
            (enemy as any)._stuckCounter++;
            if ((enemy as any)._stuckCounter > 30) {
              // Try perpendicular directions
              const perpAngle = Math.atan2(dir.y, dir.x) + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
              enemy.patrolTarget = {
                x: enemy.pos.x + Math.cos(perpAngle) * 150,
                y: enemy.pos.y + Math.sin(perpAngle) * 150,
              };
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
            enemy.state = 'alert';
          } else {
            // Check if target is reachable (LOS to target)
            const canReach = hasLineOfSight(state, enemy.pos, enemy.investigateTarget, enemy.elevated);
            if (!canReach) {
              // Can't reach through wall — give up and patrol instead
              enemy.state = 'patrol';
              enemy.patrolTarget = { x: enemy.pos.x + (Math.random() - 0.5) * 200, y: enemy.pos.y + (Math.random() - 0.5) * 200 };
              break;
            }
            const dir = normalize({ x: enemy.investigateTarget.x - enemy.pos.x, y: enemy.investigateTarget.y - enemy.pos.y });
            const newPos = tryMoveEnemy(state, enemy.pos, dir.x * speed * 0.7, dir.y * speed * 0.7, 10);
            if (dist(newPos, enemy.pos) < 0.1) {
              if (!(enemy as any)._stuckCounter) (enemy as any)._stuckCounter = 0;
              (enemy as any)._stuckCounter++;
              if ((enemy as any)._stuckCounter > 10) {
                // Stuck at wall — give up investigation
                enemy.state = 'patrol';
                enemy.patrolTarget = { x: enemy.pos.x + (Math.random() - 0.5) * 200, y: enemy.pos.y + (Math.random() - 0.5) * 200 };
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
        // Looking around nervously — return to patrol after ~3 seconds
        enemy.angle += Math.sin(state.time * 3 + enemy.pos.x) * 0.03;
        if (!( enemy as any)._alertStart) (enemy as any)._alertStart = state.time;
        if (state.time - (enemy as any)._alertStart > 3 + Math.random() * 2) {
          (enemy as any)._alertStart = 0;
          enemy.state = 'patrol';
          enemy.patrolTarget = { x: enemy.pos.x + (Math.random() - 0.5) * 300, y: enemy.pos.y + (Math.random() - 0.5) * 300 };
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
        const dir = normalize({ x: state.player.pos.x - enemy.pos.x, y: state.player.pos.y - enemy.pos.y });
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
        // Move to flank position while staying aware of player
        enemy.angle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
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
          const spread = (Math.random() - 0.5) * 0.2;
          const angle = enemy.angle + spread;
          state.bullets.push({
            pos: { x: enemy.pos.x + Math.cos(angle) * 14, y: enemy.pos.y + Math.sin(angle) * 14 },
            vel: { x: Math.cos(angle) * 6, y: Math.sin(angle) * 6 },
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
        // Stay in place, rapid fire toward player to pin them down
        enemy.angle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
        // Rapid suppressive fire with wide spread — only if player is in arc
        const suppressRate = enemy.fireRate / 1000 * 0.5; // fire twice as fast
        if (state.time - enemy.lastShot > suppressRate && isInFiringArc(enemy, state.player.pos.x, state.player.pos.y) && los && distToPlayer <= enemy.shootRange * 1.3) {
          const spread = (Math.random() - 0.5) * 0.35; // wide spread — suppression, not precision
          const angle = enemy.angle + spread;
          const bSpeed = enemy.type === 'heavy' ? 7 : 6;
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
        const targetAngle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
        if (enemy.type === 'turret' || enemy.type === 'sniper') {
          if (isInFiringArc(enemy, state.player.pos.x, state.player.pos.y)) {
            // Slow aim for sniper
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
          // Normalize to -PI..PI
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
        if (state.time - enemy.lastShot > enemy.fireRate / 1000 && isInFiringArc(enemy, state.player.pos.x, state.player.pos.y) && los && distToPlayer <= enemy.shootRange) {
          const spread = enemy.type === 'sniper' ? (Math.random() - 0.5) * 0.03 : enemy.type === 'turret' ? (Math.random() - 0.5) * 0.1 : (Math.random() - 0.5) * 0.15;
          const angle = enemy.angle + spread;
          const bSpeed = enemy.type === 'sniper' ? 10 : enemy.type === 'turret' ? 8 : 6;
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
          // Enemy gunshot sound event (alerts other enemies too)
          state.soundEvents.push({ pos: { ...enemy.pos }, radius: 200, time: state.time });
          const gunType = enemy.type === 'boss' ? 'boss' : enemy.type === 'turret' ? 'turret' : enemy.type === 'heavy' ? 'heavy' : enemy.type === 'sniper' ? 'rifle' : 'rifle';
          playGunshot(gunType);
        }
        if (enemy.type !== 'turret' && enemy.type !== 'boss' && enemy.type !== 'sniper' && distToPlayer < enemy.shootRange * 0.5) {
          const dir = normalize({ x: enemy.pos.x - state.player.pos.x, y: enemy.pos.y - state.player.pos.y });
          enemy.pos = tryMoveEnemy(state, enemy.pos, dir.x * speed * 0.3, dir.y * speed * 0.3, 10);
        }
        // Boss: tactical — throw grenades/flashbangs, retreat, command minions
        if (enemy.type === 'boss') {
          // Alternate between frag grenades and flashbangs
          if ((enemy.bossChargeTimer || 0) <= 0 && distToPlayer < enemy.shootRange * 1.2 && distToPlayer > 80) {
            const throwFlashbang = Math.random() < 0.4; // 40% chance flashbang
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
              addMessage(state, '💫 OSIPOVITJ throws FLASHBANG!', 'warning');
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
              addMessage(state, '💣 OSIPOVITJ throws grenade!', 'warning');
              spawnParticles(state, enemy.pos.x, enemy.pos.y, '#ffaa00', 5);
            }
          }
          // Boss retreats if too close, then repositions
          if (distToPlayer < enemy.shootRange * 0.5) {
            const retreatDir = normalize({ x: enemy.pos.x - state.player.pos.x, y: enemy.pos.y - state.player.pos.y });
            enemy.pos = tryMoveEnemy(state, enemy.pos, retreatDir.x * speed * 1.5, retreatDir.y * speed * 1.5, 12);
          } else if (distToPlayer > enemy.shootRange * 0.8) {
            // Strafe sideways to make harder target
            const strafeAngle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x) + Math.PI * 0.5 * (Math.sin(state.time * 0.5) > 0 ? 1 : -1);
            enemy.pos = tryMoveEnemy(state, enemy.pos, Math.cos(strafeAngle) * speed * 0.8, Math.sin(strafeAngle) * speed * 0.8, 12);
          }
        }
        // Boss: spawn reinforcements in phase 1+
        if (enemy.type === 'boss' && (enemy.bossPhase || 0) >= 1 && (enemy.bossSpawnTimer || 0) <= 0) {
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
            tacticalRole: 'assault', suppressTimer: 0, callForHelpTimer: 0, lastTacticalSwitch: 0, stunTimer: 0, elevated: false,
          };
          state.enemies.push(minion);
          addMessage(state, '📻 Osipovitj calls reinforcements!', 'warning');
          spawnParticles(state, sx, sy, '#ff8844', 8);
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

    if (g.timer <= 0) {
      const isFlashbang = g.damage === -1;

      if (isFlashbang) {
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
          state.flashbangTimer = 3;
          addMessage(state, '💫 STUNNED! Cannot move!', 'damage');
        }
      } else {
        // REGULAR GRENADE — instant kill
        addMessage(state, '💥 EXPLOSION!', 'damage');
        spawnParticles(state, g.pos.x, g.pos.y, '#ff8833', 20);
        spawnParticles(state, g.pos.x, g.pos.y, '#ffcc44', 15);
        spawnParticles(state, g.pos.x, g.pos.y, '#444', 10);
        playExplosion();
        state.soundEvents.push({ pos: { ...g.pos }, radius: 500, time: state.time });

        for (const enemy of state.enemies) {
          if (enemy.state === 'dead') continue;
          const d = dist(g.pos, enemy.pos);
          if (d < g.radius && hasLineOfSight(state, g.pos, enemy.pos, enemy.elevated)) {
            if (enemy.type === 'boss') {
              // Boss takes 33% grenade damage instead of instant kill
              const dmg = enemy.maxHp * 0.33;
              enemy.hp -= dmg;
              spawnParticles(state, enemy.pos.x, enemy.pos.y, '#ff4444', 8);
              addMessage(state, `💥 Boss takes ${Math.floor(dmg)} damage!`, 'damage');
              if (enemy.hp > 0) { enemy.state = 'chase'; continue; }
            }
            // Bodyguards take 50% grenade damage instead of instant kill
            if ((enemy as any)._isBodyguard) {
              const dmg = enemy.maxHp * 0.5;
              enemy.hp -= dmg;
              spawnParticles(state, enemy.pos.x, enemy.pos.y, '#ff4444', 6);
              addMessage(state, `💥 Bodyguard takes ${Math.floor(dmg)} damage!`, 'damage');
              if (enemy.hp > 0) { enemy.state = 'chase'; continue; }
            }
            enemy.hp = 0;
            enemy.state = 'dead';
            
            sendReinforcementToPlatform(state, enemy);
            enemy.loot = generateEnemyLoot(enemy);
            state.killCount++;
            state.grenadeKills++;
            addMessage(state, enemy.type === 'boss' ? '💀 COMMANDANT OSIPOVITJ IS DEAD!' : `Eliminated: ${enemy.type.toUpperCase()} (grenade)`, 'kill');
            spawnParticles(state, enemy.pos.x, enemy.pos.y, '#884444', 10);
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
            state.gameOver = true;
            const srcLabel = g.sourceType === 'boss' ? 'Commandant Osipovitj' : g.sourceType ? g.sourceType.toUpperCase() : 'unknown';
            state.deathCause = g.fromPlayer ? '💣 Killed by own grenade' : `💣 Grenade from ${srcLabel}`;
            addMessage(state, '☠ DEAD', 'damage');
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

    // Check elevated enemy hits BEFORE wall collision so bullets can reach wall guards
    if (b.fromPlayer) {
      for (const enemy of state.enemies) {
        if (enemy.state === 'dead' || !enemy.elevated) continue;
        if (dist(b.pos, enemy.pos) < 28) { // larger hitbox — guards are on walls
          if (Math.random() < 0.25) {
            spawnParticles(state, b.pos.x, b.pos.y, '#aaa', 2);
            return false; // concealment miss (reduced from 40% to 25%)
          }
          const soldierBonus = enemy.type === 'soldier' ? 0.15 : 0;
          const critChance = Math.min(0.50, 0.05 + state.killCount * 0.02 + soldierBonus);
          const isCrit = Math.random() < critChance;
          if (isCrit) {
            enemy.hp = 0;
            spawnParticles(state, b.pos.x, b.pos.y, '#ffff00', 10);
            playHit();
            addMessage(state, '💀 HEADSHOT!', 'kill');
           } else {
            // Boss and bodyguard body armor: 33% damage reduction
            const armorReduction = (enemy.type === 'boss' || (enemy as any)._isBodyguard) ? 0.67 : 1.0;
            enemy.hp -= b.damage * armorReduction;
            spawnParticles(state, b.pos.x, b.pos.y, '#ff4444', 5);
            playHit();
          }
          if (enemy.hp <= 0) {
            enemy.state = 'dead';
            
            sendReinforcementToPlatform(state, enemy);
            enemy.loot = generateEnemyLoot(enemy);
            state.killCount++;
            // Track elevated kill achievements
            if (isCrit) state.headshotKills++;
            if (b.weaponName === 'Mosin-Nagant') state.mosinKills++;
            const killDist = dist(b.pos, state.player.pos);
            if (killDist > 250) state.longShots++;
            if (killDist < 50) state.knifeDistanceKills++;
            if (!isCrit) addMessage(state, `Eliminated: ${enemy.type.toUpperCase()}`, 'kill');
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
          if (dist(b.pos, enemy.pos) < 50) { nearElevated = true; break; }
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
      const hitRadius = isMosin ? 21 : 16; // base 14+2, Mosin 19+2 forgiving hitbox
      for (const enemy of state.enemies) {
        if (enemy.state === 'dead') continue;
        if (dist(b.pos, enemy.pos) < hitRadius) {
          // Elevated enemies have concealment bonus — 40% miss chance
          if (enemy.elevated && Math.random() < 0.4) {
            spawnParticles(state, b.pos.x, b.pos.y, '#aaa', 2);
            return false; // bullet missed due to concealment
          }

          // Critical hit / headshot — chance scales with kill count (skill)
          // Soldiers have +15% headshot chance (weaker helmets)
          // Mosin-Nagant has +20% headshot bonus
          const soldierBonus = enemy.type === 'soldier' ? 0.15 : 0;
          const mosinBonus = isMosin ? 0.20 : 0;
          const critChance = Math.min(0.50, 0.05 + state.killCount * 0.02 + soldierBonus + mosinBonus);
          const isCrit = enemy.type !== 'boss' && enemy.type !== 'sniper' && Math.random() < critChance;
          
          if (isCrit) {
            enemy.hp = 0;
            spawnParticles(state, b.pos.x, b.pos.y, '#ffff00', 10);
            playHit();
            addMessage(state, '💀 HEADSHOT!', 'kill');
          } else {
            // Boss and bodyguard body armor: 33% damage reduction
            const armorReduction = (enemy.type === 'boss' || (enemy as any)._isBodyguard) ? 0.67 : 1.0;
            enemy.hp -= b.damage * armorReduction;
            spawnParticles(state, b.pos.x, b.pos.y, '#ff4444', 5);
            playHit();
          }
          
          if (enemy.hp <= 0) {
            enemy.state = 'dead';
            
            sendReinforcementToPlatform(state, enemy);
            enemy.loot = generateEnemyLoot(enemy);
            state.killCount++;
            // Track bullet kill achievements
            if (isCrit) state.headshotKills++;
            if (b.weaponName === 'Mosin-Nagant') state.mosinKills++;
            const killDist = dist(b.pos, state.player.pos);
            if (killDist > 250) state.longShots++;
            if (killDist < 50) state.knifeDistanceKills++;
            
            if (!isCrit) {
              addMessage(state, enemy.type === 'boss' ? '💀 COMMANDANT OSIPOVITJ IS DEAD!' : `Eliminated: ${enemy.type.toUpperCase()}`, 'kill');
            }
            spawnParticles(state, enemy.pos.x, enemy.pos.y, '#884444', 10);
          } else {
            // When hit, elevated guards go to attack and expand their range
            if (enemy.elevated) {
              enemy.alertRange = Math.max(enemy.alertRange, 300);
              enemy.shootRange = Math.max(enemy.shootRange, 250);
            }
            enemy.state = 'chase';
            // Sniper Tuman: flee immediately on hit (same frame)
            if (enemy.type === 'sniper' && !(enemy as any)._sniperInvisible) {
              const isCoverProp = (p: { type: string }) =>
                p.type === 'tree' || p.type === 'pine_tree' || p.type === 'bush' ||
                p.type === 'concrete_barrier' || p.type === 'vehicle_wreck' ||
                p.type === 'wood_crate' || p.type === 'barrel_stack' || p.type === 'sandbags';

              const fbAngle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
              const throwSpeed = 3.5;
              state.grenades.push({
                pos: { x: enemy.pos.x + Math.cos(fbAngle) * 16, y: enemy.pos.y + Math.sin(fbAngle) * 16 },
                vel: { x: Math.cos(fbAngle) * throwSpeed, y: Math.sin(fbAngle) * throwSpeed },
                timer: 0.6,
                damage: -1,
                radius: 200,
                fromPlayer: false,
                sourceId: enemy.id, sourceType: 'sniper',
              });
              playExplosion();

              let fleeCovers = state.props.filter(p =>
                isCoverProp(p) && dist(p.pos, state.player.pos) > 300 && dist(p.pos, enemy.pos) > 80
              );
              if (fleeCovers.length === 0) {
                fleeCovers = state.props.filter(p => isCoverProp(p) && dist(p.pos, enemy.pos) > 60);
              }

              if (fleeCovers.length > 0) {
                fleeCovers.sort((a, b) => dist(b.pos, state.player.pos) - dist(a.pos, state.player.pos));
                const target = fleeCovers[Math.floor(Math.random() * Math.min(3, fleeCovers.length))];
                (enemy as any)._sniperTargetTree = { x: target.pos.x, y: target.pos.y };
              } else {
                const awayAngle = Math.atan2(enemy.pos.y - state.player.pos.y, enemy.pos.x - state.player.pos.x);
                const teleportDist = 300 + Math.random() * 200;
                (enemy as any)._sniperTargetTree = {
                  x: Math.max(50, Math.min(state.mapWidth - 50, enemy.pos.x + Math.cos(awayAngle) * teleportDist)),
                  y: Math.max(50, Math.min(state.mapHeight - 50, enemy.pos.y + Math.sin(awayAngle) * teleportDist)),
                };
              }

              (enemy as any)._sniperInvisible = 2.0;
              (enemy as any)._sniperShouldFlee = false;
              (enemy as any)._sniperFleeCooldown = 12;
              for (let si = 0; si < 14; si++) {
                state.particles.push({ pos: { x: enemy.pos.x, y: enemy.pos.y }, vel: { x: (Math.random() - 0.5) * 2.5, y: (Math.random() - 0.5) * 2.5 }, life: 2, maxLife: 2, color: '#777', size: 5 + Math.random() * 4 });
              }
              addMessage(state, '💫 Sniper Tuman hit — flashbang + teleport!', 'warning');
            }
          }
          return false;
        }
      }
    } else {
      if (dist(b.pos, state.player.pos) < 12) {
        // Cover reduces hit chance: full cover = 80% miss, peeking = 40% miss
        if (state.player.inCover) {
          const missChance = state.player.peeking ? 0.4 : 0.8;
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
          state.gameOver = true;
          const srcLabel = b.sourceType === 'boss' ? 'Commandant Osipovitj' : b.sourceType === 'sniper' ? 'Sniper Tuman' : b.sourceType ? b.sourceType.toUpperCase() : 'unknown';
          state.deathCause = `🔫 Shot by ${srcLabel}`;
          addMessage(state, '☠ DEAD', 'damage');
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

  return state;
}
