import { useEffect, useState } from 'react';
import { Confirm } from './components/Confirm';
import { ImportSheet } from './components/ImportSheet';
import { ListDetail } from './components/ListDetail';
import { ListEditor } from './components/ListEditor';
import { ShareSheet } from './components/ShareSheet';
import { Sidebar } from './components/Sidebar';
import { clearHash, readHashImport } from './lib/share';
import { useStore } from './lib/store';
import type { ColorKey, ListExport } from './lib/types';

type Sheet =
  | { kind: 'none' }
  | { kind: 'new-list' }
  | { kind: 'edit-list' }
  | { kind: 'delete-list' }
  | { kind: 'export' }
  | { kind: 'import'; incoming?: ListExport | null };

export default function App() {
  const store = useStore();
  const { lists } = store.state;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<'sidebar' | 'detail'>('sidebar');
  // A share link lands here: offer it as an import rather than applying it silently.
  const [sheet, setSheet] = useState<Sheet>(() => {
    const incoming = readHashImport();
    return incoming ? { kind: 'import', incoming } : { kind: 'none' };
  });
  const [toast, setToast] = useState('');

  // Falls back to the first list, so deletes and a cold start both land somewhere valid.
  const active = lists.find((l) => l.id === activeId) ?? lists[0] ?? null;

  useEffect(clearHash, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const open = (id: string) => {
    setActiveId(id);
    setView('detail');
  };

  return (
    <div className="app" data-view={view}>
      <Sidebar
        lists={lists}
        activeId={activeId}
        openCount={store.openCount}
        onSelect={open}
        onNewList={() => setSheet({ kind: 'new-list' })}
        onImport={() => setSheet({ kind: 'import' })}
      />

      {active ? (
        <ListDetail
          key={active.id}
          list={active}
          items={store.itemsFor(active.id)}
          allLists={lists}
          onBack={() => setView('sidebar')}
          onRename={(name) => store.updateList(active.id, { name })}
          onEditList={() => setSheet({ kind: 'edit-list' })}
          onDeleteList={() => setSheet({ kind: 'delete-list' })}
          onExport={() => setSheet({ kind: 'export' })}
          onAddItem={(title) => store.addItem(active.id, title)}
          onUpdateItem={store.updateItem}
          onDeleteItems={store.deleteItems}
          onSetAllDone={(done) => store.setAllDone(active.id, done)}
          onSetDoneFor={store.setDoneFor}
          onMoveItems={store.moveItems}
        />
      ) : (
        <div className="pane pane-detail">
          <div className="empty" style={{ paddingTop: 120 }}>
            Create a list to get started.
          </div>
        </div>
      )}

      {sheet.kind === 'new-list' && (
        <ListEditor
          onCancel={() => setSheet({ kind: 'none' })}
          onSave={(name: string, color: ColorKey, icon: string) => {
            open(store.addList(name, color, icon));
            setSheet({ kind: 'none' });
          }}
        />
      )}

      {sheet.kind === 'edit-list' && active && (
        <ListEditor
          existing={active}
          onCancel={() => setSheet({ kind: 'none' })}
          onSave={(name: string, color: ColorKey, icon: string) => {
            store.updateList(active.id, { name, color, icon });
            setSheet({ kind: 'none' });
          }}
        />
      )}

      {sheet.kind === 'delete-list' && active && (
        <Confirm
          title={`Delete “${active.name}”?`}
          message="The list and every reminder in it are removed from this device."
          confirmLabel="Delete List"
          onCancel={() => setSheet({ kind: 'none' })}
          onConfirm={() => {
            store.deleteList(active.id);
            setSheet({ kind: 'none' });
            setView('sidebar');
          }}
        />
      )}

      {sheet.kind === 'export' && active && (
        <ShareSheet
          list={active}
          items={store.itemsFor(active.id)}
          onClose={() => setSheet({ kind: 'none' })}
          onToast={setToast}
        />
      )}

      {sheet.kind === 'import' && (
        <ImportSheet
          incoming={sheet.incoming}
          onClose={() => setSheet({ kind: 'none' })}
          onImport={(payload) => {
            open(store.importList(payload));
            setSheet({ kind: 'none' });
            setToast(`“${payload.list.name}” imported`);
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
