---
title: Add a site plugin or viewer component
description: "Recipe for a new MDX component (a viewer for another asset format, or any block the editor should insert) and for a Docusaurus plugin: where the rendering core lives, how the site registers it globally, how components.json exposes it to the editor, and which lint elements are involved."
type: guide
tags: [platform, extending, viewers, mdx, docusaurus, components]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/site/src
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/viewers/src/index.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/site/src/components/ModelViewer/index.tsx
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/site/src/theme/MDXComponents.js
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/site/components.json
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/contracts/src/components-manifest.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/services/editor/src/mdx/descriptors.tsx
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/site/docusaurus.config.js
sidebar_position: 4
---

| Item | Where |
|---|---|
| Contract to implement | a React component taking a resolved `src` URL (core) and, for the site wrapper, either `src` or `repo` + `ref` + `path`; its editor-facing shape is a `ComponentDescriptor` in `components.json` |
| Contract test to run | Vitest in `packages/viewers/test/viewers.test.tsx` for the core; `services/editor/src/mdx/componentsManifest.test.ts` for the manifest parsing; the site build (`onBrokenLinks: 'throw'`) for the wrapper |
| Composition root to register in | `site/src/theme/MDXComponents.js` (global MDX registration); asset resolution stays in `site/src/platform/useAssetUrl.ts` |
| Config field | `features.viewers` in `platform.config.js` gates viewer-related UI; a new plugin gets its own `features.<name>` flag read in `site/docusaurus.config.js` |
| Boundary rule | `packages/viewers` imports nothing internal; `site/src` (outside `site/src/platform`) imports only `@platform/contracts` and `@platform/viewers`; the editor imports previews from `@platform/viewers`, never from the site |

## New viewer component

1. **Core** in `packages/viewers/src/<Name>Core.tsx`: props `{ src: string; height?: number; alt?: string }`, no knowledge of repos or sessions. Export from `src/index.ts`; add a render test to `test/viewers.test.tsx`.
2. **Site wrapper** in `site/src/components/<Name>/index.tsx`: either extend `makeViewer` in `ModelViewer/index.tsx` with a new `kind`, or copy its shape: `BrowserOnly` around a component that resolves `src` with `useBaseUrl` or `repo`/`ref`/`path` with `useAssetUrl`, then `require('@platform/viewers')` inside the browser-only closure so WebGL never reaches SSR.
3. **Register globally** in `site/src/theme/MDXComponents.js` so pages use `<Name />` without an import line (the editor's descriptors rely on this and emit no imports).
4. **Expose to the editor** by adding a `ComponentDescriptor` to `site/components.json`: `name`, `kind: 'flow'`, `hasChildren`, `preview` and `props`. If the editor should render a live preview, add a `preview` value to `ComponentDescriptor['preview']` in `packages/contracts/src/components-manifest.ts` and a matching descriptor in `services/editor/src/mdx/descriptors.tsx` that uses the core from `@platform/viewers`. Existing `preview` values fall back to the generic descriptor.
5. **Ref rewriting**: the publish pipeline rewrites `ref="<defaultRef>"` on any element carrying `repo="owner/repo"`, so keep those two prop names and the frozen versions will pin your component's assets like the others.
6. **Verify**: `npm test -w @platform/viewers`, `npm test -w @platform/editor`, `npm run lint`, `npm run site:build`; write one doc page using the component.

## New Docusaurus plugin

1. Add the dependency to `site/package.json` and the plugin entry to `plugins` in `site/docusaurus.config.js`, gated by a `features.<name>` boolean (extend `PlatformConfig['features']` in `packages/contracts/src/platform-config.ts` and set it in `platform.config.js`).
2. Plugin code that reads the docs bundle at build time belongs in `site/scripts/` (the `site-scripts` element, allowed to import `@platform/okf-core` and `@platform/content`) or in a plugin folder inside `site/` that only reads files; do not import services from theme or page code.
3. Never make the index or sidebar depend on the plugin: the OKF index blocks in `index.md` must stay readable Markdown for agents.
4. Verify with `npm run site:build` and, if the plugin writes to `static/platform/`, extend `site/scripts/build-platform-artifacts.test.ts`.
