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
};

export const LORE_DOCUMENTS: LoreDocument[] = [
  {
    id: 'doc_1',
    title: 'Operation "Grey Wolf"',
    author: 'Colonel Zorin',
    date: '14.03.1993',
    classification: 'SECRET',
    content: `REPORT — Operation "Grey Wolf"

Object Z-14 confirmed active. Recon team has detected signs of recent activity in the bunker's underground chambers.

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
    date: '22.11.1994',
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
    date: '03.06.1995',
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
    date: '11.09.1995',
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
    date: '01.01.1994',
    classification: 'OPEN',
    content: `INVENTORY LIST
Storage No. 3, Object Z-14

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
    date: '08.02.1993',
    classification: 'TOP SECRET',
    content: `PERSONNEL FILE — TOP SECRET
Subject: Andrei Pavlovich Osipovitj
Rank: Commandant
Unit: Special Group "Wolf"
Station: Object Z-14, Underground Section

BACKGROUND:
Osipovitj was recruited from Spetsnaz in 1987. Outstanding combat record — 47 confirmed operations. Psychological profile shows extreme loyalty to the project but rising instability since the exposure.

His two personal bodyguards, callsigns ZAPAD and VOSTOK, have served with him since 1989. Both are former GRU special operators. They never leave his side.

EXPOSURE:
During inspection of Laboratory No. 3 (see "Dawn" protocol), Osipovitj was exposed to an unknown substance from B-series containers. Since then, subordinates report:
- Unnatural strength (bent a steel bar with bare hands)
- Eyes that "glow" in the dark
- Insomnia for 23 days without performance degradation
- Conversations with "voices" — claims to hear orders from below

ASSESSMENT:
Despite instability, Osipovitj is the most effective commander at Z-14. He has refused evacuation, stating he "guards what lies beneath". Personnel report he patrols the deep storage at night, armed and muttering. ZAPAD and VOSTOK follow in silence.

RECOMMENDATION: Monitor. Do NOT neutralize without direct orders. His knowledge of the B-series is irreplaceable.

WARNING: If Osipovitj shows signs of total regression — activate protocol STORM-3 immediately.

— Colonel Karpov, GRU`,
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
