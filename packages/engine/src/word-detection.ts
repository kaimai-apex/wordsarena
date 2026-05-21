import { BOARD_SIZE } from './constants.js';
import { isValidWord } from './dictionary.js';
import type { WordDictionary } from './word-dictionary.js';
import type { Board, GridPosition, Tile } from './types.js';

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

function getLetterAt(board: Board, row: number, col: number): string | null {
  const tileId = board.occupancy[row]?.[col];
  if (!tileId) return null;
  const tile = board.tiles[tileId];
  if (!tile?.position) return null;

  const cells = getTileCellLetters(tile);
  for (const cell of cells) {
    if (cell.row === row && cell.col === col) return cell.letter;
  }
  return null;
}

function getTileCellLetters(tile: Tile): { row: number; col: number; letter: string }[] {
  if (!tile.position) return [];
  const { row, col } = tile.position;
  if (tile.shape.kind === 'pair' && tile.shape.orientation === 'horizontal') {
    return [
      { row, col, letter: tile.letters[0]! },
      { row, col: col + 1, letter: tile.letters[1]! },
    ];
  }
  if (tile.shape.kind === 'pair' && tile.shape.orientation === 'vertical') {
    return [
      { row, col, letter: tile.letters[0]! },
      { row: row + 1, col, letter: tile.letters[1]! },
    ];
  }
  return [{ row, col, letter: tile.letters[0]! }];
}

function expandLine(
  board: Board,
  row: number,
  col: number,
  dRow: number,
  dCol: number,
): { cells: GridPosition[]; letters: string[] } {
  const cells: GridPosition[] = [];
  const letters: string[] = [];

  let r = row;
  let c = col;
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
    const letter = getLetterAt(board, r, c);
    if (!letter) break;
    cells.unshift({ row: r, col: c });
    letters.unshift(letter);
    r -= dRow;
    c -= dCol;
  }

  r = row + dRow;
  c = col + dCol;
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
    const letter = getLetterAt(board, r, c);
    if (!letter) break;
    cells.push({ row: r, col: c });
    letters.push(letter);
    r += dRow;
    c += dCol;
  }

  return { cells, letters };
}

/** Valid word only when the entire contiguous letter run matches the dictionary. */
function findWordInLine(
  cells: GridPosition[],
  letters: string[],
  dictionary: WordDictionary | Set<string>,
): { word: string; cells: GridPosition[] } | null {
  if (cells.length < 3) return null;

  const word = letters.join('');
  if (!isValidWord(word, dictionary)) return null;

  return { word, cells };
}

function flushRun(
  runCells: GridPosition[],
  runLetters: string[],
  dictionary: WordDictionary | Set<string>,
  results: { word: string; cells: GridPosition[] }[],
  seen: Set<string>,
): void {
  if (runCells.length < 3) return;
  const found = findWordInLine(runCells, runLetters, dictionary);
  if (!found) return;
  const key = found.cells.map((c) => cellKey(c.row, c.col)).sort().join('|');
  if (seen.has(key)) return;
  seen.add(key);
  results.push(found);
}

function scanLines(
  board: Board,
  dictionary: WordDictionary | Set<string>,
  horizontal: boolean,
): { word: string; cells: GridPosition[] }[] {
  const results: { word: string; cells: GridPosition[] }[] = [];
  const seen = new Set<string>();

  if (horizontal) {
    for (let row = 0; row < BOARD_SIZE; row++) {
      let runCells: GridPosition[] = [];
      let runLetters: string[] = [];
      for (let col = 0; col <= BOARD_SIZE; col++) {
        const letter = col < BOARD_SIZE ? getLetterAt(board, row, col) : null;
        if (letter) {
          runCells.push({ row, col });
          runLetters.push(letter);
        } else {
          flushRun(runCells, runLetters, dictionary, results, seen);
          runCells = [];
          runLetters = [];
        }
      }
    }
    return results;
  }

  for (let col = 0; col < BOARD_SIZE; col++) {
    let runCells: GridPosition[] = [];
    let runLetters: string[] = [];
    for (let row = 0; row <= BOARD_SIZE; row++) {
      const letter = row < BOARD_SIZE ? getLetterAt(board, row, col) : null;
      if (letter) {
        runCells.push({ row, col });
        runLetters.push(letter);
      } else {
        flushRun(runCells, runLetters, dictionary, results, seen);
        runCells = [];
        runLetters = [];
      }
    }
  }
  return results;
}

export function findWordAt(
  board: Board,
  pos: GridPosition,
  dictionary: WordDictionary | Set<string>,
): { word: string; cells: GridPosition[] } | null {
  const letter = getLetterAt(board, pos.row, pos.col);
  if (!letter) return null;

  const horizontal = expandLine(board, pos.row, pos.col, 0, 1);
  const vertical = expandLine(board, pos.row, pos.col, 1, 0);

  const candidates: { word: string; cells: GridPosition[] }[] = [];

  for (const line of [horizontal, vertical]) {
    const found = findWordInLine(line.cells, line.letters, dictionary);
    if (found) candidates.push(found);
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.word.length !== a.word.length) return b.word.length - a.word.length;
    return a.word.localeCompare(b.word);
  });

  return candidates[0]!;
}

export function findCandidateWords(
  board: Board,
  dictionary: WordDictionary | Set<string>,
): { word: string; cells: GridPosition[] }[] {
  const seen = new Set<string>();
  const results: { word: string; cells: GridPosition[] }[] = [];

  for (const found of [
    ...scanLines(board, dictionary, true),
    ...scanLines(board, dictionary, false),
  ]) {
    const key = found.cells.map((c) => cellKey(c.row, c.col)).sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(found);
  }

  return results.sort((a, b) => b.word.length - a.word.length);
}

/** Scan only lines that pass through the given cells (post-drag hot path). */
export function findCandidateWordsNear(
  board: Board,
  dictionary: WordDictionary | Set<string>,
  anchorCells: GridPosition[],
): { word: string; cells: GridPosition[] }[] {
  const seen = new Set<string>();
  const results: { word: string; cells: GridPosition[] }[] = [];

  for (const { row, col } of anchorCells) {
    if (!getLetterAt(board, row, col)) continue;

    for (const line of [
      expandLine(board, row, col, 0, 1),
      expandLine(board, row, col, 1, 0),
    ]) {
      const found = findWordInLine(line.cells, line.letters, dictionary);
      if (!found) continue;
      const key = found.cells.map((c) => cellKey(c.row, c.col)).sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(found);
    }
  }

  return results.sort((a, b) => b.word.length - a.word.length);
}

export { getLetterAt, getTileCellLetters };
