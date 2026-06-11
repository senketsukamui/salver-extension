import { useRef, useEffect, useState } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { exportSalver, downloadJson } from '../../lib/exportImport';
import ImportModal from '../ImportModal';
import styles from './Header.module.css';

export default function Header() {
  const setView = useUIStore((s) => s.setView);
  const headerMenuOpen = useUIStore((s) => s.headerMenuOpen);
  const setHeaderMenuOpen = useUIStore((s) => s.setHeaderMenuOpen);
  const showFolderModal = useUIStore((s) => s.showFolderModal);
  const showToast = useUIStore((s) => s.showToast);
  const menuRef = useRef<HTMLDivElement>(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    if (!headerMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setHeaderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [headerMenuOpen, setHeaderMenuOpen]);

  const handleNewFolder = () => {
    setHeaderMenuOpen(false);
    showFolderModal({ mode: 'create' });
  };

  const handleExport = async () => {
    setHeaderMenuOpen(false);
    try {
      const data = await exportSalver();
      downloadJson(data);
      showToast('Export downloaded');
    } catch {
      showToast('Export failed', 'error');
    }
  };

  const handleImport = () => {
    setHeaderMenuOpen(false);
    setImportOpen(true);
  };

  return (
    <>
      <header className={styles.header}>
        <span className={styles.title}>Salver</span>
        <div className={styles.actions}>
          <button className={styles.addBtn} onClick={() => setView('add')}>
            ＋ Add
          </button>
          <div className={styles.menuWrap} ref={menuRef}>
            <button
              className={styles.menuBtn}
              onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
              title="More options"
            >
              ⋯
            </button>
            {headerMenuOpen && (
              <div className={styles.dropdown}>
                <button className={styles.dropdownItem} onClick={handleNewFolder}>
                  New folder
                </button>
                <div className={styles.divider} />
                <button className={styles.dropdownItem} onClick={handleExport}>
                  Export…
                </button>
                <button className={styles.dropdownItem} onClick={handleImport}>
                  Import…
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
    </>
  );
}
