import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useUIStore } from '../../stores/useUIStore';
import styles from './EditSnippetModal.module.css';

export default function EditSnippetModal() {
  const closeModal = useUIStore((s) => s.closeModal);
  const showToast = useUIStore((s) => s.showToast);
  const editingSnippetId = useUIStore((s) => s.editingSnippetId);

  const snippet = useLiveQuery(
    () => (editingSnippetId ? db.snippets.get(editingSnippetId) : undefined),
    [editingSnippetId]
  );
  const folders = useLiveQuery(() => db.folders.orderBy('sortOrder').toArray());

  const [type, setType] = useState<'text' | 'link'>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    if (snippet && !initialised) {
      setType(snippet.type);
      setTitle(snippet.title);
      setContent(snippet.content);
      setFolderId(snippet.folderId);
      setInitialised(true);
    }
  }, [snippet, initialised]);

  if (!editingSnippetId || snippet === undefined) {
    return null;
  }

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await db.snippets.update(editingSnippetId, {
        type,
        title: title.trim(),
        content: content.trim(),
        folderId,
        updatedAt: Date.now(),
      });
      showToast('Changes saved');
      closeModal();
    } catch {
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={closeModal}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Edit item</h2>
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
        </div>

        <div className={styles.fields}>
          <label className={styles.label}>
            Title
            <input
              className={styles.input}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </label>

          <label className={styles.label}>
            {type === 'link' ? 'URL' : 'Content'}
            <textarea
              className={styles.textarea}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
            />
          </label>

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
            disabled={!title.trim() || !content.trim() || saving}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
