import { parseDocument, Document } from 'yaml';

export interface FrontmatterFields { title: string; description: string; type: string; tags: string[]; resource: string; sidebar_position: number | null }

const FENCE = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function splitDocument(text: string): { head: string; body: string; hasFrontmatter: boolean } {
  const m = text.match(FENCE);
  if (!m) return { head: '', body: text, hasFrontmatter: false };
  return { head: m[1]!, body: text.slice(m[0].length), hasFrontmatter: true };
}

const str = (v: unknown): string => (v === undefined || v === null ? '' : String(v));

export function readFields(head: string): FrontmatterFields {
  const doc = parseDocument(head || '{}');
  const get = (k: string): unknown => doc.get(k, true) instanceof Object && 'toJSON' in (doc.get(k, true) as object) ? (doc.get(k, true) as { toJSON(): unknown }).toJSON() : doc.get(k);
  const tags = get('tags');
  const pos = get('sidebar_position');
  return {
    title: str(get('title')), description: str(get('description')), type: str(get('type')),
    tags: Array.isArray(tags) ? tags.map(str) : [], resource: str(get('resource')),
    sidebar_position: typeof pos === 'number' ? pos : pos === undefined || pos === null || pos === '' ? null : Number(pos),
  };
}

/** Rewrite only the given keys; untouched lines, comments, quoting and scalar types survive. */
export function applyFields(text: string, fields: Partial<FrontmatterFields>): string {
  const { head, body, hasFrontmatter } = splitDocument(text);
  const doc: Document = hasFrontmatter ? parseDocument(head) : new Document({});
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    if (v === null || (Array.isArray(v) && v.length === 0 && k === 'tags' && !doc.has(k))) { if (doc.has(k)) doc.delete(k); continue; }
    doc.set(k, v);
  }
  const yaml = doc.toString().replace(/\n$/, '');
  return `---\n${yaml}\n---\n${body}`;
}
