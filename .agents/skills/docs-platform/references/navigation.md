# Navigation walk

1. `docs/index.md`: intro paragraph, then the generated block: `## Pages` and `## Folders` bullets `* [Title](path) - description`. Read descriptions; open only what answers the question.
2. Descend one folder at a time (`systems/index.md`, `systems/networking/index.md`). Each repeats the layout.
3. On a page, frontmatter tells you: `type` (system, guide, asset, decision, reference...), `tags`, `resource` (primary code folder/file at a ref), `sources` (specific files). Latest pins to a branch; frozen versions pin to a commit sha recorded in `docs/versions/<v>.json`.
4. `manifest.json` is the whole bundle as a flat array (route, file, title, description, type, tags, resource, sources): use it to search or filter instead of walking.
5. `code-maps/<owner>--<repo>.md` inverts the manifest: a path-ordered list of code paths, each followed by the pages that cite it (`(source)` marks a `sources` citation). Given a changed file, pick the entry with the longest matching prefix.
6. `log.md` is newest-first: what changed, on which page, by whom.

Example: asked "why is inventory host-authoritative?", read `docs/index.md` -> `Systems` folder -> `systems/index.md` -> `Inventory` (description mentions the service API) -> the page's `resource` points at `examples/unity-project/Assets/Scripts/Inventory`; the code repo's own `Assets/Scripts/Inventory/index.md` names `InventoryService.cs`.
