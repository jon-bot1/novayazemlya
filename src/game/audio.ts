// Procedural sound effects using Web Audio API — zero latency, no backend needed

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// Master compressor to prevent clipping and balance volume
function getMaster(ctx: AudioContext): DynamicsCompressorNode {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 12;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.1;
  comp.connect(ctx.destination);
  return comp;
}

// Reverb impulse for indoor environment
function createReverb(ctx: AudioContext, duration: number = 0.4, decay: number = 2): ConvolverNode {
  const length = ctx.sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  const convolver = ctx.createConvolver();
  convolver.buffer = impulse;
  return convolver;
}

export function playGunshot(type: 'pistol' | 'rifle' | 'shotgun' | 'heavy' | 'turret' | 'boss' = 'pistol') {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const master = getMaster(ctx);

  const configs = {
    pistol: {
      freq: 220, freqEnd: 50, decay: 0.12,
      noiseVol: 0.12, noiseDur: 0.08, noiseHP: 1200,
      gain: 0.08, tailFreq: 140, tailDecay: 0.06, tailGain: 0.03,
      distortion: 2,
    },
    rifle: {
      freq: 150, freqEnd: 35, decay: 0.15,
      noiseVol: 0.03, noiseDur: 0.1, noiseHP: 600,
      gain: 0.02, tailFreq: 100, tailDecay: 0.1, tailGain: 0.007,
      distortion: 4,
    },
    shotgun: {
      freq: 70, freqEnd: 20, decay: 0.22,
      noiseVol: 0.035, noiseDur: 0.18, noiseHP: 300,
      gain: 0.025, tailFreq: 60, tailDecay: 0.15, tailGain: 0.01,
      distortion: 12,
    },
    heavy: {
      freq: 55, freqEnd: 18, decay: 0.25,
      noiseVol: 0.03, noiseDur: 0.15, noiseHP: 400,
      gain: 0.02, tailFreq: 50, tailDecay: 0.18, tailGain: 0.008,
      distortion: 10,
    },
    turret: {
      freq: 130, freqEnd: 45, decay: 0.08,
      noiseVol: 0.025, noiseDur: 0.06, noiseHP: 900,
      gain: 0.018, tailFreq: 90, tailDecay: 0.05, tailGain: 0.006,
      distortion: 5,
    },
    boss: {
      freq: 90, freqEnd: 22, decay: 0.28,
      noiseVol: 0.035, noiseDur: 0.18, noiseHP: 350,
      gain: 0.025, tailFreq: 55, tailDecay: 0.2, tailGain: 0.01,
      distortion: 14,
    },
  };
  const c = configs[type];

  // === 1. Primary body — low thump ===
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(c.freq, now);
  osc.frequency.exponentialRampToValueAtTime(c.freqEnd, now + c.decay);
  oscGain.gain.setValueAtTime(c.gain, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + c.decay);
  osc.connect(oscGain).connect(master);
  osc.start(now);
  osc.stop(now + c.decay + 0.01);

  // === 2. Transient click (mechanical action) ===
  const click = ctx.createOscillator();
  const clickGain = ctx.createGain();
  click.type = 'square';
  click.frequency.setValueAtTime(3000 + Math.random() * 500, now);
  click.frequency.exponentialRampToValueAtTime(500, now + 0.008);
  clickGain.gain.setValueAtTime(0.06, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
  click.connect(clickGain).connect(master);
  click.start(now);
  click.stop(now + 0.015);

  // === 3. Noise burst (crack/bang) with shaped envelope ===
  const noiseDur = c.noiseDur;
  const bufferSize = Math.floor(ctx.sampleRate * noiseDur);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    // Shaped noise — sharp attack, exponential decay
    const t = i / bufferSize;
    const envelope = t < 0.05 ? t / 0.05 : Math.pow(1 - (t - 0.05) / 0.95, 1.5);
    data[i] = (Math.random() * 2 - 1) * envelope;
  }
  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  noise.buffer = noiseBuffer;
  noiseGain.gain.setValueAtTime(c.noiseVol, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDur);

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = c.noiseHP;

  // Optional distortion for heavier weapons
  if (c.distortion > 0) {
    const waveshaper = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 128) - 1;
      curve[i] = Math.tanh(x * c.distortion);
    }
    waveshaper.curve = curve;
    noise.connect(hp).connect(waveshaper).connect(noiseGain).connect(master);
  } else {
    noise.connect(hp).connect(noiseGain).connect(master);
  }
  noise.start(now);
  noise.stop(now + noiseDur + 0.01);

  // === 4. Sub-bass tail (resonance) ===
  const tail = ctx.createOscillator();
  const tailGain = ctx.createGain();
  tail.type = 'sine';
  tail.frequency.setValueAtTime(c.tailFreq, now + 0.01);
  tail.frequency.exponentialRampToValueAtTime(20, now + 0.01 + c.tailDecay);
  tailGain.gain.setValueAtTime(c.tailGain, now + 0.01);
  tailGain.gain.exponentialRampToValueAtTime(0.001, now + 0.01 + c.tailDecay);
  tail.connect(tailGain).connect(master);
  tail.start(now + 0.01);
  tail.stop(now + 0.02 + c.tailDecay);

  // === 5. Room echo (short reverb for indoor feel) ===
  if (type !== 'turret') {
    const echoNoiseDur = 0.08;
    const echoBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * echoNoiseDur), ctx.sampleRate);
    const echoData = echoBuf.getChannelData(0);
    for (let i = 0; i < echoData.length; i++) {
      echoData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / echoData.length, 2);
    }
    const echoSrc = ctx.createBufferSource();
    echoSrc.buffer = echoBuf;
    const echoGain = ctx.createGain();
    echoGain.gain.setValueAtTime(c.gain * 0.15, now + 0.06);
    echoGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06 + echoNoiseDur);
    const echoLP = ctx.createBiquadFilter();
    echoLP.type = 'lowpass';
    echoLP.frequency.value = 600;
    echoSrc.connect(echoLP).connect(echoGain).connect(master);
    echoSrc.start(now + 0.06);
    echoSrc.stop(now + 0.07 + echoNoiseDur);
  }
}

export function playExplosion() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const master = getMaster(ctx);

  // Deep boom with sub-harmonics
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(60, now);
  osc.frequency.exponentialRampToValueAtTime(15, now + 0.5);
  oscGain.gain.setValueAtTime(0.8, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc.connect(oscGain).connect(master);
  osc.start(now);
  osc.stop(now + 0.55);

  // Sub-bass punch
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(35, now);
  sub.frequency.exponentialRampToValueAtTime(12, now + 0.3);
  subGain.gain.setValueAtTime(0.6, now);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  sub.connect(subGain).connect(master);
  sub.start(now);
  sub.stop(now + 0.4);

  // Noise rumble with distortion
  const bufferSize = Math.floor(ctx.sampleRate * 0.4);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 0.4);
  }
  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  noise.buffer = noiseBuffer;
  noiseGain.gain.setValueAtTime(0.75, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(600, now);
  lp.frequency.exponentialRampToValueAtTime(150, now + 0.3);
  
  const waveshaper = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i / 128) - 1;
    curve[i] = Math.tanh(x * 4);
  }
  waveshaper.curve = curve;
  
  noise.connect(lp).connect(waveshaper).connect(noiseGain).connect(master);
  noise.start(now);
  noise.stop(now + 0.45);

  // Debris scatter — high freq particles
  const debrisLen = Math.floor(ctx.sampleRate * 0.15);
  const debrisBuf = ctx.createBuffer(1, debrisLen, ctx.sampleRate);
  const debrisData = debrisBuf.getChannelData(0);
  for (let i = 0; i < debrisLen; i++) {
    debrisData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / debrisLen, 3) * (Math.random() > 0.7 ? 1 : 0.2);
  }
  const debrisSrc = ctx.createBufferSource();
  debrisSrc.buffer = debrisBuf;
  const debrisGain = ctx.createGain();
  debrisGain.gain.setValueAtTime(0.12, now + 0.08);
  debrisGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  const debrisHP = ctx.createBiquadFilter();
  debrisHP.type = 'highpass';
  debrisHP.frequency.value = 2000;
  debrisSrc.connect(debrisHP).connect(debrisGain).connect(master);
  debrisSrc.start(now + 0.08);
  debrisSrc.stop(now + 0.3);
}

export function playHit() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const master = getMaster(ctx);

  // Impact thud
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(350, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.07);
  gain.gain.setValueAtTime(0.008, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc.connect(gain).connect(master);
  osc.start(now);
  osc.stop(now + 0.08);

  // Flesh slap noise
  const bufLen = Math.floor(ctx.sampleRate * 0.03);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.005, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1500;
  bp.Q.value = 1;
  src.connect(bp).connect(nGain).connect(master);
  src.start(now);
  src.stop(now + 0.04);
}

export function playPickup() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const master = getMaster(ctx);

  // Two-note chime
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(660, now);
  gain1.gain.setValueAtTime(0.08, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc1.connect(gain1).connect(master);
  osc1.start(now);
  osc1.stop(now + 0.11);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(880, now + 0.06);
  gain2.gain.setValueAtTime(0.06, now + 0.06);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
  osc2.connect(gain2).connect(master);
  osc2.start(now + 0.06);
  osc2.stop(now + 0.17);
}

export function playRadio() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const master = getMaster(ctx);

  // Static crackle
  const bufLen = Math.floor(ctx.sampleRate * 0.1);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) {
    const t = i / bufLen;
    data[i] = (Math.random() * 2 - 1) * (1 - t) * 0.5 * (Math.random() > 0.3 ? 1 : 0.1);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.1, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2200;
  bp.Q.value = 3;
  noise.connect(bp).connect(noiseGain).connect(master);
  noise.start(now);
  noise.stop(now + 0.11);

  // Two-tone radio beep (more realistic)
  for (const [freq, start, dur] of [[1400, 0.04, 0.06], [1000, 0.12, 0.08]] as [number, number, number][]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now + start);
    gain.gain.setValueAtTime(0.05, now + start);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
    osc.connect(gain).connect(master);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.01);
  }
}

export function playReload() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const master = getMaster(ctx);

  // Magazine release click
  const click1 = ctx.createOscillator();
  const click1Gain = ctx.createGain();
  click1.type = 'square';
  click1.frequency.setValueAtTime(2500, now);
  click1.frequency.exponentialRampToValueAtTime(800, now + 0.015);
  click1Gain.gain.setValueAtTime(0.08, now);
  click1Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
  click1.connect(click1Gain).connect(master);
  click1.start(now);
  click1.stop(now + 0.025);

  // Magazine slide
  const slideBufLen = Math.floor(ctx.sampleRate * 0.08);
  const slideBuf = ctx.createBuffer(1, slideBufLen, ctx.sampleRate);
  const slideData = slideBuf.getChannelData(0);
  for (let i = 0; i < slideBufLen; i++) {
    slideData[i] = (Math.random() * 2 - 1) * 0.3 * Math.sin(i / slideBufLen * Math.PI);
  }
  const slideSrc = ctx.createBufferSource();
  slideSrc.buffer = slideBuf;
  const slideGain = ctx.createGain();
  slideGain.gain.setValueAtTime(0.06, now + 0.15);
  slideGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  const slideHP = ctx.createBiquadFilter();
  slideHP.type = 'highpass';
  slideHP.frequency.value = 1800;
  slideSrc.connect(slideHP).connect(slideGain).connect(master);
  slideSrc.start(now + 0.15);
  slideSrc.stop(now + 0.26);

  // Magazine insert click
  const click2 = ctx.createOscillator();
  const click2Gain = ctx.createGain();
  click2.type = 'square';
  click2.frequency.setValueAtTime(3200, now + 0.28);
  click2.frequency.exponentialRampToValueAtTime(1200, now + 0.29);
  click2Gain.gain.setValueAtTime(0.1, now + 0.28);
  click2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  click2.connect(click2Gain).connect(master);
  click2.start(now + 0.28);
  click2.stop(now + 0.31);
}

export function playAlarm() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const master = getMaster(ctx);

  // Alternating alarm siren
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.linearRampToValueAtTime(1200, now + 0.15);
  osc.frequency.linearRampToValueAtTime(800, now + 0.3);
  gain.gain.setValueAtTime(0.015, now);
  gain.gain.setValueAtTime(0.015, now + 0.25);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc.connect(gain).connect(master);
  osc.start(now);
  osc.stop(now + 0.36);
}

export function playBossRoar() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const master = getMaster(ctx);

  // Deep distorted growl
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(80, now);
  osc.frequency.linearRampToValueAtTime(50, now + 0.3);
  osc.frequency.linearRampToValueAtTime(90, now + 0.5);
  oscGain.gain.setValueAtTime(0.3, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  const waveshaper = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i / 128) - 1;
    curve[i] = Math.tanh(x * 12);
  }
  waveshaper.curve = curve;
  osc.connect(waveshaper).connect(oscGain).connect(master);
  osc.start(now);
  osc.stop(now + 0.55);

  // Rumble noise
  const rumbleLen = Math.floor(ctx.sampleRate * 0.4);
  const rumbleBuf = ctx.createBuffer(1, rumbleLen, ctx.sampleRate);
  const rumbleData = rumbleBuf.getChannelData(0);
  for (let i = 0; i < rumbleLen; i++) {
    rumbleData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rumbleLen, 1.5);
  }
  const rumbleSrc = ctx.createBufferSource();
  rumbleSrc.buffer = rumbleBuf;
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.setValueAtTime(0.15, now);
  rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  const rumbleLP = ctx.createBiquadFilter();
  rumbleLP.type = 'lowpass';
  rumbleLP.frequency.value = 200;
  rumbleSrc.connect(rumbleLP).connect(rumbleGain).connect(master);
  rumbleSrc.start(now);
  rumbleSrc.stop(now + 0.45);
}

// === Voice shouts — procedural "speech" using formant synthesis ===

// Throttle to avoid spam
let lastShoutTime = 0;
const SHOUT_COOLDOWN = 800; // ms

type ShoutType = 'alert' | 'chase' | 'investigate' | 'attack' | 'lost' | 'alarm' | 'death';

const SHOUT_CONFIGS: Record<ShoutType, { formants: [number, number, number]; duration: number; pitch: number; pitchEnd: number; volume: number; roughness: number }> = {
  alert:       { formants: [800, 1400, 2800],  duration: 0.5,  pitch: 250, pitchEnd: 350, volume: 0.04, roughness: 5 },
  chase:       { formants: [700, 1200, 2600],  duration: 0.55, pitch: 220, pitchEnd: 300, volume: 0.04, roughness: 6 },
  investigate: { formants: [500, 1000, 2400],  duration: 0.4,  pitch: 180, pitchEnd: 220, volume: 0.03, roughness: 3 },
  attack:      { formants: [900, 1500, 3000],  duration: 0.4,  pitch: 280, pitchEnd: 400, volume: 0.04, roughness: 8 },
  lost:        { formants: [600, 1200, 2200],  duration: 0.5,  pitch: 200, pitchEnd: 160, volume: 0.03, roughness: 4 },
  alarm:       { formants: [850, 1500, 3100],  duration: 0.6,  pitch: 260, pitchEnd: 400, volume: 0.04, roughness: 8 },
  death:       { formants: [400, 900, 2000],   duration: 0.8,  pitch: 300, pitchEnd: 80,  volume: 0.04, roughness: 10 },
};

export function playVoiceShout(type: ShoutType, pitchVariation: number = 0) {
  const now = performance.now();
  if (now - lastShoutTime < SHOUT_COOLDOWN) return;
  lastShoutTime = now;

  const ctx = getCtx();
  const t = ctx.currentTime;
  const master = getMaster(ctx);
  const c = SHOUT_CONFIGS[type];

  const pitchMult = 1 + pitchVariation * 0.15;
  const basePitch = c.pitch * pitchMult;
  const endPitch = c.pitchEnd * pitchMult;

  // Vocal cord — sawtooth oscillator as voice source
  const voice = ctx.createOscillator();
  voice.type = 'sawtooth';
  voice.frequency.setValueAtTime(basePitch, t);
  voice.frequency.linearRampToValueAtTime(endPitch, t + c.duration * 0.7);
  voice.frequency.linearRampToValueAtTime(endPitch * 0.8, t + c.duration);

  // Add roughness via waveshaper distortion
  const distNode = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i / 128) - 1;
    curve[i] = Math.tanh(x * c.roughness);
  }
  distNode.curve = curve;

  // Formant filters (simulate vowel shapes) — wider bandwidth for audibility
  const formantGain = ctx.createGain();
  formantGain.gain.setValueAtTime(c.volume, t);
  formantGain.gain.linearRampToValueAtTime(c.volume * 1.3, t + c.duration * 0.15);
  formantGain.gain.setValueAtTime(c.volume * 0.9, t + c.duration * 0.5);
  formantGain.gain.exponentialRampToValueAtTime(0.001, t + c.duration);

  const filters = c.formants.map((freq) => {
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 1.5; // wide bandwidth so sound passes through
    return f;
  });

  // Mix formants together — higher gain
  const merger = ctx.createGain();
  merger.gain.value = 2.5; // louder formant mix

  voice.connect(distNode);
  for (const f of filters) {
    distNode.connect(f);
    f.connect(merger);
  }
  merger.connect(formantGain).connect(master);

  // Aspiration noise for consonant texture
  const noiseDur = Math.min(c.duration * 0.3, 0.12);
  const noiseBufLen = Math.floor(ctx.sampleRate * noiseDur);
  const noiseBuf = ctx.createBuffer(1, noiseBufLen, ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseBufLen; i++) {
    const env = i < noiseBufLen * 0.2 ? i / (noiseBufLen * 0.2) : Math.pow(1 - (i - noiseBufLen * 0.2) / (noiseBufLen * 0.8), 2);
    noiseData[i] = (Math.random() * 2 - 1) * env;
  }
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuf;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(c.volume * 0.8, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + noiseDur);
  const noiseHP = ctx.createBiquadFilter();
  noiseHP.type = 'highpass';
  noiseHP.frequency.value = 1500;
  noiseSrc.connect(noiseHP).connect(noiseGain).connect(master);

  voice.start(t);
  voice.stop(t + c.duration + 0.02);
  noiseSrc.start(t);
  noiseSrc.stop(t + noiseDur + 0.02);
}

let lastFootstepTime = 0;

export function playFootstep(mode: 'sneak' | 'walk' | 'sprint') {
  const now = performance.now();
  const intervals = { sneak: 500, walk: 320, sprint: 200 };
  if (now - lastFootstepTime < intervals[mode]) return;
  lastFootstepTime = now;

  const ctx = getCtx();
  const t = ctx.currentTime;
  const master = getMaster(ctx);

  const volumes = { sneak: 0.02, walk: 0.05, sprint: 0.1 };
  const pitches = { sneak: 250, walk: 180, sprint: 140 };

  // Step impact
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(pitches[mode], t);
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.04);
  oscGain.gain.setValueAtTime(volumes[mode] * 0.6, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  osc.connect(oscGain).connect(master);
  osc.start(t);
  osc.stop(t + 0.05);

  // Surface texture noise
  const bufLen = Math.floor(ctx.sampleRate * 0.04);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.5);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volumes[mode], t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = pitches[mode] + 100;

  src.connect(lp).connect(gain).connect(master);
  src.start(t);
  src.stop(t + 0.05);
}
