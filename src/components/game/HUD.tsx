import React from 'react';
import { Player, GameMessage } from '../../game/types';
import { LoreDocument } from '../../game/lore';

interface HUDProps {
  player: Player;
  killCount: number;
  messages: GameMessage[];
  extractionProgress: number;
  time: number;
  gameOver: boolean;
  extracted: boolean;
  documentsFound: number;
  totalDocuments: number;
  codesFound: string[];
  onViewDocuments: () => void;
}

export const HUD: React.FC<HUDProps> = ({ 
  player, killCount, messages, extractionProgress, time, 
  gameOver, extracted, documentsFound, totalDocuments, codesFound, onViewDocuments 
}) => {
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
              <div className={`h-full ${hpColor} transition-all duration-200`} style={{ width: `${hpPercent}%` }} />
            </div>
            <span className="text-xs text-foreground font-mono">{Math.floor(player.hp)}</span>
          </div>
          {player.bleedRate > 0 && (
            <span className="text-xs text-danger animate-pulse-glow font-mono">🩸 BLÖDNING</span>
          )}
        </div>

        {/* Ammo + Intel */}
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-foreground font-display text-lg text-glow-amber">{player.currentAmmo}</span>
            <span className="text-muted-foreground text-xs font-mono">{player.ammoType}</span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">☠ {killCount}</span>
          <button 
            className="text-xs font-mono text-accent/80 hover:text-accent pointer-events-auto flex items-center gap-1"
            onClick={onViewDocuments}
          >
            📄 {documentsFound}/{totalDocuments}
            {codesFound.length > 0 && <span className="text-warning">☢{codesFound.length}</span>}
          </button>
        </div>
      </div>

      {/* Extraction progress */}
      {extractionProgress > 0 && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
          <span className="text-xs text-loot font-mono text-glow-green animate-pulse-glow">EVAKUERING...</span>
          <div className="w-40 h-2 bg-secondary rounded-sm overflow-hidden border border-loot/40">
            <div className="h-full bg-loot transition-all duration-100" style={{ width: `${(extractionProgress / 5) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="absolute bottom-32 left-3 flex flex-col gap-1 max-w-xs">
        {messages.slice(-6).map((msg, i) => {
          const age = time - msg.time;
          if (age > 8) return null;
          const opacity = age > 5 ? (8 - age) / 3 : 1;
          const colors: Record<string, string> = {
            info: 'text-foreground/80',
            warning: 'text-warning',
            loot: 'text-loot',
            damage: 'text-danger',
            kill: 'text-accent',
            intel: 'text-accent-foreground',
          };
          return (
            <div
              key={`${msg.time}-${i}`}
              className={`text-xs font-mono ${colors[msg.type] || 'text-foreground'}`}
              style={{ opacity }}
            >
              {'>'} {msg.text}
            </div>
          );
        })}
      </div>

      {/* Game Over / Extracted overlay */}
      {(gameOver || extracted) && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/85 pointer-events-auto">
          <div className="flex flex-col items-center gap-4 p-8 border border-border bg-card rounded max-w-sm w-full mx-4">
            <h1 className={`text-3xl font-display ${gameOver ? 'text-danger text-glow-red' : 'text-loot text-glow-green'}`}>
              {gameOver ? '☠ DÖD' : '🚁 EVAKUERAD'}
            </h1>
            
            <div className="w-full border-t border-border pt-3 flex flex-col gap-2">
              <div className="flex justify-between text-sm font-mono text-muted-foreground">
                <span>Eliminerade:</span>
                <span className="text-foreground">{killCount}</span>
              </div>
              <div className="flex justify-between text-sm font-mono text-muted-foreground">
                <span>Byte:</span>
                <span className="text-foreground">{player.inventory.length} föremål</span>
              </div>
              <div className="flex justify-between text-sm font-mono text-muted-foreground">
                <span>Värde:</span>
                <span className="text-foreground">{player.inventory.reduce((s, i) => s + i.value, 0)}₽</span>
              </div>
              <div className="flex justify-between text-sm font-mono text-muted-foreground">
                <span>Dokument:</span>
                <span className="text-foreground">{documentsFound}/{totalDocuments}</span>
              </div>
              {codesFound.length > 0 && (
                <div className="mt-2 border-t border-border pt-2">
                  <span className="text-xs font-mono text-warning">☢ UPPTÄCKTA KODER:</span>
                  <div className="flex flex-col gap-1 mt-1">
                    {codesFound.map(code => (
                      <span key={code} className="text-sm font-display text-warning text-glow-amber">{code}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              className="w-full px-6 py-2.5 bg-primary text-primary-foreground font-display uppercase tracking-wider rounded-sm hover:bg-primary/80 transition-colors"
              onClick={() => window.location.reload()}
            >
              NY RÄID
            </button>
          </div>
        </div>
      )}

      {/* Minimap */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 hidden sm:block">
        <MiniMap playerX={player.pos.x} playerY={player.pos.y} mapW={2400} mapH={2400} />
      </div>
    </div>
  );
};

const MiniMap: React.FC<{ playerX: number; playerY: number; mapW: number; mapH: number }> = ({ playerX, playerY, mapW, mapH }) => {
  const size = 80;
  const px = (playerX / mapW) * size;
  const py = (playerY / mapH) * size;
  return (
    <div className="relative border border-border/40 bg-background/60 backdrop-blur-sm rounded-sm" style={{ width: size, height: size }}>
      <div className="absolute w-2 h-2 bg-loot rounded-full" style={{ left: px - 4, top: py - 4 }} />
      <div className="absolute w-1.5 h-1.5 bg-safe rounded-full" style={{ left: (50 / mapW) * size, top: ((mapH - 50) / mapH) * size }} />
      <div className="absolute w-1.5 h-1.5 bg-safe rounded-full" style={{ left: ((mapW - 50) / mapW) * size, top: (50 / mapH) * size }} />
    </div>
  );
};
