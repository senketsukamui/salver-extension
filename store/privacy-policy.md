# Privacy Policy

**Last updated: 2026-06-12**

## Summary

Salver stores all data locally on your device. It does not collect, transmit, or share any personal information.

## Data storage

All snippets, links, files, and settings you save in Salver are stored exclusively in your browser's IndexedDB (via the `unlimitedStorage` permission). Nothing leaves your device.

## Permissions

| Permission | Why it is needed |
|---|---|
| `sidePanel` | Display the Salver panel inside the browser window |
| `storage` / `unlimitedStorage` | Store your snippets and files in IndexedDB without quota limits |
| `activeTab` | Identify the current tab when you click Attach |
| `scripting` | Inject the file-attach chip into the active page on demand, only when you click Attach |
| `contextMenus` | Add the "Add selection to Salver" right-click option |
| `host_permissions: <all_urls>` | Allow the on-demand content script to be injected into any page you choose to use Attach on. The script is never injected automatically — only when you explicitly click Attach for a specific file. |

## No analytics, no network

Salver makes no network requests of any kind. There are no third-party SDKs, no analytics, no crash reporting, and no telemetry.

## Contact

For questions or concerns, open an issue at the project repository.
