import { useEffect, useState } from 'react';
import { Confirm } from './components/Confirm';
import { ImportSheet } from './components/ImportSheet';
import { ListDetail } from './components/ListDetail';
import { ListEditor } from './components/ListEditor';
import { ShareSheet } from './components/ShareSheet';
import { Sidebar } from './components/Sidebar';
import { clearHash, fetchSharedList, readHashImport, readHashImportName } from './lib/share';
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
  const [sheet, setSheet] = useState<Sheet>({ kind: 'none' });
  const [toast, setToast] = useState('');

  // Falls back to the first list, so deletes and a cold start both land somewhere valid.
  const active = lists.find((l) => l.id === activeId) ?? lists[0] ?? null;

  // A share link is offered as an import rather than applied silently. Two hash
  // forms reach us: `#list=` carries the whole list, `#import=` names one hosted
  // next to the app so the link stays short enough to tap. Both run on
  // hashchange too, since a link opened while the app is already running never
  // remounts it. This is the only place the hash is read or cleared — clearing
  // it anywhere else races this handler.
  useEffect(() => {
    const handle = async () => {
      const incoming = readHashImport();
      if (incoming) {
        setSheet({ kind: 'import', incoming });
        clearHash();
        return;
      }
      const name = readHashImportName();
      if (!name) return;
      clearHash();
      const fetched = await fetchSharedList(name);
      if (fetched) setSheet({ kind: 'import', incoming: fetched });
      else setToast('That shared list could not be loaded');
    };
    void handle();
    const onHashChange = () => void handle();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

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
          lists={lists}
          incoming={sheet.incoming}
          onClose={() => setSheet({ kind: 'none' })}
          onImport={(payload) => {
            open(store.importList(payload));
            setSheet({ kind: 'none' });
            setToast(`“${payload.list.name}” imported`);
          }}
          onMerge={(listId, payload) => {
            store.mergeIntoList(listId, payload);
            open(listId);
            setSheet({ kind: 'none' });
            setToast(`${payload.items.length} added`);
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
