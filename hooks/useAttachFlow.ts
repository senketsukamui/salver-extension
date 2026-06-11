import { useEffect } from 'react';
import { db } from '../lib/db';
import { useUIStore } from '../stores/useUIStore';
import type { SalverMessage } from '../lib/messages';

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function getActiveTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function ensureContentScript(tabId: number) {
  // Try pinging first; inject only if no response
  try {
    await chrome.tabs.sendMessage(tabId, { type: '__salver_ping__' });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-scripts/content.js'],
    });
  }
}

export function useAttachFlow() {
  const showToast   = useUIStore((s) => s.showToast);
  const attachState = useUIStore((s) => s.attachState);
  const setAttaching = useUIStore((s) => s.setAttaching);
  const clearAttaching = useUIStore((s) => s.clearAttaching);

  // Listen for results and cancels coming back from the content script
  useEffect(() => {
    const listener = (message: SalverMessage) => {
      if (message.type === 'ATTACH_RESULT') {
        clearAttaching();
        if (message.ok) {
          showToast(`Attached ${attachState?.fileName ?? 'file'}`);
        } else {
          showToast(message.reason ?? 'No upload field found on this page.', 'error');
        }
      } else if (message.type === 'ATTACH_CANCEL') {
        clearAttaching();
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [attachState, clearAttaching, showToast]);

  const startAttach = async (fileId: string, fileName: string, mimeType: string) => {
    setAttaching(fileId, fileName);
    try {
      const tabId = await getActiveTabId();
      if (tabId == null) {
        showToast('No active tab found.', 'error');
        clearAttaching();
        return;
      }

      const blobRecord = await db.fileBlobs.get(fileId);
      if (!blobRecord) {
        showToast('File data not found.', 'error');
        clearAttaching();
        return;
      }

      const dataB64 = await blobToBase64(blobRecord.blob);

      await ensureContentScript(tabId);

      await chrome.tabs.sendMessage(tabId, {
        type: 'ATTACH_START',
        fileId,
        name: fileName,
        mimeType,
        dataB64,
      } satisfies SalverMessage);
    } catch (err) {
      clearAttaching();
      showToast('Could not inject into this page.', 'error');
      console.error('[Salver] attach error', err);
    }
  };

  const cancelAttach = async () => {
    const tabId = await getActiveTabId();
    if (tabId != null) {
      chrome.tabs.sendMessage(tabId, { type: 'ATTACH_CANCEL' } satisfies SalverMessage).catch(() => undefined);
    }
    clearAttaching();
  };

  return { attachState, startAttach, cancelAttach };
}
