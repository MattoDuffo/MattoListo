import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppState, ColorKey, Item, List, ListExport } from './types';

const STORAGE_KEY = 'mattolisto.v1';

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function seed(): AppState {
  const now = Date.now();
  const list: List = {
    id: uid(),
    name: 'Reminders',
    color: 'blue',
    icon: '☰',
    createdAt: now,
    order: 0,
  };
  return { lists: [list], items: [] };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (!Array.isArray(parsed.lists) || !Array.isArray(parsed.items)) return seed();
    return { lists: parsed.lists, items: parsed.items };
  } catch {
    return seed();
  }
}

function save(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: keep running in memory */
  }
}

function nextOrder(rows: Array<{ order: number }>): number {
  return rows.reduce((max, r) => Math.max(max, r.order), -1) + 1;
}

function itemsFromExport(payload: ListExport, listId: string, startOrder: number): Item[] {
  const now = Date.now();
  return payload.items.map((raw, idx) => ({
    id: uid(),
    listId,
    title: raw.title,
    notes: raw.notes ?? '',
    done: Boolean(raw.done),
    dueAt: raw.dueAt ?? null,
    createdAt: now + idx,
    completedAt: raw.done ? now : null,
    order: startOrder + idx,
  }));
}

export function useStore() {
  const [state, setState] = useState<AppState>(load);

  useEffect(() => {
    save(state);
  }, [state]);

  const api = useMemo(() => {
    const addList = (name: string, color: ColorKey, icon: string): string => {
      const id = uid();
      setState((s) => ({
        ...s,
        lists: [
          ...s.lists,
          { id, name: name.trim() || 'New List', color, icon, createdAt: Date.now(), order: nextOrder(s.lists) },
        ],
      }));
      return id;
    };

    const updateList = (id: string, patch: Partial<Pick<List, 'name' | 'color' | 'icon'>>) =>
      setState((s) => ({
        ...s,
        lists: s.lists.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      }));

    const deleteList = (id: string) =>
      setState((s) => ({
        lists: s.lists.filter((l) => l.id !== id),
        items: s.items.filter((i) => i.listId !== id),
      }));

    const addItem = (listId: string, title: string): string | null => {
      const clean = title.trim();
      if (!clean) return null;
      const id = uid();
      setState((s) => ({
        ...s,
        items: [
          ...s.items,
          {
            id,
            listId,
            title: clean,
            notes: '',
            done: false,
            dueAt: null,
            createdAt: Date.now(),
            completedAt: null,
            order: nextOrder(s.items.filter((i) => i.listId === listId)),
          },
        ],
      }));
      return id;
    };

    const updateItem = (id: string, patch: Partial<Pick<Item, 'title' | 'notes' | 'dueAt' | 'done'>>) =>
      setState((s) => ({
        ...s,
        items: s.items.map((i) => {
          if (i.id !== id) return i;
          const next = { ...i, ...patch };
          if (patch.done !== undefined && patch.done !== i.done) {
            next.completedAt = patch.done ? Date.now() : null;
          }
          return next;
        }),
      }));

    const deleteItems = (ids: string[]) => {
      const kill = new Set(ids);
      setState((s) => ({ ...s, items: s.items.filter((i) => !kill.has(i.id)) }));
    };

    /** QoL: mark every item in a list done / not done in one action. */
    const setAllDone = (listId: string, done: boolean) =>
      setState((s) => ({
        ...s,
        items: s.items.map((i) =>
          i.listId === listId && i.done !== done
            ? { ...i, done, completedAt: done ? Date.now() : null }
            : i,
        ),
      }));

    /** QoL: bulk complete / uncomplete an arbitrary selection. */
    const setDoneFor = (ids: string[], done: boolean) => {
      const hit = new Set(ids);
      setState((s) => ({
        ...s,
        items: s.items.map((i) =>
          hit.has(i.id) && i.done !== done ? { ...i, done, completedAt: done ? Date.now() : null } : i,
        ),
      }));
    };

    const moveItems = (ids: string[], listId: string) => {
      const hit = new Set(ids);
      setState((s) => {
        let order = nextOrder(s.items.filter((i) => i.listId === listId));
        return {
          ...s,
          items: s.items.map((i) => (hit.has(i.id) ? { ...i, listId, order: order++ } : i)),
        };
      });
    };

    /**
     * Rewrites the order of the reminders currently on screen. Hidden ones keep
     * the slots they already hold, so reordering with completed items hidden
     * cannot shuffle them.
     */
    const reorderItems = (listId: string, visibleIdsInOrder: string[]) =>
      setState((s) => {
        const queue = [...visibleIdsInOrder];
        const moving = new Set(visibleIdsInOrder);
        const slots = new Map<string, number>();

        s.items
          .filter((i) => i.listId === listId)
          .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
          .forEach((item, index) => {
            const id = moving.has(item.id) ? (queue.shift() ?? item.id) : item.id;
            slots.set(id, index);
          });

        return {
          ...s,
          items: s.items.map((i) => {
            const order = slots.get(i.id);
            return order === undefined ? i : { ...i, order };
          }),
        };
      });

    const importList = (payload: ListExport): string => {
      const id = uid();
      setState((s) => {
        const taken = new Set(s.lists.map((l) => l.name));
        let name = payload.list.name || 'Imported List';
        if (taken.has(name)) {
          let n = 2;
          while (taken.has(`${name} ${n}`)) n++;
          name = `${name} ${n}`;
        }
        const list: List = {
          id,
          name,
          color: payload.list.color,
          icon: payload.list.icon,
          createdAt: Date.now(),
          order: nextOrder(s.lists),
        };
        return {
          lists: [...s.lists, list],
          items: [...s.items, ...itemsFromExport(payload, id, 0)],
        };
      });
      return id;
    };

    /** Appends an imported list's reminders to a list that already exists. */
    const mergeIntoList = (listId: string, payload: ListExport) =>
      setState((s) => ({
        ...s,
        items: [
          ...s.items,
          ...itemsFromExport(payload, listId, nextOrder(s.items.filter((i) => i.listId === listId))),
        ],
      }));

    return {
      addList,
      updateList,
      deleteList,
      addItem,
      updateItem,
      deleteItems,
      setAllDone,
      setDoneFor,
      moveItems,
      reorderItems,
      importList,
      mergeIntoList,
    };
  }, []);

  const itemsFor = useCallback(
    (listId: string) =>
      state.items
        .filter((i) => i.listId === listId)
        .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt),
    [state.items],
  );

  const openCount = useCallback(
    (listId: string) => state.items.filter((i) => i.listId === listId && !i.done).length,
    [state.items],
  );

  return { state, itemsFor, openCount, ...api };
}

export type Store = ReturnType<typeof useStore>;
