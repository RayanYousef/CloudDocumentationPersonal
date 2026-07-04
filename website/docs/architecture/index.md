---
title: Architecture
description: How this documentation platform itself is built - components, configuration, and automation.
---

# Concepts

* [In-browser editor](in-browser-editor.md) - The /editor page — a client-only Docusaurus route that edits docs and commits them straight to GitHub through the REST Contents API, using round-trip-safe frontmatter line surgery.
* [ModelViewer (glTF)](model-viewer.md) - An SSR-safe React wrapper around Google's &lt;model-viewer&gt; web component for embedding interactive glTF/GLB models in docs, with baseUrl-resolved src and an error fallback.
* [FbxViewer (FBX)](fbx-viewer.md) - A browser-only three.js renderer for .fbx models, using FBXLoader and OrbitControls with automatic framing and full GPU resource disposal on unmount.
* [Deploy pipeline](deploy-pipeline.md) - The GitHub Actions workflow that builds the site and publishes it to GitHub Pages on every push to main.
* [Site identity (site.config.js)](site-identity.md) - The single source of truth for the site's URLs, GitHub repo, deploy branch, and branding.
