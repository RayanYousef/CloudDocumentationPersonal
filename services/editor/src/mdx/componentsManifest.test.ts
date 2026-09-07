import { describe, it, expect } from 'vitest';
import { loadComponentsManifest, DEFAULT_COMPONENTS, toJsxDescriptors } from './componentsManifest.js';

describe('components manifest', () => {
  it('falls back to defaults when the site does not publish one', async () => {
    const f: typeof fetch = async () => new Response(null, { status: 404 });
    expect(await loadComponentsManifest('http://x/platform/components.json', f)).toEqual(DEFAULT_COMPONENTS);
  });
  it('maps props and previews to MDXEditor descriptors without a source', () => {
    const d = toJsxDescriptors(DEFAULT_COMPONENTS, { 'model-viewer': () => null, 'fbx-viewer': () => null, tabs: () => null, 'tab-item': () => null, generic: () => null });
    const mv = d.find((x) => x.name === 'ModelViewer')!;
    expect(mv.source).toBeUndefined();
    expect(mv.props).toEqual(expect.arrayContaining([{ name: 'height', type: 'number' }, { name: 'repo', type: 'string' }]));
    expect(d.find((x) => x.name === 'Tabs')!.hasChildren).toBe(true);
  });
});
