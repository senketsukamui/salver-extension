# Chrome Web Store — Listing Copy

## Name
Salver

## Short description (≤132 chars)
Born from the pain of copy-pasting CVs and cover letters all day. A side-panel shelf for snippets, links, and files.

## Category
Productivity

## Language
English (United States)

---

## Detailed description

I built Salver out of personal frustration.

Every time I applied for a job I found myself doing the same thing: opening a notes app, hunting for my cover letter, copying it, switching back to the form, pasting it — then doing the same for my portfolio link, my bio, and finally digging through Downloads for the right version of my CV. Over and over, for every application, on every site.

No tool I found solved all three parts at once: text snippets, links, and actual files — all accessible from the same place, without leaving the tab. So I built one.

Salver lives in Chrome's side panel. It stays open while you work. Everything you've saved is one click away.

---

**Snippets & links**
Save cover letters, bios, answers to common application questions, profile URLs — anything you retype constantly. Click Copy and it's on your clipboard instantly. Organise into folders. Search across everything in real time.

**Templates**
Add {{variable}} placeholders to any snippet. When you copy it, Salver asks for the values and resolves them before writing to your clipboard. The original is never touched — reuse it as many times as you need.

**Files**
Store your CV, portfolio PDF, or any document up to 10 MB. Files live in your browser — no uploads, no cloud.

**Drag-to-attach**
Click Attach next to a stored file. A chip appears on the page — drag it to any file upload field and release. The file is filled in directly, as if you'd picked it from your disk. Works on virtually any site.

**Folders & search**
Group items however makes sense to you. A live search bar filters by title and content across snippets and files.

**Export / Import**
Back up everything to a single JSON file — files included. Import shows you exactly what will change before committing.

**Context menu**
Select text anywhere, right-click, and save it to Salver in one step.

**100% local — no accounts, no servers**
Everything is stored in your browser's IndexedDB. Nothing is ever sent anywhere.

---

## Permissions justification (for the review form)

**`host_permissions: <all_urls>`**
Required for `chrome.scripting.executeScript` to inject the file-attach content script on demand. The script is never auto-injected — it only runs when the user explicitly clicks Attach for a specific file. Without this permission, the injection fails if the side panel has been open longer than the `activeTab` grace period.

**`scripting`**
Used exclusively to inject `content-scripts/content.js` on demand (see above).

**`activeTab`**
Identifies which tab to inject the content script into.

**`storage` / `unlimitedStorage`**
Dexie.js (IndexedDB) stores snippets, folders, file metadata, and file blobs. `unlimitedStorage` prevents the browser from evicting large files under quota pressure.

**`sidePanel`**
Opens and configures the side panel via `chrome.sidePanel.setPanelBehavior`.

**`contextMenus`**
Registers the "Add selection to Salver" context menu item.

---

## Screenshots needed (take manually in Chrome at 1280×800)

1. **Side panel open** — shows the item list with a mix of snippets and files, folder selector visible
2. **Add item modal** — text snippet being created
3. **Attach in action** — file chip visible on a page with a file input highlighted
4. **Search results** — search bar active with filtered results
5. **Template modal** — `{{variable}}` prompt before copy

## Promotional tile (440×280)
See `tile-440x280.svg` in this directory.
