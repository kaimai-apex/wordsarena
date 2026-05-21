# WordsArena — Project Description (Implementation Reference)

> **Purpose:** This document describes the **current implemented behavior** of the WordsArena web monorepo (`lexarena-web`). Use it to cross-reference against a reference game or spec and find logic differences.
>
> **Brand:** User-facing name is **WordsArena**. Internal package names still use `@lexiform/*`.

---

## 1. Repository structure

```
lexarena-web/
├── apps/
│   ├── web/              # Next.js 14 (App Router) — solo play UI
│   ├── api/              # Hono HTTP API (auth, games, leaderboard)
│   └── realtime/         # WebSocket server (multiplayer skeleton)
├── packages/
│   ├── engine/           # Pure game logic (canonical rules)
│   ├── rating/           # Glicko-2
│   ├── shared/           # Zod schemas
│   └── db/               # Drizzle ORM schema
├── infra/docker-compose.yml
├── lexiform_web_spec.md  # Original build spec (partially diverged — see §12)
└── PROJECT_DESCRIPTION.md
```

**Package manager:** pnpm 9+ workspaces  
**Node:** ≥ 20

---

## 2. Build & run process

### 2.1 Install

```bash
pnpm install
```

### 2.2 Build everything

```bash
pnpm build          # runs `pnpm -r build` across all 7 workspace packages
pnpm test           # engine + rating vitest suites
```

**Build order (implicit via workspace deps):**

| Package | Command | Output |
|---------|---------|--------|
| `packages/engine` | `tsc` | `dist/` — game logic |
| `packages/rating` | `tsc` | Glicko-2 |
| `packages/shared` | `tsc` | Zod types |
| `packages/db` | `tsc` | Drizzle schema |
| `apps/api` | `tsc` | Hono server |
| `apps/realtime` | `tsc` | WS server |
| `apps/web` | `next build` | Static + SSR Next app |

**Important:** Do **not** run `pnpm build` while `pnpm dev` is running on `apps/web`. Both write to `apps/web/.next` and the dev server will serve broken 404 assets (unstyled HTML only). Stop dev, build, then restart dev.

### 2.3 Development

```bash
# Full stack (optional — needs Docker Postgres/Redis)
docker compose -f infra/docker-compose.yml up -d
pnpm db:push
pnpm dev                    # all apps in parallel

# Frontend only (solo play works offline)
cd apps/web && pnpm dev     # http://localhost:3000
```

| Service | Port | Required for solo? |
|---------|------|-------------------|
| Web | 3000 | Yes |
| API | 3001 | No (guest fallback) |
| Realtime WS | 3002 | No |
| Postgres | 5432 | No (leaderboard/auth) |
| Redis | 6379 | No (matchmaking) |

### 2.4 Web client dictionary loading

On game mount, the client loads:

1. `/dictionary.txt` (~173k words, ENABLE-style list)
2. `/dictionary-supplement.txt` (~1.4k extra common words, e.g. `NIGGA`, tech terms)

Both live in `apps/web/public/` (copies of `packages/engine/data/`). Merged via `mergeDictionaryTexts()` in `@lexiform/engine/browser`.

Minimum word length for dictionary: **3 letters** (shorter strings ignored at parse time).

---

## 3. Game modes

| Mode | Route | Timer | Initial board |
|------|-------|-------|---------------|
| **Daily** | `/play/daily` | 120s | UTC date seed: `YYYYMMDD` as integer |
| **Zen** | `/play/zen` | ∞ | Random preset from library |
| **Blitz solo** | `/play/blitz` | 60s | Random preset from library |
| **VS** | (realtime, skeleton) | 30–180s by time control | Shared seed |

### 3.1 New Game behavior

- **Daily (first load):** Same board for all players worldwide on that UTC date.
- **New Game button (all modes):** Resets score, words, timer. Loads next board from **`STARTING_BOARDS`** preset library (12 curated layouts, cycles index 0→11→0). Does **not** use `Date.now()` random seed.
- **Zen/Blitz (first load):** Random preset index.

Presets defined in `packages/engine/src/starting-boards.ts`. Each has fixed tile positions, letters, and shapes.

---

## 4. Board & tiles

### 4.1 Grid

- **Size:** 9×9 (`BOARD_SIZE = 9`)
- **Coordinates:** `row` and `col` are 0-indexed from top-left
- **Occupancy:** Each cell holds a `tileId` or `null`. Pair tiles occupy 2 cells with the same id.

### 4.2 Tile types (current implementation)

| Type | Shape | Letters | Notes |
|------|-------|---------|-------|
| **Single** | 1×1 | 1 | ~55% spawn rate |
| **Pair horizontal** | 2×1 | 2 | Anchor = left cell |
| **Pair vertical** | 2×1 | 2 | Anchor = top cell |
| ~~Wild~~ | ~~1×1 ★~~ | — | **Removed** — not generated |

Spawn distribution in `board-generator.ts`: 45% pair (random H/V), 55% single.

### 4.3 Starting tile count

- **`INITIAL_BOARD_TILES = 11`** — all placed on board at game start
- **`REFILL_QUEUE_SIZE = 0`** — no side tray; no new tiles spawn during solo play (refill queue unused in current UI)

### 4.4 Letter distribution

Weighted pool from English letter frequencies (`LETTER_WEIGHTS` in `constants.ts`). Each letter drawn independently per tile cell.

### 4.5 Board generation (seeded)

```typescript
generateBoard(seed: number) → { board, refillQueue }
```

1. `resetTileCounter()` — ids `t-1`, `t-2`, …
2. `SeededRandom(seed)` — xorshift64 PRNG (see §10)
3. Loop 11 times: create random tile → find random empty valid spot → place
4. Deterministic: same seed → same board

---

## 5. Player interaction (web UI)

### 5.1 Solo flow

1. All tiles start on the board (no tray)
2. **Drag** a tile to a new grid cell
3. On drop (after snap animation), engine runs `applyMove(drag)` then `autoClaimWords()`
4. Valid words score **automatically** — no manual claim button
5. **Claim flash:** scored tiles briefly turn white with blue letters (~320ms); **tiles stay on the board**

### 5.2 Pair tile drag (anchor offset)

When dragging a pair tile, the engine/UI track **which cell was grabbed**:

- Horizontal pair: click left letter → anchor moves; click right letter → that letter lands on drop cell
- Vertical pair: click top vs bottom similarly

Drop target cell = cell under cursor. Placement anchor:

```
anchorRow = hoverRow - anchorOffsetRow
anchorCol = hoverCol - anchorOffsetCol
```

### 5.3 Placement rules

A move is valid if `canPlaceAt(occupancy, shape, row, col, ignoreTileId)`:

- All cells of the tile fit inside 0..8
- No overlap with other tiles (ignored tile id excluded during drag)

Invalid drop → tile snaps back to origin.

---

## 6. Word detection

**File:** `packages/engine/src/word-detection.ts`

### 6.1 Line expansion

From any occupied cell, expand **horizontally** and **vertically** through contiguous letters (no gaps) until empty cell or board edge.

### 6.2 Whole-line match (important)

For each contiguous letter run on a row or column, the **entire run** must match a dictionary word. Embedded substrings do not score.

Example: letters `S-A-P-E` on one line → `APE` does **not** score (extra `S` before it). Only `SAPE` would score if it were in the dictionary.

Example: letters `T-O-R-E` with no extra letters → `TORE` scores.

**Not supported:**

- Diagonal words
- L-shaped paths
- Words using disconnected cells

### 6.3 Candidate enumeration

`findCandidateWords(board, dictionary)`:

- Scan every cell `(row, col)` on the 9×9 grid
- Run `findWordAt` at each cell
- Deduplicate by sorted cell signature (`"row,col|row,col|..."`)
- Sort candidates by word length descending

### 6.4 Wild tiles

Wild (`★`) logic still exists in `resolveWildWord()` but **no wild tiles are spawned**. Dead code path unless manually placed.

---

## 7. Scoring system

**Files:** `packages/engine/src/scoring.ts`, `constants.ts`

### 7.1 Base score formula (current)

```
scoreForLength(n) = n²   for n ≥ 3
                  = 0    for n < 3
```

| Word length | Base points |
|-------------|-------------|
| 3 | 9 |
| 4 | 16 |
| 5 | 25 |
| 6 | 36 |
| 7 | 49 |
| 8 | 64 |

```
finalWordScore = round(baseScore × comboMultiplier)
```

### 7.2 Combo system

| Parameter | Value |
|-----------|-------|
| Window | `COMBO_WINDOW_MS = 5000` (5 seconds) |
| Multipliers | `[1, 1.5, 2.0, 3.0]` via `multiplierForComboCount(count)` |

**Combo state update (`updateComboState`):**

- **First claim ever / after window expired:** `count = 1`, `multiplier = 1.0`
- **Within window:** increment count, multiplier from table:
  - 1st word in chain → ×1.0
  - 2nd → ×1.5
  - 3rd → ×2.0
  - 4th+ → ×3.0

Example chain (all within 5s):

| Word | Length | Base | Multiplier | Points |
|------|--------|------|------------|--------|
| CAT | 3 | 9 | ×1.0 | 9 |
| DOGS | 4 | 16 | ×1.5 | 24 |
| PHONE | 5 | 25 | ×2.0 | 50 |

### 7.3 End-of-game bonus

On timeout (`tick()` when elapsed ≥ duration):

```
bonus = totalLettersScoredByPlayer   // +1 per letter in all claimed words
finalScore += bonus
```

Zen mode (`durationMs = Infinity`) never triggers timeout bonus.

### 7.4 Original spec scoring (NOT current)

The build spec (`lexiform_web_spec.md` §4) defines a **different** table:

```
3→5, 4→12, 5→25, 6→40, 7→55, 8→70, 9+→70+18×(n-8)
```

**Current code uses length², not this table.** Flag any cross-reference against the spec here.

---

## 8. Word claiming rules

**File:** `packages/engine/src/game.ts`

### 8.1 Auto-claim on drag

```typescript
dragTileAndAutoClaim(state, playerId, tileId, to, now, dictionary)
  → applyMove(drag)
  → autoClaimWords()
```

`autoClaimWords` iterates all candidates (longest first in list order) and calls `claimWord` for each unclaimed candidate.

**Overlap prevention:** If two candidates share any cell, only the first (longest-first order) scores; overlapping candidates are skipped via `cellsOverlap()`.

### 8.2 Duplicate prevention

Two independent sets track what has already scored:

| Set | Key | Effect |
|-----|-----|--------|
| `claimedCells` | Sorted `"row,col"` of word cells | Same tile arrangement cannot score twice |
| `claimedWords` | Uppercase word string | Same word text cannot score twice per game, even at new positions |

Both must pass for a new claim.

### 8.3 Claim validation (`claimWord`)

1. Game not over
2. Player in `playerIds`
3. Cell signature not in `claimedCells`
4. `findWordAt(board, anchor, dict)` finds a word
5. Requested cells exactly match found cells (same set)
6. Word string not in `claimedWords`
7. Apply combo + add points + record in `wordsClaimedByPlayer`
8. Mark cells + word as claimed
9. **Tiles remain on the board** after scoring (letters stay in place for further rearranging)
10. `maybeRefillQueue()` — fills refill queue when `REFILL_QUEUE_SIZE > 0` (no effect in solo; queue size is 0)

### 8.4 Tiles after scoring

**Scored tiles stay on the board.** The web UI flashes claimed tiles white/blue briefly, but letters are not removed.

---

## 9. Game state model

```typescript
interface GameState {
  mode: 'daily' | 'zen' | 'blitz_solo' | 'vs'
  seed: number | null
  board: Board
  refillQueue: Tile[]
  scoresByPlayer: Record<string, number>
  totalLettersScoredByPlayer: Record<string, number>
  comboState: Record<string, ComboState>
  wordsClaimedByPlayer: Record<string, ClaimedWord[]>
  claimedCells: Set<string>      // cell signatures
  claimedWords: Set<string>      // uppercase word strings
  startedAt: number              // unix ms
  durationMs: number
  elapsedMs: number
  isOver: boolean
  endedAt: number | null
  playerIds: string[]
}
```

### 9.1 Move types

| Type | Used in solo UI? | Description |
|------|------------------|-------------|
| `drag` | Yes | Move tile on board |
| `claim` | No (auto) | Manual word claim |
| `place` | No | Place from refill queue |
| `rotate` | No | Rotate pair in queue |
| `wildPick` | No | Wild substitution |

### 9.2 Replay

```typescript
replayMoves(initialState, moves[], dictionary) → finalState
```

Re-applies moves + tick at each timestamp. Drag moves in replay do **not** auto-claim unless separate claim moves exist.

---

## 10. Determinism (PRNG)

```typescript
class SeededRandom {
  // xorshift64 on bigint state
  constructor(seed: number) { state = BigInt(seed) || 1n }
}
```

- Daily seed: `year×10000 + month×100 + day` (UTC)
- No `Math.random()` in engine
- All time logic accepts explicit `now: number` parameter

---

## 11. Dictionary

| File | Words | Purpose |
|------|-------|---------|
| `dictionary.txt` | ~173,528 | ENABLE-style Scrabble word list (lowercase on disk, uppercased at load) |
| `dictionary-supplement.txt` | ~1,434 | Common words missing from main list |

Validation: `dictionary.has(word.toUpperCase())`

Words like `TORE`, `WENT`, `PHONE` are in the main dictionary. Words like `NIGGA` are in the supplement.

---

## 12. UI-only behavior (not in engine)

**File:** `apps/web/lib/display-word.ts`

Profane words **score normally** in the engine but display censored in the UI:

```
NIGGA → *****
FAG   → ***
```

Censor list is display-only; engine stores and scores the real word string.

Censored on: word claim toast, "Words found" list.

---

## 13. API & auth (optional for solo)

- Guest session via `/auth/me` (proxied to API on port 3001)
- Solo game creation: `POST /games/solo`
- Finalize: `POST /games/solo/:id/finalize` with `{ moves, finalScore }`
- **If API offline:** game runs entirely client-side with `local-{mode}` player id

---

## 14. Known divergences from `lexiform_web_spec.md`

Use this checklist when comparing to the original spec or a reference app:

| Topic | Spec | Current implementation |
|-------|------|------------------------|
| Base scoring | Fixed table (3=5, 4=12, …) | **length²** (3=9, 4=16, …) |
| Wild tiles | 5% spawn rate | **Removed** (0%) |
| Tile spawn split | 60% single / 35% pair / 5% wild | **55% single / 45% pair** |
| Interaction | Tap-to-claim | **Drag + auto-claim** |
| Refill queue | 8 tiles, place from tray | **0 tiles — all on board** |
| Starting tiles | Spec varies | **11 on board** |
| After score | Tiles consumed / disappear | **Tiles stay on board** |
| Rotation | Pair tiles rotatable in queue | **Not exposed in UI** |
| Overlap on multi-claim | — | **Prevented — shared cells skip lower-priority words** |
| First combo multiplier | Spec: ×1.5 on 2nd word | **×1.0 on 1st, ×1.5 on 2nd** |
| Package brand | Lexiform | **WordsArena** (UI) |

---

## 15. Logic verification checklist

When cross-referencing an example game, verify each step:

### Board setup
- [ ] 9×9 grid
- [ ] 11 tiles at start (solo)
- [ ] Pair orientation and anchor cell
- [ ] Seed → deterministic layout (or preset index)

### After each drag
- [ ] Tile placement valid (no overlap, in bounds)
- [ ] Pair grab offset applied correctly
- [ ] All horizontal/vertical lines scanned
- [ ] Entire letter run must match dictionary word (no embedded substrings)
- [ ] Minimum word length 3
- [ ] Word in merged dictionary

### Scoring each new word
- [ ] Base = length²
- [ ] Combo window 5s from last claim
- [ ] Multiplier sequence: 1.0 → 1.5 → 2.0 → 3.0
- [ ] Scored tiles remain on the board
- [ ] `round(base × multiplier)`
- [ ] Word not already in `claimedWords`
- [ ] Cell set not already in `claimedCells`

### Game end (timed modes)
- [ ] Timer at 0 → game over
- [ ] Bonus += total letters scored
- [ ] Zen: no timeout

### Display
- [ ] Profane words censored in UI only
- [ ] Score sum matches sum of word points + end bonus

---

## 16. Key source files (quick index)

| Concern | Path |
|---------|------|
| Scoring & combos | `packages/engine/src/scoring.ts` |
| Constants | `packages/engine/src/constants.ts` |
| Word detection | `packages/engine/src/word-detection.ts` |
| Claim / auto-claim | `packages/engine/src/game.ts` |
| Board generation | `packages/engine/src/board-generator.ts` |
| Starting presets | `packages/engine/src/starting-boards.ts` |
| Dictionary | `packages/engine/src/dictionary.ts` |
| Types | `packages/engine/src/types.ts` |
| Browser entry | `packages/engine/src/browser.ts` |
| Game UI | `apps/web/components/game/game-board.tsx` |
| Word censoring | `apps/web/lib/display-word.ts` |
| Tests | `packages/engine/src/__tests__/engine.test.ts` |
| Original spec | `lexiform_web_spec.md` |

---

## 17. Test commands

```bash
pnpm --filter @lexiform/engine test    # 12 tests — scoring, combos, whole-line word detection
pnpm --filter @lexiform/rating test    # 4 tests — Glicko-2
pnpm build                             # full compile check
```

---

*Last updated to reflect codebase as of implementation session. Re-read source files if behavior changes.*
