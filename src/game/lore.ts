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
  'BERG-44': 'Coordinates to Gruvrås kammare — the deep chamber',
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

  // ═══════════════════════════════════════════════
  // MINING VILLAGE — GRUVRÅ LORE
  // ═══════════════════════════════════════════════
  {
    id: 'doc_mine_1',
    title: 'Geological Survey — Norrberget',
    author: 'Dr. Erik Lindqvist, State Geological Commission',
    date: '03.09.1947',
    classification: 'SECRET',
    content: `REPORT — Geological survey of Norrberget

Core samples from Section 7-12 reveal an anomaly. The ore vein is rich — iron, copper, traces of rare earth metals — but the heart of the mountain exhibits a structure we cannot explain.

The stone material at the deepest core (420m) is not granite. It is not gneiss. It resembles nothing in our registry. The material absorbs sound. The drill bit slowed on its own, as if the mountain refused.

Mine Director Holmström insists we continue. The ore value justifies the investment. But I note that three drill operators have reported headaches and sleep disturbances since we reached 380m.

Recommendation: Proceed with caution. Install seismic sensors in Section 10.

APPENDIX: Core 7-12C exhibits crystal formations inconsistent with known mineralogy. Sample sent to Uppsala University for analysis.`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_mine_2',
    title: '📼 Cassette Tape — Miner Svensson',
    author: 'Karl-Erik Svensson, Blaster',
    date: '15.11.1952',
    classification: 'OPEN',
    content: `[CASSETTE TAPE — Recorded in the crew quarters, shift 3]

*Scraping sound, a lighter clicking*

...it was the night shift. Drift four, the deepest one. We'd blasted a new round and waited for ventilation. Pettersson went in first.

He stopped. Said nothing. Just stood there with his lamp pointed down.

I walked up and looked. Under the rubble... it wasn't rock. It was something else. Dark, almost black, but it... pulsed. Faintly, like a heartbeat.

Pettersson said "it's breathing." I told him he was crazy. But I heard it too. Not with my ears — in my chest. Like the bass frequency of an enormous machine beneath us.

We covered it up and reported to Holmström. He told us not to talk about it. Next day the cavity was filled with concrete.

But sometimes, on the night shift, you can still hear it. The mountain breathes.

*Tape ends*`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_mine_3',
    title: 'Incident Report №14 — Collapse in Drift 7',
    author: 'Mine Director G. Holmström',
    date: '22.03.1958',
    classification: 'SECRET',
    content: `INCIDENT REPORT — Norrberget Mining AB

At 02:14 on March 22, a collapse occurred in Drift 7, 390m level. Three workers trapped. Rescue operation initiated.

04:30: Contact established with trapped workers via drill hole. All three alive. Report "not alone down here." Interpreted as shock reaction.

06:15: Drill reaches cavity. Workers Nilsson and Bergström evacuated. Worker Dahl refuses to leave. Says "it doesn't want us to go." Dahl removed by force.

08:00: Dahl admitted to hospital. Speaks incoherently about "the king in the mountain" and "the ones who guard the gates — Ort and Stoll." Doctor diagnoses acute stress reaction.

NOTE: Dahl was dismissed on April 1st. His medical file has been classified. The cause of the collapse remains unexplained — seismograph shows NO geological activity at the time. The mountain moved without cause.

ACTION: Drift 7 permanently sealed. Concrete barrier installed at entrance.`,
    hasCode: true,
    code: 'BERG-44',
    codeHint: 'Coordinates mentioned in Holmström\'s sealed addendum',
    found: false,
  },
  {
    id: 'doc_mine_4',
    title: 'Letter to Mine Director Holmström (never sent)',
    author: 'Arne Dahl, former miner',
    date: '05.07.1961',
    classification: 'OPEN',
    content: `Holmström,

You know what's down there. You've always known.

It wasn't a collapse. THE MOUNTAIN CLOSED THE GATE. It shut us in because we were close. We were close to HIM.

The Gruvrå. He who existed in the mountain before the mine. Before the village. Before Sweden. He IS the mountain. Every tunnel we drill is a wound in his body. Every blast a pain.

He has guards. I saw them in the darkness — Ort and Stoll. They look like stone but they move. Slowly, patiently. They guard the entrance to the chamber.

Three years have passed and I still hear him. In dreams. In silence. He whispers: "Stop digging."

We didn't stop. And now the mine is part of him. The elevator shaft is his throat. The tunnels are his veins. The ore is his blood.

Shut the mine, Holmström. Shut it before it's too late.

— Dahl

P.S. Do not crush the black crystals. They are his eyes.`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_mine_5',
    title: '📝 Scrawled on mine wall (carved with drill steel)',
    author: 'Unknown',
    date: '???',
    classification: 'OPEN',
    content: `ORT GUARDS THE WEST
STOLL GUARDS THE EAST
GRUVRÅ SLEEPS IN THE CENTER

DO NOT CROSS THE LINE AT 420m

THE BLACK STONES SEE YOU

Three things you need to know:
1. The elevator works but it goes DEEPER than the map shows
2. TNT hurts him — but makes him angry
3. If the lamp flickers — RUN

He was here before us.
He will be here after us.

THE MOUNTAIN REMEMBERS.`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_mine_cassette',
    title: '📼 Cassette Tape — Final Recording',
    author: 'Mine Director Holmström',
    date: '31.12.1963',
    classification: 'TOP SECRET',
    content: `[CASSETTE TAPE — Found in crew quarters, unopened since 1963]

*Static, wind noise, distant machinery*

This is Gustav Holmström, mine director at Norrberget Mine. New Year's Eve, 1963. Everyone has gone home. I am alone.

*Pause*

I have made my decision. The mine closes on January 15th. Officially: ore vein exhausted. In reality...

*Deep sigh*

Dahl was right. About everything. We drilled too deep. Reached something we should never have reached. Not ore — not stone — but a being. Or... a consciousness. Embedded in the mountain since before the ice melted.

The workers call it Gruvrå. I called them superstitious. But last week... last week the wall in Drift 7 MOVED. Not a collapse — MOVED. Like breathing.

And the guardians — Ort and Stoll. Two formations of black crystal, three meters tall, at the entrance to the deepest chamber. The geologists say they're natural. But they have... faces. And they weren't there in September.

I'm filling the deepest drifts with concrete. Blasting the elevator shaft below 400m. Sealing everything with —

*Sharp sound — stone cracking*
*Five seconds of silence*

...dear God. The light... it's flickering.

Ort is sta—

*TAPE ENDS*`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_mine_stalhandske_1',
    title: 'Survey Engineer Stålhandske — Field Notes',
    author: 'Ing. Björn Stålhandske, Royal Survey Office',
    date: '14.06.1955',
    classification: 'SECRET',
    content: `FIELD NOTES — Norrberget Magnetic Survey

Day 1: Arrived at Norrberget Mining Village. Tasked with mapping magnetic anomalies in Sections 8-12 by order of the Royal Survey Office. Mine Director Holmström greeted me personally. Seemed nervous.

Day 3: Readings are extraordinary. The magnetic field at 350m depth is 400% above regional average. My compass spins freely below 300m. Instruments behave as if there's a massive ferromagnetic body beneath us, but the geology doesn't support it.

Day 5: Reached 400m with portable magnetometer. Readings went OFF SCALE. The needle bent. Not figuratively — the physical needle of my analog backup instrument bent toward the east wall. I've never seen anything like this in 20 years of fieldwork.

Day 6: Holmström asked me not to include the 400m readings in my official report. I refused. He offered money. I still refused.

Day 7: Found a chamber behind the sealed concrete in Drift 7. There's a gap — maybe 30cm — at the top. I shone my flashlight through.

I saw the crystals. Black. Tall. Arranged in a semicircle around... something. The magnetometer reading through the gap was so high it broke the instrument.

I need to go back. I need to see what's in the center of that circle.

— Stålhandske`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_mine_stalhandske_2',
    title: '📼 Cassette Tape — Stålhandske\'s Last Recording',
    author: 'Ing. Björn Stålhandske',
    date: '19.06.1955',
    classification: 'TOP SECRET',
    content: `[CASSETTE TAPE — Found in Stålhandske's abandoned equipment case, Drift 7 entrance]

*Heavy breathing, echoing footsteps on stone*

Stålhandske, Royal Survey Office, supplementary recording. June 19th. It's... I think it's around midnight. I came back alone. Brought tools to widen the gap in the Drift 7 seal.

*Scraping of concrete, grunting*

I'm through. The chamber is... larger than I expected. Much larger. The crystals are — God, they're beautiful. Obsidian black but with an inner glow. Like captured starlight. There must be thirty of them, each three meters tall, forming a perfect circle.

*Footsteps, slower now*

And in the center... it's not a void. There's a shape. Like a figure carved from the mountain itself. But the proportions are wrong — too old, too angular. Pre-human. Pre-everything.

The magnetometer is useless down here. The field is so strong my watch has stopped.

*Long pause*

It opened its eyes.

*Silence — then a deep, subsonic rumble*

They're not crystals. They're not rock formations. They're TEETH. The whole circle — it's a MOUTH.

And Ort — the western formation — it's moving. Toward me. Slowly. Like a glacier. But WATCHING.

I need to —

*Running footsteps, stumbling*

The exit — the concrete — it's CLOSING. The gap is shrinking. HOW IS THE CONCRETE —

*Scraping, desperate hammering*

HOLMSTRÖM! SOMEONE! THE MOUNTAIN IS —

*Complete silence*

*Ten seconds of dead air*

*A single sound: stone grinding against stone, like a door closing*

*TAPE ENDS*`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_mine_stalhandske_3',
    title: 'Missing Persons Report — Björn Stålhandske',
    author: 'Inspector Lennart Grip, County Police',
    date: '28.06.1955',
    classification: 'SECRET',
    content: `MISSING PERSONS REPORT — County Police, Norrbotten

Subject: Björn Stålhandske, age 43, Survey Engineer, Royal Survey Office
Last seen: June 18, 1955, Norrberget Mining Village

SUMMARY:
Stålhandske arrived at Norrberget Mine on June 14 for a routine magnetic survey. Was quartered in Cabin 3 at the mining village. Reported to work daily through June 18.

On June 19, workers arriving for morning shift found:
- Stålhandske's cabin empty, bed unslept in
- His equipment case at the entrance to sealed Drift 7
- The concrete seal on Drift 7 INTACT (no signs of tampering)
- A cassette recorder inside the equipment case (tape confiscated by Mine Director Holmström — see note)

INVESTIGATION:
- All mine tunnels searched. No trace of Stålhandske.
- Holmström claims Stålhandske left on foot during the night. No witnesses.
- Stålhandske's car remains in the village parking area.
- His wallet, passport, and personal effects remain in Cabin 3.
- The cassette tape was surrendered to County Police but subsequently transferred to military custody by order of Colonel Varga, Northern Military District.

NOTE FROM INVESTIGATING OFFICER:
The concrete seal on Drift 7 shows no damage. If Stålhandske entered Drift 7, he did so without breaking the seal. This is physically impossible.

However, I note the following: when I placed my hand on the concrete seal, it was WARM. Concrete at 390m depth should be approximately 12°C. The seal was at least 30°C.

Additionally, workers report that since Stålhandske's disappearance, the magnetic anomaly readings at 350m have increased by 15%.

Almost as if the mountain gained mass.

STATUS: CASE CLOSED — Classified by military order.
Filed as: "Presumed desertion."

— Inspector Grip

PERSONAL ADDENDUM (not in official file):
I don't believe he deserted. I believe the mountain took him. And I believe Holmström knows it.`,
    hasCode: false,
    found: false,
  },

  // ═══════════════════════════════════════════════
  // CROSS-MAP LORE — SUBSTANCE ZERO & AURORA BOREALIS
  // ═══════════════════════════════════════════════
  {
    id: 'doc_sz_1',
    title: 'NATO Intelligence Brief — SUBSTANCE ZERO',
    author: 'CONTROL, Task Force AURORA',
    date: '02.01.1985',
    classification: 'TOP SECRET',
    content: `NATO INTELLIGENCE BRIEF — ULTRAVIOLET CLEARANCE

SUBJECT: SUBSTANCE ZERO (SZ-0)

SUMMARY:
A pre-Cambrian material has been identified in the Arctic bedrock spanning from northern Scandinavia to the Novaya Zemlya archipelago. The geological vein runs at depths between 380-500 meters, following the ancient Caledonian fault line.

Soviet GRU discovered the material during underground nuclear testing on Novaya Zemlya in 1954. They designated it "Вещество Ноль" (Substance Zero). Swedish miners at Norrberget independently encountered it in 1947 but sealed the deposits in 1964 after multiple incidents.

STRATEGIC VALUE:
When refined, SZ-0 amplifies nuclear fission chain reactions by a factor of 12. A single enhanced warhead could produce yields equivalent to 600 kilotons. This would render NATO's entire nuclear deterrence doctrine obsolete.

Soviet assets along the vein:
1. OBJEKT 47 — Primary extraction & refinery (Novaya Zemlya)
2. COASTAL VILLAGE — Maritime export pipeline (Arctic coast)
3. HOSPITAL №6 — Human resistance research (near Objekt 47)
4. NORRBERGET MINE — Source site, recently reopened (Sweden)

NOTE: The material exhibits properties inconsistent with any known substance. It absorbs sound. It generates magnetic fields. Workers exposed to it report auditory hallucinations. In at least three confirmed cases, exposed individuals have been physically ABSORBED into the rock.

This is not a mineral. This is something else.

— CONTROL`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_sz_2',
    title: 'GRU Internal Memo — The Norrberget Connection',
    author: 'Colonel Varga, Northern Military District',
    date: '15.03.1958',
    classification: 'TOP SECRET',
    content: `TO: General Directorate, GRU Moscow
FROM: Colonel Varga, Northern Military District
RE: Swedish geological anomaly — URGENT

Comrades,

Our source in the Swedish Geological Survey (codename BJÖRK) has confirmed what we suspected: the magnetic anomaly discovered at Norrberget Mine in 1947 is the SAME geological vein we identified beneath Novaya Zemlya during the 1954 tests.

The vein spans the entire Arctic bedrock. It is not a deposit — it is a NETWORK. Like roots beneath a forest. And it is all connected.

The Swedes sealed their mine in 1964 after a series of incidents — worker disappearances, equipment failures, a survey engineer named Stålhandske who vanished without trace in 1957. They blamed "ore depletion." They lied.

I recommend immediate action:
1. Infiltrate Norrberget under cover of "geological cooperation"
2. Reopen the sealed levels below 400m
3. Establish direct extraction pipeline to Objekt 47

The Swedish government must not learn the true nature of what lies beneath their territory. If NATO discovers the vein extends to Scandinavia, they will destroy the sites themselves.

Speed is essential. The substance is not patient. It... responds to attention.

— Varga

P.S. The confiscated Stålhandske tape is in my safe. What he recorded before his disappearance is... disturbing. His magnetometer readings confirm the vein is alive. I use that word deliberately.`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_sz_3',
    title: 'VARG\'s Personal Journal (encrypted)',
    author: 'VARG',
    date: '28.12.1984',
    classification: 'TOP SECRET',
    content: `PERSONAL — NOT FOR OPERATIONAL FILE

Day one of Aurora Borealis. CONTROL handed me the mission dossier in a parking garage in Oslo. Fitting — my whole life has been lived in shadows.

Father disappeared when I was two years old. Mother never recovered. She kept his compass on the kitchen table — the needle bent, always pointing north-northeast. Toward Norrberget. She said it broke the day he went into the mine. I think she was right, but not in the way she meant. The compass didn't break. It found what it was looking for.

CONTROL says the Soviets have been extracting a substance from the Arctic bedrock — something that amplifies nuclear reactions. Something they found during the tests on Novaya Zemlya. And it's the same thing my father found at Norrberget. The same thing that took him.

Four sites. Four raids. CONTROL says destroy them all. Collapse the vein.

I'll do it. But not just for NATO. Not just for the mission.

I'm going into that mine, CONTROL. I'm going to find out what happened to Nils Stålhandske. And if the mountain took him — I'm going to take him back.

Or I'm going to burn it all down trying.

— VARG`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_sz_4',
    title: '📼 Cassette Tape — Nils Stålhandske (recovered)',
    author: 'Nils Stålhandske, Survey Engineer',
    date: '17.06.1957',
    classification: 'TOP SECRET',
    content: `[CASSETTE TAPE — Recovered from Norrberget Mine, 1985. Tape degraded. Partial transcript.]

*Static, footsteps on gravel*

This is Nils Stålhandske, follow-up survey, Norrberget. June 17th, 1957. I'm continuing Björn's work — my colleague who disappeared here two years ago. The Survey Office wants answers. So do I.

*Sound of elevator descending*

I've reached the 400m level. Magnetometer is reading off-scale, same as Björn reported. But I've brought a new instrument — a gravimeter. And the readings are... wrong. The gravitational field here is 0.3% higher than surface. That shouldn't be possible. There's something very dense beneath us.

*Footsteps, echoing in tunnel*

I've found Björn's equipment case. It's right where the report said — at the Drift 7 seal. But...

*Long pause*

The concrete seal has a crack in it. A new crack. It wasn't in the photos from '55. And there's... condensation on the concrete. Like it's breathing.

I can hear something. Not with my ears. In my BONES. A low frequency, sub-20 hertz. Infrasound. It's making my chest vibrate.

I'm going to place the gravimeter against the seal and take a deep reading.

*Sound of equipment being positioned*

The reading is... God. The mass behind this seal is equivalent to... that can't be right. Recalibrating.

*Silence for ten seconds*

Same reading. There's something behind this wall with the density of IRON. Hundreds of tonnes. And it's...

*Sharp crack — stone splitting*

...the seal is opening. I didn't touch it. The concrete is SPLITTING from the inside.

Light. There's light coming through. Blue light.

And something is... looking at me. Through the crack. I can feel it.

Father's compass — it's spinning. Faster and faster. The needle is—

*Compass shatters — tinkling glass*

I have to go in. I know I shouldn't. But I have to go in. It WANTS me to see.

It knows my name.

*Footsteps, slow, deliberate*

*Sound of stone grinding*

*Silence*

*TAPE ENDS*`,
    hasCode: false,
    found: false,
  },
  // ═══ AURORA LORE — The Speaking Lights ═══
  {
    id: 'doc_aurora_1',
    title: 'Field Report — Aurora Anomaly',
    author: 'CONTROL, Task Force AURORA',
    date: '19.12.1984',
    classification: 'TOP SECRET',
    content: `FIELD REPORT — AURORA ANOMALY
NATO Task Force AURORA — Classification ULTRAVIOLET

During Operation Polar Whisper (November 1984), SIGINT teams monitoring Soviet frequencies from Tromsø detected an anomaly in the aurora borealis. Standard auroral emissions produce electromagnetic noise in the VLF range. What we detected was structured.

The aurora above the Substance Zero geological vein carries a signal. Not random interference — organized patterns. Repeating sequences. When graphed, the waveforms resemble neural firing patterns.

We believe Substance Zero emits electromagnetic radiation that ionizes the upper atmosphere along the vein. The aurora borealis above these sites is not natural. It is the substance communicating with itself — across hundreds of kilometers, through the sky.

The Soviets call it "Голос Сияния" — the Voice of the Aurora. Their scientists at Objekt 47 have built receivers that decode the signal. Commandant Osipovitj claims the aurora gives him orders.

Ice fishermen on the Barents coast report hearing voices when the lights are strong — conversations in a language that sounds "almost Russian, but older." One fisherman, Grigoriy Petrovitch, recorded 14 hours of aurora transmissions on a cassette deck wired to a longwave antenna. He was found frozen on the ice the next morning, the tape still running. The recording contains what sounds like a lullaby.

We recovered the tape. Analysis pending.

WARNING: Do not attempt to decode aurora transmissions without Substance Zero countermeasures. Two SIGINT operators who monitored the signal for 6+ hours developed Stage 1 symptoms.

The lights are beautiful. Do not listen to them.

— CONTROL`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_aurora_2',
    title: '📼 Cassette Tape — The Ice Fisherman',
    author: 'Grigoriy Petrovitch (recovered recording)',
    date: '02.01.1985',
    classification: 'SECRET',
    content: `[TAPE RECORDING — OUTDOOR, WIND AND ICE CRACKING]

[Click]

This is Grigoriy. Fisherman. Barents coast, near the village. Date is... second of January, I think. The nights are so long now I forget.

I've been fishing through the ice for forty years. My father before me. His father before him. We know this sea. We know its moods.

But the lights... the lights have changed.

[Sound of wind]

They used to dance. Green, sometimes white. Beautiful. Harmless. Now they... pulse. Like a heartbeat. And the colors — I've seen violet, deep red, colors that have no name. Colors the sky should not make.

[Ice cracking in the distance]

Last week, my radio picked up voices during a strong aurora. Not Russian. Not Norwegian. Something older. The words made my teeth ache. Yura, who fishes the next hole over, heard them too. He packed up and left. Smart man.

I stayed. I built an antenna from copper wire and connected it to my recorder. I wanted proof.

[Long pause]

The lights spoke to me directly last night. Not through the radio. Through the ice. I felt the words vibrating through my boots, up through my bones. They said my name. They said "Гриша, иди к нам." Grisha, come to us.

[Voice breaking]

The compass doesn't work anymore. It spins. The fish have stopped biting — they've gone deep, deeper than my line can reach. Something down there is... pulling them.

I should go home. But the lights are so beautiful tonight. The comet is out — that new one, the bright one the scientists talk about on the radio. It's directly above the village, like it's watching.

I'll fish one more hour. One more.

[Tape continues — 11 hours of wind and aurora hiss]

[TAPE ENDS — RECORDER BATTERY DEPLETED]

NOTE: Subject found frozen 200m from his fishing hole. Expression described as "peaceful." Compass in pocket — needle fused pointing straight down.`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_aurora_3',
    title: 'Aurora Communications Protocol (Soviet)',
    author: 'Dr. N. Volkov, Objekt 47 Signals Division',
    date: '15.11.1984',
    classification: 'TOP SECRET',
    content: `AURORA COMMUNICATIONS PROTOCOL
Classification: Особой Важности (Special Importance)
Objekt 47 — Signals Division

ABSTRACT:
The electromagnetic emissions from Substance Zero ionize the mesosphere directly above geological vein sites, creating an artificial aurora. This aurora can be modulated to carry encoded signals — effectively using the northern lights as a communications medium.

We have designated this system "СИЯНИЕ" (RADIANCE).

OPERATIONAL PARAMETERS:
- Range: Confirmed signal coherence across 1,400 km (Novaya Zemlya to Norrberget)
- Bandwidth: Low — approximately 30 baud equivalent
- Encryption: Inherent — only SZ-tuned receivers can decode
- Interception risk: Minimal — signal appears as natural auroral noise to standard equipment

ADVANTAGES:
- Cannot be jammed by conventional means
- No physical infrastructure required
- Operates continuously during polar night (4+ months)
- Signal strength increases with aurora intensity

DISADVANTAGES:
- Unreliable during geomagnetic storms
- Operators report "secondary voices" on the channel — source unknown
- Extended monitoring causes SZ exposure symptoms
- The comet (designated C/1984-K2) appears to amplify the signal unpredictably

COMMANDANT'S NOTE (handwritten):
"The secondary voices are not interference. They are the mountain's thoughts, carried on light. I have learned to listen. I have learned to answer. The aurora is not our tool — we are its antenna."
— A.P. Osipovitj

DIRECTOR'S NOTE:
Disregard Commandant's annotation. Schedule psychiatric evaluation.
— Col. Karpov`,
    hasCode: false,
    found: false,
  },
  // ═══ ARCTIC LEGENDS — Ice, Aurora & The Old Powers ═══
  {
    id: 'doc_legend_1',
    title: 'Sámi Elder Interview — "Guovssahasat"',
    author: 'Dr. E. Lindqvist, Uppsala Ethnography Dept.',
    date: '08.03.1952',
    classification: 'OPEN',
    content: `INTERVIEW TRANSCRIPT — FIELD RECORDING
Subject: Ánde Niillas, Sámi reindeer herder, age 87
Location: Karesuando, Swedish Lapland

DR. LINDQVIST: You spoke of the lights having a will. Can you explain?

ÁNDE: Guovssahasat — the fires of the dead. That is the old name. My grandmother said they are the spirits of those who died violently, playing football with a walrus skull across the sky.

But that is the story for children.

The real knowledge, the one we don't speak to gadjo, is this: the lights are the breath of something beneath the mountain. It breathes out through the rock, and where the breath touches the sky, it burns green.

DR. LINDQVIST: The mountain... Norrberget?

ÁNDE: [Long silence] We do not say that name. We call it "the place where reindeer refuse to go." Even in deepest winter, when they should cross that ridge, the herd splits and walks three days around. They know.

DR. LINDQVIST: What do they know?

ÁNDE: That the mountain is alive. Not alive like a bear or a tree. Alive like a thought that has been thinking for so long it became stone. And when the lights are strong — when the green fire dances low, close to the peaks — the mountain DREAMS. And its dreams leak into the world.

I have seen ice move against the current. I have seen frost form in patterns that look like writing. My grandfather could read it. He said the mountain writes warnings.

DR. LINDQVIST: Warnings about what?

ÁNDE: About waking it up. About digging.

[Recording becomes inaudible — wind interference]

ÁNDE: ...the miners came in '47. Within a year, the reindeer were gone. Within two years, the lights turned colors we had never seen. Purple. Red. Like blood in the sky.

And the ice began to obey.

DR. LINDQVIST: Obey?

ÁNDE: The mountain commands the cold. Always has. But before the digging, it was gentle — frost on the right nights, thaw at the right time. After they broke into the deep place... the cold became angry. Ice formed in summer. Rivers froze upstream. A fisherman's net was found frozen solid in July — the fish inside still alive, eyes moving, mouths opening and closing. Frozen alive but not dead.

That is when we left. When the ice began to move with purpose.

DR. LINDQVIST: Purpose?

ÁNDE: To keep people out. Or to keep something in. I was never sure which.

[END OF RECORDING]

NOTE (Lindqvist, 1985): This interview was dismissed as folklore when published. After Norrberget's classified geological survey results reached NATO, it was reclassified. The reindeer avoidance pattern has been confirmed by satellite. The ice anomalies remain unexplained.`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_legend_2',
    title: 'Pomor Fishermen\'s Log — "The Ice That Listens"',
    author: 'Captain Fyodor Belov, trawler "Nadezhda"',
    date: '14.02.1983',
    classification: 'OPEN',
    content: `CAPTAIN'S LOG — TRAWLER "NADEZHDA"
Barents Sea, 71°14'N 45°38'E

February is the cruelest month on the ice sea. The polar night still grips us. We fish by lamplight, our lanterns small orange stars scattered across the black ice.

Today something happened that I must record, though no one will believe me.

We were hauling nets through a lead — an opening in the pack ice. The aurora was strong, great curtains of green draped across the entire sky. Beautiful. The men stopped work to watch, as they always do.

Then Kolya noticed the ice.

Around our fishing hole, the ice was... growing. Not the slow creep of freezing water. GROWING. Like crystal under a microscope, but visible to the naked eye. Fractal patterns racing outward from the hole, forming shapes.

Yuri said they looked like hands.

I said they looked like roots.

Kolya — the most superstitious of us — said they looked like LETTERS. Old Church Slavonic. He claims they spelled "НЕ БЕРИ" — "DO NOT TAKE."

The nets came up empty. Not merely empty — the mesh was frozen into a solid block, though the water below was its normal -1.8°C. And inside the frozen mesh, pressed flat like flowers in a book, were dozens of fish. Arctic cod. Perfectly preserved. Eyes still clear.

They were arranged in a spiral pattern. Fish do not arrange themselves.

We cut the nets free and left. As we drove the snowmobile back to the village, I looked behind us. The lead had sealed itself. Frozen over completely in under two minutes. The ice was perfectly smooth — like glass. And in it, I swear I saw light. Blue light. Pulsing beneath the surface.

The old Pomor fishermen have a saying: "The ice sea has a memory." I always thought it was poetry.

I don't think it's poetry anymore.

— Capt. F. Belov`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_legend_3',
    title: 'Classified Memo — AURORA BOREALIS & Cryokinetic Events',
    author: 'CONTROL, Task Force AURORA',
    date: '22.10.1985',
    classification: 'TOP SECRET',
    content: `CLASSIFIED MEMO — NATO TASK FORCE AURORA
Subject: Correlation Between Aurora Intensity and Cryokinetic Phenomena
Classification: ULTRAVIOLET

SUMMARY:
Analysis of 14 months of field data has confirmed a direct correlation between Substance Zero auroral emissions and anomalous ice behavior along the geological vein.

We are now categorizing these events as "cryokinetic phenomena" — the apparent manipulation of ice and frost by an unknown force linked to Substance Zero.

DOCUMENTED INCIDENTS:

1. NORRBERGET MINE ENTRANCE (Mar 1985): Ice sealed the mine shaft overnight. Three meters thick. Perfectly uniform crystal structure — no air bubbles. Soviet drilling team required 48 hours to reopen. The ice reformed within 6 hours. Drilling was abandoned.

2. BARENTS SEA ANOMALY (Jan 1985): Satellite imagery shows a 4km circle of perfectly smooth ice directly above the submarine geological vein. All surrounding ice shows normal drift patterns and pressure ridges. This circle is motionless. It has not moved in eleven months. Soviet icebreakers avoid it.

3. OBJEKT 47 WATER SUPPLY (Nov 1984): Pipes froze simultaneously across the entire facility during a powerful aurora display. Temperature was -12°C — cold, but well within the pipes' insulation tolerance. Ice inside the pipes formed a helix pattern. Commandant Osipovitj ordered the ice preserved. He said it was "a message."

4. FISHING VILLAGE HARBOR (Dec 1984): Harbor froze solid in under three minutes during Nachalnik's attempt to ship a large SZ consignment by boat. The ice trapped two vessels. It did not thaw for six weeks, despite ambient temperatures rising to -2°C. Nachalnik lost the shipment.

ANALYSIS:
Substance Zero appears to exert influence over water crystallization within a radius proportional to its concentration. The geological vein acts as a conductor. When auroral activity amplifies the signal, this influence extends to the surface.

Working hypothesis: the cryokinetic events are DEFENSIVE. The substance — or the consciousness within it — is using ice as a barrier. It seals mine entrances. It traps ships. It freezes infrastructure.

It is protecting itself.

Or it is protecting US. From what lies deeper.

RECOMMENDATION: All AURORA operatives must carry thermite charges as backup. Conventional tools cannot breach cryokinetic ice. Only extreme heat disrupts the crystalline structure — and even then, it reforms within hours.

The cold is not weather. The cold is a weapon. And the mountain knows how to use it.

— CONTROL`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_legend_4',
    title: '📼 Cassette Tape — The Comet Watcher',
    author: 'Unknown Soviet astronomer (recovered)',
    date: '28.12.1984',
    classification: 'SECRET',
    content: `[TAPE RECORDING — INDOOR, SOUNDS OF EQUIPMENT HUMMING]

[Click]

I shouldn't be recording this. If Colonel Karpov finds out, I'll be reassigned. Or worse.

I'm a junior astronomer at Objekt 47's surface observation post. My job is monitoring weather and auroral conditions. Routine work. But comet C/1984-K2 changed everything.

The comet appeared in October. Bright. Persistent. It doesn't follow a standard parabolic orbit — it LINGERS. It's been visible for three months now, hovering above the polar horizon like a lantern.

When I track it with the spectrometer, the emission lines are wrong. Comets are water ice, carbon dioxide, dust. This one shows spectral lines that match nothing in the catalog. Except...

[Papers rustling]

Except Substance Zero. The emission lines match the SZ-0 reference spectrum from Laboratory No. 3. Perfectly.

The comet is made of the same material as what's in the mountain.

And it's not leaving. Standard orbital mechanics say it should have passed perihelion and begun its outbound trajectory weeks ago. It hasn't. It's holding position. Stationary relative to the vein.

Last night, during a strong aurora, I saw something that destroyed my ability to sleep. The auroral curtain reached UP toward the comet. Not randomly — a distinct column of light, connecting the ground glow to the comet. For eleven minutes. The spectrometer recorded a signal — structured, encoded, two-way.

The mountain was talking to the comet. The comet was answering.

[Long pause]

I think Substance Zero is not from Earth. I think it arrived here, long ago, carried on something like this comet. Seeded into the bedrock. Waiting.

And now another one has come. To check on it. Or to wake it up.

[Sound of door opening]

I have to go. If this tape survives — tell the world. The lights in the sky are not random. The ice is not random. The mountain is not random.

Nothing here is random.

[Click]`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_legend_5',
    title: 'Norse Saga Fragment — "Ísaþing" (The Ice Assembly)',
    author: 'Translated by Prof. K. Ólafsdóttir, Reykjavík',
    date: 'c. 1240 AD (translated 1978)',
    classification: 'OPEN',
    content: `FRAGMENT — from a damaged vellum manuscript found in Trondheim Cathedral archive, 1971. Catalogued as "Fragmentum Boreale VII." Language: Old Norse with unusual loanwords.

TRANSLATION:

"In the time before the settling, when the Northlands were empty of men, the mountain that would be called Norrberget spoke with the sky.

In winter, when the darkness was complete, the mountain would breathe fire — not the fire of hearth or forge, but cold fire, green and violet, that rose from the stone and painted the heavens.

The Sámi knew this and feared it. They called the mountain Jiehtanas-várri — the Giant's Mountain — and said that inside it slept a being from before the world was made. It had no name that human tongues could speak. It was not a god. It was not a jötunn. It was OLDER.

When the cold fire burned brightest, the ice would come alive. Rivers would freeze from the bottom up. Frost would grow in the shape of runes — not the runes of men, but an older alphabet that made the eyes ache to read.

Travelers who crossed the mountain in deep winter spoke of ICE THAT WALKED. Pillars of frost that turned to follow their passage. Walls of ice that appeared where no wall had been, blocking paths, herding travelers away from the summit.

The völva Gróa, who was wise beyond all women, climbed the mountain during the solstice. She returned seven days later. Her hair had turned white. Her eyes had turned blue — not the blue of sky, but the blue of deep glacier ice. She could not speak for three days.

When she finally spoke, she said: 'The mountain remembers the time before ice. It remembers the sky it fell from. And it is lonely. That is why it calls. That is why the lights dance. It is trying to speak to the stars, because no one on this earth remembers its language.'

Gróa lived ninety more years. Her eyes never changed back. She could predict the first frost of every winter to the hour. She could walk barefoot on ice and leave no footprint.

The people said the mountain had given her a gift.

The people were wrong. The mountain had made her a guardian."

[END OF FRAGMENT]

TRANSLATOR'S NOTE (Ólafsdóttir, 1978): The unusual loanwords in this text do not correspond to any known Sámi, Finnish, or Proto-Norse root. Linguistic analysis suggests they may be phonetic transcriptions of non-human sounds. The manuscript's vellum has been carbon-dated to approximately 1240 AD, but the ink contains trace minerals not found in any medieval European pigment. Analysis is ongoing.`,
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
