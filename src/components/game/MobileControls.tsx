import React, { useCallback, useRef, useState } from 'react';
import { InputState } from '../../game/types';
import { VirtualJoystick, ActionButton } from './TouchControls';

interface MobileControlsProps {
  inputRef: React.MutableRefObject<InputState>;
  stateRef: React.MutableRefObject<any>;
  onToggleInventory: () => void;
  onToggleIntel: () => void;
  movementMode: 'sneak' | 'walk' | 'sprint';
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  inputRef, stateRef, onToggleInventory, onToggleIntel, movementMode,
}) => {
  const [currentMode, setCurrentMode] = useState<'sneak' | 'walk' | 'sprint'>(movementMode);
  const aimTouchRef = useRef<number | null>(null);

  // Left joystick → direct movement
  const handleMove = useCallback((x: number, y: number) => {
    inputRef.current.moveX = x;
    inputRef.current.moveY = y;
    inputRef.current.moveTarget = null; // joystick overrides tap
  }, [inputRef]);

  // Right side tap/drag → aim & shoot
  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const cam = stateRef.current.camera;
    const w = window.innerWidth;
    const h = window.innerHeight;
    return { x: cam.x + (clientX - w / 2), y: cam.y + (clientY - h / 2) };
  }, [stateRef]);

  const handleAimStart = useCallback((clientX: number, clientY: number) => {
    const world = screenToWorld(clientX, clientY);
    const dx = world.x - stateRef.current.player.pos.x;
    const dy = world.y - stateRef.current.player.pos.y;
    inputRef.current.aimX = dx;
    inputRef.current.aimY = dy;
    inputRef.current.shooting = true;
    inputRef.current.shootPressed = true;
  }, [inputRef, stateRef, screenToWorld]);

  const handleAimMove = useCallback((clientX: number, clientY: number) => {
    const world = screenToWorld(clientX, clientY);
    const dx = world.x - stateRef.current.player.pos.x;
    const dy = world.y - stateRef.current.player.pos.y;
    inputRef.current.aimX = dx;
    inputRef.current.aimY = dy;
  }, [inputRef, stateRef, screenToWorld]);

  const handleAimEnd = useCallback(() => {
    inputRef.current.shooting = false;
    inputRef.current.shootPressed = false;
  }, [inputRef]);

  const modeIcons = { sneak: '🤫', walk: '🚶', sprint: '🏃' };
  const modes: Array<'sneak' | 'walk' | 'sprint'> = ['sneak', 'walk', 'sprint'];

  React.useEffect(() => {
    setCurrentMode(movementMode);
  }, [movementMode]);

  // Detect landscape: short height relative to width
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  React.useEffect(() => {
    const onResize = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div
      className="absolute inset-0 z-40 touch-none pointer-events-auto"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Left joystick — movement */}
      <VirtualJoystick onMove={handleMove} side="left" label="MOVE" size={116} />

      {/* Right side — tap/drag to aim & shoot */}
      <div
        className="absolute top-0 right-0 w-[55%] h-full touch-none pointer-events-auto"
        style={{ zIndex: 31 }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          if (aimTouchRef.current !== null) return;
          e.preventDefault();
          e.stopPropagation();
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          aimTouchRef.current = e.pointerId;
          handleAimStart(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.pointerId !== aimTouchRef.current) return;
          e.preventDefault();
          handleAimMove(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (e.pointerId !== aimTouchRef.current) return;
          aimTouchRef.current = null;
          handleAimEnd();
        }}
        onPointerCancel={(e) => {
          if (e.pointerId !== aimTouchRef.current) return;
          aimTouchRef.current = null;
          handleAimEnd();
        }}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Right side action buttons — combat */}
      <div className="absolute bottom-32 right-4 flex flex-col gap-2 items-center pointer-events-auto" style={{ zIndex: 50 }}>
        <ActionButton label="💣" onPress={() => { inputRef.current.throwGrenade = true; }} variant="small" />
        <ActionButton label="🧨" onPress={() => { inputRef.current.useTNT = true; }} variant="small" />
        <ActionButton label="🗡️" onPress={() => { inputRef.current.throwKnife = true; }} variant="small" />
      </div>

      {/* Left side action buttons — utility */}
      <div className="absolute bottom-32 left-[124px] flex flex-col gap-2 items-center pointer-events-auto" style={{ zIndex: 50 }}>
        <ActionButton label="🔍" onPress={() => { inputRef.current.interact = true; }} variant="small" />
        <ActionButton label="💊" onPress={() => { inputRef.current.heal = true; }} variant="small" />
        <ActionButton label="🛡️" onPress={() => { inputRef.current.takeCover = true; }} variant="small" />
      </div>

      {/* Top bar — inventory + intel + mode */}
      <div className="absolute top-2 right-2 flex gap-1.5 pointer-events-auto" style={{ zIndex: 50 }}>
        <ActionButton label="🎒" onPress={onToggleInventory} variant="small" />
        <ActionButton label="📄" onPress={onToggleIntel} variant="small" />
      </div>

      {/* Bottom center — movement mode selector */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-auto" style={{ zIndex: 50 }}>
        {modes.map(mode => (
          <button
            key={mode}
            className={`px-3 py-2 rounded text-sm font-mono border transition-colors touch-none select-none
              ${currentMode === mode
                ? 'bg-primary/60 border-primary text-primary-foreground'
                : 'bg-card/40 border-border/30 text-muted-foreground/60'
              }`}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCurrentMode(mode);
              inputRef.current.movementMode = mode;
            }}
          >
            {modeIcons[mode]}
          </button>
        ))}
        <button
          className="px-3 py-2 rounded text-sm font-mono border border-warning/40 bg-warning/10 text-warning touch-none select-none"
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); inputRef.current.cycleThrowable = true; }}
        >
          🔄
        </button>
      </div>

      {/* Helper text */}
      <div className="absolute bottom-0 left-0 right-0 text-center text-[8px] text-muted-foreground/20 pointer-events-none pb-1">
        Left stick: move · Right side: aim & shoot
      </div>
    </div>
  );
};
