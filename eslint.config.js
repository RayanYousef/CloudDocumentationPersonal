import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';

const platformPackages = ['contracts', 'okf-core', 'viewers', 'auth', 'content'];

export default tseslint.config(
  {
    ignores: [
      '**/dist/**', '**/build/**', '**/node_modules/**', '**/.docusaurus/**',
      'site/static/platform/**', 'scripts/lint-fixtures/**', 'okf-example/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'contracts', pattern: 'packages/contracts/**' },
        { type: 'okf-core', pattern: 'packages/okf-core/**' },
        { type: 'viewers', pattern: 'packages/viewers/**' },
        { type: 'auth', pattern: 'services/auth/**' },
        { type: 'content', pattern: 'services/content/**' },
        { type: 'editor-composition', pattern: 'services/editor/src/composition/**', mode: 'full' },
        { type: 'editor', pattern: 'services/editor/**' },
        { type: 'site-composition', pattern: 'site/src/platform/**', mode: 'full' },
        // Build-time Node scripts (prebuild artifacts) may use okf-core and content like the root scripts do.
        { type: 'site-scripts', pattern: 'site/scripts/**', mode: 'full' },
        { type: 'site', pattern: 'site/**' },
        // platform.config.js is the one root file the site (and its composition root) may read (spec 4.7).
        { type: 'platform-config', pattern: 'platform.config.js', mode: 'full' },
        { type: 'root', pattern: ['scripts/**', 'eslint.config.js', 'vitest.workspace.ts'], mode: 'full' },
      ],
      'boundaries/ignore': ['**/*.test.*', '**/e2e/**'],
      'import/resolver': { typescript: { project: ['./tsconfig.base.json', './*/*/tsconfig.json'] } },
    },
    rules: {
      // Rule 1: relative imports may not cross element boundaries.
      'boundaries/element-types': ['error', {
        default: 'disallow',
        rules: [
          { from: ['contracts'], allow: ['contracts', 'okf-core'] },
          { from: ['okf-core'], allow: ['okf-core'] },
          { from: ['viewers'], allow: ['viewers'] },
          { from: ['auth'], allow: ['auth', 'contracts', 'okf-core'] },
          { from: ['content'], allow: ['content', 'contracts', 'okf-core'] },
          { from: ['editor'], allow: ['editor', 'editor-composition', 'contracts', 'okf-core', 'viewers'] },
          { from: ['editor-composition'], allow: ['editor', 'editor-composition', 'contracts', 'okf-core', 'viewers', 'auth', 'content'] },
          { from: ['site'], allow: ['site', 'site-composition', 'contracts', 'viewers', 'platform-config'] },
          { from: ['site-composition'], allow: ['site', 'site-composition', 'contracts', 'okf-core', 'viewers', 'auth', 'content', 'platform-config'] },
          { from: ['site-scripts'], allow: ['site-scripts', 'contracts', 'okf-core', 'content', 'platform-config'] },
          { from: ['root'], allow: ['root', 'platform-config', 'contracts', 'okf-core', 'content'] },
        ],
      }],
      // Rule 2: package-name imports (@platform/*) follow the same table.
      'boundaries/external': ['error', {
        default: 'allow',
        rules: [
          { from: ['contracts'], disallow: platformPackages.filter((p) => !['contracts', 'okf-core'].includes(p)).map((p) => `@platform/${p}`) },
          { from: ['okf-core'], disallow: platformPackages.filter((p) => p !== 'okf-core').map((p) => `@platform/${p}`) },
          { from: ['viewers'], disallow: platformPackages.filter((p) => p !== 'viewers').map((p) => `@platform/${p}`) },
          { from: ['auth'], disallow: ['@platform/content', '@platform/viewers', '@platform/editor', '@platform/site'] },
          { from: ['content'], disallow: ['@platform/auth', '@platform/viewers', '@platform/editor', '@platform/site'] },
          { from: ['editor'], disallow: ['@platform/auth', '@platform/content', '@platform/site'] },
          { from: ['site'], disallow: ['@platform/auth', '@platform/content', '@platform/editor'] },
        ],
      }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
