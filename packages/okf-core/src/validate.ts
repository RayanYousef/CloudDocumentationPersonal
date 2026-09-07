import { validateLog } from './log.js';
import { parseFrontmatter } from './frontmatter.js';
import {
  BLOB_RE, INDEX_KEYS, ROOT_INDEX_KEYS, type BundleModel, type Problem, type RepoRef,
  dirname, resolveRelative, toPageMeta,
} from './model.js';

export interface ValidateOptions { codeRepos?: RepoRef[] }

const LINK_RE = /\[[^\]]*\]\(([^)\s]+)\)/g;

function checkResource(file: string, url: string | undefined, label: string, repos: RepoRef[] | undefined, out: Problem[]): void {
  if (!url) { out.push({ file, rule: 'resource', message: `missing "${label}"` }); return; }
  const m = url.match(BLOB_RE);
  if (!m) { out.push({ file, rule: 'resource', message: `${label} is not a GitHub blob URL: ${url}` }); return; }
  if (repos && repos.length > 0 && !repos.some((r) => r.owner === m[1] && r.repo === m[2])) {
    out.push({ file, rule: 'undeclared-repo', message: `${label} points at ${m[1]}/${m[2]}, which is not a declared code repo` });
  }
}

/** Does `target` (bundle-relative) exist as a file, or as a folder (any file below it)? */
function exists(files: Record<string, string>, target: string): boolean {
  if (target === '' ) return true;
  if (files[target] !== undefined) return true;
  const prefix = `${target}/`;
  return Object.keys(files).some((k) => k.startsWith(prefix));
}

export function checkLinks(file: string, body: string, files: Record<string, string>, out: Problem[]): void {
  for (const m of body.matchAll(LINK_RE)) {
    const href = m[1]!;
    if (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(href)) continue;
    const target = resolveRelative(dirname(file), decodeURI(href.split('#')[0]!));
    if (!exists(files, target)) out.push({ file, rule: 'link', message: `broken link -> ${href}` });
  }
}

/** Validate one concept page. Links are only checked when `files` is supplied. */
export function validatePage(path: string, text: string, options: ValidateOptions & { files?: Record<string, string> } = {}): Problem[] {
  const out: Problem[] = [];
  const { data, body } = parseFrontmatter(text);
  if (!data) { out.push({ file: path, rule: 'frontmatter', message: 'missing frontmatter' }); return out; }
  const meta = toPageMeta(data);
  for (const k of ['title', 'description', 'type'] as const) {
    if (!meta[k]) out.push({ file: path, rule: 'frontmatter', message: `missing "${k}"` });
  }
  checkResource(path, meta.resource, 'resource', options.codeRepos, out);
  for (const s of meta.sources) checkResource(path, s, 'sources[].resource', options.codeRepos, out);
  if (options.files) checkLinks(path, body, options.files, out);
  return out;
}

export function validateBundle(model: BundleModel, files: Record<string, string>, options: ValidateOptions = {}): Problem[] {
  const out: Problem[] = [...model.problems];
  for (const page of model.pages) out.push(...validatePage(page.path, files[page.path]!, { ...options, files }));
  for (const [dir, ix] of model.indexes) {
    const allowed = dir === '' ? ROOT_INDEX_KEYS : INDEX_KEYS;
    for (const k of Object.keys(ix.data)) {
      if (!allowed.has(k)) out.push({ file: ix.path, rule: 'index-frontmatter', message: `index.md has extra frontmatter key "${k}"` });
    }
    if (!ix.data['title']) out.push({ file: ix.path, rule: 'index-frontmatter', message: 'index.md missing "title"' });
    if (dir === '' && ix.data['okf_version'] !== '0.2' && ix.data['okf_version'] !== 0.2) {
      out.push({ file: ix.path, rule: 'index-frontmatter', message: 'root index.md must declare okf_version: "0.2"' });
    }
    checkLinks(ix.path, ix.pre + ix.post, files, out);
  }
  if (files['log.md'] !== undefined) out.push(...validateLog(files['log.md']));
  return out;
}
