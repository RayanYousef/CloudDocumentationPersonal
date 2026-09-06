import { parseFrontmatter } from './frontmatter.js';
import { isConceptPage, type Problem } from './model.js';

export interface LogEntry { action: 'Add' | 'Update'; title: string; path: string; summary: string; author: string }
export interface CommitInfo { date: string; author: string; message: string; files: { path: string; status: 'A' | 'M' | 'D' | 'R' }[] }

const HEADING_RE = /^## (\d{4}-\d{2}-\d{2})\s*$/;
const BULLET_RE = /^\* \*\*(Add|Update)\*\*: \[[^\]]+\]\(\/[^)]+\) - .+ \(by .+\)$/;
const LOG_KEYS = new Set(['title', 'sidebar_position']);

export function formatLogEntry(e: LogEntry): string {
  const summary = /[.!?]$/.test(e.summary.trim()) ? e.summary.trim() : `${e.summary.trim()}.`;
  return `* **${e.action}**: [${e.title}](${e.path}) - ${summary} (by ${e.author})`;
}

export function prependLogEntries(logText: string, date: string, entries: LogEntry[]): string {
  if (entries.length === 0) return logText;
  const { head, body } = parseFrontmatter(logText);
  const lines = body.split('\n');
  const first = lines.findIndex((l) => HEADING_RE.test(l));
  const bullets = entries.map(formatLogEntry);
  if (first >= 0 && lines[first]!.match(HEADING_RE)![1] === date) {
    // same day: insert after the heading and its following blank line
    let at = first + 1;
    while (at < lines.length && lines[at]!.trim() === '') at++;
    lines.splice(at, 0, ...bullets);
    return head + lines.join('\n');
  }
  const section = [`## ${date}`, '', ...bullets, ''];
  if (first < 0) {
    const trimmed = body.replace(/\s*$/, '');
    return head + (trimmed ? `${trimmed}\n\n` : '') + section.join('\n') + '\n';
  }
  lines.splice(first, 0, ...section);
  return head + lines.join('\n');
}

export function validateLog(text: string): Problem[] {
  const out: Problem[] = [];
  const file = 'log.md';
  const { data, body } = parseFrontmatter(text);
  for (const k of Object.keys(data ?? {})) if (!LOG_KEYS.has(k)) out.push({ file, rule: 'log', message: `log.md has extra frontmatter key "${k}"` });
  let last: string | null = null;
  for (const line of body.split(/\r?\n/)) {
    if (line.startsWith('## ')) {
      const m = line.match(HEADING_RE);
      if (!m) { out.push({ file, rule: 'log', message: `heading is not "## YYYY-MM-DD": ${line}` }); continue; }
      if (last !== null && m[1]! >= last) out.push({ file, rule: 'log', message: `dates must be strictly descending (${m[1]} after ${last})` });
      last = m[1]!;
    } else if (line.startsWith('* ') && last !== null && !BULLET_RE.test(line)) {
      out.push({ file, rule: 'log', message: `bullet does not match "* **Add|Update**: [Title](/path.md) - what changed. (by Name)": ${line}` });
    }
  }
  return out;
}

export function logEntriesFromCommits(commits: CommitInfo[], titleOf: (path: string) => string | undefined): { date: string; entries: LogEntry[] }[] {
  const groups = new Map<string, LogEntry[]>();
  for (const c of commits) {
    for (const f of c.files) {
      if (!isConceptPage(f.path) || f.status === 'D') continue;
      const title = titleOf(f.path);
      if (!title) continue;
      const list = groups.get(c.date) ?? [];
      list.push({ action: f.status === 'A' ? 'Add' : 'Update', title, path: `/${f.path}`, summary: c.message.split('\n')[0]!, author: c.author });
      groups.set(c.date, list);
    }
  }
  return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([date, entries]) => ({ date, entries }));
}
