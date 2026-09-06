import { createServer } from 'node:http';
import { ContentError, type ContentBackend } from '@platform/contracts';

/** Exposes any ContentBackend over POST /rpc {method, args}. Dev/e2e only in Phase 1 (no auth). */
export async function serveContentBackend(backend: ContentBackend, opts: { port?: number; host?: string } = {}): Promise<{ url: string; close(): Promise<void> }> {
  const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (req.method !== 'POST' || req.url !== '/rpc') { res.writeHead(404); res.end(); return; }
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const send = (status: number, body: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
    try {
      const { method, args } = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { method: keyof ContentBackend; args: unknown[] };
      if (typeof backend[method] !== 'function') { send(400, { error: { code: 'NOT_FOUND', message: `Unknown method ${String(method)}` } }); return; }
      if (method === 'uploadAsset') args[1] = new Uint8Array(Buffer.from((args[1] as { base64: string }).base64, 'base64'));
      let result: unknown = await (backend[method] as (...a: unknown[]) => Promise<unknown>).apply(backend, args);
      if (method === 'getAsset') { const blob = result as Blob; result = { base64: Buffer.from(await blob.arrayBuffer()).toString('base64'), type: blob.type }; }
      send(200, { result });
    } catch (e) {
      const err = e instanceof ContentError ? e : new ContentError('NETWORK', (e as Error).message);
      send(200, { error: { code: err.code, message: err.message, details: err.details } });
    }
  });
  await new Promise<void>((resolve) => server.listen(opts.port ?? 0, opts.host ?? '127.0.0.1', resolve));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : opts.port;
  return { url: `http://${opts.host ?? '127.0.0.1'}:${port}`, close: () => new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))) };
}
