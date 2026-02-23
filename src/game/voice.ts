// Real speech synthesis for enemy callouts using Web Speech API

let lastCalloutTime = 0;
const CALLOUT_COOLDOWN = 1200; // ms between callouts

type CalloutType = 'alert' | 'chase' | 'investigate' | 'attack' | 'lost' | 'alarm' | 'death';

const CALLOUTS: Record<CalloutType, string[]> = {
  alert:       ['Contact!', 'I see him!', 'Over there!', 'Enemy spotted!', 'Hostile!', 'Eyes on target!'],
  chase:       ['He\'s running!', 'Don\'t let him escape!', 'After him!', 'Move move move!', 'Cut him off!'],
  investigate: ['What was that?', 'Check it out.', 'Something moved.', 'Hold up.', 'Did you hear that?'],
  attack:      ['Open fire!', 'Take him down!', 'Engaging!', 'Light him up!', 'Firing!'],
  lost:        ['Where\'d he go?', 'Lost visual.', 'I lost him.', 'He\'s gone.', 'Can\'t see him.'],
  alarm:       ['All units respond!', 'We need backup!', 'Reinforcements!', 'Help! Man down!', 'Calling for backup!'],
  death:       ['Aaaargh!', 'Urgh...', 'No...', 'Gah!'],
};

// pitch: lower = deeper voice, higher = lighter
const PITCH_BY_ENEMY: Record<string, number> = {
  heavy: 0.6,
  soldier: 0.85,
  scav: 1.1,
  turret: 1.3,
};

function getVoices(): SpeechSynthesisVoice[] {
  return speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
}

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const voices = getVoices();
  // Prefer a male-sounding English voice
  const preferred = voices.find(v => /male|guy|david|james|daniel|george/i.test(v.name))
    || voices.find(v => v.lang === 'en-US')
    || voices[0];
  cachedVoice = preferred || null;
  return cachedVoice;
}

// Preload voices (they load async in some browsers)
if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    pickVoice();
  };
}

export function speakCallout(type: CalloutType, enemyType: string = 'soldier') {
  if (typeof speechSynthesis === 'undefined') return;

  const now = performance.now();
  if (now - lastCalloutTime < CALLOUT_COOLDOWN) return;
  lastCalloutTime = now;

  // Cancel any ongoing speech to avoid queue buildup
  speechSynthesis.cancel();

  const lines = CALLOUTS[type];
  const text = lines[Math.floor(Math.random() * lines.length)];

  const utt = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) utt.voice = voice;

  utt.pitch = PITCH_BY_ENEMY[enemyType] ?? 0.9;
  utt.rate = type === 'death' ? 0.7 : 1.1 + Math.random() * 0.3;
  utt.volume = type === 'death' ? 0.9 : 0.7;

  speechSynthesis.speak(utt);
}
