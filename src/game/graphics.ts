// Graphics quality settings — persisted in localStorage

export type GraphicsQuality = 'high' | 'low';

const STORAGE_KEY = 'novaya_graphics_quality';

let _quality: GraphicsQuality = 'high';

export function getGraphicsQuality(): GraphicsQuality {
  return _quality;
}

export function setGraphicsQuality(q: GraphicsQuality) {
  _quality = q;
  try { localStorage.setItem(STORAGE_KEY, q); } catch { /* silent */ }
}

export function loadGraphicsQuality(): GraphicsQuality {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'low' || stored === 'high') {
      _quality = stored;
      return stored;
    }
  } catch { /* silent */ }
  return 'high';
}

// Feature checks
export function hasWeatherEffects(): boolean { return _quality === 'high'; }
export function hasMuzzleFlash(): boolean { return _quality === 'high'; }
export function hasTracerLines(): boolean { return _quality === 'high'; }
export function hasBloodStains(): boolean { return _quality === 'high'; }
export function hasDetailedCharacters(): boolean { return _quality === 'high'; }

// Initialize on load
loadGraphicsQuality();
