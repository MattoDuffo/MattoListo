import { COLOR_KEYS } from './colors';
import type { ColorKey, Item, List, ListExport } from './types';

export function buildExport(list: List, items: Item[]): ListExport {
  return {
    app: 'mattolisto',
    version: 1,
    kind: 'list',
    exportedAt: new Date().toISOString(),
    list: { name: list.name, color: list.color, icon: list.icon },
    items: items.map((i) => ({
      title: i.title,
      ...(i.notes ? { notes: i.notes } : {}),
      ...(i.done ? { done: true } : {}),
      ...(i.dueAt ? { dueAt: i.dueAt } : {}),
    })),
  };
}

export function toJson(payload: ListExport): string {
  return JSON.stringify(payload, null, 2);
}

export function toPlainText(payload: ListExport): string {
  const lines = payload.items.map((i) => {
    const box = i.done ? '- [x]' : '- [ ]';
    const note = i.notes ? ` — ${i.notes.replace(/\s*\n\s*/g, ' ')}` : '';
    return `${box} ${i.title}${note}`;
  });
  return [`${payload.list.icon} ${payload.list.name}`, '', ...lines, ''].join('\n');
}

function b64urlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(text: string): string {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** A self-contained link: the whole list rides in the URL fragment, so no server is involved. */
export function toLink(payload: ListExport): string {
  const base = `${location.origin}${location.pathname}`;
  return `${base}#list=${b64urlEncode(JSON.stringify(payload))}`;
}

export function fileName(payload: ListExport): string {
  const slug =
    payload.list.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'list';
  return `${slug}.mattolisto.json`;
}

function isColor(value: unknown): value is ColorKey {
  return typeof value === 'string' && (COLOR_KEYS as string[]).includes(value);
}

function normalize(raw: unknown): ListExport | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const list = (obj.list ?? {}) as Record<string, unknown>;
  const rawItems = Array.isArray(obj.items) ? obj.items : null;
  if (!rawItems) return null;

  const items: ListExport['items'] = [];
  for (const entry of rawItems) {
    if (typeof entry === 'string') {
      if (entry.trim()) items.push({ title: entry.trim() });
      continue;
    }
    if (!entry || typeof entry !== 'object') continue;
    const it = entry as Record<string, unknown>;
    const title = typeof it.title === 'string' ? it.title.trim() : '';
    if (!title) continue;
    items.push({
      title,
      notes: typeof it.notes === 'string' ? it.notes : '',
      done: Boolean(it.done),
      dueAt: typeof it.dueAt === 'string' ? it.dueAt : null,
    });
  }

  return {
    app: 'mattolisto',
    version: 1,
    kind: 'list',
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
    list: {
      name: typeof list.name === 'string' && list.name.trim() ? list.name.trim() : 'Imported List',
      color: isColor(list.color) ? list.color : 'blue',
      icon: typeof list.icon === 'string' && list.icon ? list.icon : '☰',
    },
    items,
  };
}

function fromPlainText(text: string): ListExport | null {
  const lines = text.split(/\r?\n/);
  const items: ListExport['items'] = [];
  let name = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const bullet = /^(?:[-*•]\s*)?(?:\[( |x|X)\]\s*)?(.*)$/.exec(trimmed);
    const hadMarker = /^(?:[-*•]|\[[ xX]\])/.test(trimmed);
    const body = (bullet?.[2] ?? trimmed).trim();
    if (!body) continue;
    if (!hadMarker && !items.length && !name) {
      name = body.replace(/^#+\s*/, '');
      continue;
    }
    const [title, ...noteParts] = body.split(' — ');
    items.push({
      title: title.trim(),
      notes: noteParts.join(' — ').trim(),
      done: bullet?.[1]?.toLowerCase() === 'x',
      dueAt: null,
    });
  }

  if (!items.length) return null;
  return normalize({ list: { name: name || 'Imported List' }, items });
}

/** Accepts a share link, raw JSON, or a plain bulleted list. */
export function parseIncoming(input: string): ListExport | null {
  const text = input.trim();
  if (!text) return null;

  const fragment = /#list=([A-Za-z0-9\-_]+)/.exec(text);
  if (fragment) {
    try {
      const parsed = normalize(JSON.parse(b64urlDecode(fragment[1])));
      if (parsed) return parsed;
    } catch {
      /* fall through to the other formats */
    }
  }

  if (text.startsWith('{')) {
    try {
      const parsed = normalize(JSON.parse(text));
      if (parsed) return parsed;
    } catch {
      /* fall through */
    }
  }

  return fromPlainText(text);
}

export function readHashImport(): ListExport | null {
  if (!location.hash.startsWith('#list=')) return null;
  return parseIncoming(location.hash);
}

/** `#import=<name>` names a list hosted alongside the app, for a short link. */
export function readHashImportName(): string | null {
  const match = /^#import=([a-z0-9][a-z0-9-]{0,63})$/.exec(location.hash);
  return match ? match[1] : null;
}

export async function fetchSharedList(name: string): Promise<ListExport | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}shared/${name}.json`);
    if (!response.ok) return null;
    const text = await response.text();
    // A host that serves index.html for a missing file would otherwise reach
    // the plain-text parser, which would cheerfully turn markup into reminders.
    if (!text.trimStart().startsWith('{')) return null;
    return parseIncoming(text);
  } catch {
    return null;
  }
}

export function clearHash() {
  history.replaceState(null, '', `${location.pathname}${location.search}`);
}

export function download(payload: ListExport) {
  const blob = new Blob([toJson(payload)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName(payload);
  a.click();
  URL.revokeObjectURL(url);
}

export async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
