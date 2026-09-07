# Authoring

## Add or update a page (local bundle)

1. Create or edit `<sitePath>/docs/<folder>/<slug>.md` with frontmatter: `title`, `description` (one sentence, decision aid), `type`, `tags` (list), `resource` (blob URL in a declared repo), optional `sources` (`- resource: <url>` entries), `sidebar_position`. Body in Markdown/MDX; `<ModelViewer>`, `<FbxViewer>`, `<Tabs>`, `<TabItem>` are available without imports.
2. New folder: add `<folder>/index.md` with only `title` and `sidebar_position` frontmatter plus an intro paragraph. The generator adds the markers and the block.
3. From the repository root: `npm run okf:generate` (writes index blocks, manifest, code maps, validates). Exit 1 means fix the report; `manifest.json` is not written until clean.
4. Add a `log.md` bullet under today's date (newest first): `* **Add|Update**: [Title](/folder/slug.md) - what changed. (by Name)`. The editor and content service do this automatically; when editing files directly, do it by hand.
5. `npm run okf:check` must exit 0; commit docs and generated files together.

## Through the editor

The site's Editor link (`<baseUrl>editor/`) opens the in-browser editor. Sign in with a fine-grained GitHub token that has Contents: Read and write on the docs repo (write collaborators only). Save commits the page and every regenerated file in one commit under your name. "New page", "Rename", "Delete" and "Publish version" are in the sidebar.

## Remote bundles (kind: content-service)

Read `${tokenEnv}` from the environment and call the content service: `POST <url>/rpc` with `{"method":"readPage","args":["current","systems/inventory.md"]}` (methods: listVersions, listPages, readPage, writePage, createPage, deletePage, renamePage, listAssets, search, publishVersion). Writes need `{"message": "...", "author": {"name": "...", "email": "..."}}` as the last argument. Errors come back as `{"error": {"code": "VALIDATION", "message": "...", "details": [...]}}`; fix the listed problems and retry.

## Publishing a frozen version

Editor: "Publish version" -> enter `MAJOR.MINOR.PATCH`. Or content service: `publishVersion("1.2.0", {message, author})`. Result: `versioned_docs/version-1.2.0/` with every resource pinned to a commit sha, `docs/versions/1.2.0.json`, `versions.json` updated, tag `docs-v1.2.0`.
