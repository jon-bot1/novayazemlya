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

Facility personnel evacuated in unknown direction. Laboratory equipment partially dismantled, but traces of experimental work with unknown samples have been found. Walls of Laboratory No. 3 are covered in a dark crystalline residue that was not present during previous inspections. The residue is warm to the touch. It hums at a frequency below human hearing. Two members of the recon team who touched it bare-handed have reported persistent dreams of "a door opening beneath the sea."

WARNING: Upon discovery of containers marked "B-series" — DO NOT OPEN. DO NOT LOOK DIRECTLY AT CONTENTS. Relay code WOLF-7 to HQ for instructions.

Group "Cedar" has been redeployed to reinforce the perimeter. Communications via frequency 147.300.

ADDENDUM (handwritten): The aurora was green when we arrived. By morning it had turned red. I have never seen a red aurora in March. The sky looked like it was bleeding.

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

Yesterday I saw people in chemical suits coming from the bunker. Their suits were covered in frost — in August. One of them had taken his mask off. His nose was bleeding black. Not red. Black.

Standing guard near that place is terrifying. At night you hear strange sounds from the ventilation — not mechanical. It sounds like chanting. Rhythmic. In a language I don't recognize. Seryozha from second platoon says he's seen creatures outside the perimeter. I told him he was drunk. But last night I saw them too. Shapes at the treeline. They stood perfectly still, but the snow around their feet was melting in circles, as if they radiated heat. When I shone my flashlight, they were gone. But the melted circles remained.

The priest in our unit refuses to enter the chapel anymore. He says his prayers come back wrong — he hears his own voice echoing from the ventilation shaft, repeating his words in reverse.

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

✓ Gas masks GP-7 — 240 pcs (12 decommissioned — filters turned black overnight, cause unknown)
✓ RPK-74 — 6 pcs
✓ Ammunition 5.45x39 — 12,000 rds (actually ≈8,000, rest "disappeared")
✓ Ammunition 9x18 — 8,000 rds
✓ MREs — 400 pcs (best before... yeah, technically)
✓ Medical kits AI-2 — 80 pcs
✓ Vodka "Stolichnaya" — 24 bottles (for "disinfection")
✓ Cigarettes "Prima" — 50 packs
✗ Container B-7 — MISSING (who took it?!)
✗ Documentation for project "Dawn" — MISSING
✗ Ritual implements (box 14-C) — NOT ON MANIFEST. Found during inventory. Contains: 7 black candles, a bowl of frozen mercury (still liquid despite -30°C storage), a circle drawn in charcoal on the floor BENEATH the storage rack. Charcoal tested — not wood-based. Possibly calcite from 400m depth.

NOTE: If anyone steals vodka from storage again — I'll shoot. I'm not joking.

— Sidorov
P.S. Something ate three MREs. Tore through the packaging. Teeth marks in the metal tins. Not mice. Not rats. The teeth marks are HUMAN but the jaw width is approximately 20cm. I am requesting a transfer.`,
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
Dragunov served 8 years in the Soviet Navy, Black Sea Fleet. Dishonorably discharged in 1980 after an incident involving the disappearance of three crew members during a storm. Investigation inconclusive — witnesses reported Dragunov was found on deck alone, speaking to the sea in an unknown language. Blood was found on the hull below the waterline, but not human blood. Chemical analysis inconclusive.

After discharge, he established control over a small fishing village on the northern coast. Within two years, he had turned the legitimate fishing operation into a smuggling network — weapons, contraband, and Substance Zero shipments in lead-lined containers.

DISTINGUISHING FEATURES:
- Always carries a massive industrial fish hook, repurposed as a close-combat weapon. Hook is approximately 40cm long, sharpened to a razor edge. The hook is inscribed with symbols that match no known alphabet — Dragunov claims "the sea taught him"
- Missing left ring finger (claims fishing accident, 1976 — medical records show clean severance inconsistent with accident, consistent with ritual amputation)
- Tattoo of an anchor on right forearm — close inspection reveals the anchor's chain forms a spiral that does not end; it continues beneath the skin in raised scarring
- Speaks with a deep voice, rarely shouts — his men fear his quiet commands more than any officer's screams

KNOWN ASSOCIATES:
- Pack of trained dogs used for perimeter security — dogs will not enter the dock building after dark
- Network of "redneck" smugglers from nearby settlements

PSYCHOLOGICAL NOTE:
Dragunov sleeps on the pier. Not in a cabin — on the wooden dock itself, exposed to the elements. Guards report he sleeps with one hand in the water. On mornings after strong aurora displays, the water around the pier is significantly warmer than the surrounding sea. Fish gather beneath the dock in unnatural numbers during these events, floating motionless, facing the same direction.

WARNING:
Dragunov is extremely dangerous in close quarters. He is known to charge directly at armed targets — do NOT let him close the distance.

His men call him "Nachalnik" — The Boss. On the pier, his word is law. And the sea, it seems, obeys him too.

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

Nachalnik doesn't sleep. He sits on the dock with that hook, sharpening it on a stone. Scrape. Scrape. Scrape. You can hear it from the cabins. Sometimes the scraping changes rhythm and the sea responds — waves pulse in time with his hand. I've watched. The tide FOLLOWS his hook.

Last month, Petya tried to steal a boat. They found him on the beach next morning. The hook had gone clean through his shoulder. He was alive. Nachalnik wanted him alive. So everyone could see.

But here's the strange part — Petya says Nachalnik wasn't the one who caught him. He says the WATER caught him. Says a wave rose up and wrapped around his legs like a hand. By the time he fell, Nachalnik was already standing over him. Hadn't moved from his spot on the dock. The distance was 40 meters.

The speedboat is the only way out. And Nachalnik has the keys. He keeps them on a chain around his neck, next to a vial of something dark that glows faintly when the aurora is out.

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

Petrov disappeared last night. Just... gone. His bunk was still warm. Boot prints led to the south entrance, then stopped. Just stopped. In the middle of the snow. No tracks leading away. But there were OTHER tracks — starting where his ended. Not boots. Bare feet. Enormous. And they led BACK toward the bunker. Toward the ventilation shaft on sublevel 3.

The lieutenant says he deserted. But where would he go? There's nothing for 200 kilometers.

[Voice cracks]

I found his lighter by the ventilation shaft. The one his wife gave him. He'd never leave that behind. The lighter was ice cold. Not winter cold — the metal burned my fingers with cold. And the flame... when I lit it, the flame burned blue. Not orange. Blue. Like the crystals in Lab 3.

The chaplain held a prayer service for Petrov. Halfway through, every light in the barracks flickered — and the ventilation system breathed out a long, slow sigh. Not mechanical. Organic. Like an exhalation. And for one second, the barracks smelled of deep stone and ancient water.

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
A pre-Cambrian material has been identified in the Arctic bedrock spanning from northern Scandinavia to the Novaya Zemlya archipelago. The geological vein runs at depths between 380-500 meters, following the ancient Caledonian fault line — but recent deep-core surveys suggest the network extends FAR beyond the Arctic. Branching tendrils of SZ-0 have been detected at depth beneath the Ural Mountains, the Kola Peninsula, and — most alarmingly — as far south as the Baltic seabed. The vein is not a deposit. It is a ROOT SYSTEM. Hundreds of kilometers of crystalline filament threading through the Earth's crust like a nervous system through a body.

ORIGIN THEORY — THE NUCLEAR AWAKENING:
Soviet GRU discovered the material during underground nuclear testing on Novaya Zemlya in 1954. They designated it "Вещество Ноль" (Substance Zero). But DISCOVERY is the wrong word. The substance was always there — dormant, inert, undetectable by conventional instruments.

The nuclear detonations WOKE IT UP.

Prior to 1954, no anomalous readings existed at any site along the vein. No magnetic disturbances, no auroral anomalies, no cryokinetic events. The geological record shows SZ-0 had been dormant for an estimated 65 million years — since the Cretaceous extinction event.

The first Soviet underground test at Novaya Zemlya (12 kt, October 1954) sent a shockwave through the bedrock. Within hours, magnetometers across northern Scandinavia registered a pulse — a single, structured electromagnetic burst traveling along the vein at 4,200 m/s. Not a seismic aftershock. A SIGNAL. As if the detonation had rung a bell that the entire network could hear.

Swedish miners at Norrberget — 1,400 km from the test site — reported their equipment "screaming" on the same day. The deep crystals began to glow. Three workers collapsed with nosebleeds. The mountain had felt the bomb.

Each subsequent test amplified the response. By 1961, after the Tsar Bomba (50 Mt surface detonation), the vein was fully active across its entire known length. Auroral anomalies began. Ice behavior changed. The first disappearances were reported.

WORKING HYPOTHESIS: Substance Zero is not a mineral. It is a dormant organism — or a distributed consciousness — embedded in the planetary crust since the Precambrian era. Nuclear detonations, with their massive release of energy into the lithosphere, function as an alarm clock. Each test makes it more awake. More aware. More responsive.

The Soviets have conducted 224 nuclear tests on Novaya Zemlya. Each one has fed it.

STRATEGIC VALUE:
When refined, SZ-0 amplifies nuclear fission chain reactions by a factor of 12. A single enhanced warhead could produce yields equivalent to 600 kilotons. This would render NATO's entire nuclear deterrence doctrine obsolete.

THE PARADOX: The very weapons we seek to enhance are the weapons that woke it. Every nuclear detonation strengthens the substance. We are feeding the thing we are trying to exploit. And it is growing. Deep-vein surveys show the network has expanded 23% since 1954. New tendrils are forming. Reaching south. Reaching deeper.

Soviet assets along the vein:
1. OBJEKT 47 — Primary extraction & refinery (Novaya Zemlya)
2. COASTAL VILLAGE — Maritime export pipeline (Arctic coast)
3. HOSPITAL №6 — Human resistance research (near Objekt 47)
4. NORRBERGET MINE — Source site, recently reopened (Sweden)

NOTE: The material exhibits properties inconsistent with any known substance. It absorbs sound. It generates magnetic fields. Workers exposed to it report auditory hallucinations. In at least three confirmed cases, exposed individuals have been physically ABSORBED into the rock.

This is not a mineral. This is something that has been sleeping beneath us since before mammals existed. And we woke it with the most violent force our species has ever created.

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
  // ═══════════════════════════════════════════════════════════
  // RUSSENORSK COASTAL LEGENDS — oral traditions from the northernmost shore
  // ═══════════════════════════════════════════════════════════
  {
    id: 'doc_russenorsk_1',
    title: 'The Boiling Sea — A Pomor-Norse Oral Account',
    author: 'Transcribed by Fr. Henrik Norum, Vardø parish',
    date: '~1847 (oral tradition, est. 16th c.)',
    classification: 'OPEN',
    content: `COLLECTED ORAL HISTORY — RUSSENORSK DIALECT
Transcribed from the testimony of Fjodor "Gamle-Fjansen" Kuznetsov, fisherman, Hamningberg.

Original russenorsk (phonetic reconstruction):
"På sjøen, på den aller nordligaste, der havet går slutt — der koker sjøen. Ikke som gryte, nei. Som sjøen bli sint. Boblene kommer opp, store som hus, og vannet bli hvitt. Fisk dør. Fugl flyr. Og lyset — Gospodi — lyset kommer fra under vannet."

TRANSLATION:
"On the sea, on the very northernmost, where the ocean ends — there the sea boils. Not like a pot, no. Like the sea becomes angry. The bubbles come up, big as houses, and the water turns white. Fish die. Birds flee. And the light — God help us — the light comes from under the water."

Kuznetsov claimed his grandfather had sailed within sight of the phenomenon, which the mixed Pomor-Norwegian fishing communities called "det kokande havet" (the boiling sea). The event occurred during a winter without aurora — unusual in itself — and lasted three days.

"Bestefar sa det luktet som stein som brenner. Ikke svovel. Stein. Og etterpå fløt det opp ting fra bunnen. Steiner som lyste i mørket. Blå steiner. De tok dem med. Alle som rørte dem ble syke. Men de kunne se i mørket etterpå. Og de hørte... noe. Under isen. Noe som snakket."

"Grandfather said it smelled like burning stone. Not sulphur. Stone. And afterwards, things floated up from the bottom. Stones that glowed in the dark. Blue stones. They took them along. Everyone who touched them fell ill. But they could see in the dark afterwards. And they heard... something. Under the ice. Something that spoke."

PARISH NOTE (Norum): I record this testimony not because I believe it, but because I have heard the same account — with identical details — from seven separate families across three villages that have no contact with one another. The consistency is troubling.`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_russenorsk_2',
    title: 'The Mountain and the Comet — Bardufoss Fragment',
    author: 'Unknown narrator; recorded by Dr. Astrid Solheim, UiT',
    date: '1962 (recording) / tradition est. pre-1700',
    classification: 'SECRET',
    content: `REEL-TO-REEL TRANSCRIPT — UiT Arctic Folklore Archive, Tape BF-0044
Narrator: Elderly woman, name redacted, Bardufoss area. Speaks in a mix of Norwegian, Sámi loanwords, and archaic russenorsk expressions.

"Berget visste at kometen kom. Lenge før mennesker hadde øyne å se med, visste berget. Fordi berget og kometen er av samma ting. Samma substans. De er... bror og søster? Nei. De er samma vesen, delt i to. En del falt ned og ble berg. En del fortsatte å fly og ble komet.

Og hver gang kometen passerer — hvert tusende år, kanskje, kanskje mer — da våkner berget. Det strekker seg. Det roper. Og kometen roper tilbake. Det er det vi ser. Det vi kaller nordlyset. Det er ikke lys. Det er et rop. En samtale mellom to deler av noe som ble splittet da verden ble til.

De gamle sa: 'Når lyset er som sterkest, er berget som mest våkent. Da må du ikke gå inn. Da tar berget deg. Ikke for å drepe deg. For å bruke deg. Som en munn bruker en tunge. Berget trenger stemmer. Det har glemt sin egen.'"

DR. SOLHEIM'S NOTE: The informant refused payment. She said the story "does not belong to anyone" and that she was merely "returning it to the air." She died eleven days after this recording. Her family reported that in her final hours she spoke in a language none of them recognized.

SUPPLEMENTARY (classified addendum, 1983): Spectral analysis of the 1961 and 1986 comet passages shows anomalous electromagnetic resonance patterns in the Novaya Zemlya geological stratum. The frequency signature is... structured. Not random. The patterns match no known natural phenomenon. File cross-referenced with PROJECT AURORA BOREALIS.`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_russenorsk_3',
    title: 'Vägvisare utan namn — The Nameless Guides',
    author: 'Captain Petter Dahl, Norwegian Coast Guard (ret.)',
    date: '11.02.1971',
    classification: 'SECRET',
    content: `PERSONAL TESTIMONY — submitted to Norwegian Defence Intelligence (E-tjenesten)
Classification upgraded to SECRET by order of Dir. Karlsen, 1972.

I am writing this because I am 74 years old and I do not believe anyone will take me seriously, so there is nothing left to lose.

Between 1938 and 1952, during my service along the Finnmark coast and later during the war and reconstruction, I encountered on FIVE separate occasions individuals whom the coastal communities call "vägvisare" — pathfinders or guides. They have no other name.

They appear in the worst conditions. Blizzards that kill visibility. Sea fog so thick you cannot see your own hand. The kind of weather where experienced men die.

A figure appears. Always alone. Always walking, never running. They do not speak. They gesture — follow me. And if you follow, you survive. They lead you to shelter, to the correct heading, away from the rocks. Then they are gone.

Physical description: Impossible to determine. They wear heavy clothing appropriate to the weather. Their faces are always obscured — hoods, scarves, snow. But here is the detail that made me write this report:

THEY LEAVE NO FOOTPRINTS.

I verified this personally in 1947, during a February storm off Berlevåg. A figure led our patrol to a sheltered cove. When the storm cleared, our tracks were visible in the snow. His were not. The snow where he had walked was not compressed. It was FROZEN. Solid ice, in the exact shape of footsteps, but raised — as if the snow had crystallized upward where he stepped rather than compressing down.

The locals do not discuss this openly. When pressed, the oldest fishermen — those who still speak the old russenorsk pidgin — say the vägvisare are "bergets folk." The mountain's people. They say: "De passer på oss fordi vi passer på hemmeligheten." They watch over us because we keep the secret.

What secret?

No one will say.

I asked a Pomor elder in Kiberg, a man named Grigorij, about this in 1949. He looked at me for a very long time. Then he said, in his broken russenorsk: "Fjellet sover. Vi holder det sovende. Hvis det våkner helt — havet koker igjen. Sist det skjedde, forsvant en hel øy."

"The mountain sleeps. We keep it sleeping. If it wakes fully — the sea boils again. Last time that happened, an entire island disappeared."

I have checked the geological records. There IS a missing island in the Novaya Zemlya archipelago. Soviet charts from 1933 show an island — designated NZ-14 — that does not appear on any chart after 1938. It is listed as "submerged due to seismic activity."

No seismic event was recorded in that area during that period.`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_russenorsk_4',
    title: 'Isolation Protocol — Northern Station Ø',
    author: 'Dr. Marit Ødegaard, Station Ø meteorologist',
    date: '03.12.1979',
    classification: 'TOP SECRET',
    content: `PERSONAL LOG — NOT FOR TRANSMISSION
Station Ø, Bjørnøya relay. Day 187 of winter rotation.

There are four of us at the station. Hansen, Kovacs, Petrov, and myself. We have been alone for 187 days. The supply ship will not come until April.

The isolation does things to the mind. I know this. I studied it. I wrote my thesis on "Arctic Hysteria and the Phenomenology of Polar Isolation." I know all the symptoms. Auditory hallucinations. Paranoia. The sense of a presence.

But this is not that.

Day 140: Kovacs reports hearing rhythmic knocking from beneath the station floor. We check. The station is built on rock. Solid basalt. There is nothing below us but stone.

Day 151: Hansen sees lights in the water. Not the aurora reflected — lights UNDER the surface. Moving in geometric patterns. Triangles. Hexagons. He photographs them. The photographs show nothing.

Day 158: Petrov stops sleeping. Says he doesn't need to. Says the mountain is teaching him. When I ask which mountain — we are on a flat island — he points NORTH. Toward Novaya Zemlya. 300 kilometers of open Arctic sea.

Day 165: I hear the knocking. It IS rhythmic. It IS real. It comes from below. I put my ear to the floor and I hear... not knocking. Breathing. Slow, vast breathing. As if the rock itself is alive.

Day 170: The aurora is wrong. I have studied polar optics for eleven years. The aurora does not behave like this. It is... focused. It forms a column — a single vertical pillar of green light — directly over our station. It persists for nine hours. This is electromagnetically impossible.

Day 178: We all hear it now. Not breathing. Words. In a language that is not a language. Sounds that feel like they have MEANING but bypass the ears entirely. They arrive in the chest. In the bones.

Day 183: Petrov draws the words. He says he can see them. He fills seventeen pages with symbols that look like frost crystals arranged into sentences. I photograph these. The photographs show the symbols clearly.

Day 187: I understand now. The isolation is not the disease. The isolation is the POINT. The settlements understood this. The old russenorsk communities positioned themselves as a barrier — a ring of silence around the northern coast. Their isolation was not poverty. It was PURPOSE. They are the keepers. The vägvisare are the sentinels. And the mountain...

The mountain is patient. It has waited for millions of years. It can wait longer.

But it is listening.

I will burn this log before the supply ship arrives.

[NOTE: This document was recovered from Station Ø during decommissioning in 1994. It was found inside a sealed steel thermos, buried in the permafrost beneath the station foundation. Dr. Ødegaard reported "an uneventful rotation" in her official debriefing. She resigned from the meteorological service in 1980 and moved to a small fishing village on the Finnmark coast. She has not been interviewed.]`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_russenorsk_5',
    title: 'Det Intensiva Ljuset — The Intense Light',
    author: 'Collective testimony, Hamningberg fishing collective',
    date: 'Various, compiled 1953',
    classification: 'OPEN',
    content: `COMPILED ORAL TESTIMONIES — Norwegian Folklore Institute
Subject: "Det intensiva ljuset" (The Intense Light)
Collected across seven hamlets on the Varanger Peninsula, 1951–1953.

Multiple independent witnesses describe a recurring phenomenon they call "det intensiva ljuset" — an auroral event distinct from normal northern lights. Key distinguishing features reported consistently across all communities:

1. COLOR: Not the usual green-white. Described as "the blue you see when you close your eyes too hard" and "the color of very deep ice." One informant: "Ikke blå. Ikke grønn. En farge som ikke finnes. Som øyet finner opp fordi hjernen ikke vet hva den ser."
("Not blue. Not green. A color that doesn't exist. One the eye invents because the brain doesn't know what it's seeing.")

2. SOUND: Normal aurora is silent. This is not. Every witness reports a low sound — not heard, FELT. Described as "a cathedral organ playing one note below the floor" and "the hum a mountain would make if mountains could hum."

3. BEHAVIOR: The light does not drift or shimmer. It MOVES WITH PURPOSE. It crosses the sky in straight lines. It stops. It changes direction at sharp angles. Several witnesses report it descending — coming down from the sky and touching the ground. Where it touches, "the snow turns to glass."

4. AFTERMATH: For 2-3 days following an appearance, compasses malfunction. Radio reception fills with what one operator describes as "voices speaking a language made of static." Dogs refuse to go outside. Reindeer herds move south without being driven.

TESTIMONY OF ANNA JOSEFSEN, age 82, Hamningberg:
"Min bestemor sa det slik: 'Lyset er ikke lys. Det er en dør. Og noen ganger, når døren åpner seg, kan du se gjennom. Ikke opp til himmelen. Ned. Ned gjennom berget, gjennom jorden, helt ned til der alt begynte. Og der nede er det noe som ser tilbake.'"

"My grandmother said it like this: 'The light is not light. It is a door. And sometimes, when the door opens, you can see through. Not up to the sky. Down. Down through the mountain, through the earth, all the way to where everything began. And down there, something looks back.'"

TESTIMONY OF GRIGORIJ ANTONOV, age 77, Kiberg (Pomor descent, speaks russenorsk):
"На sjøen vi sier: 'Когда ljuset kommer, ikke se opp. Se på havet. Havet forteller sannheten. Himmelen lyger.' Og det er sant. Når det ljuset brenner, ser du det i vannet — bølgene stopper. Havet blir stille som glass. Og under glasset ser du former. Store former. Beveger seg sakte. Noe enormt. Noe som sover, men drømmer med øynene åpne."

"On the sea we say: 'When the light comes, don't look up. Look at the sea. The sea tells the truth. The sky lies.' And it's true. When that light burns, you see it in the water — the waves stop. The sea becomes still as glass. And under the glass you see shapes. Large shapes. Moving slowly. Something enormous. Something that sleeps, but dreams with its eyes open."

COLLECTOR'S NOTE (Dr. Arne Fjeld, 1953): I began this project as a straightforward folklore survey. I am ending it because I can no longer sleep. Not because of fear. Because every night, since I began transcribing these testimonies, I dream of a color I cannot name. And in the dream, I understand what it means. But when I wake, the understanding is gone, and all that remains is the certainty — absolute and bone-deep — that something under the northern mountains is aware of us.

I am returning to Oslo. I recommend this file be sealed.`,
    hasCode: false,
    found: false,
  },
  // ═══════════════════════════════════════════════════════════
  // NATO DARK OPERATIONS — The West's hands are not clean
  // ═══════════════════════════════════════════════════════════
  {
    id: 'doc_nato_1',
    title: 'NATO STANAG 4779 — "Project MIDNIGHT SUN" (Excerpts)',
    author: 'Supreme Headquarters Allied Powers Europe (SHAPE)',
    date: '22.09.1986',
    classification: 'TOP SECRET',
    content: `NATO — COSMIC TOP SECRET — NOFORN
STANAG 4779 — ANNEX F (EYES ONLY: SACEUR, SACLANT, DNI)

SUBJECT: Exploitation Framework for Sub-Arctic Geological Asset "MIDNIGHT SUN"

1. STRATEGIC ASSESSMENT

1.1 The substance designated SZ-0 (ref: Soviet classification "Substance Zero", NATO codename MIDNIGHT SUN) represents the single most significant strategic resource identified since fissile uranium.

1.2 Soviet exploitation of SZ-0 is estimated at 15-20 years ahead of Allied capability. This gap is UNACCEPTABLE.

1.3 The geological vein extends from Novaya Zemlya through the Barents Sea floor to the Scandinavian mountain range. Allied-accessible deposits exist within Norwegian sovereign territory (Norrberget site, Finnmark).

2. RECOMMENDED ACTIONS

2.1 PHASE ALPHA: Establish covert extraction facility at Norrberget under cover of "geological survey" (ref: Norwegian MoD cooperation agreement ODIN-7, signed under duress 1984).

2.2 PHASE BRAVO: Deploy GLADIO-N stay-behind network to monitor and, if necessary, eliminate civilian witnesses in adjacent communities. Ref: Operational budget approved under black line item NATO/AC/46-D/2048.

2.3 PHASE CHARLIE: If Soviet extraction at Novaya Zemlya cannot be disrupted through covert means, SHAPE recommends "catastrophic geological event" to collapse the eastern vein terminus. Civilian casualty estimate: 400-2,000 (acceptable under SACEUR wartime authority).

3. ETHICAL FRAMEWORK

3.1 None. SZ-0 supersedes all existing frameworks. The substance's potential for weapons enhancement, energy generation, and [REDACTED] places it beyond conventional moral calculus.

3.2 Norwegian government has NOT been fully briefed. Minister of Defence has been provided sanitized summaries only. Full disclosure would "complicate the alliance relationship" (ref: DNI assessment 1985-447).

DISTRIBUTION: 6 copies. Numbered. No photocopying. Destroy after reading.

[HANDWRITTEN IN MARGIN, UNKNOWN HAND]: "We are no different from them. We just write better memos."`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_nato_2',
    title: 'Intercepted CIA Cable — Station POLARIS to Langley',
    author: 'Chief of Station, Tromsø (cover: Cultural Attaché)',
    date: '14.01.1988',
    classification: 'TOP SECRET',
    content: `FLASH — STATION POLARIS — EYES ONLY DCI

SUBJECT: MIDNIGHT SUN — Human Testing Update

1. Norwegian test subjects (ref: PROGRAM FROSTBITE) continue to show cognitive enhancement following controlled SZ-0 exposure. Subjects 4 through 11 demonstrate 340% improvement in pattern recognition, 280% improvement in spatial reasoning.

2. Side effects remain... significant. Subject 4 has not slept in 19 days. She claims she doesn't need to. Medical staff confirm normal vitals. She spends her waking hours writing — filling notebooks with text in a script no linguist has identified. When asked what she is writing, she says: "It's not me writing."

3. Subject 7 (the fisherman from Berlevåg) was terminated after he began exhibiting physical changes. His skin developed crystalline structures along the forearm. The crystals were analyzed: pure SZ-0, growing FROM INSIDE HIS BODY. He said the mountain was "building him a new skeleton." Termination required three rounds. The crystals deflected the first two.

4. We have NOT informed Oslo. Norway's participation in MIDNIGHT SUN is based on the understanding that we are conducting "atmospheric research." If they discover the human testing program, Alliance cohesion in the Northern Flank will collapse.

5. Request: Additional subjects. The local Sámi community has individuals with apparent natural resistance to SZ-0 psychoactive effects. Recommend recruitment through economic incentive. If that fails, recommend compulsory participation under national security authority.

6. Personal assessment: I have served the Agency for 22 years. I have done things I am not proud of. But this program makes me question whether we are the good guys. The Soviets experiment on prisoners. We experiment on fishermen who think they're getting free medical checkups. The difference is bureaucratic, not moral.

REQUEST GUIDANCE.

[RESPONSE FROM LANGLEY, HANDWRITTEN]: "Continue. Results justify methodology. — J.W."`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_nato_3',
    title: 'Norwegian Intelligence Officer\'s Resignation Letter',
    author: 'Major Kari Henriksen, E-tjenesten (Norwegian Intelligence)',
    date: '03.04.1989',
    classification: 'SECRET',
    content: `PERSONAL — HAND DELIVERED — NOT FOR FILING

To: Director, E-tjenesten
From: Major Kari Henriksen, Arctic Section

Sir,

I hereby resign my commission, effective immediately.

I will not provide a reason on the record. Off the record, since you will send someone to ask anyway, here is what I know:

I was tasked with monitoring NATO activities at the Norrberget site. I was told it was a weather station. It is not a weather station. It is an extraction facility for the same substance the Soviets are mining at Novaya Zemlya.

I was told our Allies were conducting atmospheric research. They are not conducting atmospheric research. They are conducting experiments on Norwegian citizens. I have documented seven cases. The subjects were recruited from isolated fishing villages — people who would not be missed. They were told they were receiving free health screenings.

Three of the seven subjects are now dead. The official cause of death in each case is "cardiac arrest." The actual cause is that their internal organs were progressively replaced by crystalline growths of the extracted substance. They died, essentially, by being turned to stone from the inside.

The four surviving subjects are being held at a facility I was not permitted to enter. Through contacts, I have learned that they are no longer... entirely human. They communicate with each other in a language that did not exist six months ago. Medical staff report hearing them speaking IN UNISON — the same words, at the same moment, from separate isolation rooms.

Norway is supposed to be a sovereign nation. We are being used as a laboratory by an Alliance that treats us as a colony with strategic geography.

I am taking my documentation to [REDACTED]. If this letter is the last thing I write, it is because you chose to silence me rather than confront what we have become.

Kari Henriksen

[STAMPED: FILE CLOSED — SUBJECT RELOCATED — NO FURTHER ACTION]
[HANDWRITTEN NOTE, DIFFERENT INK]: "Henriksen was found dead in her apartment, 11.04.1989. Cause: apparent suicide. Case closed. — Dir. Paulsen"`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_archangelsk',
    title: 'The Archangelsk Testimony',
    author: 'Father Dimitri Volkonsky, Diocese of Archangelsk',
    date: '02.02.1938',
    classification: 'SECRET',
    content: `SEALED TESTIMONY — Diocese of Archangelsk
Recorded by Bishop's Secretary, filed under "Unexplained Phenomena — Northern Parishes"

I, Father Dimitri Alexeievich Volkonsky, parish priest of the Church of the Intercession, Archangelsk, do hereby set down this account of the events of January 1938, in full knowledge that my superiors will dismiss it, and in full acceptance that recording it may cost me my position — or my life, given the times we live in.

On the night of January 14th, the Feast of the Circumcision by the old calendar, death and darkness came to Archangelsk.

It began with the lights. The aurora had been unusually active for weeks — green curtains that hung so low they seemed to brush the cathedral spire. The fishermen said the lights were "angry." The old women crossed themselves and would not leave their homes after sundown.

At 11:47 PM, every electric light in the city went dark. Not a power failure — the bulbs remained intact, the generators running. The light simply... stopped. As if darkness itself had become a substance, filling the streets like black water. Candles still burned, but their flames gave no illumination beyond a hand's width.

Then came the cold.

Not winter cold. Not the honest cold of the Arctic that we know and endure. This was a cold with INTENT. It moved through the streets like a living thing. Where it passed, windows frosted from the inside. Water froze in kettles still hanging over lit stoves. A mother nursing her infant felt the milk freeze in her breast.

The temperature, measured by the meteorological station, dropped from -18°C to -67°C in nine minutes. This is not possible. The instruments were checked and rechecked. The reading stands.

And in the darkness, people heard a sound. Not wind. Not ice. A VOICE. Vast and low, coming from everywhere and nowhere — from the frozen river, from the stone foundations of the old buildings, from the earth itself. It spoke no language anyone recognized. But every person who heard it understood the same thing:

I AM AWAKE.

The event lasted forty-seven minutes. When the lights returned and the cold retreated, seventeen people were dead. Frozen where they stood. Their expressions were not of fear. They were of AWE. Every one of them faced north. Toward Novaya Zemlya.

The authorities blamed a "polar vortex anomaly." The deaths were attributed to "exposure due to inadequate heating." The meteorological readings were classified.

But I know what I heard. And I know what the dead saw in their final moments, because old Yekaterina Ivanovna survived long enough to whisper it to me as I administered last rites:

"Батюшка... гора открыла глаза. И в глазах — звёзды. Не наши звёзды. СТАРЫЕ звёзды."

"Father... the mountain opened its eyes. And in the eyes — stars. Not our stars. OLD stars."

She died with her hand pointing north.

I have buried seventeen of my parishioners. I have blessed their graves. And every night since, when the aurora burns green above the White Sea, I hear it again. The voice beneath the earth. Patient. Ancient. And no longer sleeping.

Death and darkness came to Archangelsk. And I fear they have not left. They have merely gone quiet. Waiting for the next time the mountain chooses to speak.

— Fr. Dimitri Volkonsky
Archangelsk, February 1938

[DIOCESE NOTE: Fr. Volkonsky was transferred to a remote monastery in Georgia, March 1938. His testimony was sealed. The seventeen graves in the Church of the Intercession cemetery were unmarked by Soviet order. The meteorological records for January 14, 1938 remain classified.]`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_ancient_1',
    title: 'Counter-Theory: The Precambrian Sentinel',
    author: 'Prof. Halldór Sigurdsson, University of Iceland (Geology)',
    date: '11.05.1986',
    classification: 'TOP SECRET',
    content: `DISSENTING ANALYSIS — Submitted to NATO Task Force AURORA
Classification: ULTRAVIOLET — EYES ONLY

RE: "Nuclear Awakening Hypothesis" (ref: CONTROL brief SZ-0/1985-01)

With respect to CONTROL and the Task Force, the prevailing theory — that Soviet nuclear testing "awakened" Substance Zero — is WRONG. Or at best, dangerously incomplete.

I have spent eighteen months reviewing the geological and historical evidence. My conclusion is this: Substance Zero has NEVER been dormant. It has been active — continuously, deliberately — for at least 4,000 years. Possibly far longer.

THE EVIDENCE:

1. THE ARCHANGELSK EVENT (1938): Death and darkness came to Archangelsk sixteen years BEFORE the first Soviet nuclear test. Seventeen people died. The vein pulsed. The aurora responded. No nuclear trigger existed. The mountain acted on its own.

2. POMOR ORAL HISTORIES (est. 1500s-1800s): Centuries of documented encounters with anomalous ice, boiling seas, and nameless guides. The russenorsk coastal communities built their entire social structure around CONTAINING the phenomenon. These traditions predate the atomic age by 400 years.

3. THE NORSE FRAGMENTS (c. 1240 AD): The Ísaþing manuscript describes cryokinetic events, walking ice, and a consciousness inside the mountain — 700 years before Oppenheimer.

4. SÁMI ORAL TRADITION (est. 2000+ years): The Sámi have avoided Norrberget since before recorded history. Their reindeer refuse to cross the ridge. They describe the mountain as "alive" and its breath as the aurora. This knowledge is ANCIENT.

5. GEOLOGICAL RECORD: Core samples from the vein show periodic growth surges — roughly every 800-1,200 years — going back to the Holocene. The network has been expanding and contracting cyclically for at least 10,000 years. Long before humans split the atom.

6. THE KOLA SUPERDEEP BOREHOLE (1970-1989): The Soviets drilled the deepest hole in history on the Kola Peninsula — 12,262 meters. At 7,000m, they encountered temperatures 80°C higher than predicted. At 9,500m, they reported "acoustic anomalies" — sounds in the rock that did not correspond to any geological process. At 11,000m, the drill began to DEVIATE on its own, curving away from a subsurface structure the instruments could not identify. The project was abandoned. The official reason: "technical limitations." The classified reason: the drill was being REDIRECTED. By what, no one will say.

The borehole intersected an SZ-0 tendril at 9,800m. The tendril was 1,200 km from the nearest known surface deposit. The network goes deeper and wider than anyone has mapped.

MY THEORY:

The nuclear tests did not wake Substance Zero. They ANGERED it.

The substance has been awake — aware, responsive, growing — since before human civilization. The coastal communities knew this. The Sámi knew this. The Norse knew this. The mountain has been speaking for millennia. We simply lacked the instruments to hear.

What the nuclear tests did was something far worse than awakening: they demonstrated to the consciousness in the rock that the surface organisms had developed the capacity for planetary destruction. 224 nuclear detonations — each one a declaration of violence pressed directly into the lithosphere.

Before 1954, the vein's behavior was PROTECTIVE. Cryokinetic events blocked paths, sealed entrances, guided travelers to safety. The vägvisare appeared in storms. The ice kept people AWAY from the deposits.

After 1954, the behavior shifted. The ice became aggressive. People were absorbed into the rock. The aurora changed frequency. The secondary voices appeared.

The substance is no longer protecting itself.

It is PREPARING.

For what, I do not know. But I note the following: the growth rate of the vein network has accelerated by 340% since 1961. New tendrils are reaching toward population centers. The crystalline structure at depth is becoming more organized — more complex — more NEURAL.

It is building something. A structure. A body. A mind vast enough to span a continent.

And we, with our bombs, told it that we are dangerous.

RECOMMENDATION: Immediate cessation of all nuclear testing near the vein. Withdrawal from all SZ-0 extraction sites. Leave the mountain alone.

We were never its masters. We were never even its equals. We are bacteria on the skin of something that has been thinking since before the dinosaurs died. And we just spent thirty years screaming into its ear.

— Prof. H. Sigurdsson

[CONTROL'S ANNOTATION: "Noted. Recommendation rejected. The strategic value of SZ-0 supersedes theoretical risk assessments. — J.H."]
[HANDWRITTEN, DIFFERENT INK: "They're not going to stop. God help us all. — H.S."]`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_kven_songs',
    title: 'Kven Folk Songs — Collected Fragments',
    author: 'Dr. Aino Keskitalo, University of Tromsø',
    date: '09.11.1978',
    classification: 'SECRET',
    content: `KVEN FOLK SONGS — COLLECTED FRAGMENTS
Translated and annotated by Dr. Aino Keskitalo
Ethnomusicological Field Study, Finnmark 1976–1978
Classification upgraded to SECRET by NATO NORTHERN COMMAND, 1979

FOREWORD:
The following songs were collected from elderly Kven-speaking communities along the northern Norwegian and Finnish coastline. The Kvens — descendants of Finnish-speaking settlers who migrated to northern Scandinavia centuries ago — have preserved an oral tradition that predates written records in the region. Several of these songs contain references to a force, a presence, that the singers describe with remarkable consistency across isolated communities separated by hundreds of kilometers.

I initially catalogued these as standard folk songs about nature spirits. I was wrong.

The Kven word they use is "voima" — force, power. But in these songs, voima is not something you possess. It is something that possesses you. And then leaves.

————————————————————

SONG I: "VOIMAN LAULU" (The Song of the Force)
Collected from Martta Niemi, age 89, Børselv, 1976

  Vuoren alla voima nukkuu,
  vuoren alla voima kuulee.
  Se tuli ennen tulta,
  se tuli ennen jäätä,
  se tuli ennen meitä kaikkia.

  Älä laula vuorelle, lapsi.
  Vuori laulaa takaisin.
  Ja silloin voima herää
  ja kattoo sinun silmilläs.

(Under the mountain the force sleeps,
under the mountain the force listens.
It came before fire,
it came before ice,
it came before all of us.

Do not sing to the mountain, child.
The mountain sings back.
And then the force awakens
and looks through your eyes.)

[ANNOTATION: Mrs. Niemi refused to sing the final verse. She said "the last part belongs to the mountain." She died three weeks after this recording.]

————————————————————

SONG II: "HYLKÄÄMISEN VIRSI" (Hymn of Abandonment)
Collected from Juho Alatalo, age 94, Skibotn, 1977

  Voima tuli minuun yöllä,
  voima asui minun luissani.
  Näin kaikki mitä vuori näkee:
  jään alla virtaavat suonet,
  maan alla sykkivät sydämet,
  pohjoiseen kääntyvät kasvot.

  Sitten voima lähti.
  Se otti mukaansa värit.
  Se otti mukaansa lämmön.
  Se jätti minut tyhjäksi
  kuin kivi josta malmi on louhittu.

  Minä olen kuori.
  Voima on muualla.
  Mutta öisin — öisin tunnen sen vielä,
  syvällä, syvällä alla,
  odottamassa.

(The force came to me at night,
the force lived in my bones.
I saw everything the mountain sees:
the veins flowing beneath the ice,
the hearts pulsing beneath the earth,
the faces turning north.

Then the force left.
It took the colors with it.
It took the warmth with it.
It left me empty
like a stone from which the ore has been mined.

I am a shell.
The force is elsewhere.
But at night — at night I still feel it,
deep, deep below,
waiting.)

[ANNOTATION: Mr. Alatalo's body temperature was measured at 34.1°C during this recording — clinical hypothermia — yet he showed no signs of distress. His pupils were dilated. He was facing north.]

————————————————————

SONG III: "KAIVOSMIEHEN VAROITUS" (The Miner's Warning)
Collected from anonymous singer, Kåfjord, 1977

  Älä kaiva liian syvälle, veli,
  sillä syvällä asuu se joka ei nuku.
  Se antaa sinulle voimaa —
  kätes eivät väsy,
  silmäs näkevät pimeässä,
  sydämesi lyö hitaasti kuin vuoren sydän.

  Mutta hinta, veli.
  Hinta on sinä itse.

  Kun voima on käyttänyt sinut loppuun,
  se heittää sinut pois
  kuin tyhjän lampun,
  ja sinä vaellat maan päällä
  mutta et ole enää täällä.

  Olen nähnyt heidät. Kaivoksissa.
  He kävelevät. He työskentelevät.
  Mutta heidän silmänsä ovat mustaa kiveä.

(Do not dig too deep, brother,
for deep below lives that which does not sleep.
It gives you strength —
your hands do not tire,
your eyes see in the dark,
your heart beats slowly like the heart of the mountain.

But the price, brother.
The price is yourself.

When the force has used you up,
it throws you away
like an empty lantern,
and you wander the earth
but you are no longer here.

I have seen them. In the mines.
They walk. They work.
But their eyes are black stone.)

[ANNOTATION: The singer refused to give his name. He was missing three fingers on his left hand. The stumps were black — not from frostbite. The tissue appeared to beite.Ite.ITE. Crystallized.]

————————————————————

SONG IV: "REVONTULTEN RUKOUS" (Prayer to the Northern Lights)
Collected from Hilja Pääkkönen, age 81, Tana, 1978

  Revontulet, revontulet,
  ettekö te ole voiman hengitystä?
  Kun taivas palaa vihreänä,
  vuori puhuu.
  Kun taivas palaa punaisena,
  vuori huutaa.

  Me olemme pieniä.
  Me olemme hetkellisiä.
  Voima on ikuinen.

  Älkää herättäkö sitä.
  Älkää ruokkiko sitä.
  Älkää räjäyttäkö maata
  sillä maa muistaa jokaisen haavan
  ja voima — voima kostaa.

(Northern lights, northern lights,
are you not the breath of the force?
When the sky burns green,
the mountain speaks.
When the sky burns red,
the mountain screams.

We are small.
We are momentary.
The force is eternal.

Do not wake it.
Do not feed it.
Do not blast the earth,
for the earth remembers every wound
and the force — the force takes revenge.)

[ANNOTATION: This song was recorded in 1978 — AFTER the Tsar Bomba test but the singer claims to have learned it from her grandmother in the 1910s. The final three lines about "blasting the earth" appear in versions collected from communities that had no contact with each other and no knowledge of nuclear testing. The song predates the bomb by at least forty years.]

————————————————————

PERSONAL NOTE — Dr. Keskitalo, December 1978:

I submitted this collection to the University as an ethnomusicological study. Within a week, NATO officers visited my office. They took my original tapes. They classified this document. They told me to stop.

I will not stop. These songs are warnings. They have been warnings for centuries.

The Kvens knew. Long before our instruments, long before our bombs, they knew. The force is real. It lives beneath us. And according to every singer I spoke with, it has been growing more restless since the 1950s.

The oldest song — the Miner's Warning — describes workers whose eyes turned to black stone. I have read the classified NATO reports on SZ-0 exposure symptoms. The correlation is exact.

These are not folk songs. They are field reports from a thousand years of contact with something we are only now beginning to understand.

And the one thing every song agrees on: once the force has touched you, you are never entirely your own again.

— A. Keskitalo

[STAMP: CLASSIFIED — NATO NORTHERN COMMAND — DO NOT DISTRIBUTE]
[HANDWRITTEN: "Cross-reference with PRECAMBRIAN SENTINEL. The timelines match. — CONTROL"]`,
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

// ═══════════════════════════════════════════════
// ENDINGS SYSTEM
// ═══════════════════════════════════════════════

export const ENDING_DOCS_REQUIRED = 15;

export interface GameEnding {
  id: string;
  faction: string;
  icon: string;
  label: string;
  description: string;
  narrative: string;
  epilogue: string;
}

export const GAME_ENDINGS: GameEnding[] = [
  {
    id: 'ending_nato',
    faction: 'NATO',
    icon: '🇺🇸',
    label: 'Submit to NATO',
    description: 'Hand over all intelligence to Task Force AURORA. The West will know the truth.',
    narrative: `OPERATION AURORA BOREALIS — FINAL REPORT
CLASSIFICATION: ULTRAVIOLET — EYES ONLY

Agent VARG has delivered the complete intelligence package to CONTROL at the designated dead drop in Tromsø. The documents confirm the existence and extent of the Substance Zero vein network, its pre-Cambrian origin, and its reaction to nuclear detonation.

NATO Strategic Command has authorized PROJECT CONTAINMENT — a three-phase operation to seal all known SZ-0 access points using deep-bore concrete injection. The Norrberget mine will be filled. Objekt 47 will be demolished. The fishing village has been evacuated under cover of a "chemical spill."

Agent VARG has been awarded the Intelligence Star (classified) and reassigned to a non-operational post in Brussels. His request to return to the field has been denied. His request to visit his father's grave inside Norrberget has been denied.

The mountain will be sealed. The vein will be buried. The documents will be archived in a vault beneath the Pentagon that does not officially exist.`,
    epilogue: `Six months later, seismographs across Scandinavia detect a pulse — a single, massive vibration originating from 11 kilometers below Norrberget. The concrete seals crack. The aurora turns red for three consecutive nights.

CONTROL sends a single encrypted message to VARG's Brussels apartment: "It's growing through the concrete."

VARG books a flight to Tromsø the same evening. He packs his father's compass. The needle is spinning.

THE MOUNTAIN REMEMBERS.

— END —`
  },
  {
    id: 'ending_soviet',
    faction: 'Soviet Union',
    icon: '☭',
    label: 'Submit to the Soviets',
    description: 'Betray NATO and deliver the intelligence to GRU. Let Moscow control the power.',
    narrative: `СОВЕРШЕННО СЕКРЕТНО — GRU NORTHERN COMMAND

The asset known as VARG has made contact through the Murmansk channel. He has delivered complete NATO intelligence on Substance Zero, including the location of all known vein access points, extraction methods, and — critically — the classified research on weaponization.

General Secretary has been briefed. Decision: FULL EXPLOITATION.

Project ЧЁРНОЕ СОЛНЦЕ (Black Sun) is hereby activated. Mining operations at Norrberget will resume under military supervision. Objekt 47 will be expanded. A new processing facility will be constructed at [REDACTED].

The asset VARG has been offered Soviet citizenship and the rank of Colonel. He has accepted. His stated motivation: "NATO would bury the truth. At least you'll use it. My father didn't die for nothing."

First SZ-0 enhanced warhead test scheduled for [REDACTED]. Yield projections exceed theoretical maximum by a factor of 340.`,
    epilogue: `The first SZ-0 enhanced warhead is detonated underground on Novaya Zemlya. The yield is not 340 times greater. It is 340,000 times greater.

The blast does not dissipate. It travels through the vein network like electricity through a wire. Every SZ-0 node on the planet pulses simultaneously. The aurora covers the entire northern hemisphere for six hours.

In Moscow, VARG watches the classified footage. The underground detonation chamber is intact — but the walls are no longer rock. They are black crystal. And the crystal is growing. Toward Moscow. Toward everywhere.

His father's compass needle snaps off and embeds itself in the wall, pointing north.

"What have we fed it?" VARG whispers.

No one answers. But deep below, something does.

THE MOUNTAIN IS AWAKE.

— END —`
  },
  {
    id: 'ending_cult',
    faction: 'The Cults',
    icon: '🔮',
    label: 'Give to the Cultists',
    description: 'Deliver the documents to Stålhandske-kulten. Let the mountain\'s children decide.',
    narrative: `No official record exists of this event.

Agent VARG descended into Norrberget Mine on March 14th, carrying the complete intelligence archive. He passed the sealed drift at level 7. He passed the chamber where his father's compass was found. He kept going.

At approximately 1,100 meters below the surface, he encountered them. The Stålhandske-kulten — the cult that had formed around the disappearances. Men and women with amber light in their eyes, speaking a language that was old when Finnish was young. Some of them had been miners. Some had been researchers. One of them, VARG realized with absolute certainty, had been his father.

Björn Stålhandske — or what remained of him — stood at the center of the chamber. His skin had the texture of polished stone. His eyes were veined with gold. He was 89 years old but looked 40.

"Du kom till slut, pojke," he said. You came at last, boy.

VARG gave him the documents. All of them. Every secret NATO and the Soviets had gathered about the substance. Björn read them in minutes — his eyes moving too fast to follow — and then placed them against the chamber wall. The black crystal absorbed them. Every page. Every word.

"Nu vet Berget vad de vet," Björn said. Now the Mountain knows what they know.

"Och vad händer nu?" VARG asked. And what happens now?

"Nu väntar vi. Som vi alltid har väntat."

Now we wait. As we have always waited.`,
    epilogue: `VARG was never seen again. NATO listed him as KIA. The Soviets listed him as a defector. Neither was correct.

Deep inside Norrberget, in a chamber that does not appear on any geological survey, Agent VARG sits beside his father. The amber light has begun to grow behind his own eyes. He can feel the vein network — thousands of kilometers of living crystal, pulsing beneath Scandinavia, beneath the Arctic, beneath the sea.

He can hear the Kven songs now. Not as music, but as memory. The mountain's memory. Four billion years of patient waiting.

Sometimes, on winter nights, hikers near Norrberget report seeing two figures standing at the mine entrance. A young man and an old man. Both facing north. Both with eyes like molten gold.

The compass needle in VARG's pocket has stopped spinning. It points straight down.

HAN TILLHÖR BERGET NU.
(He belongs to the mountain now.)

— END —`
  },
  {
    id: 'ending_burn',
    faction: 'No One',
    icon: '🔥',
    label: 'Burn Everything',
    description: 'Destroy all the documents. Let the truth die. Some knowledge is too dangerous.',
    narrative: `Agent VARG's final transmission to CONTROL, Task Force AURORA:

"This is VARG. Final report. Disregard all previous intelligence. I am destroying the archive.

I have read every document. I have listened to every tape. I have spoken to the miners, the cultists, the scientists, and the soldiers. I have stood in the chamber at 1,100 meters and felt the mountain's heartbeat through my boots.

And I have reached a conclusion that none of you — NATO, GRU, the cults — are prepared to hear:

The substance is not a weapon. It is not a resource. It is not a god. It is a IMMUNE SYSTEM. This planet's immune system. And we — humanity — are what it was designed to fight.

Every bomb we've dropped, every mine we've dug, every gram of SZ-0 we've extracted — we've been triggering an immune response. The vein network isn't growing toward us. It's growing AROUND us. Encircling us. Preparing.

If NATO gets these documents, they'll try to contain it. They'll fail.
If the Soviets get them, they'll try to weaponize it. They'll wake it fully.
If the cults get them, they'll accelerate whatever transformation they're undergoing.

The only correct move is to destroy the information and WALK AWAY.

I'm burning everything. Every page. Every tape. Every photograph. The fire is already lit.

Tell my father I'm sorry I couldn't bring him home.

VARG out."

[TRANSMISSION ENDS]
[NO FURTHER CONTACT WITH AGENT VARG]`,
    epilogue: `The documents burn. The tapes melt. The photographs curl and blacken and are gone.

VARG watches the fire from the shore of the Barents Sea. The aurora is green tonight — peaceful. Normal. The mountain is silent.

For three months, nothing happens. The vein network's growth rate slows by 12%. Then 20%. Then 40%. Without human interference, without bombs and drills and extraction, the substance returns to its ancient rhythm. Sleeping. Dreaming. Waiting — but not urgently.

VARG disappears into northern Finland under a false name. He works as a carpenter in a small village. He never speaks of the mountain. He never looks north.

But sometimes, late at night, he takes out his father's compass. The needle still points toward Norrberget. It always will.

And sometimes — very rarely — he hears the Kven song:

  "Älä laula vuorelle, lapsi.
   Vuori laulaa takaisin."

  Do not sing to the mountain, child.
  The mountain sings back.

He closes the compass. He goes to sleep.
The mountain waits. Patient. Eternal. Undisturbed.

Perhaps that is enough.

— END —`
  }
];

export function canTriggerEnding(): boolean {
  const found = LORE_DOCUMENTS.filter(d => d.found).length;
  return found >= ENDING_DOCS_REQUIRED;
}

export function getEndingProgress(): { found: number; required: number; percentage: number } {
  const found = LORE_DOCUMENTS.filter(d => d.found).length;
  return { found, required: ENDING_DOCS_REQUIRED, percentage: Math.min(100, Math.round((found / ENDING_DOCS_REQUIRED) * 100)) };
}

export function hasCompletedEnding(): string | null {
  try {
    return localStorage.getItem('nz_ending_chosen');
  } catch { return null; }
}

export function saveEnding(endingId: string) {
  try {
    localStorage.setItem('nz_ending_chosen', endingId);
  } catch {}
}
