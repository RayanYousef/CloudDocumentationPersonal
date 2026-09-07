// Single source of truth for identity, enabled features, auth/content wiring and code repos.
// Read by site/docusaurus.config.js, services/editor (Vite), scripts/okf.mjs and CI.
// No secrets here: this file is bundled into the browser.
// Field reference: site/docs/platform/ (rendered at <siteUrl><baseUrl>platform/) and
// packages/contracts/src/platform-config.ts (the PlatformConfig type).

/** @type {import('@platform/contracts').PlatformConfig} */
const platformConfig = {
  // Origin the site is served from (Docusaurus `url`). No trailing slash.
  siteUrl: 'https://RayanYousef.github.io',
  // Path under siteUrl where the site lives (Docusaurus `baseUrl`, Vite `base` for the editor at
  // `<baseUrl>editor/`, and the prefix for `<baseUrl>platform/*.json`). Must start and end with `/`.
  baseUrl: '/CloudDocumentationPersonal/',
  // GitHub owner of the repository that holds this site. Used for the GitHub link, the edit URL,
  // the token provider's collaborator check and the browser content backend's commits.
  organizationName: 'RayanYousef',
  // GitHub repository name that holds this site (same uses as organizationName).
  projectName: 'CloudDocumentationPersonal',
  // Branch the editor commits to and the edit URL points at; the push to it triggers deploy-pages.yml.
  deployBranch: 'main',
  // Folder of the Docusaurus site relative to the repository root. The docs bundle is `<sitePath>/docs`,
  // frozen versions `<sitePath>/versioned_docs/version-<v>`, static assets `<sitePath>/static`.
  sitePath: 'site',
  // Site title (browser tab, home page).
  title: 'Skyforge Documentation',
  // Tagline shown under the title on the home page.
  tagline: 'Documentation platform template for Unity projects',
  // Text next to the logo in the navbar.
  navbarTitle: 'Skyforge Docs',
  // Footer copyright line (any string; evaluated at build time).
  footerCopyright: `Copyright ${new Date().getFullYear()} Skyforge. Built with the Documentation Platform.`,
  // Feature switches. editor: show the Editor links (the editor is still built). viewers: 3D viewer UI.
  // search: mount the Orama search plugin in the site.
  features: { editor: true, viewers: true, search: true },
  // AuthProvider the editor's composition root instantiates: 'github-token' (fine-grained PAT with
  // push permission on organizationName/projectName) or 'mock' (tests/e2e; VITE_PLATFORM_AUTH overrides).
  auth: { provider: 'github-token' },
  // ContentBackend the editor and site use: 'github-browser' (Git Data API from the browser with the
  // editor's token) or 'http' with `url` pointing at a serveContentBackend endpoint
  // (VITE_PLATFORM_CONTENT overrides in the editor).
  content: { backend: 'github-browser' },
  // Code repositories the docs may cite in `resource` / `sources` (validator rule `undeclared-repo`).
  // One entry per owner/repo: the generator writes one code map per entry
  // (`docs/code-maps/<owner>--<repo>.md`) covering EVERY path cited in that repository, and
  // publishVersion resolves one pin per entry. This repository hosts both the sample Unity project
  // (examples/unity-project) and the platform code (packages/, services/, site/src, scripts/), and the
  // single entry below covers both; a second entry for the same owner/repo would only duplicate the
  // code map and the pin. `pathPrefix` does not restrict coverage: it is the default resource folder the
  // editor's New page dialog proposes (first entry only), so it points at the sample project.
  codeRepos: [
    {
      // GitHub owner of the code repository.
      owner: 'RayanYousef',
      // GitHub repository name.
      repo: 'CloudDocumentationPersonal',
      // Branch that Latest docs pin to; publishVersion resolves it to a commit sha for frozen versions.
      defaultRef: 'main',
      // Human-readable name shown in the editor (insert-from-repo, new page dialog).
      label: 'Skyforge (sample Unity project)',
      // Sub-folder proposed as the default `resource` for new pages; see the note above.
      pathPrefix: 'examples/unity-project',
    },
  ],
};

export default platformConfig;
