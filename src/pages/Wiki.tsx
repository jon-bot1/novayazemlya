import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type WikiSection = 'lore' | 'factions' | 'occult' | 'world' | 'controls' | 'weapons' | 'recoil' | 'enemies' | 'bosses' | 'maps' | 'items' | 'mechanics' | 'stealth' | 'upgrades' | 'safehouse' | 'achievements' | 'reputation' | 'daynight';

const SECTIONS: { id: WikiSection; label: string; icon: string }[] = [
  { id: 'lore', label: 'Story & Lore', icon: '📜' },
  { id: 'factions', label: 'Factions', icon: '⚔️' },
  { id: 'occult', label: 'The Occult', icon: '🔮' },
  { id: 'world', label: 'World & Theories', icon: '🌍' },
  { id: 'controls', label: 'Controls', icon: '🎮' },
  { id: 'weapons', label: 'Weapons', icon: '🔫' },
  { id: 'recoil', label: 'Recoil & Spread', icon: '🎯' },
  { id: 'enemies', label: 'Enemies', icon: '💀' },
  { id: 'bosses', label: 'Bosses', icon: '👹' },
  { id: 'maps', label: 'Maps', icon: '🗺️' },
  { id: 'items', label: 'Items & Loot', icon: '🎒' },
  { id: 'mechanics', label: 'Mechanics', icon: '⚙️' },
  { id: 'stealth', label: 'Stealth', icon: '🤫' },
  { id: 'safehouse', label: 'Safe House', icon: '🏠' },
  { id: 'upgrades', label: 'Upgrades & Trader', icon: '🏪' },
  { id: 'reputation', label: 'Reputation', icon: '🎖️' },
  { id: 'achievements', label: 'Achievements', icon: '🏆' },
  { id: 'daynight', label: 'Day/Night Cycle', icon: '🌙' },
];

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-display text-accent uppercase tracking-wider mt-6 mb-3 border-b border-accent/30 pb-1">{children}</h2>
);
const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-display text-primary-foreground uppercase tracking-wider mt-4 mb-2">{children}</h3>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-mono text-foreground/70 leading-relaxed mb-2">{children}</p>
);
const Stat = ({ label, value }: { label: string; value: string }) => (
  <span className="inline-flex gap-1 text-[10px] font-mono mr-3">
    <span className="text-muted-foreground">{label}:</span>
    <span className="text-foreground">{value}</span>
  </span>
);
const Tag = ({ children, color = 'accent' }: { children: React.ReactNode; color?: string }) => (
  <span className={`inline-block text-[9px] font-display uppercase tracking-wider px-1.5 py-0.5 rounded border mr-1 mb-1
    ${color === 'accent' ? 'text-accent border-accent/40 bg-accent/10' :
      color === 'primary' ? 'text-primary-foreground border-primary/40 bg-primary/10' :
      color === 'danger' ? 'text-destructive border-destructive/40 bg-destructive/10' :
      'text-muted-foreground border-border bg-muted/30'}`}>
    {children}
  </span>
);
const KeyCap = ({ k }: { k: string }) => (
  <kbd className="inline-block text-[10px] font-mono px-1.5 py-0.5 bg-muted border border-border rounded text-foreground min-w-[20px] text-center mx-0.5">{k}</kbd>
);

const WeaponRow = ({ name, icon, tier, ammo, dmg, rpm, mag, mode, spread, weight, notes }: {
  name: string; icon: string; tier: string; ammo: string; dmg: number; rpm: number; mag: number;
  mode: string; spread: string; weight: number; notes?: string;
}) => (
  <div className="border border-border rounded p-2 mb-1.5 bg-card/50">
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-display text-foreground">{icon} {name}</span>
      <Tag color={tier === 'Legendary' ? 'danger' : tier === 'Epic' ? 'accent' : tier === 'Rare' ? 'primary' : 'muted'}>{tier}</Tag>
    </div>
    <div className="flex flex-wrap">
      <Stat label="DMG" value={`${dmg}`} />
      <Stat label="RPM" value={`${rpm}`} />
      <Stat label="MAG" value={`${mag}`} />
      <Stat label="Mode" value={mode} />
      <Stat label="Ammo" value={ammo} />
      <Stat label="Spread" value={spread} />
      <Stat label="Weight" value={`${weight}kg`} />
    </div>
    {notes && <p className="text-[9px] font-mono text-muted-foreground mt-1 italic">{notes}</p>}
  </div>
);

const EnemyRow = ({ name, icon, hp, speed, dmg, range, personality, notes }: {
  name: string; icon: string; hp: string; speed: string; dmg: string; range: string;
  personality: string; notes?: string;
}) => (
  <div className="border border-border rounded p-2 mb-1.5 bg-card/50">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xs font-display text-foreground">{icon} {name}</span>
    </div>
    <div className="flex flex-wrap">
      <Stat label="HP" value={hp} />
      <Stat label="Speed" value={speed} />
      <Stat label="DMG" value={dmg} />
      <Stat label="Range" value={range} />
    </div>
    <p className="text-[9px] font-mono text-accent/80 mt-1">{personality}</p>
    {notes && <p className="text-[9px] font-mono text-muted-foreground italic">{notes}</p>}
  </div>
);

function LoreSection() {
  return (
    <>
      <H2>📜 Operation Aurora Borealis</H2>
      <div className="border border-accent/30 rounded p-3 bg-accent/5 mb-3">
        <div className="text-[9px] font-mono text-accent uppercase tracking-wider mb-1">NATO CLASSIFIED — CLEARANCE ULTRAVIOLET</div>
        <P>Beneath the Arctic bedrock — from Norrberget in Sweden across the Kola Peninsula to Novaya Zemlya — runs a geological vein of an unknown material. NATO calls it "Substance Zero." The Soviets call it "Вещество Ноль." The miners at Norrberget called it "the blood of the mountain."</P>
        <P>It predates human civilization. It predates the ice age. When concentrated, it amplifies nuclear chain reactions by a factor of twelve. A warhead the size of a briefcase could level a city.</P>
      </div>

      <H3>Substance Zero (SZ-0)</H3>
      <div className="border border-border rounded p-3 mb-2 bg-card/50">
        <div className="text-[10px] font-mono text-foreground/70 space-y-1">
          <div><span className="text-accent">Classification:</span> UNKNOWN — Not mineral. Not organic.</div>
          <div><span className="text-accent">Physical:</span> Absorbs sound and light. Magnetic field 400-800% above norm. Refined form glows blue at exactly 37°C.</div>
          <div><span className="text-accent">Nuclear:</span> Amplifies fission by 12×. 50g of refined SZ-0 = 600 kiloton yield.</div>
        </div>
      </div>
      <H3>Exposure Stages</H3>
      <div className="text-[10px] font-mono text-foreground/70 space-y-1 mb-3">
        <div><Tag color="muted">Stage 1</Tag> 1-7 days: Headaches, insomnia, compass malfunction.</div>
        <div><Tag color="primary">Stage 2</Tag> 1-4 weeks: Auditory hallucinations — "the mountain speaks." Magnetic sensitivity.</div>
        <div><Tag color="accent">Stage 3</Tag> 1-6 months: Paranoia, personality changes, sensation of being watched from below.</div>
        <div><Tag color="danger">Stage 4</Tag> 6+ months: Skin hardens, body temp drops. Subject begins to merge with rock.</div>
        <div><Tag color="danger">Stage 5</Tag> Absorption. Subject becomes part of the mountain. <span className="text-destructive">Irreversible.</span></div>
      </div>

      <H3>Known Exposed Individuals</H3>
      <div className="text-[10px] font-mono text-foreground/70 space-y-1">
        <div>💀 <strong>Commandant Osipovitj:</strong> Stage 3-4. Eyes glow in the dark. Claims to hear "orders from below." Has not slept in 23 days.</div>
        <div>💉 <strong>Dr. Kravtsov:</strong> Stage 2. Protected by his own countermeasures. Rational but obsessed.</div>
        <div>⛓️ <strong>The Uzbek:</strong> Stage 4+. Accelerated by REBIRTH injections. No longer biologically human.</div>
        <div>⛏️ <strong>Gruvrå:</strong> Stage 5. Fully absorbed. The consciousness IS the mountain.</div>
        <div>🧭 <strong>Nils Stålhandske:</strong> Stage 5. Absorbed in 1957. His magnetic readings are now part of the anomaly.</div>
      </div>

      <H3>Agent VARG — Player Dossier</H3>
      <div className="border border-accent/30 rounded p-3 bg-accent/5 mb-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono mb-2">
          <Stat label="Codename" value="VARG" />
          <Stat label="Nationality" value="Swedish" />
          <Stat label="Former Unit" value="MUST" />
          <Stat label="Status" value="KIA (officially)" />
          <Stat label="Handler" value="CONTROL" />
        </div>
        <P>Born 1955. Son of survey engineer Nils Stålhandske, who vanished inside Norrberget Mine in 1957. Joined Swedish military intelligence at 22. Recruited by NATO after deep-cover missions across the Eastern Bloc. Declared KIA in East Berlin, 1984 — in reality extracted and given a new identity.</P>
        <P>VARG carries his father's compass — the needle permanently bent toward magnetic north since the day Nils entered the mine. It still points toward Norrberget.</P>
      </div>

      <H3>The Mission</H3>
      <P>Four sites along the geological vein. Four raids. Each reveals intel leading to the next. Recover the nuclear detonation codes from Objekt 47's deep storage. Plant synchronized demolition charges at the deepest point of each site. Trigger a cascade that collapses the entire vein — denying Substance Zero to all parties.</P>
      <P>The substance regenerates. Destroying one site doesn't stop the others. The only solution is total geological collapse.</P>

      <H3>The Four Sites</H3>
      <div className="text-[10px] font-mono text-foreground/70 space-y-2">
        <div className="border-l-2 border-accent/40 pl-2">
          <strong className="text-foreground">█ OBJEKT 47 "Severnyj Vektor"</strong> — Primary extraction & refinery. Commandant Osipovitj. Nuclear codes in deep storage. GRU's crown jewel.
        </div>
        <div className="border-l-2 border-accent/40 pl-2">
          <strong className="text-foreground">█ COASTAL VILLAGE "Rybnaya"</strong> — Maritime smuggling pipeline. Nachalnik exports refined SZ-0 to global buyers via fishing boats.
        </div>
        <div className="border-l-2 border-accent/40 pl-2">
          <strong className="text-foreground">█ HOSPITAL №6 "Kravtsov Institute"</strong> — Human experimentation. Dr. Kravtsov creates SZ-0 resistant soldiers. The Uzbek is Test Subject 7.
        </div>
        <div className="border-l-2 border-accent/40 pl-2">
          <strong className="text-foreground">█ NORRBERGET MINE (Gruvsamhället)</strong> — Original discovery site. Swedish mine where Gruvrå, a SZ-0 consciousness, dwells. VARG's father disappeared here.
        </div>
      </div>

      <H3>Cassette Tapes & Documents</H3>
      <P>Lore is uncovered through documents, cassette tapes, and secret codes found during raids. Check the Intel panel (📂) in-game to review collected intelligence. Six secret codes unlock deeper narrative connections.</P>
    </>
  );
}

function FactionsSection() {
  return (
    <>
      <H2>⚔️ Factions</H2>
      <P>The Arctic conflict involves multiple factions with competing agendas. Not all enemies serve the same master.</P>

      <div className="border border-border rounded p-3 mb-3 bg-card/50">
        <div className="text-sm font-display text-destructive mb-1">☭ SOVIET GRU — Military Intelligence</div>
        <P>The official Soviet military presence. GRU controls Objekt 47 and funds the Hospital research. Their goal: weaponize Substance Zero into tactical nuclear warheads. Professional, disciplined, and well-equipped.</P>
        <div className="text-[10px] font-mono text-foreground/70 space-y-0.5">
          <div><span className="text-accent">Units:</span> Soldiers, Heavy gunners, Snipers, Officers</div>
          <div><span className="text-accent">Leaders:</span> Commandant Osipovitj (Objekt 47), Colonel Karpov (Moscow)</div>
          <div><span className="text-accent">Presence:</span> Dominant on Objekt 47. Officers embedded at all sites.</div>
          <div><span className="text-accent">Agenda:</span> Extract, refine, and weaponize SZ-0. Maintain total secrecy.</div>
        </div>
      </div>

      <div className="border border-border rounded p-3 mb-3 bg-card/50">
        <div className="text-sm font-display text-primary-foreground mb-1">🔬 KRAVTSOV INSTITUTE — Project REBIRTH</div>
        <P>Dr. Kravtsov's autonomous research division, technically under GRU but operating with increasing independence. Goal: create humans immune to SZ-0's psychic effects — soldiers who can work the deep mines indefinitely.</P>
        <div className="text-[10px] font-mono text-foreground/70 space-y-0.5">
          <div><span className="text-accent">Units:</span> Shockers (test subjects), Hospital guards, Orderlies</div>
          <div><span className="text-accent">Leaders:</span> Dr. Kravtsov, Director Gromov (nominal)</div>
          <div><span className="text-accent">Presence:</span> Hospital exclusively. Some escaped subjects on other maps.</div>
          <div><span className="text-accent">Agenda:</span> Complete REBIRTH program. Create the perfect SZ-0 soldier.</div>
        </div>
      </div>

      <div className="border border-border rounded p-3 mb-3 bg-card/50">
        <div className="text-sm font-display text-accent mb-1">🪝 NACHALNIK'S NETWORK — The Smugglers</div>
        <P>Viktor "Nachalnik" Dragunov's black-market operation. Former Soviet Navy, now running a smuggling pipeline moving refined SZ-0 to the highest bidder — including Western intelligence agencies, rogue states, and private collectors.</P>
        <div className="text-[10px] font-mono text-foreground/70 space-y-0.5">
          <div><span className="text-accent">Units:</span> Rednecks, Scavs, Dogs, Smuggler guards</div>
          <div><span className="text-accent">Leaders:</span> Nachalnik (the Boss)</div>
          <div><span className="text-accent">Presence:</span> Fishing Village. Supply routes to other sites.</div>
          <div><span className="text-accent">Agenda:</span> Profit. Sell SZ-0 to anyone with rubles.</div>
        </div>
      </div>

      <div className="border border-border rounded p-3 mb-3 bg-card/50">
        <div className="text-sm font-display text-foreground mb-1">🏔️ THE MOUNTAIN — Gruvrå & Its Guardians</div>
        <P>Not a faction in the human sense. Gruvrå is the accumulated consciousness of Substance Zero — millions of years of absorbed organic matter forming something resembling intelligence. It does not want to be extracted. It does not want to be weaponized. It wants to grow.</P>
        <div className="text-[10px] font-mono text-foreground/70 space-y-0.5">
          <div><span className="text-accent">Units:</span> Ort & Stoll (crystalline guardians), absorbed workers</div>
          <div><span className="text-accent">Leaders:</span> Gruvrå (the entity)</div>
          <div><span className="text-accent">Presence:</span> Gruvsamhället deep levels. Influence felt at all sites.</div>
          <div><span className="text-accent">Agenda:</span> Protect the vein. Absorb intruders. Expand.</div>
        </div>
      </div>

      <div className="border border-border rounded p-3 mb-3 bg-card/50">
        <div className="text-sm font-display text-foreground mb-1">🇸🇪 NATO TASK FORCE AURORA — The Player's Side</div>
        <P>A secret NATO task force assembled to deny Substance Zero to all parties. VARG is their only field operative. CONTROL handles communications. The task force has no official existence — if VARG is captured, NATO disavows.</P>
        <div className="text-[10px] font-mono text-foreground/70 space-y-0.5">
          <div><span className="text-accent">Units:</span> Agent VARG (player), CONTROL (handler)</div>
          <div><span className="text-accent">Agenda:</span> Recover nuclear codes. Collapse the geological vein. Deny SZ-0 to everyone.</div>
        </div>
      </div>

      <H3>Faction Relations</H3>
      <div className="border border-border rounded p-3 bg-card/50 text-[10px] font-mono text-foreground/70 space-y-1">
        <div>☭ GRU ↔ 🔬 Kravtsov: <span className="text-accent">Strained alliance.</span> GRU funds Kravtsov but distrusts his methods.</div>
        <div>☭ GRU ↔ 🪝 Nachalnik: <span className="text-accent">Uneasy partnership.</span> GRU tolerates smuggling as long as supply flows.</div>
        <div>☭ GRU ↔ 🏔️ Mountain: <span className="text-destructive">Hostile.</span> GRU extracts by force. The mountain resists.</div>
        <div>🔬 Kravtsov ↔ 🔮 Ordo: <span className="text-destructive">Infiltrated.</span> Some Kravtsov staff are secret Ordo members.</div>
        <div>🪝 Nachalnik ↔ 🔮 Svarta Solen: <span className="text-accent">Business.</span> Nachalnik sells to anyone, including the cult.</div>
        <div>All factions ↔ 🇸🇪 NATO: <span className="text-destructive">Hostile.</span> VARG is an enemy to everyone.</div>
      </div>
    </>
  );
}

function OccultSection() {
  return (
    <>
      <H2>🔮 The Occult — Three Branches, One Root</H2>
      <P>Substance Zero has attracted three distinct occult movements. They disagree on methods but share one belief: SZ-0 is not a resource to be exploited — it is a force to be worshipped, channeled, or awakened.</P>

      <div className="border border-destructive/30 rounded p-3 mb-3 bg-destructive/5">
        <div className="text-sm font-display text-destructive mb-1">🔴 ORDO BOREALIS — "The Northern Order"</div>
        <div className="text-[9px] font-mono text-destructive/70 mb-2">Est. ~1978 · Soviet-internal · Active at Objekt 47 & Hospital</div>
        <P>A secret brotherhood within the Soviet military-scientific complex. Founded by officers and researchers who were among the first to be exposed to Substance Zero and survived. They believe SZ-0 is a divine signal — a message from something beneath the Earth's crust that predates all life.</P>
        
        <H3>Beliefs</H3>
        <div className="text-[10px] font-mono text-foreground/70 space-y-1">
          <div>• Substance Zero is the blood of a sleeping god buried in the Arctic bedrock.</div>
          <div>• Stage 5 absorption is not death — it is ascension. Those absorbed join the god's consciousness.</div>
          <div>• The "voices" that exposed subjects hear are prayers from the absorbed, calling others to join.</div>
          <div>• The geological vein is a nervous system. The four sites are sensory organs.</div>
          <div>• Destroying the vein would kill a god. They will prevent this at any cost.</div>
        </div>

        <H3>Rituals & Practices</H3>
        <div className="text-[10px] font-mono text-foreground/70 space-y-1">
          <div>• Members carry a small vial of liquid SZ-0 around their neck (glows faint blue).</div>
          <div>• Initiation involves voluntary Stage 1 exposure — "hearing the signal for the first time."</div>
          <div>• Senior members have reached Stage 2-3 deliberately. They consider the hallucinations to be visions.</div>
          <div>• They perform "communion" — placing hands on raw SZ-0 deposits and meditating.</div>
        </div>

        <H3>In-Game Presence</H3>
        <div className="text-[10px] font-mono text-foreground/70 space-y-1">
          <div>• <span className="text-destructive">Cultist enemies</span> wear standard GRU uniforms but with a small aurora borealis patch on the collar.</div>
          <div>• They fight with zero cowardice — they welcome death as "joining the signal."</div>
          <div>• Some sabotage GRU equipment — they don't want SZ-0 exported, they want it left undisturbed.</div>
          <div>• Found primarily at Objekt 47 (infiltrators among soldiers) and Hospital (among Kravtsov's staff).</div>
          <div>• Drop unique lore items: <span className="text-accent">Ordo Prayer Scroll</span>, <span className="text-accent">Vial of Blue Light</span>.</div>
        </div>

        <H3>Key Figures</H3>
        <div className="text-[10px] font-mono text-foreground/70 space-y-1">
          <div>🔴 <strong>The Archon</strong> — Identity unknown. Communicates via coded radio transmissions on freq 147.300.</div>
          <div>🔴 <strong>Commandant Osipovitj</strong> — Suspected Ordo sympathizer. His "orders from below" may be Ordo doctrine.</div>
          <div>🔴 <strong>Nurse Volkov</strong> — Unwitting informant. Her notes describe phenomena the Ordo considers sacred.</div>
        </div>
      </div>

      <div className="border border-accent/30 rounded p-3 mb-3 bg-accent/5">
        <div className="text-sm font-display text-accent mb-1">⛏️ STÅLHANDSKE-KULTEN — "The Absorption Cult"</div>
        <div className="text-[9px] font-mono text-accent/70 mb-2">Est. ~1960 · Swedish origin · Active at Gruvsamhället</div>
        <P>Founded by miners who worked the deep levels of Norrberget and witnessed the disappearance of Nils Stålhandske in 1957. They believe Stålhandske didn't die — he was chosen. The mountain selected him because he was the first to truly listen.</P>

        <H3>Beliefs</H3>
        <div className="text-[10px] font-mono text-foreground/70 space-y-1">
          <div>• Absorption is evolution. Flesh is temporary. Stone is eternal.</div>
          <div>• Nils Stålhandske is the cult's prophet — the first human to willingly merge with the mountain.</div>
          <div>• The Gruvrå is not an enemy — it is a mother welcoming her children home.</div>
          <div>• The surface world is dying. The underground world is alive and growing.</div>
          <div>• They want to open the sealed mine levels and guide others to the deep chamber for "reunification."</div>
        </div>

        <H3>Rituals & Practices</H3>
        <div className="text-[10px] font-mono text-foreground/70 space-y-1">
          <div>• Members tattoo a compass rose on their left palm — the needle always pointing down.</div>
          <div>• They leave offerings of iron ore at the mine entrance at midnight.</div>
          <div>• "Listening sessions" — sitting in silence in the deepest accessible tunnel, waiting to hear the mountain speak.</div>
          <div>• Members who reach Stage 3 are celebrated, not quarantined.</div>
        </div>

        <H3>In-Game Presence</H3>
        <div className="text-[10px] font-mono text-foreground/70 space-y-1">
          <div>• <span className="text-accent">Kulten-fiender</span> appear as rednecks and scavs but with distinct behavior — they don't flee and whisper Swedish prayers.</div>
          <div>• Found at Gruvsamhället, especially near the mine entrance and deep levels.</div>
          <div>• Some have partially hardened skin (Stage 3-4) — they take reduced damage from melee.</div>
          <div>• They try to lure the player deeper into the mine rather than kill outright.</div>
          <div>• Drop unique items: <span className="text-accent">Stålhandske's Compass Fragment</span>, <span className="text-accent">Iron Offering</span>.</div>
        </div>

        <H3>Key Figures</H3>
        <div className="text-[10px] font-mono text-foreground/70 space-y-1">
          <div>⛏️ <strong>Holmström</strong> — Former mine director. Sealed the deep levels in 1964, but secretly a cult founder. Still alive at 78. Somewhere in the village.</div>
          <div>⛏️ <strong>"Bergsmannen"</strong> — A miner absorbed in 1961 whose voice is still heard in Tunnel 7. The cult's spiritual guide.</div>
          <div>⛏️ <strong>Nils Stålhandske</strong> — VARG's father. The original absorbed. His compass readings are now part of Gruvrå's magnetic field.</div>
        </div>
      </div>

      <div className="border border-foreground/20 rounded p-3 mb-3 bg-muted/10">
        <div className="text-sm font-display text-foreground mb-1">☀️ SVARTA SOLEN — "The Black Sun"</div>
        <div className="text-[9px] font-mono text-muted-foreground mb-2">Est. ~1943 · Pan-European · Independent operators</div>
        <P>An esoteric organization with roots in WWII-era occult research. Originally German, now a decentralized network spanning Europe and South America. They believe Substance Zero is the remnant of a pre-human civilization — the Hyperboreans — who mastered a technology indistinguishable from magic.</P>

        <H3>Beliefs</H3>
        <div className="text-[10px] font-mono text-foreground/70 space-y-1">
          <div>• The Arctic was once home to an advanced pre-ice-age civilization — the Hyperboreans.</div>
          <div>• Substance Zero is their technology: a programmable matter that responds to consciousness.</div>
          <div>• The "hallucinations" are actually fragments of Hyperborean memories embedded in the substance.</div>
          <div>• Whoever masters SZ-0 gains access to Hyperborean knowledge — including weapons beyond nuclear.</div>
          <div>• Neither NATO nor the Soviets should control it. Svarta Solen will claim it for humanity's "true heirs."</div>
        </div>

        <H3>Rituals & Practices</H3>
        <div className="text-[10px] font-mono text-foreground/70 space-y-1">
          <div>• Members wear a black sun medallion (twelve-spoke wheel) hidden under clothing.</div>
          <div>• They use an old Germanic runic cipher for communications.</div>
          <div>• "Awakening rituals" attempt to use electromagnetic equipment to "tune in" to SZ-0's frequency.</div>
          <div>• Senior members claim to have decoded fragments of Hyperborean language from exposure visions.</div>
        </div>

        <H3>In-Game Presence</H3>
        <div className="text-[10px] font-mono text-foreground/70 space-y-1">
          <div>• <span className="text-foreground">Svarta Solen operatives</span> appear as a third faction — neither GRU nor smuggler. They wear dark civilian clothing with tactical gear.</div>
          <div>• Highly trained — accuracy and tactics match or exceed GRU soldiers.</div>
          <div>• They target SZ-0 containers and research data, not the player (unless obstructed).</div>
          <div>• Can appear on any map as rare spawn events — competing with the player for intel.</div>
          <div>• Drop unique items: <span className="text-accent">Black Sun Medallion</span>, <span className="text-accent">Runic Cipher Page</span>, <span className="text-accent">Hyperborean Fragment</span>.</div>
        </div>

        <H3>Key Figures</H3>
        <div className="text-[10px] font-mono text-foreground/70 space-y-1">
          <div>☀️ <strong>"Der Wächter"</strong> — The organization's current leader. Never seen in person. Communicates via couriers.</div>
          <div>☀️ <strong>Erik Lindqvist</strong> — Swedish archaeologist, publicly respected, secretly Svarta Solen's Arctic expert. Provided the geological survey data that led the Soviets to Norrberget.</div>
          <div>☀️ <strong>Agent FALKE</strong> — A Svarta Solen operative embedded within NATO Task Force AURORA. Identity unknown. CONTROL suspects a mole.</div>
        </div>
      </div>

      <H3>The Connection</H3>
      <div className="border border-destructive/30 rounded p-3 bg-destructive/5 text-[10px] font-mono text-foreground/70 space-y-1">
        <div className="text-destructive font-display text-xs mb-1">THREE BRANCHES, ONE ROOT</div>
        <div>All three occult movements are drawn to the same phenomenon. They interpret it differently:</div>
        <div className="mt-1">🔴 <strong>Ordo Borealis:</strong> It is a god. Worship it. Join it.</div>
        <div>⛏️ <strong>Stålhandske-kulten:</strong> It is a mother. Return to it. Become stone.</div>
        <div>☀️ <strong>Svarta Solen:</strong> It is a technology. Decode it. Control it.</div>
        <div className="mt-1 text-destructive italic">The substance doesn't care what they believe. It absorbs them all the same.</div>
      </div>
    </>
  );
}

function WorldSection() {
  return (
    <>
      <H2>🌍 World State & Theories</H2>

      <H3>The Cold War Context (1985)</H3>
      <P>The game takes place in late 1985. Reagan and Gorbachev have just met in Geneva. The Cold War is at a crossroads — the world teeters between détente and annihilation. Both superpowers are secretly racing to weaponize Substance Zero, which could tip the balance permanently.</P>
      <div className="text-[10px] font-mono text-foreground/70 space-y-1 mb-3">
        <div>• NATO fears a Soviet first-strike capability enhanced by SZ-0.</div>
        <div>• The KGB and GRU are in a power struggle over who controls the SZ-0 program.</div>
        <div>• Sweden officially neutral, but compromised officials have sold access to Norrberget.</div>
        <div>• Third-party buyers (Libya, South Africa, unnamed corporations) are bidding for refined SZ-0.</div>
        <div>• The IAEA has no knowledge of Substance Zero's existence.</div>
      </div>

      <H3>The Maskirovka — Layers of Deception</H3>
      <div className="border border-border rounded p-3 bg-card/50 mb-3 text-[10px] font-mono text-foreground/70 space-y-1">
        <div><strong className="text-foreground">Objekt 47:</strong> Officially a weather monitoring station. Listed as decommissioned in 1981. Still fully active.</div>
        <div><strong className="text-foreground">Fishing Village:</strong> Dismissed as civilian settlement. Took NATO 3 years and 2 missing recon teams to confirm.</div>
        <div><strong className="text-foreground">Hospital №6:</strong> Functions as real hospital alongside the experiments. Staff who ask questions become subjects.</div>
        <div><strong className="text-foreground">Norrberget:</strong> Erased from Swedish maps. The village deleted from census records since 1965. The government denies it exists.</div>
      </div>

      <H3>Player Theories & Conspiracies</H3>
      <P>The following are unconfirmed theories pieced together from recovered documents:</P>
      
      <div className="space-y-2 mb-3">
        <div className="border-l-2 border-destructive/40 pl-2 text-[10px] font-mono text-foreground/70">
          <strong className="text-destructive">THEORY: VARG IS ALREADY EXPOSED</strong><br/>
          The compass VARG carries has pointed toward Norrberget since 1957. His father's compass. Magnetic anomaly — or has VARG been Stage 1 since childhood? The mountain may have been calling him his entire life.
        </div>
        <div className="border-l-2 border-accent/40 pl-2 text-[10px] font-mono text-foreground/70">
          <strong className="text-accent">THEORY: CONTROL IS AGENT FALKE</strong><br/>
          CONTROL knows too much about Substance Zero for a NATO handler. His briefings contain details that only someone with direct exposure — or Svarta Solen connections — would know. The mole may be hiding in plain sight.
        </div>
        <div className="border-l-2 border-primary/40 pl-2 text-[10px] font-mono text-foreground/70">
          <strong className="text-primary-foreground">THEORY: THE VEIN IS ONE ORGANISM</strong><br/>
          What if the geological vein isn't a mineral deposit but a single, continent-spanning organism? The four sites aren't extraction points — they're wounds. And the organism is trying to heal.
        </div>
        <div className="border-l-2 border-foreground/20 pl-2 text-[10px] font-mono text-foreground/70">
          <strong className="text-foreground">THEORY: STÅLHANDSKE IS STILL CONSCIOUS</strong><br/>
          Cassette recordings from Tunnel 7 contain audio anomalies that, when frequency-shifted, produce speech patterns matching Nils Stålhandske's voice from 1956 recordings. He may still be aware inside the mountain. Trapped. Watching.
        </div>
        <div className="border-l-2 border-destructive/40 pl-2 text-[10px] font-mono text-foreground/70">
          <strong className="text-destructive">THEORY: THE OPERATION IS A SACRIFICE</strong><br/>
          The synchronized detonation plan requires planting charges at the deepest point of each site — exactly where SZ-0 concentration is highest. What if CONTROL knows the demolition team won't survive? What if VARG was chosen because he's expendable — a ghost who's already "dead"?
        </div>
      </div>

      <H3>Unanswered Questions</H3>
      <div className="border border-border rounded p-3 bg-card/50 text-[10px] font-mono text-foreground/70 space-y-1">
        <div>❓ Why does Substance Zero maintain exactly 37°C — human body temperature?</div>
        <div>❓ What did the Hyperboreans look like? Are the "creatures" some soldiers report seeing related?</div>
        <div>❓ If absorption is irreversible, why do some absorbed subjects' voices still transmit on radio frequencies?</div>
        <div>❓ Osipovitj claims to receive "orders from below." Is he receiving genuine communication — or is the substance manipulating him?</div>
        <div>❓ The Uzbek was injected with concentrated SZ-0 and didn't absorb — he mutated. Why is he different?</div>
        <div>❓ Who sent the original geological survey data to the Soviets? Erik Lindqvist? Or someone inside MUST?</div>
        <div>❓ If the vein is collapsed, what happens to the absorbed? Do they die? Or are they released?</div>
      </div>

      <H3>Timeline</H3>
      <div className="text-[10px] font-mono text-foreground/70 space-y-0.5">
        <div><span className="text-accent">Pre-Cambrian:</span> Substance Zero deposits form in Arctic bedrock.</div>
        <div><span className="text-accent">~10,000 BC:</span> Hyperborean civilization (if it existed) interacts with SZ-0.</div>
        <div><span className="text-accent">1943:</span> German occult research division discovers references to SZ-0. Svarta Solen founded.</div>
        <div><span className="text-accent">1947:</span> Swedish miners at Norrberget hit SZ-0 at 420m depth. First modern contact.</div>
        <div><span className="text-accent">1957:</span> Nils Stålhandske disappears in Norrberget Mine. Survey equipment found. Body never recovered.</div>
        <div><span className="text-accent">1960:</span> Stålhandske-kulten formed by surviving miners.</div>
        <div><span className="text-accent">1964:</span> Mine Director Holmström seals deep levels. Mine officially closed.</div>
        <div><span className="text-accent">1965:</span> Norrberget village erased from Swedish records.</div>
        <div><span className="text-accent">1970:</span> Soviet geological survey identifies the vein extending to Novaya Zemlya.</div>
        <div><span className="text-accent">1977:</span> Objekt 47 established. Osipovitj appointed commandant.</div>
        <div><span className="text-accent">1978:</span> First Ordo Borealis cell forms among Objekt 47 researchers.</div>
        <div><span className="text-accent">1980:</span> Nachalnik establishes the smuggling pipeline.</div>
        <div><span className="text-accent">1983:</span> Hospital №6 begins human experimentation. Project REBIRTH launched.</div>
        <div><span className="text-accent">1984:</span> The Uzbek (Subject 7) survives extreme B-7 exposure. VARG "killed" in East Berlin.</div>
        <div><span className="text-accent">1985:</span> NATO Task Force AURORA activated. Operation Aurora Borealis begins.</div>
      </div>
    </>
  );
}

function ControlsSection() {
  return (
    <>
      <H2>🎮 Controls</H2>
      <H3>Movement</H3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono text-foreground/70">
        <div><KeyCap k="W" /><KeyCap k="A" /><KeyCap k="S" /><KeyCap k="D" /> — Move</div>
        <div><KeyCap k="Shift" /> — Sprint (drains stamina)</div>
        <div><KeyCap k="Ctrl" /> — Sneak (reduced detection)</div>
        <div><KeyCap k="Q" /> — Take cover near props</div>
      </div>
      <H3>Combat</H3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono text-foreground/70">
        <div><KeyCap k="LMB" /> — Shoot / Hold for auto</div>
        <div><KeyCap k="R" /> — Manual reload</div>
        <div><KeyCap k="G" /> — Throw grenade</div>
        <div><KeyCap k="V" /> / <KeyCap k="Ctrl+Scroll" /> — Cycle throwable</div>
        <div><KeyCap k="T" /> — Place TNT charge</div>
        <div><KeyCap k="F" /> — Throw knife (silent)</div>
        <div><KeyCap k="MMB" /> / <KeyCap k="C" /> — Throw distraction rock</div>
      </div>
      <H3>Interaction & Inventory</H3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono text-foreground/70">
        <div><KeyCap k="E" /> — Interact / Loot / Equip / Chokehold</div>
        <div><KeyCap k="Tab" /> / <KeyCap k="I" /> — Toggle inventory</div>
        <div><KeyCap k="1" /><KeyCap k="2" /><KeyCap k="3" /> / <KeyCap k="Scroll" /> — Switch weapon slot</div>
        <div><KeyCap k="X" /> — Use special item / Disguise</div>
        <div><KeyCap k="H" /> — Heal (use medical item)</div>
      </div>
      <H3>Weapon Slots</H3>
      <P>Slot 1: Melee (knife/baton) · Slot 2: Sidearm (pistol/revolver) · Slot 3: Primary weapon (rifle/SMG/MG)</P>
      <P>New weapons drop on the ground with glowing rings. Press [E] to pick up. If the slot is full, you swap weapons.</P>
    </>
  );
}

function WeaponsSection() {
  return (
    <>
      <H2>🔫 Weapons</H2>
      <P>All weapons are balanced using an eDPS algorithm: eDPS = (damage × 1000 / fireRate) × (auto ? 0.6 : 1.0). Auto weapons receive a 0.6× penalty to account for spread.</P>
      
      <H3>Sidearms (Tier 1)</H3>
      <WeaponRow name="PM Makarov" icon="🔫" tier="Common" ammo="9x18" dmg={15} rpm={143} mag={8} mode="Semi" spread="0.10" weight={3} notes="Standard sidearm. Always available." />
      <WeaponRow name="Nagant M1895" icon="🔫" tier="Common" ammo="9x18" dmg={22} rpm={75} mag={7} mode="Semi" spread="0.07" weight={1} notes="Slow but punchy revolver." />

      <H3>Melee</H3>
      <WeaponRow name="Combat Knife" icon="🗡️" tier="Common" ammo="—" dmg={40} rpm={200} mag={0} mode="Melee" spread="—" weight={0.3} notes="Silent. One-shots most scavs." />
      <WeaponRow name="Baton" icon="🔫" tier="Common" ammo="—" dmg={10} rpm={120} mag={0} mode="Melee" spread="—" weight={0.5} notes="Weak but non-lethal." />

      <H3>SMGs (Tier 2)</H3>
      <WeaponRow name="PPSh-41" icon="🔫" tier="Rare" ammo="9x18" dmg={8} rpm={600} mag={35} mode="Auto" spread="0.12" weight={3} notes="Bullet hose. Burns through 9x18 fast." />
      <WeaponRow name="Kpist m/45" icon="🔫" tier="Rare" ammo="9x18" dmg={10} rpm={500} mag={36} mode="Auto" spread="0.12" weight={2.5} notes="Swedish SMG. Higher damage per bullet than PPSh." />

      <H3>Shotgun (Tier 2)</H3>
      <WeaponRow name="TOZ-34" icon="🔫" tier="Rare" ammo="12gauge" dmg={11} rpm={55} mag={2} mode="Semi" spread="Cone 0.55rad" weight={3} notes="5 pellets per shot. Devastating close range. 2-round break action." />

      <H3>Assault Rifles (Tier 3)</H3>
      <WeaponRow name="AK-74" icon="🔫" tier="Rare" ammo="5.45x39" dmg={16} rpm={214} mag={30} mode="Auto" spread="0.09" weight={3} notes="Controllable. Most common rifle." />
      <WeaponRow name="AKM" icon="🔫" tier="Epic" ammo="7.62x39" dmg={20} rpm={167} mag={30} mode="Auto" spread="0.09" weight={3} notes="Harder hitting but slower than AK-74." />
      <WeaponRow name="Ak 4 (HK G3)" icon="🔫" tier="Epic" ammo="7.62x39" dmg={24} rpm={150} mag={20} mode="Auto" spread="0.06" weight={4} notes="Battle rifle. Most precise auto weapon. Heavy recoil." />

      <H3>Precision (Tier 4)</H3>
      <WeaponRow name="Mosin-Nagant" icon="🔫" tier="Legendary" ammo="7.62x54R" dmg={50} rpm={33} mag={5} mode="Semi" spread="0.03" weight={3} notes="One-shot potential. Extremely slow fire rate. Sniper weapon." />

      <H3>Heavy (Tier 5)</H3>
      <WeaponRow name="Ksp 58 (FN MAG)" icon="🔫" tier="Legendary" ammo="7.62x54R" dmg={20} rpm={375} mag={50} mode="Auto" spread="0.11" weight={6} notes="Devastating suppression. Extremely heavy. Eats rare 7.62x54R ammo." />

      <H3>Special</H3>
      <WeaponRow name="Laser Designator" icon="🔴" tier="Legendary" ammo="—" dmg={0} rpm={0} mag={0} mode="Special" spread="—" weight={1} notes="Calls mortar strike on target after 3s delay. Does not fire bullets." />

      <H3>Weapon Modifications</H3>
      <div className="space-y-1">
        <P>🔭 <strong>Red Dot Scope</strong> — +20% bullet speed. Found in crates.</P>
        <P>🔇 <strong>Suppressor</strong> — -50% shot noise radius. Enables stealth shooting.</P>
        <P>📎 <strong>Extended Magazine</strong> — +8 magazine capacity.</P>
        <P>Mods attach automatically to your primary weapon on deployment.</P>
      </div>
    </>
  );
}

function RecoilSection() {
  return (
    <>
      <H2>🎯 Recoil & Spread System</H2>
      <P>Bullet accuracy is determined by multiple factors that stack together:</P>

      <H3>Base Weapon Spread</H3>
      <div className="border border-border rounded p-2 bg-card/50 mb-2">
        <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
          <div>Mosin-Nagant: <span className="text-accent">0.03</span> (tightest)</div>
          <div>Ak 4: <span className="text-accent">0.06</span></div>
          <div>Revolver: <span className="text-accent">0.07</span></div>
          <div>TOZ-34: <span className="text-accent">0.08</span> + pellet cone</div>
          <div>AK-74 / AKM: <span className="text-accent">0.09</span></div>
          <div>Makarov: <span className="text-accent">0.10</span></div>
          <div>Ksp 58: <span className="text-accent">0.11</span></div>
          <div>PPSh / Kpist: <span className="text-accent">0.12</span> (widest)</div>
        </div>
      </div>

      <H3>Movement Penalty</H3>
      <P>Heavier weapons suffer more from movement. Weight factor = min(1.5, weaponWeight / 4).</P>
      <div className="border border-border rounded p-2 bg-card/50 mb-2 text-[10px] font-mono">
        <div>🏃 Sprint: <span className="text-destructive">+0.18 × weight factor</span> (worst accuracy)</div>
        <div>🚶 Walk: <span className="text-accent">+0.07 × weight factor</span></div>
        <div>🤫 Sneak: <span className="text-primary-foreground">+0.015</span> (nearly perfect)</div>
        <div>🧍 Standing still: <span className="text-primary-foreground">-0.02</span> (accuracy bonus)</div>
      </div>
      <P>Example: Ksp 58 (6kg) sprinting = +0.27 spread penalty. Makarov (3kg) sprinting = +0.135.</P>

      <H3>Recoil Bloom (Sustained Fire)</H3>
      <P>Each shot increases spread. Auto weapons bloom faster:</P>
      <div className="border border-border rounded p-2 bg-card/50 mb-2 text-[10px] font-mono">
        <div>Ksp 58: <span className="text-destructive">+0.04/shot</span> (cap 0.30) — heavy MG kick</div>
        <div>PPSh / Kpist: <span className="text-destructive">+0.035/shot</span> — fast bloom</div>
        <div>AKM: <span className="text-accent">+0.03/shot</span></div>
        <div>AK-74 / Ak 4: <span className="text-accent">+0.022/shot</span> — controllable</div>
        <div>Pistols: <span className="text-primary-foreground">+0.015/shot</span></div>
        <div>Mosin: <span className="text-primary-foreground">+0.005/shot</span> (cap 0.08)</div>
      </div>

      <H3>Bloom Recovery</H3>
      <P>Bloom recovers when you stop shooting. Light weapons recover faster:</P>
      <div className="border border-border rounded p-2 bg-card/50 mb-2 text-[10px] font-mono">
        <div>Mosin: <span className="text-primary-foreground">0.25/s</span> (fast recovery)</div>
        <div>Pistols: <span className="text-primary-foreground">0.20/s</span></div>
        <div>Rifles: <span className="text-accent">0.14/s</span></div>
        <div>SMGs: <span className="text-accent">0.12/s</span></div>
        <div>Ksp 58: <span className="text-destructive">0.08/s</span> (slow recovery)</div>
      </div>

      <H3>Sustained Fire Penalty (Auto Only)</H3>
      <P>Holding the trigger adds +0.008 spread per consecutive shot (max +0.12). Release trigger for 0.4s to reset. Burst fire is more accurate than full-auto spraying.</P>

      <H3>Other Modifiers</H3>
      <div className="text-[10px] font-mono text-foreground/70 space-y-0.5">
        <div>🛡️ In cover: <span className="text-primary-foreground">-0.04</span> accuracy bonus</div>
        <div>🔧 Weapon degradation: up to <span className="text-destructive">+0.15</span> at 0% durability</div>
        <div>🔭 Red Dot Scope upgrade: <span className="text-primary-foreground">+25% bullet speed</span></div>
      </div>

      <H3>Pro Tips</H3>
      <div className="border border-accent/30 rounded p-2 bg-accent/5 text-[10px] font-mono text-foreground/70 space-y-1">
        <div>• Sneak + stand still = best accuracy for any weapon</div>
        <div>• Burst fire (2-3 shots, release, repeat) is king for auto weapons</div>
        <div>• The Mosin barely blooms — it's always accurate</div>
        <div>• Ksp 58 is inaccurate while moving due to weight. Find a position first</div>
        <div>• Cover provides both protection AND accuracy bonus</div>
      </div>
    </>
  );
}

function EnemiesSection() {
  return (
    <>
      <H2>💀 Enemy Types</H2>
      <P>Each enemy has personality traits: cowardice, accuracy, aggression, and cover-seeking. These vary per map.</P>

      <EnemyRow name="Scav (SCAV)" icon="🐀" hp="40-55" speed="Low" dmg="9-14" range="65-85"
        personality="Cowardly (70-90%). Low accuracy. Flees early at low HP. Panics easily."
        notes="The weakest enemy. Drops common loot. On Swedish map, some speak broken Swedish." />
      <EnemyRow name="Soldier (SOLDIER)" icon="🔫" hp="65-90" speed="Medium" dmg="16-24" range="105-150"
        personality="Disciplined (20-35% cowardice). Good accuracy (70-85%). Takes cover (35-50%). Calls for backup."
        notes="The backbone of every garrison. Uses radio to alert allies. Can flank." />
      <EnemyRow name="Heavy (HEAVY)" icon="🪖" hp="150-220" speed="Very Low" dmg="28-38" range="95-130"
        personality="Fearless (0% cowardice). Suppressor role. Never flees. Slow turning."
        notes="Tank. Throws flashbangs. Takes a lot of ammo to bring down. Suppressive fire." />
      <EnemyRow name="Shocker (SHOCKER)" icon="⚡" hp="55-90" speed="Very High" dmg="38-55" range="32-42 (melee)"
        personality="Fearless (0-15% cowardice). Rushes straight at you. Melee electric damage."
        notes="Close-range terror. Causes bleeding. Strongest in the hospital. Stun-locks you." />
      <EnemyRow name="Sniper Tuman" icon="🎯" hp="75-90" speed="Very Low" dmg="70-85" range="200-330"
        personality="Cowardly if found (50%). Perfect accuracy (95%). Teleports when threatened."
        notes="Only on Objekt 47. Invisible until revealed. Fires high-damage single shots." />
      <EnemyRow name="Redneck" icon="🤠" hp="65-85" speed="Medium" dmg="16-22" range="55-75"
        personality="Territorial. Low-medium cowardice. Carries shotgun + dog food."
        notes="Always paired with a dog. Swedish-speaking on Gruvsamhället. Drops TOZ shotgun." />
      <EnemyRow name="Dog" icon="🐕" hp="28-38" speed="Fastest" dmg="20-26" range="Melee"
        personality="Loyal. Follows owner. Very aggressive. Low cowardice."
        notes="Melee bite causes bleeding. Can be neutralized with Dog Food [X]. Has Russian name." />
      <EnemyRow name="Turret" icon="🏗️" hp="180-280" speed="0 (static)" dmg="20-28" range="110-155"
        personality="100% accuracy focus. Cannot be flanked. No emotions."
        notes="Stationary gun emplacement. High HP. Destroy from range or with grenades." />
    </>
  );
}

function BossesSection() {
  return (
    <>
      <H2>👹 Bosses</H2>
      <P>Each map has a unique boss with three phases, special attacks, and a death monologue.</P>

      <div className="border border-destructive/40 rounded p-3 bg-destructive/5 mb-2">
        <div className="text-sm font-display text-destructive mb-1">💀 Commandant Osipovitj — Objekt 47</div>
        <Stat label="HP" value="600" /><Stat label="DMG" value="42" /><Stat label="Speed" value="1.15" />
        <P>The base commander. Has two bodyguards (Zapad & Vostok) who heal him and throw grenades. Enrages at 60% HP, desperate at 30% HP.</P>
        <P>Death monologue: "НЕТ... НЕВОЗМОЖНО... Я... КОМАНДАНТ ОСИПОВИЧ..."</P>
      </div>

      <div className="border border-destructive/40 rounded p-3 bg-destructive/5 mb-2">
        <div className="text-sm font-display text-destructive mb-1">💉 Dr. Kravtsov — Hospital</div>
        <Stat label="HP" value="520" /><Stat label="DMG" value="42" /><Stat label="Speed" value="1.05" />
        <P>Mad scientist. Injects mutagen at phase 1+. Has a <span className="text-accent">FEAR ATTACK</span> — charges a syringe for 1.5s, forces player to flee for 2.5s. Deal 40+ damage to interrupt. Bodyguards protect him.</P>
      </div>

      <div className="border border-destructive/40 rounded p-3 bg-destructive/5 mb-2">
        <div className="text-sm font-display text-destructive mb-1">⛓️ Uzbek — Hospital (Mini-boss)</div>
        <Stat label="HP" value="520" /><Stat label="DMG" value="65-80" /><Stat label="Speed" value="2.20-2.80" />
        <P>Escaped test subject. Incredibly fast and strong. Breaks free from chains at phase 1. Three shocker minions guard his area.</P>
      </div>

      <div className="border border-destructive/40 rounded p-3 bg-destructive/5 mb-2">
        <div className="text-sm font-display text-destructive mb-1">🪝 Nachalnik — Fishing Village</div>
        <Stat label="HP" value="420" /><Stat label="DMG" value="38" /><Stat label="Speed" value="1.10" />
        <P>Dock master with a hook attack. Close range hook does 60 damage. Two bodyguards. Controls the pier area.</P>
      </div>

      <div className="border border-destructive/40 rounded p-3 bg-destructive/5 mb-2">
        <div className="text-sm font-display text-destructive mb-1">⛏️ Gruvrå — Gruvsamhället</div>
        <Stat label="HP" value="550" /><Stat label="DMG" value="44" /><Stat label="Speed" value="1.00" />
        <P>The mountain spirit. Cave-in attack causes rocks to fall. At phase 2, the mine starts collapsing. Drops Ksp 58.</P>
        <P>Death monologue: "BERGET... FALLER... NI KAN INTE... TA MALMEN..."</P>
      </div>

      <H3>Boss Mechanics</H3>
      <div className="text-[10px] font-mono text-foreground/70 space-y-1">
        <div>• Phase 0 (100-60% HP): Normal combat, moderate speed</div>
        <div>• Phase 1 (60-30% HP): Enraged — faster fire rate, higher speed, special attacks</div>
        <div>• Phase 2 (&lt;30% HP): Desperate — maximum aggression, unique abilities</div>
        <div>• Bodyguards can heal the boss (15-25 HP, 15-25s cooldown)</div>
        <div>• Kill bodyguards first to prevent healing</div>
      </div>
    </>
  );
}

function MapsSection() {
  return (
    <>
      <H2>🗺️ Maps</H2>

      <div className="border border-border rounded p-3 mb-2">
        <div className="text-sm font-display text-foreground mb-1">🏭 Objekt 47 — <span className="text-muted-foreground text-[10px]">3200×2400</span></div>
        <Tag>Starting Map</Tag><Tag color="danger">Snipers</Tag>
        <P>Arctic military base on Novaya Zemlya. Hangars, offices, watchtowers, minefield. Heavy enemy presence with professional soldiers. The only map with Sniper Tuman.</P>
        <P>Boss: Commandant Osipovitj. Exfil points around the perimeter.</P>
      </div>

      <div className="border border-border rounded p-3 mb-2">
        <div className="text-sm font-display text-foreground mb-1">🏚️ The Fishing Village — <span className="text-muted-foreground text-[10px]">1400×2000 · Unlock: 3 extractions</span></div>
        <Tag color="primary">Rednecks</Tag><Tag color="primary">Dogs</Tag>
        <P>Abandoned coastal village. Cabins, forest roads, a dock with speedboat. Rednecks with dogs patrol the area. Scavs are jumpy and cowardly.</P>
        <P>Boss: Nachalnik with his hook. Extraction via the dock.</P>
      </div>

      <div className="border border-border rounded p-3 mb-2">
        <div className="text-sm font-display text-foreground mb-1">🏥 The Hospital — <span className="text-muted-foreground text-[10px]">2400×2400 · Unlock: 6 extractions</span></div>
        <Tag color="danger">Shockers</Tag><Tag color="danger">Horror</Tag>
        <P>Abandoned Soviet hospital. Claustrophobic corridors, dark rooms. Shockers are strongest here (90 HP, 55 DMG). Scavs are terrified and flee fast.</P>
        <P>Two bosses: Dr. Kravtsov (fear attack) and Uzbek (escaped subject).</P>
      </div>

      <div className="border border-border rounded p-3 mb-2">
        <div className="text-sm font-display text-foreground mb-1">⛏️ Gruvsamhället — <span className="text-muted-foreground text-[10px]">2000×2800 · Unlock: 10 extractions</span></div>
        <Tag color="accent">Swedish</Tag><Tag color="primary">Dogs</Tag><Tag color="danger">Cave-ins</Tag>
        <P>Abandoned Swedish mining village with underground mine. Two levels. Rednecks speak Swedish and are the bravest here. Dogs are most vicious. Swedish weapons (Kpist m/45, Ak 4, Ksp 58) found in weapon cabinets.</P>
        <P>Boss: Gruvrå. Drops the legendary Ksp 58.</P>
      </div>

      <H3>Map-Specific Enemy Differences</H3>
      <P>Enemy stats vary by map. Objekt 47 has the best-trained soldiers. Hospital shockers are deadliest. Mining village rednecks are bravest and their dogs fastest.</P>
    </>
  );
}

function ItemsSection() {
  return (
    <>
      <H2>🎒 Items & Loot</H2>

      <H3>Medical</H3>
      <div className="text-[10px] font-mono text-foreground/70 space-y-1">
        <div>🩹 <strong>Bandage</strong> — Heals 10 HP, stops bleeding. Press [H].</div>
        <div>🏥 <strong>Medkit</strong> — Heals 40 HP. Press [H].</div>
        <div>💉 <strong>Morphine</strong> — Full heal + temporary speed boost. Press [H].</div>
      </div>

      <H3>Throwables (max 5 total)</H3>
      <div className="text-[10px] font-mono text-foreground/70 space-y-1">
        <div>💣 <strong>RGD-5 Grenade</strong> — 200 damage in 150px radius. [G] to throw. Enemies flee from grenades.</div>
        <div>💫 <strong>Flashbang</strong> — Blinds all in radius for 3s. Affects player too! Goggles reduce effect 50%.</div>
        <div>☣️ <strong>Gas Grenade</strong> — Converts one enemy to ally for 20s in gas cloud.</div>
        <div>🧨 <strong>TNT Charge</strong> — Placed with [T]. 3s fuse. 250 damage. Breaches outer walls.</div>
        <div>Cycle with [V] or Ctrl+Scroll. Current type shown in HUD.</div>
      </div>

      <H3>Special Items (X slot)</H3>
      <div className="text-[10px] font-mono text-foreground/70 space-y-1">
        <div>📢 <strong>Propaganda Leaflet</strong> — Convince nearby enemy to fight for you for 60s. [X].</div>
        <div>🦴 <strong>Dog Food</strong> — Neutralize a dog (it wanders off). [X] near dog.</div>
        <div>👔 <strong>Enemy Uniform</strong> — Disguise. Enemies mostly ignore you. Officers suspicious. Degrades over time. [X].</div>
      </div>

      <H3>Gear</H3>
      <div className="text-[10px] font-mono text-foreground/70 space-y-1">
        <div>🦺 <strong>Body Armor</strong> — +30 armor. Absorbs damage.</div>
        <div>⛑️ <strong>Helmet</strong> — +15 armor. Extra head protection.</div>
        <div>🥽 <strong>Tactical Goggles</strong> — 50% reduced flashbang duration.</div>
        <div>🎒 <strong>Tactical Backpack</strong> — More inventory slots.</div>
        <div>💳 <strong>Access Card</strong> — Opens the main gate. Carried by officers (always spawn outdoors).</div>
      </div>

      <H3>Ammo Types</H3>
      <div className="text-[10px] font-mono text-foreground/70 space-y-1">
        <div>• <strong>9x18</strong> — Makarov, Revolver, PPSh, Kpist m/45. Most common.</div>
        <div>• <strong>5.45x39</strong> — AK-74 only.</div>
        <div>• <strong>7.62x39</strong> — AKM, Ak 4.</div>
        <div>• <strong>7.62x54R</strong> — Mosin-Nagant, Ksp 58. Rare and valuable.</div>
        <div>• <strong>12gauge</strong> — TOZ-34 shotgun.</div>
        <div>Ammo is stored in vest slots (not backpack). Reload with [R].</div>
      </div>

      <H3>Valuables & Crafting</H3>
      <P>20 types of valuables (cigarettes, vodka, gold rings, etc.) can be looted and sold. Some can be combined at the Safe House crafting bench into higher-value items.</P>
      <div className="text-[10px] font-mono text-foreground/70 space-y-1">
        <div>📻 Transistor + Radio Parts + Battery → Working Field Radio (500₽)</div>
        <div>💎 Gold Ring + Silver Chain → Gold Jewelry Set (600₽)</div>
        <div>🔭 Binoculars + Camera Film → Improvised Scope (400₽)</div>
      </div>
      <P>Items worth 300₽+ require confirmation before discarding.</P>

      <H3>Loot Containers</H3>
      <div className="text-[10px] font-mono text-foreground/70 space-y-1">
        <div>📦 Crate — Common loot (bandages, valuables)</div>
        <div>🗄️ Cabinet / Locker — Military supplies</div>
        <div>🗃️ Archive / Desk — Intel, keys, documents</div>
        <div>🔫 Weapon Cabinet — High chance of weapons + mods</div>
        <div>💀 Enemy Body — Press [E] after kill. Grenades, sidearms, keycards.</div>
      </div>
    </>
  );
}

function MechanicsSection() {
  return (
    <>
      <H2>⚙️ Game Mechanics</H2>

      <H3>Raid Structure</H3>
      <P>Each raid has a 5-minute time limit. Find loot, complete objectives, and extract before time runs out. Death = lose everything not in stash.</P>

      <H3>Extraction</H3>
      <P>Extraction points are marked on the map. Stand in the zone for ~3 seconds. Some exfils require an extraction code found in-raid.</P>

      <H3>Health & Damage</H3>
      <div className="text-[10px] font-mono text-foreground/70 space-y-1">
        <div>• HP starts at 100 (upgradeable). Armor absorbs hits.</div>
        <div>• Bleeding drains HP over time. Use bandages to stop.</div>
        <div>• Speed penalty at &lt;75% HP (75% speed loss).</div>
        <div>• Emergency Injector auto-revives to 75 HP once per raid.</div>
      </div>

      <H3>Stamina</H3>
      <P>Sprinting drains stamina. When empty, you can't sprint. Recovers when walking or sneaking.</P>

      <H3>Cover System</H3>
      <div className="text-[10px] font-mono text-foreground/70 space-y-1">
        <div>• Press [Q] near props (crates, barriers, sandbags) to take cover.</div>
        <div>• In cover: enemies have a miss chance. Peeking (shooting) halves protection.</div>
        <div>• Cover also reduces spread by 0.04.</div>
        <div>• Hiding in cover = enemies lose track of you.</div>
      </div>

      <H3>Alarm System</H3>
      <P>Alarm panels exist in buildings. Enemies try to activate them when in combat. Hacking a panel (hold E) prevents activation. When alarm triggers, ALL enemies on the map go alert.</P>

      <H3>Reinforcements</H3>
      <P>After alarm triggers, reinforcements spawn from exfil points every 60-100 seconds (max capped). Soldiers or heavies.</P>

      <H3>Radio & Communication</H3>
      <P>Enemies in the same radio group alert each other. When one spots you, nearby allies get radio alerts with 0.3-1s reaction delay. Kill fast and silently to avoid cascading alerts.</P>

      <H3>Weapon Durability</H3>
      <P>Rifles degrade with use (120 durability). At low durability: increased spread, slower fire rate. Sidearms and melee never break.</P>

      <H3>XP & Levels</H3>
      <P>Earn XP from kills, loot, and extractions. Levels unlock new maps and provide progression milestones.</P>

      <H3>Daily Missions</H3>
      <P>Three rotating daily missions provide bonus rewards. Check the Safe House mission board.</P>
    </>
  );
}

function StealthSection() {
  return (
    <>
      <H2>🤫 Stealth System</H2>

      <H3>Awareness Meter</H3>
      <P>Enemies have a 0-1 awareness meter instead of binary detection:</P>
      <div className="text-[10px] font-mono text-foreground/70 space-y-1">
        <div>• <span className="text-primary-foreground">0.0-0.3</span>: Unaware. No reaction.</div>
        <div>• <span className="text-accent">0.3-0.65</span>: Suspicious. Turns toward you.</div>
        <div>• <span className="text-accent">0.65-0.9</span>: Investigating. Moves toward last known position.</div>
        <div>• <span className="text-destructive">0.9-1.0</span>: Full detection. Combat state.</div>
      </div>

      <H3>Detection Factors</H3>
      <div className="text-[10px] font-mono text-foreground/70 space-y-1">
        <div>🌳 Forest terrain: 0.4× visibility</div>
        <div>🤫 Sneaking: 0.3× visibility</div>
        <div>🏃 Sprinting: 1.8× visibility</div>
        <div>🛡️ In cover: 0.5× visibility</div>
        <div>🙈 Hiding: 0× visibility</div>
        <div>👔 Disguised: 0.02× (officers: 0.3×)</div>
        <div>🔙 Behind enemy: 0.15× visibility</div>
      </div>

      <H3>Vision Cones</H3>
      <P>Each enemy type has different vision:</P>
      <div className="text-[10px] font-mono text-foreground/70 space-y-1">
        <div>Scav: Narrow front (45°), 8% rear detection</div>
        <div>Soldier: Medium front (54°), 12% rear</div>
        <div>Heavy: Wide front (72°), 20% rear</div>
        <div>Sniper: Very narrow (22°), 3% rear — easy to sneak past</div>
        <div>Dog: Widest (90°), 40% rear — hardest to avoid</div>
      </div>

      <H3>Silent Actions</H3>
      <div className="text-[10px] font-mono text-foreground/70 space-y-1">
        <div><KeyCap k="E" /> Chokehold — Sneak behind unaware enemy, hold 2s for silent kill.</div>
        <div><KeyCap k="F" /> Throwing Knife — Silent ranged kill. 80 damage. Limited supply.</div>
        <div><KeyCap k="MMB" /> Distraction Rock — Enemies investigate the noise.</div>
        <div>🔇 Suppressor mod — Reduces gunshot noise radius by 50%.</div>
      </div>

      <H3>Body Discovery</H3>
      <P>Enemies who see dead allies become alerted and call nearby friends. Kill in hidden spots or kill witnesses quickly.</P>

      <H3>Sound Events</H3>
      <P>Gunshots, explosions, and running create sound events. Enemies within range investigate the noise source. Suppressed shots have smaller radius. Sneaking is nearly silent.</P>
    </>
  );
}

function UpgradesSection() {
  return (
    <>
      <H2>🏪 Upgrades & Trader</H2>

      <H3>Safe House Upgrades</H3>
      <P>Between raids, spend rubles on permanent upgrades at the Safe House:</P>
      <div className="space-y-1">
        {[
          { icon: '🔴', name: 'Red Dot Sight', effect: '+25% bullet speed', cost: '300₽', max: 1 },
          { icon: '📎', name: 'Extended Magazine', effect: '+10 ammo/level', cost: '250₽', max: 3 },
          { icon: '🤚', name: 'Ergonomic Grip', effect: '-10% fire rate/level', cost: '400₽', max: 2 },
          { icon: '🎒', name: 'Tactical Backpack', effect: '+4 slots/level', cost: '500₽', max: 3 },
          { icon: '⛑️', name: 'Ballistic Helmet', effect: '+10 armor/level', cost: '600₽', max: 2 },
          { icon: '🩹', name: 'IFAK Pouch', effect: 'Free medkit on deploy', cost: '350₽', max: 1 },
          { icon: '👢', name: 'Tactical Boots', effect: '+8% speed/level', cost: '450₽', max: 2 },
          { icon: '🦺', name: 'Grenade Vest', effect: '+1 grenade/level', cost: '400₽', max: 2 },
          { icon: '🎯', name: 'Match-Grade Barrel', effect: '+5% crit/level', cost: '550₽', max: 3 },
          { icon: '⚡', name: 'Quick Hands', effect: '-15% reload/level', cost: '400₽', max: 3 },
          { icon: '🤫', name: 'Silent Step', effect: '-10% noise/level', cost: '500₽', max: 3 },
          { icon: '💪', name: 'Iron Constitution', effect: '+15 max HP/level', cost: '600₽', max: 3 },
          { icon: '🫁', name: 'Endurance Training', effect: '+20% stamina/level', cost: '450₽', max: 2 },
        ].map(u => (
          <div key={u.name} className="flex items-center justify-between text-[10px] font-mono text-foreground/70 border-b border-border/30 pb-0.5">
            <span>{u.icon} {u.name} <span className="text-accent">(max {u.max})</span></span>
            <span>{u.effect} — <span className="text-accent">{u.cost}</span></span>
          </div>
        ))}
      </div>

      <H3>Trader (Consumables)</H3>
      <P>Buy consumables before deploying:</P>
      <div className="text-[10px] font-mono text-foreground/70 space-y-0.5">
        <div>💉 Emergency Injector — 350₽ (auto-revive once)</div>
        <div>🩹 Bandage — 50₽</div>
        <div>🏥 Medkit — 150₽</div>
        <div>💉 Morphine — 400₽</div>
        <div>💣 F-1 Grenade — 200₽</div>
        <div>💫 Flashbang — 180₽</div>
        <div>☁️ Gas Grenade — 500₽</div>
        <div>🧨 TNT Charge — 350₽</div>
      </div>

      <H3>Stash</H3>
      <P>Items extracted from raids go to your stash. Sell valuables to the trader for rubles. Stash persists between raids.</P>
    </>
  );
}

export default function Wiki() {
  const [section, setSection] = useState<WikiSection>('lore');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-xs font-display text-muted-foreground hover:text-accent transition-colors">
              ← BACK
            </button>
            <h1 className="text-lg font-display text-accent uppercase tracking-wider">📖 FIELD MANUAL</h1>
          </div>
          <span className="text-[9px] font-mono text-muted-foreground">NOVAYA ZEMLYA — CLASSIFIED</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto flex gap-0 min-h-[calc(100vh-48px)]">
        {/* Sidebar */}
        <div className="w-40 sm:w-48 border-r border-border bg-card/50 p-2 flex-shrink-0 sticky top-[48px] h-[calc(100vh-48px)] overflow-y-auto">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`w-full text-left px-2 py-1.5 text-[11px] font-display uppercase tracking-wider rounded transition-colors mb-0.5
                ${section === s.id 
                  ? 'text-accent bg-accent/10 border border-accent/30' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent'}`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 sm:p-6 overflow-y-auto">
          {section === 'lore' && <LoreSection />}
          {section === 'factions' && <FactionsSection />}
          {section === 'occult' && <OccultSection />}
          {section === 'world' && <WorldSection />}
          {section === 'controls' && <ControlsSection />}
          {section === 'weapons' && <WeaponsSection />}
          {section === 'recoil' && <RecoilSection />}
          {section === 'enemies' && <EnemiesSection />}
          {section === 'bosses' && <BossesSection />}
          {section === 'maps' && <MapsSection />}
          {section === 'items' && <ItemsSection />}
          {section === 'mechanics' && <MechanicsSection />}
          {section === 'stealth' && <StealthSection />}
          {section === 'upgrades' && <UpgradesSection />}
        </div>
      </div>
    </div>
  );
}
