---
title: Editing in the Browser
sidebar_position: 2
description: Edit docs in the browser with Sveltia CMS — token login now, optional free GitHub login.
---

# Editing in the Browser

This site ships with **[Sveltia CMS](https://github.com/sveltia/sveltia-cms)** (MIT)
mounted at **`/admin`**. It runs entirely in your browser and commits your edits
straight to the GitHub repository — no server to run. It includes a full
**WYSIWYG Markdown editor**.

## Two ways to log in

Sveltia offers **Sign In with Token** (works today, zero setup) and
**Sign in with GitHub** (nicer for teams, needs a one-time free setup).

:::warning "Sign in with GitHub" shows "Not Found"?
That's expected **until** you finish the optional OAuth setup in Option B below.
With no OAuth relay configured, Sveltia falls back to Netlify's hosted login — and
because this site isn't a Netlify site, you get a real 404. It is **not** a bug.
Use **Sign In with Token** (Option A), or enable free GitHub login (Option B).
:::

## Option A — Sign in with Token (works now, no setup)

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

## Option B — Sign in with GitHub (optional, free, best for teams)

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

## Editing

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

## Who can edit, and "only one editor at a time"

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
