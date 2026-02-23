import { GameState } from './types';

const R = 18;
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

  // Chibi proportions: BIG head, tiny body
  const headR = size * 0.72;
  const torsoW = size * 0.6;
  const torsoH = size * 0.45;
  const legW = size * 0.2;
  const legH = size * 0.3;
  const armW = size * 0.16;

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(2, size * 0.75, size * 0.55, size * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // === LEGS (stubby little legs) ===
  ctx.save();
  ctx.rotate(angle);
  const walkPhase = (Date.now() % 500) / 500;
  const legSwing = Math.sin(walkPhase * Math.PI * 2) * 0.2;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(legW * 0.8 * side, torsoH * 0.35);
    ctx.rotate(legSwing * side);
    // Leg
    ctx.fillStyle = shadeColor(bodyColor, -20);
    ctx.beginPath();
    ctx.roundRect(-legW / 2, 0, legW, legH, 4);
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Round boot
    ctx.fillStyle = '#3a3832';
    ctx.beginPath();
    ctx.ellipse(0, legH, legW * 0.65, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // === GUN + ARM ===
  if (hasGun) {
    ctx.save();
    ctx.rotate(angle);
    // Gun arm (round stubby)
    ctx.fillStyle = shadeColor(bodyColor, -8);
    ctx.beginPath();
    ctx.ellipse(torsoW * 0.25, armW * 0.2, size * 0.28, armW * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    // Tiny hand
    ctx.fillStyle = '#e8d0b0';
    ctx.beginPath();
    ctx.arc(size * 0.45, armW * 0.2, 3, 0, Math.PI * 2);
    ctx.fill();
    // Gun
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.roundRect(size * 0.4, -2.5, size * 0.85, 5, 2);
    ctx.fill();
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.roundRect(size * 1.0, -3.5, 6, 7, 1);
    ctx.fill();
    ctx.fillStyle = '#555';
    ctx.fillRect(size * 1.2, -1.5, 4, 3);
    ctx.restore();
  }

  // === TORSO (round puffball body) ===
  ctx.save();
  ctx.rotate(angle);
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(0, torsoH * 0.05, torsoW / 2, torsoH / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Body highlight
  const torsoGrad = ctx.createLinearGradient(0, -torsoH / 2, 0, torsoH / 2);
  torsoGrad.addColorStop(0, 'rgba(255,255,255,0.2)');
  torsoGrad.addColorStop(1, 'rgba(0,0,0,0.05)');
  ctx.fillStyle = torsoGrad;
  ctx.beginPath();
  ctx.ellipse(0, torsoH * 0.05, torsoW / 2, torsoH / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Belt buckle
  ctx.fillStyle = '#5a5a4a';
  ctx.beginPath();
  ctx.roundRect(-4, torsoH * 0.15, 8, 3, 1);
  ctx.fill();
  // Off-arm (round stub)
  ctx.fillStyle = shadeColor(bodyColor, -8);
  ctx.beginPath();
  ctx.ellipse(-torsoW * 0.42, torsoH * 0.05, armW * 0.9, size * 0.22, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1;
  ctx.stroke();
  // Tiny hand
  ctx.fillStyle = '#e8d0b0';
  ctx.beginPath();
  ctx.arc(-torsoW * 0.42 - armW * 0.5, torsoH * 0.15, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // === HEAD (BIG cute head) ===
  ctx.save();
  ctx.translate(0, -torsoH * 0.4);

  // Neck
  ctx.fillStyle = '#e0c8a8';
  ctx.fillRect(-3.5, headR * 0.55, 7, 6);

  // Head shape
  ctx.fillStyle = '#f0dcc0';
  ctx.beginPath();
  ctx.arc(0, 0, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d4b896';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Head shine
  const headGrad = ctx.createRadialGradient(-headR * 0.25, -headR * 0.35, headR * 0.1, 0, 0, headR);
  headGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
  headGrad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  headGrad.addColorStop(1, 'rgba(0,0,0,0.03)');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, 0, headR, 0, Math.PI * 2);
  ctx.fill();

  // Big rosy cheeks
  ctx.fillStyle = 'rgba(230, 120, 120, 0.22)';
  ctx.beginPath();
  ctx.ellipse(-headR * 0.52, headR * 0.22, headR * 0.22, headR * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(headR * 0.52, headR * 0.22, headR * 0.22, headR * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Face (rotates with aim)
  ctx.save();
  ctx.rotate(angle);
  if (isBlinking) {
    // Happy closed eyes (curved lines)
    ctx.strokeStyle = eyeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(headR * 0.28, -headR * 0.18, 4, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(headR * 0.28, headR * 0.18, 4, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
  } else {
    // BIG sparkly eyes
    const eyeX = headR * 0.3;
    const eyeYOff = headR * 0.2;
    const eyeW = 5;
    const eyeH = 6;
    for (const ey of [-eyeYOff, eyeYOff]) {
      // Eye white
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(eyeX, ey, eyeW, eyeH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      // Iris
      ctx.fillStyle = eyeColor;
      ctx.beginPath();
      ctx.arc(eyeX + 1.5, ey, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // Pupil
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(eyeX + 2, ey, 2, 0, Math.PI * 2);
      ctx.fill();
      // Big sparkle
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(eyeX + 3, ey - 2.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
      // Small sparkle
      ctx.beginPath();
      ctx.arc(eyeX - 0.5, ey + 1.5, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Cute little mouth
  ctx.strokeStyle = 'rgba(180, 100, 80, 0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(headR * 0.5, 0, 2.5, -0.6, 0.6);
  ctx.stroke();
  // Tiny nose dot
  ctx.fillStyle = 'rgba(200, 150, 120, 0.3)';
  ctx.beginPath();
  ctx.arc(headR * 0.55, 0, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // === HAT ===
  ctx.save();
  ctx.rotate(angle);
  switch (hatType) {
    case 'ushanka':
      ctx.fillStyle = hatColor;
      ctx.beginPath();
      ctx.arc(0, 0, headR * 1.1, -Math.PI * 0.8, Math.PI * 0.8);
      ctx.lineTo(0, -headR * 1.1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shadeColor(hatColor, -15);
      ctx.lineWidth = 1;
      ctx.stroke();
      // Ear flaps
      ctx.fillRect(-headR * 1.15, -headR * 0.3, headR * 0.35, headR * 0.65);
      // Star
      ctx.fillStyle = '#dd3333';
      ctx.font = `bold ${headR * 0.6}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('★', headR * 0.05, headR * -0.3);
      break;
    case 'helmet':
      ctx.fillStyle = hatColor;
      ctx.beginPath();
      ctx.arc(0, -headR * 0.05, headR * 1.15, -Math.PI * 0.88, Math.PI * 0.88);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shadeColor(hatColor, -20);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Helmet strap
      ctx.strokeStyle = '#5a5a4a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, headR * 0.95, Math.PI * 0.3, Math.PI * 0.7);
      ctx.stroke();
      break;
    case 'beret':
      ctx.fillStyle = hatColor;
      ctx.beginPath();
      ctx.ellipse(-headR * 0.1, -headR * 0.65, headR * 0.85, headR * 0.38, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shadeColor(hatColor, -15);
      ctx.lineWidth = 1;
      ctx.stroke();
      // Beret nub
      ctx.fillStyle = hatColor;
      ctx.beginPath();
      ctx.arc(-headR * 0.1, -headR * 0.95, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'bandana':
      ctx.fillStyle = hatColor;
      ctx.beginPath();
      ctx.arc(0, 0, headR * 1.02, -Math.PI * 0.72, Math.PI * 0.72);
      ctx.closePath();
      ctx.fill();
      // Knot tails
      ctx.beginPath();
      ctx.moveTo(-headR * 0.65, -headR * 0.35);
      ctx.quadraticCurveTo(-headR * 1.3, -headR * 0.6, -headR * 1.1, -headR * 0.15);
      ctx.lineTo(-headR * 0.7, -headR * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-headR * 0.6, -headR * 0.2);
      ctx.quadraticCurveTo(-headR * 1.2, -headR * 0.3, -headR * 1.0, 0);
      ctx.lineTo(-headR * 0.55, -headR * 0.05);
      ctx.closePath();
      ctx.fill();
      break;
  }
  ctx.restore();

  ctx.restore(); // head translate
  ctx.restore(); // main translate
}

// Draw mounted machine gun emplacement
function drawMountedGun(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, alert: boolean) {
  ctx.save();
  ctx.translate(x, y);

  // Sandbag base (oval)
  ctx.fillStyle = '#7a7560';
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5a5540';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Sandbag texture lines
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(-18, i * 6);
    ctx.lineTo(18, i * 6);
    ctx.stroke();
  }

  // Inner circle (gun mount)
  ctx.fillStyle = '#5a5a4a';
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a3a30';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Gun barrel (rotates)
  ctx.save();
  ctx.rotate(angle);
  // Barrel body
  ctx.fillStyle = '#4a4a42';
  ctx.beginPath();
  ctx.roundRect(6, -3.5, 30, 7, 2);
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Muzzle
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.roundRect(32, -4.5, 8, 9, 1);
  ctx.fill();
  // Ammo box
  ctx.fillStyle = '#6a6a55';
  ctx.beginPath();
  ctx.roundRect(-2, 4, 12, 8, 2);
  ctx.fill();
  ctx.strokeStyle = '#4a4a3a';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Handle grips
  ctx.fillStyle = '#8a6a4a';
  ctx.beginPath();
  ctx.roundRect(-6, -6, 8, 4, 1);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-6, 2, 8, 4, 1);
  ctx.fill();

  // Muzzle flash when alert
  if (alert) {
    const flash = Math.sin(Date.now() * 0.02) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255, 200, 60, ${flash * 0.4})`;
    ctx.beginPath();
    ctx.arc(40, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Shield plate (front arc)
  ctx.save();
  ctx.rotate(angle);
  ctx.fillStyle = '#5a6a58';
  ctx.beginPath();
  ctx.arc(8, 0, 14, -0.7, 0.7);
  ctx.lineTo(8, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3a4a38';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  ctx.restore();
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

    // Vision cone per enemy type
    const visionArc = {
      scav: Math.PI * 0.4,
      soldier: Math.PI * 0.55,
      heavy: Math.PI * 0.75,
      turret: Math.PI * 0.85,
    }[enemy.type] || Math.PI * 0.55;
    const rearRange = {
      scav: 0.2,
      soldier: 0.35,
      heavy: 0.55,
      turret: 0,
    }[enemy.type] || 0.35;

    // Forward vision cone
    ctx.beginPath();
    ctx.moveTo(enemy.pos.x, enemy.pos.y);
    ctx.arc(enemy.pos.x, enemy.pos.y, enemy.alertRange, enemy.angle - visionArc, enemy.angle + visionArc);
    ctx.closePath();
    ctx.fillStyle = fieldColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Rear awareness circle (size varies by type)
    ctx.beginPath();
    ctx.arc(enemy.pos.x, enemy.pos.y, enemy.alertRange * rearRange, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 200, 80, ${alertPulse * 0.5})`;
    ctx.fill();

    // Inner shoot range (forward only)
    if (enemy.state !== 'patrol') {
      ctx.beginPath();
      ctx.moveTo(enemy.pos.x, enemy.pos.y);
      ctx.arc(enemy.pos.x, enemy.pos.y, enemy.shootRange, enemy.angle - visionArc, enemy.angle + visionArc);
      ctx.closePath();
      ctx.strokeStyle = `rgba(255, 50, 30, ${alertPulse * 5})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    const isBlinking = enemy.eyeBlink < 0.15;

    if (enemy.type === 'turret') {
      // Draw mounted machine gun — sandbag base + gun barrel
      drawMountedGun(ctx, enemy.pos.x, enemy.pos.y, enemy.angle, enemy.state !== 'patrol');
    } else {
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
    }

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
    const typeLabel = { scav: 'PLUNDRARE', soldier: 'SOLDAT', heavy: 'TUNGT', turret: 'KULSPRUTA' }[enemy.type];
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
