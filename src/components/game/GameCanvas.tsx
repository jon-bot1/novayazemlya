import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createGameState, updateGame } from '../../game/engine';
import { renderGame } from '../../game/renderer';
import { GameState, InputState, Item } from '../../game/types';
import { LORE_DOCUMENTS } from '../../game/lore';
import { LoreDocument } from '../../game/lore';
import { ActionButton } from './TouchControls';
import { HUD } from './HUD';
import { InventoryPanel } from './InventoryPanel';
import { DocumentReader } from './DocumentReader';
import { IntelPanel } from './IntelPanel';
import { LootPopup, LootNotification } from './LootPopup';

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createGameState());
  const inputRef = useRef<InputState>({ moveX: 0, moveY: 0, aimX: 0, aimY: 0, shooting: false, interact: false, moveTarget: null });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const moveTouchRef = useRef<number | null>(null);
  const aimTouchRef = useRef<number | null>(null);

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
      keys.add(e.key.toLowerCase());
      if (e.key === 'e') inputRef.current.interact = true;
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
    };

    const onMouseDown = () => { if (!showInventory && !showIntel && !readingDoc) inputRef.current.shooting = true; };
    const onMouseUp = () => { inputRef.current.shooting = false; };
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

  // Touch input: tap on enemy to shoot, tap on empty space to walk
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const screenToWorld = (clientX: number, clientY: number) => {
      const cam = stateRef.current.camera;
      const w = window.innerWidth;
      const h = window.innerHeight;
      return {
        x: cam.x + (clientX - w / 2),
        y: cam.y + (clientY - h / 2),
      };
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
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const world = screenToWorld(t.clientX, t.clientY);
        const enemy = findEnemyAtWorld(world.x, world.y);

        if (enemy) {
          // Tap on enemy → aim and shoot at them
          aimTouchRef.current = t.identifier;
          const dx = world.x - stateRef.current.player.pos.x;
          const dy = world.y - stateRef.current.player.pos.y;
          inputRef.current.aimX = dx;
          inputRef.current.aimY = dy;
          inputRef.current.shooting = true;
        } else if (findInteractableAtWorld(world.x, world.y)) {
          // Tap on interactable → walk there and auto-interact
          moveTouchRef.current = t.identifier;
          inputRef.current.moveTarget = world;
          inputRef.current.moveX = 0;
          inputRef.current.moveY = 0;
          inputRef.current.interact = true;
        } else {
          // Tap on empty space → walk there
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
          const world = screenToWorld(t.clientX, t.clientY);
          inputRef.current.moveTarget = world;
        }
        if (t.identifier === aimTouchRef.current) {
          const world = screenToWorld(t.clientX, t.clientY);
          const dx = world.x - stateRef.current.player.pos.x;
          const dy = world.y - stateRef.current.player.pos.y;
          inputRef.current.aimX = dx;
          inputRef.current.aimY = dy;
          inputRef.current.shooting = true;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === moveTouchRef.current) {
          moveTouchRef.current = null;
        }
        if (t.identifier === aimTouchRef.current) {
          aimTouchRef.current = null;
          inputRef.current.shooting = false;
        }
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

  // Game loop
  useEffect(() => {
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

      renderGame(ctx, state, cssW, cssH);

      // Check for new documents to auto-open reader
      const docKey = state.documentsRead.join(',');
      if (docKey !== lastDocCheck && state.documentsRead.length > 0) {
        const newDocId = state.documentsRead[state.documentsRead.length - 1];
        const doc = LORE_DOCUMENTS.find(d => d.id === newDocId);
        if (doc && docKey !== lastDocCheck) {
          setReadingDoc(doc);
        }
        lastDocCheck = docKey;
      }

      hudUpdateCounter++;
      if (hudUpdateCounter % 6 === 0) {
        // Detect new loot items
        const currentCount = state.player.inventory.length;
        if (currentCount > lastInventoryCountRef.current) {
          const newItems = state.player.inventory.slice(lastInventoryCountRef.current);
          const newNotifs: LootNotification[] = newItems.map((item, i) => ({
            id: `${Date.now()}_${i}`,
            item: { ...item },
            timestamp: Date.now(),
          }));
          setLootNotifications(prev => [...prev, ...newNotifs].slice(-5));
          // Auto-remove after 3 seconds
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
        });
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

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
          onViewDocuments={() => { setShowIntel(true); }}
        />

        <LootPopup notifications={lootNotifications} />

        {/* Mobile action buttons */}
        <div className="sm:hidden">
          <ActionButton label="🔍" onPress={() => { inputRef.current.interact = true; }} className="absolute bottom-24 left-1/2 -translate-x-1/2" />
          <ActionButton label="📄" onPress={() => setShowIntel(v => !v)} className="absolute top-14 right-3" variant="action" />
        </div>

        {/* Mobile control hint */}
        <div className="sm:hidden absolute bottom-2 left-2 right-2 text-center text-[10px] text-muted-foreground/50 pointer-events-none">
          Tryck dit du vill gå · Tryck på fiende för att skjuta
        </div>

        {/* Desktop hint */}
        <div className="hidden sm:block absolute bottom-3 left-3 text-xs text-muted-foreground font-mono opacity-60">
          WASD rörelse | Mus sikta+skjut | E leta/läka | J underrättelser
        </div>
      </div>

      {/* Always-visible inventory sidebar */}
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
