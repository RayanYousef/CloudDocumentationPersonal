# Documentation Site

A [Docusaurus 3](https://docusaurus.io/) documentation platform with custom features including interactive 3D model viewers, an in-browser WYSIWYG editor, content versioning, and CMS integration.

## Running the site

All commands run from the `website/` directory:

```bash
cd website
npm install        # install dependencies
npm run start      # local dev server at http://localhost:3000
npm run build      # production build into website/build/
npm run serve      # serve the production build locally
npm run clear      # clear the Docusaurus cache
```

Requires Node >= 20.

## Custom features

- **3D model viewers** (`ModelViewer` for glTF, `FbxViewer` for FBX) — embed interactive models in `.mdx` pages; assets live in `website/static/models/`.
- **In-browser editor** — a WYSIWYG editor at `/editor` backed by MDXEditor and GitHub OAuth.
- **Versioning** — frozen release snapshots selectable from the navbar version dropdown.
- **CMS** — Pages CMS (`/.pages.yml`) and Sveltia CMS (`/admin`) for non-technical editors.

## Deployment

Pushes to `main` that touch `website/**` trigger `.github/workflows/deploy-docs.yml`, which builds and publishes the site to GitHub Pages.
