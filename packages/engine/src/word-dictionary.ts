/** Compact sorted word index for O(log n) lookup without parsing text. */
export const DICT_MAGIC = 0x43494457; // "WDIC" LE
export const DICT_VERSION = 1;
export const DICT_HEADER_BYTES = 9;
export const DICT_MAX_WORD_LEN = 16;
export const DICT_ENTRY_BYTES = 1 + DICT_MAX_WORD_LEN;

export type WordDictionary = {
  has(word: string): boolean;
  size: number;
};

function compareWordBytes(
  view: DataView,
  offset: number,
  len: number,
  target: string,
): number {
  for (let i = 0; i < len; i++) {
    const a = view.getUint8(offset + 1 + i);
    const b = i < target.length ? target.charCodeAt(i) : 0;
    if (a !== b) return a - b;
  }
  if (len < target.length) return -1;
  return 0;
}

function readWordAt(view: DataView, index: number): string {
  const offset = DICT_HEADER_BYTES + index * DICT_ENTRY_BYTES;
  const len = view.getUint8(offset);
  let word = '';
  for (let i = 0; i < len; i++) {
    word += String.fromCharCode(view.getUint8(offset + 1 + i));
  }
  return word;
}

export class BinaryWordDictionary implements WordDictionary {
  readonly size: number;
  private readonly view: DataView;

  constructor(buffer: ArrayBuffer) {
    const view = new DataView(buffer);
    if (view.byteLength < DICT_HEADER_BYTES) {
      throw new Error('Dictionary buffer too small');
    }
    if (view.getUint32(0, true) !== DICT_MAGIC) {
      throw new Error('Invalid dictionary magic');
    }
    if (view.getUint8(4) !== DICT_VERSION) {
      throw new Error('Unsupported dictionary version');
    }
    this.size = view.getUint32(5, true);
    const expected = DICT_HEADER_BYTES + this.size * DICT_ENTRY_BYTES;
    if (view.byteLength < expected) {
      throw new Error('Dictionary buffer truncated');
    }
    this.view = view;
  }

  static fromBuffer(buffer: ArrayBuffer): BinaryWordDictionary {
    return new BinaryWordDictionary(buffer);
  }

  has(word: string): boolean {
    const target = word.toUpperCase();
    const len = target.length;
    if (len < 3 || len > DICT_MAX_WORD_LEN) return false;

    let lo = 0;
    let hi = this.size - 1;

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const offset = DICT_HEADER_BYTES + mid * DICT_ENTRY_BYTES;
      const wordLen = this.view.getUint8(offset);
      const cmp = compareWordBytes(this.view, offset, wordLen, target);
      if (cmp === 0) return true;
      if (cmp < 0) lo = mid + 1;
      else hi = mid - 1;
    }
    return false;
  }

  /** For tests / debugging — not used in hot paths. */
  wordAt(index: number): string {
    if (index < 0 || index >= this.size) throw new RangeError('index out of range');
    return readWordAt(this.view, index);
  }
}

export function encodeDictionaryBinary(words: Iterable<string>): ArrayBuffer {
  const sorted = [...words]
    .map((w) => w.trim().toUpperCase())
    .filter((w) => w.length >= 3 && w.length <= DICT_MAX_WORD_LEN && /^[A-Z]+$/.test(w))
    .sort();

  const buffer = new ArrayBuffer(DICT_HEADER_BYTES + sorted.length * DICT_ENTRY_BYTES);
  const view = new DataView(buffer);
  view.setUint32(0, DICT_MAGIC, true);
  view.setUint8(4, DICT_VERSION);
  view.setUint32(5, sorted.length, true);

  sorted.forEach((word, index) => {
    const offset = DICT_HEADER_BYTES + index * DICT_ENTRY_BYTES;
    view.setUint8(offset, word.length);
    for (let i = 0; i < DICT_MAX_WORD_LEN; i++) {
      view.setUint8(offset + 1 + i, i < word.length ? word.charCodeAt(i) : 0);
    }
  });

  return buffer;
}

/** Wrap a Set for the shared WordDictionary interface (tests / legacy). */
export class SetWordDictionary implements WordDictionary {
  constructor(private readonly words: Set<string>) {}

  get size(): number {
    return this.words.size;
  }

  has(word: string): boolean {
    return this.words.has(word.toUpperCase());
  }

  toSet(): Set<string> {
    return this.words;
  }
}
