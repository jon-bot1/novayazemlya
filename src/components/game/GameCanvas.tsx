import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createGameState, updateGame } from '../../game/engine';
import { renderGame } from '../../game/renderer';
import { GameState, InputState, Item } from '../../game/types';
import { MapId } from '../../game/maps';
import { LORE_DOCUMENTS } from '../../game/lore';
import { LoreDocument } from '../../game/lore';
import { MobileControls } from './MobileControls';
import { useIsMobile } from '@/hooks/use-mobile';
import { unlockSpeech } from '../../game/voice';
import { HUD } from './HUD';
import { HighscoreList } from './HighscoreList';
import { InventoryPanel } from './InventoryPanel';
import { DocumentReader } from './DocumentReader';
import { IntelPanel } from './IntelPanel';
import { LootPopup, LootNotification } from './LootPopup';
import { HomeBase, StashState, loadStash, saveStash } from './HomeBase';
import { generateMissionObjectives, MissionObjective, checkObjectiveCompletion } from '../../game/objectives';
import { getUpgradeLevel, getUpgradeCost, UPGRADES, TRADER_ITEMS, getLevelForXp } from '../../game/upgrades';
import { createMedical, createGrenade, createFlashbang, createGasGrenade, createTNT, createAmmo, createArmor, createHelmet, createGoggles, createBackpack, WEAPON_TEMPLATES, createScope, createSuppressor, createExtMagazine } from '../../game/items';
import { hapticShoot, hapticDamage, hapticKill, hapticInteract } from '../../game/haptics';
import { startAmbient, stopAmbient } from '../../game/audio';
import { getDailyMissions, loadDailyProgress, saveDailyProgress, checkDailyCompletion } from '../../game/dailyMissions';
import { RECIPES, canCraft, craft } from '../../game/crafting';
import { supabase } from '@/integrations/supabase/client';
import { getGraphicsQuality, setGraphicsQuality, getRenderDistance, setRenderDistance, type GraphicsQuality, type RenderDistance } from '../../game/graphics';

const TIME_LIMIT = 300; // 5 minutes
const FIREFOX_WARNING_KEY = 'novaya_firefox_warning_dismissed';

const createDefaultInputState = (): InputState => ({
  moveX: 0,
  moveY: 0,
  aimX: 0,
  aimY: 0,
  shooting: false,
  shootPressed: false,
  interact: false,
  heal: false,
  throwGrenade: false,
  cycleThrowable: false,
  movementMode: 'walk',
  moveTarget: null,
  takeCover: false,
  useTNT: false,
  useSpecial: false,
  reload: false,
  throwKnife: false,
  chokehold: false,
  throwRock: false,
});

const safeCreateGameState = (mapId: MapId = 'objekt47', playerLevel: number = 1, extractionCount: number = 0): GameState => {
  try {
    return createGameState(mapId, playerLevel, extractionCount);
  } catch (error) {
    console.error('Failed to create game state:', error);
    return createGameState('objekt47');
  }
};

const createInitialObjectivesByMap = (): Record<MapId, MissionObjective[]> => ({
  objekt47: generateMissionObjectives('objekt47'),
  fishing_village: generateMissionObjectives('fishing_village'),
  hospital: generateMissionObjectives('hospital'),
  mining_village: generateMissionObjectives('mining_village'),
});

const createInitialRerollsByMap = (): Record<MapId, number> => ({
  objekt47: 0,
  fishing_village: 0,
  hospital: 0,
  mining_village: 0,
});

const IntroScreen: React.FC<{ onStart: (name: string) => void }> = ({ onStart }) => {
  const [name, setName] = React.useState('');
  const [anonymous, setAnonymous] = React.useState(false);
  const introIsMobile = useIsMobile();
  
  const handleStart = React.useCallback(() => {
    if (anonymous) {
      onStart('__anonymous__');
    } else if (name.trim().length > 0) {
      onStart(name.trim().slice(0, 20));
    }
  }, [name, anonymous, onStart]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (anonymous || name.trim().length > 0)) {
        handleStart();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleStart]);

  const [tab, setTab] = React.useState<'briefing' | 'story' | 'characters' | 'updates' | 'highscores'>('briefing');

  return (
  <div className="absolute inset-0 flex items-start justify-center bg-background z-50 overflow-auto py-2">
    <div className="max-w-lg w-full mx-2 sm:mx-4 flex flex-col gap-2 sm:gap-4 p-3 sm:p-8 border border-border bg-card rounded">
      <div className="text-center">
        <h1 className="text-3xl font-display text-accent text-glow-green tracking-wider">NOVAYA ZEMLYA</h1>
        <p className="text-xs font-mono text-muted-foreground mt-2">CLASSIFIED — EYES ONLY</p>
      </div>

      <div className="border-t border-border pt-4">
        <label className="text-xs font-display text-accent uppercase tracking-wider mb-2 block">Your Callsign</label>
        <input
          type="text"
          maxLength={20}
          className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed"
          placeholder="Enter name..."
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus={!anonymous && !introIsMobile}
          disabled={anonymous}
        />
        <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={e => setAnonymous(e.target.checked)}
            className="accent-accent w-3.5 h-3.5"
          />
          <span className="text-[11px] font-mono text-muted-foreground">🕵️ Top Secret Agent (nothing will be registered)</span>
        </label>
      </div>

      <button
        className="w-full px-6 py-3 bg-primary text-primary-foreground font-display uppercase tracking-widest rounded-sm hover:bg-primary/80 transition-colors text-lg disabled:opacity-40"
        onClick={handleStart}
        disabled={!anonymous && name.trim().length === 0}
      >
        ▶ BEGIN OPERATION
      </button>

      <a href="/wiki" className="block w-full text-center px-4 py-2 border border-accent/40 text-accent font-display uppercase tracking-widest rounded-sm hover:bg-accent/10 transition-colors text-sm">
        📖 FIELD MANUAL (Wiki)
      </a>

      {/* Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 sm:gap-0 border-b border-border pb-1 sm:pb-0">
        <button
          className={`px-3 py-2 text-[11px] sm:text-xs font-display uppercase tracking-wider transition-colors rounded-sm sm:rounded-none ${tab === 'story' ? 'text-accent border border-accent/40 sm:border-0 sm:border-b-2 sm:border-accent bg-accent/10 sm:bg-transparent' : 'text-muted-foreground border border-border/50 hover:text-foreground hover:border-border'}`}
          onClick={() => setTab('story')}
        >
          🌌 Story
        </button>
        <button
          className={`px-3 py-2 text-[11px] sm:text-xs font-display uppercase tracking-wider transition-colors rounded-sm sm:rounded-none ${tab === 'briefing' ? 'text-accent border border-accent/40 sm:border-0 sm:border-b-2 sm:border-accent bg-accent/10 sm:bg-transparent' : 'text-muted-foreground border border-border/50 hover:text-foreground hover:border-border'}`}
          onClick={() => setTab('briefing')}
        >
          📋 Briefing
        </button>
        <button
          className={`px-3 py-2 text-[11px] sm:text-xs font-display uppercase tracking-wider transition-colors rounded-sm sm:rounded-none ${tab === 'characters' ? 'text-accent border border-accent/40 sm:border-0 sm:border-b-2 sm:border-accent bg-accent/10 sm:bg-transparent' : 'text-muted-foreground border border-border/50 hover:text-foreground hover:border-border'}`}
          onClick={() => setTab('characters')}
        >
          👤 Characters
        </button>
        <button
          className={`px-3 py-2 text-[11px] sm:text-xs font-display uppercase tracking-wider transition-colors rounded-sm sm:rounded-none ${tab === 'updates' ? 'text-accent border border-accent/40 sm:border-0 sm:border-b-2 sm:border-accent bg-accent/10 sm:bg-transparent' : 'text-muted-foreground border border-border/50 hover:text-foreground hover:border-border'}`}
          onClick={() => setTab('updates')}
        >
          📡 Updates
        </button>
        <button
          className={`px-3 py-2 text-[11px] sm:text-xs font-display uppercase tracking-wider transition-colors rounded-sm sm:rounded-none col-span-2 sm:col-span-1 ${tab === 'highscores' ? 'text-accent border border-accent/40 sm:border-0 sm:border-b-2 sm:border-accent bg-accent/10 sm:bg-transparent' : 'text-muted-foreground border border-border/50 hover:text-foreground hover:border-border'}`}
          onClick={() => setTab('highscores')}
        >
          🏆 Highscores
        </button>
      </div>

      {tab === 'story' && (
        <>
          <div className="text-[10px] font-mono text-muted-foreground italic mb-1">
            OPERATION AURORA BOREALIS — ULTRAVIOLET CLEARANCE
          </div>

          {/* Substance Zero */}
          <div className="border border-accent/40 rounded p-3 bg-accent/5">
            <h3 className="text-xs font-display text-accent uppercase tracking-wider mb-2">🧬 Substance Zero</h3>
            <p className="text-[11px] font-mono text-foreground/70 leading-relaxed">
              Beneath the Arctic bedrock — from <span className="text-accent">Norrberget</span> in Sweden across the Kola Peninsula to <span className="text-accent">Novaya Zemlya</span> — runs a geological vein of an unknown material. NATO calls it <span className="text-warning">Substance Zero</span>. The Soviets call it <span className="text-warning">Вещество Ноль</span>. The miners at Norrberget called it <span className="text-warning">"the blood of the mountain."</span>
            </p>
            <p className="text-[11px] font-mono text-foreground/70 leading-relaxed mt-2">
              When refined, it amplifies nuclear chain reactions by a <span className="text-danger">factor of twelve</span>. A warhead the size of a briefcase could level a city. The Cold War's ultimate escalation.
            </p>
            <p className="text-[11px] font-mono text-foreground/70 leading-relaxed mt-2">
              But Substance Zero is not inert. It <span className="text-danger">resists extraction</span>. Workers go mad. Equipment fails. In extreme cases — the mountain <span className="text-danger">absorbs</span> them.
            </p>
          </div>

          {/* Player Dossier */}
          <div className="border border-primary/40 rounded p-3 bg-primary/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-display text-primary">🐺 Codename: VARG</span>
              <span className="text-[10px] font-mono text-primary px-1.5 py-0.5 border border-primary/30 rounded">PLAYER</span>
            </div>
            <p className="text-[11px] font-mono text-foreground/70 leading-relaxed">
              Former Swedish military intelligence (<span className="text-accent">MUST</span>). Officially declared KIA during a failed operation in East Berlin, 1984. Recruited by a secret NATO task force for one purpose: locate and destroy all Substance Zero sites.
            </p>
            <p className="text-[11px] font-mono text-foreground/70 leading-relaxed mt-2">
              <span className="text-warning">Personal stake:</span> VARG's father, <span className="text-accent">Nils Stålhandske</span>, was a survey engineer who disappeared inside Norrberget Mine in 1957 while investigating the magnetic anomaly. His body was never found. His compass still points toward the mountain.
            </p>
          </div>

          {/* The Four Sites */}
          <div className="border border-border rounded p-3">
            <h3 className="text-xs font-display text-warning uppercase tracking-wider mb-2">🗺️ The Four Sites</h3>
            <div className="space-y-2 text-[10px] font-mono text-foreground/70">
              <p>█ <span className="text-accent">OBJEKT 47</span> — Primary extraction & refinery. Nuclear codes in Osipovitj's safe. <span className="text-muted-foreground">The heart of the operation.</span></p>
              <p>█ <span className="text-accent">COASTAL VILLAGE</span> — Maritime smuggling pipeline. Nachalnik ships refined SZ-0 to foreign buyers. <span className="text-muted-foreground">The export terminal.</span></p>
              <p>█ <span className="text-accent">HOSPITAL №6</span> — Human experimentation. Kravtsov creates SZ-0-resistant soldiers. <span className="text-muted-foreground">The research lab.</span></p>
              <p>█ <span className="text-accent">NORRBERGET MINE</span> — The original discovery. Where VARG's father vanished. <span className="text-muted-foreground">The source.</span></p>
            </div>
          </div>

          {/* The Maskirovka */}
          <div className="border border-danger/30 rounded p-3 bg-danger/5">
            <h3 className="text-xs font-display text-danger uppercase tracking-wider mb-2">🎭 Maskirovka</h3>
            <p className="text-[10px] font-mono text-foreground/70 leading-relaxed">
              Every site hides behind a cover story. Objekt 47 is a "weather station." The village is "abandoned." The hospital treats "polar syndrome." Norrberget is "geologically exhausted." All lies. Soviet GRU maintains these fictions through compromised officials, false satellite imagery, and eliminated witnesses. Three NATO reconnaissance teams have gone missing attempting to verify these sites. You are the fourth attempt.
            </p>
          </div>

          {/* The Endgame */}
          <div className="border border-warning/40 rounded p-3 bg-warning/5">
            <h3 className="text-xs font-display text-warning uppercase tracking-wider mb-2">💥 Endgame</h3>
            <p className="text-[10px] font-mono text-foreground/70 leading-relaxed">
              Recover the nuclear detonation codes from Objekt 47. Plant demolition charges at the deepest point of each site. Trigger a synchronized detonation to permanently collapse the geological vein and deny Substance Zero to all parties. The substance regenerates — destroying one site alone changes nothing. <span className="text-danger">All four must fall.</span>
            </p>
          </div>

          {/* Exposure Warning */}
          <div className="border border-danger/50 rounded p-2 bg-danger/10">
            <p className="text-[9px] font-mono text-danger/80 leading-relaxed text-center">
              ⚠ WARNING: Extended Substance Zero exposure causes paranoia, hallucinations, and physical absorption into rock. If your compass starts spinning — LEAVE IMMEDIATELY. ⚠
            </p>
          </div>
        </>
      )}

      {tab === 'characters' && (
        <>
          <div className="text-[10px] font-mono text-muted-foreground italic mb-1">
            PERSONNEL DOSSIER — All Operational Zones
          </div>

          {/* Gruvrå */}
          <div className="border border-accent/40 rounded p-3 bg-accent/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-display text-accent">⛏️ Gruvrå</span>
              <span className="text-[10px] font-mono text-accent px-1.5 py-0.5 border border-accent/30 rounded">BOSS — MINE</span>
            </div>
            <p className="text-[11px] font-mono text-foreground/70 leading-relaxed mb-2">
              Not a man. Not a spirit. Gruvrå is what happens when Substance Zero accumulates enough mass to develop consciousness. 
              It has existed in the mountain since before the ice age — the miners disturbed it, and it absorbed them. 
              Survey engineer Nils Stålhandske — VARG's father — was taken by it in 1957. The mountain keeps what it takes.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-mono">
              <span className="text-muted-foreground">HP</span><span className="text-danger">500</span>
              <span className="text-muted-foreground">Location</span><span className="text-foreground">Deep chamber, 420m underground</span>
              <span className="text-muted-foreground">Damage</span><span className="text-danger">40</span>
              <span className="text-muted-foreground">Special</span><span className="text-warning">Cave-in attack, 3 phases, Swedish speech</span>
              <span className="text-muted-foreground">Guards</span><span className="text-accent">ORT (west) & STOLL (east) — crystal formations</span>
              <span className="text-muted-foreground">Drops</span><span className="text-loot">👑 Gruvrås Krona, 💎 Rare Ore</span>
            </div>
          </div>

          {/* Ort & Stoll */}
          <div className="border border-accent/30 rounded p-3 bg-accent/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-display text-accent">🪨 ORT & STOLL</span>
              <span className="text-[10px] font-mono text-accent px-1.5 py-0.5 border border-accent/30 rounded">BODYGUARDS — MINE</span>
            </div>
            <p className="text-[11px] font-mono text-foreground/70 leading-relaxed mb-2">
              Crystallized Substance Zero formations, three meters tall, guarding the entrance to Gruvrå's chamber. 
              They look like stone but they move — slowly, patiently. They have faces. 
              Miner Dahl saw them in 1958. They weren't there in September. By March, they were.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-mono">
              <span className="text-muted-foreground">HP</span><span className="text-warning">200 / 180</span>
              <span className="text-muted-foreground">Roles</span><span className="text-foreground">ORT — aggressive melee / STOLL — ranged suppressor</span>
              <span className="text-muted-foreground">Alert</span><span className="text-foreground">280-300px</span>
            </div>
          </div>

          {/* Commandant */}
          <div className="border border-danger/40 rounded p-3 bg-danger/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-display text-danger">💀 Commandant Osipovitj</span>
              <span className="text-[10px] font-mono text-danger px-1.5 py-0.5 border border-danger/30 rounded">BOSS</span>
            </div>
            <p className="text-[11px] font-mono text-foreground/70 leading-relaxed mb-2">
              Former Spetsnaz, recruited 1977. After exposure to the B-series substance in Laboratory No. 3, 
              Osipovitj developed unnatural strength and insomnia lasting weeks without degradation. 
              Claims to hear "orders from below". Patrols the deep storage at night, armed and muttering. 
              The most dangerous man on Novaya Zemlya — and possibly no longer entirely human.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-mono">
              <span className="text-muted-foreground">HP</span><span className="text-danger">350</span>
              <span className="text-muted-foreground">Weapon</span><span className="text-foreground">Modified AK + Flashbangs</span>
              <span className="text-muted-foreground">Damage</span><span className="text-danger">30</span>
              <span className="text-muted-foreground">Fire Rate</span><span className="text-warning">500ms (rapid)</span>
              <span className="text-muted-foreground">Alert Range</span><span className="text-foreground">280px</span>
              <span className="text-muted-foreground">Shoot Range</span><span className="text-foreground">220px</span>
              <span className="text-muted-foreground">Speed</span><span className="text-foreground">1.8 (chase) / 1.2 (patrol)</span>
              <span className="text-muted-foreground">Special</span><span className="text-warning">3 phases, stim heal (50HP/5s), orders bodyguards, flashbangs</span>
              <span className="text-muted-foreground">Drops</span><span className="text-loot">💾 USB Drive, 💀 Dogtag</span>
            </div>
          </div>

          {/* Bodyguards */}
          <div className="border border-warning/40 rounded p-3 bg-warning/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-display text-warning">🛡️ ZAPAD & VOSTOK</span>
              <span className="text-[10px] font-mono text-warning px-1.5 py-0.5 border border-warning/30 rounded">BODYGUARDS</span>
            </div>
            <p className="text-[11px] font-mono text-foreground/70 leading-relaxed mb-2">
              Osipovitj's personal shadows since 1979. Both former GRU special operators who followed their 
              commander into the abyss. ZAPAD and VOSTOK — they never speak, never leave his side, 
              and never hesitate. Rumor says they underwent the same B-series exposure voluntarily. 
              Their loyalty is absolute. Their mercy is nonexistent.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-mono">
              <span className="text-muted-foreground">HP</span><span className="text-warning">100 each</span>
              <span className="text-muted-foreground">Weapon</span><span className="text-foreground">Assault Rifle</span>
              <span className="text-muted-foreground">Damage</span><span className="text-warning">20</span>
              <span className="text-muted-foreground">Fire Rate</span><span className="text-foreground">700ms</span>
              <span className="text-muted-foreground">Alert Range</span><span className="text-foreground">320px (widened arc)</span>
              <span className="text-muted-foreground">Shoot Range</span><span className="text-foreground">280px</span>
              <span className="text-muted-foreground">Special</span><span className="text-warning">Wide vision arc, grenade resistant (50% dmg)</span>
            </div>
          </div>

          {/* Sniper */}
          <div className="border border-accent/40 rounded p-3 bg-accent/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-display text-accent">🎯 Sniper</span>
              <span className="text-[10px] font-mono text-accent px-1.5 py-0.5 border border-accent/30 rounded">SEMI-BOSS</span>
            </div>
            <p className="text-[11px] font-mono text-foreground/70 leading-relaxed mb-2">
              Nobody knows his real name. The soldiers call him "Tuman" — Fog. 
              He appeared at Objekt 47 three months ago with no transfer papers. 
              Operates alone in the perimeter forest with a scoped Mosin-Nagant. 
              His kills are clean — one round, center mass, no witnesses. 
              Some say he was the one who silenced Group Cedar. If you hear nothing, he's already aiming.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-mono">
              <span className="text-muted-foreground">HP</span><span className="text-foreground">70</span>
              <span className="text-muted-foreground">Weapon</span><span className="text-foreground">Mosin-Nagant (scoped)</span>
              <span className="text-muted-foreground">Damage</span><span className="text-danger">68 (devastating)</span>
              <span className="text-muted-foreground">Fire Rate</span><span className="text-foreground">5000ms (bolt-action)</span>
              <span className="text-muted-foreground">Alert Range</span><span className="text-danger">400px (extreme)</span>
              <span className="text-muted-foreground">Shoot Range</span><span className="text-danger">350px (extreme)</span>
              <span className="text-muted-foreground">Speed</span><span className="text-foreground">0.6 (slow, methodical)</span>
              <span className="text-muted-foreground">Special</span><span className="text-accent">Observes before engaging, repositions for vantage</span>
            </div>
          </div>

          {/* Soldiers */}
          <div className="border border-border rounded p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-display text-foreground">🔫 Soldier</span>
              <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 border border-border rounded">STANDARD</span>
            </div>
            <p className="text-[11px] font-mono text-foreground/70 leading-relaxed mb-2">
              Conscripts and regulars stationed at the base. Trained but not elite. 
              They follow orders, patrol routes, and radio for backup when things go loud.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-mono">
              <span className="text-muted-foreground">HP</span><span className="text-foreground">56</span>
              <span className="text-muted-foreground">Weapon</span><span className="text-foreground">AK-74</span>
              <span className="text-muted-foreground">Damage</span><span className="text-foreground">15</span>
              <span className="text-muted-foreground">Fire Rate</span><span className="text-foreground">800ms</span>
              <span className="text-muted-foreground">Tactics</span><span className="text-foreground">Flank / Assault, radio comms</span>
            </div>
          </div>

          {/* Heavy */}
          <div className="border border-border rounded p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-display text-foreground">🪖 Heavy</span>
              <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 border border-border rounded">ARMORED</span>
            </div>
            <p className="text-[11px] font-mono text-foreground/70 leading-relaxed mb-2">
              Armored troopers carrying heavy firepower. Slow but extremely durable. 
              They prefer suppressive fire, pinning you down while others flank.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-mono">
              <span className="text-muted-foreground">HP</span><span className="text-warning">120</span>
              <span className="text-muted-foreground">Weapon</span><span className="text-foreground">RPK-74</span>
              <span className="text-muted-foreground">Damage</span><span className="text-foreground">25</span>
              <span className="text-muted-foreground">Fire Rate</span><span className="text-foreground">1500ms</span>
              <span className="text-muted-foreground">Tactics</span><span className="text-foreground">Suppressor role</span>
            </div>
          </div>

          {/* Scav */}
          <div className="border border-border rounded p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-display text-foreground">🐀 Scav</span>
              <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 border border-border rounded">WEAK</span>
            </div>
            <p className="text-[11px] font-mono text-foreground/70 leading-relaxed mb-2">
              Deserters, looters, or those who stayed behind when everyone else fled. 
              Poorly armed, jumpy, and dangerous mostly in numbers.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-mono">
              <span className="text-muted-foreground">HP</span><span className="text-foreground">32</span>
              <span className="text-muted-foreground">Weapon</span><span className="text-foreground">Makarov PM</span>
              <span className="text-muted-foreground">Damage</span><span className="text-foreground">8</span>
              <span className="text-muted-foreground">Fire Rate</span><span className="text-foreground">1200ms</span>
            </div>
          </div>

          {/* Turret */}
          <div className="border border-border rounded p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-display text-foreground">🏗️ Turret Emplacement</span>
              <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 border border-border rounded">STATIC</span>
            </div>
            <p className="text-[11px] font-mono text-foreground/70 leading-relaxed mb-2">
              Fixed machine gun nests at watchtowers and key positions. 
              Can't move, but their firepower and HP make them deadly obstacles.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-mono">
              <span className="text-muted-foreground">HP</span><span className="text-warning">200</span>
              <span className="text-muted-foreground">Weapon</span><span className="text-foreground">PKM (mounted)</span>
              <span className="text-muted-foreground">Damage</span><span className="text-foreground">20</span>
              <span className="text-muted-foreground">Fire Rate</span><span className="text-foreground">800ms</span>
              <span className="text-muted-foreground">Special</span><span className="text-foreground">Elevated, shoots over walls</span>
            </div>
          </div>

          {/* Shocker */}
          <div className="border border-border rounded p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-display text-foreground">⚡ Shocker</span>
              <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 border border-border rounded">MELEE</span>
            </div>
            <p className="text-[11px] font-mono text-foreground/70 leading-relaxed mb-2">
              Equipped with experimental electric shock batons. Fast and deadly at close range.
              The shock causes bleeding and disrupts movement.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-mono">
              <span className="text-muted-foreground">HP</span><span className="text-foreground">56</span>
              <span className="text-muted-foreground">Weapon</span><span className="text-foreground">Electric Baton</span>
              <span className="text-muted-foreground">Damage</span><span className="text-danger">35</span>
              <span className="text-muted-foreground">Range</span><span className="text-warning">Very Short (melee)</span>
              <span className="text-muted-foreground">Speed</span><span className="text-foreground">Fast — rushes you</span>
            </div>
          </div>

          {/* Officers */}
          <div className="border border-border rounded p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-display text-foreground">⭐ Officer</span>
              <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 border border-border rounded">ELITE</span>
            </div>
            <p className="text-[11px] font-mono text-foreground/70 leading-relaxed mb-2">
              Career military with bolt-action precision. They carry Mosin-Nagants and 
              hit hard at extended range. Often carry valuable loot — grenades, armor, dogtags.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-mono">
              <span className="text-muted-foreground">HP</span><span className="text-foreground">70</span>
              <span className="text-muted-foreground">Weapon</span><span className="text-foreground">Mosin-Nagant</span>
              <span className="text-muted-foreground">Damage</span><span className="text-danger">50</span>
              <span className="text-muted-foreground">Fire Rate</span><span className="text-foreground">2000ms (bolt-action)</span>
              <span className="text-muted-foreground">Range</span><span className="text-foreground">+40% extended</span>
              <span className="text-muted-foreground">Drops</span><span className="text-loot">Mosin, grenades, armor, dogtags</span>
            </div>
          </div>
        </>
      )}

      {tab === 'briefing' && (
        <>
          <div>
            <h2 className="text-sm font-display text-warning uppercase tracking-wider mb-2">📋 Operation Aurora Borealis</h2>
            <p className="text-xs font-mono text-foreground/80 leading-relaxed">
              You are <span className="text-accent">VARG</span> — a ghost operative on a mission to destroy the Soviet Substance Zero program.
              Operate from your <span className="text-accent">Safe House</span> between raids. 
              Each operational zone holds intel, threats, and a piece of the puzzle.
              Randomized <span className="text-warning">objectives</span> give you main targets and bonus tasks that pay rubles.
            </p>
          </div>

          {/* Map overviews */}
          <div className="border border-border rounded p-3 bg-secondary/5">
            <h3 className="text-xs font-display text-accent uppercase tracking-wider mb-2">🗺️ Operational Zones</h3>
            <div className="space-y-2">
              <div className="flex gap-2 items-start">
                <span className="text-base">☢️</span>
                <div>
                  <p className="text-[11px] font-display text-foreground">Objekt 47 "Severnyj Vektor" — <span className="text-[9px] text-muted-foreground font-mono">EXTRACTION & REFINERY</span></p>
                  <p className="text-[10px] font-mono text-muted-foreground">Soviet military base processing raw Substance Zero into weapons-grade material. <span className="text-danger">Commandant Osipovitj</span> guards the nuclear codes. Minefields, watchtowers, bunkers.</p>
                </div>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-base">🐟</span>
                <div>
                  <p className="text-[11px] font-display text-foreground">Coastal Village "Rybnaya" <span className="text-[9px] text-warning font-mono">(3 extractions)</span> — <span className="text-[9px] text-muted-foreground font-mono">SMUGGLING PIPELINE</span></p>
                  <p className="text-[10px] font-mono text-muted-foreground">Maritime export terminal for refined SZ-0. <span className="text-warning">Nachalnik</span> ships the substance to foreign buyers via fishing boats. Redneck guards, dogs, trapped approaches.</p>
                </div>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-base">🏥</span>
                <div>
                  <p className="text-[11px] font-display text-foreground">Hospital №6 <span className="text-[9px] text-warning font-mono">(6 extractions)</span> — <span className="text-[9px] text-muted-foreground font-mono">EXPERIMENTATION</span></p>
                  <p className="text-[10px] font-mono text-muted-foreground">Disguised research facility. <span className="text-accent">Dr. Kravtsov</span> creates SZ-0-resistant soldiers. <span className="text-danger">The Uzbek</span> (Test Subject 7) is his most horrific result. Countermeasure formula critical for final operation.</p>
                </div>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-base">⛏️</span>
                <div>
                  <p className="text-[11px] font-display text-foreground">Norrberget Mine <span className="text-[9px] text-warning font-mono">(10 extractions)</span> — <span className="text-[9px] text-muted-foreground font-mono">THE SOURCE</span></p>
                  <p className="text-[10px] font-mono text-muted-foreground">Where VARG's father disappeared. Two levels — surface village and underground mine. <span className="text-accent">Gruvrå</span> — the consciousness in the mountain — lurks below with crystalline guardians Ort & Stoll.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-mono text-foreground/80 leading-relaxed">
              <span className="text-danger">Eliminate targets</span>, <span className="text-loot">recover intel</span>, 
              <span className="text-warning">sabotage assets</span>, or <span className="text-accent">discover hidden passages</span>. 
              Extract alive to bring loot back to your stash. Sell loot for rubles, buy <span className="text-warning">upgrades</span> from Delyets.
            </p>
            <p className="text-xs font-mono text-foreground/80 leading-relaxed mt-2">
              Your gear persists between raids. Die and you lose everything you carried.
              You have <span className="text-warning">5 minutes</span> per raid before reinforcements overrun the area.
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <h2 className="text-sm font-display text-accent uppercase tracking-wider mb-2">🎮 Controls</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] font-mono">
              <span className="text-muted-foreground">WASD / Arrows</span><span className="text-foreground">Move</span>
              <span className="text-muted-foreground">Mouse</span><span className="text-foreground">Aim & Shoot</span>
              <span className="text-muted-foreground">Shift</span><span className="text-foreground">Sprint</span>
              <span className="text-muted-foreground">Ctrl / C</span><span className="text-foreground">Sneak</span>
              <span className="text-muted-foreground">Q / Space</span><span className="text-foreground">Hide near trees/bushes</span>
              <span className="text-muted-foreground">1 / 2 / 3</span><span className="text-foreground">Melee / Sidearm / Primary</span>
              <span className="text-muted-foreground">Scroll ↕</span><span className="text-foreground">Cycle weapons</span>
              <span className="text-muted-foreground">E</span><span className="text-foreground">Interact / Loot</span>
              <span className="text-muted-foreground">E (sneak behind)</span><span className="text-accent">Chokehold — silent 2s kill</span>
              <span className="text-muted-foreground">F</span><span className="text-accent">Throw Knife — silent ranged (80 dmg)</span>
              <span className="text-muted-foreground">X (near body)</span><span className="text-accent">Put on Disguise (45s stealth)</span>
              <span className="text-muted-foreground">H</span><span className="text-foreground">Heal (auto at low HP)</span>
              <span className="text-muted-foreground">G / Right-click</span><span className="text-foreground">Throw Grenade</span>
              <span className="text-muted-foreground">Hold Right-click</span><span className="text-foreground">Charge throw (2s max)</span>
              <span className="text-muted-foreground">V / Ctrl+Scroll</span><span className="text-foreground">Cycle grenade type (Frag/Gas/Flash)</span>
              <span className="text-muted-foreground">T (near wall)</span><span className="text-foreground">Place TNT 🧨 — breach walls</span>
              <span className="text-muted-foreground">X</span><span className="text-foreground">Use special item (propaganda/dog food)</span>
              <span className="text-muted-foreground">Tab / I</span><span className="text-foreground">Inventory (drop items)</span>
              <span className="text-muted-foreground">J</span><span className="text-foreground">Intel Log</span>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h2 className="text-sm font-display text-warning uppercase tracking-wider mb-2">⚠ Rules of Engagement</h2>
            <ul className="text-[11px] font-mono text-foreground/70 space-y-1">
              <li>• <span className="text-accent">Sneak</span> to avoid detection — enemies have vision arcs</li>
              <li>• <span className="text-accent">Hide</span> near trees/bushes with Q — become invisible to enemies</li>
              <li>• 🤫 <span className="text-accent">Chokehold [E]</span> — sneak behind an unaware enemy for a silent 2s kill</li>
              <li>• 🗡️ <span className="text-accent">Throwing Knife [F]</span> — silent ranged takedown (80 dmg, tiny sound)</li>
              <li>• 🥷 <span className="text-accent">Disguise [X]</span> — take a uniform from a dead soldier, enemies ignore you for 45s</li>
              <li>• 🥷 Officers can still detect you through disguise — keep distance!</li>
              <li>• <span className="text-warning">Gunfire alerts nearby enemies</span> — they will investigate & call for backup</li>
              <li>• <span className="text-danger">⚠ MINEFIELD</span> in the southwest compound (Objekt 47) — instant death!</li>
              <li>• 🧨 <span className="text-warning">TNT charges</span> breach any wall — press <span className="text-accent">T near a wall</span> (5s fuse)</li>
              <li>• Officers carry <span className="text-loot">keycards</span> to open the main gate & valuable loot</li>
              <li>• Enemies heal with bandages when damaged — interrupt them!</li>
              <li>• Use <span className="text-accent">cover</span> near obstacles to reduce incoming damage</li>
              <li>• Look for <span className="text-accent">hidden passages</span> — unusual markings on the ground</li>
              <li>• <span className="text-warning">Weapon durability</span> — guns degrade with use (except sidearms & Mosin accuracy)</li>
              <li>• After <span className="text-danger">5 minutes</span>, reinforcements arrive — extract or die</li>
            </ul>
          </div>
        </>
      )}

      {tab === 'updates' && (
        <>
          <div>
            <h2 className="text-sm font-display text-accent uppercase tracking-wider mb-2">📡 Updates</h2>
            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
              <div className="text-xs font-mono">
              <div className="text-accent font-display text-[11px] uppercase tracking-wider mb-1">v0.19 — 2026-03-08</div>
                <ul className="text-[11px] text-foreground/80 space-y-0.5 ml-2">
                  <li>• 🧭 <span className="text-accent">Compass HUD</span> — directional compass bar at top of screen showing N/S/E/W</li>
                  <li>• ☠️ <span className="text-accent">Kill Feed</span> — recent kills shown in top-right with method and enemy type</li>
                  <li>• 🎵 <span className="text-accent">Ambient Sounds</span> — wind (Objekt 47), ocean waves (Fishing Village), industrial hum (Hospital)</li>
                  <li>• 📼 <span className="text-accent">Cassette Tapes & Notes</span> — new lore: audio logs, handwritten notes, blood-stained warnings</li>
                  <li>• 📊 <span className="text-accent">Enhanced After Action Report</span> — stealth rating, long shots, accuracy, walls breached</li>
                  <li>• 🚁 <span className="text-accent">Conditional Exfils</span> — bonus extraction points with requirements (boss kill, keycard, no alarm)</li>
                  <li>• 🔭 <span className="text-accent">Render Distance</span> — toggle between FAR, MED, NEAR for performance tuning</li>
                </ul>
              </div>
              <div className="text-xs font-mono">
              <div className="text-accent font-display text-[11px] uppercase tracking-wider mb-1">v0.18 — 2026-03-08</div>
                <ul className="text-[11px] text-foreground/80 space-y-0.5 ml-2">
                  <li>• 🏥 <span className="text-accent">Hospital Bosses</span> — Dr. Kravtsov (lab coat, syringe, green aura) & The Uzbek (emaciated, chains, red glow)</li>
                  <li>• 😱 <span className="text-warning">Fear Attack</span> — Kravtsov injects terror (phase 1+), forcing you to flee for 2.5s. Deal 40 dmg to interrupt!</li>
                  <li>• 📄 <span className="text-accent">Hospital Lore</span> — 5 new documents: Kravtsov's lab journals, Nurse Volkov's notes, Director's final report</li>
                  <li>• 📄 Documents no longer pop up mid-raid — read them in the <span className="text-accent">Intel Archive</span> at the Safe House</li>
                  <li>• 🎨 <span className="text-accent">Unique boss rendering</span> — each boss has distinct visual identity, death sprites, and nameplates</li>
                </ul>
              </div>
              <div className="text-xs font-mono">
              <div className="text-accent font-display text-[11px] uppercase tracking-wider mb-1">v0.17 — 2026-03-05</div>
                <ul className="text-[11px] text-foreground/80 space-y-0.5 ml-2">
                  <li>• 🗺️ <span className="text-accent">3 Maps</span> — Objekt 47, The Fishing Village, The Hospital — each with unique atmosphere</li>
                  <li>• 🎨 <span className="text-accent">Map-specific visuals</span> — distinct color palettes, terrain details, and ambient overlays per map</li>
                  <li>• 🏥 <span className="text-warning">Hospital atmosphere</span> — cold blue-grey palette with dark vignette for horror feel</li>
                  <li>• 💬 <span className="text-accent">Boss dialogue system</span> — unique taunts, death monologues, and phase transitions per boss</li>
                </ul>
              </div>
              <div className="text-xs font-mono">
              <div className="text-accent font-display text-[11px] uppercase tracking-wider mb-1">v0.16 — 2026-03-02</div>
                <ul className="text-[11px] text-foreground/80 space-y-0.5 ml-2">
                  <li>• 🥷 <span className="text-accent">Disguise System</span> — loot a dead soldier, press [X] near body to put on uniform (45s)</li>
                  <li>• 🤫 <span className="text-accent">Chokehold</span> — sneak behind unaware enemy, press [E] for silent 2s kill</li>
                  <li>• 🗡️ <span className="text-accent">Throwing Knives</span> — press [F] for silent ranged attack (80 dmg, start with 2)</li>
                  <li>• 🎓 <span className="text-foreground">In-game tutorial tips</span> — contextual hints appear near your character</li>
                </ul>
              </div>
              <div className="text-xs font-mono">
              <div className="text-accent font-display text-[11px] uppercase tracking-wider mb-1">v0.15 — 2026-02-27</div>
                <ul className="text-[11px] text-foreground/80 space-y-0.5 ml-2">
                  <li>• ⚡ <span className="text-accent">Performance overhaul</span> — spatial hash grids, viewport culling, particle caps</li>
                  <li>• 🔫 <span className="text-accent">Increased weapon drops</span> — more weapons in crates, cabinets and enemy bodies</li>
                  <li>• 🎯 <span className="text-accent">10 new objectives</span> — Old Faithful, Pacifist, Demolitions Expert & more</li>
                </ul>
              </div>
              <div className="text-xs font-mono">
              <div className="text-accent font-display text-[11px] uppercase tracking-wider mb-1">v0.14 — 2026-02-27</div>
                <ul className="text-[11px] text-foreground/80 space-y-0.5 ml-2">
                  <li>• 🔫 <span className="text-accent">Shotgun (TOZ-34)</span> — fires 5 pellets in a cone, devastating at close range</li>
                  <li>• 🤠 <span className="text-warning">Redneck enemies</span> — patrol outside with shotguns and guard dogs</li>
                  <li>• 📢 <span className="text-accent">Propaganda Leaflet</span> — convince an enemy to fight for you for 60s</li>
                </ul>
              </div>
              <div className="text-xs font-mono">
                <div className="text-muted-foreground font-display text-[11px] uppercase tracking-wider mb-1">v0.1–0.13</div>
                <ul className="text-[11px] text-foreground/80 space-y-0.5 ml-2">
                  <li>• Core combat, boss fight, tactical AI, TNT breaching</li>
                  <li>• 3-slot weapon system, Safe House, trader, missions</li>
                  <li>• Cover system, medical system, extraction zones</li>
                  <li>• Achievements, highscores, intel documents</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'highscores' && (
        <div>
          <HighscoreList />
        </div>
      )}

    </div>
  </div>
  );
};
// Sync stash to database
function getWriteToken(name: string): string | null {
  try { return localStorage.getItem(`progress_token_${name}`); } catch { return null; }
}
function setWriteToken(name: string, token: string) {
  try { localStorage.setItem(`progress_token_${name}`, token); } catch {}
}

async function syncStashToDb(playerName: string, stash: StashState) {
  if (!playerName || playerName === '__anonymous__' || playerName.trim().toLowerCase() === 'test123' || playerName.trim().toLowerCase() === 'test3') return;
  try {
    const name = playerName.trim().slice(0, 20);
    const token = getWriteToken(name);
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-progress`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    };
    if (token) headers['x-write-token'] = token;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        player_name: name,
        rubles: stash.rubles,
        raid_count: stash.raidCount,
        extraction_count: stash.extractionCount,
        stash_items: stash.items,
        upgrades: stash.upgrades,
        xp: stash.xp,
        level: stash.level,
      }),
    });

    const result = await res.json();
    if (result.write_token) {
      setWriteToken(name, result.write_token);
    }
  } catch (e) {
    console.error('Failed to sync stash to DB:', e);
  }
}

// Helper: persist stash to localStorage + DB
function persistStash(stash: StashState, playerName: string) {
  saveStash(stash);
  syncStashToDb(playerName, stash);
}

// Helper: build objective completion payload from game state
function buildObjectivePayload(state: GameState) {
  return {
    bossKilled: state.enemies.some(e => e.type === 'boss' && e.state === 'dead'),
    sniperKilled: state.enemies.some(e => e.type === 'sniper' && e.state === 'dead'),
    terminalsHacked: state.terminalsHacked,
    documentsCollected: state.documentsCollected,
    killCount: state.killCount,
    headshotKills: state.headshotKills,
    lootValue: state.player.inventory.reduce((s, i) => s + i.value, 0),
    alarmTriggered: !!(state as any)._alarmEverTriggered,
    bodiesLooted: state.bodiesLooted,
    timeSeconds: state.time,
    tntPlacedOnPlane: !!(state as any)._tntOnPlane,
    alarmsHacked: state.terminalsHacked,
    mosinKills: state.mosinKills,
    wallsBreached: state.wallsBreached,
    grenadeKills: state.grenadeKills,
    dogsNeutralized: state.dogsNeutralized,
    longShots: state.longShots,
    knifeDistanceKills: state.knifeDistanceKills,
    cachesLooted: state.cachesLooted,
    convertKill: !!(state as any)._convertKill,
    fuelDestroyed: !!(state as any)._fuelDestroyed,
    ammoDestroyed: !!(state as any)._ammoDestroyed,
    radioDisabled: !!(state as any)._radioDisabled,
  };
}

async function loadStashFromDb(playerName: string): Promise<StashState | null> {
  if (!playerName || playerName === '__anonymous__' || playerName.trim().toLowerCase() === 'test123' || playerName.trim().toLowerCase() === 'test3') return null;
  try {
    const name = playerName.trim().slice(0, 20);
    const { data } = await supabase.from('player_progress').select('id,player_name,rubles,raid_count,extraction_count,stash_items,upgrades,xp,level').eq('player_name', name).maybeSingle();
    if (data) {
      return {
        items: (data.stash_items as any) || [],
        rubles: data.rubles,
        raidCount: data.raid_count,
        extractionCount: data.extraction_count,
        upgrades: (data.upgrades as any) || {},
        xp: (data as any).xp || 0,
        level: (data as any).level || 1,
      };
    }
  } catch (e) {
    console.error('Failed to load stash from DB:', e);
  }
  return null;
}

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(safeCreateGameState());
  const inputRef = useRef<InputState>(createDefaultInputState());
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const updateKeysRef = useRef<() => void>(() => {});
  const [started, setStarted] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [gamePhase, setGamePhase] = useState<'intro' | 'homebase' | 'playing'>('intro');
  const [stash, setStash] = useState<StashState>(loadStash);
  const [selectedMapId, setSelectedMapId] = useState<MapId>('objekt47');
  const [gfxQuality, setGfxQuality] = useState<GraphicsQuality>(getGraphicsQuality);
  const [renderDist, setRenderDist] = useState<RenderDistance>(getRenderDistance);
  const objectivesByMapRef = useRef<Record<MapId, MissionObjective[]>>(createInitialObjectivesByMap());
  const rerollsByMapRef = useRef<Record<MapId, number>>(createInitialRerollsByMap());
  const [objectives, setObjectives] = useState<MissionObjective[]>(() => objectivesByMapRef.current.objekt47);
  const [rerollCount, setRerollCount] = useState(rerollsByMapRef.current.objekt47);
  const extractedRef = useRef(false);
  const dbSyncedRef = useRef(false);

  // Mobile detection with manual override
  const autoMobile = useIsMobile();
  const [mobileOverride, setMobileOverride] = useState<boolean | null>(null);
  const isMobile = mobileOverride !== null ? mobileOverride : autoMobile;

  const [hudState, setHudState] = useState({
    player: stateRef.current.player,
    killCount: 0,
    messages: stateRef.current.messages,
    extractionProgress: 0,
    time: 0,
    gameOver: false,
    extracted: false,
    documentsRead: [] as string[],
    codesFound: [] as string[],
    hasExtractionCode: false,
    movementMode: 'walk' as 'sneak' | 'walk' | 'sprint',
    inCover: false,
    peeking: false,
    coverType: 'low' as 'high' | 'low',
    canHide: false,
    isHiding: false,
    deathCause: undefined as string | undefined,
    exfilRevealed: undefined as string | undefined,
    achievementStats: undefined as any,
    pendingWeapon: null as any,
    nearInteractable: false,
  });
  const [showInventory, setShowInventory] = useState(false);
  const [showIntel, setShowIntel] = useState(false);
  const [readingDoc, setReadingDoc] = useState<LoreDocument | null>(null);
  const [lootNotifications, setLootNotifications] = useState<LootNotification[]>([]);
  const [showFirefoxWarning, setShowFirefoxWarning] = useState(false);
  const lastInventoryCountRef = useRef<number>(stateRef.current.player.inventory.length);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isFirefox = /firefox/i.test(navigator.userAgent);
    if (!isFirefox) return;
    if (window.sessionStorage.getItem(FIREFOX_WARNING_KEY) === '1') return;
    setShowFirefoxWarning(true);
  }, []);

  // Keyboard input (desktop)
  useEffect(() => {
    const keys = new Set<string>();

    const updateKeys = () => {
      // On mobile, joystick sets moveX/moveY — don't overwrite with keyboard state
      if (isMobile) return;
      let mx = 0, my = 0;
      if (keys.has('w') || keys.has('arrowup') || keys.has('keyw')) my -= 1;
      if (keys.has('s') || keys.has('arrowdown') || keys.has('keys')) my += 1;
      if (keys.has('a') || keys.has('arrowleft') || keys.has('keya')) mx -= 1;
      if (keys.has('d') || keys.has('arrowright') || keys.has('keyd')) mx += 1;
      inputRef.current.moveX = mx;
      inputRef.current.moveY = my;
    };
    updateKeysRef.current = updateKeys;

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't capture game keys when typing in an input field
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      keys.add(k);
      // Also track physical key codes for reliable movement during Shift/Ctrl
      if (e.code) keys.add(e.code.toLowerCase());
      if (k === 'e') inputRef.current.interact = true;
      if (k === 't') inputRef.current.useTNT = true;
      if (k === 'h') inputRef.current.heal = true;
      // Y/N keys no longer needed — weapon swap is E-based now
      if (e.key === 'Escape') {
        setReadingDoc(null);
      }
      if (k === 'g') inputRef.current.throwGrenade = true;
      if (k === 'v') inputRef.current.cycleThrowable = true;
      if (k === 'x') inputRef.current.useSpecial = true;
      if (k === 'q' || k === ' ') { e.preventDefault(); inputRef.current.takeCover = true; }
      if (k === 'r') inputRef.current.reload = true;
      if (k === 'f') inputRef.current.throwKnife = true;
      if (k === '1') inputRef.current.switchWeapon = 1;
      if (k === '2') inputRef.current.switchWeapon = 2;
      if (k === '3') inputRef.current.switchWeapon = 3;
      if (e.key === 'Shift') inputRef.current.movementMode = 'sprint';
      if (e.key === 'Control' || k === 'c') inputRef.current.movementMode = 'sneak';
      if (e.key === 'Tab' || k === 'i') {
        e.preventDefault();
        setShowInventory(v => !v);
        setShowIntel(false);
        setReadingDoc(null);
      }
      if (k === 'j') {
        setShowIntel(v => !v);
        setShowInventory(false);
        setReadingDoc(null);
      }
      updateKeys();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.delete(k);
      if (e.code) keys.delete(e.code.toLowerCase());
      if (k === 'e') inputRef.current.interact = false;
      if (e.key === 'Shift') inputRef.current.movementMode = 'walk';
      if (e.key === 'Control' || k === 'c') inputRef.current.movementMode = 'walk';
      updateKeys();
    };

    const skipMouse = isMobile;

    const onMouseDown = (e: MouseEvent) => {
      // Skip synthetic mouse events on touch devices — handled by pointer events
      if (skipMouse) return;
      unlockSpeech();
      if ((e.target as HTMLElement).closest('button, [role="button"], .pointer-events-auto')) return;
      if (showInventory || showIntel || readingDoc) return;
      if (e.button === 1) {
        // Middle click = throw distraction rock
        e.preventDefault();
        inputRef.current.throwRock = true;
        return;
      }
      if (e.button === 2) {
        // Right-click hold = charge grenade throw
        e.preventDefault();
        (stateRef.current as any)._grenadeChargeStart = performance.now();
        return;
      }
      inputRef.current.shooting = true;
      inputRef.current.shootPressed = true;
    };
    const onContextMenu = (e: Event) => { e.preventDefault(); };
    const onMouseUp = (e: MouseEvent) => {
      if (skipMouse) return;
      if (e.button === 2) {
        // Right-click release = throw grenade with charged power
        const chargeStart = (stateRef.current as any)._grenadeChargeStart;
        if (chargeStart) {
          const chargeTime = Math.min(2.0, (performance.now() - chargeStart) / 1000); // max 2s
          (stateRef.current as any)._grenadeChargePower = chargeTime;
          delete (stateRef.current as any)._grenadeChargeStart;
          inputRef.current.throwGrenade = true;
        }
        return;
      }
      inputRef.current.shooting = false; inputRef.current.shootPressed = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (skipMouse) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      inputRef.current.aimX = e.clientX - rect.left - rect.width / 2;
      inputRef.current.aimY = e.clientY - rect.top - rect.height / 2;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? 1 : -1;
      if (e.ctrlKey) {
        // Ctrl+scroll = cycle grenades
        inputRef.current.cycleThrowable = true;
      } else {
        // Scroll = cycle weapons
        const st = stateRef.current;
        const slots: Array<1 | 2 | 3> = [1, 2, 3];
        const cur = slots.indexOf(st.player.activeSlot);
        const next = slots[(cur + dir + slots.length) % slots.length];
        inputRef.current.switchWeapon = next;
      }
    };

    const resetMovementInput = () => {
      keys.clear();
      inputRef.current.moveX = 0;
      inputRef.current.moveY = 0;
      inputRef.current.moveTarget = null;
      inputRef.current.shooting = false;
      inputRef.current.shootPressed = false;
      inputRef.current.movementMode = 'walk';
    };

    const onWindowBlur = () => resetMovementInput();
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') resetMovementInput();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      updateKeysRef.current = () => {};
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [showInventory, showIntel, readingDoc, isMobile]);

  // Save highscore on tab close / navigate away (abandoned)
  useEffect(() => {
    if (!started || !playerName) return;
    if (playerName.trim().toLowerCase() === 'test123' || playerName.trim().toLowerCase() === 'test3') return;
    const handleUnload = () => {
      const state = stateRef.current;
      if (!state || state.gameOver || state.extracted) return;
      const lootValue = state.player.inventory.reduce((s, i) => s + i.value, 0);
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/highscores`;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          player_name: playerName === '__anonymous__' ? 'Anonymous' : playerName.trim().slice(0, 20),
          kills: state.killCount,
          time_seconds: Math.round(state.time),
          result: 'abandoned',
          loot_value: lootValue,
        }),
        keepalive: true,
      });
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [started, playerName]);

  // Game loop
  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) return;

    const isFirefox = /firefox/i.test(navigator.userAgent);
    const resize = () => {
      const rawDpr = window.devicePixelRatio || 1;
      const maxDpr = isFirefox ? 1 : 2;
      const dpr = Math.min(rawDpr, maxDpr);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    let hudUpdateCounter = 0;
    let reinforcementsSpawned = false;

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const rawDt = (timestamp - lastTimeRef.current) / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTimeRef.current = timestamp;

      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      updateKeysRef.current();
      let currentState = stateRef.current;
      if (!currentState) {
        currentState = safeCreateGameState(selectedMapId);
        stateRef.current = currentState;
      }
      const prevHp = currentState.player.hp;
      const prevKills = currentState.killCount;
      let state = currentState;
      try {
        state = updateGame(currentState, inputRef.current, dt, cssW, cssH) || currentState;
      } catch (error) {
        console.error('Game loop update failed:', error);
      }
      stateRef.current = state;
      inputRef.current.interact = false;
      inputRef.current.shootPressed = false; // clear single-frame flag

      // Haptic feedback on mobile
      if (isMobile) {
        if (state.player.hp < prevHp) hapticDamage();
        if (state.killCount > prevKills) hapticKill();
        if (inputRef.current.shooting) hapticShoot();
      }

      // 5-minute timer — game over with reinforcements
      if (state.time >= TIME_LIMIT && !state.gameOver && !state.extracted && !reinforcementsSpawned) {
        reinforcementsSpawned = true;
        state.gameOver = true;
        state.deathCause = `⏱ Time ran out (${Math.floor(TIME_LIMIT / 60)}:${String(Math.floor(TIME_LIMIT % 60)).padStart(2, '0')}) — overwhelmed by reinforcements`;
        state.messages.push({ text: '🚨 REINFORCEMENTS ARRIVED — YOU ARE OVERWHELMED!', time: state.time, type: 'damage' });
      }

      renderGame(ctx, state, cssW, cssH);




      hudUpdateCounter++;
      const forceUpdate = state.gameOver || state.extracted;
      if (forceUpdate || hudUpdateCounter % 10 === 0) {
        const currentCount = state.player.inventory.length;
        if (currentCount > lastInventoryCountRef.current) {
          const newItems = state.player.inventory.slice(lastInventoryCountRef.current);
          const newNotifs: LootNotification[] = newItems.map((item, i) => ({
            id: `${Date.now()}_${i}`,
            item: { ...item },
            timestamp: Date.now(),
          }));
          setLootNotifications(prev => [...prev, ...newNotifs].slice(-5));
          setTimeout(() => {
            setLootNotifications(prev => prev.filter(n => !newNotifs.find(nn => nn.id === n.id)));
          }, 3000);
        }
        lastInventoryCountRef.current = currentCount;

        setHudState({
          player: { ...state.player },
          killCount: state.killCount,
          messages: [...state.messages],
          extractionProgress: state.extractionProgress,
          time: state.time,
          gameOver: state.gameOver,
          extracted: state.extracted,
          documentsRead: [...state.documentsRead],
          codesFound: [...state.codesFound],
          hasExtractionCode: state.hasExtractionCode,
          movementMode: inputRef.current.movementMode,
          inCover: state.player.inCover,
          peeking: state.player.peeking,
          coverType: ((state as any)._coverType as 'high' | 'low') || 'low',
          canHide: !!(state as any)._canHide,
          isHiding: !!(state as any)._isHiding,
          deathCause: state.deathCause,
          exfilRevealed: state.exfilRevealed,
          achievementStats: {
            mosinKills: state.mosinKills,
            grenadeKills: state.grenadeKills,
            tntKills: state.tntKills,
            longShots: state.longShots,
            headshotKills: state.headshotKills,
            sneakKills: state.sneakKills,
            knifeDistanceKills: state.knifeDistanceKills,
            noHitsTaken: state.noHitsTaken,
            killCount: state.killCount,
            bodiesLooted: state.bodiesLooted,
            cachesLooted: state.cachesLooted,
            wallsBreached: state.wallsBreached,
            documentsCollected: state.documentsCollected,
            terminalsHacked: state.terminalsHacked,
            distanceTravelled: Math.round(state.distanceTravelled / 10),
            exfilsVisited: state.exfilsVisited.size,
            dogsKilled: state.dogsKilled,
            totalDogsOnMap: state.totalDogsOnMap,
          },
          pendingWeapon: state.pendingWeapon,
          noiseLevel: (state as any)._playerNoiseLevel || 0,
          nearInteractable: (() => {
            const p = state.player.pos;
            // Check loot containers, gates, alarm panels, weapon drops, document pickups
            for (const lc of state.lootContainers) {
              if (!lc.looted && Math.hypot(lc.pos.x - p.x, lc.pos.y - p.y) < 70) return true;
            }
            for (const w of state.walls) {
              if (w.color === '#aa4444' && Math.hypot((w.x + w.w/2) - p.x, (w.y + w.h/2) - p.y) < 80) return true;
            }
            for (const ap of state.alarmPanels) {
              if (!ap.hacked && Math.hypot(ap.pos.x - p.x, ap.pos.y - p.y) < 60) return true;
            }
            for (const dp of state.documentPickups) {
              if (!dp.collected && Math.hypot(dp.pos.x - p.x, dp.pos.y - p.y) < 50) return true;
            }
            return false;
          })(),
        });

        // Live objective tracking
        if (hudUpdateCounter % 18 === 0) {
          setObjectives(prev => {
            const next = checkObjectiveCompletion(prev, buildObjectivePayload(state));
            objectivesByMapRef.current[selectedMapId] = next;
            return next;
          });
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    // Start ambient sound for this map
    startAmbient(selectedMapId);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      stopAmbient();
    };
  }, [started]);

  // ── Spectator heartbeat: send live stats every 5s ──
  useEffect(() => {
    if (!started || !playerName || playerName === '__anonymous__') return;
    const isTestUser = playerName.trim().toLowerCase() === 'test123' || playerName.trim().toLowerCase() === 'test3';
    if (isTestUser) return;

    const sendHeartbeat = async (status = 'playing') => {
      const state = stateRef.current;
      if (!state) return;
      try {
        await (supabase as any).from('active_sessions').upsert({
          player_name: playerName,
          map_id: selectedMapId,
          hp: Math.round(state.player.hp),
          max_hp: state.player.maxHp,
          kills: state.killCount,
          rubles: stash.rubles,
          level: stash.level,
          position_x: Math.round(state.player.pos.x),
          position_y: Math.round(state.player.pos.y),
          enemies_alive: state.enemies.filter(e => e.state !== 'dead').length,
          time_elapsed: Math.round(state.time),
          status,
          last_heartbeat: new Date().toISOString(),
        }, { onConflict: 'player_name' });
      } catch { /* silent */ }
    };

    // Initial heartbeat
    sendHeartbeat();
    const interval = setInterval(() => {
      const state = stateRef.current;
      if (!state) return;
      const status = state.gameOver ? 'dead' : state.extracted ? 'extracted' : 'playing';
      sendHeartbeat(status);
    }, 5000);

    return () => {
      clearInterval(interval);
      // Final status update
      const state = stateRef.current;
      if (state) {
        const status = state.extracted ? 'extracted' : state.gameOver ? 'dead' : 'abandoned';
        sendHeartbeat(status);
      }
    };
  }, [started, playerName, selectedMapId]);

  // Handle extraction → transfer loot to stash + check objectives
  useEffect(() => {
    if (hudState.extracted && !extractedRef.current) {
      extractedRef.current = true;
      const state = stateRef.current;
      const lootItems = state.player.inventory.filter(i => i.category !== 'weapon');
      const lootValue = lootItems.reduce((s, i) => s + i.value, 0);

      // Check objective completion
      const completedObjectives = checkObjectiveCompletion(objectives, buildObjectivePayload(state));
      setObjectives(completedObjectives);
      const completed = completedObjectives.filter(o => o.completed);
      const objectiveReward = completed.reduce((s, o) => s + o.reward, 0);
      const objectiveXp = completed.reduce((s, o) => s + Math.floor(o.reward / 2), 0);
      // XP: kills (10 each), extraction bonus (50), loot value (1 per 50₽), objectives
      const killXp = state.killCount * 10;
      const extractionXp = 50;
      const lootXp = Math.floor(lootValue / 50);
      const totalXp = killXp + extractionXp + lootXp + objectiveXp;

      // ── Daily mission rewards ──
      const dailyMissions = getDailyMissions();
      const dailyProg = loadDailyProgress();
      const raidStats: Record<string, number | boolean> = {
        killCount: state.killCount,
        headshotKills: state.headshotKills,
        grenadeKills: state.grenadeKills,
        bodiesLooted: state.bodiesLooted,
        cachesLooted: state.cachesLooted,
        noHitsTaken: state.noHitsTaken,
        longShots: state.longShots,
        wallsBreached: state.wallsBreached,
        documentsCollected: state.documentsCollected,
        dogsNeutralized: state.dogsNeutralized,
        mosinKills: state.mosinKills,
        knifeDistanceKills: state.knifeDistanceKills,
      };
      let dailyRubles = 0;
      let dailyXp = 0;
      for (const dm of dailyMissions) {
        if (!dailyProg.completed.includes(dm.id) && checkDailyCompletion(dm, raidStats)) {
          dailyProg.completed.push(dm.id);
          dailyRubles += dm.reward.rubles;
          dailyXp += dm.reward.xp;
        }
      }
      if (dailyRubles > 0 || dailyXp > 0) {
        saveDailyProgress(dailyProg);
      }

      setStash(prev => {
        const newXp = prev.xp + totalXp + dailyXp;
        const newLevel = getLevelForXp(newXp);
        const updated = {
          ...prev,
          items: [...prev.items, ...lootItems],
          extractionCount: prev.extractionCount + 1,
          rubles: prev.rubles + objectiveReward + dailyRubles,
          xp: newXp,
          level: newLevel,
        };
        persistStash(updated, playerName);
        return updated;
      });
    }
  }, [hudState.extracted]);

  // Phase: intro
  if (gamePhase === 'intro') {
    return (
      <div className="relative w-screen h-[100dvh] overflow-hidden bg-background">
        <IntroScreen onStart={async (name) => {
          setPlayerName(name);
          // Try loading from DB first
          const dbStash = await loadStashFromDb(name);
          if (dbStash) {
            setStash(dbStash);
            saveStash(dbStash); // sync to localStorage too
          }
          setGamePhase('homebase');
        }} />
      </div>
    );
  }

  // Phase: homebase
  if (gamePhase === 'homebase') {
    return (
      <div className="relative w-screen h-[100dvh] overflow-hidden bg-background">
        <HomeBase
          playerName={playerName}
          stash={stash}
          objectives={objectives}
          onDeploy={(mapId: MapId) => {
            setSelectedMapId(mapId);
            inputRef.current = createDefaultInputState();
            // Apply upgrades to game state
            stateRef.current = safeCreateGameState(mapId, stash.level || 1, stash.extractionCount || 0);
            const st = stateRef.current;
            const ups = stash.upgrades;
            // Backpack upgrade
            st.backpackCapacity = getUpgradeLevel(ups, 'backpack') * 4;
            // Helmet/armor upgrade
            st.player.armor = getUpgradeLevel(ups, 'helmet') * 10;
            // Extended mag
            st.player.maxAmmo += getUpgradeLevel(ups, 'ext_mag') * 10;
            st.player.currentAmmo = st.player.maxAmmo;
            // Speed boost
            const speedLvl = getUpgradeLevel(ups, 'sprint_boots');
            if (speedLvl > 0) st.player.speed *= (1 + speedLvl * 0.08);
            // Fire rate (ergonomics)
            const ergoLvl = getUpgradeLevel(ups, 'ergonomics');
            if (ergoLvl > 0) st.player.fireRate *= (1 - ergoLvl * 0.10);
            // Medkit on deploy
            if (getUpgradeLevel(ups, 'medkit_upgrade') > 0) {
              st.player.inventory.push({
                id: 'medkit', name: 'Medkit', category: 'medical', icon: '🏥',
                weight: 0.5, value: 50, healAmount: 40, medicalType: 'medkit',
                description: 'Heals 40 HP',
              });
            }
            // Grenade vest
            const grenadeLvl = getUpgradeLevel(ups, 'grenade_vest');
            for (let i = 0; i < grenadeLvl; i++) {
              st.player.inventory.push({
                id: 'frag_grenade', name: 'F-1 Grenade', category: 'grenade', icon: '💣',
                weight: 0.6, value: 80, damage: 80, description: 'Frag grenade',
              });
            }
            // Emergency Injector — always start with one
            st.player.inventory.push({
              id: 'emergency_injector', name: 'Emergency Injector', category: 'medical', icon: '💉',
              weight: 0.2, value: 350, healAmount: 75, medicalType: 'morphine',
              description: 'Auto-revive to 75 HP when taking lethal damage. Stops bleeding.',
            });
            // Red dot sight — store as flag on game state for engine to use
            const redDotLvl = getUpgradeLevel(ups, 'red_dot');
            if (redDotLvl > 0) (st as any)._bulletSpeedBonus = 0.25;
            // Match-grade barrel — critical hit bonus
            const matchBarrelLvl = getUpgradeLevel(ups, 'match_barrel');
            if (matchBarrelLvl > 0) (st as any)._critChanceBonus = matchBarrelLvl * 0.05;
            // ── NEW SKILL TREE UPGRADES ──
            // Quick Hands — faster reload
            const quickReloadLvl = getUpgradeLevel(ups, 'quick_reload');
            if (quickReloadLvl > 0) (st as any)._reloadSpeedBonus = quickReloadLvl * 0.15;
            // Silent Step — reduced noise
            const silentStepLvl = getUpgradeLevel(ups, 'silent_step');
            if (silentStepLvl > 0) (st as any)._noiseReduction = silentStepLvl * 0.10;
            // Iron Constitution — more HP
            const ironBodyLvl = getUpgradeLevel(ups, 'iron_body');
            if (ironBodyLvl > 0) { st.player.maxHp += ironBodyLvl * 15; st.player.hp = st.player.maxHp; }
            // Pack Mule — extra backpack space
            st.backpackCapacity += getUpgradeLevel(ups, 'big_backpack') * 6;
            // Endurance — more stamina
            const enduranceLvl = getUpgradeLevel(ups, 'endurance');
            if (enduranceLvl > 0) {
              st.player.maxStamina *= (1 + enduranceLvl * 0.20);
              st.player.stamina = st.player.maxStamina;
            }
            // ── Apply weapon mods from stash items ──
            // Auto-attach mods to equipped weapons
            for (const item of stash.items) {
              if (item.category === 'weapon_mod' && st.player.primaryWeapon) {
                const wpn = st.player.primaryWeapon;
                if (!wpn.attachedMods) wpn.attachedMods = [];
                if (item.modType === 'scope' && !wpn.attachedMods.some(m => m.modType === 'scope')) {
                  wpn.bulletSpeed = (wpn.bulletSpeed || 8) * (1 + (item.modBulletSpeedBonus || 0));
                  wpn.attachedMods.push(item);
                } else if (item.modType === 'suppressor' && !wpn.attachedMods.some(m => m.modType === 'suppressor')) {
                  (st as any)._suppressorEquipped = true;
                  wpn.attachedMods.push(item);
                } else if (item.modType === 'ext_magazine' && !wpn.attachedMods.some(m => m.modType === 'ext_magazine')) {
                  st.player.maxAmmo += (item.modMagBonus || 8);
                  st.player.currentAmmo = st.player.maxAmmo;
                  wpn.attachedMods.push(item);
                }
              }
            }

            // ── Test player overrides ──
            const nameLower = playerName.trim().toLowerCase();
            if (nameLower === 'test1') {
              const laser = WEAPON_TEMPLATES.laser();
              st.player.primaryWeapon = laser;
              st.player.inventory.push(laser);
            }
            if (nameLower === 'test2') {
              st.player.pos = { x: 920, y: 620 };
            }

            lastTimeRef.current = 0;
            extractedRef.current = false;
            setStash(prev => {
              const updated = { ...prev, raidCount: prev.raidCount + 1 };
              persistStash(updated, playerName);
              return updated;
            });
            setStarted(true);
            setGamePhase('playing');
            setHudState(h => ({ ...h, gameOver: false, extracted: false }));
          }}
          onSellItem={(idx) => {
            setStash(prev => {
              const item = prev.items[idx];
              if (!item) return prev;
              const updated = {
                ...prev,
                items: prev.items.filter((_, i) => i !== idx),
                rubles: prev.rubles + item.value,
              };
              persistStash(updated, playerName);
              return updated;
            });
          }}
          onSellAll={() => {
            setStash(prev => {
              const total = prev.items.reduce((s, i) => s + i.value, 0);
              const updated = { ...prev, items: [], rubles: prev.rubles + total };
              persistStash(updated, playerName);
              return updated;
            });
          }}
          onBuyUpgrade={(upgradeId) => {
            setStash(prev => {
              const upgrade = UPGRADES.find(u => u.id === upgradeId);
              if (!upgrade) return prev;
              const currentLevel = prev.upgrades[upgradeId] || 0;
              if (currentLevel >= upgrade.maxLevel) return prev;
              const cost = getUpgradeCost(upgrade, currentLevel);
              if (prev.rubles < cost) return prev;
              const updated = {
                ...prev,
                rubles: prev.rubles - cost,
                upgrades: { ...prev.upgrades, [upgradeId]: currentLevel + 1 },
              };
              persistStash(updated, playerName);
              return updated;
            });
          }}
          onBuyTraderItem={(itemId, adjustedCost) => {
            setStash(prev => {
              const traderItem = TRADER_ITEMS.find(t => t.id === itemId);
              if (!traderItem || prev.rubles < adjustedCost) return prev;
              let newItem: Item;
              switch (itemId) {
                case 'buy_injector': newItem = { id: 'emergency_injector', name: 'Emergency Injector', category: 'medical', icon: '💉', weight: 0.2, value: 350, healAmount: 75, medicalType: 'morphine', description: 'Auto-revive to 75 HP when taking lethal damage. Stops bleeding.' } as Item; break;
                case 'buy_bandage': newItem = createMedical('Bandage', 10, '🩹', 'bandage', 3); break;
                case 'buy_medkit': newItem = createMedical('Medkit', 40, '🏥', 'medkit', 1); break;
                case 'buy_morphine': newItem = createMedical('Morphine', 100, '💉', 'morphine', 5, 8); break;
                case 'buy_frag': newItem = createGrenade(); break;
                case 'buy_flashbang': newItem = createFlashbang(); break;
                case 'buy_gas': newItem = createGasGrenade(); break;
                case 'buy_tnt': newItem = createTNT(); break;
                case 'buy_ammo_545': newItem = createAmmo('5.45x39', 20); break;
                case 'buy_ammo_762': newItem = createAmmo('7.62x39', 15); break;
                case 'buy_ammo_54r': newItem = createAmmo('7.62x54R', 10); break;
                case 'buy_armor': newItem = createArmor(); break;
                case 'buy_helmet': newItem = createHelmet(); break;
                case 'buy_goggles': newItem = createGoggles(); break;
                case 'buy_backpack': newItem = createBackpack(); break;
                case 'buy_knife': newItem = WEAPON_TEMPLATES.knife(); break;
                case 'buy_ak74': newItem = WEAPON_TEMPLATES.ak74(); break;
                case 'buy_mosin': newItem = WEAPON_TEMPLATES.mosin(); break;
                case 'buy_toz': newItem = WEAPON_TEMPLATES.toz(); break;
                case 'buy_scope': newItem = createScope(); break;
                case 'buy_suppressor': newItem = createSuppressor(); break;
                case 'buy_ext_mag': newItem = createExtMagazine(); break;
                default: return prev;
              }
              const updated = {
                ...prev,
                rubles: prev.rubles - adjustedCost,
                items: [...prev.items, newItem],
              };
              persistStash(updated, playerName);
              return updated;
            });
          }}
          onCraft={(recipeId) => {
            const recipe = RECIPES.find(r => r.id === recipeId);
            if (!recipe) return;
            setStash(prev => {
              const result = craft(recipe, prev.items);
              if (!result) return prev;
              const updated = {
                ...prev,
                items: [...result.remaining, result.result],
              };
              persistStash(updated, playerName);
              return updated;
            });
          }}
          onRerollObjectives={(cost) => {
            if (cost > 0) {
              setStash(prev => {
                const updated = { ...prev, rubles: prev.rubles - cost };
                persistStash(updated, playerName);
                return updated;
              });
            }
            const nextObjectives = generateMissionObjectives(selectedMapId);
            objectivesByMapRef.current[selectedMapId] = nextObjectives;
            const nextRerollCount = (rerollsByMapRef.current[selectedMapId] || 0) + 1;
            rerollsByMapRef.current[selectedMapId] = nextRerollCount;
            setObjectives(nextObjectives);
            setRerollCount(nextRerollCount);
          }}
          onMapChange={(mapId: MapId) => {
            setSelectedMapId(mapId);
            if (!objectivesByMapRef.current[mapId]) {
              objectivesByMapRef.current[mapId] = generateMissionObjectives(mapId);
            }
            if (rerollsByMapRef.current[mapId] == null) {
              rerollsByMapRef.current[mapId] = 0;
            }
            setObjectives(objectivesByMapRef.current[mapId]);
            setRerollCount(rerollsByMapRef.current[mapId]);
          }}
          onReturnToMenu={() => {
            setGamePhase('intro');
            setStarted(false);
          }}
          rerollCount={rerollCount}
        />
      </div>
    );
  }

  // Phase: playing
  const equippedWeaponRefs = new Set<Item>(
    [hudState.player.primaryWeapon, hudState.player.sidearm].filter((w): w is Item => Boolean(w))
  );
  const backpackEntries = hudState.player.inventory.reduce<Array<{ item: Item; originalIndex: number }>>((acc, item, originalIndex) => {
    const isEquippedWeapon = item.category === 'weapon' && equippedWeaponRefs.has(item);
    const isThrowable = item.category === 'grenade' || item.category === 'flashbang';
    if (!isEquippedWeapon && !isThrowable) acc.push({ item, originalIndex });
    return acc;
  }, []);
  const backpackItems = backpackEntries.map((entry) => entry.item);

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-background touch-none">
      <div className="relative w-full h-full">
        <canvas ref={canvasRef} className="block w-full h-full touch-none" />

        {showFirefoxWarning && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
            <div className="max-w-md rounded border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
              <p className="text-xs font-mono text-foreground">
                <span className="text-warning">Firefox detected:</span> spelet kan vara snabbare i Chrome eller Edge.
              </p>
              <div className="mt-2 flex justify-end">
                <button
                  className="rounded border border-border bg-secondary px-2 py-1 text-xs font-mono text-secondary-foreground hover:bg-secondary/80"
                  onClick={() => {
                    setShowFirefoxWarning(false);
                    window.sessionStorage.setItem(FIREFOX_WARNING_KEY, '1');
                  }}
                >
                  Stäng
                </button>
              </div>
            </div>
          </div>
        )}
        
        <HUD
          player={hudState.player}
          killCount={hudState.killCount}
          messages={hudState.messages}
          extractionProgress={hudState.extractionProgress}
          time={hudState.time}
          gameOver={hudState.gameOver}
          extracted={hudState.extracted}
          documentsFound={hudState.documentsRead.length}
          totalDocuments={LORE_DOCUMENTS.length}
          codesFound={hudState.codesFound}
          hasExtractionCode={hudState.hasExtractionCode}
          movementMode={hudState.movementMode}
          inCover={hudState.inCover}
          peeking={hudState.peeking}
          coverType={hudState.coverType}
          canHide={hudState.canHide}
          isHiding={hudState.isHiding}
          onViewDocuments={() => { setShowIntel(true); }}
          timeLimit={TIME_LIMIT}
          playerName={playerName}
          deathCause={hudState.deathCause}
          exfilRevealed={hudState.exfilRevealed}
          achievementStats={hudState.achievementStats}
          objectives={objectives}
          activeUpgrades={stash.upgrades}
          isMobile={isMobile}
          mapId={selectedMapId}
          onReturnToBase={() => {
            setStarted(false);
            setGamePhase('homebase');
            // Reroll objectives for next raid
            const nextObjectives = generateMissionObjectives(selectedMapId);
            objectivesByMapRef.current[selectedMapId] = nextObjectives;
            rerollsByMapRef.current[selectedMapId] = 0;
            setObjectives(nextObjectives);
            setRerollCount(0);
          }}
        />

        <LootPopup notifications={lootNotifications} />

        {/* Mobile controls — joystick + action buttons */}
        {isMobile && (
          <MobileControls
            inputRef={inputRef}
            stateRef={stateRef}
            onToggleInventory={() => { setShowInventory(v => !v); setShowIntel(false); }}
            onToggleIntel={() => { setShowIntel(v => !v); setShowInventory(false); }}
            onCloseDoc={() => setReadingDoc(null)}
            movementMode={hudState.movementMode}
            hasDoc={!!readingDoc}
            nearInteractable={hudState.nearInteractable}
          />
        )}

        {/* Desktop hints */}
        {!isMobile && (
          <div className="absolute bottom-2 left-3 text-[9px] text-muted-foreground/40 font-mono">
            WASD move · Shift sprint · Ctrl sneak · Q cover · E loot · R reload · H heal · G throw · MMB rock · Tab bag · 1-3 weapons
          </div>
        )}

        {/* Mode toggle — top-left corner */}
        <div className="absolute top-[max(0.5rem,env(safe-area-inset-top))] left-2 z-50 pointer-events-auto flex gap-1">
          <button
            className="px-2 py-1 rounded text-[9px] font-mono bg-card/60 border border-border/40 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileOverride(prev => prev === null ? !autoMobile : !prev)}
          >
            {isMobile ? 'Desktop' : 'Mobil'}
          </button>
          <button
            className="px-2 py-1 rounded text-[9px] font-mono bg-card/60 border border-border/40 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              const next: GraphicsQuality = getGraphicsQuality() === 'high' ? 'low' : 'high';
              setGraphicsQuality(next);
              setGfxQuality(next);
            }}
          >
            GFX: {gfxQuality === 'high' ? '🔥' : '⚡'}
          </button>
          <button
            className="px-2 py-1 rounded text-[9px] font-mono bg-card/60 border border-border/40 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              const order: RenderDistance[] = ['far', 'normal', 'near'];
              const idx = order.indexOf(renderDist);
              const next = order[(idx + 1) % order.length];
              setRenderDistance(next);
              setRenderDist(next);
            }}
          >
            🔭 {renderDist === 'far' ? 'FAR' : renderDist === 'normal' ? 'MED' : 'NEAR'}
          </button>
        </div>

        {/* Inventory Panel */}
        {showInventory && (
          <div className={`absolute z-30 ${isMobile ? 'top-10 left-1/2 -translate-x-1/2' : 'top-12 right-3'}`}>
            <InventoryPanel
              items={backpackItems}
              inCover={hudState.inCover}
              maxSlots={12 + (stateRef.current?.backpackCapacity || 0)}
              onDropItem={(idx) => {
                const entry = backpackEntries[idx];
                if (!entry || !stateRef.current) return;
                const dropped = stateRef.current.player.inventory.splice(entry.originalIndex, 1);
                if (dropped.length > 0) {
                  stateRef.current.lootContainers.push({
                    id: `drop_${Date.now()}`,
                    pos: { x: stateRef.current.player.pos.x + (Math.random() - 0.5) * 30, y: stateRef.current.player.pos.y + (Math.random() - 0.5) * 30 },
                    size: 20,
                    items: dropped,
                    looted: false,
                    type: 'body',
                  });
                }
              }}
            />
          </div>
        )}
      </div>

      <IntelPanel
        open={showIntel}
        onClose={() => setShowIntel(false)}
        documentsRead={hudState.documentsRead}
        codesFound={hudState.codesFound}
        onReadDocument={(doc) => { setReadingDoc(doc); setShowIntel(false); }}
      />
      <DocumentReader document={readingDoc} onClose={() => setReadingDoc(null)} />
    </div>
  );
};
