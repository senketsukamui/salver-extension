import { useUIStore } from '../../stores/useUIStore';
import styles from './SearchBar.module.css';

export default function SearchBar() {
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);

  return (
    <div className={styles.wrap}>
      <span className={styles.icon}>🔎</span>
      <input
        className={styles.input}
        type="search"
        placeholder="Search…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {searchQuery && (
        <button className={styles.clear} onClick={() => setSearchQuery('')} title="Clear">
          ✕
        </button>
      )}
    </div>
  );
}
