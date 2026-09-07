import { describe, it, expect } from 'vitest';
import { MINI_BUNDLE } from '@platform/contracts/testing';
import { prependLogEntries, validateLog, logEntriesFromCommits } from '../src/index.js';

const entry = { action: 'Update' as const, title: 'Inventory', path: '/systems/inventory.md', summary: 'Clarify description.', author: 'Rayan Yousef' };

describe('prependLogEntries', () => {
  it('inserts a new dated section before older ones and keeps frontmatter + preamble', () => {
    const out = prependLogEntries(MINI_BUNDLE['log.md']!, '2026-09-07', [entry]);
    expect(out).toBe(`---
title: Change Log
sidebar_position: 99
---

Newest first.

## 2026-09-07

* **Update**: [Inventory](/systems/inventory.md) - Clarify description. (by Rayan Yousef)

## 2026-08-01

* **Add**: [Inventory](/systems/inventory.md) - initial page. (by Test Author)
`);
  });
  it('prepends bullets inside an existing section for the same day', () => {
    const once = prependLogEntries(MINI_BUNDLE['log.md']!, '2026-08-01', [entry]);
    expect(once.match(/## 2026-08-01/g)).toHaveLength(1);
    expect(once.indexOf('Clarify description')).toBeLessThan(once.indexOf('initial page'));
  });
  it('appends a period when the summary lacks one', () => {
    const out = prependLogEntries(MINI_BUNDLE['log.md']!, '2026-09-07', [{ ...entry, summary: 'no period' }]);
    expect(out).toContain('- no period. (by Rayan Yousef)');
  });
});

describe('validateLog', () => {
  it('accepts the mini log', () => { expect(validateLog(MINI_BUNDLE['log.md']!)).toEqual([]); });
  it('rejects extra frontmatter keys, bad headings, wrong order and malformed bullets', () => {
    const bad = `---\ntitle: Change Log\ndescription: x\n---\n\n## 2026-08-01\n\n* **Add**: [A](/a.md) - a. (by B)\n\n## 2026-09-01\n\n* Fix: stuff\n\n## 2026/09/02\n`;
    const rules = validateLog(bad).map((p) => p.message);
    expect(rules.some((m) => m.includes('description'))).toBe(true);
    expect(rules.some((m) => m.includes('descending'))).toBe(true);
    expect(rules.some((m) => m.includes('bullet'))).toBe(true);
    expect(rules.some((m) => m.includes('heading'))).toBe(true);
  });
});

describe('logEntriesFromCommits', () => {
  it('maps commits to dated entries, Add for A and Update for M, skipping non-pages', () => {
    const groups = logEntriesFromCommits([
      { date: '2026-09-07', author: 'A', message: 'Add combat', files: [{ path: 'systems/combat.md', status: 'A' }, { path: 'systems/index.md', status: 'M' }, { path: 'manifest.json', status: 'M' }] },
      { date: '2026-09-06', author: 'B', message: 'Fix typo', files: [{ path: 'getting-started.md', status: 'M' }] },
    ], (p) => ({ 'systems/combat.md': 'Combat', 'getting-started.md': 'Getting Started' }[p]));
    expect(groups).toEqual([
      { date: '2026-09-07', entries: [{ action: 'Add', title: 'Combat', path: '/systems/combat.md', summary: 'Add combat', author: 'A' }] },
      { date: '2026-09-06', entries: [{ action: 'Update', title: 'Getting Started', path: '/getting-started.md', summary: 'Fix typo', author: 'B' }] },
    ]);
  });
});
