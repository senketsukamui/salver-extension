import type { SalverMessage } from '../../lib/messages';

export default defineContentScript({
  matches: ['<all_urls>'],
  registration: 'runtime',
  main() {
    // Guard: only initialise once per page
    const GUARD = '__salver_cs_init__';
    if ((window as unknown as Record<string, unknown>)[GUARD]) return;
    (window as unknown as Record<string, unknown>)[GUARD] = true;

    let activePayload: { name: string; mimeType: string; dataB64: string } | null = null;
    let overlayRoot: HTMLDivElement | null = null;
    let banner: HTMLDivElement | null = null;

    // ── Overlay teardown ────────────────────────────────────────────
    function teardown() {
      overlayRoot?.remove();
      banner?.remove();
      overlayRoot = null;
      banner = null;
      activePayload = null;
      document.removeEventListener('keydown', onKeyDown, true);
    }

    // ── Escape to cancel ────────────────────────────────────────────
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        teardown();
        chrome.runtime.sendMessage({ type: 'ATTACH_CANCEL' }).catch(() => undefined);
      }
    }

    // ── Shadow DOM walk for file inputs ─────────────────────────────
    function findFileInputs(root: Document | ShadowRoot): HTMLInputElement[] {
      const inputs: HTMLInputElement[] = [];
      root.querySelectorAll<HTMLInputElement>('input[type=file]').forEach((el) => {
        if (!el.closest('[data-salver-overlay]')) inputs.push(el);
      });
      root.querySelectorAll('*').forEach((el) => {
        if (el.shadowRoot) inputs.push(...findFileInputs(el.shadowRoot));
      });
      return inputs;
    }

    // ── Build badge over a single input ─────────────────────────────
    function buildBadge(input: HTMLInputElement, fileName: string): HTMLDivElement {
      const rect = input.getBoundingClientRect();

      const badge = document.createElement('div');
      badge.setAttribute('data-salver-overlay', '1');
      Object.assign(badge.style, {
        position: 'fixed',
        top:    `${rect.top}px`,
        left:   `${rect.left}px`,
        width:  `${Math.max(rect.width, 80)}px`,
        height: `${Math.max(rect.height, 32)}px`,
        zIndex: '2147483647',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(37, 99, 235, 0.15)',
        border: '2px solid #2563eb',
        borderRadius: '6px',
        cursor: 'pointer',
        boxSizing: 'border-box',
        transition: 'background 0.15s',
        fontSize: '12px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontWeight: '600',
        color: '#1e40af',
        gap: '4px',
        padding: '0 8px',
        textAlign: 'center',
        userSelect: 'none',
      });

      const label = document.createElement('span');
      label.textContent = `📎 Attach "${fileName}"`;
      label.style.overflow = 'hidden';
      label.style.textOverflow = 'ellipsis';
      label.style.whiteSpace = 'nowrap';
      badge.appendChild(label);

      badge.addEventListener('mouseenter', () => {
        badge.style.background = 'rgba(37, 99, 235, 0.28)';
      });
      badge.addEventListener('mouseleave', () => {
        badge.style.background = 'rgba(37, 99, 235, 0.15)';
      });

      badge.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!activePayload) return;

        const { name, mimeType, dataB64 } = activePayload;
        const file = base64ToFile(dataB64, name, mimeType);
        assignFileToInput(input, file);
        teardown();

        chrome.runtime.sendMessage({
          type: 'ATTACH_RESULT',
          ok: true,
          inputsFound: 1,
        } satisfies SalverMessage).catch(() => undefined);
      });

      return badge;
    }

    // ── Build top-of-page banner ─────────────────────────────────────
    function buildBanner(fileName: string, inputCount: number): HTMLDivElement {
      const b = document.createElement('div');
      Object.assign(b.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        zIndex: '2147483646',
        background: '#1e40af',
        color: '#fff',
        padding: '10px 16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '13px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxSizing: 'border-box',
      });

      const msg = document.createElement('span');
      msg.textContent = inputCount > 0
        ? `📎 ${inputCount} upload field${inputCount > 1 ? 's' : ''} found — click one to attach "${fileName}". Press Esc to cancel.`
        : `No upload fields found on this page for "${fileName}". Press Esc to cancel.`;
      b.appendChild(msg);

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      Object.assign(cancelBtn.style, {
        background: 'rgba(255,255,255,0.2)',
        border: 'none',
        borderRadius: '4px',
        color: '#fff',
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        flexShrink: '0',
      });
      cancelBtn.addEventListener('click', () => {
        teardown();
        chrome.runtime.sendMessage({ type: 'ATTACH_CANCEL' }).catch(() => undefined);
      });
      b.appendChild(cancelBtn);

      return b;
    }

    // ── Enter pick-target mode ───────────────────────────────────────
    function enterPickMode(payload: typeof activePayload & object) {
      teardown(); // clear any previous state

      activePayload = payload;
      document.addEventListener('keydown', onKeyDown, true);

      const inputs = findFileInputs(document);

      banner = buildBanner(payload.name, inputs.length);
      document.body.appendChild(banner);

      if (inputs.length === 0) {
        // No inputs found: banner stays with cancel button; auto-notify panel
        chrome.runtime.sendMessage({
          type: 'ATTACH_RESULT',
          ok: false,
          inputsFound: 0,
          reason: 'No upload fields detected on this page.',
        } satisfies SalverMessage).catch(() => undefined);
        return;
      }

      overlayRoot = document.createElement('div');
      overlayRoot.setAttribute('data-salver-overlay', '1');
      Object.assign(overlayRoot.style, { position: 'fixed', inset: '0', zIndex: '0', pointerEvents: 'none' });
      document.body.appendChild(overlayRoot);

      inputs.forEach((input) => {
        const badge = buildBadge(input, payload.name);
        document.body.appendChild(badge);
        // Keep a reference under overlayRoot so teardown removes everything
        overlayRoot!.appendChild(badge);
      });
      // Move overlayRoot children back to body so fixed positioning works
      Array.from(overlayRoot.children).forEach((child) => {
        document.body.appendChild(child);
      });
    }

    // ── Message listener ─────────────────────────────────────────────
    chrome.runtime.onMessage.addListener((message: SalverMessage, _sender, sendResponse) => {
      if (message.type === 'ATTACH_START') {
        enterPickMode(message);
        sendResponse({ ok: true });
      } else if (message.type === 'ATTACH_CANCEL') {
        teardown();
        sendResponse({ ok: true });
      }
      return false;
    });
  },
});

// ── Helpers ───────────────────────────────────────────────────────────

function base64ToFile(b64: string, name: string, type: string): File {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type });
}

function assignFileToInput(input: HTMLInputElement, file: File) {
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event('input',  { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}
