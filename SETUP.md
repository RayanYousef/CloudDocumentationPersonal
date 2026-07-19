# Using this repo as a base for a new project

This is a reusable Docusaurus 3.x documentation site. All project identity lives
in **one file**, so standing up a new project is mostly editing that file plus
swapping a couple of images.

## 1. Edit `website/site.config.js`

This is the single source of truth. Update the ~7 values:

- `siteUrl` — your GitHub Pages origin, e.g. `https://<user>.github.io`
- `baseUrl` — the sub-path, `/<repo>/` for project pages (leading + trailing
  slash), or `/` for a root/custom-domain site
- `organizationName` — GitHub user or org that owns the repo
- `projectName` — the repo name
- `deployBranch` — branch the site deploys from / the in-browser editor commits
  to (usually `main`)
- `title` and `tagline` — site branding

`docusaurus.config.js` and the in-browser editor both read from this file, so
you never edit identity values anywhere else.

## 2. Replace the logo and favicon

Drop your own files into `website/static/img/`:

- `logo.png` — navbar logo
- `favicon.png` — browser-tab icon

There is intentionally no default social-card image. To add one, put it in
`website/static/img/` and set an `image` key in `themeConfig` of
`docusaurus.config.js`.

## 3. (Optional) Clear the demo docs

Delete or replace the demo content under `website/docs/`.

> **Warning:** the footer in `website/docusaurus.config.js` links to demo pages
> (`/examples/...` and `/guide/editing`). If you remove those pages, update or
> delete the matching footer links too — the build sets `onBrokenLinks: 'throw'`,
> so a dangling internal link fails `npm run build`.

When clearing demo docs, keep the skeleton: the homepage `website/docs/index.mdx`
(it owns `slug: /` and renders the category cards) and the changelog
`website/docs/log.md`. Replace their content, not the files.

## 4. Author docs the OKF way

The docs tree (`website/docs/`) is an OKF (Open Knowledge Format) knowledge
bundle with a built-in "brain": a graph visualization derived from frontmatter
and links. To keep it working in a cloned project, follow three conventions.

> **The repo ships the full OKF skill** at `.agents/skills/okf/SKILL.md` — a
> self-contained reference covering the entire format. Point your AI tool's
> skills directory at it (or copy/symlink it into your personal skills folder,
> e.g. `~/.agents/skills/okf/` for Claude Code or Cursor) and it teaches the
> agent the whole format.

### Frontmatter on every new doc

Every page carries merged frontmatter — the usual Docusaurus fields plus OKF
fields:

```yaml
---
title: My Page                      # Docusaurus: page title
sidebar_position: 2                 # Docusaurus: order within the category
description: One-sentence summary.  # Docusaurus + OKF: stands alone in cards
type: guide                         # OKF: REQUIRED
tags:                               # OKF: YAML list (never a comma string)
  - some-tag
timestamp: "2026-07-19T00:00:00+00:00"  # OKF: quoted ISO 8601; refresh on edit
---
```

`type` is the only mandatory OKF field. Vocabulary in this repo: `index`,
`guide`, `example`, `log`, `note` — extensible; an unknown type is legal and
renders in a fallback color in the graph, it is not an error. Docs missing OKF
fields degrade gracefully (`type: "unknown"`, empty tags) and never break the
build.

### Per-folder convention

Each folder under `website/docs/` gets:

- an `index.md` (or `.mdx`) with `type: index` — the folder's landing page,
  typically rendering `<DocCardList />`
- a `_category_.json` for the sidebar label and position

That's all. The sidebar is auto-generated from the folder structure, and the
homepage cards, folder graphs, and hierarchy edges in the viz all derive from
this layout automatically.

### Changelog discipline (`website/docs/log.md`)

`log.md` at the docs root is the bundle's change journal (`type: log`,
`sidebar_position: 99` so it sorts last). Rules:

- date headings in ISO form: `## YYYY-MM-DD`
- newest first
- one bullet per meaningful change (add/move/rewrite of docs)

Append to today's heading, or create it at the top if today has none.

## 5. The viz system (zero maintenance)

The graph visualization regenerates automatically from the docs on every
`npm run build` — locally and in the deploy workflow on every push. There is
nothing to configure, wire, or hand-edit per project:

- a custom plugin (`website/plugins/okf-graph/`) scans `website/docs/` at build
  time and emits a global graph plus one scoped graph per folder
- every current-docs page gets a **Viz** button that opens its folder's graph;
  the button disables itself where no graph data exists (e.g. versioned pages)
- the full-site graph lives at `/viz`, linked from the homepage and navbar

Never edit generated graph data — change the docs (frontmatter, links, folders)
and rebuild.

## 6. Versioning (opt-in)

Versioning is off until you snapshot a version:

```bash
cd website
npm run docusaurus docs:version 1.0.0
```

This writes `versions.json`, `versioned_docs/`, and `versioned_sidebars/`. The
editor's version dropdown reads `versions.json` automatically — no other edits.

## 7. Deploy

Deployment is automatic: the GitHub Actions workflow builds and publishes to
GitHub Pages on every push to `main` that touches `website/**`.
