import React from 'react';

// Shared styling + fallback for the SSR-safe 3D viewers (ModelViewer, FbxViewer).
// Both render their WebGL element only inside <BrowserOnly>; these are the bits
// that were copied verbatim between the two components — the placeholder box
// style and the loading fallback shown during SSR / before hydration.

export const boxStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '1rem',
  border: '1px solid var(--ifm-color-emphasis-300)',
  borderRadius: 'var(--ifm-global-radius)',
};

// <BrowserOnly> fallback element. Needs `height` (a prop), so it's a factory.
export const viewerFallback = (height) => (
  <div style={{height, ...boxStyle}}>Loading 3D viewer…</div>
);
