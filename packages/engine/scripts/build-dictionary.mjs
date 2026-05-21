#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const engineRoot = join(__dirname, '..');
const repoRoot = join(engineRoot, '../..');

const DICT_MAGIC = 0x43494457;
const DICT_VERSION = 1;
const HEADER_BYTES = 9;
const MAX_WORD_LEN = 16;
const ENTRY_BYTES = 1 + MAX_WORD_LEN;

function parseText(text) {
  const words = new Set();
  for (const line of text.split('\n')) {
    const word = line.trim().toUpperCase();
    if (word.length >= 3 && word.length <= MAX_WORD_LEN && /^[A-Z]+$/.test(word)) {
      words.add(word);
    }
  }
  return words;
}

function encodeBinary(words) {
  const sorted = [...words].sort();
  const buffer = Buffer.alloc(HEADER_BYTES + sorted.length * ENTRY_BYTES);
  buffer.writeUInt32LE(DICT_MAGIC, 0);
  buffer.writeUInt8(DICT_VERSION, 4);
  buffer.writeUInt32LE(sorted.length, 5);

  sorted.forEach((word, index) => {
    const offset = HEADER_BYTES + index * ENTRY_BYTES;
    buffer.writeUInt8(word.length, offset);
    buffer.write(word, offset + 1, 'ascii');
  });

  return buffer;
}

const dataDir = join(engineRoot, 'data');
const main = readFileSync(join(dataDir, 'dictionary.txt'), 'utf-8');
let supplement = '';
try {
  supplement = readFileSync(join(dataDir, 'dictionary-supplement.txt'), 'utf-8');
} catch {
  /* optional */
}

const merged = parseText(main);
for (const w of parseText(supplement)) merged.add(w);

const bin = encodeBinary(merged);
const outPaths = [
  join(dataDir, 'dictionary.dict'),
  join(repoRoot, 'apps/web/public/dictionary.dict'),
];

for (const out of outPaths) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, bin);
}

console.log(
  `dictionary.dict: ${merged.size} words, ${(bin.length / 1024 / 1024).toFixed(2)} MiB`,
);
