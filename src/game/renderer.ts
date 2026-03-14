import { GameState, Prop, LightSource, WindowDef, Vec2, TerrainZone } from './types';
import { isSecondaryWeapon } from './items';
import { SpatialGrid, buildSpatialGrid, collidesWithWallsGrid, TerrainGrid, buildTerrainGrid, getTerrainFast } from './spatial';
import { hasWeatherEffects, hasMuzzleFlash, hasTracerLines, hasBloodStains, hasDetailedCharacters, getRenderDistMultiplier, getDarknessFactor, getTimeOfDay, getFlashlightParams, getHitMarkers, clearOldHitMarkers } from './graphics';
import spriteConscriptUrl from '../assets/sprite-conscript.png';
import spriteSoldierUrl from '../assets/sprite-soldier.png';
import spriteScavUrl from '../assets/sprite-scav.png';
import spriteHeavyUrl from '../assets/sprite-heavy.png';
import spriteShockerUrl from '../assets/sprite-shocker.png';
import spriteRedneckUrl from '../assets/sprite-redneck.png';
import spriteCultistUrl from '../assets/sprite-cultist.png';
import spriteMinerUrl from '../assets/sprite-miner.png';
import spriteSvartaSolUrl from '../assets/sprite-svarta-sol.png';

// Render distance factor — applied to isOnScreen margins
let _rdm = 1.0;

const R = 28;
const WALL_HEIGHT = 18;

// Cached sorted arrays — only re-sort when count changes
let _sortedWalls: any[] = [];
let _sortedWallCount = -1;
let _sortedProps: Prop[] = [];
let _sortedPropCount = -1;
let _rendererWallGrid: SpatialGrid | null = null;
let _rendererWallCount = -1;
let _rendererWallGridStateRef: GameState | null = null;
let _rendererTerrainGrid: TerrainGrid | null = null;
let _rendererTerrainGridStateRef: GameState | null = null;

function getRendererWallGrid(state: GameState): SpatialGrid {
  if (!_rendererWallGrid || _rendererWallGridStateRef !== state || state.walls.length !== _rendererWallCount) {
    _rendererWallGrid = buildSpatialGrid(state.walls);
    _rendererWallCount = state.walls.length;
    _rendererWallGridStateRef = state;
  }
  return _rendererWallGrid;
}

function getRendererTerrainGrid(state: GameState): TerrainGrid {
  if (!_rendererTerrainGrid || _rendererTerrainGridStateRef !== state) {
    _rendererTerrainGrid = buildTerrainGrid(state.terrainZones, state.mapWidth, state.mapHeight);
    _rendererTerrainGridStateRef = state;
  }
  return _rendererTerrainGrid;
}

// Viewport check — is position within visible area (with margin scaled by render distance)
function isOnScreen(x: number, y: number, cx: number, cy: number, w: number, h: number, margin: number = 100): boolean {
  const m = margin * _rdm;
  return x > cx - m && x < cx + w + m && y > cy - m && y < cy + h + m;
}

// Simple LOS check for renderer using spatial grid — larger step for speed
function rendererLOS(state: GameState, a: Vec2, b: Vec2): boolean {
  const grid = getRendererWallGrid(state);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d > 600) return false; // skip LOS for very far enemies
  const steps = Math.ceil(d / 32); // step size ~32px (was 20px)
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (collidesWithWallsGrid(grid, a.x + dx * t, a.y + dy * t, 2)) return false;
  }
  return true;
}

// Shared animation time — set once per frame, avoids Date.now() per character
let _frameTime = 0;
export function setFrameTime(t: number) { _frameTime = t; }

// Simple LOD character for distant enemies — ~5 draw calls vs ~40
function drawSimpleCharacter(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, angle: number,
  bodyColor: string, outlineColor: string,
  size: number = R
) {
  // No save/restore — manually reset. Faster on Firefox.
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x + 1, y + size * 0.7, size * 0.4, size * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body circle
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Direction indicator
  ctx.fillStyle = outlineColor;
  ctx.beginPath();
  ctx.arc(x + Math.cos(angle) * size * 0.35, y + Math.sin(angle) * size * 0.35, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawCuteCharacter(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, angle: number,
  bodyColor: string, outlineColor: string,
  eyeColor: string, isBlinking: boolean,
  hatType: 'ushanka' | 'helmet' | 'beret' | 'bandana' | 'none',
  hatColor: string,
  hasGun: boolean,
  size: number = R,
  isMoving: boolean = true
) {
  ctx.save();
  ctx.translate(x, y);

  const headR = size * 0.30; // smaller, proportional head
  const torsoW = size * 0.65;
  const torsoH = size * 0.60;
  const legW = size * 0.16;
  const legH = size * 0.48;
  const armW = size * 0.13;
  const armH = size * 0.42;
  const shoulderOff = torsoW * 0.44;

  // Drop shadow — subtle, elongated
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(1, size * 0.9, size * 0.45, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // === LEGS ===
  const walkPhase = (_frameTime * 2.5) % 1;
  const legSwing = isMoving ? Math.sin(walkPhase * Math.PI * 2) * 0.3 : 0;
  ctx.fillStyle = shadeColor(bodyColor, -20);
  for (const side of [-1, 1]) {
    const lx = legW * 1.2 * side;
    const ly = torsoH * 0.32;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(legSwing * side);
    ctx.fillRect(-legW / 2, 0, legW, legH * 0.95);
    // Boot — darker, angular
    ctx.fillStyle = '#2a2a24';
    ctx.fillRect(-legW * 0.55, legH * 0.85, legW * 1.1, legH * 0.2);
    ctx.fillStyle = shadeColor(bodyColor, -20);
    ctx.restore();
  }

  // === GUN ARM ===
  if (hasGun) {
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = shadeColor(bodyColor, -8);
    ctx.fillRect(shoulderOff - armW / 2, -armH * 0.1, armW, armH * 0.8);
    // Gloved hand
    ctx.fillStyle = '#3a3a30';
    ctx.fillRect(shoulderOff - 3, armH * 0.6, 6, 5);
    // Gun barrel — matte metal
    ctx.fillStyle = '#4a4a44';
    const gunX = shoulderOff - 3;
    const gunY = armH * 0.55;
    ctx.fillRect(gunX, gunY - 2, size * 0.85, 4);
    ctx.fillStyle = '#2a2a28';
    ctx.fillRect(gunX + size * 0.8, gunY - 1.5, 5, 3);
    ctx.restore();
  }

  // === TORSO — angular, tactical vest look ===
  ctx.save();
  ctx.rotate(angle);
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-torsoW / 2, -torsoH * 0.35, torsoW, torsoH, [3, 3, 1, 1]);
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Vest detail — horizontal strap
  ctx.fillStyle = shadeColor(bodyColor, -12);
  ctx.fillRect(-torsoW * 0.38, -torsoH * 0.05, torsoW * 0.76, 3);
  // Belt
  ctx.fillStyle = '#3a3a2e';
  ctx.fillRect(-torsoW * 0.4, torsoH * 0.42, torsoW * 0.8, 3.5);

  // Off-arm
  ctx.fillStyle = shadeColor(bodyColor, -8);
  ctx.fillRect(-shoulderOff - armW / 2, -armH * 0.05, armW, armH * 0.7);
  ctx.fillStyle = '#3a3a30';
  ctx.fillRect(-shoulderOff - 3, armH * 0.55, 6, 5);
  ctx.restore();

  // === HEAD — smaller, more proportional ===
  ctx.save();
  ctx.translate(0, -torsoH * 0.48);
  // Neck
  ctx.fillStyle = '#c8a882';
  ctx.fillRect(-3.5, headR * 0.5, 7, 7);
  // Head
  ctx.fillStyle = '#c8a882';
  ctx.beginPath();
  ctx.arc(0, 0, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a88a6a';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Face — small, angular, no sparkles
  const facingLeft = Math.abs(angle) > Math.PI * 0.5;
  ctx.save();
  if (facingLeft) ctx.scale(-1, 1);
  if (isBlinking) {
    ctx.strokeStyle = eyeColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(headR * 0.2, -headR * 0.12);
    ctx.lineTo(headR * 0.45, -headR * 0.12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(headR * 0.2, headR * 0.15);
    ctx.lineTo(headR * 0.45, headR * 0.15);
    ctx.stroke();
  } else {
    const eyeX = headR * 0.35;
    const eyeYOff = headR * 0.15;
    for (const ey of [-eyeYOff, eyeYOff]) {
      // Small, sharp eyes — no white, no sparkle
      ctx.fillStyle = eyeColor;
      ctx.beginPath();
      ctx.ellipse(eyeX, ey, 2.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Pupil dot
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.arc(eyeX + 0.8, ey, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore(); // face

  // === HAT — grittier ===
  if (hatType !== 'none') {
    ctx.save();
    if (facingLeft) ctx.scale(-1, 1);
    switch (hatType) {
      case 'ushanka':
        ctx.fillStyle = hatColor;
        ctx.beginPath();
        ctx.arc(0, 0, headR * 1.1, -Math.PI * 0.8, Math.PI * 0.8);
        ctx.lineTo(0, -headR * 1.1);
        ctx.closePath();
        ctx.fill();
        // Fur trim — darker
        ctx.fillStyle = shadeColor(hatColor, 12);
        ctx.beginPath();
        ctx.arc(0, 0, headR * 1.1, Math.PI * 0.55, Math.PI * 0.8);
        ctx.arc(0, 0, headR * 0.95, Math.PI * 0.8, Math.PI * 0.55, true);
        ctx.closePath();
        ctx.fill();
        // Ear flaps
        ctx.fillStyle = hatColor;
        ctx.fillRect(-headR * 1.12, -headR * 0.3, headR * 0.3, headR * 0.65);
        // Star — faded
        ctx.fillStyle = '#992222';
        ctx.font = `bold ${headR * 0.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('★', headR * 0.05, headR * -0.28);
        break;
      case 'helmet':
        ctx.fillStyle = hatColor;
        ctx.beginPath();
        ctx.arc(0, -headR * 0.05, headR * 1.15, -Math.PI * 0.85, Math.PI * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shadeColor(hatColor, -25);
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // Helmet strap
        ctx.strokeStyle = shadeColor(hatColor, -15);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, headR * 0.1, headR * 0.9, Math.PI * 0.3, Math.PI * 0.7);
        ctx.stroke();
        break;
      case 'beret':
        ctx.fillStyle = hatColor;
        ctx.beginPath();
        ctx.ellipse(-headR * 0.1, -headR * 0.65, headR * 0.85, headR * 0.35, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shadeColor(hatColor, -15);
        ctx.beginPath();
        ctx.arc(0, 0, headR * 1.0, -Math.PI * 0.5, Math.PI * 0.5);
        ctx.arc(0, 0, headR * 0.93, Math.PI * 0.5, -Math.PI * 0.5, true);
        ctx.closePath();
        ctx.fill();
        break;
      case 'bandana':
        ctx.fillStyle = hatColor;
        ctx.beginPath();
        ctx.arc(0, 0, headR * 1.02, -Math.PI * 0.7, Math.PI * 0.7);
        ctx.closePath();
        ctx.fill();
        // Knot — smaller
        ctx.beginPath();
        ctx.moveTo(-headR * 0.6, -headR * 0.3);
        ctx.quadraticCurveTo(-headR * 1.2, -headR * 0.5, -headR * 1.0, -headR * 0.1);
        ctx.lineTo(-headR * 0.65, -headR * 0.05);
        ctx.closePath();
        ctx.fill();
        break;
    }
    ctx.restore();
  }

  ctx.restore(); // head
  ctx.restore(); // main
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
    const flash = Math.sin(_frameTime * 20) * 0.5 + 0.5;
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

// Draw a wall with 3/4 perspective south face + weathering
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

  // Top edge highlight — very subtle
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(x, y, w, Math.min(h * 0.3, 4));

  // Bottom edge shadow
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  ctx.fillRect(x, y + h - 2, w, 2);

  // Weathering — dirt stain at base of south face
  ctx.fillStyle = 'rgba(30,25,15,0.08)';
  ctx.fillRect(x, y + h + WALL_HEIGHT - 4, w, 4);

  // Surface texture — subtle horizontal lines for brickwork/panels
  if (w > 20 && h > 8) {
    ctx.strokeStyle = 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 0.5;
    const lines = Math.floor(h / 8);
    for (let i = 1; i < lines; i++) {
      const ly = y + i * (h / lines);
      ctx.beginPath();
      ctx.moveTo(x + 1, ly);
      ctx.lineTo(x + w - 1, ly);
      ctx.stroke();
    }
  }

  // Edge line — darker
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

// Cache for shadeColor — prevents repeated string parsing
const _shadeCache = new Map<string, string>();
function shadeColor(hex: string, percent: number): string {
  const key = hex + percent;
  let cached = _shadeCache.get(key);
  if (cached) return cached;
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
  cached = `rgb(${r},${g},${b})`;
  if (_shadeCache.size > 500) _shadeCache.clear(); // prevent unbounded growth
  _shadeCache.set(key, cached);
  return cached;
}

// Draw decorative prop with 3/4 perspective
function drawProp(ctx: CanvasRenderingContext2D, prop: Prop) {
  const { x, y } = prop.pos;
  const { w, h } = prop;
  const left = x - w / 2;
  const top = y - h / 2;

  ctx.save();
  switch (prop.type) {
    case 'wood_crate': {
      // South face
      ctx.fillStyle = '#7a5a30';
      ctx.fillRect(left, top + h, w, 10);
      // Top face
      ctx.fillStyle = '#9a7a48';
      ctx.fillRect(left, top, w, h);
      // Highlight — flat
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(left, top, w, h * 0.4);
      // Plank lines
      ctx.strokeStyle = 'rgba(80,50,20,0.3)';
      ctx.lineWidth = 1;
      const planks = Math.max(2, Math.floor(w / 10));
      for (let i = 1; i < planks; i++) {
        const px = left + (w / planks) * i;
        ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px, top + h); ctx.stroke();
      }
      // Cross brace
      ctx.strokeStyle = 'rgba(60,40,15,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(left + 2, top + 2); ctx.lineTo(left + w - 2, top + h - 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(left + w - 2, top + 2); ctx.lineTo(left + 2, top + h - 2); ctx.stroke();
      // Border
      ctx.strokeStyle = '#6a4a25';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(left, top, w, h);
      break;
    }
    case 'concrete_barrier': {
      // South face
      ctx.fillStyle = '#5a5a58';
      ctx.fillRect(left, top + h, w, 8);
      // Top face
      ctx.fillStyle = '#8a8a85';
      ctx.fillRect(left, top, w, h);
      // Scratches
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 3; i++) {
        const sx = left + 4 + i * (w / 3);
        ctx.beginPath(); ctx.moveTo(sx, top + 2); ctx.lineTo(sx + 6, top + h - 2); ctx.stroke();
      }
      // Yellow warning stripe
      ctx.fillStyle = 'rgba(220,180,40,0.5)';
      ctx.fillRect(left + 2, top + h - 4, w - 4, 3);
      // Border
      ctx.strokeStyle = '#6a6a65';
      ctx.lineWidth = 1;
      ctx.strokeRect(left, top, w, h);
      break;
    }
    case 'equipment_table': {
      // Table legs (shadows)
      ctx.fillStyle = '#4a4a42';
      ctx.fillRect(left + 2, top + h, 4, 10);
      ctx.fillRect(left + w - 6, top + h, 4, 10);
      // South face
      ctx.fillStyle = '#5a5a50';
      ctx.fillRect(left, top + h, w, 4);
      // Top surface
      ctx.fillStyle = '#7a7a70';
      ctx.fillRect(left, top, w, h);
      // Flat highlight instead of gradient
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(left, top, w * 0.5, h);
      // Equipment items on table
      ctx.fillStyle = '#3a5a3a';
      ctx.fillRect(left + 4, top + 3, 8, 5); // radio
      ctx.fillStyle = '#888';
      ctx.fillRect(left + 15, top + 4, 12, 3); // tool
      ctx.fillStyle = '#5a4a3a';
      ctx.fillRect(left + w - 14, top + 3, 10, 6); // box
      // Border
      ctx.strokeStyle = '#5a5a4a';
      ctx.lineWidth = 1;
      ctx.strokeRect(left, top, w, h);
      break;
    }
    case 'sandbags': {
      // Stacked semicircle sandbag wall
      ctx.fillStyle = '#8a8060';
      ctx.beginPath();
      ctx.ellipse(x, y, w / 2, h / 2 + 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a7050';
      ctx.beginPath();
      ctx.ellipse(x, y - 3, w / 2 - 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Sandbag lines
      ctx.strokeStyle = 'rgba(60,50,30,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(left + 4, y); ctx.lineTo(left + w - 4, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(left + 8, y - 4); ctx.lineTo(left + w - 8, y - 4); ctx.stroke();
      ctx.strokeStyle = '#6a6050';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, w / 2, h / 2 + 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'barrel_stack': {
      // 3 barrels in triangle formation
      const br = w * 0.35;
      for (const [bx, by] of [[x - br * 0.6, y + br * 0.3], [x + br * 0.6, y + br * 0.3], [x, y - br * 0.4]]) {
        ctx.fillStyle = '#5a6a58';
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4a5a48';
        ctx.beginPath(); ctx.arc(bx, by, br - 2, 0, Math.PI * 2); ctx.fill();
        // Rim highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(bx, by, br - 1, -0.5, 0.5); ctx.stroke();
        // Label
        ctx.fillStyle = 'rgba(200,180,40,0.4)';
        ctx.font = `bold ${br * 0.8}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('☢', bx, by + br * 0.3);
      }
      break;
    }
    case 'metal_shelf': {
      // Vertical shelf unit
      ctx.fillStyle = '#5a5a55';
      ctx.fillRect(left, top, w, h);
      // South face
      ctx.fillStyle = '#4a4a42';
      ctx.fillRect(left, top + h, w, 6);
      // Shelves
      const shelves = Math.max(2, Math.floor(h / 18));
      for (let i = 1; i < shelves; i++) {
        const sy = top + (h / shelves) * i;
        ctx.fillStyle = '#6a6a60';
        ctx.fillRect(left + 1, sy - 1, w - 2, 3);
        // Random items on shelf
        ctx.fillStyle = `rgba(${80 + i * 30}, ${70 + i * 20}, ${50 + i * 15}, 0.6)`;
        ctx.fillRect(left + 3, sy - 8, 6, 7);
        ctx.fillRect(left + w - 10, sy - 6, 7, 5);
      }
      ctx.strokeStyle = '#4a4a40';
      ctx.lineWidth = 1;
      ctx.strokeRect(left, top, w, h);
      break;
    }
    case 'tree': {
      // Deciduous tree — brown trunk + green canopy
      ctx.fillStyle = '#5a4030';
      ctx.fillRect(x - 3, y - 4, 6, h * 0.5 + 8);
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(x, y + h * 0.3, w * 0.4, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Canopy
      const cr = w * 0.5;
      ctx.fillStyle = '#3a6a2a';
      ctx.beginPath(); ctx.arc(x, y - cr * 0.5, cr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a7a3a';
      ctx.beginPath(); ctx.arc(x - cr * 0.3, y - cr * 0.3, cr * 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + cr * 0.3, y - cr * 0.2, cr * 0.65, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'pine_tree': {
      // Conifer — narrow triangular shape
      ctx.fillStyle = '#4a3520';
      ctx.fillRect(x - 2, y, 4, h * 0.4 + 6);
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(x, y + h * 0.3, w * 0.3, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Layers
      const ph = w * 1.2;
      for (let layer = 0; layer < 3; layer++) {
        const ly = y - layer * (ph * 0.3);
        const lw = w * 0.5 * (1 - layer * 0.2);
        ctx.fillStyle = layer === 0 ? '#2a5a1a' : layer === 1 ? '#336a22' : '#3a7a2a';
        ctx.beginPath();
        ctx.moveTo(x - lw, ly);
        ctx.lineTo(x, ly - ph * 0.35);
        ctx.lineTo(x + lw, ly);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'bush': {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      ctx.ellipse(x, y + 3, w * 0.45, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a6a3a';
      ctx.beginPath();
      ctx.ellipse(x, y, w * 0.5, h * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a7a4a';
      ctx.beginPath();
      ctx.ellipse(x - 3, y - 2, w * 0.3, h * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'guard_booth': {
      // Small guard shack
      ctx.fillStyle = '#5a5a50';
      ctx.fillRect(left, top + h, w, 8);
      ctx.fillStyle = '#6a6a5a';
      ctx.fillRect(left, top, w, h);
      // Roof
      ctx.fillStyle = '#4a5a3a';
      ctx.fillRect(left - 3, top - 4, w + 6, 6);
      // Window
      ctx.fillStyle = 'rgba(140,180,220,0.5)';
      ctx.fillRect(left + 6, top + 6, w - 12, h * 0.3);
      // Door
      ctx.fillStyle = '#4a4a3a';
      ctx.fillRect(left + w * 0.35, top + h * 0.5, w * 0.3, h * 0.5);
      ctx.strokeStyle = '#3a3a30';
      ctx.lineWidth = 1;
      ctx.strokeRect(left, top, w, h);
      break;
    }
    case 'watchtower': {
      // Tower structure — tall with platform
      // Legs
      ctx.fillStyle = '#6a6a5a';
      ctx.fillRect(left + 2, top + 8, 4, h - 8);
      ctx.fillRect(left + w - 6, top + 8, 4, h - 8);
      // Cross braces
      ctx.strokeStyle = '#5a5a4a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(left + 4, top + h); ctx.lineTo(left + w - 4, top + 12);
      ctx.stroke();
      // Platform
      ctx.fillStyle = '#5a6a4a';
      ctx.fillRect(left - 4, top, w + 8, 10);
      // Railing
      ctx.strokeStyle = '#7a7a6a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(left - 6, top - 12, w + 12, 14);
      // Roof
      ctx.fillStyle = '#4a5a3a';
      ctx.beginPath();
      ctx.moveTo(x, top - 22);
      ctx.lineTo(left - 8, top - 10);
      ctx.lineTo(left + w + 8, top - 10);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'vehicle_wreck': {
      // Burned out vehicle
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(x, y + h * 0.4, w * 0.55, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Body
      ctx.fillStyle = '#4a4a42';
      ctx.fillRect(left, top, w, h);
      ctx.fillStyle = '#3a3a32';
      ctx.fillRect(left + 4, top + 2, w * 0.4, h - 4);
      // Windshield (broken)
      ctx.fillStyle = 'rgba(100,120,140,0.3)';
      ctx.fillRect(left + w * 0.45, top + 3, w * 0.2, h * 0.6);
      // Rust streaks
      ctx.strokeStyle = 'rgba(120,60,20,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(left + 3, top + h * 0.3); ctx.lineTo(left + w * 0.3, top + h * 0.7); ctx.stroke();
      // Wheels
      ctx.fillStyle = '#2a2a25';
      ctx.beginPath(); ctx.arc(left + 8, top + h + 2, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(left + w - 8, top + h + 2, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3a3a32';
      ctx.lineWidth = 1;
      ctx.strokeRect(left, top, w, h);
      break;
    }
    case 'gate': {
      // Metal bar gate
      ctx.fillStyle = '#7a7a6a';
      ctx.fillRect(left, top, w, h);
      // Bars
      ctx.strokeStyle = '#5a5a4a';
      ctx.lineWidth = 2;
      for (let bx = left + 8; bx < left + w; bx += 12) {
        ctx.beginPath();
        ctx.moveTo(bx, top); ctx.lineTo(bx, top + h);
        ctx.stroke();
      }
      // Posts
      ctx.fillStyle = '#5a5a4a';
      ctx.fillRect(left - 4, top - 4, 6, h + 8);
      ctx.fillRect(left + w - 2, top - 4, 6, h + 8);
      break;
    }
    case 'road_sign': {
      // Simple sign post
      ctx.fillStyle = '#6a6a5a';
      ctx.fillRect(x - 1, y - 4, 3, h + 8);
      ctx.fillStyle = '#8a3a2a';
      ctx.fillRect(x - 8, y - 12, 16, 10);
      ctx.fillStyle = '#cc4a3a';
      ctx.font = 'bold 6px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('СТОП', x, y - 5);
      break;
    }
    case 'searchlight': {
      // Searchlight on post
      ctx.fillStyle = '#5a5a4a';
      ctx.fillRect(x - 2, y, 4, 16);
      ctx.fillStyle = '#7a7a6a';
      ctx.beginPath();
      ctx.arc(x, y, w * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ddd';
      ctx.beginPath();
      ctx.arc(x, y, w * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'mine': {
      // Small landmine
      ctx.fillStyle = '#5a5a4a';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      break;
    }
    case 'mine_sign': {
      // Warning sign ⚠ MINES
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x + 8, y + 6);
      ctx.lineTo(x - 8, y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#aa0000';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#aa0000';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('☠', x, y + 4);
      // Post
      ctx.fillStyle = '#5a5a4a';
      ctx.fillRect(x - 1, y + 6, 2, 10);
      break;
    }
    case 'fence_h': case 'fence_v': {
      ctx.fillStyle = '#8a8a7a';
      ctx.fillRect(left, top, w, h);
      ctx.strokeStyle = '#6a6a5a';
      ctx.lineWidth = 1;
      ctx.strokeRect(left, top, w, h);
      break;
    }
    case 'toxic_barrel': {
      // Toxic/poison barrel — green glow
      const tbr = w * 0.45;
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(x, y + tbr * 0.5, tbr * 1.1, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a5a30';
      ctx.beginPath(); ctx.arc(x, y, tbr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a4a22';
      ctx.beginPath(); ctx.arc(x, y, tbr - 2, 0, Math.PI * 2); ctx.fill();
      // Toxic symbol
      ctx.fillStyle = '#88ff44';
      ctx.font = `bold ${tbr * 1.2}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('☠', x, y + tbr * 0.4);
      // Green glow
      // Flat glow instead of gradient
      ctx.fillStyle = 'rgba(100, 255, 50, 0.08)';
      ctx.beginPath(); ctx.arc(x, y, tbr * 1.5, 0, Math.PI * 2); ctx.fill();
      // Rim
      ctx.strokeStyle = '#5a8a40';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, tbr, 0, Math.PI * 2); ctx.stroke();
      // Dripping effect
      const drip = Math.sin(_frameTime * 3 + x) * 3;
      ctx.fillStyle = 'rgba(100, 255, 50, 0.5)';
      ctx.beginPath(); ctx.arc(x + 4, y + tbr + 2 + drip, 2, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'airplane': {
      // Parked airplane — top-down view
      ctx.save();
      ctx.translate(x, y);
      // Fuselage
      ctx.fillStyle = '#8a8a80';
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.12, h * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wings
      ctx.fillStyle = '#7a7a70';
      ctx.beginPath();
      ctx.moveTo(-w * 0.5, h * 0.05);
      ctx.lineTo(-w * 0.08, -h * 0.05);
      ctx.lineTo(w * 0.08, -h * 0.05);
      ctx.lineTo(w * 0.5, h * 0.05);
      ctx.lineTo(w * 0.08, h * 0.08);
      ctx.lineTo(-w * 0.08, h * 0.08);
      ctx.closePath();
      ctx.fill();
      // Tail
      ctx.fillStyle = '#6a6a60';
      ctx.beginPath();
      ctx.moveTo(-w * 0.18, h * 0.4);
      ctx.lineTo(0, h * 0.3);
      ctx.lineTo(w * 0.18, h * 0.4);
      ctx.lineTo(0, h * 0.45);
      ctx.closePath();
      ctx.fill();
      // Cockpit
      ctx.fillStyle = 'rgba(100, 140, 180, 0.5)';
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.3, w * 0.07, h * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // Engine circles
      ctx.fillStyle = '#5a5a50';
      ctx.beginPath(); ctx.arc(-w * 0.2, h * 0.02, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(w * 0.2, h * 0.02, 4, 0, Math.PI * 2); ctx.fill();
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      ctx.ellipse(3, 3, w * 0.5, h * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      // Star marking
      ctx.fillStyle = 'rgba(200, 50, 50, 0.4)';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', 0, 5);
      ctx.restore();
      break;
    }
    case 'fuel_depot': {
      // Fuel storage tanks — cylindrical top-down
      ctx.save();
      ctx.translate(x, y);
      // Tank 1
      ctx.fillStyle = '#6a4a3a';
      ctx.beginPath(); ctx.ellipse(-12, -6, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 1.5;
      ctx.stroke();
      // Tank 2
      ctx.fillStyle = '#7a5a4a';
      ctx.beginPath(); ctx.ellipse(12, 6, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.stroke();
      // Fuel label
      ctx.fillStyle = '#ffcc33';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('FUEL', 0, -16);
      // Hazard stripe
      ctx.fillStyle = 'rgba(255, 200, 0, 0.3)';
      ctx.fillRect(-w * 0.5, h * 0.4, w, 4);
      ctx.restore();
      break;
    }
    case 'radio_tower': {
      // Radio/comms tower — lattice structure
      ctx.save();
      ctx.translate(x, y);
      // Base
      ctx.fillStyle = '#5a5a5a';
      ctx.fillRect(-4, -4, 8, 8);
      // Tower legs
      ctx.strokeStyle = '#7a7a7a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-12, 12); ctx.lineTo(0, -18); ctx.lineTo(12, 12);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-8, 6); ctx.lineTo(8, 6);
      ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
      ctx.moveTo(-4, -6); ctx.lineTo(4, -6);
      ctx.stroke();
      // Antenna
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, -26); ctx.stroke();
      // Blink light
      const blink = Math.sin(_frameTime * 4) > 0;
      if (blink) {
        ctx.fillStyle = '#ff3333';
        ctx.beginPath(); ctx.arc(0, -26, 2, 0, Math.PI * 2); ctx.fill();
      }
      // Label
      ctx.fillStyle = '#aaa';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('📡 COMMS', 0, 20);
      ctx.restore();
      break;
    }
    case 'ammo_dump': {
      // Ammo stockpile — stacked crates with markings
      ctx.save();
      ctx.translate(x, y);
      // Bottom crates
      ctx.fillStyle = '#4a5a3a';
      ctx.fillRect(-18, -8, 16, 12);
      ctx.fillRect(2, -8, 16, 12);
      // Top crate
      ctx.fillStyle = '#5a6a4a';
      ctx.fillRect(-8, -18, 16, 12);
      // Markings
      ctx.strokeStyle = '#3a4a2a';
      ctx.lineWidth = 1;
      ctx.strokeRect(-18, -8, 16, 12);
      ctx.strokeRect(2, -8, 16, 12);
      ctx.strokeRect(-8, -18, 16, 12);
      // Ammo symbol
      ctx.fillStyle = '#ffaa33';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('💥 AMMO', 0, 16);
      ctx.restore();
      break;
    }
  }
  ctx.restore();
}

// Terrain colors — per-map palettes for distinct atmosphere
type MapPalette = {
  terrain: Record<string, [string, string]>;
  outside: string;
  ambientOverlay: string | null;
  grassDetailA: string;
  grassDetailB: string;
  dirtDetailA: string;
  concreteDetail: string;
  // New: map-specific detail generators
  waterFoam?: string;
  wallStain?: string;
  puddles?: boolean;
  debrisChance?: number; // 0-1 how much random debris
};

const MAP_PALETTES: Record<string, MapPalette> = {
  objekt47: {
    terrain: {
      grass: ['#354528', '#394a2c'],
      dirt: ['#504838', '#544c3c'],
      asphalt: ['#333332', '#373736'],
      concrete: ['#484840', '#4c4c44'],
      forest: ['#24321a', '#28361e'],
    },
    outside: '#141e10',
    ambientOverlay: null,
    grassDetailA: 'rgba(50,80,35,0.3)',
    grassDetailB: 'rgba(35,70,25,0.35)',
    dirtDetailA: 'rgba(80,65,45,0.2)',
    concreteDetail: 'rgba(70,70,60,0.12)',
    wallStain: 'rgba(40,30,20,0.08)',
    debrisChance: 0.06,
  },
  fishing_village: {
    terrain: {
      grass: ['#c8cfd6', '#bec6ce'],   // snow-covered ground
      dirt: ['#a8b0b8', '#9ea6ae'],     // frozen dirt / packed snow
      asphalt: ['#6a7078', '#5e646c'],  // icy road
      concrete: ['#8a9098', '#7e848c'], // frost-covered concrete
      forest: ['#3a4a3e', '#344438'],   // dark spruce under snow
      water: ['#1a3040', '#1e3848'],    // dark arctic water / thin ice
    },
    outside: '#2a3038',                  // dark snowy treeline
    ambientOverlay: 'rgba(180, 200, 220, 0.06)', // cold blue-grey tint
    grassDetailA: 'rgba(200,210,220,0.2)',  // snow texture variation
    grassDetailB: 'rgba(180,195,210,0.25)', // snow shadows
    dirtDetailA: 'rgba(160,170,180,0.15)',  // frost crystals
    concreteDetail: 'rgba(140,150,160,0.1)',
    waterFoam: 'rgba(200,220,240,0.12)',    // ice foam
    wallStain: 'rgba(60,70,80,0.08)',       // frost stains
    puddles: false,
    debrisChance: 0.04,
  },
  hospital: {
    terrain: {
      grass: ['#283424', '#2c3828'],
      dirt: ['#404038', '#44443c'],
      asphalt: ['#222224', '#262628'],
      concrete: ['#343434', '#383838'],
      forest: ['#1e2818', '#22301c'],
    },
    outside: '#0e140a',
    ambientOverlay: 'rgba(15, 25, 40, 0.15)',
    grassDetailA: 'rgba(35,55,28,0.22)',
    grassDetailB: 'rgba(28,45,22,0.28)',
    dirtDetailA: 'rgba(50,48,44,0.15)',
    concreteDetail: 'rgba(45,45,45,0.14)',
    wallStain: 'rgba(20,15,15,0.12)',
    puddles: true,
    debrisChance: 0.08,
  },
};

function getMapPalette(state: GameState): MapPalette {
  const mapId = (state as any)._mapId || 'objekt47';
  return MAP_PALETTES[mapId] || MAP_PALETTES.objekt47;
}

// Legacy fallback
const TERRAIN_COLORS: Record<string, [string, string]> = MAP_PALETTES.objekt47.terrain;

// Cached ground canvas — rendered once, blitted each frame
let _groundCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
let _groundMapW = 0;
let _groundMapH = 0;
let _groundMapId = '';

// Film grain noise canvas — regenerated periodically
let _grainCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
let _grainFrame = 0;
let _grainW = 0;
let _grainH = 0;

function ensureGrainCanvas(w: number, h: number) {
  // Use a smaller canvas for perf (quarter res), stretched when drawn
  const gw = Math.ceil(w / 4);
  const gh = Math.ceil(h / 4);
  if (!_grainCanvas || _grainW !== gw || _grainH !== gh) {
    try {
      _grainCanvas = new OffscreenCanvas(gw, gh);
    } catch {
      _grainCanvas = document.createElement('canvas');
      (_grainCanvas as HTMLCanvasElement).width = gw;
      (_grainCanvas as HTMLCanvasElement).height = gh;
    }
    _grainW = gw;
    _grainH = gh;
  }
  const gctx = (_grainCanvas as any).getContext('2d') as CanvasRenderingContext2D;
  const imgData = gctx.createImageData(gw, gh);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.random() * 255;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  gctx.putImageData(imgData, 0, 0);
}

function ensureGroundCanvas(state: GameState) {
  const mapId = (state as any)._mapId || 'objekt47';
  if (_groundCanvas && _groundMapW === state.mapWidth && _groundMapH === state.mapHeight && _groundMapId === mapId) return;
  _groundMapW = state.mapWidth;
  _groundMapH = state.mapHeight;
  _groundMapId = mapId;
  const palette = getMapPalette(state);
  try {
    _groundCanvas = new OffscreenCanvas(_groundMapW, _groundMapH);
  } catch {
    _groundCanvas = document.createElement('canvas');
    (_groundCanvas as HTMLCanvasElement).width = _groundMapW;
    (_groundCanvas as HTMLCanvasElement).height = _groundMapH;
  }
  const gctx = (_groundCanvas as any).getContext('2d') as CanvasRenderingContext2D;
  const terrainGrid = getRendererTerrainGrid(state);
  const tileSize = 48;
  const debrisChance = palette.debrisChance || 0.04;
  
  for (let tx = 0; tx < _groundMapW; tx += tileSize) {
    for (let ty = 0; ty < _groundMapH; ty += tileSize) {
      let terrain = getTerrainFast(terrainGrid, tx + tileSize / 2, ty + tileSize / 2);
      // Force dry dock interior floor in Fishing Village
      if (mapId === 'fishing_village' && tx >= 500 && tx < 870 && ty >= 1380 && ty < 1710) {
        terrain = 'concrete';
      }
      const tileIdx = ((tx / tileSize) + (ty / tileSize)) % 2;
      const colors = palette.terrain[terrain] || palette.terrain['grass'];
      gctx.fillStyle = tileIdx === 0 ? colors[0] : colors[1];
      gctx.fillRect(tx, ty, tileSize, tileSize);
      
      const hash = (tx * 7 + ty * 13) % 100;
      const hash2 = (tx * 11 + ty * 3) % 100;
      
      // === LARGE-SCALE NOISE — breaks up flat tiled look ===
      // Perlin-like large patches using overlapping ellipses
      const lHash = ((tx * 3 + ty * 17) % 157);
      if (lHash < 40) {
        // Darken patch — organic soil/shadow variation
        gctx.fillStyle = terrain === 'water' ? 'rgba(0,10,20,0.06)' : 'rgba(0,0,0,0.04)';
        gctx.beginPath();
        gctx.ellipse(
          tx + tileSize * 0.5 + (lHash % 20) - 10,
          ty + tileSize * 0.5 + (lHash % 15) - 7,
          tileSize * 0.6 + (lHash % 10),
          tileSize * 0.4 + (lHash % 8),
          lHash * 0.1,
          0, Math.PI * 2
        );
        gctx.fill();
      } else if (lHash > 120) {
        // Lighten patch — sun-bleached / worn areas
        gctx.fillStyle = terrain === 'water' ? 'rgba(60,100,120,0.04)' : 'rgba(255,255,255,0.025)';
        gctx.beginPath();
        gctx.ellipse(
          tx + tileSize * 0.3 + (lHash % 18),
          ty + tileSize * 0.4 + (lHash % 14),
          tileSize * 0.5 + (lHash % 12),
          tileSize * 0.35 + (lHash % 6),
          lHash * 0.15,
          0, Math.PI * 2
        );
        gctx.fill();
      }
      
      // === GRASS & FOREST — varied grass tufts, fallen leaves, undergrowth ===
      if (terrain === 'grass' || terrain === 'forest') {
        // Grass blades — more dense and varied
        if (hash < 18) {
          gctx.strokeStyle = terrain === 'forest' ? palette.grassDetailB : palette.grassDetailA;
          gctx.lineWidth = 1;
          const gx = tx + 6 + (hash % 25);
          const gy = ty + 10 + (hash % 20);
          gctx.beginPath();
          gctx.moveTo(gx, gy + 7); gctx.lineTo(gx - 1, gy); gctx.stroke();
          gctx.beginPath();
          gctx.moveTo(gx + 4, gy + 7); gctx.lineTo(gx + 6, gy - 1); gctx.stroke();
          if (hash < 10) {
            gctx.beginPath();
            gctx.moveTo(gx + 15, gy + 5); gctx.lineTo(gx + 13, gy - 2); gctx.stroke();
            gctx.beginPath();
            gctx.moveTo(gx + 22, gy + 6); gctx.lineTo(gx + 20, gy); gctx.stroke();
          }
        }
        // Darker patches — uneven ground
        if (hash2 < 8) {
          gctx.fillStyle = terrain === 'forest' ? 'rgba(15,25,10,0.12)' : 'rgba(20,30,15,0.08)';
          gctx.beginPath();
          gctx.ellipse(tx + 20 + hash2 % 15, ty + 18 + hash2 % 12, 10 + hash2 % 8, 6 + hash2 % 5, hash2 * 0.5, 0, Math.PI * 2);
          gctx.fill();
        }
        // Forest: fallen twigs, leaf litter
        if (terrain === 'forest' && hash < 12) {
          gctx.strokeStyle = 'rgba(60,45,25,0.2)';
          gctx.lineWidth = 0.8;
          const sx = tx + 5 + hash * 0.3;
          const sy = ty + 8 + hash2 * 0.3;
          gctx.beginPath();
          gctx.moveTo(sx, sy); gctx.lineTo(sx + 8 + hash % 6, sy + 3 + hash2 % 4); gctx.stroke();
        }
        // Mud patches near forest edges
        if (terrain === 'forest' && hash2 < 5) {
          gctx.fillStyle = 'rgba(50,40,28,0.15)';
          gctx.beginPath();
          gctx.ellipse(tx + 24, ty + 30, 8, 5, 0, 0, Math.PI * 2);
          gctx.fill();
        }
      }
      
      // === DIRT — pebbles, tire tracks, erosion marks ===
      if (terrain === 'dirt') {
        // Pebbles — more varied sizes
        if (hash < 12) {
          gctx.fillStyle = palette.dirtDetailA;
          const px = tx + 6 + (hash * 3) % 32;
          const py = ty + 5 + (hash * 7) % 30;
          gctx.beginPath(); gctx.arc(px, py, 1 + hash % 2, 0, Math.PI * 2); gctx.fill();
          gctx.beginPath(); gctx.arc(px + 14, py + 10, 0.8 + hash2 % 2, 0, Math.PI * 2); gctx.fill();
          if (hash < 6) {
            gctx.beginPath(); gctx.arc(px + 28, py + 4, 1.2, 0, Math.PI * 2); gctx.fill();
          }
        }
        // Tire ruts / drag marks (map-specific)
        if (hash2 < 4 && mapId === 'objekt47') {
          gctx.strokeStyle = 'rgba(40,35,25,0.12)';
          gctx.lineWidth = 2;
          gctx.beginPath();
          gctx.moveTo(tx, ty + 20 + hash % 10);
          gctx.lineTo(tx + tileSize, ty + 22 + hash % 10);
          gctx.stroke();
        }
        // Fishing village: frost crystals, snow patches
        if (mapId === 'fishing_village' && hash < 8) {
          gctx.fillStyle = 'rgba(220,230,240,0.12)';
          gctx.beginPath();
          gctx.ellipse(tx + 20 + hash % 10, ty + 25, 5 + hash % 4, 3, 0, 0, Math.PI * 2);
          gctx.fill();
        }
      }
      
      // === CONCRETE — cracks, stains, expansion joints ===
      if (terrain === 'concrete') {
        // Cracks — more complex branching
        if (hash < 8) {
          gctx.strokeStyle = palette.concreteDetail;
          gctx.lineWidth = 0.8;
          const cx = tx + 4 + (hash * 5) % 28;
          const cy = ty + 8 + (hash * 3) % 24;
          gctx.beginPath();
          gctx.moveTo(cx, cy);
          gctx.lineTo(cx + 6 + hash % 8, cy + 5 + hash % 6);
          gctx.lineTo(cx + 12 + hash % 10, cy + 2);
          gctx.stroke();
          // Branch
          if (hash < 4) {
            gctx.beginPath();
            gctx.moveTo(cx + 6, cy + 5);
            gctx.lineTo(cx + 3, cy + 12);
            gctx.stroke();
          }
        }
        // Expansion joints — grid lines
        if (hash2 < 3) {
          gctx.strokeStyle = 'rgba(0,0,0,0.06)';
          gctx.lineWidth = 0.5;
          gctx.beginPath();
          gctx.moveTo(tx, ty + tileSize / 2);
          gctx.lineTo(tx + tileSize, ty + tileSize / 2);
          gctx.stroke();
        }
        // Oil/rust stains
        if (hash < 3 && (palette.wallStain)) {
          gctx.fillStyle = palette.wallStain;
          gctx.beginPath();
          gctx.ellipse(tx + 15 + hash2 % 20, ty + 20 + hash % 15, 6 + hash % 5, 4 + hash2 % 3, hash * 0.3, 0, Math.PI * 2);
          gctx.fill();
        }
        // Hospital: blood spatter on floor
        if (mapId === 'hospital' && hash2 < 2) {
          gctx.fillStyle = 'rgba(60,15,15,0.08)';
          gctx.beginPath();
          gctx.ellipse(tx + 25, ty + 20, 4 + hash % 3, 3, hash * 0.5, 0, Math.PI * 2);
          gctx.fill();
        }
      }
      
      // === ASPHALT — road markings, potholes, cracks ===
      if (terrain === 'asphalt') {
        // Worn center line
        if (hash < 5) {
          gctx.fillStyle = 'rgba(180,160,50,0.06)';
          gctx.fillRect(tx + 20, ty, 5, tileSize);
        }
        // Pothole patches
        if (hash2 < 3) {
          gctx.fillStyle = 'rgba(25,25,22,0.15)';
          gctx.beginPath();
          gctx.ellipse(tx + 12 + hash % 20, ty + 10 + hash2 % 25, 4 + hash % 3, 3 + hash2 % 2, 0, 0, Math.PI * 2);
          gctx.fill();
        }
        // Fine cracks
        if (hash < 6) {
          gctx.strokeStyle = 'rgba(0,0,0,0.08)';
          gctx.lineWidth = 0.5;
          gctx.beginPath();
          gctx.moveTo(tx + hash % 40, ty + hash2 % 10);
          gctx.lineTo(tx + hash % 40 + 10, ty + hash2 % 10 + 20);
          gctx.stroke();
        }
      }
      
      // === WATER — waves, depth variation, foam ===
      if (terrain === 'water') {
        // Depth variation — darker patches
        if (hash2 < 15) {
          gctx.fillStyle = 'rgba(10,25,40,0.08)';
          gctx.beginPath();
          gctx.ellipse(tx + 20, ty + 24, 16, 10, hash * 0.2, 0, Math.PI * 2);
          gctx.fill();
        }
        // Wave lines
        gctx.strokeStyle = hash < 50 ? 'rgba(80,140,180,0.12)' : 'rgba(50,110,150,0.1)';
        gctx.lineWidth = 0.8;
        const wx = tx + (hash * 3) % 38;
        const wy = ty + 8 + (hash * 7) % 26;
        gctx.beginPath();
        gctx.moveTo(wx, wy);
        gctx.quadraticCurveTo(wx + 14, wy - 3, wx + 28, wy);
        gctx.stroke();
        if (hash < 35) {
          gctx.beginPath();
          gctx.moveTo(wx + 4, wy + 15);
          gctx.quadraticCurveTo(wx + 20, wy + 12, wx + 34, wy + 15);
          gctx.stroke();
        }
        // Foam near edges
        if (palette.waterFoam && hash2 < 8) {
          gctx.fillStyle = palette.waterFoam;
          gctx.beginPath();
          gctx.ellipse(tx + 10 + hash % 25, ty + hash2 % 40, 3, 1.5, 0, 0, Math.PI * 2);
          gctx.fill();
        }
      }
      
      // === PUDDLES — on applicable maps, random small water patches on dirt/concrete ===
      if (palette.puddles && hash2 < 3 && (terrain === 'dirt' || terrain === 'concrete')) {
        gctx.fillStyle = 'rgba(30,50,60,0.08)';
        gctx.beginPath();
        gctx.ellipse(tx + 18 + hash % 12, ty + 22 + hash2 % 10, 5 + hash % 4, 3, hash * 0.4, 0, Math.PI * 2);
        gctx.fill();
        // Puddle highlight
        gctx.strokeStyle = 'rgba(80,120,140,0.06)';
        gctx.lineWidth = 0.5;
        gctx.beginPath();
        gctx.arc(tx + 18 + hash % 12, ty + 21 + hash2 % 10, 3, -0.5, 0.5);
        gctx.stroke();
      }
      
      // === DEBRIS — scattered small details (map-specific) ===
      if (hash2 / 100 < debrisChance) {
        if (mapId === 'hospital' && terrain === 'concrete') {
          // Broken glass fragments
          gctx.fillStyle = 'rgba(120,140,160,0.06)';
          for (let d = 0; d < 3; d++) {
            gctx.fillRect(tx + 8 + d * 12 + hash % 5, ty + 15 + hash2 % 15, 2 + hash % 2, 1);
          }
        } else if (mapId === 'objekt47' && terrain === 'dirt') {
          // Shell casings
          gctx.fillStyle = 'rgba(140,120,60,0.1)';
          gctx.fillRect(tx + 10 + hash % 20, ty + 12 + hash2 % 20, 3, 1);
        } else if (mapId === 'fishing_village' && terrain === 'grass') {
          // Frozen twigs under snow
          gctx.strokeStyle = 'rgba(140,150,160,0.1)';
          gctx.lineWidth = 1.5;
          gctx.beginPath();
          gctx.moveTo(tx + 10 + hash % 15, ty + 20 + hash2 % 10);
          gctx.lineTo(tx + 18 + hash % 15, ty + 22 + hash2 % 10);
          gctx.stroke();
        }
      }
    }
  }
}

// Draw ground by blitting cached canvas
function drawGroundTiles(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, mapW: number, mapH: number, state: GameState) {
  ensureGroundCanvas(state);
  if (!_groundCanvas) return;
  // Only blit the visible portion
  const sx = Math.max(0, Math.floor(cx));
  const sy = Math.max(0, Math.floor(cy));
  const sw = Math.min(mapW - sx, Math.ceil(w) + 1);
  const sh = Math.min(mapH - sy, Math.ceil(h) + 1);
  if (sw <= 0 || sh <= 0) return;
  ctx.drawImage(_groundCanvas as any, sx, sy, sw, sh, sx, sy, sw, sh);
}

// ── PLAYER SKIN SYSTEM ──
export type PlayerSkin = 'anonymous' | 'operative' | 'arctic' | 'shadow' | 'admin' | 'donator';

export interface SkinInfo {
  id: PlayerSkin;
  name: string;
  icon: string;
  description: string;
  access: 'all' | 'registered' | 'admin' | 'donator';
}

export const PLAYER_SKINS: SkinInfo[] = [
  { id: 'anonymous', name: 'Conscript', icon: '👤', description: 'Standard issue. No questions asked.', access: 'all' },
  { id: 'operative', name: 'Operative', icon: '🎖️', description: 'NORDVAKT field operative — green beret, woodland camo.', access: 'registered' },
  { id: 'arctic', name: 'Arctic Fox', icon: '🦊', description: 'Winter warfare specialist — white camo, fur ushanka.', access: 'registered' },
  { id: 'shadow', name: 'Shadow', icon: '🌑', description: 'Night ops specialist — dark gear, bandana.', access: 'registered' },
  { id: 'admin', name: 'Командир', icon: '⭐', description: 'Gold-trimmed command gear. Only for NORDVAKT high command.', access: 'admin' },
  { id: 'donator', name: 'Vanguard', icon: '💎', description: 'Diamond-class operative — blue elite gear.', access: 'donator' },
];

let _playerSkin: PlayerSkin = 'anonymous';
export function setPlayerSkin(skin: PlayerSkin) { _playerSkin = skin; }

// ── SPRITE LOADING ──
const _spriteCache: Record<string, HTMLImageElement> = {};
let _spritesLoading = false;

function loadSprite(id: string, url: string): HTMLImageElement | null {
  if (_spriteCache[id]) return _spriteCache[id].complete ? _spriteCache[id] : null;
  if (_spritesLoading) return null;
  const img = new Image();
  img.src = url;
  _spriteCache[id] = img;
  return null;
}

// Pre-load all sprites
(function preloadSprites() {
  const entries: [string, string][] = [
    ['anonymous', spriteConscriptUrl],
    ['soldier', spriteSoldierUrl],
    ['scav', spriteScavUrl],
    ['heavy', spriteHeavyUrl],
    ['shocker', spriteShockerUrl],
    ['redneck', spriteRedneckUrl],
    ['cultist', spriteCultistUrl],
    ['miner_cult', spriteMinerUrl],
    ['svarta_sol', spriteSvartaSolUrl],
  ];
  for (const [id, url] of entries) {
    const img = new Image();
    img.src = url;
    _spriteCache[id] = img;
  }
})();

// ── Previous position tracking for movement direction ──
const _prevPositions = new Map<string, { x: number; y: number; moveAngle: number }>();

function getMovementInfo(entityId: string, x: number, y: number): { isMoving: boolean; moveAngle: number } {
  const prev = _prevPositions.get(entityId);
  if (!prev) {
    _prevPositions.set(entityId, { x, y, moveAngle: Math.PI / 2 }); // default facing down
    return { isMoving: false, moveAngle: Math.PI / 2 };
  }
  const dx = x - prev.x;
  const dy = y - prev.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const isMoving = dist > 0.3;
  const moveAngle = isMoving ? Math.atan2(dy, dx) : prev.moveAngle;
  prev.x = x;
  prev.y = y;
  if (isMoving) prev.moveAngle = moveAngle;
  return { isMoving, moveAngle };
}

/** Draw a sprite character with separate animated legs (facing movement direction)
 *  and upper body sprite (rotated to aim angle). */
function drawSpriteCharacter(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, angle: number,
  sprite: HTMLImageElement,
  size: number = R,
  entityId: string = 'player',
  time: number = 0,
  sprinting: boolean = false,
) {
  const { isMoving, moveAngle } = getMovementInfo(entityId, x, y);
  const drawSize = size * 2.2;

  ctx.save();
  ctx.translate(x, y);

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(2, size * 0.7, size * 0.6, size * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── LEGS ── face movement direction, animate when walking
  const legLen = size * 0.55;
  const legW = size * 0.22;
  const legSpread = size * 0.28;
  // Walk cycle: legs swing forward/back — faster when sprinting
  const legSpeed = sprinting ? 18 : 10;
  const legAmplitude = sprinting ? 0.7 : 0.5;
  const walkCycle = isMoving ? Math.sin(time * legSpeed) : 0;
  const legSwing = walkCycle * legLen * legAmplitude;

  ctx.save();
  ctx.rotate(moveAngle);
  // Two legs offset sideways, swinging along movement axis
  for (const side of [-1, 1]) {
    const swing = side * legSwing; // opposite legs swing opposite
    ctx.save();
    ctx.translate(swing, side * legSpread);
    // Leg as a rounded rectangle
    ctx.fillStyle = '#2a2a2a';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-legLen * 0.3, -legW / 2, legLen * 0.6, legW, legW * 0.4);
    ctx.fill();
    ctx.stroke();
    // Boot at the end
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.roundRect(legLen * 0.15, -legW * 0.35, legW * 0.55, legW * 0.7, 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // ── UPPER BODY (sprite) ── rotates to aim direction
  ctx.rotate(angle - Math.PI / 2);
  ctx.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);

  ctx.restore();
}

function getPlayerColors(): { body: string; outline: string; eye: string; hat: 'ushanka' | 'helmet' | 'beret' | 'bandana' | 'none'; hatColor: string } {
  switch (_playerSkin) {
    case 'admin':
      return { body: '#2a2a2a', outline: '#c8a030', eye: '#ff4444', hat: 'helmet', hatColor: '#1a1a1a' };
    case 'donator':
      return { body: '#2a3a5a', outline: '#4a7acc', eye: '#66ccff', hat: 'beret', hatColor: '#1a2a4a' };
    case 'operative':
      return { body: '#4a6a3a', outline: '#3a5a2a', eye: '#2a3a1a', hat: 'beret', hatColor: '#5a3a2a' };
    case 'arctic':
      return { body: '#c8c8cc', outline: '#9a9aa0', eye: '#4a6a8a', hat: 'ushanka', hatColor: '#b0a898' };
    case 'shadow':
      return { body: '#2a2a30', outline: '#1a1a20', eye: '#cc4444', hat: 'bandana', hatColor: '#1a1a1a' };
    case 'anonymous':
    default:
      return { body: '#6a8a4a', outline: '#4a6a2a', eye: '#1a2a1a', hat: 'beret', hatColor: '#5a3a2a' };
  }
}

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number) {
  _frameTime = state.time;
  _rdm = getRenderDistMultiplier();
  ctx.clearRect(0, 0, w, h);

  // Screenshake
  const shake = (state as any)._screenShake || 0;
  const shakeX = shake > 0 ? (Math.random() - 0.5) * shake * 8 : 0;
  const shakeY = shake > 0 ? (Math.random() - 0.5) * shake * 8 : 0;

  const cx = state.camera.x - w / 2 + shakeX;
  const cy = state.camera.y - h / 2 + shakeY;

  ctx.save();
  ctx.translate(-cx, -cy);

  // Outside area (dense forest beyond map) — map-specific color
  const palette = getMapPalette(state);
  ctx.fillStyle = palette.outside;
  ctx.fillRect(-200, -200, state.mapWidth + 400, state.mapHeight + 400);

  // Ground tiles with terrain zones
  drawGroundTiles(ctx, cx, cy, w, h, state.mapWidth, state.mapHeight, state);

  // Map identification
  const mapId = (state as any)._mapId || 'objekt47';

  // ── HOSPITAL DEPARTMENT FLOOR OVERLAYS & WALL SIGNS ──
  if (mapId === 'hospital') {
    const BX = 400, BY = 300, BW = 1600, BH = 1800;
    const deptZones = [
      // Ward West (blue-green)
      { x: BX + 10, y: BY + 10, w: 190, h: 280, color: 'rgba(40, 140, 160, 0.08)', borderColor: 'rgba(40, 140, 160, 0.25)', label: 'WARD 1', labelColor: '#4aa8b8' },
      { x: BX + 10, y: BY + 410, w: 480, h: 180, color: 'rgba(40, 140, 160, 0.06)', borderColor: 'rgba(40, 140, 160, 0.20)', label: 'WARD 2', labelColor: '#4aa8b8' },
      { x: BX + 10, y: BY + 1110, w: 480, h: 280, color: 'rgba(40, 140, 160, 0.06)', borderColor: 'rgba(40, 140, 160, 0.20)', label: 'WARD 3 — ISOLATION', labelColor: '#4aa8b8' },
      // Laboratory (toxic green)
      { x: BX + BW - 340, y: BY + 10, w: 330, h: 580, color: 'rgba(80, 180, 60, 0.07)', borderColor: 'rgba(80, 180, 60, 0.25)', label: 'LABORATORY', labelColor: '#60b840' },
      // Admin Office (amber)
      { x: BX + BW - 340, y: BY + 1110, w: 330, h: 280, color: 'rgba(200, 160, 60, 0.06)', borderColor: 'rgba(200, 160, 60, 0.22)', label: 'ADMIN OFFICE', labelColor: '#c8a040' },
      // Basement (red)
      { x: BX + 110, y: BY + 1510, w: BW - 220, h: 260, color: 'rgba(180, 40, 40, 0.08)', borderColor: 'rgba(180, 40, 40, 0.30)', label: '⚠ BASEMENT — RESTRICTED', labelColor: '#cc4444' },
      // Courtyard (natural)
      { x: BX + 510, y: BY + 610, w: 580, h: 480, color: 'rgba(80, 140, 60, 0.06)', borderColor: 'rgba(80, 140, 60, 0.18)', label: 'COURTYARD', labelColor: '#6a9a4a' },
      // Reception (warm white)
      { x: BX + BW / 2 - 190, y: BY + BH - 190, w: 380, h: 180, color: 'rgba(200, 180, 140, 0.07)', borderColor: 'rgba(200, 180, 140, 0.22)', label: 'RECEPTION', labelColor: '#c8b48c' },
      // Corridors (neutral)
      { x: BX + BW / 2 - 45, y: BY + 10, w: 90, h: 280, color: 'rgba(150, 150, 150, 0.05)', borderColor: 'rgba(150, 150, 150, 0.15)', label: '', labelColor: '' },
      { x: BX + BW / 2 - 45, y: BY + 1110, w: 90, h: 480, color: 'rgba(150, 150, 150, 0.05)', borderColor: 'rgba(150, 150, 150, 0.15)', label: '', labelColor: '' },
    ];

    for (const dz of deptZones) {
      if (!isOnScreen(dz.x + dz.w / 2, dz.y + dz.h / 2, cx, cy, w, h, Math.max(dz.w, dz.h))) continue;

      // Floor color overlay
      ctx.fillStyle = dz.color;
      ctx.fillRect(dz.x, dz.y, dz.w, dz.h);

      // Colored border strip on floor edges (like painted lines)
      ctx.strokeStyle = dz.borderColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(dz.x + 1, dz.y + 1, dz.w - 2, dz.h - 2);

      // Corner accent marks
      const cm = 12;
      ctx.lineWidth = 2;
      ctx.strokeStyle = dz.borderColor.replace(/[\d.]+\)$/, '0.5)');
      // Top-left
      ctx.beginPath(); ctx.moveTo(dz.x, dz.y + cm); ctx.lineTo(dz.x, dz.y); ctx.lineTo(dz.x + cm, dz.y); ctx.stroke();
      // Top-right
      ctx.beginPath(); ctx.moveTo(dz.x + dz.w - cm, dz.y); ctx.lineTo(dz.x + dz.w, dz.y); ctx.lineTo(dz.x + dz.w, dz.y + cm); ctx.stroke();
      // Bottom-left
      ctx.beginPath(); ctx.moveTo(dz.x, dz.y + dz.h - cm); ctx.lineTo(dz.x, dz.y + dz.h); ctx.lineTo(dz.x + cm, dz.y + dz.h); ctx.stroke();
      // Bottom-right
      ctx.beginPath(); ctx.moveTo(dz.x + dz.w - cm, dz.y + dz.h); ctx.lineTo(dz.x + dz.w, dz.y + dz.h); ctx.lineTo(dz.x + dz.w, dz.y + dz.h - cm); ctx.stroke();
    }

    // Wall-mounted department signs (rendered as small plaques on walls)
    const wallSigns = [
      // Ward signs (on west outer wall)
      { x: BX + 12, y: BY + 50, label: 'WARD 1', color: '#4aa8b8', bg: 'rgba(20, 60, 70, 0.85)' },
      { x: BX + 12, y: BY + 450, label: 'WARD 2', color: '#4aa8b8', bg: 'rgba(20, 60, 70, 0.85)' },
      { x: BX + 12, y: BY + 1140, label: 'WARD 3', color: '#4aa8b8', bg: 'rgba(20, 60, 70, 0.85)' },
      // Lab sign (on east wall)
      { x: BX + BW - 22, y: BY + 50, label: 'LAB', color: '#60b840', bg: 'rgba(30, 60, 20, 0.85)' },
      // Office sign
      { x: BX + BW - 22, y: BY + 1140, label: 'OFFICE', color: '#c8a040', bg: 'rgba(60, 50, 20, 0.85)' },
      // Basement sign (above stairs)
      { x: BX + BW / 2, y: BY + 1490, label: '⚠ BASEMENT', color: '#ff4444', bg: 'rgba(80, 20, 20, 0.9)' },
      // Reception sign (above main door)
      { x: BX + BW / 2, y: BY + BH - 210, label: 'RECEPTION', color: '#c8b48c', bg: 'rgba(60, 50, 30, 0.85)' },
      // Emergency exit north
      { x: BX + BW / 2, y: BY + 15, label: 'EXIT ↑', color: '#44cc44', bg: 'rgba(20, 50, 20, 0.85)' },
      // Courtyard
      { x: BX + 510, y: BY + 590, label: 'COURTYARD', color: '#6a9a4a', bg: 'rgba(30, 50, 20, 0.85)' },
    ];

    for (const sign of wallSigns) {
      if (!isOnScreen(sign.x, sign.y, cx, cy, w, h, 100)) continue;
      ctx.save();
      ctx.font = 'bold 7px monospace';
      const textW = ctx.measureText(sign.label).width;
      const pw = textW + 8;
      const ph = 12;
      const sx = sign.x - pw / 2;
      const sy = sign.y - ph / 2;

      // Sign background
      ctx.fillStyle = sign.bg;
      ctx.fillRect(sx, sy, pw, ph);
      // Sign border
      ctx.strokeStyle = sign.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, pw, ph);
      // Sign text
      ctx.fillStyle = sign.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sign.label, sign.x, sign.y);
      ctx.restore();
    }
  }

  // Zone labels — map-specific
  const ZONE_LABELS: Record<string, { x: number; y: number; label: string; sub: string; size: number }[]> = {
    objekt47: [
      { x: 1600, y: 1100, label: 'HANGAR', sub: 'Main Building', size: 22 },
      { x: 1300, y: 1000, label: 'HANGAR A', sub: 'West Hall', size: 14 },
      { x: 1300, y: 1400, label: 'HANGAR B', sub: 'South Hall', size: 12 },
      { x: 1600, y: 1000, label: 'CORRIDOR', sub: 'C-1', size: 10 },
      { x: 1800, y: 870, label: 'OFFICES', sub: 'Command Block', size: 13 },
      { x: 1850, y: 1300, label: 'STORAGE', sub: 'Supply Depot', size: 16 },
      { x: 1510, y: 1780, label: 'MAIN GATE', sub: 'South Entrance', size: 14 },
      { x: 500, y: 575, label: 'BARRACKS', sub: 'Quarters', size: 12 },
      { x: 1500, y: 410, label: 'COMMAND POST', sub: 'HQ', size: 12 },
      { x: 2575, y: 650, label: 'AMMO BUNKER', sub: 'East Storage', size: 11 },
      { x: 530, y: 950, label: 'MOTOR POOL', sub: 'Vehicle Bay', size: 11 },
      { x: 350, y: 330, label: 'WATCHTOWER NW', sub: '', size: 9 },
      { x: 2880, y: 330, label: 'WATCHTOWER NE', sub: '', size: 9 },
    ],
    fishing_village: [
      { x: 420, y: 550, label: 'WEST HOUSES', sub: 'Cabins', size: 14 },
      { x: 980, y: 550, label: 'EAST HOUSES', sub: 'Cabins', size: 14 },
      { x: 580, y: 380, label: 'GENERAL STORE', sub: 'Shop', size: 12 },
      { x: 750, y: 600, label: 'COUNTRY ROAD', sub: '', size: 10 },
      { x: 750, y: 1550, label: 'THE DOCK', sub: 'Harbor', size: 18 },
      { x: 450, y: 1450, label: 'WAREHOUSE', sub: '', size: 11 },
      { x: 300, y: 1300, label: 'FISHING HUT', sub: '', size: 10 },
      { x: 100, y: 150, label: 'FOREST NW', sub: '', size: 9 },
      { x: 1400, y: 150, label: 'FOREST NE', sub: '', size: 9 },
      { x: 750, y: 1750, label: 'THE SEA', sub: '', size: 16 },
    ],
    hospital: [
      { x: 1200, y: 700, label: 'THE HOSPITAL', sub: 'Main Building', size: 22 },
      { x: 1200, y: 1950, label: 'RECEPTION', sub: 'Main Entrance', size: 14 },
      { x: 600, y: 500, label: 'WARD WEST', sub: 'Patient Ward', size: 13 },
      { x: 600, y: 900, label: 'WARD 2', sub: 'Patient Ward', size: 12 },
      { x: 600, y: 1350, label: 'WARD 3', sub: 'Isolation', size: 11 },
      { x: 1850, y: 550, label: 'LABORATORY', sub: 'Research', size: 14 },
      { x: 1850, y: 1250, label: 'ADMIN OFFICE', sub: 'Office', size: 13 },
      { x: 1200, y: 870, label: 'COURTYARD', sub: 'Open Area', size: 14 },
      { x: 1200, y: 1600, label: 'BASEMENT', sub: '⚠ DANGER', size: 16 },
      { x: 1200, y: 450, label: 'CORRIDOR', sub: 'North', size: 10 },
      { x: 1200, y: 1350, label: 'CORRIDOR', sub: 'South', size: 10 },
      { x: 300, y: 2100, label: 'PARKING', sub: '', size: 11 },
      { x: 400, y: 1000, label: 'WEST ENTRANCE', sub: 'Side Door', size: 9 },
      { x: 2000, y: 1250, label: 'FIRE ESCAPE', sub: 'East', size: 9 },
    ],
  };
  const zoneLabels = ZONE_LABELS[mapId] || ZONE_LABELS.objekt47;
  const labelColor = mapId === 'hospital' ? '#a0a0a0' : '#c8c8b4';
  for (const z of zoneLabels) {
    if (!isOnScreen(z.x, z.y, cx, cy, w, h, 50)) continue;
    ctx.save();
    ctx.globalAlpha = mapId === 'hospital' ? 0.10 : 0.14;
    ctx.fillStyle = labelColor;
    ctx.font = `bold ${z.size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(z.label, z.x, z.y);
    if (z.sub) {
      ctx.globalAlpha = mapId === 'hospital' ? 0.07 : 0.09;
      ctx.font = `${Math.max(8, z.size - 6)}px sans-serif`;
      ctx.fillText(z.sub, z.x, z.y + z.size + 2);
    }
    ctx.restore();
  }


  // ── EXTRACTION ZONES — all visible, but only active one is highlighted ──
  for (const ep of state.extractionPoints) {
    if (!isOnScreen(ep.pos.x, ep.pos.y, cx, cy, w, h, ep.radius + 50)) continue;
    ctx.save();
    if (ep.active && (state as any)._exfilRevealed) {
      // Active + revealed: bright green pulsing
      const pulse = 0.5 + Math.sin(state.time * 3) * 0.3;
      ctx.beginPath();
      ctx.arc(ep.pos.x, ep.pos.y, ep.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(60, 220, 80, ${pulse * 0.15})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(60, 220, 80, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = `rgba(60, 220, 80, ${pulse})`;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ep.name, ep.pos.x, ep.pos.y - ep.radius - 8);
      ctx.font = '20px sans-serif';
      ctx.fillText('🚁', ep.pos.x, ep.pos.y + 6);

      // Extraction progress bar
      if (state.extractionProgress > 0) {
        const barW = 60;
        const barH = 6;
        const barX = ep.pos.x - barW / 2;
        const barY = ep.pos.y + ep.radius + 10;
        const progress = Math.min(1, state.extractionProgress / ep.timer);
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        // Fill
        ctx.fillStyle = `rgba(60, 220, 80, ${0.7 + Math.sin(state.time * 6) * 0.3})`;
        ctx.fillRect(barX, barY, barW * progress, barH);
        // Border
        ctx.strokeStyle = 'rgba(60, 220, 80, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);
        // Percentage text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.floor(progress * 100)}%`, ep.pos.x, barY + barH + 12);
      }
    } else {
      // Unknown / inactive: dim marker
      ctx.beginPath();
      ctx.arc(ep.pos.x, ep.pos.y, ep.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(150, 150, 150, 0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(150, 150, 150, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(150, 150, 150, 0.4)';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ep.name, ep.pos.x, ep.pos.y - ep.radius - 8);
      ctx.font = '16px sans-serif';
      ctx.fillText('❓', ep.pos.x, ep.pos.y + 5);
    }
    ctx.restore();
  }

  // ── WINDOWS on walls — viewport culled, no gradients for perf ──
  for (const win of state.windows) {
    if (!isOnScreen(win.x + win.w / 2, win.y + win.h / 2, cx, cy, w, h, 100)) continue;
    // Window frame + glass (flat colors instead of gradients)
    ctx.fillStyle = 'rgba(160, 200, 240, 0.4)';
    ctx.fillRect(win.x, win.y, win.w, win.h);
    // Frame border
    ctx.strokeStyle = '#4a5a6a';
    ctx.lineWidth = 2;
    ctx.strokeRect(win.x, win.y, win.w, win.h);
    // Cross bar
    ctx.strokeStyle = '#5a6a7a';
    ctx.lineWidth = 1;
    if (win.w > win.h) {
      ctx.beginPath();
      ctx.moveTo(win.x + win.w / 2, win.y);
      ctx.lineTo(win.x + win.w / 2, win.y + win.h);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(win.x, win.y + win.h / 2);
      ctx.lineTo(win.x + win.w, win.y + win.h / 2);
      ctx.stroke();
    }
    // Light shaft — simple flat rect instead of gradient
    const shaftLen = 80;
    let sx = win.x, sy = win.y, sw = win.w, sh = win.h;
    if (win.direction === 'north') { sy += win.h; sh = shaftLen; }
    else if (win.direction === 'south') { sy -= shaftLen; sh = shaftLen; }
    else if (win.direction === 'west') { sx += win.w; sw = shaftLen; }
    else if (win.direction === 'east') { sx -= shaftLen; sw = shaftLen; }
    ctx.fillStyle = 'rgba(180, 210, 255, 0.06)';
    ctx.fillRect(sx, sy, sw, sh);
  }

  // ── WALLS (3D perspective) — cached sort, viewport culled ──
  if (state.walls.length !== _sortedWallCount) {
    _sortedWalls = [...state.walls].sort((a: any, b: any) => a.y - b.y);
    _sortedWallCount = state.walls.length;
  }
  for (const wall of _sortedWalls) {
    // Viewport cull — skip walls entirely off screen
    if (wall.x + wall.w < cx - 20 || wall.x > cx + w + 20 || wall.y + wall.h + WALL_HEIGHT < cy - 20 || wall.y > cy + h + 20) continue;
    drawWall3D(ctx, wall.x, wall.y, wall.w, wall.h, wall.color);
  }

  // ── PROPS (decorative structures) — cached sort, viewport culled ──
  if (state.props.length !== _sortedPropCount) {
    _sortedProps = [...state.props].sort((a, b) => a.pos.y - b.pos.y);
    _sortedPropCount = state.props.length;
  }
  for (const prop of _sortedProps) {
    if (!isOnScreen(prop.pos.x, prop.pos.y, cx, cy, w, h, 60)) continue;
    drawProp(ctx, prop);
  }

  // ── ALARM PANELS — viewport culled ──
  for (const panel of state.alarmPanels) {
    if (!isOnScreen(panel.pos.x, panel.pos.y, cx, cy, w, h, 40)) continue;
    const px = panel.pos.x;
    const py = panel.pos.y;

    // Panel base
    ctx.save();
    ctx.fillStyle = panel.hacked ? '#3a5a3a' : panel.activated ? '#8a2a2a' : '#4a4a55';
    ctx.fillRect(px - 14, py - 18, 28, 36);
    ctx.strokeStyle = panel.hacked ? '#5a8a5a' : panel.activated ? '#cc4444' : '#6a6a75';
    ctx.lineWidth = 2;
    ctx.strokeRect(px - 14, py - 18, 28, 36);

    // Screen
    if (panel.activated && !panel.hacked) {
      const flash = Math.sin(state.time * 8) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(255, 40, 40, ${0.4 + flash * 0.4})`;
      ctx.fillRect(px - 10, py - 14, 20, 16);
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255, 200, 200, ${0.6 + flash * 0.4})`;
      ctx.fillText('🚨', px, py - 3);
    } else if (panel.hacked) {
      ctx.fillStyle = 'rgba(60, 200, 80, 0.3)';
      ctx.fillRect(px - 10, py - 14, 20, 16);
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✅', px, py - 3);
    } else {
      ctx.fillStyle = 'rgba(80, 120, 180, 0.2)';
      ctx.fillRect(px - 10, py - 14, 20, 16);
      // Blinking standby dot
      const blink = Math.sin(state.time * 2) > 0 ? 1 : 0.2;
      ctx.fillStyle = `rgba(80, 180, 255, ${blink})`;
      ctx.beginPath();
      ctx.arc(px, py - 6, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hack progress bar
    if (panel.hackProgress > 0 && !panel.hacked) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(px - 12, py + 20, 24, 4);
      ctx.fillStyle = '#44ffaa';
      ctx.fillRect(px - 12, py + 20, 24 * panel.hackProgress, 4);
    }

    // Label
    ctx.fillStyle = panel.hacked ? 'rgba(80,200,100,0.6)' : panel.activated ? 'rgba(255,80,80,0.8)' : 'rgba(200,200,220,0.5)';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    const panelLabel = panel.hacked ? 'HACKED' : panel.id === 'alarm_intel' ? 'INTEL' : panel.id === 'alarm_disable' ? 'ALARM' : panel.id === 'alarm_codebook' ? 'CODES' : 'PANEL';
    ctx.fillText(panelLabel, px, py + 30);

    ctx.restore();

    // Interaction prompt
    if (!panel.hacked && dist2d(state.player.pos, panel.pos) < 70) {
      ctx.fillStyle = 'rgba(80, 255, 180, 0.9)';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      const hackLabel = panel.id === 'alarm_intel' ? '[E] HACK INTEL' : panel.id === 'alarm_disable' ? '[E] HACK ALARM' : panel.id === 'alarm_codebook' ? '[E] HACK CODES' : '[E] HACK';
      ctx.fillText(hackLabel, px, py - 24);
    }
  }

  // Alarm overlay — silent, subtle visual indicator only
  if (state.alarmActive) {
    ctx.fillStyle = 'rgba(200, 30, 30, 0.01)';
    ctx.fillRect(cx, cy, w, h);
  }

  // ── DOCUMENT PICKUPS — viewport culled ──
  for (const dp of state.documentPickups) {
    if (dp.collected) continue;
    if (!isOnScreen(dp.pos.x, dp.pos.y, cx, cy, w, h, 30)) continue;
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
    ctx.fillText('DOCUMENT', dp.pos.x, dp.pos.y + bob - 16);
  }

  // ── LOOT — viewport culled ──
  for (const lc of state.lootContainers) {
    if (!isOnScreen(lc.pos.x, lc.pos.y, cx, cy, w, h, 30)) continue;

    // === WEAPON DROPS — distinct visual ===
    if (lc.type === 'weapon_drop' && !lc.looted && lc.items.length > 0) {
      const wpn = lc.items[0];
      const bob = Math.sin(state.time * 2.5 + lc.pos.x * 0.3) * 2;
      const pulse = 0.6 + Math.sin(state.time * 3) * 0.2;

      // Ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(lc.pos.x, lc.pos.y + 8, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Weapon glow ring
      ctx.beginPath();
      ctx.arc(lc.pos.x, lc.pos.y + bob, 16, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 160, 40, ${pulse * 0.15})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 160, 40, ${pulse * 0.7})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Weapon icon
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(wpn.icon || '🔫', lc.pos.x, lc.pos.y + bob + 5);

      // Weapon name label
      ctx.fillStyle = `rgba(255, 200, 100, ${pulse + 0.2})`;
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText(wpn.name, lc.pos.x, lc.pos.y + bob - 14);

      continue; // don't draw as regular loot
    }

    // Skip looted weapon_drops entirely
    if (lc.type === 'weapon_drop' && lc.looted) continue;

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
      const icons: Record<string, string> = { crate: '📦', body: '💀', cabinet: '🗄️', barrel: '🛢️', desk: '🖥️', locker: '🔒', archive: '📁', weapon_cabinet: '🔫' };

      const isWeaponCab = lc.type === 'weapon_cabinet';
      const glowColor = isWeaponCab ? 'rgba(255, 120, 40,' : 'rgba(220, 200, 60,';
      const labelColor = isWeaponCab ? 'rgba(255, 140, 50, 0.9)' : 'rgba(220, 200, 60, 0.7)';

      // Weapon cabinets get a bigger, pulsing outer ring
      if (isWeaponCab) {
        const pulse = 0.4 + Math.sin(state.time * 3) * 0.3;
        ctx.beginPath();
        ctx.arc(lc.pos.x, lc.pos.y + bob, lc.size * 1.3, 0, Math.PI * 2);
        ctx.fillStyle = `${glowColor} ${pulse * 0.15})`;
        ctx.fill();
        ctx.strokeStyle = `${glowColor} ${pulse * 0.7})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(lc.pos.x, lc.pos.y + bob, lc.size * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `${glowColor} 0.12)`;
      ctx.fill();
      ctx.strokeStyle = `${glowColor} 0.5)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = isWeaponCab ? '22px sans-serif' : '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(icons[lc.type] || '📦', lc.pos.x, lc.pos.y + bob + 6);

      ctx.fillStyle = labelColor;
      ctx.font = isWeaponCab ? 'bold 9px sans-serif' : 'bold 8px sans-serif';
      ctx.fillText(isWeaponCab ? 'WEAPONS' : lc.type.toUpperCase(), lc.pos.x, lc.pos.y + bob - 14);
    }
  }

  // ── BLOOD STAINS — persistent ground decals ──
  if (hasBloodStains()) {
    const stains = (state as any)._bloodStains as { x: number; y: number; size: number; angle: number }[] | undefined;
    if (stains && stains.length > 0) {
      for (const s of stains) {
        if (!isOnScreen(s.x, s.y, cx, cy, w, h, 20)) continue;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);
        ctx.fillStyle = 'rgba(100, 15, 15, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 0, s.size, s.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Splatter dots
        ctx.fillStyle = 'rgba(80, 10, 10, 0.25)';
        for (let i = 0; i < 3; i++) {
          const ox = (Math.sin(s.angle * 3 + i * 2.1) * s.size * 0.8);
          const oy = (Math.cos(s.angle * 5 + i * 1.7) * s.size * 0.5);
          ctx.beginPath();
          ctx.arc(ox, oy, 1.5 + Math.abs(Math.sin(s.angle + i)) * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
    // Auto-generate blood stains for newly dead enemies
    for (const enemy of state.enemies) {
      if (enemy.state !== 'dead') continue;
      if ((enemy as any)._bloodStainAdded) continue;
      (enemy as any)._bloodStainAdded = true;
      if (!stains) continue;
      stains.push({ x: enemy.pos.x, y: enemy.pos.y, size: enemy.type === 'boss' ? 16 : 8 + Math.random() * 6, angle: Math.random() * Math.PI * 2 });
      if (stains.length > 80) stains.shift();
    }
  }

  // ── DEAD ENEMIES — viewport culled, looted enemies skipped entirely ──
  for (const enemy of state.enemies) {
    if (enemy.state !== 'dead') continue;
    if (enemy.looted) continue; // fully looted = gone from the world
    if (!isOnScreen(enemy.pos.x, enemy.pos.y, cx, cy, w, h, 30)) continue;
    ctx.save();

    if (enemy.type === 'boss') {
      // === BOSS CORPSE ===
      const bossId = (enemy as any)._bossId || 'osipovitj';
      const bossSize = R + 8;
      const hasSpeech = enemy.speechBubble && enemy.speechBubbleTimer && enemy.speechBubbleTimer > 0;
      
      // Expanding blood pool
      const deathAge = Math.min(10, state.time - ((enemy as any)._deathTime || state.time));
      if (!(enemy as any)._deathTime) (enemy as any)._deathTime = state.time;
      const poolR = 15 + Math.min(35, deathAge * 5);
      
      if (bossId === 'kravtsov') {
        // Kravtsov corpse — green-tinted blood pool (mutagen)
        ctx.fillStyle = 'rgba(40, 100, 40, 0.35)';
        ctx.beginPath();
        ctx.ellipse(enemy.pos.x, enemy.pos.y + 2, poolR, poolR * 0.6, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Normal blood on top
        ctx.fillStyle = 'rgba(120, 20, 20, 0.3)';
        ctx.beginPath();
        ctx.ellipse(enemy.pos.x + 3, enemy.pos.y, poolR * 0.6, poolR * 0.4, -0.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(enemy.pos.x, enemy.pos.y);
        ctx.rotate(enemy.angle + 0.3);
        // Lab coat body
        ctx.fillStyle = '#b0b0a8';
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, bossSize * 0.55, bossSize * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Head
        ctx.fillStyle = '#c4956a';
        ctx.beginPath();
        ctx.arc(bossSize * 0.4, bossSize * 0.15, bossSize * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#666';
        ctx.stroke();
        // Broken glasses
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bossSize * 0.45, bossSize * 0.1, 3, 0, Math.PI * 1.5);
        ctx.stroke();
        // Dropped syringe
        ctx.fillStyle = '#aaa';
        ctx.save();
        ctx.translate(bossSize * 0.2, -bossSize * 0.5);
        ctx.rotate(1.2);
        ctx.fillRect(0, -1, 14, 2);
        ctx.fillStyle = 'rgba(80,200,120,0.6)';
        ctx.fillRect(2, -0.5, 6, 1);
        ctx.restore();
        // Arms
        ctx.strokeStyle = '#c4956a';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-bossSize * 0.1, -bossSize * 0.3);
        ctx.lineTo(-bossSize * 0.5, -bossSize * 0.55);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bossSize * 0.1, bossSize * 0.3);
        ctx.lineTo(bossSize * 0.4, bossSize * 0.6);
        ctx.stroke();
        ctx.restore();

        // Nameplate
        const fadeAlpha = hasSpeech ? 1.0 : 0.6;
        ctx.globalAlpha = fadeAlpha;
        ctx.fillStyle = 'rgba(50, 180, 80, 0.9)';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('† DR. KRAVTSOV †', enemy.pos.x, enemy.pos.y + bossSize * 0.5 + 16);

      } else if (bossId === 'uzbek') {
        // Uzbek corpse — dark blood, chains scattered
        ctx.fillStyle = 'rgba(80, 10, 10, 0.5)';
        ctx.beginPath();
        ctx.ellipse(enemy.pos.x, enemy.pos.y + 2, poolR * 1.1, poolR * 0.7, 0.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(enemy.pos.x, enemy.pos.y);
        ctx.rotate(enemy.angle + 0.2);
        // Emaciated body
        ctx.fillStyle = '#5a4a3a';
        ctx.strokeStyle = '#3a2a1a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, bossSize * 0.6, bossSize * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Head
        ctx.fillStyle = '#8a7050';
        ctx.beginPath();
        ctx.ellipse(bossSize * 0.45, bossSize * 0.1, bossSize * 0.2, bossSize * 0.17, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3a2a1a';
        ctx.stroke();
        // Closed eyes (peaceful at last)
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bossSize * 0.5, bossSize * 0.05);
        ctx.lineTo(bossSize * 0.56, bossSize * 0.05);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bossSize * 0.5, bossSize * 0.15);
        ctx.lineTo(bossSize * 0.56, bossSize * 0.15);
        ctx.stroke();
        // Thin arms with broken chains
        ctx.strokeStyle = '#8a7050';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -bossSize * 0.25);
        ctx.lineTo(-bossSize * 0.4, -bossSize * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, bossSize * 0.25);
        ctx.lineTo(bossSize * 0.3, bossSize * 0.55);
        ctx.stroke();
        // Chain fragments on ground
        ctx.strokeStyle = '#777';
        ctx.lineWidth = 1.5;
        for (let c = 0; c < 4; c++) {
          const cx = -bossSize * 0.2 + c * bossSize * 0.2;
          const cy = bossSize * 0.3 + Math.sin(c * 1.5) * 5;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + 5, cy + 3);
          ctx.lineTo(cx + 3, cy + 6);
          ctx.stroke();
        }
        ctx.restore();

        // Nameplate
        const fadeAlpha = hasSpeech ? 1.0 : 0.6;
        ctx.globalAlpha = fadeAlpha;
        ctx.fillStyle = 'rgba(200, 50, 30, 0.9)';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('† УЗБЕК †', enemy.pos.x, enemy.pos.y + bossSize * 0.5 + 16);

      } else {
        // Default boss corpse
        ctx.fillStyle = 'rgba(120, 20, 20, 0.4)';
        ctx.beginPath();
        ctx.ellipse(enemy.pos.x, enemy.pos.y + 2, poolR, poolR * 0.6, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(enemy.pos.x, enemy.pos.y);
        ctx.rotate(enemy.angle + 0.3);
        ctx.fillStyle = '#3a3a4a';
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, bossSize * 0.55, bossSize * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#c4956a';
        ctx.beginPath();
        ctx.arc(bossSize * 0.4, bossSize * 0.15, bossSize * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.stroke();
        ctx.fillStyle = '#3a2828';
        ctx.beginPath();
        ctx.arc(bossSize * 0.55, bossSize * 0.1, bossSize * 0.17, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cc3333';
        ctx.font = '6px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★', bossSize * 0.55, bossSize * 0.13);
        ctx.strokeStyle = '#c4956a';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-bossSize * 0.1, -bossSize * 0.3);
        ctx.lineTo(-bossSize * 0.5, -bossSize * 0.55);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bossSize * 0.1, bossSize * 0.3);
        ctx.lineTo(bossSize * 0.4, bossSize * 0.6);
        ctx.stroke();
        ctx.fillStyle = '#444';
        ctx.save();
        ctx.translate(-bossSize * 0.5, -bossSize * 0.6);
        ctx.rotate(0.8);
        ctx.fillRect(0, -1.5, 22, 3);
        ctx.restore();
        ctx.strokeStyle = '#3a3a4a';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-bossSize * 0.35, -bossSize * 0.1);
        ctx.lineTo(-bossSize * 0.7, -bossSize * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-bossSize * 0.35, bossSize * 0.1);
        ctx.lineTo(-bossSize * 0.7, bossSize * 0.2);
        ctx.stroke();
        ctx.restore();

        const fadeAlpha = hasSpeech ? 1.0 : 0.6;
        ctx.globalAlpha = fadeAlpha;
        ctx.fillStyle = 'rgba(200, 50, 50, 0.9)';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`† ${(enemy as any)._bossTitle || 'OSIPOVITJ'} †`, enemy.pos.x, enemy.pos.y + bossSize * 0.5 + 16);
      }

      if (!enemy.looted) {
        const bob = Math.sin(state.time * 2) * 2;
        const glow = 0.5 + Math.sin(state.time * 3) * 0.2;
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(255, 200, 50, ${glow + 0.3})`;
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('⚔ SEARCH BODY ⚔', enemy.pos.x, enemy.pos.y - bossSize * 0.5 - 8 + bob);
      }
    } else if (!enemy.looted) {
      // Regular lootable corpse — pulsing loot indicator
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
      ctx.fillText('SEARCH', enemy.pos.x, enemy.pos.y + bob - 16);
    }
    ctx.restore();
  }

  // ── LIVING ENEMIES — viewport culled ──
  // Pre-calculate player-to-enemy distances and LOS once
  const playerPos = state.player.pos;
  for (const enemy of state.enemies) {
    if (enemy.state === 'dead') continue;
    if (enemy.type === 'sniper' && (enemy as any)._sniperInvisible > 0) continue;
    // Skip enemies far off screen — smaller margin, skip vision cones for far enemies
    const enemyOnScreen = isOnScreen(enemy.pos.x, enemy.pos.y, cx, cy, w, h, 200);
    if (!enemyOnScreen) continue;

    // Only show detection zone if close enough AND player can see the enemy
    const edx = playerPos.x - enemy.pos.x, edy = playerPos.y - enemy.pos.y;
    const enemyDistSq = edx * edx + edy * edy;
    // Skip vision cones entirely during active combat (chase/attack/flank) — expensive raycasting
    const enemyInCombat = enemy.state === 'chase' || enemy.state === 'attack' || enemy.state === 'flank' || enemy.state === 'suppress';
    const showVisionCone = !enemyInCombat && enemyDistSq < 160 * 160 && (enemy.state !== 'patrol' && enemy.state !== 'idle');
    const useLOD = enemyDistSq > 400 * 400; // LOD threshold — full detail within 400px
    if (showVisionCone && rendererLOS(state, playerPos, enemy.pos)) {
      ctx.save();
      const alertPulse = 0.03 + Math.sin(state.time * 1.5 + enemy.pos.x * 0.1) * 0.015;
      const fieldColor = enemy.state === 'patrol' || enemy.state === 'idle'
        ? `rgba(255, 200, 80, ${alertPulse})`
        : enemy.state === 'investigate' || enemy.state === 'alert'
        ? `rgba(255, 180, 40, ${alertPulse * 2})`
        : enemy.state === 'chase'
        ? `rgba(255, 120, 40, ${alertPulse * 2.5})`
        : `rgba(255, 50, 30, ${alertPulse * 3})`;
      const strokeColor = enemy.state === 'patrol' || enemy.state === 'idle'
        ? `rgba(255, 200, 80, ${alertPulse * 3})`
        : `rgba(255, 80, 40, ${alertPulse * 4})`;

      const DEG15 = Math.PI * (15 / 180);
      const isBodyguard = !!(enemy as any)._isBodyguard;
      const visionArc = isBodyguard ? Math.PI * 0.75 : ({
        scav: Math.PI * 0.35 - DEG15,
        soldier: Math.PI * 0.45 - DEG15,
        heavy: Math.PI * 0.6 - DEG15,
        turret: Math.PI * 0.5 - DEG15,
        sniper: Math.PI * 0.25,
        redneck: Math.PI * 0.4 - DEG15,
        dog: Math.PI * 0.6,
        cultist: Math.PI * 0.4 - DEG15,
        miner_cult: Math.PI * 0.35 - DEG15,
        svarta_sol: Math.PI * 0.5 - DEG15,
      }[enemy.type] || Math.PI * 0.45 - DEG15);
      const rearRange = isBodyguard ? 0.4 : ({
        scav: 0.15,
        soldier: 0.25,
        heavy: 0.4,
        turret: 0,
        sniper: 0.1,
        redneck: 0.2,
        dog: 0.5,
        cultist: 0.2,
        miner_cult: 0.15,
        svarta_sol: 0.3,
      }[enemy.type] || 0.25);

      // Clip vision cone to walls (non-elevated only)
      if (!enemy.elevated) {
        // Cast rays along the arc — reduced count and increased step for speed
        const rayCount = 4; // minimal rays for perf
        const startAngle = enemy.angle - visionArc;
        const endAngle = enemy.angle + visionArc;
        const grid = getRendererWallGrid(state);
        ctx.beginPath();
        ctx.moveTo(enemy.pos.x, enemy.pos.y);
        for (let r = 0; r <= rayCount; r++) {
          const a = startAngle + (endAngle - startAngle) * (r / rayCount);
          const dx = Math.cos(a);
          const dy = Math.sin(a);
          let rayLen = enemy.alertRange;
          // Step along ray — 24px steps for speed
          for (let s = 24; s <= enemy.alertRange; s += 24) {
            if (collidesWithWallsGrid(grid, enemy.pos.x + dx * s, enemy.pos.y + dy * s, 2)) { rayLen = s; break; }
          }
          ctx.lineTo(enemy.pos.x + dx * rayLen, enemy.pos.y + dy * rayLen);
        }
        ctx.closePath();
        ctx.fillStyle = fieldColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Elevated: draw normal arc (sees over walls)
        ctx.beginPath();
        ctx.moveTo(enemy.pos.x, enemy.pos.y);
        ctx.arc(enemy.pos.x, enemy.pos.y, enemy.alertRange, enemy.angle - visionArc, enemy.angle + visionArc);
        ctx.closePath();
        ctx.fillStyle = fieldColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(enemy.pos.x, enemy.pos.y, enemy.alertRange * rearRange, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 200, 80, ${alertPulse * 0.5})`;
      ctx.fill();

      if (enemy.state !== 'patrol' && enemy.state !== 'idle') {
        ctx.beginPath();
        ctx.moveTo(enemy.pos.x, enemy.pos.y);
        ctx.arc(enemy.pos.x, enemy.pos.y, enemy.shootRange, enemy.angle - visionArc, enemy.angle + visionArc);
        ctx.closePath();
        ctx.strokeStyle = `rgba(255, 50, 30, ${alertPulse * 5})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    }
    const isBlinking = enemy.eyeBlink < 0.15;

    // Draw elevated platform for wall guards — with stairs on both sides
    if (enemy.elevated && enemy.type !== 'turret') {
      ctx.save();
      const pw = 36, ph = 40;
      // Main platform body
      ctx.fillStyle = '#8a7a5a';
      ctx.fillRect(enemy.pos.x - pw / 2, enemy.pos.y - ph / 2 + 8, pw, ph);
      // Platform top
      ctx.fillStyle = '#a08a60';
      ctx.fillRect(enemy.pos.x - pw / 2 - 4, enemy.pos.y - ph / 2 + 4, pw + 8, 8);
      // Railing posts
      ctx.fillStyle = '#6a5a40';
      ctx.fillRect(enemy.pos.x - pw / 2 - 2, enemy.pos.y - ph / 2, 4, 12);
      ctx.fillRect(enemy.pos.x + pw / 2 - 2, enemy.pos.y - ph / 2, 4, 12);
      // Left stairs
      ctx.fillStyle = '#7a6a4a';
      for (let s = 0; s < 4; s++) {
        const sx = enemy.pos.x - pw / 2 - 6 - s * 4;
        const sy = enemy.pos.y + s * 5;
        const sw = 6;
        const sh = ph - s * 8;
        ctx.fillRect(sx, sy, sw, Math.max(4, sh * 0.3));
      }
      // Right stairs
      for (let s = 0; s < 4; s++) {
        const sx = enemy.pos.x + pw / 2 + s * 4;
        const sy = enemy.pos.y + s * 5;
        const sw = 6;
        const sh = ph - s * 8;
        ctx.fillRect(sx, sy, sw, Math.max(4, sh * 0.3));
      }
      // Stair railings
      ctx.strokeStyle = '#5a4a30';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(enemy.pos.x - pw / 2 - 6, enemy.pos.y - 2);
      ctx.lineTo(enemy.pos.x - pw / 2 - 22, enemy.pos.y + 18);
      ctx.moveTo(enemy.pos.x + pw / 2 + 6, enemy.pos.y - 2);
      ctx.lineTo(enemy.pos.x + pw / 2 + 22, enemy.pos.y + 18);
      ctx.stroke();
      ctx.restore();
    }

    // Draw turret tower (elevated platform + gun)
    if (enemy.type === 'turret') {
      ctx.save();
      const tw = 40, th = 44;
      // Tower base
      ctx.fillStyle = '#6a6a5a';
      ctx.fillRect(enemy.pos.x - tw / 2, enemy.pos.y - th / 2 + 10, tw, th);
      // Tower top platform
      ctx.fillStyle = '#7a7a6a';
      ctx.fillRect(enemy.pos.x - tw / 2 - 4, enemy.pos.y - th / 2 + 6, tw + 8, 8);
      // Sandbag walls around top
      ctx.fillStyle = '#8a8a6a';
      ctx.fillRect(enemy.pos.x - tw / 2 - 6, enemy.pos.y - th / 2 + 2, tw + 12, 6);
      // Tower legs/supports
      ctx.fillStyle = '#5a5a4a';
      ctx.fillRect(enemy.pos.x - tw / 2 + 2, enemy.pos.y + th / 2 - 4, 6, 12);
      ctx.fillRect(enemy.pos.x + tw / 2 - 8, enemy.pos.y + th / 2 - 4, 6, 12);
      // Ladder on one side
      ctx.fillStyle = '#7a6a4a';
      ctx.fillRect(enemy.pos.x + tw / 2 + 2, enemy.pos.y - 5, 5, 28);
      for (let r = 0; r < 5; r++) {
        ctx.fillRect(enemy.pos.x + tw / 2 + 1, enemy.pos.y - 3 + r * 6, 7, 2);
      }
      ctx.restore();
      // Draw the gun on top
      drawMountedGun(ctx, enemy.pos.x, enemy.pos.y, enemy.angle, enemy.state !== 'patrol');
    } else if (enemy.type === 'boss') {
      const bossId = (enemy as any)._bossId || 'osipovitj';
      const bossSize = R + 8;
      const phase = enemy.bossPhase || 0;
      const isProne = (enemy as any)._proneTimer > 0;
      const isMoving = enemy.state === 'chase' || enemy.state === 'attack' || enemy.state === 'flank';
      const stompBob = isMoving ? Math.sin(state.time * 8) * 2.5 : 0;
      const stompLean = isMoving ? Math.sin(state.time * 4) * 0.06 : 0;

      if (bossId === 'kravtsov') {
        // ═══ DR. KRAVTSOV — lab coat, syringe, green toxic glow ═══
        const greenGlow = 'rgba(40, 200, 80, ' + (0.12 + phase * 0.06 + Math.sin(state.time * 3) * 0.04) + ')';
        const auraR = bossSize + 18 + Math.sin(state.time * 2.5) * 6;
        ctx.beginPath();
        ctx.arc(enemy.pos.x, enemy.pos.y, auraR, 0, Math.PI * 2);
        ctx.fillStyle = greenGlow;
        ctx.fill();
        if (phase >= 1) {
          const ring2 = bossSize + 28 + Math.sin(state.time * 4) * 5;
          ctx.beginPath();
          ctx.arc(enemy.pos.x, enemy.pos.y, ring2, 0, Math.PI * 2);
          ctx.strokeStyle = phase === 2 ? 'rgba(0, 255, 60, 0.35)' : 'rgba(40, 200, 80, 0.2)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        // Dripping toxic particles
        if (phase >= 1) {
          for (let p = 0; p < 3; p++) {
            const px = enemy.pos.x + Math.sin(state.time * 3 + p * 2.1) * (bossSize + 10);
            const py = enemy.pos.y + Math.cos(state.time * 2.5 + p * 1.7) * (bossSize + 10);
            const pr = 2 + Math.sin(state.time * 5 + p) * 1;
            ctx.fillStyle = 'rgba(80, 255, 120, 0.4)';
            ctx.beginPath();
            ctx.arc(px, py, pr, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        const bodyColor = phase === 2 ? '#4a6a4a' : phase === 1 ? '#8a9a8a' : '#d8d8d0';
        const outlineColor = phase === 2 ? '#2a5a2a' : phase === 1 ? '#5a7a5a' : '#888';
        const eyeColor = phase >= 1 ? '#33ff66' : '#55cc55';

        ctx.save();
        ctx.translate(enemy.pos.x, enemy.pos.y + stompBob);
        ctx.rotate(stompLean);
        drawCuteCharacter(
          ctx, 0, 0, enemy.angle,
          bodyColor, outlineColor, eyeColor, isBlinking,
          'none', '#fff', true, bossSize, isMoving
        );
        // Lab coat overlay — white flaps
        ctx.save();
        ctx.rotate(enemy.angle);
        // Coat tails
        ctx.fillStyle = phase === 2 ? 'rgba(180,200,180,0.7)' : 'rgba(240,240,235,0.8)';
        ctx.beginPath();
        ctx.moveTo(-bossSize * 0.25, -bossSize * 0.35);
        ctx.lineTo(-bossSize * 0.6, -bossSize * 0.5);
        ctx.lineTo(-bossSize * 0.6, bossSize * 0.5);
        ctx.lineTo(-bossSize * 0.25, bossSize * 0.35);
        ctx.fill();
        // Syringe in hand
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bossSize * 0.5, bossSize * 0.1);
        ctx.lineTo(bossSize * 0.9, bossSize * 0.05);
        ctx.stroke();
        // Syringe needle
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bossSize * 0.9, bossSize * 0.05);
        ctx.lineTo(bossSize * 1.1, bossSize * 0.02);
        ctx.stroke();
        // Green liquid in syringe
        ctx.fillStyle = phase >= 1 ? 'rgba(0,255,80,0.8)' : 'rgba(80,200,120,0.6)';
        ctx.fillRect(bossSize * 0.55, bossSize * 0.03, bossSize * 0.3, 4);
        // Glasses
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        const glassX = bossSize * 0.35;
        ctx.beginPath();
        ctx.arc(glassX, -3, 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(glassX, 3, 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(glassX, 0);
        ctx.lineTo(glassX - 3, 0);
        ctx.stroke();
        ctx.restore();
        ctx.restore();

        // Fear charge indicator — glowing syringe raised above head
        const fearCharging = (enemy as any)._fearCharging || 0;
        if (fearCharging > 0) {
          const chargeProgress = 1 - (fearCharging / 1.5);
          const pulse = Math.sin(state.time * 12) * 0.3;
          // Warning circle expanding
          ctx.beginPath();
          ctx.arc(enemy.pos.x, enemy.pos.y, 30 + chargeProgress * 60, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(80, 255, 100, ${0.3 + chargeProgress * 0.4 + pulse * 0.1})`;
          ctx.lineWidth = 2 + chargeProgress * 2;
          ctx.setLineDash([6, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
          // Big syringe above head
          ctx.save();
          ctx.translate(enemy.pos.x, enemy.pos.y - bossSize - 10);
          const syringeShake = Math.sin(state.time * 15) * 2 * chargeProgress;
          ctx.translate(syringeShake, 0);
          ctx.fillStyle = `rgba(80, 255, 120, ${0.6 + chargeProgress * 0.4})`;
          ctx.font = `bold ${14 + chargeProgress * 6}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('💉', 0, 0);
          ctx.restore();
          // "CHARGING" bar
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(enemy.pos.x - 20, enemy.pos.y - bossSize - 22, 40, 5);
          ctx.fillStyle = `rgba(80, 255, 100, 0.9)`;
          ctx.fillRect(enemy.pos.x - 20, enemy.pos.y - bossSize - 22, 40 * chargeProgress, 5);
        }

        ctx.fillStyle = phase === 2 ? 'rgba(50, 255, 80, 0.9)' : phase === 1 ? 'rgba(80, 200, 100, 0.9)' : 'rgba(150, 220, 170, 0.8)';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🧪 DR. KRAVTSOV 🧪', enemy.pos.x, enemy.pos.y + bossSize + 20);
        if (phase >= 1) {
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText(phase === 2 ? '☠ БЕЗУМИЕ' : '⚠ МУТАГЕН', enemy.pos.x, enemy.pos.y + bossSize + 30);
        }

      } else if (bossId === 'uzbek') {
        // ═══ UZBEK — emaciated, hunched, chains, red hellish glow ═══
        const redGlow = 'rgba(200, 30, 20, ' + (0.10 + phase * 0.08 + Math.sin(state.time * 4) * 0.05) + ')';
        const auraR = bossSize + 16 + Math.sin(state.time * 4) * 10;
        ctx.beginPath();
        ctx.arc(enemy.pos.x, enemy.pos.y, auraR, 0, Math.PI * 2);
        ctx.fillStyle = redGlow;
        ctx.fill();
        if (phase >= 1) {
          // Flickering secondary aura
          const ring2 = bossSize + 30 + Math.sin(state.time * 7) * 8;
          ctx.beginPath();
          ctx.arc(enemy.pos.x, enemy.pos.y, ring2, 0, Math.PI * 2);
          ctx.strokeStyle = phase === 2 ? 'rgba(255, 0, 0, 0.4)' : 'rgba(200, 50, 30, 0.25)';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        const bodyColor = phase === 2 ? '#5a1a1a' : phase === 1 ? '#6a3a2a' : '#7a6a5a';
        const outlineColor = phase === 2 ? '#aa0000' : phase === 1 ? '#883322' : '#4a3a2a';
        const eyeColorUz = phase >= 1 ? '#ff2200' : '#ff6633';
        const skinColor = '#9a8060'; // weathered, dark skin

        ctx.save();
        ctx.translate(enemy.pos.x, enemy.pos.y + stompBob);
        ctx.rotate(stompLean);

        // Draw emaciated body — elongated, thin
        ctx.save();
        ctx.rotate(enemy.angle);
        const torsoW = bossSize * 0.5; // narrower than normal
        const torsoH = bossSize * 0.65; // taller
        // Torso — gaunt
        ctx.fillStyle = bodyColor;
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, torsoH, torsoW, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Ribs showing through (phase 1+)
        if (phase >= 1) {
          ctx.strokeStyle = 'rgba(0,0,0,0.2)';
          ctx.lineWidth = 1;
          for (let r = -2; r <= 2; r++) {
            ctx.beginPath();
            ctx.moveTo(-torsoH * 0.3, r * torsoW * 0.18);
            ctx.lineTo(torsoH * 0.2, r * torsoW * 0.15);
            ctx.stroke();
          }
        }
        // Head — gaunt, angular
        const headR = bossSize * 0.28;
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.ellipse(torsoH * 0.7, 0, headR, headR * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = outlineColor;
        ctx.stroke();
        // Sunken eyes — glowing
        ctx.fillStyle = eyeColorUz;
        ctx.beginPath();
        ctx.arc(torsoH * 0.8, -headR * 0.3, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(torsoH * 0.8, headR * 0.3, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Eye sockets (dark circles)
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(torsoH * 0.8, -headR * 0.3, 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(torsoH * 0.8, headR * 0.3, 4, 0, Math.PI * 2);
        ctx.stroke();
        // Mouth — grimace
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(torsoH * 0.9, 0, 3, 0.3, Math.PI - 0.3);
        ctx.stroke();

        // Long thin arms with chains
        ctx.strokeStyle = skinColor;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        // Left arm
        ctx.beginPath();
        ctx.moveTo(0, -torsoW * 0.8);
        ctx.lineTo(torsoH * 0.3, -torsoW * 1.3);
        ctx.stroke();
        // Right arm
        ctx.beginPath();
        ctx.moveTo(0, torsoW * 0.8);
        ctx.lineTo(torsoH * 0.3, torsoW * 1.3);
        ctx.stroke();
        // Chain fragments dangling from wrists
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1.5;
        for (let c = 0; c < 3; c++) {
          const cx1 = torsoH * 0.3;
          const cy1 = -torsoW * 1.3 - c * 3;
          ctx.beginPath();
          ctx.moveTo(cx1, cy1);
          ctx.lineTo(cx1 - 2 + Math.sin(state.time * 3 + c) * 2, cy1 - 4);
          ctx.stroke();
        }
        for (let c = 0; c < 3; c++) {
          const cx1 = torsoH * 0.3;
          const cy1 = torsoW * 1.3 + c * 3;
          ctx.beginPath();
          ctx.moveTo(cx1, cy1);
          ctx.lineTo(cx1 - 2 + Math.sin(state.time * 3 + c + 1) * 2, cy1 + 4);
          ctx.stroke();
        }

        // Thin legs
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-torsoH * 0.5, -torsoW * 0.3);
        ctx.lineTo(-torsoH * 0.9, -torsoW * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-torsoH * 0.5, torsoW * 0.3);
        ctx.lineTo(-torsoH * 0.9, torsoW * 0.5);
        ctx.stroke();

        ctx.restore();
        ctx.restore();

        // Nameplate
        ctx.fillStyle = phase === 2 ? 'rgba(255, 30, 30, 0.95)' : phase === 1 ? 'rgba(255, 100, 50, 0.9)' : 'rgba(200, 120, 100, 0.8)';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🩸 УЗБЕК 🩸', enemy.pos.x, enemy.pos.y + bossSize + 20);
        if (phase >= 1) {
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText(phase === 2 ? '☠ ЯРОСТЬ' : '⚠ ЦЕПИ ТРЕЩАТ', enemy.pos.x, enemy.pos.y + bossSize + 30);
        }

      } else {
        // ═══ DEFAULT BOSS rendering ═══
        // Menacing aura
        const auraColors = ['rgba(180, 60, 200, 0.12)', 'rgba(255, 80, 40, 0.18)', 'rgba(255, 30, 30, 0.25)'];
        const auraR = bossSize + 20 + Math.sin(state.time * 3) * 8;
        ctx.beginPath();
        ctx.arc(enemy.pos.x, enemy.pos.y, auraR, 0, Math.PI * 2);
        ctx.fillStyle = auraColors[phase];
        ctx.fill();
        if (phase >= 1) {
          const ring2 = bossSize + 30 + Math.sin(state.time * 5) * 5;
          ctx.beginPath();
          ctx.arc(enemy.pos.x, enemy.pos.y, ring2, 0, Math.PI * 2);
          ctx.strokeStyle = phase === 2 ? 'rgba(255, 30, 30, 0.3)' : 'rgba(255, 120, 40, 0.2)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        const bodyColor = phase === 2 ? '#8a2a2a' : phase === 1 ? '#6a3a2a' : '#4a4a5a';
        const outlineColor = phase === 2 ? '#cc3333' : phase === 1 ? '#aa5533' : '#2a2a3a';
        const eyeColor = phase >= 1 ? '#ff4422' : '#ffaa00';

        if (isProne || (enemy as any)._proneGoDownTimer > 0) {
          const goingDown = (enemy as any)._proneGoDownTimer > 0;
          const gettingUp = !goingDown && (enemy as any)._proneTimer < 1.0 && (enemy as any)._proneTimer > 0;
          const transProgress = goingDown 
            ? 1 - ((enemy as any)._proneGoDownTimer / 0.2)
            : gettingUp ? (enemy as any)._proneTimer : 1;
          const flattenY = 0.25 + (1 - transProgress) * 0.75;
          const stretchX = 1.0 + transProgress * 0.8;

          ctx.save();
          ctx.translate(enemy.pos.x, enemy.pos.y);
          ctx.rotate(enemy.angle);
          ctx.scale(stretchX, flattenY);
          ctx.fillStyle = bodyColor;
          ctx.strokeStyle = outlineColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, bossSize * 0.6, bossSize * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          const headR = bossSize * 0.25;
          ctx.fillStyle = '#d4a574';
          ctx.beginPath();
          ctx.arc(bossSize * 0.45, 0, headR, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = outlineColor;
          ctx.stroke();
          ctx.fillStyle = '#3a2828';
          ctx.beginPath();
          ctx.arc(bossSize * 0.5, 0, headR * 0.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#cc3333';
          ctx.font = `${Math.max(6, headR * 0.6)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('★', bossSize * 0.5, headR * 0.25);
          ctx.strokeStyle = '#d4a574';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(bossSize * 0.1, -bossSize * 0.3);
          ctx.lineTo(bossSize * 0.3, -bossSize * 0.55);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(bossSize * 0.1, bossSize * 0.3);
          ctx.lineTo(bossSize * 0.45, bossSize * 0.35);
          ctx.stroke();
          ctx.fillStyle = '#333';
          ctx.fillRect(bossSize * 0.4, bossSize * 0.3, bossSize * 0.3, 3);
          ctx.strokeStyle = bodyColor;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(-bossSize * 0.3, -bossSize * 0.15);
          ctx.lineTo(-bossSize * 0.65, -bossSize * 0.25);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-bossSize * 0.3, bossSize * 0.15);
          ctx.lineTo(-bossSize * 0.65, bossSize * 0.25);
          ctx.stroke();
          ctx.fillStyle = '#222';
          ctx.beginPath();
          ctx.arc(-bossSize * 0.65, -bossSize * 0.25, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(-bossSize * 0.65, bossSize * 0.25, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          ctx.fillStyle = 'rgba(255, 200, 50, 0.7)';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⬇ PRONE', enemy.pos.x, enemy.pos.y + bossSize * 0.5 + 10);
        } else {
          ctx.save();
          ctx.translate(enemy.pos.x, enemy.pos.y + stompBob);
          ctx.rotate(stompLean);
          drawCuteCharacter(
            ctx, 0, 0, enemy.angle,
            bodyColor, outlineColor, eyeColor, isBlinking,
            'ushanka', '#3a2828', true, bossSize
          );
          ctx.restore();
        }

        // Glowing eyes effect
        const glowAlpha = 0.3 + Math.sin(state.time * 4) * 0.2;
        ctx.fillStyle = `rgba(255, ${phase >= 1 ? '60' : '170'}, ${phase >= 1 ? '20' : '40'}, ${glowAlpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(enemy.pos.x, enemy.pos.y - bossSize * 0.3, bossSize * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Boss ordering arm
        if ((enemy as any)._orderingArm > 0) {
          ctx.save();
          ctx.translate(enemy.pos.x, enemy.pos.y);
          ctx.rotate(enemy.angle);
          const armWave = Math.sin(state.time * 12) * 0.15;
          ctx.strokeStyle = bodyColor;
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(bossSize * 0.3, -bossSize * 0.2);
          ctx.lineTo(bossSize * 1.2, -bossSize * 0.5 + armWave * 10);
          ctx.stroke();
          ctx.fillStyle = '#d4a574';
          ctx.beginPath();
          ctx.arc(bossSize * 1.2, -bossSize * 0.5 + armWave * 10, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 200, 50, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(bossSize * 1.2, -bossSize * 0.5 + armWave * 10);
          ctx.lineTo(bossSize * 2.5, -bossSize * 0.8);
          ctx.stroke();
          ctx.restore();
        }

        // Nachalnik spin attack visual
        if ((enemy as any)._spinAttackTimer > 0) {
          const spinAlpha = 0.35 + Math.sin(state.time * 22) * 0.15;
          const spinR = bossSize + 12;
          ctx.strokeStyle = `rgba(255, 180, 80, ${spinAlpha})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(enemy.pos.x, enemy.pos.y, spinR, state.time * 14, state.time * 14 + Math.PI * 1.4);
          ctx.stroke();
          ctx.strokeStyle = `rgba(220, 80, 40, ${spinAlpha * 0.9})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(enemy.pos.x, enemy.pos.y, spinR - 8, -state.time * 16, -state.time * 16 + Math.PI);
          ctx.stroke();
        }

        // Boss name plate
        ctx.fillStyle = phase === 2 ? 'rgba(255, 50, 50, 0.9)' : phase === 1 ? 'rgba(255, 150, 50, 0.9)' : 'rgba(200, 160, 255, 0.8)';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`★ ${(enemy as any)._bossTitle || 'BOSS'} ★`, enemy.pos.x, enemy.pos.y + bossSize + 20);
        if (phase >= 1) {
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText(phase === 2 ? '☠ DESPERAT' : '⚠ RASANDE', enemy.pos.x, enemy.pos.y + bossSize + 30);
        }
      }
    } else if (enemy.type === 'sniper') {
      // Sniper — camouflaged, prone, with scope glint
      const isAiming = enemy.state === 'attack' || enemy.state === 'chase';
      ctx.save();
      ctx.translate(enemy.pos.x, enemy.pos.y);
      ctx.rotate(enemy.angle);
      // Ghillie suit body (prone, elongated)
      ctx.fillStyle = '#4a5a3a';
      ctx.fillRect(-6, -4, 18, 8); // prone body
      // Ghillie texture
      ctx.fillStyle = '#3a4a2a';
      for (let g = 0; g < 5; g++) {
        const gx = -4 + g * 4;
        const gy = -3 + Math.sin(g * 1.5) * 2;
        ctx.fillRect(gx, gy, 3, 2);
      }
      // Rifle barrel
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(12, -1, 10, 2);
      // Scope glint when aiming
      if (isAiming) {
        const glint = 0.5 + Math.sin(state.time * 3) * 0.5;
        ctx.fillStyle = `rgba(255, 255, 200, ${glint * 0.8})`;
        ctx.beginPath();
        ctx.arc(22, 0, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // "SNIPER" label only when spotted
      if (isAiming) {
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔭 SNIPER', enemy.pos.x, enemy.pos.y - 14);
      }
    } else if (enemy.type === 'dog') {
      // Dog — small, low to ground, simple animal shape
      ctx.save();
      ctx.translate(enemy.pos.x, enemy.pos.y);
      ctx.rotate(enemy.angle);
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Body
      const dogColor = enemy.neutralized ? '#aa9977' : enemy.friendly ? '#77cc55' : '#6a4a2a';
      ctx.fillStyle = dogColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4a3020';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Head
      ctx.fillStyle = dogColor;
      ctx.beginPath();
      ctx.arc(10, -2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Ears
      ctx.fillStyle = '#5a3a1a';
      ctx.beginPath();
      ctx.ellipse(12, -6, 3, 2, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(8, -6, 3, 2, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Eye
      ctx.fillStyle = enemy.neutralized ? '#999' : '#111';
      ctx.beginPath();
      ctx.arc(12, -2, 1.5, 0, Math.PI * 2);
      ctx.fill();
      // Tail
      ctx.strokeStyle = dogColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, -1);
      ctx.quadraticCurveTo(-14, -6 + Math.sin(state.time * 8) * 3, -12, -8);
      ctx.stroke();
      // Legs (simple)
      ctx.fillStyle = '#5a3a1a';
      for (const lx of [-6, -2, 4, 8]) {
        ctx.fillRect(lx - 1, 4, 2, 4);
      }
      ctx.restore();
      // Label with name
      if (!enemy.neutralized) {
        const dogName = (enemy as any)._dogName || 'DOG';
        ctx.fillStyle = 'rgba(255,200,200,0.5)';
        ctx.font = '7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🐕 ${dogName}`, enemy.pos.x, enemy.pos.y + 18);
      }
    } else {
      const isBodyguard = !!(enemy as any)._isBodyguard;
      const isOfficer = !!(enemy as any)._isOfficer;
      const configs: Record<string, any> = {
        scav: { body: '#bb9a7a', outline: '#9a7a5a', eye: '#333', hat: 'bandana', hatColor: '#7a8a5a' },
        soldier: { body: '#7aaa5a', outline: '#5a8a3a', eye: '#222', hat: 'helmet', hatColor: '#6a7a4a' },
        heavy: { body: '#cc6a5a', outline: '#aa4a3a', eye: '#211', hat: 'ushanka', hatColor: '#9a5a4a' },
        shocker: { body: '#3a5a8a', outline: '#2a4a7a', eye: '#aaf', hat: 'helmet', hatColor: '#2244aa' },
        redneck: { body: '#8a6a4a', outline: '#6a4a2a', eye: '#331', hat: 'bandana', hatColor: '#aa5533' },
        cultist: { body: '#2a1a2a', outline: '#1a0a1a', eye: '#ff44ff', hat: 'none', hatColor: '#000' },
        miner_cult: { body: '#4a3a2a', outline: '#2a1a0a', eye: '#ffaa00', hat: 'ushanka', hatColor: '#3a2a1a' },
        svarta_sol: { body: '#1a1a2a', outline: '#0a0a1a', eye: '#ff0000', hat: 'beret', hatColor: '#0a0a0a' },
      };
      let cfg = configs[enemy.type];
      // Sleeper: skin-colored body (underwear), no hat, messy hair
      const isSleeper = !!(enemy as any)._isSleeper;
      if (isSleeper) {
        cfg = { body: '#e8c8a8', outline: '#c8a888', eye: '#555', hat: 'none', hatColor: '#000' };
      }
      // Officers: beret with badge, no helmet
      if (isOfficer) {
        cfg = { body: '#6a8a4a', outline: '#4a6a2a', eye: '#222', hat: 'beret', hatColor: '#8b0000' };
      }
      // Bodyguards: all-black tactical gear
      if (isBodyguard) {
        cfg = { body: '#1a1a1a', outline: '#000000', eye: '#444', hat: 'helmet', hatColor: '#111111' };
      }

      const enemyMoving = enemy.state === 'patrol' || enemy.state === 'chase' || enemy.state === 'investigate' || enemy.state === 'flank';
      const eSize = isBodyguard ? R + 2 : (enemy.type === 'heavy' ? R + 4 : R);
      // Try sprite first (skip for sleepers/bodyguards/officers — they use procedural)
      const enemySpriteId = (!isSleeper && !isBodyguard && !isOfficer) ? enemy.type : null;
      const enemySprite = enemySpriteId ? _spriteCache[enemySpriteId] : null;
      if (enemySprite && enemySprite.complete && enemySprite.naturalWidth > 0 && hasDetailedCharacters() && !useLOD) {
        const isSprinting = enemy.state === 'chase' || enemy.state === 'flank' || !!(enemy as any)._berserkTimer;
        drawSpriteCharacter(ctx, enemy.pos.x, enemy.pos.y, enemy.angle, enemySprite, eSize, enemy.id, state.time, isSprinting);
      } else if (useLOD) {
        drawSimpleCharacter(ctx, enemy.pos.x, enemy.pos.y, enemy.angle, cfg.body, cfg.outline, eSize);
      } else {
        const enemyMoving = enemy.state === 'patrol' || enemy.state === 'chase' || enemy.state === 'investigate' || enemy.state === 'flank';
        drawCuteCharacter(
          ctx, enemy.pos.x, enemy.pos.y, enemy.angle,
          cfg.body, cfg.outline, cfg.eye, isBlinking,
          isSleeper ? 'none' : cfg.hat, cfg.hatColor, true, eSize, enemyMoving
        );
      }
      // Sleeper label
      if (isSleeper && enemy.state === 'idle') {
        ctx.fillStyle = '#aaaaaa';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💤', enemy.pos.x, enemy.pos.y - R - 8);
      }
      // Bodyguard name labels
      if (isBodyguard) {
        ctx.fillStyle = '#aaaaaa';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        const bgName = (enemy as any)._bodyguardName || 'GUARD';
        ctx.fillText(bgName, enemy.pos.x, enemy.pos.y + R + 14);
        
        // Bodyguard healing animation — green cross + healing line to boss
        if ((enemy as any)._bgHealTimer > 0) {
          const boss = state.enemies.find(e => e.type === 'boss' && e.state !== 'dead');
          if (boss) {
            // Green line from bodyguard to boss
            const healPulse = 0.5 + Math.sin(state.time * 8) * 0.3;
            ctx.strokeStyle = `rgba(60, 255, 80, ${healPulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(enemy.pos.x, enemy.pos.y);
            ctx.lineTo(boss.pos.x, boss.pos.y);
            ctx.stroke();
          }
          // Green cross above bodyguard
          ctx.fillStyle = 'rgba(60, 255, 80, 0.9)';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('✚', enemy.pos.x, enemy.pos.y - R - 14);
          // Progress bar
          const pct = 1 - (enemy as any)._bgHealTimer;
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(enemy.pos.x - 12, enemy.pos.y - R - 6, 24, 3);
          ctx.fillStyle = '#44ff66';
          ctx.fillRect(enemy.pos.x - 12, enemy.pos.y - R - 6, 24 * pct, 3);
        }
      }
      // Shocker label with electric arc
      if (enemy.type === 'shocker') {
        const pulse = 0.6 + Math.sin(state.time * 10) * 0.4;
        ctx.fillStyle = `rgba(68, 221, 255, ${pulse})`;
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ SHOCKER', enemy.pos.x, enemy.pos.y - R - 10);
        // Walking sparks
        if (enemyMoving && Math.random() < 0.2) {
          const sparkA = Math.random() * Math.PI * 2;
          const sparkR = R + Math.random() * 5;
          ctx.strokeStyle = '#44ffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(enemy.pos.x + Math.cos(sparkA) * sparkR, enemy.pos.y + Math.sin(sparkA) * sparkR);
          ctx.lineTo(enemy.pos.x + Math.cos(sparkA) * (sparkR + 4), enemy.pos.y + Math.sin(sparkA) * (sparkR + 4));
          ctx.stroke();
        }
        // Electric arcs when close to player
        if (enemyDistSq < 3600) { // 60^2
          ctx.strokeStyle = `rgba(68, 221, 255, ${0.3 + Math.random() * 0.5})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(enemy.pos.x, enemy.pos.y);
          const mx = (enemy.pos.x + state.player.pos.x) / 2 + (Math.random() - 0.5) * 20;
          const my = (enemy.pos.y + state.player.pos.y) / 2 + (Math.random() - 0.5) * 20;
          ctx.quadraticCurveTo(mx, my, state.player.pos.x, state.player.pos.y);
          ctx.stroke();
        }
      }
      // Cultist label with occult glow
      if (enemy.type === 'cultist') {
        const pulse = 0.5 + Math.sin(state.time * 4) * 0.3;
        ctx.fillStyle = `rgba(200, 80, 255, ${pulse})`;
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔮 CULTIST', enemy.pos.x, enemy.pos.y - R - 10);
        // Purple aura
        ctx.beginPath();
        ctx.arc(enemy.pos.x, enemy.pos.y, R + 6 + Math.sin(state.time * 3) * 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(160, 40, 220, ${0.15 + Math.sin(state.time * 2) * 0.1})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // Miner cult label with amber glow
      if (enemy.type === 'miner_cult') {
        const pulse = 0.5 + Math.sin(state.time * 3) * 0.3;
        ctx.fillStyle = `rgba(255, 180, 40, ${pulse})`;
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⛏️ KULTIST', enemy.pos.x, enemy.pos.y - R - 10);
        // Amber aura
        ctx.beginPath();
        ctx.arc(enemy.pos.x, enemy.pos.y, R + 5 + Math.sin(state.time * 2.5) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(200, 140, 20, ${0.15 + Math.sin(state.time * 2) * 0.08})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // Svarta Solen label with red tactical glow
      if (enemy.type === 'svarta_sol') {
        const pulse = 0.6 + Math.sin(state.time * 6) * 0.3;
        ctx.fillStyle = `rgba(255, 40, 40, ${pulse})`;
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('☀️ SVARTA SOLEN', enemy.pos.x, enemy.pos.y - R - 10);
      }
    }

    // Status icons
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    if (enemy.stunTimer > 0) {
      // Flashbang stun effect
      const pulse = 0.6 + Math.sin(state.time * 8) * 0.4;
      ctx.globalAlpha = pulse;
      ctx.fillText('💫', enemy.pos.x, enemy.pos.y - R - 12);
      ctx.globalAlpha = 1;
      // Stun stars circling head
      for (let s = 0; s < 3; s++) {
        const sa = state.time * 4 + s * (Math.PI * 2 / 3);
        const sx = enemy.pos.x + Math.cos(sa) * 14;
        const sy = enemy.pos.y - R - 8 + Math.sin(sa) * 6;
        ctx.font = '8px sans-serif';
        ctx.fillText('⭐', sx, sy);
      }
      ctx.font = '14px sans-serif';
    } else if ((enemy as any)._panicTimer > 0) {
      // PANIC — highly visible marker above enemy
      const panicPulse = 0.5 + Math.sin(state.time * 14) * 0.5;
      ctx.save();
      // Large flashing aura
      ctx.beginPath();
      ctx.arc(enemy.pos.x, enemy.pos.y, R + 12, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, ${Math.floor(200 + panicPulse * 55)}, 0, ${0.15 + panicPulse * 0.25})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 180, 0, ${0.4 + panicPulse * 0.6})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
      // Large panic icon above head
      ctx.fillText('😱', enemy.pos.x, enemy.pos.y - R - 14);
      // "PANIC" text label below enemy
      ctx.save();
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255, ${Math.floor(160 + panicPulse * 95)}, 0, ${0.7 + panicPulse * 0.3})`;
      ctx.fillText('⚠ PANIC', enemy.pos.x, enemy.pos.y + R + 14);
      ctx.restore();
      // Exclamation marks flying chaotically
      for (let pi = 0; pi < 3; pi++) {
        const pa = state.time * 8 + pi * (Math.PI * 2 / 3);
        const px = enemy.pos.x + Math.cos(pa) * 20;
        const py = enemy.pos.y - R - 16 + Math.sin(pa * 1.3) * 8;
        ctx.font = '9px sans-serif';
        ctx.fillStyle = `rgba(255, ${Math.floor(100 + panicPulse * 155)}, 0, ${panicPulse})`;
        ctx.fillText('!', px, py);
      }
      ctx.font = '14px sans-serif';
    } else if ((enemy as any)._berserkTimer > 0) {
      // BERSERK — red pulsing aura + fire icon
      const bPulse = 0.5 + Math.sin(state.time * 10) * 0.5;
      ctx.save();
      // Red glow — flat circle instead of gradient
      ctx.fillStyle = `rgba(255, 30, 0, ${0.15 + bPulse * 0.15})`;
      ctx.beginPath();
      ctx.arc(enemy.pos.x, enemy.pos.y, R + 10, 0, Math.PI * 2);
      ctx.fill();
      // Inner red ring
      ctx.beginPath();
      ctx.arc(enemy.pos.x, enemy.pos.y, R + 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 50, 0, ${0.5 + bPulse * 0.5})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      ctx.fillText('🔥', enemy.pos.x, enemy.pos.y - R - 12);
      // "BERSERK" label
      ctx.fillStyle = `rgba(255, 50, 30, ${0.7 + bPulse * 0.3})`;
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BERSERK', enemy.pos.x, enemy.pos.y + R + 22);
      ctx.font = '14px sans-serif';
    } else if ((enemy as any)._proneTimer > 0 || (enemy as any)._proneGoDownTimer > 0) {
      // PRONE — green camo indicator, smaller silhouette
      ctx.save();
      const pronePulse = 0.4 + Math.sin(state.time * 3) * 0.2;
      ctx.beginPath();
      ctx.ellipse(enemy.pos.x, enemy.pos.y, R + 6, R * 0.4, enemy.angle, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(60, 100, 40, ${pronePulse})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(40, 80, 20, ${pronePulse + 0.2})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      ctx.fillText('🌿', enemy.pos.x, enemy.pos.y - R - 10);
      ctx.font = '14px sans-serif';
    } else if (enemy.state === 'attack') {
      ctx.fillText('💢', enemy.pos.x, enemy.pos.y - R - 12);
    } else if (enemy.state === 'chase') {
      ctx.fillText('❗', enemy.pos.x, enemy.pos.y - R - 12);
    } else if (enemy.state === 'investigate') {
      // Show big ? when enemy just lost sight of player
      const lostSightTime = (enemy as any)._lostSightTime || 0;
      const timeSinceLost = state.time - lostSightTime;
      if (timeSinceLost < 3) {
        const bigPulse = 0.8 + Math.sin(state.time * 6) * 0.2;
        ctx.globalAlpha = bigPulse;
        ctx.font = 'bold 18px sans-serif';
        ctx.fillStyle = '#ffcc44';
        ctx.fillText('?', enemy.pos.x, enemy.pos.y - R - 14);
        ctx.globalAlpha = 1;
        ctx.globalAlpha = 1;
      } else {
        const pulse = 0.6 + Math.sin(state.time * 4) * 0.4;
        ctx.globalAlpha = pulse;
        ctx.fillText('❓', enemy.pos.x, enemy.pos.y - R - 12);
        ctx.globalAlpha = 1;
      }
    } else if (enemy.state === 'alert') {
      const pulse = 0.5 + Math.sin(state.time * 6) * 0.5;
      ctx.globalAlpha = pulse;
      ctx.fillText('⚠️', enemy.pos.x, enemy.pos.y - R - 12);
      ctx.globalAlpha = 1;
    } else if (enemy.state === 'idle') {
      ctx.globalAlpha = 0.3 + Math.sin(state.time * 1.5) * 0.15;
      ctx.font = '10px sans-serif';
      ctx.fillText('😴', enemy.pos.x + R, enemy.pos.y - R - 6);
      ctx.globalAlpha = 1;
    } else if (enemy.state === 'patrol') {
      ctx.globalAlpha = 0.4 + Math.sin(state.time * 2) * 0.2;
      ctx.font = '10px sans-serif';
      ctx.fillText('💤', enemy.pos.x + R, enemy.pos.y - R - 6);
      ctx.globalAlpha = 1;
    }

    // Radio call indicator
    if (enemy.radioAlert > 0) {
      const ra = Math.min(1, enemy.radioAlert);
      ctx.save();
      // Pulsing radio waves
      ctx.strokeStyle = `rgba(80, 200, 255, ${ra * 0.6})`;
      ctx.lineWidth = 1.5;
      for (let i = 1; i <= 3; i++) {
        const waveR = 8 + i * 6 * (1 - ra * 0.3);
        ctx.globalAlpha = ra * (1 - i * 0.25);
        ctx.beginPath();
        ctx.arc(enemy.pos.x + R + 4, enemy.pos.y - R - 8, waveR, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();
      }
      ctx.globalAlpha = ra;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📻', enemy.pos.x + R + 4, enemy.pos.y - R - 2);
      ctx.restore();
    }

    // Healing indicator — visible at enemy position
    if ((enemy as any)._healingTimer > 0) {
      ctx.save();
      const healPulse = 0.6 + Math.sin(state.time * 6) * 0.4;
      // Green cross circle
      ctx.beginPath();
      ctx.arc(enemy.pos.x, enemy.pos.y, R + 8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(50, 200, 80, ${healPulse * 0.3})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(50, 220, 80, ${healPulse * 0.7})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Healing icon + progress bar
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(enemy.type === 'boss' ? '💉' : '🩹', enemy.pos.x, enemy.pos.y - R - 14);
      ctx.font = 'bold 7px sans-serif';
      ctx.fillStyle = `rgba(50, 220, 80, ${healPulse})`;
      ctx.fillText('HEALING', enemy.pos.x, enemy.pos.y + R + 22);
      // Progress bar
      const healMax = enemy.type === 'boss' ? 5.0 : 3.0;
      const healPct = 1 - (enemy as any)._healingTimer / healMax;
      const barW = 28;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(enemy.pos.x - barW / 2 - 1, enemy.pos.y + R + 24, barW + 2, 4);
      ctx.fillStyle = '#44ff66';
      ctx.fillRect(enemy.pos.x - barW / 2, enemy.pos.y + R + 25, barW * healPct, 2);
      ctx.restore();
    }

    // Awareness bar — shows detection progress (stealth meter above enemy)
    if (enemy.awareness > 0.02 && enemy.awareness < 1.0 && enemy.state !== 'chase' && enemy.state !== 'attack') {
      const aBarW = 32;
      const aBarH = 3;
      const aBarY = enemy.hp < enemy.maxHp ? enemy.pos.y - R - 30 : enemy.pos.y - R - 24;
      const awareness = enemy.awareness;
      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(enemy.pos.x - aBarW / 2 - 1, aBarY - 1, aBarW + 2, aBarH + 2);
      // Color: green → yellow → orange → red
      const aColor = awareness < 0.3 ? '#66cc44' : awareness < 0.65 ? '#ccaa33' : awareness < 0.9 ? '#cc6622' : '#cc2222';
      ctx.fillStyle = aColor;
      ctx.fillRect(enemy.pos.x - aBarW / 2, aBarY, aBarW * awareness, aBarH);
      // Eye icon
      ctx.font = '7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = aColor;
      ctx.fillText('👁', enemy.pos.x - aBarW / 2 - 7, aBarY + aBarH);
    }

    // HP bar — bosses get a big cinematic bar drawn later in screen-space
    if (enemy.hp < enemy.maxHp && enemy.type !== 'boss') {
      const barW = 28;
      const ratio = enemy.hp / enemy.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(enemy.pos.x - barW / 2 - 1, enemy.pos.y - R - 24, barW + 2, 6);
      ctx.fillStyle = ratio > 0.5 ? '#7aaa5a' : ratio > 0.25 ? '#aa8a3a' : '#cc3a3a';
      ctx.fillRect(enemy.pos.x - barW / 2, enemy.pos.y - R - 23, barW * ratio, 4);
    }

    // Speech bubble
    if (enemy.speechBubble && enemy.speechBubbleTimer && enemy.speechBubbleTimer > 0) {
      ctx.save();
      const bubbleAlpha = Math.min(1, enemy.speechBubbleTimer);
      ctx.globalAlpha = bubbleAlpha;
      const text = enemy.speechBubble;
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      const tw = ctx.measureText(text).width + 12;
      const bx = enemy.pos.x - tw / 2;
      const by = enemy.pos.y - R - 42;
      // Bubble background
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.roundRect(bx, by, tw, 16, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Tail
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.moveTo(enemy.pos.x - 4, by + 16);
      ctx.lineTo(enemy.pos.x, by + 22);
      ctx.lineTo(enemy.pos.x + 4, by + 16);
      ctx.fill();
      // Text
      ctx.fillStyle = '#222';
      ctx.fillText(text, enemy.pos.x, by + 12);
      ctx.restore();
    }

    // Friendly indicator
    if (enemy.friendly) {
      ctx.save();
      const friendPulse = 0.6 + Math.sin(state.time * 4) * 0.3;
      ctx.beginPath();
      ctx.arc(enemy.pos.x, enemy.pos.y, R + 10, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(60, 220, 80, ${friendPulse})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = `rgba(60, 220, 80, ${friendPulse})`;
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FRIENDLY', enemy.pos.x, enemy.pos.y + R + 24);
      ctx.restore();
    }

    // Neutralized dog indicator
    if (enemy.neutralized) {
      ctx.save();
      ctx.globalAlpha = 0.6 + Math.sin(state.time * 2) * 0.2;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('😴', enemy.pos.x, enemy.pos.y - R - 8);
      ctx.restore();
    }

    // Type label
    ctx.fillStyle = 'rgba(255,200,200,0.5)';
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'center';
    const typeLabel: Record<string, string> = { scav: 'SCAV', soldier: 'SOLDIER', heavy: 'HEAVY', turret: 'TURRET', boss: '', redneck: 'REDNECK', dog: 'DOG' };
    ctx.fillText(typeLabel[enemy.type] || '', enemy.pos.x, enemy.pos.y + R + 16);
  }

  // ── PLACED TNT CHARGES ──
  for (const tnt of state.placedTNTs) {
    const timerRatio = tnt.timer / tnt.maxTimer;
    // Blinking — faster as timer runs out
    const blinkFreq = timerRatio > 0.5 ? 2 : timerRatio > 0.2 ? 6 : 14;
    const blinkOn = Math.sin(state.time * blinkFreq * Math.PI * 2) > 0;

    // Danger radius
    if (timerRatio < 0.6) {
      const alpha = (1 - timerRatio) * 0.12;
      ctx.beginPath();
      ctx.arc(tnt.pos.x, tnt.pos.y, 150, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 60, 20, ${alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 60, 20, ${alpha * 2})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // TNT body
    ctx.fillStyle = blinkOn ? '#dd3322' : '#882211';
    ctx.beginPath();
    ctx.roundRect(tnt.pos.x - 7, tnt.pos.y - 5, 14, 10, 2);
    ctx.fill();
    ctx.strokeStyle = '#441100';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Blinking light
    if (blinkOn) {
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(tnt.pos.x, tnt.pos.y - 6, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Timer text
    ctx.fillStyle = blinkOn ? '#ffcc00' : '#ff8844';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(tnt.timer.toFixed(1) + 's', tnt.pos.x, tnt.pos.y - 12);
  }

  // ── GRENADES ──
  for (const g of state.grenades) {
    const bob = Math.sin(state.time * 15) * 2;
    const timerRatio = g.timer / 1.5;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(g.pos.x, g.pos.y + 6, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Danger radius indicator (grows as timer decreases)
    if (timerRatio < 0.5) {
      const alpha = (1 - timerRatio * 2) * 0.15;
      ctx.beginPath();
      ctx.arc(g.pos.x, g.pos.y, g.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 80, 30, ${alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 80, 30, ${alpha * 2})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Grenade body
    ctx.fillStyle = timerRatio > 0.3 ? '#5a6a4a' : '#aa4430';
    ctx.beginPath();
    ctx.arc(g.pos.x, g.pos.y + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Fuse spark
    const sparkAlpha = 0.5 + Math.sin(state.time * 20) * 0.5;
    ctx.fillStyle = `rgba(255, 220, 60, ${sparkAlpha})`;
    ctx.beginPath();
    ctx.arc(g.pos.x, g.pos.y + bob - 6, 3, 0, Math.PI * 2);
    ctx.fill();

    // Timer text
    ctx.fillStyle = 'rgba(255, 200, 80, 0.8)';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.timer.toFixed(1), g.pos.x, g.pos.y + bob - 12);
  }

  // ── NACHALNIK NET CAST ──
  const netCast = (state as any)._netCast;
  if (netCast) {
    const t = 1 - Math.max(0, netCast.timer) / Math.max(0.01, netCast.maxTimer || 1);
    const nx = netCast.from.x + (netCast.to.x - netCast.from.x) * t;
    const ny = netCast.from.y + (netCast.to.y - netCast.from.y) * t;
    const nr = 16 + Math.sin(state.time * 18) * 2;

    ctx.strokeStyle = 'rgba(210, 200, 170, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(netCast.from.x, netCast.from.y);
    ctx.lineTo(nx, ny);
    ctx.stroke();

    ctx.fillStyle = 'rgba(210, 200, 170, 0.25)';
    ctx.beginPath();
    ctx.arc(nx, ny, nr, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(210, 200, 170, 0.95)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 + state.time * 5;
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.lineTo(nx + Math.cos(a) * nr, ny + Math.sin(a) * nr);
      ctx.stroke();
    }
  }

  // ── PARTICLES — batched by color for fewer draw calls ──
  {
    const particlesByColor = new Map<string, Array<{x: number, y: number, r: number, a: number}>>();
    for (const p of state.particles) {
      if (!isOnScreen(p.pos.x, p.pos.y, cx, cy, w, h, 10)) continue;
      const alpha = p.life / p.maxLife;
      const key = p.color;
      let arr = particlesByColor.get(key);
      if (!arr) { arr = []; particlesByColor.set(key, arr); }
      arr.push({ x: p.pos.x, y: p.pos.y, r: p.size * (0.5 + alpha * 0.5), a: alpha });
    }
    for (const [color, particles] of particlesByColor) {
      ctx.fillStyle = color;
      for (const p of particles) {
        ctx.globalAlpha = p.a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── BULLETS — batched by color, single path per color ──
  {
    // Player bullets
    ctx.fillStyle = '#ffdd44';
    ctx.beginPath();
    for (const b of state.bullets) {
      if (!b.fromPlayer) continue;
      if (b.weaponName === 'Throwing Knife') continue; // draw separately
      if (!isOnScreen(b.pos.x, b.pos.y, cx, cy, w, h, 10)) continue;
      ctx.moveTo(b.pos.x + 3, b.pos.y);
      ctx.arc(b.pos.x, b.pos.y, 3, 0, Math.PI * 2);
    }
    ctx.fill();
    // Throwing knives — drawn as rotated dagger
    for (const b of state.bullets) {
      if (!b.fromPlayer || b.weaponName !== 'Throwing Knife') continue;
      if (!isOnScreen(b.pos.x, b.pos.y, cx, cy, w, h, 10)) continue;
      ctx.save();
      ctx.translate(b.pos.x, b.pos.y);
      ctx.rotate(Math.atan2(b.vel.y, b.vel.x) + state.time * 12);
      ctx.fillStyle = '#c0c8d0';
      ctx.fillRect(-6, -1.5, 12, 3);
      ctx.fillStyle = '#8a6a4a';
      ctx.fillRect(-3, -2, 4, 4);
      ctx.restore();
    }
    // Enemy bullets
    ctx.fillStyle = '#ff5544';
    ctx.beginPath();
    for (const b of state.bullets) {
      if (b.fromPlayer) continue;
      if (!isOnScreen(b.pos.x, b.pos.y, cx, cy, w, h, 10)) continue;
      ctx.moveTo(b.pos.x + 3, b.pos.y);
      ctx.arc(b.pos.x, b.pos.y, 3, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  // Bullet trails — batched (longer trails on high graphics)
  {
    const trailLen = hasTracerLines() ? 6 : 3;
    ctx.lineWidth = hasTracerLines() ? 2 : 1.5;
    ctx.strokeStyle = hasTracerLines() ? 'rgba(255, 220, 80, 0.55)' : 'rgba(255, 220, 80, 0.4)';
    ctx.beginPath();
    for (const b of state.bullets) {
      if (!b.fromPlayer) continue;
      if (!isOnScreen(b.pos.x, b.pos.y, cx, cy, w, h, 10)) continue;
      ctx.moveTo(b.pos.x, b.pos.y);
      ctx.lineTo(b.pos.x - b.vel.x * trailLen, b.pos.y - b.vel.y * trailLen);
    }
    ctx.stroke();
    ctx.lineWidth = hasTracerLines() ? 1.5 : 1.5;
    ctx.strokeStyle = hasTracerLines() ? 'rgba(255, 100, 60, 0.45)' : 'rgba(255, 100, 60, 0.3)';
    ctx.beginPath();
    for (const b of state.bullets) {
      if (b.fromPlayer) continue;
      if (!isOnScreen(b.pos.x, b.pos.y, cx, cy, w, h, 10)) continue;
      ctx.moveTo(b.pos.x, b.pos.y);
      ctx.lineTo(b.pos.x - b.vel.x * trailLen, b.pos.y - b.vel.y * trailLen);
    }
    ctx.stroke();
  }

  // ── MUZZLE FLASHES ──
  if (hasMuzzleFlash()) {
    const flashes = (state as any)._muzzleFlashes as { x: number; y: number; time: number; fromPlayer: boolean }[] | undefined;
    if (flashes) {
      for (const f of flashes) {
        if (!isOnScreen(f.x, f.y, cx, cy, w, h, 20)) continue;
        const age = state.time - f.time;
        const alpha = Math.max(0, 1 - age / 0.08);
        const size = f.fromPlayer ? 12 : 8;
        // Bright core
        ctx.fillStyle = `rgba(255, 240, 150, ${alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        // Outer glow
        ctx.fillStyle = `rgba(255, 180, 50, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, size, 0, Math.PI * 2);
        ctx.fill();
        // Radial spikes
        ctx.strokeStyle = `rgba(255, 220, 100, ${alpha * 0.6})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          const a = (Math.PI * 2 * i / 4) + age * 40;
          ctx.beginPath();
          ctx.moveTo(f.x, f.y);
          ctx.lineTo(f.x + Math.cos(a) * size * 1.2, f.y + Math.sin(a) * size * 1.2);
          ctx.stroke();
        }
      }
    }
  }

  // ── LASER DESIGNATOR BEAM ──
  if (state.laserTarget) {
    ctx.save();
    const lp = state.player.pos;
    const lt = state.laserTarget;
    // Main laser beam — red, pulsing
    const laserPulse = 0.5 + Math.sin(state.time * 12) * 0.3;
    ctx.strokeStyle = `rgba(255, 30, 20, ${laserPulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(lp.x, lp.y);
    ctx.lineTo(lt.x, lt.y);
    ctx.stroke();
    ctx.setLineDash([]);
    // Dot at target
    ctx.fillStyle = `rgba(255, 30, 20, ${0.6 + Math.sin(state.time * 8) * 0.3})`;
    ctx.beginPath();
    ctx.arc(lt.x, lt.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── MORTAR STRIKE INDICATORS ──
  for (const m of state.mortarStrikes) {
    const progress = 1 - m.timer / m.maxTimer;
    const urgency = Math.min(1, progress * 1.5);
    // Growing danger circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(m.pos.x, m.pos.y, m.radius * progress, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 60, 20, ${0.3 + urgency * 0.5})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    // Inner target cross
    const crossSize = 12 + Math.sin(state.time * 10) * 4;
    ctx.strokeStyle = `rgba(255, 40, 20, ${0.5 + urgency * 0.4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(m.pos.x - crossSize, m.pos.y);
    ctx.lineTo(m.pos.x + crossSize, m.pos.y);
    ctx.moveTo(m.pos.x, m.pos.y - crossSize);
    ctx.lineTo(m.pos.x, m.pos.y + crossSize);
    ctx.stroke();
    // Timer text
    ctx.fillStyle = `rgba(255, 80, 30, ${0.7 + urgency * 0.3})`;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`MORTAR ${m.timer.toFixed(1)}s`, m.pos.x, m.pos.y - m.radius * progress - 8);
    ctx.restore();
  }

  // ── PLAYER ──
  ctx.save();
  const pulse = 0.6 + Math.sin(state.time * 2) * 0.2;

  // Radial glow — subtle, muted
  ctx.fillStyle = `rgba(80, 160, 60, ${pulse * 0.06})`;
  ctx.beginPath();
  ctx.arc(state.player.pos.x, state.player.pos.y, 30, 0, Math.PI * 2);
  ctx.fill();

  // Ring — muted colors
  ctx.beginPath();
  ctx.arc(state.player.pos.x, state.player.pos.y, R + 6, 0, Math.PI * 2);
  if (state.player.inCover) {
    const coverPulse = 0.4 + Math.sin(state.time * 4) * 0.2;
    ctx.strokeStyle = state.player.peeking
      ? `rgba(200, 170, 50, ${coverPulse})`
      : `rgba(60, 140, 200, ${coverPulse})`;
    ctx.lineWidth = 2.5;
  } else {
    ctx.strokeStyle = `rgba(80, 160, 60, ${pulse * 0.6})`;
    ctx.lineWidth = 2;
  }
  ctx.stroke();
  ctx.restore();

  // Cover prompt — show on nearest cover object when player is near but not in cover
  if (state.coverNearby && !state.player.inCover && (state as any)._nearestCoverPos) {
    const cp = (state as any)._nearestCoverPos as { x: number; y: number };
    const coverType = (state as any)._coverType as string || 'low';
    const coverIcon = coverType === 'high' ? '🛡️' : '🪨';
    const colorMap: Record<string, string> = {
      'high': '#50b4ff', 'low': '#a0c850',
    };
    const color = colorMap[coverType] || '#50b4ff';
    ctx.save();
    const pulse = 0.6 + Math.sin(state.time * 4) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(`${coverIcon} [auto] ${coverType === 'high' ? 'HIGH' : 'LOW'} COVER`, cp.x, cp.y - 20);
    ctx.restore();
  }

  // Cover indicator — shield icon and status
  if (state.player.inCover) {
    ctx.save();
    // Shield arc behind player (opposite to aim direction)
    const shieldAngle = state.player.angle + Math.PI;
    ctx.strokeStyle = state.player.peeking
      ? 'rgba(255, 200, 60, 0.5)'
      : 'rgba(80, 180, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(state.player.pos.x, state.player.pos.y, R + 14, shieldAngle - 1.2, shieldAngle + 1.2);
    ctx.stroke();

    // Outer ring (solid for perf)
    ctx.strokeStyle = 'rgba(80, 180, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(state.player.pos.x, state.player.pos.y, R + 20, 0, Math.PI * 2);
    ctx.stroke();

    // Label — show LOW/HIGH cover type with distinct icons
    const coverType = (state as any)._coverType as string || 'low';
    const coverIcon = coverType === 'high' ? '🛡️' : '🪨';
    const coverText = state.player.peeking ? '🔫 PEEKING' : `${coverIcon} ${coverType === 'high' ? 'HIGH' : 'LOW'} COVER`;
    ctx.fillStyle = state.player.peeking ? 'rgba(255, 200, 60, 0.9)' : coverType === 'high' ? 'rgba(80, 180, 255, 0.9)' : 'rgba(160, 200, 80, 0.9)';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(coverText, state.player.pos.x, state.player.pos.y - R - 34);
    ctx.restore();
  }

  // Hide prompt — show near player when they can hide
  if ((state as any)._canHide && !(state as any)._isHiding) {
    ctx.save();
    const hidePulse = 0.6 + Math.sin(state.time * 5) * 0.3;
    ctx.globalAlpha = hidePulse;
    ctx.fillStyle = 'rgba(80, 220, 100, 0.95)';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🌲 [Q] HIDE', state.player.pos.x, state.player.pos.y + R + 22);
    ctx.restore();
  }
  if ((state as any)._isHiding) {
    ctx.save();
    const hidePulse = 0.7 + Math.sin(state.time * 3) * 0.2;
    ctx.globalAlpha = hidePulse;
    ctx.fillStyle = 'rgba(80, 220, 100, 0.95)';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🌲 HIDDEN', state.player.pos.x, state.player.pos.y + R + 22);
    ctx.restore();
  }

  // ── DISGUISE PROMPT — show near body when uniform available ──
  if ((state as any)._disguiseAvailable && !state.disguised) {
    const dPos = (state as any)._disguisePos;
    if (dPos) {
      ctx.save();
      const pulse = 0.6 + Math.sin(state.time * 5) * 0.3;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = 'rgba(100, 200, 80, 0.95)';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🥷 [X] PUT ON DISGUISE', dPos.x, dPos.y - 30);
      ctx.restore();
    }
  }

  // ── DISGUISE ACTIVE INDICATOR ──
  if (state.disguised) {
    ctx.save();
    const pulse = 0.7 + Math.sin(state.time * 3) * 0.2;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = 'rgba(100, 180, 60, 0.95)';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`🥷 DISGUISED (${Math.ceil(state.disguiseTimer)}s)`, state.player.pos.x, state.player.pos.y - R - 46);
    ctx.restore();
  }

  // ── CHOKEHOLD PROGRESS BAR ──
  if (state.chokeholdTarget) {
    const target = state.enemies.find(e => e.id === state.chokeholdTarget);
    if (target) {
      ctx.save();
      const barW = 40;
      const barH = 5;
      const progress = state.chokeholdProgress / 2.0;
      const bx = target.pos.x - barW / 2;
      const by = target.pos.y - R - 20;
      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx, by, barW, barH);
      // Fill
      ctx.fillStyle = `rgb(${Math.floor(140 + 115 * progress)}, ${Math.floor(60 + 140 * (1 - progress))}, 200)`;
      ctx.fillRect(bx, by, barW * progress, barH);
      // Label
      ctx.fillStyle = 'rgba(200, 150, 255, 0.95)';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🤫 CHOKEHOLD...', target.pos.x, by - 4);
      ctx.restore();
    }
  }

  // ── THROWING KNIVES HUD (near player) ──
  if (state.throwingKnives > 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(180, 200, 220, 0.6)';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`🗡️×${state.throwingKnives} [F]`, state.player.pos.x + R + 30, state.player.pos.y - R - 5);
    ctx.restore();
  }

  // ── IN-GAME TUTORIAL TIPS — contextual popups near player ──
  {
    const tips: string[] = [];
    const tut = (state as any)._tutorialShown || {};

    // Tip: Chokehold — when sneaking and an unaware enemy is nearby behind
    const pMode = (state as any)._lastMovementMode || 'walk';
    if (!tut.chokehold && pMode === 'sneak') {
      for (const e of state.enemies) {
        if (e.state === 'dead' || e.awareness > 0.3) continue;
        const dx = e.pos.x - state.player.pos.x;
        const dy = e.pos.y - state.player.pos.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 200 && d > 40) {
          tips.push('🤫 TIP: Sneak behind & press [E] for silent Chokehold');
          tut.chokehold = true;
          break;
        }
      }
    }

    // Tip: Throwing knife — first time having knives
    if (!tut.knife && state.throwingKnives > 0 && state.time < 30) {
      tips.push('🗡️ TIP: Press [F] to throw a silent knife (80 dmg)');
      tut.knife = true;
    }

    // Tip: Disguise — when uniform is available nearby
    if (!tut.disguise && (state as any)._disguiseAvailable && !state.disguised) {
      tips.push('🥷 TIP: Press [X] near body to put on enemy uniform');
      tut.disguise = true;
    }

    // Tip: Disguise active — first time disguised
    if (!tut.disguiseActive && state.disguised && state.disguiseTimer > 40) {
      tips.push('🥷 TIP: Disguised! Avoid shooting & sprinting to stay hidden');
      tut.disguiseActive = true;
    }

    (state as any)._tutorialShown = tut;

    // Render tips as floating popups near player
    if (tips.length > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      for (let i = 0; i < tips.length; i++) {
        const tipY = state.player.pos.y + R + 38 + i * 18;
        const tipX = state.player.pos.x;
        const fadeIn = Math.min(1, (state.time % 100)); // always visible once triggered
        const pulse = 0.8 + Math.sin(state.time * 4) * 0.2;

        // Background pill
        const text = tips[i];
        ctx.font = 'bold 9px monospace';
        const tw = ctx.measureText(text).width + 16;
        ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * pulse})`;
        ctx.beginPath();
        const rx = tipX - tw / 2;
        const ry = tipY - 9;
        const rw = tw;
        const rh = 16;
        const cr = 4;
        ctx.moveTo(rx + cr, ry);
        ctx.lineTo(rx + rw - cr, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + cr);
        ctx.lineTo(rx + rw, ry + rh - cr);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - cr, ry + rh);
        ctx.lineTo(rx + cr, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - cr);
        ctx.lineTo(rx, ry + cr);
        ctx.quadraticCurveTo(rx, ry, rx + cr, ry);
        ctx.fill();

        // Border
        ctx.strokeStyle = `rgba(100, 220, 80, ${0.6 * pulse})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Text
        ctx.fillStyle = `rgba(180, 255, 140, ${0.95 * pulse})`;
        ctx.fillText(text, tipX, tipY + 2);
      }
      ctx.restore();
    }
  }

  // ── STEALTH AWARENESS INDICATOR — shows how close nearest enemy is to detecting you ──
  {
    const detection = (state as any)._stealthDetection || 0;
    const nearestState = (state as any)._stealthNearestState || 'idle';
    const isHiding = (state as any)._isHiding;
    const playerX = state.player.pos.x;
    const playerY = state.player.pos.y;

    // Only show when not in full combat and detection > 0
    const inCombat = nearestState === 'attack' || nearestState === 'chase' || nearestState === 'flank' || nearestState === 'suppress';
    
    if (isHiding) {
      // Hidden — green safe indicator
      ctx.save();
      const safePulse = 0.5 + Math.sin(state.time * 2) * 0.2;
      ctx.strokeStyle = `rgba(60, 220, 80, ${safePulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(playerX, playerY, R + 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (inCombat) {
      // Full combat — red pulsing danger ring
      ctx.save();
      const dangerPulse = 0.5 + Math.sin(state.time * 6) * 0.3;
      ctx.strokeStyle = `rgba(255, 40, 30, ${dangerPulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(playerX, playerY, R + 24, 0, Math.PI * 2);
      ctx.stroke();
      // DETECTED label
      ctx.fillStyle = `rgba(255, 50, 30, ${dangerPulse + 0.2})`;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ DETECTED', playerX, playerY + R + 38);
      ctx.restore();
    } else if (detection > 0.02) {
      // Approaching detection — graduated arc indicator
      ctx.save();
      const arcFill = detection * Math.PI * 2; // fill amount
      // Background ring (dim)
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.15)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(playerX, playerY, R + 24, 0, Math.PI * 2);
      ctx.stroke();
      // Detection fill — green→yellow→orange→red
      const r = Math.min(255, Math.floor(detection * 2 * 255));
      const g = Math.min(255, Math.floor((1 - detection) * 2 * 200));
      const alpha = 0.4 + detection * 0.5;
      ctx.strokeStyle = `rgba(${r}, ${g}, 40, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(playerX, playerY, R + 24, -Math.PI / 2, -Math.PI / 2 + arcFill);
      ctx.stroke();
      
      // Status label
      const label = detection > 0.7 ? '⚠ ALMOST SEEN' : detection > 0.4 ? '👁 CAUTION' : '🤫 SAFE';
      ctx.fillStyle = `rgba(${r}, ${g}, 40, ${alpha + 0.2})`;
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, playerX, playerY + R + 38);
      ctx.restore();
    } else {
      // Fully safe — subtle green dot
      ctx.save();
      const safePulse = 0.3 + Math.sin(state.time * 1.5) * 0.15;
      ctx.fillStyle = `rgba(60, 200, 80, ${safePulse})`;
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🤫 SAFE', playerX, playerY + R + 38);
      ctx.restore();
    }
  }

  // ── CROSSHAIR SPREAD INDICATOR — shows current weapon accuracy ──
  {
    const spread = (state as any)._currentSpread || 0.1;
    const spreadPx = Math.max(8, spread * 200);
    const aimDist = 35;
    const pX = state.player.pos.x;
    const pY = state.player.pos.y;
    const aimX = pX + Math.cos(state.player.angle) * aimDist;
    const aimY = pY + Math.sin(state.player.angle) * aimDist;
    
    const spreadAlpha = Math.min(0.8, 0.3 + spread * 1.5);
    const spreadColor = spread > 0.25 ? `rgba(255,100,50,${spreadAlpha})` : spread > 0.15 ? `rgba(255,220,50,${spreadAlpha})` : `rgba(100,255,100,${spreadAlpha})`;
    ctx.save();
    ctx.strokeStyle = spreadColor;
    ctx.lineWidth = 1.5;
    for (const offset of [-1, 1]) {
      const perpX = -Math.sin(state.player.angle) * spreadPx * offset;
      const perpY = Math.cos(state.player.angle) * spreadPx * offset;
      ctx.beginPath();
      ctx.moveTo(aimX + perpX * 0.6, aimY + perpY * 0.6);
      ctx.lineTo(aimX + perpX, aimY + perpY);
      ctx.stroke();
    }
    ctx.fillStyle = spreadColor;
    ctx.beginPath();
    ctx.arc(aimX, aimY, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── SOUND RIPPLES — visual feedback for player noise ──
  {
    const playerX = state.player.pos.x;
    const playerY = state.player.pos.y;
    for (const se of state.soundEvents) {
      // Only show player-originated sounds (close to player pos)
      const dx = se.pos.x - playerX;
      const dy = se.pos.y - playerY;
      if (dx * dx + dy * dy > 400) continue; // only sounds from player position
      const age = state.time - se.time;
      if (age > 1.2) continue; // fade out after 1.2s
      const progress = age / 1.2;
      const radius = se.radius * progress;
      const alpha = (1 - progress) * 0.25;
      // Color based on loudness
      const isLoud = se.radius > 150;
      const isMedium = se.radius > 50;
      const color = isLoud ? `rgba(255, 80, 40, ${alpha})` : isMedium ? `rgba(255, 200, 60, ${alpha})` : `rgba(100, 220, 100, ${alpha})`;
      ctx.beginPath();
      ctx.arc(se.pos.x, se.pos.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = isLoud ? 1.5 : 1;
      ctx.stroke();
    }
  }

  // ── DISTRACTION ROCK — show landing indicator ──
  {
    const rocks: any[] = (state as any)._thrownRocks || [];
    for (const rock of rocks) {
      const age = state.time - rock.time;
      if (age > 3) continue;
      const fadeIn = Math.min(1, age * 4);
      const fadeOut = age > 2 ? (3 - age) : 1;
      const alpha = fadeIn * fadeOut * 0.5;
      // Impact ripple
      ctx.beginPath();
      const rippleR = 10 + age * 30;
      ctx.arc(rock.pos.x, rock.pos.y, rippleR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(180, 150, 100, ${alpha * 0.4})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      // Rock icon
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.globalAlpha = alpha;
      ctx.fillText('🪨', rock.pos.x, rock.pos.y + 4);
      ctx.globalAlpha = 1;
    }
  }

  // ── CONTEXTUAL TUTORIAL TIPS — non-intrusive world-space hints ──
  {
    const tips = (state as any)._activeTutorialTip;
    if (tips) {
      const { text, worldPos, fadeIn } = tips;
      const tipAge = state.time - (tips.startTime || 0);
      if (tipAge < 6) {
        const alpha = Math.min(1, tipAge * 2) * (tipAge > 4 ? (6 - tipAge) / 2 : 1) * 0.9;
        ctx.save();
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        const tx = worldPos ? worldPos.x : state.player.pos.x;
        const ty = worldPos ? worldPos.y - 50 : state.player.pos.y - 50;
        // Background pill
        const tw = ctx.measureText(text).width + 16;
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.7})`;
        const rr = 4;
        ctx.beginPath();
        ctx.moveTo(tx - tw / 2 + rr, ty - 8);
        ctx.lineTo(tx + tw / 2 - rr, ty - 8);
        ctx.quadraticCurveTo(tx + tw / 2, ty - 8, tx + tw / 2, ty - 8 + rr);
        ctx.lineTo(tx + tw / 2, ty + 6 - rr);
        ctx.quadraticCurveTo(tx + tw / 2, ty + 6, tx + tw / 2 - rr, ty + 6);
        ctx.lineTo(tx - tw / 2 + rr, ty + 6);
        ctx.quadraticCurveTo(tx - tw / 2, ty + 6, tx - tw / 2, ty + 6 - rr);
        ctx.lineTo(tx - tw / 2, ty - 8 + rr);
        ctx.quadraticCurveTo(tx - tw / 2, ty - 8, tx - tw / 2 + rr, ty - 8);
        ctx.closePath();
        ctx.fill();
        // Text
        ctx.fillStyle = `rgba(180, 255, 140, ${alpha})`;
        ctx.fillText(text, tx, ty + 2);
        ctx.restore();
      }
    }
  }

  // Grenade charge indicator
  if ((state as any)._grenadeChargeStart) {
    const chargeTime = Math.min(2.0, (performance.now() - (state as any)._grenadeChargeStart) / 1000);
    const chargePct = chargeTime / 2.0;
    ctx.save();
    const barW = 40;
    const barH = 5;
    const bx = state.player.pos.x - barW / 2;
    const by = state.player.pos.y - R - 18;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by, barW, barH);
    const r = Math.floor(255 * chargePct);
    const g = Math.floor(200 * (1 - chargePct));
    ctx.fillStyle = `rgb(${r},${g},50)`;
    ctx.fillRect(bx, by, barW * chargePct, barH);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bx, by, barW, barH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('💣 CHARGE', state.player.pos.x, by - 3);
    ctx.restore();
  }

  const playerBlink = Math.sin(state.time * 0.8) > 0.95;
  const playerMoving = Math.abs(state.player.pos.x - (state as any)._prevPx || 0) > 0.1 || Math.abs(state.player.pos.y - (state as any)._prevPy || 0) > 0.1;
  (state as any)._prevPx = state.player.pos.x;
  (state as any)._prevPy = state.player.pos.y;
  // Try sprite rendering first, fall back to procedural
  const playerSprite = _spriteCache[_playerSkin];
  const playerSize = state.player.inCover && !state.player.peeking ? R - 2 : R + 2;
  if (playerSprite && playerSprite.complete && playerSprite.naturalWidth > 0 && hasDetailedCharacters()) {
    drawSpriteCharacter(ctx, state.player.pos.x, state.player.pos.y, state.player.angle, playerSprite, playerSize, 'player', state.time);
  } else {
    const pc = getPlayerColors();
    drawCuteCharacter(
      ctx, state.player.pos.x, state.player.pos.y, state.player.angle,
      pc.body, pc.outline, pc.eye, playerBlink,
      pc.hat, pc.hatColor, true, playerSize, playerMoving
    );
  }

  // (player label removed)

  // Bleeding
  if (state.player.bleedRate > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(state.player.pos.x, state.player.pos.y, R + 6, 0, Math.PI * 2);
    const pa = 0.2 + Math.sin(state.time * 8) * 0.15;
    ctx.strokeStyle = `rgba(220, 50, 50, ${pa})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // ── INTERACTION PROMPTS — only check nearby items ──
  for (const lc of state.lootContainers) {
    if (lc.looted || lc.type === 'weapon_drop') continue;
    if (dist2d(state.player.pos, lc.pos) < 70) {
      ctx.fillStyle = 'rgba(255, 230, 80, 0.9)';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('[E] SEARCH', lc.pos.x, lc.pos.y + lc.size + 6);
    }
  }
  // Weapon drop interaction prompts
  for (const lc of state.lootContainers) {
    if (lc.type !== 'weapon_drop' || lc.looted || lc.items.length === 0) continue;
    if (dist2d(state.player.pos, lc.pos) < 60) {
      const wpn = lc.items[0];
      const slot = isSecondaryWeapon(wpn) ? 'secondary' : 'primary';
      const currentInSlot = slot === 'primary' ? state.player.primaryWeapon : state.player.sidearm;

      ctx.textAlign = 'center';
      if (!currentInSlot) {
        // Empty slot — simple pickup
        ctx.fillStyle = 'rgba(100, 255, 100, 0.95)';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`[E] EQUIP ${wpn.name}`, lc.pos.x, lc.pos.y + 22);
      } else if (currentInSlot.name === wpn.name) {
        ctx.fillStyle = 'rgba(180, 180, 180, 0.7)';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText(`Already equipped`, lc.pos.x, lc.pos.y + 22);
      } else {
        // Swap prompt — show what you'll get and what you'll drop
        ctx.fillStyle = 'rgba(255, 180, 50, 0.95)';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`[E] SWAP → ${wpn.name}`, lc.pos.x, lc.pos.y + 22);
        ctx.fillStyle = 'rgba(200, 160, 80, 0.7)';
        ctx.font = '8px sans-serif';
        ctx.fillText(`(drop ${currentInSlot.name})`, lc.pos.x, lc.pos.y + 32);
      }
    }
  }
  for (const dp of state.documentPickups) {
    if (!dp.collected && dist2d(state.player.pos, dp.pos) < 70) {
      ctx.fillStyle = 'rgba(100, 200, 255, 0.9)';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('[E] READ', dp.pos.x, dp.pos.y + 26);
    }
  }

  ctx.restore(); // camera

  // ── COMPASS HUD — top-center directional bar ──
  {
    const compassW = 220;
    const compassH = 20;
    const cx = w / 2;
    const cy = 28;
    const playerAngle = state.player.angle;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    const cr = 4;
    ctx.moveTo(cx - compassW / 2 + cr, cy - compassH / 2);
    ctx.lineTo(cx + compassW / 2 - cr, cy - compassH / 2);
    ctx.quadraticCurveTo(cx + compassW / 2, cy - compassH / 2, cx + compassW / 2, cy - compassH / 2 + cr);
    ctx.lineTo(cx + compassW / 2, cy + compassH / 2 - cr);
    ctx.quadraticCurveTo(cx + compassW / 2, cy + compassH / 2, cx + compassW / 2 - cr, cy + compassH / 2);
    ctx.lineTo(cx - compassW / 2 + cr, cy + compassH / 2);
    ctx.quadraticCurveTo(cx - compassW / 2, cy + compassH / 2, cx - compassW / 2, cy + compassH / 2 - cr);
    ctx.lineTo(cx - compassW / 2, cy - compassH / 2 + cr);
    ctx.quadraticCurveTo(cx - compassW / 2, cy - compassH / 2, cx - compassW / 2 + cr, cy - compassH / 2);
    ctx.closePath();
    ctx.fill();
    
    // Center tick
    ctx.strokeStyle = 'rgba(180, 255, 140, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - compassH / 2);
    ctx.lineTo(cx, cy - compassH / 2 + 5);
    ctx.stroke();
    
    // Cardinal/intercardinal directions
    const directions: [number, string, boolean][] = [
      [0, 'E', true], [Math.PI / 4, 'SE', false], [Math.PI / 2, 'S', true],
      [3 * Math.PI / 4, 'SW', false], [Math.PI, 'W', true], [-3 * Math.PI / 4, 'NW', false],
      [-Math.PI / 2, 'N', true], [-Math.PI / 4, 'NE', false],
    ];
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - compassW / 2, cy - compassH / 2, compassW, compassH);
    ctx.clip();
    
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (const [dirAngle, label, isCardinal] of directions) {
      // Relative angle to player facing direction
      let diff = dirAngle - playerAngle;
      // Normalize to [-PI, PI]
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      
      const screenX = cx + (diff / Math.PI) * compassW;
      
      if (screenX > cx - compassW / 2 - 10 && screenX < cx + compassW / 2 + 10) {
        // Tick mark
        ctx.strokeStyle = isCardinal ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = isCardinal ? 1 : 0.5;
        ctx.beginPath();
        ctx.moveTo(screenX, cy + compassH / 2);
        ctx.lineTo(screenX, cy + compassH / 2 - (isCardinal ? 5 : 3));
        ctx.stroke();
        
        // Label
        ctx.fillStyle = label === 'N' ? 'rgba(255, 80, 80, 0.95)' : isCardinal ? 'rgba(255, 255, 255, 0.8)' : 'rgba(200, 200, 200, 0.4)';
        ctx.fillText(label, screenX, cy - 1);
      }
    }
    
    // Degree markers every 15°
    for (let deg = 0; deg < 360; deg += 15) {
      const rad = (deg - 90) * Math.PI / 180; // 0° = North
      let diff = rad - playerAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const screenX = cx + (diff / Math.PI) * compassW;
      if (screenX > cx - compassW / 2 && screenX < cx + compassW / 2) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(screenX, cy + compassH / 2);
        ctx.lineTo(screenX, cy + compassH / 2 - 2);
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }

  // ── KILL FEED — top-right corner ──
  {
    const killFeed: { text: string; time: number; icon: string }[] = (state as any)._killFeed || [];
    const feedX = w - 10;
    let feedY = 50;
    ctx.textAlign = 'right';
    ctx.font = 'bold 10px monospace';
    for (let i = killFeed.length - 1; i >= Math.max(0, killFeed.length - 5); i--) {
      const kf = killFeed[i];
      const age = state.time - kf.time;
      if (age > 8) continue;
      const alpha = age > 6 ? (8 - age) / 2 : Math.min(1, age * 3);
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.4})`;
      const tw = ctx.measureText(kf.text).width + 24;
      ctx.fillRect(feedX - tw - 4, feedY - 8, tw + 8, 16);
      ctx.fillStyle = `rgba(220, 255, 200, ${alpha})`;
      ctx.fillText(`${kf.icon} ${kf.text}`, feedX, feedY + 3);
      feedY += 18;
    }
    ctx.textAlign = 'left';
  }

  // ── BOSS HEALTH BAR — cinematic screen-space bar at bottom ──
  {
    const bosses = state.enemies.filter(e => e.type === 'boss' && e.state !== 'dead');
    for (let bi = 0; bi < bosses.length; bi++) {
      const boss = bosses[bi];
      const bossId = (boss as any)._bossId;
      const bossTitle = bossId === 'kravtsov' ? 'ДОКТОР КРАВЦОВ' : bossId === 'uzbek' ? 'УЗБЕК — SUBJECT 7' : bossId === 'nachalnik' ? 'NACHALNIK' : 'COMMANDANT OSIPOVITJ';
      const ratio = boss.hp / boss.maxHp;
      const phase = boss.bossPhase || 0;
      const barW = Math.min(400, w * 0.55);
      const barH = 10;
      const barX = w / 2 - barW / 2;
      const barY = h - 65 - bi * 50;

      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.roundRect(barX - 8, barY - 22, barW + 16, barH + 32, 4);
      ctx.fill();
      ctx.strokeStyle = phase === 2 ? 'rgba(255, 40, 30, 0.8)' : phase === 1 ? 'rgba(255, 160, 30, 0.7)' : 'rgba(200, 200, 200, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Boss name
      ctx.fillStyle = phase === 2 ? '#ff4433' : phase === 1 ? '#ffaa33' : '#ddddcc';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`💀 ${bossTitle}`, barX, barY - 8);

      // Phase indicator
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(200, 200, 200, 0.6)';
      ctx.font = '9px monospace';
      const phaseLabels = ['PHASE I', 'PHASE II — ENRAGED', 'PHASE III — DESPERATE'];
      ctx.fillText(phaseLabels[phase] || '', barX + barW, barY - 8);

      // HP bar background
      ctx.fillStyle = 'rgba(40, 40, 40, 0.9)';
      ctx.fillRect(barX, barY, barW, barH);

      // HP fill — color based on phase
      const barColor = phase === 2 ? '#cc2222' : phase === 1 ? '#cc8822' : '#888866';
      ctx.fillStyle = barColor;
      ctx.fillRect(barX, barY, barW * ratio, barH);

      // Phase thresholds — thin lines at 60% and 30%
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(barX + barW * 0.6, barY); ctx.lineTo(barX + barW * 0.6, barY + barH);
      ctx.moveTo(barX + barW * 0.3, barY); ctx.lineTo(barX + barW * 0.3, barY + barH);
      ctx.stroke();

      // HP text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.ceil(boss.hp)} / ${boss.maxHp}`, barX + barW / 2, barY + barH - 1);

      // Border
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, barH);

      // Pulsing glow at low HP
      if (ratio < 0.3) {
        const glow = 0.1 + Math.sin(state.time * 8) * 0.08;
        ctx.fillStyle = `rgba(255, 30, 20, ${glow})`;
        ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
      }
    }
  }

  // ── HIT MARKERS — crosshair X feedback ──
  {
    clearOldHitMarkers(state.time);
    const markers = getHitMarkers();
    for (const hm of markers) {
      const age = state.time - hm.time;
      const alpha = Math.max(0, 1 - age / 0.8);
      const size = hm.isKill ? 14 : hm.isHeadshot ? 12 : 8;
      const expandSize = size + age * 15;
      const color = hm.isKill ? `rgba(255, 50, 30, ${alpha})` : hm.isHeadshot ? `rgba(255, 200, 50, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
      
      // Draw X at screen center (crosshair hit marker)
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = hm.isKill ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(-expandSize, -expandSize); ctx.lineTo(expandSize, expandSize);
      ctx.moveTo(expandSize, -expandSize); ctx.lineTo(-expandSize, expandSize);
      ctx.stroke();
      
      // Damage number floating up
      if (hm.damage > 0) {
        ctx.fillStyle = color;
        ctx.font = `bold ${hm.isHeadshot ? 14 : 11}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`${hm.isHeadshot ? '🎯 ' : ''}${Math.round(hm.damage)}`, 0, -expandSize - 8 - age * 30);
      }
      ctx.restore();
    }
  }

  // Map-specific atmosphere overlay
  {
    const pal = getMapPalette(state);
    if (pal.ambientOverlay) {
      ctx.fillStyle = pal.ambientOverlay;
      ctx.fillRect(0, 0, w, h);
    }
    // ── GLOBAL CINEMATIC VIGNETTE — all maps ──
    {
      const mapId = (state as any)._mapId || 'objekt47';
      // Hospital gets heavier vignette for horror, others get subtle cinematic edge darkening
      const vigBase = mapId === 'hospital' ? 0.12 : 0.06;
      const edgeW = Math.min(w * 0.12, 80);
      const edgeH = Math.min(h * 0.1, 60);
      // Edges
      ctx.fillStyle = `rgba(0, 0, 0, ${vigBase})`;
      ctx.fillRect(0, 0, w, edgeH);           // top
      ctx.fillRect(0, h - edgeH, w, edgeH);   // bottom
      ctx.fillRect(0, 0, edgeW, h);            // left
      ctx.fillRect(w - edgeW, 0, edgeW, h);   // right
      // Corners darker
      const cornerW = edgeW * 1.5;
      const cornerH = edgeH * 1.5;
      ctx.fillStyle = `rgba(0, 0, 0, ${vigBase * 2})`;
      ctx.fillRect(0, 0, cornerW, cornerH);
      ctx.fillRect(w - cornerW, 0, cornerW, cornerH);
      ctx.fillRect(0, h - cornerH, cornerW, cornerH);
      ctx.fillRect(w - cornerW, h - cornerH, cornerW, cornerH);
      // Soft radial vignette (only on high quality — uses gradient)
      if (hasDetailedCharacters()) {
        const vigGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
        vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vigGrad.addColorStop(1, `rgba(0, 0, 0, ${vigBase * 2.5})`);
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, w, h);
      }
    }

    // ── FILM GRAIN — subtle noise overlay for cinematic look ──
    if (hasDetailedCharacters()) {
      _grainFrame = (_grainFrame + 1) % 3; // update grain every 3rd frame for perf
      if (_grainFrame === 0) {
        ensureGrainCanvas(w, h);
      }
      if (_grainCanvas) {
        ctx.save();
        ctx.globalAlpha = 0.035;
        ctx.globalCompositeOperation = 'overlay';
        ctx.drawImage(_grainCanvas as any, 0, 0, _grainW, _grainH, 0, 0, w, h);
        ctx.restore();
      }
    }
  }

  // ── DAY/NIGHT DARKNESS OVERLAY ──
  {
    const darkness = getDarknessFactor(state.time);
    if (darkness > 0.01) {
      // Global darkness overlay
      ctx.fillStyle = `rgba(5, 8, 20, ${darkness})`;
      ctx.fillRect(0, 0, w, h);
      
      // Flashlight cone — player illumination piercing the dark
      if (darkness > 0.15) {
        const fl = getFlashlightParams();
        const playerScreenX = state.player.pos.x - state.camera.x + w * 0.5;
        const playerScreenY = state.player.pos.y - state.camera.y + h * 0.5;
        // Cutout: draw flashlight as a lighter area
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        const coneGrad = ctx.createRadialGradient(playerScreenX, playerScreenY, 20, playerScreenX, playerScreenY, fl.range);
        coneGrad.addColorStop(0, `rgba(0, 0, 0, ${Math.min(0.9, darkness * 1.3)})`);
        coneGrad.addColorStop(0.7, `rgba(0, 0, 0, ${Math.min(0.5, darkness * 0.8)})`);
        coneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coneGrad;
        // Draw cone in player's facing direction
        ctx.beginPath();
        const coneStart = state.player.angle - fl.coneAngle;
        const coneEnd = state.player.angle + fl.coneAngle;
        ctx.moveTo(playerScreenX, playerScreenY);
        ctx.arc(playerScreenX, playerScreenY, fl.range, coneStart, coneEnd);
        ctx.closePath();
        ctx.fill();
        // Small ambient glow around player
        const ambGrad = ctx.createRadialGradient(playerScreenX, playerScreenY, 0, playerScreenX, playerScreenY, 60);
        ambGrad.addColorStop(0, `rgba(0, 0, 0, ${Math.min(0.6, darkness * 0.9)})`);
        ambGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = ambGrad;
        ctx.beginPath();
        ctx.arc(playerScreenX, playerScreenY, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Warm flashlight glow overlay
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const warmGrad = ctx.createRadialGradient(playerScreenX, playerScreenY, 10, playerScreenX, playerScreenY, fl.range * 0.8);
        warmGrad.addColorStop(0, `rgba(255, 240, 200, ${darkness * 0.06})`);
        warmGrad.addColorStop(1, 'rgba(255, 240, 200, 0)');
        ctx.fillStyle = warmGrad;
        ctx.beginPath();
        ctx.moveTo(playerScreenX, playerScreenY);
        ctx.arc(playerScreenX, playerScreenY, fl.range * 0.8, coneStart, coneEnd);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // Time-of-day indicator (subtle text)
    const tod = getTimeOfDay(state.time);
    if (tod !== 'day') {
      const todLabel = tod === 'dawn' ? '🌅 DAWN' : tod === 'dusk' ? '🌆 DUSK' : '🌙 NIGHT';
      ctx.fillStyle = `rgba(200, 200, 200, 0.3)`;
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(todLabel, 10, h - 10);
    }
  }

  // ── AURORA BOREALIS + COMET (dusk/night, high graphics) ──
  if (hasWeatherEffects()) {
    const darkness = getDarknessFactor(state.time);
    const tod = getTimeOfDay(state.time);
    if (darkness > 0.1 && (tod === 'dusk' || tod === 'night')) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      // Aurora — multiple wavering bands across the top portion of screen
      const auroraIntensity = Math.min(1, (darkness - 0.1) * 2.5);
      const t = state.time;
      for (let band = 0; band < 4; band++) {
        const bandY = 20 + band * 18 + Math.sin(t * 0.3 + band * 1.7) * 12;
        const bandWidth = w * (0.4 + Math.sin(t * 0.15 + band * 2.1) * 0.25);
        const bandX = w * 0.5 + Math.sin(t * 0.08 + band * 0.9) * w * 0.2 - bandWidth / 2;
        // Color cycling — greens, teals, purples, pinks
        const hue = 120 + Math.sin(t * 0.12 + band * 1.3) * 60 + band * 30;
        const sat = 70 + Math.sin(t * 0.2 + band) * 20;
        const alpha = auroraIntensity * (0.04 + Math.sin(t * 0.25 + band * 1.5) * 0.025);
        const aGrad = ctx.createLinearGradient(bandX, bandY - 20, bandX + bandWidth, bandY + 30);
        aGrad.addColorStop(0, `hsla(${hue}, ${sat}%, 50%, 0)`);
        aGrad.addColorStop(0.3, `hsla(${hue}, ${sat}%, 55%, ${alpha})`);
        aGrad.addColorStop(0.5, `hsla(${hue + 20}, ${sat}%, 60%, ${alpha * 1.3})`);
        aGrad.addColorStop(0.7, `hsla(${hue + 10}, ${sat}%, 55%, ${alpha})`);
        aGrad.addColorStop(1, `hsla(${hue}, ${sat}%, 50%, 0)`);
        ctx.fillStyle = aGrad;
        // Wavy shape via multiple rects with vertical offset
        for (let seg = 0; seg < 12; seg++) {
          const segX = bandX + (bandWidth / 12) * seg;
          const segW = bandWidth / 12 + 2;
          const segY = bandY + Math.sin(t * 0.4 + seg * 0.8 + band * 2) * 8;
          const segH = 12 + Math.sin(t * 0.3 + seg * 0.5 + band) * 6;
          ctx.fillRect(segX, segY, segW, segH);
        }
      }
      // Occasional bright aurora pulse
      if (Math.sin(t * 0.07) > 0.85) {
        const pulseAlpha = (Math.sin(t * 0.07) - 0.85) * auroraIntensity * 0.6;
        const pulseGrad = ctx.createLinearGradient(0, 0, w, 60);
        pulseGrad.addColorStop(0, `hsla(140, 80%, 50%, 0)`);
        pulseGrad.addColorStop(0.5, `hsla(160, 90%, 60%, ${pulseAlpha})`);
        pulseGrad.addColorStop(1, `hsla(140, 80%, 50%, 0)`);
        ctx.fillStyle = pulseGrad;
        ctx.fillRect(0, 10, w, 50);
      }

      // ── COMET — streaks across sky during deep night ──
      if (tod === 'night') {
        // Comet cycles every ~80 seconds, visible for ~10s
        const cometCycle = (t % 80) / 80;
        if (cometCycle > 0.8) {
          const cometProgress = (cometCycle - 0.8) / 0.2; // 0→1
          const cx = w * 0.1 + cometProgress * w * 0.85;
          const cy = 15 + Math.sin(cometProgress * Math.PI * 0.3) * 20;
          const cometAlpha = Math.sin(cometProgress * Math.PI) * 0.7;
          // Tail
          const tailGrad = ctx.createLinearGradient(cx - 60, cy, cx, cy);
          tailGrad.addColorStop(0, `rgba(200, 220, 255, 0)`);
          tailGrad.addColorStop(1, `rgba(200, 220, 255, ${cometAlpha * 0.4})`);
          ctx.fillStyle = tailGrad;
          ctx.fillRect(cx - 60, cy - 1.5, 60, 3);
          // Head
          ctx.fillStyle = `rgba(240, 250, 255, ${cometAlpha})`;
          ctx.beginPath();
          ctx.arc(cx, cy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  // ── WEATHER EFFECTS (high graphics only) ──
  if (hasWeatherEffects()) {
    const mapId = (state as any)._mapId || 'objekt47';
    
    // Objekt 47 — snow particles
    if (mapId === 'objekt47') {
      if (!(state as any)._snowParticles) {
        const snow: { x: number; y: number; speed: number; size: number; drift: number }[] = [];
        for (let i = 0; i < 60; i++) {
          snow.push({
            x: Math.random() * w,
            y: Math.random() * h,
            speed: 0.5 + Math.random() * 1.5,
            size: 1 + Math.random() * 2.5,
            drift: (Math.random() - 0.5) * 0.8,
          });
        }
        (state as any)._snowParticles = snow;
      }
      const snow = (state as any)._snowParticles as { x: number; y: number; speed: number; size: number; drift: number }[];
      ctx.fillStyle = 'rgba(220, 225, 230, 0.6)';
      for (const s of snow) {
        s.y += s.speed;
        s.x += s.drift + Math.sin(state.time * 0.5 + s.x * 0.01) * 0.3;
        if (s.y > h) { s.y = -5; s.x = Math.random() * w; }
        if (s.x > w) s.x = 0;
        if (s.x < 0) s.x = w;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      // Light snow overlay tint
      ctx.fillStyle = 'rgba(200, 210, 220, 0.02)';
      ctx.fillRect(0, 0, w, h);
    }
    
    // Fishing village — heavy snowfall + icy mist
    if (mapId === 'fishing_village') {
      // Snow particles — heavier than objekt47
      if (!(state as any)._fishingSnow) {
        const snow: { x: number; y: number; speed: number; size: number; drift: number }[] = [];
        for (let i = 0; i < 90; i++) {
          snow.push({
            x: Math.random() * w,
            y: Math.random() * h,
            speed: 0.4 + Math.random() * 1.8,
            size: 1 + Math.random() * 3,
            drift: (Math.random() - 0.5) * 1.2,
          });
        }
        (state as any)._fishingSnow = snow;
      }
      const snow = (state as any)._fishingSnow as { x: number; y: number; speed: number; size: number; drift: number }[];
      ctx.fillStyle = 'rgba(230, 235, 240, 0.7)';
      for (const s of snow) {
        s.y += s.speed;
        s.x += s.drift + Math.sin(state.time * 0.4 + s.x * 0.008) * 0.5;
        if (s.y > h) { s.y = -5; s.x = Math.random() * w; }
        if (s.x > w) s.x = 0;
        if (s.x < 0) s.x = w;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      // Cold blue overlay tint
      ctx.fillStyle = 'rgba(180, 200, 225, 0.03)';
      ctx.fillRect(0, 0, w, h);
      // Drifting icy mist banks
      const fogTime = state.time * 0.1;
      for (let i = 0; i < 3; i++) {
        const fx = (Math.sin(fogTime + i * 2.1) * 0.5 + 0.5) * w;
        const fy = (Math.cos(fogTime * 0.6 + i * 1.8) * 0.3 + 0.6) * h;
        const fr = 120 + Math.sin(fogTime + i) * 40;
        const fogGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
        fogGrad.addColorStop(0, 'rgba(200, 215, 230, 0.05)');
        fogGrad.addColorStop(1, 'rgba(200, 215, 230, 0)');
        ctx.fillStyle = fogGrad;
        ctx.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
      }
    }
    
    // Hospital — flickering light overlay
    if (mapId === 'hospital') {
      const flicker = Math.sin(state.time * 15) * Math.sin(state.time * 23) * Math.sin(state.time * 7);
      if (flicker > 0.7) {
        // Brief bright flicker
        ctx.fillStyle = 'rgba(200, 220, 255, 0.03)';
        ctx.fillRect(0, 0, w, h);
      } else if (flicker < -0.8) {
        // Brief dark flicker  
        ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
        ctx.fillRect(0, 0, w, h);
      }
    }
  }

  // === ELEVATOR BLACKOUT FADE ===
  const elevFade = (state as any)._elevatorFade as number | undefined;
  if (elevFade !== undefined && elevFade > 0) {
    // 2.0→1.0 = fade to black, 1.0→0.0 = fade from black
    const alpha = elevFade > 1.0
      ? 1.0 - (elevFade - 1.0) // 0→1 as timer goes 2→1
      : elevFade;               // 1→0 as timer goes 1→0
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, alpha)})`;
    ctx.fillRect(0, 0, w, h);
    // Show text at peak darkness
    if (alpha > 0.7) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#888';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      const dir = (state as any)._elevatorFadeDir;
      ctx.fillText(dir === 'down' ? '⛏ DESCENDING...' : '⛏ ASCENDING...', w / 2, h / 2);
      ctx.restore();
    }
  }

  if (state.flashbangTimer > 0) {
    const alpha = Math.min(0.9, state.flashbangTimer * 0.6);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(0, 0, w, h);
    // Spinning stars overlay
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    for (let s = 0; s < 5; s++) {
      const sa = state.time * 3 + s * (Math.PI * 2 / 5);
      const sr = 60 + Math.sin(state.time * 2 + s) * 20;
      const sx = Math.cos(sa) * sr;
      const sy = Math.sin(sa) * sr;
      ctx.globalAlpha = Math.min(0.8, state.flashbangTimer * 0.4);
      ctx.fillText('💫', sx, sy);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // "STUNNED" text
    ctx.fillStyle = `rgba(200, 50, 50, ${Math.min(0.9, state.flashbangTimer * 0.5)})`;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💫 STUNNED 💫', w / 2, h / 2 + 80);
  }

  // FEAR EFFECT — green toxic overlay + text
  if (state.fearTimer > 0) {
    const alpha = Math.min(0.35, state.fearTimer * 0.15);
    ctx.fillStyle = `rgba(30, 120, 40, ${alpha})`;
    ctx.fillRect(0, 0, w, h);
    // Pulsing green vignette
    const vigAlpha = 0.2 + Math.sin(state.time * 6) * 0.1;
    const vigGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.6);
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(1, `rgba(20, 80, 20, ${vigAlpha})`);
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);
    // "FEAR" text
    ctx.save();
    ctx.fillStyle = `rgba(100, 255, 80, ${Math.min(0.9, state.fearTimer * 0.4)})`;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('😱 СТРАХ — НЕ МОГУ СТРЕЛЯТЬ!', w / 2, h / 2 - 30);
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = `rgba(200, 255, 200, ${Math.min(0.7, state.fearTimer * 0.3)})`;
    ctx.fillText('Flee from Kravtsov!', w / 2, h / 2);
    ctx.restore();
  }

  // RELOAD COMPLETE — brief green flash + text
  const reloadFlash = (state as any)._reloadCompleteFlash || 0;
  if (reloadFlash > 0) {
    const alpha = Math.min(1, reloadFlash);
    // Green edge flash
    ctx.fillStyle = `rgba(40, 200, 80, ${alpha * 0.08})`;
    ctx.fillRect(0, 0, w, h);
    // "READY" text near crosshair
    ctx.save();
    ctx.fillStyle = `rgba(80, 255, 120, ${alpha * 0.9})`;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓ READY', w / 2, h / 2 + 35);
    // Ammo count
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = `rgba(200, 255, 200, ${alpha * 0.7})`;
    ctx.fillText(`${state.player.currentAmmo}/${state.player.maxAmmo}`, w / 2, h / 2 + 55);
    ctx.restore();
  }

  if (state.emptyMagTimer > 0) {
    const alpha = Math.min(1, state.emptyMagTimer);
    ctx.save();
    ctx.fillStyle = `rgba(255, 60, 60, ${alpha * 0.9})`;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const ammoAvail = state.player.ammoReserves[state.player.ammoType] || 0;
    const txt = ammoAvail > 0 ? '⚠ EMPTY — PRESS R TO RELOAD' : '⚠ NO AMMO LEFT';
    ctx.fillText(txt, w / 2, h / 2 + 40);
    ctx.restore();
  }

  // Low HP flash (only visual feedback, not lighting)
  if (state.player.hp < 30) {
    const alpha = 0.08 + Math.sin(state.time * 5) * 0.04;
    ctx.fillStyle = `rgba(150, 20, 20, ${alpha})`;
    ctx.fillRect(0, 0, w, h);
  }
}

function dist2d(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
