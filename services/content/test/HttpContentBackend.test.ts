import { describeContentBackendContract } from '@platform/contracts/testing';
import { makeLocalHarness } from './localHarness.js';
import { HttpContentBackend } from '../src/index.js';
import { serveContentBackend } from '../src/node.js';

describeContentBackendContract('HttpContentBackend over LocalFolderBackend', async () => {
  const local = await makeLocalHarness();
  const server = await serveContentBackend(local.backend);
  return { backend: new HttpContentBackend(server.url), readFile: local.readFile, listTags: local.listTags, cleanup: async () => { await server.close(); await local.cleanup?.(); } };
});
