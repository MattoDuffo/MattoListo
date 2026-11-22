import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
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
  /** Whether the row is swiped open to show its Delete button. */
  swiped: boolean;
  onSwipe: (open: boolean) => void;
}

/** Width of the red Delete button revealed by a left swipe. */
const ACTION_WIDTH = 88;
/** Movement (px) before a press counts as a swipe rather than a tap. */
const SLOP = 10;

interface Gesture {
  pointerId: number;
  x: number;
  y: number;
  base: number;
  active: boolean;
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
  swiped,
  onSwipe,
}: Props) {
  const notes = useRef<HTMLTextAreaElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const offsetRef = useRef(0);
  const swallowClick = useRef(false);
  // Live offset while a finger is moving the row; null when at rest.
  const [liveOffset, setLiveOffset] = useState<number | null>(null);
  const offset = liveOffset ?? (swiped ? -ACTION_WIDTH : 0);

  // Any press outside an open row closes it.
  useEffect(() => {
    if (!swiped) return;
    const close = (e: Event) => {
      if (!wrap.current?.contains(e.target as Node)) onSwipe(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [swiped, onSwipe]);

  const pointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (selectMode || dragging || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if ((e.target as HTMLElement).closest('.drag-handle')) return;
    gesture.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      base: swiped ? -ACTION_WIDTH : 0,
      active: false,
    };
  };

  const pointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.active) {
      // A mostly vertical move is a scroll: let the page have it.
      if (Math.abs(dy) > SLOP && Math.abs(dy) > Math.abs(dx)) {
        gesture.current = null;
        return;
      }
      if (Math.abs(dx) < SLOP) return;
      g.active = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      window.getSelection()?.removeAllRanges();
    }
    const next = Math.min(0, Math.max(-ACTION_WIDTH * 1.4, g.base + dx));
    offsetRef.current = next;
    setLiveOffset(next);
  };

  const pointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    gesture.current = null;
    if (!g.active) return;
    swallowClick.current = true;
    setLiveOffset(null);
    onSwipe(offsetRef.current < -ACTION_WIDTH / 2);
  };

  const clickCapture = (e: MouseEvent) => {
    // The click that ends a swipe, or a tap on an open row, only settles the
    // row; it must not toggle, focus or select anything.
    if (swallowClick.current || swiped) {
      swallowClick.current = false;
      e.preventDefault();
      e.stopPropagation();
      if (swiped) onSwipe(false);
    }
  };
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
      ref={wrap}
      className={`item-wrap${offset < 0 ? ' revealed' : ''}${dragging ? ' dragging' : ''}`}
      data-item-id={item.id}
    >
      {offset < 0 && (
        <button
          className="swipe-delete"
          style={{ width: Math.max(ACTION_WIDTH, -offset) }}
          onClick={() => {
            onSwipe(false);
            onDelete();
          }}
        >
          Delete
        </button>
      )}

      <div
        className={`item${item.done ? ' done' : ''}${selected ? ' selected' : ''}${dragging ? ' dragging' : ''}${liveOffset === null ? ' settled' : ''}`}
        style={offset ? { transform: `translateX(${offset}px)` } : undefined}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerEnd}
        onPointerCancel={pointerEnd}
        onClickCapture={clickCapture}
      >
        <button
          className="check"
          style={{ color: selectMode ? 'var(--c-blue)' : accent }}
          aria-label={selectMode ? 'Select reminder' : item.done ? 'Mark as not completed' : 'Mark as completed'}
          aria-pressed={selectMode ? selected : item.done}
          // Keep focus (and the on-screen keyboard) where it is, so the layout
          // does not jump under the finger and swallow the tap.
          onMouseDown={(e) => e.preventDefault()}
          onClick={selectMode ? onToggleSelect : onToggleDone}
        >
          <span
            className={`circle${(selectMode ? selected : item.done) ? ' on' : ''}${selectMode ? ' select-box' : ''}`}
            aria-hidden="true"
          />
        </button>

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
        )}
      </div>
    </div>
  );
}
