---
title: Platform
sidebar_position: 10
---

How the documentation platform itself is built: the packages and services behind this site, the contracts they implement, the rules that keep them apart, and the steps for adding a new auth provider, content backend, service, viewer or deploy target. Read this folder when you are changing the platform rather than writing project documentation; every page pins the code it describes so agents can jump from a page into the source.

Start with [Architecture](architecture.md) for the map, then the component page that matches the folder you are editing. The [Extending](extending/) guides list the contract, test, composition root, config field and boundary rule involved in each kind of change. The normative source for all of this is the design specification at [`docs/design/2026-09-06-documentation-platform-design.md`](https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/docs/design/2026-09-06-documentation-platform-design.md).

<!-- okf:index -->
## Pages
* [Architecture](architecture.md) - Explains which packages and services make up the platform, which may import which, and the exact sequence of calls behind a login, a save, a version publish and a 3D asset fetch; read this before touching more than one workspace.
* [Contracts](contracts.md) - Lists every interface, type and error code in @platform/contracts and the two contract test suites that any new auth provider or content backend must pass; open it when you need the exact signature a service has to implement.
* [OKF Core package](okf-core.md) - Describes the zero-dependency generator and validator that turns page frontmatter into index blocks, manifest.json, code maps and log entries, including its public API, validator rules and the browser/Node split; open it when a validation report or a stale-content error needs explaining.
* [Auth service](auth.md) - Explains how the GitHub token provider decides who may edit (repository push permission), how the mock provider serves tests, and where sessions live in the browser; open it when a login fails or when you need the provider behaviour a new AuthProvider has to match.
* [Content service](content.md) - Describes the three ContentBackend implementations (local folder, GitHub-in-browser, HTTP bridge), the shared write and publish pipelines, the LFS-aware asset fetch and the Orama search; open it when a save, publish or asset load misbehaves or when you are writing a new backend.
* [Editor service](editor.md) - Describes the in-browser editor (Vite + React + MDXEditor): how it is composed from platform.config.js, what each screen and dialog does, how frontmatter edits preserve YAML, and how it is built and deployed under /editor/; open it when changing editor behaviour or debugging a save from the UI.
* [Viewers package](viewers.md) - Explains the two React 3D rendering cores (glTF/GLB through model-viewer, FBX through three.js), why they live in their own package, and how the site wraps them with BrowserOnly and asset resolution; open it when a model does not render or when adding a new viewer.
* [Site](site.md) - Describes the Docusaurus site: how docusaurus.config.js derives everything from platform.config.js, which files are excluded from rendering, what the prebuild writes to static/platform, how versions and the composition root work; open it when the rendered site differs from the docs folder or when wiring a new site feature.
* [Agent skill](agent-skill.md) - Explains the docs-platform agent skill (the only agent entry point), its user-level registry that maps a code repository to its docs bundle, the navigation walk it prescribes and its relationship to the ray-okf-core format skill; open it when setting up an agent to work on this documentation or when a repo is "not registered".
* [Workflows and scripts](workflows.md) - Lists the GitHub Actions workflows (validate on every push, deploy Pages on main) and the root npm scripts with what each one runs; open it when CI fails, when reproducing CI locally, or when adding a build step or deploy target.
* [Roadmap](roadmap.md) - Lists what Phase 2 adds (password provider from GitHub secrets, server-side content service behind a Hono shell, a gate for private viewing, Docker or Node deployment, the push-triggered documentation updater) and the editor's known minor issues; open it to see what is planned versus shipped before proposing a change.
* [Platform decisions](decisions.md) - Summarises the twenty design decisions recorded in section 7 of the specification (viewers package, TS contracts over OpenAPI, in-memory okf-core, composition roots, sample repo layout, frozen 1.0.0, code maps, two search indexes, and more) with the reason for each; read it before reopening any of them.

## Folders
* [Extending](extending/) - Step-by-step guides for growing the platform without modifying what exists: each guide names the contract to implement, the contract test to run, the composition root to register in, the `platform.config.js` field to set and the boundary rule to respect. Pick the guide that matches the kind of thing you are adding; if none fits, "Add a new service module" is the general recipe.
<!-- /okf:index -->
