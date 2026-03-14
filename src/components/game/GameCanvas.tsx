import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createGameState, updateGame } from '../../game/engine';
import { renderGame, setPlayerSkin, PLAYER_SKINS, type PlayerSkin } from '../../game/renderer';
import { GameState, InputState, Item } from '../../game/types';
import { MapId } from '../../game/maps';
import { getClassDef, CLASS_DEFS, DONATOR_PERKS, UNLOCK_HINTS } from '../../game/classes';
import { LORE_DOCUMENTS, LoreDocument } from '../../game/lore';
import { MobileControls } from './MobileControls';
import { useIsMobile } from '@/hooks/use-mobile';
import { unlockSpeech } from '../../game/voice';
import { HUD } from './HUD';
import { HighscoreList } from './HighscoreList';
import { InventoryPanel } from './InventoryPanel';
import { DocumentReader } from './DocumentReader';
import { IntelPanel } from './IntelPanel';
import { LootPopup, LootNotification } from './LootPopup';
import { HomeBase, StashState, loadStash, saveStash } from './HomeBase';
import { LogoutButton } from './LogoutButton';
import { AdminModeBadge } from './AdminModeBadge';
import { useAdminMode, type AdminMode } from '@/hooks/useAdminMode';
import { generateMissionObjectives, MissionObjective, checkObjectiveCompletion } from '../../game/objectives';
import { getUpgradeLevel, getUpgradeCost, UPGRADES, TRADER_ITEMS, getLevelForXp } from '../../game/upgrades';
import { createMedical, createGrenade, createFlashbang, createGasGrenade, createTNT, createAmmo, createArmor, createHelmet, createGoggles, createBackpack, WEAPON_TEMPLATES, createScope, createSuppressor, createExtMagazine } from '../../game/items';
import { hapticShoot, hapticDamage, hapticKill } from '../../game/haptics';
import { startAmbient, stopAmbient, startMenuAmbient, stopMenuAmbient } from '../../game/audio';
import { EMPTY_MASTERY, getMasteryLevel, type WeaponMasteryState, type WeaponMasteryType } from '../../game/weaponMastery';
import { getDailyMissions, loadDailyProgress, saveDailyProgress, checkDailyCompletion } from '../../game/dailyMissions';
import { RECIPES, canCraft, craft } from '../../game/crafting';
import { supabase } from '@/integrations/supabase/client';
import { getSettings, getPreset, applyPreset, updateSetting, type GraphicsPreset, type GraphicsSettings, type RenderDistance } from '../../game/graphics';

const TIME_LIMIT = 300; // 5 minutes
const FIREFOX_WARNING_KEY = 'novaya_firefox_warning_dismissed';

const createDefaultInputState = (): InputState => ({
  moveX: 0,
  moveY: 0,
  aimX: 0,
  aimY: 0,
  shooting: false,
  shootPressed: false,
  interact: false,
  heal: false,
  throwGrenade: false,
  cycleThrowable: false,
  movementMode: 'walk',
  moveTarget: null,
  takeCover: false,
  useTNT: false,
  useSpecial: false,
  reload: false,
  throwKnife: false,
  chokehold: false,
  throwRock: false,
  useAbility: false,
});

const safeCreateGameState = (mapId: MapId = 'objekt47', playerLevel: number = 1, extractionCount: number = 0): GameState => {
  try {
    return createGameState(mapId, playerLevel, extractionCount);
  } catch (error) {
    console.error('Failed to create game state:', error);
    return createGameState('objekt47');
  }
};

const createInitialObjectivesByMap = (): Record<MapId, MissionObjective[]> => ({
  objekt47: generateMissionObjectives('objekt47'),
  fishing_village: generateMissionObjectives('fishing_village'),
  hospital: generateMissionObjectives('hospital'),
  mining_village: generateMissionObjectives('mining_village'),
});

const createInitialRerollsByMap = (): Record<MapId, number> => ({
  objekt47: 0,
  fishing_village: 0,
  hospital: 0,
  mining_village: 0,
});

const IntroScreen: React.FC<{ onStart: (name: string, skin: PlayerSkin) => void }> = ({ onStart }) => {
  const introIsMobile = useIsMobile();
  const [showHighscores, setShowHighscores] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);
  const [profile, setProfile] = React.useState<{ display_name: string } | null>(null);
  const [isDonator, setIsDonator] = React.useState(false);
  const [loadingAuth, setLoadingAuth] = React.useState(true);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const { mode: adminMode, cycleMode } = useAdminMode();

  const effectiveAdmin = isAdmin && adminMode === 'admin';

  // Skin selection
  const [selectedSkin, setSelectedSkin] = React.useState<PlayerSkin>('anonymous');
  const [inspectedSkin, setInspectedSkin] = React.useState<PlayerSkin | null>(null);

  // Determine which skins are SELECTABLE vs VISIBLE
  const showAdminSkins = isAdmin && adminMode === 'admin';
  const availableSkins = React.useMemo(() => {
    if (!user) return PLAYER_SKINS.filter(s => s.access === 'all');
    return PLAYER_SKINS.filter(s => {
      if (s.access === 'all' || s.access === 'registered') return true;
      if (s.access === 'admin' && showAdminSkins) return true;
      if (s.access === 'donator' && (isDonator || showAdminSkins)) return true;
      return false;
    });
  }, [user, isAdmin, adminMode, isDonator, showAdminSkins]);

  // ALL skins visible in selector (locked ones shown too, except admin for non-admins)
  const visibleSkins = React.useMemo(() => {
    return PLAYER_SKINS.filter(s => {
      // Admin skin: only visible to admins
      if (s.access === 'admin') return showAdminSkins;
      return true;
    });
  }, [showAdminSkins]);

  // Load saved skin and validate against available skins
  React.useEffect(() => {
    const saved = localStorage.getItem('nz_selected_skin') as PlayerSkin | null;
    const validSkin = saved && availableSkins.find(s => s.id === saved) ? saved : (availableSkins.find(s => s.access === 'registered')?.id || availableSkins[0]?.id || 'anonymous');
    if (selectedSkin !== validSkin) setSelectedSkin(validSkin);
  }, [availableSkins]);

  // Ambient wind on menu
  React.useEffect(() => {
    startMenuAmbient();
    return () => stopMenuAmbient();
  }, []);

  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setLoadingAuth(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoadingAuth(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!user) { setProfile(null); setIsAdmin(false); return; }
    supabase.from('profiles').select('display_name, is_donator').eq('id', user.id).single().then(({ data }) => {
      if (data) {
        setProfile({ display_name: data.display_name });
        setIsDonator(data.is_donator === true);
      }
    });
    supabase.rpc('get_my_roles').then(({ data }) => {
      if (data && Array.isArray(data)) {
        setIsAdmin(data.includes('admin'));
      }
    });
  }, [user]);

  // Enforce role-locked skins: validate selectedSkin is in availableSkins
  const validatedSkin = availableSkins.find(s => s.id === selectedSkin) ? selectedSkin : 'anonymous';
  const activeSkin: PlayerSkin = effectiveAdmin ? 'admin' : (isAdmin && adminMode === 'incognito') ? 'anonymous' : user ? validatedSkin : 'anonymous';
  const callsign = profile?.display_name || user?.user_metadata?.display_name || '';

  const handleStart = React.useCallback(() => {
    localStorage.setItem('nz_selected_skin', selectedSkin);
    if (isAdmin && adminMode === 'incognito') {
      onStart('__anonymous__', 'anonymous');
    } else if (user && callsign) {
      onStart(callsign, activeSkin);
    } else {
      onStart('__anonymous__', 'anonymous');
    }
  }, [user, callsign, activeSkin, selectedSkin, onStart, isAdmin, adminMode]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleStart();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleStart]);

  return (
   <div className="absolute inset-0 flex items-center justify-center bg-background z-50 overflow-y-auto" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' as any }}>
    <div className="max-w-sm w-full mx-4 flex flex-col gap-4 p-6 sm:p-8 border border-border bg-card rounded my-4">
      <div className="w-full px-3 py-1.5 bg-destructive/10 border border-destructive/30 rounded-sm mb-1">
        <p className="text-[10px] font-mono text-destructive-foreground text-center tracking-wider leading-relaxed">
          <span className="animate-pulse inline-block mr-1">▌</span>
          SYSTEM STATUS: <span className="text-destructive-foreground font-bold">ALPHA</span> // BUGS ACTIVE // FEATURES INCOMPLETE
          <br />
          <span className="text-destructive-foreground/80">PROCEED WITH CAUTION — REPORT ISSUES VIA FEEDBACK</span>
        </p>
      </div>

      {introIsMobile && (
        <div className="w-full px-3 py-1.5 bg-accent/10 border border-accent/30 rounded-sm">
          <p className="text-[9px] font-mono text-accent text-center tracking-wider leading-relaxed">
            📱 MOBILE DETECTED — BEST EXPERIENCE ON DESKTOP
            <br />
            <span className="text-accent/60">Controls and UI are not fully optimized for mobile yet</span>
          </p>
        </div>
      )}

      <div className="text-center">
        <p className="text-[9px] font-mono text-accent uppercase tracking-[0.3em] mb-2">☠ CLASSIFIED — NORDIC COMMAND ☠</p>
        <h1 className="text-3xl font-display text-accent text-glow-green tracking-wider">NOVAYA ZEMLYA</h1>
        <p className="text-[10px] font-mono text-muted-foreground mt-1">OCCULT COLD WAR EXTRACTION SHOOTER</p>
        <p className="text-[9px] font-mono text-foreground/80 mt-1 italic leading-relaxed max-w-[280px] mx-auto">
          Arctic Circle, 1985. Something ancient stirs beneath the permafrost. 
          Your mission: infiltrate, survive, extract.
        </p>
      </div>

      {loadingAuth ? (
        <div className="flex flex-col gap-3 w-full animate-pulse">
          <div className="border border-border/30 rounded p-3 bg-muted/20">
            <div className="h-3 w-24 bg-muted/40 rounded mx-auto mb-2" />
            <div className="h-4 w-32 bg-muted/40 rounded mx-auto mb-1" />
            <div className="h-2 w-40 bg-muted/30 rounded mx-auto" />
          </div>
          <div className="h-12 w-full bg-muted/30 rounded" />
        </div>
      ) : user ? (
        <div className="flex flex-col gap-2">
            {isAdmin ? (
              <AdminModeBadge mode={adminMode} onCycle={cycleMode} />
            ) : (
              <div className="border border-primary/30 rounded p-2 text-center">
                <p className="text-xs font-display text-primary uppercase tracking-wider">🛡️ ALPHA TESTER</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-sm font-display text-foreground">{callsign || '(no callsign set)'}</p>
              <p className="text-[9px] font-mono text-muted-foreground">{user.email}</p>
            </div>

            {/* Skin / Class Selector */}
            {adminMode !== 'incognito' && (
              <div className="border border-border/50 rounded p-2 bg-secondary/10">
                <p className="text-[9px] font-display text-accent uppercase tracking-wider text-center mb-1.5">🎖️ Choose Class</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {visibleSkins.map(s => {
                    const isUnlocked = availableSkins.some(a => a.id === s.id);
                    const classDef = getClassDef(s.id);
                    const isInspected = inspectedSkin === s.id;
                    const isActive = activeSkin === s.id;
                    return (
                      <button
                        key={s.id}
                        className={`flex flex-col items-center gap-0.5 p-2 rounded border transition-colors text-center ${
                          isActive
                            ? 'border-accent bg-accent/15 text-foreground'
                            : isInspected && !isUnlocked
                            ? 'border-accent/40 bg-accent/5 text-muted-foreground/60'
                            : !isUnlocked
                            ? 'border-border/20 bg-secondary/5 text-muted-foreground/40 opacity-60 hover:opacity-80 hover:border-border/40'
                            : 'border-border/30 bg-secondary/20 text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                        }`}
                        onClick={() => {
                          if (isUnlocked) {
                            setSelectedSkin(s.id);
                            setInspectedSkin(null);
                          } else {
                            setInspectedSkin(isInspected ? null : s.id);
                          }
                        }}
                        title={isUnlocked ? s.description : `Click to view ${classDef.className} info`}
                      >
                        <span className="text-lg">{isUnlocked ? s.icon : '🔒'}</span>
                        <span className="text-[8px] font-display uppercase tracking-wider leading-tight">{s.name}</span>
                        <span className="text-[7px] font-mono text-muted-foreground/60">{classDef.className}</span>
                        {!isUnlocked && (
                          <span className="text-[6px] font-mono text-muted-foreground/40 leading-tight">
                            {s.access === 'donator' ? '💎 Donate' : s.access === 'registered' ? '🔐 Register' : ''}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* Class details — show inspected locked class or active class */}
                {(() => {
                  const showSkinId = inspectedSkin || activeSkin;
                  const showClass = getClassDef(showSkinId);
                  const showSkinDef = PLAYER_SKINS.find(s => s.id === showSkinId);
                  const isLocked = inspectedSkin && !availableSkins.some(a => a.id === inspectedSkin);
                  return (
                    <div className={`mt-2 p-1.5 rounded border ${isLocked ? 'bg-accent/5 border-accent/20' : 'bg-secondary/20 border-border/20'}`}>
                      <p className="text-[8px] font-display text-foreground/80 text-center uppercase tracking-wider">
                        {isLocked && '🔒 '}{showClass.className} — {showSkinDef?.name}
                      </p>
                      {showClass.passiveDescription.map((line, i) => (
                        <p key={i} className="text-[7px] font-mono text-accent/70 text-center">{line}</p>
                      ))}
                      {showClass.ability.id !== 'none' && (
                        <p className="text-[7px] font-mono text-muted-foreground/60 text-center mt-0.5">
                          [Z] {showClass.ability.icon} {showClass.ability.name}: {showClass.ability.description}
                        </p>
                      )}
                      {isLocked && showSkinDef && (
                        <p className="text-[7px] font-mono text-destructive/60 text-center mt-1 italic">
                          {UNLOCK_HINTS[showSkinDef.access] || 'Locked'}
                        </p>
                      )}
                    </div>
                  );
                })()}
                {/* Donator perks info */}
                {!isDonator && !showAdminSkins && user && (
                  <div className="mt-1.5 p-1.5 bg-accent/5 rounded border border-accent/20">
                    <p className="text-[7px] font-display text-accent/60 text-center uppercase tracking-wider mb-0.5">💎 Donator Perks (all classes)</p>
                    {DONATOR_PERKS.map((p, i) => (
                      <p key={i} className="text-[6px] font-mono text-muted-foreground/50 text-center">{p.icon} {p.label}</p>
                    ))}
                    <a href="/profile" className="block text-[7px] font-mono text-accent/50 text-center mt-0.5 hover:text-accent underline">
                      Donate €5 →
                    </a>
                  </div>
                )}
                {isDonator && (
                  <p className="text-[7px] font-mono text-accent/50 text-center mt-1">💎 Donator perks active</p>
                )}
              </div>
            )}

          <button
            className="w-full px-6 py-3 bg-primary text-primary-foreground font-display uppercase tracking-widest rounded-sm hover:bg-primary/80 transition-colors text-lg"
            onClick={handleStart}
            disabled={adminMode !== 'incognito' && !callsign}
          >
            ▶ BEGIN OPERATION
          </button>
          {adminMode !== 'incognito' && !callsign && (
            <p className="text-[10px] font-mono text-destructive text-center">
              Set a callsign in your <a href="/profile" className="underline">profile</a> first.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <a
            href="/auth"
            className="w-full block text-center px-6 py-3 bg-primary text-primary-foreground font-display uppercase tracking-widest rounded-sm hover:bg-primary/80 transition-colors text-lg"
          >
            🔐 LOG IN / REGISTER
          </a>
          <button
            className="w-full px-6 py-2.5 border border-foreground/30 text-foreground/60 font-display uppercase tracking-widest rounded-sm hover:text-foreground hover:border-foreground/50 transition-colors text-xs"
            onClick={handleStart}
          >
            Play Anonymously
          </button>

          {/* Read-only class showcase for anonymous visitors */}
          <div className="border border-border/50 rounded p-2 bg-secondary/10">
            <p className="text-[9px] font-display text-muted-foreground uppercase tracking-wider text-center mb-1.5">🎖️ Classes — Register to unlock</p>
            <div className="grid grid-cols-3 gap-1.5">
              {visibleSkins.map(s => {
                const classDef = getClassDef(s.id);
                const isBase = s.id === 'anonymous';
                const isInspected = inspectedSkin === s.id;
                return (
                  <button
                    key={s.id}
                    className={`flex flex-col items-center gap-0.5 p-2 rounded border transition-colors text-center ${
                      isBase
                        ? 'border-accent bg-accent/15 text-foreground'
                        : isInspected
                        ? 'border-accent/40 bg-accent/5 text-muted-foreground/60'
                        : 'border-border/20 bg-secondary/5 text-muted-foreground/40 opacity-60 hover:opacity-80 hover:border-border/40'
                    }`}
                    onClick={() => setInspectedSkin(isInspected ? null : s.id)}
                    title={`Click to view ${classDef.className} info`}
                  >
                    <span className="text-lg">{isBase ? s.icon : '🔒'}</span>
                    <span className="text-[8px] font-display uppercase tracking-wider leading-tight">{s.name}</span>
                    <span className="text-[7px] font-mono text-muted-foreground/60">{classDef.className}</span>
                    {!isBase && (
                      <span className="text-[6px] font-mono text-muted-foreground/40 leading-tight">
                        {s.access === 'donator' ? '💎 Donate' : '🔐 Register'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {(() => {
              const showSkinId = inspectedSkin || 'anonymous';
              const showClass = getClassDef(showSkinId);
              const showSkinDef = PLAYER_SKINS.find(s => s.id === showSkinId);
              const isLocked = showSkinId !== 'anonymous';
              return (
                <div className={`mt-2 p-1.5 rounded border ${isLocked ? 'bg-accent/5 border-accent/20' : 'bg-secondary/20 border-border/20'}`}>
                  <p className="text-[8px] font-display text-foreground/80 text-center uppercase tracking-wider">
                    {isLocked && '🔒 '}{showClass.className} — {showSkinDef?.name}
                  </p>
                  {showClass.passiveDescription.map((line, i) => (
                    <p key={i} className="text-[7px] font-mono text-accent/70 text-center">{line}</p>
                  ))}
                  {showClass.ability.id !== 'none' && (
                    <p className="text-[7px] font-mono text-muted-foreground/60 text-center mt-0.5">
                      [Z] {showClass.ability.icon} {showClass.ability.name}: {showClass.ability.description}
                    </p>
                  )}
                  {isLocked && showSkinDef && (
                    <p className="text-[7px] font-mono text-destructive/60 text-center mt-1 italic">
                      {UNLOCK_HINTS[showSkinDef.access] || 'Create an account to unlock'}
                    </p>
                  )}
                </div>
              );
            })()}
            <div className="mt-1.5 p-1.5 bg-accent/5 rounded border border-accent/20">
              <p className="text-[7px] font-display text-accent/60 text-center uppercase tracking-wider mb-0.5">💎 Donator Perks (all classes)</p>
              {DONATOR_PERKS.map((p, i) => (
                <p key={i} className="text-[6px] font-mono text-muted-foreground/50 text-center">{p.icon} {p.label}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <a href="/wiki" className="flex-1 text-center px-3 py-2 border border-accent/40 text-accent font-display uppercase tracking-widest rounded-sm hover:bg-accent/10 transition-colors text-[11px]">
          📖 Wiki
        </a>
        <button
          className={`flex-1 px-3 py-2 border font-display uppercase tracking-widest rounded-sm transition-colors text-[11px] ${showHighscores ? 'border-accent text-accent bg-accent/10' : 'border-border/40 text-muted-foreground hover:text-foreground hover:border-border'}`}
          onClick={() => setShowHighscores(v => !v)}
        >
          🏆 Highscores
        </button>
      </div>

      {user && (
        <div className="flex gap-2">
          <a href="/profile" className="flex-1 text-center px-3 py-2 border border-accent/40 text-accent font-display uppercase tracking-widest rounded-sm hover:bg-accent/10 transition-colors text-[11px]">
            👤 Profile
          </a>
          <LogoutButton compact />
        </div>
      )}

      {showHighscores && (
        <div className="border-t border-border pt-3">
          <HighscoreList />
        </div>
      )}

      <div className="text-center">
        <p className="text-[9px] font-mono text-accent tracking-wider mb-1">
          novaya-zemlya.com
        </p>
        <p className="text-[9px] font-mono text-foreground/80">
          © 2025-2026 — Made with ☕ and paranoia
        </p>
        <p className="text-[8px] font-mono text-foreground/70 mt-1">
          Special thanks to Battlestate Games (Escape from Tarkov) for the inspiration
        </p>
      </div>
    </div>
  </div>
  );
};
// Sync stash to database
function getWriteToken(name: string): string | null {
  try { return localStorage.getItem(`progress_token_${name}`); } catch { return null; }
}
function setWriteToken(name: string, token: string) {
  try { localStorage.setItem(`progress_token_${name}`, token); } catch {}
}

async function syncStashToDb(playerName: string, stash: StashState) {
  if (!playerName || playerName === '__anonymous__' || playerName.trim().toLowerCase() === 'test123' || playerName.trim().toLowerCase() === 'test3') return;
  try {
    const name = playerName.trim().slice(0, 20);
    const token = getWriteToken(name);
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-progress`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    };
    if (token) headers['x-write-token'] = token;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        player_name: name,
        rubles: stash.rubles,
        raid_count: stash.raidCount,
        extraction_count: stash.extractionCount,
        stash_items: stash.items,
        upgrades: stash.upgrades,
        xp: stash.xp,
        level: stash.level,
      }),
    });

    const result = await res.json();
    if (result.write_token) {
      setWriteToken(name, result.write_token);
    }
  } catch (e) {
    console.error('Failed to sync stash to DB:', e);
  }
}

// Helper: persist stash to localStorage + DB
function persistStash(stash: StashState, playerName: string) {
  saveStash(stash);
  syncStashToDb(playerName, stash);
}

// Helper: build objective completion payload from game state
function buildObjectivePayload(state: GameState) {
  return {
    bossKilled: state.enemies.some(e => e.type === 'boss' && e.state === 'dead'),
    sniperKilled: state.enemies.some(e => e.type === 'sniper' && e.state === 'dead'),
    terminalsHacked: state.terminalsHacked,
    documentsCollected: state.documentsCollected,
    killCount: state.killCount,
    headshotKills: state.headshotKills,
    lootValue: state.player.inventory.reduce((s, i) => s + i.value, 0),
    alarmTriggered: !!(state as any)._alarmEverTriggered,
    bodiesLooted: state.bodiesLooted,
    timeSeconds: state.time,
    tntPlacedOnPlane: !!(state as any)._tntOnPlane,
    alarmsHacked: state.terminalsHacked,
    mosinKills: state.mosinKills,
    wallsBreached: state.wallsBreached,
    grenadeKills: state.grenadeKills,
    dogsNeutralized: state.dogsNeutralized,
    longShots: state.longShots,
    knifeDistanceKills: state.knifeDistanceKills,
    cachesLooted: state.cachesLooted,
    convertKill: !!(state as any)._convertKill,
    fuelDestroyed: !!(state as any)._fuelDestroyed,
    ammoDestroyed: !!(state as any)._ammoDestroyed,
    radioDisabled: !!(state as any)._radioDisabled,
  };
}

async function loadStashFromDb(playerName: string): Promise<StashState | null> {
  if (!playerName || playerName === '__anonymous__' || playerName.trim().toLowerCase() === 'test123' || playerName.trim().toLowerCase() === 'test3') return null;
  try {
    const name = playerName.trim().slice(0, 20);
    const { data } = await supabase.from('player_progress').select('id,player_name,rubles,raid_count,extraction_count,stash_items,upgrades,xp,level').eq('player_name', name).maybeSingle();
    if (data) {
      return {
        items: (data.stash_items as any) || [],
        rubles: data.rubles,
        raidCount: data.raid_count,
        extractionCount: data.extraction_count,
        upgrades: (data.upgrades as any) || {},
        xp: (data as any).xp || 0,
        level: (data as any).level || 1,
      };
    }
  } catch (e) {
    console.error('Failed to load stash from DB:', e);
  }
  return null;
}

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(safeCreateGameState());
  const inputRef = useRef<InputState>(createDefaultInputState());
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const updateKeysRef = useRef<() => void>(() => {});
  const [started, setStarted] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [playerIsAdmin, setPlayerIsAdmin] = useState(false);
  const [playerIsDonator, setPlayerIsDonator] = useState(false);
  const [playerSkinId, setPlayerSkinId] = useState<PlayerSkin>('anonymous');
  const [gamePhase, setGamePhase] = useState<'intro' | 'homebase' | 'deploying' | 'playing'>('intro');
  const gamePhaseRef = useRef(gamePhase);
  gamePhaseRef.current = gamePhase;
  const [stash, setStash] = useState<StashState>(loadStash);
  const [selectedMapId, setSelectedMapId] = useState<MapId>('objekt47');
  const [gfxSettings, setGfxSettings] = useState<GraphicsSettings>(() => ({ ...getSettings() }));
  const [gfxPreset, setGfxPreset] = useState<GraphicsPreset | 'custom'>(getPreset);
  const [showGfxPanel, setShowGfxPanel] = useState(false);
  const objectivesByMapRef = useRef<Record<MapId, MissionObjective[]>>(createInitialObjectivesByMap());
  const rerollsByMapRef = useRef<Record<MapId, number>>(createInitialRerollsByMap());
  const [objectives, setObjectives] = useState<MissionObjective[]>(() => objectivesByMapRef.current.objekt47);
  const [rerollCount, setRerollCount] = useState(rerollsByMapRef.current.objekt47);
  const extractedRef = useRef(false);
  const dbSyncedRef = useRef(false);

  // Mobile detection with manual override
  const autoMobile = useIsMobile();
  const [mobileOverride, setMobileOverride] = useState<boolean | null>(null);
  const isMobile = mobileOverride !== null ? mobileOverride : autoMobile;

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
    hasExtractionCode: false,
    movementMode: 'walk' as 'sneak' | 'walk' | 'sprint',
    inCover: false,
    peeking: false,
    coverType: 'low' as 'high' | 'low',
    canHide: false,
    isHiding: false,
    deathCause: undefined as string | undefined,
    exfilRevealed: undefined as string | undefined,
    achievementStats: undefined as any,
    pendingWeapon: null as any,
    noiseLevel: 0,
    nearInteractable: false,
    weather: null as { type: string; intensity: number } | null,
    shotsFired: 0,
    shotsHit: 0,
    damageDealt: 0,
    damageTaken: 0,
    enemyPositions: [] as { x: number; y: number; type: string; state: string }[],
    extractionPositions: [] as { x: number; y: number; name: string; active: boolean }[],
    objectivePositions: [] as { x: number; y: number }[],
    mapWidth: 2400,
    mapHeight: 2400,
  });
  const [showInventory, setShowInventory] = useState(false);
  const [showIntel, setShowIntel] = useState(false);
  const [readingDoc, setReadingDoc] = useState<LoreDocument | null>(null);
  const [lootNotifications, setLootNotifications] = useState<LootNotification[]>([]);
  const [showFirefoxWarning, setShowFirefoxWarning] = useState(false);
  const [showControlOverlay, setShowControlOverlay] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const controlOverlayDismissed = useRef(false);
  const gamePausedRef = useRef(false);
  const showControlOverlayRef = useRef(false);
  const lastInventoryCountRef = useRef<number>(stateRef.current.player.inventory.length);

  useEffect(() => {
    if (gamePhase === 'deploying' && !controlOverlayDismissed.current) {
      setShowControlOverlay(true);
      showControlOverlayRef.current = true;
    }
  }, [gamePhase]);

  const dismissControls = useCallback(() => {
    setShowControlOverlay(false);
    showControlOverlayRef.current = false;
    controlOverlayDismissed.current = true;
    setGamePhase('playing');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isFirefox = /firefox/i.test(navigator.userAgent);
    if (!isFirefox) return;
    if (window.sessionStorage.getItem(FIREFOX_WARNING_KEY) === '1') return;
    setShowFirefoxWarning(true);
  }, []);

  // Keyboard input (desktop)
  useEffect(() => {
    const keys = new Set<string>();

    const updateKeys = () => {
      // On mobile, joystick sets moveX/moveY — don't overwrite with keyboard state
      if (isMobile) return;
      let mx = 0, my = 0;
      if (keys.has('w') || keys.has('arrowup') || keys.has('keyw')) my -= 1;
      if (keys.has('s') || keys.has('arrowdown') || keys.has('keys')) my += 1;
      if (keys.has('a') || keys.has('arrowleft') || keys.has('keya')) mx -= 1;
      if (keys.has('d') || keys.has('arrowright') || keys.has('keyd')) mx += 1;
      inputRef.current.moveX = mx;
      inputRef.current.moveY = my;
    };
    updateKeysRef.current = updateKeys;

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't capture game keys when typing in an input field
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      keys.add(k);
      // Also track physical key codes for reliable movement during Shift/Ctrl
      if (e.code) keys.add(e.code.toLowerCase());
      if (k === 'e') inputRef.current.interact = true;
      if (k === 't') inputRef.current.useTNT = true;
      if (k === 'h') inputRef.current.heal = true;
      // Y/N keys no longer needed — weapon swap is E-based now
      if (e.key === 'Escape') {
        setReadingDoc(null);
      }
      if (k === 'g') inputRef.current.throwGrenade = true;
      if (k === 'v') inputRef.current.cycleThrowable = true;
      if (k === 'x') inputRef.current.useSpecial = true;
      if (k === 'q' || k === ' ') { e.preventDefault(); inputRef.current.takeCover = true; }
      if (k === 'r') inputRef.current.reload = true;
      if (k === 'f') inputRef.current.throwKnife = true;
      if (k === 'z') inputRef.current.useAbility = true;
      if (k === '1') inputRef.current.switchWeapon = 1;
      if (k === '2') inputRef.current.switchWeapon = 2;
      if (k === '3') inputRef.current.switchWeapon = 3;
      if (e.key === 'Shift') inputRef.current.movementMode = 'sprint';
      if (e.key === 'Control' || k === 'c') inputRef.current.movementMode = 'sneak';
      if (e.key === 'Tab' || k === 'i') {
        e.preventDefault();
        setShowInventory(v => !v);
        setShowIntel(false);
        setReadingDoc(null);
      }
      if (k === 'j') {
        setShowIntel(v => !v);
        setShowInventory(false);
        setReadingDoc(null);
      }
      updateKeys();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.delete(k);
      if (e.code) keys.delete(e.code.toLowerCase());
      if (k === 'e') inputRef.current.interact = false;
      if (e.key === 'Shift') inputRef.current.movementMode = 'walk';
      if (e.key === 'Control' || k === 'c') inputRef.current.movementMode = 'walk';
      updateKeys();
    };

    const skipMouse = isMobile;

    const onMouseDown = (e: MouseEvent) => {
      // Skip synthetic mouse events on touch devices — handled by pointer events
      if (skipMouse) return;
      unlockSpeech();
      if ((e.target as HTMLElement).closest('button, [role="button"], .pointer-events-auto')) return;
      if (showInventory || showIntel || readingDoc) return;
      if (e.button === 1) {
        // Middle click = throw distraction rock
        e.preventDefault();
        inputRef.current.throwRock = true;
        return;
      }
      if (e.button === 2) {
        // Right-click hold = charge grenade throw
        e.preventDefault();
        (stateRef.current as any)._grenadeChargeStart = performance.now();
        return;
      }
      inputRef.current.shooting = true;
      inputRef.current.shootPressed = true;
    };
    const onContextMenu = (e: Event) => { e.preventDefault(); };
    const onMouseUp = (e: MouseEvent) => {
      if (skipMouse) return;
      if (e.button === 2) {
        // Right-click release = throw grenade with charged power
        const chargeStart = (stateRef.current as any)._grenadeChargeStart;
        if (chargeStart) {
          const chargeTime = Math.min(2.0, (performance.now() - chargeStart) / 1000); // max 2s
          (stateRef.current as any)._grenadeChargePower = chargeTime;
          delete (stateRef.current as any)._grenadeChargeStart;
          inputRef.current.throwGrenade = true;
        }
        return;
      }
      inputRef.current.shooting = false; inputRef.current.shootPressed = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (skipMouse) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      inputRef.current.aimX = e.clientX - rect.left - rect.width / 2;
      inputRef.current.aimY = e.clientY - rect.top - rect.height / 2;
    };

    const onWheel = (e: WheelEvent) => {
      if (gamePhaseRef.current !== 'playing') return; // allow normal scroll in menus
      e.preventDefault();
      const dir = e.deltaY > 0 ? 1 : -1;
      if (e.ctrlKey) {
        // Ctrl+scroll = cycle grenades
        inputRef.current.cycleThrowable = true;
      } else {
        // Scroll = cycle weapons
        const st = stateRef.current;
        const slots: Array<1 | 2 | 3> = [1, 2, 3];
        const cur = slots.indexOf(st.player.activeSlot);
        const next = slots[(cur + dir + slots.length) % slots.length];
        inputRef.current.switchWeapon = next;
      }
    };

    const resetMovementInput = () => {
      keys.clear();
      inputRef.current.moveX = 0;
      inputRef.current.moveY = 0;
      inputRef.current.moveTarget = null;
      inputRef.current.shooting = false;
      inputRef.current.shootPressed = false;
      inputRef.current.movementMode = 'walk';
    };

    const onWindowBlur = () => resetMovementInput();
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') resetMovementInput();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      updateKeysRef.current = () => {};
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [showInventory, showIntel, readingDoc, isMobile]);

  // Save highscore on tab close / navigate away (abandoned)
  useEffect(() => {
    if (!started || !playerName) return;
    if (playerName.trim().toLowerCase() === 'test123' || playerName.trim().toLowerCase() === 'test3') return;
    const handleUnload = () => {
      const state = stateRef.current;
      if (!state || state.gameOver || state.extracted) return;
      const lootValue = state.player.inventory.reduce((s, i) => s + i.value, 0);
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/highscores`;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          player_name: playerName === '__anonymous__' ? 'Anonymous' : playerName.trim().slice(0, 20),
          kills: state.killCount,
          time_seconds: Math.round(state.time),
          result: 'abandoned',
          loot_value: lootValue,
        }),
        keepalive: true,
      });
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [started, playerName]);

  // Game loop
  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) return;

    const isFirefox = /firefox/i.test(navigator.userAgent);
    const resize = () => {
      const rawDpr = window.devicePixelRatio || 1;
      const maxDpr = isFirefox ? 1 : 2;
      const dpr = Math.min(rawDpr, maxDpr);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    let hudUpdateCounter = 0;
    let reinforcementsSpawned = false;

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const rawDt = (timestamp - lastTimeRef.current) / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTimeRef.current = timestamp;

      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      updateKeysRef.current();
      let currentState = stateRef.current;
      if (!currentState) {
        currentState = safeCreateGameState(selectedMapId);
        stateRef.current = currentState;
      }
      const prevHp = currentState.player.hp;
      const prevKills = currentState.killCount;
      let state = currentState;
      // Skip game update when field manual is shown or game is paused
      if (!showControlOverlayRef.current && !gamePausedRef.current) {
        try {
          state = updateGame(currentState, inputRef.current, dt, cssW, cssH) || currentState;
        } catch (error) {
          console.error('Game loop update failed:', error);
        }
      }
      stateRef.current = state;
      inputRef.current.interact = false;
      inputRef.current.shootPressed = false; // clear single-frame flag

      // Haptic feedback on mobile
      if (isMobile) {
        if (state.player.hp < prevHp) hapticDamage();
        if (state.killCount > prevKills) hapticKill();
        if (inputRef.current.shooting) hapticShoot();
      }

      // 5-minute timer — game over with reinforcements
      if (state.time >= TIME_LIMIT && !state.gameOver && !state.extracted && !reinforcementsSpawned) {
        reinforcementsSpawned = true;
        state.gameOver = true;
        state.deathCause = `⏱ Time ran out (${Math.floor(TIME_LIMIT / 60)}:${String(Math.floor(TIME_LIMIT % 60)).padStart(2, '0')}) — overwhelmed by reinforcements`;
        state.messages.push({ text: '🚨 REINFORCEMENTS ARRIVED — YOU ARE OVERWHELMED!', time: state.time, type: 'damage' });
      }

      renderGame(ctx, state, cssW, cssH);




      hudUpdateCounter++;
      const forceUpdate = state.gameOver || state.extracted;
      if (forceUpdate || hudUpdateCounter % 10 === 0) {
        const currentCount = state.player.inventory.length;
        if (currentCount > lastInventoryCountRef.current) {
          const newItems = state.player.inventory.slice(lastInventoryCountRef.current);
          const newNotifs: LootNotification[] = newItems.map((item, i) => ({
            id: `${Date.now()}_${i}`,
            item: { ...item },
            timestamp: Date.now(),
          }));
          setLootNotifications(prev => [...prev, ...newNotifs].slice(-5));
          setTimeout(() => {
            setLootNotifications(prev => prev.filter(n => !newNotifs.find(nn => nn.id === n.id)));
          }, 3000);
        }
        lastInventoryCountRef.current = currentCount;

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
          hasExtractionCode: state.hasExtractionCode,
          movementMode: inputRef.current.movementMode,
          inCover: state.player.inCover,
          peeking: state.player.peeking,
          coverType: ((state as any)._coverType as 'high' | 'low') || 'low',
          canHide: !!(state as any)._canHide,
          isHiding: !!(state as any)._isHiding,
          deathCause: state.deathCause,
          exfilRevealed: state.exfilRevealed,
          achievementStats: {
            mosinKills: state.mosinKills,
            grenadeKills: state.grenadeKills,
            tntKills: state.tntKills,
            longShots: state.longShots,
            headshotKills: state.headshotKills,
            sneakKills: state.sneakKills,
            knifeDistanceKills: state.knifeDistanceKills,
            noHitsTaken: state.noHitsTaken,
            killCount: state.killCount,
            bodiesLooted: state.bodiesLooted,
            cachesLooted: state.cachesLooted,
            wallsBreached: state.wallsBreached,
            documentsCollected: state.documentsCollected,
            terminalsHacked: state.terminalsHacked,
            distanceTravelled: Math.round(state.distanceTravelled / 10),
            exfilsVisited: state.exfilsVisited.size,
            dogsKilled: state.dogsKilled,
            totalDogsOnMap: state.totalDogsOnMap,
          },
          pendingWeapon: state.pendingWeapon,
          noiseLevel: (state as any)._playerNoiseLevel || 0,
          nearInteractable: (() => {
            const p = state.player.pos;
            for (const lc of state.lootContainers) {
              if (!lc.looted && Math.hypot(lc.pos.x - p.x, lc.pos.y - p.y) < 70) return true;
            }
            for (const w of state.walls) {
              if (w.color === '#aa4444' && Math.hypot((w.x + w.w/2) - p.x, (w.y + w.h/2) - p.y) < 80) return true;
            }
            for (const ap of state.alarmPanels) {
              if (!ap.hacked && Math.hypot(ap.pos.x - p.x, ap.pos.y - p.y) < 60) return true;
            }
            for (const dp of state.documentPickups) {
              if (!dp.collected && Math.hypot(dp.pos.x - p.x, dp.pos.y - p.y) < 50) return true;
            }
            return false;
          })(),
          weather: (state as any)._weather || null,
          shotsFired: (state as any)._shotsFired || 0,
          shotsHit: (state as any)._shotsHit || 0,
          damageDealt: Math.round((state as any)._damageDealt || 0),
          damageTaken: Math.round((state as any)._damageTaken || 0),
          enemyPositions: state.enemies
            .filter(e => e.state !== 'dead' && ((state as any)._spotterActive || (state as any)._seeEnemyTypes || e.state === 'chase' || e.state === 'attack' || e.state === 'suppress' || e.state === 'flank' || Math.hypot(e.pos.x - state.player.pos.x, e.pos.y - state.player.pos.y) < 300))
            .map(e => ({ x: e.pos.x, y: e.pos.y, type: e.type, state: e.state })),
          extractionPositions: state.extractionPoints.map(ep => ({ x: ep.pos.x, y: ep.pos.y, name: ep.name, active: ep.active })),
          objectivePositions: state.lootContainers.filter(lc => !lc.looted && lc.type === 'archive').map(lc => ({ x: lc.pos.x, y: lc.pos.y })),
          mapWidth: state.mapWidth,
          mapHeight: state.mapHeight,
        });

        // Live objective tracking
        if (hudUpdateCounter % 18 === 0) {
          setObjectives(prev => {
            const next = checkObjectiveCompletion(prev, buildObjectivePayload(state));
            objectivesByMapRef.current[selectedMapId] = next;
            return next;
          });
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    // Start ambient sound for this map
    startAmbient(selectedMapId);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      stopAmbient();
    };
  }, [started]);

  // ── Spectator heartbeat: send live stats every 5s ──
  useEffect(() => {
    if (!started || !playerName || playerName === '__anonymous__') return;
    const isTestUser = playerName.trim().toLowerCase() === 'test123' || playerName.trim().toLowerCase() === 'test3';
    if (isTestUser) return;

    const sendHeartbeat = async (status = 'playing') => {
      const state = stateRef.current;
      if (!state) return;
      try {
        await (supabase as any).from('active_sessions').upsert({
          player_name: playerName,
          map_id: selectedMapId,
          hp: Math.round(state.player.hp),
          max_hp: state.player.maxHp,
          kills: state.killCount,
          rubles: stash.rubles,
          level: stash.level,
          position_x: Math.round(state.player.pos.x),
          position_y: Math.round(state.player.pos.y),
          enemies_alive: state.enemies.filter(e => e.state !== 'dead').length,
          time_elapsed: Math.round(state.time),
          status,
          last_heartbeat: new Date().toISOString(),
        }, { onConflict: 'player_name' });
      } catch { /* silent */ }
    };

    // Initial heartbeat
    sendHeartbeat();
    const interval = setInterval(() => {
      const state = stateRef.current;
      if (!state) return;
      const status = state.gameOver ? 'dead' : state.extracted ? 'extracted' : 'playing';
      sendHeartbeat(status);
    }, 5000);

    return () => {
      clearInterval(interval);
      // Final status update
      const state = stateRef.current;
      if (state) {
        const status = state.extracted ? 'extracted' : state.gameOver ? 'dead' : 'abandoned';
        sendHeartbeat(status);
      }
    };
  }, [started, playerName, selectedMapId]);

  // Handle extraction → transfer loot to stash + check objectives
  useEffect(() => {
    if (hudState.extracted && !extractedRef.current) {
      extractedRef.current = true;
      const state = stateRef.current;
      const lootItems = state.player.inventory.filter(i => i.category !== 'weapon');
      const lootValueBonus = (state as any)._lootValueBonus || 0;
      const lootValue = Math.round(lootItems.reduce((s, i) => s + i.value, 0) * (1 + lootValueBonus));

      // Check objective completion
      const completedObjectives = checkObjectiveCompletion(objectives, buildObjectivePayload(state));
      setObjectives(completedObjectives);
      const completed = completedObjectives.filter(o => o.completed);
      const objectiveReward = completed.reduce((s, o) => s + o.reward, 0);
      const objectiveXp = completed.reduce((s, o) => s + Math.floor(o.reward / 2), 0);
      // XP: kills (10 each), extraction bonus (50), loot value (1 per 50₽), objectives
      const killXp = state.killCount * 10;
      // Extraction cost — harder exfils give more XP
      const activeExfil = state.extractionPoints.find(ep => ep.active && Math.hypot(ep.pos.x - state.player.pos.x, ep.pos.y - state.player.pos.y) < ep.radius + 50);
      const exfilMultiplier = activeExfil ? ((activeExfil as any)._xpMultiplier || 1.0) : 1.0;
      const extractionXp = Math.round(50 * exfilMultiplier);
      const lootXp = Math.floor(lootValue / 50);
      const classXpMult = (state as any)._xpMultiplier || 1.0;
      const totalXp = Math.round((killXp + extractionXp + lootXp + objectiveXp) * exfilMultiplier * classXpMult);

      // ── Daily mission rewards ──
      const dailyMissions = getDailyMissions();
      const dailyProg = loadDailyProgress();
      const raidStats: Record<string, number | boolean> = {
        killCount: state.killCount,
        headshotKills: state.headshotKills,
        grenadeKills: state.grenadeKills,
        bodiesLooted: state.bodiesLooted,
        cachesLooted: state.cachesLooted,
        noHitsTaken: state.noHitsTaken,
        longShots: state.longShots,
        wallsBreached: state.wallsBreached,
        documentsCollected: state.documentsCollected,
        dogsNeutralized: state.dogsNeutralized,
        mosinKills: state.mosinKills,
        knifeDistanceKills: state.knifeDistanceKills,
      };
      let dailyRubles = 0;
      let dailyXp = 0;
      for (const dm of dailyMissions) {
        if (!dailyProg.completed.includes(dm.id) && checkDailyCompletion(dm, raidStats)) {
          dailyProg.completed.push(dm.id);
          dailyRubles += dm.reward.rubles;
          dailyXp += dm.reward.xp;
        }
      }
      if (dailyRubles > 0 || dailyXp > 0) {
        saveDailyProgress(dailyProg);
      }

      // Merge weapon mastery kills from this raid
      const raidMasteryKills = ((state as any)._weaponMasteryKills || {}) as Record<string, number>;

      setStash(prev => {
        const newXp = prev.xp + totalXp + dailyXp;
        const newLevel = getLevelForXp(newXp);
        // Merge weapon mastery
        const prevMastery = prev.weaponMastery || { ...EMPTY_MASTERY };
        const newMastery = { ...prevMastery };
        for (const [type, kills] of Object.entries(raidMasteryKills)) {
          const t = type as WeaponMasteryType;
          if (newMastery[t]) {
            const data = { ...newMastery[t] };
            data.kills += kills;
            data.level = getMasteryLevel(data.kills);
            newMastery[t] = data;
          }
        }
        const updated = {
          ...prev,
          items: [...prev.items, ...lootItems],
          extractionCount: prev.extractionCount + 1,
          rubles: prev.rubles + objectiveReward + dailyRubles,
          xp: newXp,
          level: newLevel,
          weaponMastery: newMastery,
        };
        persistStash(updated, playerName);
        return updated;
      });
    }
  }, [hudState.extracted]);

  const startRaid = useCallback((mapId: MapId) => {
    setSelectedMapId(mapId);
    inputRef.current = createDefaultInputState();

    // Fresh state for the selected map
    stateRef.current = safeCreateGameState(mapId, stash.level || 1, stash.extractionCount || 0);
    const st = stateRef.current;
    const ups = stash.upgrades;

    // Backpack upgrade
    st.backpackCapacity = getUpgradeLevel(ups, 'backpack') * 4;
    // Helmet/armor upgrade
    st.player.armor = getUpgradeLevel(ups, 'helmet') * 10;
    // Extended mag
    st.player.maxAmmo += getUpgradeLevel(ups, 'ext_mag') * 10;
    st.player.currentAmmo = st.player.maxAmmo;
    // Speed boost
    const speedLvl = getUpgradeLevel(ups, 'sprint_boots');
    if (speedLvl > 0) st.player.speed *= (1 + speedLvl * 0.08);
    // Fire rate (ergonomics)
    const ergoLvl = getUpgradeLevel(ups, 'ergonomics');
    if (ergoLvl > 0) st.player.fireRate *= (1 - ergoLvl * 0.10);
    // Medkit on deploy
    if (getUpgradeLevel(ups, 'medkit_upgrade') > 0) {
      st.player.inventory.push({
        id: 'medkit', name: 'Medkit', category: 'medical', icon: '🏥',
        weight: 0.5, value: 50, healAmount: 40, medicalType: 'medkit',
        description: 'Heals 40 HP',
      });
    }
    // Grenade vest
    const grenadeLvl = getUpgradeLevel(ups, 'grenade_vest');
    for (let i = 0; i < grenadeLvl; i++) {
      st.player.inventory.push({
        id: 'frag_grenade', name: 'F-1 Grenade', category: 'grenade', icon: '💣',
        weight: 0.6, value: 80, damage: 80, description: 'Frag grenade',
      });
    }
    // Emergency Injector — always start with one
    st.player.inventory.push({
      id: 'emergency_injector', name: 'Emergency Injector', category: 'medical', icon: '💉',
      weight: 0.2, value: 350, healAmount: 75, medicalType: 'morphine',
      description: 'Auto-revive to 75 HP when taking lethal damage. Stops bleeding.',
    });
    // Red dot sight — store as flag on game state for engine to use
    const redDotLvl = getUpgradeLevel(ups, 'red_dot');
    if (redDotLvl > 0) (st as any)._bulletSpeedBonus = 0.25;
    // Match-grade barrel — critical hit bonus
    const matchBarrelLvl = getUpgradeLevel(ups, 'match_barrel');
    if (matchBarrelLvl > 0) (st as any)._critChanceBonus = matchBarrelLvl * 0.05;
    // ── NEW SKILL TREE UPGRADES ──
    // Quick Hands — faster reload
    const quickReloadLvl = getUpgradeLevel(ups, 'quick_reload');
    if (quickReloadLvl > 0) (st as any)._reloadSpeedBonus = quickReloadLvl * 0.15;
    // Silent Step — reduced noise
    const silentStepLvl = getUpgradeLevel(ups, 'silent_step');
    if (silentStepLvl > 0) (st as any)._noiseReduction = silentStepLvl * 0.10;
    // Iron Constitution — more HP
    const ironBodyLvl = getUpgradeLevel(ups, 'iron_body');
    if (ironBodyLvl > 0) { st.player.maxHp += ironBodyLvl * 15; st.player.hp = st.player.maxHp; }
    // Pack Mule — extra backpack space
    st.backpackCapacity += getUpgradeLevel(ups, 'big_backpack') * 6;
    // Donator bonus: +8 inventory slots
    if (playerIsDonator) st.backpackCapacity += 8;
    // Endurance — more stamina
    const enduranceLvl = getUpgradeLevel(ups, 'endurance');
    if (enduranceLvl > 0) {
      st.player.maxStamina *= (1 + enduranceLvl * 0.20);
      st.player.stamina = st.player.maxStamina;
    }
    // ── CLASS PASSIVE BONUSES ──
    const classDef = getClassDef(playerSkinId);
    const cp = classDef.passive;
    if (cp.fireRateBonus) st.player.fireRate *= (1 - cp.fireRateBonus);
    if (cp.speedBonus) st.player.speed *= (1 + cp.speedBonus);
    if (cp.noiseReduction) (st as any)._noiseReduction = ((st as any)._noiseReduction || 0) + cp.noiseReduction;
    if (cp.sneakSpeedBonus) (st as any)._sneakSpeedBonus = cp.sneakSpeedBonus;
    if (cp.detectionReduction) (st as any)._detectionReduction = cp.detectionReduction;
    if (cp.critChanceBonus) (st as any)._critChanceBonus = ((st as any)._critChanceBonus || 0) + cp.critChanceBonus;
    if (cp.maxHpBonus) { st.player.maxHp += cp.maxHpBonus; st.player.hp = st.player.maxHp; }
    if (cp.xpMultiplier) (st as any)._xpMultiplier = 1 + cp.xpMultiplier;
    if (cp.seeEnemyTypes) (st as any)._seeEnemyTypes = true;
    // Set class ability on game state
    st.abilityId = classDef.ability.id;
    st.abilityCooldown = 0;
    st.abilityActive = false;
    st.abilityTimer = 0;
    // Donator loot value bonus
    if (playerIsDonator) (st as any)._lootValueBonus = 0.10;

    // Auto-attach weapon mods from stash
    for (const item of stash.items) {
      if (item.category === 'weapon_mod' && st.player.primaryWeapon) {
        const wpn = st.player.primaryWeapon;
        if (!wpn.attachedMods) wpn.attachedMods = [];
        if (item.modType === 'scope' && !wpn.attachedMods.some(m => m.modType === 'scope')) {
          wpn.bulletSpeed = (wpn.bulletSpeed || 8) * (1 + (item.modBulletSpeedBonus || 0));
          wpn.attachedMods.push(item);
        } else if (item.modType === 'suppressor' && !wpn.attachedMods.some(m => m.modType === 'suppressor')) {
          (st as any)._suppressorEquipped = true;
          wpn.attachedMods.push(item);
        } else if (item.modType === 'ext_magazine' && !wpn.attachedMods.some(m => m.modType === 'ext_magazine')) {
          st.player.maxAmmo += (item.modMagBonus || 8);
          st.player.currentAmmo = st.player.maxAmmo;
          wpn.attachedMods.push(item);
        }
      }
    }

    // Test player overrides
    const nameLower = playerName.trim().toLowerCase();
    if (nameLower === 'test1') {
      const laser = WEAPON_TEMPLATES.laser();
      st.player.primaryWeapon = laser;
      st.player.inventory.push(laser);
    }
    if (nameLower === 'test2') {
      st.player.pos = { x: 920, y: 620 };
    }
    if (nameLower === 'test3') {
      LORE_DOCUMENTS.forEach(d => { d.found = true; });
      st.documentsRead = LORE_DOCUMENTS.map(d => d.id);
      st.codesFound = LORE_DOCUMENTS.filter(d => d.hasCode && d.code).map(d => d.code!);
    }

    lastTimeRef.current = 0;
    extractedRef.current = false;
    setShowInventory(false);
    setShowIntel(false);
    setReadingDoc(null);

    setStash(prev => {
      const updated = { ...prev, raidCount: prev.raidCount + 1 };
      persistStash(updated, playerName);
      return updated;
    });

    setStarted(true);
    setGamePhase('deploying');
    setHudState(h => ({ ...h, gameOver: false, extracted: false }));
  }, [stash, playerIsDonator, playerSkinId, playerName]);

  // Phase: intro
  if (gamePhase === 'intro') {
    return (
      <div className="relative w-screen h-[100dvh] overflow-hidden bg-background animate-in fade-in duration-500">
        <IntroScreen onStart={async (name, skin) => {
          setPlayerName(name);
          setPlayerSkin(skin);
          setPlayerSkinId(skin);
          setPlayerIsAdmin(skin === 'admin');
          // Check donator status
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: prof } = await supabase.from('profiles').select('is_donator').eq('id', session.user.id).single();
            setPlayerIsDonator(prof?.is_donator === true);
          }
          // Try loading from DB first
          const dbStash = await loadStashFromDb(name);
          if (dbStash) {
            setStash(dbStash);
            saveStash(dbStash); // sync to localStorage too
          }
          setGamePhase('homebase');
        }} />
      </div>
    );
  }

  // Phase: homebase
  if (gamePhase === 'homebase') {
    return (
      <div className="relative w-screen h-[100dvh] overflow-hidden bg-background animate-in fade-in slide-in-from-bottom-2 duration-500">
        <HomeBase
          playerName={playerName}
          stash={stash}
          isAdmin={playerIsAdmin}
          isDonator={playerIsDonator}
          objectives={objectives}
          onDeploy={(mapId: MapId) => {
            setSelectedMapId(mapId);
            inputRef.current = createDefaultInputState();
            // Apply upgrades to game state
            stateRef.current = safeCreateGameState(mapId, stash.level || 1, stash.extractionCount || 0);
            const st = stateRef.current;
            const ups = stash.upgrades;
            // Backpack upgrade
            st.backpackCapacity = getUpgradeLevel(ups, 'backpack') * 4;
            // Helmet/armor upgrade
            st.player.armor = getUpgradeLevel(ups, 'helmet') * 10;
            // Extended mag
            st.player.maxAmmo += getUpgradeLevel(ups, 'ext_mag') * 10;
            st.player.currentAmmo = st.player.maxAmmo;
            // Speed boost
            const speedLvl = getUpgradeLevel(ups, 'sprint_boots');
            if (speedLvl > 0) st.player.speed *= (1 + speedLvl * 0.08);
            // Fire rate (ergonomics)
            const ergoLvl = getUpgradeLevel(ups, 'ergonomics');
            if (ergoLvl > 0) st.player.fireRate *= (1 - ergoLvl * 0.10);
            // Medkit on deploy
            if (getUpgradeLevel(ups, 'medkit_upgrade') > 0) {
              st.player.inventory.push({
                id: 'medkit', name: 'Medkit', category: 'medical', icon: '🏥',
                weight: 0.5, value: 50, healAmount: 40, medicalType: 'medkit',
                description: 'Heals 40 HP',
              });
            }
            // Grenade vest
            const grenadeLvl = getUpgradeLevel(ups, 'grenade_vest');
            for (let i = 0; i < grenadeLvl; i++) {
              st.player.inventory.push({
                id: 'frag_grenade', name: 'F-1 Grenade', category: 'grenade', icon: '💣',
                weight: 0.6, value: 80, damage: 80, description: 'Frag grenade',
              });
            }
            // Emergency Injector — always start with one
            st.player.inventory.push({
              id: 'emergency_injector', name: 'Emergency Injector', category: 'medical', icon: '💉',
              weight: 0.2, value: 350, healAmount: 75, medicalType: 'morphine',
              description: 'Auto-revive to 75 HP when taking lethal damage. Stops bleeding.',
            });
            // Red dot sight — store as flag on game state for engine to use
            const redDotLvl = getUpgradeLevel(ups, 'red_dot');
            if (redDotLvl > 0) (st as any)._bulletSpeedBonus = 0.25;
            // Match-grade barrel — critical hit bonus
            const matchBarrelLvl = getUpgradeLevel(ups, 'match_barrel');
            if (matchBarrelLvl > 0) (st as any)._critChanceBonus = matchBarrelLvl * 0.05;
            // ── NEW SKILL TREE UPGRADES ──
            // Quick Hands — faster reload
            const quickReloadLvl = getUpgradeLevel(ups, 'quick_reload');
            if (quickReloadLvl > 0) (st as any)._reloadSpeedBonus = quickReloadLvl * 0.15;
            // Silent Step — reduced noise
            const silentStepLvl = getUpgradeLevel(ups, 'silent_step');
            if (silentStepLvl > 0) (st as any)._noiseReduction = silentStepLvl * 0.10;
            // Iron Constitution — more HP
            const ironBodyLvl = getUpgradeLevel(ups, 'iron_body');
            if (ironBodyLvl > 0) { st.player.maxHp += ironBodyLvl * 15; st.player.hp = st.player.maxHp; }
            // Pack Mule — extra backpack space
            st.backpackCapacity += getUpgradeLevel(ups, 'big_backpack') * 6;
            // Donator bonus: +8 inventory slots
            if (playerIsDonator) st.backpackCapacity += 8;
            // Endurance — more stamina
            const enduranceLvl = getUpgradeLevel(ups, 'endurance');
            if (enduranceLvl > 0) {
              st.player.maxStamina *= (1 + enduranceLvl * 0.20);
              st.player.stamina = st.player.maxStamina;
            }
            // ── CLASS PASSIVE BONUSES ──
            const classDef = getClassDef(playerSkinId);
            const cp = classDef.passive;
            if (cp.fireRateBonus) st.player.fireRate *= (1 - cp.fireRateBonus);
            if (cp.speedBonus) st.player.speed *= (1 + cp.speedBonus);
            if (cp.noiseReduction) (st as any)._noiseReduction = ((st as any)._noiseReduction || 0) + cp.noiseReduction;
            if (cp.sneakSpeedBonus) (st as any)._sneakSpeedBonus = cp.sneakSpeedBonus;
            if (cp.detectionReduction) (st as any)._detectionReduction = cp.detectionReduction;
            if (cp.critChanceBonus) (st as any)._critChanceBonus = ((st as any)._critChanceBonus || 0) + cp.critChanceBonus;
            if (cp.maxHpBonus) { st.player.maxHp += cp.maxHpBonus; st.player.hp = st.player.maxHp; }
            if (cp.xpMultiplier) (st as any)._xpMultiplier = 1 + cp.xpMultiplier;
            if (cp.seeEnemyTypes) (st as any)._seeEnemyTypes = true;
            // Set class ability on game state
            st.abilityId = classDef.ability.id;
            st.abilityCooldown = 0;
            st.abilityActive = false;
            st.abilityTimer = 0;
            // Donator loot value bonus
            if (playerIsDonator) (st as any)._lootValueBonus = 0.10;
            // ── Apply weapon mods from stash items ──
            // Auto-attach mods to equipped weapons
            for (const item of stash.items) {
              if (item.category === 'weapon_mod' && st.player.primaryWeapon) {
                const wpn = st.player.primaryWeapon;
                if (!wpn.attachedMods) wpn.attachedMods = [];
                if (item.modType === 'scope' && !wpn.attachedMods.some(m => m.modType === 'scope')) {
                  wpn.bulletSpeed = (wpn.bulletSpeed || 8) * (1 + (item.modBulletSpeedBonus || 0));
                  wpn.attachedMods.push(item);
                } else if (item.modType === 'suppressor' && !wpn.attachedMods.some(m => m.modType === 'suppressor')) {
                  (st as any)._suppressorEquipped = true;
                  wpn.attachedMods.push(item);
                } else if (item.modType === 'ext_magazine' && !wpn.attachedMods.some(m => m.modType === 'ext_magazine')) {
                  st.player.maxAmmo += (item.modMagBonus || 8);
                  st.player.currentAmmo = st.player.maxAmmo;
                  wpn.attachedMods.push(item);
                }
              }
            }

            // ── Test player overrides ──
            const nameLower = playerName.trim().toLowerCase();
            if (nameLower === 'test1') {
              const laser = WEAPON_TEMPLATES.laser();
              st.player.primaryWeapon = laser;
              st.player.inventory.push(laser);
            }
            if (nameLower === 'test2') {
              st.player.pos = { x: 920, y: 620 };
            }
            if (nameLower === 'test3') {
              LORE_DOCUMENTS.forEach(d => { d.found = true; });
              st.documentsRead = LORE_DOCUMENTS.map(d => d.id);
              st.codesFound = LORE_DOCUMENTS.filter(d => d.hasCode && d.code).map(d => d.code!);
            }

            lastTimeRef.current = 0;
            extractedRef.current = false;
            setStash(prev => {
              const updated = { ...prev, raidCount: prev.raidCount + 1 };
              persistStash(updated, playerName);
              return updated;
            });
            setStarted(true);
            setGamePhase('deploying');
            setHudState(h => ({ ...h, gameOver: false, extracted: false }));
          }}
          onSellItem={(idx) => {
            setStash(prev => {
              const item = prev.items[idx];
              if (!item) return prev;
              const updated = {
                ...prev,
                items: prev.items.filter((_, i) => i !== idx),
                rubles: prev.rubles + item.value,
              };
              persistStash(updated, playerName);
              return updated;
            });
          }}
          onSellAll={() => {
            setStash(prev => {
              const total = prev.items.reduce((s, i) => s + i.value, 0);
              const updated = { ...prev, items: [], rubles: prev.rubles + total };
              persistStash(updated, playerName);
              return updated;
            });
          }}
          onBuyUpgrade={(upgradeId) => {
            setStash(prev => {
              const upgrade = UPGRADES.find(u => u.id === upgradeId);
              if (!upgrade) return prev;
              const currentLevel = prev.upgrades[upgradeId] || 0;
              if (currentLevel >= upgrade.maxLevel) return prev;
              const cost = getUpgradeCost(upgrade, currentLevel);
              if (prev.rubles < cost) return prev;
              const updated = {
                ...prev,
                rubles: prev.rubles - cost,
                upgrades: { ...prev.upgrades, [upgradeId]: currentLevel + 1 },
              };
              persistStash(updated, playerName);
              return updated;
            });
          }}
          onBuyTraderItem={(itemId, adjustedCost) => {
            setStash(prev => {
              const traderItem = TRADER_ITEMS.find(t => t.id === itemId);
              if (!traderItem || prev.rubles < adjustedCost) return prev;
              let newItem: Item;
              switch (itemId) {
                case 'buy_injector': newItem = { id: 'emergency_injector', name: 'Emergency Injector', category: 'medical', icon: '💉', weight: 0.2, value: 350, healAmount: 75, medicalType: 'morphine', description: 'Auto-revive to 75 HP when taking lethal damage. Stops bleeding.' } as Item; break;
                case 'buy_bandage': newItem = createMedical('Bandage', 10, '🩹', 'bandage', 3); break;
                case 'buy_medkit': newItem = createMedical('Medkit', 40, '🏥', 'medkit', 1); break;
                case 'buy_morphine': newItem = createMedical('Morphine', 100, '💉', 'morphine', 5, 8); break;
                case 'buy_frag': newItem = createGrenade(); break;
                case 'buy_flashbang': newItem = createFlashbang(); break;
                case 'buy_gas': newItem = createGasGrenade(); break;
                case 'buy_tnt': newItem = createTNT(); break;
                case 'buy_ammo_545': newItem = createAmmo('5.45x39', 20); break;
                case 'buy_ammo_762': newItem = createAmmo('7.62x39', 15); break;
                case 'buy_ammo_54r': newItem = createAmmo('7.62x54R', 10); break;
                case 'buy_armor': newItem = createArmor(); break;
                case 'buy_helmet': newItem = createHelmet(); break;
                case 'buy_goggles': newItem = createGoggles(); break;
                case 'buy_backpack': newItem = createBackpack(); break;
                case 'buy_knife': newItem = WEAPON_TEMPLATES.knife(); break;
                case 'buy_ak74': newItem = WEAPON_TEMPLATES.ak74(); break;
                case 'buy_mosin': newItem = WEAPON_TEMPLATES.mosin(); break;
                case 'buy_toz': newItem = WEAPON_TEMPLATES.toz(); break;
                case 'buy_scope': newItem = createScope(); break;
                case 'buy_suppressor': newItem = createSuppressor(); break;
                case 'buy_ext_mag': newItem = createExtMagazine(); break;
                default: return prev;
              }
              const updated = {
                ...prev,
                rubles: prev.rubles - adjustedCost,
                items: [...prev.items, newItem],
              };
              persistStash(updated, playerName);
              return updated;
            });
          }}
          onCraft={(recipeId) => {
            const recipe = RECIPES.find(r => r.id === recipeId);
            if (!recipe) return;
            setStash(prev => {
              const result = craft(recipe, prev.items);
              if (!result) return prev;
              const updated = {
                ...prev,
                items: [...result.remaining, result.result],
              };
              persistStash(updated, playerName);
              return updated;
            });
          }}
          onRerollObjectives={(cost) => {
            if (cost > 0) {
              setStash(prev => {
                const updated = { ...prev, rubles: prev.rubles - cost };
                persistStash(updated, playerName);
                return updated;
              });
            }
            const nextObjectives = generateMissionObjectives(selectedMapId);
            objectivesByMapRef.current[selectedMapId] = nextObjectives;
            const nextRerollCount = (rerollsByMapRef.current[selectedMapId] || 0) + 1;
            rerollsByMapRef.current[selectedMapId] = nextRerollCount;
            setObjectives(nextObjectives);
            setRerollCount(nextRerollCount);
          }}
          onMapChange={(mapId: MapId) => {
            setSelectedMapId(mapId);
            if (!objectivesByMapRef.current[mapId]) {
              objectivesByMapRef.current[mapId] = generateMissionObjectives(mapId);
            }
            if (rerollsByMapRef.current[mapId] == null) {
              rerollsByMapRef.current[mapId] = 0;
            }
            setObjectives(objectivesByMapRef.current[mapId]);
            setRerollCount(rerollsByMapRef.current[mapId]);
          }}
          onReturnToMenu={() => {
            setGamePhase('intro');
            setStarted(false);
          }}
          rerollCount={rerollCount}
        />
      </div>
    );
  }

  // Phase: playing
  const equippedWeaponRefs = new Set<Item>(
    [hudState.player.primaryWeapon, hudState.player.sidearm].filter((w): w is Item => Boolean(w))
  );
  const backpackEntries = hudState.player.inventory.reduce<Array<{ item: Item; originalIndex: number }>>((acc, item, originalIndex) => {
    const isEquippedWeapon = item.category === 'weapon' && equippedWeaponRefs.has(item);
    const isThrowable = item.category === 'grenade' || item.category === 'flashbang';
    if (!isEquippedWeapon && !isThrowable) acc.push({ item, originalIndex });
    return acc;
  }, []);
  const backpackItems = backpackEntries.map((entry) => entry.item);

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-background touch-none">
      <div className="relative w-full h-full">
        <canvas ref={canvasRef} className="block w-full h-full touch-none" />

        {/* Pause overlay */}
        {gamePaused && !showControlOverlay && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/70 backdrop-blur-sm pointer-events-auto">
            <div className="text-center">
              <h2 className="text-3xl font-display text-accent tracking-wider mb-4">⏸ PAUSED</h2>
              <button
                className="px-8 py-3 bg-primary text-primary-foreground font-display uppercase tracking-widest rounded-sm hover:bg-primary/80 transition-colors"
                onClick={() => { setGamePaused(false); gamePausedRef.current = false; }}
              >
                ▶ RESUME
              </button>
            </div>
          </div>
        )}

        {showFirefoxWarning && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
            <div className="max-w-md rounded border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
              <p className="text-xs font-mono text-foreground">
                <span className="text-warning">Firefox detected:</span> spelet kan vara snabbare i Chrome eller Edge.
              </p>
              <div className="mt-2 flex justify-end">
                <button
                  className="rounded border border-border bg-secondary px-2 py-1 text-xs font-mono text-secondary-foreground hover:bg-secondary/80"
                  onClick={() => {
                    setShowFirefoxWarning(false);
                    window.sessionStorage.setItem(FIREFOX_WARNING_KEY, '1');
                  }}
                >
                  Stäng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Control overlay — shown during deploying phase */}
        {showControlOverlay && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300"
            onKeyDown={dismissControls}
          >
            <div className="max-w-md w-full mx-4 p-6 border border-border bg-card rounded animate-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-display text-accent text-center tracking-wider mb-4">📋 FIELD MANUAL</h2>
              {isMobile ? (
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-muted-foreground">
                  <div className="border border-border/30 rounded p-2"><span className="text-foreground">🕹️ Left Stick</span><br/>Move</div>
                  <div className="border border-border/30 rounded p-2"><span className="text-foreground">👆 Tap Screen</span><br/>Aim & Shoot</div>
                  <div className="border border-border/30 rounded p-2"><span className="text-foreground">🔍 Button</span><br/>Interact / Loot</div>
                  <div className="border border-border/30 rounded p-2"><span className="text-foreground">💊 Button</span><br/>Heal</div>
                  <div className="border border-border/30 rounded p-2"><span className="text-foreground">💣 Button</span><br/>Throw Grenade</div>
                  <div className="border border-border/30 rounded p-2"><span className="text-foreground">🛡️ Button</span><br/>Take Cover</div>
                  <div className="border border-border/30 rounded p-2"><span className="text-foreground">🎒 Button</span><br/>Inventory</div>
                  <div className="border border-border/30 rounded p-2"><span className="text-foreground">🔄 Button</span><br/>Reload</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-muted-foreground">
                  <div className="border border-border/30 rounded p-2"><span className="text-foreground">WASD</span> — Move</div>
                  <div className="border border-border/30 rounded p-2"><span className="text-foreground">Mouse</span> — Aim & Shoot</div>
                  <div className="border border-border/30 rounded p-2"><span className="text-foreground">E</span> — Interact / Loot</div>
                  <div className="border border-border/30 rounded p-2"><span className="text-foreground">H</span> — Heal</div>
                  <div className="border border-border/30 rounded p-2"><span className="text-foreground">G</span> — Throw Grenade</div>
                  <div className="border border-border/30 rounded p-2"><span className="text-foreground">Q / Space</span> — Take Cover</div>
                  <div className="border border-border/30 rounded p-2"><span className="text-foreground">Shift</span> — Sprint</div>
                  <div className="border border-border/30 rounded p-2"><span className="text-foreground">Ctrl</span> — Sneak</div>
                  <div className="border border-border/30 rounded p-2"><span className="text-foreground">R</span> — Reload</div>
                  <div className="border border-border/30 rounded p-2"><span className="text-foreground">Tab</span> — Inventory</div>
                  <div className="border border-border/30 rounded p-2"><span className="text-foreground">1-3</span> — Switch Weapon</div>
                  <div className="border border-border/30 rounded p-2"><span className="text-foreground">T</span> — Place TNT</div>
                </div>
              )}
              <button
                className="w-full mt-4 px-6 py-3 bg-primary text-primary-foreground font-display uppercase tracking-widest rounded-sm hover:bg-primary/80 transition-colors"
                onClick={dismissControls}
              >
                ▶ CONTINUE
              </button>
              <p className="text-[8px] font-mono text-muted-foreground/40 text-center mt-2">
                Click Continue to start the raid
              </p>
            </div>
          </div>
        )}

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
          hasExtractionCode={hudState.hasExtractionCode}
          movementMode={hudState.movementMode}
          inCover={hudState.inCover}
          peeking={hudState.peeking}
          coverType={hudState.coverType}
          canHide={hudState.canHide}
          isHiding={hudState.isHiding}
          onViewDocuments={() => { setShowIntel(true); }}
          timeLimit={TIME_LIMIT}
          playerName={playerName}
          deathCause={hudState.deathCause}
          exfilRevealed={hudState.exfilRevealed}
          achievementStats={hudState.achievementStats}
          objectives={objectives}
          activeUpgrades={stash.upgrades}
          isMobile={isMobile}
          mapId={selectedMapId}
          noiseLevel={hudState.noiseLevel}
          weather={hudState.weather}
          shotsFired={hudState.shotsFired}
          shotsHit={hudState.shotsHit}
          damageDealt={hudState.damageDealt}
          damageTaken={hudState.damageTaken}
          enemyPositions={hudState.enemyPositions}
          extractionPositions={hudState.extractionPositions}
          objectivePositions={hudState.objectivePositions}
          mapWidth={hudState.mapWidth}
          mapHeight={hudState.mapHeight}
          isFirstRaid={stash.raidCount <= 1}
          abilityIcon={getClassDef(playerSkinId).ability.icon}
          abilityName={getClassDef(playerSkinId).ability.name}
          abilityCooldown={stateRef.current?.abilityCooldown || 0}
          abilityActive={stateRef.current?.abilityActive || false}
          abilityTimer={stateRef.current?.abilityTimer || 0}
          onReturnToBase={() => {
            setStarted(false);
            setGamePhase('homebase');
            // Reroll objectives for next raid
            const nextObjectives = generateMissionObjectives(selectedMapId);
            objectivesByMapRef.current[selectedMapId] = nextObjectives;
            rerollsByMapRef.current[selectedMapId] = 0;
            setObjectives(nextObjectives);
            setRerollCount(0);
          }}
          onRevengeRun={() => {
            // Reroll objectives for fresh raid on same map
            const nextObjectives = generateMissionObjectives(selectedMapId);
            objectivesByMapRef.current[selectedMapId] = nextObjectives;
            rerollsByMapRef.current[selectedMapId] = 0;
            setObjectives(nextObjectives);
            setRerollCount(0);
            // Reset game state and go straight to deploying on same map
            setStarted(true);
            setGamePhase('deploying');
            setHudState(h => ({ ...h, gameOver: false, extracted: false }));
          }}
        />

        <LootPopup notifications={lootNotifications} />

        {/* Mobile controls — joystick + action buttons */}
        {isMobile && (
          <MobileControls
            inputRef={inputRef}
            stateRef={stateRef}
            onToggleInventory={() => { setShowInventory(v => !v); setShowIntel(false); }}
            onToggleIntel={() => { setShowIntel(v => !v); setShowInventory(false); }}
            onCloseDoc={() => setReadingDoc(null)}
            movementMode={hudState.movementMode}
            hasDoc={!!readingDoc}
            nearInteractable={hudState.nearInteractable}
          />
        )}

        {/* Desktop hints */}
        {!isMobile && (
          <div className="absolute bottom-2 left-3 text-[9px] text-muted-foreground/40 font-mono">
            WASD move · Shift sprint · Ctrl sneak · Q cover · E loot · R reload · H heal · G throw · MMB rock · Tab bag · 1-3 weapons
          </div>
        )}

        {/* Mode toggle — top-left corner */}
        <div className="absolute top-[max(0.5rem,env(safe-area-inset-top))] left-2 z-50 pointer-events-auto flex gap-1 items-start">
          <button
            className="px-2 py-1 rounded text-[9px] font-mono bg-card/60 border border-border/40 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => { setGamePaused(p => { gamePausedRef.current = !p; return !p; }); }}
          >
            {gamePaused ? '▶' : '⏸'}
          </button>
          <button
            className="px-2 py-1 rounded text-[9px] font-mono bg-card/60 border border-border/40 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              setMusicEnabled(prev => {
                if (prev) { stopAmbient(); } else { startAmbient(selectedMapId); }
                return !prev;
              });
            }}
          >
            {musicEnabled ? '🔊' : '🔇'}
          </button>
          <button
            className="px-2 py-1 rounded text-[9px] font-mono bg-card/60 border border-border/40 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileOverride(prev => prev === null ? !autoMobile : !prev)}
          >
            {isMobile ? 'Desktop' : 'Mobil'}
          </button>
          <button
            className="px-2 py-1 rounded text-[9px] font-mono bg-card/60 border border-border/40 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowGfxPanel(p => !p)}
          >
            ⚙️ {gfxPreset === 'custom' ? 'CUSTOM' : gfxPreset.toUpperCase()}
          </button>
          {showGfxPanel && (
            <div className="absolute top-8 left-0 bg-card/95 border border-border/60 rounded-md p-2 min-w-[180px] backdrop-blur-sm" onClick={e => e.stopPropagation()}>
              <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Preset</div>
              <div className="flex gap-1 mb-2">
                {(['low', 'medium', 'high'] as GraphicsPreset[]).map(p => (
                  <button
                    key={p}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono border transition-colors ${gfxPreset === p ? 'bg-primary text-primary-foreground border-primary' : 'bg-card/60 border-border/40 text-muted-foreground hover:text-foreground'}`}
                    onClick={() => { applyPreset(p); setGfxSettings({ ...getSettings() }); setGfxPreset(p); }}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="border-t border-border/30 pt-1.5 space-y-1">
                {([
                  ['weather', '❄️ Weather / Aurora'],
                  ['muzzleFlash', '🔥 Muzzle Flash'],
                  ['tracers', '💫 Bullet Tracers'],
                  ['bloodStains', '🩸 Blood Stains'],
                  ['detailedChars', '👤 Detailed Characters'],
                ] as [keyof GraphicsSettings, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground hover:text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!gfxSettings[key]}
                      onChange={() => {
                        updateSetting(key, !gfxSettings[key]);
                        setGfxSettings({ ...getSettings() });
                        setGfxPreset(getPreset());
                      }}
                      className="w-3 h-3 accent-primary"
                    />
                    {label}
                  </label>
                ))}
                <div className="mt-1">
                  <div className="text-[9px] font-mono text-muted-foreground mb-0.5">🔭 Render Distance</div>
                  <div className="flex gap-1">
                    {(['near', 'normal', 'far'] as RenderDistance[]).map(d => (
                      <button
                        key={d}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-mono border transition-colors ${gfxSettings.renderDist === d ? 'bg-primary text-primary-foreground border-primary' : 'bg-card/60 border-border/40 text-muted-foreground hover:text-foreground'}`}
                        onClick={() => {
                          updateSetting('renderDist', d);
                          setGfxSettings({ ...getSettings() });
                          setGfxPreset(getPreset());
                        }}
                      >
                        {d === 'near' ? 'NEAR' : d === 'normal' ? 'MED' : 'FAR'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Inventory Panel */}
        {showInventory && (
          <div className={`absolute z-30 ${isMobile ? 'top-10 left-1/2 -translate-x-1/2' : 'top-12 right-3'}`}>
            <InventoryPanel
              items={backpackItems}
              inCover={hudState.inCover}
              maxSlots={12 + (stateRef.current?.backpackCapacity || 0)}
              onDropItem={(idx) => {
                const entry = backpackEntries[idx];
                if (!entry || !stateRef.current) return;
                const dropped = stateRef.current.player.inventory.splice(entry.originalIndex, 1);
                if (dropped.length > 0) {
                  stateRef.current.lootContainers.push({
                    id: `drop_${Date.now()}`,
                    pos: { x: stateRef.current.player.pos.x + (Math.random() - 0.5) * 30, y: stateRef.current.player.pos.y + (Math.random() - 0.5) * 30 },
                    size: 20,
                    items: dropped,
                    looted: false,
                    type: 'body',
                  });
                }
              }}
            />
          </div>
        )}
      </div>

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
