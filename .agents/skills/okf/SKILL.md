---
name: okf
description: Self-contained reference for OKF (Open Knowledge Format) — knowledge as a directory of plain markdown files with YAML frontmatter that any AI agent or human can navigate with no database or server. Use when creating, initializing, or bootstrapping a knowledge bundle, adding YAML frontmatter to markdown notes, writing or updating index.md or log.md, adding a note/idea/resource to a knowledge brain or bundle, linking notes across bundles, disks, or vaults, or making a docs folder double as a bundle — triggers include "OKF", "knowledge bundle", "knowledge brain", "make this folder a bundle", "add this to my brain", "bootstrap a bundle", even if the user never says OKF. Covers the full OKF v0.1 spec (frontmatter, bundle anatomy, reserved names, linking, conformance), index/log discipline, worked examples, the OKF-powered docs-site pattern, and when NOT to use OKF.
---

# OKF — Open Knowledge Format

OKF represents knowledge as a **bundle**: a directory of UTF-8 markdown files. One markdown file = one **concept** (a note, an idea, a table, a playbook). A concept's ID is its bundle-relative path minus `.md` (`tables/customers.md` → `tables/customers`). No database, no server, no required tooling: a bundle is distributable as a git repo, a zip, or a plain folder, and is readable verbatim by any agent — Claude, Cursor, Codex, a human with a text editor.

This skill is the complete, self-contained reference for OKF v0.1. Everything needed to create, extend, and consume bundles is inlined below; no external spec file is required.

The format is deliberately permissive: **producers carry the SHOULDs, consumers carry the MUSTs of tolerance.** Never "fix" someone else's bundle by stripping unknown keys, rejecting unfamiliar types, or deleting broken links — a dangling link is legal and often just marks not-yet-written knowledge.

## Frontmatter

Every concept file starts with a YAML block delimited by `---`, then a markdown body.

| Field | Status | Rules |
|---|---|---|
| `type` | **REQUIRED** | Short string classifying the concept. There is **no central registry** — invent descriptive values (`note`, `table`, `playbook`, `decision`, `dataset`, `archive-record`, ...). Consumers MUST tolerate unknown types. |
| `title` | recommended | Human-readable display name. |
| `description` | recommended | ONE standalone sentence. Index entries copy it **verbatim**, so it must make sense out of context. |
| `resource` | recommended when one exists | Canonical URI of the underlying asset the concept describes (a table, an API, a file). Omit when the concept has no external referent. |
| `tags` | recommended | A YAML **list** — `[a, b]` or block style. Never author a comma-separated string (consumers tolerate strings, producers shouldn't emit them). |
| `timestamp` | recommended | Quoted ISO 8601, e.g. `"2026-07-19T10:00:00+00:00"`. Refresh on every meaningful edit. |

Extra producer-defined keys are legal. **Preserve any unknown keys you encounter** when editing.

## Reserved names: `index.md` and `log.md`

Exactly two filenames are reserved, at **every** directory level, and are never concepts:

- **`index.md`** — progressive-disclosure navigation: a short orientation paragraph, then bullets in the form `* [Title](path.md) - description`, with each description copied verbatim from the target's frontmatter. An agent reads the index first and opens only the two or three concepts it needs. The **bundle-root** index declares the format version with `okf_version: "0.1"`.
- **`log.md`** — the change journal: newest-first entries grouped under ISO `## YYYY-MM-DD` headings.

**Spec vs. practice (index/log frontmatter):** the v0.1 spec says indexes carry no frontmatter (except `okf_version` at the root). A widespread, legal **local extension** gives every `index.md` and `log.md` full frontmatter (`type: index` / `type: log` plus title/description/timestamp). Consumers must tolerate either form. **This skill recommends the extension as the default** — uniform frontmatter makes every file in the bundle machine-scannable the same way.

## Linking

- **Bundle-absolute paths are recommended** (`[customers](/tables/customers.md)` — leading `/` = bundle root); relative links are legal.
- **Broken links are legal.** A link to a file that doesn't exist yet marks planned, not-yet-written knowledge. Consumers MUST NOT reject a bundle over them.
- **Relationship meaning lives in the surrounding prose**, not in link syntax: write "supersedes [the old schema](/tables/customers-v1.md)", not a bare link.
- **Links that leave the bundle** (another disk, another vault) don't survive as relative paths. Emit a paired `file:///` URI (clickable, forward slashes) **plus** the literal path in backticks (unambiguous, copy-pasteable):

  ```markdown
  See the [warehouse bundle log](file:///D:/knowledge/warehouse/log.md) `D:\knowledge\warehouse\log.md` for history.
  ```

## Body conventions

Prefer **structure over prose**: headings, tables, lists, fenced code blocks. Both humans and agents retrieve from structure better than from paragraphs. Three optional conventional section names carry shared meaning:

- `# Schema` — the shape of the thing (columns, fields, parameters), usually a table.
- `# Examples` — worked usage, usually fenced code.
- `# Citations` — a numbered `[label](url)` list at the bottom of the file; cite sources there rather than inline.

## Conformance

A bundle is conformant **iff every non-reserved `.md` file has parseable YAML frontmatter with a non-empty `type`**. That is the whole bar.

- Producers SHOULD: fill the recommended fields, keep indexes and logs current, use list-form tags and quoted ISO timestamps.
- Consumers MUST NOT reject: unknown types, unknown frontmatter keys, broken links, missing indexes, or missing optional fields.

## Discipline rules

- **Every add, move, or rewrite updates the governing `index.md` AND appends to `log.md` — atomically, in the same change.** A concept absent from the index and log is invisible to future readers.
- **Don't delete — archive.** Retire superseded concepts by retyping to an archive type (e.g. `type: archive-record`) so history stays traversable.
- **Agent-instruction files never get frontmatter.** `CLAUDE.md`, `AGENTS.md`, `.cursorrules` / rules files, and their kin are instructions to a harness, not knowledge concepts — leave them untouched.
- **Folders are lowercase-kebab-case.**
- **Reserved names stay reserved**: never author a concept called `index.md` or `log.md`.
- **Preserve what you don't understand** in existing bundles unless the task is specifically to fix it.

## Worked examples

### A minimal complete concept

A concept describing an external asset: `type` + `resource`, one-line body, one fenced example, citations at the bottom.

````markdown
---
type: table
resource: bigquery://acme-prod.analytics_1234.events_*
title: Product analytics events export
description: The raw daily event export in the warehouse, one row per user event, sharded by date suffix.
tags: [analytics, warehouse, events]
timestamp: "2026-07-19T10:00:00+00:00"
---

One row per event; `event_params` is a repeated key-value struct — unnest it to filter on parameters.

```sql
SELECT event_name, COUNT(*) AS n
FROM `acme-prod.analytics_1234.events_*`
WHERE _TABLE_SUFFIX BETWEEN '20260101' AND '20260107'
GROUP BY event_name
ORDER BY n DESC;
```

# Citations

1. [GA4 BigQuery export schema](https://support.google.com/analytics/answer/7029846)
````

### A small `index.md`

Root index (declares the version; carries full frontmatter per the recommended extension):

```markdown
---
type: index
okf_version: "0.1"
title: Warehouse Knowledge
description: What lives in the analytics warehouse and how to query it.
timestamp: "2026-07-19T10:00:00+00:00"
---

Knowledge bundle for the analytics warehouse. Start here.

# Tables

* [Product analytics events export](tables/events.md) - The raw daily event export in the warehouse, one row per user event, sharded by date suffix.
* [Customers dimension](tables/customers.md) - One row per customer with lifecycle status and first-seen date.
```

### A `log.md`

```markdown
---
type: log
title: Update Log
description: Newest-first change journal for the warehouse knowledge bundle.
timestamp: "2026-07-19T10:00:00+00:00"
---

# Update Log

## 2026-07-19

* **Update**: Added `tables/customers.md`; wired it into the root index.

## 2026-07-13

* **Initialization**: Created the bundle; added frontmatter to 1 existing note and wired the index.
```

### Bootstrapping a bundle — five steps

Any folder of markdown becomes an OKF bundle:

1. **Create `index.md`** at the root with `okf_version: "0.1"` (plus, per the recommended extension, `type: index` and the other fields — see the example above).
2. **Create `log.md`** with an `**Initialization**` entry under today's `## YYYY-MM-DD` heading.
3. **Add frontmatter to every existing non-reserved `.md`**: pick a descriptive `type`, write a one-sentence `description`, set a quoted ISO `timestamp`; add `resource` where the note describes an external asset. Skip agent-instruction files.
4. **Wire the index**: one `* [Title](path.md) - description` bullet per concept, descriptions copied verbatim; group under headings when the list grows. Keep one root index until a subfolder exceeds roughly ten notes — then give that folder its own `index.md` and link it from the root as `* [Subfolder](subfolder/index.md) - what lives there.`
5. **Verify**: every non-reserved `.md` parses and has a non-empty `type`; index links resolve or intentionally point at planned notes; the log entry is dated today.

### A richer concept, and one with no `resource`

Conventional sections in action, plus a self-contained `type: playbook` note (no external asset, so no `resource` key):

```markdown
---
type: table
resource: postgres://prod/public.orders
title: Orders table
description: One row per order with status, totals, and foreign keys to customers and payments.
tags: [warehouse, orders]
timestamp: "2026-07-19T10:00:00+00:00"
---

# Schema

| column | type | notes |
|---|---|---|
| id | bigint | primary key |
| customer_id | bigint | FK → customers |
| status | text | pending / paid / refunded |
| total_cents | int | after discounts |

# Joins

* [Customers dimension](/tables/customers.md) via `customer_id` — one-to-many.
* Payments land in [payments](/tables/payments.md) via `order_id` (not yet written).
```

```markdown
---
type: playbook
title: Investigating a revenue dip
description: Step-by-step checks to localize a sudden drop in reported revenue before escalating.
tags: [oncall, revenue]
timestamp: "2026-07-19T10:00:00+00:00"
---

1. Check the export freshness in [events](/tables/events.md) — a late shard mimics a dip.
2. Compare `status = 'refunded'` volume week-over-week in [orders](/tables/orders.md).
3. Only then page the payments owner.
```

## OKF-powered docs sites

A static-site docs tree (e.g. a Docusaurus `docs/` folder) can **itself be an OKF bundle** — the two frontmatter dialects merge into one YAML block, since both are just keys and consumers tolerate extras on either side:

```markdown
---
# site-facing
title: Getting Started
sidebar_position: 1
description: Install the toolchain and run your first build in under five minutes.
# OKF-facing
type: guide
tags: [onboarding, build]
timestamp: "2026-07-19T10:00:00+00:00"
---
```

Patterns that fall out of this:

- **Per-folder `index.md` (or `.mdx`) doubles as the category landing page** — the OKF navigation bullets are the landing page's content.
- **`log.md` renders as a changelog page** for free.
- **A build-time generator can derive a knowledge-graph visualization** from frontmatter + links across the tree. Such derived artifacts are **never hand-edited** — regenerate them from the docs; the markdown is the source of truth.

## When NOT to use OKF

- **Source-code trees and their READMEs.** Don't add frontmatter, indexes, or logs to a repo's source tree or code-adjacent docs — repos have their own conventions. (A dedicated docs tree is the exception: it *can* be a bundle, per the section above.)
- **The OKF reference-implementation repo itself** — never vendor it into your projects; the format needs no runtime.
- **Scratch and generated files** — throwaway analysis, build artifacts, tool output. If nobody will navigate to it later, it isn't a concept.
- **Content a generator owns** — auto-built indexes, derived graphs, compiled outputs. Edit the source, rerun the generator; hand-editing derived files creates silent drift.
