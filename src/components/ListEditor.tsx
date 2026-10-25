import { useState } from 'react';
import { COLOR_KEYS, COLORS, ICONS, colorVar } from '../lib/colors';
import type { ColorKey, List } from '../lib/types';

interface Props {
  existing?: List;
  onSave: (name: string, color: ColorKey, icon: string) => void;
  onCancel: () => void;
}

export function ListEditor({ existing, onSave, onCancel }: Props) {
  const [name, setName] = useState(existing?.name ?? '');
  const [color, setColor] = useState<ColorKey>(existing?.color ?? 'blue');
  const [icon, setIcon] = useState(existing?.icon ?? '☰');

  const submit = () => {
    if (!name.trim()) return;
    onSave(name.trim(), color, icon);
  };

  return (
    <div className="scrim" onClick={onCancel}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{existing ? 'List Info' : 'New List'}</h2>
        <p className="hint">Name it, then pick a colour and a glyph.</p>

        <div className="preview-card">
          <div className="badge badge-lg" style={{ background: colorVar(color) }}>
            {icon}
          </div>
          <input
            className="name-field"
            autoFocus
            value={name}
            placeholder="List Name"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        </div>

        <div className="swatches">
          {COLOR_KEYS.map((key) => (
            <button
              key={key}
              className="swatch"
              aria-label={key}
              aria-pressed={color === key}
              style={{ background: COLORS[key][0] }}
              onClick={() => setColor(key)}
            />
          ))}
        </div>

        <div className="icon-grid">
          {ICONS.map((glyph) => (
            <button
              key={glyph}
              className="icon-cell"
              aria-label={`icon ${glyph}`}
              aria-pressed={icon === glyph}
              onClick={() => setIcon(glyph)}
            >
              {glyph}
            </button>
          ))}
        </div>

        <div className="sheet-actions">
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn primary" disabled={!name.trim()} onClick={submit}>
            {existing ? 'Done' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
