---
title: Editing in the Browser
sidebar_position: 2
description: Edit docs in the browser with Sveltia CMS — no backend required.
---

# Editing in the Browser

This site ships with **[Sveltia CMS](https://github.com/sveltia/sveltia-cms)** (MIT)
mounted at **`/admin`**. It runs entirely in your browser and commits your edits
straight to the GitHub repository — no server to run.

## One-time setup

1. Create a **GitHub Personal Access Token (PAT)** with `repo` scope (fine-grained
   tokens: grant **Contents: Read and write** on this repository).
2. Visit **`/admin`** on the deployed site (or `http://localhost:3000/admin` in dev).
3. Click **Sign In with Token** and paste your PAT. It is stored only in your
   browser's local storage.

## Editing

- Pick a collection (e.g. **Features**), open a page, edit, and **Publish**.
- Publishing creates a commit on the configured branch; the site rebuilds and
  deploys automatically via GitHub Actions.

## "Only one editor at a time"

A static site has no server, so there is **no true real-time lock**. Use this
convention instead:

- **Single trusted editor (recommended):** one person holds the PAT. With one
  editor, single-writer is guaranteed.
- **Small team:** edit via short-lived branches / PRs (Sveltia editorial workflow)
  so Git surfaces conflicts at publish time.
- **Need a hard real-time lock?** That requires a small free-tier serverless
  component (e.g. a Supabase/Firebase "lock" record). It is intentionally **not**
  included here to keep the site 100% static and free. See
  `.ignored/research-findings.md` for the evaluated options.

:::warning
A PAT in browser storage grants write access to the repo. Only use it on a trusted
device, scope it to this repository, and revoke it if exposed.
:::
