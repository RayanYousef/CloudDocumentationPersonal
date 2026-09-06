import type { BundleModel } from './model.js';

export interface ManifestEntry { route: string; file: string; title: string; description: string; type: string; tags: string[]; resource: string; sources: string[] }

export function buildManifest(model: BundleModel): ManifestEntry[] {
  return model.pages
    .filter((p) => p.meta)
    .map((p) => ({
      route: '/' + p.path.replace(/\.md$/, ''),
      file: p.path,
      title: p.meta!.title,
      description: p.meta!.description,
      type: p.meta!.type,
      tags: p.meta!.tags,
      resource: p.meta!.resource ?? '',
      sources: p.meta!.sources,
    }))
    .sort((a, b) => a.route.localeCompare(b.route));
}

export const renderManifest = (entries: ManifestEntry[]): string => JSON.stringify(entries, null, 2) + '\n';
