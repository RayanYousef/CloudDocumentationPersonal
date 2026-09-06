import { describe, it, expect } from 'vitest';
import { MINI_BUNDLE, MINI_CODE_REPOS } from '@platform/contracts/testing';
import { renderCodeMap, codeMapPath, buildManifest, analyzeBundle } from '../src/index.js';

describe('code maps', () => {
  it('names the file from owner and repo', () => {
    expect(codeMapPath({ owner: 'acme', repo: 'game' })).toBe('code-maps/acme--game.md');
  });
  it('renders the mini bundle code map byte-exactly', () => {
    const manifest = buildManifest(analyzeBundle(MINI_BUNDLE));
    expect(renderCodeMap(manifest, MINI_CODE_REPOS[0]!)).toBe(MINI_BUNDLE['code-maps/acme--game.md']);
  });
  it('ignores resources of other repos', () => {
    const manifest = buildManifest(analyzeBundle(MINI_BUNDLE));
    expect(renderCodeMap(manifest, { owner: 'other', repo: 'x' })).not.toContain('Inventory');
  });
});
