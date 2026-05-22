import { describe, it, expect } from 'vitest';
import {
  SoloGameCreateSchema,
  SoloGameFinalizeSchema,
  QueueJoinSchema,
  MagicLinkRequestSchema,
  UpgradeAnonymousSchema,
  MoveSchema,
  GridPositionSchema,
  PublicUserSchema,
  TimeControlSchema,
} from '../schemas/index.js';

describe('SoloGameCreateSchema', () => {
  it('accepts valid modes', () => {
    for (const mode of ['daily', 'zen', 'blitz_solo'] as const) {
      expect(SoloGameCreateSchema.parse({ mode }).mode).toBe(mode);
    }
  });

  it('rejects vs mode', () => {
    expect(() => SoloGameCreateSchema.parse({ mode: 'vs' })).toThrow();
  });
});

describe('SoloGameFinalizeSchema', () => {
  it('accepts empty moves with zero score', () => {
    const parsed = SoloGameFinalizeSchema.parse({ moves: [], finalScore: 0 });
    expect(parsed.finalScore).toBe(0);
  });

  it('rejects negative score', () => {
    expect(() => SoloGameFinalizeSchema.parse({ moves: [], finalScore: -1 })).toThrow();
  });
});

describe('QueueJoinSchema', () => {
  it('accepts rated blitz', () => {
    const parsed = QueueJoinSchema.parse({ timeControl: 'blitz', isRated: true });
    expect(parsed.timeControl).toBe('blitz');
    expect(parsed.isRated).toBe(true);
  });

  it('rejects invalid time control', () => {
    expect(() => QueueJoinSchema.parse({ timeControl: 'turbo', isRated: false })).toThrow();
  });
});

describe('MoveSchema', () => {
  it('accepts drag move', () => {
    const move = MoveSchema.parse({
      playerId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'drag',
      tileId: 't-1',
      to: { row: 0, col: 1 },
      timestamp: Date.now(),
    });
    expect(move.type).toBe('drag');
  });

  it('accepts claim with word cells', () => {
    const move = MoveSchema.parse({
      playerId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'claim',
      wordCells: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
      timestamp: Date.now(),
    });
    expect(move.wordCells).toHaveLength(2);
  });
});

describe('GridPositionSchema', () => {
  it('rejects out-of-bounds positions', () => {
    expect(() => GridPositionSchema.parse({ row: 9, col: 0 })).toThrow();
    expect(() => GridPositionSchema.parse({ row: 0, col: -1 })).toThrow();
  });
});

describe('auth schemas', () => {
  it('MagicLinkRequestSchema validates email', () => {
    expect(MagicLinkRequestSchema.parse({ email: 'a@b.co' }).email).toBe('a@b.co');
    expect(() => MagicLinkRequestSchema.parse({ email: 'not-email' })).toThrow();
  });

  it('UpgradeAnonymousSchema validates email', () => {
    expect(UpgradeAnonymousSchema.parse({ email: 'user@example.com' }).email).toBe('user@example.com');
  });
});

describe('PublicUserSchema', () => {
  it('requires uuid id', () => {
    expect(() =>
      PublicUserSchema.parse({ id: 'not-uuid', username: 'alice', isAnonymous: false }),
    ).toThrow();
  });
});

describe('TimeControlSchema', () => {
  it('accepts all pool types', () => {
    for (const tc of ['bullet', 'blitz', 'rapid', 'long'] as const) {
      expect(TimeControlSchema.parse(tc)).toBe(tc);
    }
  });
});
