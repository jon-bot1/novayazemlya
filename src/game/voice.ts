// Real speech synthesis for enemy callouts using Web Speech API
// Panicked, screaming voices that always play to completion

let lastCalloutTime = 0;
const CALLOUT_COOLDOWN = 2500; // longer cooldown so voices always finish
let unlocked = false;
let speechAvailable = typeof speechSynthesis !== 'undefined';
let currentUtterance: SpeechSynthesisUtterance | null = null;
let isSpeaking = false;

type CalloutType = 'alert' | 'chase' | 'investigate' | 'attack' | 'lost' | 'alarm' | 'death';

// More panicked, screaming callouts
const CALLOUTS: Record<CalloutType, string[]> = {
  alert:       ['CONTACT! CONTACT!', 'HE IS RIGHT THERE!', 'OH GOD, OVER THERE!', 'HOSTILE! HOSTILE!', 'ENEMY! I SEE HIM!'],
  chase:       ['HE IS RUNNING! GO GO GO!', 'AFTER HIM! NOW!', 'MOVE! MOVE! MOVE!', 'DON\'T LET HIM ESCAPE!', 'CUT HIM OFF! HURRY!'],
  investigate: ['What the hell was that?!', 'Something moved! Check it!', 'Did you hear that?! GO!', 'Over there! I heard something!'],
  attack:      ['OPEN FIRE! OPEN FIRE!', 'TAKE HIM DOWN NOW!', 'ENGAGING! SHOOT!', 'LIGHT HIM UP! FIRE!', 'KILL HIM! KILL HIM!'],
  lost:        ['WHERE DID HE GO?!', 'I LOST HIM! SHIT!', 'HE DISAPPEARED!', 'WHERE IS HE?! FIND HIM!'],
  alarm:       ['ALL UNITS! ALL UNITS!', 'WE NEED BACKUP NOW!', 'REINFORCEMENTS! HELP!', 'MAN DOWN! SEND EVERYONE!', 'CODE RED! CODE RED!'],
  death:       ['AAAARGH!', 'NOOO!', 'HELP ME!', 'I\'M HIT! I\'M HIT!', 'MEDIC!', 'OH GOD NO!'],
};

const PITCH_BY_ENEMY: Record<string, number> = {
  heavy: 0.6,
  soldier: 1.0,
  scav: 1.3,
  turret: 1.5,
};

let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;

function ensureVoices(): SpeechSynthesisVoice | null {
  if (!speechAvailable) return null;
  if (cachedVoice) return cachedVoice;
  
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  voicesLoaded = true;
  
  const english = voices.filter(v => v.lang.startsWith('en'));
  const pool = english.length > 0 ? english : voices;
  
  cachedVoice = pool.find(v => /daniel|david|james|george|male|natural/i.test(v.name))
    || pool.find(v => v.lang === 'en-US')
    || pool[0];
  
  return cachedVoice;
}

if (speechAvailable) {
  ensureVoices();
  speechSynthesis.addEventListener('voiceschanged', () => {
    cachedVoice = null;
    ensureVoices();
  });
}

export function unlockSpeech() {
  if (unlocked || !speechAvailable) return;
  
  try {
    ensureVoices();
    
    const utt = new SpeechSynthesisUtterance('Go');
    utt.volume = 0.01;
    utt.rate = 5;
    utt.pitch = 1;
    const voice = ensureVoices();
    if (voice) utt.voice = voice;
    
    speechSynthesis.speak(utt);
    unlocked = true;
    console.log('[voice] Unlock attempted. Voices loaded:', voicesLoaded, 'Voice:', voice?.name || 'default');
    
    // Cancel after delay so unlock registers
    setTimeout(() => { speechSynthesis.cancel(); }, 500);
  } catch (e) {
    console.error('[voice] Unlock failed:', e);
    speechAvailable = false;
  }
}

export function speakCallout(type: CalloutType, enemyType: string = 'soldier') {
  if (!speechAvailable || !unlocked) return;

  // Don't interrupt a currently speaking utterance — let it finish
  if (isSpeaking) return;

  const now = performance.now();
  if (now - lastCalloutTime < CALLOUT_COOLDOWN) return;
  lastCalloutTime = now;

  try {
    const lines = CALLOUTS[type];
    const text = lines[Math.floor(Math.random() * lines.length)];

    const utt = new SpeechSynthesisUtterance(text);
    const voice = ensureVoices();
    if (voice) utt.voice = voice;

    // Panicked: higher pitch, faster rate
    const basePitch = PITCH_BY_ENEMY[enemyType] ?? 1.0;
    utt.pitch = Math.min(2, basePitch + 0.3 + Math.random() * 0.3); // higher = more panicked
    utt.rate = type === 'death' ? 1.2 : 1.4 + Math.random() * 0.4; // fast, urgent
    utt.volume = 1.0;

    isSpeaking = true;
    currentUtterance = utt;

    utt.onend = () => {
      isSpeaking = false;
      currentUtterance = null;
    };
    utt.onerror = () => {
      isSpeaking = false;
      currentUtterance = null;
    };

    // Resume in case Chrome paused it
    speechSynthesis.resume();
    speechSynthesis.speak(utt);
  } catch (e) {
    isSpeaking = false;
    console.error('[voice] speakCallout error:', e);
  }
}
