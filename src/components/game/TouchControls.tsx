import React, { useRef, useCallback, useState } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  side: 'left' | 'right';
}

export const VirtualJoystick: React.FC<JoystickProps> = ({ onMove, side }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const originRef = useRef({ x: 0, y: 0 });

  const handleStart = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    originRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    setActive(true);
    const dx = clientX - originRef.current.x;
    const dy = clientY - originRef.current.y;
    const maxR = 35;
    const d = Math.sqrt(dx * dx + dy * dy);
    const clampedD = Math.min(d, maxR);
    const angle = Math.atan2(dy, dx);
    const nx = Math.cos(angle) * clampedD;
    const ny = Math.sin(angle) * clampedD;
    setStickPos({ x: nx, y: ny });
    onMove(nx / maxR, ny / maxR);
  }, [onMove]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!active) return;
    const dx = clientX - originRef.current.x;
    const dy = clientY - originRef.current.y;
    const maxR = 35;
    const d = Math.sqrt(dx * dx + dy * dy);
    const clampedD = Math.min(d, maxR);
    const angle = Math.atan2(dy, dx);
    const nx = Math.cos(angle) * clampedD;
    const ny = Math.sin(angle) * clampedD;
    setStickPos({ x: nx, y: ny });
    onMove(nx / maxR, ny / maxR);
  }, [active, onMove]);

  const handleEnd = useCallback(() => {
    setActive(false);
    setStickPos({ x: 0, y: 0 });
    onMove(0, 0);
  }, [onMove]);

  return (
    <div
      ref={containerRef}
      className={`absolute bottom-8 ${side === 'left' ? 'left-8' : 'right-8'} w-28 h-28 rounded-full border border-border/40 bg-secondary/20 backdrop-blur-sm flex items-center justify-center touch-none`}
      onTouchStart={(e) => {
        e.preventDefault();
        const t = e.touches[0];
        handleStart(t.clientX, t.clientY);
      }}
      onTouchMove={(e) => {
        e.preventDefault();
        const t = e.touches[0];
        handleMove(t.clientX, t.clientY);
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        handleEnd();
      }}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
    >
      <div
        className={`w-12 h-12 rounded-full bg-primary/60 border border-primary transition-colors ${active ? 'bg-primary/80' : ''}`}
        style={{ transform: `translate(${stickPos.x}px, ${stickPos.y}px)` }}
      />
      <span className="absolute -top-5 text-muted-foreground text-xs font-mono">
        {side === 'left' ? 'MOVE' : 'AIM'}
      </span>
    </div>
  );
};

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  onRelease?: () => void;
  variant?: 'fire' | 'action';
  className?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ label, onPress, onRelease, variant = 'action', className = '' }) => {
  return (
    <button
      className={`touch-none select-none rounded-full font-display text-xs uppercase tracking-wider
        ${variant === 'fire'
          ? 'w-16 h-16 bg-destructive/40 border-2 border-destructive text-destructive-foreground active:bg-destructive/70'
          : 'w-14 h-14 bg-primary/30 border border-primary/60 text-primary-foreground active:bg-primary/60'
        } ${className}`}
      onTouchStart={(e) => { e.preventDefault(); onPress(); }}
      onTouchEnd={(e) => { e.preventDefault(); onRelease?.(); }}
      onMouseDown={onPress}
      onMouseUp={onRelease}
    >
      {label}
    </button>
  );
};
