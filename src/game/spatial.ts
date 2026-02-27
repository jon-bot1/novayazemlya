import { Wall, Vec2 } from './types';

// Spatial hash grid for fast wall collision lookups
// Instead of checking ALL walls every query, only check walls in nearby cells

const CELL_SIZE = 128; // each cell covers 128x128 pixels

export interface SpatialGrid {
  cells: Map<string, Wall[]>;
  cellSize: number;
}

function cellKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

export function buildSpatialGrid(walls: Wall[]): SpatialGrid {
  const grid: SpatialGrid = { cells: new Map(), cellSize: CELL_SIZE };
  for (const wall of walls) {
    const minCx = Math.floor(wall.x / CELL_SIZE);
    const minCy = Math.floor(wall.y / CELL_SIZE);
    const maxCx = Math.floor((wall.x + wall.w) / CELL_SIZE);
    const maxCy = Math.floor((wall.y + wall.h) / CELL_SIZE);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = cellKey(cx, cy);
        let arr = grid.cells.get(key);
        if (!arr) { arr = []; grid.cells.set(key, arr); }
        arr.push(wall);
      }
    }
  }
  return grid;
}

// Fast point-in-wall check using spatial grid
export function collidesWithWallsGrid(grid: SpatialGrid, x: number, y: number, r: number): boolean {
  const minCx = Math.floor((x - r) / grid.cellSize);
  const maxCx = Math.floor((x + r) / grid.cellSize);
  const minCy = Math.floor((y - r) / grid.cellSize);
  const maxCy = Math.floor((y + r) / grid.cellSize);
  
  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cy = minCy; cy <= maxCy; cy++) {
      const walls = grid.cells.get(cellKey(cx, cy));
      if (!walls) continue;
      for (const w of walls) {
        if (x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) return true;
      }
    }
  }
  return false;
}

// Fast line-of-sight check using spatial grid - larger step size for speed
export function hasLOSGrid(grid: SpatialGrid, a: Vec2, b: Vec2, elevated: boolean = false): boolean {
  if (elevated) return true;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(d / 12); // step size ~12px (was 6px)
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (collidesWithWallsGrid(grid, a.x + dx * t, a.y + dy * t, 2)) return false;
  }
  return true;
}

// Pre-computed terrain grid for fast lookup
export interface TerrainGrid {
  data: Uint8Array;
  width: number;
  height: number;
  cellSize: number;
}

import { TerrainZone, TerrainType } from './types';

const TERRAIN_CELL = 48; // match tile size
const TERRAIN_MAP: Record<TerrainType, number> = { grass: 0, dirt: 1, asphalt: 2, concrete: 3, forest: 4 };
const TERRAIN_REVERSE: TerrainType[] = ['grass', 'dirt', 'asphalt', 'concrete', 'forest'];

export function buildTerrainGrid(zones: TerrainZone[], mapW: number, mapH: number): TerrainGrid {
  const cols = Math.ceil(mapW / TERRAIN_CELL);
  const rows = Math.ceil(mapH / TERRAIN_CELL);
  const data = new Uint8Array(cols * rows);
  // Fill with default grass
  data.fill(0);
  // Apply zones (later zones override)
  for (const z of zones) {
    const minC = Math.floor(z.x / TERRAIN_CELL);
    const minR = Math.floor(z.y / TERRAIN_CELL);
    const maxC = Math.ceil((z.x + z.w) / TERRAIN_CELL);
    const maxR = Math.ceil((z.y + z.h) / TERRAIN_CELL);
    const val = TERRAIN_MAP[z.type] || 0;
    for (let r = minR; r < maxR && r < rows; r++) {
      for (let c = minC; c < maxC && c < cols; c++) {
        if (c >= 0 && r >= 0) data[r * cols + c] = val;
      }
    }
  }
  return { data, width: cols, height: rows, cellSize: TERRAIN_CELL };
}

export function getTerrainFast(grid: TerrainGrid, x: number, y: number): TerrainType {
  const c = Math.floor(x / grid.cellSize);
  const r = Math.floor(y / grid.cellSize);
  if (c < 0 || r < 0 || c >= grid.width || r >= grid.height) return 'grass';
  return TERRAIN_REVERSE[grid.data[r * grid.width + c]] || 'grass';
}
