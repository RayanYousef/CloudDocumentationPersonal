---
type: Guide
title: Authoring OKF concepts
description: The maintenance contract for humans and agents editing this Open Knowledge Format concept bundle.
sidebar_position: 2
tags: [okf, authoring, knowledge-bundle]
resource: website/docs/
timestamp: '2026-07-04T00:00:00+00:00'
---

# Authoring OKF concepts

This site is an **Open Knowledge Format (OKF) bundle**: every documentation page
is a self-describing *concept*. This page is the contract that both humans and
agents follow when adding or changing concepts, so the bundle stays consistent
and the build never breaks.

## What a concept is

A concept is **one file** under `website/docs/`. Its identity (`id`) is its path
minus the extension - `architecture/deploy-pipeline.md` is the concept
`architecture/deploy-pipeline`. There is no separate registry: the file *is* the
concept, and its frontmatter is the metadata.

## Frontmatter

Every concept carries typed frontmatter. New files use this canonical key order:

```yaml
---
type: Guide
title: Authoring OKF concepts
description: One sentence describing what this concept covers.
sidebar_position: 2
tags: [okf, authoring, knowledge-bundle]
resource: website/docs/guide/okf-authoring.md
timestamp: '2026-07-04T00:00:00+00:00'
---
```

- **Required:** `type`, `title`, `description`, `timestamp`.
- **Recommended:** `sidebar_position`, `tags`, `resource` (the repo path the
  concept documents).
- `type` is one of the locked taxonomy values: `Component`, `Guide`,
  `Reference`, `Example`, `Workflow`, `Configuration`.

### The flat one-liner rule

Every frontmatter key **must** be a flat one-liner at column 0. No nested maps,
no multi-line values. Inline arrays for lists (`tags: [editor, github-api]`) and
a single-quoted string for the timestamp
(`timestamp: '2026-07-04T00:00:00+00:00'`).

This is not a style preference. The in-browser editor performs *line surgery* on
frontmatter - it locates and rewrites individual key lines by their `key:` prefix
at the start of a line. A nested or wrapped value would break that parsing, so
keys must stay flat and single-line.

### Editing an existing file

Leave every existing frontmatter line byte-identical and in place. Insert
`type: X` as the first line inside the opening fence, and append any new
`tags` / `resource` / `timestamp` lines just before the closing `---`. Do not
reorder or reformat lines that are already there.

## Links: relative only

Cross-links in prose are **relative Markdown file links that include the real
extension**, for example `../architecture/model-viewer.md` or
`../examples/3d-model-viewer.mdx`. Never use a `/`-prefixed absolute link.

The site sets `onBrokenLinks: 'throw'`, so a single unresolved link fails the
production build and blocks the deploy. Relative file links are checked at build
time, which is exactly what you want.

## Update discipline

When you change a concept:

1. **Read before you write.** Load the current file and preserve its existing
   headings and structure.
2. **Bump the `timestamp`** to the time of the change.
3. **Log it.** Add a newest-first entry to `log.md`, starting with `**Update**`,
   `**Creation**`, or `**Deprecation**` as appropriate, describing what changed.
4. **Re-index after adding or removing pages.** Run `npm run okf:index` to
   rebuild the concept index so the bundle metadata matches the files on disk.

The knowledge graph at `graph/viz.html` does not need a manual step - the
`prebuild` hook regenerates it automatically on every `npm run build`, so the
published graph always reflects the current concepts.

## Related

- [In-browser editor](../architecture/in-browser-editor.md) - the tool whose line surgery drives the flat-frontmatter rule.
- [Editing this site](./editing.md) - the day-to-day workflow for making and shipping content changes.
