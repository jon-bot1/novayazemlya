import { GameState } from './types';

const R = 14;
const WALL_HEIGHT = 18; // visible wall south-face height for 3/4 perspective

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

  const headR = size * 0.55;
  const torsoW = size * 0.7;
  const torsoH = size * 0.6;
  const legW = size * 0.22;
  const legH = size * 0.4;
  const armW = size * 0.18;
  const armH = size * 0.5;

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(2, size * 0.9, size * 0.7, size * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs (drawn behind body, offset by walk cycle hint)
  ctx.save();
  ctx.rotate(angle);
  const walkPhase = (Date.now() % 600) / 600;
  const legSwing = Math.sin(walkPhase * Math.PI * 2) * 0.15;
  // Left leg
  ctx.fillStyle = shadeColor(bodyColor, -25);
  ctx.save();
  ctx.translate(-legW * 0.7, torsoH * 0.3);
  ctx.rotate(legSwing);
  ctx.beginPath();
  ctx.roundRect(-legW / 2, 0, legW, legH, 3);
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1;
  ctx.stroke();
  // Boot
  ctx.fillStyle = '#3a3a32';
  ctx.beginPath();
  ctx.roundRect(-legW / 2 - 1, legH - 4, legW + 2, 5, 2);
  ctx.fill();
  ctx.restore();
  // Right leg
  ctx.save();
  ctx.translate(legW * 0.7, torsoH * 0.3);
  ctx.rotate(-legSwing);
  ctx.fillStyle = shadeColor(bodyColor, -25);
  ctx.beginPath();
  ctx.roundRect(-legW / 2, 0, legW, legH, 3);
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#3a3a32';
  ctx.beginPath();
  ctx.roundRect(-legW / 2 - 1, legH - 4, legW + 2, 5, 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();

  // Gun (behind or in front based on angle)
  if (hasGun) {
    ctx.save();
    ctx.rotate(angle);
    // Arm holding gun
    ctx.fillStyle = shadeColor(bodyColor, -10);
    ctx.beginPath();
    ctx.roundRect(torsoW * 0.15, -armW * 0.8, armH * 0.7, armW, 3);
    ctx.fill();
    // Gun
    ctx.fillStyle = '#777';
    ctx.fillRect(size * 0.4, -3, size * 1.0, 6);
    ctx.fillStyle = '#666';
    ctx.fillRect(size * 1.1, -4, 5, 8);
    // Muzzle
    ctx.fillStyle = '#555';
    ctx.fillRect(size * 1.35, -2, 3, 4);
    ctx.restore();
  }

  // Torso
  ctx.save();
  ctx.rotate(angle);
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-torsoW / 2, -torsoH * 0.3, torsoW, torsoH, 4);
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Torso highlight
  const torsoGrad = ctx.createLinearGradient(0, -torsoH * 0.3, 0, torsoH * 0.7);
  torsoGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
  torsoGrad.addColorStop(1, 'rgba(0,0,0,0.08)');
  ctx.fillStyle = torsoGrad;
  ctx.beginPath();
  ctx.roundRect(-torsoW / 2, -torsoH * 0.3, torsoW, torsoH, 4);
  ctx.fill();
  // Belt
  ctx.fillStyle = '#4a4a3a';
  ctx.fillRect(-torsoW / 2 + 2, torsoH * 0.25, torsoW - 4, 3);
  // Off-arm
  ctx.fillStyle = shadeColor(bodyColor, -10);
  ctx.beginPath();
  ctx.roundRect(-torsoW / 2 - armW * 0.5, -torsoH * 0.15, armW, armH * 0.65, 3);
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Head
  ctx.save();
  ctx.translate(0, -torsoH * 0.35);
  // Neck
  ctx.fillStyle = '#d4b896';
  ctx.fillRect(-3, headR * 0.3, 6, 5);

  // Head circle
  ctx.fillStyle = '#e8d0b0';
  ctx.beginPath();
  ctx.arc(0, 0, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c4a882';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Head highlight
  const headGrad = ctx.createRadialGradient(-headR * 0.2, -headR * 0.3, 0, 0, 0, headR);
  headGrad.addColorStop(0, 'rgba(255,255,255,0.2)');
  headGrad.addColorStop(1, 'rgba(0,0,0,0.05)');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, 0, headR, 0, Math.PI * 2);
  ctx.fill();

  // Cheeks
  ctx.fillStyle = 'rgba(200, 110, 110, 0.18)';
  ctx.beginPath();
  ctx.arc(-headR * 0.5, headR * 0.2, headR * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(headR * 0.5, headR * 0.2, headR * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Face (rotates with aim)
  ctx.save();
  ctx.rotate(angle);
  if (isBlinking) {
    ctx.strokeStyle = eyeColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(headR * 0.3, -headR * 0.15, 2, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(headR * 0.3, headR * 0.15, 2, 0, Math.PI);
    ctx.stroke();
  } else {
    // Eye whites
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(headR * 0.32, -headR * 0.18, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(headR * 0.32, headR * 0.18, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pupils
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(headR * 0.38, -headR * 0.18, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headR * 0.38, headR * 0.18, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Highlights
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(headR * 0.4, -headR * 0.24, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headR * 0.4, headR * 0.12, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // Small mouth
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(headR * 0.45, 0, 1.5, -0.5, 0.5);
  ctx.stroke();
  ctx.restore();

  // Hat
  ctx.save();
  ctx.rotate(angle);
  switch (hatType) {
    case 'ushanka':
      ctx.fillStyle = hatColor;
      ctx.beginPath();
      ctx.arc(0, 0, headR * 1.15, -Math.PI * 0.8, Math.PI * 0.8);
      ctx.lineTo(0, -headR * 1.15);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-headR * 1.2, -headR * 0.3, headR * 0.35, headR * 0.6);
      ctx.fillStyle = '#cc3333';
      ctx.font = `${headR * 0.7}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('★', headR * 0.05, headR * -0.35);
      break;
    case 'helmet':
      ctx.fillStyle = hatColor;
      ctx.beginPath();
      ctx.arc(0, 0, headR * 1.2, -Math.PI * 0.85, Math.PI * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shadeColor(hatColor, -20);
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
    case 'beret':
      ctx.fillStyle = hatColor;
      ctx.beginPath();
      ctx.ellipse(headR * -0.1, -headR * 0.7, headR * 0.8, headR * 0.35, -0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'bandana':
      ctx.fillStyle = hatColor;
      ctx.beginPath();
      ctx.arc(0, 0, headR * 1.05, -Math.PI * 0.7, Math.PI * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-headR * 0.7, -headR * 0.3);
      ctx.lineTo(-headR * 1.2, -headR * 0.5);
      ctx.lineTo(-headR * 0.8, -headR * 0.1);
      ctx.closePath();
      ctx.fill();
      break;
  }
  ctx.restore();

  ctx.restore(); // head translate
  ctx.restore(); // main translate
}

// Draw a wall with 3/4 perspective south face
function drawWall3D(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  // South face (visible depth)
  const faceColor = shadeColor(color, -30);
  ctx.fillStyle = faceColor;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h + WALL_HEIGHT);
  ctx.lineTo(x, y + h + WALL_HEIGHT);
  ctx.closePath();
  ctx.fill();

  // Right face (small depth hint)
  if (w > 14) {
    const rightFace = shadeColor(color, -45);
    ctx.fillStyle = rightFace;
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + h + WALL_HEIGHT);
    ctx.lineTo(x + w, y + WALL_HEIGHT);
    ctx.closePath();
    ctx.fill();
  }

  // Top face
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);

  // Top highlight
  const topGrad = ctx.createLinearGradient(x, y, x, y + h);
  topGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
  topGrad.addColorStop(1, 'rgba(0,0,0,0.05)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(x, y, w, h);

  // Edge line
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
  return `rgb(${r},${g},${b})`;
}

// Draw ground tile pattern (Zelda-style)
function drawGroundTiles(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, mapW: number, mapH: number) {
  const tileSize = 48;
  const startX = Math.max(0, Math.floor(cx / tileSize) * tileSize);
  const startY = Math.max(0, Math.floor(cy / tileSize) * tileSize);
  const endX = Math.min(mapW, cx + w + tileSize);
  const endY = Math.min(mapH, cy + h + tileSize);

  for (let tx = startX; tx < endX; tx += tileSize) {
    for (let ty = startY; ty < endY; ty += tileSize) {
      const tileIdx = ((tx / tileSize) + (ty / tileSize)) % 2;
      ctx.fillStyle = tileIdx === 0 ? '#4e4e44' : '#525248';
      ctx.fillRect(tx, ty, tileSize, tileSize);

      // Subtle tile border
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx, ty, tileSize, tileSize);

      // Random floor details (cracks, stains)
      const hash = (tx * 7 + ty * 13) % 100;
      if (hash < 8) {
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx + 10, ty + 20);
        ctx.lineTo(tx + 35, ty + 30);
        ctx.stroke();
      }
      if (hash > 90) {
        ctx.fillStyle = 'rgba(60,50,40,0.1)';
        ctx.beginPath();
        ctx.arc(tx + 24, ty + 24, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);

  const cx = state.camera.x - w / 2;
  const cy = state.camera.y - h / 2;

  ctx.save();
  ctx.translate(-cx, -cy);

  // Outside area
  ctx.fillStyle = '#1a1e16';
  ctx.fillRect(-200, -200, state.mapWidth + 400, state.mapHeight + 400);

  // Hangar floor tiles (Zelda-style checkerboard)
  drawGroundTiles(ctx, cx, cy, w, h, state.mapWidth, state.mapHeight);

  // Zone labels
  ctx.fillStyle = 'rgba(200, 200, 180, 0.12)';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HANGAR', 250, 420);
  ctx.fillText('KONTOR', 900, 220);
  ctx.fillText('LAGER', 950, 670);
  ctx.font = '11px sans-serif';
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

  // ── WALLS (3D perspective) ──
  // Sort walls by Y so south faces overlap correctly
  const sortedWalls = [...state.walls].sort((a, b) => a.y - b.y);
  for (const wall of sortedWalls) {
    drawWall3D(ctx, wall.x, wall.y, wall.w, wall.h, wall.color);
  }

  // ── DOCUMENT PICKUPS ──
  for (const dp of state.documentPickups) {
    if (dp.collected) continue;
    const bob = Math.sin(state.time * 3 + dp.pos.x) * 3;
    const glow = 0.4 + Math.sin(state.time * 2) * 0.2;

    // Shadow on ground
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(dp.pos.x, dp.pos.y + 8, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

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
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(lc.pos.x, lc.pos.y + 10, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

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
    if (!enemy.looted) {
      // Lootable corpse — pulsing loot indicator
      const bob = Math.sin(state.time * 2 + enemy.pos.x) * 2;
      const glow = 0.5 + Math.sin(state.time * 3) * 0.2;

      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(enemy.pos.x, enemy.pos.y + 8, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(enemy.pos.x, enemy.pos.y + bob, 20, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 200, 60, ${glow * 0.2})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(220, 200, 60, ${glow * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💀', enemy.pos.x, enemy.pos.y + bob + 6);

      ctx.fillStyle = `rgba(220, 200, 60, ${glow + 0.3})`;
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText('SÖKA', enemy.pos.x, enemy.pos.y + bob - 16);
    } else {
      // Already looted
      ctx.globalAlpha = 0.35;
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👻', enemy.pos.x, enemy.pos.y + 4);
    }
    ctx.restore();
  }

  // ── LIVING ENEMIES ──
  for (const enemy of state.enemies) {
    if (enemy.state === 'dead') continue;

    // Detection field — forward cone (wide) + small rear circle
    ctx.save();
    const alertPulse = 0.03 + Math.sin(state.time * 1.5 + enemy.pos.x * 0.1) * 0.015;
    const fieldColor = enemy.state === 'patrol'
      ? `rgba(255, 200, 80, ${alertPulse})`
      : enemy.state === 'chase'
      ? `rgba(255, 120, 40, ${alertPulse * 2})`
      : `rgba(255, 50, 30, ${alertPulse * 2.5})`;
    const strokeColor = enemy.state === 'patrol'
      ? `rgba(255, 200, 80, ${alertPulse * 3})`
      : `rgba(255, 80, 40, ${alertPulse * 4})`;

    // Forward vision cone (~200° arc)
    const coneHalf = Math.PI * 0.55;
    ctx.beginPath();
    ctx.moveTo(enemy.pos.x, enemy.pos.y);
    ctx.arc(enemy.pos.x, enemy.pos.y, enemy.alertRange, enemy.angle - coneHalf, enemy.angle + coneHalf);
    ctx.closePath();
    ctx.fillStyle = fieldColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Rear awareness (small circle, 35% range)
    ctx.beginPath();
    ctx.arc(enemy.pos.x, enemy.pos.y, enemy.alertRange * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 200, 80, ${alertPulse * 0.5})`;
    ctx.fill();

    // Inner shoot range (forward only)
    if (enemy.state !== 'patrol') {
      ctx.beginPath();
      ctx.moveTo(enemy.pos.x, enemy.pos.y);
      ctx.arc(enemy.pos.x, enemy.pos.y, enemy.shootRange, enemy.angle - coneHalf, enemy.angle + coneHalf);
      ctx.closePath();
      ctx.strokeStyle = `rgba(255, 50, 30, ${alertPulse * 5})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    const isBlinking = enemy.eyeBlink < 0.15;
    const configs: Record<string, any> = {
      scav: { body: '#bb9a7a', outline: '#9a7a5a', eye: '#333', hat: 'bandana', hatColor: '#7a8a5a' },
      soldier: { body: '#7aaa5a', outline: '#5a8a3a', eye: '#222', hat: 'helmet', hatColor: '#6a7a4a' },
      heavy: { body: '#cc6a5a', outline: '#aa4a3a', eye: '#211', hat: 'ushanka', hatColor: '#9a5a4a' },
    };
    const cfg = configs[enemy.type];

    drawCuteCharacter(
      ctx, enemy.pos.x, enemy.pos.y, enemy.angle,
      cfg.body, cfg.outline, cfg.eye, isBlinking,
      cfg.hat, cfg.hatColor, true, enemy.type === 'heavy' ? R + 4 : R
    );

    // Status
    if (enemy.state === 'chase') {
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('❗', enemy.pos.x, enemy.pos.y - R - 12);
    } else if (enemy.state === 'attack') {
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💢', enemy.pos.x, enemy.pos.y - R - 12);
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
      ctx.fillRect(enemy.pos.x - barW / 2 - 1, enemy.pos.y - R - 24, barW + 2, 6);
      ctx.fillStyle = ratio > 0.5 ? '#7aaa5a' : ratio > 0.25 ? '#aa8a3a' : '#cc3a3a';
      ctx.fillRect(enemy.pos.x - barW / 2, enemy.pos.y - R - 23, barW * ratio, 4);
    }

    // Type label
    ctx.fillStyle = 'rgba(255,200,200,0.5)';
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'center';
    const typeLabel = { scav: 'PLUNDRARE', soldier: 'SOLDAT', heavy: 'TUNGT' }[enemy.type];
    ctx.fillText(typeLabel || '', enemy.pos.x, enemy.pos.y + R + 16);
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
    // Bullet shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(b.pos.x, b.pos.y + 4, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

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
  ctx.save();
  const pulse = 0.6 + Math.sin(state.time * 2) * 0.2;

  // Radial glow
  const grad = ctx.createRadialGradient(
    state.player.pos.x, state.player.pos.y, 0,
    state.player.pos.x, state.player.pos.y, 45
  );
  grad.addColorStop(0, `rgba(100, 255, 80, ${pulse * 0.35})`);
  grad.addColorStop(0.5, `rgba(100, 255, 80, ${pulse * 0.12})`);
  grad.addColorStop(1, 'rgba(100, 255, 80, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(state.player.pos.x - 45, state.player.pos.y - 45, 90, 90);

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

  // Name tag
  ctx.fillStyle = '#88ff44';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▼ DU ▼', state.player.pos.x, state.player.pos.y - R - 22);

  // Bleeding
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
      ctx.fillText('[E] LETA', lc.pos.x, lc.pos.y + lc.size + 6);
    }
  }
  for (const dp of state.documentPickups) {
    if (!dp.collected && dist2d(state.player.pos, dp.pos) < 50) {
      ctx.fillStyle = 'rgba(100, 200, 255, 0.9)';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('[E] LÄS', dp.pos.x, dp.pos.y + 26);
    }
  }

  ctx.restore(); // camera

  // Subtle vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.45, w / 2, h / 2, w * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  // Low HP flash
  if (state.player.hp < 30) {
    const alpha = 0.08 + Math.sin(state.time * 5) * 0.04;
    ctx.fillStyle = `rgba(150, 20, 20, ${alpha})`;
    ctx.fillRect(0, 0, w, h);
  }
}

function dist2d(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
