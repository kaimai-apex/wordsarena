export type MatchPoolEntry = { rating: number; rd: number };

/** Rating band width (Glicko points) based on queue wait time. Casual pools use 2× width. */
export function bandWidth(waitedSec: number, isRated: boolean): number {
  let band: number;
  if (waitedSec < 10) band = 50;
  else if (waitedSec < 20) band = 100;
  else if (waitedSec < 40) band = 200;
  else if (waitedSec < 60) band = 400;
  else band = Infinity;
  return isRated ? band : band * 2;
}

/** Whether two players' RD values are close enough for rated pairing before long waits. */
export function rdsCompatible(p1: MatchPoolEntry, p2: MatchPoolEntry, waitedSec: number): boolean {
  if (waitedSec >= 30) return true;
  return Math.abs(p1.rd - p2.rd) < 200;
}

export function matchPoolKey(timeControl: string, isRated: boolean): string {
  return `${timeControl}:${isRated ? 'rated' : 'casual'}`;
}

/** Whether two ratings are within the current matchmaking band. */
export function ratingsInBand(
  ratingA: number,
  ratingB: number,
  waitedSec: number,
  isRated: boolean,
): boolean {
  const band = bandWidth(waitedSec, isRated);
  return band === Infinity || Math.abs(ratingA - ratingB) <= band;
}
