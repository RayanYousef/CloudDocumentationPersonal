import { useMemo, useState } from 'react';
import type { PageSummary } from '@platform/contracts';

export interface FilePickerProps { pages: PageSummary[]; folders: string[]; selected: string | null; onSelectPage(path: string): void; onSelectFolder(dir: string): void }

/** Concept pages only (the backend already hides reserved files); folders open the intro editor. */
export function FilePicker({ pages, folders, selected, onSelectPage, onSelectFolder }: FilePickerProps) {
  const [filter, setFilter] = useState('');
  const q = filter.trim().toLowerCase();
  const shown = useMemo(() => pages.filter((p) => !q || p.path.toLowerCase().includes(q) || p.title.toLowerCase().includes(q)), [pages, q]);
  return (
    <div>
      <input type="search" aria-label="Filter pages" placeholder="Filter pages..." value={filter} onChange={(e) => setFilter(e.target.value)} />
      <h3>Pages</h3>
      <ul className="filelist">{shown.map((p) => <li key={p.path}><button className={selected === p.path ? 'active' : ''} title={p.description} onClick={() => onSelectPage(p.path)}>{p.path}</button></li>)}</ul>
      <h3>Folder intros</h3>
      <ul className="filelist">{folders.map((d) => <li key={d}><button className={selected === `${d ? d + '/' : ''}index.md` ? 'active' : ''} onClick={() => onSelectFolder(d)}>{d || '(root)'}/index.md</button></li>)}</ul>
    </div>
  );
}
