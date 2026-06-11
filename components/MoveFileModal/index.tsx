import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useUIStore } from '../../stores/useUIStore';
import styles from './MoveFileModal.module.css';

export default function MoveFileModal() {
  const movingFileId = useUIStore((s) => s.movingFileId);
  const closeModal = useUIStore((s) => s.closeModal);
  const showToast = useUIStore((s) => s.showToast);

  const file = useLiveQuery(
    () => (movingFileId ? db.fileMeta.get(movingFileId) : undefined),
    [movingFileId]
  );
  const folders = useLiveQuery(() => db.folders.orderBy('sortOrder').toArray());

  if (!movingFileId || !file) return null;

  const handleMove = async (targetFolderId: string | null) => {
    await db.fileMeta.update(movingFileId, {
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
        <p className={styles.sub}>"{file.name}"</p>
        <div className={styles.list}>
          <button
            className={`${styles.item} ${file.folderId === null ? styles.current : ''}`}
            onClick={() => handleMove(null)}
          >
            <span className={styles.itemIcon}>📥</span>
            <span>Unfiled</span>
            {file.folderId === null && <span className={styles.check}>✓</span>}
          </button>
          {(folders ?? []).map((folder) => (
            <button
              key={folder.id}
              className={`${styles.item} ${file.folderId === folder.id ? styles.current : ''}`}
              onClick={() => handleMove(folder.id)}
            >
              <span className={styles.itemIcon}>📁</span>
              <span>{folder.name}</span>
              {file.folderId === folder.id && <span className={styles.check}>✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
