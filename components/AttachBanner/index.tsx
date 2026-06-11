import { useAttachFlow } from '../../hooks/useAttachFlow';
import styles from './AttachBanner.module.css';

export default function AttachBanner() {
  const { attachState, cancelAttach } = useAttachFlow();

  if (!attachState) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.left}>
        <span className={styles.spinner} />
        <span className={styles.label}>
          Drag <strong>{attachState.fileName}</strong> from the chip on the page to a file field
        </span>
      </div>
      <button className={styles.cancelBtn} onClick={cancelAttach}>
        Cancel
      </button>
    </div>
  );
}
