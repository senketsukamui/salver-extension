# First Claude Code prompt — paste this after `claude` starts

Read `shelf-extension-blueprint.md` and `CLAUDE.md` fully before writing any code.

Scaffold this project and implement **milestones 1 and 2 only**. Do not start milestones 3+ yet.

Milestone 1 — Skeleton:
- Initialize a WXT + React + TypeScript project (strict mode).
- A side panel that opens from the toolbar icon (`sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` in a stateless background worker).
- Wire up Dexie with the exact schema from blueprint §1.8 and confirm `useLiveQuery` reactivity with a trivial query.
- Set up the permissions list from CLAUDE.md.

Milestone 2 — Snippets CRUD:
- Add / edit / delete text and link snippets.
- Flat folders: create / rename / delete; an "Unfiled" default; move items between folders.
- Click-to-copy a snippet to the clipboard with a confirmation toast; increment `useCount` and set `lastUsedAt`.
- Side-panel layout per blueprint §3.1: header with `＋ Add` and `⋯` menu, search bar (UI present, wiring comes in milestone 3), folder selector, item rows with inline **Copy** and a `⋯` per-row menu.
- CSS Modules for styling, co-located with components.

When done:
1. Tell me exactly how to load the unpacked dev build and what I should see.
2. List anything you assumed or deferred.
3. Stop and wait for me to verify before touching milestone 3.

Work in small commits. If a blueprint decision is genuinely ambiguous, ask me rather than guessing.
