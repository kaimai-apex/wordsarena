import { BOARD_SIZE, INITIAL_BOARD_TILES, LETTER_POOL, REFILL_QUEUE_SIZE } from './constants.js';
import { SeededRandom } from './prng.js';
import type { StartingBoardPreset } from './starting-boards.js';
import type { Board, GridPosition, Tile, TileShape } from './types.js';

function emptyOccupancy(): (string | null)[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array<string | null>(BOARD_SIZE).fill(null),
  );
}

function randomLetter(rng: SeededRandom): string {
  return rng.pick(LETTER_POOL);
}

function randomShape(rng: SeededRandom): TileShape {
  const roll = rng.nextInt(100);
  if (roll < 45) {
    return {
      kind: 'pair',
      orientation: rng.nextInt(2) === 0 ? 'horizontal' : 'vertical',
    };
  }
  return { kind: 'single' };
}

function lettersForShape(shape: TileShape, rng: SeededRandom): string[] {
  if (shape.kind === 'single') return [randomLetter(rng)];
  return [randomLetter(rng), randomLetter(rng)];
}

let tileCounter = 0;

export function resetTileCounter(): void {
  tileCounter = 0;
}

export function createTile(rng: SeededRandom): Tile {
  const shape = randomShape(rng);
  const id = `t-${++tileCounter}`;
  return { id, shape, letters: lettersForShape(shape, rng), position: null };
}

function canPlaceAt(
  occupancy: (string | null)[][],
  shape: TileShape,
  row: number,
  col: number,
  ignoreTileId?: string,
): boolean {
  const cells: { row: number; col: number }[] = [];
  if (shape.kind === 'single') {
    cells.push({ row, col });
  } else if (shape.kind === 'pair' && shape.orientation === 'horizontal') {
    cells.push({ row, col }, { row, col: col + 1 });
  } else {
    cells.push({ row, col }, { row: row + 1, col });
  }

  for (const { row: r, col: c } of cells) {
    if (r < 0 || c < 0 || r >= BOARD_SIZE || c >= BOARD_SIZE) return false;
    const occ = occupancy[r]![c];
    if (occ !== null && occ !== ignoreTileId) return false;
  }
  return true;
}

function canPlace(
  occupancy: (string | null)[][],
  shape: TileShape,
  row: number,
  col: number,
): boolean {
  return canPlaceAt(occupancy, shape, row, col);
}

function removeTileFromBoard(board: Board, tileId: string): Tile | null {
  const tile = board.tiles[tileId];
  if (!tile) return null;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board.occupancy[r]![c] === tileId) {
        board.occupancy[r]![c] = null;
      }
    }
  }

  const removed: Tile = { ...tile, position: null, letters: [...tile.letters] };
  delete board.tiles[tileId];
  return removed;
}

function moveTileOnBoard(
  board: Board,
  tileId: string,
  to: { row: number; col: number },
): boolean {
  const tile = board.tiles[tileId];
  if (!tile?.position) return false;
  const origin = { row: tile.position.row, col: tile.position.col };

  const removed = removeTileFromBoard(board, tileId);
  if (!removed) return false;

  if (!canPlaceAt(board.occupancy, removed.shape, to.row, to.col)) {
    placeTileOnBoard(board, removed, origin.row, origin.col);
    return false;
  }

  placeTileOnBoard(board, removed, to.row, to.col);
  return true;
}

function placeTileOnBoard(board: Board, tile: Tile, row: number, col: number): void {
  board.tiles[tile.id] = { ...tile, position: { row, col } };
  if (tile.shape.kind === 'pair' && tile.shape.orientation === 'horizontal') {
    board.occupancy[row]![col] = tile.id;
    board.occupancy[row]![col + 1] = tile.id;
  } else if (tile.shape.kind === 'pair' && tile.shape.orientation === 'vertical') {
    board.occupancy[row]![col] = tile.id;
    board.occupancy[row + 1]![col] = tile.id;
  } else {
    board.occupancy[row]![col] = tile.id;
  }
}

function findEmptySpot(
  occupancy: (string | null)[][],
  shape: TileShape,
  rng: SeededRandom,
): { row: number; col: number } | null {
  const spots: { row: number; col: number }[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (canPlace(occupancy, shape, row, col)) spots.push({ row, col });
    }
  }
  if (spots.length === 0) return null;
  return rng.pick(spots);
}

export function buildBoardFromPreset(preset: StartingBoardPreset): { board: Board; refillQueue: Tile[] } {
  resetTileCounter();
  const board: Board = { size: 9, tiles: {}, occupancy: emptyOccupancy() };

  for (const entry of preset.tiles) {
    const tile: Tile = {
      id: `t-${++tileCounter}`,
      shape: entry.shape,
      letters: [...entry.letters],
      position: null,
    };
    placeTileOnBoard(board, tile, entry.row, entry.col);
  }

  return { board, refillQueue: [] };
}

export function generateBoard(seed: number): { board: Board; refillQueue: Tile[] } {
  resetTileCounter();
  const rng = new SeededRandom(seed);
  const board: Board = { size: 9, tiles: {}, occupancy: emptyOccupancy() };

  for (let i = 0; i < INITIAL_BOARD_TILES; i++) {
    const tile = createTile(rng);
    const spot = findEmptySpot(board.occupancy, tile.shape, rng);
    if (!spot) break;
    placeTileOnBoard(board, tile, spot.row, spot.col);
  }

  const refillQueue: Tile[] = [];
  if (REFILL_QUEUE_SIZE > 0) {
    for (let i = 0; i < REFILL_QUEUE_SIZE; i++) {
      refillQueue.push(createTile(rng));
    }
  }

  return { board, refillQueue };
}

export function removeTilesForCells(board: Board, cells: GridPosition[]): void {
  const tileIds = new Set<string>();
  for (const { row, col } of cells) {
    const id = board.occupancy[row]?.[col];
    if (id) tileIds.add(id);
  }
  for (const id of tileIds) {
    removeTileFromBoard(board, id);
  }
}

export function getTileCells(tile: Tile): { row: number; col: number }[] {
  if (!tile.position) return [];
  const { row, col } = tile.position;
  if (tile.shape.kind === 'pair' && tile.shape.orientation === 'horizontal') {
    return [{ row, col }, { row, col: col + 1 }];
  }
  if (tile.shape.kind === 'pair' && tile.shape.orientation === 'vertical') {
    return [{ row, col }, { row: row + 1, col }];
  }
  return [{ row, col }];
}

export function cloneBoard(board: Board): Board {
  return {
    size: 9,
    tiles: Object.fromEntries(
      Object.entries(board.tiles).map(([id, t]) => [id, { ...t, letters: [...t.letters] }]),
    ),
    occupancy: board.occupancy.map((row) => [...row]),
  };
}

export { canPlace, canPlaceAt, placeTileOnBoard, findEmptySpot, removeTileFromBoard, moveTileOnBoard };
