---
title: Editing in the Browser
sidebar_position: 2
description: Edit docs in the browser — Pages CMS (recommended, fully visual), the built-in /editor, or Sveltia CMS.
---

# Editing in the Browser

You have three browser-based ways to edit this site, all free and all commit
straight to the GitHub repository — no server to run:

- **[Pages CMS](https://pagescms.org)** — **recommended for non-developers.** A
  fully visual, hosted WYSIWYG editor at **[app.pagescms.org](https://app.pagescms.org)**.
  No tokens, no setup, no Markdown to learn.
- **The built-in editor at `/editor`** — a WYSIWYG editor baked into this site
  that also understands our custom blocks (**3D models**, **tabs**) and can
  **insert/upload images and 3D models**. Needs a Personal Access Token for now.
- **[Sveltia CMS](https://github.com/sveltia/sveltia-cms)** — bundled at **`/admin`**;
  runs in your browser but needs a Personal Access Token (or a one-time OAuth setup).

## Recommended: Pages CMS (easiest, fully visual)

**[Pages CMS](https://pagescms.org)** is a free, open-source (MIT) CMS for static
sites. It's the friendliest option here: it's **hosted for you** at
[app.pagescms.org](https://app.pagescms.org), so there are **no tokens to create**,
**nothing to install**, and **no Markdown to learn** — you just type, style text
with toolbar buttons (headings, **bold**, *italic*, lists, links, images), and
hit **Save**. Each save commits to the repo and the site rebuilds automatically.
It also supports **multiple editors** out of the box, which makes it friendlier
than Sveltia's token/OAuth flow below.

This site already includes a `.pages.yml` config at the repo root that tells
Pages CMS which pages are editable, so everything below works immediately.

### One-time access

1. Go to **[https://app.pagescms.org](https://app.pagescms.org)**.
2. Click **Sign in with GitHub**.
3. Grant the **Pages CMS GitHub App** access to the
   **`RayanYousef/CloudDocumentationPersonal`** repository (you can limit it to
   just this one repo). This is what lets your saves become commits.

You only do this once. After that, anyone you've given **write access** to the
repo can sign in and edit.

### Editing a page

1. In Pages CMS, open a **collection** — for example **Guide** or **Changelogs**.
2. Click an entry to open it. Edit the **Body** visually: use the toolbar for
   headings, **bold**, *italic*, lists, links, and **images** (drag-and-drop;
   they upload to `website/static/uploads`). No Markdown syntax required.
3. Click **Save**. Pages CMS commits the change to the repo and GitHub Actions
   rebuilds and deploys the site — your edit appears live after the build.

:::tip Prose vs. MDX pages
The **Introduction**, **Changelogs**, and **Guide** collections give you the full
visual (rich-text) editor. The **Chatbot (raw MDX)** and **3D Showcase (raw MDX)**
collections contain React components and `import` lines, so their body opens in a
**raw code editor** instead — edit those carefully and don't remove the `import`
lines or JSX tags.
:::

:::info Free and open-source
Pages CMS is MIT-licensed and free to use. Access control is GitHub's: anyone with
**write access** to the repo can edit; remove their repo access to revoke editing.
:::

## Built-in editor at `/editor` (handles 3D + tabs)

This site ships its own WYSIWYG editor at **`/editor`**. Unlike the generic CMSs
above, it understands **our custom blocks** — it renders **3D models** and
**tabs** visually while you edit, and it can **upload and insert images and 3D
models** for you. It commits directly to GitHub from your browser; there is no
server.

### Logging in

The editor uses a **GitHub Personal Access Token** (the same kind described under
Sveltia's *Option A* below). Create a fine-grained token scoped to **this
repository** with **Contents: Read and write**, open **`/editor`**, and paste it.
The token is stored only in your browser's local storage.

:::info A friendlier "Sign in with GitHub" is planned
A token-free **Sign in with GitHub** flow (via a free Cloudflare Worker, the same
pattern as Sveltia's *Option B*) is planned as a follow-up. For now, use a token —
and only on a trusted device.
:::

### Editing a page

1. Open **`/editor`** (or `http://localhost:3000/CloudDocumentationPersonal/editor/`
   in dev) and paste your token.
2. Pick a file from the list on the left (`.md` / `.mdx` pages under `docs/`).
3. Edit visually in **Visual** mode — headings, **bold**, *italic*, lists, links,
   tables, code, plus our **3D model** and **tabs** blocks, which preview live.
   Use the toolbar buttons to **insert an image** or **insert a 3D model**
   (uploaded to `website/static/`).
4. Need something the visual editor can't represent? Switch to **Raw MDX** to edit
   the whole file as text. The editor also drops into Raw mode automatically if a
   file can't be parsed, so you're never locked out.
5. Set a commit message and click **Save & commit**. It commits to `main` via the
   GitHub API and the site rebuilds automatically.

:::warning Token security
A PAT in browser storage grants write access to the repo. Only use it on a trusted
device, scope it to this repository, and revoke it if exposed.
:::

## Alternative: Sveltia CMS at `/admin`

The site also ships with **[Sveltia CMS](https://github.com/sveltia/sveltia-cms)**
(MIT) mounted at **`/admin`**. It runs entirely in your browser and commits your
edits straight to the GitHub repository — no server to run. It includes a full
**WYSIWYG Markdown editor**. Use this if you prefer a self-hosted editor; for most
non-technical editors, **Pages CMS above is simpler**.

### Two ways to log in

Sveltia offers **Sign In with Token** (works today, zero setup) and
**Sign in with GitHub** (nicer for teams, needs a one-time free setup).

:::warning "Sign in with GitHub" shows "Not Found"?
That's expected **until** you finish the optional OAuth setup in Option B below.
With no OAuth relay configured, Sveltia falls back to Netlify's hosted login — and
because this site isn't a Netlify site, you get a real 404. It is **not** a bug.
Use **Sign In with Token** (Option A), or enable free GitHub login (Option B).
:::

### Option A — Sign in with Token (works now, no setup)

1. Create a **fine-grained GitHub Personal Access Token**:
   GitHub → **Settings → Developer settings → Fine-grained tokens → Generate new token**.
   - **Resource owner / repository access:** only **this repository**.
   - **Repository permissions:** **Contents → Read and write** (GitHub adds
     *Metadata: Read* automatically — that's required and normal).
   - Pick an expiration (max 1 year).
   - *(A classic token with the `repo` scope also works, but it grants more than needed.)*
2. Open **`/admin`** (or `http://localhost:3000/admin` in dev).
3. Click **Sign In with Token** and paste the PAT. It is stored only in your
   browser's local storage.
4. Edit a page and **Publish** → it commits to `main` → the site auto-rebuilds.

When the token expires, generate a new one and paste it again.

### Option B — Sign in with GitHub (optional, free, best for teams)

A real "Sign in with GitHub" button needs a server-side token exchange (GitHub
requires a client *secret* that must never live in browser code). You can host
that exchange for **$0** with the official **`sveltia-cms-auth` Cloudflare Worker**.
One-time, ~30 minutes:

1. **Deploy the Worker.** Create a free Cloudflare account, then one-click deploy:
   `https://deploy.workers.cloudflare.com/?url=https://github.com/sveltia/sveltia-cms-auth`.
   Copy your Worker URL, e.g. `https://sveltia-cms-auth.<your-subdomain>.workers.dev`.
2. **Create a GitHub OAuth App** at `https://github.com/settings/applications/new`.
   Set the **Authorization callback URL** to your Worker URL **+ `/callback`**
   (exactly `/callback`). Generate a client secret; note the **Client ID** and **Client Secret**.
3. **Set Worker variables** (Cloudflare → your Worker → Settings → Variables):
   - `GITHUB_CLIENT_ID` (plaintext)
   - `GITHUB_CLIENT_SECRET` (click **Encrypt**)
   - optional `ALLOWED_DOMAINS` = `rayanyousef.github.io` (restricts who may use the Worker)
4. **Point the CMS at it.** In `website/static/admin/config.yml`, under `backend:`,
   uncomment the `base_url:` line and set it to your **Worker origin** (no path):
   ```yaml
   backend:
     name: github
     repo: RayanYousef/CloudDocumentationPersonal
     branch: main
     base_url: https://sveltia-cms-auth.<your-subdomain>.workers.dev
   ```
5. **Redeploy & test.** Open `/admin` → **Sign in with GitHub**. The popup should
   now go to your Worker (not `api.netlify.com`). *(If you instead see
   "Authentication Aborted", that's a separate popup/COOP issue, not this one.)*

After this, teammates just click **Sign in with GitHub** — no tokens to manage.

### Editing with Sveltia

- Pick a collection (e.g. **Features**), open a page, edit, and **Publish**.
- Publishing creates a commit on the configured branch; the site rebuilds and
  deploys automatically via GitHub Actions.

:::info Which version do I edit?
The CMS edits the **Latest** version (the working `docs/` folder served at the site
root) — so your changes appear on the live site after the rebuild. The frozen
`1.0.0` snapshot under `/1.0.0/` is an archived release and is **not** edited by the
CMS. When you add a new feature folder, add a matching collection in
`static/admin/config.yml` (the CMS cannot auto-discover new folders).
:::

### Who can edit, and "only one editor at a time"

Access control is **GitHub's**, not the CMS's — Sveltia has no user system of its
own. Anyone who logs in (token *or* GitHub) and has **write access** to the repo can
edit, because every save is a direct commit via the GitHub API. To grant editing,
add the person as a **repo collaborator with write access**; to revoke, remove their
access. There is no separate CMS account to manage.

A static site has no server, so there is **no true real-time lock**. Use this
convention instead:

- **Single trusted editor (recommended):** one person edits — single-writer is guaranteed.
- **Small team:** edit via short-lived branches / PRs (Sveltia editorial workflow)
  so Git surfaces conflicts at publish time.
- **Need a hard real-time lock?** That requires a small free-tier serverless
  component (e.g. a Supabase/Firebase "lock" record). It is intentionally **not**
  included here to keep the site 100% static and free.

:::warning Token security
A PAT in browser storage grants write access to the repo. Only use it on a trusted
device, scope it to this repository, and revoke it if exposed.
:::
