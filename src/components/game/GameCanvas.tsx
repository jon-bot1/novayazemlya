import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createGameState, updateGame } from '../../game/engine';
import { renderGame } from '../../game/renderer';
import { GameState, InputState, Item } from '../../game/types';
import { LORE_DOCUMENTS } from '../../game/lore';
import { LoreDocument } from '../../game/lore';
import { ActionButton } from './TouchControls';
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
import { createMedical, createGrenade, createFlashbang, createGasGrenade, createTNT, createAmmo, createArmor, createHelmet, createGoggles, createBackpack, WEAPON_TEMPLATES } from '../../game/items';
import { supabase } from '@/integrations/supabase/client';

const TIME_LIMIT = 300; // 5 minutes

const IntroScreen: React.FC<{ onStart: (name: string) => void }> = ({ onStart }) => {
  const [name, setName] = React.useState('');
  const [anonymous, setAnonymous] = React.useState(false);
  
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

  const [tab, setTab] = React.useState<'briefing' | 'characters' | 'updates' | 'highscores'>('briefing');

  return (
  <div className="absolute inset-0 flex items-center justify-center bg-background z-50">
    <div className="max-w-lg w-full mx-4 flex flex-col gap-4 p-8 border border-border bg-card rounded max-h-[95vh] overflow-y-auto">
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
          autoFocus={!anonymous}
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

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        <button
          className={`px-4 py-2 text-xs font-display uppercase tracking-wider transition-colors ${tab === 'briefing' ? 'text-accent border-b-2 border-accent' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setTab('briefing')}
        >
          📋 Briefing
        </button>
        <button
          className={`px-4 py-2 text-xs font-display uppercase tracking-wider transition-colors ${tab === 'characters' ? 'text-accent border-b-2 border-accent' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setTab('characters')}
        >
          👤 Characters
        </button>
        <button
          className={`px-4 py-2 text-xs font-display uppercase tracking-wider transition-colors ${tab === 'updates' ? 'text-accent border-b-2 border-accent' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setTab('updates')}
        >
          📡 Updates
        </button>
        <button
          className={`px-4 py-2 text-xs font-display uppercase tracking-wider transition-colors ${tab === 'highscores' ? 'text-accent border-b-2 border-accent' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setTab('highscores')}
        >
          🏆 Highscores
        </button>
      </div>

      {tab === 'characters' && (
        <>
          <div className="text-[10px] font-mono text-muted-foreground italic mb-1">
            PERSONNEL DOSSIER — Objekt 47 "Severnyj Vektor"
          </div>

          {/* Boss */}
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
            <h2 className="text-sm font-display text-warning uppercase tracking-wider mb-2">📋 Mission Briefing</h2>
            <p className="text-xs font-mono text-foreground/80 leading-relaxed">
              You operate from a <span className="text-accent">Safe House</span> between raids. 
              Each mission, you deploy to <span className="text-accent">Objekt 47 "Severnyj Vektor"</span> with 
              randomized <span className="text-warning">objectives</span> — main targets and bonus tasks that pay rubles.
            </p>
            <p className="text-xs font-mono text-foreground/80 leading-relaxed mt-2">
              <span className="text-danger">Eliminate targets</span>, <span className="text-loot">recover intel</span>, 
              <span className="text-warning">sabotage assets</span>, or <span className="text-accent">discover hidden passages</span>. 
              Extract alive to bring loot back to your stash. Sell loot for rubles, buy <span className="text-warning">upgrades</span> from Trader Sidorov.
            </p>
            <p className="text-xs font-mono text-foreground/80 leading-relaxed mt-2">
              Your gear persists between raids. Die and you lose everything you carried.
              You have <span className="text-warning">5 minutes</span> per raid before reinforcements overrun the base.
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
              <li>• <span className="text-warning">Gunfire alerts nearby enemies</span> — they will investigate & call for backup</li>
              <li>• <span className="text-danger">⚠ MINEFIELD</span> in the southwest compound — instant death!</li>
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
              <div className="text-accent font-display text-[11px] uppercase tracking-wider mb-1">v0.15 — 2026-02-27</div>
                <ul className="text-[11px] text-foreground/80 space-y-0.5 ml-2">
                  <li>• ⚡ <span className="text-accent">Performance overhaul</span> — spatial hash grids, viewport culling, particle caps</li>
                  <li>• 🐌 <span className="text-foreground">Movement speed -10%</span> — all units move slower for more tactical gameplay</li>
                  <li>• 🔫 <span className="text-accent">Increased weapon drops</span> — more weapons in crates, cabinets and enemy bodies</li>
                  <li>• 🎯 <span className="text-accent">10 new objectives</span> — Old Faithful, Pacifist, Demolitions Expert, Dog Whisperer & more</li>
                  <li>• 🗡️ Silent Blade — kill 3 with knife | 📢 Hearts & Minds — convert an enemy who gets a kill</li>
                  <li>• ⚡ Distant Thunder — 2 extreme range kills | 📚 Archivist — collect all documents</li>
                </ul>
              </div>
              <div className="text-xs font-mono">
              <div className="text-accent font-display text-[11px] uppercase tracking-wider mb-1">v0.14 — 2026-02-27</div>
                <ul className="text-[11px] text-foreground/80 space-y-0.5 ml-2">
                  <li>• 🔫 <span className="text-accent">Shotgun (TOZ-34)</span> — fires 5 pellets in a cone, devastating at close range</li>
                  <li>• 🤠 <span className="text-warning">Redneck enemies</span> — patrol outside with shotguns and speech bubbles</li>
                  <li>• 🐕 <span className="text-warning">Guard Dogs</span> — fast melee companions that follow their redneck owner</li>
                  <li>• 🦴 <span className="text-accent">Dog Food</span> — neutralize dogs without killing (buy from trader)</li>
                  <li>• 📢 <span className="text-accent">Propaganda Leaflet</span> — convince an enemy to fight for you for 60s</li>
                  
                  <li>• 💬 <span className="text-foreground">Speech Bubbles</span> — enemies react with dialogue during combat</li>
                  <li>• 🎒 <span className="text-accent">Special Slot [X]</span> — new item slot for tactical items</li>
                </ul>
              </div>
              <div className="text-xs font-mono">
              <div className="text-accent font-display text-[11px] uppercase tracking-wider mb-1">v0.13 — 2026-02-26</div>
                <ul className="text-[11px] text-foreground/80 space-y-0.5 ml-2">
                  <li>• 🗡️ <span className="text-accent">3-Slot Weapon System</span> — [1] Melee, [2] Secondary, [3] Primary</li>
                  <li>• 🗡️ <span className="text-accent">Permanent melee weapon</span> — Combat Knife always available, never breaks</li>
                  <li>• ✈️ <span className="text-warning">Airplane sabotage</span> — can now be destroyed with grenades or melee, not just TNT</li>
                  <li>• 💳 <span className="text-warning">Access Card consumed</span> on gate use — plan your route carefully</li>
                  <li>• 🚪 <span className="text-accent">Secret passage hint</span> — "Something feels different..." when nearby</li>
                  <li>• 🎯 Sniper spawn distance fully randomized, observes before engaging</li>
                  <li>• ☠️ Death screen now shows both "Return to Base" and "Main Menu" buttons</li>
                </ul>
              </div>
              <div className="text-xs font-mono">
              <div className="text-accent font-display text-[11px] uppercase tracking-wider mb-1">v0.12 — 2026-02-26</div>
                <ul className="text-[11px] text-foreground/80 space-y-0.5 ml-2">
                  <li>• 💉 <span className="text-accent">Emergency Injector</span> — auto-revives you at 0 HP, restoring 75 HP & stopping bleed</li>
                  <li>• 💉 Start every raid with 1 injector — buy extras from Trader Sidorov (350₽)</li>
                  <li>• 💉 <span className="text-warning">HUD indicator</span> shows injector status clearly (green = ready, red = empty)</li>
                  <li>• 🩹 <span className="text-accent">Bleeding now stops naturally</span> — light bleeds ~3s, heavy bleeds ~10s</li>
                  <li>• 🔫 <span className="text-warning">Weapon drop rates reduced 15%</span> across all enemy types for better balance</li>
                  <li>• 🎒 <span className="text-accent">Backpack redesign</span> — visual backpack outline with clickable item slots</li>
                </ul>
              </div>
              <div className="text-xs font-mono">
              <div className="text-accent font-display text-[11px] uppercase tracking-wider mb-1">v0.11 — 2026-02-26</div>
                <ul className="text-[11px] text-foreground/80 space-y-0.5 ml-2">
                  <li>• 🏠 <span className="text-accent">Safe House</span> — persistent hideout between raids with stash, trader & missions</li>
                  <li>• 🎯 <span className="text-warning">Dynamic Missions</span> — randomized main + bonus objectives each raid</li>
                  <li>• 🏪 <span className="text-loot">Trader Sidorov</span> — buy upgrades: Red Dot, Tac Boots, Extended Mag & more</li>
                  <li>• 📦 Inventory panel: drop items from your inventory during raids</li>
                  <li>• 🔫 <span className="text-warning">Weapon durability</span> — guns degrade with use, losing fire rate & accuracy</li>
                  <li>• 🔫 Sidearms have infinite durability, Mosin immune to accuracy loss</li>
                  <li>• 🩹 <span className="text-accent">All enemies can heal</span> if they carry bandages — interrupt them!</li>
                  <li>• 💡 Contextual hints for grenades & TNT when you haven't used them</li>
                  <li>• 🚪 Secret passage area now has visual ground markings</li>
                  <li>• 🎖️ Officers guaranteed outside walls with keycards</li>
                  <li>• 👁️ Enemies no longer track players through walls</li>
                  <li>• 🎯 Sniper spawns restricted to northern zones with longer flee distance</li>
                </ul>
              </div>
              <div className="text-xs font-mono">
              <div className="text-accent font-display text-[11px] uppercase tracking-wider mb-1">v0.10 — 2026-02-26</div>
                <ul className="text-[11px] text-foreground/80 space-y-0.5 ml-2">
                  <li>• 💣 Grenade charge throw: hold right-click for longer range</li>
                  <li>• 🥽 Tactical Goggles — 50% flashbang protection (drops from Shockers)</li>
                  <li>• 🔫 Sniper Tuman: reacts to near-misses, can't see hidden players</li>
                  <li>• 😱 Panic fire shoots away from player</li>
                  <li>• ✈️ Airplane prop, toxic barrels, cover indicators</li>
                  <li>• 📦 20 new loot items, reduced ammo drop rates</li>
                </ul>
              </div>
              <div className="text-xs font-mono">
              <div className="text-accent font-display text-[11px] uppercase tracking-wider mb-1">v0.9 — 2026-02-26</div>
                <ul className="text-[11px] text-foreground/80 space-y-0.5 ml-2">
                  <li>• Auto-cover near obstacles, hide mechanic (Q near trees)</li>
                  <li>• 25% movement speed reduction</li>
                  <li>• Weapon swap popup with confirmation</li>
                  <li>• Sniper healing on teleport, berserk stop distance</li>
                  <li>• ⚡ Shocker troops with electric sparks</li>
                </ul>
              </div>
              <div className="text-xs font-mono">
              <div className="text-accent font-display text-[11px] uppercase tracking-wider mb-1">v0.8 — 2026-02-24</div>
                <ul className="text-[11px] text-foreground/80 space-y-0.5 ml-2">
                  <li>• Weapon slot system: primary + secondary</li>
                  <li>• New enemy: ⚡ Shocker, new secondary weapons</li>
                  <li>• Officer spawn rate 3-5 per raid</li>
                </ul>
              </div>
              <div className="text-xs font-mono">
                <div className="text-muted-foreground font-display text-[11px] uppercase tracking-wider mb-1">v0.1–0.7</div>
                <ul className="text-[11px] text-foreground/80 space-y-0.5 ml-2">
                  <li>• Core combat, boss fight, tactical AI, TNT breaching</li>
                  <li>• Achievements, highscores, intel documents</li>
                  <li>• Cover system, medical system, extraction zones</li>
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
async function syncStashToDb(playerName: string, stash: StashState) {
  if (!playerName || playerName === '__anonymous__' || playerName.trim().toLowerCase() === 'test123') return;
  try {
    const name = playerName.trim().slice(0, 20);
    const { data } = await supabase.from('player_progress').select('id').eq('player_name', name).maybeSingle();
    if (data) {
      await supabase.from('player_progress').update({
        rubles: stash.rubles,
        raid_count: stash.raidCount,
        extraction_count: stash.extractionCount,
        stash_items: stash.items as any,
        upgrades: stash.upgrades as any,
        xp: stash.xp,
        level: stash.level,
      }).eq('player_name', name);
    } else {
      await supabase.from('player_progress').insert({
        player_name: name,
        rubles: stash.rubles,
        raid_count: stash.raidCount,
        extraction_count: stash.extractionCount,
        stash_items: stash.items as any,
        upgrades: stash.upgrades as any,
        xp: stash.xp,
        level: stash.level,
      });
    }
  } catch (e) {
    console.error('Failed to sync stash to DB:', e);
  }
}

async function loadStashFromDb(playerName: string): Promise<StashState | null> {
  if (!playerName || playerName === '__anonymous__' || playerName.trim().toLowerCase() === 'test123') return null;
  try {
    const name = playerName.trim().slice(0, 20);
    const { data } = await supabase.from('player_progress').select('*').eq('player_name', name).maybeSingle();
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
  const stateRef = useRef<GameState>(createGameState());
  const inputRef = useRef<InputState>({ moveX: 0, moveY: 0, aimX: 0, aimY: 0, shooting: false, shootPressed: false, interact: false, heal: false, throwGrenade: false, cycleThrowable: false, movementMode: 'walk', moveTarget: null, takeCover: false, useTNT: false, useSpecial: false, reload: false });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const moveTouchRef = useRef<number | null>(null);
  const aimTouchRef = useRef<number | null>(null);
  const [started, setStarted] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [gamePhase, setGamePhase] = useState<'intro' | 'homebase' | 'playing'>('intro');
  const [stash, setStash] = useState<StashState>(loadStash);
  const [objectives, setObjectives] = useState<MissionObjective[]>(() => generateMissionObjectives());
  const [rerollCount, setRerollCount] = useState(0);
  const extractedRef = useRef(false); // prevent double extraction
  const dbSyncedRef = useRef(false); // track if we loaded from DB

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
  });
  const [showInventory, setShowInventory] = useState(false);
  const [showIntel, setShowIntel] = useState(false);
  const [readingDoc, setReadingDoc] = useState<LoreDocument | null>(null);
  const [lootNotifications, setLootNotifications] = useState<LootNotification[]>([]);
  const lastInventoryCountRef = useRef<number>(stateRef.current.player.inventory.length);

  // Keyboard input (desktop)
  useEffect(() => {
    const keys = new Set<string>();

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
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.delete(k);
      if (e.code) keys.delete(e.code.toLowerCase());
      if (k === 'e') inputRef.current.interact = false;
      if (e.key === 'Shift') inputRef.current.movementMode = 'walk';
      if (e.key === 'Control' || k === 'c') inputRef.current.movementMode = 'walk';
    };

    const onMouseDown = (e: MouseEvent) => {
      unlockSpeech();
      if ((e.target as HTMLElement).closest('button, [role="button"], .pointer-events-auto')) return;
      if (showInventory || showIntel || readingDoc) return;
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
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      inputRef.current.aimX = e.clientX - rect.left - rect.width / 2;
      inputRef.current.aimY = e.clientY - rect.top - rect.height / 2;
    };

    const updateKeys = () => {
      let mx = 0, my = 0;
      if (keys.has('w') || keys.has('arrowup') || keys.has('keyw')) my -= 1;
      if (keys.has('s') || keys.has('arrowdown') || keys.has('keys')) my += 1;
      if (keys.has('a') || keys.has('arrowleft') || keys.has('keya')) mx -= 1;
      if (keys.has('d') || keys.has('arrowright') || keys.has('keyd')) mx += 1;
      inputRef.current.moveX = mx;
      inputRef.current.moveY = my;
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

    const interval = setInterval(updateKeys, 16);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('wheel', onWheel);
    };
  }, [showInventory, showIntel, readingDoc]);

  // Touch input
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const screenToWorld = (clientX: number, clientY: number) => {
      const cam = stateRef.current.camera;
      const w = window.innerWidth;
      const h = window.innerHeight;
      return { x: cam.x + (clientX - w / 2), y: cam.y + (clientY - h / 2) };
    };

    const findEnemyAtWorld = (wx: number, wy: number) => {
      const hitRadius = 30;
      for (const enemy of stateRef.current.enemies) {
        if (enemy.state === 'dead') continue;
        const dx = enemy.pos.x - wx;
        const dy = enemy.pos.y - wy;
        if (Math.sqrt(dx * dx + dy * dy) < hitRadius) return enemy;
      }
      return null;
    };

    const findInteractableAtWorld = (wx: number, wy: number) => {
      const radius = 40;
      const st = stateRef.current;
      for (const lc of st.lootContainers) {
        if (!lc.looted && Math.sqrt((lc.pos.x - wx) ** 2 + (lc.pos.y - wy) ** 2) < radius) return true;
      }
      for (const dp of st.documentPickups) {
        if (!dp.collected && Math.sqrt((dp.pos.x - wx) ** 2 + (dp.pos.y - wy) ** 2) < radius) return true;
      }
      for (const enemy of st.enemies) {
        if (enemy.state === 'dead' && !enemy.looted && Math.sqrt((enemy.pos.x - wx) ** 2 + (enemy.pos.y - wy) ** 2) < radius) return true;
      }
      return false;
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      unlockSpeech();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const world = screenToWorld(t.clientX, t.clientY);
        const enemy = findEnemyAtWorld(world.x, world.y);
        if (enemy) {
          aimTouchRef.current = t.identifier;
          const dx = world.x - stateRef.current.player.pos.x;
          const dy = world.y - stateRef.current.player.pos.y;
          inputRef.current.aimX = dx;
          inputRef.current.aimY = dy;
          inputRef.current.shooting = true;
        } else if (findInteractableAtWorld(world.x, world.y)) {
          moveTouchRef.current = t.identifier;
          inputRef.current.moveTarget = world;
          inputRef.current.moveX = 0;
          inputRef.current.moveY = 0;
          inputRef.current.interact = true;
        } else {
          moveTouchRef.current = t.identifier;
          inputRef.current.moveTarget = world;
          inputRef.current.moveX = 0;
          inputRef.current.moveY = 0;
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === moveTouchRef.current) {
          inputRef.current.moveTarget = screenToWorld(t.clientX, t.clientY);
        }
        if (t.identifier === aimTouchRef.current) {
          const world = screenToWorld(t.clientX, t.clientY);
          inputRef.current.aimX = world.x - stateRef.current.player.pos.x;
          inputRef.current.aimY = world.y - stateRef.current.player.pos.y;
          inputRef.current.shooting = true;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === moveTouchRef.current) moveTouchRef.current = null;
        if (t.identifier === aimTouchRef.current) { aimTouchRef.current = null; inputRef.current.shooting = false; }
      }
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  // Save highscore on tab close / navigate away (abandoned)
  useEffect(() => {
    if (!started || !playerName) return;
    if (playerName.trim().toLowerCase() === 'test123') return;
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    let hudUpdateCounter = 0;
    let lastDocCheck = '';
    let reinforcementsSpawned = false;

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const rawDt = (timestamp - lastTimeRef.current) / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTimeRef.current = timestamp;

      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      const state = updateGame(stateRef.current, inputRef.current, dt, cssW, cssH);
      stateRef.current = state;
      inputRef.current.interact = false;
      inputRef.current.shootPressed = false; // clear single-frame flag

      // 5-minute timer — game over with reinforcements
      if (state.time >= TIME_LIMIT && !state.gameOver && !state.extracted && !reinforcementsSpawned) {
        reinforcementsSpawned = true;
        state.gameOver = true;
        state.deathCause = `⏱ Time ran out (${Math.floor(TIME_LIMIT / 60)}:${String(Math.floor(TIME_LIMIT % 60)).padStart(2, '0')}) — overwhelmed by reinforcements`;
        state.messages.push({ text: '🚨 REINFORCEMENTS ARRIVED — YOU ARE OVERWHELMED!', time: state.time, type: 'damage' });
      }

      renderGame(ctx, state, cssW, cssH);

      // Check for new documents
      const docKey = state.documentsRead.join(',');
      if (docKey !== lastDocCheck && state.documentsRead.length > 0) {
        const newDocId = state.documentsRead[state.documentsRead.length - 1];
        const doc = LORE_DOCUMENTS.find(d => d.id === newDocId);
        if (doc && docKey !== lastDocCheck) setReadingDoc(doc);
        lastDocCheck = docKey;
      }

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
          },
          pendingWeapon: state.pendingWeapon,
        });

        // Live objective tracking
        if (hudUpdateCounter % 18 === 0) {
          const bossKilled = state.enemies.some(e => e.type === 'boss' && e.state === 'dead');
          const sniperKilled = state.enemies.some(e => e.type === 'sniper' && e.state === 'dead');
          const lootVal = state.player.inventory.reduce((s, i) => s + i.value, 0);
          setObjectives(prev => checkObjectiveCompletion(prev, {
            bossKilled,
            sniperKilled,
            terminalsHacked: state.terminalsHacked,
            documentsCollected: state.documentsCollected,
            killCount: state.killCount,
            headshotKills: state.headshotKills,
            lootValue: lootVal,
            alarmTriggered: !!(state as any)._alarmEverTriggered,
            bodiesLooted: state.bodiesLooted,
            timeSeconds: state.time,
            tntPlacedOnPlane: !!(state as any)._tntOnPlane,
            foundSecret: !!(state as any)._foundSecret,
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
          }));
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [started]);

  // Handle extraction → transfer loot to stash + check objectives
  useEffect(() => {
    if (hudState.extracted && !extractedRef.current) {
      extractedRef.current = true;
      const state = stateRef.current;
      const lootItems = state.player.inventory.filter(i => i.category !== 'weapon');
      const lootValue = lootItems.reduce((s, i) => s + i.value, 0);

      // Check objective completion
      const bossKilled = state.enemies.some(e => e.type === 'boss' && e.state === 'dead');
      const sniperKilled = state.enemies.some(e => e.type === 'sniper' && e.state === 'dead');
      const completedObjectives = checkObjectiveCompletion(objectives, {
        bossKilled,
        sniperKilled,
        terminalsHacked: state.terminalsHacked,
        documentsCollected: state.documentsCollected,
        killCount: state.killCount,
        headshotKills: state.headshotKills,
        lootValue,
        alarmTriggered: !!(state as any)._alarmEverTriggered,
        bodiesLooted: state.bodiesLooted,
        timeSeconds: state.time,
        tntPlacedOnPlane: !!(state as any)._tntOnPlane,
        foundSecret: !!(state as any)._foundSecret,
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
      });
      setObjectives(completedObjectives);
      const objectiveReward = completedObjectives.filter(o => o.completed).reduce((s, o) => s + o.reward, 0);
      const objectiveXp = completedObjectives.filter(o => o.completed).reduce((s, o) => s + Math.floor(o.reward / 2), 0);
      // XP: kills (10 each), extraction bonus (50), loot value (1 per 50₽), objectives
      const killXp = state.killCount * 10;
      const extractionXp = 50;
      const lootXp = Math.floor(lootValue / 50);
      const totalXp = killXp + extractionXp + lootXp + objectiveXp;

      setStash(prev => {
        const newXp = prev.xp + totalXp;
        const newLevel = getLevelForXp(newXp);
        const updated = {
          ...prev,
          items: [...prev.items, ...lootItems],
          extractionCount: prev.extractionCount + 1,
          rubles: prev.rubles + objectiveReward,
          xp: newXp,
          level: newLevel,
        };
        saveStash(updated);
        syncStashToDb(playerName, updated);
        return updated;
      });
    }
  }, [hudState.extracted]);

  // Phase: intro
  if (gamePhase === 'intro') {
    return (
      <div className="relative w-screen h-screen overflow-hidden bg-background">
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
      <div className="relative w-screen h-screen overflow-hidden bg-background">
        <HomeBase
          playerName={playerName}
          stash={stash}
          objectives={objectives}
          onDeploy={() => {
            // Apply upgrades to game state
            stateRef.current = createGameState();
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

            lastTimeRef.current = 0;
            extractedRef.current = false;
            setStash(prev => {
              const updated = { ...prev, raidCount: prev.raidCount + 1 };
              saveStash(updated);
              syncStashToDb(playerName, updated);
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
              saveStash(updated);
              syncStashToDb(playerName, updated);
              return updated;
            });
          }}
          onSellAll={() => {
            setStash(prev => {
              const total = prev.items.reduce((s, i) => s + i.value, 0);
              const updated = { ...prev, items: [], rubles: prev.rubles + total };
              saveStash(updated);
              syncStashToDb(playerName, updated);
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
              saveStash(updated);
              syncStashToDb(playerName, updated);
              return updated;
            });
          }}
          onBuyTraderItem={(itemId) => {
            setStash(prev => {
              const traderItem = TRADER_ITEMS.find(t => t.id === itemId);
              if (!traderItem || prev.rubles < traderItem.cost) return prev;
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
                default: return prev;
              }
              const updated = {
                ...prev,
                rubles: prev.rubles - traderItem.cost,
                items: [...prev.items, newItem],
              };
              saveStash(updated);
              syncStashToDb(playerName, updated);
              return updated;
            });
          }}
          onRerollObjectives={(cost) => {
            if (cost > 0) {
              setStash(prev => {
                const updated = { ...prev, rubles: prev.rubles - cost };
                saveStash(updated);
                syncStashToDb(playerName, updated);
                return updated;
              });
            }
            setObjectives(generateMissionObjectives());
            setRerollCount(c => c + 1);
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
    <div className="relative w-screen h-screen overflow-hidden bg-background touch-none">
      <div className="relative w-full h-full">
        <canvas ref={canvasRef} className="block w-full h-full touch-none" />
        
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
          onReturnToBase={() => {
            setStarted(false);
            setGamePhase('homebase');
            // Reroll objectives for next raid
            setObjectives(generateMissionObjectives());
            setRerollCount(0);
          }}
        />

        <LootPopup notifications={lootNotifications} />

        {/* Weapon swap now uses E-press — no popup needed */}

        {/* Mobile action buttons */}
        <div className="sm:hidden">
          <ActionButton label="🔍" onPress={() => { inputRef.current.interact = true; inputRef.current.shooting = false; }} className="absolute bottom-24 left-1/2 -translate-x-1/2" />
          <ActionButton label="💊" onPress={() => { inputRef.current.heal = true; inputRef.current.shooting = false; }} className="absolute bottom-24 left-1/2 translate-x-8" variant="action" />
          <ActionButton label="💣" onPress={() => { inputRef.current.throwGrenade = true; inputRef.current.shooting = false; }} className="absolute bottom-24 left-1/2 -translate-x-16" variant="action" />
          <ActionButton label="🛡️" onPress={() => { inputRef.current.takeCover = true; inputRef.current.shooting = false; }} className="absolute bottom-24 left-1/2 translate-x-20" variant="action" />
          <ActionButton label="📄" onPress={() => setShowIntel(v => !v)} className="absolute top-14 right-3" variant="action" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-auto">
            {(['sneak', 'walk', 'sprint'] as const).map(mode => {
              const icons = { sneak: '🤫', walk: '🚶', sprint: '🏃' };
              const labels = { sneak: 'SNEAK', walk: 'WALK', sprint: 'SPRINT' };
              const isActive = inputRef.current.movementMode === mode;
              return (
                <button
                  key={mode}
                  className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors touch-none select-none
                    ${isActive
                      ? 'bg-primary/60 border-primary text-primary-foreground'
                      : 'bg-secondary/30 border-border/40 text-muted-foreground'
                    }`}
                  onTouchStart={(e) => { e.preventDefault(); inputRef.current.movementMode = mode; }}
                  onMouseDown={() => { inputRef.current.movementMode = mode; }}
                >
                  {icons[mode]} {labels[mode]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="sm:hidden absolute bottom-1 left-2 right-2 text-center text-[10px] text-muted-foreground/50 pointer-events-none">
          Tap to move · Tap enemy to shoot
        </div>

        <div className="hidden sm:block absolute bottom-3 left-3 text-xs text-muted-foreground font-mono opacity-60">
          WASD move | Shift sprint | Ctrl sneak | Q/Space cover | Mouse aim+shoot | E loot/swap | R reload | H heal | G grenade | 1 melee | 2 sidearm | 3 primary
        </div>
        {/* Inventory Panel — always visible, compact overlay */}
        <div className="absolute top-[340px] right-3 z-30">
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
