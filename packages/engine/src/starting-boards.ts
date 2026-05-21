import type { TileShape } from './types.js';

export interface StartingBoardTile {
  letters: string[];
  shape: TileShape;
  row: number;
  col: number;
}

export interface StartingBoardPreset {
  id: string;
  seed: number;
  tiles: StartingBoardTile[];
}

/** Curated starting layouts — each New Game cycles through this library. */
export const STARTING_BOARDS: StartingBoardPreset[] = [
  {
    id: 'scatter-42',
    seed: 42,
    tiles: [
      { letters: ['E'], shape: { kind: 'single' }, row: 8, col: 4 },
      { letters: ['I'], shape: { kind: 'single' }, row: 0, col: 3 },
      { letters: ['A', 'Q'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 6, col: 7 },
      { letters: ['V', 'O'], shape: { kind: 'pair', orientation: 'vertical' }, row: 7, col: 0 },
      { letters: ['N', 'R'], shape: { kind: 'pair', orientation: 'vertical' }, row: 2, col: 2 },
      { letters: ['T'], shape: { kind: 'single' }, row: 1, col: 6 },
      { letters: ['B', 'V'], shape: { kind: 'pair', orientation: 'vertical' }, row: 2, col: 8 },
      { letters: ['O'], shape: { kind: 'single' }, row: 1, col: 8 },
      { letters: ['G', 'O'], shape: { kind: 'pair', orientation: 'vertical' }, row: 0, col: 2 },
      { letters: ['A'], shape: { kind: 'single' }, row: 3, col: 6 },
      { letters: ['P'], shape: { kind: 'single' }, row: 3, col: 1 },
    ],
  },
  {
    id: 'stacked-137',
    seed: 137,
    tiles: [
      { letters: ['A', 'N'], shape: { kind: 'pair', orientation: 'vertical' }, row: 6, col: 8 },
      { letters: ['I'], shape: { kind: 'single' }, row: 5, col: 2 },
      { letters: ['Z'], shape: { kind: 'single' }, row: 0, col: 4 },
      { letters: ['Y'], shape: { kind: 'single' }, row: 0, col: 3 },
      { letters: ['K', 'E'], shape: { kind: 'pair', orientation: 'vertical' }, row: 2, col: 4 },
      { letters: ['V'], shape: { kind: 'single' }, row: 5, col: 3 },
      { letters: ['T'], shape: { kind: 'single' }, row: 4, col: 5 },
      { letters: ['F'], shape: { kind: 'single' }, row: 4, col: 6 },
      { letters: ['P'], shape: { kind: 'single' }, row: 1, col: 1 },
      { letters: ['D', 'E'], shape: { kind: 'pair', orientation: 'vertical' }, row: 1, col: 5 },
      { letters: ['S', 'N'], shape: { kind: 'pair', orientation: 'vertical' }, row: 6, col: 6 },
    ],
  },
  {
    id: 'open-256',
    seed: 256,
    tiles: [
      { letters: ['K'], shape: { kind: 'single' }, row: 2, col: 5 },
      { letters: ['U'], shape: { kind: 'single' }, row: 7, col: 2 },
      { letters: ['E'], shape: { kind: 'single' }, row: 4, col: 5 },
      { letters: ['N'], shape: { kind: 'single' }, row: 8, col: 5 },
      { letters: ['T'], shape: { kind: 'single' }, row: 5, col: 6 },
      { letters: ['X'], shape: { kind: 'single' }, row: 0, col: 6 },
      { letters: ['E', 'Z'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 5, col: 1 },
      { letters: ['O', 'C'], shape: { kind: 'pair', orientation: 'vertical' }, row: 4, col: 8 },
      { letters: ['I'], shape: { kind: 'single' }, row: 8, col: 2 },
      { letters: ['A'], shape: { kind: 'single' }, row: 4, col: 1 },
      { letters: ['I'], shape: { kind: 'single' }, row: 3, col: 5 },
    ],
  },
  {
    id: 'dense-501',
    seed: 501,
    tiles: [
      { letters: ['E', 'O'], shape: { kind: 'pair', orientation: 'vertical' }, row: 1, col: 7 },
      { letters: ['A', 'I'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 4, col: 6 },
      { letters: ['E'], shape: { kind: 'single' }, row: 5, col: 0 },
      { letters: ['Y', 'Z'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 6, col: 0 },
      { letters: ['I', 'A'], shape: { kind: 'pair', orientation: 'vertical' }, row: 6, col: 3 },
      { letters: ['C'], shape: { kind: 'single' }, row: 1, col: 0 },
      { letters: ['A', 'T'], shape: { kind: 'pair', orientation: 'vertical' }, row: 0, col: 8 },
      { letters: ['V', 'V'], shape: { kind: 'pair', orientation: 'vertical' }, row: 6, col: 5 },
      { letters: ['T'], shape: { kind: 'single' }, row: 5, col: 1 },
      { letters: ['N'], shape: { kind: 'single' }, row: 8, col: 2 },
      { letters: ['I', 'N'], shape: { kind: 'pair', orientation: 'vertical' }, row: 0, col: 2 },
    ],
  },
  {
    id: 'spread-888',
    seed: 888,
    tiles: [
      { letters: ['O'], shape: { kind: 'single' }, row: 7, col: 7 },
      { letters: ['A', 'R'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 3, col: 3 },
      { letters: ['B'], shape: { kind: 'single' }, row: 6, col: 2 },
      { letters: ['A', 'D'], shape: { kind: 'pair', orientation: 'vertical' }, row: 1, col: 3 },
      { letters: ['A'], shape: { kind: 'single' }, row: 5, col: 8 },
      { letters: ['I', 'A'], shape: { kind: 'pair', orientation: 'vertical' }, row: 5, col: 4 },
      { letters: ['I', 'O'], shape: { kind: 'pair', orientation: 'vertical' }, row: 3, col: 2 },
      { letters: ['R'], shape: { kind: 'single' }, row: 7, col: 6 },
      { letters: ['I'], shape: { kind: 'single' }, row: 6, col: 8 },
      { letters: ['B'], shape: { kind: 'single' }, row: 0, col: 0 },
      { letters: ['I'], shape: { kind: 'single' }, row: 2, col: 8 },
    ],
  },
  {
    id: 'vowel-1337',
    seed: 1337,
    tiles: [
      { letters: ['A', 'U'], shape: { kind: 'pair', orientation: 'vertical' }, row: 6, col: 2 },
      { letters: ['E', 'H'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 0, col: 5 },
      { letters: ['T', 'U'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 6, col: 7 },
      { letters: ['F'], shape: { kind: 'single' }, row: 7, col: 1 },
      { letters: ['I', 'N'], shape: { kind: 'pair', orientation: 'vertical' }, row: 4, col: 8 },
      { letters: ['E', 'N'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 1, col: 2 },
      { letters: ['N'], shape: { kind: 'single' }, row: 2, col: 3 },
      { letters: ['I', 'R'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 2, col: 6 },
      { letters: ['N', 'A'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 4, col: 0 },
      { letters: ['T'], shape: { kind: 'single' }, row: 7, col: 5 },
      { letters: ['L'], shape: { kind: 'single' }, row: 0, col: 0 },
    ],
  },
  {
    id: 'corner-2048',
    seed: 2048,
    tiles: [
      { letters: ['R'], shape: { kind: 'single' }, row: 2, col: 4 },
      { letters: ['F', 'E'], shape: { kind: 'pair', orientation: 'vertical' }, row: 7, col: 1 },
      { letters: ['T', 'S'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 3, col: 7 },
      { letters: ['D', 'A'], shape: { kind: 'pair', orientation: 'vertical' }, row: 4, col: 3 },
      { letters: ['I'], shape: { kind: 'single' }, row: 6, col: 4 },
      { letters: ['I'], shape: { kind: 'single' }, row: 8, col: 6 },
      { letters: ['G'], shape: { kind: 'single' }, row: 4, col: 2 },
      { letters: ['X'], shape: { kind: 'single' }, row: 2, col: 5 },
      { letters: ['I'], shape: { kind: 'single' }, row: 4, col: 5 },
      { letters: ['A'], shape: { kind: 'single' }, row: 4, col: 1 },
      { letters: ['E', 'L'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 3, col: 1 },
    ],
  },
  {
    id: 'cluster-3141',
    seed: 3141,
    tiles: [
      { letters: ['E'], shape: { kind: 'single' }, row: 5, col: 4 },
      { letters: ['E'], shape: { kind: 'single' }, row: 7, col: 3 },
      { letters: ['O'], shape: { kind: 'single' }, row: 3, col: 5 },
      { letters: ['E', 'I'], shape: { kind: 'pair', orientation: 'vertical' }, row: 7, col: 1 },
      { letters: ['X', 'E'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 6, col: 0 },
      { letters: ['A'], shape: { kind: 'single' }, row: 0, col: 1 },
      { letters: ['A'], shape: { kind: 'single' }, row: 2, col: 5 },
      { letters: ['R'], shape: { kind: 'single' }, row: 1, col: 2 },
      { letters: ['L', 'N'], shape: { kind: 'pair', orientation: 'vertical' }, row: 0, col: 6 },
      { letters: ['E'], shape: { kind: 'single' }, row: 7, col: 4 },
      { letters: ['I', 'O'], shape: { kind: 'pair', orientation: 'vertical' }, row: 3, col: 8 },
    ],
  },
  {
    id: 'wide-4096',
    seed: 4096,
    tiles: [
      { letters: ['L'], shape: { kind: 'single' }, row: 8, col: 1 },
      { letters: ['N', 'O'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 5, col: 2 },
      { letters: ['T', 'E'], shape: { kind: 'pair', orientation: 'vertical' }, row: 2, col: 6 },
      { letters: ['A', 'Y'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 1, col: 5 },
      { letters: ['E', 'C'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 2, col: 7 },
      { letters: ['D'], shape: { kind: 'single' }, row: 1, col: 2 },
      { letters: ['M'], shape: { kind: 'single' }, row: 4, col: 6 },
      { letters: ['W', 'A'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 3, col: 1 },
      { letters: ['A', 'N'], shape: { kind: 'pair', orientation: 'vertical' }, row: 7, col: 0 },
      { letters: ['S'], shape: { kind: 'single' }, row: 6, col: 6 },
      { letters: ['A'], shape: { kind: 'single' }, row: 6, col: 7 },
    ],
  },
  {
    id: 'mixed-7777',
    seed: 7777,
    tiles: [
      { letters: ['N'], shape: { kind: 'single' }, row: 8, col: 5 },
      { letters: ['I'], shape: { kind: 'single' }, row: 1, col: 1 },
      { letters: ['Q'], shape: { kind: 'single' }, row: 7, col: 0 },
      { letters: ['F'], shape: { kind: 'single' }, row: 1, col: 4 },
      { letters: ['D'], shape: { kind: 'single' }, row: 3, col: 6 },
      { letters: ['E'], shape: { kind: 'single' }, row: 8, col: 0 },
      { letters: ['L', 'T'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 0, col: 3 },
      { letters: ['E'], shape: { kind: 'single' }, row: 5, col: 6 },
      { letters: ['T'], shape: { kind: 'single' }, row: 1, col: 2 },
      { letters: ['B', 'O'], shape: { kind: 'pair', orientation: 'vertical' }, row: 3, col: 1 },
      { letters: ['M', 'H'], shape: { kind: 'pair', orientation: 'vertical' }, row: 3, col: 3 },
    ],
  },
  {
    id: 'wordy-9999',
    seed: 9999,
    tiles: [
      { letters: ['S', 'A'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 6, col: 1 },
      { letters: ['A'], shape: { kind: 'single' }, row: 0, col: 4 },
      { letters: ['S', 'K'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 4, col: 5 },
      { letters: ['E'], shape: { kind: 'single' }, row: 0, col: 6 },
      { letters: ['I', 'N'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 7, col: 3 },
      { letters: ['P', 'E'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 1, col: 4 },
      { letters: ['T'], shape: { kind: 'single' }, row: 3, col: 2 },
      { letters: ['D', 'Z'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 4, col: 2 },
      { letters: ['E'], shape: { kind: 'single' }, row: 2, col: 3 },
      { letters: ['A'], shape: { kind: 'single' }, row: 1, col: 2 },
      { letters: ['U'], shape: { kind: 'single' }, row: 2, col: 1 },
    ],
  },
  {
    id: 'classic-12345',
    seed: 12345,
    tiles: [
      { letters: ['U', 'E'], shape: { kind: 'pair', orientation: 'vertical' }, row: 1, col: 5 },
      { letters: ['I'], shape: { kind: 'single' }, row: 7, col: 3 },
      { letters: ['O', 'O'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 7, col: 4 },
      { letters: ['I', 'S'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 2, col: 6 },
      { letters: ['N'], shape: { kind: 'single' }, row: 3, col: 0 },
      { letters: ['O', 'L'], shape: { kind: 'pair', orientation: 'horizontal' }, row: 8, col: 4 },
      { letters: ['O'], shape: { kind: 'single' }, row: 5, col: 5 },
      { letters: ['B'], shape: { kind: 'single' }, row: 6, col: 1 },
      { letters: ['F'], shape: { kind: 'single' }, row: 6, col: 2 },
      { letters: ['E'], shape: { kind: 'single' }, row: 5, col: 8 },
      { letters: ['I'], shape: { kind: 'single' }, row: 5, col: 4 },
    ],
  },
];

export function startingBoardCount(): number {
  return STARTING_BOARDS.length;
}

/** Pick the next preset index, cycling through the library. */
export function nextStartingBoardIndex(current: number): number {
  if (current < 0) return 0;
  return (current + 1) % STARTING_BOARDS.length;
}

/** Random preset, optionally avoiding the current one. */
export function randomStartingBoardIndex(exclude?: number): number {
  if (STARTING_BOARDS.length <= 1) return 0;
  let idx: number;
  do {
    idx = Math.floor(Math.random() * STARTING_BOARDS.length);
  } while (idx === exclude);
  return idx;
}
