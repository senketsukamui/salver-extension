import { useRef, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useUIStore, type FolderFilter } from '../../stores/useUIStore';
import styles from './FolderSelector.module.css';

interface FolderChipMenuProps {
  folderId: string;
  folderName: string;
  onClose: () => void;
}

function FolderChipMenu({ folderId, folderName, onClose }: FolderChipMenuProps) {
  const showFolderModal = useUIStore((s) => s.showFolderModal);
  const showFolderDeleteModal = useUIStore((s) => s.showFolderDeleteModal);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className={styles.chipMenu} ref={ref}>
      <button
        className={styles.chipMenuItem}
        onClick={() => {
          onClose();
          showFolderModal({ mode: 'rename', folderId, currentName: folderName });
        }}
      >
        Rename
      </button>
      <button
        className={`${styles.chipMenuItem} ${styles.danger}`}
        onClick={() => {
          onClose();
          showFolderDeleteModal({ folderId, folderName });
        }}
      >
        Delete
      </button>
    </div>
  );
}

export default function FolderSelector() {
  const activeFolderFilter = useUIStore((s) => s.activeFolderFilter);
  const setActiveFolderFilter = useUIStore((s) => s.setActiveFolderFilter);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const folders = useLiveQuery(() =>
    db.folders.orderBy('sortOrder').toArray()
  );

  const chips: { label: string; value: FolderFilter }[] = [
    { label: 'All', value: null },
    { label: 'Unfiled', value: 'unfiled' },
    ...(folders ?? []).map((f) => ({ label: f.name, value: f.id as FolderFilter })),
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.chips}>
        {chips.map((chip) => {
          const isFolder = chip.value !== null && chip.value !== 'unfiled';
          const isActive = activeFolderFilter === chip.value;

          return (
            <div key={chip.value ?? '__all'} className={styles.chipWrap}>
              <button
                className={`${styles.chip} ${isActive ? styles.active : ''}`}
                onClick={() => setActiveFolderFilter(chip.value)}
              >
                {chip.label}
              </button>
              {isFolder && (
                <div className={styles.chipMenuWrap}>
                  <button
                    className={styles.chipMenuTrigger}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === chip.value ? null : (chip.value as string));
                    }}
                    title="Folder options"
                  >
                    ⋯
                  </button>
                  {openMenuId === chip.value && (
                    <FolderChipMenu
                      folderId={chip.value as string}
                      folderName={chip.label}
                      onClose={() => setOpenMenuId(null)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
