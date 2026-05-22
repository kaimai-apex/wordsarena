import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getSupabaseEnv,
  isSupabaseClientConfigured,
  isSupabaseConfigured,
  missingSupabaseEnvVars,
} from '../env.js';

const ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL };
});

afterEach(() => {
  process.env = ORIGINAL;
});

describe('Supabase env helpers', () => {
  it('returns null when vars missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(getSupabaseEnv()).toBeNull();
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('returns config when all vars set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
    expect(getSupabaseEnv()?.url).toBe('https://x.supabase.co');
    expect(isSupabaseConfigured()).toBe(true);
  });

  it('isSupabaseClientConfigured only needs public vars', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(isSupabaseClientConfigured()).toBe(true);
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('lists missing vars', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const missing = missingSupabaseEnvVars();
    expect(missing).toContain('NEXT_PUBLIC_SUPABASE_URL');
  });
});
