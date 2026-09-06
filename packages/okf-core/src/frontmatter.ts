/** Minimal YAML subset (ported from okf-example/tools/okf-generate.js). Nested maps and multi-line scalars are skipped. */
function scalar(raw: string): unknown {
  const s = raw.trim();
  if (/^(["']).*\1$/.test(s)) return s.slice(1, -1);
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s !== '' && !Number.isNaN(Number(s))) return Number(s);
  return s;
}

export function parseYamlSubset(text: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  let listKey: string | null = null;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item && listKey) {
      const kv = item[1]!.match(/^([\w-]+):\s*(.*)$/);
      (data[listKey] as unknown[]).push(kv ? { [kv[1]!]: scalar(kv[2]!) } : scalar(item[1]!));
      continue;
    }
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1]!;
    const raw = kv[2]!;
    if (raw === '') { data[key] = []; listKey = key; continue; }
    listKey = null;
    data[key] = raw.startsWith('[') && raw.endsWith(']')
      ? raw.slice(1, -1).split(',').map(scalar).filter((v) => v !== '')
      : scalar(raw);
  }
  return data;
}

const FM_RE = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontmatter(text: string): { data: Record<string, unknown> | null; body: string; head: string } {
  const m = text.match(FM_RE);
  if (!m) return { data: null, body: text, head: '' };
  return { data: parseYamlSubset(m[1]!), body: text.slice(m[0].length), head: m[0] };
}
