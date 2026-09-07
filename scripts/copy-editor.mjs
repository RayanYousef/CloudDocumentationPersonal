// Copies the built editor into the built site so GitHub Pages serves it at <baseUrl>editor/.
import { cp, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function copyEditor(root) {
  const from = path.join(root, 'services/editor/dist');
  const to = path.join(root, 'site/build/editor');
  await access(from).catch(() => { throw new Error(`Editor build not found at services/editor/dist; run "npm run build -w @platform/editor" first`); });
  await access(path.join(root, 'site/build')).catch(() => { throw new Error('Site build not found at site/build; run "npm run build -w @platform/site" first'); });
  await cp(from, to, { recursive: true });
  return to;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  console.log(`editor copied to ${await copyEditor(root)}`);
}
