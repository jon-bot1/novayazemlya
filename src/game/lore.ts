export interface LoreDocument {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  classification: 'OPEN' | 'SECRET' | 'TOP SECRET';
  hasCode: boolean;
  code?: string;
  codeHint?: string;
  found: boolean;
}

export interface IntelEntry {
  id: string;
  title: string;
  snippet: string;
  type: 'document' | 'code' | 'radio' | 'photo';
  icon: string;
}

export const SECRET_CODES: Record<string, string> = {
  'WOLF-7': 'Unlocks weapon cache location',
  'DAWN-12': 'Reveals hidden extraction point',
  'STORM-3': 'Identifies the traitor in Unit 9',
  'CEDAR-88': 'Coordinates to underground lab',
  'REBIRTH-7': 'Project Rebirth — Subject 7 clearance code',
};

export const LORE_DOCUMENTS: LoreDocument[] = [
  {
    id: 'doc_1',
    title: 'Novaya Zemlya — Field Report',
    author: 'Colonel Zorin',
    date: '14.03.1983',
    classification: 'SECRET',
    content: `REPORT — Novaya Zemlya

Objekt 47 "Severnyj Vektor" (Объект 47 «Северный Вектор») confirmed active. Recon team has detected signs of recent activity in the bunker's underground chambers.

Facility personnel evacuated in unknown direction. Laboratory equipment partially dismantled, but traces of experimental work with unknown samples have been found.

WARNING: Upon discovery of containers marked "B-series" — DO NOT OPEN. Relay code WOLF-7 to HQ for instructions.

Group "Cedar" has been redeployed to reinforce the perimeter. Communications via frequency 147.300.

— Zorin`,
    hasCode: true,
    code: 'WOLF-7',
    codeHint: 'Code mentioned in connection with B-series containers',
    found: false,
  },
  {
    id: 'doc_2',
    title: 'Unknown Soldier\'s Diary',
    author: 'Private ???',
    date: '22.11.1984',
    classification: 'OPEN',
    content: `Day 47.

Rain again. The barracks roof has been leaking for three weeks now. The company commander promised to fix it, but he has no time for us — the entire command is obsessed with the underground laboratories.

Yesterday I saw people in chemical suits coming from the bunker. Standing guard near that place is terrifying. At night you hear strange sounds from the ventilation.

Seryozha from second platoon says he's seen creatures outside the perimeter. I think he's just been drinking too much, but... who knows.

If anyone finds this note — relay code DAWN-12 to Natasha. She'll understand.

I just want to go home.`,
    hasCode: true,
    code: 'DAWN-12',
    codeHint: 'The soldier\'s personal request at the end of the entry',
    found: false,
  },
  {
    id: 'doc_3',
    title: 'Interrogation Protocol No. 847',
    author: 'Major Petrenko',
    date: '03.06.1985',
    classification: 'TOP SECRET',
    content: `INTERROGATION PROTOCOL
Subject: [DATA EXPUNGED]
Interrogator: Major Petrenko, Internal Security

Q: Tell me about the events of May 28th.
S: I've already told you... We went down to the lower level. The lights weren't working. Our flashlight beams were flickering.
Q: Continue.
S: Then we heard... scraping. Behind the door to Laboratory No. 3. The lieutenant ordered us to open it.
Q: What was behind the door?
S: [40 SECOND PAUSE] I can't... They... they looked like people, but...
Q: Subject, answer the question.
S: They stared at us. All turned their heads at once. And smiled.

[RECORDING TERMINATED]

NOTE: Subject has been transferred to isolation.
Access code to materials: STORM-3
Clearance level: Command eyes only.`,
    hasCode: true,
    code: 'STORM-3',
    codeHint: 'Access code to the interrogation materials',
    found: false,
  },
  {
    id: 'doc_4',
    title: 'Radio Intercept — Frequency 147.300',
    author: 'SIGINT Division',
    date: '11.09.1985',
    classification: 'SECRET',
    content: `RADIO INTERCEPT DECRYPTION
Frequency: 147.300 MHz
Time: 03:47 MSK

[STATIC]
Voice 1: ...confirmed, object Z-fourteen is compromised. Initiating protocol "Ash".
Voice 2: Copy. Casualties?
Voice 1: Group "Cedar" — total loss of contact. Nine personnel.
Voice 2: [EXPLETIVE] How?!
Voice 1: Unknown. Last signal from their beacon — sublevel 4. After that... silence.
Voice 2: Begin evacuation of valuable equipment. Coordinates for drop zone — CEDAR-88.
Voice 1: Understood. Cedar-eighty-eight.
[STATIC]
[END OF RECORDING]

ANALYSIS: "Protocol Ash" — likely a plan for evidence destruction. Immediate surveillance action recommended.`,
    hasCode: true,
    code: 'CEDAR-88',
    codeHint: 'Coordinates to the equipment drop zone',
    found: false,
  },
  {
    id: 'doc_5',
    title: 'Graffiti on the Wall (pencil)',
    author: 'Unknown',
    date: '???',
    classification: 'OPEN',
    content: `IF YOU'RE READING THIS — GET OUT

don't go below the second level
doors that are closed — are closed for a reason
don't trust those who smile in the dark

i saw what they did to group Cedar
they're not people anymore

light scares them away but not for long

go while you can
southwest exit through the sewers
northeast through the fence by the tower

RUN`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_6',
    title: 'Inventory List — Storage No. 3',
    author: 'Warrant Officer Sidorov',
    date: '01.01.1984',
    classification: 'OPEN',
    content: `INVENTORY LIST
Storage No. 3, Objekt 47 "Severnyj Vektor"

✓ Gas masks GP-7 — 240 pcs (12 decommissioned)
✓ RPK-74 — 6 pcs
✓ Ammunition 5.45x39 — 12,000 rds (actually ≈8,000, rest "disappeared")
✓ Ammunition 9x18 — 8,000 rds
✓ MREs — 400 pcs (best before... yeah, technically)
✓ Medical kits AI-2 — 80 pcs
✓ Vodka "Stolichnaya" — 24 bottles (for "disinfection")
✓ Cigarettes "Prima" — 50 packs
✗ Container B-7 — MISSING (who took it?!)
✗ Documentation for project "Dawn" — MISSING

NOTE: If anyone steals vodka from storage again — I'll shoot. I'm not joking.

— Sidorov
P.S. Mice ate three MREs. Or not mice. God knows what runs around here at night.`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_7',
    title: 'Personnel File: Commandant A. Osipovitj',
    author: 'GRU Internal Security',
    date: '08.02.1983',
    classification: 'TOP SECRET',
    content: `PERSONNEL FILE — TOP SECRET
Subject: Andrei Pavlovich Osipovitj
Rank: Commandant
Unit: Special Group "Wolf"
Station: Objekt 47 "Severnyj Vektor", Underground Section

BACKGROUND:
Osipovitj was recruited from Spetsnaz in 1977. Outstanding combat record — 47 confirmed operations. Psychological profile shows extreme loyalty to the project but rising instability since the exposure.

His two personal bodyguards, callsigns ZAPAD and VOSTOK, have served with him since 1979. Both are former GRU special operators. They never leave his side.

EXPOSURE:
During inspection of Laboratory No. 3 (see "Dawn" protocol), Osipovitj was exposed to an unknown substance from B-series containers. Since then, subordinates report:
- Unnatural strength (bent a steel bar with bare hands)
- Eyes that "glow" in the dark
- Insomnia for 23 days without performance degradation
- Conversations with "voices" — claims to hear orders from below

ASSESSMENT:
Despite instability, Osipovitj is the most effective commander at Objekt 47. He has refused evacuation, stating he "guards what lies beneath". Personnel report he patrols the deep storage at night, armed and muttering. ZAPAD and VOSTOK follow in silence.

RECOMMENDATION: Monitor. Do NOT neutralize without direct orders. His knowledge of the B-series is irreplaceable.

WARNING: If Osipovitj shows signs of total regression — activate protocol STORM-3 immediately.

— Colonel Karpov, GRU`,
    hasCode: false,
    found: false,
  },
  // ═══ HOSPITAL LORE — Kravtsov & Uzbek ═══
  {
    id: 'doc_h1',
    title: 'Lab Journal — Dr. Kravtsov, Entry 1',
    author: 'Dr. V.I. Kravtsov',
    date: '12.01.1984',
    classification: 'TOP SECRET',
    content: `LAB JOURNAL — ENTRY 1
Project "Rebirth" / Объект 47 — Filial Hospital

Today we received the first batch of subjects from the mainland. Twelve men, all convicted — officially "deceased." The paperwork is flawless. As far as the world knows, these men no longer exist.

Subject 7 is particularly interesting. An Uzbek man, mid-40s, former wrestler. Extraordinary physical resilience. He survived three rounds of the B-7 serum where others collapsed after one.

I have requested additional supplies of compound B-7 from the main facility. Commandant Osipovitj has approved — he wants results.

Science demands sacrifice. These men were already dead. I am giving them purpose.

— Dr. V.I. Kravtsov`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_h2',
    title: 'Lab Journal — Dr. Kravtsov, Entry 14',
    author: 'Dr. V.I. Kravtsov',
    date: '03.05.1984',
    classification: 'TOP SECRET',
    content: `LAB JOURNAL — ENTRY 14

Subject 7 ("The Uzbek") continues to exceed all projections. After fourteen injections of B-7, his muscle density has increased 340%. Pain response is virtually nonexistent. He bent the steel restraint chair with his bare hands during today's session.

The other subjects are deteriorating. Subjects 2, 5, and 9 expired this week. Tissue necrosis, organ failure. Expected.

But the Uzbek... he THRIVES on it. His eyes have changed — the pupils no longer contract in light. He watches me during procedures. Not with fear. With patience.

I have moved him to the basement isolation cell. Triple-reinforced door. Chains rated for 2 tonnes.

He smiled when they led him down.

— K.`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_h3',
    title: 'Nurse Volkov\'s Personal Notes',
    author: 'Nurse M. Volkov',
    date: '18.07.1984',
    classification: 'OPEN',
    content: `I can't do this anymore.

Last night I was doing rounds in the basement level. I could hear HIM through the door. The Uzbek. He was talking. Not screaming — talking. In a calm voice. In a language I don't understand.

Then he switched to Russian. Perfect Russian. He said:

"Masha. I know you're there. I can smell your perfume. Lilac, yes? My daughter wore lilac."

I never told anyone my name. I never wear perfume on shift.

I spoke to Dr. Kravtsov. He laughed. He LAUGHED. Said "fascinating auditory development" and wrote something in his journal.

Three nurses have quit this month. I should be the fourth. But if I leave... who checks that the chains still hold?

God forgive us all.`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_h4',
    title: 'Experiment Log — Final B-7 Session',
    author: 'Dr. V.I. Kravtsov',
    date: '02.02.1985',
    classification: 'TOP SECRET',
    content: `EXPERIMENT LOG — SESSION 47 (FINAL)
Subject: 7 ("Uzbek")
Compound: B-7 (concentrated, 3x standard dose)

10:00 — Injection administered. Subject showed no reaction.
10:15 — Heart rate elevated to 200 BPM. Subject began laughing.
10:30 — Subject broke left chain. Guards called.
10:32 — Subject broke right chain. Guards opened fire.
10:33 — SUBJECT ABSORBED 14 ROUNDS OF 5.45mm WITH NO VISIBLE EFFECT.
10:35 — Subject restrained with emergency cable system. Four soldiers injured.
10:40 — Subject went calm. Stared at me. Said: "Доктор. Скоро."
10:45 — Subject placed in reinforced cell B-0. Welded shut.

ASSESSMENT: Subject 7 is no longer human in any meaningful biological sense. The B-7 compound has created something unprecedented. He is stronger, faster, and more resilient than any organism on record.

I am terrified.

I am also very, very proud.

— K.`,
    hasCode: true,
    code: 'REBIRTH-7',
    codeHint: 'The project name combined with the subject number',
    found: false,
  },
  {
    id: 'doc_h5',
    title: 'Final Report — Hospital Director',
    author: 'Director Gromov',
    date: '28.09.1985',
    classification: 'TOP SECRET',
    content: `URGENT — EYES ONLY — DIRECTOR'S FINAL REPORT

To: Central Command, Moscow
From: Director P.A. Gromov, Objekt 47 Hospital Facility
Subject: IMMEDIATE EVACUATION REQUEST

Situation is no longer containable.

Dr. Kravtsov has lost all semblance of professional conduct. He spends 18 hours a day in the basement with Subject 7. He talks TO it. He reads it poetry. He calls it "my masterpiece."

Last week, the subject spoke through 40cm of reinforced concrete. Every patient on the ward above heard it. Three had seizures. One tore out his own IV and ran into the snow. We found him frozen 2km from the perimeter.

The subject has not eaten in 31 days. It does not sleep. It WATCHES. Through the walls. I know this sounds insane, but the guards confirm — it tracks movement in adjacent rooms without visual contact.

I am ordering all non-essential personnel to evacuate. Dr. Kravtsov refuses to leave. He says the subject "is not ready yet."

Ready for WHAT?

If this report does not receive a response within 48 hours, I am activating Protocol Ash on my own authority.

God help us.

— Director Gromov

[STAMP: NO RESPONSE RECORDED]`,
    hasCode: false,
    found: false,
  },
  // === NACHALNIK (Fishing Village Boss) ===
  {
    id: 'doc_v1',
    title: 'Personnel File: Viktor "Nachalnik" Dragunov',
    author: 'MVD Coastal Division',
    date: '14.09.1984',
    classification: 'SECRET',
    content: `PERSONNEL FILE — SECRET
Subject: Viktor Semyonovich Dragunov
Known as: "Nachalnik" (The Boss)
Last known position: Fishing Village Pier Authority

BACKGROUND:
Dragunov served 8 years in the Soviet Navy, Black Sea Fleet. Dishonorably discharged in 1980 after an incident involving the disappearance of three crew members during a storm. Investigation inconclusive.

After discharge, he established control over a small fishing village on the northern coast. Within two years, he had turned the legitimate fishing operation into a smuggling network — weapons, contraband, and occasionally people.

DISTINGUISHING FEATURES:
- Always carries a massive industrial fish hook, repurposed as a close-combat weapon. Hook is approximately 40cm long, sharpened to a razor edge.
- Missing left ring finger (fishing accident, 1976)
- Tattoo of an anchor on right forearm
- Speaks with a deep voice, rarely shouts — his men fear his quiet commands more than any officer's screams

KNOWN ASSOCIATES:
- Two personal bodyguards, former navy men
- Pack of trained dogs used for perimeter security
- Network of "redneck" smugglers from nearby settlements

WARNING:
Dragunov is extremely dangerous in close quarters. Multiple reports of him using his hook to incapacitate opponents before they can draw weapons. He is known to charge directly at armed targets — do NOT let him close the distance.

His men call him "Nachalnik" — The Boss. On the pier, his word is law.

— MVD Coastal Division, File #847-V`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_v2',
    title: 'Fisherman\'s Warning (scrawled note)',
    author: 'Unknown fisherman',
    date: '???',
    classification: 'OPEN',
    content: `Don't go near the pier at night.

Nachalnik doesn't sleep. He sits on the dock with that hook, sharpening it on a stone. Scrape. Scrape. Scrape. You can hear it from the cabins.

Last month, Petya tried to steal a boat. They found him on the beach next morning. The hook had gone clean through his shoulder. He was alive. Nachalnik wanted him alive. So everyone could see.

The speedboat is the only way out. And Nachalnik has the keys.

If you're reading this, you're already too close.

— A friend`,
    hasCode: false,
    found: false,
  },
  // ═══ CASSETTE TAPES — audio log style entries ═══
  {
    id: 'tape_1',
    title: '📼 Cassette Tape — Sgt. Ivanov',
    author: 'Sgt. Ivanov (audio recording)',
    date: '03.12.1984',
    classification: 'OPEN',
    content: `[TAPE RECORDING — POOR QUALITY, BACKGROUND STATIC]

[Click]

...recording. This is Sergeant Ivanov, 3rd platoon. Date is... December 3rd, I think. Hard to tell anymore. The sun barely rises here.

[Long pause]

They told us this was a routine posting. Guard duty. Six months and home. What a joke. The things I've seen in that bunker... nobody goes home from this. Not really.

[Sound of wind]

Petrov disappeared last night. Just... gone. His bunk was still warm. Boot prints led to the south entrance, then stopped. Just stopped. In the middle of the snow. No tracks leading away.

The lieutenant says he deserted. But where would he go? There's nothing for 200 kilometers.

[Voice cracks]

I found his lighter by the ventilation shaft. The one his wife gave him. He'd never leave that behind.

I'm keeping this tape hidden. If someone finds it... tell my family I love them. Tell them I tried.

[Click]`,
    hasCode: false,
    found: false,
  },
  {
    id: 'tape_2',
    title: '📼 Cassette Tape — Unknown Officer',
    author: 'Unknown officer (audio recording)',
    date: '???',
    classification: 'SECRET',
    content: `[TAPE RECORDING — CLEAR AUDIO, SOUNDS OF TYPING IN BACKGROUND]

This is an operational log. Classified.

The B-7 compound is exceeding projections. Subject response rates are... remarkable. Out of fourteen subjects, three show viable transformation markers. The rest are... regrettable losses.

[Typing stops]

I've been ordered to accelerate the timeline. Moscow wants results before spring. They don't understand — you can't rush biology. You can't rush what we're creating here.

[Sound of glass clinking]

Osipovitj came to the lab today. He stood in the observation gallery for two hours. Didn't say a word. Just... watched. His eyes have that glow now. The same one Subject 7 developed in week six.

I asked him if he felt different. He smiled. Said: "I feel everything, Doctor. Every heartbeat in this facility. Every footstep. Every lie."

[Long silence]

I should be concerned. Instead I'm... fascinated.

God help me, I'm becoming like Kravtsov.

[Click]`,
    hasCode: false,
    found: false,
  },
  {
    id: 'note_1',
    title: '📝 Handwritten Note (crumpled)',
    author: 'Unknown',
    date: '???',
    classification: 'OPEN',
    content: `Map of safe routes through minefield:

    MINE MINE MINE
    ↓    ↓    ↓
→ → X → → X → → X →
    ↓    ↓
    SAFE  MINE
    ↓
→ → → SAFE → SAFE → →
              ↓
    MINE  → EXIT

NOTE: This was drawn months ago. They may have moved them since.
Trust NOTHING.

P.S. The searchlight rotates every 8 seconds. Sprint between the 3rd and 5th second.`,
    hasCode: false,
    found: false,
  },
  {
    id: 'note_2',
    title: '📝 Scrawled Warning (blood-stained)',
    author: 'Unknown',
    date: '???',
    classification: 'OPEN',
    content: `DO NOT TRUST THE DOCTOR

He says he wants to help. He says the injections will make you stronger.
He LIES.

I watched him inject Subject 4. The screaming lasted six hours.
When it stopped, Subject 4 wasn't screaming anymore.
He was LAUGHING.

Three things I know:
1. The elevator to sublevel 4 still works — keycard in the director's office
2. The emergency exit behind the boiler room was welded shut, but TNT would fix that
3. Whatever is in cell B-0... DON'T OPEN IT. I don't care what Kravtsov says. DON'T.

If you're here to rescue us — it's too late.
If you're here to destroy this place — do it. Burn it all.

— Someone who used to be a person`,
    hasCode: false,
    found: false,
  },
];

export function getFoundCodes(documents: LoreDocument[]): string[] {
  return documents
    .filter(d => d.found && d.hasCode && d.code)
    .map(d => d.code!);
}

export function getIntelSummary(documents: LoreDocument[]): IntelEntry[] {
  return documents
    .filter(d => d.found)
    .map(d => ({
      id: d.id,
      title: d.title,
      snippet: d.content.substring(0, 80) + '...',
      type: d.id === 'doc_4' ? 'radio' as const : 'document' as const,
      icon: d.classification === 'TOP SECRET' ? '🔴' : d.classification === 'SECRET' ? '🟡' : '⚪',
    }));
}
