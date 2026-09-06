import { BLOB_RE, type RepoRef } from './model.js';
import type { ManifestEntry } from './manifest.js';

export const CODEMAP_START = '<!-- okf:codemap -->';
export const CODEMAP_END = '<!-- /okf:codemap -->';

export const codeMapPath = (r: RepoRef): string => `code-maps/${r.owner}--${r.repo}.md`;

interface Cite { title: string; file: string; source: boolean }

/** Path-ordered index of every code path cited by the manifest for one repo. */
export function renderCodeMap(manifest: ManifestEntry[], repo: RepoRef): string {
  const byPath = new Map<string, Cite[]>();
  const add = (url: string, entry: ManifestEntry, source: boolean): void => {
    const m = url.match(BLOB_RE);
    if (!m || m[1] !== repo.owner || m[2] !== repo.repo) return;
    const list = byPath.get(m[4]!) ?? [];
    if (!list.some((c) => c.file === entry.file && c.source === source)) list.push({ title: entry.title, file: entry.file, source });
    byPath.set(m[4]!, list);
  };
  for (const e of manifest) {
    add(e.resource, e, false);
    for (const s of e.sources) add(s, e, true);
  }
  const name = `${repo.owner}/${repo.repo}`;
  const lines = [
    '---', `title: "Code map: ${name}"`, 'sidebar_position: 98', '---', '',
    CODEMAP_START, `# Code map: ${name}`, '',
    'Generated from manifest.json. Each code path lists the pages that describe it; (source) marks a sources citation.', '',
  ];
  for (const path of [...byPath.keys()].sort((a, b) => a.localeCompare(b))) {
    const cites = byPath.get(path)!.map((c) => `[${c.title}](/${c.file})${c.source ? ' (source)' : ''}`);
    lines.push(`* \`${path}\` - ${cites.join(', ')}`);
  }
  lines.push(CODEMAP_END, '');
  return lines.join('\n');
}
