import { analyzeBundle, type Problem, type RepoRef } from './model.js';
import { validateBundle } from './validate.js';
import { renderIndexBlock, applyIndexBlock } from './index-block.js';
import { buildManifest, renderManifest, type ManifestEntry } from './manifest.js';
import { codeMapPath, renderCodeMap } from './codemap.js';

export interface GenerateOptions { codeRepos?: RepoRef[] }
export interface GenerateResult { problems: Problem[]; writes: Record<string, string>; manifest: ManifestEntry[] | null }

/** Compute every generated file. `writes` holds only files whose content would change. */
export function generateBundle(files: Record<string, string>, options: GenerateOptions = {}): GenerateResult {
  const model = analyzeBundle(files);
  const problems = validateBundle(model, files, options);
  const writes: Record<string, string> = {};
  for (const [dir, ix] of model.indexes) {
    const next = applyIndexBlock(ix, renderIndexBlock(model, dir));
    if (next !== ix.text) writes[ix.path] = next;
  }
  if (problems.length > 0) return { problems, writes, manifest: null };
  const manifest = buildManifest(model);
  const manifestText = renderManifest(manifest);
  if (files['manifest.json'] !== manifestText) writes['manifest.json'] = manifestText;
  for (const repo of options.codeRepos ?? []) {
    const path = codeMapPath(repo);
    const text = renderCodeMap(manifest, repo);
    if (files[path] !== text) writes[path] = text;
  }
  return { problems, writes, manifest };
}

/** Validation plus staleness: every file generate would change is a `stale` problem. */
export function checkBundle(files: Record<string, string>, options: GenerateOptions = {}): { problems: Problem[] } {
  const r = generateBundle(files, options);
  const stale: Problem[] = Object.keys(r.writes).map((file) => ({ file, rule: 'stale', message: 'generated content is stale (run okf generate)' }));
  return { problems: [...r.problems, ...stale] };
}
