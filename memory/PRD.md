# RAddle — PRD

## Original Problem Statement
Build a complete, production-ready, single-file word-ladder puzzle game named "RAddle". The entire application must be contained within a single `index.html` file containing semantic HTML5, embedded CSS, and vanilla JavaScript. Code must be perfectly clean, robust, and deployable instantly to Vercel via GitHub with zero configuration or external backend dependencies.

## User Choices (Feb 2026)
- 1v1 Battle Mode: **Split-screen** (both players on same device, side-by-side)
- Font: agent decides — chose Fraunces (display serif) + Nunito (body) + Caveat (hand-written accents)
- Final file path: `/app/index.html`
- Single file only (no README, no vercel.json)

## Architecture
- **Single static file** — `/app/index.html` (~72 KB)
- No backend, no build step, no dependencies
- Vanilla HTML5 + embedded CSS + vanilla JS
- Google Fonts via CDN (`<link>` preconnect, optional/non-blocking)
- LocalStorage for save state (`raddle.save.v1`)

## Implemented (2026-02-11)
- ✅ Crafty/handmade aesthetic — warm cream backgrounds, sage/dusty-rose/calm-blue accents, dashed-stitch borders, paper-grain texture, custom typography (Fraunces + Nunito + Caveat)
- ✅ Main menu with New Game / Continue / 1v1 Battle / Level Select
- ✅ 20 master levels with strict per-spec start/target/path arrays (wave: 2 Easy → 2 Medium → 1 Tricky × 4 cycles)
- ✅ Level Select grid showing locked/unlocked/completed states + difficulty pills
- ✅ Single-player game screen with start/target tiles, current tiles, input, history chain, hint panel
- ✅ Letter-position match feedback in soft green — updates live as the player types
- ✅ Strict word-ladder validation (exactly 1 letter change, 4-letter word, in dictionary)
- ✅ Dictionary: ~1,400 common 4-letter words + master path whitelist + bridge words ensuring solvability + RAYA easter egg
- ✅ Hint system: click 1 (steps), click 2 (2nd-last word), click 3 (3rd-last word, only when master path length ≥ 5 words)
- ✅ Win modal with stats + Next Level
- ✅ Undo / Restart / Reset Progress
- ✅ LocalStorage persistence — auto-resume + completion tracking
- ✅ 1v1 Battle: split-screen, 3 random puzzles, P1/P2 panels with live tiles + chain
- ✅ 60-second timer per round; hint unlock conditions:
  - Faster player solves → other player's hint unlocks (Condition A)
  - Timer reaches 0 → hints unlock for everyone still playing (Condition B)
- ✅ Multiplayer hint reveals BOTH step-count and 2nd-last word in one click
- ✅ How-To-Play screen
- ✅ Responsive (mobile-friendly with stacked split-screen)
- ✅ data-testid attributes on every interactive element

## Verified flows
- Level 1 (COLD→WARM) solvable as COLD→CORD→WORD→WARD→WARM ✓
- Live tile match feedback (e.g. typing CARD vs WARM highlights A,R in green) ✓
- Hint progression on L2 (3-word path → only 2 clicks) and L19 (6-word path → 3 clicks) ✓
- Invalid word rejection (`XXXX` rejected by 1-letter-diff check) ✓
- LocalStorage persists after level start ✓
- Battle setup → both Sage/Rose panels render with start/target tiles ✓
- Easter egg RAYA in dictionary ✓

## Backlog / Future
- **P1**: Curate the 30-puzzle 1v1 pool with hand-verified solvable paths (current pool synthesizes minimal `[start, target]` for any user-path that didn't validate)
- **P1**: Soft sound effects (click/win/lose) — keep optional, respect prefers-reduced-motion
- **P2**: Share/copy-link of a solved run ("I solved Level 5 in 4 steps")
- **P2**: Daily puzzle mode
- **P2**: Stats screen (best steps per level, total solves, streak)
- **P2**: Theme toggle (paper-cream / midnight ink)
- **P3**: PWA manifest for offline installable play

## Deployment
- Copy `/app/index.html` to a new GitHub repo root. Connect to Vercel → "Other" framework preset → deploy. Zero config.
- Also mirrored at `/app/frontend/public/raddle.html` for in-platform preview at `${REACT_APP_BACKEND_URL}/raddle.html`.
