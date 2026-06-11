import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Snippet, type FileMeta } from '../../lib/db';
import { useUIStore } from '../../stores/useUIStore';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import SnippetRow from '../SnippetRow';
import FileRow from '../FileRow';
import EmptyState from '../EmptyState';
import styles from './ItemList.module.css';

type ListItem =
  | { kind: 'snippet'; data: Snippet }
  | { kind: 'file'; data: FileMeta };

export default function ItemList() {
  const activeFolderFilter = useUIStore((s) => s.activeFolderFilter);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const debouncedQuery = useDebouncedValue(searchQuery, 150);

  const items = useLiveQuery(async (): Promise<ListItem[]> => {
    const q = debouncedQuery.trim().toLowerCase();

    const [snippets, files] = await Promise.all([
      activeFolderFilter === null
        ? db.snippets.orderBy('sortOrder').toArray()
        : activeFolderFilter === 'unfiled'
          ? db.snippets.filter((s) => s.folderId === null).sortBy('sortOrder')
          : db.snippets.where('folderId').equals(activeFolderFilter).sortBy('sortOrder'),

      activeFolderFilter === null
        ? db.fileMeta.orderBy('sortOrder').toArray()
        : activeFolderFilter === 'unfiled'
          ? db.fileMeta.filter((f) => f.folderId === null).sortBy('sortOrder')
          : db.fileMeta.where('folderId').equals(activeFolderFilter).sortBy('sortOrder'),
    ]);

    let merged: ListItem[] = [
      ...snippets.map((s): ListItem => ({ kind: 'snippet', data: s })),
      ...files.map((f): ListItem => ({ kind: 'file', data: f })),
    ];

    if (q) {
      merged = merged.filter((item) =>
        item.kind === 'snippet'
          ? item.data.title.toLowerCase().includes(q) || item.data.content.toLowerCase().includes(q)
          : item.data.name.toLowerCase().includes(q)
      );
    }

    merged.sort((a, b) => a.data.sortOrder - b.data.sortOrder);
    return merged;
  }, [activeFolderFilter, debouncedQuery]);

  if (items === undefined) {
    return <div className={styles.loading}>Loading…</div>;
  }

  if (items.length === 0) {
    return <EmptyState hasFilter={activeFolderFilter !== null || debouncedQuery !== ''} />;
  }

  return (
    <div className={styles.list}>
      {items.map((item) =>
        item.kind === 'snippet'
          ? <SnippetRow key={item.data.id} snippet={item.data} />
          : <FileRow key={item.data.id} file={item.data} />
      )}
    </div>
  );
}
