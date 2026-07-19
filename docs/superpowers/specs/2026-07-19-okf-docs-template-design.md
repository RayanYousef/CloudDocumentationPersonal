# Design Spec: OKF Brain Documentation Template

Date: 2026-07-19
Status: Approved
Branch: `feat/okf-brain-template`

This document records user-approved design decisions. Nothing here is open for relitigation; implementation follows this spec as written.

## Context

This repository is a reusable Docusaurus 3.x documentation template (`website/`), deployed to GitHub Pages via GitHub Actions on pushes to `main` that touch `website/**`. All project identity (`siteUrl`, `baseUrl`, `organizationName`, `projectName`, `deployBranch`, `title`, `tagline`) lives in `website/site.config.js` and is derived everywhere else — this spec never hardcodes identity values; any example values shown (e.g. the current `baseUrl`) are illustrative of the current config, not constants.

## Goals

Turn the template into an OKF (Open Knowledge Format) knowledge bundle with a built-in "brain":

1. Full OKF frontmatter on every doc in `website/docs/`.
2. A per-folder `index.md` landing page for every docs folder.
3. A root `website/docs/log.md` changelog page.
4. An auto-regenerating interactive graph visualization of the docs, built at build time.

Template reusability is paramount: a future project cloned from this repo gets correct indexes and viz automatically on every push, with zero per-project wiring beyond editing `website/site.config.js`.

## Architecture

### Build-time graph plugin

- Custom Docusaurus plugin at `website/plugins/okf-graph/`, registered in the `plugins` array of `website/docusaurus.config.js`. The Orama search plugin already occupies that array — the new plugin is **appended**, never replacing existing entries.
- Runs inside `npm run build` (and dev server). No server-side runtime: GitHub Pages is static hosting, so all generation happens at build time.
- Scans `website/docs/` only; **skips `versioned_docs/`** entirely.
- Parses each doc's frontmatter and its relative markdown links to other docs.
- Emits graph data via `actions.setGlobalData`, shaped:

  ```js
  {
    global: <graph>,                      // whole-site graph
    folders: { '<folderPath>': <graph> }  // one scoped graph per docs folder
  }
  ```

### Renderer

- Cytoscape.js in a reusable React component at `website/src/components/OkfGraph/`.
- **Client-only, SSR-safe**: uses the `BrowserOnly` + inner-`require` pattern already used by `website/src/pages/editor.js` and `website/src/components/ModelViewer/index.js`. A top-level `import cytoscape` breaks `npm run build`; it is forbidden.
- Node click navigates to the node's `route` resolved through `useBaseUrl`.
- Light/dark aware via `useColorMode` (the site defaults to dark).
- Node colors keyed by OKF `type`, using the arcade palette CSS variables from `website/src/css/custom.css`: `--primary` (#6357C9 light / #8F8AE8 dark), `--interactive`, `--treasure` (#D9A441), `--info` (#5C88D8). Unknown types render in a fallback color.
- Hierarchy edges and link edges are visually distinct (e.g. style/weight difference).
- Includes a tag-filter UI driven by node `tags`.

### UX surfaces

1. **Per-page "Viz" button**: a theme wrapper around `DocItem/Layout` in `website/src/theme/` adds a "Viz" button to every current-docs page. Clicking it opens the **current folder's** scoped graph in an SSR-safe modal/overlay. When no graph data exists for the page's folder — concretely, versioned `1.0.0` pages — the button is disabled or hidden; nothing may break or error.
2. **Full-site graph page** at `/viz` (`website/src/pages/viz.js`), rendering the `global` graph. Linked prominently from the homepage; optionally also a "Viz" navbar item.

## Pinned contracts

### Graph JSON schema

```json
{
  "nodes": [{ "id": "", "route": "", "title": "", "type": "", "tags": [], "folder": "" }],
  "edges": [{ "source": "", "target": "", "kind": "hierarchy | link" }]
}
```

- `id`: docs-relative path without extension (e.g. `guide/editing`).
- `route`: the doc's actual route, respecting frontmatter slugs (the root index has `slug: /`).
- `kind: "hierarchy"`: folder index → its children.
- `kind: "link"`: an actual markdown link from one doc to another.
- **Graceful degradation is mandatory**: docs missing OKF fields get `type: "unknown"` and empty `tags`. The plugin must **never** crash the build, whatever it encounters.

### OKF `type` vocabulary (this repo)

`index`, `guide`, `example`, `log`, `note`.

Extensible: unknown types are legal and render in the fallback color — they are not errors.

## Content conventions

- **Merged frontmatter** on every doc in `website/docs/`: Docusaurus fields (`title`, `sidebar_position`, `description`) plus OKF fields — `type` (required), `tags` (YAML list), `timestamp` (quoted ISO string).
- **Per-folder `index.md`** serves as each folder's category landing page.
- **Homepage**: `website/docs/index.md` with `slug: /`, using `@theme/DocCardList` so major folders appear automatically as cards. The existing `intro.mdx` currently owns `slug: /` and must hand it over to `index.md`.
- **Changelog**: `website/docs/log.md`, a visible "Changelog" page with `type: log` and a high `sidebar_position` (sorts last).

## Constraints

- GitHub Pages static hosting — all generation at build time; no server component.
- `onBrokenLinks: 'throw'` stays; every internal link must resolve or the build fails.
- `baseUrl` comes from `website/site.config.js` (currently `/CloudDocumentationPersonal/`); all absolute in-site links must include it, and the renderer resolves routes via `useBaseUrl`.
- Docusaurus 3.9 / React 19 / Node >= 20.
- **Only new dependency allowed: `cytoscape`.**
- These footer links must keep resolving: `/examples/markdown-basics`, `/examples/3d-model-viewer`, `/guide/editing`.
- The Orama search plugin remains in `plugins` — append the new plugin, never replace.

## Out of scope

- `E:\_Brain` and the okf-viz generator that lives there.
- Visualization of versioned docs (`versioned_docs/`).
- The `okf` / `update-brain` skills.

## Verification

1. `cd website && npm run build` exits 0 (with `onBrokenLinks: 'throw'` intact).
2. `.docusaurus/globalData.json` contains the okf-graph plugin's data: a `global` graph plus a `folders` entry for each docs folder, matching the pinned schema.
3. UI checks, in both light and dark themes:
   - "Viz" button appears on current-docs pages and opens the folder-scoped graph modal.
   - On versioned `1.0.0` pages the button is disabled or hidden, with no errors.
   - `/viz` renders the global graph; homepage links to it; node click navigates to the doc; tag filter works.
4. Frontmatter audit: every doc in `website/docs/` has `title`, `type`, `tags`, and quoted ISO `timestamp`; every folder has an `index.md`; `log.md` exists at docs root; homepage renders DocCardList cards.
