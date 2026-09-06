import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { useAssetUrl } from '@site/src/platform/useAssetUrl';

export interface ViewerProps { src?: string; repo?: string; ref?: string; path?: string; alt?: string; height?: number }

const box = (height: number): React.CSSProperties => ({ height, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1rem', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: 'var(--ifm-global-radius)' });

/** Renders inside BrowserOnly: resolves src (static) or repo/ref/path (content backend) then mounts the core. */
function Resolved({ src, repo, ref, path, alt, height, kind }: ViewerProps & { kind: 'model' | 'fbx' }) {
  const h = height ?? 480;
  const asset = useAssetUrl(!src && repo && path ? { repo, ref, path } : null);
  const base = useBaseUrl(src ?? '/');
  const url = src ? base : asset.url;
  if (!src && (!repo || !path)) return <div style={box(h)}>ModelViewer needs either src or repo + path.</div>;
  if (!url) {
    if (asset.status === 'error') return <div style={box(h)}>Model unavailable: {asset.error} (private code repos need an editor session; see the Editor link).</div>;
    return <div style={box(h)}>Loading 3D model...</div>;
  }
  // require() inside BrowserOnly is the Docusaurus pattern that keeps WebGL code out of the SSR bundle.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ModelViewerCore, FbxViewerCore } = require('@platform/viewers') as typeof import('@platform/viewers');
  return kind === 'fbx' ? <FbxViewerCore src={url} height={h} /> : <ModelViewerCore src={url} alt={alt} height={h} />;
}

export function makeViewer(kind: 'model' | 'fbx') {
  return function Viewer(props: ViewerProps) {
    const h = props.height ?? 480;
    return <BrowserOnly fallback={<div style={box(h)}>Loading 3D viewer...</div>}>{() => <Resolved {...props} kind={kind} />}</BrowserOnly>;
  };
}

export default makeViewer('model');
