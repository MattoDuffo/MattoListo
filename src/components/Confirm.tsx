interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function Confirm({ title, message, confirmLabel, onConfirm, onCancel }: Props) {
  return (
    <div className="scrim" onClick={onCancel}>
      <div className="sheet" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p className="hint" style={{ marginBottom: 6 }}>
          {message}
        </p>
        <div className="sheet-actions">
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn destructive" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
