import React from 'react';
import { Player, GameMessage } from '../../game/types';
import { LoreDocument } from '../../game/lore';
import { FeedbackWidget } from './FeedbackWidget';
import { HighscoreList, submitHighscore } from './HighscoreList';

interface AchievementStats {
  mosinKills: number;
  grenadeKills: number;
  tntKills: number;
  longShots: number;
  headshotKills: number;
  sneakKills: number;
  knifeDistanceKills: number;
  noHitsTaken: boolean;
  killCount: number;
}

export type AchievementTier = 'bronze' | 'silver' | 'gold';

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  desc: string;
  tier: AchievementTier;
  check: (s: AchievementStats) => boolean;
}

export const TIER_COLORS: Record<AchievementTier, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
};

export const TIER_LABEL: Record<AchievementTier, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
};

function tierAchievements(
  baseId: string, name: string, icon: string, descBase: string,
  field: keyof AchievementStats, thresholds: [number, number, number]
): Achievement[] {
  const tiers: AchievementTier[] = ['bronze', 'silver', 'gold'];
  return tiers.map((tier, i) => ({
    id: `${baseId}_${tier}`,
    name: `${name} ${TIER_LABEL[tier]}`,
    icon,
    desc: `${thresholds[i]}+ ${descBase}`,
    tier,
    check: (s: AchievementStats) => (s[field] as number) >= thresholds[i],
  }));
}

export const ACHIEVEMENTS: Achievement[] = [
  ...tierAchievements('mosin', 'Mosin Master', '🎯', 'kills with Mosin-Nagant', 'mosinKills', [5, 15, 25]),
  ...tierAchievements('nade', 'Bombardier', '💣', 'kills with grenades', 'grenadeKills', [5, 15, 25]),
  ...tierAchievements('tnt', 'Demolitionist', '🧨', 'kills with TNT charges', 'tntKills', [3, 8, 15]),
  ...tierAchievements('longshot', 'Sharpshooter', '🔭', 'kills at long range', 'longShots', [5, 15, 25]),
  ...tierAchievements('headshot', 'Headhunter', '💀', 'headshot kills', 'headshotKills', [5, 15, 25]),
  ...tierAchievements('close', 'Up Close', '🗡️', 'kills at close range', 'knifeDistanceKills', [5, 15, 25]),
  ...tierAchievements('kills', 'One Man Army', '🪖', 'kills in a single raid', 'killCount', [15, 25, 40]),
  { id: 'nohit', name: 'Ghost 👻', icon: '👻', desc: 'Complete a raid without taking damage', tier: 'gold', check: s => s.noHitsTaken && s.killCount > 0 },
];

// For each achievement group, return only the highest earned tier
export function getHighestTierAchievements(stats: AchievementStats): Achievement[] {
  const earned = ACHIEVEMENTS.filter(a => a.check(stats));
  // Group by base id (strip _tier suffix)
  const groups = new Map<string, Achievement>();
  for (const a of earned) {
    const baseId = a.id.replace(/_(bronze|silver|gold)$/, '');
    const existing = groups.get(baseId);
    if (!existing) {
      groups.set(baseId, a);
    } else {
      const tierOrder: AchievementTier[] = ['bronze', 'silver', 'gold'];
      if (tierOrder.indexOf(a.tier) > tierOrder.indexOf(existing.tier)) {
        groups.set(baseId, a);
      }
    }
  }
  return Array.from(groups.values());
}

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
  deathCause?: string;
  exfilRevealed?: string;
  achievementStats?: AchievementStats;
}

export const HUD: React.FC<HUDProps> = ({ 
  player, killCount, messages, extractionProgress, time, 
  gameOver, extracted, documentsFound, totalDocuments, codesFound, hasExtractionCode, movementMode, inCover, peeking, onViewDocuments, timeLimit, playerName, deathCause, exfilRevealed, achievementStats 
}) => {
  const scoreSubmittedRef = React.useRef(false);

  React.useEffect(() => {
    if ((gameOver || extracted) && playerName && playerName.trim().toLowerCase() !== 'test123' && !scoreSubmittedRef.current) {
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
      // Compute achievements — save highest tier per group
      const earned = achievementStats
        ? getHighestTierAchievements(achievementStats).map(a => a.id)
        : [];
      submitHighscore(playerName, killCount, time, result, lootValue, earned.join(','));
    }
  }, [gameOver, extracted, playerName, hasExtractionCode, killCount, time, player.inventory, achievementStats]);
  const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
  const hpColor = hpPercent > 60 ? 'bg-safe' : hpPercent > 30 ? 'bg-warning' : 'bg-danger';

  const timeRemaining = timeLimit ? Math.max(0, timeLimit - time) : null;
  const minutes = timeRemaining !== null ? Math.floor(timeRemaining / 60) : 0;
  const seconds = timeRemaining !== null ? Math.floor(timeRemaining % 60) : 0;
  const timeUrgent = timeRemaining !== null && timeRemaining < 60;

  const grenadeCount = player.inventory.filter(i => i.category === 'grenade').length;
  const flashbangCount = player.inventory.filter(i => i.category === 'flashbang').length;
  const tntCount = player.tntCount || 0;
  const bandages = player.inventory.filter(i => i.medicalType === 'bandage').length;
  const medkits = player.inventory.filter(i => i.medicalType === 'medkit').length;
  const morphine = player.inventory.filter(i => i.medicalType === 'morphine').length;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-3 gap-2">
        {/* LEFT PANEL — HP, Medical, Movement */}
        <div className="flex flex-col gap-1.5 bg-card/70 backdrop-blur-sm rounded-md p-2.5 border border-border/40">
          {/* HP bar — large and clear */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-display text-foreground/80">HP</span>
            <div className="w-36 h-4 bg-secondary rounded-sm overflow-hidden border border-border/50">
              <div className={`h-full ${hpColor} transition-all duration-200`} style={{ width: `${Math.min(100, hpPercent)}%` }} />
            </div>
            <span className="text-sm font-display text-foreground tabular-nums min-w-[32px] text-right">{Math.floor(player.hp)}</span>
          </div>
          {player.bleedRate > 0 && (
            <span className="text-sm text-danger animate-pulse-glow font-display">🩸 BLEEDING</span>
          )}
          {/* Medical supplies */}
          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono ${bandages > 0 ? 'text-foreground' : 'text-foreground/30'}`}>🩹 {bandages}</span>
            <span className={`text-xs font-mono ${medkits > 0 ? 'text-foreground' : 'text-foreground/30'}`}>🏥 {medkits}</span>
            <span className={`text-xs font-mono ${morphine > 0 ? 'text-loot' : 'text-foreground/30'}`}>💉 {morphine}</span>
            <span className="text-[10px] text-muted-foreground font-mono">[H] heal</span>
          </div>
          {/* Movement & Cover */}
          <div className="hidden sm:flex items-center gap-2">
            {(() => {
              const icons = { sneak: '🤫', walk: '🚶', sprint: '🏃' };
              const labels = { sneak: 'SNEAK', walk: 'WALK', sprint: 'SPRINT' };
              const colors = { sneak: 'text-accent', walk: 'text-foreground/70', sprint: 'text-warning' };
              return (
                <span className={`text-xs font-mono ${colors[movementMode]}`}>
                  {icons[movementMode]} {labels[movementMode]}
                </span>
              );
            })()}
            {inCover && (
              <span className={`text-xs font-mono ${peeking ? 'text-warning animate-pulse-glow' : 'text-accent'}`}>
                {peeking ? '🔫 PEEK' : '🛡️ COVER'}
              </span>
            )}
          </div>
        </div>

        {/* CENTER — Timer */}
        {timeRemaining !== null && (
          <div className={`text-center bg-card/70 backdrop-blur-sm rounded-md px-4 py-2 border border-border/40 ${timeUrgent ? 'border-danger/50' : ''}`}>
            <span className={`font-display text-2xl ${timeUrgent ? 'text-danger text-glow-red animate-pulse-glow' : 'text-foreground'}`}>
              ⏱ {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <div className={`text-[10px] font-mono ${timeUrgent ? 'text-danger' : 'text-muted-foreground'}`}>
              {timeUrgent ? '⚠ HURRY!' : 'Time limit'}
            </div>
          </div>
        )}

        {/* RIGHT PANEL — Weapons, Equipment, Mission */}
        <div className="flex flex-col items-end gap-1.5">
          {/* Active weapon — big prominent card */}
          <div className="bg-card/90 backdrop-blur-sm border-2 border-accent/60 rounded-md px-4 py-2.5 shadow-lg min-w-[200px]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-foreground font-display text-base leading-tight">
                  🔫 {player.equippedWeapon?.name || '—'}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{player.ammoType}</span>
              </div>
              <span className="text-2xl font-display text-accent text-glow-green tabular-nums">{player.currentAmmo}</span>
            </div>
          </div>
          {/* Weapon slot buttons */}
          <div className="flex gap-1.5">
            <div className={`px-3 py-1.5 rounded-md border-2 text-xs font-mono min-w-[95px] text-center ${player.activeSlot === 1 ? 'bg-accent/20 border-accent text-accent shadow-md' : 'bg-card/60 border-border/50 text-muted-foreground'}`}>
              [1] {player.sidearm?.name || '—'}
            </div>
            <div className={`px-3 py-1.5 rounded-md border-2 text-xs font-mono min-w-[95px] text-center ${player.activeSlot === 2 ? 'bg-accent/20 border-accent text-accent shadow-md' : 'bg-card/60 border-border/50 text-muted-foreground'}`}>
              [2] {player.primaryWeapon?.name || '—'}
            </div>
          </div>
          {/* Grenades, Flashbangs & TNT — always visible */}
          <div className="flex items-center gap-2 bg-card/70 backdrop-blur-sm border border-border/40 rounded-md px-3 py-1.5">
            <span className={`text-sm font-mono ${grenadeCount > 0 ? 'text-warning' : 'text-muted-foreground/40'}`}>
              💣 {grenadeCount}
            </span>
            <span className={`text-sm font-mono ${flashbangCount > 0 ? 'text-foreground' : 'text-muted-foreground/40'}`}>
              💫 {flashbangCount}
            </span>
            <span className="text-[9px] text-muted-foreground font-mono">[G]</span>
            <span className="text-muted-foreground/30">|</span>
            <span className={`text-sm font-mono font-bold ${tntCount > 0 ? 'text-warning' : 'text-muted-foreground/40'}`}>
              🧨 {tntCount}
            </span>
            <span className="text-[9px] text-muted-foreground font-mono">[T wall]</span>
          </div>
          {/* Kill count & docs */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-foreground/80 font-mono">☠ {killCount}</span>
            <button 
              className="text-sm font-mono text-accent/80 hover:text-accent pointer-events-auto flex items-center gap-1"
              onClick={onViewDocuments}
            >
              📄 {documentsFound}/{totalDocuments}
              {codesFound.length > 0 && <span className="text-warning ml-1">☢{codesFound.length}</span>}
            </button>
          </div>
          {/* Mission items — prominent cards */}
          <div className="flex gap-1.5">
            <div className={`text-sm font-mono font-bold flex items-center gap-1 px-2.5 py-1 rounded-md ${player.inventory.some(i => i.id === 'boss_usb') ? 'text-loot bg-loot/15 border-2 border-loot/40 animate-pulse-glow' : 'text-muted-foreground/40 bg-card/50 border border-border/30'}`}>
              💾 {player.inventory.some(i => i.id === 'boss_usb') ? 'USB ✓' : 'USB'}
            </div>
            <div className={`text-sm font-mono font-bold flex items-center gap-1 px-2.5 py-1 rounded-md ${player.inventory.some(i => i.id === 'nuclear_codebook') ? 'text-warning bg-warning/15 border-2 border-warning/40 animate-pulse-glow' : 'text-muted-foreground/40 bg-card/50 border border-border/30'}`}>
              ☢ {player.inventory.some(i => i.id === 'nuclear_codebook') ? 'CODES ✓' : 'CODES'}
            </div>
          </div>
          {/* Exfil revealed indicator */}
          {exfilRevealed && (
            <div className="text-sm font-mono font-bold flex items-center gap-1 px-2.5 py-1 rounded-md text-accent bg-accent/15 border-2 border-accent/40 animate-pulse-glow">
              🚁 EXFIL: {exfilRevealed}
            </div>
          )}
        </div>
      </div>
      {/* Extraction progress */}
      {extractionProgress > 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 bg-card/80 backdrop-blur-sm rounded-md px-6 py-2 border border-loot/40">
          <span className="text-sm text-loot font-display text-glow-green animate-pulse-glow tracking-wider">EXTRACTING...</span>
          <div className="w-48 h-3 bg-secondary rounded-sm overflow-hidden border border-loot/40">
            <div className="h-full bg-loot transition-all duration-100" style={{ width: `${(extractionProgress / 5) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Messages — larger and more readable */}
      <div className="absolute bottom-32 left-3 flex flex-col gap-1.5 max-w-sm">
        {messages.slice(-6).map((msg, i) => {
          const age = time - msg.time;
          if (age > 8) return null;
          const opacity = age > 5 ? (8 - age) / 3 : 1;
          const colors: Record<string, string> = {
            info: 'text-foreground/90',
            warning: 'text-warning',
            loot: 'text-loot',
            damage: 'text-danger',
            kill: 'text-accent',
            intel: 'text-accent-foreground',
          };
          return (
            <div
              key={`${msg.time}-${i}`}
              className={`text-sm font-mono ${colors[msg.type] || 'text-foreground'} drop-shadow-md`}
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
            {gameOver && deathCause && (
              <p className="text-sm font-mono text-danger/90 text-center border border-danger/30 bg-danger/10 rounded px-3 py-1.5">
                {deathCause}
              </p>
            )}
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
                <span>Time:</span>
                <span className="text-foreground">{Math.floor(time / 60)}:{String(Math.floor(time % 60)).padStart(2, '0')}</span>
              </div>
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
              {/* Achievements */}
              {achievementStats && (() => {
                const earned = getHighestTierAchievements(achievementStats);
                return earned.length > 0 ? (
                  <div className="mt-2 border-t border-border pt-2">
                    <span className="text-xs font-mono text-accent">🏅 ACHIEVEMENTS:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {earned.map(a => (
                        <div key={a.id} className="flex items-center gap-1 px-2 py-0.5 rounded border"
                          style={{ borderColor: TIER_COLORS[a.tier] + '66', backgroundColor: TIER_COLORS[a.tier] + '15' }}>
                          <span className="text-sm">{a.icon}</span>
                          <span className="text-[10px] font-mono" style={{ color: TIER_COLORS[a.tier] }}>{a.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
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