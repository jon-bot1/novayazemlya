import React from 'react';
import { Player, GameMessage } from '../../game/types';
import { LoreDocument } from '../../game/lore';
import { FeedbackWidget } from './FeedbackWidget';
import { HighscoreList, submitHighscore } from './HighscoreList';

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
  hasExtractionCode: boolean;
  movementMode: 'sneak' | 'walk' | 'sprint';
  inCover: boolean;
  peeking: boolean;
  onViewDocuments: () => void;
  timeLimit?: number;
  playerName?: string;
}

export const HUD: React.FC<HUDProps> = ({ 
  player, killCount, messages, extractionProgress, time, 
  gameOver, extracted, documentsFound, totalDocuments, codesFound, hasExtractionCode, movementMode, inCover, peeking, onViewDocuments, timeLimit, playerName 
}) => {
  const scoreSubmittedRef = React.useRef(false);

  React.useEffect(() => {
    if ((gameOver || extracted) && playerName && playerName.trim().toLowerCase() !== 'test123' && playerName !== '__anonymous__' && !scoreSubmittedRef.current) {
      scoreSubmittedRef.current = true;
      const hasUSB = player.inventory.some(i => i.id === 'boss_usb');
      const hasCodes = player.inventory.some(i => i.id === 'nuclear_codebook');
      let result: 'success' | 'almost' | 'mia' | 'kia';
      if (gameOver) {
        result = 'kia';
      } else if (hasUSB && hasCodes) {
        result = 'success';
      } else if (hasUSB || hasCodes) {
        result = 'almost';
      } else {
        result = 'mia';
      }
      const lootValue = player.inventory.reduce((s, i) => s + i.value, 0);
      submitHighscore(playerName, killCount, time, result, lootValue);
    }
  }, [gameOver, extracted, playerName, hasExtractionCode, killCount, time, player.inventory]);
  const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
  const hpColor = hpPercent > 60 ? 'bg-safe' : hpPercent > 30 ? 'bg-warning' : 'bg-danger';

  const timeRemaining = timeLimit ? Math.max(0, timeLimit - time) : null;
  const minutes = timeRemaining !== null ? Math.floor(timeRemaining / 60) : 0;
  const seconds = timeRemaining !== null ? Math.floor(timeRemaining % 60) : 0;
  const timeUrgent = timeRemaining !== null && timeRemaining < 60;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-3">
        {/* HP */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground/70 font-mono">HP</span>
            <div className="w-28 h-3 bg-secondary rounded-sm overflow-hidden border border-border/40">
              <div className={`h-full ${hpColor} transition-all duration-200`} style={{ width: `${Math.min(100, hpPercent)}%` }} />
            </div>
            <span className="text-xs text-foreground font-mono">{Math.floor(player.hp)}</span>
          </div>
          {player.bleedRate > 0 && (
            <span className="text-xs text-danger animate-pulse-glow font-mono">🩸 BLEEDING</span>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            {(() => {
              const bandages = player.inventory.filter(i => i.medicalType === 'bandage').length;
              const medkits = player.inventory.filter(i => i.medicalType === 'medkit').length;
              const morphine = player.inventory.filter(i => i.medicalType === 'morphine').length;
              return (
                <>
                  <span className={`text-[10px] font-mono ${bandages > 0 ? 'text-foreground/70' : 'text-foreground/30'}`}>🩹{bandages}</span>
                  <span className={`text-[10px] font-mono ${medkits > 0 ? 'text-foreground/70' : 'text-foreground/30'}`}>🏥{medkits}</span>
                  <span className={`text-[10px] font-mono ${morphine > 0 ? 'text-loot' : 'text-foreground/30'}`}>💉{morphine}</span>
                  <span className="text-[9px] text-muted-foreground font-mono">[H]</span>
                </>
              );
            })()}
          </div>
          <div className="hidden sm:flex items-center gap-1 mt-0.5">
            {(() => {
              const icons = { sneak: '🤫', walk: '🚶', sprint: '🏃' };
              const labels = { sneak: 'SNEAK', walk: 'WALK', sprint: 'SPRINT' };
              const colors = { sneak: 'text-accent', walk: 'text-foreground/60', sprint: 'text-warning' };
              return (
                <span className={`text-[10px] font-mono ${colors[movementMode]}`}>
                  {icons[movementMode]} {labels[movementMode]}
                </span>
              );
            })()}
            {inCover && (
              <span className={`text-[10px] font-mono ${peeking ? 'text-warning animate-pulse-glow' : 'text-accent'}`}>
                | {peeking ? '🔫 PEEK' : '🛡️ COVER'}
              </span>
            )}
          </div>
        </div>

        {/* Timer */}
        {timeRemaining !== null && (
          <div className={`text-center ${timeUrgent ? 'animate-pulse-glow' : ''}`}>
            <span className={`font-display text-xl ${timeUrgent ? 'text-danger text-glow-red' : 'text-foreground'}`}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            {timeUrgent && <div className="text-[10px] text-danger font-mono">⚠ REINFORCEMENTS INBOUND</div>}
          </div>
        )}

        {/* Weapon slots */}
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1">
            <span className={`text-[10px] font-mono px-1 rounded ${player.activeSlot === 1 ? 'bg-accent/30 text-accent' : 'text-foreground/30'}`}>
              [1] {player.sidearm?.name || '—'}
            </span>
            <span className={`text-[10px] font-mono px-1 rounded ${player.activeSlot === 2 ? 'bg-accent/30 text-accent' : 'text-foreground/30'}`}>
              [2] {player.primaryWeapon?.name || '—'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-foreground font-display text-lg text-glow-amber">{player.currentAmmo}</span>
            <span className="text-muted-foreground text-xs font-mono">{player.ammoType}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-mono text-muted-foreground">💣</span>
            <span className={`text-xs font-mono ${player.inventory.filter(i => i.category === 'grenade').length > 0 ? 'text-warning' : 'text-muted-foreground/40'}`}>
              {player.inventory.filter(i => i.category === 'grenade').length}
            </span>
            <span className="text-[9px] text-muted-foreground font-mono">[G]</span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">☠ {killCount}</span>
          <button 
            className="text-xs font-mono text-accent/80 hover:text-accent pointer-events-auto flex items-center gap-1"
            onClick={onViewDocuments}
          >
            📄 {documentsFound}/{totalDocuments}
            {codesFound.length > 0 && <span className="text-warning">☢{codesFound.length}</span>}
          </button>
          <div className={`text-xs font-mono flex items-center gap-1 ${player.inventory.some(i => i.id === 'boss_usb') ? 'text-loot animate-pulse-glow' : 'text-muted-foreground/60'}`}>
            💾 {player.inventory.some(i => i.id === 'boss_usb') ? 'USB ACQUIRED' : 'USB MISSING'}
          </div>
          <div className={`text-xs font-mono flex items-center gap-1 ${player.inventory.some(i => i.id === 'nuclear_codebook') ? 'text-warning animate-pulse-glow' : 'text-muted-foreground/60'}`}>
            ☢ {player.inventory.some(i => i.id === 'nuclear_codebook') ? 'CODES ACQUIRED' : 'CODES MISSING'}
          </div>
        </div>
      </div>
      {/* Extraction progress */}
      {extractionProgress > 0 && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
          <span className="text-xs text-loot font-mono text-glow-green animate-pulse-glow">EXTRACTING...</span>
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
          <div className="flex flex-col items-center gap-4 p-8 border border-border bg-card rounded max-w-sm w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h1 className={`text-3xl font-display ${gameOver ? 'text-danger text-glow-red' : hasExtractionCode ? 'text-loot text-glow-green' : 'text-warning text-glow-amber'}`}>
              {gameOver ? '☠ KIA' : hasExtractionCode ? '🚁 MISSION COMPLETE' : '⚠ EXTRACTED'}
            </h1>
            {extracted && !hasExtractionCode && (
              <p className="text-sm font-mono text-warning text-center">
                {!player.inventory.some(i => i.id === 'boss_usb') && !player.inventory.some(i => i.id === 'nuclear_codebook')
                  ? 'Missing USB drive and nuclear codes.'
                  : !player.inventory.some(i => i.id === 'boss_usb')
                  ? 'Missing Osipovitj\'s USB drive.'
                  : 'Missing nuclear launch codes.'}
                <br/>Mission incomplete.
              </p>
            )}
            {extracted && hasExtractionCode && (
              <p className="text-sm font-mono text-loot text-center">
                💾☢ USB drive + nuclear codes delivered. Full success!
              </p>
            )}
            
            <div className="w-full border-t border-border pt-3 flex flex-col gap-2">
              <div className="flex justify-between text-sm font-mono text-muted-foreground">
                <span>Eliminated:</span>
                <span className="text-foreground">{killCount}</span>
              </div>
              <div className="flex justify-between text-sm font-mono text-muted-foreground">
                <span>Loot:</span>
                <span className="text-foreground">{player.inventory.length} items</span>
              </div>
              <div className="flex justify-between text-sm font-mono text-muted-foreground">
                <span>Value:</span>
                <span className="text-foreground">{player.inventory.reduce((s, i) => s + i.value, 0)}₽</span>
              </div>
              <div className="flex justify-between text-sm font-mono text-muted-foreground">
                <span>Documents:</span>
                <span className="text-foreground">{documentsFound}/{totalDocuments}</span>
              </div>
              <div className="flex justify-between text-sm font-mono text-muted-foreground">
                <span>Result:</span>
                <span className={`font-display ${gameOver ? 'text-danger' : hasExtractionCode ? 'text-loot' : 'text-warning'}`}>
                  {gameOver ? 'FAILED' : hasExtractionCode ? 'SUCCESS' : 'INCOMPLETE'}
                </span>
              </div>
              {codesFound.length > 0 && (
                <div className="mt-2 border-t border-border pt-2">
                  <span className="text-xs font-mono text-warning">☢ CODES FOUND:</span>
                  <div className="flex flex-col gap-1 mt-1">
                    {codesFound.map(code => (
                      <span key={code} className="text-sm font-display text-warning text-glow-amber tracking-wider">{code}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <HighscoreList currentName={playerName} />

            <FeedbackWidget playerName={playerName} />

            <button
              className="w-full px-6 py-2.5 bg-primary text-primary-foreground font-display uppercase tracking-wider rounded-sm hover:bg-primary/80 transition-colors"
              onClick={() => window.location.reload()}
            >
              🔄 RESTART
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
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute inset-0 bg-card/70 border border-border/40 rounded-sm" />
      <div
        className="absolute w-2 h-2 bg-safe rounded-full animate-pulse-glow"
        style={{ left: px - 4, top: py - 4 }}
      />
    </div>
  );
};
