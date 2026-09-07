import type { ComponentsManifest, ComponentDescriptor } from '@platform/contracts';
import type { JsxComponentDescriptor } from '@mdxeditor/editor';
import type { ComponentType } from 'react';

export const DEFAULT_COMPONENTS: ComponentsManifest = {
  components: [
    { name: 'ModelViewer', kind: 'flow', hasChildren: false, preview: 'model-viewer', props: [{ name: 'src', type: 'string' }, { name: 'repo', type: 'string' }, { name: 'ref', type: 'string' }, { name: 'path', type: 'string' }, { name: 'alt', type: 'string' }, { name: 'height', type: 'number' }] },
    { name: 'FbxViewer', kind: 'flow', hasChildren: false, preview: 'fbx-viewer', props: [{ name: 'src', type: 'string' }, { name: 'repo', type: 'string' }, { name: 'ref', type: 'string' }, { name: 'path', type: 'string' }, { name: 'alt', type: 'string' }, { name: 'height', type: 'number' }] },
    { name: 'Tabs', kind: 'flow', hasChildren: true, preview: 'tabs', props: [{ name: 'groupId', type: 'string' }] },
    { name: 'TabItem', kind: 'flow', hasChildren: true, preview: 'tab-item', props: [{ name: 'value', type: 'string' }, { name: 'label', type: 'string' }, { name: 'default', type: 'boolean' }] },
  ],
};

export async function loadComponentsManifest(url: string, f: typeof fetch = globalThis.fetch.bind(globalThis)): Promise<ComponentsManifest> {
  try {
    const res = await f(url);
    if (!res.ok) return DEFAULT_COMPONENTS;
    const data = (await res.json()) as ComponentsManifest;
    return Array.isArray(data.components) && data.components.length ? data : DEFAULT_COMPONENTS;
  } catch { return DEFAULT_COMPONENTS; }
}

export type PreviewRegistry = Record<ComponentDescriptor['preview'], ComponentType<{ mdastNode: never; descriptor: JsxComponentDescriptor }>>;

/** Descriptors carry no `source`: the site registers these components globally, so no import lines are emitted. */
export function toJsxDescriptors(manifest: ComponentsManifest, previews: PreviewRegistry): JsxComponentDescriptor[] {
  return manifest.components.map((c) => ({
    name: c.name,
    kind: c.kind,
    props: c.props.map((p) => ({ name: p.name, type: p.type === 'number' ? 'number' : p.type === 'boolean' ? 'expression' : 'string' })),
    hasChildren: c.hasChildren,
    Editor: (previews[c.preview] ?? previews.generic) as JsxComponentDescriptor['Editor'],
  }));
}
