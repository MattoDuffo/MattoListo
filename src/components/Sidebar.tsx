import { colorVar } from '../lib/colors';
import type { List } from '../lib/types';

interface Props {
  lists: List[];
  activeId: string | null;
  openCount: (listId: string) => number;
  onSelect: (id: string) => void;
  onNewList: () => void;
  onImport: () => void;
}

export function Sidebar({ lists, activeId, openCount, onSelect, onNewList, onImport }: Props) {
  return (
    <div className="pane pane-sidebar">
      <h1 className="sidebar-title">MattoListo</h1>

      <div className="section-label">My Lists</div>

      {lists.length === 0 ? (
        <div className="empty" style={{ padding: '32px 10px' }}>
          No lists yet.
        </div>
      ) : (
        <div className="list-card">
          {lists.map((list) => (
            <button
              key={list.id}
              className="list-row"
              aria-current={list.id === activeId}
              onClick={() => onSelect(list.id)}
            >
              <span className="badge" style={{ background: colorVar(list.color) }}>
                {list.icon}
              </span>
              <span className="list-row-name">{list.name}</span>
              <span className="list-row-count">{openCount(list.id) || ''}</span>
              <span className="chev" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="sidebar-actions">
        <button className="text-button" onClick={onNewList}>
          <span className="plus" aria-hidden="true">
            ＋
          </span>
          Add List
        </button>
        <button className="text-button" onClick={onImport}>
          Import
        </button>
      </div>
    </div>
  );
}
