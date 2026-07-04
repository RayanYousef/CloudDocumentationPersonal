---
type: Component
title: In-browser editor
description: The /editor page — a client-only Docusaurus route that edits docs and commits them straight to GitHub through the REST Contents API, using round-trip-safe frontmatter line surgery.
sidebar_position: 1
tags: [in-browser-editor, github-api, frontmatter, browser-only, pat-auth, line-surgery]
resource: website/src/components/editor/
timestamp: '2026-07-04T00:00:00+00:00'
---

The in-browser editor is a client-only application that lets a maintainer open any
docs markdown file, edit its frontmatter and body, and commit the result back to
the repository — all from the live site, with no local checkout. It lives entirely
under `website/src/components/editor/` and is reached at `/editor`.

## The /editor page role

`website/src/pages/editor.js` is an SSR shell. It imports only `React`,
`@theme/Layout`, and `@docusaurus/BrowserOnly` at module scope; the real
application (`EditorApp.jsx`) is loaded through `require()` inside a
`<BrowserOnly>` render-prop. This matters because the editor pulls in
`@mdxeditor/editor`, which touches `window` at import time — a top-level import
reachable by the static build would fail `npm run build` with "window is not
defined" and break the whole site. The same client-only discipline is what the
3D viewers use; see [ModelViewer](./model-viewer.md).

The flow inside `EditorApp` is: `TokenGate` (collect a PAT) -> `FilePicker` ->
load a file (`getFile` + `splitFrontmatter`) -> edit -> save (`joinFrontmatter` +
`putFile`). There are two editing modes: a WYSIWYG surface with a small
frontmatter form, and a raw-MDX textarea over the whole file (also the automatic
fallback if MDXEditor cannot parse the document).

## The GitHub REST commit flow

`githubApi.js` is pure browser code (`fetch`, `btoa`/`atob`,
`TextEncoder`/`TextDecoder`). Auth is a GitHub Personal Access Token supplied by
the user at runtime; every request is client-side against the GitHub Contents and
Git Data APIs. The owner, repo, and branch all derive from
`website/site.config.js` (via `organizationName`, `projectName`, `deployBranch`) —
never hardcoded. See [site identity](./site-identity.md).

Reading a file (`getFile`) returns the decoded text plus the current blob `sha`.
Saving (`putFile` -> `putRaw`) issues a `PUT` to `/contents/<path>` with the
base64 content, the branch, and that `sha`. Passing the `sha` is what turns the
call into an update rather than a create; if the file changed on the server since
it was loaded, GitHub returns 409 and the editor surfaces a clear "reload and
re-apply" conflict error. The successful response carries the new blob sha and the
commit `html_url`, which the UI links to. A short shared cache of the recursive
git tree (used by the file/asset pickers) is invalidated on every write so new
commits appear immediately.

## The frontmatter line-surgery contract

`frontmatter.js` deliberately does **not** use a full YAML library. Its goal is
that editing one field rewrites **only that field's line** and leaves every other
line byte-identical — a full parse-and-serialize would reorder keys, drop
comments, and normalize quoting, churning the diff.

`splitFrontmatter` slices the `---` fenced block and parses only flat, top-level
`key: value` lines (regex `^([A-Za-z0-9_][A-Za-z0-9_-]*):\s?(.*)$`). `EditorApp`
exposes just four of those keys as editable form fields:

```js
const FRONTMATTER_FIELDS = ['title', 'sidebar_position', 'description', 'slug'];
```

On save, `joinFrontmatter` walks the original lines: a line whose key is in the
updates set is rewritten in place; every other line — including indented content,
comments, blanks, and list items — is passed through verbatim. Keys not present
are appended. When no field actually changed, the round-trip is byte-identical.

The critical consequence: **any frontmatter key round-trips losslessly only if it
is a flat one-liner at column 0.** Nested maps and multi-line block scalars are
preserved as opaque text but are invisible to the parser, and non-flat keys risk
being mangled. This is exactly why the OKF metadata keys (`type`, `tags`,
`resource`, `timestamp`) must all be flat one-liners with inline arrays — so the
editor can open, edit, and re-commit these pages without corrupting their
metadata. For the authoring rules this enforces, see the
[editing guide](../guide/editing.md).

## Constraints and gotchas

- The PAT lives only in browser memory for the session; it is never persisted by
  the app. Committing requires a token with write access to the repo.
- Only files under a version prefix (`website/docs/` for Latest, or a
  `versioned_docs/version-*/` snapshot) are listed; `_category_.json` is excluded.
- A 409 on save means the file moved under you — reload before retrying.
- Keep every frontmatter key flat, or the round-trip guarantee no longer holds.

## Related

- [Site identity](./site-identity.md) — where owner/repo/branch come from.
- [ModelViewer (glTF)](./model-viewer.md) — the same `<BrowserOnly>` client-only pattern.
- [Deploy pipeline](./deploy-pipeline.md) — how a committed change reaches the live site.
- [Editing guide](../guide/editing.md) — the authoring rules the contract enforces.
