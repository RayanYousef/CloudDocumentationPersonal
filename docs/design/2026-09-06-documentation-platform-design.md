# Documentation Platform: Design Specification

Date: 2026-09-06
Repository: `RayanYousef/CloudDocumentationPersonal` (branch `main` at `220dae3`)
Status: approved for Phase 1 implementation (plan: `2026-09-06-documentation-platform-plan.md`)
Normative format reference: OKF Core profile, `C:\Users\Ray\.agents\skills\ray-okf-core\references\spec-profile.md` (never modified by this project)

## 1. Purpose

A reusable documentation template for new (mostly Unity) projects that:

1. lets team members with authority edit pages through a Word-like in-browser editor instead of the GitHub UI;
2. renders interactive 3D models (glTF/GLB and FBX) fetched from the code repository at a pinned ref;
3. lets AI agents navigate the documentation and the code through a per-folder index layer that follows the OKF Core profile;
4. can later be extended with push-triggered AI documentation updates without rewriting anything built in Phase 1.

Design principle: clean, SOLID, every service a self-contained module behind a contract. New authentication providers, hosting targets or content backends are ADDED as new implementations of existing contracts, never by modifying an existing implementation. Contract test suites guard substitutability. A lint rule forbids cross-service imports.

## 2. Current state (what is replaced)

`website/` is a Docusaurus 3.10.1 site (React 19, Node >= 20) whose identity lives in `website/site.config.js`. It carries: an arcade colour theme (`src/css/custom.css`, dark default), Orama search (`@orama/plugin-docusaurus-v3`), versioning (`versions.json = ["1.0.0"]`, one-page stub), two 3D viewers (`ModelViewer` on `@google/model-viewer`, `FbxViewer` on raw three.js), a knowledge-graph feature (`plugins/okf-graph`, `src/components/OkfGraph`, `src/pages/viz.js`, swizzled `src/theme/DocItem/Layout`), demo docs using `DocCardList`, and an in-browser editor (`src/pages/editor.js` + `src/components/editor/`) built on `@mdxeditor/editor` with a Raw-MDX fallback.

Known defects of the editor: the token gate only checks `GET /repos/{o}/{r}` succeeds and never checks `permissions.push`, so any valid token passes and fails at save; saves are single-file `PUT contents` commits; pages cannot be created, renamed or deleted; `frontmatter.js` quotes numeric scalars (`sidebar_position: 2` is rewritten as `"2"`); uploads are capped at about 1 MB; the editor is not linked from the navbar.

Deployment: `.github/workflows/deploy-docs.yml` publishes to `gh-pages`; Pages is unpublished because the repository is private on the Free plan (`gh api repos/.../pages` returns 404).

An untracked folder `okf-example/` (docs bundle, a frozen `docs-v1.0.0/`, a `unity-project/` mirror, `tools/okf-generate.js`) is the demo content and the generator starting point. `node tools/okf-generate.js docs --check` reports exactly one deliberate broken link (`systems/combat.md -> status-effects.md`).

## 3. Architecture overview

Eleven components, two phases. Phase 1 is a static composition deployed to GitHub Pages; Phase 2 adds a server.

```
                +----------------------+
                |  packages/contracts  |  types, errors, contract test suites
                +----------+-----------+
                           ^ (every service depends only on this and okf-core)
     +---------------------+---------------------+-----------------+
     |                     |                     |                 |
+----+-------+     +-------+--------+    +-------+--------+   +----+--------+
| services/  |     | services/      |    | services/      |   | site/       |
| auth       |     | content        |    | editor (Vite)  |   | (Docusaurus)|
| Github     |     | LocalFolder    |    | composition    |   | composition |
| Token      |     | GithubBrowser  |    | root wires     |   | root wires  |
| Provider   |     | Http (dev/e2e) |    | auth+content   |   | content     |
+------------+     +-------+--------+    +----------------+   +-------------+
                           |
                   +-------+--------+          +------------------+
                   | packages/      |          | packages/viewers |
                   | okf-core       |          | (React 3D cores) |
                   +----------------+          +------------------+
```

Repository layout (npm workspaces monorepo):

```
platform.config.js            single source of identity, features, auth, content, codeRepos
package.json                  workspaces, root scripts (build, test, lint, okf:generate, okf:check)
eslint.config.js              boundary rule
packages/contracts/           @platform/contracts
packages/okf-core/            @platform/okf-core (zero runtime dependencies)
packages/viewers/             @platform/viewers (ModelViewerCore, FbxViewerCore)
services/auth/                @platform/auth
services/content/             @platform/content
services/editor/              @platform/editor (Vite + React app)
site/                         @platform/site (Docusaurus), renamed from website/
examples/unity-project/       sample code repository (OKF code-project variant)
scripts/okf.mjs               root generator/validator entry reading platform.config.js
.agents/skills/docs-platform/ the platform agent skill
.github/workflows/            okf-validate.yml, deploy-pages.yml
docs/design/                  this spec and the plan
```

### 3.1 Dependency rules (enforced by ESLint)

| From | May import |
|---|---|
| `packages/contracts` | `@platform/okf-core` (types only) |
| `packages/okf-core` | nothing internal (zero runtime dependencies) |
| `packages/viewers` | nothing internal |
| `services/auth`, `services/content` | `@platform/contracts`, `@platform/okf-core` |
| `services/editor/src/**` (except composition) | `@platform/contracts`, `@platform/okf-core`, `@platform/viewers` |
| `services/editor/src/composition/**` | additionally `@platform/auth`, `@platform/content` (the composition root instantiates implementations and hands them out as contract types) |
| `site/src/**` (except `site/src/platform/**`) | `@platform/contracts`, `@platform/viewers` |
| `site/src/platform/**` | additionally `@platform/content`, `@platform/auth` (the site's composition root) |

Any other `@platform/*` import, and any relative import that crosses a `services/<x>` or `packages/<x>` boundary, is a lint error. Enforcement uses `eslint-plugin-boundaries` element types `contracts`, `okf-core`, `viewers`, `auth`, `content`, `editor`, `editor-composition`, `site`, `site-composition`.

## 4. Components

### 4.1 Contracts package (`packages/contracts`)

Pure TypeScript interfaces (chosen over OpenAPI for Phase 1; an OpenAPI document is derived from these in Phase 2 when the HTTP surface becomes public). Contents:

- `auth.ts`: `Role`, `Identity`, `Session`, `Credentials` (discriminated union: `github-token`, `mock`), `AuthProvider`, `AuthError` with codes `INVALID_CREDENTIALS | NOT_COLLABORATOR | UNSUPPORTED_CREDENTIALS | NETWORK`.
- `content.ts`: `VersionId` (`'current'` is Latest; frozen versions use their label, e.g. `'1.0.0'`), `VersionInfo`, `PageSummary`, `PageContent` (with `etag`), `MutationOptions {message, author}`, `WriteOptions` (adds `expectedEtag`), `WriteResult`, `AssetRef {repo, ref, path}`, `AssetInfo`, `SearchHit`, `PublishResult`, `Author`, `ContentBackend`, `ContentError` with codes `NOT_FOUND | EXISTS | CONFLICT | FROZEN | VALIDATION | FORBIDDEN | TOO_LARGE | NETWORK`.
- `platform-config.ts`: `PlatformConfig` and `CodeRepoRef {owner, repo, defaultRef, label, pathPrefix?}`.
- `components-manifest.ts`: `ComponentsManifest` (the `components.json` shape).
- `testing/contentBackendContract.ts` and `testing/authProviderContract.ts`: Vitest suites parameterised by a factory. Every backend and provider, present or future, must pass them.
- `testing/fixtures/miniBundle.ts`: a small in-memory OKF bundle (root index, one folder, two pages, log, AGENTS.md) used by both contract suites and okf-core tests.

Exact signatures are in the plan (Task 2) and are the same names used everywhere else.

### 4.2 OKF Core package (`packages/okf-core`)

Zero-dependency generator + validator, evolved from `okf-example/tools/okf-generate.js`, restructured so its core is file-system agnostic: it operates on an in-memory `Record<bundleRelativePath, text>` so the same code runs in Node (CLI, LocalFolderBackend) and in the browser (GithubBrowserBackend regenerates before every commit).

Inputs: every `.md` under the bundle, `manifest.json`, `code-maps/*.md`. Folders that contain no Markdown (`versions/`, images) are data folders and are skipped; `code-maps/` is a reserved generated folder (platform extension, see item 4 below).

Outputs:

1. **Index blocks**: in every folder `index.md`, the block between `<!-- okf:index -->` and `<!-- /okf:index -->` holds `## Pages` and/or `## Folders` bullets `* [Title](path) - description`, descriptions copied verbatim from page frontmatter or the folder index's intro paragraph, ordered by `sidebar_position` (missing = 999) then title. Markers are created at the end of an index that lacks them. Text outside the markers is preserved byte for byte.
2. **`manifest.json`**: flat array sorted by route, one object per concept page: `route`, `file`, `title`, `description`, `type`, `tags`, `resource`, `sources`. Not written when validation fails.
3. **Root `log.md`**: newest-first changelog, `## YYYY-MM-DD` headings, bullets `* **Add|Update**: [Title](/path.md) - what changed. (by Name)`. Generated from commits touching docs: the content service turns each write it performs into `LogEntry` objects (Add when the page is new, Update otherwise; author = the editor's identity; summary = the commit message) and calls `prependLogEntries`. okf-core also exposes `logEntriesFromCommits` for backends that read git history (LocalFolderBackend's `logFromGit` bootstrap). The validator checks format and date ordering; it does not diff the log against git history (decision: the log is append-only generated, so completeness is guaranteed by the write path, not by re-derivation).
4. **Code maps**: one file per declared code repository at `code-maps/<owner>--<repo>.md`, derived from the manifest: a path-ordered list of every code path cited by `resource` or `sources`, each followed by the pages that describe it. Frontmatter `title` and `sidebar_position: 98` only, so Docusaurus renders it. Regenerated on every run; stale detection applies.

Validator (exit 1 / `problems[]`) fails on:

- concept page missing frontmatter, or missing `title`, `description`, `type`;
- `resource` missing or not matching `^https://github\.com/<owner>/<repo>/blob/<ref>/<path>$` (also each `sources[].resource`);
- `resource` or a source pointing at a repository not in `codeRepos` (rule active only when `codeRepos` is supplied; skipped when the list is empty);
- relative link whose target does not exist (pages and indexes);
- folder holding Markdown without `index.md`; index without `title`;
- index frontmatter keys other than `title`, `sidebar_position` (root: also `okf_version`; root missing `okf_version` is an error);
- `log.md` frontmatter keys other than `title`, `sidebar_position`; log headings not `## YYYY-MM-DD`; dates not strictly descending; bullets not matching the profile pattern;
- in check mode: any index block, `manifest.json` or code map that a run would change (stale).

Page frontmatter: `title`, `description` (ONE sentence, a decision aid answering "is this the file I need?"), `type` (required, free vocabulary), `tags` (recommended list), `resource` (blob URL), optional `sources: [- resource: <url>]`, Docusaurus extras (`sidebar_position`, `slug`) allowed and preserved. Root index declares `okf_version: "0.2"`. `log.md` carries `title` + `sidebar_position` as the profile's labelled deviation (stated in the bundle's AGENTS.md). Generated files are never hand-edited.

Public API (exact TypeScript in plan Tasks 3-5): `parseFrontmatter`, `validatePage`, `generateBundle`, `checkBundle`, `prependLogEntries`, `logEntriesFromCommits`, `validateLog`, `rewriteRefs`, `renderCodeMap`, `codeMapPath`, Node helpers `readBundle`/`writeFiles`, CLI `okf generate|check <dir> [--repo owner/repo]...`.

### 4.3 Auth service (`services/auth`)

Contract: `AuthProvider { id; login(credentials): Promise<Session>; verify(session): Promise<Identity> }`, `Identity = {name, login, email, role: 'viewer'|'editor'}`.

Phase 1 implementation `GithubTokenProvider({owner, repo, fetch?})`:

- `login({kind:'github-token', token})` calls `verify` and returns `{provider:'github-token', token, createdAt}`.
- `verify(session)` calls `GET /repos/{owner}/{repo}`; 401/403/404 are `INVALID_CREDENTIALS`, other failures `NETWORK`; then requires `permissions.push === true`, otherwise throws `AuthError('NOT_COLLABORATOR', 'You are not a write collaborator of <owner>/<repo>')`; identity name/login/email come from `GET /user` (`email` may be null; the content service then uses `<login>@users.noreply.github.com` as commit author email). Role is `editor` when push is true.
- `MockAuthProvider` accepts `{kind:'mock', name, role}` and is used by tests and the Playwright e2e.
- Session storage is the editor's concern (`BrowserSessionStore`: memory first, optional `localStorage` persistence behind an explicit "remember on this device" checkbox with a shared-device warning).

Phase 2 (spec only): `PasswordProvider` reads a users list (`username`, Argon2id hash, role) from an environment variable populated from a GitHub secret at deploy time; `login` verifies the hash and issues a JWT signed with a private key; the public key is published at `/.well-known/docs-platform-jwks.json`; `verify` validates signature and expiry. No existing provider changes.

### 4.4 Content service (`services/content`)

Contract `ContentBackend` operations: `listVersions`, `listPages(version)`, `readPage(version, path)`, `writePage(version, path, text, opts)`, `createPage`, `deletePage`, `renamePage`, `uploadAsset(path, bytes, opts)`, `listAssets()`, `search(version, query)`, `publishVersion(version, opts)`, `getAsset(ref)`. Paths are bundle-relative POSIX paths (`systems/inventory.md`). Layout mapping is shared by all backends: `current -> <site>/docs`, `<v> -> <site>/versioned_docs/version-<v>`, `versions.json` at `<site>/versions.json`, static assets under `<site>/static/`.

Every write (all backends): reject if the version is frozen (`FROZEN`); validate the page with `validatePage` (`VALIDATION` with the problem list); load the bundle, apply the change, run `generateBundle` (problems -> `VALIDATION`); prepend log entries; write the page + every regenerated file (affected index blocks, `manifest.json`, `log.md`, code maps) in ONE commit whose author is the editor's identity. `expectedEtag` mismatch -> `CONFLICT`.

`publishVersion(v)`: snapshot `docs/` (minus `versions/`) into `versioned_docs/version-<v>/`; resolve each declared code repo's `defaultRef` to a commit sha; write `docs/versions/<v>.json` as `{version, frozenAt, pins: {"owner/repo": "<sha>"}, refs: {"owner/repo": "<defaultRef>"}}` (`pins` exactly as the profile prescribes; `refs` is an additive platform extension recording the branch label); rewrite every blob URL and every viewer `ref="<defaultRef>"` attribute (on elements carrying `repo="owner/repo"`) in the snapshot to the sha; regenerate the frozen bundle; write `versioned_sidebars/version-<v>-sidebars.json` and prepend `v` to `versions.json`; one commit; git tag `docs-v<v>`.

Implementations:

- `LocalFolderBackend({siteDir, codeRepos, resolveRef?})` (Node): filesystem + `git` CLI commits (`--author`), used for development, tests and the e2e. `resolveRef` defaults to unauthenticated `GET https://api.github.com/repos/{o}/{r}/commits/{ref}`; tests inject a stub.
- `GithubBrowserBackend({owner, repo, branch, sitePath, codeRepos, token, fetch?})` (browser): Contents API for reads; Git Data API (blobs -> tree with `base_tree` -> commit with `author` -> `PATCH refs/heads/<branch>`) for every write so multi-file commits are atomic; tags via `POST /git/refs`. Bundle loading fetches the recursive tree once and blob contents by sha (cached in memory by sha).
- `HttpContentBackend(baseUrl)` (browser) + `serveContentBackend(backend, {port})` (Node): a thin JSON-over-HTTP bridge exposing any `ContentBackend`. In Phase 1 it exists only for local development (`npm run dev` in the editor against a LocalFolderBackend) and the Playwright e2e. Phase 2 promotes it: the server-side backend holds the GitHub token as a secret and enforces the auth session.
- `getAsset({repo, ref, path})`: primary source `https://media.githubusercontent.com/media/<owner>/<repo>/<ref>/<path>` (serves real bytes for Git LFS pointers and plain blobs; anonymous for public repos, `Authorization: token` when a session token is present), fallback `https://raw.githubusercontent.com/...`. Responses are streamed into the Cache API store `docs-platform-assets` keyed by `<repo>@<ref>/<path>` (immutable when `ref` is a 40-hex sha; 10 minute TTL when it is a branch). Files over 100 MB are rejected with `TOO_LARGE`.
- Search: at site build time `site/scripts/build-platform-artifacts.mjs` builds an Orama index (`@orama/orama`) over `manifest.json` entries plus each page's first 2,000 body characters and writes `static/platform/search-index-<version>.json`. Phase 1 `search(version, query)` loads that file with `@orama/orama`'s `load` and runs `search`; the site's search box keeps using `@orama/plugin-docusaurus-v3`. Phase 2 exposes `search` as an HTTP endpoint on the same index.

### 4.5 Editor service (`services/editor`)

Standalone React app built with Vite, keeping `@mdxeditor/editor` and the ported toolbar (undo/redo, bold/italic/underline, headings/quote, lists, links, image URL + upload, 3D model upload, insert-from-repo, tabs, table, hr, code block with CodeMirror, admonitions) and the ported JSX descriptors for ModelViewer/FbxViewer/Tabs/TabItem.

New in Phase 1:

- logs in through `AuthProvider`; talks only to `ContentBackend`; both are created in `src/composition/createPlatform.ts` from `platform.config.js` (overridable by `VITE_PLATFORM_AUTH=mock` and `VITE_PLATFORM_CONTENT=http://localhost:4321` for dev/e2e);
- create / delete / rename pages; Publish Version action (role `editor`) with a version label input; frozen versions open read-only;
- frontmatter form: `title`, `description`, `type` (dropdown of the values in use, with a free-text "new type" entry), `tags` (comma-separated input), `resource`, `sidebar_position`; edits go through the `yaml` package's `parseDocument`/`set`/`toString` so untouched lines, comments and scalar types survive (fixes the numeric-quoting bug);
- `index.md`, `log.md`, `AGENTS.md`, `README.md` and `code-maps/` are hidden from the file picker (folder indexes are edited only through their intro paragraph, exposed as a separate "Folder intro" editor that never touches the generated block);
- validator problems (`validatePage` locally, then the backend's `VALIDATION` errors) are shown before/at save;
- component insertion is driven by `components.json` fetched from the site (`<baseUrl>platform/components.json`) with a bundled default; previews for the viewers come from `@platform/viewers`, not from site code;
- session store: memory, optional `localStorage` with a shared-device warning and a "forget token" button.

Deployment: `vite build` with `base = <baseUrl>editor/`; the site deploy workflow copies `services/editor/dist` to `site/build/editor/` so the editor is served at `https://RayanYousef.github.io/CloudDocumentationPersonal/editor/`. The navbar links to it.

### 4.6 Gate service (`services/gate`) - Phase 2 only

Serves the built site only with a valid session (cookie carrying the JWT from 4.3), redirecting to the editor's login otherwise. Phase 1 has no gate; the site is public.

### 4.7 Site (`site/`)

Docusaurus 3.10.1 renamed from `website/`, keeping the arcade theme, Orama search box, versioning, and the viewers.

Changes:

- `platform.config.js` (repo root) replaces `site.config.js`: site identity (`siteUrl`, `baseUrl`, `organizationName`, `projectName`, `deployBranch`, `title`, `tagline`, `navbarTitle`, `footerCopyright`), `sitePath: 'site'`, `features: {editor, viewers, search}`, `auth: {provider}`, `content: {backend}`, `codeRepos`. `docusaurus.config.js` reads all navbar/footer strings from it; nothing is hardcoded.
- Removed: `plugins/okf-graph`, `src/components/OkfGraph`, `src/pages/viz.js`, `src/theme/DocItem/Layout`, `src/pages/editor.js`, `src/components/editor`, `cytoscape` and `@mdxeditor/editor` dependencies, `DocCardList` indexes, `_category_.json` files, the old demo docs.
- `ModelViewer` and `FbxViewer` (`site/src/components/`) wrap `@platform/viewers` cores in `BrowserOnly` and accept either `src` (site-static path resolved through `useBaseUrl`) or `repo` + `ref` + `path` resolved through `site/src/platform/useAssetUrl.ts` -> `ContentBackend.getAsset` (public raw URL when the code repo is public; token-authenticated when an editor session exists in `localStorage`; a labelled placeholder otherwise). They are registered as global MDX components (`src/theme/MDXComponents.js`) so pages need no import lines.
- Folder `index.md` files are readable Markdown lists (hand-written intro + generated block). `docs/AGENTS.md` and `docs/README.md` are excluded from Docusaurus via the docs plugin `exclude` option.
- Demo content from `okf-example/`: `docs/` -> `site/docs/`; `docs-v1.0.0/` -> `site/versioned_docs/version-1.0.0/` (replacing the stub; kept partial, its README explains why, and its root `index.md` plus `systems/index.md` are created so the frozen bundle validates); `unity-project/` -> `examples/unity-project/`, declared in `platform.config.js` as `{owner:'RayanYousef', repo:'CloudDocumentationPersonal', defaultRef:'main', label:'Skyforge (sample Unity project)', pathPrefix:'examples/unity-project'}`. Every `resource`/`sources` URL is rewritten from `https://github.com/skyforge-studio/skyforge/blob/main/<p>` to `https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/examples/unity-project/<p>` so it resolves on GitHub. Stub files are added to the mirror for every cited path that did not exist (`Assets/Scripts/Combat/DamagePipeline.cs`, `Assets/Scripts/Persistence/SaveService.cs`, `Assets/Scripts/Persistence/Migrations/`, `Assets/Scripts/Net/ReplicationService.cs`, `Assets/Scripts/Net/LagCompensator.cs`, each folder with an `index.md`). The two 89/66-byte placeholder FBX files are replaced by the real sample meshes from `website/static/models/fbx/` so the viewers render. The frozen 1.0.0 pins use the real sha of the commit that adds `examples/unity-project/`.
- The deliberate broken link in `systems/combat.md` is FIXED (the link becomes plain text) so CI is green; the broken-link rule is demonstrated by an okf-core unit test fixture instead.
- `site/scripts/build-platform-artifacts.mjs` (prebuild) writes `static/platform/components.json`, `static/platform/versions.json`, `static/platform/manifest-<version>.json`, `static/platform/search-index-<version>.json`. `static/platform/` is git-ignored. `site/components.json` (hand-maintained) is the source of `components.json`.
- Navbar: version dropdown, Documentation, Change Log, Editor (`href` = `<baseUrl>editor/`), GitHub. Footer from config.

### 4.8 Shell

Phase 1: static composition. `deploy-pages.yml` builds packages, the editor and the site, copies the editor into `site/build/editor/`, and publishes `site/build` to `gh-pages`.

Phase 2 (spec): a thin Hono application mounting the services on paths in one process (`/` gate + site, `/editor/`, `/api/content/*`, `/api/auth/*`, `/api/search`), deployed as a Docker image or a Node process. Services are mounted through their contracts; nothing in Phase 1 code changes.

### 4.9 GitHub Actions

- `okf-validate.yml` (every push and pull request): `npm ci`, build packages, `npm run okf:check` (validator + stale check on Latest and every frozen version), `npm run lint`, `npm test`. Fails on any problem.
- `deploy-pages.yml` (push to `main`): build + publish as in 4.8. Concurrency group `deploy-pages`.
- `deploy-docs.yml` is removed.
- The repository must be made public and Pages re-enabled: `gh repo edit RayanYousef/CloudDocumentationPersonal --visibility public --accept-visibility-change-consequences`, then after the first successful deploy `gh api -X POST repos/RayanYousef/CloudDocumentationPersonal/pages -f "source[branch]=gh-pages" -f "source[path]=/"` (or `PUT` if a Pages site already exists). A history scan for token-like strings precedes the visibility change.

### 4.10 Platform agent skill (`.agents/skills/docs-platform/`)

The ONLY agent entry point for this platform. `SKILL.md` plus `references/registry.md`, `references/navigation.md`, `references/authoring.md`.

- Registry: `~/.docs-platform/registry.json` (Windows `%USERPROFILE%\.docs-platform\registry.json`), outside any repository: `{"version": 1, "bundles": [{"remote": "<normalised git remote URL>", "docs": {"kind": "local", "sitePath": "<abs path to site/>"} | {"kind": "content-service", "url": "<https://...>", "tokenEnv": "<ENV VAR NAME>"}}]}`. Remote URLs are normalised (`git@github.com:o/r.git` and `https://github.com/o/r.git` both become `https://github.com/o/r`).
- On start inside a code repo: `git remote get-url origin`, normalise, look up the bundle, open `<docs>/index.md`, then `AGENTS.md`, then the code map for this repo (`code-maps/<owner>--<repo>.md`) to jump from a code path to the pages that describe it.
- Authoring: how to add/update pages (frontmatter fields, decision-aid descriptions), add folders, run `npm run okf:generate` / `npm run okf:check`, and commit; how to use the content service when the bundle is remote.
- References `ray-okf-core` for format rules and NEVER modifies it. Writes no AGENTS.md and no index files into code repositories.

### 4.11 Future: push-triggered documentation updater (spec only)

A workflow in each code repository posts the pushed commit range to the content service (Phase 2 HTTP surface). The updater loads `manifest.json` and the repo's code map, maps every changed file to the pages whose `resource`/`sources` cite it (path-prefix match), asks an LLM to propose page updates with the diff as context, validates the result with okf-core, and opens a pull request against the docs branch with the regenerated indexes, manifest, log and code maps. Nothing in Phase 1 needs to change: the manifest and code maps are already the reverse index it needs.

## 5. Data formats (authoritative examples)

Concept page:

```markdown
---
title: Inventory
description: Explains how items are stacked, stored and moved between containers, and which service API you call to change a player's inventory.
type: system
tags: [inventory, items, gameplay, service]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/examples/unity-project/Assets/Scripts/Inventory
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/examples/unity-project/Assets/Scripts/Inventory/InventoryService.cs
sidebar_position: 1
---
```

Folder index: frontmatter `title` (+ `sidebar_position`), intro paragraph, generated block. Root index adds `okf_version: "0.2"`.

`manifest.json` entry: `{"route":"/systems/inventory","file":"systems/inventory.md","title":"Inventory","description":"...","type":"system","tags":["inventory"],"resource":"https://github.com/.../Inventory","sources":["https://github.com/.../InventoryService.cs"]}`.

Code map `code-maps/RayanYousef--CloudDocumentationPersonal.md`:

```markdown
---
title: "Code map: RayanYousef/CloudDocumentationPersonal"
sidebar_position: 98
---

<!-- okf:codemap -->
# Code map: RayanYousef/CloudDocumentationPersonal

Generated from manifest.json. Each code path lists the pages that describe it; (source) marks a sources citation.

* `examples/unity-project/Assets/Models` - [Airship Model](/assets/airship-model.md), [Forge Props](/assets/forge-props.md)
* `examples/unity-project/Assets/Models/Airship.fbx` - [Airship Model](/assets/airship-model.md) (source)
<!-- /okf:codemap -->
```

`versions/1.0.0.json`: `{"version":"1.0.0","frozenAt":"2026-09-07T00:00:00Z","pins":{"RayanYousef/CloudDocumentationPersonal":"<sha>"},"refs":{"RayanYousef/CloudDocumentationPersonal":"main"}}`.

`components.json`:

```json
{"components":[
 {"name":"ModelViewer","kind":"flow","hasChildren":false,"preview":"model-viewer",
  "props":[{"name":"src","type":"string"},{"name":"repo","type":"string"},{"name":"ref","type":"string"},{"name":"path","type":"string"},{"name":"alt","type":"string"},{"name":"height","type":"number"}]},
 {"name":"FbxViewer","kind":"flow","hasChildren":false,"preview":"fbx-viewer",
  "props":[{"name":"src","type":"string"},{"name":"repo","type":"string"},{"name":"ref","type":"string"},{"name":"path","type":"string"},{"name":"alt","type":"string"},{"name":"height","type":"number"}]},
 {"name":"Tabs","kind":"flow","hasChildren":true,"preview":"tabs","props":[{"name":"groupId","type":"string"}]},
 {"name":"TabItem","kind":"flow","hasChildren":true,"preview":"tab-item","props":[{"name":"value","type":"string"},{"name":"label","type":"string"},{"name":"default","type":"boolean"}]}
]}
```

Log bullet: `* **Update**: [Inventory](/systems/inventory.md) - added the quality seed field. (by Rayan Yousef)`.

## 6. Testing strategy

- Vitest in every package and service; TypeScript `strict: true` everywhere; `npm test` at the root runs all workspaces.
- Contract suites in `packages/contracts/src/testing/` run against `LocalFolderBackend` (temp git repo) and `GithubBrowserBackend` (an in-memory `FakeGitHub` implementing the Git Data, Contents, repos and user endpoints), and against `GithubTokenProvider` (mocked fetch) and `MockAuthProvider`.
- okf-core tests use fixtures derived from `okf-example` (a clean bundle and variants with a broken link, a bad resource URL, an extra index key, a stale block, an undeclared repo).
- One Playwright e2e in `services/editor/e2e/`: starts `serveContentBackend(new LocalFolderBackend(tempRepo))` and the editor with `VITE_PLATFORM_AUTH=mock`, logs in, edits a page, creates a page, publishes version `1.1.0`, then asserts on the temp repo: the commits exist with the mock author, the index block and manifest changed, `versioned_docs/version-1.1.0/` exists with sha-pinned URLs, tag `docs-v1.1.0` exists.
- Lint boundary test: a Vitest test at the root runs ESLint programmatically on a fixture importing `@platform/content` from `services/auth` and expects the boundary error.

## 7. Decisions not previously specified (and why)

1. `packages/viewers` added: the three.js/model-viewer rendering cores are shared by the site (wrapped with `BrowserOnly` + asset resolution) and the editor (live previews) without the editor importing site code.
2. TS interfaces, not OpenAPI, for the Phase 1 contract; OpenAPI is derived in Phase 2.
3. okf-core core operates on an in-memory file map so the browser backend can regenerate before committing; Node I/O lives in a separate `node` entry.
4. `HttpContentBackend` + `serveContentBackend` are included in Phase 1 as dev/test infrastructure (the e2e needs the editor to reach a LocalFolderBackend); they are the seed of the Phase 2 server backend.
5. `MockAuthProvider` for tests and e2e.
6. Composition roots (`services/editor/src/composition/`, `site/src/platform/`) are the only places allowed to import service implementations.
7. Sample code repo lives at `examples/unity-project/` in this repository and is declared with `pathPrefix`; resource URLs are rewritten to this repository; stub source files are added for every cited path; placeholder FBX files replaced with real meshes.
8. The deliberate broken link is fixed; the rule is covered by a unit test fixture.
9. Frozen 1.0.0 stays partial (root index + systems/index + systems/inventory) with a README explaining it; its pins use a real sha from this branch.
10. `versions/<v>.json` keeps the profile's `pins` map and adds `refs` (branch labels).
11. Code maps live in the reserved generated folder `code-maps/` inside the bundle (platform extension; documented in AGENTS.md as generated).
12. Log completeness is guaranteed by the write path; the validator checks format and order only.
13. Two Orama indexes: the Docusaurus plugin's for the site UI, and `static/platform/search-index-<version>.json` for `ContentBackend.search`.
14. Editor frontmatter uses the `yaml` package's document API for edits; okf-core keeps its own zero-dependency YAML subset parser for validation.
15. Viewers are global MDX components; descriptors have no `source`, so no import lines are emitted.
16. Asset fetches use `media.githubusercontent.com` (LFS-aware) first, `raw.githubusercontent.com` as fallback, cached with the Cache API.
17. `index.md`, `log.md`, `AGENTS.md`, `README.md`, `code-maps/` are hidden from the editor's file picker; folder intros are edited through a dedicated "Folder intro" view that only touches text before the markers.
18. Node 22 in CI; `engines.node >= 20` kept.
19. `scripts/build-site.ps1` and `scripts/start-site.ps1` are replaced by root npm scripts.
20. The platform skill is committed in this repo at `.agents/skills/docs-platform/`; installing it for other repos means copying that folder to `C:\Users\Ray\.agents\skills\docs-platform\` (documented, not automated).
