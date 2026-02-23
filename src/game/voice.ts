// Real speech synthesis for enemy callouts using Web Speech API
// Forces English voices and aggressive delivery

let lastCalloutTime = 0;
const CALLOUT_COOLDOWN = 2500;
let unlocked = false;
let speechAvailable = typeof speechSynthesis !== 'undefined';
let isSpeaking = false;

type CalloutType = 'alert' | 'chase' | 'investigate' | 'attack' | 'lost' | 'alarm' | 'death';

// Short, punchy phrases that sound good shouted
const CALLOUTS: Record<CalloutType, string[]> = {
  alert:       ['CONTACT!!', 'HOSTILE!!', 'ENEMY!!', 'OVER THERE!!', 'I SEE HIM!!'],
  chase:       ['GO GO GO!!', 'AFTER HIM!!', 'MOVE MOVE!!', 'GET HIM!!', 'DON\'T STOP!!'],
  investigate: ['What was that!', 'Check it out!', 'Something moved!', 'Over there!'],
  attack:      ['FIRE!!', 'SHOOT!!', 'TAKE HIM DOWN!!', 'KILL!!', 'ENGAGING!!'],
  lost:        ['WHERE!!', 'LOST HIM!!', 'HE\'S GONE!!', 'FIND HIM!!'],
  alarm:       ['BACKUP!!', 'ALL UNITS!!', 'CODE RED!!', 'HELP!!'],
  death:       ['AAARGH!!', 'NOOO!!', 'AAGH!!', 'HELP!!', 'UURGH!!'],
};

let englishVoices: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;

function loadVoices() {
  if (!speechAvailable) return;
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return;
  voicesLoaded = true;
  
  // ONLY use English voices — never fall back to Swedish/local
  englishVoices = voices.filter(v => v.lang.startsWith('en'));
  
  // If no English voices at all, try any voice with "english" in name
  if (englishVoices.length === 0) {
    englishVoices = voices.filter(v => /english/i.test(v.name));
  }
  
  console.log('[voice] English voices found:', englishVoices.map(v => `${v.name} (${v.lang})`));
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (englishVoices.length === 0) return null;
  
  // Prefer male-sounding English voices for military feel
  const preferred = englishVoices.filter(v => 
    /daniel|david|james|george|alex|tom|male|guy|english.*male/i.test(v.name) ||
    v.lang === 'en-US' || v.lang === 'en-GB'
  );
  
  const pool = preferred.length > 0 ? preferred : englishVoices;
  return pool[Math.floor(Math.random() * pool.length)];
}

if (speechAvailable) {
  loadVoices();
  speechSynthesis.addEventListener('voiceschanged', () => {
    loadVoices();
  });
}

export function unlockSpeech() {
  if (unlocked || !speechAvailable) return;
  
  try {
    loadVoices();
    
    const utt = new SpeechSynthesisUtterance('Go');
    utt.volume = 0.01;
    utt.rate = 5;
    utt.lang = 'en-US'; // Force English language
    const voice = pickVoice();
    if (voice) utt.voice = voice;
    
    speechSynthesis.speak(utt);
    unlocked = true;
    console.log('[voice] Unlock OK. English voices:', englishVoices.length);
    
    setTimeout(() => { speechSynthesis.cancel(); }, 500);
  } catch (e) {
    console.error('[voice] Unlock failed:', e);
    speechAvailable = false;
  }
}

export function speakCallout(type: CalloutType, enemyType: string = 'soldier') {
  if (!speechAvailable || !unlocked) return;
  if (isSpeaking) return;
  // Don't speak if no English voices — better silent than Swedish robot
  if (englishVoices.length === 0) {
    loadVoices();
    return;
  }

  const now = performance.now();
  if (now - lastCalloutTime < CALLOUT_COOLDOWN) return;
  lastCalloutTime = now;

  try {
    const lines = CALLOUTS[type];
    const text = lines[Math.floor(Math.random() * lines.length)];

    const utt = new SpeechSynthesisUtterance(text);
    
    // CRITICAL: Force English language so it doesn't use Swedish pronunciation
    utt.lang = 'en-US';
    
    const voice = pickVoice();
    if (voice) utt.voice = voice;

    // Shouting parameters: low pitch = deep aggressive, fast rate = urgent
    const pitchMap: Record<string, number> = {
      heavy: 0.3,    // deep growl
      soldier: 0.5,  // stern bark
      scav: 0.7,     // higher panic
      turret: 0.6,
    };
    
    utt.pitch = (pitchMap[enemyType] ?? 0.5) + Math.random() * 0.2;
    utt.rate = type === 'death' ? 0.8 : 1.3 + Math.random() * 0.5; // fast = urgent shouting
    utt.volume = 1.0;

    isSpeaking = true;

    utt.onend = () => { isSpeaking = false; };
    utt.onerror = () => { isSpeaking = false; };

    speechSynthesis.resume();
    speechSynthesis.speak(utt);
  } catch (e) {
    isSpeaking = false;
    console.error('[voice] speakCallout error:', e);
  }
}
