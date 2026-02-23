// Real speech synthesis for enemy callouts using Web Speech API

let lastCalloutTime = 0;
const CALLOUT_COOLDOWN = 1200;

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

const PITCH_BY_ENEMY: Record<string, number> = {
  heavy: 0.5,
  soldier: 0.8,
  scav: 1.1,
  turret: 1.3,
};

// Voice loading state
let voicesReady = false;
let englishVoices: SpeechSynthesisVoice[] = [];

function loadVoices() {
  if (typeof speechSynthesis === 'undefined') return;
  const all = speechSynthesis.getVoices();
  englishVoices = all.filter(v => v.lang.startsWith('en'));
  if (englishVoices.length === 0) {
    // Some browsers return all voices as fallback
    englishVoices = all;
  }
  voicesReady = englishVoices.length > 0;
}

// Eagerly load voices
if (typeof speechSynthesis !== 'undefined') {
  loadVoices();
  speechSynthesis.addEventListener('voiceschanged', loadVoices);
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!voicesReady) loadVoices(); // retry
  if (englishVoices.length === 0) return null;
  const preferred = englishVoices.find(v => /david|james|daniel|george|male/i.test(v.name))
    || englishVoices.find(v => v.lang === 'en-US')
    || englishVoices[0];
  return preferred || null;
}

export function speakCallout(type: CalloutType, enemyType: string = 'soldier') {
  if (typeof speechSynthesis === 'undefined') {
    console.warn('SpeechSynthesis not available');
    return;
  }

  const now = performance.now();
  if (now - lastCalloutTime < CALLOUT_COOLDOWN) return;
  lastCalloutTime = now;

  // Cancel queued speech to prevent buildup
  speechSynthesis.cancel();

  const lines = CALLOUTS[type];
  const text = lines[Math.floor(Math.random() * lines.length)];

  const utt = new SpeechSynthesisUtterance(text);

  const voice = pickVoice();
  if (voice) utt.voice = voice;

  utt.pitch = PITCH_BY_ENEMY[enemyType] ?? 0.9;
  utt.rate = type === 'death' ? 0.7 : 1.1 + Math.random() * 0.3;
  utt.volume = 1.0;

  utt.onerror = (e) => {
    console.error('Speech error:', e.error);
  };

  // Chrome bug workaround: speechSynthesis can get stuck after ~15s of inactivity
  // Calling resume() before speak() prevents this
  speechSynthesis.resume();
  speechSynthesis.speak(utt);
}
