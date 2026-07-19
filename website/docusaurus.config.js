// @ts-check
import { themes as prismThemes } from 'prism-react-renderer';
// Project identity (name, URL, repo, deploy branch) lives in ONE place.
// Edit website/site.config.js — never hardcode those values here. See SETUP.md.
import siteConfig from './site.config.js';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: siteConfig.title,
  tagline: siteConfig.tagline,
  favicon: 'img/favicon.png',

  url: siteConfig.siteUrl,
  baseUrl: siteConfig.baseUrl,

  organizationName: siteConfig.organizationName,
  projectName: siteConfig.projectName,

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // ---------------------------------------------------------------------------
  // Orama local search — build-time, self-hosted, no external service needed.
  // @orama/plugin-docusaurus-v3 generates a gzipped index (*.json.gz) during
  // `npm run build` and injects a search UI component automatically.
  // Works on GitHub Pages as pure static files; no Algolia account required.
  // ---------------------------------------------------------------------------
  plugins: [
    [
      '@orama/plugin-docusaurus-v3',
      {
        searchbox: {
          themeConfig: {
            colors: {
              light: {
                '--background-color-primary':        '#F4EEDF',
                '--background-color-secondary':      '#EFE7D2',
                '--background-color-accent':         '#6357C9',
                '--button-background-color-primary': '#6357C9',
                '--text-color-primary':              '#131B3F',
                '--text-color-secondary':            '#55608A',
                '--border-color-accent':             '#6357C9',
              },
              dark: {
                '--background-color-primary':        '#131B3F',
                '--background-color-secondary':      '#0C1230',
                '--background-color-accent':         '#8F8AE8',
                '--button-background-color-primary': '#8F8AE8',
                '--text-color-primary':              '#F4EEDF',
                '--text-color-secondary':            '#9FB1E0',
                '--border-color-accent':             '#8F8AE8',
              },
            },
          },
        },
      },
    ],
    // OKF knowledge-graph data: scans website/docs/ at build time and exposes
    // {global, folders} graph data via usePluginData('okf-graph').
    './plugins/okf-graph',
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: '/', // Serve docs at the site root
          editUrl: `https://github.com/${siteConfig.organizationName}/${siteConfig.projectName}/edit/${siteConfig.deployBranch}/website/`,
          // The editable working docs (docs/ = "current") are the DEFAULT version
          // served at the root, so in-browser CMS edits (which write to docs/)
          // appear on the live site immediately. 1.0.0 is a frozen released
          // snapshot, available from the version dropdown at /1.0.0/.
          lastVersion: 'current',
          versions: {
            current: { label: 'Latest' },
            '1.0.0': { label: '1.0.0' },
          },
        },
        blog: false, // Disable blog
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // No social-card image: add your own to static/img/ and set `image` here.
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: false,
        respectPrefersColorScheme: false,
      },
      navbar: {
        title: 'Documentation',
        logo: {
          alt: 'Documentation logo',
          src: 'img/logo.png',
        },
        items: [
          {
            type: 'docsVersionDropdown',
            position: 'left',
            dropdownActiveClassDisabled: true,
          },
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar',
            position: 'left',
            label: 'Documentation',
          },
          {
            to: '/viz',
            label: 'Viz',
            position: 'left',
          },
          {
            href: `https://github.com/${siteConfig.organizationName}/${siteConfig.projectName}`,
            position: 'right',
            className: 'header-github-link',
            'aria-label': 'GitHub repository',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Introduction',
                to: '/',
              },
              {
                label: 'Examples',
                to: '/examples/markdown-basics',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: '3D Model Viewer',
                to: '/examples/3d-model-viewer',
              },
              {
                label: 'Editing',
                to: '/guide/editing',
              },
              {
                label: 'GitHub Repository',
                href: `https://github.com/${siteConfig.organizationName}/${siteConfig.projectName}`,
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Documentation. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['csharp', 'yaml', 'bash', 'json'],
      },
    }),
};

export default config;
