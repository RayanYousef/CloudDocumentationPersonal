---
title: Add an auth provider
description: "Step-by-step recipe for a new AuthProvider (for example the Phase 2 password provider): the interface and credentials union to extend, the contract suite to pass, where the editor's composition root selects it and which config field switches it on."
type: guide
tags: [platform, extending, auth, provider, contract-test]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/auth/src
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/contracts/src/auth.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/contracts/src/platform-config.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/contracts/src/testing/authProviderContract.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/auth/test/MockAuthProvider.test.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/editor/src/composition/createPlatform.ts
sidebar_position: 1
---

Existing providers are never modified; a new mechanism is a new class. `MockAuthProvider` is the smallest complete example to copy.

| Item | Where |
|---|---|
| Contract to implement | `AuthProvider { id; login(credentials): Promise<Session>; verify(session): Promise<Identity> }` in `packages/contracts/src/auth.ts` |
| Contract test to run | `describeAuthProviderContract` from `@platform/contracts/testing` (built into `packages/contracts/src/testing/authProviderContract.ts`) |
| Composition root to register in | `services/editor/src/composition/createPlatform.ts` (and `site/src/platform/` only if the site must authenticate with it) |
| Config field | `auth.provider` in `platform.config.js`; the union in `PlatformConfig['auth']['provider']` |
| Boundary rule | `services/auth` imports only `@platform/contracts` and `@platform/okf-core`; nothing may import a provider except a composition root |

## Steps

1. **Extend the credentials union.** In `packages/contracts/src/auth.ts` add a member to `Credentials`, e.g. `PasswordCredentials { kind: 'password'; username: string; password: string }`. Existing providers keep throwing `UNSUPPORTED_CREDENTIALS` for it, which the contract suite checks.
2. **Widen the config union.** In `packages/contracts/src/platform-config.ts` add the new id to `auth.provider` (`'github-token' | 'mock' | 'password'`).
3. **Implement the provider** in `services/auth/src/<Name>Provider.ts` with a stable `id` equal to the config value. `login` must return `{ provider: this.id, token, createdAt }`; `verify` must throw `AuthError('INVALID_CREDENTIALS')` for a session that does not belong to it, `NOT_COLLABORATOR` for an authenticated identity without write access (when the mechanism can express that), and `NETWORK` for transport failures. Export it from `services/auth/src/index.ts`.
4. **Pass the contract suite.** Create `services/auth/test/<Name>Provider.test.ts` and call `describeAuthProviderContract('<Name>Provider', async () => ({ provider, validCredentials, invalidCredentials, nonCollaboratorCredentials? }))`. Inject `fetch` or any I/O through the constructor so the test needs no network (see `test/fakeGithubAuth.ts`). Run `npm test -w @platform/auth`.
5. **Register it** in `createPlatform.ts`: extend the `authKind` switch so the config value (or `VITE_PLATFORM_AUTH`) instantiates the new class. This file is the `editor-composition` lint element and the only editor code allowed to import `@platform/auth`.
6. **Teach the login screen** the new credentials shape if it needs different inputs (`services/editor/src/components/LoginGate.tsx`); the rest of the editor only sees `Session` and `Identity`.
7. **Set the config**: `auth: { provider: 'password' }` in `platform.config.js`. Secrets never go in that file; a server-side provider reads them from the environment (see the [Roadmap](../roadmap.md) for the Phase 2 password provider design).
8. **Verify**: `npm run lint` (boundary rule), `npm test`, and the e2e if the editor UI changed.
