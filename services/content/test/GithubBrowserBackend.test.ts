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
