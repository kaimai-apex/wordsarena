import {
  canPlace,
  cloneBoard,
  createTile,
  generateBoard,
  buildBoardFromPreset,
  getTileCells,
  moveTileOnBoard,
  placeTileOnBoard,
  resetTileCounter,
} from './board-generator.js';
import { REFILL_QUEUE_SIZE } from './constants.js';
import type {
  ClaimResult,
  GameEvent,
  GameMode,
  GameState,
  GridPosition,
  Move,
  TimeControl,
} from './types.js';
import { SOLO_DURATION_MS, TIME_CONTROL_MS } from './types.js';
import { SeededRandom } from './prng.js';
import { cellKey, findWordAt, findCandidateWords, findCandidateWordsNear } from './word-detection.js';
import { computeScore, endGameBonus, updateComboState } from './scoring.js';
import { STARTING_BOARDS } from './starting-boards.js';
import type { WordDictionary } from './word-dictionary.js';

type Dictionary = WordDictionary | Set<string>;

export class InvalidMoveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMoveError';
  }
}

function emptyPlayerRecord<T>(playerIds: string[], value: T): Record<string, T> {
  return Object.fromEntries(playerIds.map((id) => [id, value]));
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    board: cloneBoard(state.board),
    refillQueue: state.refillQueue.map((t) => ({ ...t, letters: [...t.letters] })),
    scoresByPlayer: { ...state.scoresByPlayer },
    totalLettersScoredByPlayer: { ...state.totalLettersScoredByPlayer },
    comboState: Object.fromEntries(
      Object.entries(state.comboState).map(([k, v]) => [k, { ...v }]),
    ),
    wordsClaimedByPlayer: Object.fromEntries(
      Object.entries(state.wordsClaimedByPlayer).map(([k, v]) => [
        k,
        v.map((w) => ({ ...w, cells: w.cells.map((c) => ({ ...c })) })),
      ]),
    ),
    claimedCells: new Set(state.claimedCells),
    claimedWords: new Set(state.claimedWords),
    playerIds: [...state.playerIds],
  };
}

export function dailySeedForDate(date: Date = new Date()): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  return y * 10000 + m * 100 + d;
}

export interface CreateGameOptions {
  mode: GameMode;
  playerIds: string[];
  seed?: number;
  startingBoardIndex?: number;
  timeControl?: TimeControl;
  now?: number;
}

export function createGame(options: CreateGameOptions): GameState {
  const { mode, playerIds } = options;
  const now = options.now ?? 0;

  let seed: number;
  let board;
  let refillQueue;

  if (options.startingBoardIndex !== undefined) {
    const preset = STARTING_BOARDS[options.startingBoardIndex % STARTING_BOARDS.length]!;
    ({ board, refillQueue } = buildBoardFromPreset(preset));
    seed = preset.seed;
  } else {
    let resolvedSeed = options.seed ?? null;
    if (mode === 'daily') resolvedSeed = dailySeedForDate();
    else if (resolvedSeed === undefined || resolvedSeed === null) resolvedSeed = now || 42;
    seed = resolvedSeed;
    resetTileCounter();
    ({ board, refillQueue } = generateBoard(seed));
  }

  let durationMs: number;
  if (mode === 'vs' && options.timeControl) {
    durationMs = TIME_CONTROL_MS[options.timeControl];
  } else if (mode === 'daily' || mode === 'zen' || mode === 'blitz_solo') {
    durationMs = SOLO_DURATION_MS[mode];
  } else {
    durationMs = TIME_CONTROL_MS.blitz;
  }

  return {
    mode,
    seed,
    board,
    refillQueue,
    scoresByPlayer: emptyPlayerRecord(playerIds, 0),
    totalLettersScoredByPlayer: emptyPlayerRecord(playerIds, 0),
    comboState: emptyPlayerRecord(playerIds, { lastClaimAt: 0, multiplier: 1, count: 0 }),
    wordsClaimedByPlayer: emptyPlayerRecord(playerIds, []),
    claimedCells: new Set(),
    claimedWords: new Set(),
    startedAt: now,
    durationMs,
    elapsedMs: 0,
    isOver: false,
    endedAt: null,
    playerIds,
  };
}

function wordSignature(cells: GridPosition[]): string {
  return cells.map((c) => cellKey(c.row, c.col)).sort().join('|');
}

function cellsOverlap(a: GridPosition[], b: GridPosition[]): boolean {
  const keys = new Set(a.map((c) => cellKey(c.row, c.col)));
  return b.some((c) => keys.has(cellKey(c.row, c.col)));
}

function markWordScored(state: GameState, cells: GridPosition[], word: string): GameState {
  const next = cloneState(state);
  // Track word+cells so rearranging tiles to spell a new word at the same cells can score again.
  next.claimedCells.add(`${word.toUpperCase()}|${wordSignature(cells)}`);
  next.claimedWords.add(word.toUpperCase());
  return next;
}

function maybeRefillQueue(state: GameState, seed: number): GameState {
  if (REFILL_QUEUE_SIZE <= 0) return state;
  const next = cloneState(state);
  const rng = new SeededRandom(seed + next.claimedCells.size);
  while (next.refillQueue.length < REFILL_QUEUE_SIZE) {
    next.refillQueue.push(createTile(rng));
  }
  return next;
}

export function claimWord(
  state: GameState,
  playerId: string,
  wordCells: GridPosition[],
  now: number,
  dictionary: Dictionary,
): { state: GameState; result: ClaimResult; events: GameEvent[] } {
  if (state.isOver) {
    return { state, result: { ok: false, reason: 'game_over' }, events: [] };
  }

  if (!state.playerIds.includes(playerId)) {
    return { state, result: { ok: false, reason: 'not_your_turn' }, events: [] };
  }

  const sig = wordSignature(wordCells);
  const anchor = wordCells[0]!;
  const found = findWordAt(state.board, anchor, dictionary);
  if (!found) {
    return { state, result: { ok: false, reason: 'no_word_here' }, events: [] };
  }

  const exactClaimKey = `${found.word.toUpperCase()}|${sig}`;
  if (state.claimedCells.has(exactClaimKey)) {
    return { state, result: { ok: false, reason: 'already_claimed' }, events: [] };
  }

  const foundKeys = new Set(found.cells.map((c) => cellKey(c.row, c.col)));
  const requestKeys = new Set(wordCells.map((c) => cellKey(c.row, c.col)));
  const matches =
    foundKeys.size === requestKeys.size &&
    [...foundKeys].every((k) => requestKeys.has(k));

  if (!matches) {
    return { state, result: { ok: false, reason: 'no_word_here' }, events: [] };
  }

  if (state.claimedWords.has(found.word.toUpperCase())) {
    return { state, result: { ok: false, reason: 'already_claimed' }, events: [] };
  }

  const combo = updateComboState(state.comboState[playerId], now);
  const points = computeScore(found.word.length, combo.multiplier);

  let next = cloneState(state);
  next.comboState[playerId] = combo;
  next.scoresByPlayer[playerId] = (next.scoresByPlayer[playerId] ?? 0) + points;
  next.totalLettersScoredByPlayer[playerId] =
    (next.totalLettersScoredByPlayer[playerId] ?? 0) + found.word.length;
  next.wordsClaimedByPlayer[playerId] = [
    ...(next.wordsClaimedByPlayer[playerId] ?? []),
    { word: found.word, cells: found.cells, points, claimedAt: now },
  ];

  next = markWordScored(next, found.cells, found.word);
  next = maybeRefillQueue(next, state.seed ?? 1);

  const events: GameEvent[] = [
    {
      type: 'word_claimed',
      playerId,
      word: found.word,
      points,
      multiplier: combo.multiplier,
    },
  ];

  if (combo.count >= 2 && combo.multiplier > 1) {
    events.push({ type: 'combo_started', playerId, multiplier: combo.multiplier });
  }

  return {
    state: next,
    result: { ok: true, word: found.word, points, multiplierApplied: combo.multiplier },
    events,
  };
}

/** After a drag, claim valid words (longest first, no overlapping cells). */
export function autoClaimWords(
  state: GameState,
  playerId: string,
  now: number,
  dictionary: Dictionary,
  nearCells?: GridPosition[],
): { state: GameState; claims: { word: string; points: number; cells: GridPosition[] }[]; events: GameEvent[] } {
  let current = cloneState(state);
  const claims: { word: string; points: number; cells: GridPosition[] }[] = [];
  const events: GameEvent[] = [];
  const usedCells: GridPosition[] = [];

  const rawCandidates = nearCells?.length
    ? findCandidateWordsNear(current.board, dictionary, nearCells)
    : findCandidateWords(current.board, dictionary);

  const candidates = rawCandidates.filter((c) => {
    const sig = wordSignature(c.cells);
    const exactClaimKey = `${c.word.toUpperCase()}|${sig}`;
    if (current.claimedCells.has(exactClaimKey)) return false;
    if (current.claimedWords.has(c.word.toUpperCase())) return false;
    if (cellsOverlap(usedCells, c.cells)) return false;
    return true;
  });

  for (const candidate of candidates) {
    if (cellsOverlap(usedCells, candidate.cells)) continue;

    const result = claimWord(current, playerId, candidate.cells, now, dictionary);
    if (result.result.ok) {
      current = result.state;
      claims.push({
        word: result.result.word!,
        points: result.result.points!,
        cells: candidate.cells,
      });
      events.push(...result.events);
      usedCells.push(...candidate.cells);
    }
  }

  return { state: current, claims, events };
}

export function dragTileAndAutoClaim(
  state: GameState,
  playerId: string,
  tileId: string,
  to: GridPosition,
  now: number,
  dictionary: Dictionary,
): {
  state: GameState;
  claims: { word: string; points: number; cells: GridPosition[] }[];
  events: GameEvent[];
} {
  const move: Move = { playerId, type: 'drag', tileId, to, timestamp: now };
  const { state: afterDrag } = applyMove(state, move, now);
  const tile = afterDrag.board.tiles[tileId];
  return autoClaimWords(afterDrag, playerId, now, dictionary);
}

export function applyMove(
  state: GameState,
  move: Move,
  now: number,
  dictionary?: Dictionary,
): { state: GameState; events: GameEvent[] } {
  if (state.isOver) throw new InvalidMoveError('Game is over');

  switch (move.type) {
    case 'claim': {
      if (!move.wordCells?.length) throw new InvalidMoveError('Missing word cells');
      if (!dictionary) throw new InvalidMoveError('Dictionary required for claims');
      const { state: next, events } = claimWord(
        state,
        move.playerId,
        move.wordCells,
        now,
        dictionary,
      );
      if (!events.length) throw new InvalidMoveError('Invalid claim');
      return { state: next, events };
    }

    case 'drag': {
      if (!move.tileId || !move.to) throw new InvalidMoveError('Missing tile or position');
      const tile = state.board.tiles[move.tileId];
      if (!tile?.position) throw new InvalidMoveError('Tile not on board');

      const next = cloneState(state);
      const moved = moveTileOnBoard(next.board, move.tileId, move.to);
      if (!moved) throw new InvalidMoveError('Invalid drag');

      return {
        state: next,
        events: [{ type: 'tile_moved', playerId: move.playerId, tileId: move.tileId }],
      };
    }

    case 'place': {
      if (REFILL_QUEUE_SIZE <= 0) throw new InvalidMoveError('Refill queue disabled');
      if (!move.tileId || !move.to) throw new InvalidMoveError('Missing tile or position');
      const tileIdx = state.refillQueue.findIndex((t) => t.id === move.tileId);
      if (tileIdx === -1) throw new InvalidMoveError('Tile not in queue');

      const tile = state.refillQueue[tileIdx]!;
      if (!canPlace(state.board.occupancy, tile.shape, move.to.row, move.to.col)) {
        throw new InvalidMoveError('Invalid placement');
      }

      const next = cloneState(state);
      const placed = { ...tile, letters: [...tile.letters] };
      placeTileOnBoard(next.board, placed, move.to.row, move.to.col);
      next.refillQueue = state.refillQueue.filter((t) => t.id !== move.tileId);

      const rng = new SeededRandom((state.seed ?? 1) + next.refillQueue.length + now);
      next.refillQueue.push(createTile(rng));

      return {
        state: next,
        events: [{ type: 'tile_placed', playerId: move.playerId, tileId: move.tileId }],
      };
    }

    case 'rotate': {
      if (REFILL_QUEUE_SIZE <= 0) throw new InvalidMoveError('Refill queue disabled');
      if (!move.tileId) throw new InvalidMoveError('Missing tile id');
      const next = cloneState(state);
      const queueIdx = next.refillQueue.findIndex((t) => t.id === move.tileId);
      if (queueIdx === -1) throw new InvalidMoveError('Tile not in queue');

      const tile = next.refillQueue[queueIdx]!;
      if (tile.shape.kind !== 'pair') throw new InvalidMoveError('Cannot rotate this tile');

      next.refillQueue[queueIdx] = {
        ...tile,
        shape: {
          kind: 'pair',
          orientation: tile.shape.orientation === 'horizontal' ? 'vertical' : 'horizontal',
        },
      };

      return { state: next, events: [] };
    }

    default:
      throw new InvalidMoveError(`Unknown move type: ${(move as Move).type}`);
  }
}

export function tick(state: GameState, now: number): { state: GameState; events: GameEvent[] } {
  if (state.isOver || state.durationMs === Infinity) {
    return { state, events: [] };
  }

  const elapsedMs = now - state.startedAt;
  if (elapsedMs < state.durationMs) {
    if (elapsedMs === state.elapsedMs) return { state, events: [] };
    return { state: { ...state, elapsedMs }, events: [] };
  }

  const next = cloneState(state);
  next.isOver = true;
  next.endedAt = now;
  next.elapsedMs = state.durationMs;

  for (const playerId of next.playerIds) {
    const bonus = endGameBonus(next.totalLettersScoredByPlayer[playerId] ?? 0);
    next.scoresByPlayer[playerId] = (next.scoresByPlayer[playerId] ?? 0) + bonus;
  }

  return { state: next, events: [{ type: 'game_over', reason: 'timeout' }] };
}

export function resign(state: GameState, _playerId: string, now: number): GameState {
  const next = cloneState(state);
  next.isOver = true;
  next.endedAt = now;
  return next;
}

export function replayMoves(
  initial: GameState,
  moves: Move[],
  dictionary: Dictionary,
): GameState {
  let state = cloneState(initial);
  for (const move of moves) {
    if (move.type === 'drag' && move.tileId && move.to) {
      const { state: next } = dragTileAndAutoClaim(
        state,
        move.playerId,
        move.tileId,
        move.to,
        move.timestamp,
        dictionary,
      );
      state = next;
    } else if (move.type === 'claim') {
      const result = claimWord(state, move.playerId, move.wordCells!, move.timestamp, dictionary);
      if (result.result.ok) state = result.state;
    } else {
      const result = applyMove(state, move, move.timestamp, dictionary);
      state = result.state;
    }
    const tickResult = tick(state, move.timestamp);
    state = tickResult.state;
  }
  return state;
}

export { getTileCells };
