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
