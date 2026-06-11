import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useUIStore } from '../../stores/useUIStore';
import styles from './MoveSnippetModal.module.css';

export default function MoveSnippetModal() {
  const movingSnippetId = useUIStore((s) => s.movingSnippetId);
  const closeModal = useUIStore((s) => s.closeModal);
  const showToast = useUIStore((s) => s.showToast);

  const snippet = useLiveQuery(
    () => (movingSnippetId ? db.snippets.get(movingSnippetId) : undefined),
    [movingSnippetId]
  );
  const folders = useLiveQuery(() => db.folders.orderBy('sortOrder').toArray());

  if (!movingSnippetId || !snippet) return null;

  const handleMove = async (targetFolderId: string | null) => {
    await db.snippets.update(movingSnippetId, {
      folderId: targetFolderId,
      updatedAt: Date.now(),
    });
    showToast('Moved');
    closeModal();
  };

  return (
    <div className={styles.backdrop} onClick={closeModal}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Move to folder</h3>
          <button className={styles.closeBtn} onClick={closeModal}>✕</button>
        </div>
        <p className={styles.sub}>"{snippet.title}"</p>
        <div className={styles.list}>
          <button
            className={`${styles.item} ${snippet.folderId === null ? styles.current : ''}`}
            onClick={() => handleMove(null)}
          >
            <span className={styles.itemIcon}>📥</span>
            <span>Unfiled</span>
            {snippet.folderId === null && <span className={styles.check}>✓</span>}
          </button>
          {(folders ?? []).map((folder) => (
            <button
              key={folder.id}
              className={`${styles.item} ${snippet.folderId === folder.id ? styles.current : ''}`}
              onClick={() => handleMove(folder.id)}
            >
              <span className={styles.itemIcon}>📁</span>
              <span>{folder.name}</span>
              {snippet.folderId === folder.id && <span className={styles.check}>✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
