import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Salver',
    description: 'Save text snippets, links, and files, then instantly reuse them in any web form — no more copy-pasting the same CV or cover letter.',
    permissions: [
      'sidePanel',
      'storage',
      'unlimitedStorage',
      'activeTab',
      'scripting',
      'contextMenus',
    ],
    action: {},
    icons: {
      16:  'icon-16.png',
      32:  'icon-32.png',
      48:  'icon-48.png',
      128: 'icon-128.png',
    },
  },
});
