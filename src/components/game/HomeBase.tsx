import React, { useState } from 'react';
import { Item } from '../../game/types';
import { UPGRADES, TRADER_ITEMS, UpgradeState, getUpgradeLevel, getUpgradeCost, canBuyUpgrade, getLevelForXp, getXpForNextLevel } from '../../game/upgrades';
import { MissionObjective } from '../../game/objectives';
import { MapId, MAPS } from '../../game/maps';
import { LORE_DOCUMENTS, LoreDocument } from '../../game/lore';
import { getDailyMissions, loadDailyProgress, saveDailyProgress, checkDailyCompletion, DailyMission } from '../../game/dailyMissions';
import { RECIPES, canCraft, craft } from '../../game/crafting';
import { getRepTier, getNextRepTier, getAdjustedPrice } from '../../game/reputation';
import { getItemRarity, RARITY_BG, RARITY_GLOW, RARITY_LABEL, RARITY_COLORS } from '../../game/rarity';

export interface StashState {
  items: Item[];
  rubles: number;
  raidCount: number;
  extractionCount: number;
  upgrades: UpgradeState;
  xp: number;
  level: number;
}

const EMPTY_STASH: StashState = {
  items: [],
  rubles: 0,
  raidCount: 0,
  extractionCount: 0,
  upgrades: {},
  xp: 0,
  level: 1,
};

export function loadStash(): StashState {
  try {
    const raw = localStorage.getItem('nz_stash');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...EMPTY_STASH, ...parsed };
    }
  } catch {}
  return { ...EMPTY_STASH };
}

export function saveStash(stash: StashState) {
  localStorage.setItem('nz_stash', JSON.stringify(stash));
}

interface HomeBaseProps {
  playerName: string;
  stash: StashState;
  objectives: MissionObjective[];
  onDeploy: (mapId: MapId) => void;
  onSellItem: (index: number) => void;
  onSellAll: () => void;
  onBuyUpgrade: (upgradeId: string) => void;
  onBuyTraderItem: (itemId: string, adjustedCost: number) => void;
  onRerollObjectives: (cost: number) => void;
  onMapChange: (mapId: MapId) => void;
  onCraft: (recipeId: string) => void;
  rerollCount: number;
}

export const HomeBase: React.FC<HomeBaseProps> = ({ playerName, stash, objectives, onDeploy, onSellItem, onSellAll, onBuyUpgrade, onBuyTraderItem, onRerollObjectives, onMapChange, onCraft, rerollCount }) => {
  const [tab, setTab] = useState<'stash' | 'trader' | 'shop' | 'mission' | 'intel' | 'craft'>('mission');
  const [selectedMap, setSelectedMap] = useState<MapId>('novaya_zemlya');
  const [readingDoc, setReadingDoc] = useState<LoreDocument | null>(null);
  const [dailyProgress, setDailyProgress] = useState(loadDailyProgress);
  const foundDocs = LORE_DOCUMENTS.filter(d => d.found);
  const displayName = playerName === '__anonymous__' ? 'Top Secret Agent' : playerName;
  const stashValue = stash.items.reduce((s, i) => s + i.value, 0);
  const level = getLevelForXp(stash.xp);
  const xpInfo = getXpForNextLevel(stash.xp);
  const dailyMissions = getDailyMissions();
  const repTier = getRepTier(stash.extractionCount);
  const nextRep = getNextRepTier(stash.extractionCount);

  return (
    <div className="absolute inset-0 flex flex-col bg-background z-50">
      <div className="flex-1 overflow-y-auto flex items-start sm:items-center justify-center py-2">
      <div className="max-w-2xl w-full mx-2 sm:mx-4 flex flex-col gap-3 sm:gap-4 p-3 sm:p-6 border border-border bg-card rounded">
        {/* Header */}
        <div className="text-center border-b border-border pb-4">
          <h1 className="text-2xl font-display text-accent text-glow-green tracking-wider">🏠 SAFE HOUSE</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            Agent <span className="text-foreground">{displayName}</span> — <span className="text-warning">{stash.rubles}₽</span>
          </p>
          <div className="flex gap-4 justify-center mt-2 text-[10px] font-mono text-muted-foreground">
            <span>Raids: {stash.raidCount}</span>
            <span>Extracted: {stash.extractionCount}</span>
            <span className="text-accent">Lv.{level}</span>
            <span title={repTier.description}>{repTier.icon} {repTier.name}</span>
          </div>
          {nextRep && (
            <div className="text-[9px] font-mono text-muted-foreground/60 mt-1">
              Next rank: {nextRep.icon} {nextRep.name} — {nextRep.minRep - stash.extractionCount} more extractions ({nextRep.discount}% discount)
            </div>
          )}
          {/* XP Bar */}
          <div className="mt-2 mx-auto max-w-xs">
            <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground">
              <span>XP</span>
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-500"
                  style={{ width: `${Math.min(100, xpInfo.progress * 100)}%` }}
                />
              </div>
              <span>{xpInfo.current}/{xpInfo.needed}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border overflow-x-auto scrollbar-none">
          {([
            { key: 'mission', label: '🎯 Mission' },
            { key: 'stash', label: '📦 Stash' },
            { key: 'craft', label: '🔨 Craft' },
            { key: 'trader', label: '⬆ Upgrades' },
            { key: 'shop', label: '🏪 Shop' },
            { key: 'intel', label: `📄 Intel${foundDocs.length > 0 ? ` (${foundDocs.length})` : ''}` },
          ] as const).map(t => (
            <button
              key={t.key}
              className={`px-3 py-2 text-xs font-display uppercase tracking-wider transition-colors ${tab === t.key ? 'text-accent border-b-2 border-accent' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Mission Tab */}
        {tab === 'mission' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-display text-accent uppercase tracking-wider">Mission Briefing</span>
              {(() => {
                const maxRerolls = 3;
                const atMax = rerollCount >= maxRerolls;
                const cost = rerollCount === 0 ? 0 : Math.pow(2, rerollCount) * 50; // 0, 100, 200, 400
                const canAfford = !atMax && stash.rubles >= cost;
                return (
                  <button
                    className={`px-2 py-1 text-[10px] font-mono border rounded transition-colors ${
                      canAfford
                        ? 'text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
                        : 'text-muted-foreground/40 border-border/30 cursor-not-allowed'
                    }`}
                    onClick={() => canAfford && onRerollObjectives(cost)}
                    disabled={!canAfford}
                  >
                    {atMax ? '🔒 No Rerolls Left' : `🔄 New Mission ${cost === 0 ? '(Free)' : `(${cost}₽)`}`}
                  </button>
                );
              })()}
            </div>
            {objectives.map(obj => (
              <div
                key={obj.id}
                className={`flex items-start gap-3 p-3 rounded border ${
                  obj.type === 'main'
                    ? 'border-warning/40 bg-warning/5'
                    : 'border-border/50 bg-secondary/20'
                }`}
              >
                <span className="text-lg">{obj.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-display text-foreground">{obj.name}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                      obj.type === 'main'
                        ? 'bg-warning/20 text-warning border border-warning/30'
                        : 'bg-secondary/40 text-muted-foreground border border-border/30'
                    }`}>
                      {obj.type === 'main' ? 'MAIN' : 'BONUS'}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{obj.description}</p>
                  <p className="text-[10px] font-mono text-warning mt-0.5">Reward: {obj.reward}₽ + {Math.floor(obj.reward / 2)} XP</p>
                </div>
              </div>
            ))}
            {/* Daily Missions */}
            <div className="border-t border-border/30 pt-3 mt-1">
              <span className="text-xs font-display text-accent uppercase tracking-wider">📅 Daily Challenges</span>
              <p className="text-[9px] font-mono text-muted-foreground mb-2">Resets every 24 hours — complete in any raid</p>
              {dailyMissions.map(dm => {
                const claimed = dailyProgress.completed.includes(dm.id);
                return (
                  <div key={dm.id} className={`flex items-center gap-3 p-2 rounded border mb-1 ${claimed ? 'border-accent/30 bg-accent/5 opacity-60' : 'border-border/30 bg-secondary/10'}`}>
                    <span className="text-lg">{dm.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-display text-foreground">{dm.name}</span>
                      <p className="text-[9px] font-mono text-muted-foreground">{dm.description}</p>
                    </div>
                    <div className="text-right">
                      {claimed ? (
                        <span className="text-[9px] font-mono text-accent">✓ DONE</span>
                      ) : (
                        <span className="text-[9px] font-mono text-warning">{dm.reward.rubles}₽ +{dm.reward.xp}XP</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stash Tab */}
        {tab === 'stash' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-display text-muted-foreground uppercase tracking-wider">
                Stash ({stash.items.length} items — {stashValue}₽ total)
              </span>
              {stash.items.length > 0 && (
                <button
                  className="px-3 py-1 text-[10px] font-mono bg-warning/20 text-warning border border-warning/30 rounded hover:bg-warning/30 transition-colors"
                  onClick={onSellAll}
                >
                  💰 SELL ALL ({stashValue}₽)
                </button>
              )}
            </div>
            {stash.items.length === 0 ? (
              <div className="text-center py-8 text-sm font-mono text-muted-foreground/60">
                Your stash is empty. Extract from a raid to bring back loot!
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-[300px] overflow-y-auto">
                {stash.items.map((item, idx) => (
                  <button
                    key={`${item.id}_${idx}`}
                    className="flex flex-col items-center gap-0.5 p-2 bg-secondary/30 border border-border/50 rounded hover:border-warning/50 hover:bg-warning/10 transition-colors group"
                    onClick={() => onSellItem(idx)}
                    title={`${item.name} — ${item.value}₽ (click to sell)`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-[9px] font-mono text-foreground/80 leading-tight text-center truncate w-full">{item.name}</span>
                    <span className="text-[9px] font-mono text-warning group-hover:text-warning">{item.value}₽</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upgrades Tab (permanent) */}
        {tab === 'trader' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">⬆</span>
              <div>
                <span className="text-xs font-display text-foreground">Permanent Upgrades</span>
                <p className="text-[10px] font-mono text-muted-foreground italic">These persist across all raids</p>
              </div>
            </div>
            <div className="grid gap-2 max-h-[400px] overflow-y-auto">
              {UPGRADES.map(upgrade => {
                const currentLevel = getUpgradeLevel(stash.upgrades, upgrade.id);
                const maxed = currentLevel >= upgrade.maxLevel;
                const cost = getUpgradeCost(upgrade, currentLevel);
                const affordable = canBuyUpgrade(stash.upgrades, upgrade.id, stash.rubles);

                return (
                  <div
                    key={upgrade.id}
                    className={`flex items-center gap-3 p-3 rounded border transition-colors ${
                      maxed
                        ? 'border-accent/30 bg-accent/5 opacity-60'
                        : affordable
                        ? 'border-warning/40 bg-warning/5 hover:bg-warning/10 cursor-pointer'
                        : 'border-border/30 bg-secondary/10 opacity-50'
                    }`}
                    onClick={() => !maxed && affordable && onBuyUpgrade(upgrade.id)}
                  >
                    <span className="text-2xl">{upgrade.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-display text-foreground">{upgrade.name}</span>
                        {maxed && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 bg-accent/20 text-accent border border-accent/30 rounded">MAX</span>
                        )}
                        {!maxed && (
                          <span className="text-[9px] font-mono text-muted-foreground">
                            Lv {currentLevel}/{upgrade.maxLevel}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-muted-foreground">{upgrade.description}</p>
                      <p className="text-[9px] font-mono text-accent">{upgrade.effect}</p>
                    </div>
                    {!maxed && (
                      <div className="text-right">
                        <span className={`text-sm font-mono ${affordable ? 'text-warning' : 'text-muted-foreground'}`}>
                          {cost}₽
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Shop Tab (consumables) — with dynamic prices & reputation discount */}
        {tab === 'shop' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🏪</span>
              <div>
                <span className="text-xs font-display text-foreground">Delyets' Shop</span>
                <p className="text-[10px] font-mono text-muted-foreground italic">
                  {repTier.discount > 0 ? `${repTier.icon} ${repTier.name} — ${repTier.discount}% discount applied` : '"Items go to your stash. Equip before deploying."'}
                </p>
              </div>
            </div>
            <div className="grid gap-1.5 max-h-[400px] overflow-y-auto">
              {TRADER_ITEMS.map(item => {
                const adjustedCost = getAdjustedPrice(item.cost, item.id, stash.extractionCount);
                const affordable = stash.rubles >= adjustedCost;
                const cheaper = adjustedCost < item.cost;
                const expensive = adjustedCost > item.cost;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-2.5 rounded border transition-colors ${
                      affordable
                        ? 'border-warning/40 bg-warning/5 hover:bg-warning/10 cursor-pointer'
                        : 'border-border/30 bg-secondary/10 opacity-50'
                    }`}
                    onClick={() => affordable && onBuyTraderItem(item.id, adjustedCost)}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-display text-foreground">{item.name}</span>
                      <p className="text-[10px] font-mono text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-mono ${affordable ? 'text-warning' : 'text-muted-foreground'}`}>
                        {adjustedCost}₽
                      </span>
                      {cheaper && <span className="text-[8px] font-mono text-accent">▼ SALE</span>}
                      {expensive && <span className="text-[8px] font-mono text-danger/60">▲</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Map Selection */}
        <div className="border border-border rounded p-3 bg-secondary/10">
          <span className="text-xs font-display text-accent uppercase tracking-wider block mb-2">🗺️ Select Map</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {MAPS.map(m => {
              const isTest3 = playerName.trim().toLowerCase() === 'test3';
              const locked = !isTest3 && m.unlockRequirement != null && stash.extractionCount < m.unlockRequirement;
              return (
                <button
                  key={m.id}
                  className={`flex flex-col items-start gap-1 p-3 rounded border transition-colors text-left ${
                    locked
                      ? selectedMap === m.id
                        ? 'border-border/50 bg-secondary/10 opacity-70'
                        : 'border-border/30 bg-secondary/10 opacity-50 hover:opacity-60 hover:border-border/40'
                      : selectedMap === m.id
                      ? 'border-accent bg-accent/10 text-foreground'
                      : 'border-border/50 bg-secondary/20 text-muted-foreground hover:border-foreground/30'
                  }`}
                  onClick={() => { setSelectedMap(m.id); if (!locked) onMapChange(m.id); }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{locked ? '🔒' : m.icon}</span>
                    <span className={`text-xs font-display ${locked ? 'text-muted-foreground/60' : ''}`}>{m.name}</span>
                  </div>
                  <p className={`text-[9px] font-mono leading-tight ${locked ? 'text-muted-foreground/40' : ''}`}>{m.description}</p>
                  {locked ? (
                    <span className="text-[8px] font-mono text-warning/80">🔒 {m.unlockRequirement} extractions needed</span>
                  ) : (
                    <span className="text-[8px] font-mono text-muted-foreground/60">{m.size}</span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Boss Intel for selected map */}
          {(() => {
            const selMap = MAPS.find(m => m.id === selectedMap);
            const isTest3 = playerName.trim().toLowerCase() === 'test3';
            const mapLocked = !isTest3 && selMap?.unlockRequirement != null && stash.extractionCount < selMap.unlockRequirement;
            return (
              <div className={`mt-2 p-3 border border-border/40 rounded bg-background/30 ${mapLocked ? 'opacity-60' : ''}`}>
                {mapLocked && (
                  <div className="mb-2 px-2 py-1 bg-warning/10 border border-warning/30 rounded text-[9px] font-mono text-warning text-center">
                    🔒 Locked — {selMap.unlockRequirement! - stash.extractionCount} more extraction{selMap.unlockRequirement! - stash.extractionCount !== 1 ? 's' : ''} needed
                  </div>
                )}
                {selectedMap === 'novaya_zemlya' && (
                  <div className="flex gap-3 items-start">
                    <span className="text-2xl">★</span>
                    <div>
                      <p className="text-xs font-display text-purple-400">COMMANDANT OSIPOVITJ</p>
                      <p className="text-[9px] font-mono text-muted-foreground leading-relaxed mt-1">
                        Former Spetsnaz commander exposed to B-series compounds. Unnatural strength, glowing eyes, and two elite bodyguards (ZAPAD & VOSTOK) who never leave his side. Patrols the deep bunker armed and muttering.
                      </p>
                      <div className="flex gap-3 mt-1.5 text-[8px] font-mono text-muted-foreground/70">
                        <span>💀 HP: 500</span>
                        <span>🛡️ 2 Bodyguards</span>
                        <span>📍 Underground Bunker</span>
                      </div>
                    </div>
                  </div>
                )}
                {selectedMap === 'fishing_village' && (
                  <div className="flex gap-3 items-start">
                    <span className="text-2xl">⚓</span>
                    <div>
                      <p className="text-xs font-display text-yellow-400">DOCK MASTER</p>
                      <p className="text-[9px] font-mono text-muted-foreground leading-relaxed mt-1">
                        A grizzled smuggler who controls the pier and the only speedboat out. Armed with a shotgun and surrounded by loyal redneck guards and their dogs. Holds the boat keys.
                      </p>
                      <div className="flex gap-3 mt-1.5 text-[8px] font-mono text-muted-foreground/70">
                        <span>💀 HP: 400</span>
                        <span>🤠 Redneck Guards</span>
                        <span>📍 The Dock</span>
                      </div>
                    </div>
                  </div>
                )}
                {selectedMap === 'hospital' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3 items-start">
                      <span className="text-2xl">🧪</span>
                      <div>
                        <p className="text-xs font-display text-green-400">DR. KRAVTSOV</p>
                        <p className="text-[9px] font-mono text-muted-foreground leading-relaxed mt-1">
                          Mad scientist conducting human experiments with compound B-7. Wears a lab coat and wields a syringe filled with mutagen. Can inject terror — forcing you to flee in panic.
                        </p>
                        <div className="flex gap-3 mt-1.5 text-[8px] font-mono text-muted-foreground/70">
                          <span>💀 HP: 400</span>
                          <span>😱 Fear Attack</span>
                          <span>📍 East Wing Lab</span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-border/20" />
                    <div className="flex gap-3 items-start">
                      <span className="text-2xl">🩸</span>
                      <div>
                        <p className="text-xs font-display text-red-400">THE UZBEK</p>
                        <p className="text-[9px] font-mono text-muted-foreground leading-relaxed mt-1">
                          Subject 7 — a former wrestler mutated beyond recognition by B-7 injections. Incredibly fast and strong. Chained in the basement for over a year. No longer human.
                        </p>
                        <div className="flex gap-3 mt-1.5 text-[8px] font-mono text-muted-foreground/70">
                          <span>💀 HP: 600</span>
                          <span>⚡ Extreme Speed</span>
                          <span>📍 Basement Cell B-0</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Intel Tab — Document Archive */}
        {tab === 'intel' && (
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {readingDoc ? (
              <div className="flex flex-col gap-2">
                <button
                  className="text-xs font-mono text-accent hover:text-accent/80 self-start"
                  onClick={() => setReadingDoc(null)}
                >
                  ← Back to archive
                </button>
                <div className="border border-border rounded p-4 bg-background/50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-display text-foreground">{readingDoc.title}</h3>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                      readingDoc.classification === 'TOP SECRET' ? 'bg-red-900/30 text-red-400' :
                      readingDoc.classification === 'SECRET' ? 'bg-yellow-900/30 text-yellow-400' :
                      'bg-gray-800/30 text-gray-400'
                    }`}>
                      {readingDoc.classification}
                    </span>
                  </div>
                  <div className="flex gap-3 text-[9px] font-mono text-muted-foreground mb-3">
                    <span>Author: {readingDoc.author}</span>
                    <span>Date: {readingDoc.date}</span>
                  </div>
                  <pre className="text-[11px] font-mono text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {readingDoc.content}
                  </pre>
                  {readingDoc.hasCode && readingDoc.code && (
                    <div className="mt-3 p-2 border border-accent/30 rounded bg-accent/5">
                      <span className="text-[10px] font-mono text-accent">☢ CODE: {readingDoc.code}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : foundDocs.length === 0 ? (
              <p className="text-xs font-mono text-muted-foreground text-center py-8">
                No documents collected yet. Find them during raids.
              </p>
            ) : (
              foundDocs.map(doc => (
                <button
                  key={doc.id}
                  className="flex items-center gap-3 p-3 border border-border rounded hover:border-accent/50 hover:bg-accent/5 transition-colors text-left"
                  onClick={() => setReadingDoc(doc)}
                >
                  <span className="text-lg">
                    {doc.classification === 'TOP SECRET' ? '🔴' : doc.classification === 'SECRET' ? '🟡' : '⚪'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-display text-foreground truncate">{doc.title}</p>
                    <p className="text-[9px] font-mono text-muted-foreground">{doc.author} — {doc.date}</p>
                  </div>
                  {doc.hasCode && <span className="text-[9px] font-mono text-accent">☢</span>}
                </button>
              ))
            )}
          </div>
        )}


      </div>
      </div>

      {/* Fixed deploy footer - always visible */}
      <div className="shrink-0 border-t border-border bg-card px-3 sm:px-6 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="max-w-2xl mx-auto">
          {(() => {
            const selMap = MAPS.find(m => m.id === selectedMap);
            const isTest3 = playerName.trim().toLowerCase() === 'test3';
            const mapLocked = !isTest3 && selMap?.unlockRequirement != null && stash.extractionCount < selMap.unlockRequirement;
            return (
              <button
                disabled={mapLocked}
                className={`w-full px-6 py-3 font-display uppercase tracking-widest rounded-sm transition-colors text-base ${
                  mapLocked
                    ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                    : 'bg-primary text-primary-foreground hover:bg-primary/80'
                }`}
                onClick={() => { if (!mapLocked) onDeploy(selectedMap); }}
              >
                {mapLocked ? `🔒 LOCKED — ${selMap!.unlockRequirement! - stash.extractionCount} MORE EXTRACTION${selMap!.unlockRequirement! - stash.extractionCount !== 1 ? 'S' : ''} NEEDED` : `🪖 DEPLOY TO ${selMap?.name?.toUpperCase() || 'MISSION'}`}
              </button>
            );
          })()}
          <p className="text-[10px] font-mono text-muted-foreground/50 text-center mt-1">
            {selectedMap === 'fishing_village'
              ? 'Infiltrate the abandoned fishing village — find the speedboat and extract'
              : selectedMap === 'hospital'
              ? 'Descend into the abandoned hospital — survive the horror and extract'
              : 'Infiltrate Objekt 47 — Extract with loot to bring it back to your stash'}
          </p>
        </div>
      </div>
    </div>
  );
};
