import { GameState, Prop, LightSource, WindowDef, Vec2, TerrainZone } from './types';
import { SpatialGrid, buildSpatialGrid, collidesWithWallsGrid, TerrainGrid, buildTerrainGrid, getTerrainFast } from './spatial';

const R = 28;
const WALL_HEIGHT = 18;

// Cached sorted arrays — only re-sort when count changes
let _sortedWalls: any[] = [];
let _sortedWallCount = -1;
let _sortedProps: Prop[] = [];
let _sortedPropCount = -1;
let _rendererWallGrid: SpatialGrid | null = null;
let _rendererWallCount = -1;
let _rendererTerrainGrid: TerrainGrid | null = null;

function getRendererWallGrid(state: GameState): SpatialGrid {
  if (!_rendererWallGrid || state.walls.length !== _rendererWallCount) {
    _rendererWallGrid = buildSpatialGrid(state.walls);
    _rendererWallCount = state.walls.length;
  }
  return _rendererWallGrid;
}

function getRendererTerrainGrid(state: GameState): TerrainGrid {
  if (!_rendererTerrainGrid) {
    _rendererTerrainGrid = buildTerrainGrid(state.terrainZones, state.mapWidth, state.mapHeight);
  }
  return _rendererTerrainGrid;
}

// Viewport check — is position within visible area (with margin)
function isOnScreen(x: number, y: number, cx: number, cy: number, w: number, h: number, margin: number = 100): boolean {
  return x > cx - margin && x < cx + w + margin && y > cy - margin && y < cy + h + margin;
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

  const headR = size * 0.42;
  const torsoW = size * 0.7;
  const torsoH = size * 0.55;
  const legW = size * 0.18;
  const legH = size * 0.42;
  const armW = size * 0.14;
  const armH = size * 0.38;
  const shoulderOff = torsoW * 0.42;

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(1, size * 0.85, size * 0.5, size * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // === LEGS (simplified) ===
  const walkPhase = (_frameTime * 2.5) % 1;
  const legSwing = isMoving ? Math.sin(walkPhase * Math.PI * 2) * 0.35 : 0;
  ctx.fillStyle = shadeColor(bodyColor, -15);
  for (const side of [-1, 1]) {
    const lx = legW * 1.1 * side;
    const ly = torsoH * 0.35;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(legSwing * side);
    ctx.fillRect(-legW / 2, 0, legW, legH * 0.95);
    // Boot
    ctx.fillStyle = '#3a3832';
    ctx.fillRect(-legW * 0.55, legH * 0.88, legW * 1.1, legH * 0.18);
    ctx.fillStyle = shadeColor(bodyColor, -15);
    ctx.restore();
  }

  // === GUN ARM ===
  if (hasGun) {
    ctx.save();
    ctx.rotate(angle);
    // Arm
    ctx.fillStyle = shadeColor(bodyColor, -5);
    ctx.fillRect(shoulderOff - armW / 2, -armH * 0.1, armW, armH * 0.8);
    // Hand
    ctx.fillStyle = '#f0dcc0';
    ctx.fillRect(shoulderOff - 3, armH * 0.6, 6, 5);
    // Gun barrel
    ctx.fillStyle = '#6a6a66';
    const gunX = shoulderOff - 3;
    const gunY = armH * 0.55;
    ctx.fillRect(gunX, gunY - 2, size * 0.9, 4.5);
    // Muzzle
    ctx.fillStyle = '#333';
    ctx.fillRect(gunX + size * 0.85, gunY - 1.5, 5, 3);
    ctx.restore();
  }

  // === TORSO ===
  ctx.save();
  ctx.rotate(angle);
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-torsoW / 2, -torsoH * 0.35, torsoW, torsoH, [4, 4, 2, 2]);
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(-torsoW / 2, -torsoH * 0.35, torsoW, torsoH * 0.4);
  // Belt
  ctx.fillStyle = '#4a4a3a';
  ctx.fillRect(-torsoW * 0.4, torsoH * 0.42, torsoW * 0.8, 4);

  // Off-arm
  ctx.fillStyle = shadeColor(bodyColor, -5);
  ctx.fillRect(-shoulderOff - armW / 2, -armH * 0.05, armW, armH * 0.7);
  // Hand
  ctx.fillStyle = '#f0dcc0';
  ctx.fillRect(-shoulderOff - 3, armH * 0.55, 6, 5);
  ctx.restore();

  // === HEAD ===
  ctx.save();
  ctx.translate(0, -torsoH * 0.5);
  // Neck
  ctx.fillStyle = '#f0dcc0';
  ctx.fillRect(-4, headR * 0.55, 8, 8);
  // Head
  ctx.fillStyle = '#f0dcc0';
  ctx.beginPath();
  ctx.arc(0, 0, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d4b896';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Head shine — flat instead of gradient
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.arc(-headR * 0.2, -headR * 0.25, headR * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Face
  const facingLeft = Math.abs(angle) > Math.PI * 0.5;
  ctx.save();
  if (facingLeft) ctx.scale(-1, 1);
  if (isBlinking) {
    ctx.strokeStyle = eyeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(headR * 0.32, -headR * 0.15, 3.5, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(headR * 0.32, headR * 0.15, 3.5, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  } else {
    const eyeX = headR * 0.35;
    const eyeYOff = headR * 0.17;
    for (const ey of [-eyeYOff, eyeYOff]) {
      // Eye white
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(eyeX, ey, 4.5, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Iris
      ctx.fillStyle = eyeColor;
      ctx.beginPath();
      ctx.arc(eyeX + 1.5, ey, 3.2, 0, Math.PI * 2);
      ctx.fill();
      // Pupil
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(eyeX + 2, ey, 1.8, 0, Math.PI * 2);
      ctx.fill();
      // Sparkle
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(eyeX + 3, ey - 2, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore(); // face

  // === HAT ===
  if (hatType !== 'none') {
    ctx.save();
    if (facingLeft) ctx.scale(-1, 1);
    switch (hatType) {
      case 'ushanka':
        ctx.fillStyle = hatColor;
        ctx.beginPath();
        ctx.arc(0, 0, headR * 1.12, -Math.PI * 0.82, Math.PI * 0.82);
        ctx.lineTo(0, -headR * 1.12);
        ctx.closePath();
        ctx.fill();
        // Fur trim
        ctx.fillStyle = shadeColor(hatColor, 20);
        ctx.beginPath();
        ctx.arc(0, 0, headR * 1.12, Math.PI * 0.55, Math.PI * 0.82);
        ctx.arc(0, 0, headR * 0.95, Math.PI * 0.82, Math.PI * 0.55, true);
        ctx.closePath();
        ctx.fill();
        // Ear flaps
        ctx.fillStyle = hatColor;
        ctx.fillRect(-headR * 1.15, -headR * 0.35, headR * 0.35, headR * 0.7);
        // Star
        ctx.fillStyle = '#dd3333';
        ctx.font = `bold ${headR * 0.55}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('★', headR * 0.05, headR * -0.3);
        break;
      case 'helmet':
        ctx.fillStyle = hatColor;
        ctx.beginPath();
        ctx.arc(0, -headR * 0.05, headR * 1.18, -Math.PI * 0.9, Math.PI * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shadeColor(hatColor, -20);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      case 'beret':
        ctx.fillStyle = hatColor;
        ctx.beginPath();
        ctx.ellipse(-headR * 0.1, -headR * 0.68, headR * 0.88, headR * 0.4, -0.15, 0, Math.PI * 2);
        ctx.fill();
        // Band
        ctx.fillStyle = shadeColor(hatColor, -20);
        ctx.beginPath();
        ctx.arc(0, 0, headR * 1.02, -Math.PI * 0.55, Math.PI * 0.55);
        ctx.arc(0, 0, headR * 0.95, Math.PI * 0.55, -Math.PI * 0.55, true);
        ctx.closePath();
        ctx.fill();
        break;
      case 'bandana':
        ctx.fillStyle = hatColor;
        ctx.beginPath();
        ctx.arc(0, 0, headR * 1.04, -Math.PI * 0.72, Math.PI * 0.72);
        ctx.closePath();
        ctx.fill();
        // Knot
        ctx.beginPath();
        ctx.moveTo(-headR * 0.65, -headR * 0.35);
        ctx.quadraticCurveTo(-headR * 1.3, -headR * 0.55, -headR * 1.1, -headR * 0.1);
        ctx.lineTo(-headR * 0.7, -headR * 0.05);
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

  // Top highlight — flat instead of gradient for Firefox perf
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(x, y, w, h * 0.4);

  // Edge line
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
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

// Terrain colors
const TERRAIN_COLORS: Record<TerrainZone['type'], [string, string]> = {
  grass: ['#3a4a2e', '#3e4e32'],
  dirt: ['#5a5040', '#5e5444'],
  asphalt: ['#3a3a38', '#3e3e3c'],
  concrete: ['#4e4e44', '#525248'],
  forest: ['#2a3a1e', '#2e3e22'],
};

// Cached ground canvas — rendered once, blitted each frame
let _groundCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
let _groundMapW = 0;
let _groundMapH = 0;

function ensureGroundCanvas(state: GameState) {
  if (_groundCanvas && _groundMapW === state.mapWidth && _groundMapH === state.mapHeight) return;
  _groundMapW = state.mapWidth;
  _groundMapH = state.mapHeight;
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
  for (let tx = 0; tx < _groundMapW; tx += tileSize) {
    for (let ty = 0; ty < _groundMapH; ty += tileSize) {
      const terrain = getTerrainFast(terrainGrid, tx + tileSize / 2, ty + tileSize / 2);
      const tileIdx = ((tx / tileSize) + (ty / tileSize)) % 2;
      const colors = TERRAIN_COLORS[terrain];
      gctx.fillStyle = tileIdx === 0 ? colors[0] : colors[1];
      gctx.fillRect(tx, ty, tileSize, tileSize);
      // Sparse grass detail
      const hash = (tx * 7 + ty * 13) % 100;
      if (hash < 8 && (terrain === 'grass' || terrain === 'forest')) {
        gctx.strokeStyle = terrain === 'forest' ? 'rgba(40,80,30,0.3)' : 'rgba(60,90,40,0.25)';
        gctx.lineWidth = 1;
        const gx = tx + 10 + (hash % 20);
        const gy = ty + 15 + (hash % 15);
        gctx.beginPath();
        gctx.moveTo(gx, gy + 6); gctx.lineTo(gx - 2, gy); gctx.stroke();
        gctx.beginPath();
        gctx.moveTo(gx + 3, gy + 6); gctx.lineTo(gx + 5, gy - 1); gctx.stroke();
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

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number) {
  _frameTime = state.time;
  ctx.clearRect(0, 0, w, h);

  const cx = state.camera.x - w / 2;
  const cy = state.camera.y - h / 2;

  ctx.save();
  ctx.translate(-cx, -cy);

  // Outside area (dense forest beyond map)
  ctx.fillStyle = '#1a2a14';
  ctx.fillRect(-200, -200, state.mapWidth + 400, state.mapHeight + 400);

  // Ground tiles with terrain zones
  drawGroundTiles(ctx, cx, cy, w, h, state.mapWidth, state.mapHeight, state);

  // Zone labels
  const zoneLabels = [
    { x: 1600, y: 1100, label: 'HANGAR', sub: 'Huvudbyggnad', size: 22 },
    { x: 1300, y: 1000, label: 'HANGAR A', sub: 'Hall Väst', size: 14 },
    { x: 1300, y: 1400, label: 'HANGAR B', sub: 'Hall Syd', size: 12 },
    { x: 1600, y: 1000, label: 'KORRIDOR', sub: 'C-1', size: 10 },
    { x: 1800, y: 870, label: 'KONTOR', sub: 'Befälsbyggnad', size: 13 },
    { x: 1850, y: 1300, label: 'LAGER', sub: 'Förrådsdepå', size: 16 },
    { x: 1510, y: 1780, label: 'HUVUDGRIND', sub: 'Södra infart', size: 14 },
    { x: 500, y: 575, label: 'KASERN', sub: 'Baracker', size: 12 },
    { x: 1500, y: 410, label: 'KOMMANDOPOST', sub: 'Ledningscentral', size: 12 },
    { x: 2575, y: 650, label: 'AMMOBUNKER', sub: 'Östligt förråd', size: 11 },
    { x: 530, y: 950, label: 'MOTORPOOL', sub: 'Fordonspark', size: 11 },
    { x: 350, y: 330, label: 'VAKTTORN NV', sub: '', size: 9 },
    { x: 2880, y: 330, label: 'VAKTTORN NÖ', sub: '', size: 9 },
  ];
  for (const z of zoneLabels) {
    if (!isOnScreen(z.x, z.y, cx, cy, w, h, 50)) continue; // skip off-screen labels
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#c8c8b4';
    ctx.font = `bold ${z.size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(z.label, z.x, z.y);
    if (z.sub) {
      ctx.globalAlpha = 0.09;
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

  // ── DEAD ENEMIES — viewport culled, looted enemies skipped entirely ──
  for (const enemy of state.enemies) {
    if (enemy.state !== 'dead') continue;
    if (enemy.looted) continue; // fully looted = gone from the world
    if (!isOnScreen(enemy.pos.x, enemy.pos.y, cx, cy, w, h, 30)) continue;
    ctx.save();

    if (enemy.type === 'boss') {
      // === BOSS CORPSE — dramatic sprawled body with blood pool ===
      const bossSize = R + 8;
      const hasSpeech = enemy.speechBubble && enemy.speechBubbleTimer && enemy.speechBubbleTimer > 0;
      
      // Expanding blood pool
      const deathAge = Math.min(10, state.time - ((enemy as any)._deathTime || state.time));
      if (!(enemy as any)._deathTime) (enemy as any)._deathTime = state.time;
      const poolR = 15 + Math.min(35, deathAge * 5);
      ctx.fillStyle = 'rgba(120, 20, 20, 0.4)';
      ctx.beginPath();
      ctx.ellipse(enemy.pos.x, enemy.pos.y + 2, poolR, poolR * 0.6, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Sprawled body (top-down)
      ctx.save();
      ctx.translate(enemy.pos.x, enemy.pos.y);
      ctx.rotate(enemy.angle + 0.3); // slightly angled
      
      // Torso
      ctx.fillStyle = '#3a3a4a';
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, bossSize * 0.55, bossSize * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Head (tilted)
      ctx.fillStyle = '#c4956a';
      ctx.beginPath();
      ctx.arc(bossSize * 0.4, bossSize * 0.15, bossSize * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#222';
      ctx.stroke();
      
      // Ushanka fallen slightly off
      ctx.fillStyle = '#3a2828';
      ctx.beginPath();
      ctx.arc(bossSize * 0.55, bossSize * 0.1, bossSize * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cc3333';
      ctx.font = '6px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', bossSize * 0.55, bossSize * 0.13);
      
      // Arms splayed
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
      
      // Dropped weapon
      ctx.fillStyle = '#444';
      ctx.save();
      ctx.translate(-bossSize * 0.5, -bossSize * 0.6);
      ctx.rotate(0.8);
      ctx.fillRect(0, -1.5, 22, 3);
      ctx.restore();
      
      // Legs
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

      // Boss death nameplate
      const fadeAlpha = hasSpeech ? 1.0 : 0.6;
      ctx.globalAlpha = fadeAlpha;
      ctx.fillStyle = 'rgba(200, 50, 50, 0.9)';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('† OSIPOVITJ †', enemy.pos.x, enemy.pos.y + bossSize * 0.5 + 16);

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
      }[enemy.type] || Math.PI * 0.45 - DEG15);
      const rearRange = isBodyguard ? 0.4 : ({
        scav: 0.15,
        soldier: 0.25,
        heavy: 0.4,
        turret: 0,
        sniper: 0.1,
        redneck: 0.2,
        dog: 0.5,
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
      // Boss: Commandant Osipovitj — larger, glowing, unique appearance
      const bossSize = R + 8;
      const phase = enemy.bossPhase || 0;
      const isProne = (enemy as any)._proneTimer > 0;

      // Menacing aura
      const auraColors = ['rgba(180, 60, 200, 0.12)', 'rgba(255, 80, 40, 0.18)', 'rgba(255, 30, 30, 0.25)'];
      const auraR = bossSize + 20 + Math.sin(state.time * 3) * 8;
      ctx.beginPath();
      ctx.arc(enemy.pos.x, enemy.pos.y, auraR, 0, Math.PI * 2);
      ctx.fillStyle = auraColors[phase];
      ctx.fill();

      // Second pulsing ring
      if (phase >= 1) {
        const ring2 = bossSize + 30 + Math.sin(state.time * 5) * 5;
        ctx.beginPath();
        ctx.arc(enemy.pos.x, enemy.pos.y, ring2, 0, Math.PI * 2);
        ctx.strokeStyle = phase === 2 ? 'rgba(255, 30, 30, 0.3)' : 'rgba(255, 120, 40, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw the boss character — dark uniform, ushanka with red star, glowing eyes
      const bodyColor = phase === 2 ? '#8a2a2a' : phase === 1 ? '#6a3a2a' : '#4a4a5a';
      const outlineColor = phase === 2 ? '#cc3333' : phase === 1 ? '#aa5533' : '#2a2a3a';
      const eyeColor = phase >= 1 ? '#ff4422' : '#ffaa00';

      if (isProne || (enemy as any)._proneGoDownTimer > 0) {
        // PRONE VISUAL — proper top-down lying body
        const goingDown = (enemy as any)._proneGoDownTimer > 0;
        const gettingUp = !goingDown && (enemy as any)._proneTimer < 1.0 && (enemy as any)._proneTimer > 0;
        // Transition: scale from standing to prone
        const transProgress = goingDown 
          ? 1 - ((enemy as any)._proneGoDownTimer / 0.2) // 0→1 as going down
          : gettingUp ? (enemy as any)._proneTimer : 1; // 1→0 as getting up
        const flattenY = 0.25 + (1 - transProgress) * 0.75; // 1.0 standing → 0.25 prone
        const stretchX = 1.0 + transProgress * 0.8; // 1.0 → 1.8

        ctx.save();
        ctx.translate(enemy.pos.x, enemy.pos.y);
        ctx.rotate(enemy.angle);
        ctx.scale(stretchX, flattenY);
        
        // Draw elongated body shape (top-down lying figure)
        // Torso
        ctx.fillStyle = bodyColor;
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, bossSize * 0.6, bossSize * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Head (at front)
        const headR = bossSize * 0.25;
        ctx.fillStyle = '#d4a574'; // skin
        ctx.beginPath();
        ctx.arc(bossSize * 0.45, 0, headR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = outlineColor;
        ctx.stroke();
        
        // Ushanka on head
        ctx.fillStyle = '#3a2828';
        ctx.beginPath();
        ctx.arc(bossSize * 0.5, 0, headR * 0.9, 0, Math.PI * 2);
        ctx.fill();
        // Red star on ushanka
        ctx.fillStyle = '#cc3333';
        ctx.font = `${Math.max(6, headR * 0.6)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('★', bossSize * 0.5, headR * 0.25);
        
        // Arms splayed out
        ctx.strokeStyle = '#d4a574';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        // Left arm
        ctx.beginPath();
        ctx.moveTo(bossSize * 0.1, -bossSize * 0.3);
        ctx.lineTo(bossSize * 0.3, -bossSize * 0.55);
        ctx.stroke();
        // Right arm (holding gun forward)
        ctx.beginPath();
        ctx.moveTo(bossSize * 0.1, bossSize * 0.3);
        ctx.lineTo(bossSize * 0.45, bossSize * 0.35);
        ctx.stroke();
        // Gun in right hand
        ctx.fillStyle = '#333';
        ctx.fillRect(bossSize * 0.4, bossSize * 0.3, bossSize * 0.3, 3);
        
        // Legs (behind body)
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
        // Boots
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(-bossSize * 0.65, -bossSize * 0.25, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-bossSize * 0.65, bossSize * 0.25, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        
        // Prone indicator
        ctx.fillStyle = 'rgba(255, 200, 50, 0.7)';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⬇ PRONE', enemy.pos.x, enemy.pos.y + bossSize * 0.5 + 10);
      } else {
        // Boss stomping walk animation — subtle body bob when moving
        const isMoving = enemy.state === 'chase' || enemy.state === 'attack' || enemy.state === 'flank';
        const stompBob = isMoving ? Math.sin(state.time * 8) * 2.5 : 0;
        const stompLean = isMoving ? Math.sin(state.time * 4) * 0.06 : 0;

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

      // Glowing eyes effect — simple flat circle
      const glowAlpha = 0.3 + Math.sin(state.time * 4) * 0.2;
      ctx.fillStyle = `rgba(255, ${phase >= 1 ? '60' : '170'}, ${phase >= 1 ? '20' : '40'}, ${glowAlpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(enemy.pos.x, enemy.pos.y - bossSize * 0.3, bossSize * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Boss ordering arm — extended pointing arm when giving orders
      if ((enemy as any)._orderingArm > 0) {
        ctx.save();
        ctx.translate(enemy.pos.x, enemy.pos.y);
        ctx.rotate(enemy.angle);
        const armWave = Math.sin(state.time * 12) * 0.15;
        // Extended right arm pointing forward
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bossSize * 0.3, -bossSize * 0.2);
        ctx.lineTo(bossSize * 1.2, -bossSize * 0.5 + armWave * 10);
        ctx.stroke();
        // Fist
        ctx.fillStyle = '#d4a574';
        ctx.beginPath();
        ctx.arc(bossSize * 1.2, -bossSize * 0.5 + armWave * 10, 3, 0, Math.PI * 2);
        ctx.fill();
        // Pointing indicator
        ctx.strokeStyle = 'rgba(255, 200, 50, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bossSize * 1.2, -bossSize * 0.5 + armWave * 10);
        ctx.lineTo(bossSize * 2.5, -bossSize * 0.8);
        ctx.stroke();
        ctx.restore();
      }

      // Boss name plate
      ctx.fillStyle = phase === 2 ? 'rgba(255, 50, 50, 0.9)' : phase === 1 ? 'rgba(255, 150, 50, 0.9)' : 'rgba(200, 160, 255, 0.8)';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★ COMMANDANT OSIPOVITJ ★', enemy.pos.x, enemy.pos.y + bossSize + 20);
      if (phase >= 1) {
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText(phase === 2 ? '☠ DESPERAT' : '⚠ RASANDE', enemy.pos.x, enemy.pos.y + bossSize + 30);
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
      if (useLOD) {
        drawSimpleCharacter(ctx, enemy.pos.x, enemy.pos.y, enemy.angle, cfg.body, cfg.outline, eSize);
      } else {
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
      // PANIC — yellow/orange flashing aura + screaming icon
      const panicPulse = 0.5 + Math.sin(state.time * 14) * 0.5;
      ctx.save();
      ctx.beginPath();
      ctx.arc(enemy.pos.x, enemy.pos.y, R + 10, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, ${Math.floor(200 + panicPulse * 55)}, 0, ${0.15 + panicPulse * 0.2})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 180, 0, ${panicPulse * 0.7})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      ctx.fillText('😱', enemy.pos.x, enemy.pos.y - R - 12);
      // Exclamation marks flying chaotically
      for (let pi = 0; pi < 3; pi++) {
        const pa = state.time * 8 + pi * (Math.PI * 2 / 3);
        const px = enemy.pos.x + Math.cos(pa) * 18;
        const py = enemy.pos.y - R - 14 + Math.sin(pa * 1.3) * 7;
        ctx.font = '8px sans-serif';
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

    // HP bar
    if (enemy.hp < enemy.maxHp) {
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
  // Bullet trails — batched
  {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 220, 80, 0.4)';
    ctx.beginPath();
    for (const b of state.bullets) {
      if (!b.fromPlayer) continue;
      if (!isOnScreen(b.pos.x, b.pos.y, cx, cy, w, h, 10)) continue;
      ctx.moveTo(b.pos.x, b.pos.y);
      ctx.lineTo(b.pos.x - b.vel.x * 3, b.pos.y - b.vel.y * 3);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 100, 60, 0.3)';
    ctx.beginPath();
    for (const b of state.bullets) {
      if (b.fromPlayer) continue;
      if (!isOnScreen(b.pos.x, b.pos.y, cx, cy, w, h, 10)) continue;
      ctx.moveTo(b.pos.x, b.pos.y);
      ctx.lineTo(b.pos.x - b.vel.x * 3, b.pos.y - b.vel.y * 3);
    }
    ctx.stroke();
  }

  // ── PLAYER ──
  ctx.save();
  const pulse = 0.6 + Math.sin(state.time * 2) * 0.2;

  // Radial glow
  // Flat glow circle instead of gradient for perf
  ctx.fillStyle = `rgba(100, 255, 80, ${pulse * 0.12})`;
  ctx.beginPath();
  ctx.arc(state.player.pos.x, state.player.pos.y, 35, 0, Math.PI * 2);
  ctx.fill();

  // Ring — changes color when in cover
  ctx.beginPath();
  ctx.arc(state.player.pos.x, state.player.pos.y, R + 8, 0, Math.PI * 2);
  if (state.player.inCover) {
    const coverPulse = 0.6 + Math.sin(state.time * 4) * 0.3;
    ctx.strokeStyle = state.player.peeking
      ? `rgba(255, 200, 60, ${coverPulse})`
      : `rgba(80, 180, 255, ${coverPulse})`;
    ctx.lineWidth = 4;
  } else {
    ctx.strokeStyle = `rgba(120, 255, 80, ${pulse})`;
    ctx.lineWidth = 3;
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
  drawCuteCharacter(
    ctx, state.player.pos.x, state.player.pos.y, state.player.angle,
    '#c0ee99', '#88cc55', '#2a3a1a', playerBlink,
    'beret', '#8a5545', true, state.player.inCover && !state.player.peeking ? R - 2 : R + 2, playerMoving
  );

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
    if (lc.looted) continue;
    if (dist2d(state.player.pos, lc.pos) < 70) {
      ctx.fillStyle = 'rgba(255, 230, 80, 0.9)';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('[E] SEARCH', lc.pos.x, lc.pos.y + lc.size + 6);
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

  // No lighting overlay — pure daylight, uniform everywhere

  // Flashbang stun effect — white screen + dizzy stars
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

  // EMPTY MAGAZINE — big on-screen text
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
