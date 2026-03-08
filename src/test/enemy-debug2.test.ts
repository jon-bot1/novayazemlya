import { describe, it, expect } from 'vitest';
import { createGameState, updateGame } from '../game/engine';
import { InputState } from '../game/types';
import { buildSpatialGrid, collidesWithWallsGrid } from '../game/spatial';

describe('Movement diagnosis', () => {
  it('check wall collision at enemy positions and nearby', () => {
    const state = createGameState('fishing_village');
    const grid = buildSpatialGrid(state.walls);
    
    for (const e of state.enemies) {
      if (e.type === 'dog') continue; // dogs follow owner
      const atPos = collidesWithWallsGrid(grid, e.pos.x, e.pos.y, 10);
      const toTarget = {
        x: e.patrolTarget.x - e.pos.x,
        y: e.patrolTarget.y - e.pos.y,
      };
      const d = Math.sqrt(toTarget.x ** 2 + toTarget.y ** 2) || 1;
      const dx = (toTarget.x / d) * 0.26; // speed * 0.4 for patrol
      const dy = (toTarget.y / d) * 0.26;
      const nx = e.pos.x + dx;
      const ny = e.pos.y + dy;
      const atNew = collidesWithWallsGrid(grid, nx, ny, 10);
      const atNewX = collidesWithWallsGrid(grid, nx, e.pos.y, 10);
      const atNewY = collidesWithWallsGrid(grid, e.pos.x, ny, 10);
      
      // Check if position is near any wall
      let nearestWallDist = Infinity;
      for (const w of state.walls) {
        // Distance from point to rectangle
        const cx = Math.max(w.x, Math.min(w.x + w.w, e.pos.x));
        const cy = Math.max(w.y, Math.min(w.y + w.h, e.pos.y));
        const wd = Math.sqrt((e.pos.x - cx) ** 2 + (e.pos.y - cy) ** 2);
        nearestWallDist = Math.min(nearestWallDist, wd);
      }
      
      console.log(`${e.type}(${e.id}) pos=(${e.pos.x.toFixed(1)},${e.pos.y.toFixed(1)}) target=(${e.patrolTarget.x.toFixed(1)},${e.patrolTarget.y.toFixed(1)}) dist=${d.toFixed(1)} atPos=${atPos} atNew=${atNew} atNewX=${atNewX} atNewY=${atNewY} nearestWall=${nearestWallDist.toFixed(1)}`);
    }
  });
  
  it('single enemy direct movement test', () => {
    const state = createGameState('fishing_village');
    // Find an enemy not inside a wall
    const grid = buildSpatialGrid(state.walls);
    for (const e of state.enemies) {
      if (e.type === 'dog') continue;
      const inWall = collidesWithWallsGrid(grid, e.pos.x, e.pos.y, 10);
      if (inWall) continue;
      
      // Try moving this enemy 5px in each direction
      const results: string[] = [];
      for (const dir of [
        {dx: 5, dy: 0}, {dx: -5, dy: 0}, {dx: 0, dy: 5}, {dx: 0, dy: -5},
        {dx: 3, dy: 3}, {dx: -3, dy: -3}
      ]) {
        const nx = e.pos.x + dir.dx;
        const ny = e.pos.y + dir.dy;
        const blocked = collidesWithWallsGrid(grid, nx, ny, 10);
        results.push(`(${dir.dx},${dir.dy}):${blocked?'BLOCKED':'OK'}`);
      }
      console.log(`${e.type} at (${e.pos.x.toFixed(0)},${e.pos.y.toFixed(0)}): ${results.join(' ')}`);
    }
    expect(true).toBe(true);
  });
  
  it('check if minefield is blocking', () => {
    const state = createGameState('fishing_village');
    console.log('Minefield zone:', JSON.stringify(state.mineFieldZone));
    // Test isInMinefield for a few positions
    const mz = state.mineFieldZone;
    for (const e of state.enemies) {
      const inMF = e.pos.x > mz.x - 20 && e.pos.x < mz.x + mz.w + 20 && 
                   e.pos.y > mz.y - 20 && e.pos.y < mz.y + mz.h + 20;
      if (inMF) console.log(`${e.type} at (${e.pos.x}, ${e.pos.y}) IN MINEFIELD!`);
    }
    console.log('No enemies in minefield (expected)');
  });
});
