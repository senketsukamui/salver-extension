import { useEffect } from 'react';
import { db } from '../lib/db';
import { useUIStore } from '../stores/useUIStore';
import type { SalverMessage } from '../lib/messages';

export function useAddSelectionListener() {
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    const listener = async (message: SalverMessage) => {
      if (message.type !== 'ADD_SELECTION') return;

      const { text, pageUrl, pageTitle } = message;
      const isUrl = /^https?:\/\//i.test(text);

      await db.snippets.add({
        id: crypto.randomUUID(),
        folderId: null,
        type: isUrl ? 'link' : 'text',
        title: pageTitle || (isUrl ? text.slice(0, 60) : text.slice(0, 60)),
        content: text,
        tags: [],
        sortOrder: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastUsedAt: null,
        useCount: 0,
        sourceUrl: pageUrl || undefined,
      });

      showToast('Added to Salver');
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [showToast]);
}
