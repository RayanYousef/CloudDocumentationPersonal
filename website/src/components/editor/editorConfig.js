/**
 * Static, non-secret configuration for the docs editor.
 *
 * The editor authenticates with a GitHub Personal Access Token that the user
 * pastes into TokenGate. That token is stored only in this browser's
 * localStorage (key 'docsEditorPat') and every request goes directly to
 * api.github.com, which allows CORS. There is no server, OAuth app, or worker
 * in the loop, so there is nothing to configure here for auth.
 *
 * This module is intentionally kept as a home for any future non-secret,
 * build-time editor settings.
 */
export {};
