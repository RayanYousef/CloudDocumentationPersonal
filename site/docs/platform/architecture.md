---
title: Architecture
description: Explains which packages and services make up the platform, which may import which, and the exact sequence of calls behind a login, a save, a version publish and a 3D asset fetch; read this before touching more than one workspace.
type: system
tags: [platform, architecture, boundaries, data-flow, monorepo]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/docs/design/2026-09-06-documentation-platform-design.md
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/eslint.config.js
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/package.json
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/platform.config.js
sidebar_position: 1
---

## Service map

The repository is an npm-workspaces monorepo. Every runtime piece is a workspace that depends only on `@platform/contracts` (types, errors, contract test suites) and, where it handles Markdown, on `@platform/okf-core`. Two composition roots are the only places that see concrete implementations.

| Workspace | Package | Role |
|---|---|---|
| `packages/contracts` | `@platform/contracts` | `AuthProvider`, `ContentBackend`, `PlatformConfig`, `ComponentsManifest`, error classes, contract test suites ([Contracts](contracts.md)) |
| `packages/okf-core` | `@platform/okf-core` | zero-dependency OKF generator and validator working on an in-memory file map ([OKF Core](okf-core.md)) |
| `packages/viewers` | `@platform/viewers` | `ModelViewerCore` and `FbxViewerCore`, the React 3D rendering cores ([Viewers](viewers.md)) |
| `services/auth` | `@platform/auth` | `GithubTokenProvider`, `MockAuthProvider` ([Auth](auth.md)) |
| `services/content` | `@platform/content` | `LocalFolderBackend`, `GithubBrowserBackend`, `HttpContentBackend` + `serveContentBackend`, write and publish pipelines, asset fetch, search ([Content](content.md)) |
| `services/editor` | `@platform/editor` | Vite + React in-browser editor served at `<baseUrl>editor/` ([Editor](editor.md)) |
| `site` | `@platform/site` | Docusaurus site rendering `site/docs` and the frozen versions ([Site](site.md)) |
| `.agents/skills/docs-platform` | (skill) | the only agent entry point ([Agent skill](agent-skill.md)) |
| `.github/workflows`, `scripts/` | (root) | validation and deploy workflows, root generator entry ([Workflows](workflows.md)) |

`platform.config.js` at the root is the single source of identity, features, auth and content wiring and declared code repositories. It is bundled into the browser, so it holds no secrets.

## One-process composition (Phase 1)

Phase 1 is a static composition: there is no server. Everything runs either at build time in Node (generator, prebuild artifacts, Docusaurus) or in the reader's browser (site, editor, GitHub API calls with the editor's own token).

```text
platform.config.js
      |
      +--> site/docusaurus.config.js ........ identity, navbar, footer, versions
      +--> services/editor/vite.config.ts ... base = <baseUrl>editor/
      +--> scripts/okf.mjs ................... --repo owner/repo for every codeRepos entry
      |
      +--> services/editor/src/composition/createPlatform.ts
      |        new GithubTokenProvider | MockAuthProvider      (AuthProvider)
      |        new GithubBrowserBackend | HttpContentBackend   (ContentBackend)
      |
      +--> site/src/platform/createContentBackend.ts
               new GithubBrowserBackend (token from localStorage when an editor session exists)
```

`npm run site:build` builds the editor, then the site (whose `prebuild` writes `static/platform/*.json`), then `scripts/copy-editor.mjs` copies `services/editor/dist` into `site/build/editor/`. `deploy-pages.yml` publishes `site/build` to `gh-pages`. Phase 2 replaces this with a Hono shell that mounts the same services on paths in one process (see [Roadmap](roadmap.md)).

## Dependency rules

`eslint.config.js` enforces the table below with `eslint-plugin-boundaries`. Rule 1 forbids relative imports that cross an element boundary; rule 2 applies the same table to `@platform/*` package imports. `scripts/lint-boundaries.test.ts` runs ESLint on fixtures under `scripts/lint-fixtures/` and expects the error, so the rule itself is tested.

| From (element) | May import |
|---|---|
| `contracts` (`packages/contracts`) | `contracts`, `okf-core` (types only) |
| `okf-core` | nothing internal (zero runtime dependencies) |
| `viewers` | nothing internal |
| `auth`, `content` | `contracts`, `okf-core` |
| `editor` (`services/editor` except composition) | `contracts`, `okf-core`, `viewers`, `platform-config` |
| `editor-composition` (`services/editor/src/composition`) | additionally `auth`, `content` |
| `site` (`site` except `site/src/platform` and `site/scripts`) | `contracts`, `viewers`, `platform-config` |
| `site-composition` (`site/src/platform`) | additionally `okf-core`, `auth`, `content` |
| `site-scripts` (`site/scripts`) | `contracts`, `okf-core`, `content`, `platform-config` |
| `root` (`scripts/`, `eslint.config.js`, `vitest.workspace.ts`) | `platform-config`, `contracts`, `okf-core`, `content` |

The practical consequence: a new implementation of a contract is a new file inside an existing service (or a new service) plus one line in a composition root. Nothing else needs to know it exists.

## Data flows

### Login

1. `LoginGate` collects a fine-grained GitHub token (or a mock name and role when `VITE_PLATFORM_AUTH=mock`).
2. `createPlatform()` has already chosen the `AuthProvider`; the editor calls `auth.login({ kind: 'github-token', token })`.
3. `GithubTokenProvider.verify` calls `GET /repos/{owner}/{repo}`; 401/403/404 become `AuthError('INVALID_CREDENTIALS')`, other failures `NETWORK`. It then requires `permissions.push === true` (otherwise `NOT_COLLABORATOR`) and reads name, login and email from `GET /user`. Role is `editor` when push is true.
4. `BrowserSessionStore.save(session, remember)` keeps the session in memory and, only when the user ticked "remember on this device", in `localStorage` under `docs-platform.session`. The site reads the same key to authenticate asset fetches.

### Save

1. The editor validates the page locally with `validatePage` and shows problems before the request.
2. `backend.writePage(version, path, text, { message, author, expectedEtag })` on the `ContentBackend` chosen by the composition root.
3. Inside the backend, `planPageChanges` (in `writePipeline.ts`) rejects frozen versions (`FROZEN`), validates the page (`VALIDATION`), applies the change to the in-memory bundle, runs `generateBundle` (problems become `VALIDATION`), and prepends `log.md` entries (`Add` for a new page, `Update` otherwise, author = the editor's identity, summary = the commit message). An `expectedEtag` mismatch is `CONFLICT`.
4. `GithubBrowserBackend` writes the page and every regenerated file (index blocks, `manifest.json`, `log.md`, code maps) in one Git Data commit: blobs, a tree with `base_tree`, a commit with `author`, then `PATCH refs/heads/<branch>`. `LocalFolderBackend` does the same with the `git` CLI (`--author`).
5. The push to `main` triggers `deploy-pages.yml`; the live site updates after the build.

### Publish a version

1. `backend.publishVersion('1.2.0', { message, author })` (editor role only).
2. Each declared code repo's `defaultRef` is resolved to a commit sha (`GET /repos/{o}/{r}/commits/{ref}`).
3. `planPublish` (in `publishPipeline.ts`) snapshots `docs/` minus `versions/`, rewrites every blob URL and every viewer `ref="<defaultRef>"` attribute to the sha with `rewriteRefs`, regenerates the frozen bundle, and writes `versioned_docs/version-<v>/`, `docs/versions/<v>.json` (`{version, frozenAt, pins, refs}`), `versioned_sidebars/version-<v>-sidebars.json` and the updated `versions.json`.
4. One commit, then tag `docs-v<v>`.

### Asset fetch

1. A page uses `<ModelViewer repo="owner/repo" path="Assets/Models/Airship.glb" />` (optionally `ref`). The site wrapper in `site/src/components/ModelViewer` runs inside `BrowserOnly` and calls `useAssetUrl`.
2. `useAssetUrl` resolves the ref through `defaultRefFor(repo)` (from `platform.config.js`) and calls `createContentBackend().getAsset({ repo, ref, path })`.
3. `fetchAsset` (in `services/content/src/assets/getAsset.ts`) tries `https://media.githubusercontent.com/media/<owner>/<repo>/<ref>/<path>` first (serves real bytes for Git LFS pointers), then `https://raw.githubusercontent.com/...`. A stored editor session adds `Authorization: token`, which is what makes private code repositories work for editors.
4. The response is stored in the Cache API store `docs-platform-assets` keyed by `<repo>@<ref>/<path>`: immutable when `ref` is a 40-hex sha, ten-minute TTL when it is a branch. Files over 100 MB are rejected with `TOO_LARGE`.
5. The blob becomes an object URL and `ModelViewerCore` or `FbxViewerCore` from `@platform/viewers` mounts it.
