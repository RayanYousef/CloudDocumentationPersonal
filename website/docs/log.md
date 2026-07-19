---
title: Changelog
sidebar_position: 99
description: Change history for this documentation bundle, newest entries first.
type: log
tags:
  - changelog
timestamp: "2026-07-19T00:00:00+00:00"
---

# Changelog

Change history for the documentation in this bundle, newest entries first.

## 2026-07-19

* **Viz system + template docs**: Added the build-time OKF graph visualization — an `okf-graph` plugin that scans the docs on every build, a per-page **Viz** button showing each folder's graph (disabled where no data exists), and a full-site graph at `/viz`. Documented the clone-and-reuse conventions (OKF frontmatter contract, per-folder index, changelog discipline, zero-maintenance viz) in `SETUP.md` and `CLAUDE.md`.
* **OKF migration**: Restructured `website/docs/` as an OKF (Open Knowledge Format) knowledge bundle. Every doc now carries merged frontmatter — Docusaurus fields (`title`, `sidebar_position`, `description`) plus OKF fields (`type`, `tags`, `timestamp`). Added a new homepage (`index.mdx`, `type: index`) that renders the top-level categories as cards, folder landing pages for **Examples** and **Guide**, and this changelog (`type: log`). The former `intro.mdx` was folded into the new homepage.
