import { useEffect, useState } from 'react';
import { NestedLexicalEditor, useMdastNodeUpdater } from '@mdxeditor/editor';
import type { MdxJsxFlowElement, MdxJsxAttribute } from 'mdast-util-mdx-jsx';
import { ModelViewerCore, FbxViewerCore } from '@platform/viewers';
import { usePlatform } from '../PlatformContext.js';
import type { PreviewRegistry } from './componentsManifest.js';

type Node = MdxJsxFlowElement;
const readAttr = (n: Node, name: string): string | undefined => {
  const a = n.attributes.find((x): x is MdxJsxAttribute => x.type === 'mdxJsxAttribute' && x.name === name);
  if (!a || a.value == null) return a && a.value === null ? 'true' : undefined;
  return typeof a.value === 'string' ? a.value : a.value.value;
};
const strAttr = (name: string, value: string): MdxJsxAttribute => ({ type: 'mdxJsxAttribute', name, value });
const exprAttr = (name: string, expr: string): MdxJsxAttribute => ({ type: 'mdxJsxAttribute', name, value: { type: 'mdxJsxAttributeValueExpression', value: expr } });

const wrap: React.CSSProperties = { border: '1px dashed var(--ifm-color-emphasis-300)', borderRadius: 6, padding: '0.75rem', margin: '0.5rem 0' };
const row: React.CSSProperties = { display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' };

/** Resolves repo/ref/path to an object URL via the backend, or passes src through. */
function useViewerUrl(src: string | undefined, repo: string | undefined, ref: string | undefined, path: string | undefined): string | null {
  const { backend, platform } = usePlatform();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (src) { setUrl(src.startsWith('/') ? `${platform.config.baseUrl}${src.slice(1)}` : src); return undefined; }
    if (!repo || !path) { setUrl(null); return undefined; }
    let obj: string | null = null;
    const r = ref ?? platform.config.codeRepos.find((c) => `${c.owner}/${c.repo}` === repo)?.defaultRef ?? 'main';
    backend.getAsset({ repo, ref: r, path }).then((b) => { obj = URL.createObjectURL(b); setUrl(obj); }).catch(() => setUrl(null));
    return () => { if (obj) URL.revokeObjectURL(obj); };
  }, [src, repo, ref, path, backend, platform]);
  return url;
}

function ViewerEditor({ mdastNode, label, kind }: { mdastNode: Node; label: string; kind: 'model' | 'fbx' }) {
  const update = useMdastNodeUpdater();
  const v = { src: readAttr(mdastNode, 'src') ?? '', repo: readAttr(mdastNode, 'repo') ?? '', ref: readAttr(mdastNode, 'ref') ?? '', path: readAttr(mdastNode, 'path') ?? '', alt: readAttr(mdastNode, 'alt') ?? '', height: readAttr(mdastNode, 'height') ?? '480' };
  const commit = (next: Partial<typeof v>) => {
    const n = { ...v, ...next };
    const attributes: MdxJsxAttribute[] = [];
    for (const k of ['src', 'repo', 'ref', 'path', 'alt'] as const) if (n[k]) attributes.push(strAttr(k, n[k]));
    if (n.height && !Number.isNaN(Number(n.height))) attributes.push(exprAttr('height', String(Number(n.height))));
    update({ attributes });
  };
  const url = useViewerUrl(v.src || undefined, v.repo || undefined, v.ref || undefined, v.path || undefined);
  const h = Number(v.height) || 480;
  return (
    <div style={wrap} contentEditable={false}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      {(['src', 'repo', 'ref', 'path', 'alt', 'height'] as const).map((k) => (
        <div style={row} key={k}><span style={{ width: 64, fontFamily: 'monospace', fontSize: '0.8rem' }}>{k}</span><input value={v[k]} onChange={(e) => commit({ [k]: e.target.value })} /></div>
      ))}
      {url ? (kind === 'fbx' ? <FbxViewerCore src={url} height={h} /> : <ModelViewerCore src={url} alt={v.alt} height={h} />) : <div style={{ padding: '1rem', textAlign: 'center' }}>Set src, or repo + path, to preview.</div>}
    </div>
  );
}

function TabsEditor({ mdastNode }: { mdastNode: Node }) {
  return (
    <div style={{ ...wrap, borderStyle: 'solid' }}>
      <div contentEditable={false} style={{ fontSize: '0.75rem', fontWeight: 700 }}>Tabs{readAttr(mdastNode, 'groupId') ? ` (groupId="${readAttr(mdastNode, 'groupId')}")` : ''}</div>
      <NestedLexicalEditor<Node> block getContent={(n) => n.children} getUpdatedMdastNode={(n, children) => ({ ...n, children: children as Node['children'] })} />
    </div>
  );
}

function TabItemEditor({ mdastNode }: { mdastNode: Node }) {
  const update = useMdastNodeUpdater();
  const value = readAttr(mdastNode, 'value') ?? '';
  const label = readAttr(mdastNode, 'label') ?? '';
  const isDefault = mdastNode.attributes.some((a) => a.type === 'mdxJsxAttribute' && a.name === 'default');
  const commit = (next: { value?: string; label?: string; default?: boolean }) => {
    const attributes: MdxJsxAttribute[] = [strAttr('value', next.value ?? value), strAttr('label', next.label ?? label)];
    if (next.default ?? isDefault) attributes.push({ type: 'mdxJsxAttribute', name: 'default', value: null });
    update({ attributes });
  };
  return (
    <div style={wrap}>
      <div style={row} contentEditable={false}>
        <span>value</span><input value={value} onChange={(e) => commit({ value: e.target.value })} />
        <span>label</span><input value={label} onChange={(e) => commit({ label: e.target.value })} />
        <label><input type="checkbox" style={{ width: 'auto' }} checked={isDefault} onChange={(e) => commit({ default: e.target.checked })} /> default</label>
      </div>
      <NestedLexicalEditor<Node> block getContent={(n) => n.children} getUpdatedMdastNode={(n, children) => ({ ...n, children: children as Node['children'] })} />
    </div>
  );
}

function GenericEditor({ mdastNode }: { mdastNode: Node }) {
  return <div style={wrap} contentEditable={false}><code>&lt;{mdastNode.name} /&gt;</code> (edit its props in Raw mode)</div>;
}

export const previews: PreviewRegistry = {
  'model-viewer': (p) => <ViewerEditor mdastNode={p.mdastNode as unknown as Node} label="ModelViewer" kind="model" />,
  'fbx-viewer': (p) => <ViewerEditor mdastNode={p.mdastNode as unknown as Node} label="FbxViewer" kind="fbx" />,
  tabs: (p) => <TabsEditor mdastNode={p.mdastNode as unknown as Node} />,
  'tab-item': (p) => <TabItemEditor mdastNode={p.mdastNode as unknown as Node} />,
  generic: (p) => <GenericEditor mdastNode={p.mdastNode as unknown as Node} />,
};
