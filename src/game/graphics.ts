// Graphics quality settings — persisted in localStorage

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
