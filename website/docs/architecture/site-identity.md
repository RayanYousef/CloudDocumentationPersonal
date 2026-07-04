---
type: Configuration
title: Site identity (site.config.js)
description: The single source of truth for the site's URLs, GitHub repo, deploy branch, and branding.
sidebar_position: 5
tags: [configuration, identity, template]
resource: website/site.config.js
timestamp: '2026-07-04T00:00:00+00:00'
---

# Site identity (site.config.js)

Every value that says *who owns this site, where it is deployed, and what it is
called* lives in one file: `website/site.config.js`. It is the single source of
truth for the site's identity, and nothing else in the project should hardcode
these values.

## What it holds

```js
module.exports = {
  // Deployment target
  siteUrl: 'https://RayanYousef.github.io',   // GitHub Pages origin, no path
  baseUrl: '/CloudDocumentationPersonal/',    // sub-path, leading + trailing slash

  // GitHub repo identity
  organizationName: 'RayanYousef',            // user or org that owns the repo
  projectName: 'CloudDocumentationPersonal',  // the repo name
  deployBranch: 'main',                        // branch the editor commits to

  // Branding
  title: 'Documentation',
  tagline: 'A Docusaurus documentation platform',
};
```

## Why one file, and why CommonJS

The config is written as a CommonJS module (`module.exports`) on purpose,
because two very different consumers read it:

- **`docusaurus.config.js`** `require()`s it under Node at build time. It maps
  `title`, `tagline`, `url`, `baseUrl`, `organizationName`, and `projectName`
  straight onto the Docusaurus config, and builds the `editUrl` and navbar/footer
  GitHub links from `organizationName` / `projectName` / `deployBranch`.
- **The in-browser editor** (`src/components/editor/githubApi.js`) `import`s it
  as webpack-bundled browser code. It reads `organizationName`, `projectName`,
  and `deployBranch` to know which repo and branch to commit edits to.

`module.exports` is the one module form that works for both a Node `require()`
and a bundled browser `import`, so the same values drive the server build and the
client-side editor without duplication.

## The never-hardcode rule

Because both the build and the running editor derive from this file, the identity
can never drift out of sync - as long as no other file hardcodes a URL, repo
name, or branch. Do not paste `siteUrl`, `baseUrl`, `organizationName`,
`projectName`, or `deployBranch` anywhere else. If you need one of them, import
`site.config.js` and read it.

## Reusing this repo as a template

Standing up a new documentation site from this repository is a one-file edit:
change the values in `site.config.js` to point at the new owner, repo, URL, and
branding, and every derived value - build output, edit links, editor commit
target - follows automatically. See `SETUP.md` at the repository root for the
full reuse checklist.

## Related

- [In-browser editor](./in-browser-editor.md) - reads `organizationName`, `projectName`, and `deployBranch` from this file to commit edits.
- [Deploy pipeline](./deploy-pipeline.md) - publishes the site under the `baseUrl` and repo defined here.
- [Model viewer](./model-viewer.md) - resolves asset paths against the `baseUrl` set in this config.
