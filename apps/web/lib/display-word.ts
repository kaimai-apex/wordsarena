/** Words shown censored in the UI — still score normally in the engine. */
const CENSORED_WORDS = new Set(
  [
    'nigga',
    'niggas',
    'nigger',
    'niggers',
    'fag',
    'fags',
    'faggot',
    'faggots',
    'cunt',
    'cunts',
    'bitch',
    'bitches',
    'fuck',
    'fucks',
    'fucked',
    'fucking',
    'fucker',
    'fuckers',
    'shit',
    'shits',
    'shitty',
    'asshole',
    'assholes',
    'whore',
    'whores',
    'slut',
    'sluts',
  ].map((w) => w.toUpperCase()),
);

/** Mask profane words for display (e.g. NIGGA → *****, FAG → ***). */
export function displayWord(word: string): string {
  if (CENSORED_WORDS.has(word.toUpperCase())) {
    return '*'.repeat(word.length);
  }
  return word;
}
