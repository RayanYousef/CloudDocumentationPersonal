import { useState } from 'react';
import { applyFields } from '../frontmatter/yamlDoc.js';

export function NewPageDialog({ typesInUse, defaultResource, onCreate, onClose }: { typesInUse: string[]; defaultResource: string; onCreate(path: string, text: string): Promise<void>; onClose(): void }) {
  const [path, setPath] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState(typesInUse[0] ?? 'guide');
  const [resource, setResource] = useState(defaultResource);
  const [error, setError] = useState('');
  const create = async () => {
    try {
      const text = applyFields(`\n# ${title}\n\nWrite the page here.\n`, { title, description, type, tags: [], resource });
      await onCreate(path.trim(), text);
    } catch (e) { setError((e as Error).message); }
  };
  return (
    <div className="modal"><div>
      <h2>New page</h2>
      <label className="row"><span>path</span><input aria-label="New page path" placeholder="systems/status-effects.md" value={path} onChange={(e) => setPath(e.target.value)} /></label>
      <label className="row"><span>title</span><input aria-label="New page title" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="row"><span>description</span><input aria-label="New page description" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <label className="row"><span>type</span><input aria-label="New page type" value={type} onChange={(e) => setType(e.target.value)} list="types" /><datalist id="types">{typesInUse.map((t) => <option key={t} value={t} />)}</datalist></label>
      <label className="row"><span>resource</span><input aria-label="New page resource" value={resource} onChange={(e) => setResource(e.target.value)} /></label>
      {error && <p className="problems">{error}</p>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn" onClick={create} disabled={!path.endsWith('.md') || !title || !description || !type}>Create</button>
        <button className="btn secondary" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}
