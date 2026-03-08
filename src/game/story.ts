// ══════════════════════════════════════════════════════════════
// OPERATION AURORA BOREALIS — The Overarching Story
// ══════════════════════════════════════════════════════════════
//
// THE SUBSTANCE:
// Beneath the Arctic bedrock — from Norrberget in Sweden across
// the Kola Peninsula to Novaya Zemlya — runs a geological vein
// of an unknown material. NATO calls it "Substance Zero."
// The Soviets call it "Вещество Ноль." The miners at Norrberget
// called it "the blood of the mountain."
//
// It predates human civilization. It predates the ice age.
// When concentrated, it amplifies nuclear chain reactions by a
// factor of twelve. A warhead the size of a briefcase could
// level a city. The Cold War's ultimate escalation.
//
// But Substance Zero is not inert. It resists extraction.
// Workers exposed to it develop psychosis, magnetic sensitivity,
// and in extreme cases — absorption. The mountain takes them.
//
// THE PLAYER:
// Codename VARG. Former Swedish military intelligence (MUST),
// declared KIA during a failed operation in East Berlin, 1984.
// Recruited by a secret NATO task force for one purpose:
// locate and destroy all Substance Zero sites before the
// Soviets can weaponize it.
//
// Personal stake: VARG's father, Nils Stålhandske, was a survey
// engineer who disappeared inside Norrberget Mine in 1957 while
// investigating the magnetic anomaly. His body was never found.
// His cassette recorder was.
//
// THE OPERATION:
// Four sites. Four raids. Each reveals intel leading to the next.
// The order is the player's choice — but the story deepens
// with every document recovered.
//
// 1. OBJEKT 47 — The military extraction facility on Novaya Zemlya.
//    Soviet GRU operates a refinery processing raw Substance Zero
//    into weapons-grade material. Commandant Osipovitj runs the
//    operation. He's been exposed too long — he hears the substance.
//
// 2. THE FISHING VILLAGE — Smuggling hub on the Arctic coast.
//    Nachalnik runs a black-market pipeline moving refined
//    Substance Zero to buyers worldwide. The fishing boats carry
//    more than fish.
//
// 3. THE HOSPITAL — Research facility disguised as a hospital.
//    Dr. Kravtsov experiments on prisoners to create soldiers
//    immune to Substance Zero's psychic effects. The Uzbek is
//    his most successful — and most horrific — result.
//
// 4. GRUVSAMHÄLLET — The original discovery site. The Swedish
//    mine where it all began. The Gruvrå isn't a spirit — it's
//    what happens when Substance Zero accumulates enough mass
//    to develop consciousness. Stålhandske didn't disappear.
//    The mountain absorbed him.
//
// THE TRUTH:
// The four sites are connected by the same geological vein.
// Destroying one doesn't stop the others. The substance
// regenerates. The only way to end it is to collapse the
// entire vein — and that requires the nuclear codes hidden
// in Objekt 47's deep storage.
//
// VARG must recover the codes, plant charges at the deepest
// point of each site, and trigger a synchronized detonation
// that will seal the vein forever.
//
// Or die trying — like his father before him.
// ══════════════════════════════════════════════════════════════

export const STORY_ARC = {
  title: 'OPERATION AURORA BOREALIS',
  subtitle: 'NATO CLASSIFIED — EYES ONLY — CLEARANCE ULTRAVIOLET',

  playerDossier: {
    codename: 'VARG',
    realName: '[REDACTED]',
    nationality: 'Swedish',
    formerUnit: 'MUST (Militära Underrättelse- och Säkerhetstjänsten)',
    status: 'Officially KIA — East Berlin, 1984',
    handler: 'CONTROL (NATO Task Force AURORA)',
    background: `Born 1955, son of survey engineer Nils Stålhandske who vanished inside Norrberget Mine in 1957. Grew up obsessed with his father's disappearance. Joined Swedish military intelligence at 22. Recruited by NATO black ops after proving himself in deep-cover missions across the Eastern Bloc.

Declared killed in action during a failed exfiltration in East Berlin — in reality, extracted by NATO and given a new identity. Now operates as a ghost: no country, no name, no backup.

VARG carries his father's compass — the needle permanently bent toward magnetic north since the day Nils entered the mine. It still points toward Norrberget.`,
  },

  missionBriefing: `OPERATION AURORA BOREALIS — FINAL BRIEFING

SITUATION:
Soviet GRU has discovered a geological anomaly spanning the Arctic bedrock from Scandinavia to Novaya Zemlya. The substance — NATO designation "SUBSTANCE ZERO" — amplifies nuclear chain reactions by a factor of twelve. A single warhead enhanced with Substance Zero could eliminate an entire NATO carrier group.

The Soviets have established four sites along the vein:

█ OBJEKT 47 "Severnyj Vektor" — Primary extraction & refinery
█ COASTAL VILLAGE "Rybnaya" — Maritime smuggling pipeline
█ HOSPITAL №6 "Kravtsov Institute" — Human experimentation facility
█ NORRBERGET MINE — Original discovery site (Swedish territory)

MISSION:
Infiltrate each site. Recover intelligence. Sabotage extraction operations. Eliminate key personnel. Retrieve the nuclear detonation codes from Objekt 47's deep storage.

ENDGAME: Trigger synchronized demolition charges at the deepest point of each site to permanently collapse the geological vein and deny Substance Zero to all parties.

WARNING: Extended exposure to Substance Zero causes paranoia, magnetic sensitivity, hallucinations, and in extreme cases — physical absorption into the rock. Limit time underground. Trust your instruments. If your compass starts spinning — leave immediately.

HANDLER NOTE: VARG — I know this is personal. Your father died trying to understand what's in that mountain. You're going to finish what he started. But don't let revenge cloud your judgment. Complete the mission. Come home alive.

— CONTROL`,

  siteIntel: {
    objekt47: {
      name: 'OBJEKT 47 "Severnyj Vektor"',
      role: 'PRIMARY EXTRACTION & REFINERY',
      connection: 'The heart of the Soviet operation. Raw Substance Zero is mined from deep shafts beneath the military base and refined in Laboratory No. 3. The refined product — a metallic liquid that glows faintly blue — is stored in lead-lined containers in the deep storage bunker. Commandant Osipovitj has been the facility commander since 1977. His prolonged exposure has made him something more — or less — than human. He claims to receive "orders from below." The nuclear detonation codes are locked in his personal safe.',
      maskirovka: 'The base is officially listed as a weather monitoring station. Satellite imagery shows only antenna arrays and barracks. The real facility is underground. Soviet GRU has planted false intelligence suggesting the base was decommissioned in 1981. It was not.',
    },
    fishing_village: {
      name: 'COASTAL VILLAGE "Rybnaya"',
      role: 'MARITIME SMUGGLING PIPELINE',
      connection: 'The fishing village serves as the export terminal for refined Substance Zero. Nachalnik — a former Soviet naval officer turned black-market kingpin — operates the pipeline. Fishing boats carry concealed lead containers to dead-drop coordinates in the Barents Sea, where foreign buyers collect them. The village appears abandoned from the air. It is not. Nachalnik\'s "fish hook" is actually a modified cargo crane used to load Substance Zero containers onto boats.',
      maskirovka: 'NATO intelligence initially dismissed the village as a civilian settlement. It took three years and two missing reconnaissance teams before the connection to Substance Zero was confirmed. The coastal approach is mined. The forest approach is patrolled.',
    },
    hospital: {
      name: 'HOSPITAL №6 "Kravtsov Institute"',
      role: 'HUMAN EXPERIMENTATION FACILITY',
      connection: 'Officially a rehabilitation hospital for Arctic workers suffering from "polar syndrome." In reality, Dr. Kravtsov runs experiments on prisoners — soldiers, dissidents, unlucky civilians — attempting to create humans resistant to Substance Zero\'s psychic effects. His goal: soldiers who can work in the deep mines indefinitely without going insane. The Uzbek was Test Subject 7 in the REBIRTH program. The injections didn\'t make him immune. They made him something else entirely. Kravtsov\'s research notes contain the formula for Substance Zero countermeasures — critical for the final operation.',
      maskirovka: 'The hospital maintains a functioning civilian wing as cover. Real patients are treated alongside Kravtsov\'s test subjects. Hospital staff who ask questions are reassigned — or become test subjects themselves.',
    },
    mining_village: {
      name: 'NORRBERGET MINE',
      role: 'ORIGINAL DISCOVERY SITE',
      connection: 'Where it all began. Swedish miners first encountered Substance Zero in 1947 at 420 meters depth. The mine was officially closed in 1964 due to "ore depletion." In reality, Mine Director Holmström sealed the deepest levels after multiple incidents — including the disappearance of survey engineer Nils Stålhandske (VARG\'s father) in 1957. The Soviet GRU, tipped off by a mole in the Swedish geological survey, has since infiltrated the site and reopened the sealed levels. What they found below is not a mineral deposit. It is a consciousness. The miners called it Gruvrå. It has been in the mountain since before the ice. Its guardians — Ort and Stoll — are crystalline formations that move. Slowly. Patiently. The mountain remembers everyone who enters. And it keeps what it takes.',
      maskirovka: 'The Swedish government denies the mine\'s existence. Maps of the area show only forest. The village has been erased from census records since 1965. Soviet presence is disguised as a "geological research partnership" — a fiction maintained by compromised officials in Stockholm.',
    },
  },

  substanceZero: {
    name: 'SUBSTANCE ZERO',
    natoDesignation: 'SZ-0',
    sovietDesignation: 'Вещество Ноль',
    minerName: 'The Blood of the Mountain',
    description: `A pre-Cambrian substance embedded in the Arctic bedrock. Not a mineral. Not organic. Classification: UNKNOWN.

Physical properties: Absorbs sound and light. Magnetic field 400-800% above regional average. When refined, produces a metallic liquid that glows faintly blue and remains at exactly 37°C regardless of environment — human body temperature.

Nuclear properties: Amplifies fission chain reactions by a factor of 12. A conventional warhead enhanced with 50g of refined Substance Zero produces a yield equivalent to 600 kilotons. This makes it the most strategically valuable material on Earth.

Biological effects (progressive):
Stage 1 (1-7 days exposure): Headaches, insomnia, compass malfunction in proximity.
Stage 2 (1-4 weeks): Auditory hallucinations — "the mountain speaks." Magnetic sensitivity — subjects can feel ferrous metals at distance.
Stage 3 (1-6 months): Paranoia, personality changes, sensation of being "watched from below."
Stage 4 (6+ months): Physical changes — skin hardens, body temperature drops to match ambient rock. Subject begins to "merge" with geological formations.
Stage 5: Absorption. Subject becomes part of the mountain. Irreversible.

Commandant Osipovitj: Stage 3-4.
Dr. Kravtsov: Stage 2 (protected by his own countermeasures).
The Uzbek: Stage 4+ (accelerated by REBIRTH injections).
Gruvrå: Stage 5 — fully absorbed. The consciousness IS the mountain.
Nils Stålhandske: Stage 5 — absorbed 1957. His magnetic readings are now part of the anomaly.`,
  },
};

// Map briefing shown before deployment
export function getMapBriefing(mapId: string): string {
  const briefings: Record<string, string> = {
    objekt47: `SITE BRIEFING — OBJEKT 47

Intel suggests the nuclear codes are in Osipovitj's personal safe in the deep storage bunker. The base is heavily defended — minefields on the perimeter, watchtowers with mounted guns, regular patrols.

Osipovitj's exposure to Substance Zero has made him unpredictable. Reports indicate he no longer sleeps and patrols the underground levels alone at night, muttering to himself. His bodyguards ZAPAD and VOSTOK follow him everywhere.

PRIMARY: Recover nuclear codes from deep storage.
SECONDARY: Destroy the Substance Zero refinery in Lab No. 3.
TERTIARY: Eliminate Commandant Osipovitj.

HANDLER NOTE: The codes are everything. Without them, the final detonation cannot be synchronized. Don't get distracted by side objectives. Get the codes. Get out.`,

    fishing_village: `SITE BRIEFING — COASTAL VILLAGE "RYBNAYA"

Nachalnik operates the smuggling pipeline from the dock warehouse. Refined Substance Zero arrives by truck from Objekt 47 and is loaded onto fishing boats for maritime transfer. Intercept the next shipment and destroy the logistics infrastructure.

The village looks abandoned but is heavily trapped. Nachalnik was a Soviet naval officer — he thinks like a military commander, not a smuggler. Expect mines on approach routes and ambush positions.

PRIMARY: Destroy the Substance Zero shipping containers at the dock.
SECONDARY: Recover the buyer list from Nachalnik's ledger.
TERTIARY: Eliminate Nachalnik and dismantle the pipeline.

HANDLER NOTE: The buyer list is critical. We need to know who else has Substance Zero. If it's already reached foreign powers, Aurora Borealis becomes a much bigger operation.`,

    hospital: `SITE BRIEFING — HOSPITAL №6

Kravtsov's research notes contain the Substance Zero countermeasure formula. Without it, the demolition team for the final operation will succumb to psychic effects before they can plant charges at the deep sites.

The hospital maintains civilian cover. Some patients and staff are genuine — avoid unnecessary casualties. Kravtsov works in the east wing lab. The Uzbek is confined in the basement — DO NOT enter the basement unless necessary.

PRIMARY: Recover Kravtsov's countermeasure formula from the east wing lab.
SECONDARY: Document evidence of human experimentation for NATO tribunal.
TERTIARY: Neutralize Dr. Kravtsov. Contain or eliminate The Uzbek.

HANDLER NOTE: Kravtsov is brilliant and paranoid. He has likely booby-trapped his research. The Uzbek was once a man named Farukh. What Kravtsov did to him is an atrocity. If you can put him down, it would be a mercy.`,

    mining_village: `SITE BRIEFING — NORRBERGET MINE

This is where your father disappeared, VARG. I won't pretend this is just another mission for you.

Soviet GRU has reopened the sealed levels below 400m. They're attempting to extract raw Substance Zero directly from the source — the consciousness the miners called Gruvrå. The operation is running under cover of a "geological research partnership" with compromised Swedish officials.

The mine has two levels. Surface: village, crew quarters, machinery. Underground: tunnel network leading to the deep chamber where Gruvrå resides. Access via the mine elevator. Its guardians — Ort and Stoll — are not human. They are crystallized Substance Zero formations that move and attack.

PRIMARY: Reach the deep chamber. Plant demolition charges.
SECONDARY: Recover your father's survey equipment and field notes.
TERTIARY: Destroy Gruvrå — or seal it permanently.

HANDLER NOTE: VARG — whatever you find down there about your father, the mission comes first. The vein must be collapsed. If Gruvrå has truly achieved consciousness, it will resist. The mountain doesn't want to die.

Good luck. CONTROL out.`,
  };
  return briefings[mapId] || briefings.objekt47;
}
