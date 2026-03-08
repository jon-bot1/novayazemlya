import React from 'react';
import { Item } from '../../game/types';

interface WeaponModPanelProps {
  open: boolean;
  onClose: () => void;
  weapons: Item[];          // weapons in stash
  mods: Item[];             // weapon_mod items in stash
  onAttachMod: (weaponIdx: number, modIdx: number) => void;
  onDetachMod: (weaponIdx: number, modSlot: number) => void;
}

const MOD_SLOT_LABELS: Record<string, string> = {
  scope: '🔭 Scope',
  suppressor: '🔇 Suppressor',
  ext_magazine: '📎 Ext. Magazine',
};

export const WeaponModPanel: React.FC<WeaponModPanelProps> = ({ open, onClose, weapons, mods, onAttachMod, onDetachMod }) => {
  const [selectedWeapon, setSelectedWeapon] = React.useState(0);
  if (!open) return null;

  const wpn = weapons[selectedWeapon];
  const attached = wpn?.attachedMods || [];

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-auto z-20">
      <div className="w-[90vw] max-w-lg max-h-[80vh] bg-card border border-border rounded overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-display text-lg text-foreground tracking-wider">🔧 WEAPON MODDING</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs font-mono">[✕]</button>
        </div>

        {weapons.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground font-mono text-sm">No weapons in stash to mod.</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {/* Weapon selector */}
            <div className="flex gap-1 flex-wrap">
              {weapons.map((w, i) => (
                <button
                  key={i}
                  className={`px-2 py-1.5 rounded text-xs font-mono border transition-colors ${
                    selectedWeapon === i
                      ? 'bg-accent/20 border-accent/60 text-accent'
                      : 'bg-card border-border/40 text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setSelectedWeapon(i)}
                >
                  🔫 {w.name}
                </button>
              ))}
            </div>

            {wpn && (
              <>
                {/* Weapon stats */}
                <div className="border border-border rounded p-3 bg-background/50">
                  <div className="text-sm font-display text-foreground mb-2">{wpn.name}</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
                    <span className="text-muted-foreground">Damage</span>
                    <span className="text-foreground">{wpn.damage}</span>
                    <span className="text-muted-foreground">Fire Rate</span>
                    <span className="text-foreground">{wpn.weaponFireRate}ms</span>
                    <span className="text-muted-foreground">Bullet Speed</span>
                    <span className="text-foreground">{wpn.bulletSpeed?.toFixed(1)}</span>
                    <span className="text-muted-foreground">Range</span>
                    <span className="text-foreground">{wpn.weaponRange}</span>
                    <span className="text-muted-foreground">Ammo</span>
                    <span className="text-foreground">{wpn.ammoType}</span>
                  </div>
                </div>

                {/* Attached mods */}
                <div>
                  <h3 className="text-xs font-display text-accent uppercase tracking-wider mb-2">INSTALLED MODS ({attached.length}/3)</h3>
                  <div className="flex flex-col gap-1">
                    {(['scope', 'suppressor', 'ext_magazine'] as const).map((slot, si) => {
                      const mod = attached.find(m => m.modType === slot);
                      return (
                        <div key={slot} className={`flex items-center justify-between px-2 py-1.5 rounded border ${
                          mod ? 'border-accent/40 bg-accent/10' : 'border-border/30 bg-background/30'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{mod ? mod.icon : '⬜'}</span>
                            <div>
                              <div className="text-xs font-mono text-foreground">{mod ? mod.name : MOD_SLOT_LABELS[slot]}</div>
                              <div className="text-[9px] font-mono text-muted-foreground">{mod ? mod.description : 'Empty slot'}</div>
                            </div>
                          </div>
                          {mod && (
                            <button
                              className="text-[9px] font-mono text-danger hover:text-danger/80 px-1.5 py-0.5 border border-danger/30 rounded"
                              onClick={() => onDetachMod(selectedWeapon, si)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Available mods */}
                {mods.length > 0 && (
                  <div>
                    <h3 className="text-xs font-display text-warning uppercase tracking-wider mb-2">AVAILABLE MODS</h3>
                    <div className="flex flex-col gap-1">
                      {mods.map((mod, mi) => {
                        const alreadyAttached = attached.some(a => a.modType === mod.modType);
                        return (
                          <div key={mi} className="flex items-center justify-between px-2 py-1.5 rounded border border-border/30 bg-background/30">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{mod.icon}</span>
                              <div>
                                <div className="text-xs font-mono text-foreground">{mod.name}</div>
                                <div className="text-[9px] font-mono text-muted-foreground">{mod.description}</div>
                              </div>
                            </div>
                            <button
                              className={`text-[9px] font-mono px-1.5 py-0.5 border rounded ${
                                alreadyAttached
                                  ? 'text-muted-foreground border-border/20 cursor-not-allowed'
                                  : 'text-accent hover:text-accent/80 border-accent/30'
                              }`}
                              disabled={alreadyAttached}
                              onClick={() => !alreadyAttached && onAttachMod(selectedWeapon, mi)}
                            >
                              {alreadyAttached ? 'Slot used' : 'Attach'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
