import React from 'react';
import { Player, GameMessage, ExtractionPoint } from '../../game/types';

interface HUDProps {
  player: Player;
  killCount: number;
  messages: GameMessage[];
  extractionProgress: number;
  time: number;
  gameOver: boolean;
  extracted: boolean;
}

export const HUD: React.FC<HUDProps> = ({ player, killCount, messages, extractionProgress, time, gameOver, extracted }) => {
  const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
  const hpColor = hpPercent > 60 ? 'bg-safe' : hpPercent > 30 ? 'bg-warning' : 'bg-danger';

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-3">
        {/* HP */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground/70 font-mono">HP</span>
            <div className="w-28 h-3 bg-secondary rounded-sm overflow-hidden border border-border/40">
              <div
                className={`h-full ${hpColor} transition-all duration-200`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
            <span className="text-xs text-foreground font-mono">{Math.floor(player.hp)}</span>
          </div>
          {player.bleedRate > 0 && (
            <span className="text-xs text-danger animate-pulse-glow font-mono">● BLEEDING</span>
          )}
        </div>

        {/* Ammo */}
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-foreground font-display text-lg text-glow-amber">
              {player.currentAmmo}
            </span>
            <span className="text-muted-foreground text-xs font-mono">
              {player.ammoType}
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            KILLS: {killCount}
          </span>
        </div>
      </div>

      {/* Extraction progress */}
      {extractionProgress > 0 && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
          <span className="text-xs text-loot font-mono text-glow-green animate-pulse-glow">EXTRACTING...</span>
          <div className="w-40 h-2 bg-secondary rounded-sm overflow-hidden border border-loot/40">
            <div
              className="h-full bg-loot transition-all duration-100"
              style={{ width: `${(extractionProgress / 5) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="absolute bottom-32 left-3 flex flex-col gap-1 max-w-xs">
        {messages.slice(-5).map((msg, i) => {
          const age = time - msg.time;
          if (age > 6) return null;
          const opacity = age > 4 ? (6 - age) / 2 : 1;
          const colors = {
            info: 'text-foreground/80',
            warning: 'text-warning',
            loot: 'text-loot',
            damage: 'text-danger',
            kill: 'text-accent',
          };
          return (
            <div
              key={`${msg.time}-${i}`}
              className={`text-xs font-mono ${colors[msg.type]}`}
              style={{ opacity }}
            >
              {'>'} {msg.text}
            </div>
          );
        })}
      </div>

      {/* Game Over / Extracted overlay */}
      {(gameOver || extracted) && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 pointer-events-auto">
          <div className="flex flex-col items-center gap-4 p-8 border border-border bg-card rounded">
            <h1 className={`text-3xl font-display ${gameOver ? 'text-danger text-glow-red' : 'text-loot text-glow-green'}`}>
              {gameOver ? 'K.I.A.' : 'EXTRACTED'}
            </h1>
            <div className="flex flex-col items-center gap-1 text-sm font-mono text-muted-foreground">
              <span>Kills: {killCount}</span>
              <span>Loot: {player.inventory.length} items</span>
              <span>Value: {player.inventory.reduce((s, i) => s + i.value, 0)}₽</span>
            </div>
            <button
              className="px-6 py-2 bg-primary text-primary-foreground font-display uppercase tracking-wider rounded-sm hover:bg-primary/80 transition-colors"
              onClick={() => window.location.reload()}
            >
              NEW RAID
            </button>
          </div>
        </div>
      )}

      {/* Minimap */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 hidden sm:block">
        <MiniMap
          playerX={player.pos.x}
          playerY={player.pos.y}
          mapW={2400}
          mapH={2400}
        />
      </div>
    </div>
  );
};

const MiniMap: React.FC<{ playerX: number; playerY: number; mapW: number; mapH: number }> = ({ playerX, playerY, mapW, mapH }) => {
  const size = 80;
  const px = (playerX / mapW) * size;
  const py = (playerY / mapH) * size;
  return (
    <div className="relative border border-border/40 bg-background/60 backdrop-blur-sm" style={{ width: size, height: size }}>
      <div
        className="absolute w-2 h-2 bg-loot rounded-full"
        style={{ left: px - 4, top: py - 4 }}
      />
      {/* Extraction markers */}
      <div className="absolute w-1.5 h-1.5 bg-safe rounded-full" style={{ left: (50 / mapW) * size, top: ((mapH - 50) / mapH) * size }} />
      <div className="absolute w-1.5 h-1.5 bg-safe rounded-full" style={{ left: ((mapW - 50) / mapW) * size, top: (50 / mapH) * size }} />
    </div>
  );
};
