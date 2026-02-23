import { GameState } from './types';

const R = 14;

function drawCuteCharacter(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, angle: number,
  bodyColor: string, outlineColor: string,
  eyeColor: string, isBlinking: boolean,
  hatType: 'ushanka' | 'helmet' | 'beret' | 'bandana',
  hatColor: string,
  hasGun: boolean,
  size: number = R
) {
  ctx.save();
  ctx.translate(x, y);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, size * 0.6, size * 0.8, size * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Gun
  if (hasGun) {
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.roundRect(size * 0.3, -2.5, size * 1.2, 5, 2);
    ctx.fill();
    ctx.fillStyle = '#777';
    ctx.beginPath();
    ctx.roundRect(size * 1.1, -3.5, 5, 7, 1);
    ctx.fill();
    ctx.restore();
  }

  // Body
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cheeks
  ctx.fillStyle = 'rgba(200, 100, 100, 0.2)';
  ctx.beginPath();
  ctx.arc(-size * 0.5, size * 0.2, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.2, size * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Face
  ctx.save();
  ctx.rotate(angle);
  if (isBlinking) {
    ctx.strokeStyle = eyeColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(size * 0.25, -size * 0.15, 2, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(size * 0.25, size * 0.15, 2, 0, Math.PI);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(size * 0.25, -size * 0.2, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.25, size * 0.2, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(size * 0.32, -size * 0.2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.32, size * 0.2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(size * 0.35, -size * 0.25, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.35, size * 0.15, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Hat
  ctx.save();
  ctx.rotate(angle);
  switch (hatType) {
    case 'ushanka':
      ctx.fillStyle = hatColor;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.85, -Math.PI * 0.8, Math.PI * 0.8);
      ctx.lineTo(0, -size * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-size * 0.9, -size * 0.3, size * 0.3, size * 0.6);
      ctx.fillStyle = '#cc3333';
      ctx.font = `${size * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('★', size * 0.05, size * -0.3);
      break;
    case 'helmet':
      ctx.fillStyle = hatColor;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.9, -Math.PI * 0.85, Math.PI * 0.85);
      ctx.closePath();
      ctx.fill();
      break;
    case 'beret':
      ctx.fillStyle = hatColor;
      ctx.beginPath();
      ctx.ellipse(size * -0.1, -size * 0.6, size * 0.7, size * 0.35, -0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'bandana':
      ctx.fillStyle = hatColor;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.82, -Math.PI * 0.7, Math.PI * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-size * 0.6, -size * 0.3);
      ctx.lineTo(-size * 1.0, -size * 0.5);
      ctx.lineTo(-size * 0.7, -size * 0.1);
      ctx.closePath();
      ctx.fill();
      break;
  }
  ctx.restore();
  ctx.restore(); // main translate
}

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);

  const cx = state.camera.x - w / 2;
  const cy = state.camera.y - h / 2;

  ctx.save();
  ctx.translate(-cx, -cy);

  // ── GROUND ──
  // Outside area (dark)
  ctx.fillStyle = '#1a2018';
  ctx.fillRect(-200, -200, state.mapWidth + 400, state.mapHeight + 400);

  // Hangar floor (concrete, bright)
  ctx.fillStyle = '#4a4a42';
  ctx.fillRect(0, 0, state.mapWidth, state.mapHeight);

  // Floor tile grid
  ctx.strokeStyle = '#5a5a52';
  ctx.lineWidth = 0.5;
  const startX = Math.max(0, Math.floor(cx / 50) * 50);
  const startY = Math.max(0, Math.floor(cy / 50) * 50);
  for (let x = startX; x < Math.min(state.mapWidth, cx + w + 50); x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, Math.max(0, cy));
    ctx.lineTo(x, Math.min(state.mapHeight, cy + h));
    ctx.stroke();
  }
  for (let y = startY; y < Math.min(state.mapHeight, cy + h + 50); y += 50) {
    ctx.beginPath();
    ctx.moveTo(Math.max(0, cx), y);
    ctx.lineTo(Math.min(state.mapWidth, cx + w), y);
    ctx.stroke();
  }

  // Zone labels
  ctx.fillStyle = 'rgba(200, 200, 180, 0.15)';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HANGAR', 250, 400);
  ctx.fillText('KONTOR', 900, 200);
  ctx.fillText('LAGER', 950, 650);
  ctx.font = '12px sans-serif';
  ctx.fillText('KORRIDOR', 600, 260);

  // ── EXTRACTION ZONES ──
  for (const ep of state.extractionPoints) {
    if (!ep.active) continue;
    ctx.save();
    const pulse = 0.5 + Math.sin(state.time * 3) * 0.3;

    ctx.beginPath();
    ctx.arc(ep.pos.x, ep.pos.y, ep.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(60, 220, 80, ${pulse * 0.15})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(60, 220, 80, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = `rgba(60, 220, 80, ${pulse})`;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ep.name, ep.pos.x, ep.pos.y - ep.radius - 8);
    ctx.font = '20px sans-serif';
    ctx.fillText('🚁', ep.pos.x, ep.pos.y + 6);
    ctx.restore();
  }

  // ── WALLS ──
  for (const wall of state.walls) {
    ctx.fillStyle = wall.color;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(wall.x, wall.y, wall.w, Math.min(3, wall.h));
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(wall.x, wall.y + wall.h - 2, wall.w, 2);
  }

  // ── DOCUMENT PICKUPS ──
  for (const dp of state.documentPickups) {
    if (dp.collected) continue;
    const bob = Math.sin(state.time * 3 + dp.pos.x) * 3;
    const glow = 0.4 + Math.sin(state.time * 2) * 0.2;

    ctx.beginPath();
    ctx.arc(dp.pos.x, dp.pos.y + bob, 20, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(80, 160, 255, ${glow * 0.2})`;
    ctx.fill();

    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📄', dp.pos.x, dp.pos.y + bob + 6);

    ctx.fillStyle = `rgba(100, 180, 255, ${glow + 0.3})`;
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('DOKUMENT', dp.pos.x, dp.pos.y + bob - 16);
  }

  // ── LOOT ──
  for (const lc of state.lootContainers) {
    if (lc.looted) {
      ctx.fillStyle = '#3a3a32';
      ctx.fillRect(lc.pos.x - lc.size / 2, lc.pos.y - lc.size / 2, lc.size, lc.size);
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📦', lc.pos.x, lc.pos.y + 5);
    } else {
      const bob = Math.sin(state.time * 2 + lc.pos.x) * 2;
      const icons: Record<string, string> = { crate: '📦', body: '💀', cabinet: '🗄️', barrel: '🛢️' };

      ctx.beginPath();
      ctx.arc(lc.pos.x, lc.pos.y + bob, lc.size * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(220, 200, 60, 0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(220, 200, 60, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(icons[lc.type] || '📦', lc.pos.x, lc.pos.y + bob + 6);

      ctx.fillStyle = 'rgba(220, 200, 60, 0.7)';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText(lc.type.toUpperCase(), lc.pos.x, lc.pos.y + bob - 14);
    }
  }

  // ── DEAD ENEMIES ──
  for (const enemy of state.enemies) {
    if (enemy.state !== 'dead') continue;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    const floatUp = Math.sin(state.time * 2) * 3;
    ctx.fillText('👻', enemy.pos.x, enemy.pos.y + floatUp + 4);
    ctx.restore();
  }

  // ── LIVING ENEMIES ──
  for (const enemy of state.enemies) {
    if (enemy.state === 'dead') continue;

    const isBlinking = enemy.eyeBlink < 0.15;
    const configs: Record<string, any> = {
      scav: { body: '#aa9a7a', outline: '#8a7a5a', eye: '#333', hat: 'bandana', hatColor: '#7a8a5a' },
      soldier: { body: '#7a9a5a', outline: '#5a7a3a', eye: '#222', hat: 'helmet', hatColor: '#6a7a4a' },
      heavy: { body: '#aa6a5a', outline: '#8a4a3a', eye: '#211', hat: 'ushanka', hatColor: '#8a5a4a' },
    };
    const cfg = configs[enemy.type];

    drawCuteCharacter(
      ctx, enemy.pos.x, enemy.pos.y, enemy.angle,
      cfg.body, cfg.outline, cfg.eye, isBlinking,
      cfg.hat, cfg.hatColor, true, enemy.type === 'heavy' ? R + 4 : R
    );

    // Status indicator
    if (enemy.state === 'chase') {
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('❗', enemy.pos.x, enemy.pos.y - R - 10);
    } else if (enemy.state === 'attack') {
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💢', enemy.pos.x, enemy.pos.y - R - 10);
    } else if (enemy.state === 'patrol') {
      ctx.globalAlpha = 0.4 + Math.sin(state.time * 2) * 0.2;
      ctx.font = '10px sans-serif';
      ctx.fillText('💤', enemy.pos.x + R, enemy.pos.y - R - 6);
      ctx.globalAlpha = 1;
    }

    // HP bar
    if (enemy.hp < enemy.maxHp) {
      const barW = 28;
      const ratio = enemy.hp / enemy.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(enemy.pos.x - barW / 2 - 1, enemy.pos.y - R - 22, barW + 2, 6);
      ctx.fillStyle = ratio > 0.5 ? '#7aaa5a' : ratio > 0.25 ? '#aa8a3a' : '#cc3a3a';
      ctx.fillRect(enemy.pos.x - barW / 2, enemy.pos.y - R - 21, barW * ratio, 4);
    }

    // Enemy type label
    ctx.fillStyle = 'rgba(255,200,200,0.5)';
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'center';
    const typeLabel = { scav: 'PLUNDRARE', soldier: 'SOLDAT', heavy: 'TUNGT' }[enemy.type];
    ctx.fillText(typeLabel || '', enemy.pos.x, enemy.pos.y + R + 14);
  }

  // ── PARTICLES ──
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── BULLETS ──
  for (const b of state.bullets) {
    ctx.fillStyle = b.fromPlayer ? '#ffdd44' : '#ff5544';
    ctx.beginPath();
    ctx.arc(b.pos.x, b.pos.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(b.pos.x, b.pos.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = b.fromPlayer ? 'rgba(255,220,60,0.25)' : 'rgba(255,80,60,0.25)';
    ctx.fill();
    ctx.strokeStyle = b.fromPlayer ? 'rgba(255,220,60,0.2)' : 'rgba(255,80,60,0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.pos.x, b.pos.y);
    ctx.lineTo(b.pos.x - b.vel.x * 4, b.pos.y - b.vel.y * 4);
    ctx.stroke();
  }

  // ── PLAYER ──
  // Outer glow - very visible
  ctx.save();
  const pulse = 0.6 + Math.sin(state.time * 2) * 0.2;

  // Large soft glow
  const grad = ctx.createRadialGradient(
    state.player.pos.x, state.player.pos.y, 0,
    state.player.pos.x, state.player.pos.y, 40
  );
  grad.addColorStop(0, `rgba(100, 255, 80, ${pulse * 0.4})`);
  grad.addColorStop(0.5, `rgba(100, 255, 80, ${pulse * 0.15})`);
  grad.addColorStop(1, 'rgba(100, 255, 80, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(state.player.pos.x - 40, state.player.pos.y - 40, 80, 80);

  // Ring
  ctx.beginPath();
  ctx.arc(state.player.pos.x, state.player.pos.y, R + 8, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(120, 255, 80, ${pulse})`;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // Character
  const playerBlink = Math.sin(state.time * 0.8) > 0.95;
  drawCuteCharacter(
    ctx, state.player.pos.x, state.player.pos.y, state.player.angle,
    '#c0ee99', '#88cc55', '#2a3a1a', playerBlink,
    'beret', '#8a5545', true, R + 2
  );

  // Name tag (always visible)
  ctx.fillStyle = '#88ff44';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▼ DU ▼', state.player.pos.x, state.player.pos.y - R - 20);

  // Bleeding indicator
  if (state.player.bleedRate > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(state.player.pos.x, state.player.pos.y, R + 6, 0, Math.PI * 2);
    const pa = 0.2 + Math.sin(state.time * 8) * 0.15;
    ctx.strokeStyle = `rgba(220, 50, 50, ${pa})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ── INTERACTION PROMPTS ──
  for (const lc of state.lootContainers) {
    if (!lc.looted && dist2d(state.player.pos, lc.pos) < 50) {
      ctx.fillStyle = 'rgba(255, 230, 80, 0.9)';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('[E] LETA', lc.pos.x, lc.pos.y + lc.size + 4);
    }
  }
  for (const dp of state.documentPickups) {
    if (!dp.collected && dist2d(state.player.pos, dp.pos) < 50) {
      ctx.fillStyle = 'rgba(100, 200, 255, 0.9)';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('[E] LÄS', dp.pos.x, dp.pos.y + 24);
    }
  }

  ctx.restore(); // camera

  // Minimal vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.5, w / 2, h / 2, w * 0.9);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  // Damage flash
  if (state.player.hp < 30) {
    const alpha = 0.08 + Math.sin(state.time * 5) * 0.04;
    ctx.fillStyle = `rgba(150, 20, 20, ${alpha})`;
    ctx.fillRect(0, 0, w, h);
  }
}

function dist2d(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
