import { useMemo, useRef, useState } from 'react';
import { colorVar } from '../lib/colors';
import type { Item, List } from '../lib/types';
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
}: Props) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [draft, setDraft] = useState('');
  const addInput = useRef<HTMLInputElement>(null);

  const visible = useMemo(
    () => (showCompleted ? items : items.filter((i) => !i.done)),
    [items, showCompleted],
  );

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

      <div className="items">
        {visible.map((item) => (
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
            onDelete={() => onDeleteItems([item.id])}
            onExpand={() => setExpandedId(item.id)}
            onEnter={() => addInput.current?.focus()}
          />
        ))}

        {visible.length === 0 && (
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
              onClick={() => withSelection(onDeleteItems)}
            >
              Delete
            </button>
          </div>
        </div>
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
