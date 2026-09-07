import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { MINI_BUNDLE, NEW_PAGE_TEXT } from '@platform/contracts/testing';
import { runCli, readBundle } from '../src/node/index.js';

async function seed(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'okf-'));
  for (const [rel, text] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(dir, rel)), { recursive: true });
    await writeFile(path.join(dir, rel), text);
  }
  await mkdir(path.join(dir, 'versions'), { recursive: true });
  await writeFile(path.join(dir, 'versions', '1.0.0.json'), '{}');
  return dir;
}

const io = () => { const out: string[] = []; return { out, log: (s: string) => out.push(s), error: (s: string) => out.push(s) }; };

describe('okf CLI', () => {
  let dir: string;
  beforeEach(async () => { dir = await seed({ ...MINI_BUNDLE, 'systems/combat.md': NEW_PAGE_TEXT }); });

  it('readBundle skips data folders and non-markdown', async () => {
    const files = await readBundle(dir);
    expect(Object.keys(files)).not.toContain('versions/1.0.0.json');
    expect(Object.keys(files)).toContain('manifest.json');
  });
  it('check exits 1 on stale content and writes nothing', async () => {
    const o = io();
    expect(await runCli(['check', dir, '--repo', 'acme/game'], o)).toBe(1);
    expect(o.out.join('\n')).toContain('stale');
    expect(await readFile(path.join(dir, 'manifest.json'), 'utf8')).toBe(MINI_BUNDLE['manifest.json']);
  });
  it('generate writes and a following check exits 0', async () => {
    expect(await runCli(['generate', dir, '--repo', 'acme/game'], io())).toBe(0);
    expect(await readFile(path.join(dir, 'systems/index.md'), 'utf8')).toContain('[Combat](combat.md)');
    expect(await runCli(['check', dir, '--repo', 'acme/game'], io())).toBe(0);
  });
  it('usage errors exit 2', async () => {
    expect(await runCli([], io())).toBe(2);
    expect(await runCli(['check'], io())).toBe(2);
  });
});
