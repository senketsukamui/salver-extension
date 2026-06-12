# Chrome Web Store — Listing Copy

## Name
Salver

## Short description (≤132 chars)
A side-panel shelf for snippets, links, and files. Copy text, attach files to upload fields — without leaving the page.

## Category
Productivity

## Language
English (United States)

---

## Detailed description

Salver lives in Chrome's side panel and gives you instant access to the content you use every day — cover letters, bios, links, and files — without hunting through folders or switching tabs.

**Snippets & links**
Save any text or URL and copy it to your clipboard in one click. Organise items into folders. Search across everything instantly.

**Templates**
Add `{{variable}}` placeholders to a snippet. When you copy it, Salver prompts for each value and resolves them before hitting your clipboard — the original is never changed.

**Files**
Store PDFs, images, and documents up to 10 MB. Files are split into metadata and binary tables so the list view stays fast even with large attachments.

**Click-to-attach**
Click Attach next to any stored file. A draggable chip appears on the page — drag it to any file upload field and release. Salver assigns the file directly to the input, dispatching the events frameworks expect. Works on virtually any site.

**Folders & search**
Group items into flat folders. A debounced search bar filters by title and content across snippets and files in real time.

**Export / Import**
Back up everything to a single JSON file (files included as base64). Import restores with a dry-run summary before committing any changes.

**Context menu**
Select text on any page, right-click, and choose "Add selection to Salver" to save it as a new snippet instantly.

**100% local**
No accounts, no servers, no analytics. All data lives in your browser's IndexedDB. Nothing ever leaves your device.

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
