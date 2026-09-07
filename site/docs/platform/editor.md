---
title: Editor service
description: "Describes the in-browser editor (Vite + React + MDXEditor): how it is composed from platform.config.js, what each screen and dialog does, how frontmatter edits preserve YAML, and how it is built and deployed under /editor/; open it when changing editor behaviour or debugging a save from the UI."
type: system
tags: [platform, editor, vite, react, mdxeditor, frontmatter]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/editor
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/editor/src/composition/createPlatform.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/editor/src/App.tsx
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/editor/src/components/FrontmatterForm.tsx
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/editor/src/frontmatter/yamlDoc.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/editor/src/mdx/descriptors.tsx
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/editor/src/mdx/componentsManifest.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/editor/src/session/SessionStore.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/editor/vite.config.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/editor/e2e/editor.spec.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/scripts/copy-editor.mjs
sidebar_position: 6
---

`@platform/editor` is a standalone React application built with Vite. It talks to the platform only through `AuthProvider` and `ContentBackend`; the concrete classes are chosen in one file.

## Composition

`src/composition/createPlatform.ts` reads `platform.config.js` and returns `{ auth, backend(session), config, componentsUrl }`:

- `auth` is `MockAuthProvider` when `VITE_PLATFORM_AUTH=mock` or `auth.provider` is `mock`, otherwise `GithubTokenProvider({ owner: organizationName, repo: projectName })`.
- `backend(session)` is `HttpContentBackend(url)` when `VITE_PLATFORM_CONTENT` is set or `content.backend` is `http`, otherwise `GithubBrowserBackend` for `organizationName/projectName` on `deployBranch` under `sitePath`, with the session token.
- `componentsUrl` is `<baseUrl>platform/components.json`, produced by the site prebuild from `site/components.json`; a bundled default is used when the fetch fails.

This folder is the `editor-composition` lint element, the only part of the editor allowed to import `@platform/auth` and `@platform/content`. `PlatformContext.tsx` hands the result to the component tree.

## Screens and actions

- `LoginGate`: token (or mock name and role) input, "remember on this device" with a shared-device warning, provider errors shown inline; a stored session is re-verified on load and forgotten if verification fails.
- `FilePicker`: pages of the selected version. `index.md`, `log.md`, `AGENTS.md`, `README.md` and `code-maps/` are hidden; a folder's intro is edited through `FolderIntroEditor`, which only touches text before the generated markers (`src/mdx/folderIntro.ts`).
- `FrontmatterForm`: `title`, `description` (placeholder: "One sentence: when should someone open this page?"), `type` (dropdown of values in use plus a free-text new type), `tags` (comma-separated), `resource`, `sidebar_position`. Edits go through the `yaml` package's document API (`src/frontmatter/yamlDoc.ts`) so untouched lines, comments, quoting and scalar types survive; this fixes the numeric-quoting bug of the previous editor.
- `BodyEditor`: `@mdxeditor/editor` with the ported toolbar (undo/redo, marks, headings and quote, lists, links, image URL and upload, 3D model upload, insert-from-repo, tabs, table, rule, CodeMirror code block, admonitions) and a raw-MDX fallback. JSX descriptors for `ModelViewer`, `FbxViewer`, `Tabs` and `TabItem` are generated from `components.json`; previews come from `@platform/viewers`; descriptors emit no import lines because the site registers the components globally.
- Save: `validatePage` runs locally and `ProblemList` shows problems; the backend's `VALIDATION` details are shown the same way. Dirty tracking guards page and version switches, rename, create, logout and page unload.
- `NewPageDialog` (default `resource` built from the first `codeRepos` entry), Rename, Delete, and `PublishDialog` (role `editor`, version label input). Frozen versions open read-only.

## Build and deploy

`vite.config.ts` sets `base` to `<baseUrl>editor/` from `platform.config.js`. `npm run build -w @platform/editor` type-checks and builds `services/editor/dist`; `scripts/copy-editor.mjs` copies it into `site/build/editor/` so GitHub Pages serves the editor at `https://RayanYousef.github.io/CloudDocumentationPersonal/editor/`. The site navbar links there when `features.editor` is true.

Development: `npm run dev -w @platform/editor` with `VITE_PLATFORM_AUTH=mock` and `VITE_PLATFORM_CONTENT=http://127.0.0.1:4321` against `node services/editor/e2e/content-server.mjs` (a `serveContentBackend` over a `LocalFolderBackend`).

## Tests

Vitest component tests (`src/components/dialogs.test.tsx`, `yamlDoc.test.ts`, `folderIntro.test.ts`, `componentsManifest.test.ts`, `SessionStore.test.ts`) and one Playwright e2e (`e2e/editor.spec.ts`, `npm run e2e -w @platform/editor`) that logs in with the mock provider, edits, creates, renames, deletes and publishes version `1.1.0` against a temporary git repository, then asserts on the commits, the regenerated files, the sha-pinned frozen copy and the `docs-v1.1.0` tag.

## Known minor issues

- Rename and Delete use native `window.prompt` and `window.confirm` dialogs rather than the shared `Modal`.
- The frontmatter form has no field for `sources`; they are edited in the raw-MDX view.
- The New page dialog derives its default `resource` from `codeRepos[0]` only; other declared repositories must be typed by hand.
- Component insertion falls back to the bundled component list silently when `components.json` cannot be fetched.
- The Phase 1 HTTP bridge (`serveContentBackend`) has no authentication, which is why it is limited to local development and the e2e until the Phase 2 server exists.
