/**
 * Static, non-secret configuration for the docs editor.
 *
 * OAUTH_WORKER_ORIGIN is the public origin of the Cloudflare Worker that runs
 * the GitHub OAuth web flow (see oauth-worker/README.md). When it is a non-empty
 * string, TokenGate shows a "Sign in with GitHub" button that opens
 * `${OAUTH_WORKER_ORIGIN}/auth` in a popup. When it is empty, only the PAT
 * fallback is offered.
 *
 * Paste your deployed Worker origin here, with NO trailing slash, e.g.
 *   export const OAUTH_WORKER_ORIGIN = 'https://docs-oauth-worker.yourname.workers.dev';
 *
 * This value is public (it ships in the client bundle). It is only an origin,
 * never a secret — the OAuth client secret lives exclusively in the Worker env.
 */
export const OAUTH_WORKER_ORIGIN = '';

export const GITHUB_DEVICE_CLIENT_ID = '';
