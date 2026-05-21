import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BinaryWordDictionary,
  SetWordDictionary,
  type WordDictionary,
} from './word-dictionary.js';
import { getDictionaryCache, mergeDictionaryTexts, parseDictionary, setDictionaryCache } from './dictionary.js';

export async function loadDictionary(): Promise<WordDictionary> {
  return loadDictionarySync();
}

export function loadDictionarySync(): WordDictionary {
  const cached = getDictionaryCache();
  if (cached) return cached;

  const dir = dirname(fileURLToPath(import.meta.url));
  const dataDir = join(dir, '../data');
  const dictPath = join(dataDir, 'dictionary.dict');

  try {
    const buffer = readFileSync(dictPath);
    const dict = BinaryWordDictionary.fromBuffer(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    );
    setDictionaryCache(dict);
    return dict;
  } catch {
    /* fall through to text */
  }

  const main = readFileSync(join(dataDir, 'dictionary.txt'), 'utf-8');
  let supplement = '';
  try {
    supplement = readFileSync(join(dataDir, 'dictionary-supplement.txt'), 'utf-8');
  } catch {
    /* optional supplement */
  }
  const dict = new SetWordDictionary(
    supplement ? mergeDictionaryTexts(main, supplement) : parseDictionary(main),
  );
  setDictionaryCache(dict);
  return dict;
}
