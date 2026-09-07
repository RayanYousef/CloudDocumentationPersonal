import { create, insert, search, save, load } from '@orama/orama';
import type { SearchHit } from '@platform/contracts';
import { analyzeBundle } from '@platform/okf-core';

const schema = { path: 'string', title: 'string', description: 'string', type: 'string', tags: 'string', body: 'string' } as const;

/** Build a serialisable Orama index over every concept page (frontmatter + first 2000 body chars). */
export async function buildSearchIndex(files: Record<string, string>): Promise<unknown> {
  const db = create({ schema });
  for (const p of analyzeBundle(files).pages) {
    if (!p.meta) continue;
    await insert(db, { path: p.path, title: p.meta.title, description: p.meta.description, type: p.meta.type, tags: p.meta.tags.join(' '), body: p.body.slice(0, 2000) });
  }
  return save(db);
}

export async function searchRaw(raw: unknown, query: string): Promise<SearchHit[]> {
  const db = create({ schema });
  load(db, raw as Parameters<typeof load>[1]);
  const res = await search(db, { term: query, properties: ['title', 'description', 'tags', 'body'], limit: 20 });
  return res.hits.map((h) => ({ path: h.document.path, title: h.document.title, description: h.document.description, score: h.score }));
}
