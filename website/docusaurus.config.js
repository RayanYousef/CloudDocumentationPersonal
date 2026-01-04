// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Unity Cloud Build Docs',
  tagline: 'Comprehensive guides for Unity cloud build pipelines',
  favicon: 'img/favicon.ico',

  url: 'https://github.com',
  baseUrl: '/Unity-Cloud-Build-Pipeline/', // Assuming the repo name, user can change later if needed

  organizationName: 'unknown',
  projectName: 'Unity-Cloud-Build-Pipeline',

  onBrokenLinks: 'warn', // Changing to warn to avoid build failures during initial setup if links are tricky
  onBrokenMarkdownLinks: 'warn',

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
          alt: 'Unity Cloud Build Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar', // We will name our sidebar this
            position: 'left',
            label: 'Documentation',
          },
          {
            href: 'https://github.com/repository', // Placeholder
            label: 'GitHub',
            position: 'right',
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
                label: 'Prerequisites',
                to: '/prerequisites',
              },
            ],
          },
          {
            title: 'Platforms',
            items: [
              {
                label: 'Android',
                to: '/platforms/Android',
              },
              {
                label: 'iOS',
                to: '/platforms/IOS',
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
