import React, { useRef, useEffect, useCallback, useState } from 'react';
import { createGameState, updateGame } from '../../game/engine';
import { renderGame } from '../../game/renderer';
import { GameState, InputState } from '../../game/types';
import { VirtualJoystick, ActionButton } from './TouchControls';
import { HUD } from './HUD';
import { InventoryPanel } from './InventoryPanel';

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
  });
  const [showInventory, setShowInventory] = useState(false);

  // Keyboard input
  useEffect(() => {
    const keys = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase());
      if (e.key === 'e') inputRef.current.interact = true;
      if (e.key === 'Tab' || e.key === 'i') {
        e.preventDefault();
        setShowInventory(v => !v);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
      if (e.key === 'e') inputRef.current.interact = false;
    };

    const onMouseDown = () => { inputRef.current.shooting = true; };
    const onMouseUp = () => { inputRef.current.shooting = false; };
    const onMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      inputRef.current.aimX = e.clientX - rect.left - cx;
      inputRef.current.aimY = e.clientY - rect.top - cy;
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
  }, []);

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

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const rawDt = (timestamp - lastTimeRef.current) / 1000;
      const dt = Math.min(rawDt, 0.05); // cap
      lastTimeRef.current = timestamp;

      const state = updateGame(stateRef.current, inputRef.current, dt, canvas.width, canvas.height);
      stateRef.current = state;

      // Reset one-shot inputs
      inputRef.current.interact = false;

      renderGame(ctx, state, canvas.width, canvas.height);

      // Update React HUD less frequently
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
    // Auto-shoot when aiming with right stick
    inputRef.current.shooting = Math.sqrt(x * x + y * y) > 0.3;
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
      
      <HUD {...hudState} />

      {/* Mobile controls */}
      <div className="sm:hidden">
        <VirtualJoystick onMove={handleMoveJoystick} side="left" />
        <VirtualJoystick onMove={handleAimJoystick} side="right" />
        <ActionButton
          label="LOOT"
          onPress={() => { inputRef.current.interact = true; }}
          className="absolute bottom-36 right-10"
        />
        <ActionButton
          label="INV"
          onPress={() => setShowInventory(v => !v)}
          className="absolute top-14 right-3"
          variant="action"
        />
      </div>

      {/* Desktop hint */}
      <div className="hidden sm:block absolute bottom-3 left-3 text-xs text-muted-foreground font-mono opacity-60">
        WASD move | Mouse aim+shoot | E loot/heal | Tab inventory
      </div>

      <InventoryPanel
        items={hudState.player.inventory}
        open={showInventory}
        onClose={() => setShowInventory(false)}
      />
    </div>
  );
};
