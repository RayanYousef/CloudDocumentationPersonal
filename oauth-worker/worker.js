/**
 * Minimal Cloudflare Worker implementing the GitHub OAuth "web application flow"
 * with the popup / postMessage handshake used by Netlify CMS, Decap CMS and
 * Sveltia CMS. The docs editor (website/src/components/editor/TokenGate.jsx)
 * opens this worker in a popup; on success the worker posts the access token
 * back to the opener via window.opener.postMessage(...).
 *
 * Routes:
 *   GET /auth     -> 302 redirect to GitHub's authorize endpoint, setting a
 *                    random `state` cookie (CSRF guard).
 *   GET /callback -> verify state, exchange the `code` for an access token, then
 *                    render an HTML page that postMessages the token to the
 *                    opener and closes itself.
 *
 * Secrets are read from the environment and MUST NOT be committed:
 *   GITHUB_CLIENT_ID      - OAuth App client id        (set via `wrangler secret put` or [vars])
 *   GITHUB_CLIENT_SECRET  - OAuth App client secret    (set via `wrangler secret put`, encrypted)
 *   ALLOWED_DOMAINS       - optional, comma-separated list of opener hostnames
 *                           allowed to receive the token (e.g. "rayanyousef.github.io").
 *                           When unset, the token is posted with targetOrigin '*'.
 */

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const STATE_COOKIE = 'oauth_state';
const DEFAULT_SCOPE = 'repo';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = `${url.protocol}//${url.host}`;

    if (url.pathname === '/auth') {
      return handleAuth(url, origin, env);
    }
    if (url.pathname === '/callback') {
      return handleCallback(request, url, origin, env);
    }
    return new Response('Not found', {status: 404});
  },
};

/**
 * GET /auth — start the flow.
 * Generates a random `state`, stores it in an HttpOnly cookie, and redirects to
 * GitHub's authorize endpoint. The redirect_uri is always <worker-origin>/callback
 * so it matches the OAuth App's configured "Authorization callback URL".
 */
function handleAuth(url, origin, env) {
  if (!env.GITHUB_CLIENT_ID) {
    return new Response('Missing GITHUB_CLIENT_ID.', {status: 500});
  }

  const scope = url.searchParams.get('scope') || DEFAULT_SCOPE;
  const state = randomState();

  const authorize = new URL(GITHUB_AUTHORIZE_URL);
  authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', `${origin}/callback`);
  authorize.searchParams.set('scope', scope);
  authorize.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      'Set-Cookie': stateCookie(state),
    },
  });
}

/**
 * GET /callback — finish the flow.
 * Verifies the `state` against the cookie, exchanges the `code` for an access
 * token, and renders the postMessage HTML. Any failure renders the error variant
 * of the same handshake so the opener can react.
 */
async function handleCallback(request, url, origin, env) {
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  const cookieState = readCookie(request, STATE_COOKIE);

  if (!code) {
    return renderResult('error', 'Missing authorization code.', env);
  }
  if (!returnedState || returnedState !== cookieState) {
    return renderResult('error', 'Invalid OAuth state.', env);
  }
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return renderResult(
      'error',
      'Worker is missing GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET.',
      env,
    );
  }

  try {
    const tokenRes = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${origin}/callback`,
      }),
    });

    const data = await tokenRes.json();
    if (!tokenRes.ok || data.error || !data.access_token) {
      const msg = data.error_description || data.error || 'Token exchange failed.';
      return renderResult('error', msg, env);
    }

    return renderResult(
      'success',
      JSON.stringify({token: data.access_token, provider: 'github'}),
      env,
    );
  } catch (err) {
    return renderResult('error', err.message || 'Token exchange threw.', env);
  }
}

// --- postMessage handshake -------------------------------------------------

/**
 * Render the HTML page that talks to window.opener via postMessage using the
 * Netlify/Decap/Sveltia protocol: a string of the form
 *   authorization:github:<status>:<payload>
 * The page clears the state cookie, posts the message, then closes itself.
 * When ALLOWED_DOMAINS is configured the message targetOrigin is restricted to
 * the matching opener origin; otherwise '*' is used.
 */
function renderResult(status, payload, env) {
  const targetOrigin = pickTargetOrigin(env);
  const message = `authorization:github:${status}:${payload}`;
  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>GitHub Authorization</title></head>
<body>
<p>Completing sign-in… you can close this window.</p>
<script>
(function () {
  var message = ${JSON.stringify(message)};
  var targetOrigin = ${JSON.stringify(targetOrigin)};
  function send() {
    if (window.opener) {
      window.opener.postMessage(message, targetOrigin);
    }
    window.close();
  }
  send();
})();
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Expire the state cookie now that the flow is done.
      'Set-Cookie': `${STATE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    },
  });
}

/**
 * Decide the postMessage targetOrigin. With no ALLOWED_DOMAINS we fall back to
 * '*' (matches the CMS reference implementations). With ALLOWED_DOMAINS set we
 * use the first entry's https origin, restricting which page can receive the
 * token.
 */
function pickTargetOrigin(env) {
  const raw = (env.ALLOWED_DOMAINS || '').trim();
  if (!raw) return '*';
  const first = raw.split(',').map((s) => s.trim()).filter(Boolean)[0];
  if (!first) return '*';
  return first.startsWith('http') ? first : `https://${first}`;
}

// --- cookie / state helpers ------------------------------------------------

/** Cryptographically random hex string for the OAuth `state` parameter. */
function randomState() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Build the Set-Cookie header value for the state cookie. */
function stateCookie(state) {
  return `${STATE_COOKIE}=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
}

/** Read a single cookie value from the request's Cookie header. */
function readCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? match[1] : null;
}
