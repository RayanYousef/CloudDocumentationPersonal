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
