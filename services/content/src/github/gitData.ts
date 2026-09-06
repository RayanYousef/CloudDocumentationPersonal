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
