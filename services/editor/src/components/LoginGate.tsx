import { useState, type FormEvent } from 'react';
import type { Credentials, Identity, Session } from '@platform/contracts';
import type { Platform } from '../composition/createPlatform.js';
import { Modal } from './Modal.js';

export function LoginGate({ platform, onAuthed, initialError = '' }: { platform: Platform; onAuthed: (session: Session, identity: Identity, remember: boolean) => void; initialError?: string }) {
  const [token, setToken] = useState('');
  const [name, setName] = useState('');
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const isMock = platform.auth.id === 'mock';
  const repo = `${platform.config.organizationName}/${platform.config.projectName}`;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const creds: Credentials = isMock ? { kind: 'mock', name, role: 'editor' } : { kind: 'github-token', token };
      const session = await platform.auth.login(creds);
      const identity = await platform.auth.verify(session);
      onAuthed(session, identity, remember);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Modal title="Docs Editor - Sign in">
      {isMock ? (
        <p>Development sign-in: choose a display name.</p>
      ) : (
        <p>Paste a <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">fine-grained personal access token</a> scoped to <strong>{repo}</strong> with <strong>Contents: Read and write</strong>. Only write collaborators can sign in.</p>
      )}
      <form onSubmit={submit}>
        {isMock
          ? <input aria-label="Display name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          : <input aria-label="GitHub token" type="password" placeholder="github_pat_..." value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />}
        <label style={{ display: 'block', margin: '0.75rem 0' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember on this device
        </label>
        {remember && <div className="notice">Anyone using this browser profile can read the saved token and commit as you. Do not enable this on a shared machine; use "Forget token" when done.</div>}
        <button className="btn" type="submit" disabled={busy || (isMock ? !name.trim() : !token.trim())}>{busy ? 'Verifying...' : 'Sign in'}</button>
      </form>
      {error && <p className="problems" role="alert">{error}</p>}
    </Modal>
  );
}
