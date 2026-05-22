import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signWsToken, verifyWsToken } from '../ws-token.js';
import { parseServerGameState, formatClock } from '../game-state.js';

const ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env = {
    ...ORIGINAL,
    SESSION_SECRET: 'test-secret-minimum-32-characters-long!!',
  };
});

afterEach(() => {
  process.env = ORIGINAL;
});

describe('WS JWT', () => {
  it('signs and verifies a token', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    const token = await signWsToken(userId, 'testuser');
    expect(token).toBeTruthy();
    const payload = await verifyWsToken(token!);
    expect(payload?.sub).toBe(userId);
    expect(payload?.username).toBe('testuser');
  });

  it('rejects invalid token', async () => {
    expect(await verifyWsToken('not.a.token')).toBeNull();
  });

  it('returns null without secret', async () => {
    delete process.env.SESSION_SECRET;
    delete process.env.WS_JWT_SECRET;
    expect(await signWsToken('id', 'user')).toBeNull();
  });
});

describe('game-state helpers', () => {
  it('parseServerGameState converts arrays to Sets', () => {
    const parsed = parseServerGameState({
      mode: 'vs',
      claimedCells: ['0,0', '0,1'],
      claimedWords: ['HI'],
    });
    expect(parsed.claimedCells.has('0,0')).toBe(true);
    expect(parsed.claimedWords.has('HI')).toBe(true);
  });

  it('formatClock formats mm:ss', () => {
    expect(formatClock(125_000)).toBe('2:05');
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(-1000)).toBe('0:00');
  });
});
