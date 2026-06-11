import { useRef, useEffect, useState } from 'react';
import { db, type FileMeta } from '../../lib/db';
import { useUIStore } from '../../stores/useUIStore';
import { useAttachFlow } from '../../hooks/useAttachFlow';
import { fileIcon, formatBytes } from '../../lib/utils';
import styles from './FileRow.module.css';

interface Props {
  file: FileMeta;
}

export default function FileRow({ file }: Props) {
  const showConfirm = useUIStore((s) => s.showConfirm);
  const showToast   = useUIStore((s) => s.showToast);
  const openMoveFile = useUIStore((s) => s.openMoveFile);
  const attachState  = useUIStore((s) => s.attachState);
  const { startAttach } = useAttachFlow();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleAttach = () => {
    if (attachState) return; // another attach in progress
    startAttach(file.id, file.name, file.mimeType);
  };

  const handleDelete = () => {
    setMenuOpen(false);
    showConfirm({
      title: 'Delete file',
      message: `Delete "${file.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      dangerConfirm: true,
      onConfirm: async () => {
        await db.transaction('rw', db.fileMeta, db.fileBlobs, async () => {
          await db.fileMeta.delete(file.id);
          await db.fileBlobs.delete(file.id);
        });
        showToast('File deleted');
      },
    });
  };

  const isAttachingThis = attachState?.fileId === file.id;
  const attachBusy = attachState !== null;

  return (
    <div className={styles.row}>
      <div className={styles.content}>
        <div className={styles.titleRow}>
          <span className={styles.icon}>{fileIcon(file.mimeType)}</span>
          <span className={styles.name}>{file.name}</span>
        </div>
        <span className={styles.size}>{formatBytes(file.size)}</span>
      </div>
      <div className={styles.actions}>
        <button
          className={`${styles.attachBtn} ${isAttachingThis ? styles.attaching : ''}`}
          onClick={handleAttach}
          disabled={attachBusy}
          title={attachBusy && !isAttachingThis ? 'Another attach in progress' : 'Attach to page'}
        >
          {isAttachingThis ? '⌛' : 'Attach'}
        </button>
        <div className={styles.menuWrap} ref={menuRef}>
          <button
            className={styles.menuBtn}
            onClick={() => setMenuOpen(!menuOpen)}
            title="More options"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className={styles.dropdown}>
              <button
                className={styles.dropdownItem}
                onClick={() => { setMenuOpen(false); openMoveFile(file.id); }}
              >
                Move to folder
              </button>
              <div className={styles.divider} />
              <button
                className={`${styles.dropdownItem} ${styles.danger}`}
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
