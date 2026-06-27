import React, {useEffect, useRef, useState} from 'react';
import {verifyToken, OWNER, REPO} from './githubApi';
import {GITHUB_DEVICE_CLIENT_ID} from './editorConfig';
import {startDeviceFlow, pollForToken} from './deviceFlow';

/**
 * Browser-only sign-in gate — GitHub Device Flow.
 *
 * Flow: idle -> pending (show user_code) -> authed
 * PAT form is temporarily disabled; re-enable by uncommenting the PAT section.
 *
 * One-time setup:
 *   1. Create a GitHub OAuth App with "Device Flow" enabled.
 *   2. Set GITHUB_DEVICE_CLIENT_ID in editorConfig.js (client_id is public — not a secret).
 */
const STORAGE_KEY = 'docsEditorPat';

export default function TokenGate({onAuthed}) {
  const [phase, setPhase] = useState('idle'); // idle | pending | checking | error
  const [userCode, setUserCode] = useState('');
  const [verifyUri, setVerifyUri] = useState('https://github.com/login/device');
  const [error, setError] = useState('');
  const abortRef = useRef(null);

  const deviceEnabled = Boolean(GITHUB_DEVICE_CLIENT_ID);

  // Re-verify a stored token on mount.
  useEffect(() => {
    let cancelled = false;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    setPhase('checking');
    verifyToken(stored)
      .then(() => { if (!cancelled) onAuthed(stored); })
      .catch(() => {
        if (cancelled) return;
        window.localStorage.removeItem(STORAGE_KEY);
        setPhase('idle');
      });
    return () => { cancelled = true; };
  }, [onAuthed]);

  // Cleanup polling on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  const startLogin = async () => {
    if (!deviceEnabled) return;
    setError('');
    setPhase('pending');

    try {
      const flow = await startDeviceFlow(GITHUB_DEVICE_CLIENT_ID);
      setUserCode(flow.user_code);
      setVerifyUri(flow.verification_uri || 'https://github.com/login/device');

      const controller = new AbortController();
      abortRef.current = controller;

      const token = await pollForToken(
        GITHUB_DEVICE_CLIENT_ID,
        flow.device_code,
        flow.interval,
        controller.signal,
      );

      setPhase('checking');
      await verifyToken(token);
      window.localStorage.setItem(STORAGE_KEY, token);
      onAuthed(token);
    } catch (err) {
      if (err.message === 'Cancelled') return;
      setPhase('error');
      setError(err.message || 'Sign-in failed.');
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    setPhase('idle');
    setError('');
  };

  if (phase === 'checking') {
    return (
      <div style={{maxWidth: 480, margin: '4rem auto', textAlign: 'center', padding: '1.5rem'}}>
        <p style={{color: 'var(--ifm-color-emphasis-700)'}}>Verifying…</p>
      </div>
    );
  }

  return (
    <div style={{maxWidth: 480, margin: '4rem auto', padding: '1.5rem'}}>
      <h1>Docs Editor</h1>

      {!deviceEnabled && (
        <div style={{
          background: 'var(--ifm-color-warning-contrast-background)',
          color: 'var(--ifm-color-warning-contrast-foreground)',
          border: '1px solid var(--ifm-color-warning)',
          borderRadius: 'var(--ifm-global-radius)',
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
        }}>
          ⚠️ Set <code>GITHUB_DEVICE_CLIENT_ID</code> in{' '}
          <code>editorConfig.js</code> to enable sign-in (see{' '}
          <code>oauth-worker/README.md</code> step 1 for creating the OAuth App,
          then enable "Device Flow" in its settings).
        </div>
      )}

      {phase === 'idle' && (
        <>
          <p style={{color: 'var(--ifm-color-emphasis-700)', marginBottom: '1.5rem'}}>
            Sign in with your GitHub account that has write access to{' '}
            <strong>{OWNER}/{REPO}</strong>.
          </p>
          <button
            type="button"
            className="button button--primary button--lg"
            style={{width: '100%'}}
            onClick={startLogin}
            disabled={!deviceEnabled}
          >
            Sign in with GitHub
          </button>
        </>
      )}

      {phase === 'pending' && (
        <div>
          <p style={{marginBottom: '0.5rem'}}>
            1.{' '}
            <a href={verifyUri} target="_blank" rel="noreferrer">
              Open {verifyUri}
            </a>{' '}
            in your browser.
          </p>
          <p style={{marginBottom: '1.25rem'}}>
            2. Enter this code:
          </p>
          <div style={{
            fontFamily: 'var(--ifm-font-family-monospace)',
            fontSize: '2rem',
            fontWeight: 700,
            letterSpacing: '0.2em',
            textAlign: 'center',
            padding: '1rem',
            background: 'var(--ifm-color-emphasis-100)',
            borderRadius: 'var(--ifm-global-radius)',
            marginBottom: '1.5rem',
            userSelect: 'all',
          }}>
            {userCode}
          </div>
          <p style={{
            color: 'var(--ifm-color-emphasis-600)',
            fontSize: '0.9rem',
            textAlign: 'center',
            marginBottom: '1.25rem',
          }}>
            Waiting for you to approve on GitHub…
          </p>
          <button
            type="button"
            className="button button--secondary button--outline"
            style={{width: '100%'}}
            onClick={cancel}
          >
            Cancel
          </button>
        </div>
      )}

      {phase === 'error' && (
        <div>
          <p style={{color: 'var(--ifm-color-danger)', marginBottom: '1rem'}}>{error}</p>
          <button
            type="button"
            className="button button--primary button--lg"
            style={{width: '100%'}}
            onClick={startLogin}
            disabled={!deviceEnabled}
          >
            Try again
          </button>
        </div>
      )}

      {/* PAT form temporarily disabled — uncomment to re-enable:
      <hr style={{margin: '2rem 0'}} />
      <details>
        <summary style={{cursor: 'pointer', color: 'var(--ifm-color-emphasis-600)', fontSize: '0.9rem'}}>
          Use a Personal Access Token instead
        </summary>
        ...PAT form here...
      </details>
      */}
    </div>
  );
}
