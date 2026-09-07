import { parseFrontmatter } from './frontmatter.js';

export interface RepoRef { owner: string; repo: string }
export interface Problem { file: string; rule: string; message: string }

export const START_MARKER = '<!-- okf:index -->';
export const END_MARKER = '<!-- /okf:index -->';
export const RESERVED_FILES: ReadonlySet<string> = new Set(['index.md', 'log.md', 'AGENTS.md', 'README.md']);
export const CODEMAP_DIR = 'code-maps';
export const BLOB_RE = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/blob\/([^/\s]+)\/(\S+)$/;
export const INDEX_KEYS: ReadonlySet<string> = new Set(['title', 'sidebar_position']);
export const ROOT_INDEX_KEYS: ReadonlySet<string> = new Set(['title', 'sidebar_position', 'okf_version']);

export interface PageMeta { title: string; description: string; type: string; tags: string[]; resource: string | undefined; sources: string[]; sidebarPosition: number }
export interface PageNode { path: string; dir: string; data: Record<string, unknown> | null; meta: PageMeta | null; body: string }
export interface IndexNode { path: string; dir: string; text: string; head: string; pre: string; post: string; intro: string; data: Record<string, unknown> }
export interface BundleModel { dirs: string[]; pages: PageNode[]; indexes: Map<string, IndexNode>; problems: Problem[] }

export const basename = (p: string): string => p.slice(p.lastIndexOf('/') + 1);
export const dirname = (p: string): string => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');
export const join = (dir: string, name: string): string => (dir ? `${dir}/${name}` : name);

/** Resolve an href relative to a bundle directory, normalising ./ and ../ segments. */
export function resolveRelative(dir: string, href: string): string {
  const parts = (dir ? dir.split('/') : []);
  for (const seg of href.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop(); else parts.push(seg);
  }
  return parts.join('/');
}

export function isMarkdown(path: string): boolean { return path.endsWith('.md'); }
export function isInCodeMaps(path: string): boolean { return path === CODEMAP_DIR || path.startsWith(`${CODEMAP_DIR}/`); }
export function isConceptPage(path: string): boolean {
  return isMarkdown(path) && !RESERVED_FILES.has(basename(path)) && !isInCodeMaps(path) && !path.split('/').some((s) => s.startsWith('.'));
}

function str(v: unknown): string { return typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v); }

export function toPageMeta(data: Record<string, unknown>): PageMeta {
  const tags = Array.isArray(data['tags']) ? (data['tags'] as unknown[]).map(str) : [];
  const sources = Array.isArray(data['sources'])
    ? (data['sources'] as unknown[]).map((s) => (s && typeof s === 'object' ? str((s as Record<string, unknown>)['resource']) : '')).filter(Boolean)
    : [];
  const pos = typeof data['sidebar_position'] === 'number' ? data['sidebar_position'] : 999;
  return { title: str(data['title']), description: str(data['description']), type: str(data['type']), tags, resource: data['resource'] === undefined ? undefined : str(data['resource']), sources, sidebarPosition: pos };
}

/** Build the bundle model from an in-memory file map (bundle-relative POSIX paths). */
export function analyzeBundle(files: Record<string, string>): BundleModel {
  const problems: Problem[] = [];
  const dirSet = new Set<string>(['']);
  const pages: PageNode[] = [];
  for (const path of Object.keys(files).sort()) {
    if (!isMarkdown(path) || isInCodeMaps(path) || path.split('/').some((s) => s.startsWith('.'))) continue;
    // every ancestor of a markdown file is a doc folder that needs an index
    let d = dirname(path);
    while (d) { dirSet.add(d); d = dirname(d); }
    if (!isConceptPage(path)) continue;
    const { data, body } = parseFrontmatter(files[path]!);
    pages.push({ path, dir: dirname(path), data, meta: data ? toPageMeta(data) : null, body });
  }
  const dirs = [...dirSet].sort();
  const indexes = new Map<string, IndexNode>();
  for (const dir of dirs) {
    const path = join(dir, 'index.md');
    const text = files[path];
    if (text === undefined) { problems.push({ file: path, rule: 'missing-index', message: 'folder holds Markdown but has no index.md' }); continue; }
    const { data, body, head } = parseFrontmatter(text);
    const s = body.indexOf(START_MARKER);
    const e = body.indexOf(END_MARKER);
    const pre = s >= 0 ? body.slice(0, s) : body.replace(/\s*$/, '\n\n');
    const post = e >= 0 ? body.slice(e + END_MARKER.length) : '\n';
    const intro = (pre.trim().split(/\r?\n\s*\r?\n/)[0] ?? '').replace(/\s+/g, ' ');
    indexes.set(dir, { path, dir, text, head, pre, post, intro, data: data ?? {} });
  }
  return { dirs, pages, indexes, problems };
}
