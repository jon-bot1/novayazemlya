import React, { useRef, useEffect, useCallback, useState } from 'react';
import { createGameState, updateGame } from '../../game/engine';
import { renderGame } from '../../game/renderer';
import { GameState, InputState } from '../../game/types';
import { LORE_DOCUMENTS } from '../../game/lore';
import { LoreDocument } from '../../game/lore';
import { VirtualJoystick, ActionButton } from './TouchControls';
import { HUD } from './HUD';
import { InventoryPanel } from './InventoryPanel';
import { DocumentReader } from './DocumentReader';
import { IntelPanel } from './IntelPanel';

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createGameState());
  const inputRef = useRef<InputState>({ moveX: 0, moveY: 0, aimX: 0, aimY: 0, shooting: false, interact: false });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

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
  });
  const [showInventory, setShowInventory] = useState(false);
  const [showIntel, setShowIntel] = useState(false);
  const [readingDoc, setReadingDoc] = useState<LoreDocument | null>(null);

  // Keyboard input
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

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
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

      const state = updateGame(stateRef.current, inputRef.current, dt, canvas.width, canvas.height);
      stateRef.current = state;
      inputRef.current.interact = false;

      renderGame(ctx, state, canvas.width, canvas.height);

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

  const handleMoveJoystick = useCallback((x: number, y: number) => {
    inputRef.current.moveX = x;
    inputRef.current.moveY = y;
  }, []);

  const handleAimJoystick = useCallback((x: number, y: number) => {
    inputRef.current.aimX = x;
    inputRef.current.aimY = y;
    inputRef.current.shooting = Math.sqrt(x * x + y * y) > 0.3;
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
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
        onViewDocuments={() => { setShowIntel(true); setShowInventory(false); }}
      />

      {/* Mobile controls */}
      <div className="sm:hidden">
        <VirtualJoystick onMove={handleMoveJoystick} side="left" />
        <VirtualJoystick onMove={handleAimJoystick} side="right" />
        <ActionButton label="🔍" onPress={() => { inputRef.current.interact = true; }} className="absolute bottom-36 right-10" />
        <ActionButton label="📦" onPress={() => setShowInventory(v => !v)} className="absolute top-14 right-3" variant="action" />
        <ActionButton label="📄" onPress={() => setShowIntel(v => !v)} className="absolute top-14 right-20" variant="action" />
      </div>

      {/* Desktop hint */}
      <div className="hidden sm:block absolute bottom-3 left-3 text-xs text-muted-foreground font-mono opacity-60">
        WASD движение | Мышь прицел+огонь | E обыскать/лечить | Tab инвентарь | J разведданные
      </div>

      <InventoryPanel items={hudState.player.inventory} open={showInventory} onClose={() => setShowInventory(false)} />
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
