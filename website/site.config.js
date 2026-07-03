/**
 * Project identity — the SINGLE source of truth for who owns this site, where
 * it is deployed, and what it is called. Both docusaurus.config.js (read under
 * Node at build time) and the in-browser editor (webpack-bundled browser code
 * in src/components/editor/) read their identity values from here.
 *
 * Edit this file (only) when reusing this site for a new project.
 *
 * Written as a CommonJS module (module.exports) on purpose: it must be
 * require()-able by docusaurus.config.js under Node AND import-able by the
 * webpack-bundled browser code — module.exports works for both.
 */
module.exports = {
  // --- Deployment target -----------------------------------------------------
  // The GitHub Pages origin, no path. For a user/org site this is
  // https://<user>.github.io; for a custom domain, that domain.
  siteUrl: 'https://RayanYousef.github.io',
  // The sub-path the site is served under, with a leading AND trailing slash.
  // For project pages this is '/<repo>/'; for a root or custom-domain site, '/'.
  baseUrl: '/CloudDocumentationPersonal/',

  // --- GitHub repo identity --------------------------------------------------
  organizationName: 'RayanYousef', // GitHub user or org that owns the repo
  projectName: 'CloudDocumentationPersonal', // the repo name
  deployBranch: 'main', // branch the editor commits to / edit links point at

  // --- Branding --------------------------------------------------------------
  title: 'Documentation',
  tagline: 'A Docusaurus documentation platform',
};
