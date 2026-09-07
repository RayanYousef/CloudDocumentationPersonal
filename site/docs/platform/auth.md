---
title: Auth service
description: Explains how the GitHub token provider decides who may edit (repository push permission), how the mock provider serves tests, and where sessions live in the browser; open it when a login fails or when you need the provider behaviour a new AuthProvider has to match.
type: system
tags: [platform, auth, github, session, security]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/auth
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/auth/src/GithubTokenProvider.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/auth/src/MockAuthProvider.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/auth/test/GithubTokenProvider.test.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/editor/src/session/SessionStore.ts
sidebar_position: 4
---

`@platform/auth` holds every `AuthProvider` implementation. It imports only `@platform/contracts` (and may import `@platform/okf-core`); it never imports the content service, the editor or the site.

## GithubTokenProvider

`new GithubTokenProvider({ owner, repo, fetch?, apiRoot? })`, id `github-token`.

- `login({ kind: 'github-token', token })` trims the token, builds `{ provider: 'github-token', token, createdAt }` and calls `verify`; any other `Credentials.kind` throws `UNSUPPORTED_CREDENTIALS`.
- `verify(session)` calls `GET /repos/{owner}/{repo}` with the token. 401, 403 and 404 become `AuthError('INVALID_CREDENTIALS')`; other failures `NETWORK`. It then requires `permissions.push === true`, otherwise `AuthError('NOT_COLLABORATOR', ...)` with a message that tells the user to ask for write access and create a fine-grained token with Contents: Read and write. Name, login and email come from `GET /user` (`email` may be null; the content service then commits as `<login>@users.noreply.github.com`). Role is `editor` when push is true.
- The fix this design introduced: the old editor only checked that the repository call succeeded, so any valid token passed the gate and failed at save time. The push check moves that failure to login.

Tests run the contract suite against a mocked `fetch` (`test/fakeGithubAuth.ts`) covering valid, invalid, non-collaborator and network cases.

## MockAuthProvider

Id `mock`. `login({ kind: 'mock', name, role })` encodes the identity into the token (`mock.` followed by base64 JSON); `verify` decodes it. No network. Used by unit tests and by the Playwright e2e, and selected in the editor with `VITE_PLATFORM_AUTH=mock` or `auth.provider: 'mock'` in `platform.config.js`.

## Sessions

Session storage is the editor's concern, not the provider's. `BrowserSessionStore` (`services/editor/src/session/SessionStore.ts`) keeps the session in memory and writes it to `localStorage` under `docs-platform.session` only when the user ticks "remember on this device" (the login screen shows a shared-device warning and a "forget token" button). The site reads the same key so `ModelViewer` and `FbxViewer` can fetch assets from private code repositories with the editor's token. A stored session that fails re-verification is forgotten and the provider's message is shown on the sign-in screen.

## Phase 2

`PasswordProvider` (spec section 4.3) reads a users list (username, Argon2id hash, role) from an environment variable populated from a GitHub secret at deploy time, issues a JWT signed with a private key, publishes the public key at `/.well-known/docs-platform-jwks.json`, and validates signature and expiry in `verify`. It is a new file in this service and a new `Credentials` member; no existing provider changes. Steps in [Add an auth provider](extending/add-auth-provider.md).
