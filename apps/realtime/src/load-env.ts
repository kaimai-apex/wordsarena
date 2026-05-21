import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function loadEnvFile(envPath: string): boolean {
  if (!existsSync(envPath)) return false;
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    process.env[trimmed.slice(0, eq).trim()] = stripQuotes(trimmed.slice(eq + 1).trim());
  }
  return true;
}

export function loadRootEnv(): void {
  const fromModule = resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env');
  const fromCwd = resolve(process.cwd(), '.env');
  const fromWebRoot = resolve(process.cwd(), '../../.env');

  if (loadEnvFile(fromModule)) return;
  if (loadEnvFile(fromWebRoot)) return;
  loadEnvFile(fromCwd);
}

loadRootEnv();
