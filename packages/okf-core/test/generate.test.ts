import { describe, it, expect } from 'vitest';
import { MINI_BUNDLE, MINI_CODE_REPOS, NEW_PAGE_TEXT } from '@platform/contracts/testing';
import { generateBundle, checkBundle, renderIndexBlock, analyzeBundle } from '../src/index.js';

const opts = { codeRepos: MINI_CODE_REPOS };

describe('generateBundle', () => {
  it('is a no-op on an up-to-date bundle', () => {
    const r = generateBundle(MINI_BUNDLE, opts);
    expect(r.problems).toEqual([]);
    expect(r.writes).toEqual({});
    expect(r.manifest?.map((m) => m.route)).toEqual(['/getting-started', '/systems/inventory']);
  });
  it('adds a bullet for a new page, ordered by sidebar_position then title, and rewrites the manifest', () => {
    const files = { ...MINI_BUNDLE, 'systems/combat.md': NEW_PAGE_TEXT };
    const r = generateBundle(files, opts);
    expect(r.problems).toEqual([]);
    expect(Object.keys(r.writes).sort()).toEqual(['code-maps/acme--game.md', 'manifest.json', 'systems/index.md']);
    const idx = r.writes['systems/index.md']!;
    expect(idx.indexOf('* [Inventory](inventory.md)')).toBeLessThan(idx.indexOf('* [Combat](combat.md) - Describes the damage pipeline used whenever anything takes damage.'));
    expect(idx.startsWith(MINI_BUNDLE['systems/index.md']!.slice(0, MINI_BUNDLE['systems/index.md']!.indexOf('<!-- okf:index -->')))).toBe(true);
    expect(JSON.parse(r.writes['manifest.json']!).map((m: { file: string }) => m.file)).toEqual(['getting-started.md', 'systems/combat.md', 'systems/inventory.md']);
  });
  it('creates markers at the end of an index that has none', () => {
    const files = { ...MINI_BUNDLE, 'systems/index.md': '---\ntitle: Systems\nsidebar_position: 2\n---\n\nRuntime systems of the game.\n' };
    const r = generateBundle(files, opts);
    expect(r.writes['systems/index.md']).toBe(MINI_BUNDLE['systems/index.md']);
  });
  it('still rewrites index blocks but withholds manifest and code maps when validation fails', () => {
    const files = { ...MINI_BUNDLE, 'systems/combat.md': NEW_PAGE_TEXT.replace('type: system\n', '') };
    const r = generateBundle(files, opts);
    expect(r.problems.map((p) => p.rule)).toContain('frontmatter');
    expect(r.manifest).toBeNull();
    expect(r.writes['systems/index.md']).toBeDefined();
    expect(r.writes['manifest.json']).toBeUndefined();
    expect(r.writes['code-maps/acme--game.md']).toBeUndefined();
  });
});

describe('checkBundle', () => {
  it('reports stale index block, manifest and code map as problems', () => {
    const files = { ...MINI_BUNDLE, 'systems/combat.md': NEW_PAGE_TEXT };
    const rules = checkBundle(files, opts).problems.map((p) => `${p.rule}:${p.file}`).sort();
    expect(rules).toEqual(['stale:code-maps/acme--game.md', 'stale:manifest.json', 'stale:systems/index.md']);
  });
  it('does not report a bundle checked out with CRLF line endings as stale', () => {
    const crlf = Object.fromEntries(Object.entries(MINI_BUNDLE).map(([k, v]) => [k, v.replace(/\r?\n/g, '\r\n')]));
    expect(Object.values(crlf).every((v) => v.includes('\r\n'))).toBe(true);
    expect(checkBundle(crlf, opts).problems).toEqual([]);
    expect(generateBundle(crlf, opts).writes).toEqual({});
  });
  it('still reports real changes when the bundle uses CRLF line endings', () => {
    const crlf = Object.fromEntries(Object.entries({ ...MINI_BUNDLE, 'systems/combat.md': NEW_PAGE_TEXT }).map(([k, v]) => [k, v.replace(/\r?\n/g, '\r\n')]));
    const rules = checkBundle(crlf, opts).problems.map((p) => `${p.rule}:${p.file}`).sort();
    expect(rules).toEqual(['stale:code-maps/acme--game.md', 'stale:manifest.json', 'stale:systems/index.md']);
  });
});

describe('renderIndexBlock', () => {
  it('renders Pages then Folders with a blank line between', () => {
    const block = renderIndexBlock(analyzeBundle(MINI_BUNDLE), '');
    expect(block).toBe([
      '<!-- okf:index -->', '## Pages',
      '* [Getting Started](getting-started.md) - Read this first to build and run the game locally.',
      '', '## Folders', '* [Systems](systems/) - Runtime systems of the game.', '<!-- /okf:index -->',
    ].join('\n'));
  });
});
