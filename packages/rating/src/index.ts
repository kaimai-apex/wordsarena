export interface Rating {
  rating: number;
  rd: number;
  volatility: number;
}

export interface GameOutcome {
  opponent: Rating;
  score: 0 | 0.5 | 1;
}

const SCALE = 173.7178;

function toGlicko2(r: Rating) {
  return {
    mu: (r.rating - 1500) / SCALE,
    phi: r.rd / SCALE,
    sigma: r.volatility,
  };
}

function fromGlicko2(mu: number, phi: number, sigma: number): Rating {
  return {
    rating: mu * SCALE + 1500,
    rd: phi * SCALE,
    volatility: sigma,
  };
}

function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

function E(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

function computeV(mu: number, outcomes: GameOutcome[]): number {
  let sum = 0;
  for (const o of outcomes) {
    const { mu: muJ, phi: phiJ } = toGlicko2(o.opponent);
    const e = E(mu, muJ, phiJ);
    const gv = g(phiJ);
    sum += gv * gv * e * (1 - e);
  }
  return 1 / sum;
}

function computeDelta(mu: number, outcomes: GameOutcome[]): number {
  let sum = 0;
  for (const o of outcomes) {
    const { mu: muJ, phi: phiJ } = toGlicko2(o.opponent);
    const e = E(mu, muJ, phiJ);
    sum += g(phiJ) * (o.score - e);
  }
  return sum;
}

function computeNewVolatility(
  sigma: number,
  phi: number,
  v: number,
  delta: number,
  tau: number,
): number {
  const a = Math.log(sigma * sigma);
  const phi2 = phi * phi;
  const delta2 = delta * delta;

  function f(x: number): number {
    const ex = Math.exp(x);
    const num = ex * (delta2 - phi2 - v - ex);
    const den = 2 * (phi2 + v + ex) ** 2;
    return num / den - (x - a) / (tau * tau);
  }

  let A = a;
  let B: number;
  if (delta2 > phi2 + v) {
    B = Math.log(delta2 - phi2 - v);
  } else {
    let k = 1;
    while (f(a - k * tau) < 0) k++;
    B = a - k * tau;
  }

  let fA = f(A);
  let fB = f(B);

  const epsilon = 0.000001;
  while (Math.abs(B - A) > epsilon) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB < 0) {
      A = B;
      fA = fB;
    } else {
      fA /= 2;
    }
    B = C;
    fB = fC;
  }

  return Math.exp(A / 2);
}

export function newRating(): Rating {
  return { rating: 1500, rd: 350, volatility: 0.06 };
}

export function updateRating(
  player: Rating,
  outcomes: GameOutcome[],
  systemTau = 0.5,
): Rating {
  if (outcomes.length === 0) return { ...player };

  const { mu, phi, sigma } = toGlicko2(player);
  const v = computeV(mu, outcomes);
  const delta = computeDelta(mu, outcomes);
  const sigmaPrime = computeNewVolatility(sigma, phi, v, delta, systemTau);

  const phiStar = Math.sqrt(phi * phi + sigmaPrime * sigmaPrime);
  const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  let muPrime = mu + phiPrime * phiPrime * computeDelta(mu, outcomes);

  return fromGlicko2(muPrime, phiPrime, sigmaPrime);
}

export function decayInactiveRating(rating: Rating, daysInactive: number): Rating {
  if (daysInactive <= 7) return rating;
  const extraDays = daysInactive - 7;
  const newRd = Math.min(350, rating.rd + extraDays * 5);
  return { ...rating, rd: newRd };
}

export function decayInactiveRatings(ratings: Rating[], lastPlayedDays: number[]): Rating[] {
  return ratings.map((r, i) => decayInactiveRating(r, lastPlayedDays[i] ?? 0));
}
