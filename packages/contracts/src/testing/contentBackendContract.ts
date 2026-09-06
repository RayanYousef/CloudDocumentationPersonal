import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { ContentBackend, MutationOptions } from '../content.js';
import { CURRENT_VERSION } from '../content.js';
import { NEW_PAGE_TEXT, INVALID_PAGE_TEXT } from './fixtures/miniBundle.js';

export interface ContentBackendHarness {
  /** Backend seeded with MINI_BUNDLE as the Latest docs and no frozen versions. */
  backend: ContentBackend;
  /** Read a file relative to the site folder ("docs/index.md"); null when absent. */
  readFile(relPath: string): Promise<string | null>;
  /** Git tags present in the backing repository. */
  listTags(): Promise<string[]>;
  cleanup?: () => Promise<void>;
}

const opts = (message: string): MutationOptions => ({ message, author: { name: 'Contract Tester', email: 'tester@example.com' } });

export function describeContentBackendContract(name: string, factory: () => Promise<ContentBackendHarness>): void {
  describe(`ContentBackend contract: ${name}`, () => {
    let h: ContentBackendHarness;
    beforeAll(async () => { h = await factory(); });
    afterAll(async () => { await h.cleanup?.(); });

    it('lists the current version first and marks it editable', async () => {
      const versions = await h.backend.listVersions();
      expect(versions[0]).toMatchObject({ id: CURRENT_VERSION, frozen: false });
    });

    it('lists concept pages only (no index, log, AGENTS, README, code-maps)', async () => {
      const pages = await h.backend.listPages(CURRENT_VERSION);
      const paths = pages.map((p) => p.path).sort();
      expect(paths).toEqual(['getting-started.md', 'systems/inventory.md']);
      expect(pages.find((p) => p.path === 'systems/inventory.md')).toMatchObject({ title: 'Inventory', type: 'system', tags: ['inventory', 'gameplay'] });
    });

    it('reads a page with an etag', async () => {
      const page = await h.backend.readPage(CURRENT_VERSION, 'systems/inventory.md');
      expect(page.text).toContain('title: Inventory');
      expect(page.etag.length).toBeGreaterThan(0);
    });

    it('readPage of a missing path throws NOT_FOUND', async () => {
      await expect(h.backend.readPage(CURRENT_VERSION, 'nope.md')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('writePage regenerates the parent index, manifest and log in one commit', async () => {
      const before = await h.backend.readPage(CURRENT_VERSION, 'systems/inventory.md');
      const edited = before.text.replace('Explains how items are stored', 'Explains how item stacks are stored');
      const res = await h.backend.writePage(CURRENT_VERSION, 'systems/inventory.md', edited, { ...opts('Clarify inventory description'), expectedEtag: before.etag });
      expect(res.commitSha).toMatch(/^[0-9a-f]{7,40}$/);
      expect(res.regenerated).toEqual(expect.arrayContaining(['systems/index.md', 'manifest.json', 'log.md']));
      expect(await h.readFile('docs/systems/index.md')).toContain('Explains how item stacks are stored');
      expect(await h.readFile('docs/manifest.json')).toContain('Explains how item stacks are stored');
      const log = await h.readFile('docs/log.md');
      expect(log).toMatch(/\* \*\*Update\*\*: \[Inventory\]\(\/systems\/inventory\.md\) - Clarify inventory description\. \(by Contract Tester\)/);
    });

    it('writePage with a stale etag throws CONFLICT', async () => {
      const page = await h.backend.readPage(CURRENT_VERSION, 'systems/inventory.md');
      await expect(h.backend.writePage(CURRENT_VERSION, 'systems/inventory.md', page.text + '\nmore\n', { ...opts('x'), expectedEtag: 'stale-etag' })).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('writePage with invalid frontmatter throws VALIDATION with problems', async () => {
      await expect(h.backend.writePage(CURRENT_VERSION, 'systems/inventory.md', INVALID_PAGE_TEXT, opts('bad'))).rejects.toMatchObject({ code: 'VALIDATION' });
    });

    it('createPage adds the page, its index bullet and an Add log entry', async () => {
      const res = await h.backend.createPage(CURRENT_VERSION, 'systems/combat.md', NEW_PAGE_TEXT, opts('Add combat page'));
      expect(res.regenerated).toContain('systems/index.md');
      expect(await h.readFile('docs/systems/index.md')).toContain('* [Combat](combat.md) - Describes the damage pipeline');
      expect(await h.readFile('docs/log.md')).toMatch(/\*\*Add\*\*: \[Combat\]\(\/systems\/combat\.md\)/);
      expect((await h.backend.listPages(CURRENT_VERSION)).map((p) => p.path)).toContain('systems/combat.md');
    });

    it('createPage on an existing path throws EXISTS', async () => {
      await expect(h.backend.createPage(CURRENT_VERSION, 'systems/combat.md', NEW_PAGE_TEXT, opts('dup'))).rejects.toMatchObject({ code: 'EXISTS' });
    });

    it('renamePage moves the file and updates the index', async () => {
      await h.backend.renamePage(CURRENT_VERSION, 'systems/combat.md', 'systems/damage.md', opts('Rename combat to damage'));
      expect(await h.readFile('docs/systems/combat.md')).toBeNull();
      expect(await h.readFile('docs/systems/damage.md')).toContain('title: Combat');
      expect(await h.readFile('docs/systems/index.md')).toContain('(damage.md)');
      expect(await h.readFile('docs/systems/index.md')).not.toContain('(combat.md)');
    });

    it('deletePage removes the file and its bullet', async () => {
      await h.backend.deletePage(CURRENT_VERSION, 'systems/damage.md', opts('Remove damage page'));
      expect(await h.readFile('docs/systems/damage.md')).toBeNull();
      expect(await h.readFile('docs/systems/index.md')).not.toContain('damage.md');
      expect(await h.readFile('docs/manifest.json')).not.toContain('damage');
    });

    it('uploadAsset stores bytes under static/ and listAssets sees it', async () => {
      const bytes = new TextEncoder().encode('glTF-bytes');
      const res = await h.backend.uploadAsset('models/test.glb', bytes, opts('Add test model'));
      expect(res.asset).toMatchObject({ path: 'models/test.glb', kind: 'model', size: bytes.byteLength });
      expect(res.asset.url).toMatch(/\/models\/test\.glb$/);
      const assets = await h.backend.listAssets();
      expect(assets.map((a) => a.path)).toContain('models/test.glb');
    });

    it('search finds a page by a word in its description', async () => {
      const hits = await h.backend.search(CURRENT_VERSION, 'inventory');
      expect(hits.map((x) => x.path)).toContain('systems/inventory.md');
    });

    it('publishVersion snapshots docs with sha-pinned resources, records pins and tags', async () => {
      const res = await h.backend.publishVersion('1.1.0', opts('Publish 1.1.0'));
      expect(res).toMatchObject({ version: '1.1.0', tag: 'docs-v1.1.0' });
      expect(res.pins['acme/game']).toMatch(/^[0-9a-f]{40}$/);
      const frozen = await h.readFile('docs/versions/1.1.0.json');
      expect(JSON.parse(frozen!)).toMatchObject({ version: '1.1.0', pins: { 'acme/game': res.pins['acme/game'] }, refs: { 'acme/game': 'main' } });
      const snap = await h.readFile('versioned_docs/version-1.1.0/systems/inventory.md');
      expect(snap).toContain(`/blob/${res.pins['acme/game']}/Assets/Scripts/Inventory`);
      expect(snap).not.toContain('/blob/main/');
      expect(await h.readFile('versioned_docs/version-1.1.0/versions/1.1.0.json')).toBeNull();
      expect(JSON.parse((await h.readFile('versions.json'))!)[0]).toBe('1.1.0');
      expect(await h.readFile('versioned_sidebars/version-1.1.0-sidebars.json')).not.toBeNull();
      expect(await h.listTags()).toContain('docs-v1.1.0');
      const versions = await h.backend.listVersions();
      expect(versions.find((v) => v.id === '1.1.0')).toMatchObject({ frozen: true });
    });

    it('writes into a frozen version are refused with FROZEN', async () => {
      const page = await h.backend.readPage('1.1.0', 'systems/inventory.md');
      await expect(h.backend.writePage('1.1.0', 'systems/inventory.md', page.text + '\nx\n', opts('nope'))).rejects.toMatchObject({ code: 'FROZEN' });
      await expect(h.backend.createPage('1.1.0', 'systems/new.md', NEW_PAGE_TEXT, opts('nope'))).rejects.toMatchObject({ code: 'FROZEN' });
    });
  });
}
