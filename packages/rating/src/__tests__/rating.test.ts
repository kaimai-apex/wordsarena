import { describe, it, expect } from 'vitest';
import { newRating, updateRating } from '../index.js';

describe('Glicko-2', () => {
  it('returns default rating for new players', () => {
    expect(newRating()).toEqual({ rating: 1500, rd: 350, volatility: 0.06 });
  });

  it('increases rating on win', () => {
    const player = newRating();
    const opponent = { rating: 1400, rd: 30, volatility: 0.06 };
    const updated = updateRating(player, [{ opponent, score: 1 }]);
    expect(updated.rating).toBeGreaterThan(player.rating);
    expect(updated.rd).toBeLessThan(player.rd);
  });

  it('decreases rating on loss', () => {
    const player = newRating();
    const opponent = { rating: 1600, rd: 30, volatility: 0.06 };
    const updated = updateRating(player, [{ opponent, score: 0 }]);
    expect(updated.rating).toBeLessThan(player.rating);
  });

  it('draw moves toward opponent', () => {
    const player = { rating: 1500, rd: 100, volatility: 0.06 };
    const opponent = { rating: 1700, rd: 100, volatility: 0.06 };
    const updated = updateRating(player, [{ opponent, score: 0.5 }]);
    expect(updated.rating).toBeGreaterThan(player.rating);
    expect(updated.rating).toBeLessThan(opponent.rating);
  });
});
