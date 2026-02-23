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
  
  const handleStart = React.useCallback(() => {
    if (name.trim().length > 0) onStart(name.trim().slice(0, 20));
  }, [name, onStart]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && name.trim().length > 0) {
        handleStart();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleStart]);

  return (
  <div className="absolute inset-0 flex items-center justify-center bg-background z-50">
    <div className="max-w-lg w-full mx-4 flex flex-col gap-6 p-8 border border-border bg-card rounded">
      <div className="text-center">
        <h1 className="text-3xl font-display text-accent text-glow-green tracking-wider">NOVAYA ZEMLYA</h1>
        <p className="text-xs font-mono text-muted-foreground mt-2">CLASSIFIED — EYES ONLY</p>
      </div>

      <div className="border-t border-border pt-4">
        <label className="text-xs font-display text-accent uppercase tracking-wider mb-2 block">Your Callsign</label>
        <input
          type="text"
          maxLength={20}
          className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Enter name..."
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="border-t border-border pt-4">
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
          <li>• Officers carry <span className="text-loot">better loot</span> and have longer range</li>
          <li>• Use <span className="text-accent">cover</span> to reduce incoming damage by 80%</li>
          <li>• After <span className="text-danger">5 minutes</span>, reinforcements arrive — game over</li>
        </ul>
      </div>

      <button
        className="w-full px-6 py-3 bg-primary text-primary-foreground font-display uppercase tracking-widest rounded-sm hover:bg-primary/80 transition-colors text-lg disabled:opacity-40"
        onClick={handleStart}
        disabled={name.trim().length === 0}
      >
        ▶ BEGIN OPERATION
      </button>
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
          player_name: playerName.trim().slice(0, 20),
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
