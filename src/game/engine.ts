import { GameState, InputState, Vec2, GameMessage, Particle, Enemy, SoundEvent, MovementMode, TacticalRole } from './types';
import { generateMap, createInitialPlayer } from './map';
import { LORE_DOCUMENTS } from './lore';
import { LOOT_POOLS, createFlashbang } from './items';
import { playGunshot, playExplosion, playHit, playPickup, playFootstep, playRadio, playAlarm, playBossRoar, playVoiceShout } from './audio';
import { speakCallout } from './voice';

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
  // Bodyguards and boss get wider firing arc
  const isBodyguard = !!(enemy as any)._isBodyguard;
  const arcMap: Record<string, number> = {
    scav: Math.PI * 0.4 - DEG15,
    soldier: Math.PI * 0.55 - DEG15,
    heavy: Math.PI * 0.75 - DEG15,
    turret: Math.PI * 0.85 - DEG15,
    boss: Math.PI * 0.7,
  };
  let arc = arcMap[enemy.type] || Math.PI * 0.55 - DEG15;
  if (isBodyguard) arc = Math.PI * 0.65; // wider arc for elite bodyguards
  
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
    addMessage(state, '📻 Vakt rusar till ställningen!', 'warning');
  } else {
    // No nearby ally — keep the platform prop so it stays visible
  }
  // Mark dead guard as no longer elevated so platform draws independently
  deadGuard.elevated = false;
  // Store platform position for rendering
  state.props.push({ pos: platformPos, w: 36, h: 40, type: 'watchtower' as any });
}

function generateEnemyLoot(enemy: Enemy) {
  // Preserve any pre-assigned loot (e.g. keycards from map setup)
  const existingLoot = [...enemy.loot];
  
  if (enemy.type === 'turret') return [...existingLoot, ...LOOT_POOLS.military()];
  if (enemy.type === 'boss') {
    return [
      ...existingLoot,
      ...LOOT_POOLS.military(),
      ...LOOT_POOLS.valuable(),
      { id: 'boss_usb', name: 'Volkovs USB-minne', category: 'valuable' as const, icon: '💾', weight: 0.1, value: 5000, description: 'KRITISKT UNDERRÄTTELSEDATA — Ta med ut för att klara uppdraget!' },
      { id: 'boss_dogtag', name: 'Volkovs Dogtag', category: 'valuable' as const, icon: '💀', weight: 0.1, value: 1500, description: 'Kommendant Volkovs identitetsbricka — extremt sällsynt' },
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
    messages: [{ text: 'RÄDEN HAR BÖRJAT — Döda Kommendant Volkov och ta hans USB-minne!', time: 0, type: 'info' }],
    codesFound: [],
    documentsRead: [],
    hasExtractionCode: false,
    speedBoostTimer: 0,
    soundEvents: [],
    flashbangTimer: 0,
    backpackCapacity: 0,
  };
}

function hasLineOfSight(state: GameState, a: Vec2, b: Vec2, elevated: boolean = false): boolean {
  if (elevated) return true; // elevated enemies can see over walls (but limited range)
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(d / 10);
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

export function updateGame(state: GameState, input: InputState, dt: number, canvasW: number, canvasH: number): GameState {
  if (state.gameOver || state.extracted) return state;

  state.time += dt;

  // Player movement — support both directional input and tap-to-target
  let moveX = input.moveX;
  let moveY = input.moveY;

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
    state.player.pos = tryMove(state, state.player.pos, dir.x * speed, dir.y * speed, 12);
    
    // Moving breaks cover
    if (state.player.inCover) {
      state.player.inCover = false;
      state.player.coverObject = null;
      state.player.peeking = false;
    }
    
    // Footstep sounds + sound propagation
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
      addMessage(state, '🧍 Lämnar skydd', 'info');
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
        addMessage(state, '🛡️ I skydd! Skjut för att kika fram', 'info');
      } else {
        addMessage(state, '⚠ Inget skydd i närheten!', 'warning');
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

  // Player aim angle
  if (input.aimX !== 0 || input.aimY !== 0) {
    state.player.angle = Math.atan2(input.aimY, input.aimX);
  } else if (moveLen > 0.1) {
    state.player.angle = Math.atan2(moveY, moveX);
  }

  // Player shooting — weapon-specific stats
  const wpn = state.player.equippedWeapon;
  const fireRate = wpn?.weaponFireRate || state.player.fireRate;
  if (input.shooting && state.time - state.player.lastShot > fireRate / 1000) {
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
    });
    state.player.lastShot = state.time;
    spawnParticles(state, state.player.pos.x + Math.cos(angle) * 20, state.player.pos.y + Math.sin(angle) * 20, '#ffaa44', 3);
    
    // Sound event — gunshots alert enemies
    state.soundEvents.push({ pos: { ...state.player.pos }, radius: 300, time: state.time });
    playGunshot('pistol');
  }

  // Throw grenade (G key) — supports both grenades and flashbangs
  if (input.throwGrenade) {
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
      addMessage(state, isFlashbang ? '💫 BLÄNDGRANAT KASTAD!' : '💣 GRANAT KASTAD!', 'warning');
      spawnParticles(state, state.player.pos.x, state.player.pos.y, isFlashbang ? '#ffffaa' : '#886644', 3);
    } else {
      addMessage(state, '⚠ Inga granater!', 'warning');
    }
    input.throwGrenade = false;
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
          addMessage(state, '💳 GRIND ÖPPNAD med passerkort!', 'intel');
          spawnParticles(state, gateCenterX, gateCenterY, '#44ff44', 10);
        } else {
          addMessage(state, '🔒 Grinden är låst — du behöver ett passerkort!', 'warning');
        }
      }
    }

    // Loot containers — require line of sight (no looting through walls)
    for (const lc of state.lootContainers) {
      if (!lc.looted && dist(state.player.pos, lc.pos) < 70 && hasLineOfSight(state, state.player.pos, lc.pos)) {
        lc.looted = true;
        for (const item of lc.items) {
          state.player.inventory.push(item);
          if (item.id === 'extraction_code') {
            state.hasExtractionCode = true;
            addMessage(state, '🔑 EXFILTRERINGSKOD HITTAD! Gå till evakueringspunkten!', 'intel');
          }
          if (item.category === 'ammo' && item.ammoType === state.player.ammoType && item.ammoCount) {
            state.player.currentAmmo += item.ammoCount;
          }
          // Auto-equip backpack
          if (item.category === 'backpack' && state.backpackCapacity === 0) {
            state.backpackCapacity = 10;
            addMessage(state, '🎒 Ryggsäck utrustad — mer plats för loot!', 'intel');
          }
          // Auto-equip armor
          if (item.category === 'armor' && item.damage) {
            state.player.armor += item.damage;
            addMessage(state, `🛡️ +${item.damage} skydd utrustat!`, 'info');
          }
          // Auto-equip better weapon
          if (item.category === 'weapon' && item.damage && (!state.player.equippedWeapon || item.damage > state.player.equippedWeapon.damage!)) {
            state.player.equippedWeapon = item;
            if (item.ammoType) state.player.ammoType = item.ammoType;
            addMessage(state, `🔫 ${item.name} utrustad!`, 'info');
          }
        }
        spawnParticles(state, lc.pos.x, lc.pos.y, '#bbaa44', 6);
        playPickup();
        if (lc.items.length > 0) {
          addMessage(state, `Byte: ${lc.items.map(i => i.name).join(', ')}`, 'loot');
        } else {
          addMessage(state, `Tomt...`, 'info');
        }
      }
    }

    // Document pickups — require line of sight
    for (const dp of state.documentPickups) {
      if (!dp.collected && dist(state.player.pos, dp.pos) < 70 && hasLineOfSight(state, state.player.pos, dp.pos)) {
        dp.collected = true;
        const doc = LORE_DOCUMENTS.find(d => d.id === dp.loreDocId);
        if (doc) {
          doc.found = true;
          state.documentsRead.push(doc.id);
          if (doc.hasCode && doc.code && !state.codesFound.includes(doc.code)) {
            state.codesFound.push(doc.code);
            addMessage(state, `☢ HEMLIG KOD: ${doc.code}`, 'intel');
          }
          addMessage(state, `📄 DOKUMENT: "${doc.title}"`, 'intel');
          spawnParticles(state, dp.pos.x, dp.pos.y, '#44aaff', 8);
        }
      }
    }

    // Dead enemy looting — require line of sight
    for (const enemy of state.enemies) {
      if (enemy.state !== 'dead' || enemy.looted) continue;
      if (dist(state.player.pos, enemy.pos) < 70 && hasLineOfSight(state, state.player.pos, enemy.pos)) {
        enemy.looted = true;
        for (const item of enemy.loot) {
          state.player.inventory.push(item);
          if (item.id === 'extraction_code') {
            state.hasExtractionCode = true;
            addMessage(state, '🔑 EXFILTRERINGSKOD HITTAD! Gå till evakueringspunkten!', 'intel');
          }
          if (item.category === 'ammo' && item.ammoType === state.player.ammoType && item.ammoCount) {
            state.player.currentAmmo += item.ammoCount;
          }
          if (item.category === 'backpack' && state.backpackCapacity === 0) {
            state.backpackCapacity = 10;
            addMessage(state, '🎒 Ryggsäck utrustad!', 'intel');
          }
          if (item.category === 'armor' && item.damage) {
            state.player.armor += item.damage;
            addMessage(state, `🛡️ +${item.damage} skydd!`, 'info');
          }
          if (item.category === 'weapon' && item.damage && (!state.player.equippedWeapon || item.damage > state.player.equippedWeapon.damage!)) {
            state.player.equippedWeapon = item;
            if (item.ammoType) state.player.ammoType = item.ammoType;
            addMessage(state, `🔫 ${item.name} utrustad!`, 'info');
          }
          if (item.id === 'boss_usb') {
            state.hasExtractionCode = true;
            addMessage(state, '💾 VOLKOVS USB-MINNE! Ta det till evakueringspunkten!', 'intel');
          }
        }
        spawnParticles(state, enemy.pos.x, enemy.pos.y, '#bbaa44', 6);
        if (enemy.loot.length > 0) {
          addMessage(state, `Byte: ${enemy.loot.map(i => i.name).join(', ')}`, 'loot');
        } else {
          addMessage(state, `Inget av värde...`, 'info');
        }
      }
    }

    // Hack alarm panels
    for (const panel of state.alarmPanels) {
      if (panel.hacked) continue;
      if (dist(state.player.pos, panel.pos) < 70) {
        if (!panel.activated) {
          // Pre-emptively hack before alarm is triggered
          panel.hackProgress += 0.05;
          if (panel.hackProgress >= 1) {
            panel.hacked = true;
            addMessage(state, '💻 KONTROLLPANEL HACKAD! Alarm avaktiverat.', 'intel');
            spawnParticles(state, panel.pos.x, panel.pos.y, '#44ffaa', 10);
            // Check if all panels hacked — disable alarm
            if (state.alarmPanels.every(p => p.hacked)) {
              state.alarmActive = false;
              addMessage(state, '🔇 ALLA ALARM AVAKTIVERADE!', 'intel');
            }
          } else {
            addMessage(state, `💻 Hackar... ${Math.floor(panel.hackProgress * 100)}%`, 'info');
          }
        } else {
          // Alarm is active — hack to disable
          panel.hackProgress += 0.04;
          if (panel.hackProgress >= 1) {
            panel.hacked = true;
            panel.activated = false;
            addMessage(state, '💻 ALARM AVAKTIVERAT!', 'intel');
            spawnParticles(state, panel.pos.x, panel.pos.y, '#44ffaa', 10);
            if (state.alarmPanels.every(p => p.hacked || !p.activated)) {
              state.alarmActive = false;
              addMessage(state, '🔇 ALARM TYSTNAT!', 'intel');
            }
          } else {
            addMessage(state, `💻 Hackar alarm... ${Math.floor(panel.hackProgress * 100)}%`, 'warning');
          }
        }
      }
    }

  }

  // Manual healing (H key) OR auto-heal when HP < 40
  const shouldAutoHeal = state.player.hp < 40 && state.player.hp > 0;
  if (input.heal || shouldAutoHeal) {
    const player = state.player;
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
      player.hp = Math.min(player.maxHp, player.hp + (med.healAmount || 0));
      if (med.stopsBleeding) {
        player.bleedRate = Math.max(0, player.bleedRate - med.stopsBleeding);
      }
      if (med.speedBoost && med.speedBoost > 0) {
        state.speedBoostTimer = med.speedBoost;
        addMessage(state, `⚡ ADRENALINKICK! Hastighet ökad i ${med.speedBoost}s`, 'info');
      }
      player.inventory.splice(medIdx, 1);
      addMessage(state, `💊 ${med.name} (+${med.healAmount}HP)`, 'info');
      spawnParticles(state, player.pos.x, player.pos.y, '#44ff66', 5);
    } else if (input.heal && (needsHeal || isBleeding)) {
      addMessage(state, '⚠ Ingen medicin!', 'warning');
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

  // Extraction check — works without USB but mission incomplete
  const hasUSB = state.player.inventory.some(i => i.id === 'boss_usb');
  let inExtraction = false;
  for (const ep of state.extractionPoints) {
    if (ep.active && dist(state.player.pos, ep.pos) < ep.radius) {
      if (!hasUSB && Math.floor(state.time * 2) !== Math.floor((state.time - dt) * 2)) {
        addMessage(state, '⚠ USB-minne saknas — du kan evakuera men uppdraget misslyckas!', 'warning');
      }
      inExtraction = true;
      state.extractionProgress += dt;
      if (state.extractionProgress >= ep.timer) {
        state.extracted = true;
        state.hasExtractionCode = hasUSB; // reuse field to track mission success
        addMessage(state, hasUSB
          ? `💾 UPPDRAG KLART — EVAKUERING: ${ep.name}!`
          : `⚠ EVAKUERAD utan USB — UPPDRAG MISSLYCKAT`, hasUSB ? 'info' : 'warning');
      }
    }
  }
  if (!inExtraction) {
    state.extractionProgress = Math.max(0, state.extractionProgress - dt * 2);
  }

  // Clean up old sound events (older than 2 seconds)
  state.soundEvents = state.soundEvents.filter(se => state.time - se.time < 2);

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
      addMessage(state, '⚠ Ny vakt på ställningen!', 'warning');
    }

    // Boss phase transitions based on HP
    if (enemy.type === 'boss') {
      const hpRatio = enemy.hp / enemy.maxHp;
      const oldPhase = enemy.bossPhase || 0;
      if (hpRatio < 0.3) enemy.bossPhase = 2;
      else if (hpRatio < 0.6) enemy.bossPhase = 1;
      else enemy.bossPhase = 0;
      
      if (enemy.bossPhase !== oldPhase) {
        const phaseNames = ['', '⚠ KOMMENDANT VOLKOV ÄR RASANDE!', '☠ VOLKOV ÄR DESPERAT — AKTA DIG!'];
        if (phaseNames[enemy.bossPhase!]) {
          addMessage(state, phaseNames[enemy.bossPhase!], 'warning');
          playBossRoar();
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
          addMessage(state, '🚨 ALARM AKTIVERAT! Alla fiender larmas!', 'warning');
          // No alarm sound effect
          speakCallout('alarm');
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

    // Vision cone varies by enemy type/skill (reduced by 15° = ~0.26 rad)
    const DEG15 = Math.PI * (15 / 180);
    const visionConfig = {
      scav:    { frontArc: Math.PI * 0.4 - DEG15, rearRange: 0.2 },
      soldier: { frontArc: Math.PI * 0.55 - DEG15, rearRange: 0.35 },
      heavy:   { frontArc: Math.PI * 0.75 - DEG15, rearRange: 0.55 },
      turret:  { frontArc: Math.PI * 0.85 - DEG15, rearRange: 0.0 },
    }[enemy.type] || { frontArc: Math.PI * 0.55 - DEG15, rearRange: 0.35 };

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
        // Silent alert — no sound on detection
        speakCallout('alert', enemy.type);
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
        enemy.callForHelpTimer = 8 + Math.random() * 4;
        playVoiceShout('alarm', enemy.type === 'heavy' ? -0.3 : 0.1);
        speakCallout('alarm', enemy.type);
        addMessage(state, `🗣️ ${enemy.type.toUpperCase()} ropar på hjälp!`, 'warning');
        // Alert all allies in group + nearby
        for (const ally of state.enemies) {
          if (ally === enemy || ally.state === 'dead') continue;
          if (ally.state === 'chase' || ally.state === 'attack' || ally.state === 'flank' || ally.state === 'suppress') continue;
          const sameGroup = ally.radioGroup === enemy.radioGroup;
          const closeEnough = dist(ally.pos, enemy.pos) < 350;
          if (sameGroup || closeEnough) {
            ally.state = 'chase';
            assignTacticalRole(state, ally);
            ally.radioAlert = 2;
          }
        }
      }

      // Radio call — alert allies in same group or within 400px
      if (state.time - enemy.lastRadioCall > 4) {
        enemy.lastRadioCall = state.time;
        enemy.radioAlert = 1.5;
        playRadio();
        for (const ally of state.enemies) {
          if (ally === enemy || ally.state === 'dead') continue;
          if (ally.state === 'chase' || ally.state === 'attack' || ally.state === 'flank' || ally.state === 'suppress') continue;
          const sameGroup = ally.radioGroup === enemy.radioGroup;
          const closeEnough = dist(ally.pos, enemy.pos) < 400;
          if (sameGroup || closeEnough) {
            ally.state = 'investigate';
            ally.investigateTarget = { ...state.player.pos };
            ally.radioAlert = 1.5;
            addMessage(state, `📻 ${enemy.type.toUpperCase()} anropar förstärkning!`, 'warning');
          }
        }
      }
    } else if (heardSound && (enemy.state === 'idle' || enemy.state === 'patrol')) {
      // Heard a sound — go investigate
      enemy.state = 'investigate';
      enemy.investigateTarget = heardSound;
      playVoiceShout('investigate', enemy.type === 'heavy' ? -0.4 : enemy.type === 'scav' ? 0.3 : 0);
      speakCallout('investigate', enemy.type);
    } else if (enemy.state === 'chase' || enemy.state === 'attack' || enemy.state === 'flank' || enemy.state === 'suppress') {
      // If rushing to a platform, don't get distracted
      if ((enemy as any)._platformTarget) {
        // Keep moving toward platform
        enemy.state = 'chase';
        enemy.investigateTarget = (enemy as any)._platformTarget;
      } else if (distToPlayer > enemy.alertRange * 1.5 || !los) {
        // Lost sight of player
        enemy.state = 'investigate';
        enemy.investigateTarget = { ...state.player.pos };
        enemy.tacticalRole = 'none';
        playVoiceShout('lost', enemy.type === 'heavy' ? -0.4 : 0);
        speakCallout('lost', enemy.type);
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
      enemy.state = 'patrol';
      enemy.patrolTarget = { x: enemy.pos.x + (Math.random() - 0.5) * 200, y: enemy.pos.y + (Math.random() - 0.5) * 200 };
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
    if (enemy.elevated && enemy.state !== 'attack' && enemy.state !== 'suppress') {
      // Just rotate to face threats
      if (enemy.state === 'chase' || enemy.state === 'investigate') {
        enemy.state = 'attack'; // can't chase, switch to shooting
      }
    }
    if (enemy.elevated && (enemy.state === 'patrol' || enemy.state === 'chase' || enemy.state === 'flank')) {
      // Override: elevated guards don't leave their post
      enemy.angle += Math.sin(state.time * 0.5 + enemy.pos.x * 0.01) * 0.005;
      // Skip movement switch
    } else
    switch (enemy.state as string) {
      case 'idle': {
        // Bodyguards follow their boss instead of idling
        if ((enemy as any)._bodyguardOf) {
          const boss = state.enemies.find(e => e.id === (enemy as any)._bodyguardOf);
          if (boss && boss.state !== 'dead') {
            const dBoss = dist(enemy.pos, boss.pos);
            if (dBoss > 50) {
              const dir = normalize({ x: boss.pos.x - enemy.pos.x, y: boss.pos.y - enemy.pos.y });
              enemy.pos = tryMove(state, enemy.pos, dir.x * speed * 0.8, dir.y * speed * 0.8, 10);
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
        // Bodyguards follow their boss during patrol
        if ((enemy as any)._bodyguardOf) {
          const boss = state.enemies.find(e => e.id === (enemy as any)._bodyguardOf);
          if (boss && boss.state !== 'dead') {
            const dBoss = dist(enemy.pos, boss.pos);
            if (dBoss > 50) {
              const dir = normalize({ x: boss.pos.x - enemy.pos.x, y: boss.pos.y - enemy.pos.y });
              enemy.pos = tryMove(state, enemy.pos, dir.x * speed, dir.y * speed, 10);
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
          const newPos = tryMove(state, enemy.pos, dir.x * speed * 0.4, dir.y * speed * 0.4, 10);
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
        if (enemy.investigateTarget) {
          const dToTarget = dist(enemy.pos, enemy.investigateTarget);
          if (dToTarget < 30) {
            // Arrived at sound location — look around (alert state)
            enemy.state = 'alert';
          } else {
            const dir = normalize({ x: enemy.investigateTarget.x - enemy.pos.x, y: enemy.investigateTarget.y - enemy.pos.y });
            const newPos = tryMove(state, enemy.pos, dir.x * speed * 0.7, dir.y * speed * 0.7, 10);
            if (dist(newPos, enemy.pos) < 0.1) {
              if (!(enemy as any)._stuckCounter) (enemy as any)._stuckCounter = 0;
              (enemy as any)._stuckCounter++;
              if ((enemy as any)._stuckCounter > 20) {
                const perpAngle = Math.atan2(dir.y, dir.x) + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
                enemy.investigateTarget = { x: enemy.pos.x + Math.cos(perpAngle) * 120, y: enemy.pos.y + Math.sin(perpAngle) * 120 };
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
        // Looking around nervously at investigate location
        enemy.angle += Math.sin(state.time * 3 + enemy.pos.x) * 0.03;
        // After some time go back to patrol
        if (Math.random() < 0.008) {
          enemy.state = 'patrol';
          enemy.patrolTarget = { x: enemy.pos.x + (Math.random() - 0.5) * 300, y: enemy.pos.y + (Math.random() - 0.5) * 300 };
        }
        break;
      }
      case 'chase': {
        if (enemy.type === 'turret') {
          // Turret can only aim within its arc
          if (isInFiringArc(enemy, state.player.pos.x, state.player.pos.y)) {
            enemy.angle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
          } else {
            enemy.state = 'idle'; // lost target outside arc
          }
          break;
        }
        const dir = normalize({ x: state.player.pos.x - enemy.pos.x, y: state.player.pos.y - enemy.pos.y });
        const newPos = tryMove(state, enemy.pos, dir.x * speed, dir.y * speed, 10);
        if (dist(newPos, enemy.pos) < 0.1) {
          if (!(enemy as any)._stuckCounter) (enemy as any)._stuckCounter = 0;
          (enemy as any)._stuckCounter++;
          if ((enemy as any)._stuckCounter > 15) {
            // Try to go around the wall
            const perpAngle = Math.atan2(dir.y, dir.x) + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
            const sidePos = tryMove(state, enemy.pos, Math.cos(perpAngle) * speed, Math.sin(perpAngle) * speed, 10);
            enemy.pos = sidePos;
            (enemy as any)._stuckCounter = 0;
          }
        } else {
          (enemy as any)._stuckCounter = 0;
          enemy.pos = newPos;
        }
        enemy.angle = Math.atan2(dir.y, dir.x);
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
            playVoiceShout('attack', enemy.type === 'heavy' ? -0.4 : 0.1);
            speakCallout('attack', enemy.type);
          } else {
            const dir = normalize({ x: enemy.flankTarget.x - enemy.pos.x, y: enemy.flankTarget.y - enemy.pos.y });
            enemy.pos = tryMove(state, enemy.pos, dir.x * speed * 1.2, dir.y * speed * 1.2, 10);
          }
        } else {
          enemy.state = 'chase';
        }
        // Opportunistic shots while flanking
        if (distToPlayer < enemy.shootRange && state.time - enemy.lastShot > enemy.fireRate / 1000 * 2 && isInFiringArc(enemy, state.player.pos.x, state.player.pos.y)) {
          const spread = (Math.random() - 0.5) * 0.2;
          const angle = enemy.angle + spread;
          state.bullets.push({
            pos: { x: enemy.pos.x + Math.cos(angle) * 14, y: enemy.pos.y + Math.sin(angle) * 14 },
            vel: { x: Math.cos(angle) * 6, y: Math.sin(angle) * 6 },
            damage: enemy.damage * 0.7, damageType: 'bullet', fromPlayer: false, life: 50, elevated: enemy.elevated,
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
        if (state.time - enemy.lastShot > suppressRate && isInFiringArc(enemy, state.player.pos.x, state.player.pos.y)) {
          const spread = (Math.random() - 0.5) * 0.35; // wide spread — suppression, not precision
          const angle = enemy.angle + spread;
          const bSpeed = enemy.type === 'heavy' ? 7 : 6;
          state.bullets.push({
            pos: { x: enemy.pos.x + Math.cos(angle) * 14, y: enemy.pos.y + Math.sin(angle) * 14 },
            vel: { x: Math.cos(angle) * bSpeed, y: Math.sin(angle) * bSpeed },
            damage: enemy.damage * 0.6, damageType: 'bullet', fromPlayer: false, life: 50, elevated: enemy.elevated,
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
        // Turrets: restrict rotation to their fixed arc (can't shoot behind/inward)
        const targetAngle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
        if (enemy.type === 'turret') {
          // Only rotate toward player if within turret's arc
          if (isInFiringArc(enemy, state.player.pos.x, state.player.pos.y)) {
            enemy.angle = targetAngle;
          }
          // If player is outside arc, turret loses target
          else {
            enemy.state = 'idle';
            break;
          }
        } else {
          enemy.angle = targetAngle;
        }
        if (state.time - enemy.lastShot > enemy.fireRate / 1000 && isInFiringArc(enemy, state.player.pos.x, state.player.pos.y)) {
          const spread = enemy.type === 'turret' ? (Math.random() - 0.5) * 0.1 : (Math.random() - 0.5) * 0.15;
          const angle = enemy.angle + spread;
          const bSpeed = enemy.type === 'turret' ? 8 : 6;
          state.bullets.push({
            pos: { x: enemy.pos.x + Math.cos(angle) * 14, y: enemy.pos.y + Math.sin(angle) * 14 },
            vel: { x: Math.cos(angle) * bSpeed, y: Math.sin(angle) * bSpeed },
            damage: enemy.damage,
            damageType: 'bullet',
            fromPlayer: false,
            life: 50,
            elevated: enemy.elevated,
          });
          enemy.lastShot = state.time;
          spawnParticles(state, enemy.pos.x + Math.cos(angle) * 16, enemy.pos.y + Math.sin(angle) * 16, '#ff6644', 2);
          // Enemy gunshot sound event (alerts other enemies too)
          state.soundEvents.push({ pos: { ...enemy.pos }, radius: 200, time: state.time });
          const gunType = enemy.type === 'boss' ? 'boss' : enemy.type === 'turret' ? 'turret' : enemy.type === 'heavy' ? 'heavy' : 'rifle';
          playGunshot(gunType);
        }
        if (enemy.type !== 'turret' && enemy.type !== 'boss' && distToPlayer < enemy.shootRange * 0.5) {
          const dir = normalize({ x: enemy.pos.x - state.player.pos.x, y: enemy.pos.y - state.player.pos.y });
          enemy.pos = tryMove(state, enemy.pos, dir.x * speed * 0.3, dir.y * speed * 0.3, 10);
        }
        // Boss: charge attack — rush toward player periodically
        if (enemy.type === 'boss' && (enemy.bossChargeTimer || 0) <= 0 && distToPlayer > 60) {
          const chargeDir = normalize({ x: state.player.pos.x - enemy.pos.x, y: state.player.pos.y - enemy.pos.y });
          const chargeSpeed = speed * 3;
          enemy.pos = tryMove(state, enemy.pos, chargeDir.x * chargeSpeed, chargeDir.y * chargeSpeed, 12);
          // Melee damage if close
          if (dist(enemy.pos, state.player.pos) < 30) {
            const meleeDmg = 25 * (1 - state.player.armor);
            state.player.hp -= meleeDmg;
            addMessage(state, `🗡️ VOLKOV SLÅR TILL! -${Math.floor(meleeDmg)}HP`, 'damage');
            spawnParticles(state, state.player.pos.x, state.player.pos.y, '#ff4444', 8);
            playHit();
            enemy.bossChargeTimer = 5 + Math.random() * 3;
            if (state.player.hp <= 0) {
              state.gameOver = true;
              addMessage(state, '☠ DÖD', 'damage');
            }
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
          addMessage(state, '📻 Volkov kallar förstärkning!', 'warning');
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
        addMessage(state, '💫 BLÄNDGRANAT!', 'warning');
        spawnParticles(state, g.pos.x, g.pos.y, '#ffffcc', 25);
        spawnParticles(state, g.pos.x, g.pos.y, '#ffffff', 20);
        state.soundEvents.push({ pos: { ...g.pos }, radius: 400, time: state.time });

        // Stun enemies in radius
        for (const enemy of state.enemies) {
          if (enemy.state === 'dead') continue;
          const d = dist(g.pos, enemy.pos);
          if (d < g.radius && hasLineOfSight(state, g.pos, enemy.pos, enemy.elevated)) {
            enemy.stunTimer = 3; // 3 seconds stun
            enemy.state = 'idle';
            addMessage(state, `💫 ${enemy.type.toUpperCase()} bländad!`, 'info');
          }
        }

        // Blind player if in radius
        const dPlayer = dist(g.pos, state.player.pos);
        if (dPlayer < g.radius && hasLineOfSight(state, g.pos, state.player.pos)) {
          const intensity = 1 - (dPlayer / g.radius);
          state.flashbangTimer = 2 * intensity + 0.5; // 0.5 - 2.5 seconds based on distance
          addMessage(state, '💫 BLÄNDAD!', 'damage');
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
              addMessage(state, `💥 Bossen tar ${Math.floor(dmg)} skada!`, 'damage');
              if (enemy.hp > 0) { enemy.state = 'chase'; continue; }
            }
            enemy.hp = 0;
            enemy.state = 'dead';
            playVoiceShout('death', enemy.type === 'heavy' ? -0.5 : 0.2);
            speakCallout('death', enemy.type);
            sendReinforcementToPlatform(state, enemy);
            enemy.loot = generateEnemyLoot(enemy);
            state.killCount++;
            addMessage(state, enemy.type === 'boss' ? '💀 KOMMENDANT VOLKOV ÄR DÖD!' : `Eliminerad: ${enemy.type.toUpperCase()} (granat)`, 'kill');
            spawnParticles(state, enemy.pos.x, enemy.pos.y, '#884444', 10);
          }
        }

        // Damage player if in radius AND line of sight
        const d = dist(g.pos, state.player.pos);
        if (d < g.radius && hasLineOfSight(state, g.pos, state.player.pos)) {
          const falloff = 1 - (d / g.radius);
          const dmg = g.damage * falloff * 0.5;
          state.player.hp -= dmg;
          spawnParticles(state, state.player.pos.x, state.player.pos.y, '#ff2222', 4);
          addMessage(state, `💥 Splitterskada! -${Math.floor(dmg)}HP`, 'damage');
          if (state.player.hp <= 0) {
            state.gameOver = true;
            addMessage(state, '☠ DÖD', 'damage');
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
        if (dist(b.pos, enemy.pos) < 18) { // slightly larger hitbox for elevated targets
          if (Math.random() < 0.4) {
            spawnParticles(state, b.pos.x, b.pos.y, '#aaa', 2);
            return false; // concealment miss
          }
          const critChance = Math.min(0.35, 0.05 + state.killCount * 0.02);
          const isCrit = Math.random() < critChance;
          if (isCrit) {
            enemy.hp = 0;
            spawnParticles(state, b.pos.x, b.pos.y, '#ffff00', 10);
            playHit();
            addMessage(state, '💀 HEADSHOT!', 'kill');
          } else {
            enemy.hp -= b.damage;
            spawnParticles(state, b.pos.x, b.pos.y, '#ff4444', 5);
            playHit();
          }
          if (enemy.hp <= 0) {
            enemy.state = 'dead';
            playVoiceShout('death', enemy.type === 'heavy' ? -0.5 : 0.2);
            speakCallout('death', enemy.type);
            sendReinforcementToPlatform(state, enemy);
            enemy.loot = generateEnemyLoot(enemy);
            state.killCount++;
            if (!isCrit) addMessage(state, `Eliminerad: ${enemy.type.toUpperCase()}`, 'kill');
            spawnParticles(state, enemy.pos.x, enemy.pos.y, '#884444', 10);
          } else {
            enemy.state = 'chase';
          }
          return false;
        }
      }
    }

    // Wall collision — elevated enemy bullets fly over walls
    if (!b.elevated && collidesWithWalls(state, b.pos.x, b.pos.y, 2)) {
      spawnParticles(state, b.pos.x, b.pos.y, '#888', 3);
      return false;
    }

    if (b.fromPlayer) {
      for (const enemy of state.enemies) {
        if (enemy.state === 'dead') continue;
        if (dist(b.pos, enemy.pos) < 14) {
          // Elevated enemies have concealment bonus — 40% miss chance
          if (enemy.elevated && Math.random() < 0.4) {
            spawnParticles(state, b.pos.x, b.pos.y, '#aaa', 2);
            return false; // bullet missed due to concealment
          }

          // Critical hit / headshot — chance scales with kill count (skill)
          const critChance = Math.min(0.35, 0.05 + state.killCount * 0.02);
          const isCrit = enemy.type !== 'boss' && Math.random() < critChance;
          
          if (isCrit) {
            enemy.hp = 0;
            spawnParticles(state, b.pos.x, b.pos.y, '#ffff00', 10);
            playHit();
            addMessage(state, '💀 HEADSHOT!', 'kill');
          } else {
            enemy.hp -= b.damage;
            spawnParticles(state, b.pos.x, b.pos.y, '#ff4444', 5);
            playHit();
          }
          
          if (enemy.hp <= 0) {
            enemy.state = 'dead';
            playVoiceShout('death', enemy.type === 'heavy' ? -0.5 : 0.2);
            speakCallout('death', enemy.type);
            sendReinforcementToPlatform(state, enemy);
            enemy.loot = generateEnemyLoot(enemy);
            state.killCount++;
            if (!isCrit) {
              addMessage(state, enemy.type === 'boss' ? '💀 KOMMENDANT VOLKOV ÄR DÖD!' : `Eliminerad: ${enemy.type.toUpperCase()}`, 'kill');
            }
            spawnParticles(state, enemy.pos.x, enemy.pos.y, '#884444', 10);
          } else {
            enemy.state = 'chase';
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
            addMessage(state, '🛡️ Skyddat!', 'info');
            return false;
          }
        }
        const dmg = b.damage * (1 - state.player.armor);
        state.player.hp -= dmg;
        spawnParticles(state, state.player.pos.x, state.player.pos.y, '#ff2222', 4);
        playHit();
        if (Math.random() > 0.7) {
          state.player.bleedRate += 0.5;
          addMessage(state, '🩸 BLÖDNING!', 'damage');
        }
        addMessage(state, `Träff! -${Math.floor(dmg)}HP`, 'damage');
        if (state.player.hp <= 0) {
          state.gameOver = true;
          addMessage(state, '☠ DÖD', 'damage');
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
