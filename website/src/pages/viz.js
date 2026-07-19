import React from 'react';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {usePluginData} from '@docusaurus/useGlobalData';
import OkfGraph from '@site/src/components/OkfGraph';

/**
 * Full-site knowledge-graph page (route: /viz).
 *
 * Follows the SSR shell pattern of src/pages/editor.js: this module imports
 * only SSR-safe things at top level. OkfGraph itself is SSR-safe — it loads
 * cytoscape exclusively via require() inside <BrowserOnly> — and it needs a
 * ColorModeProvider ancestor, which <Layout> provides.
 *
 * Graph data comes from the build-time `okf-graph` plugin
 * (website/plugins/okf-graph/) via usePluginData; `global` is the whole-site
 * graph. OkfGraph renders a friendly empty state if the data is missing.
 *
 * Site identity (title) is derived from the Docusaurus context, which in turn
 * derives from website/site.config.js — nothing is hardcoded here.
 */
export default function VizPage() {
  const {siteConfig} = useDocusaurusContext();
  const pluginData = usePluginData('okf-graph');
  const globalGraph =
    pluginData && pluginData.global ? pluginData.global : null;

  return (
    <Layout
      title="Viz"
      description={`Interactive knowledge graph of the ${siteConfig.title} site — every doc, its hierarchy, and its cross-links.`}>
      <main
        style={{
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          padding: '2rem 1rem 3rem',
          color: 'var(--text)',
        }}>
        <h1 className="hero__title" style={{marginBottom: '0.5rem'}}>
          Knowledge graph
        </h1>
        <p
          style={{
            maxWidth: '72ch',
            marginBottom: '1.5rem',
            color: 'var(--text)',
          }}>
          Every doc on this site as one interactive map: solid edges trace the
          folder hierarchy, dashed edges are cross-links between pages, and
          each node&apos;s color and shape encode its OKF type. Click a node to
          open that page.
        </p>
        <OkfGraph
          graph={globalGraph}
          title="Documentation graph"
          height="70vh"
        />
      </main>
    </Layout>
  );
}
