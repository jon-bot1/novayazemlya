// Real speech synthesis for enemy callouts using Web Speech API
// With robust mobile unlock and fallback

let lastCalloutTime = 0;
const CALLOUT_COOLDOWN = 1500;
let unlocked = false;
let speechAvailable = typeof speechSynthesis !== 'undefined';

type CalloutType = 'alert' | 'chase' | 'investigate' | 'attack' | 'lost' | 'alarm' | 'death';

const CALLOUTS: Record<CalloutType, string[]> = {
  alert:       ['Contact!', 'I see him!', 'Over there!', 'Enemy spotted!', 'Hostile!'],
  chase:       ['He is running!', 'After him!', 'Move move move!', 'Cut him off!'],
  investigate: ['What was that?', 'Check it out.', 'Something moved.', 'Did you hear that?'],
  attack:      ['Open fire!', 'Take him down!', 'Engaging!', 'Light him up!'],
  lost:        ['Where did he go?', 'Lost visual.', 'I lost him.', 'He is gone.'],
  alarm:       ['All units respond!', 'We need backup!', 'Reinforcements!', 'Calling for backup!'],
  death:       ['Aaargh!', 'Urgh!', 'No!', 'Gah!'],
};

const PITCH_BY_ENEMY: Record<string, number> = {
  heavy: 0.5,
  soldier: 0.85,
  scav: 1.15,
  turret: 1.3,
};

let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;

function ensureVoices(): SpeechSynthesisVoice | null {
  if (!speechAvailable) return null;
  if (cachedVoice) return cachedVoice;
  
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  voicesLoaded = true;
  
  // Prefer English voices
  const english = voices.filter(v => v.lang.startsWith('en'));
  const pool = english.length > 0 ? english : voices;
  
  cachedVoice = pool.find(v => /daniel|david|james|george|male|natural/i.test(v.name))
    || pool.find(v => v.lang === 'en-US')
    || pool[0];
  
  return cachedVoice;
}

// Setup voice loading
if (speechAvailable) {
  ensureVoices();
  speechSynthesis.addEventListener('voiceschanged', () => {
    cachedVoice = null;
    ensureVoices();
  });
}

/**
 * Must be called inside a user gesture handler (click/touchstart).
 * Speaks a real word to unlock the audio policy on mobile browsers.
 */
export function unlockSpeech() {
  if (unlocked || !speechAvailable) return;
  
  try {
    // Force voice load
    ensureVoices();
    
    // Speak a real short word — empty strings don't unlock on iOS/Chrome mobile
    const utt = new SpeechSynthesisUtterance('Go');
    utt.volume = 0.01; // barely audible
    utt.rate = 5; // fastest
    utt.pitch = 1;
    const voice = ensureVoices();
    if (voice) utt.voice = voice;
    
    // Don't cancel before speak — let the utterance actually play to unlock
    speechSynthesis.speak(utt);
    
    unlocked = true;
    console.log('[voice] Unlock attempted. Voices loaded:', voicesLoaded, 'Voice:', voice?.name || 'default');
    
    // Cancel after a short delay so the unlock registers
    setTimeout(() => { speechSynthesis.cancel(); }, 500);
  } catch (e) {
    console.error('[voice] Unlock failed:', e);
    speechAvailable = false;
  }
}

export function speakCallout(type: CalloutType, enemyType: string = 'soldier') {
  if (!speechAvailable || !unlocked) return;

  const now = performance.now();
  if (now - lastCalloutTime < CALLOUT_COOLDOWN) return;
  lastCalloutTime = now;

  try {
    // Cancel any queued speech
    speechSynthesis.cancel();
    
    const lines = CALLOUTS[type];
    const text = lines[Math.floor(Math.random() * lines.length)];

    const utt = new SpeechSynthesisUtterance(text);
    const voice = ensureVoices();
    if (voice) utt.voice = voice;

    utt.pitch = PITCH_BY_ENEMY[enemyType] ?? 0.9;
    utt.rate = type === 'death' ? 0.8 : 1.0 + Math.random() * 0.2;
    utt.volume = 1.0;

    utt.onerror = (e) => {
      console.warn('[voice] Error:', e.error);
    };

    // Chrome can pause speechSynthesis after inactivity — resume it
    speechSynthesis.resume();
    speechSynthesis.speak(utt);
  } catch (e) {
    console.error('[voice] speakCallout error:', e);
  }
}
