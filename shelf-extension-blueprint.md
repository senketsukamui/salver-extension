# Shelf — Browser Extension Development Blueprint

*A persistent side-panel "shelf" for snippets, links, and files, built for repetitive form-filling (job applications, etc.). Local-first, Chromium, free.*

---

## 0. Summary of decisions (locked from your answers)

| Topic | Decision |
|---|---|
| Persistence model | **Side panel** (`chrome.sidePanel`) — stays open across tab switches, docked, native feel |
| Killer feature | File → website file input. Delivered via **content-script click-to-attach**, not literal cross-context DnD (see §1.6) |
| Organization | Flat **folders** + **search** + **templates** ({{variables}}). Keep simple |
| Files | Small docs/images. Stored locally as Blobs in IndexedDB |
| Audience | **Public** Chrome Web Store extension |
| Monetization | Free (but schema designed so a sync layer could be added later) |
| Sync | Out of scope for v1; JSON export/import is the migration path |
| Targets | Chromium (Chrome, Edge, Brave, Arc, Opera) |

**The one caveat to internalize:** a side panel cannot initiate an OS drag that drops a real file onto an arbitrary page. So "drag the file onto the upload box" becomes "click the file → click the upload box → it's filled." Same result, more reliable, works on practically every site. §1.6 explains the why and the fallback for custom drop zones.

---

## 1. Tech stack & architecture

### 1.1 Platform & manifest
- **Manifest V3** (mandatory for new Chromium extensions).
- Single codebase targets all Chromium browsers. Edge/Brave/Arc/Opera consume the same package; no extra work.

### 1.2 Build tooling — **WXT**
Use **[WXT](https://wxt.dev)** (`wxt`) as the framework.

Why WXT over raw Vite or CRXJS:
- First-class MV3 entrypoints (`sidepanel/`, `background/`, `content/`) with auto-generated manifest — you stop hand-editing `manifest.json`.
- Built-in side-panel support, content-script declaration, HMR, and TypeScript out of the box.
- Cross-browser build targets (`wxt build -b chrome|edge|firefox`) if you ever expand.

Alternative if you want to stay closer to bare Vite: **CRXJS** (`@crxjs/vite-plugin`). It's solid but you manage more manifest plumbing yourself. Given the goal is shipping, WXT wins.

### 1.3 UI layer
- **React + TypeScript.** Matches your stack; the side panel is a small SPA.
- **Styling: CSS Modules** (scoped, zero runtime, no config to fight inside an extension). This fits the plain-CSS approach you like. If you'd rather move faster, **Tailwind v4** is fine — just be aware you'll configure content scanning for the extension entrypoints. Recommendation: CSS Modules.
- **UI state: Zustand** — one small store for transient UI (active folder, search query, "attach mode" flag, toasts). Don't reach for Redux; this app's state is tiny.
- **Data binding: `dexie-react-hooks` (`useLiveQuery`).** Components subscribe to IndexedDB queries and re-render reactively when data changes. This is the backbone — most of your "state" is just live queries against Dexie.

### 1.4 Storage layer — **Dexie.js (IndexedDB)**
- **Dexie** (`dexie`) wraps IndexedDB with a clean async API and is the single source of truth for everything: folders, snippets, file metadata, file blobs, settings.
- Add the **`unlimitedStorage`** permission so the browser won't evict the user's files under quota pressure and you're effectively disk-limited.
- **Key design move — split file metadata from file bytes** into two tables (`fileMeta` and `fileBlobs`) keyed by the same id. List views query `fileMeta` only and never deserialize Blobs into memory; you load a Blob from `fileBlobs` only at the moment of attach/preview/export. This keeps the list snappy even with hundreds of files.
- Why not `chrome.storage.local`? It serializes to JSON, so binary files become base64 (33% bloat) and reads pull whole records. IndexedDB stores Blobs natively. Use `chrome.storage.local` only for tiny UI prefs if you want (theme, last-open folder) — or just keep those in Dexie `settings` for a unified export.
- Why not OPFS? Overkill at "small files" scale; revisit only if you later support large attachments.

### 1.5 Extension component map
Three runtime contexts, each with a narrow job:

```
┌─ Side Panel (React app) ─────────────┐   the persistent shelf UI
│  Dexie (IndexedDB) lives here        │   reads/writes all data
│  Zustand UI store                    │
└──────────────┬───────────────────────┘
               │ chrome.runtime messages
┌──────────────▼───────────────────────┐
│  Background service worker (minimal)  │   message router, context menus,
│  NO persistent state (MV3 ephemeral)  │   sidePanel.setPanelBehavior,
└──────────────┬───────────────────────┘   on-demand scripting.executeScript
               │ chrome.tabs.sendMessage
┌──────────────▼───────────────────────┐
│  Content script (page context)        │   detects file inputs, builds File,
│  Injected on demand into active tab   │   assigns to input, dispatches events,
│  CANNOT read extension IndexedDB      │   captures page selection
└───────────────────────────────────────┘
```

Critical constraint: the **content script runs in the web page's world, not the extension's**, so it cannot touch Dexie. File bytes must be handed to it via messaging (see §1.6 and §1.9).

### 1.6 The killer feature: file → website file input

**What's impossible:** dragging a chip from the side panel and dropping it on the page. The side panel is a separate top-level document; the browser will not let you put an arbitrary `File` into an OS drag that the page can read. Don't try to fake this — it's a dead end.

**What works reliably — click-to-attach:**

1. User clicks **Attach** on a file in the side panel.
2. Side panel reads the Blob from `fileBlobs`, converts to base64, and sends it to the active tab. If no content script is present yet, the background worker injects it on demand with `chrome.scripting.executeScript` (`activeTab` permission — see §1.7).
3. The content script enters **"pick a target" mode**: it scans for `input[type=file]` (including inside open shadow roots where reachable), outlines each one, and shows a small "Attach here" affordance.
4. User clicks a target input. The content script reconstructs a real `File` and assigns it:

```ts
function base64ToFile(b64: string, name: string, type: string): File {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name, { type });
}

function assignFileToInput(input: HTMLInputElement, file: File) {
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;                                   // assignable via DataTransfer
  input.dispatchEvent(new Event('input',  { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}
```

This is robust across virtually all sites that use native `<input type="file">`, including ones hidden behind a styled "Upload" button.

**Fallback for custom drop zones (no real file input):** some sites only accept drops on a `<div>` with a `drop` handler. For these, the content script can inject a small **in-page draggable chip** (lives in the page's DOM, holds the real File) and the user drags *that* onto the drop zone; on `dragstart` you populate `event.dataTransfer` with the File. This is best-effort — frameworks that check `event.isTrusted` or rely on the native DnD pipeline may reject it. Treat it as a v2 enhancement, behind feature detection, with a graceful "this site needs the file picker" message when it fails.

**Decision to make:** ship v1 with click-to-attach only (covers the overwhelming majority of job portals), or also attempt the synthetic-drop fallback. I'd ship click-to-attach first and add the chip later only if real sites demand it.

### 1.7 Permissions & Web Store posture
Recommended manifest permissions:

```jsonc
{
  "permissions": [
    "sidePanel",
    "storage",
    "unlimitedStorage",
    "activeTab",
    "scripting",
    "contextMenus"
  ],
  "host_permissions": []   // intentionally empty — inject on demand
}
```

Key decision — **`activeTab` + on-demand injection vs `<all_urls>`:**
- **`activeTab` (recommended):** the content script is injected only when the user clicks Attach. No broad host permission. **Far smoother Web Store review**, better privacy story, fewer scary install warnings. Tradeoff: you can't *automatically* highlight file inputs as the user browses — the overlay appears only after they invoke attach. That's an acceptable, even desirable, UX.
- **`<all_urls>` host permission:** lets you auto-detect inputs everywhere, but triggers heavyweight review and a broad permission warning at install. Not worth it for v1.

Clipboard copy uses `navigator.clipboard.writeText()` from the side panel under a user gesture and generally needs no extra permission.

### 1.8 Data model (Dexie schema)

```ts
// db.ts
import Dexie, { type Table } from 'dexie';

export interface Folder {
  id: string;            // crypto.randomUUID()
  name: string;
  parentId: string | null;   // reserved for future nesting; v1 keeps it null (flat)
  color?: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface Snippet {
  id: string;
  folderId: string | null;   // null = "Unfiled"
  type: 'text' | 'link';
  title: string;
  content: string;           // may contain {{variables}}
  tags: string[];
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number | null;
  useCount: number;
  sourceUrl?: string;        // set when added from a page selection
}

export interface FileMeta {
  id: string;
  folderId: string | null;
  name: string;
  mimeType: string;
  size: number;              // bytes
  tags: string[];
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number | null;
  useCount: number;
}

export interface FileBlob { id: string; blob: Blob; }      // same id as FileMeta
export interface Setting  { key: string; value: unknown; } // theme, profile fields, maxFileSize

class ShelfDB extends Dexie {
  folders!: Table<Folder, string>;
  snippets!: Table<Snippet, string>;
  fileMeta!: Table<FileMeta, string>;
  fileBlobs!: Table<FileBlob, string>;
  settings!: Table<Setting, string>;
  constructor() {
    super('shelf');
    this.version(1).stores({
      folders:   'id, sortOrder, parentId',
      snippets:  'id, folderId, type, *tags, lastUsedAt, sortOrder',
      fileMeta:  'id, folderId, *tags, lastUsedAt, sortOrder',
      fileBlobs: 'id',
      settings:  'key',
    });
  }
}
export const db = new ShelfDB();
```

Notes:
- `*tags` is a Dexie multi-entry index → fast tag filtering when you add tags in v2.
- Flat folders for v1; `parentId` is already there so nested folders are a non-breaking `version(2)` upgrade later.
- **Templates aren't a separate type** — any snippet whose content contains `{{token}}` is a template. Resolve at copy time (see §2.3, story T1).

### 1.9 Message protocol (your "endpoints")
There's no server, so the equivalent of REST endpoints is the message contract between contexts. Use a single discriminated-union message type.

| Message `type` | From → To | Payload | Purpose |
|---|---|---|---|
| `ATTACH_START` | Side panel → CS (via SW inject) | `{ fileId, name, mimeType, dataB64 }` | Enter pick-target mode with the file ready |
| `ATTACH_RESULT` | CS → Side panel | `{ ok: boolean, inputsFound: number, reason?: string }` | Report success/failure of placement |
| `ATTACH_CANCEL` | Side panel → CS | `{}` | User backed out; tear down overlay |
| `ADD_SELECTION` | Context menu (SW) → Side panel | `{ text, pageUrl, pageTitle }` | "Add selection to Shelf" |
| `OPEN_PANEL` | SW | — | Ensure side panel is open for the active tab |

Transfer rule: send file bytes as **base64 strings**. It's the safe lowest-common-denominator across the runtime messaging boundary and is perfectly fine for small files. (Even where structured clone is available, base64 avoids any ambiguity.) Cap file size to keep messages snappy (see §4.5).

### 1.10 Export / import format
Single JSON file, files inlined as base64:

```jsonc
{
  "format": "shelf-export",
  "version": 1,
  "exportedAt": "2026-06-11T10:00:00.000Z",
  "folders":  [ /* Folder[] */ ],
  "snippets": [ /* Snippet[] */ ],
  "files":    [ { /* FileMeta */ , "dataB64": "<base64 bytes>" } ],
  "settings": { /* key/value */ }
}
```

Import is **merge-by-default with id-collision handling**: keep existing, regenerate ids for incoming dupes, or offer "replace all." Validate `format` + `version` and show a dry-run summary ("Will add 3 folders, 12 snippets, 5 files") before committing in a single Dexie transaction. Flag for the user: a library of image-heavy files makes a large JSON file because base64 inflates ~33%.

---

## 2. Feature list & user stories

### 2.1 Must-haves (v1)
1. Persistent side-panel shelf, opens from the toolbar icon, survives tab switches.
2. Add **text snippet** / **link** — manual entry, paste, or **right-click → "Add selection to Shelf."**
3. **Click-to-copy** any snippet to clipboard, with a confirmation toast.
4. Add **file** — drop into the side panel or use a file picker.
5. **Click-to-attach** a file into a page's file input (§1.6).
6. **Folders** to group items; an "Unfiled" default.
7. **Search/filter** across snippets and files (title + content).
8. **Templates** — `{{variable}}` resolved on copy.
9. **JSON export / import.**
10. Edit and delete items; basic confirm on destructive actions.

### 2.2 Nice-to-haves (v2+)
- Drag-to-reorder items/folders (**dnd-kit**).
- Tags + tag filtering (schema already supports it).
- In-page draggable chip for custom drop zones.
- **Profile** of reusable values (full name, email, phone, links) that auto-fill template variables without prompting.
- Pinned/favorites and a "Recently used" view (sort by `lastUsedAt` / `useCount`).
- Command-palette + keyboard shortcuts (`chrome.commands`).
- Dark mode / theming.
- Multi-select bulk move/delete/export.
- File preview (image thumbnail, PDF first page).

### 2.3 User stories (with acceptance criteria)

**S1 — Save a snippet from a page.**
As a job seeker, I right-click selected text and choose "Add selection to Shelf" so I can reuse it later.
*Accept:* selection text + page URL/title saved as a `link`/`text` snippet; toast confirms; appears in the active or "Unfiled" folder.

**S2 — Copy a snippet fast.**
*Accept:* one click copies content to clipboard; toast shows; `useCount` increments and `lastUsedAt` updates.

**A1 — Attach a stored resume to an upload field (core).**
*Accept:* clicking Attach enters pick-target mode; file inputs on the page are outlined; clicking one fills it and fires `change`; the site shows the filename as if I'd picked it manually; failure (no inputs found) shows a clear message and offers "open file picker" guidance.

**F1 — Add a file by drag-drop into the panel.**
*Accept:* dropping a file onto the side panel stores its Blob + metadata; size validated against `maxFileSize`; oversize files are rejected with a message.

**T1 — Use a template with variables.**
As a user with a cover-letter snippet containing `{{company}}` and `{{role}}`, when I copy it I'm prompted for those values (or they're pulled from my Profile in v2), and the resolved text lands on the clipboard.
*Accept:* tokens detected via `/\{\{\s*([\w.-]+)\s*\}\}/g`; a compact prompt collects values; resolved text copied; original snippet unchanged.

**O1 — Back up and restore.**
*Accept:* Export downloads a `.json`; Import validates and shows a dry-run summary before merging in one transaction; corrupt/incompatible files are rejected with a reason.

**G1 — Organize.**
*Accept:* create/rename/delete folders; move items between folders; deleting a folder prompts whether to delete or unfile its contents.

---

## 3. UI/UX flow & screens

### 3.1 Side panel layout
Single scrolling column (~360–400px wide). Wireframe:

```
┌──────────────────────────────────────┐
│ Shelf            [＋ Add]   [⋯ menu]  │  header: add button + overflow (export/import/settings)
├──────────────────────────────────────┤
│ 🔎 Search…                            │  debounced filter
├──────────────────────────────────────┤
│ [All ▾]  Unfiled · Job A · Job B …    │  folder selector (dropdown or chips)
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐  │
│ │ 📄 resume_2026.pdf   210 KB      │  │  file row →  [Attach] [⋯]
│ ├──────────────────────────────────┤  │
│ │ ✏️ Cover letter — short          │  │  snippet row → [Copy] [⋯]
│ │    "Dear hiring team, …"          │  │
│ ├──────────────────────────────────┤  │
│ │ 🔗 Portfolio link                │  │
│ └──────────────────────────────────┘  │
│                                        │
│  (empty state when no items)           │
└──────────────────────────────────────┘
```

- **Primary action is inline on each row:** files show **Attach**; snippets/links show **Copy**. The most-used action is always one click, no menu dive.
- The `⋯` per-row menu holds Edit, Move to folder, Delete, (v2: Pin, Tags).
- Mixed list ordered by your sort, or a small segmented toggle (All / Snippets / Files) if you prefer separation — start mixed, add the toggle only if it feels cluttered.

### 3.2 Core flows
- **Add flow:** `＋ Add` opens a compact inline form with a type toggle (Text / Link / File). Text/Link: title + content (+ folder). File: drop zone or picker (+ folder). Save returns to the list with the new item highlighted.
- **Copy flow:** click **Copy** → if template tokens exist, show a small inline value prompt → resolved text to clipboard → toast.
- **Attach flow:** click **Attach** → panel sends the file to the page → page dims slightly and outlines file inputs with an "Attach here" badge → user clicks one → toast "Attached resume_2026.pdf" → Esc or clicking the panel cancels. If zero inputs are found: "No upload field detected on this page."
- **Export/Import:** in the `⋯` overflow menu. Import shows the dry-run summary modal before committing.

### 3.3 Settings & profile
A small settings view (from `⋯` menu): theme toggle, `maxFileSize` slider, Export/Import buttons, and (v2) a **Profile** key/value editor whose entries auto-resolve matching template tokens.

### 3.4 Empty & error states
- First-run empty state: one line on what the shelf does + an "Add your first item" button.
- Attach with no detectable input: explain and suggest the site's own upload button.
- Oversize file on add: state the limit and the file's size.
- Import of an incompatible file: show the validation reason, change nothing.

---

## 4. Performance & scalability

This is a local, single-user tool, so "scale" means staying instant with a few hundred items and never freezing the panel.

### 4.1 Storage & query performance
- **Never load Blobs into the list.** The `fileMeta` / `fileBlobs` split (§1.4) means list rendering touches only metadata. Load a Blob solely at attach/preview/export.
- Use the Dexie indexes (`folderId`, `lastUsedAt`, `*tags`) for filtering and sorting rather than scanning in JS.
- Wrap multi-record operations (import, folder delete) in a single `db.transaction('rw', …)` for atomicity and speed.

### 4.2 Service-worker lifecycle (MV3 gotcha)
- The background worker is **ephemeral** — it terminates after ~30s idle and restarts on the next event. **Hold no state in it.** It only routes messages, registers context menus, sets `sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`, and injects content scripts on demand. All durable state is in IndexedDB; the side panel keeps its own React state while open.

### 4.3 File-transfer performance
- base64 over messaging is fine for small files. Decode once in the content script.
- If you ever allow larger files, chunk the transfer or move to a `postMessage` channel — but the simpler fix is to **cap file size** (§4.5).

### 4.4 Rendering performance
- Debounce search input (~150ms).
- Add **`@tanstack/react-virtual`** only if real users accumulate hundreds of rows; below that, plain rendering is fine. Don't pre-optimize.
- Generate image thumbnails lazily and cache the object URL; revoke it on unmount to avoid leaks.

### 4.5 Limits to set
- **`maxFileSize`** default ~10 MB, user-adjustable up to ~25 MB. Reject above with a clear message. This keeps messaging snappy and export files reasonable.
- Soft-warn if total stored bytes get large (e.g. >250 MB) so users know to prune or export.

---

## 5. Suggested build order (milestones)

1. **Skeleton:** WXT + React + TS scaffold; side panel opens from toolbar; Dexie wired with `useLiveQuery`.
2. **Snippets CRUD:** add/edit/delete text + links, folders, click-to-copy.
3. **Search** across title/content.
4. **Files:** add via drop/picker, metadata + blob split, delete, size cap.
5. **Attach (the core):** content-script injection, file-input detection, `DataTransfer` assignment, toasts, no-input handling.
6. **Templates:** token detection + copy-time prompt.
7. **Export / import** with dry-run + transactional merge.
8. **Context menu** "Add selection to Shelf."
9. **Polish + store prep:** empty states, icons, listing, privacy note ("all data stays on your device").
10. **v2 backlog:** tags, reorder (dnd-kit), Profile auto-fill, custom-dropzone chip, keyboard shortcuts.

---

## 6. Questions & open decisions

1. **Attach fallback scope.** Ship v1 with click-to-attach only, or also build the synthetic in-page drag chip for custom drop zones? (I recommend click-to-attach only first.)
2. **Folder model.** Confirm flat folders for v1 (nesting deferred). Agreed?
3. **List layout.** Mixed snippet+file list, or a segmented Snippets/Files toggle from day one?
4. **Template values.** v1 prompt-on-copy only, or include the Profile auto-fill in v1?
5. **Import behavior default.** Merge-with-id-regeneration vs an explicit "replace all" choice each time — which is the default?
6. **File size cap.** Confirm ~10 MB default / ~25 MB max, or different numbers for your real files (resumes, portfolios).
7. **Styling.** CSS Modules (my pick, matches your plain-CSS preference) or Tailwind for velocity?
8. **Name & branding.** "Shelf" is a placeholder; the store listing needs a final name + icon.
9. **Web Store posture.** Confirm `activeTab` on-demand injection (lean permissions, easy review) over `<all_urls>` auto-detection.
10. **Privacy/listing copy.** Since it's local-first with no network, the listing should state "no data leaves your device" — confirm that stays true (no analytics) for v1.
