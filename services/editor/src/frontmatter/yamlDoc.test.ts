import { describe, it, expect } from 'vitest';
import { splitDocument, readFields, applyFields } from './yamlDoc.js';

const doc = `---
title: Inventory
description: Explains how items are stored.
type: system
tags: [inventory, items]
resource: https://github.com/o/r/blob/main/x
sources:
  - resource: https://github.com/o/r/blob/main/x/y.cs
sidebar_position: 2
---

Body text.
`;

describe('yamlDoc', () => {
  it('reads fields with real scalar types', () => {
    const f = readFields(splitDocument(doc).head);
    expect(f).toEqual({ title: 'Inventory', description: 'Explains how items are stored.', type: 'system', tags: ['inventory', 'items'], resource: 'https://github.com/o/r/blob/main/x', sidebar_position: 2 });
  });
  it('rewrites only the changed keys and keeps numbers unquoted', () => {
    const out = applyFields(doc, { title: 'Inventory v2', sidebar_position: 3 });
    expect(out).toContain('title: Inventory v2\n');
    expect(out).toContain('sidebar_position: 3\n');
    expect(out).not.toContain('"3"');
    expect(out).toContain('sources:\n  - resource: https://github.com/o/r/blob/main/x/y.cs\n');
    expect(out.endsWith('\nBody text.\n')).toBe(true);
  });
  it('adds a fence to a document without frontmatter', () => {
    const out = applyFields('Just body\n', { title: 'T', type: 'guide' });
    expect(out.startsWith('---\ntitle: T\ntype: guide\n---\n')).toBe(true);
  });
  it('writes tags as a list', () => {
    const out = applyFields(doc, { tags: ['a', 'b'] });
    expect(readFields(splitDocument(out).head).tags).toEqual(['a', 'b']);
  });
});

describe('yamlDoc long scalars', () => {
  const long = 'Explains how item stacks are stored, merged and moved, and which service API mutates a container.';
  it('keeps a description longer than 80 columns on a single physical line', () => {
    const out = applyFields(doc, { description: long });
    const lines = splitDocument(out).head.split('\n');
    const descLines = lines.filter((l) => l.startsWith('description:'));
    expect(descLines).toEqual([`description: ${long}`]);
    const next = lines[lines.indexOf(descLines[0]!) + 1]!;
    expect(next.startsWith('type:')).toBe(true);
    expect(readFields(splitDocument(out).head).description).toBe(long);
  });
});
