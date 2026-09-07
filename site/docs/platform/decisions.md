---
title: Platform decisions
description: Summarises the twenty design decisions recorded in section 7 of the specification (viewers package, TS contracts over OpenAPI, in-memory okf-core, composition roots, sample repo layout, frozen 1.0.0, code maps, two search indexes, and more) with the reason for each; read it before reopening any of them.
type: decision
tags: [platform, decisions, adr, design]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/docs/design/2026-09-06-documentation-platform-design.md
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/eslint.config.js
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/platform.config.js
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/site/versions.json
sidebar_position: 13
---

Section 7 of the design specification records decisions that were not in the original brief. They are summarised here with their consequences; the numbering matches the spec.

| # | Decision | Why |
|---|---|---|
| 1 | `packages/viewers` holds the three.js and model-viewer rendering cores. | The site (wrapped with `BrowserOnly` and asset resolution) and the editor (live previews) both need them, and the editor may not import site code. |
| 2 | TypeScript interfaces, not OpenAPI, are the Phase 1 contract. | There is no public HTTP surface yet; OpenAPI is derived from the interfaces in Phase 2. |
| 3 | okf-core operates on an in-memory file map; Node I/O lives in a separate `node` entry. | The browser backend must regenerate indexes, manifest and code maps before every commit. |
| 4 | `HttpContentBackend` and `serveContentBackend` ship in Phase 1. | The e2e needs the editor to reach a `LocalFolderBackend`; they are the seed of the Phase 2 server backend. |
| 5 | `MockAuthProvider` exists. | Tests and the e2e need a provider with no network. |
| 6 | Composition roots (`services/editor/src/composition/`, `site/src/platform/`) are the only places that import service implementations. | Everything else sees contract types; substitution is a one-line change. |
| 7 | The sample code repo lives at `examples/unity-project/` in this repository, declared with `pathPrefix`; resource URLs point here; stub source files exist for every cited path; placeholder FBX files were replaced with real meshes. | Every `resource` resolves on GitHub and every viewer renders. |
| 8 | The demo's deliberate broken link was fixed. | CI must be green; the broken-link rule is covered by a unit test fixture instead. |
| 9 | Frozen `1.0.0` stays partial (root index, `systems/index.md`, `systems/inventory.md`) with a README explaining it; its pins use a real sha. | It demonstrates freezing without duplicating the whole demo bundle. |
| 10 | `versions/<v>.json` keeps the profile's `pins` map and adds `refs` (branch labels). | The addition is additive; profile consumers still read `pins`. |
| 11 | Code maps live in the reserved generated folder `code-maps/` inside the bundle. | A platform extension to the profile; documented as generated in `AGENTS.md`. |
| 12 | Log completeness is guaranteed by the write path; the validator checks format and order only. | The log is append-only generated, so re-deriving it from git history would add cost without adding truth. |
| 13 | Two Orama indexes: the Docusaurus plugin's for the site UI and `static/platform/search-index-<version>.json` for `ContentBackend.search`. | The plugin index is not addressable from the contract; the second one is. |
| 14 | The editor edits frontmatter through the `yaml` package's document API; okf-core keeps its own zero-dependency YAML subset parser for validation. | Editing must preserve comments, quoting and scalar types; validation must stay dependency-free. |
| 15 | Viewers are global MDX components; editor descriptors have no `source`, so no import lines are emitted. | Pages stay plain Markdown with components. |
| 16 | Asset fetches use `media.githubusercontent.com` first and `raw.githubusercontent.com` as fallback, cached with the Cache API. | The media endpoint serves real bytes for Git LFS pointers. |
| 17 | `index.md`, `log.md`, `AGENTS.md`, `README.md` and `code-maps/` are hidden from the editor's file picker; folder intros are edited through a dedicated view that only touches text before the markers. | Generated content can never be hand-edited from the UI. |
| 18 | Node 22 in CI; `engines.node` stays at 20 or newer. | Current LTS in CI without forcing local upgrades. |
| 19 | `scripts/build-site.ps1` and `scripts/start-site.ps1` were replaced by root npm scripts. | One command set on every platform. |
| 20 | The platform skill is committed at `.agents/skills/docs-platform/`; installing it elsewhere means copying the folder. | Documented, not automated, until the skill stabilises. |

Two decisions made while adding this platform documentation follow the same spirit and are recorded here rather than in the spec:

| # | Decision | Why |
|---|---|---|
| 21 | The platform is documented as a folder of the same OKF bundle (`site/docs/platform/`), not as a second bundle. | One manifest, one code map and one generator run cover project docs and platform docs; agents navigate both through the same index. |
| 22 | `codeRepos` keeps a single entry for this repository even though it now hosts both the sample Unity project and the platform code. | Code maps and pins are keyed by `owner/repo`, so one entry already covers every path; a second entry would be a duplicate key with no extra coverage, and `pathPrefix` is only the editor's default for new pages. |
