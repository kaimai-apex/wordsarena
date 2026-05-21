import { COMBO_MULTIPLIERS, COMBO_WINDOW_MS, scoreForLength } from './constants.js';
import type { ComboState } from './types.js';

export function computeScore(wordLength: number, comboMultiplier: number): number {
  const base = scoreForLength(wordLength);
  return Math.round(base * comboMultiplier);
}

/** count=1 → ×1, count=2 → ×1.5, count=3 → ×2, count=4+ → ×3 */
export function multiplierForComboCount(count: number): number {
  if (count <= 1) return COMBO_MULTIPLIERS[0]!;
  const idx = Math.min(count - 1, COMBO_MULTIPLIERS.length - 1);
  return COMBO_MULTIPLIERS[idx]!;
}

export function updateComboState(
  combo: ComboState | undefined,
  now: number,
): ComboState {
  if (!combo || now - combo.lastClaimAt > COMBO_WINDOW_MS) {
    return { lastClaimAt: now, multiplier: 1, count: 1 };
  }
  const newCount = combo.count + 1;
  return {
    lastClaimAt: now,
    multiplier: multiplierForComboCount(newCount),
    count: newCount,
  };
}

export function endGameBonus(totalLettersScored: number): number {
  return totalLettersScored;
}

export { scoreForLength, COMBO_WINDOW_MS };
