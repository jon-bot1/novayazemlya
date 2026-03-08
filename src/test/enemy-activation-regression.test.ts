import { describe, it, expect } from 'vitest';
import { createGameState, updateGame } from '../game/engine';
import { InputState } from '../game/types';

const idleInput: InputState = {
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
};

describe('Enemy activation regression', () => {
  it('scav/heavy/boss should aggro at direct contact range on fishing_village', () => {
    const targets = ['scav', 'heavy', 'boss'] as const;

    for (const type of targets) {
      const state = createGameState('fishing_village');
      const enemy = state.enemies.find(e => e.type === type);
      expect(enemy, `missing ${type} on fishing_village`).toBeTruthy();
      if (!enemy) continue;

      // Put player on top of enemy (forced contact range)
      state.player.pos = { x: enemy.pos.x, y: enemy.pos.y };
      state.player.inCover = false;
      state.player.peeking = false;
      (state as any)._playerHiding = false;
      state.disguised = false;

      // Allow a short window for reaction delay to resolve
      for (let i = 0; i < 40; i++) {
        updateGame(state, idleInput, 1 / 60, 1200, 800);
      }

      expect(enemy.awareness, `${type} awareness too low`).toBeGreaterThanOrEqual(0.75);
      expect(['chase', 'attack', 'flank', 'suppress']).toContain(enemy.state);
    }
  });

  it('direct contact should break hiding and aggro multiple enemy types', () => {
    const targets = ['scav', 'heavy', 'boss', 'soldier', 'redneck'] as const;

    for (const type of targets) {
      const state = createGameState('fishing_village');
      const enemy = state.enemies.find(e => e.type === type);
      expect(enemy, `missing ${type} on fishing_village`).toBeTruthy();
      if (!enemy) continue;

      state.player.pos = { x: enemy.pos.x, y: enemy.pos.y };
      state.player.inCover = true;
      state.player.peeking = false;
      (state as any)._playerHiding = true;
      state.disguised = false;

      for (let i = 0; i < 20; i++) {
        updateGame(state, idleInput, 1 / 60, 1200, 800);
      }

      expect((state as any)._playerHiding, `${type} did not reveal hidden player on contact`).toBe(false);
      expect(enemy.awareness, `${type} awareness too low after hidden contact`).toBeGreaterThanOrEqual(0.75);
      expect(['chase', 'attack', 'flank', 'suppress']).toContain(enemy.state);
    }
  });
});
