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
