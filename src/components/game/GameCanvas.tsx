import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createGameState, updateGame } from '../../game/engine';
import { renderGame } from '../../game/renderer';
import { GameState, InputState, Item } from '../../game/types';
import { LORE_DOCUMENTS } from '../../game/lore';
import { LoreDocument } from '../../game/lore';
import { ActionButton } from './TouchControls';
import { unlockSpeech } from '../../game/voice';
import { HUD } from './HUD';
import { InventoryPanel } from './InventoryPanel';
import { DocumentReader } from './DocumentReader';
import { IntelPanel } from './IntelPanel';
import { LootPopup, LootNotification } from './LootPopup';

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

  const [tab, setTab] = React.useState<'briefing' | 'characters' | 'updates'>('briefing');

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
              <span className="text-muted-foreground">Special</span><span className="text-warning">3 phases, flashbangs, spawns minions</span>
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
              <span className="text-muted-foreground">Special</span><span className="text-accent">Extremely narrow vision arc (laser focus)</span>
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
              Infiltrate the abandoned military base <span className="text-accent">Objekt 47 "Severnyj Vektor"</span>. 
              Locate and eliminate <span className="text-danger">Commandant Osipovitj</span>. 
              Recover his <span className="text-loot">USB drive</span> and hack the <span className="text-warning">nuclear codebook terminal</span>. 
              <strong>Both items are required</strong> for full mission success.
              Extract before reinforcements arrive. You have <span className="text-warning">5 minutes</span>.
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <h2 className="text-sm font-display text-accent uppercase tracking-wider mb-2">🎮 Controls</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] font-mono">
              <span className="text-muted-foreground">WASD / Arrows</span><span className="text-foreground">Move</span>
              <span className="text-muted-foreground">Mouse</span><span className="text-foreground">Aim & Shoot</span>
              <span className="text-muted-foreground">Shift</span><span className="text-foreground">Sprint</span>
              <span className="text-muted-foreground">Ctrl / C</span><span className="text-foreground">Sneak</span>
              <span className="text-muted-foreground">Q / Space</span><span className="text-foreground">Take Cover</span>
              <span className="text-muted-foreground">1 / 2</span><span className="text-foreground">Switch Weapon</span>
              <span className="text-muted-foreground">E</span><span className="text-foreground">Interact / Loot</span>
              <span className="text-muted-foreground">H</span><span className="text-foreground">Heal</span>
              <span className="text-muted-foreground">G</span><span className="text-foreground">Throw Grenade</span>
              <span className="text-muted-foreground">E (near wall)</span><span className="text-foreground">Place TNT 🧨</span>
              <span className="text-muted-foreground">Tab / I</span><span className="text-foreground">Inventory</span>
              <span className="text-muted-foreground">J</span><span className="text-foreground">Intel Log</span>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h2 className="text-sm font-display text-warning uppercase tracking-wider mb-2">⚠ Rules of Engagement</h2>
            <ul className="text-[11px] font-mono text-foreground/70 space-y-1">
              <li>• <span className="text-accent">Sneak</span> to avoid detection — enemies have vision arcs</li>
              <li>• <span className="text-warning">Gunfire alerts nearby enemies</span> — they will investigate</li>
              <li>• <span className="text-danger">⚠ MINEFIELD</span> in the southwest compound — instant death!</li>
              <li>• 🧨 <span className="text-warning">TNT charges</span> can be found in loot — use <span className="text-accent">E near perimeter walls</span> to breach fences and create new entry points</li>
              <li>• Officers carry <span className="text-loot">better loot</span> and have longer range</li>
              <li>• Guards outside the base may carry an <span className="text-loot">Access Card</span> to open the main gate</li>
              <li>• Use <span className="text-accent">cover</span> to reduce incoming damage by 80%</li>
              <li>• After <span className="text-danger">5 minutes</span>, reinforcements arrive — game over</li>
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
                <div className="text-accent font-display text-[11px] uppercase tracking-wider mb-1">v0.4 — 2026-02-24</div>
                <ul className="text-[11px] text-foreground/80 space-y-0.5 ml-2">
                  <li>• Fixed: TNT from enemy bodies now counts correctly</li>
                  <li>• Sniper Tuman scans surroundings when player not in sight</li>
                  <li>• Sniper throws flashbang & flees when player too close or under fire</li>
                  <li>• Officers now spawn outdoors (yard & patrol zones)</li>
                  <li>• Access cards can drop from regular guards (scav & soldier)</li>
                  <li>• Access card carriers guaranteed to be outside the base</li>
                  <li>• TNT drop rate increased across all loot tables</li>
                </ul>
              </div>
              <div className="text-xs font-mono">
                <div className="text-accent font-display text-[11px] uppercase tracking-wider mb-1">v0.3 — 2026-02-24</div>
                <ul className="text-[11px] text-foreground/80 space-y-0.5 ml-2">
                  <li>• Larger, clearer weapon & item HUD</li>
                  <li>• Improved loot pickup popup with icon, name & value</li>
                </ul>
              </div>
              <div className="text-xs font-mono">
                <div className="text-accent font-display text-[11px] uppercase tracking-wider mb-1">v0.2 — 2026-02-24</div>
                <ul className="text-[11px] text-foreground/80 space-y-0.5 ml-2">
                  <li>• Sniper Tuman: relocates 0.5s after hit (smoke + teleport)</li>
                  <li>• Sniper Tuman: immune to critical headshots</li>
                  <li>• Sniper Tuman: tree-to-tree movement with invisibility</li>
                  <li>• Boss Osipovitj: 3-phase fight with flashbangs & minion spawns</li>
                  <li>• Boss heals with injector (+35 HP) when in cover</li>
                  <li>• Bodyguards ZAPAD & VOSTOK with wide vision arc</li>
                  <li>• Officers with Mosin-Nagant, extended range & valuable loot</li>
                  <li>• Heavy enemies with suppressive fire role</li>
                  <li>• Turret emplacements at watchtowers</li>
                  <li>• Tactical AI: flanking, suppression, radio comms</li>
                  <li>• Enemies lose target when line-of-sight breaks</li>
                  <li>• Cover system (Q/Space) with peek-fire</li>
                  <li>• Movement modes: sneak / walk / sprint</li>
                  <li>• Dual weapon slots (sidearm + primary)</li>
                  <li>• TNT charges to breach perimeter walls</li>
                  <li>• Medical system: bandages, medkits, morphine, bleeding</li>
                  <li>• Intel documents & nuclear codes</li>
                  <li>• Extraction zone with 5s hold timer</li>
                  <li>• Highscore board & feedback widget</li>
                  <li>• Reinforcement waves from northern zones</li>
                </ul>
              </div>
              <div className="text-xs font-mono">
                <div className="text-muted-foreground font-display text-[11px] uppercase tracking-wider mb-1">v0.1</div>
                <ul className="text-[11px] text-foreground/80 space-y-0.5 ml-2">
                  <li>• Initial release — base map, soldiers, scavs, basic combat</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h2 className="text-sm font-display text-warning uppercase tracking-wider mb-2">🗺️ Roadmap</h2>
            <ul className="text-[11px] font-mono text-foreground/70 space-y-1.5">
              <li>• Focus on the hidden intel you can find and weave them into gameplay</li>
              <li>• Multiplayer?</li>
              <li>• Extended map with new buildings</li>
              <li>• New boss</li>
              <li>• Expand Sniper Tuman's mechanics (semi-boss)</li>
              <li>• Loot system that lets you keep and sell loot after raid</li>
              <li>• Upgrades</li>
              <li>• Finite ammunition</li>
            </ul>
          </div>
        </>
      )}

    </div>
  </div>
  );
};
export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createGameState());
  const inputRef = useRef<InputState>({ moveX: 0, moveY: 0, aimX: 0, aimY: 0, shooting: false, shootPressed: false, interact: false, heal: false, throwGrenade: false, movementMode: 'walk', moveTarget: null, takeCover: false });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const moveTouchRef = useRef<number | null>(null);
  const aimTouchRef = useRef<number | null>(null);
  const [started, setStarted] = useState(false);
  const [playerName, setPlayerName] = useState('');

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
      keys.add(e.key.toLowerCase());
      if (e.key === 'e') inputRef.current.interact = true;
      if (e.key === 'h') inputRef.current.heal = true;
      if (e.key === 'g') inputRef.current.throwGrenade = true;
      if (e.key === 'q' || e.key === ' ') { e.preventDefault(); inputRef.current.takeCover = true; }
      if (e.key === '1') inputRef.current.switchWeapon = 1;
      if (e.key === '2') inputRef.current.switchWeapon = 2;
      if (e.key === 'Shift') inputRef.current.movementMode = 'sprint';
      if (e.key === 'Control' || e.key === 'c') inputRef.current.movementMode = 'sneak';
      if (e.key === 'Tab' || e.key === 'i') {
        e.preventDefault();
        setShowInventory(v => !v);
        setShowIntel(false);
        setReadingDoc(null);
      }
      if (e.key === 'j' || e.key === 'J') {
        setShowIntel(v => !v);
        setShowInventory(false);
        setReadingDoc(null);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
      if (e.key === 'e') inputRef.current.interact = false;
      if (e.key === 'Shift') inputRef.current.movementMode = 'walk';
      if (e.key === 'Control' || e.key === 'c') inputRef.current.movementMode = 'walk';
    };

    const onMouseDown = (e: MouseEvent) => { unlockSpeech(); if ((e.target as HTMLElement).closest('button, [role="button"], .pointer-events-auto')) return; if (!showInventory && !showIntel && !readingDoc) { inputRef.current.shooting = true; inputRef.current.shootPressed = true; } };
    const onMouseUp = () => { inputRef.current.shooting = false; inputRef.current.shootPressed = false; };
    const onMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      inputRef.current.aimX = e.clientX - rect.left - rect.width / 2;
      inputRef.current.aimY = e.clientY - rect.top - rect.height / 2;
    };

    const updateKeys = () => {
      let mx = 0, my = 0;
      if (keys.has('w') || keys.has('arrowup')) my -= 1;
      if (keys.has('s') || keys.has('arrowdown')) my += 1;
      if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
      if (keys.has('d') || keys.has('arrowright')) mx += 1;
      inputRef.current.moveX = mx;
      inputRef.current.moveY = my;
    };

    const interval = setInterval(updateKeys, 16);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
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
      if (forceUpdate || hudUpdateCounter % 6 === 0) {
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
        });
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [started]);

  if (!started) {
    return (
      <div className="relative w-screen h-screen overflow-hidden bg-background">
        <IntroScreen onStart={(name) => { setPlayerName(name); setStarted(true); }} />
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background touch-none flex">
      <div className="relative flex-1 h-full">
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
          onViewDocuments={() => { setShowIntel(true); }}
          timeLimit={TIME_LIMIT}
          playerName={playerName}
        />

        <LootPopup notifications={lootNotifications} />

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
          WASD move | Shift sprint | Ctrl sneak | Q/Space cover | Mouse aim+shoot | E loot | H heal | G grenade | 1/2 switch weapon
        </div>
      </div>

      <InventoryPanel items={hudState.player.inventory} />

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
