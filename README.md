# Documentation Platform (template)

Docusaurus site + OKF Core index layer + in-browser editor + 3D viewers, organised as a contracts-first monorepo. Design: `docs/design/2026-09-06-documentation-platform-design.md`.

## Use it for a new project

1. Edit `platform.config.js`: site identity, `codeRepos` (the code repositories the docs describe), enabled features.
2. Replace `site/docs/` with your bundle (keep `index.md`, `log.md`, `AGENTS.md`; see `.agents/skills/docs-platform/`).
3. `npm ci && npm run okf:generate && npm run site:build`.
4. Push to `main`: `deploy-pages.yml` publishes the site and the editor to GitHub Pages; `okf-validate.yml` guards every push.

## Commands

| Command | What it does |
|---|---|
| `npm run okf:generate` / `npm run okf:check` | regenerate / validate every docs bundle (Latest + frozen) |
| `npm run build` | build all packages and services |
| `npm test` / `npm run lint` | Vitest everywhere / ESLint incl. import boundaries |
| `npm run site:build` | build editor + site into `site/build` (editor at `/editor/`) |
| `npm run site:start` | Docusaurus dev server |
| `npm run dev -w @platform/editor` | editor dev server (`VITE_PLATFORM_AUTH=mock VITE_PLATFORM_CONTENT=http://127.0.0.1:4321` with `node services/editor/e2e/content-server.mjs`) |
| `npm run e2e -w @platform/editor` | Playwright end-to-end |

Live: https://RayanYousef.github.io/CloudDocumentationPersonal/ (editor: `/editor/`).

## Architecture

The platform documents itself as part of the docs bundle (`site/docs/platform/`), so humans read it on the live site and agents reach it through the same `index.md`, `manifest.json` and code map as the project docs.

- [Architecture](https://RayanYousef.github.io/CloudDocumentationPersonal/platform/architecture): service map, one-process composition, dependency rules, data flows for login, save, publish and asset fetch.
- Components: [Contracts](https://RayanYousef.github.io/CloudDocumentationPersonal/platform/contracts), [OKF Core](https://RayanYousef.github.io/CloudDocumentationPersonal/platform/okf-core), [Auth](https://RayanYousef.github.io/CloudDocumentationPersonal/platform/auth), [Content](https://RayanYousef.github.io/CloudDocumentationPersonal/platform/content), [Editor](https://RayanYousef.github.io/CloudDocumentationPersonal/platform/editor), [Viewers](https://RayanYousef.github.io/CloudDocumentationPersonal/platform/viewers), [Site](https://RayanYousef.github.io/CloudDocumentationPersonal/platform/site), [Agent skill](https://RayanYousef.github.io/CloudDocumentationPersonal/platform/agent-skill), [Workflows](https://RayanYousef.github.io/CloudDocumentationPersonal/platform/workflows).
- [Decisions](https://RayanYousef.github.io/CloudDocumentationPersonal/platform/decisions) summarises section 7 of the [design specification](docs/design/2026-09-06-documentation-platform-design.md), which remains the normative source.

## Extending

New auth providers, content backends, services, viewers and deploy targets are added as new implementations of existing contracts, never by editing an existing one. Each guide names the contract, the contract test, the composition root, the config field and the boundary rule:

- [Add an auth provider](https://RayanYousef.github.io/CloudDocumentationPersonal/platform/extending/add-auth-provider)
- [Add a content backend](https://RayanYousef.github.io/CloudDocumentationPersonal/platform/extending/add-content-backend)
- [Add a new service module](https://RayanYousef.github.io/CloudDocumentationPersonal/platform/extending/add-service-module)
- [Add a site plugin or viewer component](https://RayanYousef.github.io/CloudDocumentationPersonal/platform/extending/add-site-plugin-or-viewer)
- [Add a deploy target](https://RayanYousef.github.io/CloudDocumentationPersonal/platform/extending/add-deploy-target)

## Roadmap

Phase 2 (spec sections 4.3, 4.4, 4.6, 4.8, 4.11): password provider fed from GitHub secrets, server-side content service behind a Hono shell, a gate for private viewing, Docker or Node deployment, and the push-triggered documentation updater. Details and the editor's known minor issues: [Roadmap](https://RayanYousef.github.io/CloudDocumentationPersonal/platform/roadmap).
