---
name: docs-platform
description: The only agent entry point for a Documentation Platform bundle (Docusaurus site + OKF Core index layer + in-browser editor). Use when working inside a code repository whose documentation lives in a docs-platform bundle, when the user says "open the docs for this repo", "which page describes this file", "update the documentation", "add a doc page", "run the OKF generator", or "publish a docs version". Looks the bundle up in the user-level registry (~/.docs-platform/registry.json), navigates by index.md and code maps, and explains how pages are added and regenerated. Format rules come from the ray-okf-core skill, which this skill never modifies.
---

# Documentation Platform

One docs bundle per code repository. The bundle is a Docusaurus `site/` whose `docs/` folder follows the OKF Core profile: every folder has an `index.md` with one-sentence decision-aid descriptions, every page carries typed frontmatter and a `resource` URL pinned to code, `manifest.json` is the flat search table, `log.md` the change log, and `code-maps/<owner>--<repo>.md` the reverse index from code paths to pages.

## On start (inside a code repository)

1. Run `node <this skill>/scripts/resolve-bundle.mjs` (or read `~/.docs-platform/registry.json` yourself; schema in `references/registry.md`). It maps the repo's `origin` remote to a bundle: a local `sitePath`, or a content-service URL plus the name of the env var holding the token.
2. Open `<sitePath>/docs/index.md`, then `<sitePath>/docs/AGENTS.md`. Never list directories: the index is the map (`references/navigation.md`).
3. To go from a code file to its documentation, open `<sitePath>/docs/code-maps/<owner>--<repo>.md` and find the longest path prefix that matches the file.
4. If the bundle is remote (`kind: content-service`), read pages through the content service (`references/authoring.md`, section "Remote bundles"); do not clone anything.
5. If the repo is not registered, say so and offer to add a registry entry (`references/registry.md`); do not create docs inside the code repo.

## Rules

- Format rules are the `ray-okf-core` skill (`references/spec-profile.md` there). Read it when a field's rule is in question; NEVER edit that skill.
- Never write `AGENTS.md`, `index.md` or any docs into a code repository; the docs live in the bundle.
- Never hand-edit generated content: index blocks between `<!-- okf:index -->` markers, `manifest.json`, `code-maps/`, or log bullets. Run the generator instead: `npm run okf:generate` from the bundle's repository root (`npm run okf:check` validates only).
- A page's `description` is one sentence answering "is this the file I need?"; `type` is required; `resource` is `https://github.com/<owner>/<repo>/blob/<ref>/<path>` and the repo must be declared in `platform.config.js` `codeRepos`.
- Frozen versions (`versioned_docs/version-*`) are read-only; edit `docs/` (Latest). Publishing a version is done through the editor's "Publish version" action or the content service.

## References

- `references/registry.md` - registry file location, schema, adding an entry.
- `references/navigation.md` - the navigation walk (index -> folder -> page -> resource -> code map) with an example.
- `references/authoring.md` - adding/updating pages and folders, running the generator, committing, remote bundles.
