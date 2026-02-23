// Real speech synthesis for enemy callouts using Web Speech API

let lastCalloutTime = 0;
const CALLOUT_COOLDOWN = 1200;
let unlocked = false;

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

let englishVoices: SpeechSynthesisVoice[] = [];

function loadVoices() {
  if (typeof speechSynthesis === 'undefined') return;
  const all = speechSynthesis.getVoices();
  englishVoices = all.filter(v => v.lang.startsWith('en'));
  if (englishVoices.length === 0) englishVoices = all;
}

if (typeof speechSynthesis !== 'undefined') {
  loadVoices();
  speechSynthesis.addEventListener('voiceschanged', loadVoices);
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (englishVoices.length === 0) loadVoices();
  if (englishVoices.length === 0) return null;
  return englishVoices.find(v => /david|james|daniel|george|male/i.test(v.name))
    || englishVoices.find(v => v.lang === 'en-US')
    || englishVoices[0];
}

/**
 * Must be called from a user gesture (click/touch) to unlock speech on mobile.
 * Call this once at game start.
 */
export function unlockSpeech() {
  if (unlocked || typeof speechSynthesis === 'undefined') return;
  unlocked = true;
  // Force load voices
  loadVoices();
  // Speak a real word at minimal volume to truly unlock the API on iOS/Android
  const silent = new SpeechSynthesisUtterance('.');
  silent.volume = 0.01;
  silent.rate = 10;
  const voice = pickVoice();
  if (voice) silent.voice = voice;
  speechSynthesis.cancel();
  speechSynthesis.speak(silent);
  console.log('[voice] Speech unlock attempted, voices available:', englishVoices.length);
}

export function speakCallout(type: CalloutType, enemyType: string = 'soldier') {
  if (typeof speechSynthesis === 'undefined') return;
  if (!unlocked) {
    console.warn('[voice] Not unlocked yet, skipping callout:', type);
    return;
  }

  const now = performance.now();
  if (now - lastCalloutTime < CALLOUT_COOLDOWN) return;
  lastCalloutTime = now;

  speechSynthesis.cancel();

  const lines = CALLOUTS[type];
  const text = lines[Math.floor(Math.random() * lines.length)];
  console.log('[voice] Speaking:', text, 'type:', type, 'enemy:', enemyType);

  const utt = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) utt.voice = voice;

  utt.pitch = PITCH_BY_ENEMY[enemyType] ?? 0.9;
  utt.rate = type === 'death' ? 0.7 : 1.1 + Math.random() * 0.3;
  utt.volume = 1.0;

  utt.onstart = () => console.log('[voice] Started speaking:', text);
  utt.onend = () => console.log('[voice] Finished speaking:', text);
  utt.onerror = (e) => console.error('[voice] Speech error:', e.error, 'text:', text);

  speechSynthesis.resume();
  speechSynthesis.speak(utt);
}
