import {
  BinaryWordDictionary,
  SetWordDictionary,
  type WordDictionary,
} from './word-dictionary.js';

export type { WordDictionary } from './word-dictionary.js';
export { BinaryWordDictionary, SetWordDictionary, encodeDictionaryBinary } from './word-dictionary.js';

export function parseDictionary(text: string): Set<string> {
  const words = new Set<string>();
  for (const line of text.split('\n')) {
    const word = line.trim().toUpperCase();
    if (word.length >= 3) words.add(word);
  }
  return words;
}

/** Merge multiple dictionary texts into one set. */
export function mergeDictionaryTexts(...texts: string[]): Set<string> {
  const merged = new Set<string>();
  for (const text of texts) {
    for (const word of parseDictionary(text)) merged.add(word);
  }
  return merged;
}

let dictionaryCache: WordDictionary | null = null;

export function isValidWord(word: string, dictionary: WordDictionary | Set<string>): boolean {
  if (dictionary instanceof Set) {
    return dictionary.has(word.toUpperCase());
  }
  return dictionary.has(word);
}

export function setDictionaryForTests(dict: Set<string>): void {
  dictionaryCache = new SetWordDictionary(dict);
}

export function clearDictionaryCache(): void {
  dictionaryCache = null;
}

export function getDictionaryCache(): WordDictionary | null {
  return dictionaryCache;
}

export function setDictionaryCache(dict: WordDictionary): void {
  dictionaryCache = dict;
}

async function loadDictionaryBinary(url: string): Promise<WordDictionary | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    return BinaryWordDictionary.fromBuffer(buffer);
  } catch {
    return null;
  }
}

async function loadDictionaryText(...urls: string[]): Promise<WordDictionary> {
  const texts = await Promise.all(
    urls.map(async (url) => {
      const res = await fetch(url);
      return res.text();
    }),
  );
  return new SetWordDictionary(mergeDictionaryTexts(...texts));
}

/** Load sorted binary dictionary (fast). Falls back to text if .dict missing. */
export async function loadDictionaryClient(
  dictUrl = '/dictionary.dict',
  ...fallbackTextUrls: string[]
): Promise<WordDictionary> {
  if (dictionaryCache) return dictionaryCache;

  const binary = await loadDictionaryBinary(dictUrl);
  if (binary) {
    dictionaryCache = binary;
    return binary;
  }

  const textUrls =
    fallbackTextUrls.length > 0
      ? fallbackTextUrls
      : ['/dictionary.txt', '/dictionary-supplement.txt'];
  const dict = await loadDictionaryText(...textUrls);
  dictionaryCache = dict;
  return dict;
}
