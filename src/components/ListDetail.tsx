import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { colorVar } from '../lib/colors';
import type { Item, List } from '../lib/types';
import { Confirm } from './Confirm';
import { ItemRow } from './ItemRow';
import { Menu } from './Menu';

interface Props {
  list: List;
  items: Item[];
  allLists: List[];
  onBack: () => void;
  onRename: (name: string) => void;
  onEditList: () => void;
  onDeleteList: () => void;
  onExport: () => void;
  onAddItem: (title: string) => string | null;
  onUpdateItem: (id: string, patch: Partial<Pick<Item, 'title' | 'notes' | 'dueAt' | 'done'>>) => void;
  onDeleteItems: (ids: string[]) => void;
  onSetAllDone: (done: boolean) => void;
  onSetDoneFor: (ids: string[], done: boolean) => void;
  onMoveItems: (ids: string[], listId: string) => void;
  onReorder: (idsInOrder: string[]) => void;
}

function deleteTitle(items: Item[], ids: string[]): string {
  if (ids.length > 1) return `Delete ${ids.length} reminders?`;
  const title = items.find((i) => i.id === ids[0])?.title.trim() ?? '';
  if (!title) return 'Delete this reminder?';
  const short = title.length > 44 ? `${title.slice(0, 44).trimEnd()}…` : title;
  return `Delete “${short}”?`;
}

export function ListDetail({
  list,
  items,
  allLists,
  onBack,
  onRename,
  onEditList,
  onDeleteList,
  onExport,
  onAddItem,
  onUpdateItem,
  onDeleteItems,
  onSetAllDone,
  onSetDoneFor,
  onMoveItems,
  onReorder,
}: Props) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [draft, setDraft] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);
  const [preview, setPreview] = useState<string[] | null>(null);
  const addInput = useRef<HTMLInputElement>(null);
  const rows = useRef<HTMLDivElement>(null);

  const visible = useMemo(
    () => (showCompleted ? items : items.filter((i) => !i.done)),
    [items, showCompleted],
  );

  // While a drag is in flight the preview order drives the list; the store is
  // only written once the pointer is released.
  const shown = useMemo(() => {
    if (!preview) return visible;
    const byId = new Map(visible.map((i) => [i.id, i]));
    const ordered = preview.map((id) => byId.get(id)).filter((i) => i !== undefined);
    return ordered.length === visible.length ? ordered : visible;
  }, [preview, visible]);

  const startDrag = (id: string, event: ReactPointerEvent) => {
    if (selectMode) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragId(id);
    setPreview(visible.map((i) => i.id));
  };

  const moveDrag = (event: ReactPointerEvent) => {
    if (!dragId || !preview || !rows.current) return;
    const elements = Array.from(rows.current.querySelectorAll<HTMLElement>('[data-item-id]'));
    let target = elements.length - 1;
    for (let i = 0; i < elements.length; i++) {
      const box = elements[i].getBoundingClientRect();
      if (event.clientY < box.top + box.height / 2) {
        target = i;
        break;
      }
    }
    const from = preview.indexOf(dragId);
    if (from === -1 || from === target) return;
    const next = [...preview];
    next.splice(from, 1);
    next.splice(target, 0, dragId);
    setPreview(next);
  };

  const endDrag = () => {
    if (dragId && preview) onReorder(preview);
    setDragId(null);
    setPreview(null);
  };

  const nudge = (id: string, delta: number) => {
    const ids = visible.map((i) => i.id);
    const from = ids.indexOf(id);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= ids.length) return;
    ids.splice(from, 1);
    ids.splice(to, 0, id);
    onReorder(ids);
  };

  const requestDelete = (ids: string[]) => {
    if (!ids.length) return;
    const targets = items.filter((i) => ids.includes(i.id));
    // Backspacing an empty reminder away loses nothing, so it needs no prompt.
    if (targets.every((i) => !i.title.trim() && !i.notes.trim())) {
      onDeleteItems(ids);
      if (selectMode) exitSelect();
      return;
    }
    setPendingDelete(ids);
  };

  const openCount = items.filter((i) => !i.done).length;
  const doneCount = items.length - openCount;
  const selectedSet = new Set(selected);
  const allVisibleSelected = visible.length > 0 && visible.every((i) => selectedSet.has(i.id));

  const commitDraft = () => {
    const id = onAddItem(draft);
    setDraft('');
    if (id) setExpandedId(null);
    addInput.current?.focus();
  };

  const exitSelect = () => {
    setSelectMode(false);
    setSelected([]);
  };

  const withSelection = (fn: (ids: string[]) => void) => {
    if (!selected.length) return;
    fn(selected);
    exitSelect();
  };

  return (
    <div className="pane pane-detail">
      <div className="detail-top">
        <button className="back-button" onClick={onBack}>
          <span aria-hidden="true">‹</span> Lists
        </button>
        <span style={{ flex: 1 }} />

        {selectMode ? (
          <button className="text-button" onClick={exitSelect}>
            Done
          </button>
        ) : (
          <Menu label="List options">
            {(close) => (
              <>
                <button
                  onClick={() => {
                    setShowCompleted((v) => !v);
                    close();
                  }}
                >
                  {showCompleted ? 'Hide Completed' : 'Show Completed'}
                  <span style={{ color: 'var(--text-secondary)' }}>{doneCount || ''}</span>
                </button>
                <button
                  disabled={items.length === 0}
                  onClick={() => {
                    setSelectMode(true);
                    close();
                  }}
                >
                  Select Reminders
                </button>
                <div className="menu-sep" />
                <button
                  disabled={openCount === 0}
                  onClick={() => {
                    onSetAllDone(true);
                    close();
                  }}
                >
                  Mark All as Completed
                </button>
                <button
                  disabled={doneCount === 0}
                  onClick={() => {
                    onSetAllDone(false);
                    setShowCompleted(true);
                    close();
                  }}
                >
                  Mark All as Incomplete
                </button>
                <div className="menu-sep" />
                <button
                  onClick={() => {
                    onExport();
                    close();
                  }}
                >
                  Export List…
                </button>
                <button
                  onClick={() => {
                    onEditList();
                    close();
                  }}
                >
                  List Info…
                </button>
                <div className="menu-sep" />
                <button
                  className="danger"
                  onClick={() => {
                    onDeleteList();
                    close();
                  }}
                >
                  Delete List
                </button>
              </>
            )}
          </Menu>
        )}
      </div>

      <div className="detail-head">
        <span className="badge badge-lg" style={{ background: colorVar(list.color) }}>
          {list.icon}
        </span>
        <input
          className="detail-title"
          value={list.name}
          aria-label="List name"
          onChange={(e) => onRename(e.target.value)}
          onBlur={(e) => {
            if (!e.target.value.trim()) onRename('Untitled List');
          }}
        />
      </div>
      <div className="detail-sub">
        {openCount} remaining
        {doneCount > 0 && ` · ${doneCount} completed`}
      </div>

      <div
        className="items"
        ref={rows}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {shown.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            accent={colorVar(list.color)}
            selectMode={selectMode}
            selected={selectedSet.has(item.id)}
            expanded={expandedId === item.id && !selectMode}
            onToggleSelect={() =>
              setSelected((prev) =>
                prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id],
              )
            }
            onToggleDone={() => onUpdateItem(item.id, { done: !item.done })}
            onChange={(patch) => onUpdateItem(item.id, patch)}
            onDelete={() => requestDelete([item.id])}
            onExpand={() => setExpandedId(item.id)}
            onEnter={() => addInput.current?.focus()}
            dragging={dragId === item.id}
            onDragStart={(e) => startDrag(item.id, e)}
            onNudge={(delta) => nudge(item.id, delta)}
          />
        ))}

        {shown.length === 0 && (
          <div className="empty">
            {items.length === 0
              ? 'No reminders yet. Add one below.'
              : 'All done. Everything here is completed.'}
          </div>
        )}

        {!selectMode && (
          <div className="add-row">
            <span className="circle" style={{ color: colorVar(list.color) }} aria-hidden="true" />
            <input
              ref={addInput}
              className="add-input"
              placeholder="Add a reminder"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitDraft();
                if (e.key === 'Escape') setDraft('');
              }}
              onBlur={() => draft.trim() && commitDraft()}
            />
          </div>
        )}
      </div>

      {selectMode && (
        <div className="toolbar">
          <div className="toolbar-group">
            <button
              className="text-button"
              disabled={visible.length === 0}
              onClick={() =>
                setSelected(allVisibleSelected ? [] : visible.map((i) => i.id))
              }
            >
              {allVisibleSelected ? 'Deselect All' : 'Select All'}
            </button>
            <span style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
              {selected.length} selected
            </span>
          </div>

          <div className="toolbar-group">
            <button
              className="text-button"
              disabled={!selected.length}
              onClick={() => withSelection((ids) => onSetDoneFor(ids, true))}
            >
              Complete
            </button>
            <button
              className="text-button"
              disabled={!selected.length}
              onClick={() => withSelection((ids) => onSetDoneFor(ids, false))}
            >
              Uncomplete
            </button>
            <button
              className="text-button"
              disabled={!selected.length || allLists.length < 2}
              onClick={() => setMoving(true)}
            >
              Move…
            </button>
            <button
              className="text-button danger"
              disabled={!selected.length}
              onClick={() => requestDelete(selected)}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {pendingDelete && (
        <Confirm
          title={deleteTitle(items, pendingDelete)}
          message={
            pendingDelete.length === 1
              ? 'This reminder is removed from the list.'
              : 'They are removed from the list.'
          }
          confirmLabel={pendingDelete.length === 1 ? 'Delete' : `Delete ${pendingDelete.length}`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            onDeleteItems(pendingDelete);
            setPendingDelete(null);
            if (selectMode) exitSelect();
          }}
        />
      )}

      {moving && (
        <div className="scrim" onClick={() => setMoving(false)}>
          <div className="sheet" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <h2>Move {selected.length}</h2>
            <p className="hint">Pick the destination list.</p>
            <div className="list-card">
              {allLists
                .filter((l) => l.id !== list.id)
                .map((target) => (
                  <button
                    key={target.id}
                    className="list-row"
                    onClick={() => {
                      onMoveItems(selected, target.id);
                      setMoving(false);
                      exitSelect();
                    }}
                  >
                    <span className="badge" style={{ background: colorVar(target.color) }}>
                      {target.icon}
                    </span>
                    <span className="list-row-name">{target.name}</span>
                  </button>
                ))}
            </div>
            <div className="sheet-actions">
              <button className="btn" onClick={() => setMoving(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
