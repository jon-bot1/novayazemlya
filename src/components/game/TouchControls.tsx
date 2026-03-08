import React, { useRef, useCallback, useState, useEffect } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  side: 'left' | 'right';
  label?: string;
  size?: number;
}

export const VirtualJoystick: React.FC<JoystickProps> = ({ onMove, side, label, size = 120 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const originRef = useRef({ x: 0, y: 0 });
  const activeIdRef = useRef<number | null>(null);
  const maxR = size * 0.3;

  const calcStick = useCallback((clientX: number, clientY: number) => {
    const dx = clientX - originRef.current.x;
    const dy = clientY - originRef.current.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const clampedD = Math.min(d, maxR);
    const angle = Math.atan2(dy, dx);
    const nx = Math.cos(angle) * clampedD;
    const ny = Math.sin(angle) * clampedD;
    setStickPos({ x: nx, y: ny });
    onMove(nx / maxR, ny / maxR);
  }, [onMove, maxR]);

  const handleStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeIdRef.current !== null) return;
    const el = containerRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    activeIdRef.current = e.pointerId;
    const rect = el.getBoundingClientRect();
    originRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    setActive(true);
    calcStick(e.clientX, e.clientY);
  }, [calcStick]);

  const handleMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== activeIdRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    calcStick(e.clientX, e.clientY);
  }, [calcStick]);

  const handleEnd = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== activeIdRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    activeIdRef.current = null;
    setActive(false);
    setStickPos({ x: 0, y: 0 });
    onMove(0, 0);
  }, [onMove]);

  return (
    <div
      ref={containerRef}
      className={`absolute ${side === 'left' ? 'left-3' : 'right-3'} rounded-full border-2 border-border/30 bg-card/20 backdrop-blur-sm flex items-center justify-center touch-none select-none z-50 pointer-events-auto`}
      style={{ width: size, height: size, bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      onPointerDown={handleStart}
      onPointerMove={handleMove}
      onPointerUp={handleEnd}
      onPointerCancel={handleEnd}
      onPointerLeave={handleEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className={`rounded-full bg-primary/50 border-2 border-primary/80 transition-colors ${active ? 'bg-primary/70 scale-110' : ''}`}
        style={{
          width: size * 0.38,
          height: size * 0.38,
          transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
        }}
      />
      {label && (
        <span className="absolute -top-5 text-muted-foreground text-[9px] font-mono uppercase tracking-wider">
          {label}
        </span>
      )}
    </div>
  );
};

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  onRelease?: () => void;
  variant?: 'fire' | 'action' | 'small';
  className?: string;
  active?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ label, onPress, onRelease, variant = 'action', className = '', active }) => {
  return (
    <button
      className={`touch-none select-none rounded-full font-display uppercase tracking-wider z-50 pointer-events-auto
        ${variant === 'fire'
          ? 'w-20 h-20 text-lg bg-destructive/30 border-2 border-destructive/70 text-destructive-foreground active:bg-destructive/60'
          : variant === 'small'
          ? 'w-11 h-11 text-sm bg-card/40 border border-border/50 text-foreground/80 active:bg-card/70'
          : `w-14 h-14 text-base bg-primary/25 border border-primary/50 text-primary-foreground active:bg-primary/50 ${active ? 'bg-primary/50 border-primary' : ''}`
        } ${className}`}
      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onPress(); }}
      onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); onRelease?.(); }}
      onPointerCancel={(e) => { e.preventDefault(); e.stopPropagation(); onRelease?.(); }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
};

// Fire zone: right side of screen for aim-and-shoot
interface FireZoneProps {
  onAimStart: (x: number, y: number) => void;
  onAimMove: (x: number, y: number) => void;
  onAimEnd: () => void;
}

export const FireZone: React.FC<FireZoneProps> = ({ onAimStart, onAimMove, onAimEnd }) => {
  const activeIdRef = useRef<number | null>(null);

  return (
    <div
      className="absolute top-0 right-0 w-1/2 h-full touch-none z-30 pointer-events-auto"
      onPointerDown={(e) => {
        if (activeIdRef.current !== null) return;
        // Don't capture if touching a button
        if ((e.target as HTMLElement).closest('button')) return;
        e.preventDefault();
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        activeIdRef.current = e.pointerId;
        onAimStart(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.pointerId !== activeIdRef.current) return;
        e.preventDefault();
        onAimMove(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (e.pointerId !== activeIdRef.current) return;
        activeIdRef.current = null;
        onAimEnd();
      }}
      onPointerCancel={(e) => {
        if (e.pointerId !== activeIdRef.current) return;
        activeIdRef.current = null;
        onAimEnd();
      }}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
};
