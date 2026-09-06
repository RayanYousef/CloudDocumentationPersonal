// @ts-check
import { themes as prismThemes } from 'prism-react-renderer';
import platform from '../platform.config.js';
import versions from './versions.json' with { type: 'json' };

const repoUrl = `https://github.com/${platform.organizationName}/${platform.projectName}`;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: platform.title,
  tagline: platform.tagline,
  favicon: 'img/favicon.png',
  url: platform.siteUrl,
  baseUrl: platform.baseUrl,
  organizationName: platform.organizationName,
  projectName: platform.projectName,
  onBrokenLinks: 'throw',
  markdown: { hooks: { onBrokenMarkdownLinks: 'warn' } },
  i18n: { defaultLocale: 'en', locales: ['en'] },

  plugins: platform.features.search
    ? [[
        '@orama/plugin-docusaurus-v3',
        {
          searchbox: {
            themeConfig: {
              colors: {
                light: { '--background-color-primary': '#F4EEDF', '--background-color-secondary': '#EFE7D2', '--background-color-accent': '#6357C9', '--button-background-color-primary': '#6357C9', '--text-color-primary': '#131B3F', '--text-color-secondary': '#55608A', '--border-color-accent': '#6357C9' },
                dark: { '--background-color-primary': '#131B3F', '--background-color-secondary': '#0C1230', '--background-color-accent': '#8F8AE8', '--button-background-color-primary': '#8F8AE8', '--text-color-primary': '#F4EEDF', '--text-color-secondary': '#9FB1E0', '--border-color-accent': '#8F8AE8' },
              },
            },
          },
        },
      ]]
    : [],

  presets: [[
    'classic',
    /** @type {import('@docusaurus/preset-classic').Options} */
    ({
      docs: {
        sidebarPath: './sidebars.js',
        routeBasePath: '/',
        editUrl: `${repoUrl}/edit/${platform.deployBranch}/${platform.sitePath}/`,
        // OKF reserved files that must not become pages, plus Docusaurus defaults.
        exclude: ['**/AGENTS.md', '**/README.md', '**/_*.{js,jsx,ts,tsx,md,mdx}', '**/_*/**', '**/*.test.{js,jsx,ts,tsx}', '**/__tests__/**'],
        lastVersion: 'current',
        versions: { current: { label: 'Latest' }, ...Object.fromEntries(versions.map((v) => [v, { label: v }])) },
      },
      blog: false,
      theme: { customCss: './src/css/custom.css' },
    }),
  ]],

  themeConfig: /** @type {import('@docusaurus/preset-classic').ThemeConfig} */ ({
    colorMode: { defaultMode: 'dark', disableSwitch: false, respectPrefersColorScheme: false },
    navbar: {
      title: platform.navbarTitle,
      logo: { alt: `${platform.navbarTitle} logo`, src: 'img/logo.png' },
      items: [
        { type: 'docsVersionDropdown', position: 'left', dropdownActiveClassDisabled: true },
        { type: 'docSidebar', sidebarId: 'docsSidebar', position: 'left', label: 'Documentation' },
        { to: '/log', label: 'Change Log', position: 'left' },
        ...(platform.features.editor ? [{ href: 'pathname:///editor/', label: 'Editor', position: 'right', target: '_self' }] : []),
        { href: repoUrl, position: 'right', className: 'header-github-link', 'aria-label': 'GitHub repository' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        { title: 'Docs', items: [{ label: 'Home', to: '/' }, { label: 'Change Log', to: '/log' }] },
        { title: 'More', items: [
          ...(platform.features.editor ? [{ label: 'Editor', href: 'pathname:///editor/', target: '_self' }] : []),
          { label: 'GitHub Repository', href: repoUrl },
        ] },
      ],
      copyright: platform.footerCopyright,
    },
    prism: { theme: prismThemes.github, darkTheme: prismThemes.dracula, additionalLanguages: ['csharp', 'yaml', 'bash', 'json'] },
  }),
};

export default config;
