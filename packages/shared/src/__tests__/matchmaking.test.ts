import { describe, it, expect } from 'vitest';
import {
  bandWidth,
  rdsCompatible,
  matchPoolKey,
  ratingsInBand,
} from '../matchmaking.js';

describe('bandWidth', () => {
  it('widens over time for rated pools', () => {
    expect(bandWidth(5, true)).toBe(50);
    expect(bandWidth(15, true)).toBe(100);
    expect(bandWidth(30, true)).toBe(200);
    expect(bandWidth(50, true)).toBe(400);
    expect(bandWidth(90, true)).toBe(Infinity);
  });

  it('doubles band for casual pools', () => {
    expect(bandWidth(5, false)).toBe(100);
    expect(bandWidth(15, false)).toBe(200);
  });
});

describe('rdsCompatible', () => {
  it('allows any RD after 30s wait', () => {
    expect(rdsCompatible({ rating: 1500, rd: 50 }, { rating: 1500, rd: 300 }, 30)).toBe(true);
  });

  it('requires RD within 200 before 30s', () => {
    expect(rdsCompatible({ rating: 1500, rd: 100 }, { rating: 1500, rd: 250 }, 10)).toBe(true);
    expect(rdsCompatible({ rating: 1500, rd: 100 }, { rating: 1500, rd: 350 }, 10)).toBe(false);
  });
});

describe('matchPoolKey', () => {
  it('separates rated and casual', () => {
    expect(matchPoolKey('blitz', true)).toBe('blitz:rated');
    expect(matchPoolKey('blitz', false)).toBe('blitz:casual');
  });
});

describe('ratingsInBand', () => {
  it('matches within band', () => {
    expect(ratingsInBand(1500, 1530, 5, true)).toBe(true);
    expect(ratingsInBand(1500, 1600, 5, true)).toBe(false);
  });

  it('matches anyone after long wait', () => {
    expect(ratingsInBand(1200, 2000, 120, true)).toBe(true);
  });
});
