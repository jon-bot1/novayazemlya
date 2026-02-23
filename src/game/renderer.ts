import { GameState } from './types';

const R = 14; // character radius for cute style

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
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, size * 0.6, size * 0.8, size * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Gun (behind body)
  if (hasGun) {
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.roundRect(size * 0.3, -2.5, size * 1.2, 5, 2);
    ctx.fill();
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.roundRect(size * 1.1, -3.5, 5, 7, 1);
    ctx.fill();
    ctx.restore();
  }

  // Body (round cute shape)
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Cheeks (blush)
  ctx.fillStyle = 'rgba(200, 100, 100, 0.15)';
  ctx.beginPath();
  ctx.arc(-size * 0.5, size * 0.2, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.2, size * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Face (always faces angle direction)
  ctx.save();
  ctx.rotate(angle);

  // Eyes
  if (isBlinking) {
    // Closed eyes - cute lines
    ctx.strokeStyle = eyeColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(size * 0.25, -size * 0.15, 2, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(size * 0.25, size * 0.15, 2, 0, Math.PI);
    ctx.stroke();
  } else {
    // Open eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(size * 0.25, -size * 0.2, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.25, size * 0.2, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Pupils
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(size * 0.32, -size * 0.2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.32, size * 0.2, 2, 0, Math.PI * 2);
    ctx.fill();
    // Shine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(size * 0.35, -size * 0.25, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.35, size * 0.15, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore(); // angle rotation

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
      // Ear flaps
      ctx.fillStyle = hatColor;
      ctx.fillRect(-size * 0.9, -size * 0.3, size * 0.3, size * 0.6);
      // Star
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
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
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
      // Knot at back
      ctx.beginPath();
      ctx.moveTo(-size * 0.6, -size * 0.3);
      ctx.lineTo(-size * 1.0, -size * 0.5);
      ctx.lineTo(-size * 0.7, -size * 0.1);
      ctx.closePath();
      ctx.fill();
      break;
  }
  ctx.restore();
}

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);

  const cx = state.camera.x - w / 2;
  const cy = state.camera.y - h / 2;

  ctx.save();
  ctx.translate(-cx, -cy);

  // Ground - darker for contrast
  ctx.fillStyle = '#111410';
  ctx.fillRect(0, 0, state.mapWidth, state.mapHeight);

  // Ground texture - subtle noise pattern
  ctx.strokeStyle = '#1a1e16';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < state.mapWidth; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, Math.max(0, cy - 20));
    ctx.lineTo(x, Math.min(state.mapHeight, cy + h + 20));
    ctx.stroke();
  }
  for (let y = 0; y < state.mapHeight; y += 40) {
    ctx.beginPath();
    ctx.moveTo(Math.max(0, cx - 20), y);
    ctx.lineTo(Math.min(state.mapWidth, cx + w + 20), y);
    ctx.stroke();
  }

  // Ground decorations - grass tufts, cracks
  ctx.fillStyle = '#1e2418';
  for (let i = 0; i < 50; i++) {
    const gx = ((i * 137 + 42) % state.mapWidth);
    const gy = ((i * 251 + 89) % state.mapHeight);
    ctx.fillText('🌿', gx, gy);
  }

  // Building labels
  ctx.fillStyle = 'rgba(160, 150, 120, 0.3)';
  ctx.font = '14px "Oswald", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('KASERN', 290, 90);
  ctx.fillText('FÖRRÅD', 940, 390);
  ctx.fillText('BUNKER', 1790, 1490);

  // Extraction zones
  for (const ep of state.extractionPoints) {
    if (!ep.active) continue;
    ctx.save();
    const pulse = 0.4 + Math.sin(state.time * 3) * 0.2;
    
    // Pulsing circle
    ctx.beginPath();
    ctx.arc(ep.pos.x, ep.pos.y, ep.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(60, 200, 80, ${pulse * 0.1})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(60, 200, 80, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow and label
    ctx.fillStyle = `rgba(60, 200, 80, ${pulse})`;
    ctx.font = '11px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ep.name, ep.pos.x, ep.pos.y - ep.radius - 10);
    ctx.font = '16px sans-serif';
    ctx.fillText('🚁', ep.pos.x, ep.pos.y + 5);
    ctx.restore();
  }

  // Walls with cute style
  for (const wall of state.walls) {
    // Main wall
    ctx.fillStyle = wall.color;
    ctx.beginPath();
    (ctx as any).roundRect(wall.x, wall.y, wall.w, wall.h, 2);
    ctx.fill();
    // Top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(wall.x, wall.y, wall.w, Math.min(3, wall.h));
    // Bottom shadow
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(wall.x, wall.y + wall.h - 2, wall.w, 2);
  }

  // Document pickups
  for (const dp of state.documentPickups) {
    if (dp.collected) continue;
    const bob = Math.sin(state.time * 3 + dp.pos.x) * 3;
    const glow = 0.3 + Math.sin(state.time * 2) * 0.15;
    
    // Glow
    ctx.beginPath();
    ctx.arc(dp.pos.x, dp.pos.y + bob, 18, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(80, 160, 255, ${glow * 0.15})`;
    ctx.fill();
    
    // Document icon
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📄', dp.pos.x, dp.pos.y + bob + 6);
    
    // Label
    ctx.fillStyle = `rgba(100, 180, 255, ${glow + 0.3})`;
    ctx.font = '8px "Share Tech Mono", monospace';
    ctx.fillText('DOKUMENT', dp.pos.x, dp.pos.y + bob - 14);
  }

  // Loot containers with cute style
  for (const lc of state.lootContainers) {
    if (lc.looted) {
      ctx.fillStyle = '#2a2a22';
      ctx.beginPath();
      (ctx as any).roundRect(lc.pos.x - lc.size / 2, lc.pos.y - lc.size / 2, lc.size, lc.size, 3);
      ctx.fill();
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📦', lc.pos.x, lc.pos.y + 4);
    } else {
      const bob = Math.sin(state.time * 2 + lc.pos.x) * 2;
      const icons = { crate: '📦', body: '💀', cabinet: '🗄️', barrel: '🛢️' };
      
      // Glow ring
      ctx.beginPath();
      ctx.arc(lc.pos.x, lc.pos.y + bob, lc.size * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200, 180, 60, 0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(200, 180, 60, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(icons[lc.type], lc.pos.x, lc.pos.y + bob + 5);
      
      ctx.fillStyle = 'rgba(200, 180, 60, 0.6)';
      ctx.font = '7px "Share Tech Mono", monospace';
      ctx.fillText(lc.type.toUpperCase(), lc.pos.x, lc.pos.y + bob - 12);
    }
  }

  // Dead enemies - cute ghost
  for (const enemy of state.enemies) {
    if (enemy.state !== 'dead') continue;
    ctx.save();
    ctx.translate(enemy.pos.x, enemy.pos.y);
    ctx.globalAlpha = 0.4;
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    const floatUp = Math.sin(state.time * 2) * 3;
    ctx.fillText('👻', 0, floatUp + 4);
    ctx.restore();
  }

  // Living enemies - cute military characters
  for (const enemy of state.enemies) {
    if (enemy.state === 'dead') continue;
    
    const isBlinking = enemy.eyeBlink < 0.15;
    const configs = {
      scav: { body: '#8a8a6a', outline: '#6a6a4a', eye: '#333', hat: 'bandana' as const, hatColor: '#5a6a4a' },
      soldier: { body: '#5a7a4a', outline: '#4a6a3a', eye: '#222', hat: 'helmet' as const, hatColor: '#4a5a3a' },
      heavy: { body: '#7a5a4a', outline: '#5a4a3a', eye: '#211', hat: 'ushanka' as const, hatColor: '#6a4a3a' },
    }[enemy.type];

    drawCuteCharacter(
      ctx, enemy.pos.x, enemy.pos.y, enemy.angle,
      configs.body, configs.outline, configs.eye, isBlinking,
      configs.hat, configs.hatColor, true, enemy.type === 'heavy' ? R + 3 : R
    );

    // Alert/Attack emoji
    if (enemy.state === 'chase') {
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('❗', enemy.pos.x, enemy.pos.y - R - 8);
    } else if (enemy.state === 'attack') {
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💢', enemy.pos.x, enemy.pos.y - R - 8);
    } else if (enemy.state === 'patrol') {
      // Zzz for patrol
      const zzAlpha = 0.3 + Math.sin(state.time * 2) * 0.2;
      ctx.globalAlpha = zzAlpha;
      ctx.font = '8px sans-serif';
      ctx.fillText('💤', enemy.pos.x + R, enemy.pos.y - R - 4);
      ctx.globalAlpha = 1;
    }

    // HP bar for damaged enemies
    if (enemy.hp < enemy.maxHp) {
      const barW = 26;
      const ratio = enemy.hp / enemy.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      (ctx as any).roundRect(enemy.pos.x - barW / 2 - 1, enemy.pos.y - R - 18, barW + 2, 5, 2);
      ctx.fill();
      ctx.fillStyle = ratio > 0.5 ? '#7aaa5a' : ratio > 0.25 ? '#aa8a3a' : '#aa3a3a';
      ctx.beginPath();
      (ctx as any).roundRect(enemy.pos.x - barW / 2, enemy.pos.y - R - 17, barW * ratio, 3, 1);
      ctx.fill();
    }
  }

  // Particles
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Bullets
  for (const b of state.bullets) {
    ctx.fillStyle = b.fromPlayer ? '#ffcc44' : '#ff5544';
    ctx.beginPath();
    ctx.arc(b.pos.x, b.pos.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Glow
    ctx.beginPath();
    ctx.arc(b.pos.x, b.pos.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = b.fromPlayer ? 'rgba(255,200,60,0.2)' : 'rgba(255,80,60,0.2)';
    ctx.fill();
    // Trail
    ctx.strokeStyle = b.fromPlayer ? 'rgba(255,200,60,0.15)' : 'rgba(255,80,60,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.pos.x, b.pos.y);
    ctx.lineTo(b.pos.x - b.vel.x * 4, b.pos.y - b.vel.y * 4);
    ctx.stroke();
  }

  // Player glow (visibility aid)
  ctx.save();
  const glowPulse = 0.3 + Math.sin(state.time * 2) * 0.1;
  ctx.beginPath();
  ctx.arc(state.player.pos.x, state.player.pos.y, R + 12, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(120, 220, 80, ${glowPulse * 0.15})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(120, 220, 80, ${glowPulse})`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Player - cute military character (brighter for visibility)
  const playerBlink = Math.sin(state.time * 0.8) > 0.95;
  drawCuteCharacter(
    ctx, state.player.pos.x, state.player.pos.y, state.player.angle,
    '#b0d888', '#88bb66', '#2a3a1a', playerBlink,
    'beret', '#7a5040', true, R + 2
  );

  // Player name tag
  ctx.fillStyle = 'rgba(180, 240, 120, 0.9)';
  ctx.font = 'bold 10px "Share Tech Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('▼ DU ▼', state.player.pos.x, state.player.pos.y - R - 16);

  // Bleeding indicator
  if (state.player.bleedRate > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(state.player.pos.x, state.player.pos.y, R + 6, 0, Math.PI * 2);
    const pulseAlpha = 0.15 + Math.sin(state.time * 8) * 0.1;
    ctx.strokeStyle = `rgba(220, 50, 50, ${pulseAlpha})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Interaction prompts
  for (const lc of state.lootContainers) {
    if (!lc.looted && dist2d(state.player.pos, lc.pos) < 50) {
      ctx.fillStyle = 'rgba(200, 180, 60, 0.8)';
      ctx.font = '9px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[E] LETA', lc.pos.x, lc.pos.y + lc.size);
    }
  }
  for (const dp of state.documentPickups) {
    if (!dp.collected && dist2d(state.player.pos, dp.pos) < 50) {
      ctx.fillStyle = 'rgba(100, 180, 255, 0.8)';
      ctx.font = '9px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[E] LÄS', dp.pos.x, dp.pos.y + 22);
    }
  }

  ctx.restore(); // camera transform

  // Vignette
  const gradient = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Damage flash
  if (state.player.hp < 30) {
    const alpha = 0.08 + Math.sin(state.time * 5) * 0.04;
    ctx.fillStyle = `rgba(150, 20, 20, ${alpha})`;
    ctx.fillRect(0, 0, w, h);
  }

  // Scanlines (subtle)
  ctx.fillStyle = 'rgba(0,0,0,0.02)';
  for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1);
  }
}

function dist2d(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
