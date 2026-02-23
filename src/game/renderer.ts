import { GameState } from './types';

const PLAYER_R = 12;
const ENEMY_R = 12;

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);

  const cx = state.camera.x - w / 2;
  const cy = state.camera.y - h / 2;

  ctx.save();
  ctx.translate(-cx, -cy);

  // Ground
  ctx.fillStyle = '#1a1d17';
  ctx.fillRect(0, 0, state.mapWidth, state.mapHeight);

  // Ground texture - subtle grid
  ctx.strokeStyle = '#22261e';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < state.mapWidth; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, state.mapHeight);
    ctx.stroke();
  }
  for (let y = 0; y < state.mapHeight; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(state.mapWidth, y);
    ctx.stroke();
  }

  // Extraction zones
  for (const ep of state.extractionPoints) {
    if (!ep.active) continue;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ep.pos.x, ep.pos.y, ep.radius, 0, Math.PI * 2);
    const pulse = 0.3 + Math.sin(state.time * 3) * 0.15;
    ctx.fillStyle = `rgba(60, 180, 80, ${pulse * 0.15})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(60, 180, 80, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(60, 180, 80, ${pulse})`;
    ctx.font = '10px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ep.name, ep.pos.x, ep.pos.y - ep.radius - 8);
    ctx.fillText('▼ EXTRACT ▼', ep.pos.x, ep.pos.y + 4);
    ctx.restore();
  }

  // Walls
  for (const wall of state.walls) {
    ctx.fillStyle = wall.color;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    // Slight highlight on top
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(wall.x, wall.y, wall.w, 2);
  }

  // Loot containers
  for (const lc of state.lootContainers) {
    if (lc.looted) {
      ctx.fillStyle = '#2a2a22';
      ctx.fillRect(lc.pos.x - lc.size / 2, lc.pos.y - lc.size / 2, lc.size, lc.size);
    } else {
      const colors = { crate: '#5a4a2a', body: '#4a3328', cabinet: '#3a4a3a', barrel: '#3a3a2a' };
      ctx.fillStyle = colors[lc.type];
      ctx.fillRect(lc.pos.x - lc.size / 2, lc.pos.y - lc.size / 2, lc.size, lc.size);
      // Glow
      ctx.strokeStyle = 'rgba(180, 160, 60, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(lc.pos.x - lc.size / 2, lc.pos.y - lc.size / 2, lc.size, lc.size);
      // Label
      ctx.fillStyle = 'rgba(180, 160, 60, 0.7)';
      ctx.font = '8px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(lc.type.toUpperCase(), lc.pos.x, lc.pos.y - lc.size / 2 - 4);
    }
  }

  // Dead enemies
  for (const enemy of state.enemies) {
    if (enemy.state !== 'dead') continue;
    ctx.save();
    ctx.translate(enemy.pos.x, enemy.pos.y);
    ctx.fillStyle = '#3a2020';
    ctx.beginPath();
    ctx.arc(0, 0, ENEMY_R - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a2020';
    ctx.fillText('✕', -3, 4);
    ctx.restore();
  }

  // Living enemies
  for (const enemy of state.enemies) {
    if (enemy.state === 'dead') continue;
    ctx.save();
    ctx.translate(enemy.pos.x, enemy.pos.y);
    ctx.rotate(enemy.angle);

    const colors = { scav: '#6a6a4a', soldier: '#4a5a3a', heavy: '#5a4a3a' };
    ctx.fillStyle = colors[enemy.type];
    ctx.beginPath();
    ctx.arc(0, 0, ENEMY_R, 0, Math.PI * 2);
    ctx.fill();

    // Direction indicator (gun)
    ctx.fillStyle = '#333';
    ctx.fillRect(ENEMY_R - 2, -2, 10, 4);

    // Alert indicator
    if (enemy.state === 'alert' || enemy.state === 'chase') {
      ctx.fillStyle = 'rgba(255, 200, 50, 0.8)';
      ctx.font = '10px sans-serif';
      ctx.fillText('!', -3, -ENEMY_R - 4);
    } else if (enemy.state === 'attack') {
      ctx.fillStyle = 'rgba(255, 60, 60, 0.8)';
      ctx.font = '10px sans-serif';
      ctx.fillText('!!', -5, -ENEMY_R - 4);
    }

    ctx.restore();

    // HP bar for damaged enemies
    if (enemy.hp < enemy.maxHp) {
      const barW = 24;
      const ratio = enemy.hp / enemy.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(enemy.pos.x - barW / 2, enemy.pos.y - ENEMY_R - 8, barW, 3);
      ctx.fillStyle = ratio > 0.5 ? '#6a8a4a' : ratio > 0.25 ? '#8a6a2a' : '#8a2a2a';
      ctx.fillRect(enemy.pos.x - barW / 2, enemy.pos.y - ENEMY_R - 8, barW * ratio, 3);
    }
  }

  // Bullets
  for (const b of state.bullets) {
    ctx.fillStyle = b.fromPlayer ? '#dda040' : '#dd4040';
    ctx.beginPath();
    ctx.arc(b.pos.x, b.pos.y, 2, 0, Math.PI * 2);
    ctx.fill();
    // Trail
    ctx.strokeStyle = b.fromPlayer ? 'rgba(220,160,60,0.3)' : 'rgba(220,60,60,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(b.pos.x, b.pos.y);
    ctx.lineTo(b.pos.x - b.vel.x * 3, b.pos.y - b.vel.y * 3);
    ctx.stroke();
  }

  // Player
  ctx.save();
  ctx.translate(state.player.pos.x, state.player.pos.y);
  ctx.rotate(state.player.angle);

  // Body
  ctx.fillStyle = '#7a8a5a';
  ctx.beginPath();
  ctx.arc(0, 0, PLAYER_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#9aaa6a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Gun
  ctx.fillStyle = '#444';
  ctx.fillRect(PLAYER_R - 2, -2.5, 14, 5);
  ctx.fillStyle = '#555';
  ctx.fillRect(PLAYER_R + 8, -3, 4, 6);

  ctx.restore();

  // Bleeding indicator
  if (state.player.bleedRate > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(state.player.pos.x, state.player.pos.y, PLAYER_R + 4, 0, Math.PI * 2);
    const pulseAlpha = 0.2 + Math.sin(state.time * 8) * 0.15;
    ctx.strokeStyle = `rgba(200, 40, 40, ${pulseAlpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore(); // camera transform

  // Vignette
  const gradient = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Damage flash
  if (state.player.hp < 30) {
    const alpha = 0.1 + Math.sin(state.time * 5) * 0.05;
    ctx.fillStyle = `rgba(150, 20, 20, ${alpha})`;
    ctx.fillRect(0, 0, w, h);
  }
}
