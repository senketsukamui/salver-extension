import { useUIStore } from '../../stores/useUIStore';
import { useAddSelectionListener } from '../../hooks/useAddSelectionListener';
import Header from '../../components/Header';
import AttachBanner from '../../components/AttachBanner';
import SearchBar from '../../components/SearchBar';
import FolderSelector from '../../components/FolderSelector';
import ItemList from '../../components/ItemList';
import AddItemModal from '../../components/AddItemModal';
import EditSnippetModal from '../../components/EditSnippetModal';
import FolderModal from '../../components/FolderModal';
import FolderDeleteModal from '../../components/FolderDeleteModal';
import MoveSnippetModal from '../../components/MoveSnippetModal';
import MoveFileModal from '../../components/MoveFileModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Toast from '../../components/Toast';
import styles from './App.module.css';

export default function App() {
  useAddSelectionListener();
  const view = useUIStore((s) => s.view);
  const toast = useUIStore((s) => s.toast);
  const folderModal = useUIStore((s) => s.folderModal);
  const folderDeleteModal = useUIStore((s) => s.folderDeleteModal);
  const movingSnippetId = useUIStore((s) => s.movingSnippetId);
  const movingFileId = useUIStore((s) => s.movingFileId);
  const confirmDialog = useUIStore((s) => s.confirmDialog);

  return (
    <div className={styles.app}>
      <Header />
      <AttachBanner />
      <SearchBar />
      <FolderSelector />
      <ItemList />

      {view === 'add' && <AddItemModal />}
      {view === 'edit' && <EditSnippetModal />}
      {folderModal !== null && <FolderModal />}
      {folderDeleteModal !== null && <FolderDeleteModal />}
      {movingSnippetId !== null && <MoveSnippetModal />}
      {movingFileId !== null && <MoveFileModal />}
      {confirmDialog !== null && <ConfirmDialog />}
      {toast !== null && <Toast />}
    </div>
  );
}
