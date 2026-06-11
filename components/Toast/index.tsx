import { useUIStore } from '../../stores/useUIStore';
import styles from './Toast.module.css';

export default function Toast() {
  const toast = useUIStore((s) => s.toast);

  if (!toast) return null;

  return (
    <div className={`${styles.toast} ${toast.type === 'error' ? styles.error : styles.success}`}>
      {toast.type === 'success' ? '✓' : '✕'} {toast.message}
    </div>
  );
}
