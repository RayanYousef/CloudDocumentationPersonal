import React, {useEffect, useState} from 'react';
import {verifyToken, OWNER, REPO} from './githubApi';
import {OAUTH_WORKER_ORIGIN} from './editorConfig';

/**
 * Browser-only sign-in gate for the docs editor.
 *
 * Two ways in, both yielding a GitHub token passed to onAuthed(token):
 *   1. "Sign in with GitHub" (OAuth) — shown only when OAUTH_WORKER_ORIGIN is
 *      configured. Opens the Cloudflare Worker (oauth-worker/) in a popup and
 *      listens for the Netlify/Decap/Sveltia-style postMessage handshake. The
 *      returned access token behaves exactly like a PAT.
 *   2. Personal Access Token (PAT) — always available as a fallback. The user
 *      pastes a token; we verify it can read the target repo.
 *
 * Tokens are verified, then persisted in localStorage under 'docsEditorPat'. On
 * mount we re-verify any stored token so a revoked/expired one does not silently
 * appear "signed in".
 *
 * Reached only inside <BrowserOnly>, so direct window/localStorage use is safe.
 */
const STORAGE_KEY = 'docsEditorPat';

/** Matches the popup handshake message: authorization:github:<status>:<payload> */
const OAUTH_MESSAGE_RE = /^authorization:github:(success|error):([\s\S]*)$/;

export default function TokenGate({onAuthed}) {
  const [pat, setPat] = useState('');
  const [status, setStatus] = useState('idle'); // idle | checking | error
  const [error, setError] = useState('');
  const [oauthPending, setOauthPending] = useState(false);

  const oauthEnabled = Boolean(OAUTH_WORKER_ORIGIN);

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

  // Listen for the OAuth popup's postMessage handshake while a sign-in is
  // pending. Ignore messages from origins other than the configured Worker.
  useEffect(() => {
    if (!oauthEnabled || !oauthPending) return undefined;

    let cancelled = false;
    const onMessage = async (event) => {
      if (event.origin !== OAUTH_WORKER_ORIGIN) return;
      const data = typeof event.data === 'string' ? event.data : '';
      const match = data.match(OAUTH_MESSAGE_RE);
      if (!match) return;

      const [, kind, payload] = match;
      if (cancelled) return;
      setOauthPending(false);

      if (kind === 'error') {
        setStatus('error');
        setError(payload || 'GitHub sign-in failed.');
        return;
      }

      // success: payload is JSON { token, provider }
      let token = '';
      try {
        token = JSON.parse(payload).token;
      } catch (_) {
        setStatus('error');
        setError('GitHub sign-in returned an unreadable response.');
        return;
      }
      if (!token) {
        setStatus('error');
        setError('GitHub sign-in returned no token.');
        return;
      }

      setStatus('checking');
      setError('');
      try {
        await verifyToken(token);
        if (cancelled) return;
        window.localStorage.setItem(STORAGE_KEY, token);
        onAuthed(token);
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setError(err.message || 'Token verification failed.');
      }
    };

    window.addEventListener('message', onMessage);
    return () => {
      cancelled = true;
      window.removeEventListener('message', onMessage);
    };
  }, [oauthEnabled, oauthPending, onAuthed]);

  const signInWithGitHub = () => {
    if (!oauthEnabled) return;
    setStatus('idle');
    setError('');
    setOauthPending(true);
    const authUrl =
      `${OAUTH_WORKER_ORIGIN}/auth?provider=github&scope=repo&site_id=` +
      encodeURIComponent(window.location.host);
    const popup = window.open(authUrl, 'github-oauth', 'width=600,height=720');
    if (!popup) {
      setOauthPending(false);
      setStatus('error');
      setError('Popup was blocked. Allow popups for this site and try again.');
    }
  };

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

      {oauthEnabled ? (
        <div style={{marginBottom: '1.5rem'}}>
          <p>
            Sign in with your GitHub account that has write access to{' '}
            <strong>
              {OWNER}/{REPO}
            </strong>
            .
          </p>
          <button
            type="button"
            className="button button--primary button--lg"
            onClick={signInWithGitHub}
            disabled={oauthPending || status === 'checking'}
            style={{width: '100%'}}
          >
            {oauthPending ? 'Waiting for GitHub…' : 'Sign in with GitHub'}
          </button>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--ifm-color-emphasis-600)',
              margin: '0.75rem 0 0',
            }}
          >
            Or use a Personal Access Token below.
          </p>
          <hr style={{margin: '1.25rem 0'}} />
        </div>
      ) : (
        <p
          style={{
            fontSize: '0.9rem',
            color: 'var(--ifm-color-emphasis-700)',
            marginBottom: '1rem',
          }}
        >
          Tip: &ldquo;Sign in with GitHub&rdquo; can be enabled with a one-time
          Cloudflare Worker setup (see <code>oauth-worker/README.md</code>). Until
          then, sign in with a Personal Access Token below.
        </p>
      )}

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
