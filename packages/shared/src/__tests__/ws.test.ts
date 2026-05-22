import { describe, it, expect } from 'vitest';
import { WSMessageSchema, WSServerMessageSchema } from '../ws.js';

describe('WSMessageSchema', () => {
  it('parses queue:join', () => {
    const msg = WSMessageSchema.parse({
      type: 'queue:join',
      payload: { timeControl: 'blitz', isRated: true },
    });
    expect(msg.type).toBe('queue:join');
  });

  it('parses game:join', () => {
    const msg = WSMessageSchema.parse({
      type: 'game:join',
      payload: { gameId: '550e8400-e29b-41d4-a716-446655440000' },
    });
    expect(msg.type).toBe('game:join');
  });

  it('parses game:move', () => {
    const msg = WSMessageSchema.parse({
      type: 'game:move',
      payload: {
        gameId: '550e8400-e29b-41d4-a716-446655440000',
        move: {
          playerId: '550e8400-e29b-41d4-a716-446655440001',
          type: 'drag',
          tileId: 't-1',
          to: { row: 0, col: 0 },
          timestamp: Date.now(),
        },
      },
    });
    expect(msg.type).toBe('game:move');
  });

  it('rejects unknown type', () => {
    expect(() =>
      WSMessageSchema.parse({ type: 'bogus', payload: {} }),
    ).toThrow();
  });
});

describe('WSServerMessageSchema', () => {
  it('parses game:joined', () => {
    const msg = WSServerMessageSchema.parse({
      type: 'game:joined',
      payload: {
        gameId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'waitingForReady',
        timeControl: 'blitz',
        isRated: true,
        player1Id: '550e8400-e29b-41d4-a716-446655440001',
        player2Id: '550e8400-e29b-41d4-a716-446655440002',
        player1Username: 'alice',
        player2Username: 'bob',
        readyCount: 0,
        state: null,
      },
    });
    expect(msg.type).toBe('game:joined');
    if (msg.type === 'game:joined') {
      expect(msg.payload.player1Username).toBe('alice');
    }
  });

  it('parses game:over with rating changes', () => {
    const msg = WSServerMessageSchema.parse({
      type: 'game:over',
      payload: {
        gameId: '550e8400-e29b-41d4-a716-446655440000',
        finalScores: { p1: 100, p2: 80 },
        winnerId: '550e8400-e29b-41d4-a716-446655440001',
        ratingChanges: { '550e8400-e29b-41d4-a716-446655440001': 12.5 },
      },
    });
    if (msg.type === 'game:over') {
      expect(msg.payload.winnerId).toBeTruthy();
    }
  });

  it('parses game:countdown', () => {
    const msg = WSServerMessageSchema.parse({
      type: 'game:countdown',
      payload: { gameId: '550e8400-e29b-41d4-a716-446655440000', secondsLeft: 3 },
    });
    if (msg.type === 'game:countdown') {
      expect(msg.payload.secondsLeft).toBe(3);
    }
  });
});
