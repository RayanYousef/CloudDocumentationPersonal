export type VersionId = string;
export const CURRENT_VERSION: VersionId = 'current';

export interface VersionInfo { id: VersionId; label: string; frozen: boolean }
export interface Author { name: string; email: string }
export interface PageSummary { path: string; title: string; description: string; type: string; tags: string[] }
export interface PageContent { path: string; text: string; etag: string }
export interface MutationOptions { message: string; author: Author }
export interface WriteOptions extends MutationOptions { expectedEtag?: string }
export interface WriteResult { commitSha: string; commitUrl: string | null; etag: string; regenerated: string[] }
export interface AssetRef { repo: string; ref: string; path: string }
export interface AssetInfo { path: string; url: string; size: number; kind: 'model' | 'image' | 'other' }
export interface SearchHit { path: string; title: string; description: string; score: number }
export interface PublishResult { version: string; tag: string; commitSha: string; pins: Record<string, string> }

export type ContentErrorCode =
  | 'NOT_FOUND' | 'EXISTS' | 'CONFLICT' | 'FROZEN' | 'VALIDATION' | 'FORBIDDEN' | 'TOO_LARGE' | 'NETWORK';

export class ContentError extends Error {
  override readonly name = 'ContentError';
  constructor(public readonly code: ContentErrorCode, message: string, public readonly details?: unknown) {
    super(message);
  }
}

/**
 * Every content storage implements this and passes describeContentBackendContract.
 * Paths are bundle-relative POSIX paths ("systems/inventory.md"). Asset paths are
 * relative to the site's static folder ("models/airship.glb").
 */
export interface ContentBackend {
  readonly id: string;
  listVersions(): Promise<VersionInfo[]>;
  listPages(version: VersionId): Promise<PageSummary[]>;
  readPage(version: VersionId, path: string): Promise<PageContent>;
  writePage(version: VersionId, path: string, text: string, opts: WriteOptions): Promise<WriteResult>;
  createPage(version: VersionId, path: string, text: string, opts: MutationOptions): Promise<WriteResult>;
  deletePage(version: VersionId, path: string, opts: MutationOptions): Promise<WriteResult>;
  renamePage(version: VersionId, from: string, to: string, opts: MutationOptions): Promise<WriteResult>;
  uploadAsset(path: string, bytes: Uint8Array, opts: MutationOptions): Promise<WriteResult & { asset: AssetInfo }>;
  listAssets(): Promise<AssetInfo[]>;
  search(version: VersionId, query: string): Promise<SearchHit[]>;
  publishVersion(version: string, opts: MutationOptions): Promise<PublishResult>;
  getAsset(ref: AssetRef): Promise<Blob>;
}
