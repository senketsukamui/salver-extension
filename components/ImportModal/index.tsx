import { useState, useRef } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import {
  validateExport, dryRunImport, commitImport,
  type SalverExport, type DryRunResult,
} from '../../lib/exportImport';
import styles from './ImportModal.module.css';

interface Props { onClose: () => void }

type Phase = 'pick' | 'preview' | 'importing' | 'done';

export default function ImportModal({ onClose }: Props) {
  const showToast = useUIStore((s) => s.showToast);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase]       = useState<Phase>('pick');
  const [error, setError]       = useState<string | null>(null);
  const [parsed, setParsed]     = useState<SalverExport | null>(null);
  const [dryRun, setDryRun]     = useState<DryRunResult | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      const raw = JSON.parse(text) as unknown;
      const data = validateExport(raw);
      const summary = await dryRunImport(data);
      setParsed(data);
      setDryRun(summary);
      setPhase('preview');
    } catch (e) {
      setError((e as Error).message ?? 'Could not read file.');
    }
  };

  const handleImport = async () => {
    if (!parsed) return;
    setPhase('importing');
    try {
      await commitImport(parsed);
      setPhase('done');
      showToast('Import complete');
    } catch (e) {
      setError((e as Error).message ?? 'Import failed.');
      setPhase('preview');
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Import from file</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {phase === 'pick' && (
          <div className={styles.body}>
            {error && <p className={styles.error}>{error}</p>}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className={styles.hiddenInput}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <button className={styles.browseBtn} onClick={() => fileInputRef.current?.click()}>
              Choose .json file
            </button>
          </div>
        )}

        {phase === 'preview' && dryRun && (
          <div className={styles.body}>
            {error && <p className={styles.error}>{error}</p>}
            <p className={styles.previewHeading}>This import will:</p>
            <ul className={styles.previewList}>
              {dryRun.foldersAdded > 0 && (
                <li className={styles.add}>Add {dryRun.foldersAdded} folder{dryRun.foldersAdded > 1 ? 's' : ''}</li>
              )}
              {dryRun.foldersSkipped > 0 && (
                <li className={styles.skip}>Skip {dryRun.foldersSkipped} existing folder{dryRun.foldersSkipped > 1 ? 's' : ''}</li>
              )}
              {dryRun.snippetsAdded > 0 && (
                <li className={styles.add}>Add {dryRun.snippetsAdded} snippet{dryRun.snippetsAdded > 1 ? 's' : ''}</li>
              )}
              {dryRun.snippetsSkipped > 0 && (
                <li className={styles.skip}>Skip {dryRun.snippetsSkipped} existing snippet{dryRun.snippetsSkipped > 1 ? 's' : ''}</li>
              )}
              {dryRun.filesAdded > 0 && (
                <li className={styles.add}>Add {dryRun.filesAdded} file{dryRun.filesAdded > 1 ? 's' : ''}</li>
              )}
              {dryRun.filesSkipped > 0 && (
                <li className={styles.skip}>Skip {dryRun.filesSkipped} existing file{dryRun.filesSkipped > 1 ? 's' : ''}</li>
              )}
              {dryRun.foldersAdded + dryRun.snippetsAdded + dryRun.filesAdded === 0 && (
                <li className={styles.skip}>Nothing new to import</li>
              )}
            </ul>
            {dryRun.warnings.map((w, i) => (
              <p key={i} className={styles.warning}>⚠ {w}</p>
            ))}
            <div className={styles.actions}>
              <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
              <button
                className={styles.importBtn}
                onClick={handleImport}
                disabled={dryRun.foldersAdded + dryRun.snippetsAdded + dryRun.filesAdded === 0}
              >
                Import
              </button>
            </div>
          </div>
        )}

        {phase === 'importing' && (
          <div className={styles.body}>
            <p className={styles.importing}>Importing…</p>
          </div>
        )}

        {phase === 'done' && (
          <div className={styles.body}>
            <p className={styles.done}>✓ Import complete</p>
            <button className={styles.importBtn} onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
