# Shelf — Browser Extension

A persistent **side-panel** "shelf" for snippets, links, and files, built for repetitive form-filling (job applications). Local-first, Chromium, free. Full spec in `shelf-extension-blueprint.md` — that document is the source of truth; this file is the quick-reference for working conventions and locked decisions.

## Locked decisions (do not re-litigate without asking)
- **Manifest V3**, Chromium targets only (Chrome/Edge/Brave/Arc/Opera).
- **Framework: WXT** (`wxt`). Entrypoints: `sidepanel/`, `background/`, `content/`. Let WXT generate the manifest from config — do not hand-write `manifest.json`.
- **UI: React + TypeScript.**
- **Styling: CSS Modules.** No Tailwind.
- **UI state: Zustand** (one small store). **Data binding: `dexie-react-hooks` `useLiveQuery`** against IndexedDB.
- **Storage: Dexie.js (IndexedDB).** Split file metadata (`fileMeta`) from bytes (`fileBlobs`), same id. List views NEVER load Blobs. Add `unlimitedStorage` permission.
- **Folders: flat for v1** (`parentId` exists in schema but stays `null`).
- **Permissions:** `sidePanel`, `storage`, `unlimitedStorage`, `activeTab`, `scripting`, `contextMenus`. `host_permissions: []` — inject content scripts on demand only.
- **Attach feature: click-to-attach only for v1.** No cross-context drag, no synthetic-drop fallback yet (see blueprint §1.6).
- **File transfer to content script: base64 over `chrome.runtime` messaging.**
- **maxFileSize default 10MB.** Reject oversize on add.
- **No network, no analytics.** All data stays on device.

## Schema
Use the Dexie schema exactly as defined in blueprint §1.8 (tables: `folders`, `snippets`, `fileMeta`, `fileBlobs`, `settings`). IDs are `crypto.randomUUID()`. Timestamps are epoch ms.

## Message protocol
Single discriminated-union message type. Channels per blueprint §1.9: `ATTACH_START`, `ATTACH_RESULT`, `ATTACH_CANCEL`, `ADD_SELECTION`, `OPEN_PANEL`.

## Conventions
- TypeScript strict mode on. No `any` without a comment justifying it.
- Keep the background service worker stateless (MV3 is ephemeral) — it only routes messages, registers context menus, sets `sidePanel.setPanelBehavior`, and injects content scripts on demand.
- Primary row action is inline: files show **Attach**, snippets/links show **Copy**. Secondary actions live in a `⋯` menu.
- Prefer small, single-purpose components and hooks. Co-locate `.module.css` with its component.
- Don't pre-optimize (no virtualization until lists are actually large).

## Build order (work one milestone at a time, confirm it runs before moving on)
1. WXT + React + TS scaffold; side panel opens from toolbar; Dexie wired with `useLiveQuery`.
2. Snippets CRUD: add/edit/delete text + links, folders, click-to-copy.
3. Search across title/content.
4. Files: add via drop/picker, metadata+blob split, delete, size cap.
5. Attach (core): on-demand content-script injection, file-input detection, `DataTransfer` assignment, toasts, no-input handling.
6. Templates: `{{token}}` detection + copy-time prompt.
7. Export/import: JSON with base64 files, dry-run summary, transactional merge.
8. Context menu "Add selection to Shelf."

## Dev / test
- `wxt dev` for HMR; load the unpacked dev build in `chrome://extensions` (Developer mode on).
- After each milestone, manually verify the panel loads and the new feature works before continuing.
