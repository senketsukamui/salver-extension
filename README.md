# Salver

**A persistent side-panel shelf for snippets, links, and files — built for repetitive form-filling.**

Salver lives in Chrome's side panel, survives tab switches, and puts your most-used content one click away. Its killer feature: store a file (résumé, portfolio PDF, cover letter) and attach it directly to any `<input type="file">` on any page — no drag-and-drop limitations, no file picker hunting.

---

## Features

| Feature | Details |
|---|---|
| **Snippets & links** | Save text snippets and URLs; click **Copy** to send to clipboard instantly |
| **Templates** | Any snippet with `{{variable}}` tokens prompts for values at copy-time |
| **Files** | Drop or browse files up to 10 MB; stored as Blobs in IndexedDB |
| **Click-to-attach** | Click **Attach** on a stored file → blue badges appear over every file input on the page → click one to fill it |
| **Folders** | Flat folder organisation with create / rename / delete; "Unfiled" default |
| **Search** | Debounced live search across snippet titles, content, and file names |
| **Context menu** | Right-click selected text on any page → **Add selection to Salver** |
| **Export / Import** | Full JSON backup with files as base64; dry-run summary before committing |
| **Local-first** | No network requests, no analytics, no accounts. All data lives in your browser's IndexedDB. |

---

## Install (development)

### Requirements

- Node.js 18, 20, or 21
- Chrome / Edge / Brave / Arc (Chromium MV3)

### Setup

```bash
git clone git@github.com:senketsukamui/salver-extension.git
cd salver-extension
npm install
```

### Dev (HMR)

```bash
npm run dev
```

WXT starts a dev server and writes a live build to `.output/chrome-mv3/`.

### Production build

```bash
npm run build
```

Output: `.output/chrome-mv3/`

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked**
4. Select `.output/chrome-mv3/`
5. Pin **Salver** to the toolbar

---

## Usage

### Add items

Click **＋ Add** in the panel header. Choose:
- **✏️ Text** — paste a cover letter, bio, or any reusable block of text
- **🔗 Link** — save a URL with a label
- **📎 File** — drop a file or click to browse (PDF, image, doc — up to 10 MB)

### Copy a snippet

Click **Copy** on any row. If the snippet contains `{{tokens}}`, a small form appears to fill in values before the resolved text hits your clipboard.

### Attach a file

1. Navigate to a site with a file upload field
2. Click **Attach** next to the stored file in the panel
3. Blue badges appear over every `<input type="file">` on the page
4. Click the badge over the target field — the file is filled in as if you'd picked it manually
5. Press **Esc** or click **Cancel** in the panel to exit without attaching

### Folders

- **New folder** — `⋯` header menu → New folder
- **Rename / Delete** — click `⋯` next to a folder chip in the folder bar
- **Move item** — `⋯` on a row → Move to folder
- Deleting a non-empty folder lets you choose: move its contents to Unfiled or delete everything

### Templates

Create a snippet containing `{{first_name}}`, `{{company}}`, etc. When you click **Copy**, Salver prompts for each value and resolves them before writing to the clipboard. The original snippet is never modified.

### Export / Import

`⋯` header menu → **Export…** downloads a `salver-export-YYYY-MM-DD.json` containing all snippets, folders, and files (as base64). **Import…** shows a dry-run summary before committing any changes.

---

## Tech stack

| Layer | Choice |
|---|---|
| Build | [WXT](https://wxt.dev) 0.18 — MV3-first, auto-generates manifest |
| UI | React 18 + TypeScript (strict) |
| Styling | CSS Modules — co-located with components, zero runtime |
| State | Zustand (transient UI) + `dexie-react-hooks` `useLiveQuery` (data) |
| Storage | Dexie.js (IndexedDB) — file metadata and blobs split across two tables |
| Extension | Manifest V3, Chromium only |

---

## Architecture

```
┌─ Side Panel (React SPA) ──────────────────┐
│  Dexie (IndexedDB)  ·  Zustand UI store   │
└──────────────┬────────────────────────────┘
               │ chrome.runtime messages
┌──────────────▼────────────────────────────┐
│  Background service worker (stateless)     │
│  Sets openPanelOnActionClick, routes msgs  │
└──────────────┬────────────────────────────┘
               │ chrome.scripting.executeScript (on demand)
┌──────────────▼────────────────────────────┐
│  Content script — injected on Attach only  │
│  Finds file inputs, renders pick badges,   │
│  assigns File via DataTransfer             │
└────────────────────────────────────────────┘
```

**Permissions used and why:**

| Permission | Reason |
|---|---|
| `sidePanel` | Open the panel |
| `storage`, `unlimitedStorage` | IndexedDB quota |
| `activeTab` | Inject content script into the current tab on demand |
| `scripting` | `executeScript` for on-demand content script injection |
| `contextMenus` | Right-click "Add selection to Salver" |

`host_permissions` is intentionally empty — the content script is never auto-injected.

---

## Roadmap

- [ ] Drag-to-reorder items and folders (dnd-kit)
- [ ] Tags + tag filtering (schema already supports it)
- [ ] Profile — reusable key/value pairs that auto-resolve template tokens
- [ ] Dark mode
- [ ] Command palette + keyboard shortcuts
- [ ] Multi-select bulk move / export
- [ ] File preview (image thumbnails, PDF first page)
- [ ] Synthetic drag chip for custom drop-zone sites

---

## License

MIT
