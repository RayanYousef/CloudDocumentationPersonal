---
title: Agent skill
description: Explains the docs-platform agent skill (the only agent entry point), its user-level registry that maps a code repository to its docs bundle, the navigation walk it prescribes and its relationship to the ray-okf-core format skill; open it when setting up an agent to work on this documentation or when a repo is "not registered".
type: system
tags: [platform, agents, skill, registry, navigation]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/.agents/skills/docs-platform
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/.agents/skills/docs-platform/SKILL.md
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/.agents/skills/docs-platform/references/registry.md
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/.agents/skills/docs-platform/references/navigation.md
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/.agents/skills/docs-platform/references/authoring.md
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/.agents/skills/docs-platform/scripts/resolve-bundle.mjs
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/site/docs/AGENTS.md
sidebar_position: 9
---

`.agents/skills/docs-platform/` is the agent-facing surface of the platform. It is committed in this repository; installing it for other repositories means copying the folder to the user's skills directory (decision 20 in [Decisions](decisions.md)). The format rules themselves come from the separate `ray-okf-core` skill, which this skill references and never modifies.

## Files

- `SKILL.md`: the trigger description and the on-start procedure.
- `references/registry.md`: the registry file schema and how to add an entry.
- `references/navigation.md`: the walk from `index.md` through folders to a page, its `resource`, and the code map.
- `references/authoring.md`: adding and updating pages and folders, running the generator, committing, editing through the editor, using a remote content service, publishing a frozen version.
- `scripts/resolve-bundle.mjs`: `normalizeRemote`, `lookupBundle`, `resolveBundle`; prints the bundle for the current repository or exits 1 when unregistered. Tested in `test/resolve-bundle.test.ts`.

## Registry

`~/.docs-platform/registry.json` (Windows: `%USERPROFILE%\.docs-platform\registry.json`) lives outside every repository:

```json
{
  "version": 1,
  "bundles": [
    { "remote": "https://github.com/owner/repo",
      "docs": { "kind": "local", "sitePath": "C:/path/to/site" } },
    { "remote": "https://github.com/owner/other",
      "docs": { "kind": "content-service", "url": "https://docs.example.com", "tokenEnv": "DOCS_TOKEN" } }
  ]
}
```

Remote URLs are normalised (`git@github.com:o/r.git` and `https://github.com/o/r.git` both become `https://github.com/o/r`).

## On start inside a code repository

1. Resolve the bundle from `git remote get-url origin`.
2. Open `<sitePath>/docs/index.md`, then `AGENTS.md`. Never list directories; read descriptions and open only what answers the question.
3. To go from a code file to its documentation, open `code-maps/<owner>--<repo>.md` and take the entry with the longest matching path prefix. Because this bundle now documents the platform, that code map also answers "which page describes `services/content/src/writePipeline.ts`".
4. Remote bundles are read through the content service (`POST <url>/rpc`); nothing is cloned.
5. An unregistered repository is reported; the skill offers to add a registry entry and never creates docs inside the code repository.

## Rules the skill enforces

Never write `AGENTS.md`, `index.md` or docs into a code repository; never hand-edit generated content (index blocks, `manifest.json`, `code-maps/`, log bullets); run `npm run okf:generate` from the bundle's repository root instead; a `description` is one sentence answering "is this the file I need?"; `resource` must point at a repository declared in `platform.config.js`; frozen versions are read-only.

The bundle's own `site/docs/AGENTS.md` repeats the navigation rules for agents that arrive at the docs directly and states the one documented deviation from the profile (`log.md` carries `title` and `sidebar_position`).
