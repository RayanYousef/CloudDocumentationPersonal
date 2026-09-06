import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildPlatformArtifacts } from './build-platform-artifacts.mjs';

describe('buildPlatformArtifacts', () => {
  it('copies components, versions and every manifest into static/platform', async () => {
    const site = await mkdtemp(path.join(tmpdir(), 'site-'));
    await mkdir(path.join(site, 'docs'), { recursive: true });
    await mkdir(path.join(site, 'versioned_docs/version-1.0.0'), { recursive: true });
    await writeFile(path.join(site, 'components.json'), '{"components":[]}');
    await writeFile(path.join(site, 'versions.json'), '["1.0.0"]');
    await writeFile(path.join(site, 'docs/manifest.json'), '[{"route":"/a"}]');
    await writeFile(path.join(site, 'versioned_docs/version-1.0.0/manifest.json'), '[{"route":"/b"}]');
    const written = await buildPlatformArtifacts(site);
    expect(written.sort()).toEqual(['components.json', 'manifest-1.0.0.json', 'manifest-current.json', 'versions.json']);
    expect(await readFile(path.join(site, 'static/platform/manifest-current.json'), 'utf8')).toBe('[{"route":"/a"}]');
    expect(JSON.parse(await readFile(path.join(site, 'static/platform/versions.json'), 'utf8'))).toEqual({ current: 'Latest', versions: ['1.0.0'] });
  });
});
