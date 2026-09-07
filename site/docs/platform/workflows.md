---
title: Workflows and scripts
description: Lists the GitHub Actions workflows (validate on every push, deploy Pages on main) and the root npm scripts with what each one runs; open it when CI fails, when reproducing CI locally, or when adding a build step or deploy target.
type: system
tags: [platform, ci, github-actions, deploy, scripts, testing]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/.github/workflows
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/.github/workflows/okf-validate.yml
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/.github/workflows/deploy-pages.yml
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/package.json
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/scripts/okf.mjs
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/scripts/copy-editor.mjs
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/scripts/lint-boundaries.test.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/vitest.workspace.ts
sidebar_position: 10
---

## GitHub Actions

| Workflow | Trigger | Steps |
|---|---|---|
| `okf-validate.yml` | every push and pull request | `npm ci`; build `contracts`, `okf-core`, `viewers`, `auth`, `content`; `npm run okf:check` (validator and stale check over Latest and every frozen version); `npm run lint`; `npm test` |
| `deploy-pages.yml` | push to `main`, manual dispatch | same install and build; `npm run okf:check`; `npm run site:build`; publish `site/build` to `gh-pages` with `peaceiris/actions-gh-pages` (concurrency group `deploy-pages`, `contents: write`) |

Both run on Node 22 (`engines.node` stays at 20 or newer). The site is served from the `gh-pages` branch at `https://RayanYousef.github.io/CloudDocumentationPersonal/`, the editor under `/editor/`. The repository is public so Pages can serve it; the spec (section 4.9) records the `gh` commands used to change visibility and enable Pages.

## Root npm scripts

| Script | Runs |
|---|---|
| `npm run okf:generate` | `node scripts/okf.mjs generate`: index blocks, `manifest.json`, code maps and validation for `site/docs` and every `site/versioned_docs/version-<v>`, with `--repo` for each `codeRepos` entry |
| `npm run okf:check` | the same in check mode; exit 1 on any problem or stale generated file |
| `npm run build` | `build` in every workspace that has one (`tsc -b` for packages and services, Vite for the editor, Docusaurus for the site) |
| `npm run typecheck` | `tsc -b` over contracts, okf-core, viewers, auth, content and editor |
| `npm run lint` | `eslint .` including the boundary rules |
| `npm test` | `vitest run` over the workspace list in `vitest.workspace.ts` (every package, service, the site scripts, the root scripts and the agent skill) |
| `npm run site:build` | build the editor, build the site (prebuild artifacts included), `node scripts/copy-editor.mjs` |
| `npm run site:start` | Docusaurus dev server |

Workspace-level extras: `npm run dev -w @platform/editor` (editor dev server) and `npm run e2e -w @platform/editor` (Playwright; not part of `npm test`).

## Root scripts folder

- `scripts/okf.mjs`: the generator entry described above.
- `scripts/copy-editor.mjs`: copies `services/editor/dist` into `site/build/editor/`; fails with a clear message when either build is missing. Tested in `copy-editor.test.ts`.
- `scripts/lint-boundaries.test.ts` with `scripts/lint-fixtures/`: boots ESLint programmatically on a fixture tree that mirrors the real layout (a `services/auth` file importing `@platform/content`) and expects the boundary error, so a change to `eslint.config.js` that loosens the rule fails the test.

## Reproducing CI locally

```bash
npm ci
npm run build -w @platform/contracts -w @platform/okf-core -w @platform/viewers -w @platform/auth -w @platform/content
npm run okf:check
npm run lint
npm test
npm run site:build
```

Adding a deploy target means adding a workflow (or a job) that consumes `site/build` and, in Phase 2, the server image; see [Add a deploy target](extending/add-deploy-target.md).
