import { describe, it, expect } from 'vitest';
import { MINI_BUNDLE, MINI_CODE_REPOS } from '@platform/contracts/testing';
import { analyzeBundle, validateBundle, validatePage } from '../src/index.js';

const rules = (files: Record<string, string>, codeRepos = MINI_CODE_REPOS) =>
  validateBundle(analyzeBundle(files), files, { codeRepos }).map((p) => `${p.rule}:${p.file}`);

describe('validateBundle', () => {
  it('accepts the mini bundle', () => {
    expect(rules(MINI_BUNDLE)).toEqual([]);
  });
  it('reports missing type and description', () => {
    const files = { ...MINI_BUNDLE, 'systems/inventory.md': '---\ntitle: X\nresource: https://github.com/acme/game/blob/main/a\n---\nb\n' };
    expect(rules(files)).toEqual(expect.arrayContaining(['frontmatter:systems/inventory.md']));
  });
  it('reports a broken relative link', () => {
    const files = { ...MINI_BUNDLE, 'systems/inventory.md': MINI_BUNDLE['systems/inventory.md']! + '\nSee [Status](status-effects.md).\n' };
    expect(rules(files)).toContain('link:systems/inventory.md');
  });
  it('accepts a relative link to a folder and to a sibling file', () => {
    const files = { ...MINI_BUNDLE, 'getting-started.md': MINI_BUNDLE['getting-started.md']! + '\n[Systems](systems/) and [Inv](systems/inventory.md)\n' };
    expect(rules(files)).toEqual([]);
  });
  it('reports a resource that is not a blob URL', () => {
    const files = { ...MINI_BUNDLE, 'getting-started.md': MINI_BUNDLE['getting-started.md']!.replace('blob/main/README.md', 'tree/main') };
    expect(rules(files)).toContain('resource:getting-started.md');
  });
  it('reports a resource pointing at an undeclared repo', () => {
    const files = { ...MINI_BUNDLE, 'getting-started.md': MINI_BUNDLE['getting-started.md']!.replace('acme/game', 'other/repo') };
    expect(rules(files)).toContain('undeclared-repo:getting-started.md');
    expect(rules(files, [])).not.toContain('undeclared-repo:getting-started.md');
  });
  it('reports extra keys on an index and a root index without okf_version', () => {
    const files = { ...MINI_BUNDLE, 'systems/index.md': MINI_BUNDLE['systems/index.md']!.replace('sidebar_position: 2', 'sidebar_position: 2\ndescription: nope') };
    expect(rules(files)).toContain('index-frontmatter:systems/index.md');
    const files2 = { ...MINI_BUNDLE, 'index.md': MINI_BUNDLE['index.md']!.replace('okf_version: "0.2"\n', '') };
    expect(rules(files2)).toContain('index-frontmatter:index.md');
  });
  it('reports a folder with markdown but no index.md', () => {
    const files = { ...MINI_BUNDLE, 'assets/airship.md': MINI_BUNDLE['systems/inventory.md']! };
    expect(rules(files)).toContain('missing-index:assets/index.md');
  });
});

describe('validatePage', () => {
  it('validates a single page without the bundle', () => {
    const problems = validatePage('x/y.md', '---\ntitle: T\n---\n', { codeRepos: MINI_CODE_REPOS });
    expect(problems.map((p) => p.rule)).toEqual(expect.arrayContaining(['frontmatter', 'resource']));
  });
  it('returns no problems for a valid page', () => {
    expect(validatePage('systems/inventory.md', MINI_BUNDLE['systems/inventory.md']!, { codeRepos: MINI_CODE_REPOS })).toEqual([]);
  });
});
