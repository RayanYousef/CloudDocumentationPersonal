---
title: Contracts
description: Lists every interface, type and error code in @platform/contracts and the two contract test suites that any new auth provider or content backend must pass; open it when you need the exact signature a service has to implement.
type: system
tags: [platform, contracts, typescript, testing, auth, content]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/contracts
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/contracts/src/auth.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/contracts/src/content.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/contracts/src/platform-config.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/contracts/src/components-manifest.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/contracts/src/testing/authProviderContract.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/contracts/src/testing/contentBackendContract.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/contracts/src/testing/fixtures/miniBundle.ts
sidebar_position: 2
---

`packages/contracts` is pure TypeScript: interfaces, discriminated unions, two error classes and two Vitest suites. It has no runtime dependency on any service, and every service depends on it. Phase 1 chose TypeScript interfaces over OpenAPI; an OpenAPI document is derived from these when the HTTP surface becomes public in Phase 2.

## auth.ts

- `Role = 'viewer' | 'editor'`.
- `Identity { name, login, email: string | null, role }`.
- `Session { provider, token, createdAt }` (`createdAt` is ISO 8601).
- `Credentials` is a discriminated union on `kind`: `GithubTokenCredentials { kind: 'github-token', token }` and `MockCredentials { kind: 'mock', name, role }`. A new provider adds a new member here.
- `AuthProvider { readonly id; login(credentials): Promise<Session>; verify(session): Promise<Identity> }`.
- `AuthError(code, message)` with `AuthErrorCode = 'INVALID_CREDENTIALS' | 'NOT_COLLABORATOR' | 'UNSUPPORTED_CREDENTIALS' | 'NETWORK'`.

## content.ts

- `VersionId` is a string; `CURRENT_VERSION = 'current'` is Latest, frozen versions use their label (`'1.0.0'`).
- Read models: `VersionInfo { id, label, frozen }`, `PageSummary { path, title, description, type, tags }`, `PageContent { path, text, etag }`, `AssetInfo { path, url, size, kind: 'model' | 'image' | 'other' }`, `SearchHit { path, title, description, score }`.
- Write models: `Author { name, email }`, `MutationOptions { message, author }`, `WriteOptions extends MutationOptions { expectedEtag? }`, `WriteResult { commitSha, commitUrl, etag, regenerated }`, `PublishResult { version, tag, commitSha, pins }`, `AssetRef { repo, ref, path }`.
- `ContentBackend { readonly id; listVersions; listPages(version); readPage(version, path); writePage(version, path, text, opts); createPage; deletePage; renamePage(version, from, to, opts); uploadAsset(path, bytes, opts); listAssets(); search(version, query); publishVersion(version, opts); getAsset(ref) }`. Page paths are bundle-relative POSIX paths (`systems/inventory.md`); asset paths are relative to the site's `static/` folder.
- `ContentError(code, message, details?)` with `ContentErrorCode = 'NOT_FOUND' | 'EXISTS' | 'CONFLICT' | 'FROZEN' | 'VALIDATION' | 'FORBIDDEN' | 'TOO_LARGE' | 'NETWORK'`. `VALIDATION` carries the okf-core problem list in `details`.

## platform-config.ts

`PlatformConfig` is the type of `platform.config.js`: site identity fields, `sitePath`, `features { editor, viewers, search }`, `auth { provider: 'github-token' | 'mock' }`, `content { backend: 'github-browser' | 'http', url? }` and `codeRepos: CodeRepoRef[]`. `CodeRepoRef { owner, repo, defaultRef, label, pathPrefix? }`; `repoKey(r)` returns `owner/repo`, the key used by pins, code maps and ref rewriting. Adding a provider or backend widens the union here first.

## components-manifest.ts

`ComponentsManifest { components: ComponentDescriptor[] }` is the shape of `site/components.json`, which the editor fetches from `<baseUrl>platform/components.json` to drive component insertion. `ComponentDescriptor { name, kind: 'flow', hasChildren, preview, props }`; `preview` is one of `model-viewer`, `fbx-viewer`, `tabs`, `tab-item`, `generic`.

## Contract test suites

- `describeAuthProviderContract(name, factory)` takes a factory returning `{ provider, validCredentials, invalidCredentials, nonCollaboratorCredentials?, cleanup? }` and checks the id, login, verify, invalid credentials, unsupported credentials and (when supplied) the `NOT_COLLABORATOR` path.
- `describeContentBackendContract(name, factory)` takes a factory returning `{ backend, readFile(relPath), listTags(), cleanup? }` seeded with `MINI_BUNDLE`, and checks version listing, page listing (reserved files and `code-maps/` hidden), etags, `NOT_FOUND`, single-commit regeneration of index, manifest and log, `CONFLICT` on a stale etag, create, delete, rename, `FROZEN`, `VALIDATION`, upload, search and publish (sha-pinned URLs, `versions/<v>.json`, tag).
- `testing/fixtures/miniBundle.ts` exports the in-memory bundle, `NEW_PAGE_TEXT` and `INVALID_PAGE_TEXT` shared by both suites and by okf-core tests.

Every implementation, present or future, registers itself with one of these suites in its own test file; that is what "substitutable" means in this codebase.
