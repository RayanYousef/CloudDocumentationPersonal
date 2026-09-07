---
title: Extending
sidebar_position: 11
---

Step-by-step guides for growing the platform without modifying what exists: each guide names the contract to implement, the contract test to run, the composition root to register in, the `platform.config.js` field to set and the boundary rule to respect. Pick the guide that matches the kind of thing you are adding; if none fits, "Add a new service module" is the general recipe.

<!-- okf:index -->
## Pages
* [Add an auth provider](add-auth-provider.md) - Step-by-step recipe for a new AuthProvider (for example the Phase 2 password provider): the interface and credentials union to extend, the contract suite to pass, where the editor's composition root selects it and which config field switches it on.
* [Add a content backend](add-content-backend.md) - Step-by-step recipe for a new ContentBackend (for example a server-side backend or a different git host): the operations to implement, the shared pipelines to reuse, the contract suite that proves substitutability, and where the editor and site composition roots pick it.
* [Add a new service module](add-service-module.md) - General recipe for a brand-new workspace under services/ or packages/ (for example the Phase 2 gate or the Hono shell): package layout, tsconfig and Vitest wiring, the ESLint boundary element to declare, and which scripts and workflows must know about it.
* [Add a site plugin or viewer component](add-site-plugin-or-viewer.md) - Recipe for a new MDX component (a viewer for another asset format, or any block the editor should insert) and for a Docusaurus plugin: where the rendering core lives, how the site registers it globally, how components.json exposes it to the editor, and which lint elements are involved.
* [Add a deploy target](add-deploy-target.md) - Recipe for hosting the site somewhere other than GitHub Pages (another static host, Docker, a Node process): what site:build produces, which config fields fix the URLs, how the editor and Phase 2 server are mounted, and the workflow to add without touching deploy-pages.yml.
<!-- /okf:index -->
