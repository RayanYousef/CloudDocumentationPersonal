---
type: Component
title: ModelViewer (glTF)
description: An SSR-safe React wrapper around Google's <model-viewer> web component for embedding interactive glTF/GLB models in docs, with baseUrl-resolved src and an error fallback.
sidebar_position: 2
tags: [3d, gltf, model-viewer]
resource: website/src/components/ModelViewer/index.js
timestamp: '2026-07-04T00:00:00+00:00'
---

`ModelViewer` embeds an interactive 3D glTF/GLB model in a docs page. It is a thin
React wrapper around Google's `<model-viewer>` web component (WebGL), written so it
never breaks the static Docusaurus build.

## SSR-safe wrapping

`<model-viewer>` is browser-only: importing it under Node crashes the static build
with "window is not defined". To avoid that, the component never imports it at
module scope. Instead the outer `ModelViewer` renders a `<BrowserOnly>`, and only
inside that render-prop does it `require('@google/model-viewer')` (which registers
the custom element as a side effect) and mount the inner `Viewer`. During SSR and
before hydration, a shared "Loading 3D viewer…" fallback box is shown. This is the
same client-only discipline the [in-browser editor](./in-browser-editor.md) uses
for MDXEditor.

The inner `Viewer` also listens for the element's `error`/`load` CustomEvents
(React's `onError` prop does not map to them) and swaps in an inline warning box if
the model fails to load, rather than leaving a blank frame.

## baseUrl resolution of src

`<model-viewer>` is a raw custom element, so Docusaurus does **not** rewrite its
`src` attribute the way it rewrites `<Link>`/`<img>`. Authors naturally write
root-relative paths like `/models/cube.gltf`, but the site is served under a base
path (`/CloudDocumentationPersonal/` on GitHub Pages), so that raw path would 404.
The component fixes this by passing `src` through `useBaseUrl()` before handing it
to the element:

```js
const resolvedSrc = useBaseUrl(src);
```

So authors always write the bare root-relative path and let the component resolve
the base path. See [site identity](./site-identity.md) for where that base path is
defined. Assets live under `website/static/models/`.

## Usage

Pages that import React components must use the `.mdx` extension.

```mdx
import ModelViewer from '@site/src/components/ModelViewer';

<ModelViewer src="/models/cube.gltf" alt="A cube" />
```

Props: `src` (root-relative path, required), `alt` (defaults to `"3D model"`),
`height` (pixels, defaults to `480`), and `style`; any extra props are spread onto
the underlying element. The element is preset with `camera-controls`,
`auto-rotate`, and `shadow-intensity="1"`.

## Constraints and gotchas

- glTF/GLB only. FBX is not readable by `<model-viewer>`; use
  [FbxViewer](./fbx-viewer.md) for `.fbx`.
- Always pass `src` as a root-relative path (e.g. `/models/...`); do **not**
  pre-prepend the base path — the component does that for you.
- Must be used from an `.mdx` page, never a plain `.md` page.
- The model only renders client-side; expect the fallback box during SSR.

## Related

- [FbxViewer (FBX)](./fbx-viewer.md) — the sibling viewer for FBX assets.
- [3D model viewer example](../examples/3d-model-viewer.mdx) — a live embed.
- [Site identity](./site-identity.md) — where the base path comes from.
