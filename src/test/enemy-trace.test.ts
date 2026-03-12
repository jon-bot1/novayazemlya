import { describe, it, expect } from 'vitest';
import { createGameState, updateGame } from '../game/engine';
import { InputState } from '../game/types';

describe('Patrol movement trace', () => {
  it('trace single enemy through updateGame', () => {
    const state = createGameState('fishing_village');
    const input: InputState = {
      moveX: 0, moveY: 0, aimX: 0, aimY: 0,
      shooting: false, shootPressed: false, interact: false,
      heal: false, throwGrenade: false, cycleThrowable: false,
      movementMode: 'walk', moveTarget: null, takeCover: false,
      useTNT: false, useSpecial: false, reload: false,
      throwKnife: false, chokehold: false, throwRock: false, useAbility: false,
    };

    // Pick an enemy that's not inside a wall
    const e = state.enemies.find(en => en.type === 'scav' && en.state === 'patrol')!;
    console.log('Tracking enemy:', e.id, 'type:', e.type, 'pos:', JSON.stringify(e.pos));
    console.log('Patrol target:', JSON.stringify(e.patrolTarget));
    console.log('Speed:', e.speed);
    
    const origX = e.pos.x;
    const origY = e.pos.y;
    
    // Run ONE frame
    updateGame(state, input, 1/60, 1200, 800);
    
    const movedFrame1 = Math.sqrt((e.pos.x - origX) ** 2 + (e.pos.y - origY) ** 2);
    console.log('After frame 1: pos=', JSON.stringify(e.pos), 'state=', e.state, 'moved=', movedFrame1.toFixed(4));
    console.log('Speed after frame 1:', e.speed);
    
    // Check all enemy states after 1 frame
    const stateSummary: Record<string, number> = {};
    for (const en of state.enemies) {
      stateSummary[en.state] = (stateSummary[en.state] || 0) + 1;
    }
    console.log('All enemy states:', JSON.stringify(stateSummary));
    
    // Run 59 more frames
    for (let i = 0; i < 59; i++) {
      updateGame(state, input, 1/60, 1200, 800);
    }
    
    const totalMoved = Math.sqrt((e.pos.x - origX) ** 2 + (e.pos.y - origY) ** 2);
    console.log('After 60 frames: pos=', JSON.stringify(e.pos), 'state=', e.state, 'moved=', totalMoved.toFixed(4));
    
    // Check all enemies
    console.log('\nAll enemies after 60 frames:');
    for (const en of state.enemies) {
      console.log(`  ${en.type}(${en.id}): state=${en.state}, speed=${en.speed}, awareness=${en.awareness.toFixed(3)}`);
    }
    
    expect(totalMoved).toBeGreaterThan(0);
  });
});
