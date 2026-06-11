import { db, type Folder, type Snippet, type FileMeta } from './db';

// ── Export ────────────────────────────────────────────────────────────

export interface ExportedFile extends FileMeta { dataB64: string }

export interface SalverExport {
  format: 'salver-export';
  version: 1;
  exportedAt: string;
  folders: Folder[];
  snippets: Snippet[];
  files: ExportedFile[];
  settings: Record<string, unknown>;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function exportSalver(): Promise<SalverExport> {
  const [folders, snippets, fileMetas, blobRows, settingRows] = await Promise.all([
    db.folders.orderBy('sortOrder').toArray(),
    db.snippets.orderBy('sortOrder').toArray(),
    db.fileMeta.orderBy('sortOrder').toArray(),
    db.fileBlobs.toArray(),
    db.settings.toArray(),
  ]);

  const blobMap = new Map(blobRows.map((r) => [r.id, r.blob]));

  const files: ExportedFile[] = await Promise.all(
    fileMetas.map(async (meta) => {
      const blob = blobMap.get(meta.id);
      const dataB64 = blob ? await blobToBase64(blob) : '';
      return { ...meta, dataB64 };
    })
  );

  const settings: Record<string, unknown> = {};
  settingRows.forEach((r) => { settings[r.key] = r.value; });

  return {
    format: 'salver-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    folders,
    snippets,
    files,
    settings,
  };
}

export function downloadJson(data: SalverExport) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `salver-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Import ────────────────────────────────────────────────────────────

export interface DryRunResult {
  foldersAdded: number;
  foldersSkipped: number;
  snippetsAdded: number;
  snippetsSkipped: number;
  filesAdded: number;
  filesSkipped: number;
  warnings: string[];
}

export function validateExport(raw: unknown): SalverExport {
  if (
    typeof raw !== 'object' ||
    raw === null ||
    (raw as SalverExport).format !== 'salver-export' ||
    (raw as SalverExport).version !== 1
  ) {
    throw new Error('Invalid or unsupported export file format.');
  }
  const data = raw as SalverExport;
  if (!Array.isArray(data.folders) || !Array.isArray(data.snippets) || !Array.isArray(data.files)) {
    throw new Error('Export file is missing required arrays.');
  }
  return data;
}

export async function dryRunImport(data: SalverExport): Promise<DryRunResult> {
  const existingFolderIds   = new Set(await db.folders.toCollection().primaryKeys());
  const existingSnippetIds  = new Set(await db.snippets.toCollection().primaryKeys());
  const existingFileIds     = new Set(await db.fileMeta.toCollection().primaryKeys());

  const result: DryRunResult = {
    foldersAdded: 0, foldersSkipped: 0,
    snippetsAdded: 0, snippetsSkipped: 0,
    filesAdded: 0, filesSkipped: 0,
    warnings: [],
  };

  for (const f of data.folders) {
    existingFolderIds.has(f.id) ? result.foldersSkipped++ : result.foldersAdded++;
  }
  for (const s of data.snippets) {
    existingSnippetIds.has(s.id) ? result.snippetsSkipped++ : result.snippetsAdded++;
  }
  for (const f of data.files) {
    if (!f.dataB64) result.warnings.push(`File "${f.name}" has no data and will be skipped.`);
    else existingFileIds.has(f.id) ? result.filesSkipped++ : result.filesAdded++;
  }

  return result;
}

export async function commitImport(data: SalverExport): Promise<void> {
  const existingFolderIds  = new Set(await db.folders.toCollection().primaryKeys());
  const existingSnippetIds = new Set(await db.snippets.toCollection().primaryKeys());
  const existingFileIds    = new Set(await db.fileMeta.toCollection().primaryKeys());

  await db.transaction('rw', db.folders, db.snippets, db.fileMeta, db.fileBlobs, db.settings, async () => {
    const newFolders  = data.folders.filter((f) => !existingFolderIds.has(f.id));
    const newSnippets = data.snippets.filter((s) => !existingSnippetIds.has(s.id));
    const newFiles    = data.files.filter((f) => f.dataB64 && !existingFileIds.has(f.id));

    if (newFolders.length)  await db.folders.bulkAdd(newFolders);
    if (newSnippets.length) await db.snippets.bulkAdd(newSnippets);

    if (newFiles.length) {
      const metas  = newFiles.map(({ dataB64: _b64, ...meta }) => meta);
      const blobs  = newFiles.map((f) => ({ id: f.id, blob: base64ToBlob(f.dataB64, f.mimeType) }));
      await db.fileMeta.bulkAdd(metas);
      await db.fileBlobs.bulkAdd(blobs);
    }

    for (const [key, value] of Object.entries(data.settings ?? {})) {
      await db.settings.put({ key, value });
    }
  });
}

function base64ToBlob(b64: string, mimeType: string): Blob {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}
