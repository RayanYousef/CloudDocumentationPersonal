import { useEffect, useRef, useState, type CSSProperties } from 'react';

export const viewerBoxStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1rem', border: '1px solid var(--ifm-color-emphasis-300, #ccc)', borderRadius: 'var(--ifm-global-radius, 6px)' };

export interface ModelViewerCoreProps { src: string; alt?: string; height?: number }

/** Google <model-viewer> (glTF/GLB). The custom element is registered lazily so importing this module is side-effect free. */
export function ModelViewerCore({ src, alt = '3D model', height = 480 }: ModelViewerCoreProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { void import('@google/model-viewer').catch(() => setError(true)); }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const onError = () => setError(true);
    const onLoad = () => setError(false);
    el.addEventListener('error', onError);
    el.addEventListener('load', onLoad);
    return () => { el.removeEventListener('error', onError); el.removeEventListener('load', onLoad); };
  }, [src]);
  if (error) return <div style={{ height, ...viewerBoxStyle }}>Could not load 3D model: <code>{src}</code></div>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Tag = 'model-viewer' as any;
  return <Tag ref={ref} src={src} alt={alt} camera-controls="" auto-rotate="" shadow-intensity="1" style={{ width: '100%', height: `${height}px`, backgroundColor: 'var(--ifm-background-surface-color, #eee)', borderRadius: 'var(--ifm-global-radius, 6px)' }} />;
}
