export type GameMode = 'daily' | 'zen' | 'blitz_solo' | 'vs';
export type TimeControl = 'bullet' | 'blitz' | 'rapid' | 'long';

export type TileShape =
  | { kind: 'single' }
  | { kind: 'pair'; orientation: 'horizontal' | 'vertical' }
  | { kind: 'wild' };

export interface Tile {
  id: string;
  shape: TileShape;
  letters: string[];
  position: GridPosition | null;
}

export interface GridPosition {
  row: number;
  col: number;
}

export interface Board {
  size: 9;
  tiles: Record<string, Tile>;
  occupancy: (string | null)[][];
}

export interface ClaimedWord {
  word: string;
  cells: GridPosition[];
  points: number;
  claimedAt: number;
}

export interface ComboState {
  lastClaimAt: number;
  multiplier: number;
  count: number;
}

export interface GameState {
  mode: GameMode;
  seed: number | null;
  board: Board;
  refillQueue: Tile[];
  scoresByPlayer: Record<string, number>;
  totalLettersScoredByPlayer: Record<string, number>;
  comboState: Record<string, ComboState>;
  wordsClaimedByPlayer: Record<string, ClaimedWord[]>;
  /** Cell signatures already scored (same tiles at same positions). */
  claimedCells: Set<string>;
  /** Word strings already scored (same word cannot score twice). */
  claimedWords: Set<string>;
  startedAt: number;
  durationMs: number;
  elapsedMs: number;
  isOver: boolean;
  endedAt: number | null;
  playerIds: string[];
}

export interface Move {
  playerId: string;
  type: 'place' | 'rotate' | 'claim' | 'wildPick' | 'drag';
  tileId?: string;
  to?: GridPosition;
  wordCells?: GridPosition[];
  wildSubstitution?: string;
  timestamp: number;
}

export interface ClaimResult {
  ok: boolean;
  word?: string;
  points?: number;
  multiplierApplied?: number;
  reason?: 'invalid_word' | 'no_word_here' | 'already_claimed' | 'not_your_turn' | 'game_over';
}

export type GameEvent =
  | { type: 'word_claimed'; playerId: string; word: string; points: number; multiplier: number }
  | { type: 'combo_started'; playerId: string; multiplier: number }
  | { type: 'tile_placed'; playerId: string; tileId: string }
  | { type: 'tile_moved'; playerId: string; tileId: string }
  | { type: 'game_over'; reason: 'timeout' | 'resign' };

export const TIME_CONTROL_MS: Record<TimeControl, number> = {
  bullet: 30_000,
  blitz: 60_000,
  rapid: 120_000,
  long: 180_000,
};

export const SOLO_DURATION_MS: Record<'daily' | 'zen' | 'blitz_solo', number> = {
  daily: 120_000,
  zen: Infinity,
  blitz_solo: 60_000,
};
