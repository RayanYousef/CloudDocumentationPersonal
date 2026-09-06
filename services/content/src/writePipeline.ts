import { ContentError, type CodeRepoRef } from '@platform/contracts';
import { generateBundle, parseFrontmatter, prependLogEntries, validatePage, isConceptPage, type LogEntry } from '@platform/okf-core';

export interface PageChange { path: string; text: string | null }
export interface ChangeSet { writes: Record<string, string>; deletes: string[]; regenerated: string[] }
export interface ChangeContext { codeRepos: CodeRepoRef[]; author: string; message: string; date: string }

const EMPTY_LOG = '---\ntitle: Change Log\nsidebar_position: 99\n---\n\nNewest first. Each entry names the page that changed and who changed it.\n';

/** FNV-1a 64-bit hex digest: a stable etag that works in browsers and Node without crypto. */
export function contentEtag(text: string): string {
  let h = 0xcbf29ce484222325n;
  for (const ch of new TextEncoder().encode(text)) { h ^= BigInt(ch); h = (h * 0x100000001b3n) & 0xffffffffffffffffn; }
  return h.toString(16).padStart(16, '0');
}

/** Apply page changes to a bundle, validate, regenerate, and log. Pure: returns what to write/delete. */
export function planPageChanges(files: Record<string, string>, changes: PageChange[], ctx: ChangeContext): ChangeSet {
  const next: Record<string, string> = { ...files };
  const entries: LogEntry[] = [];
  const writes: Record<string, string> = {};
  const deletes: string[] = [];
  for (const c of changes) {
    if (c.text === null) { delete next[c.path]; deletes.push(c.path); continue; }
    const action: LogEntry['action'] = files[c.path] === undefined ? 'Add' : 'Update';
    next[c.path] = c.text;
    writes[c.path] = c.text;
    if (isConceptPage(c.path)) {
      const title = String(parseFrontmatter(c.text).data?.['title'] ?? c.path);
      entries.push({ action, title, path: `/${c.path}`, summary: ctx.message, author: ctx.author });
    }
  }
  const problems = changes.flatMap((c) => (c.text !== null && isConceptPage(c.path) ? validatePage(c.path, c.text, { codeRepos: ctx.codeRepos, files: next }) : []));
  if (problems.length) throw new ContentError('VALIDATION', `Page has ${problems.length} problem(s)`, problems);
  const gen = generateBundle(next, { codeRepos: ctx.codeRepos });
  if (gen.problems.length) throw new ContentError('VALIDATION', `Bundle has ${gen.problems.length} problem(s) after this change`, gen.problems);
  const regenerated = Object.keys(gen.writes);
  Object.assign(writes, gen.writes);
  if (entries.length) {
    const log = prependLogEntries(next['log.md'] ?? EMPTY_LOG, ctx.date, entries);
    writes['log.md'] = log;
    regenerated.push('log.md');
  }
  return { writes, deletes, regenerated };
}
