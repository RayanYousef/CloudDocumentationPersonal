import { useState } from 'react';
import { Modal } from './Modal.js';

export function PublishDialog({ existing, onPublish, onClose }: { existing: string[]; onPublish(version: string): Promise<void>; onClose(): void }) {
  const [version, setVersion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = /^\d+\.\d+\.\d+$/.test(version) && !existing.includes(version);
  const publish = async () => {
    setBusy(true); setError('');
    try { await onPublish(version); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal title="Publish a frozen version" onClose={busy ? undefined : onClose}>
      <p>Snapshots the Latest docs into a read-only version, pins every code resource to the current commit of its repository, and tags the docs repo <code>docs-v&lt;version&gt;</code>.</p>
      <label className="row"><span>version</span><input aria-label="Version" placeholder="1.1.0" value={version} onChange={(e) => setVersion(e.target.value)} /></label>
      {version && !valid && <p style={{ opacity: 0.8 }}>{existing.includes(version) ? `Version ${version} already exists.` : 'Use the form major.minor.patch, for example 1.1.0.'}</p>}
      {error && <p className="problems" role="alert">{error}</p>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn" disabled={!valid || busy} onClick={publish}>{busy ? 'Publishing...' : 'Publish'}</button>
        <button className="btn secondary" onClick={onClose} disabled={busy}>Cancel</button>
      </div>
    </Modal>
  );
}
