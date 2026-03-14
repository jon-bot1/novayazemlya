// Graphics quality settings — persisted in localStorage

// ── DAY/NIGHT SYSTEM ──
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

export function getTimeOfDay(gameTime: number): TimeOfDay {
  if (gameTime < 60) return 'dawn';
  if (gameTime < 180) return 'day';
  if (gameTime < 240) return 'dusk';
  return 'night';
}

export function getDarknessFactor(gameTime: number): number {
  const tod = getTimeOfDay(gameTime);
  switch (tod) {
    case 'dawn': return 0.15 - (gameTime / 60) * 0.15;
    case 'day': return 0;
    case 'dusk': return ((gameTime - 180) / 60) * 0.45;
    case 'night': return 0.45 + Math.min(0.25, (gameTime - 240) / 120 * 0.25);
  }
}

export function getNightEnemyBuffs(gameTime: number): { damageMult: number; alertRangeMult: number; lootValueMult: number } {
  const darkness = getDarknessFactor(gameTime);
  return {
    damageMult: 1 + darkness * 0.3,
    alertRangeMult: 1 - darkness * 0.25,
    lootValueMult: 1 + darkness * 0.5,
  };
}

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
  _hitMarkers = _hitMarkers.filter(h => {
    const age = currentTime - h.time;
    return age >= 0 && age < 1.0;
  });
}
export function clearAllHitMarkers() { _hitMarkers = []; }

// ── GRANULAR GRAPHICS SETTINGS ──

export type GraphicsPreset = 'high' | 'medium' | 'low';
// Keep old type for backward compat
export type GraphicsQuality = 'high' | 'low';
export type RenderDistance = 'far' | 'normal' | 'near';

export interface GraphicsSettings {
  weather: boolean;       // snow, fog, aurora, comet
  muzzleFlash: boolean;   // gun flash effects
  tracers: boolean;       // bullet tracer lines
  bloodStains: boolean;   // persistent blood decals
  detailedChars: boolean; // detailed character rendering
  renderDist: RenderDistance;
}

const SETTINGS_KEY = 'novaya_gfx_settings';
const PRESET_KEY = 'novaya_gfx_preset';

// Preset definitions
const PRESETS: Record<GraphicsPreset, GraphicsSettings> = {
  high: { weather: true, muzzleFlash: true, tracers: true, bloodStains: true, detailedChars: true, renderDist: 'far' },
  medium: { weather: true, muzzleFlash: true, tracers: false, bloodStains: true, detailedChars: false, renderDist: 'normal' },
  low: { weather: false, muzzleFlash: false, tracers: false, bloodStains: false, detailedChars: false, renderDist: 'near' },
};

let _settings: GraphicsSettings = { ...PRESETS.high };
let _preset: GraphicsPreset | 'custom' = 'high';

function save() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(_settings));
    localStorage.setItem(PRESET_KEY, _preset);
  } catch { /* silent */ }
}

function detectPreset(s: GraphicsSettings): GraphicsPreset | 'custom' {
  for (const key of ['high', 'medium', 'low'] as GraphicsPreset[]) {
    const p = PRESETS[key];
    if (s.weather === p.weather && s.muzzleFlash === p.muzzleFlash && s.tracers === p.tracers &&
        s.bloodStains === p.bloodStains && s.detailedChars === p.detailedChars && s.renderDist === p.renderDist) {
      return key;
    }
  }
  return 'custom';
}

// ── Public API ──

export function getSettings(): Readonly<GraphicsSettings> { return _settings; }
export function getPreset(): GraphicsPreset | 'custom' { return _preset; }
export function getPresets(): Record<GraphicsPreset, GraphicsSettings> { return PRESETS; }

export function applyPreset(preset: GraphicsPreset) {
  _settings = { ...PRESETS[preset] };
  _preset = preset;
  save();
}

export function updateSetting<K extends keyof GraphicsSettings>(key: K, value: GraphicsSettings[K]) {
  _settings[key] = value;
  _preset = detectPreset(_settings);
  save();
}

export function loadSettings(): GraphicsSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      _settings = { ...PRESETS.high, ...parsed };
      _preset = detectPreset(_settings);
      return _settings;
    }
    // Migrate from old keys
    const oldQ = localStorage.getItem('novaya_graphics_quality');
    const oldD = localStorage.getItem('novaya_render_distance');
    if (oldQ === 'low') {
      _settings = { ...PRESETS.low };
      if (oldD === 'far' || oldD === 'normal' || oldD === 'near') _settings.renderDist = oldD;
    } else if (oldD) {
      _settings = { ...PRESETS.high };
      if (oldD === 'far' || oldD === 'normal' || oldD === 'near') _settings.renderDist = oldD;
    }
    _preset = detectPreset(_settings);
    save();
  } catch { /* silent */ }
  return _settings;
}

// ── Backward-compatible feature checks (used by engine.ts & renderer.ts) ──
export function hasWeatherEffects(): boolean { return _settings.weather; }
export function hasMuzzleFlash(): boolean { return _settings.muzzleFlash; }
export function hasTracerLines(): boolean { return _settings.tracers; }
export function hasBloodStains(): boolean { return _settings.bloodStains; }
export function hasDetailedCharacters(): boolean { return _settings.detailedChars; }

// Backward-compat wrappers
export function getGraphicsQuality(): GraphicsQuality { return _preset === 'low' ? 'low' : 'high'; }
export function setGraphicsQuality(q: GraphicsQuality) { applyPreset(q === 'low' ? 'low' : 'high'); }
export function getRenderDistance(): RenderDistance { return _settings.renderDist; }
export function setRenderDistance(d: RenderDistance) { updateSetting('renderDist', d); }
export function getRenderDistMultiplier(): number {
  return _settings.renderDist === 'far' ? 1.0 : _settings.renderDist === 'normal' ? 0.6 : 0.35;
}

// Initialize on load
loadSettings();
