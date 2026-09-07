import { useState } from 'react';
export function PublishDialog({ existing, onPublish, onClose }: { existing: string[]; onPublish(version: string): Promise<void>; onClose(): void }) {
  const [version, setVersion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = /^\d+\.\d+\.\d+$/.test(version) && !existing.includes(version);
  return (
    <div className="modal"><div>
      <h2>Publish a frozen version</h2>
      <p>Snapshots the Latest docs into a read-only version, pins every code resource to the current commit of its repository, and tags the docs repo <code>docs-v&lt;version&gt;</code>.</p>
      <label className="row"><span>version</span><input aria-label="Version" placeholder="1.1.0" value={version} onChange={(e) => setVersion(e.target.value)} /></label>
      {error && <p className="problems">{error}</p>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn" disabled={!valid || busy} onClick={async () => { setBusy(true); setError(''); try { await onPublish(version); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>{busy ? 'Publishing...' : 'Publish'}</button>
        <button className="btn secondary" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}
