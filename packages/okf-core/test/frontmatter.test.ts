import { describe, it, expect } from 'vitest';
import { parseFrontmatter, parseYamlSubset } from '../src/index.js';

describe('parseYamlSubset', () => {
  it('parses scalars, quoted strings, inline lists and block lists of maps', () => {
    const data = parseYamlSubset([
      'title: "Save Format: JSON"',
      'sidebar_position: 2',
      'draft: false',
      'tags: [a, b, "c d"]',
      'sources:',
      '  - resource: https://x/y',
      '  - resource: https://x/z',
      '# comment',
    ].join('\n'));
    expect(data).toEqual({
      title: 'Save Format: JSON', sidebar_position: 2, draft: false, tags: ['a', 'b', 'c d'],
      sources: [{ resource: 'https://x/y' }, { resource: 'https://x/z' }],
    });
  });
  it('parses a block list of scalars', () => {
    expect(parseYamlSubset('tags:\n  - one\n  - two')).toEqual({ tags: ['one', 'two'] });
  });
});

describe('parseFrontmatter', () => {
  it('splits head, data and body', () => {
    const r = parseFrontmatter('---\ntitle: A\n---\n\nBody\n');
    expect(r.data).toEqual({ title: 'A' });
    expect(r.body).toBe('\nBody\n');
    expect(r.head).toBe('---\ntitle: A\n---\n');
  });
  it('returns null data without a fence', () => {
    expect(parseFrontmatter('# Hi\n')).toEqual({ data: null, body: '# Hi\n', head: '' });
  });
  it('tolerates CRLF', () => {
    expect(parseFrontmatter('---\r\ntitle: A\r\n---\r\nB').data).toEqual({ title: 'A' });
  });
});
