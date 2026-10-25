import { useMemo } from 'react';
import { buildExport, copy, download, toJson, toLink, toPlainText } from '../lib/share';
import type { Item, List } from '../lib/types';

interface Props {
  list: List;
  items: Item[];
  onClose: () => void;
  onToast: (message: string) => void;
}

export function ShareSheet({ list, items, onClose, onToast }: Props) {
  const payload = useMemo(() => buildExport(list, items), [list, items]);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const run = async (label: string, text: string) => {
    onToast((await copy(text)) ? `${label} copied` : 'Copy failed — select the text manually');
    onClose();
  };

  const nativeShare = async () => {
    try {
      await navigator.share({
        title: list.name,
        text: toPlainText(payload),
        url: toLink(payload),
      });
    } catch {
      /* user dismissed the share sheet */
    }
    onClose();
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Export “{list.name}”</h2>
        <p className="hint">
          {items.length} {items.length === 1 ? 'reminder' : 'reminders'} · the whole list travels
          inside the link or file, no account needed.
        </p>

        <div className="share-row">
          {canShare && (
            <button className="share-button" onClick={nativeShare}>
              <span className="glyph" aria-hidden="true">
                ↗
              </span>
              <span>
                Share…
                <small>Messages, Mail, AirDrop — whatever this device offers</small>
              </span>
            </button>
          )}

          <button className="share-button" onClick={() => run('Link', toLink(payload))}>
            <span className="glyph" aria-hidden="true">
              🔗
            </span>
            <span>
              Copy share link
              <small>Opening it offers the list as an import</small>
            </span>
          </button>

          <button className="share-button" onClick={() => run('List', toPlainText(payload))}>
            <span className="glyph" aria-hidden="true">
              ¶
            </span>
            <span>
              Copy as plain text
              <small>Readable checklist to paste anywhere</small>
            </span>
          </button>

          <button className="share-button" onClick={() => run('JSON', toJson(payload))}>
            <span className="glyph" aria-hidden="true">
              {'{ }'}
            </span>
            <span>
              Copy as JSON
              <small>Exact copy, including notes and dates</small>
            </span>
          </button>

          <button
            className="share-button"
            onClick={() => {
              download(payload);
              onToast('File saved');
              onClose();
            }}
          >
            <span className="glyph" aria-hidden="true">
              ⤓
            </span>
            <span>
              Download file
              <small>A .mattolisto.json the other person can import</small>
            </span>
          </button>
        </div>

        <div className="sheet-actions">
          <button className="btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
