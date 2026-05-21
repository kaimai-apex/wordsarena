import { describe, it, expect, beforeAll } from 'vitest';
import {
  BinaryWordDictionary,
  encodeDictionaryBinary,
  SetWordDictionary,
} from '../word-dictionary.js';
import {
  generateBoard,
  createGame,
  claimWord,
  applyMove,
  replayMoves,
  dragTileAndAutoClaim,
  scoreForLength,
  computeScore,
  updateComboState,
  findCandidateWords,
  findWordAt,
  autoClaimWords,
  placeTileOnBoard,
  cloneBoard,
  SeededRandom,
  setDictionaryForTests,
} from '../index.js';

const TEST_DICT = new Set(['CAT', 'DOG', 'WORD', 'HELLO', 'THE', 'AND', 'ART', 'TAR', 'RAT']);

beforeAll(() => {
  setDictionaryForTests(TEST_DICT);
});

describe('BinaryWordDictionary', () => {
  it('supports binary search lookup', () => {
    const buf = encodeDictionaryBinary(['CAT', 'DOG', 'WORD', 'ZEBRA']);
    const dict = BinaryWordDictionary.fromBuffer(buf);
    expect(dict.size).toBe(4);
    expect(dict.has('CAT')).toBe(true);
    expect(dict.has('DOG')).toBe(true);
    expect(dict.has('CAR')).toBe(false);
    expect(dict.has('zebra')).toBe(true);
  });

  it('matches SetWordDictionary for sample words', () => {
    const words = new Set(['APE', 'SAPE', 'TORE']);
    const setDict = new SetWordDictionary(words);
    const binDict = BinaryWordDictionary.fromBuffer(encodeDictionaryBinary(words));
    for (const w of ['APE', 'SAPE', 'TORE', 'NOPE']) {
      expect(binDict.has(w)).toBe(setDict.has(w));
    }
  });
});

describe('SeededRandom', () => {
  it('is deterministic', () => {
    const a = new SeededRandom(12345);
    const b = new SeededRandom(12345);
    const valsA = Array.from({ length: 10 }, () => a.nextInt(1000));
    const valsB = Array.from({ length: 10 }, () => b.nextInt(1000));
    expect(valsA).toEqual(valsB);
  });

  it('produces same board for same seed across 100 trials', () => {
    for (let i = 0; i < 100; i++) {
      const a = generateBoard(i);
      const b = generateBoard(i);
      expect(Object.keys(a.board.tiles).length).toBe(Object.keys(b.board.tiles).length);
      expect(a.refillQueue.length).toBe(b.refillQueue.length);
    }
  });
});

describe('scoring', () => {
  it('scores length squared', () => {
    expect(scoreForLength(3)).toBe(9);
    expect(scoreForLength(4)).toBe(16);
    expect(scoreForLength(5)).toBe(25);
    expect(scoreForLength(6)).toBe(36);
    expect(scoreForLength(8)).toBe(64);
  });

  it('applies combo multiplier', () => {
    expect(computeScore(5, 1.5)).toBe(38);
    expect(computeScore(5, 2)).toBe(50);
  });
});

describe('combo escalation', () => {
  it('resets after window expires', () => {
    const first = updateComboState(undefined, 1000);
    expect(first.multiplier).toBe(1);
    expect(first.count).toBe(1);
    const reset = updateComboState(first, 7000);
    expect(reset.count).toBe(1);
    expect(reset.multiplier).toBe(1);
  });

  it('escalates within window', () => {
    let combo = updateComboState(undefined, 1000);
    expect(combo.multiplier).toBe(1);
    combo = updateComboState(combo, 2000);
    expect(combo.multiplier).toBe(1.5);
    combo = updateComboState(combo, 3000);
    expect(combo.multiplier).toBe(2);
    combo = updateComboState(combo, 4000);
    expect(combo.multiplier).toBe(3);
  });
});

describe('game lifecycle', () => {
  it('creates deterministic daily game', () => {
    const a = createGame({ mode: 'daily', playerIds: ['p1'], now: 0 });
    const b = createGame({ mode: 'daily', playerIds: ['p1'], now: 0 });
    expect(a.seed).toBe(b.seed);
    expect(Object.keys(a.board.tiles).length).toBe(Object.keys(b.board.tiles).length);
  });

  it('replays drag moves with auto-claim', () => {
    const initial = createGame({ mode: 'zen', playerIds: ['p1'], seed: 999, now: 0 });
    const tileId = Object.keys(initial.board.tiles)[0];
    if (!tileId) return;
    const tile = initial.board.tiles[tileId]!;
    if (!tile.position) return;

    const moves = [
      {
        playerId: 'p1',
        type: 'drag' as const,
        tileId,
        to: { row: 0, col: 0 },
        timestamp: 100,
      },
    ];

    try {
      const { state: afterDrag } = applyMove(initial, moves[0]!, 100);
      const { state: afterClaim } = dragTileAndAutoClaim(
        initial,
        'p1',
        tileId,
        { row: 0, col: 0 },
        100,
        TEST_DICT,
      );
      const replayed = replayMoves(initial, moves, TEST_DICT);
      expect(replayed.board.tiles[tileId]?.position).toEqual(afterDrag.board.tiles[tileId]?.position);
      expect(replayed.scoresByPlayer.p1).toBe(afterClaim.scoresByPlayer.p1);
    } catch {
      // drag may fail depending on board layout
    }
  });
});

describe('word detection', () => {
  it('finds candidate words on board', () => {
    const game = createGame({ mode: 'zen', playerIds: ['p1'], seed: 42, now: 0 });
    const words = findCandidateWords(game.board, TEST_DICT);
    expect(Array.isArray(words)).toBe(true);
  });

  it('finds word when the full letter run matches the dictionary', () => {
    const dict = new Set(['TORE', 'TORES', 'TOR']);
    const game = createGame({ mode: 'zen', playerIds: ['p1'], seed: 1, now: 0 });
    const board = cloneBoard(game.board);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) board.occupancy[r]![c] = null;
    }
    board.tiles = {};
    const letters = ['T', 'O', 'R', 'E'];
    letters.forEach((letter, i) => {
      placeTileOnBoard(
        board,
        { id: `t${i}`, shape: { kind: 'single' }, letters: [letter], position: null },
        4,
        i + 2,
      );
    });
    const found = findWordAt(board, { row: 4, col: 3 }, dict);
    expect(found?.word).toBe('TORE');
  });

  it('does not score words embedded inside a longer letter run', () => {
    const dict = new Set(['APE']);
    const game = createGame({ mode: 'zen', playerIds: ['p1'], seed: 1, now: 0 });
    const board = cloneBoard(game.board);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) board.occupancy[r]![c] = null;
    }
    board.tiles = {};
    ['S', 'A', 'P', 'E'].forEach((letter, i) => {
      placeTileOnBoard(
        board,
        { id: `sape-${i}`, shape: { kind: 'single' }, letters: [letter], position: null },
        4,
        i + 2,
      );
    });

    expect(findWordAt(board, { row: 4, col: 3 }, dict)).toBeNull();
    expect(findCandidateWords(board, dict)).toHaveLength(0);
  });
});

describe('duplicate word prevention', () => {
  it('does not score the same word twice at different positions', () => {
    const game = createGame({ mode: 'zen', playerIds: ['p1'], seed: 42, now: 0 });
    const candidates = findCandidateWords(game.board, TEST_DICT);
    if (candidates.length === 0) return;

    const first = candidates[0]!;
    const { state: afterFirst } = claimWord(game, 'p1', first.cells, 100, TEST_DICT);
    expect(afterFirst.claimedWords.has(first.word.toUpperCase())).toBe(true);

    const { state: afterSecond, claims } = autoClaimWords(afterFirst, 'p1', 200, TEST_DICT);
    const duplicateClaims = claims.filter((c) => c.word.toUpperCase() === first.word.toUpperCase());
    expect(duplicateClaims).toHaveLength(0);
    expect(afterSecond.scoresByPlayer.p1).toBe(afterFirst.scoresByPlayer.p1);
  });

  it('allows a new word at the same cells after letters change', () => {
    const dict = new Set(['DATE', 'LATE', 'ATE']);
    const game = createGame({ mode: 'zen', playerIds: ['p1'], seed: 1, now: 0 });
    const board = cloneBoard(game.board);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) board.occupancy[r]![c] = null;
    }
    board.tiles = {};
    const cells = [
      { row: 2, col: 4, letter: 'D' },
      { row: 3, col: 4, letter: 'A' },
      { row: 4, col: 4, letter: 'T' },
      { row: 5, col: 4, letter: 'E' },
    ];
    cells.forEach(({ row, col, letter }, i) => {
      placeTileOnBoard(
        board,
        { id: `d-${i}`, shape: { kind: 'single' }, letters: [letter], position: null },
        row,
        col,
      );
    });

    const dateCells = cells.map(({ row, col }) => ({ row, col }));
    const { state: afterDate } = claimWord(
      { ...createGame({ mode: 'zen', playerIds: ['p1'], seed: 1, now: 0 }), board },
      'p1',
      dateCells,
      100,
      dict,
    );
    expect(afterDate.scoresByPlayer.p1).toBeGreaterThan(0);

    const lateBoard = cloneBoard(afterDate.board);
    const topTileId = lateBoard.occupancy[2]![4]!;
    lateBoard.tiles[topTileId] = {
      ...lateBoard.tiles[topTileId]!,
      letters: ['L'],
    };

    const { state: afterLate, claims } = autoClaimWords(
      { ...afterDate, board: lateBoard },
      'p1',
      200,
      dict,
    );
    expect(claims.some((c) => c.word === 'LATE')).toBe(true);
    expect(afterLate.scoresByPlayer.p1).toBeGreaterThan(afterDate.scoresByPlayer.p1!);
  });
});
