# RAddle — PRD

## Original problem
Word-ladder puzzle "RAddle". Iteration 1 was a single-file static HTML deployable to Vercel.
Iteration 2 (current) added: full user accounts (JWT + bcrypt), Welcome/Login/Signup flow,
"Solo Climb" 20-level progression mode, and **cross-device 1v1 rooms with a 6-digit code**
where each player can only see their own puzzle and their opponent's progress meter.

## Stack
- Backend: FastAPI + Motor + MongoDB
- Frontend: React (CRA) + react-router-dom + shadcn-ui + sonner + Tailwind
- Auth: JWT (Bearer header), bcrypt password hashing, localStorage `raddle.token`
- 1v1 cross-device sync via HTTP polling every 1.5s (Vercel-free-tier friendly)

## Implemented (2026-02-11)
- ✅ Welcome page: logo, rules in three lines, "New Player" and "Returning Player" buttons
- ✅ Signup form (username 3–20, password 4+, confirm) → JWT, redirect /home
- ✅ Login form → JWT, redirect /home
- ✅ Auth-protected routes; auto-redirect to / when not authed; auto-redirect to /home when authed
- ✅ Home screen with two mode cards: **Solo Climb** + **One vs One**
- ✅ Solo Climb: 20 levels with locked progression (next locked until previous completed),
  difficulty pills (Easy/Medium/Tricky), green completion check, "all 20 done" banner
- ✅ Single-player Play screen: start/target tiles, live letter-position match feedback in soft sage green,
  strict 1-letter validation, dictionary check, hint (1: step count, 2: 2nd-last word, 3: 3rd-last word if path ≥ 5 words),
  win card, undo, restart, server-side persisted progress
- ✅ Battle lobby: **Create room** → 6-digit numerical code, **Join room** via code
- ✅ Battle room (cross-device):
  - Big copyable code while waiting
  - Once second player joins → both screens flip to active
  - Each player sees ONLY their own puzzle and chain
  - Opponent appears as a **progress meter**: name · round X/3 · N words typed · score
  - 60-second timer per round, hints unlock if opponent solves first OR timer expires
  - Match-over screen with winner + final score
- ✅ **50-puzzle battle pool**: 20 master levels + 30 hand-curated puzzles (15 Easy + 10 Medium + 5 Tricky)
- ✅ Every path in LEVELS and NEW_BATTLE_PUZZLES is now a valid strict 1-letter ladder
- ✅ ~2,070-word dictionary + RAYA easter egg + all path words + bridge words
- ✅ Toaster notifications (Sonner) with crafty styling
- ✅ Every interactive element has `data-testid`

## Test coverage
- Backend: 18/18 pytest cases pass (auth, signup validation, /me, levels, complete-level idempotency, room create/join/hint/move/RBAC) — see `/app/backend/tests/test_raddle_api.py`
- Frontend: All flows manually verified + agent-tested across two browser contexts for cross-device 1v1.

## Test credentials
See `/app/memory/test_credentials.md`. Pre-existing: `testplayer / testpass` (L1 done).

## Deployment notes
This is now a full-stack app, **not** a single-file static deploy.
For Vercel-only free hosting you'd need to either:
- (a) Use Emergent's deployment which handles backend + frontend together
- (b) Port FastAPI endpoints to Vercel serverless Python functions and use a free MongoDB Atlas tier
- (c) Migrate auth + rooms to Firebase / Supabase (free tiers) and host only the React SPA on Vercel

## Next backlog
- P1 — Move backend to free Vercel-friendly target (serverless or Supabase) for the user's actual deploy plan
- P1 — Visual polish on `Play` win modal, opponent meter, and chain bubbles
- P2 — Daily puzzle, leaderboard, share-result link
- P2 — Sound effects (toggle), animations on opponent progress increment
- P3 — PWA / installable
