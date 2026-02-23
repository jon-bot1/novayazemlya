import { GameState, Prop, LightSource, WindowDef, Vec2 } from './types';

const R = 18;
const WALL_HEIGHT = 18;
let _lightCanvas: HTMLCanvasElement | null = null;

// Simple LOS check for renderer — skip detection zones behind walls
function rendererLOS(state: GameState, a: Vec2, b: Vec2): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(d / 15);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const px = a.x + dx * t;
    const py = a.y + dy * t;
    for (const w of state.walls) {
      if (px >= w.x && px <= w.x + w.w && py >= w.y && py <= w.y + w.h) return false;
    }
  }
  return true;
}

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

  const headR = size * 0.62;
  const torsoW = size * 0.7;
  const torsoH = size * 0.55;
  const legW = size * 0.18;
  const legH = size * 0.42;
  const armW = size * 0.14;
  const armH = size * 0.38;
  const shoulderOff = torsoW * 0.42;
  const skinColor = '#f0dcc0';
  const skinDark = '#d4b896';

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(1, size * 0.85, size * 0.5, size * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // === LEGS — clearly separated, with knee bend and boots ===
  ctx.save();
  ctx.rotate(angle);
  const walkPhase = (Date.now() % 400) / 400;
  const legSwing = Math.sin(walkPhase * Math.PI * 2) * 0.35;
  for (const side of [-1, 1]) {
    ctx.save();
    const legX = legW * 1.1 * side;
    ctx.translate(legX, torsoH * 0.35);
    ctx.rotate(legSwing * side);

    // Upper leg (thigh)
    ctx.fillStyle = shadeColor(bodyColor, -15);
    ctx.beginPath();
    ctx.roundRect(-legW / 2, 0, legW, legH * 0.55, 3);
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Knee joint
    ctx.fillStyle = shadeColor(bodyColor, -25);
    ctx.beginPath();
    ctx.arc(0, legH * 0.55, legW * 0.38, 0, Math.PI * 2);
    ctx.fill();

    // Lower leg (shin)
    ctx.fillStyle = shadeColor(bodyColor, -20);
    ctx.beginPath();
    ctx.roundRect(-legW * 0.45, legH * 0.5, legW * 0.9, legH * 0.45, 3);
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Boot — chunky with sole
    ctx.fillStyle = '#3a3832';
    ctx.beginPath();
    ctx.roundRect(-legW * 0.55, legH * 0.88, legW * 1.1, legH * 0.18, [0, 0, 3, 3]);
    ctx.fill();
    // Boot sole
    ctx.fillStyle = '#2a2822';
    ctx.fillRect(-legW * 0.55, legH * 1.02, legW * 1.1, 3);
    // Boot lace detail
    ctx.strokeStyle = '#5a5850';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-legW * 0.2, legH * 0.9);
    ctx.lineTo(legW * 0.2, legH * 0.9);
    ctx.stroke();

    ctx.restore();
  }
  ctx.restore();

  // === GUN ARM (right side, behind body when not aiming) ===
  if (hasGun) {
    ctx.save();
    ctx.rotate(angle);

    // Upper arm
    ctx.fillStyle = shadeColor(bodyColor, -5);
    ctx.beginPath();
    ctx.roundRect(shoulderOff - armW / 2, -armH * 0.1, armW, armH * 0.5, 3);
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Elbow
    ctx.fillStyle = shadeColor(bodyColor, -12);
    ctx.beginPath();
    ctx.arc(shoulderOff, armH * 0.35, armW * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Forearm — extends toward gun
    ctx.fillStyle = shadeColor(bodyColor, -8);
    ctx.beginPath();
    ctx.roundRect(shoulderOff - armW * 0.4, armH * 0.3, armW * 0.8, armH * 0.35, 2);
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Wrist + Hand gripping gun
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.roundRect(shoulderOff - 3.5, armH * 0.6, 7, 5, 2);
    ctx.fill();
    ctx.strokeStyle = skinDark;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // Fingers wrapping grip
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(shoulderOff + 2, armH * 0.68, 2, 0, Math.PI * 2);
    ctx.fill();

    // Gun — detailed
    const gunX = shoulderOff - 3;
    const gunY = armH * 0.55;
    // Barrel
    ctx.fillStyle = '#6a6a66';
    ctx.beginPath();
    ctx.roundRect(gunX, gunY - 2, size * 0.9, 4.5, 2);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // Receiver
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.roundRect(gunX + size * 0.55, gunY - 3.5, 8, 7, 1);
    ctx.fill();
    // Muzzle
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.roundRect(gunX + size * 0.85, gunY - 1.5, 5, 3, 1);
    ctx.fill();
    // Grip
    ctx.fillStyle = '#7a5a3a';
    ctx.beginPath();
    ctx.roundRect(gunX + size * 0.2, gunY + 2, 5, 6, 1);
    ctx.fill();

    ctx.restore();
  }

  // === TORSO — rectangular with detail ===
  ctx.save();
  ctx.rotate(angle);
  // Main torso shape
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-torsoW / 2, -torsoH * 0.35, torsoW, torsoH, [4, 4, 2, 2]);
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Body gradient
  const torsoGrad = ctx.createLinearGradient(0, -torsoH * 0.35, 0, torsoH * 0.65);
  torsoGrad.addColorStop(0, 'rgba(255,255,255,0.18)');
  torsoGrad.addColorStop(0.5, 'rgba(255,255,255,0.02)');
  torsoGrad.addColorStop(1, 'rgba(0,0,0,0.08)');
  ctx.fillStyle = torsoGrad;
  ctx.beginPath();
  ctx.roundRect(-torsoW / 2, -torsoH * 0.35, torsoW, torsoH, [4, 4, 2, 2]);
  ctx.fill();
  // Collar detail
  ctx.strokeStyle = shadeColor(bodyColor, -20);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-torsoW * 0.2, -torsoH * 0.32);
  ctx.lineTo(0, -torsoH * 0.18);
  ctx.lineTo(torsoW * 0.2, -torsoH * 0.32);
  ctx.stroke();
  // Center seam
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -torsoH * 0.15);
  ctx.lineTo(0, torsoH * 0.55);
  ctx.stroke();
  // Pocket patches
  ctx.fillStyle = shadeColor(bodyColor, -8);
  ctx.fillRect(-torsoW * 0.35, torsoH * 0.05, torsoW * 0.25, torsoH * 0.2);
  ctx.strokeStyle = shadeColor(bodyColor, -18);
  ctx.lineWidth = 0.6;
  ctx.strokeRect(-torsoW * 0.35, torsoH * 0.05, torsoW * 0.25, torsoH * 0.2);
  ctx.fillRect(torsoW * 0.1, torsoH * 0.05, torsoW * 0.25, torsoH * 0.2);
  ctx.strokeRect(torsoW * 0.1, torsoH * 0.05, torsoW * 0.25, torsoH * 0.2);
  // Belt
  ctx.fillStyle = '#4a4a3a';
  ctx.fillRect(-torsoW * 0.4, torsoH * 0.42, torsoW * 0.8, 4);
  // Belt buckle
  ctx.fillStyle = '#8a8a6a';
  ctx.beginPath();
  ctx.roundRect(-3, torsoH * 0.41, 6, 5, 1);
  ctx.fill();

  // === OFF-ARM (left side) — clearly articulated ===
  // Upper arm
  ctx.fillStyle = shadeColor(bodyColor, -5);
  ctx.beginPath();
  ctx.roundRect(-shoulderOff - armW / 2, -armH * 0.05, armW, armH * 0.45, 3);
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1;
  ctx.stroke();
  // Elbow
  ctx.fillStyle = shadeColor(bodyColor, -12);
  ctx.beginPath();
  ctx.arc(-shoulderOff, armH * 0.35, armW * 0.38, 0, Math.PI * 2);
  ctx.fill();
  // Forearm
  ctx.fillStyle = shadeColor(bodyColor, -8);
  ctx.beginPath();
  ctx.roundRect(-shoulderOff - armW * 0.4, armH * 0.3, armW * 0.8, armH * 0.3, 2);
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Hand
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.roundRect(-shoulderOff - 3, armH * 0.55, 6, 5, 2);
  ctx.fill();
  ctx.strokeStyle = skinDark;
  ctx.lineWidth = 0.7;
  ctx.stroke();
  // Fingers
  ctx.fillStyle = skinColor;
  for (const fx of [-1.5, 0, 1.5]) {
    ctx.beginPath();
    ctx.arc(-shoulderOff + fx, armH * 0.63, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore(); // end torso rotation

  // === HEAD ===
  ctx.save();
  ctx.translate(0, -torsoH * 0.5);

  // Neck
  ctx.fillStyle = skinColor;
  ctx.fillRect(-4, headR * 0.55, 8, 8);
  ctx.strokeStyle = skinDark;
  ctx.lineWidth = 0.6;
  ctx.strokeRect(-4, headR * 0.55, 8, 8);

  // Head shape
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(0, 0, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = skinDark;
  ctx.lineWidth = 1.8;
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

  // Rosy cheeks (no ears — they clip with rotation)
  ctx.fillStyle = 'rgba(230, 120, 120, 0.18)';
  ctx.beginPath();
  ctx.ellipse(-headR * 0.5, headR * 0.2, headR * 0.18, headR * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(headR * 0.5, headR * 0.2, headR * 0.18, headR * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Face (rotates with aim direction)
  ctx.save();
  ctx.rotate(angle);
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
    const eyeW = 4.5;
    const eyeH = 5.5;
    for (const ey of [-eyeYOff, eyeYOff]) {
      // Eye white
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(eyeX, ey, eyeW, eyeH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
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
      ctx.beginPath();
      ctx.arc(eyeX, ey + 1.5, 0.7, 0, Math.PI * 2);
      ctx.fill();
      // Eyelid line
      ctx.strokeStyle = 'rgba(100, 60, 40, 0.2)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(eyeX, ey, eyeW, -Math.PI * 0.8, -Math.PI * 0.2);
      ctx.stroke();
    }
    // Eyebrows
    ctx.strokeStyle = 'rgba(80, 50, 30, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(eyeX - 3, -eyeYOff - 5);
    ctx.quadraticCurveTo(eyeX + 2, -eyeYOff - 7, eyeX + 5, -eyeYOff - 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(eyeX - 3, eyeYOff + 5);
    ctx.quadraticCurveTo(eyeX + 2, eyeYOff + 7, eyeX + 5, eyeYOff + 4);
    ctx.stroke();
  }
  // Nose — small triangle
  ctx.fillStyle = 'rgba(200, 150, 120, 0.25)';
  ctx.beginPath();
  ctx.moveTo(headR * 0.55, -2);
  ctx.lineTo(headR * 0.62, 0);
  ctx.lineTo(headR * 0.55, 2);
  ctx.closePath();
  ctx.fill();
  // Mouth
  ctx.strokeStyle = 'rgba(180, 100, 80, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(headR * 0.45, 0, 2.5, -0.5, 0.5);
  ctx.stroke();
  ctx.restore(); // end face rotation

  // === HAT ===
  ctx.save();
  ctx.rotate(angle);
  switch (hatType) {
    case 'ushanka':
      ctx.fillStyle = hatColor;
      ctx.beginPath();
      ctx.arc(0, 0, headR * 1.12, -Math.PI * 0.82, Math.PI * 0.82);
      ctx.lineTo(0, -headR * 1.12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shadeColor(hatColor, -15);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Fur trim
      ctx.fillStyle = shadeColor(hatColor, 20);
      ctx.beginPath();
      ctx.arc(0, 0, headR * 1.12, Math.PI * 0.55, Math.PI * 0.82);
      ctx.arc(0, 0, headR * 0.95, Math.PI * 0.82, Math.PI * 0.55, true);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, headR * 1.12, -Math.PI * 0.82, -Math.PI * 0.55);
      ctx.arc(0, 0, headR * 0.95, -Math.PI * 0.55, -Math.PI * 0.82, true);
      ctx.closePath();
      ctx.fill();
      // Ear flaps
      ctx.fillStyle = hatColor;
      ctx.fillRect(-headR * 1.15, -headR * 0.35, headR * 0.35, headR * 0.7);
      ctx.fillStyle = shadeColor(hatColor, 15);
      ctx.fillRect(-headR * 1.15, -headR * 0.25, headR * 0.35, headR * 0.1);
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
      // Helmet rim
      ctx.fillStyle = shadeColor(hatColor, -10);
      ctx.beginPath();
      ctx.arc(0, -headR * 0.05, headR * 1.18, Math.PI * 0.65, Math.PI * 0.9);
      ctx.arc(0, -headR * 0.05, headR * 1.05, Math.PI * 0.9, Math.PI * 0.65, true);
      ctx.closePath();
      ctx.fill();
      // Chin strap
      ctx.strokeStyle = '#5a5a4a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, headR * 0.1, headR * 0.85, Math.PI * 0.25, Math.PI * 0.75);
      ctx.stroke();
      break;
    case 'beret':
      ctx.fillStyle = hatColor;
      ctx.beginPath();
      ctx.ellipse(-headR * 0.1, -headR * 0.68, headR * 0.88, headR * 0.4, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shadeColor(hatColor, -15);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Band
      ctx.fillStyle = shadeColor(hatColor, -20);
      ctx.beginPath();
      ctx.arc(0, 0, headR * 1.02, -Math.PI * 0.55, Math.PI * 0.55);
      ctx.arc(0, 0, headR * 0.95, Math.PI * 0.55, -Math.PI * 0.55, true);
      ctx.closePath();
      ctx.fill();
      // Nub
      ctx.fillStyle = hatColor;
      ctx.beginPath();
      ctx.arc(-headR * 0.15, -headR * 1.0, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'bandana':
      ctx.fillStyle = hatColor;
      ctx.beginPath();
      ctx.arc(0, 0, headR * 1.04, -Math.PI * 0.72, Math.PI * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shadeColor(hatColor, -12);
      ctx.lineWidth = 1;
      ctx.stroke();
      // Knot + tails
      ctx.beginPath();
      ctx.moveTo(-headR * 0.65, -headR * 0.35);
      ctx.quadraticCurveTo(-headR * 1.3, -headR * 0.55, -headR * 1.1, -headR * 0.1);
      ctx.lineTo(-headR * 0.7, -headR * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-headR * 0.6, -headR * 0.15);
      ctx.quadraticCurveTo(-headR * 1.15, -headR * 0.25, -headR * 0.95, 0.05);
      ctx.lineTo(-headR * 0.5, 0);
      ctx.closePath();
      ctx.fill();
      // Pattern dots
      ctx.fillStyle = shadeColor(hatColor, 15);
      ctx.globalAlpha = 0.3;
      for (let d = 0; d < 5; d++) {
        const da = -Math.PI * 0.5 + d * 0.3;
        ctx.beginPath();
        ctx.arc(Math.cos(da) * headR * 0.75, Math.sin(da) * headR * 0.75, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
  }
  ctx.restore(); // end hat

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
      // Highlight
      const g = ctx.createLinearGradient(left, top, left, top + h);
      g.addColorStop(0, 'rgba(255,255,255,0.15)');
      g.addColorStop(1, 'rgba(0,0,0,0.08)');
      ctx.fillStyle = g;
      ctx.fillRect(left, top, w, h);
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
      const tg = ctx.createLinearGradient(left, top, left + w, top);
      tg.addColorStop(0, 'rgba(255,255,255,0.08)');
      tg.addColorStop(0.5, 'rgba(255,255,255,0.02)');
      tg.addColorStop(1, 'rgba(0,0,0,0.05)');
      ctx.fillStyle = tg;
      ctx.fillRect(left, top, w, h);
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
  }
  ctx.restore();
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

  // Zone labels — styled geographic markers
  const zoneLabels = [
    { x: 250, y: 250, label: 'HANGAR A', sub: 'Huvudhall', size: 20 },
    { x: 250, y: 680, label: 'HANGAR B', sub: 'Södra sektionen', size: 16 },
    { x: 600, y: 255, label: 'KORRIDOR', sub: 'Passage C-1', size: 11 },
    { x: 780, y: 100, label: 'KONTOR 1', sub: 'Befälsrum', size: 13 },
    { x: 1060, y: 100, label: 'KONTOR 2', sub: 'Kommunikation', size: 13 },
    { x: 780, y: 350, label: 'KONTOR 3', sub: 'Arkiv', size: 13 },
    { x: 1060, y: 350, label: 'KONTOR 4', sub: 'Operationssal', size: 13 },
    { x: 850, y: 500, label: 'LAGER', sub: 'Förrådsdepå', size: 18 },
    { x: 1060, y: 720, label: 'DJUPLAGER', sub: 'Hemligt förråd', size: 14 },
    { x: 60, y: 450, label: 'VÄST', sub: 'Infart', size: 10 },
  ];
  for (const z of zoneLabels) {
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#c8c8b4';
    ctx.font = `bold ${z.size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(z.label, z.x, z.y);
    ctx.globalAlpha = 0.09;
    ctx.font = `${Math.max(8, z.size - 6)}px sans-serif`;
    ctx.fillText(z.sub, z.x, z.y + z.size + 2);
    ctx.restore();
  }

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

  // ── WINDOWS on walls ──
  for (const win of state.windows) {
    // Window frame
    ctx.fillStyle = 'rgba(140, 180, 220, 0.35)';
    ctx.fillRect(win.x, win.y, win.w, win.h);
    // Glass reflection
    const glassGrad = win.direction === 'north' || win.direction === 'south'
      ? ctx.createLinearGradient(win.x, win.y, win.x, win.y + win.h)
      : ctx.createLinearGradient(win.x, win.y, win.x + win.w, win.y);
    glassGrad.addColorStop(0, 'rgba(180, 210, 255, 0.5)');
    glassGrad.addColorStop(0.5, 'rgba(200, 230, 255, 0.25)');
    glassGrad.addColorStop(1, 'rgba(160, 200, 240, 0.4)');
    ctx.fillStyle = glassGrad;
    ctx.fillRect(win.x, win.y, win.w, win.h);
    // Frame border
    ctx.strokeStyle = '#4a5a6a';
    ctx.lineWidth = 2;
    ctx.strokeRect(win.x, win.y, win.w, win.h);
    // Cross bar
    if (win.w > win.h) {
      ctx.strokeStyle = '#5a6a7a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(win.x + win.w / 2, win.y);
      ctx.lineTo(win.x + win.w / 2, win.y + win.h);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#5a6a7a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(win.x, win.y + win.h / 2);
      ctx.lineTo(win.x + win.w, win.y + win.h / 2);
      ctx.stroke();
    }
    // Light shaft from window
    ctx.save();
    const shaftLen = 80;
    let sx = win.x, sy = win.y, sw = win.w, sh = win.h;
    if (win.direction === 'north') { sy += win.h; sh = shaftLen; }
    else if (win.direction === 'south') { sy -= shaftLen; sh = shaftLen; }
    else if (win.direction === 'west') { sx += win.w; sw = shaftLen; }
    else if (win.direction === 'east') { sx -= shaftLen; sw = shaftLen; }
    const shaftGrad = win.direction === 'north' || win.direction === 'south'
      ? ctx.createLinearGradient(sx, sy, sx, sy + sh)
      : ctx.createLinearGradient(sx, sy, sx + sw, sy);
    shaftGrad.addColorStop(0, 'rgba(180, 210, 255, 0.12)');
    shaftGrad.addColorStop(1, 'rgba(180, 210, 255, 0)');
    ctx.fillStyle = shaftGrad;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.restore();
  }

  // ── WALLS (3D perspective) ──
  const sortedWalls = [...state.walls].sort((a, b) => a.y - b.y);
  for (const wall of sortedWalls) {
    drawWall3D(ctx, wall.x, wall.y, wall.w, wall.h, wall.color);
  }

  // ── PROPS (decorative structures) ──
  const sortedProps = [...state.props].sort((a, b) => a.pos.y - b.pos.y);
  for (const prop of sortedProps) {
    drawProp(ctx, prop);
  }

  // ── ALARM PANELS ──
  for (const panel of state.alarmPanels) {
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
    ctx.fillText(panel.hacked ? 'HACKAD' : panel.activated ? 'ALARM!' : 'PANEL', px, py + 30);

    ctx.restore();

    // Interaction prompt
    if (!panel.hacked && dist2d(state.player.pos, panel.pos) < 50) {
      ctx.fillStyle = 'rgba(80, 255, 180, 0.9)';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('[E] HACKA', px, py - 24);
    }
  }

  // Alarm overlay effect
  if (state.alarmActive) {
    const flash = Math.sin(state.time * 6) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(200, 30, 30, ${flash * 0.03})`;
    ctx.fillRect(cx, cy, w, h);
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
      const icons: Record<string, string> = { crate: '📦', body: '💀', cabinet: '🗄️', barrel: '🛢️', desk: '🖥️', locker: '🔒', archive: '📁' };

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

    // Only show detection zone if player can see the enemy (not through walls)
    if (rendererLOS(state, state.player.pos, enemy.pos)) {
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
        ctx.setLineDash([3, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
    const isBlinking = enemy.eyeBlink < 0.15;

    if (enemy.type === 'turret') {
      // Draw mounted machine gun — sandbag base + gun barrel
      drawMountedGun(ctx, enemy.pos.x, enemy.pos.y, enemy.angle, enemy.state !== 'patrol');
    } else if (enemy.type === 'boss') {
      // Boss: Kommendant Volkov — larger, glowing, unique appearance
      const bossSize = R + 8;
      const phase = enemy.bossPhase || 0;

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
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw the boss character — dark uniform, ushanka with red star, glowing eyes
      const bodyColor = phase === 2 ? '#8a2a2a' : phase === 1 ? '#6a3a2a' : '#4a4a5a';
      const outlineColor = phase === 2 ? '#cc3333' : phase === 1 ? '#aa5533' : '#2a2a3a';
      const eyeColor = phase >= 1 ? '#ff4422' : '#ffaa00';

      drawCuteCharacter(
        ctx, enemy.pos.x, enemy.pos.y, enemy.angle,
        bodyColor, outlineColor, eyeColor, isBlinking,
        'ushanka', '#3a2828', true, bossSize
      );

      // Glowing eyes effect
      ctx.save();
      ctx.translate(enemy.pos.x, enemy.pos.y);
      const glowAlpha = 0.3 + Math.sin(state.time * 4) * 0.2;
      const eyeGlow = ctx.createRadialGradient(0, -bossSize * 0.3, 0, 0, -bossSize * 0.3, bossSize * 0.6);
      eyeGlow.addColorStop(0, `rgba(255, ${phase >= 1 ? '60' : '170'}, ${phase >= 1 ? '20' : '40'}, ${glowAlpha})`);
      eyeGlow.addColorStop(1, 'rgba(255, 60, 20, 0)');
      ctx.fillStyle = eyeGlow;
      ctx.beginPath();
      ctx.arc(0, -bossSize * 0.3, bossSize * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Boss name plate
      ctx.fillStyle = phase === 2 ? 'rgba(255, 50, 50, 0.9)' : phase === 1 ? 'rgba(255, 150, 50, 0.9)' : 'rgba(200, 160, 255, 0.8)';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★ KOMMENDANT VOLKOV ★', enemy.pos.x, enemy.pos.y + bossSize + 20);
      if (phase >= 1) {
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText(phase === 2 ? '☠ DESPERAT' : '⚠ RASANDE', enemy.pos.x, enemy.pos.y + bossSize + 30);
      }
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

    // Status icons
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    if (enemy.state === 'attack') {
      ctx.fillText('💢', enemy.pos.x, enemy.pos.y - R - 12);
    } else if (enemy.state === 'chase') {
      ctx.fillText('❗', enemy.pos.x, enemy.pos.y - R - 12);
    } else if (enemy.state === 'investigate') {
      const pulse = 0.6 + Math.sin(state.time * 4) * 0.4;
      ctx.globalAlpha = pulse;
      ctx.fillText('❓', enemy.pos.x, enemy.pos.y - R - 12);
      ctx.globalAlpha = 1;
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
    const typeLabel = { scav: 'PLUNDRARE', soldier: 'SOLDAT', heavy: 'TUNGT', turret: 'KULSPRUTA', boss: '' }[enemy.type];
    ctx.fillText(typeLabel || '', enemy.pos.x, enemy.pos.y + R + 16);
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
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
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

    // Dashed outer ring
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(80, 180, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(state.player.pos.x, state.player.pos.y, R + 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    ctx.fillStyle = state.player.peeking ? 'rgba(255, 200, 60, 0.9)' : 'rgba(80, 180, 255, 0.9)';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      state.player.peeking ? '🔫 KIKA FRAM' : '🛡️ I SKYDD',
      state.player.pos.x, state.player.pos.y - R - 34
    );
    ctx.restore();
  }

  // Character
  const playerBlink = Math.sin(state.time * 0.8) > 0.95;
  drawCuteCharacter(
    ctx, state.player.pos.x, state.player.pos.y, state.player.angle,
    '#c0ee99', '#88cc55', '#2a3a1a', playerBlink,
    'beret', '#8a5545', true, state.player.inCover && !state.player.peeking ? R - 2 : R + 2
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

  // ── FIXED PIXEL LIGHTING ──
  if (!_lightCanvas || _lightCanvas.width !== w || _lightCanvas.height !== h) {
    _lightCanvas = document.createElement('canvas');
    _lightCanvas.width = w;
    _lightCanvas.height = h;
  }
  const lightCanvas = _lightCanvas;
  const lctx = lightCanvas.getContext('2d')!;
  
  // Start with darkness
  lctx.fillStyle = 'rgba(0, 0, 0, 0.80)';
  lctx.fillRect(0, 0, w, h);
  
  // Cut out fixed light circles — no animation, no flicker
  lctx.globalCompositeOperation = 'destination-out';
  
  // Player soft glow
  const playerScreenX = state.player.pos.x - cx;
  const playerScreenY = state.player.pos.y - cy;
  const pr = 75;
  const playerGlow = lctx.createRadialGradient(playerScreenX, playerScreenY, 0, playerScreenX, playerScreenY, pr);
  playerGlow.addColorStop(0, 'rgba(0,0,0,0.8)');
  playerGlow.addColorStop(0.3, 'rgba(0,0,0,0.5)');
  playerGlow.addColorStop(0.6, 'rgba(0,0,0,0.2)');
  playerGlow.addColorStop(1, 'rgba(0,0,0,0)');
  lctx.fillStyle = playerGlow;
  lctx.fillRect(playerScreenX - pr, playerScreenY - pr, pr * 2, pr * 2);
  
  // Fixed light sources — static intensity, smooth fade
  for (const light of state.lights) {
    const lx = light.pos.x - cx;
    const ly = light.pos.y - cy;
    if (lx < -light.radius || lx > w + light.radius || ly < -light.radius || ly > h + light.radius) continue;
    
    const r = light.radius;
    const I = light.intensity;
    const grad = lctx.createRadialGradient(lx, ly, 0, lx, ly, r);
    grad.addColorStop(0, `rgba(0,0,0,${I})`);
    grad.addColorStop(0.2, `rgba(0,0,0,${I * 0.75})`);
    grad.addColorStop(0.45, `rgba(0,0,0,${I * 0.4})`);
    grad.addColorStop(0.7, `rgba(0,0,0,${I * 0.15})`);
    grad.addColorStop(0.9, `rgba(0,0,0,${I * 0.04})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = grad;
    lctx.fillRect(lx - r, ly - r, r * 2, r * 2);
  }
  
  // Muzzle flash light (brief, from player bullets)
  for (const b of state.bullets) {
    if (b.fromPlayer && b.life > 0.85) {
      const bx = b.pos.x - cx;
      const by = b.pos.y - cy;
      const flashGrad = lctx.createRadialGradient(bx, by, 0, bx, by, 55);
      flashGrad.addColorStop(0, 'rgba(0,0,0,0.85)');
      flashGrad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
      flashGrad.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = flashGrad;
      lctx.fillRect(bx - 55, by - 55, 110, 110);
    }
  }
  
  // Subtle color tint from light sources
  lctx.globalCompositeOperation = 'source-atop';
  for (const light of state.lights) {
    const lx = light.pos.x - cx;
    const ly = light.pos.y - cy;
    if (lx < -light.radius || lx > w + light.radius || ly < -light.radius || ly > h + light.radius) continue;
    const r = light.radius * 0.7;
    const grad = lctx.createRadialGradient(lx, ly, 0, lx, ly, r);
    grad.addColorStop(0, light.color + '12');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = grad;
    lctx.fillRect(lx - r, ly - r, r * 2, r * 2);
  }
  
  // Draw the light overlay
  ctx.drawImage(lightCanvas, 0, 0);
  
  // Static colored halos
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.translate(-cx, -cy);
  for (const light of state.lights) {
    const lx = light.pos.x;
    const ly = light.pos.y;
    if (lx - cx < -light.radius || lx - cx > w + light.radius || ly - cy < -light.radius || ly - cy > h + light.radius) continue;
    const I = light.intensity * 0.12;
    const r = light.radius * 0.5;
    const grad = ctx.createRadialGradient(lx, ly, 0, lx, ly, r);
    grad.addColorStop(0, light.color + Math.floor(I * 255).toString(16).padStart(2, '0'));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Subtle vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.45, w / 2, h / 2, w * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.45)');
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
