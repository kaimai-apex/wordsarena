/** Weighted letter pool — English frequency distribution */
export const LETTER_WEIGHTS: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1,
  L: 4, M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2,
  X: 1, Y: 2, Z: 1,
};

export const LETTER_POOL: string[] = Object.entries(LETTER_WEIGHTS).flatMap(
  ([letter, count]) => Array(count).fill(letter),
);

export const COMBO_WINDOW_MS = 5000;
export const COMBO_MULTIPLIERS = [1, 1.5, 2.0, 3.0] as const;

/** Score = length² — 3→9, 4→16, 5→25, etc. */
export function scoreForLength(length: number): number {
  if (length < 3) return 0;
  return length * length;
}

export const BOARD_SIZE = 9;
export const INITIAL_BOARD_TILES = 11;
export const REFILL_QUEUE_SIZE = 0;
