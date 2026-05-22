export type ParsedGameState = Record<string, unknown> & {
  claimedCells: Set<string>;
  claimedWords: Set<string>;
};

/** Deserialize game state from WebSocket / API JSON (Sets become arrays). */
export function parseServerGameState(raw: Record<string, unknown>): ParsedGameState {
  return {
    ...raw,
    claimedCells: new Set((raw.claimedCells as string[]) ?? []),
    claimedWords: new Set((raw.claimedWords as string[]) ?? []),
  };
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
