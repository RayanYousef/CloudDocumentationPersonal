---
title: Add a content backend
description: "Step-by-step recipe for a new ContentBackend (for example a server-side backend or a different git host): the operations to implement, the shared pipelines to reuse, the contract suite that proves substitutability, and where the editor and site composition roots pick it."
type: guide
tags: [platform, extending, content, backend, contract-test]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/content/src
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/contracts/src/content.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/contracts/src/testing/contentBackendContract.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/content/src/writePipeline.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/content/src/publishPipeline.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/content/test/localHarness.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/editor/src/composition/createPlatform.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/site/src/platform/createContentBackend.ts
sidebar_position: 2
---

A backend owns storage and commits; validation, regeneration, logging and version freezing are shared code you call, not code you write. `LocalFolderBackend` is the reference implementation to read first.

| Item | Where |
|---|---|
| Contract to implement | `ContentBackend` (thirteen operations) in `packages/contracts/src/content.ts` |
| Contract test to run | `describeContentBackendContract` in `packages/contracts/src/testing/contentBackendContract.ts` |
| Composition roots to register in | `services/editor/src/composition/createPlatform.ts` and `site/src/platform/createContentBackend.ts` |
| Config field | `content.backend` (and `content.url` when remote) in `platform.config.js`; the union in `PlatformConfig['content']['backend']` |
| Boundary rule | `services/content` imports only `@platform/contracts` and `@platform/okf-core`; browser-safe code in the default entry, Node-only code behind `src/node.ts` |

## Steps

1. **Widen the config union** in `packages/contracts/src/platform-config.ts`: add the new backend id to `content.backend`.
2. **Create the class** in `services/content/src/<kind>/<Name>Backend.ts` with a stable `id`. Use `layout.ts` for the version-to-folder mapping (`versionDir`, `isFrozen`, `STATIC_DIR`, `ASSET_DIRS`, `assertPagePath`) so every backend agrees where files live.
3. **Reads**: `listVersions` returns `current` first with `frozen: false`; `listPages` returns concept pages only (skip reserved names and `code-maps/`); `readPage` returns an `etag` (use `contentEtag` from `writePipeline.ts` unless the store has a native one) and throws `NOT_FOUND`.
4. **Writes**: load the bundle as a `Record<path, text>` (every `.md` plus `manifest.json`), call `planPageChanges(files, [{ path, text }], { codeRepos, author, message, date })`, then persist `writes` and `deletes` in ONE commit whose author is the identity in `opts.author`. Throw `FROZEN` for a frozen version before doing anything, `CONFLICT` when `expectedEtag` does not match, `EXISTS` on `createPage` over an existing path. `renamePage` is a delete plus a create in the same commit. `uploadAsset` writes under `static/` in one of `ASSET_DIRS` and returns an `AssetInfo`.
5. **Publish**: resolve each `codeRepos` entry's `defaultRef` to a sha (inject a `resolveRef` like `LocalFolderBackend` does so tests can stub it), call `planPublish(latest, version, versionsJson, codeRepos, pins, frozenAt)`, write the result in one commit and create the tag it names.
6. **Assets and search**: delegate `getAsset` to `fetchAsset` from `src/assets/getAsset.ts` and `search` to `searchRaw` over the `search-index-<version>.json` the site prebuild produces (or build one on the fly with `buildSearchIndex`).
7. **Pass the contract suite.** Write `services/content/test/<Name>Backend.test.ts` with a harness `{ backend, readFile, listTags, cleanup }` seeded from `MINI_BUNDLE` (copy `test/localHarness.ts` or `test/FakeGitHub.ts`), then `describeContentBackendContract('<Name>Backend', factory)`. Run `npm test -w @platform/content`.
8. **Export** it from `src/index.ts` (browser-safe) or `src/node.ts` (Node-only).
9. **Register** it in both composition roots: `createPlatform.ts` for the editor and `createContentBackend.ts` for the site's asset resolution.
10. **Set the config**: `content: { backend: '<id>' }` (plus `url` for a remote backend) in `platform.config.js`.
11. **Verify** with `npm run lint`, `npm test` and, for a backend the editor will use, `npm run e2e -w @platform/editor` pointed at it through `VITE_PLATFORM_CONTENT`.

The Phase 2 server-side backend follows exactly this path: it wraps a `LocalFolderBackend` (or a GitHub Git Data client holding a secret token) behind `serveContentBackend`, and the browser keeps using `HttpContentBackend` unchanged.
