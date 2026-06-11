import type { SalverMessage } from '../../lib/messages';

export default defineContentScript({
  matches: ['<all_urls>'],
  registration: 'runtime',
  main() {
    const GUARD = '__salver_cs_init__';
    if ((window as unknown as Record<string, unknown>)[GUARD]) return;
    (window as unknown as Record<string, unknown>)[GUARD] = true;

    let chip: HTMLDivElement | null = null;
    let activeFile: File | null = null;
    let highlightCleanups: (() => void)[] = [];

    function teardown() {
      chip?.remove();
      chip = null;
      activeFile = null;
      clearHighlights();
      document.removeEventListener('keydown', onKeyDown, true);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        teardown();
        chrome.runtime.sendMessage({ type: 'ATTACH_CANCEL' }).catch(() => undefined);
      }
    }

    function findFileInputs(root: Document | ShadowRoot): HTMLInputElement[] {
      const inputs: HTMLInputElement[] = [];
      root.querySelectorAll<HTMLInputElement>('input[type=file]').forEach((el) => {
        if (!el.closest('[data-salver-chip]')) inputs.push(el);
      });
      root.querySelectorAll('*').forEach((el) => {
        if (el.shadowRoot) inputs.push(...findFileInputs(el.shadowRoot));
      });
      return inputs;
    }

    function highlightInputs() {
      findFileInputs(document).forEach((input) => {
        const prev = { outline: input.style.outline, boxShadow: input.style.boxShadow };
        input.style.outline = '2px dashed #2563eb';
        input.style.boxShadow = '0 0 0 4px rgba(37,99,235,0.12)';
        highlightCleanups.push(() => {
          input.style.outline = prev.outline;
          input.style.boxShadow = prev.boxShadow;
        });
      });
    }

    function clearHighlights() {
      highlightCleanups.forEach((fn) => fn());
      highlightCleanups = [];
    }

    function injectStyles() {
      if (document.getElementById('salver-chip-styles')) return;
      const style = document.createElement('style');
      style.id = 'salver-chip-styles';
      style.textContent = `
        @keyframes salver-bob {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50%       { transform: translateY(-5px) rotate(1deg); }
        }
      `;
      document.head.appendChild(style);
    }

    function buildChip(name: string): HTMLDivElement {
      injectStyles();

      const el = document.createElement('div');
      el.setAttribute('data-salver-chip', '1');
      el.draggable = true;

      Object.assign(el.style, {
        position: 'fixed',
        top: '72px',
        right: '24px',
        zIndex: '2147483647',
        background: '#fff',
        border: '2px solid #2563eb',
        borderRadius: '12px',
        padding: '12px 16px 10px',
        cursor: 'grab',
        boxShadow: '0 8px 24px rgba(37,99,235,0.22), 0 2px 8px rgba(0,0,0,0.08)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '5px',
        minWidth: '120px',
        maxWidth: '190px',
        userSelect: 'none',
        boxSizing: 'border-box',
        animation: 'salver-bob 2.4s ease-in-out infinite',
      });

      const iconEl = document.createElement('div');
      iconEl.textContent = '📎';
      iconEl.style.fontSize = '24px';
      iconEl.style.lineHeight = '1';

      const nameEl = document.createElement('div');
      nameEl.textContent = name;
      Object.assign(nameEl.style, {
        fontSize: '12px',
        fontWeight: '700',
        color: '#1e40af',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        width: '100%',
        textAlign: 'center',
      });

      const hintEl = document.createElement('div');
      hintEl.textContent = 'drag to a file field';
      Object.assign(hintEl.style, {
        fontSize: '10px',
        fontWeight: '500',
        color: '#93c5fd',
        letterSpacing: '0.02em',
      });

      // Cancel button — position: absolute relative to the fixed chip
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = '✕';
      cancelBtn.setAttribute('draggable', 'false');
      Object.assign(cancelBtn.style, {
        position: 'absolute',
        top: '5px',
        right: '7px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: '700',
        color: '#bfdbfe',
        padding: '2px',
        lineHeight: '1',
      });
      cancelBtn.addEventListener('mouseenter', () => { cancelBtn.style.color = '#2563eb'; });
      cancelBtn.addEventListener('mouseleave', () => { cancelBtn.style.color = '#bfdbfe'; });
      cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        teardown();
        chrome.runtime.sendMessage({ type: 'ATTACH_CANCEL' }).catch(() => undefined);
      });

      el.appendChild(iconEl);
      el.appendChild(nameEl);
      el.appendChild(hintEl);
      el.appendChild(cancelBtn);

      el.addEventListener('dragstart', (e) => {
        if (!activeFile || !e.dataTransfer) return;
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.items.add(activeFile);
        el.style.opacity = '0.55';
        el.style.cursor = 'grabbing';
        el.style.animation = 'none';
        highlightInputs();
      });

      el.addEventListener('dragend', (e) => {
        el.style.opacity = '1';
        el.style.cursor = 'grab';
        el.style.animation = 'salver-bob 2.4s ease-in-out infinite';
        clearHighlights();

        if (e.dataTransfer?.dropEffect !== 'none') {
          chrome.runtime.sendMessage({
            type: 'ATTACH_RESULT',
            ok: true,
            inputsFound: 1,
          } satisfies SalverMessage).catch(() => undefined);
          teardown();
        }
      });

      return el;
    }

    function enterChipMode(payload: { name: string; mimeType: string; dataB64: string }) {
      teardown();
      document.addEventListener('keydown', onKeyDown, true);
      activeFile = base64ToFile(payload.dataB64, payload.name, payload.mimeType);
      chip = buildChip(payload.name);
      document.body.appendChild(chip);

      if (findFileInputs(document).length === 0) {
        chrome.runtime.sendMessage({
          type: 'ATTACH_RESULT',
          ok: false,
          inputsFound: 0,
          reason: 'No file fields found on this page.',
        } satisfies SalverMessage).catch(() => undefined);
      }
    }

    chrome.runtime.onMessage.addListener((message: SalverMessage, _sender, sendResponse) => {
      if (message.type === 'ATTACH_START') {
        enterChipMode(message);
        sendResponse({ ok: true });
      } else if (message.type === 'ATTACH_CANCEL') {
        teardown();
        sendResponse({ ok: true });
      }
      return false;
    });
  },
});

function base64ToFile(b64: string, name: string, type: string): File {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type });
}
