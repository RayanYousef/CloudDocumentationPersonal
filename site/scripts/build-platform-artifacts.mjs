// Copies the OKF artifacts the editor and agents fetch at runtime into static/platform/.
// Runs as `prebuild`/`prestart`. Importable for tests; executes when run directly.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const exists = (p) => access(p).then(() => true, () => false);

export async function buildPlatformArtifacts(siteDir) {
  const out = path.join(siteDir, 'static', 'platform');
  await mkdir(out, { recursive: true });
  const written = [];
  const put = async (name, text) => { await writeFile(path.join(out, name), text); written.push(name); };

  await put('components.json', await readFile(path.join(siteDir, 'components.json'), 'utf8'));
  const versions = JSON.parse(await readFile(path.join(siteDir, 'versions.json'), 'utf8'));
  await put('versions.json', JSON.stringify({ current: 'Latest', versions }, null, 2) + '\n');

  const bundles = [['current', path.join(siteDir, 'docs')], ...versions.map((v) => [v, path.join(siteDir, 'versioned_docs', `version-${v}`)])];
  for (const [id, dir] of bundles) {
    const manifest = path.join(dir, 'manifest.json');
    if (await exists(manifest)) await put(`manifest-${id}.json`, await readFile(manifest, 'utf8'));
  }
  return written;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const written = await buildPlatformArtifacts(siteDir);
  console.log(`platform artifacts: ${written.join(', ')}`);
}
