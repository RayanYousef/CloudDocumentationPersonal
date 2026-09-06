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
