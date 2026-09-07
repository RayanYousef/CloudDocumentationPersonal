---
title: Add a deploy target
description: "Recipe for hosting the site somewhere other than GitHub Pages (another static host, Docker, a Node process): what site:build produces, which config fields fix the URLs, how the editor and Phase 2 server are mounted, and the workflow to add without touching deploy-pages.yml."
type: guide
tags: [platform, extending, deploy, github-actions, docker, hosting]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/.github/workflows/deploy-pages.yml
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/package.json
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/platform.config.js
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/scripts/copy-editor.mjs
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/editor/vite.config.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/content/src/http/serveContentBackend.ts
sidebar_position: 5
---

Deployment is additive: `deploy-pages.yml` stays as it is and a new target gets its own workflow that consumes the same build output.

| Item | Where |
|---|---|
| Contract to implement | none in code; the contract is the build output: `site/build/` (static site with the editor at `site/build/editor/`) produced by `npm run site:build` |
| Contract test to run | `npm run okf:check`, `npm run lint`, `npm test` before the build, exactly as `okf-validate.yml` does; a smoke check that `site/build/index.html` and `site/build/editor/index.html` exist after it |
| Composition root to register in | Phase 1: none (static). Phase 2: the Hono shell's mount table (`/` gate + site, `/editor/`, `/api/content/*`, `/api/auth/*`, `/api/search`) |
| Config field | `siteUrl`, `baseUrl`, `deployBranch` in `platform.config.js` (they drive Docusaurus `url`/`baseUrl`, the editor's Vite `base` and the GitHub backend's branch); `content.backend`/`content.url` when the target hosts a content service |
| Boundary rule | workflows and root scripts are the `root` element: they may import `platform.config.js`, `@platform/contracts`, `@platform/okf-core` and `@platform/content`, nothing else |

## Static host (Netlify, S3, another Pages site)

1. Set `siteUrl` and `baseUrl` for the new host. Both the site and the editor read them at build time, so a wrong `baseUrl` breaks every asset and the `/editor/` link.
2. Add `.github/workflows/deploy-<target>.yml`: checkout, Node 22, `npm ci`, build packages and services (copy the step from `deploy-pages.yml`), `npm run okf:check`, `npm run site:build`, then the host's upload action over `./site/build`. Use a distinct `concurrency` group.
3. If the host serves from a sub-path, keep `baseUrl` ending in `/` and confirm `site/build/editor/index.html` loads its chunks from `<baseUrl>editor/`.

## Docker image or Node process (Phase 2 shape)

1. Build stage: the same commands as above produce `site/build`.
2. Runtime stage: a Node image running the Hono shell (see the [Roadmap](../roadmap.md)) that serves `site/build` behind the gate, mounts the editor at `/editor/`, and exposes `serveContentBackend`-style routes for a server-side `ContentBackend` holding the GitHub token as an environment secret. Until the shell exists, `services/editor/e2e/content-server.mjs` shows the minimal Node process: `serveContentBackend(new LocalFolderBackend(...), { port })`.
3. Config for that deployment: `content: { backend: 'http', url: 'https://<host>/api/content' }` and, once the password provider ships, `auth: { provider: 'password' }`. Secrets (users list, JWT key, GitHub token) arrive through the environment from GitHub secrets, never through `platform.config.js`.
4. Add `deploy-<target>.yml` that builds and pushes the image (or restarts the process) on push to `main`.

## Keep both green

Every new workflow must run `npm run okf:check` before building so a stale index or broken link never ships, and must not modify `deploy-pages.yml`; if GitHub Pages is retired, delete that workflow rather than repurposing it.
