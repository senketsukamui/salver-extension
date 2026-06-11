import { useState } from 'react';
import { db } from '../../lib/db';
import { useUIStore } from '../../stores/useUIStore';
import styles from './FolderModal.module.css';

export default function FolderModal() {
  const folderModal = useUIStore((s) => s.folderModal);
  const dismissFolderModal = useUIStore((s) => s.dismissFolderModal);
  const showToast = useUIStore((s) => s.showToast);

  const [name, setName] = useState(
    folderModal?.mode === 'rename' ? folderModal.currentName : ''
  );
  const [saving, setSaving] = useState(false);

  if (!folderModal) return null;

  const isRename = folderModal.mode === 'rename';
  const title = isRename ? 'Rename folder' : 'New folder';

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (isRename) {
        await db.folders.update(folderModal.folderId, {
          name: name.trim(),
          updatedAt: Date.now(),
        });
        showToast('Folder renamed');
      } else {
        await db.folders.add({
          id: crypto.randomUUID(),
          name: name.trim(),
          parentId: null,
          sortOrder: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        showToast('Folder created');
      }
      dismissFolderModal();
    } catch {
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') dismissFolderModal();
  };

  return (
    <div className={styles.backdrop} onClick={dismissFolderModal}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{title}</h3>
        <input
          className={styles.input}
          type="text"
          placeholder="Folder name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={dismissFolderModal}>
            Cancel
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={!name.trim() || saving}
          >
            {saving ? 'Saving…' : isRename ? 'Rename' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
