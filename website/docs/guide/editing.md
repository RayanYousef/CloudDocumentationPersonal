---
title: Editing this site
sidebar_position: 1
description: How to add and edit documentation pages on this site.
---

# Editing this site

This site is built with [Docusaurus 3](https://docusaurus.io/). All documentation pages live in `website/docs/`. The sidebar is auto-generated from the folder structure — no manual configuration is needed.

## Page structure

- Each folder under `website/docs/` becomes a sidebar **category**.
- Each `.md` or `.mdx` file becomes a **page**.
- A `_category_.json` file in a folder controls the category label, position, and whether it is collapsed by default.
- Front matter (`title`, `sidebar_position`, `description`) at the top of each file controls the page title and its order within the category.

## Ways to edit

### Option 1 — Commit Markdown directly

Clone the repository, edit or add `.md` files under `website/docs/`, and push to `main`. The deploy workflow publishes changes automatically.

### Option 2 — In-browser editor

The in-browser editor lets you create and edit documentation pages directly in your browser — no local setup required. It commits changes via the GitHub API.

**Access:** navigate to `/editor` on the live site (`/CloudDocumentationPersonal/editor`).

#### Authentication

You need a GitHub Personal Access Token (PAT) to save changes.

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Click **Generate new token (classic)**
3. Give it a descriptive name, e.g. `CloudDocumentation editor`
4. Set expiration — **No expiration** for permanent access, or a date for tighter security
5. Under **Select scopes**, tick **`repo`** (this grants `contents:write` and `metadata:read`)
6. Click **Generate token** — copy it immediately; GitHub will not show it again

Paste the token into the token field on the `/editor` page. It is stored in your browser's `localStorage` and is only ever sent to `api.github.com`.

:::warning
Treat your token like a password. Anyone who has it can commit to this repository.
:::

#### Opening a file

The left panel is the file browser. It lists every `.md` and `.mdx` file under `website/docs/`.

- Type in the **search box** to filter by filename
- Use the **version selector** to switch between **Latest** (the live docs) and archived versions (e.g. `v1.0.0`) — editing archived versions is possible but not recommended, as they are snapshots
- Click a filename to load it into the editor

#### Editing modes

| Mode | When to use |
|---|---|
| **WYSIWYG** (default) | Standard prose, new articles, files without complex JSX |
| **Raw MDX** | Files with custom components, bulk text edits, debugging |

In **WYSIWYG mode** the frontmatter fields (`title`, `description`, `sidebar_position`, `slug`) appear as a form above the editor. The body is a rich-text canvas.

In **Raw MDX mode** the entire file — frontmatter and body — is editable as plain text. Switch with the **Raw** button in the toolbar. If WYSIWYG mode cannot parse a file, it falls back to Raw mode automatically.

#### Toolbar reference (WYSIWYG mode)

| Button | Action |
|---|---|
| **B** / **I** / **U** | Bold / Italic / Underline |
| **H2 – H6** | Heading levels (dropdown) |
| **≡** / **1.** | Bullet list / Numbered list |
| **"** | Blockquote |
| **—** | Thematic break (horizontal rule) |
| **Link** | Opens a dialog — enter the URL and link text |
| **Table** | Inserts a blank table |
| **`{ }`** | Code block with language picker (C#, YAML, Bash, JSON, plain) |
| **Admonition** | Note, tip, warning, or danger callout — renders as `:::type` in MDX |

#### Inserting assets

Four insert buttons sit at the right of the toolbar:

**Insert Image**
Opens a file picker. Choose a PNG, JPG, GIF, WebP, SVG, or AVIF (max ~1 MB). The file uploads to `website/static/uploads/` and the editor inserts:
```md
![filename](/uploads/filename.png)
```

**Insert 3D Model**
Opens a file picker. Choose a `.glb`, `.gltf`, or `.fbx` (max ~1 MB).
- `.glb` / `.gltf` → saved to `website/static/models/`, inserts `<ModelViewer src="/models/file.glb" alt="..." />`
- `.fbx` → saved to `website/static/models/fbx/`, inserts `<FbxViewer src="/models/fbx/file.fbx" />`

**Insert from Repo**
Lists assets already committed to the repository. Use this to reference an existing image or model without re-uploading it.

**Insert Tabs**
Inserts a ready-to-fill Tabs block with two tab items. Switch to Raw MDX mode to add more tabs or edit tab labels.

#### Saving

1. Write a commit message in the **Commit message** field (defaults to `Update <filename>`)
2. Click **Save & commit**
3. A success alert appears with a link to the new commit on GitHub

:::tip
Use descriptive commit messages: `docs: add installation steps` is far more useful than `Update intro.md`.
:::

#### Tips & limitations

- **File size:** The GitHub API enforces a ~1 MB limit per file. For larger assets, upload via git on the command line.
- **Conflict detection:** If another commit was pushed to the same file while you had it open, the save fails with a conflict message. Reload the file and re-apply your edits.
- **JSX-heavy files:** The editor auto-falls back to Raw mode if it cannot parse the file. Edit in Raw mode and save normally.
- **Versioned docs:** Editing archived versions is possible but those are snapshots — changes there do not affect the current docs.

## Adding images

Put image files in `website/static/img/` and reference them with absolute paths: `/img/your-image.png`.

## Pages with React components

If a page needs to import a React component (such as `ModelViewer` or `FbxViewer`), use the `.mdx` extension instead of `.md`. MDX pages support standard Markdown plus JSX.
