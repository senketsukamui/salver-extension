import { create } from 'zustand';

// null = show all, 'unfiled' = items with no folder, string = folder id
export type FolderFilter = null | 'unfiled' | string;

export interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  dangerConfirm?: boolean;
  onConfirm: () => void;
}

export type FolderModalState =
  | { mode: 'create' }
  | { mode: 'rename'; folderId: string; currentName: string };

export interface FolderDeleteModalState {
  folderId: string;
  folderName: string;
}

export interface AttachState {
  fileId: string;
  fileName: string;
  mode: 'drag' | 'click';
}

interface UIStore {
  view: 'list' | 'add' | 'edit';
  editingSnippetId: string | null;
  movingSnippetId: string | null;
  movingFileId: string | null;
  activeFolderFilter: FolderFilter;
  searchQuery: string;
  toast: ToastState | null;
  confirmDialog: ConfirmDialogState | null;
  folderModal: FolderModalState | null;
  folderDeleteModal: FolderDeleteModalState | null;
  headerMenuOpen: boolean;
  attachState: AttachState | null;

  setView: (view: 'list' | 'add' | 'edit') => void;
  openEditSnippet: (id: string) => void;
  openMoveSnippet: (id: string) => void;
  openMoveFile: (id: string) => void;
  closeModal: () => void;
  setActiveFolderFilter: (filter: FolderFilter) => void;
  setSearchQuery: (q: string) => void;

  showToast: (message: string, type?: 'success' | 'error') => void;

  showConfirm: (opts: ConfirmDialogState) => void;
  dismissConfirm: () => void;

  showFolderModal: (opts: FolderModalState) => void;
  dismissFolderModal: () => void;

  showFolderDeleteModal: (opts: FolderDeleteModalState) => void;
  dismissFolderDeleteModal: () => void;

  setHeaderMenuOpen: (open: boolean) => void;
  setAttaching: (fileId: string, fileName: string, mode: 'drag' | 'click') => void;
  clearAttaching: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
let toastIdCounter = 0;

export const useUIStore = create<UIStore>((set) => ({
  view: 'list',
  editingSnippetId: null,
  movingSnippetId: null,
  movingFileId: null,
  activeFolderFilter: null,
  searchQuery: '',
  toast: null,
  confirmDialog: null,
  folderModal: null,
  folderDeleteModal: null,
  headerMenuOpen: false,
  attachState: null,

  setView: (view) => set({ view }),

  openEditSnippet: (id) => set({ view: 'edit', editingSnippetId: id }),

  openMoveSnippet: (id) => set({ movingSnippetId: id }),

  openMoveFile: (id) => set({ movingFileId: id }),

  closeModal: () => set({
    view: 'list',
    editingSnippetId: null,
    movingSnippetId: null,
    movingFileId: null,
  }),

  setActiveFolderFilter: (filter) => set({ activeFolderFilter: filter }),

  setSearchQuery: (q) => set({ searchQuery: q }),

  showToast: (message, type = 'success') => {
    if (toastTimer) clearTimeout(toastTimer);
    const id = ++toastIdCounter;
    set({ toast: { id, message, type } });
    toastTimer = setTimeout(() => {
      set((s) => s.toast?.id === id ? { toast: null } : {});
    }, 2500);
  },

  showConfirm: (opts) => set({ confirmDialog: opts }),
  dismissConfirm: () => set({ confirmDialog: null }),

  showFolderModal: (opts) => set({ folderModal: opts }),
  dismissFolderModal: () => set({ folderModal: null }),

  showFolderDeleteModal: (opts) => set({ folderDeleteModal: opts }),
  dismissFolderDeleteModal: () => set({ folderDeleteModal: null }),

  setHeaderMenuOpen: (open) => set({ headerMenuOpen: open }),

  setAttaching: (fileId, fileName, mode) => set({ attachState: { fileId, fileName, mode } }),
  clearAttaching: () => set({ attachState: null }),
}));
