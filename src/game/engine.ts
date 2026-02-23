import { GameState, InputState, Vec2, GameMessage, Particle, Enemy, SoundEvent, MovementMode } from './types';
import { generateMap, createInitialPlayer } from './map';
import { LORE_DOCUMENTS } from './lore';
import { LOOT_POOLS } from './items';
import { playGunshot, playExplosion, playHit, playPickup, playFootstep } from './audio';

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

function generateEnemyLoot(enemy: Enemy) {
  if (enemy.type === 'turret') return LOOT_POOLS.military();
  const poolType = enemy.type === 'heavy' ? 'military' : enemy.type === 'soldier' ? 'military' : 'common';
  return LOOT_POOLS[poolType]();
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
    documentPickups: map.documentPickups,
    walls: map.walls,
    extractionPoints: map.extractionPoints,
    camera: { x: player.pos.x, y: player.pos.y },
    mapWidth: map.mapWidth,
    mapHeight: map.mapHeight,
    gameOver: false,
    extracted: false,
    extractionProgress: 0,
    killCount: 0,
    time: 0,
    messages: [{ text: 'RÄDEN HAR BÖRJAT — Hitta exfiltreringskoden och kom ut levande', time: 0, type: 'info' }],
    codesFound: [],
    documentsRead: [],
    hasExtractionCode: false,
    speedBoostTimer: 0,
    soundEvents: [],
  };
}

function hasLineOfSight(state: GameState, a: Vec2, b: Vec2): boolean {
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
    
    // Footstep sounds + sound propagation
    playFootstep(input.movementMode);
    const footstepRadius: Record<MovementMode, number> = { sneak: 30, walk: 80, sprint: 160 };
    // Only emit sound events periodically (not every frame)
    if (Math.random() < (input.movementMode === 'sprint' ? 0.15 : input.movementMode === 'walk' ? 0.05 : 0.01)) {
      state.soundEvents.push({ pos: { ...state.player.pos }, radius: footstepRadius[input.movementMode], time: state.time });
    }
  }

  // Speed boost countdown
  if (state.speedBoostTimer > 0) {
    state.speedBoostTimer = Math.max(0, state.speedBoostTimer - dt);
  }

  // Player aim angle
  if (input.aimX !== 0 || input.aimY !== 0) {
    state.player.angle = Math.atan2(input.aimY, input.aimX);
  } else if (moveLen > 0.1) {
    state.player.angle = Math.atan2(moveY, moveX);
  }

  // Player shooting
  if (input.shooting && state.time - state.player.lastShot > state.player.fireRate / 1000) {
    const spread = (Math.random() - 0.5) * 0.08;
    const angle = state.player.angle + spread;
    const speed = 8;
    state.bullets.push({
      pos: { x: state.player.pos.x + Math.cos(angle) * 16, y: state.player.pos.y + Math.sin(angle) * 16 },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      damage: state.player.equippedWeapon?.damage || 10,
      damageType: 'bullet',
      fromPlayer: true,
      life: 60,
    });
    state.player.lastShot = state.time;
    spawnParticles(state, state.player.pos.x + Math.cos(angle) * 20, state.player.pos.y + Math.sin(angle) * 20, '#ffaa44', 3);
    
    // Sound event — gunshots alert enemies
    state.soundEvents.push({ pos: { ...state.player.pos }, radius: 300, time: state.time });
    playGunshot('pistol');
  }

  // Throw grenade (G key)
  if (input.throwGrenade) {
    const grenadeIdx = state.player.inventory.findIndex(i => i.category === 'grenade');
    if (grenadeIdx >= 0) {
      const grenadeItem = state.player.inventory[grenadeIdx];
      const angle = state.player.angle;
      const throwSpeed = 4;
      state.grenades.push({
        pos: { x: state.player.pos.x + Math.cos(angle) * 20, y: state.player.pos.y + Math.sin(angle) * 20 },
        vel: { x: Math.cos(angle) * throwSpeed, y: Math.sin(angle) * throwSpeed },
        timer: 1.5,
        damage: grenadeItem.damage || 60,
        radius: 80,
        fromPlayer: true,
      });
      state.player.inventory.splice(grenadeIdx, 1);
      addMessage(state, '💣 GRANAT KASTAD!', 'warning');
      spawnParticles(state, state.player.pos.x, state.player.pos.y, '#886644', 3);
    } else {
      addMessage(state, '⚠ Inga granater!', 'warning');
    }
    input.throwGrenade = false;
  }

  // Interact
  if (input.interact) {
    // Loot containers
    for (const lc of state.lootContainers) {
      if (!lc.looted && dist(state.player.pos, lc.pos) < 50) {
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

    // Document pickups
    for (const dp of state.documentPickups) {
      if (!dp.collected && dist(state.player.pos, dp.pos) < 50) {
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

    // Dead enemy looting
    for (const enemy of state.enemies) {
      if (enemy.state !== 'dead' || enemy.looted) continue;
      if (dist(state.player.pos, enemy.pos) < 50) {
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
        }
        spawnParticles(state, enemy.pos.x, enemy.pos.y, '#bbaa44', 6);
        if (enemy.loot.length > 0) {
          addMessage(state, `Byte: ${enemy.loot.map(i => i.name).join(', ')}`, 'loot');
        } else {
          addMessage(state, `Inget av värde...`, 'info');
        }
      }
    }

  }

  // Manual healing (H key)
  if (input.heal) {
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
    if (medIdx < 0 && (needsHeal || isBleeding)) {
      medIdx = player.inventory.findIndex(i => i.category === 'medical' && i.medicalType === 'morphine');
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
    } else if (needsHeal || isBleeding) {
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

  // Extraction check
  let inExtraction = false;
  for (const ep of state.extractionPoints) {
    if (ep.active && dist(state.player.pos, ep.pos) < ep.radius) {
      // TODO: Re-enable extraction code requirement after testing
      // if (!state.hasExtractionCode) {
      //   if (Math.floor(state.time) !== Math.floor(state.time - dt)) {
      //     addMessage(state, '⚠ EXFILTRERINGSKOD KRÄVS — Sök igenom kartan!', 'warning');
      //   }
      //   break;
      // }
      inExtraction = true;
      state.extractionProgress += dt;
      if (state.extractionProgress >= ep.timer) {
        state.extracted = true;
        addMessage(state, `EVAKUERING: ${ep.name}!`, 'info');
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

    enemy.eyeBlink -= dt;
    if (enemy.eyeBlink <= 0) enemy.eyeBlink = 3 + Math.random() * 4;

    const distToPlayer = dist(enemy.pos, state.player.pos);
    const los = hasLineOfSight(state, enemy.pos, state.player.pos);

    // Vision cone varies by enemy type/skill
    const visionConfig = {
      scav:    { frontArc: Math.PI * 0.4, rearRange: 0.2 },
      soldier: { frontArc: Math.PI * 0.55, rearRange: 0.35 },
      heavy:   { frontArc: Math.PI * 0.75, rearRange: 0.55 },
      turret:  { frontArc: Math.PI * 0.85, rearRange: 0.0 },
    }[enemy.type] || { frontArc: Math.PI * 0.55, rearRange: 0.35 };

    const toPlayerAngle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
    let angleDiff = Math.abs(toPlayerAngle - enemy.angle);
    if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
    const isBehind = angleDiff > visionConfig.frontArc;

    const effectiveRange = isBehind ? enemy.alertRange * visionConfig.rearRange : enemy.alertRange;
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

    // State transitions
    if (canSeePlayer) {
      if (distToPlayer < enemy.shootRange && !isBehind) {
        enemy.state = 'attack';
      } else {
        enemy.state = 'chase';
      }
    } else if (heardSound && (enemy.state === 'idle' || enemy.state === 'patrol')) {
      // Heard a sound — go investigate
      enemy.state = 'investigate';
      enemy.investigateTarget = heardSound;
    } else if (enemy.state === 'chase' || enemy.state === 'attack') {
      // Lost sight of player
      if (distToPlayer > enemy.alertRange * 1.5 || !los) {
        // Go investigate where they last saw the player
        enemy.state = 'investigate';
        enemy.investigateTarget = { ...state.player.pos };
      }
    } else if (enemy.state === 'alert') {
      // Alert cooldown — transition to patrol after a moment
      enemy.state = 'patrol';
      enemy.patrolTarget = { x: enemy.pos.x + (Math.random() - 0.5) * 200, y: enemy.pos.y + (Math.random() - 0.5) * 200 };
    }

    const speed = enemy.speed * dt * 60;
    switch (enemy.state as string) {
      case 'idle': {
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
        if (dist(enemy.pos, enemy.patrolTarget) < 20) {
          // Reached patrol point — go idle for a bit
          enemy.state = 'idle';
        } else {
          const dir = normalize({ x: enemy.patrolTarget.x - enemy.pos.x, y: enemy.patrolTarget.y - enemy.pos.y });
          enemy.pos = tryMove(state, enemy.pos, dir.x * speed * 0.4, dir.y * speed * 0.4, 10);
          enemy.angle = Math.atan2(dir.y, dir.x);
        }
        break;
      }
      case 'investigate': {
        if (enemy.type === 'turret') {
          // Turret just aims toward sound
          if (enemy.investigateTarget) {
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
            enemy.pos = tryMove(state, enemy.pos, dir.x * speed * 0.7, dir.y * speed * 0.7, 10);
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
          enemy.angle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
          break;
        }
        const dir = normalize({ x: state.player.pos.x - enemy.pos.x, y: state.player.pos.y - enemy.pos.y });
        enemy.pos = tryMove(state, enemy.pos, dir.x * speed, dir.y * speed, 10);
        enemy.angle = Math.atan2(dir.y, dir.x);
        break;
      }
      case 'attack': {
        enemy.angle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
        if (state.time - enemy.lastShot > enemy.fireRate / 1000) {
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
          });
          enemy.lastShot = state.time;
          spawnParticles(state, enemy.pos.x + Math.cos(angle) * 16, enemy.pos.y + Math.sin(angle) * 16, '#ff6644', 2);
          // Enemy gunshot sound event (alerts other enemies too)
          state.soundEvents.push({ pos: { ...enemy.pos }, radius: 200, time: state.time });
          const gunType = enemy.type === 'turret' ? 'turret' : enemy.type === 'heavy' ? 'heavy' : 'rifle';
          playGunshot(gunType);
        }
        if (enemy.type !== 'turret' && distToPlayer < enemy.shootRange * 0.5) {
          const dir = normalize({ x: enemy.pos.x - state.player.pos.x, y: enemy.pos.y - state.player.pos.y });
          enemy.pos = tryMove(state, enemy.pos, dir.x * speed * 0.3, dir.y * speed * 0.3, 10);
        }
        break;
      }
    }
  }

  // Update grenades
  state.grenades = state.grenades.filter(g => {
    g.pos.x += g.vel.x;
    g.pos.y += g.vel.y;
    g.vel.x *= 0.97; // friction
    g.vel.y *= 0.97;
    g.timer -= dt;

    // Bounce off walls
    if (collidesWithWalls(state, g.pos.x + g.vel.x, g.pos.y, 4)) g.vel.x *= -0.5;
    if (collidesWithWalls(state, g.pos.x, g.pos.y + g.vel.y, 4)) g.vel.y *= -0.5;

    if (g.timer <= 0) {
      // EXPLOSION
      addMessage(state, '💥 EXPLOSION!', 'damage');
      spawnParticles(state, g.pos.x, g.pos.y, '#ff8833', 20);
      spawnParticles(state, g.pos.x, g.pos.y, '#ffcc44', 15);
      spawnParticles(state, g.pos.x, g.pos.y, '#444', 10);
      playExplosion();
      // Explosion sound event — very loud, alerts all nearby enemies
      state.soundEvents.push({ pos: { ...g.pos }, radius: 500, time: state.time });

      // Damage enemies in radius
      for (const enemy of state.enemies) {
        if (enemy.state === 'dead') continue;
        const d = dist(g.pos, enemy.pos);
        if (d < g.radius) {
          const falloff = 1 - (d / g.radius);
          const dmg = g.damage * falloff;
          enemy.hp -= dmg;
          if (enemy.hp <= 0) {
            enemy.state = 'dead';
            enemy.loot = generateEnemyLoot(enemy);
            state.killCount++;
            addMessage(state, `Eliminerad: ${enemy.type.toUpperCase()} (granat)`, 'kill');
            spawnParticles(state, enemy.pos.x, enemy.pos.y, '#884444', 10);
          } else {
            enemy.state = 'chase';
          }
        }
      }

      // Damage player if in radius
      if (g.fromPlayer || true) {
        const d = dist(g.pos, state.player.pos);
        if (d < g.radius) {
          const falloff = 1 - (d / g.radius);
          const dmg = g.damage * falloff * 0.5; // reduced self-damage
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
    if (collidesWithWalls(state, b.pos.x, b.pos.y, 2)) {
      spawnParticles(state, b.pos.x, b.pos.y, '#888', 3);
      return false;
    }

    if (b.fromPlayer) {
      for (const enemy of state.enemies) {
        if (enemy.state === 'dead') continue;
        if (dist(b.pos, enemy.pos) < 14) {
          enemy.hp -= b.damage;
          spawnParticles(state, b.pos.x, b.pos.y, '#ff4444', 5);
          playHit();
          if (enemy.hp <= 0) {
            enemy.state = 'dead';
            enemy.loot = generateEnemyLoot(enemy);
            state.killCount++;
            addMessage(state, `Eliminerad: ${enemy.type.toUpperCase()}`, 'kill');
            spawnParticles(state, enemy.pos.x, enemy.pos.y, '#884444', 10);
          } else {
            enemy.state = 'chase';
          }
          return false;
        }
      }
    } else {
      if (dist(b.pos, state.player.pos) < 12) {
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
