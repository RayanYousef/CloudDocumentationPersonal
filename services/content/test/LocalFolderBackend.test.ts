import { describe, it, expect } from 'vitest';
import { describeContentBackendContract } from '@platform/contracts/testing';
import { makeLocalHarness } from './localHarness.js';
import { git } from '../src/node.js';
import path from 'node:path';

describeContentBackendContract('LocalFolderBackend', makeLocalHarness);

describe('LocalFolderBackend commits', () => {
  it('records the editor as commit author', async () => {
    const h = await makeLocalHarness();
    const page = await h.backend.readPage('current', 'getting-started.md');
    await h.backend.writePage('current', 'getting-started.md', page.text + '\nExtra.\n', { message: 'Extra line', author: { name: 'Mira Okonkwo', email: 'mira@example.com' } });
    expect(await git(path.dirname(h.siteDir), 'log', '-1', '--format=%an <%ae> %s')).toBe('Mira Okonkwo <mira@example.com> Extra line');
    await h.cleanup?.();
  });
});
