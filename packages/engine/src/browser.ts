export { createGame, tick, dragTileAndAutoClaim, applyMove, autoClaimWords, dailySeedForDate } from './game.js';
export { nextStartingBoardIndex, randomStartingBoardIndex } from './starting-boards.js';
export { canPlaceAt, getTileCells } from './board-generator.js';
export { loadDictionaryClient, mergeDictionaryTexts } from './dictionary.js';
export type { WordDictionary } from './word-dictionary.js';
export type {
  GameState,
  Board,
  Tile,
  TileShape,
  GridPosition,
  Move,
  ClaimedWord,
  GameMode,
} from './types.js';
