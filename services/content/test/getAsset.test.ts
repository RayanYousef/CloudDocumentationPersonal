import { describe, it, expect } from 'vitest';
import { fetchAsset, assetUrls } from '../src/index.js';

const ref = { repo: 'RayanYousef/CloudDocumentationPersonal', ref: 'main', path: 'examples/unity-project/Assets/Models/Airship.fbx' };

describe('fetchAsset', () => {
  it('builds media and raw URLs', () => {
    expect(assetUrls(ref).media).toBe('https://media.githubusercontent.com/media/RayanYousef/CloudDocumentationPersonal/main/examples/unity-project/Assets/Models/Airship.fbx');
    expect(assetUrls(ref).raw).toBe('https://raw.githubusercontent.com/RayanYousef/CloudDocumentationPersonal/main/examples/unity-project/Assets/Models/Airship.fbx');
  });
  it('tries media first, falls back to raw, and sends the token header', async () => {
    const calls: { url: string; auth?: string }[] = [];
    const f: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, auth: (init?.headers as Record<string, string>)?.['Authorization'] });
      return url.includes('media.') ? new Response(null, { status: 404 }) : new Response('bytes', { status: 200 });
    };
    const blob = await fetchAsset(ref, { fetch: f, token: 't0k', cache: null });
    expect(await blob.text()).toBe('bytes');
    expect(calls.map((c) => c.url.split('/')[2])).toEqual(['media.githubusercontent.com', 'raw.githubusercontent.com']);
    expect(calls[0]?.auth).toBe('token t0k');
  });
  it('throws NOT_FOUND when both sources 404', async () => {
    const f: typeof fetch = async () => new Response(null, { status: 404 });
    await expect(fetchAsset(ref, { fetch: f, cache: null })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
