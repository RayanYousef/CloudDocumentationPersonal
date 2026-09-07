import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const SKIP_DIRS = new Set(['node_modules']);

/** Read every .md file plus manifest.json below `dir` into a bundle-relative map. */
export async function readBundle(dir: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  async function walk(abs: string, rel: string): Promise<void> {
    for (const ent of await readdir(abs, { withFileTypes: true })) {
      if (ent.name.startsWith('.') || SKIP_DIRS.has(ent.name)) continue;
      const childRel = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) await walk(path.join(abs, ent.name), childRel);
      else if (ent.name.endsWith('.md') || childRel === 'manifest.json') files[childRel] = await readFile(path.join(abs, ent.name), 'utf8');
    }
  }
  await walk(dir, '');
  return files;
}

export async function writeFiles(dir: string, writes: Record<string, string>): Promise<void> {
  for (const [rel, text] of Object.entries(writes)) {
    const abs = path.join(dir, ...rel.split('/'));
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, text);
  }
}
