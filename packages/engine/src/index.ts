export { createGame, applyMove, claimWord, tick, resign, replayMoves, dailySeedForDate, InvalidMoveError, autoClaimWords, dragTileAndAutoClaim } from './game.js';
export { generateBoard, buildBoardFromPreset, createTile, getTileCells, cloneBoard, canPlace, canPlaceAt, moveTileOnBoard, placeTileOnBoard, removeTilesForCells } from './board-generator.js';
export {
  STARTING_BOARDS,
  startingBoardCount,
  nextStartingBoardIndex,
  randomStartingBoardIndex,
} from './starting-boards.js';
export type { StartingBoardPreset, StartingBoardTile } from './starting-boards.js';
export { findCandidateWords, findCandidateWordsNear, findWordAt, cellKey } from './word-detection.js';
export { computeScore, scoreForLength, updateComboState, endGameBonus } from './scoring.js';
export { isValidWord, loadDictionaryClient, parseDictionary, mergeDictionaryTexts, setDictionaryForTests, clearDictionaryCache, getDictionaryCache, setDictionaryCache } from './dictionary.js';
export type { WordDictionary } from './word-dictionary.js';
export { BinaryWordDictionary, SetWordDictionary, encodeDictionaryBinary } from './word-dictionary.js';
export { loadDictionary, loadDictionarySync } from './dictionary-node.js';
export { SeededRandom } from './prng.js';
export * from './constants.js';
export type {
  GameState,
  Board,
  Tile,
  TileShape,
  GridPosition,
  Move,
  ClaimResult,
  GameMode,
  TimeControl,
  GameEvent,
  ClaimedWord,
  ComboState,
} from './types.js';
export { TIME_CONTROL_MS, SOLO_DURATION_MS } from './types.js';
