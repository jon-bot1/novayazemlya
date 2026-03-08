// Graphics quality settings — persisted in localStorage

// ── DAY/NIGHT SYSTEM ──
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

// Map game time (0-300s) to time-of-day cycle
export function getTimeOfDay(gameTime: number): TimeOfDay {
  // 0-60s = dawn, 60-180s = day, 180-240s = dusk, 240+ = night
  if (gameTime < 60) return 'dawn';
  if (gameTime < 180) return 'day';
  if (gameTime < 240) return 'dusk';
  return 'night';
}

// Returns darkness factor 0 (bright) to 1 (dark)
export function getDarknessFactor(gameTime: number): number {
  const tod = getTimeOfDay(gameTime);
  switch (tod) {
    case 'dawn': return 0.15 - (gameTime / 60) * 0.15; // fading from dim
    case 'day': return 0;
    case 'dusk': return ((gameTime - 180) / 60) * 0.45; // 0 → 0.45
    case 'night': return 0.45 + Math.min(0.25, (gameTime - 240) / 120 * 0.25); // 0.45 → 0.7
  }
}

// Enemy stat buffs at night
export function getNightEnemyBuffs(gameTime: number): { damageMult: number; alertRangeMult: number; lootValueMult: number } {
  const darkness = getDarknessFactor(gameTime);
  return {
    damageMult: 1 + darkness * 0.3,       // up to +21% damage
    alertRangeMult: 1 - darkness * 0.25,   // shorter alert range (darker = harder to see)
    lootValueMult: 1 + darkness * 0.5,     // up to +35% loot value at night
  };
}

// Flashlight cone parameters
export function getFlashlightParams(): { coneAngle: number; range: number; intensity: number } {
  return { coneAngle: 0.4, range: 200, intensity: 0.7 };
}

// ── HIT MARKER SYSTEM ──
export interface HitMarker {
  x: number;
  y: number;
  time: number;
  isKill: boolean;
  isHeadshot: boolean;
  damage: number;
}

let _hitMarkers: HitMarker[] = [];

export function addHitMarker(x: number, y: number, time: number, isKill: boolean, isHeadshot: boolean, damage: number) {
  _hitMarkers.push({ x, y, time, isKill, isHeadshot, damage });
  if (_hitMarkers.length > 20) _hitMarkers.shift();
}

export function getHitMarkers(): HitMarker[] { return _hitMarkers; }
export function clearOldHitMarkers(currentTime: number) {
  _hitMarkers = _hitMarkers.filter(h => currentTime - h.time < 1.0);
}

export type GraphicsQuality = 'high' | 'low';
export type RenderDistance = 'far' | 'normal' | 'near';

const STORAGE_KEY = 'novaya_graphics_quality';
const RENDER_DIST_KEY = 'novaya_render_distance';

let _quality: GraphicsQuality = 'high';
let _renderDist: RenderDistance = 'far';

export function getGraphicsQuality(): GraphicsQuality { return _quality; }
export function setGraphicsQuality(q: GraphicsQuality) {
  _quality = q;
  try { localStorage.setItem(STORAGE_KEY, q); } catch { /* silent */ }
}
export function loadGraphicsQuality(): GraphicsQuality {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'low' || stored === 'high') { _quality = stored; return stored; }
  } catch { /* silent */ }
  return 'high';
}

export function getRenderDistance(): RenderDistance { return _renderDist; }
export function setRenderDistance(d: RenderDistance) {
  _renderDist = d;
  try { localStorage.setItem(RENDER_DIST_KEY, d); } catch { /* silent */ }
}
export function loadRenderDistance(): RenderDistance {
  try {
    const stored = localStorage.getItem(RENDER_DIST_KEY);
    if (stored === 'far' || stored === 'normal' || stored === 'near') { _renderDist = stored; return stored; }
  } catch { /* silent */ }
  return 'far';
}

/** Returns a multiplier for isOnScreen margins: far=1.0, normal=0.6, near=0.35 */
export function getRenderDistMultiplier(): number {
  return _renderDist === 'far' ? 1.0 : _renderDist === 'normal' ? 0.6 : 0.35;
}

// Feature checks
export function hasWeatherEffects(): boolean { return _quality === 'high'; }
export function hasMuzzleFlash(): boolean { return _quality === 'high'; }
export function hasTracerLines(): boolean { return _quality === 'high'; }
export function hasBloodStains(): boolean { return _quality === 'high'; }
export function hasDetailedCharacters(): boolean { return _quality === 'high'; }

// Initialize on load
loadGraphicsQuality();
loadRenderDistance();
