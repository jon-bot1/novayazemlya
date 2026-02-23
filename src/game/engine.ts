import { GameState, InputState, Vec2, GameMessage, Particle, Enemy } from './types';
import { generateMap, createInitialPlayer } from './map';
import { LORE_DOCUMENTS } from './lore';
import { LOOT_POOLS } from './items';

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
  if (moveLen > 0.1) {
    const speed = state.player.speed * dt * 60;
    const dir = normalize({ x: moveX, y: moveY });
    state.player.pos = tryMove(state, state.player.pos, dir.x * speed, dir.y * speed, 12);
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
    // currentAmmo decrement disabled for testing (infinite ammo)
    // state.player.currentAmmo--;
    state.player.lastShot = state.time;
    spawnParticles(state, state.player.pos.x + Math.cos(angle) * 20, state.player.pos.y + Math.sin(angle) * 20, '#ffaa44', 3);
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

    // Use medical items
    if (state.player.hp < state.player.maxHp) {
      const medIdx = state.player.inventory.findIndex(i => i.category === 'medical');
      if (medIdx >= 0) {
        const med = state.player.inventory[medIdx];
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + (med.healAmount || 0));
        state.player.inventory.splice(medIdx, 1);
        state.player.bleedRate = Math.max(0, state.player.bleedRate - 2);
        addMessage(state, `Använde ${med.name} (+${med.healAmount}HP)`, 'info');
        spawnParticles(state, state.player.pos.x, state.player.pos.y, '#44ff66', 5);
      }
    }
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

  // Update enemies
  for (const enemy of state.enemies) {
    if (enemy.state === 'dead') continue;

    enemy.eyeBlink -= dt;
    if (enemy.eyeBlink <= 0) enemy.eyeBlink = 3 + Math.random() * 4;

    const distToPlayer = dist(enemy.pos, state.player.pos);
    const los = hasLineOfSight(state, enemy.pos, state.player.pos);

    // Vision cone varies by enemy type/skill
    // scav: narrow vision, very poor rear awareness
    // soldier: decent vision, moderate rear awareness  
    // heavy: wide vision, good rear awareness (experienced)
    const visionConfig = {
      scav:    { frontArc: Math.PI * 0.4, rearRange: 0.2 },   // ~144° front, 20% rear
      soldier: { frontArc: Math.PI * 0.55, rearRange: 0.35 }, // ~198° front, 35% rear
      heavy:   { frontArc: Math.PI * 0.75, rearRange: 0.55 }, // ~270° front, 55% rear
    }[enemy.type] || { frontArc: Math.PI * 0.55, rearRange: 0.35 };

    const toPlayerAngle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
    let angleDiff = Math.abs(toPlayerAngle - enemy.angle);
    if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
    const isBehind = angleDiff > visionConfig.frontArc;

    const effectiveRange = isBehind ? enemy.alertRange * visionConfig.rearRange : enemy.alertRange;
    const canSeePlayer = distToPlayer < effectiveRange && los;

    if (canSeePlayer) {
      if (distToPlayer < enemy.shootRange && !isBehind) {
        enemy.state = 'attack';
      } else {
        enemy.state = 'chase';
      }
    } else if (enemy.state !== 'patrol') {
      if (distToPlayer > enemy.alertRange * 1.5 || !los) {
        enemy.state = 'patrol';
        enemy.patrolTarget = { x: enemy.pos.x + (Math.random() - 0.5) * 300, y: enemy.pos.y + (Math.random() - 0.5) * 300 };
      }
    }

    const speed = enemy.speed * dt * 60;
    switch (enemy.state) {
      case 'patrol': {
        if (dist(enemy.pos, enemy.patrolTarget) < 20) {
          enemy.patrolTarget = { x: enemy.pos.x + (Math.random() - 0.5) * 300, y: enemy.pos.y + (Math.random() - 0.5) * 300 };
        }
        const dir = normalize({ x: enemy.patrolTarget.x - enemy.pos.x, y: enemy.patrolTarget.y - enemy.pos.y });
        enemy.pos = tryMove(state, enemy.pos, dir.x * speed * 0.4, dir.y * speed * 0.4, 10);
        enemy.angle = Math.atan2(dir.y, dir.x);
        break;
      }
      case 'chase': {
        const dir = normalize({ x: state.player.pos.x - enemy.pos.x, y: state.player.pos.y - enemy.pos.y });
        enemy.pos = tryMove(state, enemy.pos, dir.x * speed, dir.y * speed, 10);
        enemy.angle = Math.atan2(dir.y, dir.x);
        break;
      }
      case 'attack': {
        enemy.angle = Math.atan2(state.player.pos.y - enemy.pos.y, state.player.pos.x - enemy.pos.x);
        if (state.time - enemy.lastShot > enemy.fireRate / 1000) {
          const spread = (Math.random() - 0.5) * 0.15;
          const angle = enemy.angle + spread;
          const bSpeed = 6;
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
        }
        if (distToPlayer < enemy.shootRange * 0.5) {
          const dir = normalize({ x: enemy.pos.x - state.player.pos.x, y: enemy.pos.y - state.player.pos.y });
          enemy.pos = tryMove(state, enemy.pos, dir.x * speed * 0.3, dir.y * speed * 0.3, 10);
        }
        break;
      }
    }
  }

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
