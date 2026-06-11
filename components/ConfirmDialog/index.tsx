import { useUIStore } from '../../stores/useUIStore';
import styles from './ConfirmDialog.module.css';

export default function ConfirmDialog() {
  const dialog = useUIStore((s) => s.confirmDialog);
  const dismiss = useUIStore((s) => s.dismissConfirm);

  if (!dialog) return null;

  const handleConfirm = () => {
    dialog.onConfirm();
    dismiss();
  };

  return (
    <div className={styles.backdrop} onClick={dismiss}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{dialog.title}</h3>
        <p className={styles.message}>{dialog.message}</p>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={dismiss}>
            Cancel
          </button>
          <button
            className={`${styles.confirmBtn} ${dialog.dangerConfirm ? styles.danger : ''}`}
            onClick={handleConfirm}
          >
            {dialog.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
