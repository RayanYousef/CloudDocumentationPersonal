import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

/**
 * SSR shell for the in-browser docs editor.
 *
 * MDXEditor (@mdxeditor/editor) is strictly browser-only: it touches `window`
 * at import time, so a top-level import reachable by the static SSR build makes
 * `npm run build` fail ("window is not defined") and breaks the whole site.
 *
 * To stay SSR-safe, this page imports ONLY React, @theme/Layout and
 * @docusaurus/BrowserOnly at module scope. The real editor application is loaded
 * exclusively via require() inside the <BrowserOnly> render-prop, mirroring the
 * client-only pattern used by src/components/ModelViewer and FbxViewer.
 */
export default function EditorPage() {
  return (
    <Layout title="Docs Editor" noFooter>
      <BrowserOnly fallback={<div style={{padding: '2rem'}}>Loading editor…</div>}>
        {() => {
          const EditorApp = require('../components/editor/EditorApp').default;
          return <EditorApp />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
