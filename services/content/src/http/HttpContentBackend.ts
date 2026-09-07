import { ContentError, type AssetInfo, type AssetRef, type ContentBackend, type ContentErrorCode, type MutationOptions, type PageContent, type PageSummary, type PublishResult, type SearchHit, type VersionId, type VersionInfo, type WriteOptions, type WriteResult } from '@platform/contracts';

const toB64 = (bytes: Uint8Array): string => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };
const fromB64 = (b64: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

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
