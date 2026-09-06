# Documentation Platform (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single Docusaurus site into a contract-driven monorepo (contracts, okf-core, auth, content, editor, site) with an OKF Core index layer, a standalone in-browser editor that commits validated multi-file changes, 3D viewers that fetch models from a code repo at a pinned ref, CI validation, GitHub Pages deployment, and an agent skill.

**Architecture:** npm-workspaces monorepo. `packages/contracts` holds TS interfaces + contract test suites; `packages/okf-core` is a zero-dependency generator/validator over an in-memory file map; `services/auth` and `services/content` implement the contracts (`GithubTokenProvider`, `LocalFolderBackend`, `GithubBrowserBackend`); `services/editor` is a Vite React app wired only through contracts; `site/` is Docusaurus. ESLint boundaries forbid cross-service imports; composition roots are the only exception.

**Tech Stack:** Node 22 (engines >= 20), npm workspaces, TypeScript 5 strict, Vitest 3, ESLint 9 flat config + eslint-plugin-boundaries, Docusaurus 3.10.1, React 19, Vite 6, @mdxeditor/editor 4, yaml 2, @orama/orama 3, three 0.183, @google/model-viewer 4, Playwright 1.5x, peaceiris/actions-gh-pages v4.

**Spec:** `docs/design/2026-09-06-documentation-platform-design.md` (read it first; every task below cites its sections).

## Global Constraints

- Branch: all work on `feat/documentation-platform` (already created with the spec and this plan). Never commit to `main`.
- Every commit message ends with the trailer line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Node `>= 20` (`engines`), CI uses Node 22. Workspace package names: `@platform/contracts`, `@platform/okf-core`, `@platform/viewers`, `@platform/auth`, `@platform/content`, `@platform/editor`, `@platform/site`.
- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`, ESM (`"type": "module"`) in every package/service; compiled with `tsc -b` to `dist/`.
- `packages/okf-core` has ZERO runtime dependencies (`dependencies` must stay `{}`); Node-only code is under `src/node/` and exported from the `./node` subpath.
- Cross-service imports are forbidden except in `services/editor/src/composition/**` and `site/src/platform/**` (spec 3.1).
- OKF format rules come from `C:\Users\Ray\.agents\skills\ray-okf-core\references\spec-profile.md` and MUST NOT be modified.
- Generated files (`index.md` blocks, `manifest.json`, `log.md` entries, `code-maps/*.md`) are never hand-edited; run `npm run okf:generate` instead.
- Site identity: `siteUrl` `https://RayanYousef.github.io`, `baseUrl` `/CloudDocumentationPersonal/`, `organizationName` `RayanYousef`, `projectName` `CloudDocumentationPersonal`, `deployBranch` `main`.
- Sample code repo declaration: `{ owner: 'RayanYousef', repo: 'CloudDocumentationPersonal', defaultRef: 'main', label: 'Skyforge (sample Unity project)', pathPrefix: 'examples/unity-project' }`.
- Untracked `okf-example/` is demo material: move its content in Task 7, delete the folder only in Task 17.
- Shell: the executor runs on Windows; commands are shown in POSIX form for Git Bash. Use forward slashes everywhere.
- Test runner everywhere: Vitest (`npx vitest run` inside a workspace, `npm test` at the root).

---

## File structure (whole Phase 1)

```
package.json                         workspaces + root scripts
platform.config.js                   PlatformConfig (ESM default export, JSDoc-typed)
tsconfig.base.json                   shared strict compiler options
eslint.config.js                     boundaries rule (spec 3.1)
vitest.workspace.ts                  runs every workspace's tests
scripts/okf.mjs                      generate/check over all versions using platform.config.js
scripts/lint-boundaries.test.ts      proves the boundary rule fires
packages/contracts/src/{auth,content,platform-config,components-manifest,index}.ts
packages/contracts/src/testing/{contentBackendContract,authProviderContract}.ts
packages/contracts/src/testing/fixtures/miniBundle.ts
packages/okf-core/src/{frontmatter,model,validate,index-block,manifest,log,codemap,rewrite,generate,index}.ts
packages/okf-core/src/node/{fs,cli}.ts   bin/okf.js
packages/okf-core/test/**             fixtures + unit tests
packages/viewers/src/{ModelViewerCore,FbxViewerCore,index}.tsx
services/auth/src/{GithubTokenProvider,MockAuthProvider,index}.ts
services/content/src/{layout,writePipeline,local/LocalFolderBackend,github/{GithubBrowserBackend,gitData,FakeGitHub},http/{HttpContentBackend,serveContentBackend},search/{buildSearchIndex,OramaSearch},assets/getAsset,index}.ts
services/editor/{index.html,vite.config.ts,playwright.config.ts,src/**,e2e/editor.spec.ts}
site/{docusaurus.config.js,sidebars.js,components.json,scripts/build-platform-artifacts.mjs,src/components/{ModelViewer,FbxViewer}/index.tsx,src/platform/{createContentBackend.ts,useAssetUrl.ts},src/theme/MDXComponents.js,docs/**,versioned_docs/version-1.0.0/**}
examples/unity-project/**            sample code repo (OKF code-project variant)
.agents/skills/docs-platform/{SKILL.md,references/{registry.md,navigation.md,authoring.md}}
.github/workflows/{okf-validate.yml,deploy-pages.yml}
```

---

### Task 1: Monorepo scaffold and import boundaries

**Files:**
- Create: `package.json` (root), `tsconfig.base.json`, `eslint.config.js`, `vitest.workspace.ts`, `platform.config.js`, `scripts/lint-boundaries.test.ts`, `scripts/lint-fixtures/services/auth/src/bad.ts`, `scripts/lint-fixtures/services/auth/src/good.ts`
- Modify: `.gitignore`
- Delete: `scripts/build-site.ps1`, `scripts/start-site.ps1`

**Interfaces:**
- Produces: root scripts `npm run build`, `npm test`, `npm run lint`, `npm run okf:generate`, `npm run okf:check` (okf scripts wired in Task 5); `platform.config.js` default export of type `PlatformConfig` (typed in Task 2); path alias convention `@platform/<name>` resolved by npm workspaces.

- [ ] **Step 1: Create the root `package.json`**

```json
{
  "name": "documentation-platform",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20.0" },
  "workspaces": [
    "packages/*",
    "services/*",
    "site"
  ],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "vitest run",
    "lint": "eslint .",
    "typecheck": "tsc -b packages/contracts packages/okf-core packages/viewers services/auth services/content services/editor",
    "okf:generate": "node scripts/okf.mjs generate",
    "okf:check": "node scripts/okf.mjs check",
    "site:build": "npm run build -w @platform/editor && npm run build -w @platform/site && node scripts/copy-editor.mjs",
    "site:start": "npm run start -w @platform/site"
  },
  "devDependencies": {
    "@eslint/js": "^9.17.0",
    "@types/node": "^22.10.0",
    "eslint": "^9.17.0",
    "eslint-plugin-boundaries": "^5.0.1",
    "eslint-import-resolver-typescript": "^3.7.0",
    "typescript": "^5.7.2",
    "typescript-eslint": "^8.18.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "jsx": "react-jsx"
  }
}
```

- [ ] **Step 3: Create `platform.config.js`**

```js
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
```

- [ ] **Step 4: Create `eslint.config.js` with the boundary rule**

```js
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
        { type: 'site', pattern: 'site/**' },
        { type: 'root', pattern: ['scripts/**', 'platform.config.js', 'eslint.config.js', 'vitest.workspace.ts'], mode: 'full' },
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
          { from: ['site'], allow: ['site', 'site-composition', 'contracts', 'viewers'] },
          { from: ['site-composition'], allow: ['site', 'site-composition', 'contracts', 'okf-core', 'viewers', 'auth', 'content'] },
          { from: ['root'], allow: ['root', 'contracts', 'okf-core', 'content'] },
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
```

- [ ] **Step 5: Create `vitest.workspace.ts`**

```ts
export default [
  'packages/*/vitest.config.ts',
  'services/*/vitest.config.ts',
  'scripts/vitest.config.ts',
];
```

Create `scripts/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { name: 'root-scripts', include: ['scripts/**/*.test.ts'], root: '..' } });
```

- [ ] **Step 6: Write the failing boundary test**

`scripts/lint-fixtures/services/auth/src/bad.ts`:

```ts
// Fixture: a service importing another service. Must be a lint error.
import { LocalFolderBackend } from '@platform/content';
export const x = LocalFolderBackend;
```

`scripts/lint-fixtures/services/auth/src/good.ts`:

```ts
// Fixture: a service importing only contracts. Must pass.
import type { AuthProvider } from '@platform/contracts';
export const y: AuthProvider | null = null;
```

`scripts/lint-boundaries.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

async function lint(file: string) {
  // The fixture tree mirrors the real layout so the element patterns match;
  // cwd is set to the fixture root, and the real config is loaded explicitly.
  const eslint = new ESLint({
    cwd: path.join(root, 'scripts/lint-fixtures'),
    overrideConfigFile: path.join(root, 'eslint.config.js'),
    overrideConfig: [{ ignores: [] }],
  });
  const [result] = await eslint.lintFiles([file]);
  return result?.messages.map((m) => m.ruleId ?? '') ?? [];
}

describe('import boundaries', () => {
  it('rejects a service importing another service', async () => {
    const rules = await lint('services/auth/src/bad.ts');
    expect(rules).toContain('boundaries/external');
  });
  it('accepts a service importing contracts', async () => {
    const rules = await lint('services/auth/src/good.ts');
    expect(rules.filter((r) => r.startsWith('boundaries/'))).toEqual([]);
  });
});
```

- [ ] **Step 7: Install and run the test to see it fail**

Run: `npm install && npx vitest run scripts/lint-boundaries.test.ts`
Expected: FAIL (the `@platform/contracts` and `@platform/content` packages do not exist yet, so resolution errors or missing `boundaries/external` in messages). If `npm install` fails because `site/` is a workspace without a matching name, temporarily set `"name": "@platform/site"` in `website/package.json` is NOT done here; instead exclude `site` from `workspaces` until Task 6 (set `"workspaces": ["packages/*", "services/*"]` now and add `"site"` in Task 6).

- [ ] **Step 8: Make the test pass with stub workspaces**

Create minimal `packages/contracts/package.json` and `services/content/package.json` so the imports resolve (Task 2 and Task 9 fill them in):

```json
{ "name": "@platform/contracts", "version": "0.1.0", "private": true, "type": "module", "main": "./dist/index.js", "types": "./dist/index.d.ts" }
```

```json
{ "name": "@platform/content", "version": "0.1.0", "private": true, "type": "module", "main": "./dist/index.js", "types": "./dist/index.d.ts" }
```

Run: `npm install && npx vitest run scripts/lint-boundaries.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Update `.gitignore`, delete the PowerShell scripts, commit**

Append to `.gitignore`:

```
node_modules/
dist/
build/
.docusaurus/
site/static/platform/
services/editor/test-results/
services/editor/playwright-report/
```

```bash
git rm scripts/build-site.ps1 scripts/start-site.ps1
git add package.json package-lock.json tsconfig.base.json eslint.config.js vitest.workspace.ts platform.config.js scripts .gitignore packages/contracts/package.json services/content/package.json
git commit -m "chore: scaffold npm-workspaces monorepo with import boundary lint

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Contracts package

**Files:**
- Create: `packages/contracts/package.json`, `packages/contracts/tsconfig.json`, `packages/contracts/vitest.config.ts`, `packages/contracts/src/index.ts`, `packages/contracts/src/auth.ts`, `packages/contracts/src/content.ts`, `packages/contracts/src/platform-config.ts`, `packages/contracts/src/components-manifest.ts`, `packages/contracts/src/testing/index.ts`, `packages/contracts/src/testing/fixtures/miniBundle.ts`, `packages/contracts/src/testing/authProviderContract.ts`, `packages/contracts/src/testing/contentBackendContract.ts`, `packages/contracts/src/errors.test.ts`

**Interfaces:**
- Produces (used by every later task, verbatim):

```ts
// auth.ts
export type Role = 'viewer' | 'editor';
export interface Identity { name: string; login: string; email: string | null; role: Role }
export interface Session { provider: string; token: string; createdAt: string }
export interface GithubTokenCredentials { kind: 'github-token'; token: string }
export interface MockCredentials { kind: 'mock'; name: string; role: Role }
export type Credentials = GithubTokenCredentials | MockCredentials;
export type AuthErrorCode = 'INVALID_CREDENTIALS' | 'NOT_COLLABORATOR' | 'UNSUPPORTED_CREDENTIALS' | 'NETWORK';
export class AuthError extends Error { constructor(public readonly code: AuthErrorCode, message: string) }
export interface AuthProvider { readonly id: string; login(credentials: Credentials): Promise<Session>; verify(session: Session): Promise<Identity> }

// content.ts
export type VersionId = string;                       // 'current' = Latest
export const CURRENT_VERSION = 'current';
export interface VersionInfo { id: VersionId; label: string; frozen: boolean }
export interface Author { name: string; email: string }
export interface PageSummary { path: string; title: string; description: string; type: string; tags: string[] }
export interface PageContent { path: string; text: string; etag: string }
export interface MutationOptions { message: string; author: Author }
export interface WriteOptions extends MutationOptions { expectedEtag?: string }
export interface WriteResult { commitSha: string; commitUrl: string | null; etag: string; regenerated: string[] }
export interface AssetRef { repo: string; ref: string; path: string }   // repo = 'owner/name'
export interface AssetInfo { path: string; url: string; size: number; kind: 'model' | 'image' | 'other' }
export interface SearchHit { path: string; title: string; description: string; score: number }
export interface PublishResult { version: string; tag: string; commitSha: string; pins: Record<string, string> }
export type ContentErrorCode = 'NOT_FOUND' | 'EXISTS' | 'CONFLICT' | 'FROZEN' | 'VALIDATION' | 'FORBIDDEN' | 'TOO_LARGE' | 'NETWORK';
export class ContentError extends Error { constructor(public readonly code: ContentErrorCode, message: string, public readonly details?: unknown) }
export interface ContentBackend {
  readonly id: string;
  listVersions(): Promise<VersionInfo[]>;
  listPages(version: VersionId): Promise<PageSummary[]>;
  readPage(version: VersionId, path: string): Promise<PageContent>;
  writePage(version: VersionId, path: string, text: string, opts: WriteOptions): Promise<WriteResult>;
  createPage(version: VersionId, path: string, text: string, opts: MutationOptions): Promise<WriteResult>;
  deletePage(version: VersionId, path: string, opts: MutationOptions): Promise<WriteResult>;
  renamePage(version: VersionId, from: string, to: string, opts: MutationOptions): Promise<WriteResult>;
  uploadAsset(path: string, bytes: Uint8Array, opts: MutationOptions): Promise<WriteResult & { asset: AssetInfo }>;
  listAssets(): Promise<AssetInfo[]>;
  search(version: VersionId, query: string): Promise<SearchHit[]>;
  publishVersion(version: string, opts: MutationOptions): Promise<PublishResult>;
  getAsset(ref: AssetRef): Promise<Blob>;
}

// platform-config.ts
export interface CodeRepoRef { owner: string; repo: string; defaultRef: string; label: string; pathPrefix?: string }
export interface PlatformConfig { siteUrl; baseUrl; organizationName; projectName; deployBranch; sitePath; title; tagline; navbarTitle; footerCopyright; features: {editor: boolean; viewers: boolean; search: boolean}; auth: {provider: 'github-token' | 'mock'}; content: {backend: 'github-browser' | 'http'; url?: string}; codeRepos: CodeRepoRef[] }

// components-manifest.ts
export interface ComponentProp { name: string; type: 'string' | 'number' | 'boolean' }
export interface ComponentDescriptor { name: string; kind: 'flow'; hasChildren: boolean; preview: 'model-viewer' | 'fbx-viewer' | 'tabs' | 'tab-item' | 'generic'; props: ComponentProp[] }
export interface ComponentsManifest { components: ComponentDescriptor[] }

// testing
export function describeAuthProviderContract(name: string, factory: () => Promise<AuthProviderHarness>): void
export interface AuthProviderHarness { provider: AuthProvider; validCredentials: Credentials; invalidCredentials: Credentials; nonCollaboratorCredentials?: Credentials; cleanup?: () => Promise<void> }
export function describeContentBackendContract(name: string, factory: () => Promise<ContentBackendHarness>): void
export interface ContentBackendHarness { backend: ContentBackend; readFile(relPath: string): Promise<string | null>; listTags(): Promise<string[]>; cleanup?: () => Promise<void> }
export const MINI_BUNDLE: Record<string, string>   // bundle-relative path -> text
export const MINI_CODE_REPOS: CodeRepoRef[]
```

- [ ] **Step 1: Package files**

`packages/contracts/package.json`:

```json
{
  "name": "@platform/contracts",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./testing": { "types": "./dist/testing/index.d.ts", "default": "./dist/testing/index.js" }
  },
  "scripts": { "build": "tsc -b", "test": "vitest run" },
  "peerDependencies": { "vitest": "^3.0.0" },
  "devDependencies": { "typescript": "^5.7.2", "vitest": "^3.0.0" }
}
```

`packages/contracts/tsconfig.json`:

```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "rootDir": "src", "outDir": "dist", "types": ["node"] }, "include": ["src"], "exclude": ["src/**/*.test.ts"] }
```

`packages/contracts/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { name: 'contracts', include: ['src/**/*.test.ts'] } });
```

- [ ] **Step 2: Write the failing error-class test**

`packages/contracts/src/errors.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { AuthError, ContentError } from './index.js';

describe('error classes', () => {
  it('AuthError carries a code and is an Error', () => {
    const e = new AuthError('NOT_COLLABORATOR', 'You are not a write collaborator of o/r');
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('NOT_COLLABORATOR');
    expect(e.name).toBe('AuthError');
  });
  it('ContentError carries code and details', () => {
    const e = new ContentError('VALIDATION', 'invalid page', [{ file: 'a.md', rule: 'frontmatter', message: 'missing "type"' }]);
    expect(e.code).toBe('VALIDATION');
    expect(Array.isArray(e.details)).toBe(true);
  });
});
```

Run: `cd packages/contracts && npx vitest run`
Expected: FAIL ("Cannot find module './index.js'").

- [ ] **Step 3: Write `auth.ts`**

```ts
export type Role = 'viewer' | 'editor';

export interface Identity {
  name: string;
  login: string;
  email: string | null;
  role: Role;
}

export interface Session {
  provider: string;
  token: string;
  createdAt: string; // ISO 8601
}

export interface GithubTokenCredentials { kind: 'github-token'; token: string }
export interface MockCredentials { kind: 'mock'; name: string; role: Role }
export type Credentials = GithubTokenCredentials | MockCredentials;

export type AuthErrorCode = 'INVALID_CREDENTIALS' | 'NOT_COLLABORATOR' | 'UNSUPPORTED_CREDENTIALS' | 'NETWORK';

export class AuthError extends Error {
  override readonly name = 'AuthError';
  constructor(public readonly code: AuthErrorCode, message: string) {
    super(message);
  }
}

/** Every authentication mechanism implements this and passes describeAuthProviderContract. */
export interface AuthProvider {
  readonly id: string;
  login(credentials: Credentials): Promise<Session>;
  verify(session: Session): Promise<Identity>;
}
```

- [ ] **Step 4: Write `content.ts`**

```ts
export type VersionId = string;
export const CURRENT_VERSION: VersionId = 'current';

export interface VersionInfo { id: VersionId; label: string; frozen: boolean }
export interface Author { name: string; email: string }
export interface PageSummary { path: string; title: string; description: string; type: string; tags: string[] }
export interface PageContent { path: string; text: string; etag: string }
export interface MutationOptions { message: string; author: Author }
export interface WriteOptions extends MutationOptions { expectedEtag?: string }
export interface WriteResult { commitSha: string; commitUrl: string | null; etag: string; regenerated: string[] }
export interface AssetRef { repo: string; ref: string; path: string }
export interface AssetInfo { path: string; url: string; size: number; kind: 'model' | 'image' | 'other' }
export interface SearchHit { path: string; title: string; description: string; score: number }
export interface PublishResult { version: string; tag: string; commitSha: string; pins: Record<string, string> }

export type ContentErrorCode =
  | 'NOT_FOUND' | 'EXISTS' | 'CONFLICT' | 'FROZEN' | 'VALIDATION' | 'FORBIDDEN' | 'TOO_LARGE' | 'NETWORK';

export class ContentError extends Error {
  override readonly name = 'ContentError';
  constructor(public readonly code: ContentErrorCode, message: string, public readonly details?: unknown) {
    super(message);
  }
}

/**
 * Every content storage implements this and passes describeContentBackendContract.
 * Paths are bundle-relative POSIX paths ("systems/inventory.md"). Asset paths are
 * relative to the site's static folder ("models/airship.glb").
 */
export interface ContentBackend {
  readonly id: string;
  listVersions(): Promise<VersionInfo[]>;
  listPages(version: VersionId): Promise<PageSummary[]>;
  readPage(version: VersionId, path: string): Promise<PageContent>;
  writePage(version: VersionId, path: string, text: string, opts: WriteOptions): Promise<WriteResult>;
  createPage(version: VersionId, path: string, text: string, opts: MutationOptions): Promise<WriteResult>;
  deletePage(version: VersionId, path: string, opts: MutationOptions): Promise<WriteResult>;
  renamePage(version: VersionId, from: string, to: string, opts: MutationOptions): Promise<WriteResult>;
  uploadAsset(path: string, bytes: Uint8Array, opts: MutationOptions): Promise<WriteResult & { asset: AssetInfo }>;
  listAssets(): Promise<AssetInfo[]>;
  search(version: VersionId, query: string): Promise<SearchHit[]>;
  publishVersion(version: string, opts: MutationOptions): Promise<PublishResult>;
  getAsset(ref: AssetRef): Promise<Blob>;
}
```

- [ ] **Step 5: Write `platform-config.ts`, `components-manifest.ts`, `index.ts`**

`platform-config.ts`:

```ts
export interface CodeRepoRef {
  owner: string;
  repo: string;
  defaultRef: string;
  label: string;
  /** Sub-folder of the repo that holds the project (when several projects share one repo). */
  pathPrefix?: string;
}

export interface PlatformConfig {
  siteUrl: string;
  baseUrl: string;
  organizationName: string;
  projectName: string;
  deployBranch: string;
  sitePath: string;
  title: string;
  tagline: string;
  navbarTitle: string;
  footerCopyright: string;
  features: { editor: boolean; viewers: boolean; search: boolean };
  auth: { provider: 'github-token' | 'mock' };
  content: { backend: 'github-browser' | 'http'; url?: string };
  codeRepos: CodeRepoRef[];
}

export const repoKey = (r: Pick<CodeRepoRef, 'owner' | 'repo'>): string => `${r.owner}/${r.repo}`;
```

`components-manifest.ts`:

```ts
export interface ComponentProp { name: string; type: 'string' | 'number' | 'boolean' }
export interface ComponentDescriptor {
  name: string;
  kind: 'flow';
  hasChildren: boolean;
  preview: 'model-viewer' | 'fbx-viewer' | 'tabs' | 'tab-item' | 'generic';
  props: ComponentProp[];
}
export interface ComponentsManifest { components: ComponentDescriptor[] }
```

`index.ts`:

```ts
export * from './auth.js';
export * from './content.js';
export * from './platform-config.js';
export * from './components-manifest.js';
```

Run: `npx vitest run` (in `packages/contracts`)
Expected: PASS (2 tests).

- [ ] **Step 6: Write the shared fixture `testing/fixtures/miniBundle.ts`**

```ts
import type { CodeRepoRef } from '../../platform-config.js';

export const MINI_CODE_REPOS: CodeRepoRef[] = [
  { owner: 'acme', repo: 'game', defaultRef: 'main', label: 'Game', pathPrefix: '' },
];

const blob = (p: string) => `https://github.com/acme/game/blob/main/${p}`;

/** A complete, valid OKF Core bundle: root index, one folder, two pages, log, AGENTS.md. */
export const MINI_BUNDLE: Record<string, string> = {
  'index.md': `---
title: Mini Docs
sidebar_position: 1
okf_version: "0.2"
---

A tiny bundle used by tests. It documents one gameplay system and one guide.

<!-- okf:index -->
## Pages
* [Getting Started](getting-started.md) - Read this first to build and run the game locally.

## Folders
* [Systems](systems/) - Runtime systems of the game.
<!-- /okf:index -->
`,
  'getting-started.md': `---
title: Getting Started
description: Read this first to build and run the game locally.
type: guide
tags: [onboarding]
resource: ${blob('README.md')}
sidebar_position: 1
---

Clone the repo, open it in Unity, press Play. See [Inventory](systems/inventory.md).
`,
  'systems/index.md': `---
title: Systems
sidebar_position: 2
---

Runtime systems of the game.

<!-- okf:index -->
## Pages
* [Inventory](inventory.md) - Explains how items are stored and which service API changes a player's inventory.
<!-- /okf:index -->
`,
  'systems/inventory.md': `---
title: Inventory
description: Explains how items are stored and which service API changes a player's inventory.
type: system
tags: [inventory, gameplay]
resource: ${blob('Assets/Scripts/Inventory')}
sources:
  - resource: ${blob('Assets/Scripts/Inventory/InventoryService.cs')}
sidebar_position: 1
---

All mutations go through InventoryService.
`,
  'log.md': `---
title: Change Log
sidebar_position: 99
---

Newest first.

## 2026-08-01

* **Add**: [Inventory](/systems/inventory.md) - initial page. (by Test Author)
`,
  'AGENTS.md': `# How to navigate this bundle (for agents)

Start at index.md. Index blocks, manifest.json and code-maps/ are generated; never edit them.
`,
  'manifest.json': `[
  {
    "route": "/getting-started",
    "file": "getting-started.md",
    "title": "Getting Started",
    "description": "Read this first to build and run the game locally.",
    "type": "guide",
    "tags": [
      "onboarding"
    ],
    "resource": "${blob('README.md')}",
    "sources": []
  },
  {
    "route": "/systems/inventory",
    "file": "systems/inventory.md",
    "title": "Inventory",
    "description": "Explains how items are stored and which service API changes a player's inventory.",
    "type": "system",
    "tags": [
      "inventory",
      "gameplay"
    ],
    "resource": "${blob('Assets/Scripts/Inventory')}",
    "sources": [
      "${blob('Assets/Scripts/Inventory/InventoryService.cs')}"
    ]
  }
]
`,
  'code-maps/acme--game.md': `---
title: "Code map: acme/game"
sidebar_position: 98
---

<!-- okf:codemap -->
# Code map: acme/game

Generated from manifest.json. Each code path lists the pages that describe it; (source) marks a sources citation.

* \`Assets/Scripts/Inventory\` - [Inventory](/systems/inventory.md)
* \`Assets/Scripts/Inventory/InventoryService.cs\` - [Inventory](/systems/inventory.md) (source)
* \`README.md\` - [Getting Started](/getting-started.md)
<!-- /okf:codemap -->
`,
};

/** A valid new page for the mini bundle (used by write/create tests). */
export const NEW_PAGE_TEXT = `---
title: Combat
description: Describes the damage pipeline used whenever anything takes damage.
type: system
tags: [combat]
resource: ${blob('Assets/Scripts/Combat')}
sidebar_position: 2
---

Every hit becomes a DamageEvent.
`;

/** Missing "type" and "description": must be rejected with VALIDATION. */
export const INVALID_PAGE_TEXT = `---
title: Broken
resource: ${blob('Assets/Scripts/Broken')}
---

Body.
`;
```

- [ ] **Step 7: Write `testing/authProviderContract.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { AuthProvider, Credentials, Session } from '../auth.js';
import { AuthError } from '../auth.js';

export interface AuthProviderHarness {
  provider: AuthProvider;
  validCredentials: Credentials;
  invalidCredentials: Credentials;
  /** Credentials that authenticate but lack write access (omit when the provider cannot express it). */
  nonCollaboratorCredentials?: Credentials;
  cleanup?: () => Promise<void>;
}

export function describeAuthProviderContract(name: string, factory: () => Promise<AuthProviderHarness>): void {
  describe(`AuthProvider contract: ${name}`, () => {
    let h: AuthProviderHarness;
    beforeAll(async () => { h = await factory(); });
    afterAll(async () => { await h.cleanup?.(); });

    it('has a stable id', () => {
      expect(typeof h.provider.id).toBe('string');
      expect(h.provider.id.length).toBeGreaterThan(0);
    });

    it('login with valid credentials returns a session for this provider', async () => {
      const s = await h.provider.login(h.validCredentials);
      expect(s.provider).toBe(h.provider.id);
      expect(s.token.length).toBeGreaterThan(0);
      expect(Number.isNaN(Date.parse(s.createdAt))).toBe(false);
    });

    it('verify of a fresh session yields an identity with a role', async () => {
      const s = await h.provider.login(h.validCredentials);
      const id = await h.provider.verify(s);
      expect(id.name.length).toBeGreaterThan(0);
      expect(id.login.length).toBeGreaterThan(0);
      expect(['viewer', 'editor']).toContain(id.role);
    });

    it('login with invalid credentials throws INVALID_CREDENTIALS', async () => {
      await expect(h.provider.login(h.invalidCredentials)).rejects.toMatchObject({ name: 'AuthError', code: 'INVALID_CREDENTIALS' });
    });

    it('verify of a tampered session throws an AuthError', async () => {
      const s = await h.provider.login(h.validCredentials);
      const tampered: Session = { ...s, token: `${s.token}x` };
      await expect(h.provider.verify(tampered)).rejects.toBeInstanceOf(AuthError);
    });

    it('rejects credentials of another kind with UNSUPPORTED_CREDENTIALS', async () => {
      const other: Credentials = h.validCredentials.kind === 'mock'
        ? { kind: 'github-token', token: 'ghp_x' }
        : { kind: 'mock', name: 'x', role: 'viewer' };
      await expect(h.provider.login(other)).rejects.toMatchObject({ code: 'UNSUPPORTED_CREDENTIALS' });
    });

    it('non-collaborators are refused with NOT_COLLABORATOR', async () => {
      if (!h.nonCollaboratorCredentials) return;
      await expect(h.provider.login(h.nonCollaboratorCredentials)).rejects.toMatchObject({ code: 'NOT_COLLABORATOR' });
    });
  });
}
```

- [ ] **Step 8: Write `testing/contentBackendContract.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { ContentBackend, MutationOptions } from '../content.js';
import { CURRENT_VERSION } from '../content.js';
import { NEW_PAGE_TEXT, INVALID_PAGE_TEXT } from './fixtures/miniBundle.js';

export interface ContentBackendHarness {
  /** Backend seeded with MINI_BUNDLE as the Latest docs and no frozen versions. */
  backend: ContentBackend;
  /** Read a file relative to the site folder ("docs/index.md"); null when absent. */
  readFile(relPath: string): Promise<string | null>;
  /** Git tags present in the backing repository. */
  listTags(): Promise<string[]>;
  cleanup?: () => Promise<void>;
}

const opts = (message: string): MutationOptions => ({ message, author: { name: 'Contract Tester', email: 'tester@example.com' } });

export function describeContentBackendContract(name: string, factory: () => Promise<ContentBackendHarness>): void {
  describe(`ContentBackend contract: ${name}`, () => {
    let h: ContentBackendHarness;
    beforeAll(async () => { h = await factory(); });
    afterAll(async () => { await h.cleanup?.(); });

    it('lists the current version first and marks it editable', async () => {
      const versions = await h.backend.listVersions();
      expect(versions[0]).toMatchObject({ id: CURRENT_VERSION, frozen: false });
    });

    it('lists concept pages only (no index, log, AGENTS, README, code-maps)', async () => {
      const pages = await h.backend.listPages(CURRENT_VERSION);
      const paths = pages.map((p) => p.path).sort();
      expect(paths).toEqual(['getting-started.md', 'systems/inventory.md']);
      expect(pages.find((p) => p.path === 'systems/inventory.md')).toMatchObject({ title: 'Inventory', type: 'system', tags: ['inventory', 'gameplay'] });
    });

    it('reads a page with an etag', async () => {
      const page = await h.backend.readPage(CURRENT_VERSION, 'systems/inventory.md');
      expect(page.text).toContain('title: Inventory');
      expect(page.etag.length).toBeGreaterThan(0);
    });

    it('readPage of a missing path throws NOT_FOUND', async () => {
      await expect(h.backend.readPage(CURRENT_VERSION, 'nope.md')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('writePage regenerates the parent index, manifest and log in one commit', async () => {
      const before = await h.backend.readPage(CURRENT_VERSION, 'systems/inventory.md');
      const edited = before.text.replace('Explains how items are stored', 'Explains how item stacks are stored');
      const res = await h.backend.writePage(CURRENT_VERSION, 'systems/inventory.md', edited, { ...opts('Clarify inventory description'), expectedEtag: before.etag });
      expect(res.commitSha).toMatch(/^[0-9a-f]{7,40}$/);
      expect(res.regenerated).toEqual(expect.arrayContaining(['systems/index.md', 'manifest.json', 'log.md']));
      expect(await h.readFile('docs/systems/index.md')).toContain('Explains how item stacks are stored');
      expect(await h.readFile('docs/manifest.json')).toContain('Explains how item stacks are stored');
      const log = await h.readFile('docs/log.md');
      expect(log).toMatch(/\* \*\*Update\*\*: \[Inventory\]\(\/systems\/inventory\.md\) - Clarify inventory description\. \(by Contract Tester\)/);
    });

    it('writePage with a stale etag throws CONFLICT', async () => {
      const page = await h.backend.readPage(CURRENT_VERSION, 'systems/inventory.md');
      await expect(h.backend.writePage(CURRENT_VERSION, 'systems/inventory.md', page.text + '\nmore\n', { ...opts('x'), expectedEtag: 'stale-etag' })).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('writePage with invalid frontmatter throws VALIDATION with problems', async () => {
      await expect(h.backend.writePage(CURRENT_VERSION, 'systems/inventory.md', INVALID_PAGE_TEXT, opts('bad'))).rejects.toMatchObject({ code: 'VALIDATION' });
    });

    it('createPage adds the page, its index bullet and an Add log entry', async () => {
      const res = await h.backend.createPage(CURRENT_VERSION, 'systems/combat.md', NEW_PAGE_TEXT, opts('Add combat page'));
      expect(res.regenerated).toContain('systems/index.md');
      expect(await h.readFile('docs/systems/index.md')).toContain('* [Combat](combat.md) - Describes the damage pipeline');
      expect(await h.readFile('docs/log.md')).toMatch(/\*\*Add\*\*: \[Combat\]\(\/systems\/combat\.md\)/);
      expect((await h.backend.listPages(CURRENT_VERSION)).map((p) => p.path)).toContain('systems/combat.md');
    });

    it('createPage on an existing path throws EXISTS', async () => {
      await expect(h.backend.createPage(CURRENT_VERSION, 'systems/combat.md', NEW_PAGE_TEXT, opts('dup'))).rejects.toMatchObject({ code: 'EXISTS' });
    });

    it('renamePage moves the file and updates the index', async () => {
      await h.backend.renamePage(CURRENT_VERSION, 'systems/combat.md', 'systems/damage.md', opts('Rename combat to damage'));
      expect(await h.readFile('docs/systems/combat.md')).toBeNull();
      expect(await h.readFile('docs/systems/damage.md')).toContain('title: Combat');
      expect(await h.readFile('docs/systems/index.md')).toContain('(damage.md)');
      expect(await h.readFile('docs/systems/index.md')).not.toContain('(combat.md)');
    });

    it('deletePage removes the file and its bullet', async () => {
      await h.backend.deletePage(CURRENT_VERSION, 'systems/damage.md', opts('Remove damage page'));
      expect(await h.readFile('docs/systems/damage.md')).toBeNull();
      expect(await h.readFile('docs/systems/index.md')).not.toContain('damage.md');
      expect(await h.readFile('docs/manifest.json')).not.toContain('damage');
    });

    it('uploadAsset stores bytes under static/ and listAssets sees it', async () => {
      const bytes = new TextEncoder().encode('glTF-bytes');
      const res = await h.backend.uploadAsset('models/test.glb', bytes, opts('Add test model'));
      expect(res.asset).toMatchObject({ path: 'models/test.glb', kind: 'model', size: bytes.byteLength });
      expect(res.asset.url).toMatch(/\/models\/test\.glb$/);
      const assets = await h.backend.listAssets();
      expect(assets.map((a) => a.path)).toContain('models/test.glb');
    });

    it('search finds a page by a word in its description', async () => {
      const hits = await h.backend.search(CURRENT_VERSION, 'inventory');
      expect(hits.map((x) => x.path)).toContain('systems/inventory.md');
    });

    it('publishVersion snapshots docs with sha-pinned resources, records pins and tags', async () => {
      const res = await h.backend.publishVersion('1.1.0', opts('Publish 1.1.0'));
      expect(res).toMatchObject({ version: '1.1.0', tag: 'docs-v1.1.0' });
      expect(res.pins['acme/game']).toMatch(/^[0-9a-f]{40}$/);
      const frozen = await h.readFile('docs/versions/1.1.0.json');
      expect(JSON.parse(frozen!)).toMatchObject({ version: '1.1.0', pins: { 'acme/game': res.pins['acme/game'] }, refs: { 'acme/game': 'main' } });
      const snap = await h.readFile('versioned_docs/version-1.1.0/systems/inventory.md');
      expect(snap).toContain(`/blob/${res.pins['acme/game']}/Assets/Scripts/Inventory`);
      expect(snap).not.toContain('/blob/main/');
      expect(await h.readFile('versioned_docs/version-1.1.0/versions/1.1.0.json')).toBeNull();
      expect(JSON.parse((await h.readFile('versions.json'))!)[0]).toBe('1.1.0');
      expect(await h.readFile('versioned_sidebars/version-1.1.0-sidebars.json')).not.toBeNull();
      expect(await h.listTags()).toContain('docs-v1.1.0');
      const versions = await h.backend.listVersions();
      expect(versions.find((v) => v.id === '1.1.0')).toMatchObject({ frozen: true });
    });

    it('writes into a frozen version are refused with FROZEN', async () => {
      const page = await h.backend.readPage('1.1.0', 'systems/inventory.md');
      await expect(h.backend.writePage('1.1.0', 'systems/inventory.md', page.text + '\nx\n', opts('nope'))).rejects.toMatchObject({ code: 'FROZEN' });
      await expect(h.backend.createPage('1.1.0', 'systems/new.md', NEW_PAGE_TEXT, opts('nope'))).rejects.toMatchObject({ code: 'FROZEN' });
    });
  });
}
```

`testing/index.ts`:

```ts
export * from './authProviderContract.js';
export * from './contentBackendContract.js';
export * from './fixtures/miniBundle.js';
```

- [ ] **Step 9: Build, typecheck, commit**

Run: `cd packages/contracts && npx tsc -b && npx vitest run`
Expected: build succeeds (`dist/` created), 2 tests PASS.

```bash
git add packages/contracts
git commit -m "feat(contracts): auth and content contracts with contract test suites

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 3: okf-core - frontmatter parser, bundle model and validator

**Files:**
- Create: `packages/okf-core/package.json`, `packages/okf-core/tsconfig.json`, `packages/okf-core/vitest.config.ts`, `packages/okf-core/src/frontmatter.ts`, `packages/okf-core/src/model.ts`, `packages/okf-core/src/validate.ts`, `packages/okf-core/src/index.ts`, `packages/okf-core/test/frontmatter.test.ts`, `packages/okf-core/test/validate.test.ts`

**Interfaces:**
- Consumes: `MINI_BUNDLE`, `MINI_CODE_REPOS` from `@platform/contracts/testing` (dev only).
- Produces:

```ts
export interface RepoRef { owner: string; repo: string }
export interface Problem { file: string; rule: string; message: string }
export function parseFrontmatter(text: string): { data: Record<string, unknown> | null; body: string; head: string }
export function parseYamlSubset(text: string): Record<string, unknown>
export const START_MARKER = '<!-- okf:index -->'; export const END_MARKER = '<!-- /okf:index -->';
export const RESERVED_FILES: ReadonlySet<string>; export const CODEMAP_DIR = 'code-maps';
export const BLOB_RE: RegExp;   // captures owner, repo, ref, path
export interface PageMeta { title: string; description: string; type: string; tags: string[]; resource: string | undefined; sources: string[]; sidebarPosition: number }
export interface PageNode { path: string; dir: string; data: Record<string, unknown> | null; meta: PageMeta | null; body: string }
export interface IndexNode { path: string; dir: string; text: string; head: string; pre: string; post: string; intro: string; data: Record<string, unknown> }
export interface BundleModel { dirs: string[]; pages: PageNode[]; indexes: Map<string, IndexNode>; problems: Problem[] }
export function analyzeBundle(files: Record<string, string>): BundleModel
export interface ValidateOptions { codeRepos?: RepoRef[] }
export function validatePage(path: string, text: string, options?: ValidateOptions & { files?: Record<string, string> }): Problem[]
export function validateBundle(model: BundleModel, files: Record<string, string>, options?: ValidateOptions): Problem[]
export function isConceptPage(path: string): boolean
export function dirname(path: string): string; export function resolveRelative(dir: string, href: string): string
```

- [ ] **Step 1: Package files**

`packages/okf-core/package.json`:

```json
{
  "name": "@platform/okf-core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": { "okf": "./bin/okf.js" },
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./node": { "types": "./dist/node/index.d.ts", "default": "./dist/node/index.js" }
  },
  "scripts": { "build": "tsc -b", "test": "vitest run" },
  "dependencies": {},
  "devDependencies": { "@platform/contracts": "*", "typescript": "^5.7.2", "vitest": "^3.0.0" }
}
```

`packages/okf-core/tsconfig.json`:

```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "rootDir": "src", "outDir": "dist", "types": ["node"] }, "include": ["src"] }
```

`packages/okf-core/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { name: 'okf-core', include: ['test/**/*.test.ts'] } });
```

- [ ] **Step 2: Failing frontmatter tests**

`packages/okf-core/test/frontmatter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseFrontmatter, parseYamlSubset } from '../src/index.js';

describe('parseYamlSubset', () => {
  it('parses scalars, quoted strings, inline lists and block lists of maps', () => {
    const data = parseYamlSubset([
      'title: "Save Format: JSON"',
      'sidebar_position: 2',
      'draft: false',
      'tags: [a, b, "c d"]',
      'sources:',
      '  - resource: https://x/y',
      '  - resource: https://x/z',
      '# comment',
    ].join('\n'));
    expect(data).toEqual({
      title: 'Save Format: JSON', sidebar_position: 2, draft: false, tags: ['a', 'b', 'c d'],
      sources: [{ resource: 'https://x/y' }, { resource: 'https://x/z' }],
    });
  });
  it('parses a block list of scalars', () => {
    expect(parseYamlSubset('tags:\n  - one\n  - two')).toEqual({ tags: ['one', 'two'] });
  });
});

describe('parseFrontmatter', () => {
  it('splits head, data and body', () => {
    const r = parseFrontmatter('---\ntitle: A\n---\n\nBody\n');
    expect(r.data).toEqual({ title: 'A' });
    expect(r.body).toBe('\nBody\n');
    expect(r.head).toBe('---\ntitle: A\n---\n');
  });
  it('returns null data without a fence', () => {
    expect(parseFrontmatter('# Hi\n')).toEqual({ data: null, body: '# Hi\n', head: '' });
  });
  it('tolerates CRLF', () => {
    expect(parseFrontmatter('---\r\ntitle: A\r\n---\r\nB').data).toEqual({ title: 'A' });
  });
});
```

Run: `cd packages/okf-core && npx vitest run test/frontmatter.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/frontmatter.ts`**

```ts
/** Minimal YAML subset (ported from okf-example/tools/okf-generate.js). Nested maps and multi-line scalars are skipped. */
function scalar(raw: string): unknown {
  const s = raw.trim();
  if (/^(["']).*\1$/.test(s)) return s.slice(1, -1);
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s !== '' && !Number.isNaN(Number(s))) return Number(s);
  return s;
}

export function parseYamlSubset(text: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  let listKey: string | null = null;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item && listKey) {
      const kv = item[1]!.match(/^([\w-]+):\s*(.*)$/);
      (data[listKey] as unknown[]).push(kv ? { [kv[1]!]: scalar(kv[2]!) } : scalar(item[1]!));
      continue;
    }
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1]!;
    const raw = kv[2]!;
    if (raw === '') { data[key] = []; listKey = key; continue; }
    listKey = null;
    data[key] = raw.startsWith('[') && raw.endsWith(']')
      ? raw.slice(1, -1).split(',').map(scalar).filter((v) => v !== '')
      : scalar(raw);
  }
  return data;
}

const FM_RE = /^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontmatter(text: string): { data: Record<string, unknown> | null; body: string; head: string } {
  const m = text.match(FM_RE);
  if (!m) return { data: null, body: text, head: '' };
  return { data: parseYamlSubset(m[1]!), body: text.slice(m[0].length), head: m[0] };
}
```

Run: `npx vitest run test/frontmatter.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 4: Failing validator tests**

`packages/okf-core/test/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { MINI_BUNDLE, MINI_CODE_REPOS } from '@platform/contracts/testing';
import { analyzeBundle, validateBundle, validatePage } from '../src/index.js';

const rules = (files: Record<string, string>, codeRepos = MINI_CODE_REPOS) =>
  validateBundle(analyzeBundle(files), files, { codeRepos }).map((p) => `${p.rule}:${p.file}`);

describe('validateBundle', () => {
  it('accepts the mini bundle', () => {
    expect(rules(MINI_BUNDLE)).toEqual([]);
  });
  it('reports missing type and description', () => {
    const files = { ...MINI_BUNDLE, 'systems/inventory.md': '---\ntitle: X\nresource: https://github.com/acme/game/blob/main/a\n---\nb\n' };
    expect(rules(files)).toEqual(expect.arrayContaining(['frontmatter:systems/inventory.md']));
  });
  it('reports a broken relative link', () => {
    const files = { ...MINI_BUNDLE, 'systems/inventory.md': MINI_BUNDLE['systems/inventory.md']! + '\nSee [Status](status-effects.md).\n' };
    expect(rules(files)).toContain('link:systems/inventory.md');
  });
  it('accepts a relative link to a folder and to a sibling file', () => {
    const files = { ...MINI_BUNDLE, 'getting-started.md': MINI_BUNDLE['getting-started.md']! + '\n[Systems](systems/) and [Inv](systems/inventory.md)\n' };
    expect(rules(files)).toEqual([]);
  });
  it('reports a resource that is not a blob URL', () => {
    const files = { ...MINI_BUNDLE, 'getting-started.md': MINI_BUNDLE['getting-started.md']!.replace('blob/main/README.md', 'tree/main') };
    expect(rules(files)).toContain('resource:getting-started.md');
  });
  it('reports a resource pointing at an undeclared repo', () => {
    const files = { ...MINI_BUNDLE, 'getting-started.md': MINI_BUNDLE['getting-started.md']!.replace('acme/game', 'other/repo') };
    expect(rules(files)).toContain('undeclared-repo:getting-started.md');
    expect(rules(files, [])).not.toContain('undeclared-repo:getting-started.md');
  });
  it('reports extra keys on an index and a root index without okf_version', () => {
    const files = { ...MINI_BUNDLE, 'systems/index.md': MINI_BUNDLE['systems/index.md']!.replace('sidebar_position: 2', 'sidebar_position: 2\ndescription: nope') };
    expect(rules(files)).toContain('index-frontmatter:systems/index.md');
    const files2 = { ...MINI_BUNDLE, 'index.md': MINI_BUNDLE['index.md']!.replace('okf_version: "0.2"\n', '') };
    expect(rules(files2)).toContain('index-frontmatter:index.md');
  });
  it('reports a folder with markdown but no index.md', () => {
    const files = { ...MINI_BUNDLE, 'assets/airship.md': MINI_BUNDLE['systems/inventory.md']! };
    expect(rules(files)).toContain('missing-index:assets/index.md');
  });
});

describe('validatePage', () => {
  it('validates a single page without the bundle', () => {
    const problems = validatePage('x/y.md', '---\ntitle: T\n---\n', { codeRepos: MINI_CODE_REPOS });
    expect(problems.map((p) => p.rule)).toEqual(expect.arrayContaining(['frontmatter', 'resource']));
  });
  it('returns no problems for a valid page', () => {
    expect(validatePage('systems/inventory.md', MINI_BUNDLE['systems/inventory.md']!, { codeRepos: MINI_CODE_REPOS })).toEqual([]);
  });
});
```

Run: `npx vitest run test/validate.test.ts`
Expected: FAIL (exports missing).

- [ ] **Step 5: Implement `src/model.ts`**

```ts
import { parseFrontmatter } from './frontmatter.js';

export interface RepoRef { owner: string; repo: string }
export interface Problem { file: string; rule: string; message: string }

export const START_MARKER = '<!-- okf:index -->';
export const END_MARKER = '<!-- /okf:index -->';
export const RESERVED_FILES: ReadonlySet<string> = new Set(['index.md', 'log.md', 'AGENTS.md', 'README.md']);
export const CODEMAP_DIR = 'code-maps';
export const BLOB_RE = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/blob\/([^/\s]+)\/(\S+)$/;
export const INDEX_KEYS: ReadonlySet<string> = new Set(['title', 'sidebar_position']);
export const ROOT_INDEX_KEYS: ReadonlySet<string> = new Set(['title', 'sidebar_position', 'okf_version']);

export interface PageMeta { title: string; description: string; type: string; tags: string[]; resource: string | undefined; sources: string[]; sidebarPosition: number }
export interface PageNode { path: string; dir: string; data: Record<string, unknown> | null; meta: PageMeta | null; body: string }
export interface IndexNode { path: string; dir: string; text: string; head: string; pre: string; post: string; intro: string; data: Record<string, unknown> }
export interface BundleModel { dirs: string[]; pages: PageNode[]; indexes: Map<string, IndexNode>; problems: Problem[] }

export const basename = (p: string): string => p.slice(p.lastIndexOf('/') + 1);
export const dirname = (p: string): string => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');
export const join = (dir: string, name: string): string => (dir ? `${dir}/${name}` : name);

/** Resolve an href relative to a bundle directory, normalising ./ and ../ segments. */
export function resolveRelative(dir: string, href: string): string {
  const parts = (dir ? dir.split('/') : []);
  for (const seg of href.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop(); else parts.push(seg);
  }
  return parts.join('/');
}

export function isMarkdown(path: string): boolean { return path.endsWith('.md'); }
export function isInCodeMaps(path: string): boolean { return path === CODEMAP_DIR || path.startsWith(`${CODEMAP_DIR}/`); }
export function isConceptPage(path: string): boolean {
  return isMarkdown(path) && !RESERVED_FILES.has(basename(path)) && !isInCodeMaps(path) && !path.split('/').some((s) => s.startsWith('.'));
}

function str(v: unknown): string { return typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v); }

export function toPageMeta(data: Record<string, unknown>): PageMeta {
  const tags = Array.isArray(data['tags']) ? (data['tags'] as unknown[]).map(str) : [];
  const sources = Array.isArray(data['sources'])
    ? (data['sources'] as unknown[]).map((s) => (s && typeof s === 'object' ? str((s as Record<string, unknown>)['resource']) : '')).filter(Boolean)
    : [];
  const pos = typeof data['sidebar_position'] === 'number' ? data['sidebar_position'] : 999;
  return { title: str(data['title']), description: str(data['description']), type: str(data['type']), tags, resource: data['resource'] === undefined ? undefined : str(data['resource']), sources, sidebarPosition: pos };
}

/** Build the bundle model from an in-memory file map (bundle-relative POSIX paths). */
export function analyzeBundle(files: Record<string, string>): BundleModel {
  const problems: Problem[] = [];
  const dirSet = new Set<string>(['']);
  const pages: PageNode[] = [];
  for (const path of Object.keys(files).sort()) {
    if (!isMarkdown(path) || isInCodeMaps(path) || path.split('/').some((s) => s.startsWith('.'))) continue;
    // every ancestor of a markdown file is a doc folder that needs an index
    let d = dirname(path);
    while (d) { dirSet.add(d); d = dirname(d); }
    if (!isConceptPage(path)) continue;
    const { data, body } = parseFrontmatter(files[path]!);
    pages.push({ path, dir: dirname(path), data, meta: data ? toPageMeta(data) : null, body });
  }
  const dirs = [...dirSet].sort();
  const indexes = new Map<string, IndexNode>();
  for (const dir of dirs) {
    const path = join(dir, 'index.md');
    const text = files[path];
    if (text === undefined) { problems.push({ file: path, rule: 'missing-index', message: 'folder holds Markdown but has no index.md' }); continue; }
    const { data, body, head } = parseFrontmatter(text);
    const s = body.indexOf(START_MARKER);
    const e = body.indexOf(END_MARKER);
    const pre = s >= 0 ? body.slice(0, s) : body.replace(/\s*$/, '\n\n');
    const post = e >= 0 ? body.slice(e + END_MARKER.length) : '\n';
    const intro = (pre.trim().split(/\r?\n\s*\r?\n/)[0] ?? '').replace(/\s+/g, ' ');
    indexes.set(dir, { path, dir, text, head, pre, post, intro, data: data ?? {} });
  }
  return { dirs, pages, indexes, problems };
}
```

- [ ] **Step 6: Implement `src/validate.ts`**

```ts
import { parseFrontmatter } from './frontmatter.js';
import {
  BLOB_RE, INDEX_KEYS, ROOT_INDEX_KEYS, type BundleModel, type Problem, type RepoRef,
  dirname, resolveRelative, toPageMeta,
} from './model.js';

export interface ValidateOptions { codeRepos?: RepoRef[] }

const LINK_RE = /\[[^\]]*\]\(([^)\s]+)\)/g;

function checkResource(file: string, url: string | undefined, label: string, repos: RepoRef[] | undefined, out: Problem[]): void {
  if (!url) { out.push({ file, rule: 'resource', message: `missing "${label}"` }); return; }
  const m = url.match(BLOB_RE);
  if (!m) { out.push({ file, rule: 'resource', message: `${label} is not a GitHub blob URL: ${url}` }); return; }
  if (repos && repos.length > 0 && !repos.some((r) => r.owner === m[1] && r.repo === m[2])) {
    out.push({ file, rule: 'undeclared-repo', message: `${label} points at ${m[1]}/${m[2]}, which is not a declared code repo` });
  }
}

/** Does `target` (bundle-relative) exist as a file, or as a folder (any file below it)? */
function exists(files: Record<string, string>, target: string): boolean {
  if (target === '' ) return true;
  if (files[target] !== undefined) return true;
  const prefix = `${target}/`;
  return Object.keys(files).some((k) => k.startsWith(prefix));
}

export function checkLinks(file: string, body: string, files: Record<string, string>, out: Problem[]): void {
  for (const m of body.matchAll(LINK_RE)) {
    const href = m[1]!;
    if (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(href)) continue;
    const target = resolveRelative(dirname(file), decodeURI(href.split('#')[0]!));
    if (!exists(files, target)) out.push({ file, rule: 'link', message: `broken link -> ${href}` });
  }
}

/** Validate one concept page. Links are only checked when `files` is supplied. */
export function validatePage(path: string, text: string, options: ValidateOptions & { files?: Record<string, string> } = {}): Problem[] {
  const out: Problem[] = [];
  const { data, body } = parseFrontmatter(text);
  if (!data) { out.push({ file: path, rule: 'frontmatter', message: 'missing frontmatter' }); return out; }
  const meta = toPageMeta(data);
  for (const k of ['title', 'description', 'type'] as const) {
    if (!meta[k]) out.push({ file: path, rule: 'frontmatter', message: `missing "${k}"` });
  }
  checkResource(path, meta.resource, 'resource', options.codeRepos, out);
  for (const s of meta.sources) checkResource(path, s, 'sources[].resource', options.codeRepos, out);
  if (options.files) checkLinks(path, body, options.files, out);
  return out;
}

export function validateBundle(model: BundleModel, files: Record<string, string>, options: ValidateOptions = {}): Problem[] {
  const out: Problem[] = [...model.problems];
  for (const page of model.pages) out.push(...validatePage(page.path, files[page.path]!, { ...options, files }));
  for (const [dir, ix] of model.indexes) {
    const allowed = dir === '' ? ROOT_INDEX_KEYS : INDEX_KEYS;
    for (const k of Object.keys(ix.data)) {
      if (!allowed.has(k)) out.push({ file: ix.path, rule: 'index-frontmatter', message: `index.md has extra frontmatter key "${k}"` });
    }
    if (!ix.data['title']) out.push({ file: ix.path, rule: 'index-frontmatter', message: 'index.md missing "title"' });
    if (dir === '' && ix.data['okf_version'] !== '0.2' && ix.data['okf_version'] !== 0.2) {
      out.push({ file: ix.path, rule: 'index-frontmatter', message: 'root index.md must declare okf_version: "0.2"' });
    }
    checkLinks(ix.path, ix.pre + ix.post, files, out);
  }
  return out;
}
```

`src/index.ts` (for now):

```ts
export * from './frontmatter.js';
export * from './model.js';
export * from './validate.js';
```

Run: `npx vitest run`
Expected: PASS (all frontmatter + validate tests). If "accepts the mini bundle" fails, the fixture in `packages/contracts/src/testing/fixtures/miniBundle.ts` is wrong, not the validator: fix the fixture so it is a byte-exact valid bundle (rebuild contracts with `npx tsc -b` in `packages/contracts` afterwards).

- [ ] **Step 7: Commit**

```bash
git add packages/okf-core
git commit -m "feat(okf-core): frontmatter parser, bundle model and validator rules

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: okf-core - index blocks, manifest, generate and check

**Files:**
- Create: `packages/okf-core/src/index-block.ts`, `packages/okf-core/src/manifest.ts`, `packages/okf-core/src/generate.ts`, `packages/okf-core/test/generate.test.ts`
- Modify: `packages/okf-core/src/index.ts`

**Interfaces:**
- Produces:

```ts
export interface ManifestEntry { route: string; file: string; title: string; description: string; type: string; tags: string[]; resource: string; sources: string[] }
export function renderIndexBlock(model: BundleModel, dir: string): string          // START..END inclusive
export function applyIndexBlock(ix: IndexNode, block: string): string              // full new index.md text
export function buildManifest(model: BundleModel): ManifestEntry[]
export function renderManifest(entries: ManifestEntry[]): string
export interface GenerateOptions { codeRepos?: RepoRef[] }
export interface GenerateResult { problems: Problem[]; writes: Record<string, string>; manifest: ManifestEntry[] | null }
export function generateBundle(files: Record<string, string>, options?: GenerateOptions): GenerateResult
export function checkBundle(files: Record<string, string>, options?: GenerateOptions): { problems: Problem[] }
```

- [ ] **Step 1: Failing tests**

`packages/okf-core/test/generate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { MINI_BUNDLE, MINI_CODE_REPOS, NEW_PAGE_TEXT } from '@platform/contracts/testing';
import { generateBundle, checkBundle, renderIndexBlock, analyzeBundle } from '../src/index.js';

const opts = { codeRepos: MINI_CODE_REPOS };

describe('generateBundle', () => {
  it('is a no-op on an up-to-date bundle', () => {
    const r = generateBundle(MINI_BUNDLE, opts);
    expect(r.problems).toEqual([]);
    expect(r.writes).toEqual({});
    expect(r.manifest?.map((m) => m.route)).toEqual(['/getting-started', '/systems/inventory']);
  });
  it('adds a bullet for a new page, ordered by sidebar_position then title, and rewrites the manifest', () => {
    const files = { ...MINI_BUNDLE, 'systems/combat.md': NEW_PAGE_TEXT };
    const r = generateBundle(files, opts);
    expect(r.problems).toEqual([]);
    expect(Object.keys(r.writes).sort()).toEqual(['code-maps/acme--game.md', 'manifest.json', 'systems/index.md']);
    const idx = r.writes['systems/index.md']!;
    expect(idx.indexOf('* [Inventory](inventory.md)')).toBeLessThan(idx.indexOf('* [Combat](combat.md) - Describes the damage pipeline used whenever anything takes damage.'));
    expect(idx.startsWith(MINI_BUNDLE['systems/index.md']!.slice(0, MINI_BUNDLE['systems/index.md']!.indexOf('<!-- okf:index -->')))).toBe(true);
    expect(JSON.parse(r.writes['manifest.json']!).map((m: { file: string }) => m.file)).toEqual(['getting-started.md', 'systems/combat.md', 'systems/inventory.md']);
  });
  it('creates markers at the end of an index that has none', () => {
    const files = { ...MINI_BUNDLE, 'systems/index.md': '---\ntitle: Systems\nsidebar_position: 2\n---\n\nRuntime systems of the game.\n' };
    const r = generateBundle(files, opts);
    expect(r.writes['systems/index.md']).toBe(MINI_BUNDLE['systems/index.md']);
  });
  it('still rewrites index blocks but withholds manifest and code maps when validation fails', () => {
    const files = { ...MINI_BUNDLE, 'systems/combat.md': NEW_PAGE_TEXT.replace('type: system\n', '') };
    const r = generateBundle(files, opts);
    expect(r.problems.map((p) => p.rule)).toContain('frontmatter');
    expect(r.manifest).toBeNull();
    expect(r.writes['systems/index.md']).toBeDefined();
    expect(r.writes['manifest.json']).toBeUndefined();
    expect(r.writes['code-maps/acme--game.md']).toBeUndefined();
  });
});

describe('checkBundle', () => {
  it('reports stale index block, manifest and code map as problems', () => {
    const files = { ...MINI_BUNDLE, 'systems/combat.md': NEW_PAGE_TEXT };
    const rules = checkBundle(files, opts).problems.map((p) => `${p.rule}:${p.file}`).sort();
    expect(rules).toEqual(['stale:code-maps/acme--game.md', 'stale:manifest.json', 'stale:systems/index.md']);
  });
});

describe('renderIndexBlock', () => {
  it('renders Pages then Folders with a blank line between', () => {
    const block = renderIndexBlock(analyzeBundle(MINI_BUNDLE), '');
    expect(block).toBe([
      '<!-- okf:index -->', '## Pages',
      '* [Getting Started](getting-started.md) - Read this first to build and run the game locally.',
      '', '## Folders', '* [Systems](systems/) - Runtime systems of the game.', '<!-- /okf:index -->',
    ].join('\n'));
  });
});
```

Run: `npx vitest run test/generate.test.ts`
Expected: FAIL (exports missing).

- [ ] **Step 2: Implement `src/index-block.ts`**

```ts
import { END_MARKER, START_MARKER, type BundleModel, type IndexNode, basename, dirname } from './model.js';

interface Entry { pos: number; title: string; link: string; desc: string }
const fmt = (e: Entry): string => `* [${e.title}](${e.link}) - ${e.desc}`;
const bySort = (a: Entry, b: Entry): number => (a.pos - b.pos) || a.title.localeCompare(b.title);

export function renderIndexBlock(model: BundleModel, dir: string): string {
  const pageEntries: Entry[] = model.pages
    .filter((p) => p.dir === dir && p.meta)
    .map((p) => ({ pos: p.meta!.sidebarPosition, title: p.meta!.title, link: basename(p.path), desc: p.meta!.description }));
  const dirEntries: Entry[] = model.dirs
    .filter((d) => d !== '' && dirname(d) === dir && model.indexes.has(d))
    .map((d) => {
      const c = model.indexes.get(d)!;
      const pos = typeof c.data['sidebar_position'] === 'number' ? c.data['sidebar_position'] : 999;
      return { pos, title: String(c.data['title'] ?? basename(d)), link: `${basename(d)}/`, desc: c.intro };
    });
  const lines = [START_MARKER];
  if (pageEntries.length) lines.push('## Pages', ...pageEntries.sort(bySort).map(fmt));
  if (dirEntries.length) lines.push(...(lines.length > 1 ? [''] : []), '## Folders', ...dirEntries.sort(bySort).map(fmt));
  lines.push(END_MARKER);
  return lines.join('\n');
}

export function applyIndexBlock(ix: IndexNode, block: string): string {
  return ix.head + ix.pre + block + ix.post;
}
```

- [ ] **Step 3: Implement `src/manifest.ts`**

```ts
import type { BundleModel } from './model.js';

export interface ManifestEntry { route: string; file: string; title: string; description: string; type: string; tags: string[]; resource: string; sources: string[] }

export function buildManifest(model: BundleModel): ManifestEntry[] {
  return model.pages
    .filter((p) => p.meta)
    .map((p) => ({
      route: '/' + p.path.replace(/\.md$/, ''),
      file: p.path,
      title: p.meta!.title,
      description: p.meta!.description,
      type: p.meta!.type,
      tags: p.meta!.tags,
      resource: p.meta!.resource ?? '',
      sources: p.meta!.sources,
    }))
    .sort((a, b) => a.route.localeCompare(b.route));
}

export const renderManifest = (entries: ManifestEntry[]): string => JSON.stringify(entries, null, 2) + '\n';
```

- [ ] **Step 4: Implement `src/generate.ts`** (code maps are added in Task 5; write the hook now)

```ts
import { analyzeBundle, type Problem, type RepoRef } from './model.js';
import { validateBundle } from './validate.js';
import { renderIndexBlock, applyIndexBlock } from './index-block.js';
import { buildManifest, renderManifest, type ManifestEntry } from './manifest.js';
import { codeMapPath, renderCodeMap } from './codemap.js';

export interface GenerateOptions { codeRepos?: RepoRef[] }
export interface GenerateResult { problems: Problem[]; writes: Record<string, string>; manifest: ManifestEntry[] | null }

/** Compute every generated file. `writes` holds only files whose content would change. */
export function generateBundle(files: Record<string, string>, options: GenerateOptions = {}): GenerateResult {
  const model = analyzeBundle(files);
  const problems = validateBundle(model, files, options);
  const writes: Record<string, string> = {};
  for (const [dir, ix] of model.indexes) {
    const next = applyIndexBlock(ix, renderIndexBlock(model, dir));
    if (next !== ix.text) writes[ix.path] = next;
  }
  if (problems.length > 0) return { problems, writes, manifest: null };
  const manifest = buildManifest(model);
  const manifestText = renderManifest(manifest);
  if (files['manifest.json'] !== manifestText) writes['manifest.json'] = manifestText;
  for (const repo of options.codeRepos ?? []) {
    const path = codeMapPath(repo);
    const text = renderCodeMap(manifest, repo);
    if (files[path] !== text) writes[path] = text;
  }
  return { problems, writes, manifest };
}

/** Validation plus staleness: every file generate would change is a `stale` problem. */
export function checkBundle(files: Record<string, string>, options: GenerateOptions = {}): { problems: Problem[] } {
  const r = generateBundle(files, options);
  const stale: Problem[] = Object.keys(r.writes).map((file) => ({ file, rule: 'stale', message: 'generated content is stale (run okf generate)' }));
  return { problems: [...r.problems, ...stale] };
}
```

Create a temporary `src/codemap.ts` so this compiles (replaced in Task 5):

```ts
import type { RepoRef } from './model.js';
import type { ManifestEntry } from './manifest.js';
export const codeMapPath = (r: RepoRef): string => `code-maps/${r.owner}--${r.repo}.md`;
export function renderCodeMap(_m: ManifestEntry[], _r: RepoRef): string { return ''; }
```

Update `src/index.ts`:

```ts
export * from './frontmatter.js';
export * from './model.js';
export * from './validate.js';
export * from './index-block.js';
export * from './manifest.js';
export * from './codemap.js';
export * from './generate.js';
```

Run: `npx vitest run`
Expected: `generate.test.ts` passes except the assertions about `code-maps/acme--game.md` (the stub returns `''`, so the code map is reported as a write / stale). That is expected until Task 5 Step 4; all other tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/okf-core
git commit -m "feat(okf-core): index block rendering, manifest, generate and check

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: okf-core - log, code maps, ref rewriting, Node CLI and root script

**Files:**
- Create: `packages/okf-core/src/log.ts`, `packages/okf-core/src/codemap.ts` (replace stub), `packages/okf-core/src/rewrite.ts`, `packages/okf-core/src/node/fs.ts`, `packages/okf-core/src/node/cli.ts`, `packages/okf-core/src/node/index.ts`, `packages/okf-core/bin/okf.js`, `packages/okf-core/test/log.test.ts`, `packages/okf-core/test/codemap.test.ts`, `packages/okf-core/test/rewrite.test.ts`, `packages/okf-core/test/cli.test.ts`, `scripts/okf.mjs`
- Modify: `packages/okf-core/src/index.ts`, `packages/okf-core/src/validate.ts` (log validation hook)

**Interfaces:**
- Produces:

```ts
export interface LogEntry { action: 'Add' | 'Update'; title: string; path: string; summary: string; author: string }  // path starts with '/'
export function prependLogEntries(logText: string, date: string, entries: LogEntry[]): string
export function validateLog(text: string): Problem[]
export interface CommitInfo { date: string; author: string; message: string; files: { path: string; status: 'A' | 'M' | 'D' | 'R' }[] }
export function logEntriesFromCommits(commits: CommitInfo[], titleOf: (path: string) => string | undefined): { date: string; entries: LogEntry[] }[]
export function codeMapPath(repo: RepoRef): string
export function renderCodeMap(manifest: ManifestEntry[], repo: RepoRef): string
export interface RefRewrite { from: string; to: string }
export function rewriteRefs(text: string, pins: Record<string, RefRewrite>): string   // key 'owner/repo'
// ./node
export function readBundle(dir: string): Promise<Record<string, string>>
export function writeFiles(dir: string, writes: Record<string, string>): Promise<void>
export function runCli(argv: string[], io?: { log(s: string): void; error(s: string): void }): Promise<number>   // exit code
```

- [ ] **Step 1: Failing log tests**

`packages/okf-core/test/log.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { MINI_BUNDLE } from '@platform/contracts/testing';
import { prependLogEntries, validateLog, logEntriesFromCommits } from '../src/index.js';

const entry = { action: 'Update' as const, title: 'Inventory', path: '/systems/inventory.md', summary: 'Clarify description.', author: 'Rayan Yousef' };

describe('prependLogEntries', () => {
  it('inserts a new dated section before older ones and keeps frontmatter + preamble', () => {
    const out = prependLogEntries(MINI_BUNDLE['log.md']!, '2026-09-07', [entry]);
    expect(out).toBe(`---
title: Change Log
sidebar_position: 99
---

Newest first.

## 2026-09-07

* **Update**: [Inventory](/systems/inventory.md) - Clarify description. (by Rayan Yousef)

## 2026-08-01

* **Add**: [Inventory](/systems/inventory.md) - initial page. (by Test Author)
`);
  });
  it('prepends bullets inside an existing section for the same day', () => {
    const once = prependLogEntries(MINI_BUNDLE['log.md']!, '2026-08-01', [entry]);
    expect(once.match(/## 2026-08-01/g)).toHaveLength(1);
    expect(once.indexOf('Clarify description')).toBeLessThan(once.indexOf('initial page'));
  });
  it('appends a period when the summary lacks one', () => {
    const out = prependLogEntries(MINI_BUNDLE['log.md']!, '2026-09-07', [{ ...entry, summary: 'no period' }]);
    expect(out).toContain('- no period. (by Rayan Yousef)');
  });
});

describe('validateLog', () => {
  it('accepts the mini log', () => { expect(validateLog(MINI_BUNDLE['log.md']!)).toEqual([]); });
  it('rejects extra frontmatter keys, bad headings, wrong order and malformed bullets', () => {
    const bad = `---\ntitle: Change Log\ndescription: x\n---\n\n## 2026-08-01\n\n* **Add**: [A](/a.md) - a. (by B)\n\n## 2026-09-01\n\n* Fix: stuff\n\n## 2026/09/02\n`;
    const rules = validateLog(bad).map((p) => p.message);
    expect(rules.some((m) => m.includes('description'))).toBe(true);
    expect(rules.some((m) => m.includes('descending'))).toBe(true);
    expect(rules.some((m) => m.includes('bullet'))).toBe(true);
    expect(rules.some((m) => m.includes('heading'))).toBe(true);
  });
});

describe('logEntriesFromCommits', () => {
  it('maps commits to dated entries, Add for A and Update for M, skipping non-pages', () => {
    const groups = logEntriesFromCommits([
      { date: '2026-09-07', author: 'A', message: 'Add combat', files: [{ path: 'systems/combat.md', status: 'A' }, { path: 'systems/index.md', status: 'M' }, { path: 'manifest.json', status: 'M' }] },
      { date: '2026-09-06', author: 'B', message: 'Fix typo', files: [{ path: 'getting-started.md', status: 'M' }] },
    ], (p) => ({ 'systems/combat.md': 'Combat', 'getting-started.md': 'Getting Started' }[p]));
    expect(groups).toEqual([
      { date: '2026-09-07', entries: [{ action: 'Add', title: 'Combat', path: '/systems/combat.md', summary: 'Add combat', author: 'A' }] },
      { date: '2026-09-06', entries: [{ action: 'Update', title: 'Getting Started', path: '/getting-started.md', summary: 'Fix typo', author: 'B' }] },
    ]);
  });
});
```

Run: `npx vitest run test/log.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement `src/log.ts`**

```ts
import { parseFrontmatter } from './frontmatter.js';
import { isConceptPage, type Problem } from './model.js';

export interface LogEntry { action: 'Add' | 'Update'; title: string; path: string; summary: string; author: string }
export interface CommitInfo { date: string; author: string; message: string; files: { path: string; status: 'A' | 'M' | 'D' | 'R' }[] }

const HEADING_RE = /^## (\d{4}-\d{2}-\d{2})\s*$/;
const BULLET_RE = /^\* \*\*(Add|Update)\*\*: \[[^\]]+\]\(\/[^)]+\) - .+ \(by .+\)$/;
const LOG_KEYS = new Set(['title', 'sidebar_position']);

export function formatLogEntry(e: LogEntry): string {
  const summary = /[.!?]$/.test(e.summary.trim()) ? e.summary.trim() : `${e.summary.trim()}.`;
  return `* **${e.action}**: [${e.title}](${e.path}) - ${summary} (by ${e.author})`;
}

export function prependLogEntries(logText: string, date: string, entries: LogEntry[]): string {
  if (entries.length === 0) return logText;
  const { head, body } = parseFrontmatter(logText);
  const lines = body.split('\n');
  const first = lines.findIndex((l) => HEADING_RE.test(l));
  const bullets = entries.map(formatLogEntry);
  if (first >= 0 && lines[first]!.match(HEADING_RE)![1] === date) {
    // same day: insert after the heading and its following blank line
    let at = first + 1;
    while (at < lines.length && lines[at]!.trim() === '') at++;
    lines.splice(at, 0, ...bullets);
    return head + lines.join('\n');
  }
  const section = [`## ${date}`, '', ...bullets, ''];
  if (first < 0) {
    const trimmed = body.replace(/\s*$/, '');
    return head + (trimmed ? `${trimmed}\n\n` : '') + section.join('\n') + '\n';
  }
  lines.splice(first, 0, ...section);
  return head + lines.join('\n');
}

export function validateLog(text: string): Problem[] {
  const out: Problem[] = [];
  const file = 'log.md';
  const { data, body } = parseFrontmatter(text);
  for (const k of Object.keys(data ?? {})) if (!LOG_KEYS.has(k)) out.push({ file, rule: 'log', message: `log.md has extra frontmatter key "${k}"` });
  let last: string | null = null;
  for (const line of body.split(/\r?\n/)) {
    if (line.startsWith('## ')) {
      const m = line.match(HEADING_RE);
      if (!m) { out.push({ file, rule: 'log', message: `heading is not "## YYYY-MM-DD": ${line}` }); continue; }
      if (last !== null && m[1]! >= last) out.push({ file, rule: 'log', message: `dates must be strictly descending (${m[1]} after ${last})` });
      last = m[1]!;
    } else if (line.startsWith('* ') && last !== null && !BULLET_RE.test(line)) {
      out.push({ file, rule: 'log', message: `bullet does not match "* **Add|Update**: [Title](/path.md) - what changed. (by Name)": ${line}` });
    }
  }
  return out;
}

export function logEntriesFromCommits(commits: CommitInfo[], titleOf: (path: string) => string | undefined): { date: string; entries: LogEntry[] }[] {
  const groups = new Map<string, LogEntry[]>();
  for (const c of commits) {
    for (const f of c.files) {
      if (!isConceptPage(f.path) || f.status === 'D') continue;
      const title = titleOf(f.path);
      if (!title) continue;
      const list = groups.get(c.date) ?? [];
      list.push({ action: f.status === 'A' ? 'Add' : 'Update', title, path: `/${f.path}`, summary: c.message.split('\n')[0]!, author: c.author });
      groups.set(c.date, list);
    }
  }
  return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([date, entries]) => ({ date, entries }));
}
```

Wire log validation into `validateBundle` (append at the end of the function in `src/validate.ts`, before `return out;`):

```ts
  if (files['log.md'] !== undefined) out.push(...validateLog(files['log.md']));
```

with `import { validateLog } from './log.js';` at the top.

Run: `npx vitest run test/log.test.ts test/validate.test.ts`
Expected: PASS.

- [ ] **Step 3: Failing code map and rewrite tests**

`packages/okf-core/test/codemap.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { MINI_BUNDLE, MINI_CODE_REPOS } from '@platform/contracts/testing';
import { renderCodeMap, codeMapPath, buildManifest, analyzeBundle } from '../src/index.js';

describe('code maps', () => {
  it('names the file from owner and repo', () => {
    expect(codeMapPath({ owner: 'acme', repo: 'game' })).toBe('code-maps/acme--game.md');
  });
  it('renders the mini bundle code map byte-exactly', () => {
    const manifest = buildManifest(analyzeBundle(MINI_BUNDLE));
    expect(renderCodeMap(manifest, MINI_CODE_REPOS[0]!)).toBe(MINI_BUNDLE['code-maps/acme--game.md']);
  });
  it('ignores resources of other repos', () => {
    const manifest = buildManifest(analyzeBundle(MINI_BUNDLE));
    expect(renderCodeMap(manifest, { owner: 'other', repo: 'x' })).not.toContain('Inventory');
  });
});
```

`packages/okf-core/test/rewrite.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { rewriteRefs } from '../src/index.js';

const sha = 'a'.repeat(40);
describe('rewriteRefs', () => {
  it('rewrites blob URLs of pinned repos only', () => {
    const text = 'resource: https://github.com/acme/game/blob/main/x\nother: https://github.com/zzz/q/blob/main/y\n';
    expect(rewriteRefs(text, { 'acme/game': { from: 'main', to: sha } })).toBe(`resource: https://github.com/acme/game/blob/${sha}/x\nother: https://github.com/zzz/q/blob/main/y\n`);
  });
  it('rewrites ref="main" only on JSX tags carrying repo="acme/game"', () => {
    const text = '<FbxViewer repo="acme/game" ref="main" path="A.fbx" />\n<ModelViewer repo="zzz/q" ref="main" path="B.glb" />';
    const out = rewriteRefs(text, { 'acme/game': { from: 'main', to: sha } });
    expect(out).toContain(`<FbxViewer repo="acme/game" ref="${sha}" path="A.fbx" />`);
    expect(out).toContain('<ModelViewer repo="zzz/q" ref="main" path="B.glb" />');
  });
});
```

Run: `npx vitest run test/codemap.test.ts test/rewrite.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement `src/codemap.ts` (replacing the stub) and `src/rewrite.ts`**

`src/codemap.ts`:

```ts
import { BLOB_RE, type RepoRef } from './model.js';
import type { ManifestEntry } from './manifest.js';

export const CODEMAP_START = '<!-- okf:codemap -->';
export const CODEMAP_END = '<!-- /okf:codemap -->';

export const codeMapPath = (r: RepoRef): string => `code-maps/${r.owner}--${r.repo}.md`;

interface Cite { title: string; file: string; source: boolean }

/** Path-ordered index of every code path cited by the manifest for one repo. */
export function renderCodeMap(manifest: ManifestEntry[], repo: RepoRef): string {
  const byPath = new Map<string, Cite[]>();
  const add = (url: string, entry: ManifestEntry, source: boolean): void => {
    const m = url.match(BLOB_RE);
    if (!m || m[1] !== repo.owner || m[2] !== repo.repo) return;
    const list = byPath.get(m[4]!) ?? [];
    if (!list.some((c) => c.file === entry.file && c.source === source)) list.push({ title: entry.title, file: entry.file, source });
    byPath.set(m[4]!, list);
  };
  for (const e of manifest) {
    add(e.resource, e, false);
    for (const s of e.sources) add(s, e, true);
  }
  const name = `${repo.owner}/${repo.repo}`;
  const lines = [
    '---', `title: "Code map: ${name}"`, 'sidebar_position: 98', '---', '',
    CODEMAP_START, `# Code map: ${name}`, '',
    'Generated from manifest.json. Each code path lists the pages that describe it; (source) marks a sources citation.', '',
  ];
  for (const path of [...byPath.keys()].sort((a, b) => a.localeCompare(b))) {
    const cites = byPath.get(path)!.map((c) => `[${c.title}](/${c.file})${c.source ? ' (source)' : ''}`);
    lines.push(`* \`${path}\` - ${cites.join(', ')}`);
  }
  lines.push(CODEMAP_END, '');
  return lines.join('\n');
}
```

`src/rewrite.ts`:

```ts
export interface RefRewrite { from: string; to: string }

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** Replace branch refs with pinned shas in blob URLs and in viewer JSX `ref` attributes. Keys are 'owner/repo'. */
export function rewriteRefs(text: string, pins: Record<string, RefRewrite>): string {
  let out = text;
  for (const [key, { from, to }] of Object.entries(pins)) {
    const [owner, repo] = key.split('/');
    const url = new RegExp(`(https://github\\.com/${esc(owner!)}/${esc(repo!)}/blob/)${esc(from)}/`, 'g');
    out = out.replace(url, `$1${to}/`);
    const tag = /<[A-Z][\w.]*\b[^>]*>/g;
    out = out.replace(tag, (t) => {
      if (!new RegExp(`\\brepo=["']${esc(key)}["']`).test(t)) return t;
      return t.replace(new RegExp(`\\bref=["']${esc(from)}["']`), `ref="${to}"`);
    });
  }
  return out;
}
```

Add to `src/index.ts`: `export * from './log.js'; export * from './rewrite.js';`

Run: `npx vitest run`
Expected: ALL okf-core tests PASS, including the Task 4 code-map assertions.

- [ ] **Step 5: Failing CLI test**

`packages/okf-core/test/cli.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { MINI_BUNDLE, NEW_PAGE_TEXT } from '@platform/contracts/testing';
import { runCli, readBundle } from '../src/node/index.js';

async function seed(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'okf-'));
  for (const [rel, text] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(dir, rel)), { recursive: true });
    await writeFile(path.join(dir, rel), text);
  }
  await mkdir(path.join(dir, 'versions'), { recursive: true });
  await writeFile(path.join(dir, 'versions', '1.0.0.json'), '{}');
  return dir;
}

const io = () => { const out: string[] = []; return { out, log: (s: string) => out.push(s), error: (s: string) => out.push(s) }; };

describe('okf CLI', () => {
  let dir: string;
  beforeEach(async () => { dir = await seed({ ...MINI_BUNDLE, 'systems/combat.md': NEW_PAGE_TEXT }); });

  it('readBundle skips data folders and non-markdown', async () => {
    const files = await readBundle(dir);
    expect(Object.keys(files)).not.toContain('versions/1.0.0.json');
    expect(Object.keys(files)).toContain('manifest.json');
  });
  it('check exits 1 on stale content and writes nothing', async () => {
    const o = io();
    expect(await runCli(['check', dir, '--repo', 'acme/game'], o)).toBe(1);
    expect(o.out.join('\n')).toContain('stale');
    expect(await readFile(path.join(dir, 'manifest.json'), 'utf8')).toBe(MINI_BUNDLE['manifest.json']);
  });
  it('generate writes and a following check exits 0', async () => {
    expect(await runCli(['generate', dir, '--repo', 'acme/game'], io())).toBe(0);
    expect(await readFile(path.join(dir, 'systems/index.md'), 'utf8')).toContain('[Combat](combat.md)');
    expect(await runCli(['check', dir, '--repo', 'acme/game'], io())).toBe(0);
  });
  it('usage errors exit 2', async () => {
    expect(await runCli([], io())).toBe(2);
    expect(await runCli(['check'], io())).toBe(2);
  });
});
```

Run: `npx vitest run test/cli.test.ts`
Expected: FAIL.

- [ ] **Step 6: Implement `src/node/fs.ts`, `src/node/cli.ts`, `src/node/index.ts`, `bin/okf.js`**

`src/node/fs.ts`:

```ts
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const SKIP_DIRS = new Set(['node_modules']);

/** Read every .md file plus manifest.json below `dir` into a bundle-relative map. */
export async function readBundle(dir: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  async function walk(abs: string, rel: string): Promise<void> {
    for (const ent of await readdir(abs, { withFileTypes: true })) {
      if (ent.name.startsWith('.') || SKIP_DIRS.has(ent.name)) continue;
      const childRel = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) await walk(path.join(abs, ent.name), childRel);
      else if (ent.name.endsWith('.md') || childRel === 'manifest.json') files[childRel] = await readFile(path.join(abs, ent.name), 'utf8');
    }
  }
  await walk(dir, '');
  return files;
}

export async function writeFiles(dir: string, writes: Record<string, string>): Promise<void> {
  for (const [rel, text] of Object.entries(writes)) {
    const abs = path.join(dir, ...rel.split('/'));
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, text);
  }
}
```

`src/node/cli.ts`:

```ts
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { generateBundle, checkBundle } from '../generate.js';
import type { RepoRef } from '../model.js';
import { readBundle, writeFiles } from './fs.js';

export const USAGE = [
  'Usage: okf <generate|check> <bundle-dir> [--repo owner/repo]...',
  '',
  '  generate  write index blocks, manifest.json and code maps, then validate',
  '  check     validate only, write nothing; stale generated content is a problem (CI-safe)',
  '  --repo    declare a code repo (repeatable); resources outside declared repos fail',
  '',
  'Exit codes: 0 clean, 1 problems found, 2 usage error',
].join('\n');

export interface CliIo { log(s: string): void; error(s: string): void }

export async function runCli(argv: string[], io: CliIo = console): Promise<number> {
  const [cmd, dirArg, ...rest] = argv;
  if (!cmd || !dirArg || !['generate', 'check'].includes(cmd) || argv.includes('--help') || argv.includes('-h')) { io.log(USAGE); return 2; }
  const codeRepos: RepoRef[] = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--repo' && rest[i + 1]) {
      const [owner, repo] = rest[++i]!.split('/');
      if (!owner || !repo) { io.error(`Bad --repo value; expected owner/repo`); return 2; }
      codeRepos.push({ owner, repo });
    }
  }
  const dir = path.resolve(dirArg);
  try { if (!(await stat(dir)).isDirectory()) throw new Error(); } catch { io.error(`Not a directory: ${dir}\n\n${USAGE}`); return 2; }
  const files = await readBundle(dir);
  if (cmd === 'check') {
    const { problems } = checkBundle(files, { codeRepos });
    if (problems.length) { io.log(`okf check: ${problems.length} problem(s) in ${dirArg}`); for (const p of problems) io.log(`  - ${p.file}: [${p.rule}] ${p.message}`); return 1; }
    io.log(`okf check: OK - ${dirArg}`); return 0;
  }
  const r = generateBundle(files, { codeRepos });
  await writeFiles(dir, r.writes);
  if (r.problems.length) {
    io.log(`okf generate: ${r.problems.length} problem(s) in ${dirArg} - index blocks rewritten, manifest.json and code maps NOT written until these are fixed`);
    for (const p of r.problems) io.log(`  - ${p.file}: [${p.rule}] ${p.message}`);
    return 1;
  }
  io.log(`okf generate: OK - ${Object.keys(r.writes).length} file(s) written in ${dirArg}`);
  return 0;
}
```

`src/node/index.ts`:

```ts
export * from './fs.js';
export * from './cli.js';
```

`bin/okf.js`:

```js
#!/usr/bin/env node
import { runCli } from '../dist/node/index.js';
process.exitCode = await runCli(process.argv.slice(2));
```

Run: `npx vitest run && npx tsc -b`
Expected: all PASS, `dist/` built.

- [ ] **Step 7: Root script `scripts/okf.mjs`** (runs every version bundle with the repos from `platform.config.js`)

```js
// Usage: node scripts/okf.mjs <generate|check>
// Runs okf-core over the Latest bundle and every frozen version listed in <site>/versions.json.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { runCli } from '@platform/okf-core/node';
import platform from '../platform.config.js';

const cmd = process.argv[2];
if (!['generate', 'check'].includes(cmd ?? '')) { console.error('Usage: node scripts/okf.mjs <generate|check>'); process.exit(2); }

const site = path.resolve(platform.sitePath);
const versions = JSON.parse(await readFile(path.join(site, 'versions.json'), 'utf8'));
const bundles = [path.join(site, 'docs'), ...versions.map((v) => path.join(site, 'versioned_docs', `version-${v}`))];
const repoArgs = platform.codeRepos.flatMap((r) => ['--repo', `${r.owner}/${r.repo}`]);

let worst = 0;
for (const dir of bundles) {
  const code = await runCli([cmd, dir, ...repoArgs]);
  worst = Math.max(worst, code);
}
process.exit(worst);
```

Add to root `package.json` devDependencies: `"@platform/okf-core": "*"` (run `npm install`). The script is exercised in Task 7 once `site/` exists.

- [ ] **Step 8: Commit**

```bash
git add packages/okf-core scripts/okf.mjs package.json package-lock.json
git commit -m "feat(okf-core): change log, code maps, ref rewriting and CLI

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 6: Site restructure - rename, remove old features, wire platform.config.js

**Files:**
- Rename: `website/` -> `site/` (`git mv`)
- Delete: `site/site.config.js`, `site/plugins/okf-graph/`, `site/src/components/OkfGraph/`, `site/src/pages/viz.js`, `site/src/theme/DocItem/`, `site/src/pages/editor.js`, `site/src/components/editor/`, `site/docs/**` (old demo), `site/build/`, `site/serve.log`, `site/static/uploads/.gitkeep` is kept
- Create: `site/src/theme/MDXComponents.js`, `site/docs/index.md` (temporary placeholder, replaced in Task 7), `site/components.json`, `site/scripts/build-platform-artifacts.mjs`, `site/vitest.config.ts`, `site/scripts/build-platform-artifacts.test.ts`
- Modify: `site/package.json`, `site/docusaurus.config.js`, root `package.json` (`workspaces` gets `"site"`)

**Interfaces:**
- Consumes: `platform.config.js` default export (Task 1).
- Produces: `site/components.json` (ComponentsManifest), `static/platform/{components.json,versions.json,manifest-<version>.json}` at build time, global MDX components `ModelViewer`, `FbxViewer`, `Tabs`, `TabItem`, navbar `Editor` link to `<baseUrl>editor/`.

- [ ] **Step 1: Rename and delete**

```bash
git mv website site
git rm -r site/plugins/okf-graph site/src/components/OkfGraph site/src/pages/viz.js site/src/theme/DocItem site/src/pages/editor.js site/src/components/editor site/site.config.js site/docs site/versioned_docs/version-1.0.0/intro.md
rm -rf site/build site/serve.log site/node_modules
```

- [ ] **Step 2: `site/package.json`**

```json
{
  "name": "@platform/site",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "docusaurus": "docusaurus",
    "prestart": "node scripts/build-platform-artifacts.mjs",
    "start": "docusaurus start",
    "prebuild": "node scripts/build-platform-artifacts.mjs",
    "build": "docusaurus build",
    "clear": "docusaurus clear",
    "serve": "docusaurus serve",
    "test": "vitest run"
  },
  "dependencies": {
    "@docusaurus/core": "^3.10.1",
    "@docusaurus/preset-classic": "^3.10.1",
    "@google/model-viewer": "^4.3.1",
    "@mdx-js/react": "^3.0.0",
    "@orama/plugin-docusaurus-v3": "^3.1.18",
    "@platform/contracts": "*",
    "clsx": "^2.0.0",
    "prism-react-renderer": "^2.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "three": "^0.183.0"
  },
  "devDependencies": {
    "@docusaurus/module-type-aliases": "^3.10.1",
    "@docusaurus/types": "^3.10.1",
    "vitest": "^3.0.0"
  },
  "browserslist": { "production": [">0.5%", "not dead", "not op_mini all"], "development": ["last 3 chrome version", "last 3 firefox version", "last 5 safari version"] },
  "engines": { "node": ">=20.0" }
}
```

Root `package.json`: set `"workspaces": ["packages/*", "services/*", "site"]`.

- [ ] **Step 3: `site/docusaurus.config.js`**

```js
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
        ...(platform.features.editor ? [{ href: `${platform.baseUrl}editor/`, label: 'Editor', position: 'right', target: '_self' }] : []),
        { href: repoUrl, position: 'right', className: 'header-github-link', 'aria-label': 'GitHub repository' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        { title: 'Docs', items: [{ label: 'Home', to: '/' }, { label: 'Change Log', to: '/log' }] },
        { title: 'More', items: [
          ...(platform.features.editor ? [{ label: 'Editor', href: `${platform.baseUrl}editor/`, target: '_self' }] : []),
          { label: 'GitHub Repository', href: repoUrl },
        ] },
      ],
      copyright: platform.footerCopyright,
    },
    prism: { theme: prismThemes.github, darkTheme: prismThemes.dracula, additionalLanguages: ['csharp', 'yaml', 'bash', 'json'] },
  }),
};

export default config;
```

- [ ] **Step 4: Global MDX components and placeholder index**

`site/src/theme/MDXComponents.js`:

```js
import MDXComponents from '@theme-original/MDXComponents';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import ModelViewer from '@site/src/components/ModelViewer';
import FbxViewer from '@site/src/components/FbxViewer';

// Registered globally so pages use <ModelViewer /> etc. without import lines
// (the editor's JSX descriptors rely on this: they emit no imports).
export default { ...MDXComponents, Tabs, TabItem, ModelViewer, FbxViewer };
```

`site/docs/index.md` (temporary; Task 7 replaces it):

```markdown
---
title: Documentation
sidebar_position: 1
okf_version: "0.2"
---

Placeholder root index; replaced by the demo bundle in Task 7.

<!-- okf:index -->
<!-- /okf:index -->
```

- [ ] **Step 5: `site/components.json`** (hand-maintained source of the published manifest)

```json
{
  "components": [
    { "name": "ModelViewer", "kind": "flow", "hasChildren": false, "preview": "model-viewer",
      "props": [{ "name": "src", "type": "string" }, { "name": "repo", "type": "string" }, { "name": "ref", "type": "string" }, { "name": "path", "type": "string" }, { "name": "alt", "type": "string" }, { "name": "height", "type": "number" }] },
    { "name": "FbxViewer", "kind": "flow", "hasChildren": false, "preview": "fbx-viewer",
      "props": [{ "name": "src", "type": "string" }, { "name": "repo", "type": "string" }, { "name": "ref", "type": "string" }, { "name": "path", "type": "string" }, { "name": "alt", "type": "string" }, { "name": "height", "type": "number" }] },
    { "name": "Tabs", "kind": "flow", "hasChildren": true, "preview": "tabs", "props": [{ "name": "groupId", "type": "string" }] },
    { "name": "TabItem", "kind": "flow", "hasChildren": true, "preview": "tab-item", "props": [{ "name": "value", "type": "string" }, { "name": "label", "type": "string" }, { "name": "default", "type": "boolean" }] }
  ]
}
```

- [ ] **Step 6: Failing test for the artifacts script**

`site/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { name: 'site', include: ['scripts/**/*.test.ts'] } });
```

`site/scripts/build-platform-artifacts.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildPlatformArtifacts } from './build-platform-artifacts.mjs';

describe('buildPlatformArtifacts', () => {
  it('copies components, versions and every manifest into static/platform', async () => {
    const site = await mkdtemp(path.join(tmpdir(), 'site-'));
    await mkdir(path.join(site, 'docs'), { recursive: true });
    await mkdir(path.join(site, 'versioned_docs/version-1.0.0'), { recursive: true });
    await writeFile(path.join(site, 'components.json'), '{"components":[]}');
    await writeFile(path.join(site, 'versions.json'), '["1.0.0"]');
    await writeFile(path.join(site, 'docs/manifest.json'), '[{"route":"/a"}]');
    await writeFile(path.join(site, 'versioned_docs/version-1.0.0/manifest.json'), '[{"route":"/b"}]');
    const written = await buildPlatformArtifacts(site);
    expect(written.sort()).toEqual(['components.json', 'manifest-1.0.0.json', 'manifest-current.json', 'versions.json']);
    expect(await readFile(path.join(site, 'static/platform/manifest-current.json'), 'utf8')).toBe('[{"route":"/a"}]');
    expect(JSON.parse(await readFile(path.join(site, 'static/platform/versions.json'), 'utf8'))).toEqual({ current: 'Latest', versions: ['1.0.0'] });
  });
});
```

Run: `cd site && npx vitest run`
Expected: FAIL (module missing).

- [ ] **Step 7: `site/scripts/build-platform-artifacts.mjs`** (search index is appended in Task 10)

```js
// Copies the OKF artifacts the editor and agents fetch at runtime into static/platform/.
// Runs as `prebuild`/`prestart`. Importable for tests; executes when run directly.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const exists = (p) => access(p).then(() => true, () => false);

export async function buildPlatformArtifacts(siteDir) {
  const out = path.join(siteDir, 'static', 'platform');
  await mkdir(out, { recursive: true });
  const written = [];
  const put = async (name, text) => { await writeFile(path.join(out, name), text); written.push(name); };

  await put('components.json', await readFile(path.join(siteDir, 'components.json'), 'utf8'));
  const versions = JSON.parse(await readFile(path.join(siteDir, 'versions.json'), 'utf8'));
  await put('versions.json', JSON.stringify({ current: 'Latest', versions }, null, 2) + '\n');

  const bundles = [['current', path.join(siteDir, 'docs')], ...versions.map((v) => [v, path.join(siteDir, 'versioned_docs', `version-${v}`)])];
  for (const [id, dir] of bundles) {
    const manifest = path.join(dir, 'manifest.json');
    if (await exists(manifest)) await put(`manifest-${id}.json`, await readFile(manifest, 'utf8'));
  }
  return written;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const written = await buildPlatformArtifacts(siteDir);
  console.log(`platform artifacts: ${written.join(', ')}`);
}
```

Run: `npx vitest run` (in `site`)
Expected: PASS.

- [ ] **Step 8: Install, build the site, verify removals**

```bash
npm install
npm run build -w @platform/site
grep -rn "Knowledge Graph\|okf-graph\|/viz\|site.config" site/src site/docusaurus.config.js ; echo "grep exit $? (expect 1 = nothing found)"
```

Expected: build succeeds; `site/build/index.html` exists; `site/build/viz/` and `site/build/editor/` do NOT exist; grep finds nothing. The 1.0.0 version currently has no docs (stub deleted) - if Docusaurus fails with "no docs in version 1.0.0", create `site/versioned_docs/version-1.0.0/index.md` with the same placeholder content as Step 4 (Task 7 replaces it).

- [ ] **Step 9: Commit**

```bash
git add -A site package.json package-lock.json
git commit -m "refactor(site): rename website to site, drop knowledge graph and embedded editor, read platform.config.js

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Demo content from okf-example, sample code repo, frozen 1.0.0, generated artifacts

**Files:**
- Create: `site/docs/**` (from `okf-example/docs`), `site/versioned_docs/version-1.0.0/**` (from `okf-example/docs-v1.0.0` plus new indexes), `examples/unity-project/**` (from `okf-example/unity-project` plus stubs), `site/docs/code-maps/RayanYousef--CloudDocumentationPersonal.md` (generated), `site/versioned_docs/version-1.0.0/code-maps/...` (generated)
- Modify: `site/docs/AGENTS.md`, `site/docs/systems/combat.md`, `site/docs/versions/1.0.0.json`, every page's `resource`/`sources`

**Interfaces:**
- Consumes: `npm run okf:generate` / `npm run okf:check` (Task 5), site build (Task 6).
- Produces: a validating Latest bundle at `site/docs`, a validating frozen bundle at `site/versioned_docs/version-1.0.0`, the sample code repo at `examples/unity-project`, all resource URLs resolving on GitHub.

- [ ] **Step 1: Move the demo content into place**

```bash
rm -f site/docs/index.md
cp -r okf-example/docs/. site/docs/
rm -f site/docs/manifest.json
mkdir -p examples
cp -r okf-example/unity-project examples/unity-project
rm -rf site/versioned_docs/version-1.0.0
mkdir -p site/versioned_docs/version-1.0.0/systems
cp okf-example/docs-v1.0.0/README.md site/versioned_docs/version-1.0.0/README.md
cp okf-example/docs-v1.0.0/systems/inventory.md site/versioned_docs/version-1.0.0/systems/inventory.md
cp okf-example/docs/AGENTS.md site/versioned_docs/version-1.0.0/AGENTS.md
```

- [ ] **Step 2: Complete the sample code repo (stubs for every cited path, real FBX meshes)**

```bash
cp site/static/models/fbx/cube.fbx examples/unity-project/Assets/Models/Airship.fbx
cp site/static/models/fbx/pyramid.fbx examples/unity-project/Assets/Models/Chest.fbx
mkdir -p examples/unity-project/Assets/Scripts/Combat examples/unity-project/Assets/Scripts/Persistence/Migrations examples/unity-project/Assets/Scripts/Net
```

`examples/unity-project/Assets/Scripts/Combat/DamagePipeline.cs`:

```csharp
namespace Skyforge.Combat
{
    /// <summary>Ordered list of IDamageModifier stages applied to every DamageEvent. Sample stub.</summary>
    public sealed class DamagePipeline { }
}
```

`examples/unity-project/Assets/Scripts/Combat/index.md`:

```markdown
# Combat

Damage pipeline and hit resolution. Every hit becomes a `DamageEvent` that passes through ordered modifier stages.

## Files

* [DamagePipeline.cs](DamagePipeline.cs) - ordered IDamageModifier stages: armour, resistances, crit roll, clamping.
```

`examples/unity-project/Assets/Scripts/Persistence/SaveService.cs`:

```csharp
namespace Skyforge.Persistence
{
    /// <summary>Serialises game state to gzipped JSON save slots and runs migrations on load. Sample stub.</summary>
    public sealed class SaveService { }
}
```

`examples/unity-project/Assets/Scripts/Persistence/Migrations/index.md`:

```markdown
# Migrations

One class per save-schema version bump; each rewrites an older JSON document into the next schema.

## Files

(no files yet - migrations are added when the save schema changes)
```

`examples/unity-project/Assets/Scripts/Persistence/index.md`:

```markdown
# Persistence

Save and load. `SaveService` owns the slot layout; `Migrations/` upgrades older files.

## Files

* [SaveService.cs](SaveService.cs) - writes gzipped JSON save slots and applies migrations when loading.

## Folders

* [Migrations](Migrations/) - schema upgrade steps, one per version bump.
```

`examples/unity-project/Assets/Scripts/Net/ReplicationService.cs`:

```csharp
namespace Skyforge.Net
{
    /// <summary>Host-authoritative replication of gameplay state to up to four crews. Sample stub.</summary>
    public sealed class ReplicationService { }
}
```

`examples/unity-project/Assets/Scripts/Net/LagCompensator.cs`:

```csharp
namespace Skyforge.Net
{
    /// <summary>Rewinds hit validation by up to 250 ms for high-latency clients. Sample stub.</summary>
    public sealed class LagCompensator { }
}
```

`examples/unity-project/Assets/Scripts/Net/index.md`:

```markdown
# Net

Networking layer: what is replicated, who is authoritative, and how late input is reconciled.

## Files

* [ReplicationService.cs](ReplicationService.cs) - host-authoritative state replication to clients.
* [LagCompensator.cs](LagCompensator.cs) - rewind window (250 ms cap) used to validate late hits.
```

Append to `examples/unity-project/Assets/Scripts/index.md` under `## Folders` (keep the existing Inventory bullet):

```markdown
* [Combat](Combat/) - damage pipeline and hit resolution.
* [Persistence](Persistence/) - save slots, JSON serialisation and migrations.
* [Net](Net/) - replication and lag compensation.
```

- [ ] **Step 3: Rewrite resource URLs to this repository and fix the broken link**

```bash
grep -rl "skyforge-studio/skyforge/blob/" site/docs site/versioned_docs | xargs sed -i 's#https://github.com/skyforge-studio/skyforge/blob/\([^/]*\)/#https://github.com/RayanYousef/CloudDocumentationPersonal/blob/\1/examples/unity-project/#g'
sed -i 's#see \[Status Effects\](status-effects.md)#see the Status Effects section below#; s#\[status-effects\](status-effects.md)#status effects#' site/docs/systems/combat.md
grep -n "status-effects.md" site/docs/systems/combat.md ; echo "expect no output above"
```

Open `site/docs/systems/combat.md` and confirm no `(status-effects.md)` link remains (if the sentence differs from the sed patterns, replace the link by plain text manually).

- [ ] **Step 4: Update `site/docs/AGENTS.md`** (replace items 11-12 and add generated code maps + log deviation)

Replace the numbered list items 7, 11 and 12 with:

```markdown
7. The blocks between `<!-- okf:index -->` and `<!-- /okf:index -->`, the whole of `manifest.json`, and every file under `code-maps/` are GENERATED. Never edit them by hand. `code-maps/<owner>--<repo>.md` is the reverse index from a code path to the pages that describe it.
11. Regenerate and validate from the repository root with `npm run okf:generate`; `npm run okf:check` validates without writing (CI runs it on every push). Declared code repositories come from `platform.config.js`.
12. The generator exits 1 on any problem (missing fields, broken links, bad or undeclared resource URLs, extra index keys, malformed log). Fix the report before finishing.
13. Documented deviation: `log.md` carries `title` and `sidebar_position` frontmatter so the site can render it; nothing else is allowed there.
```

Copy the updated file over `site/versioned_docs/version-1.0.0/AGENTS.md` as well.

- [ ] **Step 5: Frozen 1.0.0 root and systems indexes**

`site/versioned_docs/version-1.0.0/index.md`:

```markdown
---
title: Skyforge Documentation
sidebar_position: 1
okf_version: "0.2"
---

Skyforge 1.0.0 documentation, frozen against the commit recorded in the Latest bundle's `versions/1.0.0.json`. This snapshot is deliberately partial (see `README.md`): it keeps one system page to show how `resource` and `sources` switch from the branch to a commit sha.

<!-- okf:index -->
<!-- /okf:index -->
```

`site/versioned_docs/version-1.0.0/systems/index.md`:

```markdown
---
title: Systems
sidebar_position: 3
---

Runtime systems that make up the Skyforge gameplay layer as shipped in 1.0.0.

<!-- okf:index -->
<!-- /okf:index -->
```

- [ ] **Step 6: Commit the sample code repo first (its sha becomes the 1.0.0 pin)**

```bash
git add examples/unity-project
git commit -m "feat(examples): sample Unity project using the OKF code-project index convention

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
PIN=$(git rev-parse HEAD); echo $PIN
```

- [ ] **Step 7: Pin the frozen version to that sha**

```bash
sed -i "s#/blob/4f2a9c8e1b7d3a6f0c5e2b9d8a1f4c7e3b6d9a0f/#/blob/$PIN/#g" site/versioned_docs/version-1.0.0/systems/inventory.md
cat > site/docs/versions/1.0.0.json <<EOF
{
  "version": "1.0.0",
  "frozenAt": "2026-09-07T00:00:00Z",
  "pins": {
    "RayanYousef/CloudDocumentationPersonal": "$PIN"
  },
  "refs": {
    "RayanYousef/CloudDocumentationPersonal": "main"
  }
}
EOF
grep -c "$PIN" site/versioned_docs/version-1.0.0/systems/inventory.md   # expect 3
```

- [ ] **Step 8: Generate, check, build**

```bash
npm run build -w @platform/okf-core
npm run okf:generate   # expect: "okf generate: OK" for both bundles
npm run okf:check      # expect exit 0
npm run build -w @platform/site
```

Expected: both bundles OK; `site/docs/manifest.json`, `site/docs/code-maps/RayanYousef--CloudDocumentationPersonal.md`, `site/versioned_docs/version-1.0.0/manifest.json` and its code map exist; site build passes; `site/build/systems/inventory/index.html` and `site/build/1.0.0/systems/inventory/index.html` exist; `site/build/AGENTS/` does NOT exist; `site/build/log/index.html` exists. If `okf:check` reports a problem, fix the content (never the validator) and re-run.

- [ ] **Step 9: Commit**

```bash
git add -A site
git commit -m "feat(site): Skyforge demo bundle as Latest docs and frozen 1.0.0 with pinned resources

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Auth service - GithubTokenProvider and MockAuthProvider

**Files:**
- Create: `services/auth/package.json`, `services/auth/tsconfig.json`, `services/auth/vitest.config.ts`, `services/auth/src/GithubTokenProvider.ts`, `services/auth/src/MockAuthProvider.ts`, `services/auth/src/index.ts`, `services/auth/test/fakeGithubAuth.ts`, `services/auth/test/GithubTokenProvider.test.ts`, `services/auth/test/MockAuthProvider.test.ts`

**Interfaces:**
- Consumes: `AuthProvider`, `AuthError`, `Credentials`, `Session`, `Identity` from `@platform/contracts`; `describeAuthProviderContract` from `@platform/contracts/testing`.
- Produces:

```ts
export interface GithubTokenProviderOptions { owner: string; repo: string; fetch?: typeof fetch; apiRoot?: string }
export class GithubTokenProvider implements AuthProvider { readonly id = 'github-token'; constructor(opts: GithubTokenProviderOptions) }
export class MockAuthProvider implements AuthProvider { readonly id = 'mock'; constructor(users?: Array<{ name: string; role: Role }>) }
```

- [ ] **Step 1: Package files**

`services/auth/package.json`:

```json
{
  "name": "@platform/auth",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } },
  "scripts": { "build": "tsc -b", "test": "vitest run" },
  "dependencies": { "@platform/contracts": "*" },
  "devDependencies": { "typescript": "^5.7.2", "vitest": "^3.0.0" }
}
```

`services/auth/tsconfig.json`:

```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "rootDir": "src", "outDir": "dist" }, "include": ["src"], "references": [{ "path": "../../packages/contracts" }] }
```

`services/auth/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { name: 'auth', include: ['test/**/*.test.ts'] } });
```

- [ ] **Step 2: Fake GitHub auth endpoints + failing tests**

`services/auth/test/fakeGithubAuth.ts`:

```ts
/** Minimal fetch stub for GET /repos/:o/:r and GET /user keyed by token. */
export interface FakeUser { login: string; name: string; email: string | null; push: boolean }

export function fakeGithubFetch(users: Record<string, FakeUser>): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const auth = (init?.headers as Record<string, string> | undefined)?.['Authorization'] ?? '';
    const token = auth.replace(/^Bearer /, '');
    const user = users[token];
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (!user) return json(401, { message: 'Bad credentials' });
    if (/\/repos\/[^/]+\/[^/]+$/.test(url)) return json(200, { full_name: 'o/r', permissions: { push: user.push, pull: true } });
    if (/\/user$/.test(url)) return json(200, { login: user.login, name: user.name, email: user.email });
    return json(404, { message: 'Not Found' });
  }) as typeof fetch;
}
```

`services/auth/test/GithubTokenProvider.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { describeAuthProviderContract } from '@platform/contracts/testing';
import { GithubTokenProvider } from '../src/index.js';
import { fakeGithubFetch } from './fakeGithubAuth.js';

const users = {
  'ghp_writer': { login: 'rayan', name: 'Rayan Yousef', email: null, push: true },
  'ghp_reader': { login: 'guest', name: 'Guest', email: 'g@example.com', push: false },
};
const make = () => new GithubTokenProvider({ owner: 'RayanYousef', repo: 'CloudDocumentationPersonal', fetch: fakeGithubFetch(users) });

describeAuthProviderContract('GithubTokenProvider', async () => ({
  provider: make(),
  validCredentials: { kind: 'github-token', token: 'ghp_writer' },
  invalidCredentials: { kind: 'github-token', token: 'ghp_nope' },
  nonCollaboratorCredentials: { kind: 'github-token', token: 'ghp_reader' },
}));

describe('GithubTokenProvider specifics', () => {
  it('names the repo in the NOT_COLLABORATOR message and sets role editor for writers', async () => {
    const p = make();
    await expect(p.login({ kind: 'github-token', token: 'ghp_reader' })).rejects.toThrow('You are not a write collaborator of RayanYousef/CloudDocumentationPersonal');
    const id = await p.verify(await p.login({ kind: 'github-token', token: 'ghp_writer' }));
    expect(id).toEqual({ name: 'Rayan Yousef', login: 'rayan', email: null, role: 'editor' });
  });
  it('sends the token as a Bearer header with the GitHub API version', async () => {
    let seen: Record<string, string> | undefined;
    const spy: typeof fetch = async (input, init) => { seen = init?.headers as Record<string, string>; return fakeGithubFetch(users)(input, init); };
    await new GithubTokenProvider({ owner: 'o', repo: 'r', fetch: spy }).login({ kind: 'github-token', token: 'ghp_writer' });
    expect(seen).toMatchObject({ Authorization: 'Bearer ghp_writer', 'X-GitHub-Api-Version': '2022-11-28' });
  });
});
```

`services/auth/test/MockAuthProvider.test.ts`:

```ts
import { describeAuthProviderContract } from '@platform/contracts/testing';
import { MockAuthProvider } from '../src/index.js';

describeAuthProviderContract('MockAuthProvider', async () => ({
  provider: new MockAuthProvider(),
  validCredentials: { kind: 'mock', name: 'Mock Editor', role: 'editor' },
  invalidCredentials: { kind: 'mock', name: '', role: 'editor' },
}));
```

Run: `cd services/auth && npx vitest run`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `GithubTokenProvider.ts`**

```ts
import { AuthError, type AuthProvider, type Credentials, type Identity, type Session } from '@platform/contracts';

export interface GithubTokenProviderOptions { owner: string; repo: string; fetch?: typeof fetch; apiRoot?: string }

/**
 * Fine-grained PAT authentication. A session is valid only when the token can read the
 * repository AND has push permission; the identity comes from GET /user.
 */
export class GithubTokenProvider implements AuthProvider {
  readonly id = 'github-token';
  private readonly fetchImpl: typeof fetch;
  private readonly apiRoot: string;
  constructor(private readonly opts: GithubTokenProviderOptions) {
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.apiRoot = opts.apiRoot ?? 'https://api.github.com';
  }

  async login(credentials: Credentials): Promise<Session> {
    if (credentials.kind !== 'github-token') throw new AuthError('UNSUPPORTED_CREDENTIALS', `GithubTokenProvider cannot log in with "${credentials.kind}" credentials`);
    const session: Session = { provider: this.id, token: credentials.token.trim(), createdAt: new Date().toISOString() };
    await this.verify(session);
    return session;
  }

  async verify(session: Session): Promise<Identity> {
    if (session.provider !== this.id || !session.token) throw new AuthError('INVALID_CREDENTIALS', 'Session does not belong to the GitHub token provider');
    const repoName = `${this.opts.owner}/${this.opts.repo}`;
    const repo = await this.get<{ permissions?: { push?: boolean } }>(`/repos/${this.opts.owner}/${this.opts.repo}`, session.token);
    if (repo.permissions?.push !== true) throw new AuthError('NOT_COLLABORATOR', `You are not a write collaborator of ${repoName}. Ask a repository admin for write access, then create a fine-grained token with Contents: Read and write.`);
    const user = await this.get<{ login: string; name: string | null; email: string | null }>('/user', session.token);
    return { name: user.name || user.login, login: user.login, email: user.email ?? null, role: 'editor' };
  }

  private async get<T>(path: string, token: string): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.apiRoot}${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
    } catch (e) {
      throw new AuthError('NETWORK', `GitHub is unreachable: ${(e as Error).message}`);
    }
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      throw new AuthError('INVALID_CREDENTIALS', `GitHub rejected the token for ${path} (HTTP ${res.status}). Check the token, its expiry and that it is scoped to ${this.opts.owner}/${this.opts.repo}.`);
    }
    if (!res.ok) throw new AuthError('NETWORK', `GitHub API ${res.status} for ${path}`);
    return (await res.json()) as T;
  }
}
```

- [ ] **Step 4: Implement `MockAuthProvider.ts` and `index.ts`**

```ts
import { AuthError, type AuthProvider, type Credentials, type Identity, type Role, type Session } from '@platform/contracts';

/** Test/e2e provider: the token encodes the identity; no network. */
export class MockAuthProvider implements AuthProvider {
  readonly id = 'mock';
  async login(credentials: Credentials): Promise<Session> {
    if (credentials.kind !== 'mock') throw new AuthError('UNSUPPORTED_CREDENTIALS', 'MockAuthProvider only accepts mock credentials');
    if (!credentials.name.trim()) throw new AuthError('INVALID_CREDENTIALS', 'A name is required');
    const payload = JSON.stringify({ name: credentials.name, role: credentials.role });
    return { provider: this.id, token: `mock.${btoa(payload)}`, createdAt: new Date().toISOString() };
  }
  async verify(session: Session): Promise<Identity> {
    if (session.provider !== this.id || !session.token.startsWith('mock.')) throw new AuthError('INVALID_CREDENTIALS', 'Not a mock session');
    try {
      const { name, role } = JSON.parse(atob(session.token.slice(5))) as { name: string; role: Role };
      if (!name || !['viewer', 'editor'].includes(role)) throw new Error();
      return { name, login: name.toLowerCase().replace(/\s+/g, '-'), email: null, role };
    } catch {
      throw new AuthError('INVALID_CREDENTIALS', 'Mock session is corrupt');
    }
  }
}
```

`src/index.ts`:

```ts
export * from './GithubTokenProvider.js';
export * from './MockAuthProvider.js';
```

Run: `npx vitest run && npx tsc -b`
Expected: PASS (both contract suites + specifics).

- [ ] **Step 5: Commit**

```bash
git add services/auth package-lock.json
git commit -m "feat(auth): GithubTokenProvider requiring push permission, MockAuthProvider

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 9: Content service - layout, write pipeline, search and LocalFolderBackend

**Files:**
- Create: `services/content/package.json` (replace stub), `services/content/tsconfig.json`, `services/content/vitest.config.ts`, `services/content/src/layout.ts`, `services/content/src/writePipeline.ts`, `services/content/src/publishPipeline.ts`, `services/content/src/search/index.ts`, `services/content/src/assets/getAsset.ts`, `services/content/src/local/git.ts`, `services/content/src/local/LocalFolderBackend.ts`, `services/content/src/index.ts`, `services/content/test/writePipeline.test.ts`, `services/content/test/localHarness.ts`, `services/content/test/LocalFolderBackend.test.ts`

**Interfaces:**
- Consumes: `@platform/contracts` types (Task 2); `generateBundle`, `validatePage`, `prependLogEntries`, `rewriteRefs`, `analyzeBundle`, `parseFrontmatter`, `isConceptPage`, `codeMapPath` from `@platform/okf-core`; `readBundle`, `writeFiles` from `@platform/okf-core/node`.
- Produces:

```ts
// layout.ts
export function versionDir(version: VersionId): string            // 'docs' | 'versioned_docs/version-<v>'
export function isFrozen(version: VersionId): boolean
export function assetKind(path: string): AssetInfo['kind']
export const STATIC_DIR = 'static'; export const ASSET_DIRS = ['models', 'uploads', 'img'];
// writePipeline.ts
export interface PageChange { path: string; text: string | null }   // null = delete
export interface ChangeSet { writes: Record<string, string>; deletes: string[]; regenerated: string[] }
export function planPageChanges(files: Record<string, string>, changes: PageChange[], ctx: { codeRepos: CodeRepoRef[]; author: string; message: string; date: string }): ChangeSet   // throws ContentError('VALIDATION')
export function contentEtag(text: string): string                  // fnv-1a 64-bit hex of the text
// publishPipeline.ts
export interface PublishPlan { writes: Record<string, string>; tag: string; pins: Record<string, string> }  // keys are site-relative paths
export function planPublish(latest: Record<string, string>, version: string, versionsJson: string[], codeRepos: CodeRepoRef[], pins: Record<string, string>, frozenAt: string): PublishPlan
// search/index.ts
export async function buildSearchIndex(files: Record<string, string>): Promise<unknown>   // Orama RawData (JSON-serialisable)
export async function searchRaw(raw: unknown, query: string): Promise<SearchHit[]>
// assets/getAsset.ts
export function assetUrls(ref: AssetRef): { media: string; raw: string }
export async function fetchAsset(ref: AssetRef, opts?: { token?: string | null; fetch?: typeof fetch; cache?: CacheStorage | null }): Promise<Blob>
// local/LocalFolderBackend.ts
export interface LocalFolderBackendOptions { siteDir: string; codeRepos: CodeRepoRef[]; resolveRef?: (repo: CodeRepoRef) => Promise<string>; fetch?: typeof fetch }
export class LocalFolderBackend implements ContentBackend { readonly id = 'local-folder'; constructor(opts: LocalFolderBackendOptions) }
```

- [ ] **Step 1: Package files**

`services/content/package.json`:

```json
{
  "name": "@platform/content",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./node": { "types": "./dist/node.d.ts", "default": "./dist/node.js" }
  },
  "scripts": { "build": "tsc -b", "test": "vitest run" },
  "dependencies": { "@orama/orama": "^3.0.0", "@platform/contracts": "*", "@platform/okf-core": "*" },
  "devDependencies": { "typescript": "^5.7.2", "vitest": "^3.0.0" }
}
```

`services/content/tsconfig.json`:

```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "rootDir": "src", "outDir": "dist", "types": ["node"] }, "include": ["src"], "references": [{ "path": "../../packages/contracts" }, { "path": "../../packages/okf-core" }] }
```

`services/content/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { name: 'content', include: ['test/**/*.test.ts'], testTimeout: 30000, hookTimeout: 30000 } });
```

Note: the browser entry (`.`) must not import Node modules; Node-only code (`LocalFolderBackend`, `serveContentBackend`) is exported from `src/node.ts` only.

- [ ] **Step 2: Failing pipeline tests**

`services/content/test/writePipeline.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { MINI_BUNDLE, MINI_CODE_REPOS, NEW_PAGE_TEXT, INVALID_PAGE_TEXT } from '@platform/contracts/testing';
import { planPageChanges, planPublish } from '../src/index.js';

const ctx = { codeRepos: MINI_CODE_REPOS, author: 'Rayan Yousef', message: 'Add combat', date: '2026-09-07' };

describe('planPageChanges', () => {
  it('adds the page, regenerates the folder index, manifest, code map and log', () => {
    const cs = planPageChanges(MINI_BUNDLE, [{ path: 'systems/combat.md', text: NEW_PAGE_TEXT }], ctx);
    expect(Object.keys(cs.writes).sort()).toEqual(['code-maps/acme--game.md', 'log.md', 'manifest.json', 'systems/combat.md', 'systems/index.md']);
    expect(cs.regenerated.sort()).toEqual(['code-maps/acme--game.md', 'log.md', 'manifest.json', 'systems/index.md']);
    expect(cs.writes['log.md']).toContain('## 2026-09-07\n\n* **Add**: [Combat](/systems/combat.md) - Add combat. (by Rayan Yousef)');
    expect(cs.deletes).toEqual([]);
  });
  it('logs Update for an existing page', () => {
    const cs = planPageChanges(MINI_BUNDLE, [{ path: 'systems/inventory.md', text: MINI_BUNDLE['systems/inventory.md']! + '\nMore.\n' }], { ...ctx, message: 'Expand' });
    expect(cs.writes['log.md']).toContain('* **Update**: [Inventory](/systems/inventory.md) - Expand. (by Rayan Yousef)');
    expect(cs.writes['manifest.json']).toBeUndefined();
  });
  it('deletes remove the bullet and the manifest entry', () => {
    const files = { ...MINI_BUNDLE, 'systems/combat.md': NEW_PAGE_TEXT };
    const cs = planPageChanges(files, [{ path: 'systems/combat.md', text: null }], ctx);
    expect(cs.deletes).toEqual(['systems/combat.md']);
    expect(cs.writes['systems/index.md']).not.toContain('combat.md');
  });
  it('throws VALIDATION with problems for an invalid page', () => {
    expect(() => planPageChanges(MINI_BUNDLE, [{ path: 'systems/bad.md', text: INVALID_PAGE_TEXT }], ctx)).toThrow(expect.objectContaining({ code: 'VALIDATION' }));
  });
});

describe('planPublish', () => {
  const sha = 'c'.repeat(40);
  it('snapshots with rewritten refs, writes pins, sidebars and versions.json', () => {
    const plan = planPublish(MINI_BUNDLE, '1.1.0', [], MINI_CODE_REPOS, { 'acme/game': sha }, '2026-09-07T00:00:00Z');
    expect(plan.tag).toBe('docs-v1.1.0');
    expect(plan.writes['versioned_docs/version-1.1.0/systems/inventory.md']).toContain(`/blob/${sha}/Assets/Scripts/Inventory`);
    expect(plan.writes['versioned_docs/version-1.1.0/manifest.json']).toContain(`/blob/${sha}/`);
    expect(plan.writes['versioned_docs/version-1.1.0/code-maps/acme--game.md']).toBeDefined();
    expect(JSON.parse(plan.writes['docs/versions/1.1.0.json']!)).toEqual({ version: '1.1.0', frozenAt: '2026-09-07T00:00:00Z', pins: { 'acme/game': sha }, refs: { 'acme/game': 'main' } });
    expect(JSON.parse(plan.writes['versions.json']!)).toEqual(['1.1.0']);
    expect(JSON.parse(plan.writes['versioned_sidebars/version-1.1.0-sidebars.json']!)).toEqual({ docsSidebar: [{ type: 'autogenerated', dirName: '.' }] });
  });
  it('refuses an existing version with EXISTS', () => {
    expect(() => planPublish(MINI_BUNDLE, '1.0.0', ['1.0.0'], MINI_CODE_REPOS, { 'acme/game': sha }, '2026-09-07T00:00:00Z')).toThrow(expect.objectContaining({ code: 'EXISTS' }));
  });
});
```

Run: `cd services/content && npx vitest run test/writePipeline.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `layout.ts`, `writePipeline.ts`, `publishPipeline.ts`**

`src/layout.ts`:

```ts
import { CURRENT_VERSION, type AssetInfo, type VersionId } from '@platform/contracts';

export const versionDir = (version: VersionId): string => (version === CURRENT_VERSION ? 'docs' : `versioned_docs/version-${version}`);
export const isFrozen = (version: VersionId): boolean => version !== CURRENT_VERSION;
export const STATIC_DIR = 'static';
export const ASSET_DIRS = ['models', 'uploads', 'img'];
const MODEL_EXT = new Set(['glb', 'gltf', 'fbx']);
const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp']);
export function assetKind(path: string): AssetInfo['kind'] {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  return MODEL_EXT.has(ext) ? 'model' : IMAGE_EXT.has(ext) ? 'image' : 'other';
}
export function assertPagePath(path: string): void {
  if (!/^(?:[\w.-]+\/)*[\w.-]+\.mdx?$/.test(path) || path.split('/').some((s) => s === '..' || s.startsWith('.'))) {
    throw new Error(`Invalid page path: ${path}`);
  }
}
```

`src/writePipeline.ts`:

```ts
import { ContentError, type CodeRepoRef } from '@platform/contracts';
import { generateBundle, parseFrontmatter, prependLogEntries, validatePage, isConceptPage, type LogEntry } from '@platform/okf-core';

export interface PageChange { path: string; text: string | null }
export interface ChangeSet { writes: Record<string, string>; deletes: string[]; regenerated: string[] }
export interface ChangeContext { codeRepos: CodeRepoRef[]; author: string; message: string; date: string }

const EMPTY_LOG = '---\ntitle: Change Log\nsidebar_position: 99\n---\n\nNewest first. Each entry names the page that changed and who changed it.\n';

/** FNV-1a 64-bit hex digest: a stable etag that works in browsers and Node without crypto. */
export function contentEtag(text: string): string {
  let h = 0xcbf29ce484222325n;
  for (const ch of new TextEncoder().encode(text)) { h ^= BigInt(ch); h = (h * 0x100000001b3n) & 0xffffffffffffffffn; }
  return h.toString(16).padStart(16, '0');
}

/** Apply page changes to a bundle, validate, regenerate, and log. Pure: returns what to write/delete. */
export function planPageChanges(files: Record<string, string>, changes: PageChange[], ctx: ChangeContext): ChangeSet {
  const next: Record<string, string> = { ...files };
  const entries: LogEntry[] = [];
  const writes: Record<string, string> = {};
  const deletes: string[] = [];
  for (const c of changes) {
    if (c.text === null) { delete next[c.path]; deletes.push(c.path); continue; }
    const action: LogEntry['action'] = files[c.path] === undefined ? 'Add' : 'Update';
    next[c.path] = c.text;
    writes[c.path] = c.text;
    if (isConceptPage(c.path)) {
      const title = String(parseFrontmatter(c.text).data?.['title'] ?? c.path);
      entries.push({ action, title, path: `/${c.path}`, summary: ctx.message, author: ctx.author });
    }
  }
  const problems = changes.flatMap((c) => (c.text !== null && isConceptPage(c.path) ? validatePage(c.path, c.text, { codeRepos: ctx.codeRepos, files: next }) : []));
  if (problems.length) throw new ContentError('VALIDATION', `Page has ${problems.length} problem(s)`, problems);
  const gen = generateBundle(next, { codeRepos: ctx.codeRepos });
  if (gen.problems.length) throw new ContentError('VALIDATION', `Bundle has ${gen.problems.length} problem(s) after this change`, gen.problems);
  const regenerated = Object.keys(gen.writes);
  Object.assign(writes, gen.writes);
  if (entries.length) {
    const log = prependLogEntries(next['log.md'] ?? EMPTY_LOG, ctx.date, entries);
    writes['log.md'] = log;
    regenerated.push('log.md');
  }
  return { writes, deletes, regenerated };
}
```

`src/publishPipeline.ts`:

```ts
import { ContentError, type CodeRepoRef, repoKey } from '@platform/contracts';
import { generateBundle, rewriteRefs, type RefRewrite } from '@platform/okf-core';

export interface PublishPlan { writes: Record<string, string>; tag: string; pins: Record<string, string> }

export function planPublish(latest: Record<string, string>, version: string, versionsJson: string[], codeRepos: CodeRepoRef[], pins: Record<string, string>, frozenAt: string): PublishPlan {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new ContentError('VALIDATION', `Version must look like 1.2.3, got "${version}"`);
  if (versionsJson.includes(version)) throw new ContentError('EXISTS', `Version ${version} already exists`);
  const rewrites: Record<string, RefRewrite> = {};
  const refs: Record<string, string> = {};
  for (const r of codeRepos) {
    const key = repoKey(r);
    const sha = pins[key];
    if (!sha) throw new ContentError('VALIDATION', `No pin resolved for ${key}`);
    rewrites[key] = { from: r.defaultRef, to: sha };
    refs[key] = r.defaultRef;
  }
  const snapshot: Record<string, string> = {};
  for (const [path, text] of Object.entries(latest)) {
    if (path.startsWith('versions/')) continue;
    snapshot[path] = rewriteRefs(text, rewrites);
  }
  const gen = generateBundle(snapshot, { codeRepos });
  if (gen.problems.length) throw new ContentError('VALIDATION', 'Latest bundle must validate before publishing', gen.problems);
  Object.assign(snapshot, gen.writes);
  const dir = `versioned_docs/version-${version}`;
  const writes: Record<string, string> = {};
  for (const [path, text] of Object.entries(snapshot)) writes[`${dir}/${path}`] = text;
  writes[`docs/versions/${version}.json`] = JSON.stringify({ version, frozenAt, pins, refs }, null, 2) + '\n';
  writes[`versioned_sidebars/version-${version}-sidebars.json`] = JSON.stringify({ docsSidebar: [{ type: 'autogenerated', dirName: '.' }] }, null, 2) + '\n';
  writes['versions.json'] = JSON.stringify([version, ...versionsJson], null, 2) + '\n';
  return { writes, tag: `docs-v${version}`, pins };
}
```

`src/index.ts` (browser-safe entry; grows in Task 10):

```ts
export * from './layout.js';
export * from './writePipeline.js';
export * from './publishPipeline.js';
export * from './search/index.js';
export * from './assets/getAsset.js';
```

- [ ] **Step 4: Implement `search/index.ts` and `assets/getAsset.ts`**

`src/search/index.ts`:

```ts
import { create, insert, search, save, load } from '@orama/orama';
import type { SearchHit } from '@platform/contracts';
import { analyzeBundle } from '@platform/okf-core';

const schema = { path: 'string', title: 'string', description: 'string', type: 'string', tags: 'string', body: 'string' } as const;

/** Build a serialisable Orama index over every concept page (frontmatter + first 2000 body chars). */
export async function buildSearchIndex(files: Record<string, string>): Promise<unknown> {
  const db = create({ schema });
  for (const p of analyzeBundle(files).pages) {
    if (!p.meta) continue;
    await insert(db, { path: p.path, title: p.meta.title, description: p.meta.description, type: p.meta.type, tags: p.meta.tags.join(' '), body: p.body.slice(0, 2000) });
  }
  return save(db);
}

export async function searchRaw(raw: unknown, query: string): Promise<SearchHit[]> {
  const db = create({ schema });
  load(db, raw as Parameters<typeof load>[1]);
  const res = await search(db, { term: query, properties: ['title', 'description', 'tags', 'body'], limit: 20 });
  return res.hits.map((h) => ({ path: h.document.path, title: h.document.title, description: h.document.description, score: h.score }));
}
```

`src/assets/getAsset.ts`:

```ts
import { ContentError, type AssetRef } from '@platform/contracts';

export const MAX_ASSET_BYTES = 100 * 1024 * 1024;
const CACHE_NAME = 'docs-platform-assets';
const BRANCH_TTL_MS = 10 * 60 * 1000;

export function assetUrls(ref: AssetRef): { media: string; raw: string } {
  const [owner, repo] = ref.repo.split('/');
  const path = ref.path.split('/').map(encodeURIComponent).join('/');
  return {
    media: `https://media.githubusercontent.com/media/${owner}/${repo}/${ref.ref}/${path}`,
    raw: `https://raw.githubusercontent.com/${owner}/${repo}/${ref.ref}/${path}`,
  };
}

const isSha = (ref: string): boolean => /^[0-9a-f]{40}$/.test(ref);

/** Fetch a file from a code repo at a ref; LFS-aware via the media endpoint; cached with the Cache API when available. */
export async function fetchAsset(ref: AssetRef, opts: { token?: string | null; fetch?: typeof fetch; cache?: CacheStorage | null } = {}): Promise<Blob> {
  const f = opts.fetch ?? globalThis.fetch.bind(globalThis);
  const cacheStore = opts.cache === undefined ? (typeof caches !== 'undefined' ? caches : null) : opts.cache;
  const key = `https://asset.cache/${ref.repo}@${ref.ref}/${ref.path}`;
  const cache = cacheStore ? await cacheStore.open(CACHE_NAME) : null;
  if (cache) {
    const hit = await cache.match(key);
    if (hit) {
      const at = Number(hit.headers.get('x-cached-at') ?? 0);
      if (isSha(ref.ref) || Date.now() - at < BRANCH_TTL_MS) return hit.blob();
    }
  }
  const headers: Record<string, string> = opts.token ? { Authorization: `token ${opts.token}` } : {};
  const urls = assetUrls(ref);
  let res: Response | null = null;
  for (const url of [urls.media, urls.raw]) {
    try { res = await f(url, { headers }); } catch (e) { throw new ContentError('NETWORK', `Cannot reach ${url}: ${(e as Error).message}`); }
    if (res.ok) break;
    if (res.status === 404 || res.status === 403) continue;
    throw new ContentError('NETWORK', `HTTP ${res.status} fetching ${url}`);
  }
  if (!res || !res.ok) throw new ContentError('NOT_FOUND', `Asset not found: ${ref.repo}@${ref.ref}/${ref.path}`);
  const len = Number(res.headers.get('content-length') ?? 0);
  if (len > MAX_ASSET_BYTES) throw new ContentError('TOO_LARGE', `Asset is ${len} bytes; the limit is ${MAX_ASSET_BYTES}`);
  const blob = await res.blob();
  if (blob.size > MAX_ASSET_BYTES) throw new ContentError('TOO_LARGE', `Asset is ${blob.size} bytes; the limit is ${MAX_ASSET_BYTES}`);
  if (cache) await cache.put(key, new Response(blob, { headers: { 'x-cached-at': String(Date.now()), 'content-type': blob.type || 'application/octet-stream' } }));
  return blob;
}
```

Run: `npx vitest run test/writePipeline.test.ts`
Expected: PASS.

- [ ] **Step 5: Git helper and LocalFolderBackend, with the contract harness**

`src/local/git.ts`:

```ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Author } from '@platform/contracts';

const run = promisify(execFile);

export async function git(cwd: string, ...args: string[]): Promise<string> {
  const { stdout } = await run('git', args, { cwd, maxBuffer: 64 * 1024 * 1024 });
  return stdout.trim();
}

export async function commitAll(cwd: string, message: string, author: Author): Promise<string> {
  await git(cwd, 'add', '-A');
  await git(cwd, '-c', `user.name=${author.name}`, '-c', `user.email=${author.email}`, 'commit', '-q', '-m', message, '--author', `${author.name} <${author.email}>`);
  return git(cwd, 'rev-parse', 'HEAD');
}

export const createTag = (cwd: string, name: string, sha: string): Promise<string> => git(cwd, 'tag', name, sha);
export const listTags = async (cwd: string): Promise<string[]> => (await git(cwd, 'tag', '--list')).split('\n').filter(Boolean);
```

`src/local/LocalFolderBackend.ts`:

```ts
import { readFile, writeFile, mkdir, rm, readdir, stat, access } from 'node:fs/promises';
import path from 'node:path';
import {
  ContentError, CURRENT_VERSION, repoKey,
  type AssetInfo, type AssetRef, type CodeRepoRef, type ContentBackend, type MutationOptions, type PageContent,
  type PageSummary, type PublishResult, type SearchHit, type VersionId, type VersionInfo, type WriteOptions, type WriteResult,
} from '@platform/contracts';
import { analyzeBundle } from '@platform/okf-core';
import { readBundle, writeFiles } from '@platform/okf-core/node';
import { versionDir, isFrozen, assetKind, STATIC_DIR, ASSET_DIRS, assertPagePath } from '../layout.js';
import { planPageChanges, contentEtag, type PageChange } from '../writePipeline.js';
import { planPublish } from '../publishPipeline.js';
import { buildSearchIndex, searchRaw } from '../search/index.js';
import { fetchAsset } from '../assets/getAsset.js';
import { commitAll, createTag } from './git.js';

export interface LocalFolderBackendOptions { siteDir: string; codeRepos: CodeRepoRef[]; resolveRef?: (repo: CodeRepoRef) => Promise<string>; fetch?: typeof fetch }

const exists = (p: string): Promise<boolean> => access(p).then(() => true, () => false);
const today = (): string => new Date().toISOString().slice(0, 10);

/** Filesystem + git CLI backend for development, tests and the e2e. */
export class LocalFolderBackend implements ContentBackend {
  readonly id = 'local-folder';
  private searchCache = new Map<VersionId, unknown>();
  constructor(private readonly opts: LocalFolderBackendOptions) {}

  private abs(...segs: string[]): string { return path.join(this.opts.siteDir, ...segs); }
  private bundleDir(version: VersionId): string { return this.abs(...versionDir(version).split('/')); }

  private async versionsJson(): Promise<string[]> {
    const p = this.abs('versions.json');
    return (await exists(p)) ? (JSON.parse(await readFile(p, 'utf8')) as string[]) : [];
  }

  async listVersions(): Promise<VersionInfo[]> {
    return [{ id: CURRENT_VERSION, label: 'Latest', frozen: false }, ...(await this.versionsJson()).map((v) => ({ id: v, label: v, frozen: true }))];
  }

  async listPages(version: VersionId): Promise<PageSummary[]> {
    const files = await readBundle(this.bundleDir(version));
    return analyzeBundle(files).pages.filter((p) => p.meta).map((p) => ({ path: p.path, title: p.meta!.title, description: p.meta!.description, type: p.meta!.type, tags: p.meta!.tags }));
  }

  async readPage(version: VersionId, pagePath: string): Promise<PageContent> {
    assertPagePath(pagePath);
    const abs = path.join(this.bundleDir(version), ...pagePath.split('/'));
    if (!(await exists(abs))) throw new ContentError('NOT_FOUND', `No page at ${pagePath} in ${version}`);
    const text = await readFile(abs, 'utf8');
    return { path: pagePath, text, etag: contentEtag(text) };
  }

  private async commitChanges(version: VersionId, changes: PageChange[], opts: MutationOptions): Promise<WriteResult> {
    if (isFrozen(version)) throw new ContentError('FROZEN', `Version ${version} is frozen; edit the Latest docs instead`);
    const dir = this.bundleDir(version);
    const files = await readBundle(dir);
    const cs = planPageChanges(files, changes, { codeRepos: this.opts.codeRepos, author: opts.author.name, message: opts.message, date: today() });
    await writeFiles(dir, cs.writes);
    for (const d of cs.deletes) await rm(path.join(dir, ...d.split('/')), { force: true });
    const sha = await commitAll(this.opts.siteDir, opts.message, opts.author);
    this.searchCache.delete(version);
    const last = changes.filter((c) => c.text !== null).at(-1);
    return { commitSha: sha, commitUrl: null, etag: last?.text ? contentEtag(last.text) : '', regenerated: cs.regenerated };
  }

  async writePage(version: VersionId, pagePath: string, text: string, opts: WriteOptions): Promise<WriteResult> {
    if (isFrozen(version)) throw new ContentError('FROZEN', `Version ${version} is frozen; edit the Latest docs instead`);
    const current = await this.readPage(version, pagePath);
    if (opts.expectedEtag && opts.expectedEtag !== current.etag) throw new ContentError('CONFLICT', `${pagePath} changed since you loaded it; reload and re-apply your edits`);
    return this.commitChanges(version, [{ path: pagePath, text }], opts);
  }

  async createPage(version: VersionId, pagePath: string, text: string, opts: MutationOptions): Promise<WriteResult> {
    if (isFrozen(version)) throw new ContentError('FROZEN', `Version ${version} is frozen`);
    assertPagePath(pagePath);
    if (await exists(path.join(this.bundleDir(version), ...pagePath.split('/')))) throw new ContentError('EXISTS', `${pagePath} already exists`);
    return this.commitChanges(version, [{ path: pagePath, text }], opts);
  }

  async deletePage(version: VersionId, pagePath: string, opts: MutationOptions): Promise<WriteResult> {
    await this.readPage(version, pagePath);
    return this.commitChanges(version, [{ path: pagePath, text: null }], opts);
  }

  async renamePage(version: VersionId, from: string, to: string, opts: MutationOptions): Promise<WriteResult> {
    const page = await this.readPage(version, from);
    assertPagePath(to);
    if (await exists(path.join(this.bundleDir(version), ...to.split('/')))) throw new ContentError('EXISTS', `${to} already exists`);
    return this.commitChanges(version, [{ path: from, text: null }, { path: to, text: page.text }], opts);
  }

  async uploadAsset(assetPath: string, bytes: Uint8Array, opts: MutationOptions): Promise<WriteResult & { asset: AssetInfo }> {
    if (assetPath.split('/').some((s) => s === '..' || s === '')) throw new ContentError('VALIDATION', `Invalid asset path ${assetPath}`);
    const abs = this.abs(STATIC_DIR, ...assetPath.split('/'));
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, bytes);
    const sha = await commitAll(this.opts.siteDir, opts.message, opts.author);
    const asset: AssetInfo = { path: assetPath, url: `/${assetPath}`, size: bytes.byteLength, kind: assetKind(assetPath) };
    return { commitSha: sha, commitUrl: null, etag: '', regenerated: [], asset };
  }

  async listAssets(): Promise<AssetInfo[]> {
    const out: AssetInfo[] = [];
    for (const d of ASSET_DIRS) {
      const root = this.abs(STATIC_DIR, d);
      if (!(await exists(root))) continue;
      const walk = async (abs: string, rel: string): Promise<void> => {
        for (const ent of await readdir(abs, { withFileTypes: true })) {
          const r = `${rel}/${ent.name}`;
          if (ent.isDirectory()) await walk(path.join(abs, ent.name), r);
          else if (!ent.name.startsWith('.')) out.push({ path: r, url: `/${r}`, size: (await stat(path.join(abs, ent.name))).size, kind: assetKind(r) });
        }
      };
      await walk(root, d);
    }
    return out.sort((a, b) => a.path.localeCompare(b.path));
  }

  async search(version: VersionId, query: string): Promise<SearchHit[]> {
    let raw = this.searchCache.get(version);
    if (!raw) { raw = await buildSearchIndex(await readBundle(this.bundleDir(version))); this.searchCache.set(version, raw); }
    return searchRaw(raw, query);
  }

  async publishVersion(version: string, opts: MutationOptions): Promise<PublishResult> {
    const pins: Record<string, string> = {};
    for (const r of this.opts.codeRepos) pins[repoKey(r)] = await (this.opts.resolveRef ?? defaultResolveRef(this.opts.fetch))(r);
    const latest = await readBundle(this.bundleDir(CURRENT_VERSION));
    const plan = planPublish(latest, version, await this.versionsJson(), this.opts.codeRepos, pins, new Date().toISOString());
    await writeFiles(this.opts.siteDir, plan.writes);
    const sha = await commitAll(this.opts.siteDir, opts.message, opts.author);
    await createTag(this.opts.siteDir, plan.tag, sha);
    return { version, tag: plan.tag, commitSha: sha, pins };
  }

  getAsset(ref: AssetRef): Promise<Blob> { return fetchAsset(ref, { fetch: this.opts.fetch, cache: null }); }
}

/** Default pin resolver: the tip of the repo's default ref via the public GitHub API. */
export function defaultResolveRef(f: typeof fetch = globalThis.fetch.bind(globalThis)): (repo: CodeRepoRef) => Promise<string> {
  return async (repo) => {
    const res = await f(`https://api.github.com/repos/${repo.owner}/${repo.repo}/commits/${encodeURIComponent(repo.defaultRef)}`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new ContentError('NETWORK', `Cannot resolve ${repoKey(repo)}@${repo.defaultRef}: HTTP ${res.status}`);
    return ((await res.json()) as { sha: string }).sha;
  };
}
```

`src/node.ts`:

```ts
export * from './index.js';
export * from './local/LocalFolderBackend.js';
export * from './local/git.js';
```

`test/localHarness.ts`:

```ts
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { MINI_BUNDLE, MINI_CODE_REPOS, type ContentBackendHarness } from '@platform/contracts/testing';
import { LocalFolderBackend, git, listTags } from '../src/node.js';

/** A temp git repo whose site/ holds MINI_BUNDLE as Latest, no frozen versions. */
export async function makeLocalHarness(): Promise<ContentBackendHarness & { siteDir: string }> {
  const repo = await mkdtemp(path.join(tmpdir(), 'content-'));
  const siteDir = path.join(repo, 'site');
  for (const [rel, text] of Object.entries(MINI_BUNDLE)) {
    const abs = path.join(siteDir, 'docs', ...rel.split('/'));
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, text);
  }
  await mkdir(path.join(siteDir, 'static', 'models'), { recursive: true });
  await writeFile(path.join(siteDir, 'versions.json'), '[]\n');
  await git(repo, 'init', '-q', '-b', 'main');
  await git(repo, '-c', 'user.name=seed', '-c', 'user.email=seed@example.com', 'add', '-A');
  await git(repo, '-c', 'user.name=seed', '-c', 'user.email=seed@example.com', 'commit', '-q', '-m', 'seed');
  const backend = new LocalFolderBackend({ siteDir, codeRepos: MINI_CODE_REPOS, resolveRef: async () => 'b'.repeat(40) });
  return {
    backend,
    siteDir,
    readFile: (rel) => readFile(path.join(siteDir, ...rel.split('/')), 'utf8').catch(() => null),
    listTags: () => listTags(repo),
    cleanup: () => rm(repo, { recursive: true, force: true }),
  };
}
```

`test/LocalFolderBackend.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { describeContentBackendContract } from '@platform/contracts/testing';
import { makeLocalHarness } from './localHarness.js';
import { git } from '../src/node.js';
import path from 'node:path';

describeContentBackendContract('LocalFolderBackend', makeLocalHarness);

describe('LocalFolderBackend commits', () => {
  it('records the editor as commit author', async () => {
    const h = await makeLocalHarness();
    const page = await h.backend.readPage('current', 'getting-started.md');
    await h.backend.writePage('current', 'getting-started.md', page.text + '\nExtra.\n', { message: 'Extra line', author: { name: 'Mira Okonkwo', email: 'mira@example.com' } });
    expect(await git(path.dirname(h.siteDir), 'log', '-1', '--format=%an <%ae> %s')).toBe('Mira Okonkwo <mira@example.com> Extra line');
    await h.cleanup?.();
  });
});
```

Run: `npx vitest run`
Expected: ALL PASS (pipeline tests, full contract suite against LocalFolderBackend, author test). Common failures and their real fixes: `git commit` refusing because of a missing identity means the `-c user.*` flags were dropped; a `stale` VALIDATION in `createPage` means `MINI_BUNDLE` and the generator disagree byte-for-byte (fix the fixture).

- [ ] **Step 6: Build and commit**

```bash
npx tsc -b
git add services/content package-lock.json
git commit -m "feat(content): write/publish pipelines, Orama search, asset fetch and LocalFolderBackend

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Content service - GithubBrowserBackend (Git Data API), FakeGitHub, HTTP bridge

**Files:**
- Create: `services/content/src/github/gitData.ts`, `services/content/src/github/GithubBrowserBackend.ts`, `services/content/src/http/HttpContentBackend.ts`, `services/content/src/http/serveContentBackend.ts`, `services/content/test/FakeGitHub.ts`, `services/content/test/GithubBrowserBackend.test.ts`, `services/content/test/HttpContentBackend.test.ts`, `services/content/test/getAsset.test.ts`
- Modify: `services/content/src/index.ts`, `services/content/src/node.ts`, `site/scripts/build-platform-artifacts.mjs` (search index)

**Interfaces:**
- Produces:

```ts
export interface GitDataClientOptions { owner: string; repo: string; token: string | null; fetch?: typeof fetch; apiRoot?: string }
export interface TreeEntry { path: string; sha: string; type: 'blob' | 'tree'; size?: number }
export class GitDataClient {
  constructor(opts: GitDataClientOptions)
  getHead(branch: string): Promise<{ commitSha: string; treeSha: string }>
  getTree(treeSha: string): Promise<TreeEntry[]>                       // recursive
  getBlobText(sha: string): Promise<string>                            // cached by sha
  getBlobBytes(sha: string): Promise<Uint8Array>
  commitFiles(branch: string, writes: Record<string, string | Uint8Array>, deletes: string[], message: string, author: Author): Promise<string>  // new commit sha
  createTag(name: string, sha: string): Promise<void>
  resolveRef(owner: string, repo: string, ref: string): Promise<string>
}
export interface GithubBrowserBackendOptions { owner: string; repo: string; branch: string; sitePath: string; codeRepos: CodeRepoRef[]; token: string | null; fetch?: typeof fetch; apiRoot?: string }
export class GithubBrowserBackend implements ContentBackend { readonly id = 'github-browser'; constructor(opts: GithubBrowserBackendOptions) }
export class HttpContentBackend implements ContentBackend { readonly id = 'http'; constructor(baseUrl: string, fetchImpl?: typeof fetch) }
export function serveContentBackend(backend: ContentBackend, opts?: { port?: number; host?: string }): Promise<{ url: string; close(): Promise<void> }>
```

- [ ] **Step 1: `test/FakeGitHub.ts`** (in-memory GitHub subset used by the contract test)

```ts
/**
 * In-memory GitHub: Git Data (refs, commits, trees, blobs), contents, commits/:ref and tags.
 * Trees are stored flat (path -> blob sha) which is enough for recursive reads and base_tree writes.
 */
export class FakeGitHub {
  private counter = 1;
  blobs = new Map<string, Uint8Array>();
  trees = new Map<string, Record<string, string>>();
  commits = new Map<string, { tree: string; parents: string[]; message: string; author: { name: string; email: string } }>();
  refs = new Map<string, string>(); // 'heads/main' | 'tags/x' -> commit sha
  constructor(public owner: string, public repo: string) {}

  private sha(): string { return (this.counter++).toString(16).padStart(40, '0'); }

  /** Seed a branch with files (repo-relative paths). */
  seed(branch: string, files: Record<string, string | Uint8Array>): string {
    const tree: Record<string, string> = {};
    for (const [p, c] of Object.entries(files)) { const s = this.sha(); this.blobs.set(s, typeof c === 'string' ? new TextEncoder().encode(c) : c); tree[p] = s; }
    const t = this.sha(); this.trees.set(t, tree);
    const c = this.sha(); this.commits.set(c, { tree: t, parents: [], message: 'seed', author: { name: 'seed', email: 'seed@example.com' } });
    this.refs.set(`heads/${branch}`, c);
    return c;
  }

  fileAt(branch: string, path: string): string | null {
    const c = this.commits.get(this.refs.get(`heads/${branch}`)!)!;
    const s = this.trees.get(c.tree)![path];
    return s ? new TextDecoder().decode(this.blobs.get(s)!) : null;
  }

  tags(): string[] { return [...this.refs.keys()].filter((k) => k.startsWith('tags/')).map((k) => k.slice(5)); }

  fetch: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url);
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
    const base = `/repos/${this.owner}/${this.repo}`;
    if (!url.pathname.startsWith(base)) return json(404, { message: 'Not Found' });
    const p = url.pathname.slice(base.length);
    let m: RegExpMatchArray | null;
    if ((m = p.match(/^\/git\/ref\/heads\/(.+)$/))) { const s = this.refs.get(`heads/${m[1]}`); return s ? json(200, { object: { sha: s } }) : json(404, {}); }
    if ((m = p.match(/^\/git\/refs\/heads\/(.+)$/)) && method === 'PATCH') { this.refs.set(`heads/${m[1]}`, body['sha'] as string); return json(200, {}); }
    if (p === '/git/refs' && method === 'POST') { this.refs.set(String(body['ref']).replace(/^refs\//, ''), body['sha'] as string); return json(201, {}); }
    if ((m = p.match(/^\/git\/commits\/([0-9a-f]+)$/))) { const c = this.commits.get(m[1]!); return c ? json(200, { sha: m[1], tree: { sha: c.tree }, parents: c.parents.map((s) => ({ sha: s })) }) : json(404, {}); }
    if (p === '/git/commits' && method === 'POST') { const s = this.sha(); this.commits.set(s, { tree: body['tree'] as string, parents: body['parents'] as string[], message: body['message'] as string, author: body['author'] as { name: string; email: string } }); return json(201, { sha: s }); }
    if ((m = p.match(/^\/git\/trees\/([0-9a-f]+)$/))) { const t = this.trees.get(m[1]!); return t ? json(200, { sha: m[1], truncated: false, tree: Object.entries(t).map(([path, sha]) => ({ path, sha, type: 'blob', mode: '100644', size: this.blobs.get(sha)!.byteLength })) }) : json(404, {}); }
    if (p === '/git/trees' && method === 'POST') {
      const next = { ...(body['base_tree'] ? this.trees.get(body['base_tree'] as string)! : {}) };
      for (const e of body['tree'] as { path: string; sha: string | null }[]) { if (e.sha === null) delete next[e.path]; else next[e.path] = e.sha; }
      const s = this.sha(); this.trees.set(s, next); return json(201, { sha: s });
    }
    if ((m = p.match(/^\/git\/blobs\/([0-9a-f]+)$/))) { const b = this.blobs.get(m[1]!); return b ? json(200, { sha: m[1], encoding: 'base64', content: Buffer.from(b).toString('base64') }) : json(404, {}); }
    if (p === '/git/blobs' && method === 'POST') { const bytes = body['encoding'] === 'base64' ? new Uint8Array(Buffer.from(body['content'] as string, 'base64')) : new TextEncoder().encode(body['content'] as string); const s = this.sha(); this.blobs.set(s, bytes); return json(201, { sha: s }); }
    if ((m = p.match(/^\/commits\/(.+)$/))) { const s = this.refs.get(`heads/${decodeURIComponent(m[1]!)}`); return s ? json(200, { sha: s }) : json(404, {}); }
    return json(404, { message: `FakeGitHub: no route for ${method} ${p}` });
  };
}
```

- [ ] **Step 2: Failing contract test for GithubBrowserBackend**

`services/content/test/GithubBrowserBackend.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { describeContentBackendContract, MINI_BUNDLE, MINI_CODE_REPOS } from '@platform/contracts/testing';
import { GithubBrowserBackend } from '../src/index.js';
import { FakeGitHub } from './FakeGitHub.js';

function makeHarness() {
  const gh = new FakeGitHub('acme', 'docs');
  const files: Record<string, string> = { 'site/versions.json': '[]\n', 'site/static/models/.gitkeep': '' };
  for (const [rel, text] of Object.entries(MINI_BUNDLE)) files[`site/docs/${rel}`] = text;
  gh.seed('main', files);
  const backend = new GithubBrowserBackend({ owner: 'acme', repo: 'docs', branch: 'main', sitePath: 'site', codeRepos: MINI_CODE_REPOS, token: 'ghp_test', fetch: gh.fetch });
  return { gh, backend };
}

describeContentBackendContract('GithubBrowserBackend', async () => {
  const { gh, backend } = makeHarness();
  return { backend, readFile: async (rel) => gh.fileAt('main', `site/${rel}`), listTags: async () => gh.tags() };
});

describe('GithubBrowserBackend commits', () => {
  it('creates one commit per write with the editor as author', async () => {
    const { gh, backend } = makeHarness();
    const before = gh.commits.size;
    const page = await backend.readPage('current', 'systems/inventory.md');
    const res = await backend.writePage('current', 'systems/inventory.md', page.text + '\nMore.\n', { message: 'More', author: { name: 'Mira', email: 'mira@example.com' }, expectedEtag: page.etag });
    expect(gh.commits.size).toBe(before + 1);
    expect(gh.commits.get(res.commitSha)?.author).toEqual({ name: 'Mira', email: 'mira@example.com' });
    expect(res.commitUrl).toBe(`https://github.com/acme/docs/commit/${res.commitSha}`);
  });
});
```

Run: `npx vitest run test/GithubBrowserBackend.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `github/gitData.ts`**

```ts
import { ContentError, type Author } from '@platform/contracts';

export interface GitDataClientOptions { owner: string; repo: string; token: string | null; fetch?: typeof fetch; apiRoot?: string }
export interface TreeEntry { path: string; sha: string; type: 'blob' | 'tree'; size?: number }

const b64encode = (bytes: Uint8Array): string => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const b64decode = (b64: string): Uint8Array => Uint8Array.from(atob(b64.replace(/\n/g, '')), (c) => c.charCodeAt(0));

/** Thin GitHub Git Data API client; every multi-file change is one atomic commit. */
export class GitDataClient {
  private readonly f: typeof fetch;
  private readonly root: string;
  private blobCache = new Map<string, Uint8Array>();
  constructor(private readonly opts: GitDataClientOptions) {
    this.f = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.root = opts.apiRoot ?? 'https://api.github.com';
  }

  private async api<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (this.opts.token) headers['Authorization'] = `Bearer ${this.opts.token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    let res: Response;
    try { res = await this.f(`${this.root}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }); }
    catch (e) { throw new ContentError('NETWORK', `GitHub unreachable: ${(e as Error).message}`); }
    if (res.status === 404) throw new ContentError('NOT_FOUND', `GitHub: not found ${path}`);
    if (res.status === 401 || res.status === 403) throw new ContentError('FORBIDDEN', `GitHub refused ${method} ${path} (HTTP ${res.status})`);
    if (res.status === 409 || res.status === 422) throw new ContentError('CONFLICT', `GitHub rejected ${method} ${path} (HTTP ${res.status}); the branch may have moved`);
    if (!res.ok) throw new ContentError('NETWORK', `GitHub API ${res.status} for ${method} ${path}`);
    return (await res.json()) as T;
  }

  private repoPath(p: string): string { return `/repos/${this.opts.owner}/${this.opts.repo}${p}`; }

  async getHead(branch: string): Promise<{ commitSha: string; treeSha: string }> {
    const ref = await this.api<{ object: { sha: string } }>('GET', this.repoPath(`/git/ref/heads/${encodeURIComponent(branch)}`));
    const commit = await this.api<{ tree: { sha: string } }>('GET', this.repoPath(`/git/commits/${ref.object.sha}`));
    return { commitSha: ref.object.sha, treeSha: commit.tree.sha };
  }

  async getTree(treeSha: string): Promise<TreeEntry[]> {
    const t = await this.api<{ tree: TreeEntry[]; truncated: boolean }>('GET', this.repoPath(`/git/trees/${treeSha}?recursive=1`));
    if (t.truncated) throw new ContentError('TOO_LARGE', 'Repository tree is too large for the recursive tree API');
    return t.tree;
  }

  async getBlobBytes(sha: string): Promise<Uint8Array> {
    const hit = this.blobCache.get(sha);
    if (hit) return hit;
    const b = await this.api<{ content: string; encoding: string }>('GET', this.repoPath(`/git/blobs/${sha}`));
    const bytes = b64decode(b.content);
    this.blobCache.set(sha, bytes);
    return bytes;
  }

  async getBlobText(sha: string): Promise<string> { return new TextDecoder().decode(await this.getBlobBytes(sha)); }

  async commitFiles(branch: string, writes: Record<string, string | Uint8Array>, deletes: string[], message: string, author: Author): Promise<string> {
    const head = await this.getHead(branch);
    const tree: { path: string; mode: '100644'; type: 'blob'; sha: string | null }[] = [];
    for (const [path, content] of Object.entries(writes)) {
      const body = typeof content === 'string' ? { content, encoding: 'utf-8' } : { content: b64encode(content), encoding: 'base64' };
      const blob = await this.api<{ sha: string }>('POST', this.repoPath('/git/blobs'), body);
      tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    for (const path of deletes) tree.push({ path, mode: '100644', type: 'blob', sha: null });
    const newTree = await this.api<{ sha: string }>('POST', this.repoPath('/git/trees'), { base_tree: head.treeSha, tree });
    const commit = await this.api<{ sha: string }>('POST', this.repoPath('/git/commits'), { message, tree: newTree.sha, parents: [head.commitSha], author: { name: author.name, email: author.email, date: new Date().toISOString() } });
    await this.api('PATCH', this.repoPath(`/git/refs/heads/${encodeURIComponent(branch)}`), { sha: commit.sha, force: false });
    return commit.sha;
  }

  async createTag(name: string, sha: string): Promise<void> {
    await this.api('POST', this.repoPath('/git/refs'), { ref: `refs/tags/${name}`, sha });
  }

  async resolveRef(owner: string, repo: string, ref: string): Promise<string> {
    const c = await this.api<{ sha: string }>('GET', `/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`);
    return c.sha;
  }
}
```

- [ ] **Step 4: Implement `github/GithubBrowserBackend.ts`**

```ts
import {
  ContentError, CURRENT_VERSION, repoKey,
  type AssetInfo, type AssetRef, type CodeRepoRef, type ContentBackend, type MutationOptions, type PageContent,
  type PageSummary, type PublishResult, type SearchHit, type VersionId, type VersionInfo, type WriteOptions, type WriteResult,
} from '@platform/contracts';
import { analyzeBundle } from '@platform/okf-core';
import { versionDir, isFrozen, assetKind, STATIC_DIR, ASSET_DIRS, assertPagePath } from '../layout.js';
import { planPageChanges, type PageChange } from '../writePipeline.js';
import { planPublish } from '../publishPipeline.js';
import { buildSearchIndex, searchRaw } from '../search/index.js';
import { fetchAsset } from '../assets/getAsset.js';
import { GitDataClient, type TreeEntry } from './gitData.js';

export interface GithubBrowserBackendOptions { owner: string; repo: string; branch: string; sitePath: string; codeRepos: CodeRepoRef[]; token: string | null; fetch?: typeof fetch; apiRoot?: string }

const today = (): string => new Date().toISOString().slice(0, 10);

/** Runs in the browser with the editor's token. Reads via the tree + blobs, writes via one Git Data commit per operation. */
export class GithubBrowserBackend implements ContentBackend {
  readonly id = 'github-browser';
  private readonly git: GitDataClient;
  private searchCache = new Map<string, unknown>(); // key: `${version}@${treeSha}`
  constructor(private readonly opts: GithubBrowserBackendOptions) {
    this.git = new GitDataClient({ owner: opts.owner, repo: opts.repo, token: opts.token, fetch: opts.fetch, apiRoot: opts.apiRoot });
  }

  private sitePrefix(): string { return this.opts.sitePath ? `${this.opts.sitePath}/` : ''; }
  private bundlePrefix(version: VersionId): string { return `${this.sitePrefix()}${versionDir(version)}/`; }

  private async snapshot(): Promise<{ treeSha: string; entries: TreeEntry[] }> {
    const head = await this.git.getHead(this.opts.branch);
    return { treeSha: head.treeSha, entries: (await this.git.getTree(head.treeSha)).filter((e) => e.type === 'blob') };
  }

  /** Bundle-relative markdown + manifest for a version, from a tree snapshot. */
  private async loadBundle(version: VersionId, entries: TreeEntry[]): Promise<Record<string, string>> {
    const prefix = this.bundlePrefix(version);
    const files: Record<string, string> = {};
    for (const e of entries) {
      if (!e.path.startsWith(prefix)) continue;
      const rel = e.path.slice(prefix.length);
      if (rel.endsWith('.md') || rel === 'manifest.json') files[rel] = await this.git.getBlobText(e.sha);
    }
    return files;
  }

  private async versionsJson(entries: TreeEntry[]): Promise<string[]> {
    const e = entries.find((x) => x.path === `${this.sitePrefix()}versions.json`);
    return e ? (JSON.parse(await this.git.getBlobText(e.sha)) as string[]) : [];
  }

  async listVersions(): Promise<VersionInfo[]> {
    const { entries } = await this.snapshot();
    return [{ id: CURRENT_VERSION, label: 'Latest', frozen: false }, ...(await this.versionsJson(entries)).map((v) => ({ id: v, label: v, frozen: true }))];
  }

  async listPages(version: VersionId): Promise<PageSummary[]> {
    const { entries } = await this.snapshot();
    const files = await this.loadBundle(version, entries);
    return analyzeBundle(files).pages.filter((p) => p.meta).map((p) => ({ path: p.path, title: p.meta!.title, description: p.meta!.description, type: p.meta!.type, tags: p.meta!.tags }));
  }

  async readPage(version: VersionId, pagePath: string): Promise<PageContent> {
    assertPagePath(pagePath);
    const { entries } = await this.snapshot();
    const e = entries.find((x) => x.path === `${this.bundlePrefix(version)}${pagePath}`);
    if (!e) throw new ContentError('NOT_FOUND', `No page at ${pagePath} in ${version}`);
    return { path: pagePath, text: await this.git.getBlobText(e.sha), etag: e.sha };
  }

  private async commitChanges(version: VersionId, changes: PageChange[], opts: MutationOptions, entries: TreeEntry[]): Promise<WriteResult> {
    if (isFrozen(version)) throw new ContentError('FROZEN', `Version ${version} is frozen; edit the Latest docs instead`);
    const files = await this.loadBundle(version, entries);
    const cs = planPageChanges(files, changes, { codeRepos: this.opts.codeRepos, author: opts.author.name, message: opts.message, date: today() });
    const prefix = this.bundlePrefix(version);
    const writes: Record<string, string> = {};
    for (const [p, t] of Object.entries(cs.writes)) writes[`${prefix}${p}`] = t;
    const sha = await this.git.commitFiles(this.opts.branch, writes, cs.deletes.map((d) => `${prefix}${d}`), opts.message, opts.author);
    const last = changes.filter((c) => c.text !== null).at(-1);
    const etag = last ? (await this.snapshot()).entries.find((x) => x.path === `${prefix}${last.path}`)?.sha ?? '' : '';
    return { commitSha: sha, commitUrl: `https://github.com/${this.opts.owner}/${this.opts.repo}/commit/${sha}`, etag, regenerated: cs.regenerated };
  }

  async writePage(version: VersionId, pagePath: string, text: string, opts: WriteOptions): Promise<WriteResult> {
    if (isFrozen(version)) throw new ContentError('FROZEN', `Version ${version} is frozen; edit the Latest docs instead`);
    assertPagePath(pagePath);
    const { entries } = await this.snapshot();
    const e = entries.find((x) => x.path === `${this.bundlePrefix(version)}${pagePath}`);
    if (!e) throw new ContentError('NOT_FOUND', `No page at ${pagePath} in ${version}`);
    if (opts.expectedEtag && opts.expectedEtag !== e.sha) throw new ContentError('CONFLICT', `${pagePath} changed on ${this.opts.branch} since you loaded it; reload and re-apply your edits`);
    return this.commitChanges(version, [{ path: pagePath, text }], opts, entries);
  }

  async createPage(version: VersionId, pagePath: string, text: string, opts: MutationOptions): Promise<WriteResult> {
    if (isFrozen(version)) throw new ContentError('FROZEN', `Version ${version} is frozen`);
    assertPagePath(pagePath);
    const { entries } = await this.snapshot();
    if (entries.some((x) => x.path === `${this.bundlePrefix(version)}${pagePath}`)) throw new ContentError('EXISTS', `${pagePath} already exists`);
    return this.commitChanges(version, [{ path: pagePath, text }], opts, entries);
  }

  async deletePage(version: VersionId, pagePath: string, opts: MutationOptions): Promise<WriteResult> {
    await this.readPage(version, pagePath);
    const { entries } = await this.snapshot();
    return this.commitChanges(version, [{ path: pagePath, text: null }], opts, entries);
  }

  async renamePage(version: VersionId, from: string, to: string, opts: MutationOptions): Promise<WriteResult> {
    const page = await this.readPage(version, from);
    assertPagePath(to);
    const { entries } = await this.snapshot();
    if (entries.some((x) => x.path === `${this.bundlePrefix(version)}${to}`)) throw new ContentError('EXISTS', `${to} already exists`);
    return this.commitChanges(version, [{ path: from, text: null }, { path: to, text: page.text }], opts, entries);
  }

  async uploadAsset(assetPath: string, bytes: Uint8Array, opts: MutationOptions): Promise<WriteResult & { asset: AssetInfo }> {
    if (assetPath.split('/').some((s) => s === '..' || s === '')) throw new ContentError('VALIDATION', `Invalid asset path ${assetPath}`);
    const sha = await this.git.commitFiles(this.opts.branch, { [`${this.sitePrefix()}${STATIC_DIR}/${assetPath}`]: bytes }, [], opts.message, opts.author);
    const asset: AssetInfo = { path: assetPath, url: `/${assetPath}`, size: bytes.byteLength, kind: assetKind(assetPath) };
    return { commitSha: sha, commitUrl: `https://github.com/${this.opts.owner}/${this.opts.repo}/commit/${sha}`, etag: '', regenerated: [], asset };
  }

  async listAssets(): Promise<AssetInfo[]> {
    const { entries } = await this.snapshot();
    const prefix = `${this.sitePrefix()}${STATIC_DIR}/`;
    return entries
      .filter((e) => e.path.startsWith(prefix) && ASSET_DIRS.some((d) => e.path.startsWith(`${prefix}${d}/`)) && !e.path.split('/').at(-1)!.startsWith('.'))
      .map((e) => { const rel = e.path.slice(prefix.length); return { path: rel, url: `/${rel}`, size: e.size ?? 0, kind: assetKind(rel) }; })
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  async search(version: VersionId, query: string): Promise<SearchHit[]> {
    const { treeSha, entries } = await this.snapshot();
    const key = `${version}@${treeSha}`;
    let raw = this.searchCache.get(key);
    if (!raw) { raw = await buildSearchIndex(await this.loadBundle(version, entries)); this.searchCache.clear(); this.searchCache.set(key, raw); }
    return searchRaw(raw, query);
  }

  async publishVersion(version: string, opts: MutationOptions): Promise<PublishResult> {
    const { entries } = await this.snapshot();
    const pins: Record<string, string> = {};
    for (const r of this.opts.codeRepos) pins[repoKey(r)] = await this.git.resolveRef(r.owner, r.repo, r.defaultRef);
    const latest = await this.loadBundle(CURRENT_VERSION, entries);
    const plan = planPublish(latest, version, await this.versionsJson(entries), this.opts.codeRepos, pins, new Date().toISOString());
    const writes: Record<string, string> = {};
    for (const [p, t] of Object.entries(plan.writes)) writes[`${this.sitePrefix()}${p}`] = t;
    const sha = await this.git.commitFiles(this.opts.branch, writes, [], opts.message, opts.author);
    await this.git.createTag(plan.tag, sha);
    return { version, tag: plan.tag, commitSha: sha, pins };
  }

  getAsset(ref: AssetRef): Promise<Blob> { return fetchAsset(ref, { token: this.opts.token, fetch: this.opts.fetch }); }
}
```

Add to `src/index.ts`: `export * from './github/gitData.js'; export * from './github/GithubBrowserBackend.js';`

Run: `npx vitest run test/GithubBrowserBackend.test.ts`
Expected: PASS (full contract + author test). If `search` fails on the fake, note that `search` never touches the network besides the tree, so failures are pipeline bugs.

- [ ] **Step 5: `getAsset` unit test**

`services/content/test/getAsset.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fetchAsset, assetUrls } from '../src/index.js';

const ref = { repo: 'RayanYousef/CloudDocumentationPersonal', ref: 'main', path: 'examples/unity-project/Assets/Models/Airship.fbx' };

describe('fetchAsset', () => {
  it('builds media and raw URLs', () => {
    expect(assetUrls(ref).media).toBe('https://media.githubusercontent.com/media/RayanYousef/CloudDocumentationPersonal/main/examples/unity-project/Assets/Models/Airship.fbx');
    expect(assetUrls(ref).raw).toBe('https://raw.githubusercontent.com/RayanYousef/CloudDocumentationPersonal/main/examples/unity-project/Assets/Models/Airship.fbx');
  });
  it('tries media first, falls back to raw, and sends the token header', async () => {
    const calls: { url: string; auth?: string }[] = [];
    const f: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, auth: (init?.headers as Record<string, string>)?.['Authorization'] });
      return url.includes('media.') ? new Response(null, { status: 404 }) : new Response('bytes', { status: 200 });
    };
    const blob = await fetchAsset(ref, { fetch: f, token: 't0k', cache: null });
    expect(await blob.text()).toBe('bytes');
    expect(calls.map((c) => c.url.split('/')[2])).toEqual(['media.githubusercontent.com', 'raw.githubusercontent.com']);
    expect(calls[0]?.auth).toBe('token t0k');
  });
  it('throws NOT_FOUND when both sources 404', async () => {
    const f: typeof fetch = async () => new Response(null, { status: 404 });
    await expect(fetchAsset(ref, { fetch: f, cache: null })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
```

Run: `npx vitest run test/getAsset.test.ts`
Expected: PASS.

- [ ] **Step 6: HTTP bridge (`HttpContentBackend` + `serveContentBackend`) and its contract test**

`src/http/HttpContentBackend.ts`:

```ts
import { ContentError, type AssetInfo, type AssetRef, type ContentBackend, type ContentErrorCode, type MutationOptions, type PageContent, type PageSummary, type PublishResult, type SearchHit, type VersionId, type VersionInfo, type WriteOptions, type WriteResult } from '@platform/contracts';

const toB64 = (bytes: Uint8Array): string => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };
const fromB64 = (b64: string): Uint8Array => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** JSON-RPC style client for a ContentBackend served by serveContentBackend (dev/e2e; Phase 2 server). */
export class HttpContentBackend implements ContentBackend {
  readonly id = 'http';
  constructor(private readonly baseUrl: string, private readonly f: typeof fetch = globalThis.fetch.bind(globalThis)) {}

  private async call<T>(method: string, args: unknown[]): Promise<T> {
    let res: Response;
    try { res = await this.f(`${this.baseUrl.replace(/\/$/, '')}/rpc`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method, args }) }); }
    catch (e) { throw new ContentError('NETWORK', `Content service unreachable: ${(e as Error).message}`); }
    const data = (await res.json()) as { result?: T; error?: { code: ContentErrorCode; message: string; details?: unknown } };
    if (data.error) throw new ContentError(data.error.code, data.error.message, data.error.details);
    return data.result as T;
  }

  listVersions(): Promise<VersionInfo[]> { return this.call('listVersions', []); }
  listPages(version: VersionId): Promise<PageSummary[]> { return this.call('listPages', [version]); }
  readPage(version: VersionId, path: string): Promise<PageContent> { return this.call('readPage', [version, path]); }
  writePage(version: VersionId, path: string, text: string, opts: WriteOptions): Promise<WriteResult> { return this.call('writePage', [version, path, text, opts]); }
  createPage(version: VersionId, path: string, text: string, opts: MutationOptions): Promise<WriteResult> { return this.call('createPage', [version, path, text, opts]); }
  deletePage(version: VersionId, path: string, opts: MutationOptions): Promise<WriteResult> { return this.call('deletePage', [version, path, opts]); }
  renamePage(version: VersionId, from: string, to: string, opts: MutationOptions): Promise<WriteResult> { return this.call('renamePage', [version, from, to, opts]); }
  uploadAsset(path: string, bytes: Uint8Array, opts: MutationOptions): Promise<WriteResult & { asset: AssetInfo }> { return this.call('uploadAsset', [path, { base64: toB64(bytes) }, opts]); }
  listAssets(): Promise<AssetInfo[]> { return this.call('listAssets', []); }
  search(version: VersionId, query: string): Promise<SearchHit[]> { return this.call('search', [version, query]); }
  publishVersion(version: string, opts: MutationOptions): Promise<PublishResult> { return this.call('publishVersion', [version, opts]); }
  async getAsset(ref: AssetRef): Promise<Blob> { const r = await this.call<{ base64: string; type: string }>('getAsset', [ref]); return new Blob([fromB64(r.base64)], { type: r.type }); }
}
```

`src/http/serveContentBackend.ts`:

```ts
import { createServer } from 'node:http';
import { ContentError, type ContentBackend } from '@platform/contracts';

/** Exposes any ContentBackend over POST /rpc {method, args}. Dev/e2e only in Phase 1 (no auth). */
export async function serveContentBackend(backend: ContentBackend, opts: { port?: number; host?: string } = {}): Promise<{ url: string; close(): Promise<void> }> {
  const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (req.method !== 'POST' || req.url !== '/rpc') { res.writeHead(404); res.end(); return; }
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const send = (status: number, body: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
    try {
      const { method, args } = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { method: keyof ContentBackend; args: unknown[] };
      if (typeof backend[method] !== 'function') { send(400, { error: { code: 'NOT_FOUND', message: `Unknown method ${String(method)}` } }); return; }
      if (method === 'uploadAsset') args[1] = new Uint8Array(Buffer.from((args[1] as { base64: string }).base64, 'base64'));
      let result: unknown = await (backend[method] as (...a: unknown[]) => Promise<unknown>).apply(backend, args);
      if (method === 'getAsset') { const blob = result as Blob; result = { base64: Buffer.from(await blob.arrayBuffer()).toString('base64'), type: blob.type }; }
      send(200, { result });
    } catch (e) {
      const err = e instanceof ContentError ? e : new ContentError('NETWORK', (e as Error).message);
      send(200, { error: { code: err.code, message: err.message, details: err.details } });
    }
  });
  await new Promise<void>((resolve) => server.listen(opts.port ?? 0, opts.host ?? '127.0.0.1', resolve));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : opts.port;
  return { url: `http://${opts.host ?? '127.0.0.1'}:${port}`, close: () => new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))) };
}
```

Add `export * from './http/HttpContentBackend.js';` to `src/index.ts` and `export * from './http/serveContentBackend.js';` to `src/node.ts`.

`test/HttpContentBackend.test.ts`:

```ts
import { describeContentBackendContract } from '@platform/contracts/testing';
import { makeLocalHarness } from './localHarness.js';
import { HttpContentBackend } from '../src/index.js';
import { serveContentBackend } from '../src/node.js';

describeContentBackendContract('HttpContentBackend over LocalFolderBackend', async () => {
  const local = await makeLocalHarness();
  const server = await serveContentBackend(local.backend);
  return { backend: new HttpContentBackend(server.url), readFile: local.readFile, listTags: local.listTags, cleanup: async () => { await server.close(); await local.cleanup?.(); } };
});
```

Run: `npx vitest run`
Expected: ALL content tests PASS (three contract runs + unit tests).

- [ ] **Step 7: Site build-time search index**

Append to `site/scripts/build-platform-artifacts.mjs` inside the `for (const [id, dir] of bundles)` loop, after the manifest copy:

```js
    const files = await readBundle(dir);
    await put(`search-index-${id}.json`, JSON.stringify(await buildSearchIndex(files)));
```

with imports at the top: `import { readBundle } from '@platform/okf-core/node'; import { buildSearchIndex } from '@platform/content';` and add `"@platform/content": "*"` and `"@platform/okf-core": "*"` to `site/package.json` `dependencies`. Extend the test in `site/scripts/build-platform-artifacts.test.ts`: seed `docs/index.md` with the Task 6 placeholder text and change the expected list to include `'search-index-1.0.0.json'` and `'search-index-current.json'`.

Run: `npm install && npm run build -w @platform/okf-core -w @platform/content && cd site && npx vitest run`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add services/content site package-lock.json
git commit -m "feat(content): GithubBrowserBackend on the Git Data API, HTTP bridge, build-time search index

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 11: Viewers package and site viewers with repo/ref/path

**Files:**
- Create: `packages/viewers/package.json`, `packages/viewers/tsconfig.json`, `packages/viewers/vitest.config.ts`, `packages/viewers/src/ModelViewerCore.tsx`, `packages/viewers/src/FbxViewerCore.tsx`, `packages/viewers/src/index.ts`, `packages/viewers/test/viewers.test.tsx`, `site/tsconfig.json`, `site/src/platform/createContentBackend.ts`, `site/src/platform/useAssetUrl.ts`, `site/src/components/ModelViewer/index.tsx`, `site/src/components/FbxViewer/index.tsx`
- Delete: `site/src/components/ModelViewer/index.js`, `site/src/components/FbxViewer/index.js`, `site/src/components/viewerShared.js`
- Modify: `site/docs/assets/airship-model.md`, `site/docs/assets/forge-props.md`, `site/package.json`

**Interfaces:**
- Consumes: `GithubBrowserBackend`, `fetchAsset` from `@platform/content`; `Session` from `@platform/contracts`; `platform.config.js`.
- Produces:

```ts
// @platform/viewers (browser-only; import inside BrowserOnly / client code)
export interface ModelViewerCoreProps { src: string; alt?: string; height?: number }
export function ModelViewerCore(props: ModelViewerCoreProps): JSX.Element
export interface FbxViewerCoreProps { src: string; height?: number }
export function FbxViewerCore(props: FbxViewerCoreProps): JSX.Element
export const viewerBoxStyle: React.CSSProperties
// site
export const SESSION_STORAGE_KEY = 'docs-platform.session'   // shared with the editor (Task 12)
export function createContentBackend(): ContentBackend        // GithubBrowserBackend with the stored session token or null
export function useAssetUrl(ref: { repo: string; ref?: string; path: string } | null): { url: string | null; status: 'idle' | 'loading' | 'ready' | 'error'; error: string | null }
// site MDX components
<ModelViewer src? repo? ref? path? alt? height? />   <FbxViewer src? repo? ref? path? alt? height? />
```

- [ ] **Step 1: Package files**

`packages/viewers/package.json`:

```json
{
  "name": "@platform/viewers",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } },
  "scripts": { "build": "tsc -b", "test": "vitest run" },
  "dependencies": { "@google/model-viewer": "^4.3.1", "three": "^0.183.0" },
  "peerDependencies": { "react": "^19.0.0" },
  "devDependencies": { "@testing-library/react": "^16.1.0", "@types/react": "^19.0.0", "@types/three": "^0.183.0", "jsdom": "^25.0.1", "react": "^19.0.0", "react-dom": "^19.0.0", "typescript": "^5.7.2", "vitest": "^3.0.0" }
}
```

`packages/viewers/tsconfig.json`:

```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "rootDir": "src", "outDir": "dist", "module": "ESNext", "moduleResolution": "Bundler" }, "include": ["src"] }
```

`packages/viewers/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { name: 'viewers', environment: 'jsdom', include: ['test/**/*.test.tsx'] } });
```

- [ ] **Step 2: Failing render tests**

`packages/viewers/test/viewers.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModelViewerCore, FbxViewerCore } from '../src/index.js';

describe('ModelViewerCore', () => {
  it('renders a <model-viewer> element with src, alt and height', () => {
    const { container } = render(<ModelViewerCore src="/models/cube.gltf" alt="Cube" height={320} />);
    const el = container.querySelector('model-viewer');
    expect(el?.getAttribute('src')).toBe('/models/cube.gltf');
    expect(el?.getAttribute('alt')).toBe('Cube');
    expect((el as HTMLElement).style.height).toBe('320px');
  });
});

describe('FbxViewerCore', () => {
  it('shows an error overlay when WebGL is unavailable (jsdom)', async () => {
    render(<FbxViewerCore src="/models/fbx/cube.fbx" height={200} />);
    expect(await screen.findByText(/WebGL is not available/)).toBeTruthy();
  });
});
```

Run: `cd packages/viewers && npm install && npx vitest run`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement the cores**

`src/ModelViewerCore.tsx`:

```tsx
import { useEffect, useRef, useState, type CSSProperties } from 'react';

export const viewerBoxStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1rem', border: '1px solid var(--ifm-color-emphasis-300, #ccc)', borderRadius: 'var(--ifm-global-radius, 6px)' };

export interface ModelViewerCoreProps { src: string; alt?: string; height?: number }

/** Google <model-viewer> (glTF/GLB). The custom element is registered lazily so importing this module is side-effect free. */
export function ModelViewerCore({ src, alt = '3D model', height = 480 }: ModelViewerCoreProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { void import('@google/model-viewer').catch(() => setError(true)); }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const onError = () => setError(true);
    const onLoad = () => setError(false);
    el.addEventListener('error', onError);
    el.addEventListener('load', onLoad);
    return () => { el.removeEventListener('error', onError); el.removeEventListener('load', onLoad); };
  }, [src]);
  if (error) return <div style={{ height, ...viewerBoxStyle }}>Could not load 3D model: <code>{src}</code></div>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Tag = 'model-viewer' as any;
  return <Tag ref={ref} src={src} alt={alt} camera-controls="" auto-rotate="" shadow-intensity="1" style={{ width: '100%', height: `${height}px`, backgroundColor: 'var(--ifm-background-surface-color, #eee)', borderRadius: 'var(--ifm-global-radius, 6px)' }} />;
}
```

`src/FbxViewerCore.tsx` (port of `website/src/components/FbxViewer/index.js`; WebGL failures are caught):

```tsx
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const overlay: CSSProperties = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none', color: 'var(--ifm-color-emphasis-700, #666)' };

export interface FbxViewerCoreProps { src: string; height?: number }

export function FbxViewerCore({ src, height = 480 }: FbxViewerCoreProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setError('WebGL is not available in this browser.'); setLoading(false); return undefined; }
    let disposed = false;
    let raf = 0;
    const width = mount.clientWidth || 600;
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 5, 4); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6); fill.position.set(-4, -2, -3); scene.add(fill);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 2.0;
    new FBXLoader().load(src, (obj) => {
      if (disposed) return;
      obj.traverse((c) => { const mesh = c as THREE.Mesh; if (mesh.isMesh) { const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]; mats.forEach((m) => { if (m) m.side = THREE.DoubleSide; }); } });
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      obj.position.sub(center);
      const dist = maxDim * 2.2;
      camera.position.set(dist * 0.6, dist * 0.45, dist);
      camera.near = dist / 100; camera.far = dist * 100; camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0); controls.update();
      scene.add(obj);
      setLoading(false);
    }, undefined, (err) => { if (!disposed) { setError(String((err as Error).message ?? err)); setLoading(false); } });
    const onResize = () => { const w = mount.clientWidth || width; renderer.setSize(w, height); camera.aspect = w / height; camera.updateProjectionMatrix(); };
    window.addEventListener('resize', onResize);
    const animate = () => { raf = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
    animate();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      scene.traverse((o) => { const mesh = o as THREE.Mesh; if (mesh.isMesh) { mesh.geometry?.dispose(); const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]; mats.forEach((m) => { if (!m) return; Object.values(m).forEach((v) => { if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose(); }); m.dispose(); }); } });
      renderer.dispose();
      renderer.domElement.parentNode?.removeChild(renderer.domElement);
    };
  }, [src, height]);

  return (
    <div style={{ position: 'relative' }}>
      <div ref={mountRef} style={{ width: '100%', height: `${height}px`, overflow: 'hidden', borderRadius: 'var(--ifm-global-radius, 6px)', backgroundColor: 'var(--ifm-background-surface-color, #eee)' }} />
      {loading && !error && <div style={overlay}>Loading FBX...</div>}
      {error && <div style={overlay}>Could not load FBX: <code>{src}</code> ({error})</div>}
    </div>
  );
}
```

`src/index.ts`:

```ts
export * from './ModelViewerCore.js';
export * from './FbxViewerCore.js';
```

Run: `npx vitest run && npx tsc -b`
Expected: PASS.

- [ ] **Step 4: Site composition root and viewers**

`site/tsconfig.json`:

```json
{ "extends": "@docusaurus/tsconfig", "compilerOptions": { "baseUrl": ".", "strict": true, "jsx": "react-jsx" }, "include": ["src", "docusaurus.config.js"] }
```

Add to `site/package.json` dependencies: `"@platform/viewers": "*"`; devDependencies: `"@docusaurus/tsconfig": "^3.10.1"`, `"typescript": "^5.7.2"`. Remove `three` and `@google/model-viewer` from `site/package.json` (they now come from `@platform/viewers`).

`site/src/platform/createContentBackend.ts`:

```ts
import type { ContentBackend, Session } from '@platform/contracts';
import { GithubBrowserBackend } from '@platform/content';
import platform from '../../../platform.config.js';

/** Same key the editor uses; the site only reads it to authenticate asset fetches. */
export const SESSION_STORAGE_KEY = 'docs-platform.session';

export function readStoredSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch { return null; }
}

let cached: ContentBackend | null = null;
export function createContentBackend(): ContentBackend {
  if (cached) return cached;
  cached = new GithubBrowserBackend({
    owner: platform.organizationName, repo: platform.projectName, branch: platform.deployBranch, sitePath: platform.sitePath,
    codeRepos: platform.codeRepos, token: readStoredSession()?.token ?? null,
  });
  return cached;
}

export function defaultRefFor(repo: string): string {
  return platform.codeRepos.find((r) => `${r.owner}/${r.repo}` === repo)?.defaultRef ?? 'main';
}
```

`site/src/platform/useAssetUrl.ts`:

```ts
import { useEffect, useState } from 'react';
import { createContentBackend, defaultRefFor } from './createContentBackend';

export interface AssetSpec { repo: string; ref?: string; path: string }
export interface AssetState { url: string | null; status: 'idle' | 'loading' | 'ready' | 'error'; error: string | null }

/** Resolve a code-repo asset to an object URL through ContentBackend.getAsset. */
export function useAssetUrl(spec: AssetSpec | null): AssetState {
  const [state, setState] = useState<AssetState>({ url: null, status: spec ? 'loading' : 'idle', error: null });
  const key = spec ? `${spec.repo}@${spec.ref ?? ''}/${spec.path}` : '';
  useEffect(() => {
    if (!spec) return undefined;
    let url: string | null = null;
    let cancelled = false;
    setState({ url: null, status: 'loading', error: null });
    createContentBackend().getAsset({ repo: spec.repo, ref: spec.ref ?? defaultRefFor(spec.repo), path: spec.path })
      .then((blob) => { if (cancelled) return; url = URL.createObjectURL(blob); setState({ url, status: 'ready', error: null }); })
      .catch((e: Error) => { if (!cancelled) setState({ url: null, status: 'error', error: e.message }); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}
```

`site/src/components/ModelViewer/index.tsx`:

```tsx
import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { useAssetUrl } from '@site/src/platform/useAssetUrl';

export interface ViewerProps { src?: string; repo?: string; ref?: string; path?: string; alt?: string; height?: number }

const box = (height: number): React.CSSProperties => ({ height, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1rem', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: 'var(--ifm-global-radius)' });

/** Renders inside BrowserOnly: resolves src (static) or repo/ref/path (content backend) then mounts the core. */
function Resolved({ src, repo, ref, path, alt, height, kind }: ViewerProps & { kind: 'model' | 'fbx' }) {
  const h = height ?? 480;
  const asset = useAssetUrl(!src && repo && path ? { repo, ref, path } : null);
  const base = useBaseUrl(src ?? '/');
  const url = src ? base : asset.url;
  if (!src && (!repo || !path)) return <div style={box(h)}>ModelViewer needs either src or repo + path.</div>;
  if (!url) {
    if (asset.status === 'error') return <div style={box(h)}>Model unavailable: {asset.error} (private code repos need an editor session; see the Editor link).</div>;
    return <div style={box(h)}>Loading 3D model...</div>;
  }
  const { ModelViewerCore, FbxViewerCore } = require('@platform/viewers') as typeof import('@platform/viewers');
  return kind === 'fbx' ? <FbxViewerCore src={url} height={h} /> : <ModelViewerCore src={url} alt={alt} height={h} />;
}

export function makeViewer(kind: 'model' | 'fbx') {
  return function Viewer(props: ViewerProps) {
    const h = props.height ?? 480;
    return <BrowserOnly fallback={<div style={box(h)}>Loading 3D viewer...</div>}>{() => <Resolved {...props} kind={kind} />}</BrowserOnly>;
  };
}

export default makeViewer('model');
```

`site/src/components/FbxViewer/index.tsx`:

```tsx
import { makeViewer } from '../ModelViewer';
export default makeViewer('fbx');
```

Delete `site/src/components/ModelViewer/index.js`, `site/src/components/FbxViewer/index.js`, `site/src/components/viewerShared.js`.

- [ ] **Step 5: Demo pages use the viewers**

Append to `site/docs/assets/airship-model.md` (end of file):

```markdown

## Preview

The mesh below is fetched from the sample code repository at the pinned ref, so a frozen version always shows the model that shipped.

<FbxViewer repo="RayanYousef/CloudDocumentationPersonal" ref="main" path="examples/unity-project/Assets/Models/Airship.fbx" alt="Airship" height={400} />

A glTF asset committed to the site itself is referenced by `src` instead:

<ModelViewer src="/models/cube.gltf" alt="Sample cube" height={320} />
```

Append to `site/docs/assets/forge-props.md`:

```markdown

## Preview

<FbxViewer repo="RayanYousef/CloudDocumentationPersonal" ref="main" path="examples/unity-project/Assets/Models/Chest.fbx" alt="Chest" height={360} />
```

- [ ] **Step 6: Verify**

```bash
npm install
npm run okf:check
npm run build -w @platform/site
```

Expected: check exit 0 (JSX is not a link); build passes; `grep -c "model-viewer\|FbxViewer" site/build/assets/airship-model/index.html` > 0. Then `npm run serve -w @platform/site` and open `http://localhost:3000/CloudDocumentationPersonal/assets/airship-model/`: the cube renders; the FBX box shows "Model unavailable" until the repo is public (Task 16) - that is the expected placeholder path. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add -A packages/viewers site package-lock.json
git commit -m "feat(viewers): shared 3D cores; site viewers resolve repo/ref/path through the content backend

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: Editor service (Vite app)

**Files:**
- Create: `services/editor/package.json`, `services/editor/tsconfig.json`, `services/editor/vite.config.ts`, `services/editor/vitest.config.ts`, `services/editor/index.html`, `services/editor/src/main.tsx`, `services/editor/src/App.tsx`, `services/editor/src/composition/createPlatform.ts`, `services/editor/src/PlatformContext.tsx`, `services/editor/src/session/SessionStore.ts`, `services/editor/src/frontmatter/yamlDoc.ts`, `services/editor/src/mdx/componentsManifest.ts`, `services/editor/src/mdx/descriptors.tsx`, `services/editor/src/mdx/toolbar/InsertModelButton.tsx`, `services/editor/src/mdx/toolbar/InsertImageButton.tsx`, `services/editor/src/mdx/toolbar/InsertFromRepoButton.tsx`, `services/editor/src/mdx/toolbar/InsertTabsButton.tsx`, `services/editor/src/mdx/uploadHelpers.ts`, `services/editor/src/components/LoginGate.tsx`, `services/editor/src/components/FilePicker.tsx`, `services/editor/src/components/FrontmatterForm.tsx`, `services/editor/src/components/BodyEditor.tsx`, `services/editor/src/components/ProblemList.tsx`, `services/editor/src/components/NewPageDialog.tsx`, `services/editor/src/components/PublishDialog.tsx`, `services/editor/src/components/FolderIntroEditor.tsx`, `services/editor/src/styles/theme.css`, `services/editor/src/frontmatter/yamlDoc.test.ts`, `services/editor/src/session/SessionStore.test.ts`, `services/editor/src/mdx/componentsManifest.test.ts`, `services/editor/src/mdx/folderIntro.ts`, `services/editor/src/mdx/folderIntro.test.ts`

**Interfaces:**
- Consumes: `AuthProvider`, `ContentBackend`, `Session`, `Identity`, `ComponentsManifest`, `ContentError` (`@platform/contracts`); `validatePage`, `START_MARKER`, `END_MARKER`, `parseFrontmatter` (`@platform/okf-core`); `ModelViewerCore`, `FbxViewerCore` (`@platform/viewers`); `GithubTokenProvider`, `MockAuthProvider` (`@platform/auth`, composition only); `GithubBrowserBackend`, `HttpContentBackend` (`@platform/content`, composition only); `platform.config.js`.
- Produces:

```ts
export const SESSION_STORAGE_KEY = 'docs-platform.session'
export class BrowserSessionStore { constructor(storage: Storage | null); load(): Session | null; save(session: Session, remember: boolean): void; clear(): void }
export function splitDocument(text: string): { head: string; body: string; hasFrontmatter: boolean }
export function readFields(head: string): FrontmatterFields
export function applyFields(text: string, fields: Partial<FrontmatterFields>): string
export interface FrontmatterFields { title: string; description: string; type: string; tags: string[]; resource: string; sidebar_position: number | null }
export const DEFAULT_COMPONENTS: ComponentsManifest
export async function loadComponentsManifest(url: string, f?: typeof fetch): Promise<ComponentsManifest>
export function toJsxDescriptors(manifest: ComponentsManifest, previews: PreviewRegistry): JsxComponentDescriptor[]
export function splitFolderIntro(indexText: string): { before: string; generated: string; after: string }
export function replaceFolderIntro(indexText: string, before: string): string
export interface Platform { auth: AuthProvider; backend(session: Session | null): ContentBackend; config: PlatformConfig; componentsUrl: string }
export function createPlatform(): Platform
```

- [ ] **Step 1: Package and build files**

`services/editor/package.json`:

```json
{
  "name": "@platform/editor",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit -p tsconfig.json && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "e2e": "playwright test"
  },
  "dependencies": {
    "@mdxeditor/editor": "^4.0.4",
    "@platform/auth": "*",
    "@platform/content": "*",
    "@platform/contracts": "*",
    "@platform/okf-core": "*",
    "@platform/viewers": "*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "yaml": "^2.6.1"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "typescript": "^5.7.2",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

`services/editor/tsconfig.json`:

```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "module": "ESNext", "moduleResolution": "Bundler", "noEmit": true, "composite": false, "declaration": false, "declarationMap": false, "allowJs": true, "types": ["vite/client"] }, "include": ["src", "vite.config.ts", "../../platform.config.js"] }
```

`services/editor/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import platform from '../../platform.config.js';

export default defineConfig({
  plugins: [react()],
  base: `${platform.baseUrl}editor/`,
  server: { port: 5173 },
  build: { outDir: 'dist', sourcemap: true },
});
```

`services/editor/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { name: 'editor', environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] } });
```

`services/editor/index.html`:

```html
<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Docs Editor</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Failing unit tests (frontmatter, session, components manifest, folder intro)**

`src/frontmatter/yamlDoc.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { splitDocument, readFields, applyFields } from './yamlDoc.js';

const doc = `---
title: Inventory
description: Explains how items are stored.
type: system
tags: [inventory, items]
resource: https://github.com/o/r/blob/main/x
sources:
  - resource: https://github.com/o/r/blob/main/x/y.cs
sidebar_position: 2
---

Body text.
`;

describe('yamlDoc', () => {
  it('reads fields with real scalar types', () => {
    const f = readFields(splitDocument(doc).head);
    expect(f).toEqual({ title: 'Inventory', description: 'Explains how items are stored.', type: 'system', tags: ['inventory', 'items'], resource: 'https://github.com/o/r/blob/main/x', sidebar_position: 2 });
  });
  it('rewrites only the changed keys and keeps numbers unquoted', () => {
    const out = applyFields(doc, { title: 'Inventory v2', sidebar_position: 3 });
    expect(out).toContain('title: Inventory v2\n');
    expect(out).toContain('sidebar_position: 3\n');
    expect(out).not.toContain('"3"');
    expect(out).toContain('sources:\n  - resource: https://github.com/o/r/blob/main/x/y.cs\n');
    expect(out.endsWith('\nBody text.\n')).toBe(true);
  });
  it('adds a fence to a document without frontmatter', () => {
    const out = applyFields('Just body\n', { title: 'T', type: 'guide' });
    expect(out.startsWith('---\ntitle: T\ntype: guide\n---\n')).toBe(true);
  });
  it('writes tags as a list', () => {
    const out = applyFields(doc, { tags: ['a', 'b'] });
    expect(readFields(splitDocument(out).head).tags).toEqual(['a', 'b']);
  });
});
```

`src/session/SessionStore.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { BrowserSessionStore, SESSION_STORAGE_KEY } from './SessionStore.js';

function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 } as Storage;
}
const session = { provider: 'github-token', token: 'ghp_x', createdAt: '2026-09-07T00:00:00Z' };

describe('BrowserSessionStore', () => {
  it('keeps the session in memory only unless remember is set', () => {
    const storage = fakeStorage();
    const store = new BrowserSessionStore(storage);
    store.save(session, false);
    expect(store.load()).toEqual(session);
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
  it('persists with remember and clears on clear()', () => {
    const storage = fakeStorage();
    const store = new BrowserSessionStore(storage);
    store.save(session, true);
    expect(JSON.parse(storage.getItem(SESSION_STORAGE_KEY)!)).toEqual(session);
    expect(new BrowserSessionStore(storage).load()).toEqual(session);
    store.clear();
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(store.load()).toBeNull();
  });
});
```

`src/mdx/componentsManifest.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { loadComponentsManifest, DEFAULT_COMPONENTS, toJsxDescriptors } from './componentsManifest.js';

describe('components manifest', () => {
  it('falls back to defaults when the site does not publish one', async () => {
    const f: typeof fetch = async () => new Response(null, { status: 404 });
    expect(await loadComponentsManifest('http://x/platform/components.json', f)).toEqual(DEFAULT_COMPONENTS);
  });
  it('maps props and previews to MDXEditor descriptors without a source', () => {
    const d = toJsxDescriptors(DEFAULT_COMPONENTS, { 'model-viewer': () => null, 'fbx-viewer': () => null, tabs: () => null, 'tab-item': () => null, generic: () => null });
    const mv = d.find((x) => x.name === 'ModelViewer')!;
    expect(mv.source).toBeUndefined();
    expect(mv.props).toEqual(expect.arrayContaining([{ name: 'height', type: 'number' }, { name: 'repo', type: 'string' }]));
    expect(d.find((x) => x.name === 'Tabs')!.hasChildren).toBe(true);
  });
});
```

`src/mdx/folderIntro.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { splitFolderIntro, replaceFolderIntro } from './folderIntro.js';

const index = '---\ntitle: Systems\n---\n\nIntro paragraph.\n\n<!-- okf:index -->\n## Pages\n* [A](a.md) - a.\n<!-- /okf:index -->\n';

describe('folder intro editing', () => {
  it('splits text before, inside and after the generated block', () => {
    const p = splitFolderIntro(index);
    expect(p.before).toBe('---\ntitle: Systems\n---\n\nIntro paragraph.\n\n');
    expect(p.generated).toBe('<!-- okf:index -->\n## Pages\n* [A](a.md) - a.\n<!-- /okf:index -->');
    expect(p.after).toBe('\n');
  });
  it('replaces only the text before the block', () => {
    const out = replaceFolderIntro(index, '---\ntitle: Systems\n---\n\nNew intro.\n\n');
    expect(out).toBe('---\ntitle: Systems\n---\n\nNew intro.\n\n<!-- okf:index -->\n## Pages\n* [A](a.md) - a.\n<!-- /okf:index -->\n');
  });
});
```

Run: `cd services/editor && npm install && npx vitest run`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement the pure modules**

`src/frontmatter/yamlDoc.ts`:

```ts
import { parseDocument, Document } from 'yaml';

export interface FrontmatterFields { title: string; description: string; type: string; tags: string[]; resource: string; sidebar_position: number | null }

const FENCE = /^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function splitDocument(text: string): { head: string; body: string; hasFrontmatter: boolean } {
  const m = text.match(FENCE);
  if (!m) return { head: '', body: text, hasFrontmatter: false };
  return { head: m[1]!, body: text.slice(m[0].length), hasFrontmatter: true };
}

const str = (v: unknown): string => (v === undefined || v === null ? '' : String(v));

export function readFields(head: string): FrontmatterFields {
  const doc = parseDocument(head || '{}');
  const get = (k: string): unknown => doc.get(k, true) instanceof Object && 'toJSON' in (doc.get(k, true) as object) ? (doc.get(k, true) as { toJSON(): unknown }).toJSON() : doc.get(k);
  const tags = get('tags');
  const pos = get('sidebar_position');
  return {
    title: str(get('title')), description: str(get('description')), type: str(get('type')),
    tags: Array.isArray(tags) ? tags.map(str) : [], resource: str(get('resource')),
    sidebar_position: typeof pos === 'number' ? pos : pos === undefined || pos === null || pos === '' ? null : Number(pos),
  };
}

/** Rewrite only the given keys; untouched lines, comments, quoting and scalar types survive. */
export function applyFields(text: string, fields: Partial<FrontmatterFields>): string {
  const { head, body, hasFrontmatter } = splitDocument(text);
  const doc: Document = hasFrontmatter ? parseDocument(head) : new Document({});
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    if (v === null || (Array.isArray(v) && v.length === 0 && k === 'tags' && !doc.has(k))) { if (doc.has(k)) doc.delete(k); continue; }
    doc.set(k, v);
  }
  const yaml = doc.toString().replace(/\n$/, '');
  return `---\n${yaml}\n---\n${body}`;
}
```

`src/session/SessionStore.ts`:

```ts
import type { Session } from '@platform/contracts';

export const SESSION_STORAGE_KEY = 'docs-platform.session';

/** Memory-first session holder; localStorage only when the user opts in ("remember on this device"). */
export class BrowserSessionStore {
  private memory: Session | null = null;
  constructor(private readonly storage: Storage | null) {}
  load(): Session | null {
    if (this.memory) return this.memory;
    try { const raw = this.storage?.getItem(SESSION_STORAGE_KEY); this.memory = raw ? (JSON.parse(raw) as Session) : null; } catch { this.memory = null; }
    return this.memory;
  }
  save(session: Session, remember: boolean): void {
    this.memory = session;
    try { if (remember) this.storage?.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)); else this.storage?.removeItem(SESSION_STORAGE_KEY); } catch { /* storage blocked */ }
  }
  clear(): void { this.memory = null; try { this.storage?.removeItem(SESSION_STORAGE_KEY); } catch { /* ignore */ } }
}
```

`src/mdx/componentsManifest.ts`:

```ts
import type { ComponentsManifest, ComponentDescriptor } from '@platform/contracts';
import type { JsxComponentDescriptor } from '@mdxeditor/editor';
import type { ComponentType } from 'react';

export const DEFAULT_COMPONENTS: ComponentsManifest = {
  components: [
    { name: 'ModelViewer', kind: 'flow', hasChildren: false, preview: 'model-viewer', props: [{ name: 'src', type: 'string' }, { name: 'repo', type: 'string' }, { name: 'ref', type: 'string' }, { name: 'path', type: 'string' }, { name: 'alt', type: 'string' }, { name: 'height', type: 'number' }] },
    { name: 'FbxViewer', kind: 'flow', hasChildren: false, preview: 'fbx-viewer', props: [{ name: 'src', type: 'string' }, { name: 'repo', type: 'string' }, { name: 'ref', type: 'string' }, { name: 'path', type: 'string' }, { name: 'alt', type: 'string' }, { name: 'height', type: 'number' }] },
    { name: 'Tabs', kind: 'flow', hasChildren: true, preview: 'tabs', props: [{ name: 'groupId', type: 'string' }] },
    { name: 'TabItem', kind: 'flow', hasChildren: true, preview: 'tab-item', props: [{ name: 'value', type: 'string' }, { name: 'label', type: 'string' }, { name: 'default', type: 'boolean' }] },
  ],
};

export async function loadComponentsManifest(url: string, f: typeof fetch = globalThis.fetch.bind(globalThis)): Promise<ComponentsManifest> {
  try {
    const res = await f(url);
    if (!res.ok) return DEFAULT_COMPONENTS;
    const data = (await res.json()) as ComponentsManifest;
    return Array.isArray(data.components) && data.components.length ? data : DEFAULT_COMPONENTS;
  } catch { return DEFAULT_COMPONENTS; }
}

export type PreviewRegistry = Record<ComponentDescriptor['preview'], ComponentType<{ mdastNode: never; descriptor: JsxComponentDescriptor }>>;

/** Descriptors carry no `source`: the site registers these components globally, so no import lines are emitted. */
export function toJsxDescriptors(manifest: ComponentsManifest, previews: PreviewRegistry): JsxComponentDescriptor[] {
  return manifest.components.map((c) => ({
    name: c.name,
    kind: c.kind,
    props: c.props.map((p) => ({ name: p.name, type: p.type === 'number' ? 'number' : p.type === 'boolean' ? 'expression' : 'string' })),
    hasChildren: c.hasChildren,
    Editor: (previews[c.preview] ?? previews.generic) as JsxComponentDescriptor['Editor'],
  }));
}
```

`src/mdx/folderIntro.ts`:

```ts
import { START_MARKER, END_MARKER } from '@platform/okf-core';

export function splitFolderIntro(indexText: string): { before: string; generated: string; after: string } {
  const s = indexText.indexOf(START_MARKER);
  const e = indexText.indexOf(END_MARKER);
  if (s < 0 || e < 0) return { before: indexText, generated: '', after: '' };
  return { before: indexText.slice(0, s), generated: indexText.slice(s, e + END_MARKER.length), after: indexText.slice(e + END_MARKER.length) };
}

export function replaceFolderIntro(indexText: string, before: string): string {
  const p = splitFolderIntro(indexText);
  return before + p.generated + p.after;
}
```

Run: `npx vitest run`
Expected: PASS (all four suites).

- [ ] **Step 4: Composition root, context and session**

`src/composition/createPlatform.ts` (the ONLY file allowed to import service implementations):

```ts
import type { AuthProvider, ContentBackend, PlatformConfig, Session } from '@platform/contracts';
import { GithubTokenProvider, MockAuthProvider } from '@platform/auth';
import { GithubBrowserBackend, HttpContentBackend } from '@platform/content';
import platform from '../../../../platform.config.js';

export interface Platform { auth: AuthProvider; backend(session: Session | null): ContentBackend; config: PlatformConfig; componentsUrl: string }

export function createPlatform(env: Record<string, string | undefined> = import.meta.env as Record<string, string | undefined>): Platform {
  const config = platform as PlatformConfig;
  const authKind = env['VITE_PLATFORM_AUTH'] ?? config.auth.provider;
  const contentUrl = env['VITE_PLATFORM_CONTENT'] ?? (config.content.backend === 'http' ? config.content.url : undefined);
  const auth: AuthProvider = authKind === 'mock' ? new MockAuthProvider() : new GithubTokenProvider({ owner: config.organizationName, repo: config.projectName });
  const backend = (session: Session | null): ContentBackend =>
    contentUrl
      ? new HttpContentBackend(contentUrl)
      : new GithubBrowserBackend({ owner: config.organizationName, repo: config.projectName, branch: config.deployBranch, sitePath: config.sitePath, codeRepos: config.codeRepos, token: session?.token ?? null });
  return { auth, backend, config, componentsUrl: `${config.baseUrl}platform/components.json` };
}
```

`src/PlatformContext.tsx`:

```tsx
import { createContext, useContext } from 'react';
import type { ContentBackend, Identity, Session } from '@platform/contracts';
import type { Platform } from './composition/createPlatform.js';

export interface PlatformSession { platform: Platform; session: Session; identity: Identity; backend: ContentBackend; logout(): void }
export const PlatformContext = createContext<PlatformSession | null>(null);
export function usePlatform(): PlatformSession {
  const v = useContext(PlatformContext);
  if (!v) throw new Error('usePlatform outside PlatformContext');
  return v;
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@mdxeditor/editor/style.css';
import './styles/theme.css';
import { App } from './App.js';
import { createPlatform } from './composition/createPlatform.js';

createRoot(document.getElementById('root')!).render(<StrictMode><App platform={createPlatform()} /></StrictMode>);
```

`src/styles/theme.css` (arcade tokens copied from `site/src/css/custom.css`; only what the editor uses):

```css
:root { --bg: #0C1230; --surface: #131B3F; --text: #F4EEDF; --primary: #8F8AE8; --interactive: #43C8BE; --outline: #1B2447; --danger: #E5484D; --ok: #43C8BE;
  --ifm-color-emphasis-300: #2A3560; --ifm-color-emphasis-700: #9FB1E0; --ifm-background-surface-color: var(--surface); --ifm-font-color-base: var(--text); --ifm-global-radius: 6px; --ifm-font-family-monospace: ui-monospace, SFMono-Regular, Menlo, monospace; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.layout { display: grid; grid-template-columns: 320px 1fr; min-height: 100vh; }
.sidebar { background: var(--surface); border-right: 1px solid var(--outline); padding: 1rem; overflow: auto; }
.main { padding: 1.5rem 2rem; overflow: auto; }
.btn { background: var(--primary); color: #0C1230; border: 0; border-radius: var(--ifm-global-radius); padding: 0.5rem 0.9rem; font-weight: 600; cursor: pointer; }
.btn.secondary { background: transparent; color: var(--text); border: 1px solid var(--outline); }
.btn.danger { background: var(--danger); color: white; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
input, select, textarea { background: var(--bg); color: var(--text); border: 1px solid var(--outline); border-radius: var(--ifm-global-radius); padding: 0.45rem 0.6rem; width: 100%; box-sizing: border-box; }
label.row { display: grid; grid-template-columns: 140px 1fr; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
.problems { background: #3a1d22; border: 1px solid var(--danger); border-radius: var(--ifm-global-radius); padding: 0.75rem 1rem; margin: 0.75rem 0; }
.notice { background: #2a2540; border: 1px solid var(--primary); border-radius: var(--ifm-global-radius); padding: 0.75rem 1rem; margin: 0.75rem 0; }
.ok { color: var(--ok); }
.filelist { list-style: none; padding: 0; margin: 0; } .filelist button { display: block; width: 100%; text-align: left; background: transparent; border: 0; color: inherit; padding: 0.35rem 0.5rem; border-radius: var(--ifm-global-radius); font-family: var(--ifm-font-family-monospace); font-size: 0.85rem; cursor: pointer; }
.filelist button.active { background: var(--primary); color: #0C1230; }
.editorFrame { border: 1px solid var(--outline); border-radius: var(--ifm-global-radius); background: var(--surface); }
.mdxeditor-docs-body { min-height: 50vh; padding: 0.5rem 1rem; }
.modal { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; }
.modal > div { background: var(--surface); padding: 1.5rem; border-radius: 8px; width: min(560px, 90vw); }
```

- [ ] **Step 5: Login gate, file picker, forms, dialogs**

`src/components/LoginGate.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import type { Credentials, Identity, Session } from '@platform/contracts';
import type { Platform } from '../composition/createPlatform.js';

export function LoginGate({ platform, onAuthed }: { platform: Platform; onAuthed: (session: Session, identity: Identity, remember: boolean) => void }) {
  const [token, setToken] = useState('');
  const [name, setName] = useState('');
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isMock = platform.auth.id === 'mock';
  const repo = `${platform.config.organizationName}/${platform.config.projectName}`;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const creds: Credentials = isMock ? { kind: 'mock', name, role: 'editor' } : { kind: 'github-token', token };
      const session = await platform.auth.login(creds);
      const identity = await platform.auth.verify(session);
      onAuthed(session, identity, remember);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal"><div>
      <h1>Docs Editor - Sign in</h1>
      {isMock ? (
        <p>Development sign-in: choose a display name.</p>
      ) : (
        <p>Paste a <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">fine-grained personal access token</a> scoped to <strong>{repo}</strong> with <strong>Contents: Read and write</strong>. Only write collaborators can sign in.</p>
      )}
      <form onSubmit={submit}>
        {isMock
          ? <input aria-label="Display name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          : <input aria-label="GitHub token" type="password" placeholder="github_pat_..." value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />}
        <label style={{ display: 'block', margin: '0.75rem 0' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember on this device
        </label>
        {remember && <div className="notice">Anyone using this browser profile can read the saved token and commit as you. Do not enable this on a shared machine; use "Forget token" when done.</div>}
        <button className="btn" type="submit" disabled={busy || (isMock ? !name.trim() : !token.trim())}>{busy ? 'Verifying...' : 'Sign in'}</button>
      </form>
      {error && <p className="problems">{error}</p>}
    </div></div>
  );
}
```

`src/components/FilePicker.tsx`:

```tsx
import { useMemo, useState } from 'react';
import type { PageSummary } from '@platform/contracts';

export interface FilePickerProps { pages: PageSummary[]; folders: string[]; selected: string | null; onSelectPage(path: string): void; onSelectFolder(dir: string): void }

/** Concept pages only (the backend already hides reserved files); folders open the intro editor. */
export function FilePicker({ pages, folders, selected, onSelectPage, onSelectFolder }: FilePickerProps) {
  const [filter, setFilter] = useState('');
  const q = filter.trim().toLowerCase();
  const shown = useMemo(() => pages.filter((p) => !q || p.path.toLowerCase().includes(q) || p.title.toLowerCase().includes(q)), [pages, q]);
  return (
    <div>
      <input type="search" aria-label="Filter pages" placeholder="Filter pages..." value={filter} onChange={(e) => setFilter(e.target.value)} />
      <h3>Pages</h3>
      <ul className="filelist">{shown.map((p) => <li key={p.path}><button className={selected === p.path ? 'active' : ''} title={p.description} onClick={() => onSelectPage(p.path)}>{p.path}</button></li>)}</ul>
      <h3>Folder intros</h3>
      <ul className="filelist">{folders.map((d) => <li key={d}><button className={selected === `${d ? d + '/' : ''}index.md` ? 'active' : ''} onClick={() => onSelectFolder(d)}>{d || '(root)'}/index.md</button></li>)}</ul>
    </div>
  );
}
```

`src/components/FrontmatterForm.tsx`:

```tsx
import type { FrontmatterFields } from '../frontmatter/yamlDoc.js';

export function FrontmatterForm({ fields, typesInUse, onChange, disabled }: { fields: FrontmatterFields; typesInUse: string[]; onChange(next: FrontmatterFields): void; disabled?: boolean }) {
  const set = <K extends keyof FrontmatterFields>(k: K, v: FrontmatterFields[K]) => onChange({ ...fields, [k]: v });
  const types = fields.type && !typesInUse.includes(fields.type) ? [...typesInUse, fields.type] : typesInUse;
  return (
    <section>
      <h3>Frontmatter</h3>
      <label className="row"><span>title</span><input value={fields.title} disabled={disabled} onChange={(e) => set('title', e.target.value)} /></label>
      <label className="row"><span>description</span><input value={fields.description} disabled={disabled} placeholder="One sentence: when should someone open this page?" onChange={(e) => set('description', e.target.value)} /></label>
      <label className="row"><span>type</span>
        <span style={{ display: 'flex', gap: '0.5rem' }}>
          <select value={types.includes(fields.type) ? fields.type : ''} disabled={disabled} onChange={(e) => set('type', e.target.value)}>
            <option value="">(choose)</option>{types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input placeholder="new type" disabled={disabled} value={types.includes(fields.type) ? '' : fields.type} onChange={(e) => set('type', e.target.value)} />
        </span>
      </label>
      <label className="row"><span>tags</span><input value={fields.tags.join(', ')} disabled={disabled} placeholder="comma, separated" onChange={(e) => set('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))} /></label>
      <label className="row"><span>resource</span><input value={fields.resource} disabled={disabled} placeholder="https://github.com/<owner>/<repo>/blob/<ref>/<path>" onChange={(e) => set('resource', e.target.value)} /></label>
      <label className="row"><span>sidebar_position</span><input type="number" disabled={disabled} value={fields.sidebar_position ?? ''} onChange={(e) => set('sidebar_position', e.target.value === '' ? null : Number(e.target.value))} /></label>
    </section>
  );
}
```

`src/components/ProblemList.tsx`:

```tsx
import type { Problem } from '@platform/okf-core';
export function ProblemList({ problems, title }: { problems: Problem[]; title: string }) {
  if (!problems.length) return null;
  return <div className="problems" role="alert"><strong>{title}</strong><ul>{problems.map((p, i) => <li key={i}><code>{p.file}</code> [{p.rule}] {p.message}</li>)}</ul></div>;
}
```

`src/components/NewPageDialog.tsx`:

```tsx
import { useState } from 'react';
import { applyFields } from '../frontmatter/yamlDoc.js';

export function NewPageDialog({ typesInUse, defaultResource, onCreate, onClose }: { typesInUse: string[]; defaultResource: string; onCreate(path: string, text: string): Promise<void>; onClose(): void }) {
  const [path, setPath] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState(typesInUse[0] ?? 'guide');
  const [resource, setResource] = useState(defaultResource);
  const [error, setError] = useState('');
  const create = async () => {
    try {
      const text = applyFields(`\n# ${title}\n\nWrite the page here.\n`, { title, description, type, tags: [], resource });
      await onCreate(path.trim(), text);
    } catch (e) { setError((e as Error).message); }
  };
  return (
    <div className="modal"><div>
      <h2>New page</h2>
      <label className="row"><span>path</span><input aria-label="New page path" placeholder="systems/status-effects.md" value={path} onChange={(e) => setPath(e.target.value)} /></label>
      <label className="row"><span>title</span><input aria-label="New page title" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="row"><span>description</span><input aria-label="New page description" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <label className="row"><span>type</span><input aria-label="New page type" value={type} onChange={(e) => setType(e.target.value)} list="types" /><datalist id="types">{typesInUse.map((t) => <option key={t} value={t} />)}</datalist></label>
      <label className="row"><span>resource</span><input aria-label="New page resource" value={resource} onChange={(e) => setResource(e.target.value)} /></label>
      {error && <p className="problems">{error}</p>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn" onClick={create} disabled={!path.endsWith('.md') || !title || !description || !type}>Create</button>
        <button className="btn secondary" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}
```

`src/components/PublishDialog.tsx`:

```tsx
import { useState } from 'react';
export function PublishDialog({ existing, onPublish, onClose }: { existing: string[]; onPublish(version: string): Promise<void>; onClose(): void }) {
  const [version, setVersion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = /^\d+\.\d+\.\d+$/.test(version) && !existing.includes(version);
  return (
    <div className="modal"><div>
      <h2>Publish a frozen version</h2>
      <p>Snapshots the Latest docs into a read-only version, pins every code resource to the current commit of its repository, and tags the docs repo <code>docs-v&lt;version&gt;</code>.</p>
      <label className="row"><span>version</span><input aria-label="Version" placeholder="1.1.0" value={version} onChange={(e) => setVersion(e.target.value)} /></label>
      {error && <p className="problems">{error}</p>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn" disabled={!valid || busy} onClick={async () => { setBusy(true); setError(''); try { await onPublish(version); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>{busy ? 'Publishing...' : 'Publish'}</button>
        <button className="btn secondary" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}
```

`src/components/FolderIntroEditor.tsx`:

```tsx
import { useState } from 'react';
import { splitFolderIntro, replaceFolderIntro } from '../mdx/folderIntro.js';

/** Edits only the hand-written part of an index.md; the generated block is shown read-only. */
export function FolderIntroEditor({ text, onSave, readOnly }: { text: string; onSave(next: string): Promise<void>; readOnly: boolean }) {
  const parts = splitFolderIntro(text);
  const [before, setBefore] = useState(parts.before);
  return (
    <div>
      <h3>Folder intro (frontmatter + intro paragraph)</h3>
      <textarea rows={10} value={before} readOnly={readOnly} onChange={(e) => setBefore(e.target.value)} />
      <h3>Generated block (read-only)</h3>
      <pre style={{ opacity: 0.7 }}>{parts.generated}</pre>
      <button className="btn" disabled={readOnly || before === parts.before} onClick={() => onSave(replaceFolderIntro(text, before))}>Save intro</button>
    </div>
  );
}
```

- [ ] **Step 6: MDX descriptors, toolbar buttons, body editor**

`src/mdx/uploadHelpers.ts`:

```ts
export const fileExtension = (name: string): string => { const i = name.lastIndexOf('.'); return i >= 0 ? name.slice(i + 1).toLowerCase() : ''; };
export const sanitizeFileName = (name: string): string => name.trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9._-]/g, '');
export const readFileBytes = (file: File): Promise<Uint8Array> => file.arrayBuffer().then((b) => new Uint8Array(b));
```

`src/mdx/descriptors.tsx` (port of `website/src/components/editor/jsxDescriptors.jsx`, previews from `@platform/viewers`, asset resolution through the context backend):

```tsx
import { useEffect, useState } from 'react';
import { NestedLexicalEditor, useMdastNodeUpdater } from '@mdxeditor/editor';
import type { MdxJsxFlowElement, MdxJsxAttribute } from 'mdast-util-mdx-jsx';
import { ModelViewerCore, FbxViewerCore } from '@platform/viewers';
import { usePlatform } from '../PlatformContext.js';
import type { PreviewRegistry } from './componentsManifest.js';

type Node = MdxJsxFlowElement;
const readAttr = (n: Node, name: string): string | undefined => {
  const a = n.attributes.find((x): x is MdxJsxAttribute => x.type === 'mdxJsxAttribute' && x.name === name);
  if (!a || a.value == null) return a && a.value === null ? 'true' : undefined;
  return typeof a.value === 'string' ? a.value : a.value.value;
};
const strAttr = (name: string, value: string): MdxJsxAttribute => ({ type: 'mdxJsxAttribute', name, value });
const exprAttr = (name: string, expr: string): MdxJsxAttribute => ({ type: 'mdxJsxAttribute', name, value: { type: 'mdxJsxAttributeValueExpression', value: expr } });

const wrap: React.CSSProperties = { border: '1px dashed var(--ifm-color-emphasis-300)', borderRadius: 6, padding: '0.75rem', margin: '0.5rem 0' };
const row: React.CSSProperties = { display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' };

/** Resolves repo/ref/path to an object URL via the backend, or passes src through. */
function useViewerUrl(src: string | undefined, repo: string | undefined, ref: string | undefined, path: string | undefined): string | null {
  const { backend, platform } = usePlatform();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (src) { setUrl(src.startsWith('/') ? `${platform.config.baseUrl}${src.slice(1)}` : src); return undefined; }
    if (!repo || !path) { setUrl(null); return undefined; }
    let obj: string | null = null;
    const r = ref ?? platform.config.codeRepos.find((c) => `${c.owner}/${c.repo}` === repo)?.defaultRef ?? 'main';
    backend.getAsset({ repo, ref: r, path }).then((b) => { obj = URL.createObjectURL(b); setUrl(obj); }).catch(() => setUrl(null));
    return () => { if (obj) URL.revokeObjectURL(obj); };
  }, [src, repo, ref, path, backend, platform]);
  return url;
}

function ViewerEditor({ mdastNode, label, kind }: { mdastNode: Node; label: string; kind: 'model' | 'fbx' }) {
  const update = useMdastNodeUpdater();
  const v = { src: readAttr(mdastNode, 'src') ?? '', repo: readAttr(mdastNode, 'repo') ?? '', ref: readAttr(mdastNode, 'ref') ?? '', path: readAttr(mdastNode, 'path') ?? '', alt: readAttr(mdastNode, 'alt') ?? '', height: readAttr(mdastNode, 'height') ?? '480' };
  const commit = (next: Partial<typeof v>) => {
    const n = { ...v, ...next };
    const attributes: MdxJsxAttribute[] = [];
    for (const k of ['src', 'repo', 'ref', 'path', 'alt'] as const) if (n[k]) attributes.push(strAttr(k, n[k]));
    if (n.height && !Number.isNaN(Number(n.height))) attributes.push(exprAttr('height', String(Number(n.height))));
    update({ attributes });
  };
  const url = useViewerUrl(v.src || undefined, v.repo || undefined, v.ref || undefined, v.path || undefined);
  const h = Number(v.height) || 480;
  return (
    <div style={wrap} contentEditable={false}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      {(['src', 'repo', 'ref', 'path', 'alt', 'height'] as const).map((k) => (
        <div style={row} key={k}><span style={{ width: 64, fontFamily: 'monospace', fontSize: '0.8rem' }}>{k}</span><input value={v[k]} onChange={(e) => commit({ [k]: e.target.value })} /></div>
      ))}
      {url ? (kind === 'fbx' ? <FbxViewerCore src={url} height={h} /> : <ModelViewerCore src={url} alt={v.alt} height={h} />) : <div style={{ padding: '1rem', textAlign: 'center' }}>Set src, or repo + path, to preview.</div>}
    </div>
  );
}

function TabsEditor({ mdastNode }: { mdastNode: Node }) {
  return (
    <div style={{ ...wrap, borderStyle: 'solid' }}>
      <div contentEditable={false} style={{ fontSize: '0.75rem', fontWeight: 700 }}>Tabs{readAttr(mdastNode, 'groupId') ? ` (groupId="${readAttr(mdastNode, 'groupId')}")` : ''}</div>
      <NestedLexicalEditor<Node> block getContent={(n) => n.children} getUpdatedMdastNode={(n, children) => ({ ...n, children })} />
    </div>
  );
}

function TabItemEditor({ mdastNode }: { mdastNode: Node }) {
  const update = useMdastNodeUpdater();
  const value = readAttr(mdastNode, 'value') ?? '';
  const label = readAttr(mdastNode, 'label') ?? '';
  const isDefault = mdastNode.attributes.some((a) => a.type === 'mdxJsxAttribute' && a.name === 'default');
  const commit = (next: { value?: string; label?: string; default?: boolean }) => {
    const attributes: MdxJsxAttribute[] = [strAttr('value', next.value ?? value), strAttr('label', next.label ?? label)];
    if (next.default ?? isDefault) attributes.push({ type: 'mdxJsxAttribute', name: 'default', value: null });
    update({ attributes });
  };
  return (
    <div style={wrap}>
      <div style={row} contentEditable={false}>
        <span>value</span><input value={value} onChange={(e) => commit({ value: e.target.value })} />
        <span>label</span><input value={label} onChange={(e) => commit({ label: e.target.value })} />
        <label><input type="checkbox" style={{ width: 'auto' }} checked={isDefault} onChange={(e) => commit({ default: e.target.checked })} /> default</label>
      </div>
      <NestedLexicalEditor<Node> block getContent={(n) => n.children} getUpdatedMdastNode={(n, children) => ({ ...n, children })} />
    </div>
  );
}

function GenericEditor({ mdastNode }: { mdastNode: Node }) {
  return <div style={wrap} contentEditable={false}><code>&lt;{mdastNode.name} /&gt;</code> (edit its props in Raw mode)</div>;
}

export const previews: PreviewRegistry = {
  'model-viewer': (p) => <ViewerEditor mdastNode={p.mdastNode as unknown as Node} label="ModelViewer" kind="model" />,
  'fbx-viewer': (p) => <ViewerEditor mdastNode={p.mdastNode as unknown as Node} label="FbxViewer" kind="fbx" />,
  tabs: (p) => <TabsEditor mdastNode={p.mdastNode as unknown as Node} />,
  'tab-item': (p) => <TabItemEditor mdastNode={p.mdastNode as unknown as Node} />,
  generic: (p) => <GenericEditor mdastNode={p.mdastNode as unknown as Node} />,
};
```

`src/mdx/toolbar/InsertModelButton.tsx`:

```tsx
import { useRef, useState } from 'react';
import { ButtonWithTooltip, usePublisher, insertJsx$ } from '@mdxeditor/editor';
import { usePlatform } from '../../PlatformContext.js';
import { fileExtension, sanitizeFileName, readFileBytes } from '../uploadHelpers.js';

/** Upload a .glb/.gltf/.fbx to the site's static/models and insert the matching viewer. */
export function InsertModelButton({ fileLabel }: { fileLabel: string }) {
  const insertJsx = usePublisher(insertJsx$);
  const { backend, identity } = usePlatform();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const ext = fileExtension(file.name);
    if (!['glb', 'gltf', 'fbx'].includes(ext)) { window.alert(`Unsupported 3D model type ".${ext}". Use .glb, .gltf or .fbx.`); return; }
    const name = sanitizeFileName(file.name);
    const isFbx = ext === 'fbx';
    const assetPath = isFbx ? `models/fbx/${name}` : `models/${name}`;
    setBusy(true);
    try {
      await backend.uploadAsset(assetPath, await readFileBytes(file), { message: `Add 3D model ${name} for ${fileLabel}`, author: { name: identity.name, email: identity.email ?? `${identity.login}@users.noreply.github.com` } });
      insertJsx({ name: isFbx ? 'FbxViewer' : 'ModelViewer', kind: 'flow', props: { src: `/${assetPath}`, alt: name } });
    } catch (e) { window.alert(`Could not insert 3D model: ${(e as Error).message}`); }
    finally { setBusy(false); }
  };
  return (<>
    <ButtonWithTooltip title={busy ? 'Uploading model...' : 'Insert 3D model (.glb, .gltf, .fbx)'} onClick={() => input.current?.click()} disabled={busy}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2 21 7v10l-9 5-9-5V7l9-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M3 7l9 5 9-5M12 12v10" stroke="currentColor" strokeWidth="1.6" /></svg>
    </ButtonWithTooltip>
    <input ref={input} type="file" accept=".glb,.gltf,.fbx" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void onFile(f); }} />
  </>);
}
```

`src/mdx/toolbar/InsertImageButton.tsx`:

```tsx
import { useRef, useState } from 'react';
import { ButtonWithTooltip, usePublisher, insertImage$ } from '@mdxeditor/editor';
import { usePlatform } from '../../PlatformContext.js';
import { fileExtension, sanitizeFileName, readFileBytes } from '../uploadHelpers.js';

export function InsertImageButton({ fileLabel }: { fileLabel: string }) {
  const insertImage = usePublisher(insertImage$);
  const { backend, identity, platform } = usePlatform();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(fileExtension(file.name))) { window.alert('Unsupported image type.'); return; }
    const name = sanitizeFileName(file.name);
    setBusy(true);
    try {
      const res = await backend.uploadAsset(`uploads/${name}`, await readFileBytes(file), { message: `Add image ${name} for ${fileLabel}`, author: { name: identity.name, email: identity.email ?? `${identity.login}@users.noreply.github.com` } });
      insertImage({ src: `${platform.config.baseUrl}${res.asset.url.slice(1)}`, altText: name });
    } catch (e) { window.alert(`Could not upload image: ${(e as Error).message}`); }
    finally { setBusy(false); }
  };
  return (<>
    <ButtonWithTooltip title={busy ? 'Uploading image...' : 'Upload image'} onClick={() => input.current?.click()} disabled={busy}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.6" /></svg>
    </ButtonWithTooltip>
    <input ref={input} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void onFile(f); }} />
  </>);
}
```

`src/mdx/toolbar/InsertFromRepoButton.tsx`:

```tsx
import { useState } from 'react';
import { ButtonWithTooltip, usePublisher, insertJsx$, insertImage$ } from '@mdxeditor/editor';
import type { AssetInfo } from '@platform/contracts';
import { usePlatform } from '../../PlatformContext.js';

/** Insert an asset already committed to the site (no re-upload). */
export function InsertFromRepoButton() {
  const insertJsx = usePublisher(insertJsx$);
  const insertImage = usePublisher(insertImage$);
  const { backend, platform } = usePlatform();
  const [assets, setAssets] = useState<AssetInfo[] | null>(null);
  const [open, setOpen] = useState(false);
  const openPicker = async () => { setOpen(true); if (!assets) setAssets(await backend.listAssets().catch(() => [])); };
  const pick = (a: AssetInfo) => {
    if (a.kind === 'model') insertJsx({ name: a.path.endsWith('.fbx') ? 'FbxViewer' : 'ModelViewer', kind: 'flow', props: { src: a.url, alt: a.path.split('/').at(-1) ?? a.path } });
    else insertImage({ src: `${platform.config.baseUrl}${a.url.slice(1)}`, altText: a.path });
    setOpen(false);
  };
  return (<>
    <ButtonWithTooltip title="Insert from repo (existing models and images)" onClick={openPicker}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.6" /></svg>
    </ButtonWithTooltip>
    {open && <div className="modal" onClick={() => setOpen(false)}><div onClick={(e) => e.stopPropagation()}>
      <h3>Insert from repo</h3>
      {!assets ? <p>Loading...</p> : assets.length === 0 ? <p>No assets committed yet.</p> : <ul className="filelist">{assets.map((a) => <li key={a.path}><button onClick={() => pick(a)}>{a.kind}: {a.path}</button></li>)}</ul>}
      <button className="btn secondary" onClick={() => setOpen(false)}>Close</button>
    </div></div>}
  </>);
}
```

`src/mdx/toolbar/InsertTabsButton.tsx`:

```tsx
import { ButtonWithTooltip, usePublisher, insertJsx$ } from '@mdxeditor/editor';

export function InsertTabsButton() {
  const insertJsx = usePublisher(insertJsx$);
  const insert = () => insertJsx({
    name: 'Tabs', kind: 'flow', props: {},
    children: [
      { type: 'mdxJsxFlowElement', name: 'TabItem', attributes: [{ type: 'mdxJsxAttribute', name: 'value', value: 'one' }, { type: 'mdxJsxAttribute', name: 'label', value: 'One' }, { type: 'mdxJsxAttribute', name: 'default', value: null }], children: [{ type: 'paragraph', children: [{ type: 'text', value: 'First tab' }] }] },
      { type: 'mdxJsxFlowElement', name: 'TabItem', attributes: [{ type: 'mdxJsxAttribute', name: 'value', value: 'two' }, { type: 'mdxJsxAttribute', name: 'label', value: 'Two' }], children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Second tab' }] }] },
    ],
  });
  return <ButtonWithTooltip title="Insert tabs" onClick={insert}><span style={{ fontWeight: 700, fontSize: 12 }}>TABS</span></ButtonWithTooltip>;
}
```

`src/components/BodyEditor.tsx` (port of `editorClient.js`):

```tsx
import { useMemo, type Ref } from 'react';
import {
  MDXEditor, headingsPlugin, listsPlugin, quotePlugin, thematicBreakPlugin, markdownShortcutPlugin, linkPlugin, linkDialogPlugin, imagePlugin, tablePlugin,
  codeBlockPlugin, codeMirrorPlugin, directivesPlugin, AdmonitionDirectiveDescriptor, jsxPlugin, toolbarPlugin, UndoRedo, BoldItalicUnderlineToggles, BlockTypeSelect,
  CreateLink, InsertImage, InsertTable, InsertThematicBreak, ListsToggle, InsertCodeBlock, InsertAdmonition, ConditionalContents, ChangeCodeMirrorLanguage, Separator,
  type MDXEditorMethods,
} from '@mdxeditor/editor';
import type { ComponentsManifest } from '@platform/contracts';
import { toJsxDescriptors } from '../mdx/componentsManifest.js';
import { previews } from '../mdx/descriptors.js';
import { InsertModelButton } from '../mdx/toolbar/InsertModelButton.js';
import { InsertImageButton } from '../mdx/toolbar/InsertImageButton.js';
import { InsertFromRepoButton } from '../mdx/toolbar/InsertFromRepoButton.js';
import { InsertTabsButton } from '../mdx/toolbar/InsertTabsButton.js';

const CODE_LANGUAGES = { csharp: 'C#', yaml: 'YAML', bash: 'Bash', json: 'JSON', text: 'Plain text' };

export function BodyEditor({ markdown, editorRef, fileLabel, components, readOnly, onError }: { markdown: string; editorRef: Ref<MDXEditorMethods>; fileLabel: string; components: ComponentsManifest; readOnly: boolean; onError(e: { error: string; source: string }): void }) {
  const descriptors = useMemo(() => toJsxDescriptors(components, previews), [components]);
  return (
    <MDXEditor
      ref={editorRef}
      className="dark-theme dark-editor"
      markdown={markdown}
      readOnly={readOnly}
      onError={onError}
      contentEditableClassName="mdxeditor-docs-body"
      plugins={[
        headingsPlugin(), listsPlugin(), quotePlugin(), thematicBreakPlugin(), linkPlugin(), linkDialogPlugin(), imagePlugin(), tablePlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: 'text' }), codeMirrorPlugin({ codeBlockLanguages: CODE_LANGUAGES }),
        directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
        jsxPlugin({ jsxComponentDescriptors: descriptors }),
        markdownShortcutPlugin(),
        toolbarPlugin({ toolbarContents: () => (<>
          <UndoRedo /><Separator /><BoldItalicUnderlineToggles /><Separator /><BlockTypeSelect /><Separator /><ListsToggle /><Separator />
          <CreateLink /><InsertImage /><InsertImageButton fileLabel={fileLabel} /><InsertModelButton fileLabel={fileLabel} /><InsertFromRepoButton /><InsertTabsButton /><Separator />
          <InsertTable /><InsertThematicBreak /><Separator /><InsertCodeBlock /><InsertAdmonition /><Separator />
          <ConditionalContents options={[{ when: (editor) => editor?.editorType === 'codeblock', contents: () => <ChangeCodeMirrorLanguage /> }]} />
        </>) }),
      ]}
    />
  );
}
```

- [ ] **Step 7: `src/App.tsx`**

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import { ContentError, CURRENT_VERSION, type ComponentsManifest, type Identity, type PageSummary, type Session, type VersionInfo } from '@platform/contracts';
import { validatePage, type Problem } from '@platform/okf-core';
import type { Platform } from './composition/createPlatform.js';
import { PlatformContext } from './PlatformContext.js';
import { BrowserSessionStore } from './session/SessionStore.js';
import { LoginGate } from './components/LoginGate.js';
import { FilePicker } from './components/FilePicker.js';
import { FrontmatterForm } from './components/FrontmatterForm.js';
import { BodyEditor } from './components/BodyEditor.js';
import { ProblemList } from './components/ProblemList.js';
import { NewPageDialog } from './components/NewPageDialog.js';
import { PublishDialog } from './components/PublishDialog.js';
import { FolderIntroEditor } from './components/FolderIntroEditor.js';
import { splitDocument, readFields, applyFields, type FrontmatterFields } from './frontmatter/yamlDoc.js';
import { loadComponentsManifest, DEFAULT_COMPONENTS } from './mdx/componentsManifest.js';

const store = new BrowserSessionStore(typeof localStorage === 'undefined' ? null : localStorage);
const authorOf = (id: Identity) => ({ name: id.name, email: id.email ?? `${id.login}@users.noreply.github.com` });

export function App({ platform }: { platform: Platform }) {
  const [session, setSession] = useState<Session | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [checking, setChecking] = useState(true);
  const backend = useMemo(() => platform.backend(session), [platform, session]);

  // Re-verify a stored session on mount.
  useEffect(() => {
    const stored = store.load();
    if (!stored) { setChecking(false); return; }
    platform.auth.verify(stored).then((id) => { setSession(stored); setIdentity(id); }).catch(() => store.clear()).finally(() => setChecking(false));
  }, [platform]);

  const [components, setComponents] = useState<ComponentsManifest>(DEFAULT_COMPONENTS);
  useEffect(() => { void loadComponentsManifest(platform.componentsUrl).then(setComponents); }, [platform]);

  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [version, setVersion] = useState(CURRENT_VERSION);
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [etag, setEtag] = useState('');
  const [fields, setFields] = useState<FrontmatterFields | null>(null);
  const [mode, setMode] = useState<'visual' | 'raw'>('visual');
  const [rawText, setRawText] = useState('');
  const [message, setMessage] = useState('');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string; url?: string | null } | null>(null);
  const [dialog, setDialog] = useState<'new' | 'publish' | null>(null);
  const [busy, setBusy] = useState(false);
  const mdx = useRef<MDXEditorMethods>(null);
  const frozen = versions.find((v) => v.id === version)?.frozen ?? false;
  const isIndex = selected?.endsWith('index.md') ?? false;

  const refresh = useCallback(async () => {
    if (!identity) return;
    const [vs, ps] = await Promise.all([backend.listVersions(), backend.listPages(version)]);
    setVersions(vs); setPages(ps);
  }, [backend, identity, version]);
  useEffect(() => { void refresh().catch((e: Error) => setStatus({ kind: 'error', text: e.message })); }, [refresh]);

  const folders = useMemo(() => [...new Set(['', ...pages.map((p) => p.path.split('/').slice(0, -1)).flatMap((segs) => segs.map((_, i) => segs.slice(0, i + 1).join('/')))])].sort(), [pages]);
  const typesInUse = useMemo(() => [...new Set(pages.map((p) => p.type).filter(Boolean))].sort(), [pages]);

  const open = useCallback(async (path: string) => {
    setStatus(null); setProblems([]);
    try {
      const page = await backend.readPage(version, path);
      setSelected(path); setText(page.text); setEtag(page.etag); setRawText(page.text);
      setFields(path.endsWith('index.md') ? null : readFields(splitDocument(page.text).head));
      setMode('visual'); setMessage(`Update ${path}`);
    } catch (e) { setStatus({ kind: 'error', text: (e as Error).message }); }
  }, [backend, version]);

  const compose = useCallback((): string => {
    if (mode === 'raw') return rawText;
    const body = mdx.current?.getMarkdown() ?? splitDocument(text).body;
    const withFields = fields ? applyFields(text, fields) : text;
    return `${splitDocument(withFields).head ? `---\n${splitDocument(withFields).head}\n---\n` : ''}${body.startsWith('\n') ? body : `\n${body}`}`;
  }, [mode, rawText, text, fields]);

  const runAction = async (fn: () => Promise<void>) => {
    setBusy(true); setStatus(null); setProblems([]);
    try { await fn(); }
    catch (e) {
      if (e instanceof ContentError && e.code === 'VALIDATION' && Array.isArray(e.details)) setProblems(e.details as Problem[]);
      setStatus({ kind: 'error', text: (e as Error).message });
    } finally { setBusy(false); }
  };

  const save = () => runAction(async () => {
    if (!selected || !identity) return;
    const next = compose();
    const local = isIndex ? [] : validatePage(selected, next, { codeRepos: platform.config.codeRepos });
    if (local.length) { setProblems(local); setStatus({ kind: 'error', text: 'Fix the problems below before saving.' }); return; }
    const res = await backend.writePage(version, selected, next, { message: message || `Update ${selected}`, author: authorOf(identity), expectedEtag: etag });
    setText(next); setRawText(next); setEtag(res.etag);
    setStatus({ kind: 'ok', text: `Committed ${res.commitSha.slice(0, 7)}; regenerated ${res.regenerated.join(', ') || 'nothing'}.`, url: res.commitUrl });
    await refresh();
  });

  const create = (path: string, pageText: string) => runAction(async () => {
    if (!identity) return;
    await backend.createPage(version, path, pageText, { message: `Add ${path}`, author: authorOf(identity) });
    setDialog(null); await refresh(); await open(path);
    setStatus({ kind: 'ok', text: `Created ${path}.` });
  });

  const remove = () => runAction(async () => {
    if (!selected || !identity || !window.confirm(`Delete ${selected}? This commits the deletion.`)) return;
    await backend.deletePage(version, selected, { message: `Delete ${selected}`, author: authorOf(identity) });
    setSelected(null); await refresh();
  });

  const rename = () => runAction(async () => {
    if (!selected || !identity) return;
    const to = window.prompt('New path (bundle-relative, ending in .md):', selected);
    if (!to || to === selected) return;
    await backend.renamePage(version, selected, to, { message: `Rename ${selected} to ${to}`, author: authorOf(identity) });
    await refresh(); await open(to);
  });

  const publish = (v: string) => runAction(async () => {
    if (!identity) return;
    const res = await backend.publishVersion(v, { message: `Publish docs ${v}`, author: authorOf(identity) });
    setDialog(null); await refresh();
    setStatus({ kind: 'ok', text: `Published ${res.version} (tag ${res.tag}, commit ${res.commitSha.slice(0, 7)}).` });
  });

  const logout = () => { store.clear(); setSession(null); setIdentity(null); setSelected(null); };

  if (checking) return <p style={{ padding: '2rem' }}>Verifying saved session...</p>;
  if (!session || !identity) return <LoginGate platform={platform} onAuthed={(s, id, remember) => { store.save(s, remember); setSession(s); setIdentity(id); }} />;

  return (
    <PlatformContext.Provider value={{ platform, session, identity, backend, logout }}>
      <div className="layout">
        <aside className="sidebar">
          <h2>{platform.config.organizationName}/{platform.config.projectName}</h2>
          <p>Signed in as <strong>{identity.name}</strong> ({identity.role}) <button className="btn secondary" onClick={logout}>Forget token</button></p>
          <label className="row"><span>Version</span>
            <select aria-label="Version" value={version} onChange={(e) => { setVersion(e.target.value); setSelected(null); }}>{versions.map((v) => <option key={v.id} value={v.id}>{v.label}{v.frozen ? ' (frozen)' : ''}</option>)}</select>
          </label>
          {frozen && <div className="notice">This version is frozen and read-only. Switch to Latest to edit.</div>}
          <div style={{ display: 'flex', gap: '0.5rem', margin: '0.5rem 0' }}>
            <button className="btn" disabled={frozen} onClick={() => setDialog('new')}>New page</button>
            {identity.role === 'editor' && <button className="btn secondary" disabled={frozen} onClick={() => setDialog('publish')}>Publish version</button>}
          </div>
          <FilePicker pages={pages} folders={folders} selected={selected} onSelectPage={(p) => void open(p)} onSelectFolder={(d) => void open(d ? `${d}/index.md` : 'index.md')} />
        </aside>
        <main className="main">
          {!selected && <p>Select a page or folder intro to start editing.</p>}
          {selected && isIndex && <FolderIntroEditor key={selected} text={text} readOnly={frozen} onSave={(next) => runAction(async () => {
            if (!identity) return;
            const res = await backend.writePage(version, selected, next, { message: `Update ${selected} intro`, author: authorOf(identity), expectedEtag: etag });
            setText(next); setEtag(res.etag); setStatus({ kind: 'ok', text: `Committed ${res.commitSha.slice(0, 7)}.` , url: res.commitUrl }); await refresh();
          })} />}
          {selected && !isIndex && fields && (<>
            <h1 style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>{selected}</h1>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button className={`btn ${mode === 'visual' ? '' : 'secondary'}`} disabled={mode === 'visual'} onClick={() => { const { head } = splitDocument(rawText); setText(rawText); setFields(readFields(head)); setMode('visual'); }}>Visual</button>
              <button className={`btn ${mode === 'raw' ? '' : 'secondary'}`} disabled={mode === 'raw'} onClick={() => { setRawText(compose()); setMode('raw'); }}>Raw MDX</button>
              <span style={{ flex: 1 }} />
              <button className="btn secondary" disabled={frozen || busy} onClick={rename}>Rename</button>
              <button className="btn danger" disabled={frozen || busy} onClick={remove}>Delete</button>
            </div>
            {mode === 'raw' ? (
              <textarea aria-label="Raw MDX" rows={28} value={rawText} readOnly={frozen} spellCheck={false} onChange={(e) => setRawText(e.target.value)} />
            ) : (<>
              <FrontmatterForm fields={fields} typesInUse={typesInUse} disabled={frozen} onChange={setFields} />
              <div className="editorFrame">
                <BodyEditor key={selected + etag} editorRef={mdx} markdown={splitDocument(text).body} fileLabel={selected} components={components} readOnly={frozen}
                  onError={(e) => { console.error('MDXEditor parse error', e); setRawText(text); setMode('raw'); setStatus({ kind: 'error', text: 'This file could not be opened in the visual editor; editing raw MDX instead.' }); }} />
              </div>
            </>)}
            <div style={{ marginTop: '1rem' }}>
              <label className="row"><span>Commit message</span><input aria-label="Commit message" value={message} onChange={(e) => setMessage(e.target.value)} /></label>
              <button className="btn" disabled={frozen || busy} onClick={save}>{busy ? 'Saving...' : 'Save & commit'}</button>
            </div>
          </>)}
          <ProblemList problems={problems} title="Validation problems" />
          {status && <p className={status.kind === 'ok' ? 'ok' : 'problems'} role="status">{status.text} {status.url && <a href={status.url} target="_blank" rel="noreferrer">View commit</a>}</p>}
        </main>
      </div>
      {dialog === 'new' && <NewPageDialog typesInUse={typesInUse} defaultResource={platform.config.codeRepos[0] ? `https://github.com/${platform.config.codeRepos[0].owner}/${platform.config.codeRepos[0].repo}/blob/${platform.config.codeRepos[0].defaultRef}/${platform.config.codeRepos[0].pathPrefix ?? ''}` : ''} onCreate={create} onClose={() => setDialog(null)} />}
      {dialog === 'publish' && <PublishDialog existing={versions.map((v) => v.id)} onPublish={publish} onClose={() => setDialog(null)} />}
    </PlatformContext.Provider>
  );
}
```

- [ ] **Step 8: Typecheck, unit tests, dev run against a local folder**

```bash
cd services/editor && npx tsc --noEmit -p tsconfig.json && npx vitest run && npx vite build
```

Expected: typecheck clean, unit tests PASS, `dist/index.html` exists with assets under `dist/assets/` referencing `/CloudDocumentationPersonal/editor/`.

Then a manual smoke against the real site folder (Task 13 automates it): create `services/editor/e2e/content-server.mjs` now (Task 13 reuses it):

```js
// Starts serveContentBackend over a LocalFolderBackend seeded from a temp copy of ../../site.
// Writes the temp repo path to e2e/.repo-path so tests can inspect commits.
import { cp, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LocalFolderBackend, serveContentBackend, git } from '@platform/content/node';
import platform from '../../../platform.config.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = await mkdtemp(path.join(tmpdir(), 'editor-e2e-'));
const siteDir = path.join(repo, 'site');
for (const d of ['docs', 'versioned_docs', 'versioned_sidebars', 'static']) await cp(path.join(here, '../../../site', d), path.join(siteDir, d), { recursive: true });
await cp(path.join(here, '../../../site/versions.json'), path.join(siteDir, 'versions.json'));
await git(repo, 'init', '-q', '-b', 'main');
await git(repo, '-c', 'user.name=seed', '-c', 'user.email=seed@example.com', 'add', '-A');
await git(repo, '-c', 'user.name=seed', '-c', 'user.email=seed@example.com', 'commit', '-q', '-m', 'seed');
const backend = new LocalFolderBackend({ siteDir, codeRepos: platform.codeRepos, resolveRef: async () => 'e'.repeat(40) });
const server = await serveContentBackend(backend, { port: 4321 });
await writeFile(path.join(here, '.repo-path'), repo);
console.log(`content server ${server.url} over ${repo}`);
```

Run in two terminals: `node e2e/content-server.mjs` and `VITE_PLATFORM_AUTH=mock VITE_PLATFORM_CONTENT=http://127.0.0.1:4321 npx vite`. Open `http://localhost:5173/CloudDocumentationPersonal/editor/`, sign in with any name, open `systems/inventory.md`, change the description, Save: the status line shows the commit and the regenerated files; `git -C "$(cat e2e/.repo-path)" log --oneline -1` shows the commit. Stop both.

- [ ] **Step 9: Commit**

```bash
echo "services/editor/e2e/.repo-path" >> .gitignore
git add services/editor .gitignore package-lock.json
git commit -m "feat(editor): standalone Vite editor on the auth and content contracts with create/rename/delete/publish

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: Playwright end-to-end test

**Files:**
- Create: `services/editor/playwright.config.ts`, `services/editor/e2e/editor.spec.ts`
- Modify: `services/editor/package.json` (already has `e2e` script)

**Interfaces:**
- Consumes: `e2e/content-server.mjs` (Task 12), editor UI labels: "Display name", "Sign in", page buttons by path text, "description" field, "Commit message", "Save & commit", "New page", "New page path/title/description/type/resource", "Create", "Publish version", "Version", "Publish".

- [ ] **Step 1: `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: { baseURL: 'http://127.0.0.1:5173/CloudDocumentationPersonal/editor/', headless: true },
  webServer: [
    { command: 'node e2e/content-server.mjs', port: 4321, reuseExistingServer: false, timeout: 60_000 },
    { command: 'npx vite --port 5173 --host 127.0.0.1', port: 5173, reuseExistingServer: false, timeout: 60_000, env: { VITE_PLATFORM_AUTH: 'mock', VITE_PLATFORM_CONTENT: 'http://127.0.0.1:4321' } },
  ],
});
```

- [ ] **Step 2: The test**

`services/editor/e2e/editor.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const run = promisify(execFile);
const repoPath = async () => (await readFile(path.join(__dirname, '.repo-path'), 'utf8')).trim();
const git = async (...args: string[]) => (await run('git', args, { cwd: await repoPath() })).stdout.trim();

test('edit, create and publish through the editor against LocalFolderBackend', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Display name').fill('Mock Editor');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Signed in as')).toBeVisible();

  // Edit an existing page's description through the frontmatter form.
  await page.getByRole('button', { name: 'systems/inventory.md' }).click();
  const desc = page.locator('label.row', { hasText: 'description' }).locator('input');
  await desc.fill('Explains how item stacks are stored, merged and moved, and which service API mutates a container.');
  await page.getByLabel('Commit message').fill('Clarify inventory description');
  await page.getByRole('button', { name: 'Save & commit' }).click();
  await expect(page.getByRole('status')).toContainText('Committed');
  expect(await git('log', '-1', '--format=%an %s')).toBe('Mock Editor Clarify inventory description');
  const repo = await repoPath();
  expect(await readFile(path.join(repo, 'site/docs/systems/index.md'), 'utf8')).toContain('item stacks are stored, merged and moved');
  expect(await readFile(path.join(repo, 'site/docs/manifest.json'), 'utf8')).toContain('item stacks are stored, merged and moved');
  expect(await readFile(path.join(repo, 'site/docs/log.md'), 'utf8')).toContain('* **Update**: [Inventory](/systems/inventory.md) - Clarify inventory description. (by Mock Editor)');

  // Create a page.
  await page.getByRole('button', { name: 'New page' }).click();
  await page.getByLabel('New page path').fill('systems/status-effects.md');
  await page.getByLabel('New page title').fill('Status Effects');
  await page.getByLabel('New page description').fill('Lists every status effect, its duration rules and which combat stage applies it.');
  await page.getByLabel('New page type').fill('system');
  await page.getByLabel('New page resource').fill('https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/examples/unity-project/Assets/Scripts/Combat');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('status')).toContainText('Created systems/status-effects.md');
  expect(await readFile(path.join(repo, 'site/docs/systems/index.md'), 'utf8')).toContain('* [Status Effects](status-effects.md) - Lists every status effect');

  // Publish a frozen version.
  await page.getByRole('button', { name: 'Publish version' }).click();
  await page.getByLabel('Version').last().fill('1.1.0');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Published 1.1.0');
  const frozen = await readFile(path.join(repo, 'site/versioned_docs/version-1.1.0/systems/inventory.md'), 'utf8');
  expect(frozen).toContain(`/blob/${'e'.repeat(40)}/examples/unity-project/Assets/Scripts/Inventory`);
  expect(frozen).not.toContain('/blob/main/');
  expect(JSON.parse(await readFile(path.join(repo, 'site/docs/versions/1.1.0.json'), 'utf8')).pins['RayanYousef/CloudDocumentationPersonal']).toBe('e'.repeat(40));
  expect((await git('tag', '--list')).split('\n')).toContain('docs-v1.1.0');

  // Frozen versions are read-only in the UI.
  await page.getByLabel('Version').first().selectOption('1.1.0');
  await expect(page.getByText('This version is frozen and read-only')).toBeVisible();
});
```

- [ ] **Step 3: Run it**

```bash
cd services/editor && npx playwright install chromium && npx playwright test
```

Expected: 1 passed. If the "Version" label is ambiguous (sidebar select vs dialog input), the `.first()`/`.last()` calls above disambiguate; keep the aria-labels exactly as in Task 12.

- [ ] **Step 4: Commit**

```bash
git add services/editor/playwright.config.ts services/editor/e2e
git commit -m "test(editor): Playwright e2e covering login, edit, create and publish against LocalFolderBackend

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 14: GitHub Actions - validate and deploy workflows

**Files:**
- Create: `.github/workflows/okf-validate.yml`, `.github/workflows/deploy-pages.yml`, `scripts/copy-editor.mjs`, `scripts/copy-editor.test.ts`
- Delete: `.github/workflows/deploy-docs.yml`

**Interfaces:**
- Consumes: root scripts `build`, `test`, `lint`, `okf:check`, `site:build` (Task 1); editor build output `services/editor/dist` (Task 12); site build output `site/build` (Task 6).
- Produces: `node scripts/copy-editor.mjs` copies `services/editor/dist/**` into `site/build/editor/`; `gh-pages` branch published by `deploy-pages.yml`.

- [ ] **Step 1: Failing test for the copy script**

`scripts/copy-editor.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { copyEditor } from './copy-editor.mjs';

describe('copyEditor', () => {
  it('copies the editor build into site/build/editor', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'copy-'));
    await mkdir(path.join(root, 'services/editor/dist/assets'), { recursive: true });
    await mkdir(path.join(root, 'site/build'), { recursive: true });
    await writeFile(path.join(root, 'services/editor/dist/index.html'), '<html></html>');
    await writeFile(path.join(root, 'services/editor/dist/assets/app.js'), 'x');
    await copyEditor(root);
    expect(await readFile(path.join(root, 'site/build/editor/index.html'), 'utf8')).toBe('<html></html>');
    expect(await readFile(path.join(root, 'site/build/editor/assets/app.js'), 'utf8')).toBe('x');
  });
  it('fails clearly when the editor was not built', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'copy-'));
    await mkdir(path.join(root, 'site/build'), { recursive: true });
    await expect(copyEditor(root)).rejects.toThrow('services/editor/dist');
  });
});
```

Run: `npx vitest run scripts/copy-editor.test.ts`
Expected: FAIL.

- [ ] **Step 2: `scripts/copy-editor.mjs`**

```js
// Copies the built editor into the built site so GitHub Pages serves it at <baseUrl>editor/.
import { cp, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function copyEditor(root) {
  const from = path.join(root, 'services/editor/dist');
  const to = path.join(root, 'site/build/editor');
  await access(from).catch(() => { throw new Error(`Editor build not found at services/editor/dist; run "npm run build -w @platform/editor" first`); });
  await access(path.join(root, 'site/build')).catch(() => { throw new Error('Site build not found at site/build; run "npm run build -w @platform/site" first'); });
  await cp(from, to, { recursive: true });
  return to;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  console.log(`editor copied to ${await copyEditor(root)}`);
}
```

Run: `npx vitest run scripts/copy-editor.test.ts`
Expected: PASS.

- [ ] **Step 3: `.github/workflows/okf-validate.yml`**

```yaml
name: Validate docs and platform

on:
  push:
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - name: Build packages and services
        run: npm run build -w @platform/contracts -w @platform/okf-core -w @platform/viewers -w @platform/auth -w @platform/content
      - name: OKF validate (Latest + frozen versions, stale check)
        run: npm run okf:check
      - name: Lint (import boundaries)
        run: npm run lint
      - name: Unit and contract tests
        run: npm test
```

- [ ] **Step 4: `.github/workflows/deploy-pages.yml`**

```yaml
name: Deploy site and editor to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: deploy-pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - name: Build packages and services
        run: npm run build -w @platform/contracts -w @platform/okf-core -w @platform/viewers -w @platform/auth -w @platform/content
      - name: OKF validate
        run: npm run okf:check
      - name: Build editor and site, compose output
        run: npm run site:build
      - name: Publish to gh-pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./site/build
```

- [ ] **Step 5: Remove the old workflow, run the whole pipeline locally, commit**

```bash
git rm .github/workflows/deploy-docs.yml
npm ci
npm run build -w @platform/contracts -w @platform/okf-core -w @platform/viewers -w @platform/auth -w @platform/content
npm run okf:check && npm run lint && npm test && npm run site:build
ls site/build/editor/index.html site/build/index.html
git add .github/workflows scripts
git commit -m "ci: okf-validate on every push, deploy-pages builds site + editor to gh-pages

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Expected: every command exits 0; both files listed.

---

### Task 15: Platform agent skill

**Files:**
- Create: `.agents/skills/docs-platform/SKILL.md`, `.agents/skills/docs-platform/references/registry.md`, `.agents/skills/docs-platform/references/navigation.md`, `.agents/skills/docs-platform/references/authoring.md`, `.agents/skills/docs-platform/scripts/resolve-bundle.mjs`, `.agents/skills/docs-platform/test/resolve-bundle.test.ts`, `.agents/skills/docs-platform/vitest.config.ts`
- Modify: `vitest.workspace.ts` (add the skill's config)

**Interfaces:**
- Produces: `node .agents/skills/docs-platform/scripts/resolve-bundle.mjs [repoDir]` prints the JSON bundle entry for the current code repo (exit 1 when unregistered); `normalizeRemote(url: string): string`; registry at `~/.docs-platform/registry.json`.

- [ ] **Step 1: Failing test for remote normalisation and lookup**

`.agents/skills/docs-platform/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { name: 'docs-platform-skill', include: ['test/**/*.test.ts'] } });
```

Add `'.agents/skills/docs-platform/vitest.config.ts'` to the array in `vitest.workspace.ts`.

`.agents/skills/docs-platform/test/resolve-bundle.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeRemote, lookupBundle } from '../scripts/resolve-bundle.mjs';

const registry = { version: 1, bundles: [{ remote: 'https://github.com/RayanYousef/CloudDocumentationPersonal', docs: { kind: 'local', sitePath: 'H:/Personal-Projects/CloudDocumentation/site' } }] };

describe('normalizeRemote', () => {
  it('maps ssh and https forms to one canonical URL', () => {
    expect(normalizeRemote('git@github.com:RayanYousef/CloudDocumentationPersonal.git')).toBe('https://github.com/RayanYousef/CloudDocumentationPersonal');
    expect(normalizeRemote('https://github.com/RayanYousef/CloudDocumentationPersonal.git')).toBe('https://github.com/RayanYousef/CloudDocumentationPersonal');
    expect(normalizeRemote('ssh://git@github.com/RayanYousef/CloudDocumentationPersonal')).toBe('https://github.com/RayanYousef/CloudDocumentationPersonal');
  });
});

describe('lookupBundle', () => {
  it('finds a bundle by normalised remote', () => {
    expect(lookupBundle(registry, 'git@github.com:RayanYousef/CloudDocumentationPersonal.git')?.docs.kind).toBe('local');
    expect(lookupBundle(registry, 'https://github.com/other/repo')).toBeNull();
  });
});
```

Run: `npx vitest run --project docs-platform-skill`
Expected: FAIL.

- [ ] **Step 2: `scripts/resolve-bundle.mjs`**

```js
#!/usr/bin/env node
// Resolves the docs bundle for a code repository from the user-level registry.
// Usage: node resolve-bundle.mjs [repoDir]   -> prints the bundle JSON, exit 1 if unregistered.
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REGISTRY_PATH = path.join(homedir(), '.docs-platform', 'registry.json');

export function normalizeRemote(url) {
  let u = url.trim().replace(/\.git$/, '');
  const ssh = u.match(/^git@([^:]+):(.+)$/);
  if (ssh) u = `https://${ssh[1]}/${ssh[2]}`;
  u = u.replace(/^ssh:\/\/git@/, 'https://').replace(/^http:\/\//, 'https://');
  return u.replace(/\/$/, '');
}

export function lookupBundle(registry, remoteUrl) {
  const key = normalizeRemote(remoteUrl);
  return registry.bundles.find((b) => normalizeRemote(b.remote) === key) ?? null;
}

export async function resolveBundle(repoDir = process.cwd(), registryPath = REGISTRY_PATH) {
  const { stdout } = await promisify(execFile)('git', ['remote', 'get-url', 'origin'], { cwd: repoDir });
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  return { remote: normalizeRemote(stdout), bundle: lookupBundle(registry, stdout) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { remote, bundle } = await resolveBundle(process.argv[2]);
  if (!bundle) { console.error(`No docs bundle registered for ${remote} in ${REGISTRY_PATH}`); process.exit(1); }
  console.log(JSON.stringify(bundle, null, 2));
}
```

Run: `npx vitest run --project docs-platform-skill`
Expected: PASS.

- [ ] **Step 3: `SKILL.md`**

```markdown
---
name: docs-platform
description: The only agent entry point for a Documentation Platform bundle (Docusaurus site + OKF Core index layer + in-browser editor). Use when working inside a code repository whose documentation lives in a docs-platform bundle, when the user says "open the docs for this repo", "which page describes this file", "update the documentation", "add a doc page", "run the OKF generator", or "publish a docs version". Looks the bundle up in the user-level registry (~/.docs-platform/registry.json), navigates by index.md and code maps, and explains how pages are added and regenerated. Format rules come from the ray-okf-core skill, which this skill never modifies.
---

# Documentation Platform

One docs bundle per code repository. The bundle is a Docusaurus `site/` whose `docs/` folder follows the OKF Core profile: every folder has an `index.md` with one-sentence decision-aid descriptions, every page carries typed frontmatter and a `resource` URL pinned to code, `manifest.json` is the flat search table, `log.md` the change log, and `code-maps/<owner>--<repo>.md` the reverse index from code paths to pages.

## On start (inside a code repository)

1. Run `node <this skill>/scripts/resolve-bundle.mjs` (or read `~/.docs-platform/registry.json` yourself; schema in `references/registry.md`). It maps the repo's `origin` remote to a bundle: a local `sitePath`, or a content-service URL plus the name of the env var holding the token.
2. Open `<sitePath>/docs/index.md`, then `<sitePath>/docs/AGENTS.md`. Never list directories: the index is the map (`references/navigation.md`).
3. To go from a code file to its documentation, open `<sitePath>/docs/code-maps/<owner>--<repo>.md` and find the longest path prefix that matches the file.
4. If the bundle is remote (`kind: content-service`), read pages through the content service (`references/authoring.md`, section "Remote bundles"); do not clone anything.
5. If the repo is not registered, say so and offer to add a registry entry (`references/registry.md`); do not create docs inside the code repo.

## Rules

- Format rules are the `ray-okf-core` skill (`references/spec-profile.md` there). Read it when a field's rule is in question; NEVER edit that skill.
- Never write `AGENTS.md`, `index.md` or any docs into a code repository; the docs live in the bundle.
- Never hand-edit generated content: index blocks between `<!-- okf:index -->` markers, `manifest.json`, `code-maps/`, or log bullets. Run the generator instead: `npm run okf:generate` from the bundle's repository root (`npm run okf:check` validates only).
- A page's `description` is one sentence answering "is this the file I need?"; `type` is required; `resource` is `https://github.com/<owner>/<repo>/blob/<ref>/<path>` and the repo must be declared in `platform.config.js` `codeRepos`.
- Frozen versions (`versioned_docs/version-*`) are read-only; edit `docs/` (Latest). Publishing a version is done through the editor's "Publish version" action or the content service.

## References

- `references/registry.md` - registry file location, schema, adding an entry.
- `references/navigation.md` - the navigation walk (index -> folder -> page -> resource -> code map) with an example.
- `references/authoring.md` - adding/updating pages and folders, running the generator, committing, remote bundles.
```

- [ ] **Step 4: References**

`references/registry.md`:

```markdown
# Registry

Location: `~/.docs-platform/registry.json` (`%USERPROFILE%\.docs-platform\registry.json` on Windows). It lives outside every repository so no code repo needs platform files.

```json
{
  "version": 1,
  "bundles": [
    {
      "remote": "https://github.com/RayanYousef/CloudDocumentationPersonal",
      "docs": { "kind": "local", "sitePath": "H:/Personal-Projects/CloudDocumentation/site" }
    },
    {
      "remote": "https://github.com/acme/game",
      "docs": { "kind": "content-service", "url": "https://docs.acme.example/api/content", "tokenEnv": "ACME_DOCS_TOKEN" }
    }
  ]
}
```

- `remote` is compared after normalisation: `git@github.com:o/r.git`, `ssh://git@github.com/o/r` and `https://github.com/o/r.git` all equal `https://github.com/o/r`.
- `kind: local`: `sitePath` is the absolute path of the bundle's `site/` folder (docs at `<sitePath>/docs`).
- `kind: content-service`: `url` is the HTTP content service (Phase 2); `tokenEnv` names the environment variable that holds the token. Never store tokens in the registry.
- The docs repository itself may also be registered (its own remote -> its own `site/`), which is how this template repo is found from inside itself.

Adding an entry: create the folder and file if missing, append a bundle object, keep the JSON valid. Confirm with `node <skill>/scripts/resolve-bundle.mjs <repoDir>`.
```

`references/navigation.md`:

```markdown
# Navigation walk

1. `docs/index.md`: intro paragraph, then the generated block: `## Pages` and `## Folders` bullets `* [Title](path) - description`. Read descriptions; open only what answers the question.
2. Descend one folder at a time (`systems/index.md`, `systems/networking/index.md`). Each repeats the layout.
3. On a page, frontmatter tells you: `type` (system, guide, asset, decision, reference...), `tags`, `resource` (primary code folder/file at a ref), `sources` (specific files). Latest pins to a branch; frozen versions pin to a commit sha recorded in `docs/versions/<v>.json`.
4. `manifest.json` is the whole bundle as a flat array (route, file, title, description, type, tags, resource, sources): use it to search or filter instead of walking.
5. `code-maps/<owner>--<repo>.md` inverts the manifest: a path-ordered list of code paths, each followed by the pages that cite it (`(source)` marks a `sources` citation). Given a changed file, pick the entry with the longest matching prefix.
6. `log.md` is newest-first: what changed, on which page, by whom.

Example: asked "why is inventory host-authoritative?", read `docs/index.md` -> `Systems` folder -> `systems/index.md` -> `Inventory` (description mentions the service API) -> the page's `resource` points at `examples/unity-project/Assets/Scripts/Inventory`; the code repo's own `Assets/Scripts/Inventory/index.md` names `InventoryService.cs`.
```

`references/authoring.md`:

```markdown
# Authoring

## Add or update a page (local bundle)

1. Create or edit `<sitePath>/docs/<folder>/<slug>.md` with frontmatter: `title`, `description` (one sentence, decision aid), `type`, `tags` (list), `resource` (blob URL in a declared repo), optional `sources` (`- resource: <url>` entries), `sidebar_position`. Body in Markdown/MDX; `<ModelViewer>`, `<FbxViewer>`, `<Tabs>`, `<TabItem>` are available without imports.
2. New folder: add `<folder>/index.md` with only `title` and `sidebar_position` frontmatter plus an intro paragraph. The generator adds the markers and the block.
3. From the repository root: `npm run okf:generate` (writes index blocks, manifest, code maps, validates). Exit 1 means fix the report; `manifest.json` is not written until clean.
4. Add a `log.md` bullet under today's date (newest first): `* **Add|Update**: [Title](/folder/slug.md) - what changed. (by Name)`. The editor and content service do this automatically; when editing files directly, do it by hand.
5. `npm run okf:check` must exit 0; commit docs and generated files together.

## Through the editor

The site's Editor link (`<baseUrl>editor/`) opens the in-browser editor. Sign in with a fine-grained GitHub token that has Contents: Read and write on the docs repo (write collaborators only). Save commits the page and every regenerated file in one commit under your name. "New page", "Rename", "Delete" and "Publish version" are in the sidebar.

## Remote bundles (kind: content-service)

Read `${tokenEnv}` from the environment and call the content service: `POST <url>/rpc` with `{"method":"readPage","args":["current","systems/inventory.md"]}` (methods: listVersions, listPages, readPage, writePage, createPage, deletePage, renamePage, listAssets, search, publishVersion). Writes need `{"message": "...", "author": {"name": "...", "email": "..."}}` as the last argument. Errors come back as `{"error": {"code": "VALIDATION", "message": "...", "details": [...]}}`; fix the listed problems and retry.

## Publishing a frozen version

Editor: "Publish version" -> enter `MAJOR.MINOR.PATCH`. Or content service: `publishVersion("1.2.0", {message, author})`. Result: `versioned_docs/version-1.2.0/` with every resource pinned to a commit sha, `docs/versions/1.2.0.json`, `versions.json` updated, tag `docs-v1.2.0`.
```

- [ ] **Step 5: Register this repository in the local registry (manual, documented) and commit**

```bash
mkdir -p ~/.docs-platform
[ -f ~/.docs-platform/registry.json ] || cat > ~/.docs-platform/registry.json <<'EOF'
{ "version": 1, "bundles": [ { "remote": "https://github.com/RayanYousef/CloudDocumentationPersonal", "docs": { "kind": "local", "sitePath": "H:/Personal-Projects/CloudDocumentation/site" } } ] }
EOF
node .agents/skills/docs-platform/scripts/resolve-bundle.mjs   # prints the local bundle entry
git add .agents/skills/docs-platform vitest.workspace.ts
git commit -m "feat(skill): docs-platform agent skill with user-level registry and bundle resolver

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

(Installing the skill for other repos = copy `.agents/skills/docs-platform` to `C:\Users\Ray\.agents\skills\docs-platform\`; not done by this plan.)

---

### Task 16: Merge to main, make the repository public, enable Pages, smoke test the live site

**Files:** none in the tree (repository settings + verification).

**Interfaces:**
- Consumes: `deploy-pages.yml` (Task 14); live URL `https://RayanYousef.github.io/CloudDocumentationPersonal/`.

- [ ] **Step 1: Scan history for secrets before going public**

```bash
git log -p --all | grep -E "ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN (RSA|OPENSSH) PRIVATE KEY" ; echo "grep exit $? (expect 1)"
```

Expected: no matches (exit 1). Any match stops this task; report it to the user instead of continuing.

- [ ] **Step 2: Push the branch, open and merge the PR**

```bash
git push -u origin feat/documentation-platform
gh pr create --base main --head feat/documentation-platform --title "Documentation platform (Phase 1)" --body "Implements docs/design/2026-09-06-documentation-platform-design.md, Phase 1. See the plan in docs/design for the task list.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks --watch     # okf-validate must pass
gh pr merge --merge --delete-branch=false
git checkout main && git pull
```

- [ ] **Step 3: Make the repo public and enable Pages from gh-pages**

```bash
gh repo edit RayanYousef/CloudDocumentationPersonal --visibility public --accept-visibility-change-consequences
gh run watch $(gh run list --workflow deploy-pages.yml --limit 1 --json databaseId -q '.[0].databaseId')   # the merge triggered it; wait for success
gh api -X POST repos/RayanYousef/CloudDocumentationPersonal/pages -f "source[branch]=gh-pages" -f "source[path]=/" || gh api -X PUT repos/RayanYousef/CloudDocumentationPersonal/pages -f "source[branch]=gh-pages" -f "source[path]=/"
gh api repos/RayanYousef/CloudDocumentationPersonal/pages -q '.html_url, .status'
```

Expected: visibility `PUBLIC`; deploy run succeeded; Pages `html_url` is `https://RayanYousef.github.io/CloudDocumentationPersonal/` and status becomes `built` within a few minutes.

- [ ] **Step 4: Live smoke test**

```bash
for p in "" "systems/inventory/" "1.0.0/systems/inventory/" "log/" "editor/" "platform/components.json" "platform/manifest-current.json"; do
  printf "%s -> " "$p"; curl -s -o /dev/null -w "%{http_code}\n" "https://RayanYousef.github.io/CloudDocumentationPersonal/$p"; done
curl -s "https://media.githubusercontent.com/media/RayanYousef/CloudDocumentationPersonal/main/examples/unity-project/Assets/Models/Airship.fbx" -o /dev/null -w "airship fbx -> %{http_code}\n"
```

Expected: every line `200`. Then in a browser: the home page shows the Skyforge index list (no card grid); `assets/airship-model/` renders the rotating cube and the Airship FBX (public repo, no token); `editor/` shows the sign-in dialog; signing in with a token that lacks push access shows "You are not a write collaborator of RayanYousef/CloudDocumentationPersonal"; signing in with a write token lists the pages and a Save creates a commit on `main` visible with `git log origin/main -1` after `git fetch`.

- [ ] **Step 5: Record the result**

Append the smoke-test date and outcome to the PR as a comment: `gh pr comment <number> --body "Live smoke test passed on <date>: site, versioned page, log, editor, platform artifacts and Airship.fbx all 200."`

---

### Task 17: Final cleanup

**Files:**
- Delete: `okf-example/` (untracked, on disk), `.claude/skills/docusaurus/`, `.claude/skills/web-meta-framework-docusaurus/`, `.claude/skills/orama-docusaurus/` are KEPT (general Docusaurus skills; out of scope)
- Modify: `.gitignore`, `README.md` (create)

- [ ] **Step 1: Remove the demo source folder and stale ignores**

```bash
git checkout -b chore/cleanup main
rm -rf okf-example
git status --short   # expect nothing about okf-example
```

Remove the line `okf-example/**` from the `ignores` array in `eslint.config.js` (it no longer exists).

- [ ] **Step 2: README**

`README.md`:

```markdown
# Documentation Platform (template)

Docusaurus site + OKF Core index layer + in-browser editor + 3D viewers, organised as a contracts-first monorepo. Design: `docs/design/2026-09-06-documentation-platform-design.md`.

## Use it for a new project

1. Edit `platform.config.js`: site identity, `codeRepos` (the code repositories the docs describe), enabled features.
2. Replace `site/docs/` with your bundle (keep `index.md`, `log.md`, `AGENTS.md`; see `.agents/skills/docs-platform/`).
3. `npm ci && npm run okf:generate && npm run site:build`.
4. Push to `main`: `deploy-pages.yml` publishes the site and the editor to GitHub Pages; `okf-validate.yml` guards every push.

## Commands

| Command | What it does |
|---|---|
| `npm run okf:generate` / `npm run okf:check` | regenerate / validate every docs bundle (Latest + frozen) |
| `npm run build` | build all packages and services |
| `npm test` / `npm run lint` | Vitest everywhere / ESLint incl. import boundaries |
| `npm run site:build` | build editor + site into `site/build` (editor at `/editor/`) |
| `npm run site:start` | Docusaurus dev server |
| `npm run dev -w @platform/editor` | editor dev server (`VITE_PLATFORM_AUTH=mock VITE_PLATFORM_CONTENT=http://127.0.0.1:4321` with `node services/editor/e2e/content-server.mjs`) |
| `npm run e2e -w @platform/editor` | Playwright end-to-end |

Live: https://RayanYousef.github.io/CloudDocumentationPersonal/ (editor: `/editor/`).
```

- [ ] **Step 3: Verify and commit**

```bash
npm run lint && npm test && npm run okf:check
git add -A
git commit -m "chore: remove okf-example after migration, add README

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin chore/cleanup
gh pr create --base main --title "chore: cleanup after documentation platform" --body "Removes the migrated okf-example folder and adds the README.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks --watch && gh pr merge --merge
```

---

### Task 18: Verification (independent verifier)

**Files:** none. The verifier starts from a fresh clone of `main`.

- [ ] **Step 1: Fresh clone builds and validates**

```bash
git clone https://github.com/RayanYousef/CloudDocumentationPersonal.git verify && cd verify
npm ci
npm run build -w @platform/contracts -w @platform/okf-core -w @platform/viewers -w @platform/auth -w @platform/content
npm run okf:check          # exit 0: Latest and 1.0.0 bundles valid and not stale
npm run lint               # exit 0
npm test                   # all workspaces pass: contracts, okf-core, auth, content (3 contract runs), viewers, editor, site, root scripts, skill
npm run site:build         # site/build/index.html and site/build/editor/index.html exist
```

- [ ] **Step 2: Contract substitutability**

Confirm `packages/contracts/src/testing/contentBackendContract.ts` is executed three times (`LocalFolderBackend`, `GithubBrowserBackend`, `HttpContentBackend over LocalFolderBackend`) and `authProviderContract.ts` twice (`GithubTokenProvider`, `MockAuthProvider`) in the `npm test` output.

- [ ] **Step 3: Boundaries**

```bash
npx vitest run scripts/lint-boundaries.test.ts
grep -rn "@platform/auth\|@platform/content" services/editor/src site/src --include=*.ts --include=*.tsx --include=*.js | grep -v "src/composition/\|src/platform/" ; echo "exit $? (expect 1)"
grep -rn "\"dependencies\"" -A 3 packages/okf-core/package.json | grep -c "@" ; echo "(expect 0: okf-core has no runtime deps)"
```

- [ ] **Step 4: Validator rules fire**

```bash
sed -i 's/^type: system$/type_: system/' site/docs/systems/inventory.md && npm run okf:check ; echo "exit $? (expect 1 with frontmatter problem)"; git checkout site/docs/systems/inventory.md
echo "* [X](nope.md) - x" >> site/docs/getting-started.md && npm run okf:check ; echo "exit $? (expect 1 with link problem)"; git checkout site/docs/getting-started.md
sed -i 's#RayanYousef/CloudDocumentationPersonal/blob#someone/else/blob#' site/docs/getting-started.md && npm run okf:check ; echo "exit $? (expect 1 with undeclared-repo problem)"; git checkout site/docs/getting-started.md
```

- [ ] **Step 5: Editor against LocalFolderBackend**

```bash
cd services/editor && npx playwright install chromium && npx playwright test   # 1 passed: login (mock), edit, create, publish 1.1.0, frozen read-only
```

- [ ] **Step 6: Live site**

Run the curl loop from Task 16 Step 4 (all 200) and open the home page, `assets/airship-model/` (cube and Airship FBX render), `1.0.0/systems/inventory/` (resource links contain a 40-hex sha), `log/`, and `editor/` (sign-in dialog; a non-collaborator token is refused with the exact "not a write collaborator" message).

- [ ] **Step 7: Report**

Write the verification outcome as a comment on the merged PR (`gh pr comment`), listing each step above with pass/fail and the commit sha verified. Any failure is reported with the exact command output; nothing is fixed silently by the verifier.

---

## Self-review notes

- Spec coverage: contracts (T2), okf-core outputs and every validator rule (T3-T5; log rules in T5, undeclared-repo in T3, stale in T4), auth with push check + collaborator message (T8), content backends with atomic Git Data commits, publish with pins/refs/tag/sha rewrite, LFS-aware asset fetch with cache, build-time Orama index (T9-T10), viewers with repo/ref/path and global MDX registration (T11), editor features incl. create/rename/delete/publish, frontmatter form with type dropdown, hidden reserved files, folder intro editing, components.json, numeric-quoting fix, session store with warning (T12), e2e (T13), workflows + editor copy (T14), skill + registry (T15), public repo + Pages + smoke (T16), cleanup (T17), verification (T18). Phase 2 items (PasswordProvider, gate, Hono shell, server backend, doc updater) are spec-only by design.
- Naming consistency checked: `planPageChanges`/`planPublish`/`contentEtag` (T9) used by T10; `SESSION_STORAGE_KEY = 'docs-platform.session'` identical in site (T11) and editor (T12); `versionDir`/`isFrozen` shared; `describeContentBackendContract` harness fields `readFile`/`listTags` used by T9, T10, T13; `MINI_BUNDLE` byte-exactness is asserted by T3 ("accepts the mini bundle") and T4 ("no-op") so drift surfaces immediately.
- Known judgement calls the executor may hit: MDXEditor 4 type names (`JsxComponentDescriptor.props[].type` accepts `'number'`; `insertJsx$` payload shape) and the `yaml` document API are used as documented; if a signature differs in the installed minor version, adapt the call site, not the contract.
