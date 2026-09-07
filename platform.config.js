// Single source of truth for identity, enabled features, auth/content wiring and code repos.
// Read by site/docusaurus.config.js, services/editor (Vite), scripts/okf.mjs and CI.
// No secrets here: this file is bundled into the browser.

/** @type {import('@platform/contracts').PlatformConfig} */
const platformConfig = {
  siteUrl: 'https://RayanYousef.github.io',
  baseUrl: '/CloudDocumentationPersonal/',
  organizationName: 'RayanYousef',
  projectName: 'CloudDocumentationPersonal',
  deployBranch: 'main',
  sitePath: 'site',
  title: 'Skyforge Documentation',
  tagline: 'Documentation platform template for Unity projects',
  navbarTitle: 'Skyforge Docs',
  footerCopyright: `Copyright ${new Date().getFullYear()} Skyforge. Built with the Documentation Platform.`,
  features: { editor: true, viewers: true, search: true },
  auth: { provider: 'github-token' },
  content: { backend: 'github-browser' },
  codeRepos: [
    {
      owner: 'RayanYousef',
      repo: 'CloudDocumentationPersonal',
      defaultRef: 'main',
      label: 'Skyforge (sample Unity project)',
      pathPrefix: 'examples/unity-project',
    },
  ],
};

export default platformConfig;
