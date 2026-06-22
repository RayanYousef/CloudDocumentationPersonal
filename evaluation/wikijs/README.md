# Wiki.js — Local Evaluation

## What this is

A **local-only trial** of [Wiki.js](https://js.wiki/) (`requarks/wiki:2` + `postgres:16-alpine`),
run via Docker Compose. The sole purpose is to judge Wiki.js's **WYSIWYG (Visual) editor**
against our custom Docusaurus editor. This is **not** a deployment and nothing here is meant
to go to production.

## Prerequisites

- **Docker Desktop** (running — the whale icon must say "Engine running").
- **ngrok** (optional — only needed if you want to share the wiki with a remote tester).

## Quick start

```powershell
.\start-wikijs.ps1
```

Then:

1. The browser opens `http://localhost:3000`.
2. On first run, complete the setup wizard — **you choose the admin email + password** (no default login).
3. Create a **new page** and choose the **Visual editor** to evaluate the WYSIWYG experience.

## Share (remote tester)

```powershell
.\share-wikijs.ps1
```

Opens a temporary public ngrok tunnel to your local wiki so a non-dev can try the editor
remotely. Share the `https://` forwarding URL it prints. (That URL is also the OAuth callback
base if you later test GitHub login.) Close the window to take the tunnel down.

## Stop

```powershell
.\stop-wikijs.ps1          # stop containers, KEEP data
.\stop-wikijs.ps1 -Wipe    # stop AND delete the database volume (fresh start)
```

## Comparison checklist

Fill in the Wiki.js column as you test; the "Our custom editor" column reflects the Docusaurus setup.

| Aspect | Wiki.js | Our custom editor |
| --- | --- | --- |
| WYSIWYG feel | Mature, true visual editor (TipTap-based); type-and-see, toolbar, no markdown required | Less polished; markdown-leaning, custom-built |
| Embed 3D model / iframe | Blocked by **HTML sanitization** by default; raw iframes/scripts are stripped. Must go to **Admin → Rendering → HTML → Security** and disable sanitization to allow them — a real **security risk** (XSS) on any shared/public instance | Supported via MDX/React components without disabling a global safety net |
| Tabs | Supported via `{.tabset}` markup, but tabs are **not stateful** — no shared `groupId`, so selecting a tab on one page/group doesn't sync elsewhere | Stateful tab groups with shared `groupId` (selection syncs across the page/site) |
| Version dropdown | **NONE** — no built-in doc versioning dropdown | **Yes** — Docusaurus versioned docs with a version dropdown |
| Free static hosting | **No** — requires a running Node server **and** a Postgres database (must be hosted/maintained) | **Yes** — builds to static files, deploys free on GitHub Pages |

## Verdict (honest)

Wiki.js wins on **one** thing: **editor maturity** — its Visual editor is genuinely nicer than ours today.
Everything else (versioning, free static hosting, safe embeds, stateful tabs) favors our Docusaurus setup,
and Wiki.js's server + database requirement is a permanent operational cost.

If the goal is purely "a better wiki editor for non-devs," **BookStack** is the better swap-in to evaluate
next — it offers a comparably friendly editor in a wiki product, rather than re-architecting our docs around
a server + DB stack.
