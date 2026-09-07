import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { copyEditor } from './copy-editor.mjs';

describe('copyEditor', () => {
  it('copies the editor build into site/build/editor', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'copy-'));
    await mkdir(path.join(root, 'services/editor/dist/assets'), { recursive: true });
    await mkdir(path.join(root, 'site/build'), { recursive: true });
    await writeFile(path.join(root, 'services/editor/dist/index.html'), '<html></html>');
    await writeFile(path.join(root, 'services/editor/dist/assets/app.js'), 'x');
    await copyEditor(root);
    expect(await readFile(path.join(root, 'site/build/editor/index.html'), 'utf8')).toBe('<html></html>');
    expect(await readFile(path.join(root, 'site/build/editor/assets/app.js'), 'utf8')).toBe('x');
  });
  it('fails clearly when the editor was not built', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'copy-'));
    await mkdir(path.join(root, 'site/build'), { recursive: true });
    await expect(copyEditor(root)).rejects.toThrow('services/editor/dist');
  });
});
