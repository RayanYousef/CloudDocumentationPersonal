import React, {useEffect, useRef, useState} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useBaseUrl from '@docusaurus/useBaseUrl';

const boxStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '1rem',
  border: '1px solid var(--ifm-color-emphasis-300)',
  borderRadius: 'var(--ifm-global-radius)',
};

// Inner component: rendered ONLY inside <BrowserOnly>, so hooks and the custom
// element run client-side only. Surfaces load errors instead of a blank box.
function Viewer({src, alt, height, style, ...rest}) {
  const ref = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    // <model-viewer> dispatches a CustomEvent('error'); React's onError won't map to it.
    const onError = () => setError(true);
    const onLoad = () => setError(false);
    el.addEventListener('error', onError);
    el.addEventListener('load', onLoad);
    return () => {
      el.removeEventListener('error', onError);
      el.removeEventListener('load', onLoad);
    };
  }, [src]);

  if (error) {
    return (
      <div style={{height, ...boxStyle}}>
        ⚠️ Could not load 3D model: <code>{src}</code>
      </div>
    );
  }

  return (
    <model-viewer
      ref={ref}
      src={src}
      alt={alt}
      camera-controls=""
      auto-rotate=""
      shadow-intensity="1"
      style={{
        width: '100%',
        height: `${height}px`,
        backgroundColor: 'var(--ifm-background-surface-color)',
        borderRadius: 'var(--ifm-global-radius)',
        ...style,
      }}
      {...rest}
    />
  );
}

/**
 * SSR-safe wrapper around Google's <model-viewer> web component.
 *
 * - <model-viewer> is browser-only (WebGL); importing it on Node crashes the
 *   static build ("window is not defined"). So it is loaded via require() inside
 *   <BrowserOnly> (the maintainer-verified pattern) — never a top-level import.
 * - `src` is resolved through useBaseUrl() because <model-viewer> is a raw custom
 *   element: Docusaurus does NOT prepend baseUrl to its attributes the way it does
 *   for <Link>/<img>. Without this, "/models/x.glb" 404s on GitHub Pages (which
 *   serves under /CloudDocumentationPersonal/). Authors keep writing "/models/x.glb".
 *
 *   <ModelViewer src="/models/cube.gltf" alt="A cube" />
 */
export default function ModelViewer({
  src,
  alt = '3D model',
  height = 480,
  style,
  ...rest
}) {
  const resolvedSrc = useBaseUrl(src);
  return (
    <BrowserOnly
      fallback={<div style={{height, ...boxStyle}}>Loading 3D viewer…</div>}
    >
      {() => {
        // Browser-only side effect: registers the <model-viewer> custom element.
        require('@google/model-viewer');
        return (
          <Viewer src={resolvedSrc} alt={alt} height={height} style={style} {...rest} />
        );
      }}
    </BrowserOnly>
  );
}
