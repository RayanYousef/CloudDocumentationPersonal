# How to navigate this bundle (for agents)

1. Start at `index.md`. It lists every page and sub-folder with a one-sentence description; read descriptions first and open only the pages whose description answers "is this the file I need?".
2. Descend one folder at a time: each folder's `index.md` repeats the same Pages / Folders layout, so you never need a directory listing.
3. Frontmatter `type` tells you what kind of page you are reading (system, guide, asset, decision, reference); `tags` are free-form keywords for cross-cutting search.
4. `resource` is a GitHub blob URL to the primary code or asset folder the page describes, pinned to a ref. `sources` list specific files. On the Latest docs the ref is `main`; on a frozen version (see `versions/*.json` and the `docs-v*` copies) it is a commit sha, so what you read matches what shipped.
5. To answer a code question, follow `resource` into the repo and read that folder's own `index.md`, which uses the same convention without frontmatter.
6. `manifest.json` is a flat list of every concept page (route, title, description, type, tags, resource). Use it for search or filtering instead of walking folders.
7. The blocks between `<!-- okf:index -->` and `<!-- /okf:index -->`, the whole of `manifest.json`, and every file under `code-maps/` are GENERATED. Never edit them by hand. `code-maps/<owner>--<repo>.md` is the reverse index from a code path to the pages that describe it.
8. `log.md` is the newest-first change log; append a dated bullet when you add or materially change a page.
9. To add a page: create `<folder>/<slug>.md` with frontmatter (`title`, `description`, `type`, `tags`, `resource`, optional `sources`, `sidebar_position`), write the body, then run the generator.
10. To add a folder: create it with an `index.md` whose frontmatter has only `title` and `sidebar_position`, plus an intro paragraph (it becomes the folder's description in the parent index).
11. Regenerate and validate from the repository root with `npm run okf:generate`; `npm run okf:check` validates without writing (CI runs it on every push). Declared code repositories come from `platform.config.js`.
12. The generator exits 1 on any problem (missing fields, broken links, bad or undeclared resource URLs, extra index keys, malformed log). Fix the report before finishing.
13. Documented deviation: `log.md` carries `title` and `sidebar_position` frontmatter so the site can render it; nothing else is allowed there.
