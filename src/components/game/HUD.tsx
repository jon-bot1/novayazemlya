import React from 'react';
import { Player, GameMessage } from '../../game/types';
import { LoreDocument } from '../../game/lore';
import { FeedbackWidget } from './FeedbackWidget';
import { HighscoreList, submitHighscore, calculateScore } from './HighscoreList';
import { MissionObjective } from '../../game/objectives';
import { UPGRADES, UpgradeState, getUpgradeLevel } from '../../game/upgrades';

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
  bodiesLooted: number;
  cachesLooted: number;
  wallsBreached: number;
  documentsCollected: number;
  terminalsHacked: number;
  distanceTravelled: number;
  exfilsVisited: number;
  dogsKilled: number;
  totalDogsOnMap: number;
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
  ...tierAchievements('mosin', 'Mosin Master', '🎯', 'kills with Mosin-Nagant', 'mosinKills', [10, 25, 40]),
  ...tierAchievements('nade', 'Bombardier', '💣', 'kills with grenades', 'grenadeKills', [8, 20, 35]),
  ...tierAchievements('tnt', 'Demolitionist', '🧨', 'kills with TNT charges', 'tntKills', [5, 12, 25]),
  ...tierAchievements('longshot', 'Sharpshooter', '🔭', 'kills at long range', 'longShots', [8, 20, 35]),
  ...tierAchievements('headshot', 'Headhunter', '💀', 'headshot kills', 'headshotKills', [10, 25, 40]),
  ...tierAchievements('close', 'Up Close', '🗡️', 'kills at close range', 'knifeDistanceKills', [8, 20, 35]),
  ...tierAchievements('kills', 'One Man Army', '🪖', 'kills in a single raid', 'killCount', [25, 40, 60]),
  ...tierAchievements('bodies', 'Scavenger', '🦴', 'bodies looted', 'bodiesLooted', [8, 15, 25]),
  ...tierAchievements('caches', 'Treasure Hunter', '📦', 'caches looted', 'cachesLooted', [6, 12, 20]),
  ...tierAchievements('breach', 'Breacher', '🧱', 'walls breached with TNT', 'wallsBreached', [2, 5, 8]),
  ...tierAchievements('docs', 'Archivist', '📜', 'documents collected', 'documentsCollected', [4, 7, 10]),
  ...tierAchievements('hacks', 'Hackerman', '💻', 'terminals hacked', 'terminalsHacked', [2, 4, 6]),
  ...tierAchievements('travel', 'Traveller', '🥾', 'm distance travelled', 'distanceTravelled', [1500, 4000, 8000]),
  { id: 'tourist', name: 'Tourist 🗺️', icon: '🗺️', desc: 'Visit all 3 exfil points in one raid', tier: 'gold', check: s => s.exfilsVisited >= 3 },
  { id: 'nohit', name: 'Ghost 👻', icon: '👻', desc: 'Complete a raid without taking damage', tier: 'gold', check: s => s.noHitsTaken && s.killCount > 0 },
  { id: 'goodboy', name: 'Good Boy 🐕', icon: '🐕', desc: 'Extract without killing any dogs', tier: 'gold', check: s => s.totalDogsOnMap > 0 && s.dogsKilled === 0 },
];

export function getHighestTierAchievements(stats: AchievementStats): Achievement[] {
  const earned = ACHIEVEMENTS.filter(a => a.check(stats));
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
  coverType?: 'high' | 'low';
  canHide?: boolean;
  isHiding?: boolean;
  onViewDocuments: () => void;
  timeLimit?: number;
  playerName?: string;
  deathCause?: string;
  exfilRevealed?: string;
  achievementStats?: AchievementStats;
  onReturnToBase?: () => void;
  objectives?: MissionObjective[];
  activeUpgrades?: UpgradeState;
  isMobile?: boolean;
  mapId?: string;
  noiseLevel?: number;
  weather?: { type: string; intensity: number } | null;
  shotsFired?: number;
  shotsHit?: number;
  damageDealt?: number;
  damageTaken?: number;
  enemyPositions?: { x: number; y: number; type: string; state: string }[];
  extractionPositions?: { x: number; y: number; name: string; active: boolean }[];
  objectivePositions?: { x: number; y: number }[];
  mapWidth?: number;
  mapHeight?: number;
}

export const HUD: React.FC<HUDProps> = ({ 
  player, killCount, messages, extractionProgress, time, 
  gameOver, extracted, documentsFound, totalDocuments, codesFound, hasExtractionCode, movementMode, inCover, peeking, coverType, canHide, isHiding, onViewDocuments, timeLimit, playerName, deathCause, exfilRevealed, achievementStats, onReturnToBase, objectives, activeUpgrades, isMobile: isMobileProp, mapId, noiseLevel, weather, shotsFired, shotsHit, damageDealt, damageTaken, enemyPositions, extractionPositions, objectivePositions, mapWidth, mapHeight
}) => {
  const mobileMode = !!isMobileProp;
  const bottomOffset = mobileMode ? 'bottom-28' : 'bottom-12';
  const bottomCenterOffset = mobileMode ? 'bottom-28' : 'bottom-24';
  const scoreSubmittedRef = React.useRef(false);

  React.useEffect(() => {
    if ((gameOver || extracted) && playerName && playerName.trim().toLowerCase() !== 'test123' && playerName.trim().toLowerCase() !== 'test3' && !scoreSubmittedRef.current) {
      scoreSubmittedRef.current = true;
      const hasUSB = player.inventory.some(i => i.id === 'boss_usb');
      const hasCodes = player.inventory.some(i => i.id === 'nuclear_codebook');
      let result: 'success' | 'almost' | 'mia' | 'kia';
      if (gameOver) result = 'kia';
      else if (hasUSB && hasCodes) result = 'success';
      else if (hasUSB || hasCodes) result = 'almost';
      else result = 'mia';
      const lootValue = player.inventory.reduce((s, i) => s + i.value, 0);
      const earned = achievementStats ? getHighestTierAchievements(achievementStats).map(a => a.id) : [];
      submitHighscore(playerName, killCount, time, result, lootValue, earned.join(','));
    }
  }, [gameOver, extracted, playerName, hasExtractionCode, killCount, time, player.inventory, achievementStats]);

  const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
  const staminaPercent = Math.min(100, (player.stamina / player.maxStamina) * 100);
  const timeRemaining = timeLimit ? Math.max(0, timeLimit - time) : null;
  const minutes = timeRemaining !== null ? Math.floor(timeRemaining / 60) : 0;
  const seconds = timeRemaining !== null ? Math.floor(timeRemaining % 60) : 0;
  const timeUrgent = timeRemaining !== null && timeRemaining < 60;

  const grenadeCount = player.inventory.filter(i => i.category === 'grenade').length;
  const gasGrenadeCount = player.inventory.filter(i => i.category === 'gas_grenade').length;
  const flashbangCount = player.inventory.filter(i => i.category === 'flashbang').length;
  const tntCount = player.specialSlot?.filter(i => i.name === 'TNT Charge').length || 0;
  const bandages = player.inventory.filter(i => i.medicalType === 'bandage').length;
  const medkits = player.inventory.filter(i => i.medicalType === 'medkit').length;
  const morphine = player.inventory.filter(i => i.medicalType === 'morphine').length;
  const injectorCount = player.inventory.filter(i => i.id === 'emergency_injector' || i.name === 'Emergency Injector').length;
  const nonTntSpecial = (player.specialSlot || []).filter(i => i.name !== 'TNT Charge');

  return (
    <div className="absolute inset-0 pointer-events-none">

      {/* ═══════ TOP BAR — Timer + Minimap + Status ═══════ */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-2 sm:px-3 pt-1 sm:pt-2">
        {/* Top-left: Stealth/movement indicator — single compact line */}
        <div className="flex items-center gap-1 sm:gap-2 bg-card/60 backdrop-blur-sm rounded px-1.5 sm:px-2 py-0.5 sm:py-1 border border-border/30">
          {(() => {
            const icons = { sneak: '🤫', walk: '🚶', sprint: '🏃' };
            const colors = { sneak: 'text-accent', walk: 'text-foreground/60', sprint: 'text-warning' };
            return <span className={`text-[10px] font-mono ${colors[movementMode]}`}>{icons[movementMode]}</span>;
          })()}
          {isHiding && <span className="text-[10px] font-mono text-accent">HIDDEN</span>}
          {inCover && !isHiding && (
            <span className={`text-[10px] font-mono ${peeking ? 'text-warning' : 'text-accent'}`}>
              {peeking ? '🔫PEEK' : coverType === 'high' ? '🛡️COVER' : '🪨COVER'}
            </span>
          )}
          {player.bleedRate > 0 && <span className="text-[10px] text-danger animate-pulse font-mono">🩸BLEED</span>}
          {player.reloading && <span className="text-[10px] text-warning animate-pulse font-mono">⟳RELOAD</span>}
        </div>

        {/* Top-center: Timer */}
        {timeRemaining !== null && (
          <div className={`bg-card/60 backdrop-blur-sm rounded px-3 py-1 border ${timeUrgent ? 'border-danger/50' : 'border-border/30'}`}>
            <span className={`font-display text-lg tabular-nums ${timeUrgent ? 'text-danger animate-pulse' : 'text-foreground/80'}`}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Top-right: Enhanced Minimap + Kill count + Weather */}
        <div className="flex items-start gap-2">
          <div className="flex flex-col items-end gap-1">
            {weather && weather.type !== 'clear' && (
              <span className="text-[9px] font-mono text-foreground/50 bg-card/50 rounded px-1.5 py-0.5">
                {weather.type === 'blizzard' ? '🌨️' : weather.type === 'snow' ? '❄️' : weather.type === 'fog' ? '🌫️' : weather.type === 'rain' ? '🌧️' : '💨'}
                {weather.type.toUpperCase()}
              </span>
            )}
            <span className="text-[10px] font-mono text-foreground/60 bg-card/50 rounded px-1.5 py-0.5">☠ {killCount}</span>
            <button
              className="text-[10px] font-mono text-accent/70 hover:text-accent pointer-events-auto bg-card/50 rounded px-1.5 py-0.5"
              onClick={onViewDocuments}
            >
              📄 {documentsFound}/{totalDocuments}
              {codesFound.length > 0 && <span className="text-warning ml-1">☢{codesFound.length}</span>}
            </button>
          </div>
          <div className="hidden sm:block">
            <EnhancedMiniMap
              playerX={player.pos.x} playerY={player.pos.y}
              playerAngle={player.angle}
              mapW={mapWidth || 2400} mapH={mapHeight || 2400}
              enemies={enemyPositions || []}
              extractions={extractionPositions || []}
              objectives={objectivePositions || []}
            />
          </div>
        </div>
      </div>

      {/* ═══════ BOTTOM-LEFT: HP + Stamina + Medical ═══════ */}
      <div className={`absolute ${bottomOffset} left-2 sm:left-3 flex flex-col gap-1 ${mobileMode ? 'scale-[0.8]' : 'scale-100'} origin-bottom-left`}>
        {/* HP bar */}
        <div className="flex items-center gap-1.5">
          <div className="w-32 h-3 bg-background/60 rounded-sm overflow-hidden border border-border/30">
            <div
              className={`h-full transition-all duration-200 ${
                hpPercent > 60 ? 'bg-safe' : hpPercent > 30 ? 'bg-warning' : 'bg-danger'
              }`}
              style={{ width: `${Math.min(100, hpPercent)}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-foreground/80 tabular-nums w-6 text-right">{Math.floor(player.hp)}</span>
        </div>
        {/* Stamina bar */}
        <div className="flex items-center gap-1.5">
          <div className="w-32 h-1.5 bg-background/40 rounded-sm overflow-hidden border border-border/20">
            <div className="h-full bg-accent/50 transition-all duration-200" style={{ width: `${staminaPercent}%` }} />
          </div>
          <span className="text-[8px] font-mono text-foreground/40 tabular-nums w-6 text-right">{Math.floor(player.stamina)}</span>
        </div>
        {/* Noise meter */}
        {noiseLevel !== undefined && (
          <div className="flex items-center gap-1.5">
            <div className="w-32 h-1.5 bg-background/40 rounded-sm overflow-hidden border border-border/20">
              <div
                className={`h-full transition-all duration-200 ${
                  noiseLevel > 0.6 ? 'bg-danger/70' : noiseLevel > 0.3 ? 'bg-warning/60' : 'bg-accent/40'
                }`}
                style={{ width: `${Math.min(100, noiseLevel * 100)}%` }}
              />
            </div>
            <span className={`text-[8px] font-mono tabular-nums w-6 text-right ${
              noiseLevel > 0.6 ? 'text-danger/70' : noiseLevel > 0.3 ? 'text-warning/60' : 'text-foreground/30'
            }`}>🔊</span>
          </div>
        )}
        {/* Reload progress bar (only while reloading) */}
        {player.reloading && (
          <div className="w-32 h-1.5 bg-background/40 rounded-sm overflow-hidden border border-warning/30">
            <div className="h-full bg-warning transition-all duration-100" style={{ width: `${Math.max(0, (1 - player.reloadTimer / player.reloadTime) * 100)}%` }} />
          </div>
        )}
        {/* Medical row — compact icons */}
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono ${bandages > 0 ? 'text-foreground/80' : 'text-foreground/20'}`}>🩹{bandages}</span>
          <span className={`text-[10px] font-mono ${medkits > 0 ? 'text-foreground/80' : 'text-foreground/20'}`}>🏥{medkits}</span>
          <span className={`text-[10px] font-mono ${morphine > 0 ? 'text-loot' : 'text-foreground/20'}`}>💉{morphine}</span>
          {injectorCount > 0 && <span className="text-[10px] font-mono text-accent">⚡{injectorCount}</span>}
          {injectorCount === 0 && <span className="text-[8px] font-mono text-danger/50">NO INJ</span>}
        </div>
      </div>

      {/* ═══════ BOTTOM-RIGHT: Weapon + Ammo + Throwables ═══════ */}
      <div className={`absolute ${bottomOffset} right-2 sm:right-3 flex flex-col items-end gap-1 ${mobileMode ? 'scale-[0.8]' : 'scale-100'} origin-bottom-right`}>
        {/* Active weapon + Visual ammo counter */}
        <div className="flex items-center gap-2 bg-card/70 backdrop-blur-sm rounded px-2.5 py-1.5 border border-accent/40">
          <div className="flex flex-col items-start">
            <span className="text-foreground font-display text-sm leading-tight">
              {player.activeSlot === 1 ? '🗡️' : '🔫'} {player.equippedWeapon?.name || '—'}
            </span>
            <span className="text-[8px] text-muted-foreground/60 font-mono">{player.activeSlot === 1 ? 'Melee' : player.ammoType}</span>
          </div>
          {player.activeSlot !== 1 && (
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-xl font-display text-accent tabular-nums font-bold">{player.currentAmmo}</span>
              {/* Visual magazine bar */}
              <div className="flex gap-px">
                {Array.from({ length: Math.min(30, player.maxAmmo) }).map((_, i) => {
                  const filled = i < player.currentAmmo;
                  const ratio = player.maxAmmo > 30 ? Math.ceil(player.maxAmmo / 30) : 1;
                  const actualFilled = i * ratio < player.currentAmmo;
                  return (
                    <div key={i} className={`h-1.5 rounded-sm transition-all duration-75 ${
                      actualFilled
                        ? player.currentAmmo <= Math.ceil(player.maxAmmo * 0.2) ? 'bg-danger' : 'bg-accent'
                        : 'bg-background/40'
                    }`} style={{ width: Math.max(1, Math.min(3, 60 / Math.min(30, player.maxAmmo))) }} />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Weapon slots — tiny pills */}
        <div className="flex gap-1">
          {([
            { slot: 1 as const, icon: '🗡️', name: 'Knife' },
            { slot: 2 as const, icon: '🔫', name: player.sidearm?.name || '—' },
            { slot: 3 as const, icon: '🎯', name: player.primaryWeapon?.name || '—' },
          ]).map(w => (
            <div
              key={w.slot}
              className={`px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all ${
                player.activeSlot === w.slot
                  ? 'bg-accent/20 border-accent/60 text-accent font-bold'
                  : w.name !== '—'
                  ? 'bg-card/50 border-border/30 text-muted-foreground/70'
                  : 'bg-card/20 border-border/10 text-muted-foreground/20'
              }`}
            >
              [{w.slot}]{w.icon}
            </div>
          ))}
        </div>

        {/* Ammo reserves — single compact line, only current type highlighted */}
        <div className="flex gap-0.5">
          {(['9x18', '5.45x39', '7.62x39', '12gauge', '7.62x54R'] as const).map(at => {
            const count = player.ammoReserves[at] || 0;
            if (count === 0 && player.ammoType !== at) return null;
            const isActive = player.ammoType === at;
            return (
              <span
                key={at}
                className={`text-[8px] font-mono px-1 py-0.5 rounded ${
                  isActive ? 'bg-accent/15 text-accent font-bold' : 'text-muted-foreground/40'
                }`}
              >
                {at.split('x')[0]}:{count}
              </span>
            );
          })}
        </div>

        {/* Throwables + TNT + Keycard — single compact row */}
        <div className="flex items-center gap-1.5">
          {([
            { type: 'grenade' as const, icon: '💣', count: grenadeCount },
            { type: 'gas_grenade' as const, icon: '☣️', count: gasGrenadeCount },
            { type: 'flashbang' as const, icon: '💫', count: flashbangCount },
          ]).map(t => {
            const isSelected = player.selectedThrowable === t.type;
            if (t.count === 0 && !isSelected) return null;
            return (
              <span
                key={t.type}
                className={`text-[10px] font-mono ${
                  isSelected && t.count > 0 ? 'text-accent font-bold' : isSelected ? 'text-muted-foreground/30' : 'text-foreground/50'
                }`}
              >
                {t.icon}{t.count}{isSelected && '▸'}
              </span>
            );
          })}
          {tntCount > 0 && <span className="text-[10px] font-mono text-warning">🧨{tntCount}</span>}
          {(player.keycardCount || 0) > 0 && <span className="text-[10px] font-mono text-accent">💳{player.keycardCount}</span>}
        </div>

        {/* Special slot — only if has items */}
        {nonTntSpecial.length > 0 && (
          <div className="flex items-center gap-1 bg-card/60 rounded px-2 py-0.5 border border-loot/30">
            <span className="text-[10px]">{nonTntSpecial[0].icon}</span>
            <span className="text-[9px] font-mono text-loot">{nonTntSpecial[0].name} ×{nonTntSpecial.length}</span>
            <span className="text-[8px] font-mono text-accent/60">[X]</span>
          </div>
        )}
      </div>

      {/* ═══════ LEFT SIDE: Mission items + Objectives ═══════ */}
      <div className="absolute left-2 sm:left-3 top-10 sm:top-1/2 sm:-translate-y-1/2 flex flex-col gap-1 sm:gap-1.5 scale-90 sm:scale-100 origin-top-left">
        {/* Mission items — only on objekt47 */}
        {(!mapId || mapId === 'objekt47') && (
        <div className="flex flex-col gap-0.5">
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
            player.inventory.some(i => i.id === 'boss_usb')
              ? 'text-loot bg-loot/15 border border-loot/30'
              : 'text-muted-foreground/25'
          }`}>💾 USB</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
            player.inventory.some(i => i.id === 'nuclear_codebook')
              ? 'text-warning bg-warning/15 border border-warning/30 animate-pulse'
              : 'text-muted-foreground/25'
          }`}>☢ CODES</span>
        </div>
        )}
        {/* Exfil indicator */}
        {exfilRevealed && (
          <span className="text-[10px] font-mono text-accent bg-accent/10 border border-accent/30 rounded px-1.5 py-0.5 animate-pulse">
            🚁 {exfilRevealed}
          </span>
        )}
        {/* Objectives — minimal list */}
        {objectives && objectives.length > 0 && !gameOver && !extracted && (
          <div className="flex flex-col gap-0.5 mt-1">
            {objectives.map(obj => (
              <span key={obj.id} className={`text-[9px] font-mono ${
                obj.completed ? 'text-accent/50 line-through' : obj.type === 'main' ? 'text-foreground/60' : 'text-muted-foreground/40'
              }`}>
                {obj.completed ? '✓' : '·'} {obj.name}
              </span>
            ))}
          </div>
        )}
        {/* Upgrades */}
        {activeUpgrades && Object.keys(activeUpgrades).length > 0 && (
          <div className="flex gap-0.5 mt-1">
            {UPGRADES.filter(u => getUpgradeLevel(activeUpgrades, u.id) > 0).map(u => (
              <span key={u.id} className="text-[10px]" title={`${u.name} Lv${getUpgradeLevel(activeUpgrades, u.id)}`}>{u.icon}</span>
            ))}
          </div>
        )}
      </div>

      {/* ═══════ BOTTOM-CENTER: Messages ═══════ */}
      <div className={`absolute ${bottomCenterOffset} left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 max-w-md w-full ${mobileMode ? 'px-16' : 'px-0'}`}>
        {messages.slice(-4).map((msg, i) => {
          const age = time - msg.time;
          if (age > 6) return null;
          const opacity = age > 4 ? (6 - age) / 2 : 1;
          const colors: Record<string, string> = {
            info: 'text-foreground/80',
            warning: 'text-warning',
            loot: 'text-loot',
            damage: 'text-danger',
            kill: 'text-accent',
            intel: 'text-accent',
          };
          return (
            <span
              key={`${msg.time}-${i}`}
              className={`text-[11px] font-mono ${colors[msg.type] || 'text-foreground'} drop-shadow-md text-center`}
              style={{ opacity }}
            >
              {msg.text}
            </span>
          );
        })}
      </div>

      {/* ═══════ EXTRACTION PROGRESS ═══════ */}
      {extractionProgress > 0 && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
          <span className="text-xs text-loot font-display animate-pulse tracking-wider">EXTRACTING</span>
          <div className="w-40 h-2 bg-background/60 rounded-sm overflow-hidden border border-loot/30">
            <div className="h-full bg-loot transition-all duration-100" style={{ width: `${(extractionProgress / 5) * 100}%` }} />
          </div>
        </div>
      )}

      {/* ═══════ GAME OVER / EXTRACTED ═══════ */}
      {(gameOver || extracted) && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/85 pointer-events-auto animate-in fade-in duration-500">
          <div className="flex flex-col items-center gap-4 p-8 border border-border bg-card rounded max-w-sm w-full mx-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-700">
            <h1 className={`text-3xl font-display tracking-wider ${gameOver ? 'text-danger' : hasExtractionCode ? 'text-loot' : 'text-warning'}`}>
              {gameOver ? '☠ KIA' : hasExtractionCode ? '🚁 MISSION COMPLETE' : '⚠ EXTRACTED'}
            </h1>
            {gameOver && deathCause && (
              <p className="text-sm font-mono text-danger/90 text-center border border-danger/30 bg-danger/10 rounded px-3 py-1.5 animate-in fade-in duration-1000">{deathCause}</p>
            )}
            {extracted && !hasExtractionCode && (!mapId || mapId === 'objekt47') && (
              <p className="text-sm font-mono text-warning text-center">
                {!player.inventory.some(i => i.id === 'boss_usb') && !player.inventory.some(i => i.id === 'nuclear_codebook')
                  ? 'Missing USB drive and nuclear codes.'
                  : !player.inventory.some(i => i.id === 'boss_usb')
                  ? 'Missing Osipovitj\'s USB drive.'
                  : 'Missing nuclear launch codes.'}
                <br/>Mission incomplete.
              </p>
            )}
            {extracted && hasExtractionCode && (!mapId || mapId === 'objekt47') && (
              <p className="text-sm font-mono text-loot text-center">💾☢ USB drive + nuclear codes delivered. Full success!</p>
            )}
            
            <div className="w-full border-t border-border pt-3 flex flex-col gap-2">
              {/* Animated stat rows */}
              {[
                { label: 'Time', value: `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`, delay: '100ms' },
                { label: 'Eliminated', value: `${killCount}`, delay: '200ms' },
                { label: 'Headshots', value: `${achievementStats?.headshotKills || 0}`, delay: '300ms' },
                { label: 'Long Shots', value: `${achievementStats?.longShots || 0}`, delay: '350ms' },
                { label: 'Stealth Kills', value: `${achievementStats?.sneakKills || 0}`, delay: '400ms' },
                { label: 'Distance', value: `${achievementStats?.distanceTravelled || 0}m`, delay: '450ms' },
                { label: 'Bodies Looted', value: `${achievementStats?.bodiesLooted || 0}`, delay: '500ms' },
                { label: 'Caches Opened', value: `${achievementStats?.cachesLooted || 0}`, delay: '550ms' },
                { label: 'Walls Breached', value: `${achievementStats?.wallsBreached || 0}`, delay: '600ms' },
                { label: 'Terminals Hacked', value: `${achievementStats?.terminalsHacked || 0}`, delay: '650ms' },
                { label: 'Loot Value', value: `${player.inventory.reduce((s, i) => s + i.value, 0)}₽`, delay: '700ms' },
                { label: 'Documents', value: `${documentsFound}/${totalDocuments}`, delay: '750ms' },
              ].map((stat, i) => (
                <div key={stat.label} className="flex justify-between text-sm font-mono text-muted-foreground animate-in slide-in-from-left-2 fade-in" style={{ animationDelay: stat.delay, animationFillMode: 'backwards' }}>
                  <span>{stat.label}:</span>
                  <span className="text-foreground">{stat.value}</span>
                </div>
              ))}

              {/* Stealth Rating */}
              {achievementStats && (() => {
                const stealthRatio = killCount > 0 ? (achievementStats.sneakKills / killCount) : 0;
                const rating = stealthRatio > 0.7 ? 'GHOST' : stealthRatio > 0.4 ? 'SHADOW' : stealthRatio > 0.1 ? 'OPERATIVE' : 'LOUD';
                const ratingColor = stealthRatio > 0.7 ? 'text-accent' : stealthRatio > 0.4 ? 'text-loot' : stealthRatio > 0.1 ? 'text-foreground' : 'text-danger';
                return (
                  <div className="flex justify-between text-sm font-mono animate-in fade-in" style={{ animationDelay: '800ms', animationFillMode: 'backwards' }}>
                    <span className="text-muted-foreground">Stealth Rating:</span>
                    <span className={`font-display ${ratingColor}`}>{rating}</span>
                  </div>
                );
              })()}

              {/* Accuracy — real calculation from shots fired/hit */}
              {(shotsFired || 0) > 0 && (
                <div className="flex justify-between text-sm font-mono text-muted-foreground animate-in fade-in" style={{ animationDelay: '850ms', animationFillMode: 'backwards' }}>
                  <span>Accuracy:</span>
                  <span className="text-foreground">{Math.round(((shotsHit || 0) / (shotsFired || 1)) * 100)}% ({shotsHit}/{shotsFired})</span>
                </div>
              )}

              {/* Damage dealt/taken */}
              {(damageDealt || 0) > 0 && (
                <div className="flex justify-between text-sm font-mono text-muted-foreground animate-in fade-in" style={{ animationDelay: '870ms', animationFillMode: 'backwards' }}>
                  <span>Damage Dealt:</span>
                  <span className="text-accent">{damageDealt}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-mono text-muted-foreground animate-in fade-in" style={{ animationDelay: '890ms', animationFillMode: 'backwards' }}>
                <span>Damage Taken:</span>
                <span className={`${(damageTaken || 0) > 200 ? 'text-danger' : 'text-foreground'}`}>{damageTaken || 0}</span>
              </div>

              {/* K/D-style ratio */}
              {killCount > 0 && (
                <div className="flex justify-between text-sm font-mono text-muted-foreground animate-in fade-in" style={{ animationDelay: '910ms', animationFillMode: 'backwards' }}>
                  <span>Efficiency:</span>
                  <span className="text-foreground">{((damageDealt || 0) / Math.max(1, (damageTaken || 1))).toFixed(1)}:1</span>
                </div>
              )}

              {/* Weather survived */}
              {weather && weather.type !== 'clear' && (
                <div className="flex justify-between text-sm font-mono text-muted-foreground animate-in fade-in" style={{ animationDelay: '920ms', animationFillMode: 'backwards' }}>
                  <span>Weather:</span>
                  <span className="text-foreground">{weather.type === 'blizzard' ? '🌨️ Blizzard' : weather.type === 'fog' ? '🌫️ Fog' : weather.type === 'rain' ? '🌧️ Rain' : weather.type === 'dust' ? '💨 Dust' : '❄️ Snow'}</span>
                </div>
              )}

              {/* Cause of death */}
              {gameOver && (
                <div className="flex justify-between text-sm font-mono text-danger/80 animate-in fade-in" style={{ animationDelay: '940ms', animationFillMode: 'backwards' }}>
                  <span>Cause of Death:</span>
                  <span className="text-danger text-right text-[11px] max-w-[180px] truncate">{deathCause?.replace(/^[^\w]*/, '').slice(0, 40) || 'Unknown'}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-mono text-muted-foreground animate-in fade-in" style={{ animationDelay: '1000ms', animationFillMode: 'backwards' }}>
                <span>Result:</span>
                <span className={`font-display ${gameOver ? 'text-danger' : hasExtractionCode ? 'text-loot' : 'text-warning'}`}>
                  {gameOver ? 'FAILED' : hasExtractionCode ? 'SUCCESS' : 'INCOMPLETE'}
                </span>
              </div>

              {(() => {
                const result = extracted ? (hasExtractionCode ? 'success' : 'almost') : gameOver ? 'kia' : 'mia';
                const earned = achievementStats ? getHighestTierAchievements(achievementStats).map(a => a.id) : [];
                const totalScore = calculateScore(killCount, time, result, earned.join(','));
                return (
                  <div className="flex justify-between text-sm font-mono mt-1 pt-1 border-t border-border animate-in slide-in-from-bottom-2 fade-in" style={{ animationDelay: '1100ms', animationFillMode: 'backwards' }}>
                    <span className="text-accent font-bold">SCORE:</span>
                    <span className="text-accent font-display text-lg">{totalScore}</span>
                  </div>
                );
              })()}

              {codesFound.length > 0 && (
                <div className="mt-2 border-t border-border pt-2">
                  <span className="text-xs font-mono text-warning">☢ CODES:</span>
                  <div className="flex flex-col gap-1 mt-1">
                    {codesFound.map(code => (
                      <span key={code} className="text-sm font-display text-warning tracking-wider">{code}</span>
                    ))}
                  </div>
                </div>
              )}
              {objectives && objectives.length > 0 && (
                <div className="mt-2 border-t border-border pt-2 animate-in fade-in" style={{ animationDelay: '1200ms', animationFillMode: 'backwards' }}>
                  <span className="text-xs font-mono text-accent">🎯 OBJECTIVES:</span>
                  <div className="flex flex-col gap-1 mt-1">
                    {objectives.map(obj => (
                      <div key={obj.id} className="flex items-center justify-between text-[11px] font-mono">
                        <span className={obj.completed ? 'text-accent' : 'text-muted-foreground'}>
                          {obj.completed ? '✅' : '❌'} {obj.name}
                        </span>
                        {obj.completed && <span className="text-warning">+{obj.reward}₽</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {onReturnToBase && (
                <button className="w-full px-6 py-2.5 bg-primary text-primary-foreground font-display uppercase tracking-wider rounded-sm hover:bg-primary/80 transition-colors mt-2 animate-in fade-in" style={{ animationDelay: '1400ms', animationFillMode: 'backwards' }} onClick={onReturnToBase}>
                  🏠 RETURN TO BASE
                </button>
              )}
              <button className="w-full px-6 py-2.5 bg-card text-foreground font-display uppercase tracking-wider rounded-sm border border-border hover:bg-muted transition-colors mt-2" onClick={() => window.location.reload()}>
                📋 MAIN MENU
              </button>
              {/* Achievements display disabled — code preserved
              {achievementStats && (() => {
                const earned = getHighestTierAchievements(achievementStats);
                return earned.length > 0 ? (
                  <div className="mt-2 border-t border-border pt-2 animate-in fade-in" style={{ animationDelay: '1500ms', animationFillMode: 'backwards' }}>
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
              */}
            </div>
            <HighscoreList currentName={playerName} />
            <FeedbackWidget playerName={playerName} />
          </div>
        </div>
      )}
    </div>
  );
};

const EnhancedMiniMap: React.FC<{
  playerX: number; playerY: number; playerAngle: number;
  mapW: number; mapH: number;
  enemies: { x: number; y: number; type: string; state: string }[];
  extractions: { x: number; y: number; name: string; active: boolean }[];
  objectives: { x: number; y: number }[];
}> = ({ playerX, playerY, playerAngle, mapW, mapH, enemies, extractions, objectives }) => {
  const size = 80;
  const px = (playerX / mapW) * size;
  const py = (playerY / mapH) * size;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute inset-0 bg-card/60 border border-border/40 rounded-sm backdrop-blur-sm" />
      {/* Extraction points */}
      {extractions.map((ep, i) => {
        const ex = (ep.x / mapW) * size;
        const ey = (ep.y / mapH) * size;
        return (
          <div key={`e${i}`} className={`absolute w-2 h-2 rounded-sm ${ep.active ? 'bg-safe animate-pulse' : 'bg-safe/30'}`}
            style={{ left: ex - 4, top: ey - 4 }} title={ep.name} />
        );
      })}
      {/* Objectives */}
      {objectives.map((obj, i) => {
        const ox = (obj.x / mapW) * size;
        const oy = (obj.y / mapH) * size;
        return <div key={`o${i}`} className="absolute w-1.5 h-1.5 bg-warning/60 rounded-full" style={{ left: ox - 3, top: oy - 3 }} />;
      })}
      {/* Enemies */}
      {enemies.map((en, i) => {
        const enx = (en.x / mapW) * size;
        const eny = (en.y / mapH) * size;
        const color = en.type === 'boss' ? 'bg-danger' : en.state === 'chase' || en.state === 'attack' ? 'bg-danger/80' : 'bg-danger/40';
        return <div key={`en${i}`} className={`absolute w-1 h-1 rounded-full ${color}`} style={{ left: enx - 2, top: eny - 2 }} />;
      })}
      {/* Player — with direction indicator */}
      <div className="absolute w-2 h-2 bg-safe rounded-full border border-safe/80" style={{ left: px - 4, top: py - 4 }} />
      <div className="absolute w-0.5 h-2 bg-safe/60 origin-bottom" style={{
        left: px - 1,
        top: py - 10,
        transform: `rotate(${playerAngle * (180 / Math.PI) + 90}deg)`,
        transformOrigin: `1px 8px`,
      }} />
    </div>
  );
};
