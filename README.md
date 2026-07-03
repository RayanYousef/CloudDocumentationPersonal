# Documentation Base

A clean, reusable [Docusaurus 3](https://docusaurus.io/) documentation site,
designed to be dropped into any GitHub project as its docs base. All project
identity lives in a single config file, so reusing it for a new project is
mostly editing one file and swapping a couple of images. On top of stock
Docusaurus it adds interactive 3D model viewers (glTF and FBX) and an
in-browser editor that commits Markdown straight to the repo — no local setup,
server, or CMS required.

**Live demo:** https://RayanYousef.github.io/CloudDocumentationPersonal/

## Features

- **Auto-generated sidebar** — the sidebar is built from the folder structure
  under `website/docs/`; no manual sidebar entries to maintain.
- **Docs served at the site root** — `routeBasePath: '/'`, so the docs *are*
  the site; the page with `slug: /` is the homepage.
- **Versioning** — Docusaurus-native version snapshots; the working docs are
  labeled **Latest** and `1.0.0` is frozen. A navbar dropdown switches between
  them.
- **Full-text search** — the [Orama](https://github.com/askorama/orama) search
  plugin (`@orama/plugin-docusaurus-v3`) indexes the site at build time.
- **3D model viewers** — `ModelViewer` (glTF) and `FbxViewer` (FBX) React
  components embed interactive models in `.mdx` pages.
- **In-browser editor** — a WYSIWYG editor at `/editor` that commits directly
  to the repo via the GitHub API, authenticated with a Personal Access Token
  you paste in the browser.
- **CI deploy to GitHub Pages** — a GitHub Actions workflow builds and
  publishes on every push to `main` that touches `website/**`.

## Getting started

Requires **Node >= 20** (Docusaurus 3, React 19). All commands run from the
`website/` directory:

```bash
cd website
npm ci               # clean, lockfile-exact install (use npm install to add deps)
npm run start        # local dev server with hot reload at http://localhost:3000
npm run build        # static build into website/build/
npm run serve        # serve the production build locally
npm run clear        # clear the Docusaurus cache (use when the build behaves oddly)
```

There are no tests or linters configured.

## Use this as a base for your project

All project identity — site URL, base path, GitHub org/repo, deploy branch,
title, and tagline — lives in **one file: `website/site.config.js`**. Both
`docusaurus.config.js` and the in-browser editor read from it, so you never
hardcode those values anywhere else.

1. Edit `website/site.config.js` (single source of truth).
2. Swap the logo and favicon in `website/static/img/`.
3. Delete or replace the demo docs under `website/docs/`.

See **[SETUP.md](./SETUP.md)** for the full walkthrough, including the footer
link caveat and how to snapshot a version.

## Writing docs

Documentation pages live under `website/docs/`:

- Each **folder becomes a sidebar category**; set its label and position with a
  `_category_.json` file.
- **Front matter** (`title`, `sidebar_position`, `description`) orders and
  labels pages within a category.
- Use the **`.mdx`** extension for any page that imports React components.

Embed a 3D model by importing a viewer and passing a root-relative `/models/...`
path (assets live in `website/static/models/`):

```mdx
import ModelViewer from '@site/src/components/ModelViewer';
import FbxViewer from '@site/src/components/FbxViewer';

<ModelViewer src="/models/cube.gltf" alt="A cube" />
<FbxViewer src="/models/fbx/cube.fbx" />
```

## In-browser editor

The `/editor` page is a browser-only WYSIWYG Markdown editor (built on
MDXEditor) that reads and writes docs directly through the GitHub REST API —
there is no server, OAuth app, or CMS in the loop.

Authentication is a GitHub **fine-grained Personal Access Token**, scoped to
this repository, with the **Contents** permission set to **Read and write**.
Paste it into the token gate; it is stored only in the current browser's
`localStorage` (key `docsEditorPat`) and is sent directly to `api.github.com`.
Anyone with access to that browser profile can use the saved token, so clear it
when working on a shared machine.

## Deployment

Deployment is automatic. `.github/workflows/deploy-docs.yml` runs on every push
to `main` that touches `website/**` (or the workflow file itself): it runs
`npm ci` + `npm run build` and publishes `website/build/` to the `gh-pages`
branch via GitHub Pages. The workflow can also be triggered manually from the
Actions tab (`workflow_dispatch`).

## Repository structure

```
.
├── SETUP.md                         # guide for reusing this repo as a base
├── website/
│   ├── site.config.js               # single source of truth for project identity
│   ├── docusaurus.config.js         # site config (derives identity from site.config.js)
│   ├── docs/                         # documentation content (auto-generated sidebar)
│   ├── src/
│   │   ├── components/               # ModelViewer, FbxViewer, editor/
│   │   └── pages/editor.js           # the /editor page
│   ├── static/                       # img/, models/ (glTF + fbx/), uploads/
│   ├── versioned_docs/               # frozen version snapshots (version-1.0.0/)
│   └── versioned_sidebars/           # sidebars for each frozen version
└── .github/workflows/deploy-docs.yml # build + deploy to GitHub Pages
```
