import { useEffect, useRef, type PointerEvent } from 'react';
import { formatDay, useToday } from '../lib/date';
import type { Item } from '../lib/types';

interface Props {
  item: Item;
  accent: string;
  selectMode: boolean;
  selected: boolean;
  expanded: boolean;
  onToggleSelect: () => void;
  onToggleDone: () => void;
  onChange: (patch: Partial<Pick<Item, 'title' | 'notes' | 'dueAt'>>) => void;
  onDelete: () => void;
  onExpand: () => void;
  onEnter: () => void;
  dragging: boolean;
  onDragStart: (e: PointerEvent) => void;
  onNudge: (delta: number) => void;
}

export function ItemRow({
  item,
  accent,
  selectMode,
  selected,
  expanded,
  onToggleSelect,
  onToggleDone,
  onChange,
  onDelete,
  onExpand,
  onEnter,
  dragging,
  onDragStart,
  onNudge,
}: Props) {
  const notes = useRef<HTMLTextAreaElement>(null);
  const today = useToday();

  useEffect(() => {
    const el = notes.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [item.notes, expanded]);

  const overdue = !item.done && item.dueAt !== null && item.dueAt.slice(0, 10) < today;
  const showNotes = expanded || item.notes.length > 0;
  const showDue = expanded || item.dueAt !== null;

  return (
    <div
      className={`item${item.done ? ' done' : ''}${selected ? ' selected' : ''}${dragging ? ' dragging' : ''}`}
      data-item-id={item.id}
    >
      <button
        className={`circle${(selectMode ? selected : item.done) ? ' on' : ''}${selectMode ? ' select-box' : ''}`}
        style={{ color: selectMode ? 'var(--c-blue)' : accent }}
        aria-label={selectMode ? 'Select reminder' : item.done ? 'Mark as not completed' : 'Mark as completed'}
        aria-pressed={selectMode ? selected : item.done}
        onClick={selectMode ? onToggleSelect : onToggleDone}
      />

      <div className="item-body">
        <input
          className="item-title"
          value={item.title}
          onChange={(e) => onChange({ title: e.target.value })}
          onFocus={onExpand}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onEnter();
            }
            if (e.key === 'Backspace' && item.title === '' && item.notes === '') {
              e.preventDefault();
              onDelete();
            }
          }}
        />

        {showNotes && (
          <textarea
            ref={notes}
            className="item-notes"
            rows={1}
            placeholder="Notes"
            value={item.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            onFocus={onExpand}
          />
        )}

        {showDue && (
          <label className={`item-meta${overdue ? ' overdue' : ''}`}>
            <span aria-hidden="true">📅</span>
            {expanded ? (
              <input
                type="date"
                value={item.dueAt ? item.dueAt.slice(0, 10) : ''}
                onChange={(e) => onChange({ dueAt: e.target.value || null })}
              />
            ) : (
              <span>{formatDay(item.dueAt!, today)}</span>
            )}
          </label>
        )}
      </div>

      {!selectMode && (
        <>
          <button className="item-delete" aria-label="Delete reminder" onClick={onDelete}>
            ✕
          </button>
          <button
            className="drag-handle"
            aria-label={`Reorder ${item.title || 'reminder'}`}
            onPointerDown={onDragStart}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                onNudge(-1);
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                onNudge(1);
              }
            }}
          >
            <span aria-hidden="true">≡</span>
          </button>
        </>
      )}
    </div>
  );
}
