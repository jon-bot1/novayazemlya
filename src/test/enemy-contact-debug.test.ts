import { describe, it } from 'vitest';
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

describe('enemy contact debug', () => {
  it('logs heavy state over 10 frames', () => {
    const state = createGameState('fishing_village');
    const heavy = state.enemies.find(e => e.type === 'heavy');
    if (!heavy) throw new Error('no heavy');

    state.player.pos = { x: heavy.pos.x, y: heavy.pos.y };
    state.player.inCover = false;
    state.player.peeking = false;
    (state as any)._playerHiding = false;
    state.disguised = false;

    console.log('start', {
      heavyPos: heavy.pos,
      playerPos: state.player.pos,
      dist: Math.hypot(heavy.pos.x - state.player.pos.x, heavy.pos.y - state.player.pos.y),
      hiding: (state as any)._playerHiding,
      state: heavy.state,
      awareness: heavy.awareness,
    });

    for (let i = 0; i < 10; i++) {
      updateGame(state, idleInput, 1 / 60, 1200, 800);
      console.log('frame', i + 1, {
        heavyState: heavy.state,
        heavyAwareness: heavy.awareness,
        heavyPos: { ...heavy.pos },
        playerPos: { ...state.player.pos },
        dist: Math.hypot(heavy.pos.x - state.player.pos.x, heavy.pos.y - state.player.pos.y),
        hiding: (state as any)._playerHiding,
        reactionDelay: (heavy as any)._reactionDelay,
      });
    }
  });
});
