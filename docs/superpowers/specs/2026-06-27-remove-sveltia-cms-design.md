# Design: Remove Sveltia CMS & Pages CMS, Expand In-Browser Editor Guide

**Date:** 2026-06-27  
**Status:** Approved

## Goal

Strip all Sveltia CMS and Pages CMS artifacts from the repository. The in-browser visual editor (`/editor`) is the sole non-git editing interface going forward. Expand the existing `editing.md` guide into a comprehensive reference for the in-browser editor.

## Files to Delete

| Path | Reason |
|---|---|
| `website/static/admin/index.html` | Sveltia CMS loader — no longer needed |
| `website/static/admin/config.yml` | Sveltia CMS collection config — no longer needed |
| `website/static/admin/` (directory) | Empty after above deletions |
| `.pages.yml` | Pages CMS config — no longer needed |

## Files to Modify

### `website/docs/guide/editing.md`

Current state: Overview of three editing methods — direct git commits, in-browser editor (one line), and Sveltia CMS (`/admin`).

Target state: Remove the Sveltia CMS option entirely. Expand the in-browser editor section into a full guide covering:

1. **Overview** — what it is, URL (`/editor`)
2. **Authentication** — GitHub PAT generation steps, required scopes (`repo` or `contents:write` + `metadata:read`), where to enter it, localStorage note, security warning
3. **Opening a file** — file browser, search/filter, version selector (Latest vs archived versions)
4. **Editing modes** — WYSIWYG (frontmatter form + rich-text body) vs Raw MDX (full textarea); when to use each
5. **Toolbar reference** — bold, italic, underline, headings H2–H6, bullet list, numbered list, blockquote, thematic break, link dialog, table, code block (language picker: C#, YAML, Bash, JSON), admonitions (note/tip/warning/danger)
6. **Inserting assets** — four buttons: Upload Image (`/uploads/`), Upload 3D Model (`/models/` or `/models/fbx/`), Insert from Repo (existing committed assets), Insert Tabs (`<Tabs>/<TabItem>` JSX)
7. **Saving** — commit message field, Save & commit button, GitHub commit link in success alert
8. **Tips & limitations** — ~1 MB GitHub API file size limit, JSX-heavy files auto-fall back to Raw mode, conflict detection on concurrent edits, versioned docs caveat

### `CLAUDE.md`

Remove the `## CMS configs` section (the block mentioning `.pages.yml` and `website/static/admin/config.yml`). All other content stays exactly as-is.

## Workflow Phases

### Phase 1 — Audit (parallel)
Three agents run concurrently:
- Read all CMS files in full
- Grep entire repo for `sveltia`, `pagescms`, `pages\.yml`, `/admin/`, `static/admin`
- Read `docusaurus.config.js` and list `website/docs/` structure

### Phase 2 — Changes (parallel, different files)
Two agents run concurrently:
- **Cleanup agent**: delete `website/static/admin/`, delete `.pages.yml`, remove CMS section from `CLAUDE.md`, fix any other CMS references found in audit
- **Guide agent**: rewrite `website/docs/guide/editing.md` — remove Option 3 (CMS), expand Option 2 into the full in-browser editor guide

### Phase 3 — Verify (single agent)
- Confirm deleted files no longer exist (`Test-Path`)
- Read `editing.md` and `CLAUDE.md` to confirm correctness
- Grep for residual CMS references
- Run `npm run build` — must pass with zero errors

### Phase 4 — Git (single agent, sequential steps)
Only proceeds if Phase 3 passes.
1. `git checkout -b feature/remove-sveltia-cms-add-editor-guide`
2. Stage deletions (`git rm`) and modifications (`git add`)
3. Commit with descriptive message
4. `git push -u origin feature/remove-sveltia-cms-add-editor-guide`
5. `gh pr create`
6. `gh pr merge --merge --delete-branch`

## Success Criteria

- `website/static/admin/` directory does not exist
- `.pages.yml` does not exist
- No references to `sveltia`, `pagescms`, or `/admin` route remain in source
- `npm run build` passes
- `editing.md` covers all 8 sections of the in-browser editor guide
- PR is merged to `main`
