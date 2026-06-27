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

Visit `/editor` on this site to open the WYSIWYG editor. Changes are committed to the repository via GitHub OAuth.

### Option 3 — CMS

Visit `/admin` to open the Sveltia CMS interface. Sign in with a GitHub Personal Access Token (read/write scope for this repository). The CMS exposes the intro page, guide pages, and example pages.

## Adding images

Put image files in `website/static/img/` and reference them with absolute paths: `/img/your-image.png`.

## Pages with React components

If a page needs to import a React component (such as `ModelViewer` or `FbxViewer`), use the `.mdx` extension instead of `.md`. MDX pages support standard Markdown plus JSX.
