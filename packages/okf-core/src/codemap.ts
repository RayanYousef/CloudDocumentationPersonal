import type { RepoRef } from './model.js';
import type { ManifestEntry } from './manifest.js';
export const codeMapPath = (r: RepoRef): string => `code-maps/${r.owner}--${r.repo}.md`;
export function renderCodeMap(_m: ManifestEntry[], _r: RepoRef): string { return ''; }
