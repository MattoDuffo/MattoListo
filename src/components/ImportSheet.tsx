import { useRef, useState } from 'react';
import { colorVar } from '../lib/colors';
import { parseIncoming } from '../lib/share';
import type { ListExport } from '../lib/types';

interface Props {
  incoming?: ListExport | null;
  onImport: (payload: ListExport) => void;
  onClose: () => void;
}

export function ImportSheet({ incoming, onImport, onClose }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState<ListExport | null>(incoming ?? null);
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
          <div className="preview-card" style={{ paddingTop: 20 }}>
            <div className="badge badge-lg" style={{ background: colorVar(parsed.list.color) }}>
              {parsed.list.icon}
            </div>
            <strong>{parsed.list.name}</strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              {parsed.items.length} {parsed.items.length === 1 ? 'reminder' : 'reminders'}
            </span>
          </div>
        )}

        {error && <p className="error-text">{error}</p>}

        <div className="sheet-actions">
          <button className="btn" onClick={onClose}>
            {incoming ? 'Not Now' : 'Cancel'}
          </button>
          <button
            className="btn primary"
            disabled={!parsed}
            onClick={() => parsed && onImport(parsed)}
          >
            Add to My Lists
          </button>
        </div>
      </div>
    </div>
  );
}
