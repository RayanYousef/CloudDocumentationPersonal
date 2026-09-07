---
title: Roadmap
description: Lists what Phase 2 adds (password provider from GitHub secrets, server-side content service behind a Hono shell, a gate for private viewing, Docker or Node deployment, the push-triggered documentation updater) and the editor's known minor issues; open it to see what is planned versus shipped before proposing a change.
type: reference
tags: [platform, roadmap, phase-2, hono, gate, docker, updater]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/docs/design/2026-09-06-documentation-platform-design.md
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/content/src/http/serveContentBackend.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/auth/src/GithubTokenProvider.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/okf-core/src/codemap.ts
sidebar_position: 12
---

Phase 1 (shipped) is the static composition documented in [Architecture](architecture.md). Phase 2 adds a server; the design rule is that nothing built in Phase 1 is rewritten, only mounted. Each item below names the spec section it comes from and the extension guide that applies.

## Phase 2

### Password provider from GitHub secrets (spec 4.3)

`PasswordProvider` in `services/auth`: reads a users list (`username`, Argon2id hash, `role`) from an environment variable populated from a GitHub secret at deploy time; `login` verifies the hash and issues a JWT signed with a private key; the public key is published at `/.well-known/docs-platform-jwks.json`; `verify` validates signature and expiry. Requires a new `Credentials` member (`kind: 'password'`) and a new `auth.provider` value. No existing provider changes. Guide: [Add an auth provider](extending/add-auth-provider.md).

### Server-side content service in a Hono shell (spec 4.4, 4.8)

A thin Hono application mounting the services on paths in one process: `/` (gate plus site), `/editor/`, `/api/content/*`, `/api/auth/*`, `/api/search`. The content route promotes today's `serveContentBackend` bridge: the server-side backend holds the GitHub token as a secret and enforces the auth session; browsers keep using `HttpContentBackend` (`content: { backend: 'http', url }`). `search` becomes an HTTP endpoint over the same `search-index-<version>.json`. An OpenAPI document is derived from the TypeScript contracts at this point. Guides: [Add a content backend](extending/add-content-backend.md), [Add a new service module](extending/add-service-module.md).

### Gate for private viewing (spec 4.6)

`services/gate` serves the built site only with a valid session (a cookie carrying the JWT from the password provider) and redirects to the editor's login otherwise. Phase 1 has no gate; the site is public. Guide: [Add a new service module](extending/add-service-module.md).

### Docker or Node deployment (spec 4.8)

The shell ships as a Docker image or a plain Node process; a new workflow builds it on push to `main` while `deploy-pages.yml` continues to publish the static site until it is retired. Guide: [Add a deploy target](extending/add-deploy-target.md).

### Push-triggered documentation updater (spec 4.11)

A workflow in each code repository posts the pushed commit range to the content service. The updater loads `manifest.json` and the repo's code map, maps every changed file to the pages whose `resource` or `sources` cite it (longest path-prefix match), asks an LLM to propose page updates with the diff as context, validates the result with okf-core, and opens a pull request against the docs branch with the regenerated indexes, manifest, log and code maps. The manifest and code maps produced today are already the reverse index it needs; because this bundle now documents the platform, the same mechanism can keep these pages current when platform code changes.

## Editor: known minor issues

Carried over from [Editor service](editor.md); none blocks daily use.

- Rename and Delete use native `window.prompt` and `window.confirm` instead of the shared `Modal`.
- The frontmatter form has no `sources` field; edit them in the raw-MDX view.
- The New page dialog derives its default `resource` from the first `codeRepos` entry only.
- A failed `components.json` fetch falls back to the bundled component list without telling the user.
- The Phase 1 HTTP bridge has no authentication, so it stays local-only until the server exists.

## Not planned

Modifying an existing provider, backend or the format skill (`ray-okf-core`) to accommodate a new mechanism. Extensions are new implementations of existing contracts, registered in a composition root and proven by the contract suites.
