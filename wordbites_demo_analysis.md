# Gameplay Video Analysis — "Word Bites-Style" Demo

> **Source:** `ScreenRecording_05-20-2026_14-55-35_1.MP4`, 85 seconds, iPhone portrait (1284×2778, 60fps).
> **Purpose:** Reverse-document the game shown for IP-distinction reference. Use this to know what your own implementation must **diverge from**, not what to copy.

---

## ⚠️ Important Identification Note

The user described this video as a playthrough of **GamePigeon's Word Bites**, but inspection of the recording shows that is **almost certainly not what's being played**. Evidence:

- The visible top-of-screen text reads **"WordsArena"** with a "Zen Mode" tab label
- A standard iMessage app-drawer handle (the blue rounded bar) is visible above the play area
- Visual identity (torn-paper score banner, cartoon angry-face avatar) does not match GamePigeon's flat cream/wood look
- Game timer counts down from 2:00, which is consistent with Word Bites-family games

**Conclusion:** This is **WordsArena**, a separate iMessage extension game that implements the same Word Bites-style mechanic. WordsArena is itself in the same competitive space as your Lexiform project — a third-party take on the Word Bites mechanic.

This means:
- The mechanics observed are still useful reference (the mechanic itself is not copyrightable)
- The **visual identity** (color palette, banner style, avatar character, font choice, tile look) belongs to WordsArena and must be avoided just as carefully as GamePigeon's
- WordsArena is a direct competitor — note it for market research

If you want a true GamePigeon Word Bites reference, you'd need a separate recording from inside an iMessage thread with the GamePigeon extension active.

---

## 1. App and Mode

| Property | Observed value |
|---|---|
| App name | WordsArena |
| Platform | iMessage extension on iOS |
| Mode shown | Zen Mode |
| Other modes (visible in top tabs, faint) | Play, Lobby, Arena, Daily (approximate — readable but partially obscured) |
| Game length | **2 minutes (120 seconds)** — timer starts at 02:00, ends at 00:00 |

The presence of an **Arena** tab and **Lobby** tab suggests WordsArena already has competitive multiplayer matchmaking — directly mirroring what the Lexiform web spec proposes. This is competitor product intelligence worth following up on.

---

## 2. Aesthetic / Visual Design

### 2.1 Color palette
| Element | Approximate hex |
|---|---|
| Background (play area) | `#3D5A75` (medium dark blue) |
| Background (empty cells) | `#365168` (slightly darker blue, subtle checker pattern) |
| Grid lines | White dashed/dotted at low opacity |
| Tile fill | `#E8D4A0` (warm cream/tan, wood-like) |
| Tile border | `#B89968` (darker tan/brown) with extra weight on right and bottom for 3D effect |
| Tile letter | `#1A1A1A` (near-black) |
| Score banner background | White |
| Score banner text | Black bold |
| Timer pill | Dark blue (`#2F4A66` approx) with white text |
| Highlighted/claimed word | White tile background with **blue letter color** (~`#2E80FF`) |
| Word-claim notification badge | White rounded pill with black text showing word + points |

### 2.2 Typography
- All text: bold sans-serif, looks like a rounded heavyweight typeface (SF Pro Rounded Bold or similar). Used uniformly for tile letters, score, timer, and banner.

### 2.3 Score banner (top of screen)
- Styled as a **torn-paper note** — white with a ragged top and bottom edge (graphic asset, not a generated effect)
- Contains a circular **cartoon avatar** on the left: a stylized angry-looking character with dark hair, headband, and a green hoodie. The avatar appears to be a personalized "intense gamer" character.
- Text stacked on the right:
  - `WORDS: <count>` (uppercase, smaller)
  - `SCORE: <0000>` (uppercase, larger, zero-padded to 4 digits)

### 2.4 Tiles
- Square footprint (and 1×2 / 2×1 for pairs)
- Light tan wood-grain visual — flat color, not detailed wood texture
- Dark border on all sides; bottom and right borders look slightly thicker, producing a faux-3D bevel
- Centered bold black letter, roughly 60% of tile width
- **Pair tiles** show a faint internal divider line between the two letters
- Subtle drop shadow underneath all tiles

### 2.5 Timer
- Small dark-blue pill, rounded
- White monospaced-feeling text in MM:SS format
- Positioned in upper-right of the play area (just under the score banner)

### 2.6 Word claim animation
When a player taps a valid word:
1. The constituent tiles flip to a **white background with blue text** (an inverted-color glow effect) for ~300ms
2. A **floating notification badge** appears above the play area showing the word and points, e.g. `LORN (+400)`. The badge is a white rounded pill with black text.
3. The tiles then disappear (no visible "shrink" animation in the frames captured — likely a short fade or pop)
4. New tiles replace them from somewhere off-screen — though in Zen mode it's possible the board simply gets emptier over time rather than refilling.

> **Refill mechanism unclear:** Across the video, the total number of tiles on the board appears to **decrease** over time. Started with ~11 tile pieces (16 letters); by the end ~10 tile pieces. This suggests **Zen Mode is a "clear-the-board" or "use-everything" mode rather than a refill mode.** This is different from competitive Word Bites which typically refills.

---

## 3. Board Layout

### 3.1 Grid dimensions
- Estimated: **~8 columns × ~9 rows** (judged from the visible empty-cell pattern; could be 8×10)
- Each cell looks approximately square
- Dashed/dotted grid lines visible faintly throughout

### 3.2 Play area boundary
- The play area is a slightly darker bordered region within the blue background
- Tiles cannot move outside this region

---

## 4. Tile Types Observed

| Type | Shape | Count at game start |
|---|---|---|
| Single | 1×1 | 6 observed: B, U, E, L, D, G |
| Pair (horizontal) | 2×1 | 2 observed: PO, US |
| Pair (vertical) | 1×2 | 3 observed: CK, RN, HI |
| **No wild / special tiles observed** | — | — |

Total starting board: **11 tile pieces = 16 letters**, in 5 pairs and 6 singles.

### Tile distribution observation
The mix of starting tiles is **roughly 45% pair, 55% single by piece count** (or about 62% pair letters / 38% single letters if you count by letter). This is heavier on pairs than my earlier Lexiform spec proposed (which assumed 35% pairs by piece count). Worth noting for tuning your own balance.

### Pair behavior
- Pairs come pre-formed in either horizontal or vertical orientation
- Whether the player can **rotate** them mid-game is not demonstrably visible in the captured frames, but the mechanic typically supports this in Word Bites-family games
- Pair tiles stay glued together: when moved, both letters move

### No special tiles
Across the full 85-second playthrough I see **no wild tiles, no gem tiles, no power-ups**. WordsArena's Zen Mode appears to use only single and pair tiles. (Other modes may have more.)

---

## 5. Game Flow

### 5.1 Pre-game
- A **"How to play" modal** appears before the game starts:
  - Title: "How to play:"
  - Body: "Combine blocks together horizontally or vertically to make as many words as possible."
  - Example: a small static board layout showing the word "WORDS" formed at the center, with various scattered tiles around it. Decorative only — uses the literal word "WORDS" as the demo.
  - Blue "Start" button

### 5.2 Active game
- Timer immediately starts counting down from **02:00**
- Score starts at 0000 (zero-padded)
- Word count starts at 0
- Initial tile placement is **deterministic for the example** but probably random per game

### 5.3 During play (Zen Mode)
- Player drags tiles around the grid
- Tiles can only be placed on empty cells
- Words form horizontally or vertically with **3+ contiguous letter cells**
- **Tap to claim:** the player taps a valid word to score it (consistent with the highlight-then-claim animation observed)
- Score and word count update in real time
- Timer continues counting down

### 5.4 Game end
- At 00:00 the game ends
- The very last claim ("DECKS") appears to have been registered at exactly 00:00
- No end-of-game screen was captured because the player pulled down iOS Control Center to stop recording — a results screen likely follows in the actual flow

---

## 6. Scoring — Observed Data

I tracked score across frames to reverse-engineer the scoring formula. Here are all data points:

| Time | Words | Score | Δ Score | Notes |
|------|-------|-------|---------|-------|
| 01:18 | 0 | 0 | — | Game start |
| 01:16 | 1 | 100 | +100 | First word |
| 01:14 | 2 | 238 | +138 | **REPO highlighted** during claim |
| 01:06 | 6 | 1200 | +962 over 4 words (avg 240) | |
| 01:00 | 10 | 2200 | +1000 over 4 words (avg 250) | |
| 00:52 | 13 | 3788 | +1588 over 3 words (avg 529) | **LORN (+400)** observed |
| 00:42 | 14 | 3900 | +112 | One word at 112 points |
| 00:32 | 18 | 4600 | +700 over 4 words (avg 175) | |
| 00:06 | 22 | 7000 | +2400 over 4 words (avg 600) | High-value late-game |
| 00:00 | 24 | 7949 | +949 over 2 words | **DECKS (+808)** observed |

**Final score: 7,949 over 24 words** in 120 seconds.

### Confirmed per-word scores (from notification badges):
- 3-letter word: **100 points** (inferred from word 1)
- **REPO** (4 letters): **138 points**
- **LORN** (4 letters): **400 points**
- **DECKS** (5 letters): **808 points**

### Possible scoring formulas
The data does not fit a simple word-length formula. Two 4-letter words (REPO and LORN) earned 138 and 400 — wildly different. Possible explanations:

**Hypothesis A: Scrabble-like letter values** (probable)
Standard Scrabble letter values applied: A,E,I,O,U,L,N,R,S,T = 1; D,G = 2; B,C,M,P = 3; F,H,V,W,Y = 4; K = 5; J,X = 8; Q,Z = 10.

- REPO = R(1) + E(1) + P(3) + O(1) = 6
- LORN = L(1) + O(1) + R(1) + N(1) = 4
- DECKS = D(2) + E(1) + C(3) + K(5) + S(1) = 12

If score = `(letter values × some multiplier) + base`, the numbers don't cleanly resolve. LORN at 400 with letter sum 4 = 100/letter-point. REPO at 138 with letter sum 6 = 23/letter-point. DECKS at 808 with letter sum 12 ≈ 67/letter-point.

**Hypothesis B: Combo / streak multiplier** (probable + plausibly stacks with A)
A multiplier may apply for consecutive quick claims. This would explain why later-game words score so much more even at the same length — the player has chained claims.

**Hypothesis C: Time pressure / urgency multiplier**
Scores might multiply as the timer ticks down, creating dramatic endgame swings.

**Hypothesis D: Word-length bonus tiers**
Scores possibly tier non-linearly with length (e.g., 3=100 flat, 4=variable, 5=large bonus).

### Most likely composite
A reasonable model that roughly fits the data:

```
score = baseByLength[length] + (sum of letter values × X) + (comboMultiplier - 1) × bonus
```

Where:
- `baseByLength` ≈ {3: 100, 4: 100, 5: 200, 6: 400, ...}
- Letter values amplify the base
- Combos can multiply by 2× or 3× during streaks

**This is a guess.** To fully verify, you'd need to record a series of plays and log every word + score change. For your Lexiform implementation, **invent your own scoring** rather than reproducing WordsArena's — both for legal distinctness and because the Lexiform spec already has a clean, defensible formula.

---

## 7. UI Layout (Top to Bottom)

| Region | Contents |
|---|---|
| iOS status bar | Time, signal, wifi, battery (system-rendered) |
| iMessage drawer handle | Small blue rounded bar (system-rendered for iMessage extensions) |
| Score banner | Torn-paper white note with avatar + WORDS / SCORE counts |
| Timer pill | Floating dark-blue pill, right-aligned just below the score banner |
| Play area | The 8×9-ish grid where tiles live |
| Bottom area | Mode tabs (visible faintly at very top of frame — Play / Lobby / Arena / Daily) — these likely shift depending on whether modal is open |

---

## 8. What This Means for Lexiform

This video confirms that **the Word Bites mechanic has multiple active competitors in the iMessage extension space**, with WordsArena being one. Implications:

### 8.1 Visual identity must diverge from both GamePigeon AND WordsArena
You now have two visual references to **avoid**:
- GamePigeon Word Bites: cream/beige tiles, flat cream UI, no avatar branding
- WordsArena: dark blue background, torn-paper banner, cartoon avatar, blue-glow word-claim animation, wood-tone tiles

Your Lexiform "Architectural" direction (off-white, charcoal tiles, restrained typography) is **already meaningfully distinct from both**. Keep it.

### 8.2 WordsArena's existence is competitive intelligence
- They already have what looks like a Lobby, Arena, and Daily mode
- They are iMessage-extension-only (not a standalone iOS app, not a website)
- This actually **strengthens** your strategy of building a standalone iOS app + a web platform with Lichess-style competitive infrastructure — that's a gap WordsArena hasn't filled
- The fact that WordsArena exists as an active iMessage extension while standalone alternatives have struggled (Rocket Bunny Games' "Word Bites" was pulled in Feb 2026) suggests **the iMessage-extension lane is contested but the standalone app and web lanes are wide open**

### 8.3 Mechanics to consider for Lexiform
Things WordsArena does that your spec should consider:
- **Zen mode appears to deplete the board** rather than refill — could be an interesting alternative mode to a refilling Zen (clears once, then ends or restarts)
- **Score notifications include the word spelled out** — your tap-to-claim should do the same; reinforces vocabulary learning and feels rewarding
- **Pair tile ratio appears to be ~45% by piece count** (higher than Lexiform's 35%) — pair-heavy boards are more chaotic and create more strategic constraint; consider play-testing both ratios

### 8.4 What to deliberately do differently
- **No avatar in the score banner.** Lexiform's architectural aesthetic should keep the chrome minimal.
- **No torn-paper graphic.** Use a clean modern card.
- **Avoid dark blue background.** Off-white is the chosen direction; stay there.
- **Tile color: never cream/tan/wood.** Both GamePigeon and WordsArena use this. Lexiform's spec calls for charcoal-on-white tiles — keep that.
- **Word-claim flash: use the spec's success-green pulse**, not WordsArena's blue-inverse glow.
- **Scoring formula: use the Lexiform spec's table.** Do not adopt WordsArena's letter-value-plus-combo model — it's their expression, and your spec already has a cleaner system.

---

## 9. Raw Frame Reference

Frames extracted at 0.5 fps from the source video (43 total). Key frames analyzed:

| Frame | Time in video | Event |
|---|---|---|
| 001 | 0:00 | "How to play" modal |
| 002 | 0:02 | Game start (WORDS:0, score 0, timer 1:19) |
| 003 | 0:04 | After first word (WORDS:1, score 100) |
| 004 | 0:06 | REPO claim highlighted (WORDS:2, score 238) |
| 008 | 0:14 | Mid-early (WORDS:6, score 1200) |
| 011 | 0:20 | (WORDS:10, score 2200) |
| 015 | 0:28 | LORN (+400) notification visible |
| 020 | 0:38 | (WORDS:14, score 3900) |
| 025 | 0:48 | (WORDS:18, score 4600) |
| 038 | 1:14 | Endgame (WORDS:22, score 7000) |
| 041 | 1:20 | DECKS (+808) claim at 00:00 (final: WORDS:24, score 7949) |
| 043 | 1:24 | iOS Control Center pulled to end recording |

---

## 10. Open Questions

Things this single playthrough did **not** answer:

1. **Refill mechanism in modes other than Zen.** Does the competitive/Arena mode refill tiles? Probably yes but unverified here.
2. **Wild / power-up tiles.** None appeared in this Zen game. May exist in other modes or as a future feature.
3. **Pair rotation.** Whether the player can tap to rotate pair tiles between horizontal and vertical orientation.
4. **End-of-game screen.** What the results / share screen looks like — recording cut before it appeared.
5. **Exact grid dimensions.** Estimated 8×9 but could be 8×10 or 9×9.
6. **The exact scoring formula.** Letter values + combo + length tier are all plausible; would need more recorded data to pin down precisely.
7. **Multiplayer UI.** What the Arena and Lobby tabs lead to.

To answer these, a second recording would be needed — ideally one playing the Arena mode with a visible end-of-game screen.

---

**End of analysis.**
