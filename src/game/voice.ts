// Real speech synthesis for enemy callouts using Web Speech API
// Aggressive, varied voices that always play to completion

let lastCalloutTime = 0;
const CALLOUT_COOLDOWN = 2500;
let unlocked = false;
let speechAvailable = typeof speechSynthesis !== 'undefined';
let isSpeaking = false;

type CalloutType = 'alert' | 'chase' | 'investigate' | 'attack' | 'lost' | 'alarm' | 'death';

// Aggressive military callouts
const CALLOUTS: Record<CalloutType, string[]> = {
  alert:       ['CONTACT! CONTACT!', 'HE IS RIGHT THERE!', 'HOSTILE! HOSTILE!', 'ENEMY! I SEE HIM!', 'TARGET SPOTTED!'],
  chase:       ['HE IS RUNNING! GO GO GO!', 'AFTER HIM! NOW!', 'MOVE! MOVE! MOVE!', 'DON\'T LET HIM ESCAPE!', 'CUT HIM OFF!'],
  investigate: ['What the hell was that?!', 'Something moved! Check it!', 'Did you hear that?! GO!', 'Over there!'],
  attack:      ['OPEN FIRE! OPEN FIRE!', 'TAKE HIM DOWN NOW!', 'SHOOT! SHOOT!', 'LIGHT HIM UP!', 'KILL HIM!'],
  lost:        ['WHERE DID HE GO?!', 'I LOST HIM! SHIT!', 'HE DISAPPEARED!', 'FIND HIM!'],
  alarm:       ['ALL UNITS! ALL UNITS!', 'WE NEED BACKUP NOW!', 'SEND EVERYONE!', 'CODE RED! CODE RED!'],
  death:       ['AAAARGH!', 'NOOO!', 'HELP ME!', 'I\'M HIT!', 'MEDIC!', 'OH GOD!'],
};

// Deeper, more aggressive pitch ranges per enemy type
const PITCH_BY_ENEMY: Record<string, number> = {
  heavy: 0.35,
  soldier: 0.65,
  scav: 0.9,
  turret: 1.1,
};

let allVoices: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;

function loadVoices() {
  if (!speechAvailable) return;
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return;
  voicesLoaded = true;
  
  // Collect all English voices for variety
  const english = voices.filter(v => v.lang.startsWith('en'));
  allVoices = english.length > 0 ? english : voices;
}

function pickRandomVoice(): SpeechSynthesisVoice | null {
  if (allVoices.length === 0) return null;
  return allVoices[Math.floor(Math.random() * allVoices.length)];
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
    
    // Minimal utterance to unlock audio policy
    const utt = new SpeechSynthesisUtterance('Go');
    utt.volume = 0.01;
    utt.rate = 5;
    utt.pitch = 1;
    const voice = pickRandomVoice();
    if (voice) utt.voice = voice;
    
    speechSynthesis.speak(utt);
    unlocked = true;
    console.log('[voice] Unlock OK. Voices:', allVoices.length);
    
    setTimeout(() => { speechSynthesis.cancel(); }, 500);
  } catch (e) {
    console.error('[voice] Unlock failed:', e);
    speechAvailable = false;
  }
}

export function speakCallout(type: CalloutType, enemyType: string = 'soldier') {
  if (!speechAvailable || !unlocked) return;

  // Never interrupt — let current voice finish
  if (isSpeaking) return;

  const now = performance.now();
  if (now - lastCalloutTime < CALLOUT_COOLDOWN) return;
  lastCalloutTime = now;

  try {
    const lines = CALLOUTS[type];
    const text = lines[Math.floor(Math.random() * lines.length)];

    const utt = new SpeechSynthesisUtterance(text);
    
    // Pick a random voice each time for variety
    const voice = pickRandomVoice();
    if (voice) utt.voice = voice;

    // Aggressive: deeper pitch, urgent rate
    const basePitch = PITCH_BY_ENEMY[enemyType] ?? 0.7;
    utt.pitch = Math.max(0.1, basePitch + (Math.random() * 0.3 - 0.15));
    utt.rate = type === 'death' ? 0.9 : 1.1 + Math.random() * 0.3;
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
