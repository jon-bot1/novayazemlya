import { describe, it, expect } from 'vitest';
import { createGameState, updateGame } from '../game/engine';
import { InputState } from '../game/types';
import { buildSpatialGrid, collidesWithWallsGrid } from '../game/spatial';

describe('Fishing Village Enemy Debug', () => {
  const state = createGameState('fishing_village');
  const grid = buildSpatialGrid(state.walls);

  it('enemies should NOT be spawned inside walls', () => {
    const insideWall: string[] = [];
    for (const e of state.enemies) {
      if (collidesWithWallsGrid(grid, e.pos.x, e.pos.y, 10)) {
        insideWall.push(`${e.type} at (${e.pos.x.toFixed(0)}, ${e.pos.y.toFixed(0)})`);
      }
    }
    console.log('Enemies inside walls:', insideWall.length, insideWall);
    console.log('Total enemies:', state.enemies.length);
    console.log('Total walls:', state.walls.length);
    expect(insideWall.length).toBe(0);
  });

  it('enemies should be able to move in at least one direction', () => {
    const blocked: string[] = [];
    for (const e of state.enemies) {
      const dirs = [
        { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
        { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
        { dx: 0.7, dy: 0.7 }, { dx: -0.7, dy: -0.7 },
      ];
      const canMove = dirs.some(d => {
        const nx = e.pos.x + d.dx * 2;
        const ny = e.pos.y + d.dy * 2;
        return !collidesWithWallsGrid(grid, nx, ny, 10);
      });
      if (!canMove) {
        blocked.push(`${e.type} at (${e.pos.x.toFixed(0)}, ${e.pos.y.toFixed(0)})`);
      }
    }
    console.log('Completely blocked enemies:', blocked.length, blocked);
    expect(blocked.length).toBe(0);
  });

  it('patrol movement should produce actual position changes', () => {
    const testState = createGameState('fishing_village');
    const input: InputState = {
      moveX: 0, moveY: 0, aimX: 0, aimY: 0,
      shooting: false, shootPressed: false, interact: false,
      heal: false, throwGrenade: false, cycleThrowable: false,
      movementMode: 'walk', moveTarget: null, takeCover: false,
      useTNT: false, useSpecial: false, reload: false,
      throwKnife: false, chokehold: false, throwRock: false, useAbility: false,
    };

    // Record initial positions
    const initialPositions = testState.enemies.map(e => ({ x: e.pos.x, y: e.pos.y, id: e.id, type: e.type, state: e.state }));

    // Run 120 frames (2 seconds)
    for (let i = 0; i < 120; i++) {
      updateGame(testState, input, 1 / 60, 1200, 800);
    }

    let movedCount = 0;
    const details: string[] = [];
    for (let i = 0; i < testState.enemies.length; i++) {
      const e = testState.enemies[i];
      const init = initialPositions[i];
      const dx = e.pos.x - init.x;
      const dy = e.pos.y - init.y;
      const moved = Math.sqrt(dx * dx + dy * dy);
      const stateNow = e.state;
      if (moved > 1) movedCount++;
      details.push(`${init.type}(${init.id}): moved=${moved.toFixed(2)}px, state=${init.state}->${stateNow}, speed=${e.speed}`);
    }
    console.log('Movement details after 120 frames:');
    details.forEach(d => console.log('  ', d));
    console.log(`Moved: ${movedCount}/${testState.enemies.length}`);

    expect(movedCount).toBeGreaterThan(0);
  });
});
