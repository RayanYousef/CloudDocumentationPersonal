import { ContentError, type AssetRef } from '@platform/contracts';

export const MAX_ASSET_BYTES = 100 * 1024 * 1024;
const CACHE_NAME = 'docs-platform-assets';
const BRANCH_TTL_MS = 10 * 60 * 1000;

export function assetUrls(ref: AssetRef): { media: string; raw: string } {
  const [owner, repo] = ref.repo.split('/');
  const path = ref.path.split('/').map(encodeURIComponent).join('/');
  return {
    media: `https://media.githubusercontent.com/media/${owner}/${repo}/${ref.ref}/${path}`,
    raw: `https://raw.githubusercontent.com/${owner}/${repo}/${ref.ref}/${path}`,
  };
}

const isSha = (ref: string): boolean => /^[0-9a-f]{40}$/.test(ref);

/** Fetch a file from a code repo at a ref; LFS-aware via the media endpoint; cached with the Cache API when available. */
export async function fetchAsset(ref: AssetRef, opts: { token?: string | null; fetch?: typeof fetch; cache?: CacheStorage | null } = {}): Promise<Blob> {
  const f = opts.fetch ?? globalThis.fetch.bind(globalThis);
  const cacheStore = opts.cache === undefined ? (typeof caches !== 'undefined' ? caches : null) : opts.cache;
  const key = `https://asset.cache/${ref.repo}@${ref.ref}/${ref.path}`;
  const cache = cacheStore ? await cacheStore.open(CACHE_NAME) : null;
  if (cache) {
    const hit = await cache.match(key);
    if (hit) {
      const at = Number(hit.headers.get('x-cached-at') ?? 0);
      if (isSha(ref.ref) || Date.now() - at < BRANCH_TTL_MS) return hit.blob();
    }
  }
  const headers: Record<string, string> = opts.token ? { Authorization: `token ${opts.token}` } : {};
  const urls = assetUrls(ref);
  let res: Response | null = null;
  for (const url of [urls.media, urls.raw]) {
    try { res = await f(url, { headers }); } catch (e) { throw new ContentError('NETWORK', `Cannot reach ${url}: ${(e as Error).message}`); }
    if (res.ok) break;
    if (res.status === 404 || res.status === 403) continue;
    throw new ContentError('NETWORK', `HTTP ${res.status} fetching ${url}`);
  }
  if (!res || !res.ok) throw new ContentError('NOT_FOUND', `Asset not found: ${ref.repo}@${ref.ref}/${ref.path}`);
  const len = Number(res.headers.get('content-length') ?? 0);
  if (len > MAX_ASSET_BYTES) throw new ContentError('TOO_LARGE', `Asset is ${len} bytes; the limit is ${MAX_ASSET_BYTES}`);
  const blob = await res.blob();
  if (blob.size > MAX_ASSET_BYTES) throw new ContentError('TOO_LARGE', `Asset is ${blob.size} bytes; the limit is ${MAX_ASSET_BYTES}`);
  if (cache) await cache.put(key, new Response(blob, { headers: { 'x-cached-at': String(Date.now()), 'content-type': blob.type || 'application/octet-stream' } }));
  return blob;
}
