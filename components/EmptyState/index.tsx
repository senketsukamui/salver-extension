import { useUIStore } from '../../stores/useUIStore';
import styles from './EmptyState.module.css';

interface Props {
  hasFilter: boolean;
}

export default function EmptyState({ hasFilter }: Props) {
  const setView = useUIStore((s) => s.setView);

  if (hasFilter) {
    return (
      <div className={styles.wrap}>
        <p className={styles.message}>No items in this folder.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.icon}>📋</div>
      <p className={styles.heading}>Your salver is empty</p>
      <p className={styles.sub}>Save snippets and links for quick reuse.</p>
      <button className={styles.cta} onClick={() => setView('add')}>
        Add your first item
      </button>
    </div>
  );
}
