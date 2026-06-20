---
title: Embedding WebGL & Unity Builds
sidebar_position: 3
description: Put interactive WebGL — including Unity WebGL builds — on a page.
---

# Embedding WebGL & Unity Builds

Yes — a page can be fully interactive WebGL. You already have two WebGL paths in
this site, and Unity WebGL builds work too.

## Already-built WebGL components

- **3D models** — `<ModelViewer>` (glTF/GLB) and `<FbxViewer>` (FBX) are WebGL
  components you embed in any page. See the [3D Showcase](/showcase/). These pages
  *are* WebGL pages.
- **Custom WebGL / three.js** — drop a browser-only React component in
  `website/src/components/` and use it in MDX. `FbxViewer` is a working example of
  a hand-rolled three.js renderer.

## Embedding a Unity WebGL build

1. In Unity, build your project for **WebGL**.
2. **Important — compression.** GitHub Pages cannot send the `Content-Encoding`
   header, so a default Brotli/Gzip Unity build **won't load** (you'll see
   `Invalid or unexpected token` / `unityFramework is not defined`). In
   **Player → Publishing Settings**, either:
   - set **Compression Format: Disabled** (simplest, larger transfer), or
   - enable **Decompression Fallback** (keeps compression; ships a JS decompressor).
3. Copy the build output into `website/static/<your-build>/`
   (e.g. `website/static/unity-demo/`). Everything in `static/` is served verbatim.
4. Embed it on any `.mdx` doc page with an iframe — **include the base path**
   `/CloudDocumentationPersonal/`:

   ```mdx
   <iframe
     src="/CloudDocumentationPersonal/unity-demo/index.html"
     style={{width: '100%', height: '600px', border: 0}}
     title="Unity WebGL demo"
   />
   ```

   *(In MDX, `style` must be a JS object and the tag must be self-closed.)*

:::tip Why an iframe?
An iframe isolates Unity's globals and CSS from Docusaurus and sidesteps server-side
rendering — Unity's stock `index.html` just runs as-is. For tighter React
integration you can use `react-unity-webgl` instead, wrapped in `<BrowserOnly>`.
:::

## Gotchas

- **Don't hardcode** `/unity-demo/...` — always include the `/CloudDocumentationPersonal/`
  base path (or use `useBaseUrl`), or it 404s in production.
- **Avoid multi-threaded Unity builds** — they need COOP/COEP headers that GitHub
  Pages can't set. Use a single-threaded build.
- **Unity WebGL builds are large** (tens of MB). See the large-files note on the
  [3D Models](/models/) page about big binaries on GitHub Pages.
- This compression gotcha is **Unity-specific** — `<ModelViewer>` and `<FbxViewer>`
  don't need it.
