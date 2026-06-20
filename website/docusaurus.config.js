// @ts-check
import { themes as prismThemes } from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Unity Cloud Build Docs',
  tagline: 'Comprehensive guides for Unity cloud build pipelines',
  favicon: 'img/joy.png',

  url: 'https://RayanYousef.github.io',
  baseUrl: '/CloudDocumentationPersonal/',

  organizationName: 'RayanYousef',
  projectName: 'CloudDocumentationPersonal',

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

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: '/', // Serve docs at the site root
          editUrl: 'https://github.com/RayanYousef/CloudDocumentationPersonal/edit/main/website/',
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
      image: 'img/docusaurus-social-card.jpg',
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Unity Cloud Build',
        logo: {
          alt: 'Joy Logo',
          src: 'img/joy.png',
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
          // GitHub link removed as requested
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
                label: 'Features',
                to: '/features',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: '3D Models',
                to: '/models/',
              },
              {
                label: 'Edit in browser',
                to: '/guide/editing',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Unity Cloud Build Docs. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['csharp', 'yaml', 'bash', 'json'],
      },
    }),
};

export default config;
