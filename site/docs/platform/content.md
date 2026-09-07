---
title: Content service
description: Describes the three ContentBackend implementations (local folder, GitHub-in-browser, HTTP bridge), the shared write and publish pipelines, the LFS-aware asset fetch and the Orama search; open it when a save, publish or asset load misbehaves or when you are writing a new backend.
type: system
tags: [platform, content, github, git-data, publish, assets, search]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/content
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/content/src/writePipeline.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/content/src/publishPipeline.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/content/src/layout.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/content/src/local/LocalFolderBackend.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/content/src/github/GithubBrowserBackend.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/content/src/github/gitData.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/content/src/http/HttpContentBackend.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/content/src/http/serveContentBackend.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/content/src/assets/getAsset.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/content/src/search/index.ts
sidebar_position: 5
---

`@platform/content` holds every `ContentBackend` implementation and the code they share. It imports `@platform/contracts` and `@platform/okf-core` only. Two entries: the default entry is browser-safe; `@platform/content/node` (`src/node.ts`) adds `LocalFolderBackend`, the git helpers and `serveContentBackend`.

## Shared layout and pipelines

- `layout.ts`: `versionDir(version)` maps `current` to `docs` and `<v>` to `versioned_docs/version-<v>`; `isFrozen`; `STATIC_DIR = 'static'`; `ASSET_DIRS = ['models', 'uploads', 'img']`; `assetKind(path)`; `assertPagePath` (bundle-relative, `.md`/`.mdx`, no dot segments).
- `writePipeline.ts`: `planPageChanges(files, changes, ctx)` is pure. It applies the changes to the in-memory bundle, validates each concept page with `validatePage` (throws `VALIDATION` with the problem list), runs `generateBundle` (throws `VALIDATION` if the bundle no longer validates), collects `regenerated` paths, and prepends `log.md` entries (`Add` when the file did not exist, `Update` otherwise; author and message from `ctx`). `contentEtag(text)` is an FNV-1a digest that works in browsers and Node.
- `publishPipeline.ts`: `planPublish(latest, version, versionsJson, codeRepos, pins, frozenAt)` validates the version label (`MAJOR.MINOR.PATCH`, must not exist), rewrites refs to the resolved sha for every declared repo, regenerates the snapshot, and returns the writes for `versioned_docs/version-<v>/`, `docs/versions/<v>.json` (`pins` per the profile, `refs` recording the branch label), `versioned_sidebars/version-<v>-sidebars.json`, `versions.json` and the tag name `docs-v<v>`.

Every backend follows the same write rules: reject frozen versions with `FROZEN`, run the pipeline, write the page plus every regenerated file in one commit under the editor's identity, and return `CONFLICT` when `expectedEtag` no longer matches.

## Implementations

| Class | Id | Runs in | Storage |
|---|---|---|---|
| `LocalFolderBackend({ siteDir, codeRepos, resolveRef? })` | `local-folder` | Node | filesystem plus `git` CLI commits with `--author`; `resolveRef` defaults to an unauthenticated `GET /repos/{o}/{r}/commits/{ref}` and tests inject a stub. Used for development, tests and the e2e. |
| `GithubBrowserBackend({ owner, repo, branch, sitePath, codeRepos, token, fetch?, apiRoot? })` | `github-browser` | browser | Git Data API. Reads fetch the recursive tree once and blobs by sha (cached in memory by sha); every write is blobs, a tree with `base_tree`, a commit with `author`, then `PATCH refs/heads/<branch>`, so multi-file commits are atomic; tags via `POST /git/refs`. |
| `HttpContentBackend(baseUrl, fetch?)` | `http` | browser | JSON over `POST <baseUrl>/rpc` with `{ method, args }`; errors come back as `{ error: { code, message, details } }` and are re-thrown as `ContentError`. Paired with `serveContentBackend(backend, { port, host })`, which exposes any backend over the same protocol (no auth in Phase 1: dev and e2e only). |

`GithubBrowserBackend` is what the live site and editor use (`content.backend: 'github-browser'` in `platform.config.js`). `HttpContentBackend` is selected by `content.backend: 'http'` plus `content.url`, or by `VITE_PLATFORM_CONTENT` in the editor; in Phase 2 it becomes the client of the server-side backend that holds the GitHub token as a secret.

## Assets

`fetchAsset(ref, { token?, fetch?, cache? })` in `src/assets/getAsset.ts` builds two URLs from `AssetRef { repo, ref, path }`: `media.githubusercontent.com` first (serves real bytes for Git LFS pointers), `raw.githubusercontent.com` as fallback. A token adds `Authorization: token ...`. Responses are cached in the Cache API store `docs-platform-assets` (immutable for a 40-hex sha, ten-minute TTL for a branch); `MAX_ASSET_BYTES` is 100 MB and larger files throw `TOO_LARGE`. `uploadAsset` writes into `static/models`, `static/uploads` or `static/img` and returns an `AssetInfo`.

## Search

`buildSearchIndex(files)` in `src/search/index.ts` creates an Orama index over every concept page (path, title, description, type, tags, first 2,000 body characters) and returns its serialised form; `searchRaw(raw, query)` loads it and returns up to 20 `SearchHit`s. The site prebuild writes `static/platform/search-index-<version>.json` from this, and `ContentBackend.search` loads that file. The site's search box uses the separate `@orama/plugin-docusaurus-v3` index (decision 13 in [Decisions](decisions.md)).

## Tests

`test/LocalFolderBackend.test.ts` runs the contract suite against a temporary git repository; `test/GithubBrowserBackend.test.ts` runs it against `test/FakeGitHub.ts`, an in-memory implementation of the Git Data, Contents, repos and user endpoints; `test/HttpContentBackend.test.ts` runs it through `serveContentBackend` over a `LocalFolderBackend`. Pipeline and asset tests are unit tests.
