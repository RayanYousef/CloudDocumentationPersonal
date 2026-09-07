---
title: OKF Core package
description: Describes the zero-dependency generator and validator that turns page frontmatter into index blocks, manifest.json, code maps and log entries, including its public API, validator rules and the browser/Node split; open it when a validation report or a stale-content error needs explaining.
type: system
tags: [platform, okf, generator, validator, manifest, code-maps]
resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/okf-core
sources:
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/okf-core/src/generate.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/okf-core/src/validate.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/okf-core/src/codemap.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/okf-core/src/log.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/okf-core/src/model.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/packages/okf-core/src/node/cli.ts
  - resource: https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/scripts/okf.mjs
sidebar_position: 3
---

`@platform/okf-core` implements the OKF Core profile (a strict subset of Google's Open Knowledge Format v0.2) plus the platform's own extensions: code maps and log generation. It has zero runtime dependencies and its core is file-system agnostic: every function takes a `Record<bundleRelativePath, text>` and returns text to write, so the same code runs in Node (CLI, `LocalFolderBackend`, the site prebuild) and in the browser (`GithubBrowserBackend` regenerates before every commit).

## Layout

| File | Responsibility |
|---|---|
| `src/frontmatter.ts` | `parseFrontmatter`, `parseYamlSubset` (a deliberate YAML subset: scalars, inline and block lists, `- key: value` items) |
| `src/model.ts` | `analyzeBundle`, reserved names (`index.md`, `log.md`, `AGENTS.md`, `README.md`), `code-maps/` as the reserved generated folder, `BLOB_RE`, allowed index keys |
| `src/validate.ts` | `validatePage`, `validateBundle`, `checkLinks` |
| `src/index-block.ts` | render and splice the block between `<!-- okf:index -->` and `<!-- /okf:index -->` |
| `src/manifest.ts` | `buildManifest`, `renderManifest` |
| `src/codemap.ts` | `renderCodeMap`, `codeMapPath` (`code-maps/<owner>--<repo>.md`) |
| `src/generate.ts` | `generateBundle`, `checkBundle` |
| `src/log.ts` | `prependLogEntries`, `logEntriesFromCommits`, `validateLog`, `formatLogEntry` |
| `src/rewrite.ts` | `rewriteRefs` (branch to sha in blob URLs and viewer `ref` attributes) |
| `src/node/fs.ts`, `src/node/cli.ts` | `readBundle`, `writeFiles`, `runCli`; exported from the `@platform/okf-core/node` entry |
| `bin/okf.js` | `okf generate` or `okf check` on a bundle directory, with `--repo owner/repo` repeated per code repo |

## What a run produces

1. Index blocks in every folder `index.md`: `## Pages` and `## Folders` bullets, each a link titled with the page title followed by ` - ` and its description, descriptions copied verbatim from page frontmatter or the child folder's intro paragraph, ordered by `sidebar_position` (missing = 999) then title. Markers are created at the end of an index that lacks them; text outside them is preserved byte for byte.
2. `manifest.json`: flat array sorted by route with `route`, `file`, `title`, `description`, `type`, `tags`, `resource`, `sources`. Not written while problems remain.
3. Code maps: one `code-maps/<owner>--<repo>.md` per declared repository, a path-ordered list of every path cited by `resource` or `sources` with the pages that cite it (`(source)` marks a sources citation). Keyed by `owner/repo`, so a repository declared once covers every path in it, including this platform's own code once pages cite it.
4. Log entries: the content service turns each write into `LogEntry` objects and calls `prependLogEntries`; `logEntriesFromCommits` exists for backends that read git history. The validator checks log format and date ordering only (completeness is guaranteed by the write path).

Generated text is compared with line endings normalised to LF, so a CRLF checkout is never reported as stale.

## Validator rules

`rule` values in the problem list: `frontmatter` (missing frontmatter, `title`, `description` or `type`; root index missing `okf_version`), `resource` (`resource` or a `sources[].resource` not matching `https://github.com/<owner>/<repo>/blob/<ref>/<path>`), `undeclared-repo` (points at a repository not passed with `--repo`; skipped when no repos are declared), `link` (relative link whose target does not exist), `index-frontmatter` (folder with Markdown but no `index.md`, index without `title`, index keys other than `title` and `sidebar_position`, root also `okf_version`), `log` (log frontmatter keys other than `title` and `sidebar_position`, headings not `## YYYY-MM-DD`, dates not strictly descending, malformed bullets), and `stale` (check mode only: any generated file a run would change).

## Running it

`scripts/okf.mjs` reads `platform.config.js`, builds the bundle list (`site/docs` plus `site/versioned_docs/version-<v>` for every entry in `site/versions.json`) and calls `runCli` with `--repo owner/repo` for each `codeRepos` entry. `npm run okf:generate` writes; `npm run okf:check` validates and exits 1 on any problem or stale file. Exit code 2 is a usage error.
