import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useUIStore } from '../../stores/useUIStore';
import { MAX_FILE_SIZE, formatBytes, fileIcon } from '../../lib/utils';
import styles from './AddItemModal.module.css';

type ItemType = 'text' | 'link' | 'file';

export default function AddItemModal() {
  const closeModal = useUIStore((s) => s.closeModal);
  const showToast = useUIStore((s) => s.showToast);
  const activeFolderFilter = useUIStore((s) => s.activeFolderFilter);

  const defaultFolderId =
    activeFolderFilter === null || activeFolderFilter === 'unfiled'
      ? null
      : activeFolderFilter;

  const [type, setType] = useState<ItemType>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const folders = useLiveQuery(() => db.folders.orderBy('sortOrder').toArray());

  const acceptFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      showToast(
        `File too large: ${formatBytes(file.size)}. Limit is ${formatBytes(MAX_FILE_SIZE)}.`,
        'error'
      );
      return;
    }
    setPickedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) acceptFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
    e.target.value = '';
  };

  const handleSaveSnippet = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await db.snippets.add({
        id: crypto.randomUUID(),
        folderId,
        type: type as 'text' | 'link',
        title: title.trim(),
        content: content.trim(),
        tags: [],
        sortOrder: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastUsedAt: null,
        useCount: 0,
      });
      showToast('Snippet added');
      closeModal();
    } catch {
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFile = async () => {
    if (!pickedFile) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      await db.transaction('rw', db.fileMeta, db.fileBlobs, async () => {
        await db.fileMeta.add({
          id,
          folderId,
          name: pickedFile.name,
          mimeType: pickedFile.type || 'application/octet-stream',
          size: pickedFile.size,
          tags: [],
          sortOrder: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastUsedAt: null,
          useCount: 0,
        });
        await db.fileBlobs.add({ id, blob: pickedFile });
      });
      showToast('File added');
      closeModal();
    } catch {
      showToast('Failed to save file', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (type === 'file') return handleSaveFile();
    return handleSaveSnippet();
  };

  const snippetSaveDisabled = (type === 'text' || type === 'link') && (!title.trim() || !content.trim());
  const fileSaveDisabled = type === 'file' && !pickedFile;
  const saveDisabled = snippetSaveDisabled || fileSaveDisabled || saving;

  return (
    <div className={styles.backdrop} onClick={closeModal}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Add item</h2>
          <button className={styles.closeBtn} onClick={closeModal}>✕</button>
        </div>

        <div className={styles.typeToggle}>
          <button
            className={`${styles.typeBtn} ${type === 'text' ? styles.active : ''}`}
            onClick={() => setType('text')}
          >
            ✏️ Text
          </button>
          <button
            className={`${styles.typeBtn} ${type === 'link' ? styles.active : ''}`}
            onClick={() => setType('link')}
          >
            🔗 Link
          </button>
          <button
            className={`${styles.typeBtn} ${type === 'file' ? styles.active : ''}`}
            onClick={() => setType('file')}
          >
            📎 File
          </button>
        </div>

        <div className={styles.fields}>
          {(type === 'text' || type === 'link') && (
            <>
              <label className={styles.label}>
                Title
                <input
                  className={styles.input}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={type === 'link' ? 'Portfolio link' : 'Cover letter — short'}
                  autoFocus
                />
              </label>

              <label className={styles.label}>
                {type === 'link' ? 'URL' : 'Content'}
                <textarea
                  className={styles.textarea}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={type === 'link' ? 'https://…' : 'Dear hiring team…'}
                  rows={5}
                />
              </label>
            </>
          )}

          {type === 'file' && (
            <div
              className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''} ${pickedFile ? styles.hasFile : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className={styles.fileInput}
                onChange={handleFileInput}
              />
              {pickedFile ? (
                <div className={styles.filePreview}>
                  <span className={styles.filePreviewIcon}>{fileIcon(pickedFile.type)}</span>
                  <div className={styles.filePreviewInfo}>
                    <span className={styles.filePreviewName}>{pickedFile.name}</span>
                    <span className={styles.filePreviewSize}>{formatBytes(pickedFile.size)}</span>
                  </div>
                  <button
                    className={styles.fileClearBtn}
                    onClick={(e) => { e.stopPropagation(); setPickedFile(null); }}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className={styles.dropZonePrompt}>
                  <span className={styles.dropZoneIcon}>📂</span>
                  <span className={styles.dropZoneText}>Drop a file or click to browse</span>
                  <span className={styles.dropZoneHint}>Max {formatBytes(MAX_FILE_SIZE)}</span>
                </div>
              )}
            </div>
          )}

          <label className={styles.label}>
            Folder
            <select
              className={styles.select}
              value={folderId ?? ''}
              onChange={(e) => setFolderId(e.target.value || null)}
            >
              <option value="">Unfiled</option>
              {(folders ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={closeModal}>
            Cancel
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saveDisabled}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
