import { useRef, useState } from 'react';
import { colorVar } from '../lib/colors';
import { parseIncoming } from '../lib/share';
import type { List, ListExport } from '../lib/types';

interface Props {
  lists: List[];
  incoming?: ListExport | null;
  onImport: (payload: ListExport) => void;
  onMerge: (listId: string, payload: ListExport) => void;
  onClose: () => void;
}

export function ImportSheet({ lists, incoming, onImport, onMerge, onClose }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState<ListExport | null>(incoming ?? null);
  const [target, setTarget] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const tryParse = (raw: string) => {
    setText(raw);
    setError('');
    if (!raw.trim()) {
      setParsed(null);
      return;
    }
    const result = parseIncoming(raw);
    setParsed(result);
    if (!result) setError('Could not read that. Paste a share link, JSON, or one reminder per line.');
  };

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    tryParse(await f.text());
  };

  const confirm = () => {
    if (!parsed) return;
    if (target) onMerge(target, parsed);
    else onImport(parsed);
  };

  const count = parsed?.items.length ?? 0;

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{incoming ? 'Shared List' : 'Import a List'}</h2>
        <p className="hint">
          {incoming
            ? 'Someone sent you this list. Adding it makes your own private copy.'
            : 'Paste a share link, exported JSON, or a plain checklist.'}
        </p>

        {!incoming && (
          <>
            <textarea
              className="paste-area"
              autoFocus
              placeholder={'…#list=eyJhcHAiOi…\n\nor\n\n- [ ] Passport\n- [x] Charger'}
              value={text}
              onChange={(e) => tryParse(e.target.value)}
            />
            <div className="share-row" style={{ marginTop: 12 }}>
              <button className="share-button" onClick={() => file.current?.click()}>
                <span className="glyph" aria-hidden="true">
                  ⤒
                </span>
                <span>Choose a file…</span>
              </button>
              <input
                ref={file}
                type="file"
                accept=".json,application/json,.txt,text/plain"
                hidden
                onChange={(e) => void pickFile(e.target.files?.[0])}
              />
            </div>
          </>
        )}

        {parsed && (
          <>
            <div className="preview-card" style={{ paddingTop: 20 }}>
              <div className="badge badge-lg" style={{ background: colorVar(parsed.list.color) }}>
                {parsed.list.icon}
              </div>
              <strong>{parsed.list.name}</strong>
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                {count} {count === 1 ? 'reminder' : 'reminders'}
              </span>
            </div>

            {lists.length > 0 && (
              <>
                <div className="section-label" style={{ margin: '14px 2px 8px' }}>
                  Add to
                </div>
                <div className="list-card">
                  <button
                    className="list-row"
                    aria-current={target === null}
                    onClick={() => setTarget(null)}
                  >
                    <span className="badge" style={{ background: colorVar(parsed.list.color) }}>
                      ＋
                    </span>
                    <span className="list-row-name">New list</span>
                    {target === null && <span className="chev">✓</span>}
                  </button>
                  {lists.map((list) => (
                    <button
                      key={list.id}
                      className="list-row"
                      aria-current={target === list.id}
                      onClick={() => setTarget(list.id)}
                    >
                      <span className="badge" style={{ background: colorVar(list.color) }}>
                        {list.icon}
                      </span>
                      <span className="list-row-name">{list.name}</span>
                      {target === list.id && <span className="chev">✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {error && <p className="error-text">{error}</p>}

        <div className="sheet-actions">
          <button className="btn" onClick={onClose}>
            {incoming ? 'Not Now' : 'Cancel'}
          </button>
          <button className="btn primary" disabled={!parsed} onClick={confirm}>
            {target ? `Add ${count}` : 'Add to My Lists'}
          </button>
        </div>
      </div>
    </div>
  );
}
