---
type: Component
title: FbxViewer (FBX)
description: A browser-only three.js renderer for .fbx models, using FBXLoader and OrbitControls with automatic framing and full GPU resource disposal on unmount.
sidebar_position: 3
tags: [3d, fbx, three-js]
resource: website/src/components/FbxViewer/index.js
timestamp: '2026-07-04T00:00:00+00:00'
---

`FbxViewer` renders an interactive `.fbx` model in a docs page. Because Google's
`<model-viewer>` reads only glTF/GLB, FBX gets its own component built directly on
three.js. See [ModelViewer](./model-viewer.md) for the glTF path.

## three.js FBXLoader rendering

All three.js modules — `three`, `FBXLoader`, and `OrbitControls` — are
`require()`d **inside** a `useEffect` that runs only under `<BrowserOnly>`, so the
static SSR build never imports WebGL/DOM code. On mount, the effect builds a
`WebGLRenderer` (antialiased, alpha), a `PerspectiveCamera`, an ambient light plus
key/fill directional lights, and `OrbitControls` with damping and auto-rotate. The
canvas is appended to a mount `div`.

`FBXLoader.load` streams the model asynchronously. On success it forces
`DoubleSide` materials (so models render regardless of winding or missing
materials), then measures the object's bounding box to center it at the origin and
position the camera at a distance derived from the largest dimension — the model is
auto-framed no matter its native scale. A `requestAnimationFrame` loop updates the
controls and renders each frame, and a `resize` listener keeps the aspect ratio
correct. Load failures set an error state that shows an inline warning overlay
instead of a blank canvas. `src` is resolved through `useBaseUrl()` so
`/models/fbx/x.fbx` works under the site base path.

## Cleanup and disposal

The effect returns a teardown that runs on unmount or when `src`/`height` change.
It is deliberately thorough about GPU memory:

- sets a `disposed` flag so an in-flight load callback becomes a no-op,
- cancels the animation frame and removes the `resize` listener,
- disposes the `OrbitControls`,
- removes the model, then traverses the scene disposing every mesh geometry,
- for each material, walks **all** its properties and disposes anything that is a
  texture — because `material.dispose()` frees the shader program but not its
  textures (`map`, `normalMap`, `envMap`, …), which would otherwise leak,
- disposes the renderer and detaches its `domElement` from the DOM.

## Usage

Pages that import React components must use the `.mdx` extension.

```mdx
import FbxViewer from '@site/src/components/FbxViewer';

<FbxViewer src="/models/fbx/cube.fbx" />
```

Props: `src` (root-relative path, required) and `height` (pixels, defaults to
`480`). FBX assets live under `website/static/models/fbx/`.

## Constraints and gotchas

- FBX only — for glTF/GLB use [ModelViewer](./model-viewer.md).
- Pass `src` as a root-relative path (e.g. `/models/fbx/...`); the component
  resolves the base path via `useBaseUrl`, so do not prepend it yourself.
- Must be embedded from an `.mdx` page.
- Rendering is entirely client-side; a "Loading FBX…" overlay shows until the
  model is framed.

## Related

- [ModelViewer (glTF)](./model-viewer.md) — the glTF/GLB sibling viewer.
- [3D model viewer example](../examples/3d-model-viewer.mdx) — a live embed.
