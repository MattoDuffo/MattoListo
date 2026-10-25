export type ColorKey =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'mint'
  | 'teal'
  | 'cyan'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'brown'
  | 'gray';

export interface List {
  id: string;
  name: string;
  color: ColorKey;
  icon: string;
  createdAt: number;
  order: number;
}

export interface Item {
  id: string;
  listId: string;
  title: string;
  notes: string;
  done: boolean;
  dueAt: string | null;
  createdAt: number;
  completedAt: number | null;
  order: number;
}

export interface AppState {
  lists: List[];
  items: Item[];
}

/** Shape of an exported list, portable between installs. */
export interface ListExport {
  app: 'mattolisto';
  version: 1;
  kind: 'list';
  exportedAt: string;
  list: {
    name: string;
    color: ColorKey;
    icon: string;
  };
  items: Array<{
    title: string;
    notes?: string;
    done?: boolean;
    dueAt?: string | null;
  }>;
}
