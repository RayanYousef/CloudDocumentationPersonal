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
