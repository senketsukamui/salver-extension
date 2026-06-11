import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useUIStore } from '../../stores/useUIStore';
import styles from './FolderDeleteModal.module.css';

export default function FolderDeleteModal() {
  const folderDeleteModal = useUIStore((s) => s.folderDeleteModal);
  const dismiss = useUIStore((s) => s.dismissFolderDeleteModal);
  const showToast = useUIStore((s) => s.showToast);
  const setActiveFolderFilter = useUIStore((s) => s.setActiveFolderFilter);

  const counts = useLiveQuery(
    async () => {
      if (!folderDeleteModal) return { snippets: 0, files: 0 };
      const [snippets, files] = await Promise.all([
        db.snippets.where('folderId').equals(folderDeleteModal.folderId).count(),
        db.fileMeta.where('folderId').equals(folderDeleteModal.folderId).count(),
      ]);
      return { snippets, files };
    },
    [folderDeleteModal?.folderId]
  );

  if (!folderDeleteModal) return null;

  const { folderId, folderName } = folderDeleteModal;
  const totalCount = (counts?.snippets ?? 0) + (counts?.files ?? 0);

  const deleteFolder = async (unfileItems: boolean) => {
    await db.transaction('rw', db.folders, db.snippets, db.fileMeta, db.fileBlobs, async () => {
      if (unfileItems) {
        await db.snippets
          .where('folderId').equals(folderId)
          .modify({ folderId: null, updatedAt: Date.now() });
        await db.fileMeta
          .where('folderId').equals(folderId)
          .modify({ folderId: null, updatedAt: Date.now() });
      } else {
        await db.snippets.where('folderId').equals(folderId).delete();
        const fileIds = await db.fileMeta
          .where('folderId').equals(folderId)
          .primaryKeys();
        await db.fileMeta.bulkDelete(fileIds);
        await db.fileBlobs.bulkDelete(fileIds);
      }
      await db.folders.delete(folderId);
    });
    setActiveFolderFilter(null);
    showToast(`Folder "${folderName}" deleted`);
    dismiss();
  };

  return (
    <div className={styles.backdrop} onClick={dismiss}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Delete "{folderName}"?</h3>
        {totalCount > 0 ? (
          <>
            <p className={styles.message}>
              This folder contains {totalCount} {totalCount === 1 ? 'item' : 'items'}. What should
              happen to them?
            </p>
            <div className={styles.actions}>
              <button className={styles.cancelBtn} onClick={dismiss}>
                Cancel
              </button>
              <button className={styles.unfileBtn} onClick={() => deleteFolder(true)}>
                Move to Unfiled
              </button>
              <button className={styles.deleteBtn} onClick={() => deleteFolder(false)}>
                Delete all
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.message}>This folder is empty. Delete it?</p>
            <div className={styles.actions}>
              <button className={styles.cancelBtn} onClick={dismiss}>
                Cancel
              </button>
              <button className={styles.deleteBtn} onClick={() => deleteFolder(false)}>
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
