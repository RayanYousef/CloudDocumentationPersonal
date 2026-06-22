# GitHub OAuth Worker for the Docs Editor

This is a tiny [Cloudflare Worker](https://workers.cloudflare.com/) that lets
people sign in to the in-browser docs editor with **"Sign in with GitHub"**
instead of pasting a Personal Access Token (PAT).

It implements the GitHub OAuth *web application flow* with the popup /
`postMessage` handshake used by Netlify CMS, Decap CMS and Sveltia CMS. The
editor opens the worker in a popup; the worker redirects to GitHub, exchanges
the returned `code` for an access token using the **client secret that lives
only in the Worker env**, then posts the token back to the editor and closes the
popup.

The OAuth client **secret is never in this repo and never in the browser** — it
exists only as an encrypted Cloudflare secret.

## Files

| File           | Purpose                                                     |
| -------------- | ---------------------------------------------------------- |
| `worker.js`    | The Worker. Routes: `GET /auth`, `GET /callback`.          |
| `wrangler.toml`| Worker config (name, entrypoint, compatibility date).      |
| `README.md`    | This file.                                                  |

## One-time setup

### 1. Create a GitHub OAuth App

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
   (or for an org: the org's Developer settings).
2. Fill in:
   - **Application name**: anything, e.g. `Docs Editor OAuth`.
   - **Homepage URL**: your docs site, e.g. `https://rayanyousef.github.io/CloudDocumentationPersonal/`.
   - **Authorization callback URL**: `<worker-origin>/callback`
     (you'll know the worker origin after step 3 — you can edit this field
     afterwards, so put a placeholder for now and fix it once deployed).
3. Click **Register application**, then **Generate a new client secret**.
4. Copy the **Client ID** and the **Client secret** (the secret is shown once).

> Note: this is an **OAuth App**, not a *GitHub App*. The token it issues carries
> the classic `repo` scope (read/write to **all** of the user's repositories).
> A fine-grained PAT can be scoped to just this one repo. If that broad scope is
> a concern for your contributors, prefer the PAT login (still available in the
> editor) or use a GitHub App instead.

### 2. Install Wrangler

```bash
npm install -g wrangler   # or use: npx wrangler ...
wrangler login
```

### 3. Deploy the Worker

From this folder (`oauth-worker/`):

```bash
wrangler deploy
```

Wrangler prints the deployed URL, e.g.
`https://docs-oauth-worker.<your-subdomain>.workers.dev`. That is your
**worker origin**.

Now go back to the GitHub OAuth App and set the **Authorization callback URL**
to exactly `<worker-origin>/callback`, e.g.
`https://docs-oauth-worker.<your-subdomain>.workers.dev/callback`.

### 4. Set the secrets (encrypted, never committed)

```bash
wrangler secret put GITHUB_CLIENT_ID       # paste the Client ID
wrangler secret put GITHUB_CLIENT_SECRET   # paste the Client secret
```

These are stored encrypted in Cloudflare and injected as `env.GITHUB_CLIENT_ID`
/ `env.GITHUB_CLIENT_SECRET` at runtime. They are **not** in `wrangler.toml`.

### 5. (Optional) Restrict who can receive the token

By default the worker posts the token with `targetOrigin: '*'`. To lock it to
your site, set the non-secret `ALLOWED_DOMAINS` variable (comma-separated
hostnames). Either uncomment the `[vars]` block in `wrangler.toml`:

```toml
[vars]
ALLOWED_DOMAINS = "rayanyousef.github.io"
```

…and redeploy, or set it from the Cloudflare dashboard. The first entry becomes
the `postMessage` target origin.

### 6. Point the editor at the Worker

Edit `website/src/components/editor/editorConfig.js` and set the origin you got
in step 3 (no trailing slash):

```js
export const OAUTH_WORKER_ORIGIN = 'https://docs-oauth-worker.<your-subdomain>.workers.dev';
```

Rebuild / redeploy the site. The editor's sign-in screen will now show a primary
**"Sign in with GitHub"** button, with the PAT input kept as a fallback below.

## How the flow works

```
Editor popup ──GET /auth──▶ Worker ──302──▶ github.com/login/oauth/authorize
                                                     │ user approves
                              Worker ◀──/callback?code&state── GitHub
   token  ◀── postMessage('authorization:github:success:{token,provider}') ── Worker
```

- `/auth` sets a random `state` in an HttpOnly cookie and redirects to GitHub.
- `/callback` verifies `state`, exchanges `code` for a token (server-side, using
  the secret), then returns HTML that `postMessage`s
  `authorization:github:success:<json>` to `window.opener` and closes.
- On any failure it posts `authorization:github:error:<message>` instead.

## Local development

```bash
wrangler dev
```

For local testing, register a second OAuth App whose callback URL points at the
`wrangler dev` URL (e.g. `http://localhost:8787/callback`), and provide the
secrets via a `.dev.vars` file (git-ignored), for example:

```
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```
