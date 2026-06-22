import React, {useEffect, useState} from 'react';
import {verifyToken, OWNER, REPO} from './githubApi';

/**
 * Browser-only PAT gate for the docs editor.
 *
 * The user pastes a GitHub Personal Access Token; we verify it can read the
 * target repo, then persist it in localStorage under 'docsEditorPat'. On mount
 * we re-verify any stored token so a revoked/expired PAT does not silently
 * appear "signed in". On success, calls onAuthed(pat).
 *
 * Reached only inside <BrowserOnly>, so direct localStorage use is safe.
 */
const STORAGE_KEY = 'docsEditorPat';

export default function TokenGate({onAuthed}) {
  const [pat, setPat] = useState('');
  const [status, setStatus] = useState('idle'); // idle | checking | error
  const [error, setError] = useState('');

  // Re-verify a previously stored token on mount.
  useEffect(() => {
    let cancelled = false;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return undefined;
    setStatus('checking');
    verifyToken(stored)
      .then(() => {
        if (!cancelled) onAuthed(stored);
      })
      .catch((err) => {
        if (cancelled) return;
        // Stored token is bad — drop it and let the user re-enter.
        window.localStorage.removeItem(STORAGE_KEY);
        setStatus('error');
        setError(
          `Saved token is no longer valid (${err.message}). Please enter a new one.`,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [onAuthed]);

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = pat.trim();
    if (!trimmed) return;
    setStatus('checking');
    setError('');
    try {
      await verifyToken(trimmed);
      window.localStorage.setItem(STORAGE_KEY, trimmed);
      onAuthed(trimmed);
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Token verification failed.');
    }
  };

  const clear = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setPat('');
    setStatus('idle');
    setError('');
  };

  return (
    <div style={{maxWidth: 560, margin: '0 auto', padding: '1.5rem'}}>
      <h1>Docs Editor — Sign in</h1>
      <p>
        Paste a GitHub Personal Access Token with <code>contents:write</code>{' '}
        access to{' '}
        <strong>
          {OWNER}/{REPO}
        </strong>
        . The token is stored only in this browser&apos;s <code>localStorage</code>{' '}
        and is sent directly to GitHub.
      </p>

      <div
        style={{
          background: 'var(--ifm-color-warning-contrast-background)',
          color: 'var(--ifm-color-warning-contrast-foreground)',
          border: '1px solid var(--ifm-color-warning)',
          borderRadius: 'var(--ifm-global-radius)',
          padding: '0.75rem 1rem',
          margin: '1rem 0',
          fontSize: '0.9rem',
        }}
      >
        ⚠️ <strong>Only use this on a trusted device.</strong> Anyone with access
        to this browser profile can read the saved token and commit to the repo.
        Use the <em>Clear saved token</em> button when you are done on a shared
        machine.
      </div>

      <form onSubmit={submit}>
        <input
          type="password"
          value={pat}
          onChange={(e) => setPat(e.target.value)}
          placeholder="ghp_… or github_pat_…"
          autoComplete="off"
          spellCheck={false}
          style={{
            width: '100%',
            padding: '0.6rem 0.75rem',
            fontFamily: 'var(--ifm-font-family-monospace)',
            border: '1px solid var(--ifm-color-emphasis-300)',
            borderRadius: 'var(--ifm-global-radius)',
            marginBottom: '0.75rem',
          }}
        />
        <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
          <button
            type="submit"
            className="button button--primary"
            disabled={status === 'checking' || !pat.trim()}
          >
            {status === 'checking' ? 'Verifying…' : 'Verify & continue'}
          </button>
          <button
            type="button"
            className="button button--secondary button--outline"
            onClick={clear}
          >
            Clear saved token
          </button>
        </div>
      </form>

      {status === 'error' && error && (
        <p style={{color: 'var(--ifm-color-danger)', marginTop: '1rem'}}>
          {error}
        </p>
      )}
    </div>
  );
}
