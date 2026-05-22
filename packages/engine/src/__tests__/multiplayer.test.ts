import { describe, it, expect } from 'vitest';
import {
  createGame,
  applyMove,
  claimWord,
  findCandidateWords,
  loadDictionarySync,
} from '../index.js';

loadDictionarySync();

describe('multiplayer move flow', () => {
  const p1 = '11111111-1111-1111-1111-111111111111';
  const p2 = '22222222-2222-2222-2222-222222222222';

  it('creates vs game with two players', () => {
    const state = createGame({
      mode: 'vs',
      playerIds: [p1, p2],
      seed: 42,
      timeControl: 'blitz',
      now: Date.now(),
    });
    expect(state.playerIds).toEqual([p1, p2]);
    expect(state.mode).toBe('vs');
    expect(state.durationMs).toBe(60_000);
  });

  it('applyMove drag does not require dictionary', () => {
    const state = createGame({
      mode: 'vs',
      playerIds: [p1, p2],
      seed: 99,
      timeControl: 'blitz',
      now: Date.now(),
    });
    const tileId = Object.keys(state.board.tiles)[0]!;
    const tile = state.board.tiles[tileId]!;
    expect(tile.position).toBeTruthy();
    const from = tile.position!;
    const move = {
      playerId: p1,
      type: 'drag' as const,
      tileId,
      to: { row: from.row, col: Math.min(from.col + 1, 7) },
      timestamp: Date.now(),
    };
    const { state: next } = applyMove(state, move, Date.now());
    expect(next.board.tiles[tileId]?.position).toEqual(move.to);
  });

  it('claimWord scores valid words', () => {
    const state = createGame({
      mode: 'vs',
      playerIds: [p1, p2],
      seed: 12345,
      timeControl: 'blitz',
      now: Date.now(),
    });
    const dict = loadDictionarySync();
    const candidates = findCandidateWords(state.board, dict);
    if (candidates.length === 0) return;
    const { word, cells } = candidates[0]!;
    const { state: after, result } = claimWord(state, p1, cells, Date.now(), dict);
    expect(result.ok).toBe(true);
    expect(result.word?.toUpperCase()).toBe(word.toUpperCase());
    expect(after.scoresByPlayer[p1]).toBeGreaterThan(0);
  });
});
