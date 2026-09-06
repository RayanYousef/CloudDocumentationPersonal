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
