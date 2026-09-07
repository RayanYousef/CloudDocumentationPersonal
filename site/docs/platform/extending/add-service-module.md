---
title: Add a new service module
description: "General recipe for a brand-new workspace under services/ or packages/ (for example the Phase 2 gate or the Hono shell): package layout, tsconfig and Vitest wiring, the ESLint boundary element to declare, and which scripts and workflows must know about it."
type: guide
tags: [platform, extending, workspace, boundaries, eslint, monorepo]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/eslint.config.js
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/package.json
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/tsconfig.base.json
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/vitest.workspace.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/auth/package.json
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/scripts/lint-boundaries.test.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/.github/workflows/okf-validate.yml
sidebar_position: 3
---

Use this when the thing you are adding is not an implementation of an existing contract but a new capability with its own contract, such as the Phase 2 `services/gate` or the Hono shell.

| Item | Where |
|---|---|
| Contract to implement | define it first in `packages/contracts/src/<name>.ts` and export it from `src/index.ts`; if implementations will vary, add a `testing/<name>Contract.ts` suite |
| Contract test to run | the suite you just wrote, from the new service's `test/` folder |
| Composition root to register in | whichever process hosts it: `services/editor/src/composition/createPlatform.ts`, `site/src/platform/`, or (Phase 2) the shell's mount table |
| Config field | add a typed field to `PlatformConfig` in `packages/contracts/src/platform-config.ts` and a commented value in `platform.config.js` |
| Boundary rule | declare the element in `eslint.config.js` and give it an explicit allow list; default is `disallow` |

## Steps

1. **Contract first.** Add the interface, its error class and codes to `packages/contracts`. Keep it free of implementation types.
2. **Create the workspace** at `services/<name>/` (or `packages/<name>/` for a dependency-free library) with `package.json` (`"name": "@platform/<name>"`, `"type": "module"`, `exports` pointing at `dist/`, scripts `build: tsc -b` and `test: vitest run`), `tsconfig.json` extending `../../tsconfig.base.json`, `vitest.config.ts`, `src/index.ts` and `test/`. Copy `services/auth` as the template. The root `workspaces` globs (`packages/*`, `services/*`) pick it up; run `npm install` so the workspace link exists.
3. **Declare the lint element** in `eslint.config.js`: add `{ type: '<name>', pattern: 'services/<name>/**' }` to `boundaries/elements`, add a row `{ from: ['<name>'], allow: [...] }` to the `element-types` rules (normally `['<name>', 'contracts', 'okf-core']`), and add a `boundaries/external` row listing the `@platform/*` packages it must not import. Add the new package to `platformPackages` if others must be forbidden from importing it. If the service has a composition folder, declare it as its own element with `mode: 'full'` like `editor-composition`.
4. **Extend the boundary test** in `scripts/lint-boundaries.test.ts` with a fixture under `scripts/lint-fixtures/services/<name>/` that imports something forbidden, so the rule is proven, not assumed.
5. **Wire the build**: add the workspace to `npm run typecheck` in the root `package.json` and to the "Build packages and services" step in `.github/workflows/okf-validate.yml` and `deploy-pages.yml` if other workspaces import it at build time. `vitest.workspace.ts` uses the globs `packages/*/vitest.config.ts` and `services/*/vitest.config.ts`, so the new workspace's tests run under `npm test` as soon as its `vitest.config.ts` exists; a workspace outside those folders needs an explicit entry there.
6. **Config**: add the field to `PlatformConfig`, set it in `platform.config.js` with a comment, and read it only from a composition root or a root script.
7. **Register** the implementation in the hosting composition root and hand it out as its contract type.
8. **Document it**: add a page under `site/docs/platform/` with `resource` pinned to the new folder, and a row in the service map in [Architecture](../architecture.md); run `npm run okf:generate`.
9. **Verify**: `npm run lint`, `npm test`, `npm run build`.
