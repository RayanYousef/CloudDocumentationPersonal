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
