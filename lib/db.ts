import Dexie, { type Table } from 'dexie';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  color?: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface Snippet {
  id: string;
  folderId: string | null;
  type: 'text' | 'link';
  title: string;
  content: string;
  tags: string[];
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number | null;
  useCount: number;
  sourceUrl?: string;
}

export interface FileMeta {
  id: string;
  folderId: string | null;
  name: string;
  mimeType: string;
  size: number;
  tags: string[];
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number | null;
  useCount: number;
}

export interface FileBlob { id: string; blob: Blob; }
export interface Setting  { key: string; value: unknown; }

class SalverDB extends Dexie {
  folders!: Table<Folder, string>;
  snippets!: Table<Snippet, string>;
  fileMeta!: Table<FileMeta, string>;
  fileBlobs!: Table<FileBlob, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super('salver');
    this.version(1).stores({
      folders:   'id, sortOrder, parentId',
      snippets:  'id, folderId, type, *tags, lastUsedAt, sortOrder',
      fileMeta:  'id, folderId, *tags, lastUsedAt, sortOrder',
      fileBlobs: 'id',
      settings:  'key',
    });
  }
}

export const db = new SalverDB();
