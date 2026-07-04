---
type: Workflow
title: Deploy pipeline
description: The GitHub Actions workflow that builds the site and publishes it to GitHub Pages on every push to main.
sidebar_position: 4
tags: [ci, github-actions, deployment]
resource: .github/workflows/deploy-docs.yml
timestamp: '2026-07-04T00:00:00+00:00'
---

# Deploy pipeline

The site deploys itself. A single GitHub Actions workflow,
`.github/workflows/deploy-docs.yml`, watches the repository and republishes the
documentation whenever the source changes. There is no manual build-and-upload
step and no external hosting service to manage.

## When it runs

The workflow triggers on a `push` to the `main` branch, but only when the push
touches files that actually affect the site:

- anything under `website/**` (docs, components, config, assets), or
- the workflow file itself.

It can also be started by hand from the Actions tab via `workflow_dispatch`. A
concurrency group named `deploy-docs` with `cancel-in-progress: true` ensures
that if two pushes land close together, the older run is cancelled and only the
newest content is published.

## What it does

The job runs on `ubuntu-latest` and needs `contents: write` permission so it can
push the built site back to the repository.

1. Check out the repository.
2. Set up Node.js 20 with npm caching keyed on `website/package-lock.json`.
3. `npm ci` inside `website/` for a clean, lockfile-exact install.
4. `npm run build` to produce the static site in `website/build/`.
5. Publish `website/build` to the `gh-pages` branch with
   `peaceiris/actions-gh-pages@v4`, authenticated by the built-in
   `GITHUB_TOKEN`.

## The knowledge graph is never stale

The build step does more than compile Markdown. A `prebuild` hook regenerates
the knowledge graph - `website/static/graph/viz.html` - from the current set of
concept pages before every production build. Because the graph is rebuilt as
part of the same `npm run build` that CI runs, the published "brain" of the site
always reflects the docs that were just shipped. There is no separate step to
remember and nothing to regenerate by hand.

## Key workflow excerpt

```yaml
on:
  push:
    branches:
      - main
    paths:
      - 'website/**'
      - '.github/workflows/deploy-docs.yml'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - name: Install dependencies
        working-directory: website
        run: npm ci
      - name: Build website
        working-directory: website
        run: npm run build
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./website/build
```

Because `onBrokenLinks` is set to `throw`, a single unresolved internal link
fails the build and blocks the deploy - broken navigation can never reach the
live site.

## Related

- [Site identity](./site-identity.md) - the `organizationName`, `projectName`, and `baseUrl` values the built site is published under.
- [Editing this site](../guide/editing.md) - how content changes flow into the `main` pushes that trigger this workflow.
