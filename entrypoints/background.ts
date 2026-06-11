import type { SalverMessage } from '../lib/messages';

export default defineBackground(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(console.error);

  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'salver-add-selection',
      title: 'Add selection to Salver',
      contexts: ['selection'],
    });
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== 'salver-add-selection') return;
    const text = info.selectionText?.trim();
    if (!text) return;

    const msg: SalverMessage = {
      type: 'ADD_SELECTION',
      text,
      pageUrl:   tab?.url   ?? '',
      pageTitle: tab?.title ?? '',
    };

    // Ensure the side panel is open, then forward the message
    chrome.sidePanel.open({ windowId: tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT })
      .catch(() => undefined)
      .finally(() => {
        // Small delay to let the panel mount if it was just opened
        setTimeout(() => {
          chrome.runtime.sendMessage(msg).catch(() => undefined);
        }, 300);
      });
  });
});
