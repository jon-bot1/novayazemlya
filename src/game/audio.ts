// Procedural sound effects using Web Audio API — zero latency, no backend needed

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

export function playGunshot(type: 'pistol' | 'rifle' | 'shotgun' | 'heavy' | 'turret' = 'pistol') {
  const ctx = getCtx();
  const now = ctx.currentTime;

  const configs = {
    pistol:  { freq: 180, decay: 0.08, noiseVol: 0.3, noiseDur: 0.05, gain: 0.25 },
    rifle:   { freq: 120, decay: 0.1,  noiseVol: 0.4, noiseDur: 0.07, gain: 0.3 },
    shotgun: { freq: 80,  decay: 0.15, noiseVol: 0.6, noiseDur: 0.12, gain: 0.35 },
    heavy:   { freq: 60,  decay: 0.18, noiseVol: 0.5, noiseDur: 0.1,  gain: 0.35 },
    turret:  { freq: 100, decay: 0.06, noiseVol: 0.5, noiseDur: 0.04, gain: 0.3 },
  };
  const c = configs[type];

  // Low thump oscillator
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(c.freq, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + c.decay);
  oscGain.gain.setValueAtTime(c.gain, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + c.decay);
  osc.connect(oscGain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + c.decay + 0.01);

  // Noise burst (crack)
  const bufferSize = Math.floor(ctx.sampleRate * c.noiseDur);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  noise.buffer = noiseBuffer;
  noiseGain.gain.setValueAtTime(c.noiseVol, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + c.noiseDur);

  // Highpass to make it snappy
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 800;
  noise.connect(hp).connect(noiseGain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + c.noiseDur + 0.01);
}

export function playExplosion() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Deep boom
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(60, now);
  osc.frequency.exponentialRampToValueAtTime(20, now + 0.4);
  oscGain.gain.setValueAtTime(0.5, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(oscGain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.45);

  // Noise rumble
  const bufferSize = Math.floor(ctx.sampleRate * 0.3);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) ** 0.5;
  }
  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  noise.buffer = noiseBuffer;
  noiseGain.gain.setValueAtTime(0.4, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 400;
  noise.connect(lp).connect(noiseGain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.35);
}

export function playHit() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.07);
}

export function playPickup() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(900, now + 0.1);
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.13);
}

let lastFootstepTime = 0;

export function playFootstep(mode: 'sneak' | 'walk' | 'sprint') {
  const now = performance.now();
  const intervals = { sneak: 500, walk: 320, sprint: 200 };
  if (now - lastFootstepTime < intervals[mode]) return;
  lastFootstepTime = now;

  const ctx = getCtx();
  const t = ctx.currentTime;

  const volumes = { sneak: 0.02, walk: 0.06, sprint: 0.12 };
  const pitches = { sneak: 200, walk: 150, sprint: 120 };

  // Short noise burst for footstep
  const bufLen = Math.floor(ctx.sampleRate * 0.04);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volumes[mode], t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = pitches[mode];

  src.connect(lp).connect(gain).connect(ctx.destination);
  src.start(t);
  src.stop(t + 0.05);
}
