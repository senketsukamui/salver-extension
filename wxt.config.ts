import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Salver',
    description: 'A persistent side-panel shelf for snippets, links, and files. Attach files directly to web upload fields.',
    permissions: [
      'sidePanel',
      'storage',
      'unlimitedStorage',
      'activeTab',
      'scripting',
      'contextMenus',
    ],
    host_permissions: [],
    action: {},
    icons: {
      16:  'icon-16.png',
      32:  'icon-32.png',
      48:  'icon-48.png',
      128: 'icon-128.png',
    },
  },
  hooks: {
    // WXT auto-promotes content-script `matches` to host_permissions.
    // Strip it: activeTab + scripting is sufficient for on-demand injection.
    'build:manifestGenerated': (_wxt, manifest) => {
      manifest.host_permissions = [];
    },
  },
});
