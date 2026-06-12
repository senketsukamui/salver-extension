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
        <svg className={styles.logo} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="2" y="5"  width="7" height="17" rx="2" fill="currentColor"/>
          <rect x="2" y="5"  width="7" height="4"  rx="2" fill="currentColor" opacity="0.45"/>
          <rect x="13" y="10" width="7" height="12" rx="2" fill="currentColor" opacity="0.75"/>
          <rect x="24" y="14" width="6" height="8"  rx="2" fill="currentColor" opacity="0.5"/>
          <rect x="1"  y="22" width="30" height="3" rx="1.5" fill="currentColor"/>
        </svg>
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
