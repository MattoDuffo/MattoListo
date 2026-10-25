import { useSyncExternalStore } from 'react';

/** Local calendar day as YYYY-MM-DD, so comparisons never slip a timezone. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Reads the date part of a stored value and rebuilds it in local time. */
export function parseDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function formatDay(value: string, today: string): string {
  const date = parseDay(value);
  if (!date) return '';
  const key = dayKey(date);
  if (key === today) return 'Today';

  const tomorrow = parseDay(today);
  if (tomorrow) {
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (key === dayKey(tomorrow)) return 'Tomorrow';
  }

  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

const listeners = new Set<() => void>();
let current = dayKey();

function tick() {
  const next = dayKey();
  if (next === current) return;
  current = next;
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  if (!listeners.size) setInterval(tick, 60_000);
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Today's date, re-rendering subscribers when the day rolls over. */
export function useToday(): string {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  );
}
