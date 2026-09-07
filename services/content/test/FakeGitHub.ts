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
    // Any other repository (a declared code repo) answers commits/:ref with a stable fake sha so publish can pin it.
    const other = url.pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/commits\/(.+)$/);
    if (other && (other[1] !== this.owner || other[2] !== this.repo)) return json(200, { sha: 'b'.repeat(40) });
    const base = `/repos/${this.owner}/${this.repo}`;
    if (!url.pathname.startsWith(base)) return json(404, { message: 'Not Found' });
    const p = url.pathname.slice(base.length);
    let m: RegExpMatchArray | null;
    if ((m = p.match(/^\/git\/ref\/heads\/(.+)$/))) { const s = this.refs.get(`heads/${m[1]}`); return s ? json(200, { object: { sha: s } }) : json(404, {}); }
    if ((m = p.match(/^\/git\/refs\/heads\/(.+)$/)) && method === 'PATCH') { this.refs.set(`heads/${m[1]}`, body['sha'] as string); return json(200, {}); }
    if (p === '/git/refs' && method === 'POST') { this.refs.set(String(body['ref']).replace(/^refs\//, ''), body['sha'] as string); return json(201, {}); }
    if ((m = p.match(/^\/git\/commits\/([0-9a-f]+)$/))) { const c = this.commits.get(m[1]!); return c ? json(200, { sha: m[1], tree: { sha: c.tree }, parents: c.parents.map((s) => ({ sha: s })) }) : json(404, {}); }
    if (p === '/git/commits' && method === 'POST') { const s = this.sha(); this.commits.set(s, { tree: body['tree'] as string, parents: body['parents'] as string[], message: body['message'] as string, author: { name: (body['author'] as { name: string }).name, email: (body['author'] as { email: string }).email } }); return json(201, { sha: s }); }
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
