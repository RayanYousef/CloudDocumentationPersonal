// okf-graph.mjs — Node port of Google's OKF reference-agent generator.py.
//
// This is a derivative work of Google's OKF (Open Knowledge Format) reference
// agent viewer generator, which is licensed under the Apache License, Version
// 2.0. The vendored viewer templates and full attribution live in
// scripts/viz-template/NOTICE (and scripts/viz-template/LICENSE).
//
// Differences from the upstream Python reference:
//   - fixes bundle-absolute ('/foo/bar.md') link edge extraction, and
//   - adds .mdx support.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleRoot, walkConcepts, toId } from './okf-lib.mjs';
import siteConfig from '../site.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const TYPE_PALETTE = {
  Component: '#8b5cf6',
  Guide: '#3b82f6',
  Reference: '#10b981',
  Example: '#f59e0b',
  Workflow: '#ef4444',
  Configuration: '#ec4899',
};
const UNKNOWN_COLOR = '#94a3b8';

const LINK_RE = /\]\(([^)\s]+\.mdx?)(?:#[A-Za-z0-9_\-]*)?\)/g;

export function buildBundle() {
  const concepts = walkConcepts();

  // --- Nodes ---
  const nodes = [];
  const nodeIds = new Set();
  for (const c of concepts) {
    const fm = c.frontmatter;
    const type = fm.type || 'Unknown';
    const color = TYPE_PALETTE[type] || UNKNOWN_COLOR;
    const size = 30 + Math.min(60, Math.floor(c.body.length / 200));
    nodes.push({
      data: {
        id: c.id,
        label: fm.title || c.id,
        type,
        description: fm.description || '',
        resource: fm.resource || '',
        tags: fm.tags || [],
        color,
        size,
      },
    });
    nodeIds.add(c.id);
  }

  // --- Edges ---
  const edges = [];
  const seen = new Set();
  for (const c of concepts) {
    const sourceDir = path.dirname(c.absPath);
    LINK_RE.lastIndex = 0;
    let m;
    while ((m = LINK_RE.exec(c.body)) !== null) {
      const rawTarget = m[1];
      if (rawTarget.includes('://')) continue;

      let resolved;
      if (rawTarget.startsWith('/')) {
        // Bundle-absolute link: resolve against bundleRoot (fixes upstream bug
        // that dropped these). Strip the leading '/' first.
        resolved = path.resolve(bundleRoot, rawTarget.slice(1));
      } else {
        resolved = path.resolve(sourceDir, rawTarget);
      }

      // Drop if the resolved path escapes bundleRoot.
      const relToRoot = path.relative(bundleRoot, resolved);
      if (relToRoot.startsWith('..') || path.isAbsolute(relToRoot)) continue;

      const target = toId(resolved);
      if (!nodeIds.has(target)) continue; // target must be a real node
      if (target === c.id) continue; // drop self-links

      const key = c.id + '__' + target;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ data: { id: key, source: c.id, target } });
    }
  }

  // --- Bodies + types ---
  const bodies = {};
  for (const c of concepts) bodies[c.id] = c.body;

  const types = [...new Set(nodes.map((n) => n.data.type))].sort();

  return { nodes, edges, bodies, types, palette: TYPE_PALETTE };
}

function readTemplateFile(rel) {
  return fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
}

function inject(template, token, value) {
  // NEVER use String.prototype.replace with a plain string replacement:
  // minified JS/JSON contains '$&'-style sequences that .replace() mangles.
  return template.split(token).join(value);
}

export function render() {
  const bundle = buildBundle();
  const name = siteConfig.title;

  let html = readTemplateFile('viz-template/viz.html');
  const vizCss = readTemplateFile('viz-template/viz.css');
  const vizJs = readTemplateFile('viz-template/viz.js');
  const cytoscapeJs = fs.readFileSync(
    path.resolve(__dirname, '../node_modules/cytoscape/dist/cytoscape.min.js'),
    'utf8',
  );
  const markedJs = fs.readFileSync(
    path.resolve(__dirname, '../node_modules/marked/marked.min.js'),
    'utf8',
  );

  html = inject(html, '/*__CYTOSCAPE_JS__*/', cytoscapeJs);
  html = inject(html, '/*__MARKED_JS__*/', markedJs);
  html = inject(html, '/*__VIZ_CSS__*/', vizCss);
  html = inject(html, '/*__VIZ_JS__*/', vizJs);
  html = inject(html, '__BUNDLE_NAME__', JSON.stringify(name));
  html = inject(html, '__BUNDLE_DATA__', JSON.stringify(bundle));

  const outDir = path.resolve(__dirname, '../static/graph');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'viz.html');
  fs.writeFileSync(outPath, html, 'utf8');

  const summary = {
    concepts: bundle.nodes.length,
    edges: bundle.edges.length,
    bytes: Buffer.byteLength(html, 'utf8'),
  };
  console.log(JSON.stringify(summary));
  return summary;
}

render();
