import { describe, it, expect } from 'vitest';
import { slugify, deriveUsername } from '../string-utils.js';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Words Arena Team')).toBe('words-arena-team');
  });

  it('strips leading/trailing hyphens', () => {
    expect(slugify('---Hello---')).toBe('hello');
  });

  it('truncates to 48 chars', () => {
    const long = 'a'.repeat(60);
    expect(slugify(long).length).toBe(48);
  });
});

describe('deriveUsername', () => {
  it('prefers full name', () => {
    expect(deriveUsername({ fullName: 'Jane Doe', email: 'j@x.com' })).toBe('jane_doe');
  });

  it('falls back to email local part', () => {
    expect(deriveUsername({ email: 'player.one@example.com' })).toBe('player_one');
  });

  it('defaults to player', () => {
    expect(deriveUsername({})).toBe('player');
  });

  it('strips invalid characters', () => {
    expect(deriveUsername({ name: 'Hello!!! World' })).toBe('hello_world');
  });
});
