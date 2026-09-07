import { END_MARKER, START_MARKER, type BundleModel, type IndexNode, basename, dirname } from './model.js';

interface Entry { pos: number; title: string; link: string; desc: string }
const fmt = (e: Entry): string => `* [${e.title}](${e.link}) - ${e.desc}`;
const bySort = (a: Entry, b: Entry): number => (a.pos - b.pos) || a.title.localeCompare(b.title);

export function renderIndexBlock(model: BundleModel, dir: string): string {
  const pageEntries: Entry[] = model.pages
    .filter((p) => p.dir === dir && p.meta)
    .map((p) => ({ pos: p.meta!.sidebarPosition, title: p.meta!.title, link: basename(p.path), desc: p.meta!.description }));
  const dirEntries: Entry[] = model.dirs
    .filter((d) => d !== '' && dirname(d) === dir && model.indexes.has(d))
    .map((d) => {
      const c = model.indexes.get(d)!;
      const pos = typeof c.data['sidebar_position'] === 'number' ? c.data['sidebar_position'] : 999;
      return { pos, title: String(c.data['title'] ?? basename(d)), link: `${basename(d)}/`, desc: c.intro };
    });
  const lines = [START_MARKER];
  if (pageEntries.length) lines.push('## Pages', ...pageEntries.sort(bySort).map(fmt));
  if (dirEntries.length) lines.push(...(lines.length > 1 ? [''] : []), '## Folders', ...dirEntries.sort(bySort).map(fmt));
  lines.push(END_MARKER);
  return lines.join('\n');
}

export function applyIndexBlock(ix: IndexNode, block: string): string {
  return ix.head + ix.pre + block + ix.post;
}
