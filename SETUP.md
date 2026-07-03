# Using this repo as a base for a new project

This is a reusable Docusaurus 3.x documentation site. All project identity lives
in **one file**, so standing up a new project is mostly editing that file plus
swapping a couple of images.

## 1. Edit `website/site.config.js`

This is the single source of truth. Update the ~7 values:

- `siteUrl` — your GitHub Pages origin, e.g. `https://<user>.github.io`
- `baseUrl` — the sub-path, `/<repo>/` for project pages (leading + trailing
  slash), or `/` for a root/custom-domain site
- `organizationName` — GitHub user or org that owns the repo
- `projectName` — the repo name
- `deployBranch` — branch the site deploys from / the in-browser editor commits
  to (usually `main`)
- `title` and `tagline` — site branding

`docusaurus.config.js` and the in-browser editor both read from this file, so
you never edit identity values anywhere else.

## 2. Replace the logo and favicon

Drop your own files into `website/static/img/`:

- `logo.png` — navbar logo
- `favicon.png` — browser-tab icon

There is intentionally no default social-card image. To add one, put it in
`website/static/img/` and set an `image` key in `themeConfig` of
`docusaurus.config.js`.

## 3. (Optional) Clear the demo docs

Delete or replace the demo content under `website/docs/`.

> **Warning:** the footer in `website/docusaurus.config.js` links to demo pages
> (`/examples/...` and `/guide/editing`). If you remove those pages, update or
> delete the matching footer links too — the build sets `onBrokenLinks: 'throw'`,
> so a dangling internal link fails `npm run build`.

## 4. Versioning (opt-in)

Versioning is off until you snapshot a version:

```bash
cd website
npm run docusaurus docs:version 1.0.0
```

This writes `versions.json`, `versioned_docs/`, and `versioned_sidebars/`. The
editor's version dropdown reads `versions.json` automatically — no other edits.

## 5. Deploy

Deployment is automatic: the GitHub Actions workflow builds and publishes to
GitHub Pages on every push to `main` that touches `website/**`.
