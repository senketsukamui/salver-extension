import { useState } from 'react';
import { db, type Snippet } from '../../lib/db';
import { useUIStore } from '../../stores/useUIStore';
import { extractTokens, resolveTokens } from '../../lib/templates';
import styles from './TemplateModal.module.css';

interface Props {
  snippet: Snippet;
  onClose: () => void;
}

export default function TemplateModal({ snippet, onClose }: Props) {
  const showToast = useUIStore((s) => s.showToast);
  const tokens = extractTokens(snippet.content);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(tokens.map((t) => [t, '']))
  );

  const handleCopy = async () => {
    const resolved = resolveTokens(snippet.content, values);
    try {
      await navigator.clipboard.writeText(resolved);
      await db.snippets.update(snippet.id, {
        useCount: snippet.useCount + 1,
        lastUsedAt: Date.now(),
        updatedAt: Date.now(),
      });
      showToast('Copied to clipboard');
      onClose();
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  const allFilled = tokens.every((t) => values[t].trim() !== '');

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Fill in template</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <p className={styles.sub}>{snippet.title}</p>

        <div className={styles.fields}>
          {tokens.map((token) => (
            <label key={token} className={styles.label}>
              <span className={styles.tokenName}>{`{{${token}}}`}</span>
              <input
                className={styles.input}
                type="text"
                placeholder={token}
                value={values[token]}
                onChange={(e) => setValues((v) => ({ ...v, [token]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && allFilled) handleCopy();
                }}
                autoFocus={token === tokens[0]}
              />
            </label>
          ))}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.copyBtn}
            onClick={handleCopy}
            disabled={!allFilled}
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
