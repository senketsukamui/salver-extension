import { useRef, useEffect, useState } from 'react';
import { db, type Snippet } from '../../lib/db';
import { useUIStore } from '../../stores/useUIStore';
import { extractTokens } from '../../lib/templates';
import TemplateModal from '../TemplateModal';
import styles from './SnippetRow.module.css';

interface Props {
  snippet: Snippet;
}

export default function SnippetRow({ snippet }: Props) {
  const showToast = useUIStore((s) => s.showToast);
  const openEditSnippet = useUIStore((s) => s.openEditSnippet);
  const openMoveSnippet = useUIStore((s) => s.openMoveSnippet);
  const showConfirm = useUIStore((s) => s.showConfirm);

  const [menuOpen, setMenuOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
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

  const hasTokens = extractTokens(snippet.content).length > 0;

  const handleCopy = async () => {
    if (hasTokens) {
      setTemplateOpen(true);
      return;
    }
    try {
      await navigator.clipboard.writeText(snippet.content);
      await db.snippets.update(snippet.id, {
        useCount: snippet.useCount + 1,
        lastUsedAt: Date.now(),
        updatedAt: Date.now(),
      });
      showToast('Copied to clipboard');
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  const handleDelete = () => {
    setMenuOpen(false);
    showConfirm({
      title: 'Delete snippet',
      message: `Delete "${snippet.title}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      dangerConfirm: true,
      onConfirm: async () => {
        await db.snippets.delete(snippet.id);
        showToast('Snippet deleted');
      },
    });
  };

  const icon = snippet.type === 'link' ? '🔗' : hasTokens ? '📝' : '✏️';

  return (
    <>
      <div className={styles.row}>
        <div className={styles.content}>
          <div className={styles.titleRow}>
            <span className={styles.icon}>{icon}</span>
            <span className={styles.title}>{snippet.title}</span>
            {hasTokens && <span className={styles.templateBadge}>template</span>}
          </div>
          {snippet.content && (
            <p className={styles.preview}>{snippet.content}</p>
          )}
        </div>
        <div className={styles.actions}>
          <button className={styles.copyBtn} onClick={handleCopy}>
            Copy
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
                  onClick={() => { setMenuOpen(false); openEditSnippet(snippet.id); }}
                >
                  Edit
                </button>
                <button
                  className={styles.dropdownItem}
                  onClick={() => { setMenuOpen(false); openMoveSnippet(snippet.id); }}
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

      {templateOpen && (
        <TemplateModal snippet={snippet} onClose={() => setTemplateOpen(false)} />
      )}
    </>
  );
}
