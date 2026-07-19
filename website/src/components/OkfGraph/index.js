import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import {useColorMode} from '@docusaurus/theme-common';
import {useHistory} from '@docusaurus/router';
import styles from './styles.module.css';

/**
 * OkfGraph — reusable, SSR-safe interactive graph of OKF docs data.
 *
 * Props:
 *   graph:  { nodes: [{id, route, title, type, tags, folder}],
 *             edges: [{source, target, kind: 'hierarchy' | 'link'}] }
 *           May be null/undefined/empty — renders a friendly empty state.
 *   title:  optional heading shown above the graph.
 *   height: optional canvas height (number of px, or any CSS length string).
 *
 * SSR safety: cytoscape touches `window`/`document` and would crash the
 * Docusaurus static build if imported at module scope. It is loaded ONLY via
 * require() inside <BrowserOnly>, mirroring src/pages/editor.js and
 * src/components/ModelViewer. Do not convert it to a top-level import.
 *
 * Theming: node/edge colors are declared once as CSS custom properties in
 * styles.module.css (light + dark). The canvas cannot read CSS variables, so
 * the palette is resolved with getComputedStyle() and re-applied to the
 * cytoscape instance whenever `useColorMode` reports a theme flip. Hard-coded
 * hex values below are only fallbacks for exotic embedding contexts.
 *
 * Accessibility: color is never the only type encoding — each OKF type also
 * gets a distinct node shape, every node is labeled with its title, and a
 * legend maps color+shape to type. (The arcade palette is pinned by the design
 * spec; two of its accents are close in hue, so the shape channel is load-
 * bearing, not decorative.)
 */

const TYPE_ORDER = ['index', 'guide', 'example', 'log', 'note'];
const KNOWN_TYPES = new Set(TYPE_ORDER);

const TYPE_SHAPES = {
  index: 'star',
  guide: 'ellipse',
  example: 'round-rectangle',
  log: 'diamond',
  note: 'triangle',
  unknown: 'octagon',
};

// Fallbacks only — the real values live in styles.module.css and are read at
// runtime with getComputedStyle so they always match the site theme.
const FALLBACK_PALETTES = {
  light: {
    index: '#6357C9',
    guide: '#5C88D8',
    example: '#217770',
    log: '#D9A441',
    note: '#A8433A',
    unknown: '#66708A',
    edgeHierarchy: '#A9B1C7',
    edgeLink: '#217770',
    ink: '#131B3F',
    halo: '#EFE7D2',
  },
  dark: {
    index: '#8F8AE8',
    guide: '#5C88D8',
    example: '#43C8BE',
    log: '#D9A441',
    note: '#D96C5F',
    unknown: '#8B93AD',
    edgeHierarchy: '#3A4570',
    edgeLink: '#43C8BE',
    ink: '#F4EEDF',
    halo: '#131B3F',
  },
};

/** Sanitize arbitrary graph input into cytoscape elements. Never throws. */
function toElements(graph) {
  const rawNodes = Array.isArray(graph && graph.nodes) ? graph.nodes : [];
  const rawEdges = Array.isArray(graph && graph.edges) ? graph.edges : [];
  const seen = new Set();
  const elements = [];

  rawNodes.forEach((n) => {
    if (!n || typeof n.id !== 'string' || n.id === '' || seen.has(n.id)) {
      return;
    }
    seen.add(n.id);
    elements.push({
      data: {
        id: n.id,
        label: typeof n.title === 'string' && n.title !== '' ? n.title : n.id,
        okfType:
          typeof n.type === 'string' && KNOWN_TYPES.has(n.type)
            ? n.type
            : 'unknown',
        route: typeof n.route === 'string' && n.route !== '' ? n.route : null,
        tags: Array.isArray(n.tags)
          ? n.tags.filter((t) => typeof t === 'string' && t !== '')
          : [],
        folder: typeof n.folder === 'string' ? n.folder : '',
      },
    });
  });

  rawEdges.forEach((e, i) => {
    if (
      !e ||
      typeof e.source !== 'string' ||
      typeof e.target !== 'string' ||
      !seen.has(e.source) ||
      !seen.has(e.target) ||
      e.source === e.target
    ) {
      return;
    }
    elements.push({
      data: {
        id: `okf-edge-${i}`,
        source: e.source,
        target: e.target,
        kind: e.kind === 'link' ? 'link' : 'hierarchy',
      },
    });
  });

  return elements;
}

/** Resolve the themed palette from CSS custom properties on the component. */
function resolvePalette(el, colorMode) {
  const fallback =
    FALLBACK_PALETTES[colorMode === 'dark' ? 'dark' : 'light'];
  let cs = null;
  try {
    cs = el && typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
  } catch (err) {
    cs = null;
  }
  const read = (name, fb) => {
    const v = cs ? cs.getPropertyValue(name).trim() : '';
    return v || fb;
  };
  return {
    types: {
      index: read('--okf-viz-index', fallback.index),
      guide: read('--okf-viz-guide', fallback.guide),
      example: read('--okf-viz-example', fallback.example),
      log: read('--okf-viz-log', fallback.log),
      note: read('--okf-viz-note', fallback.note),
      unknown: read('--okf-viz-unknown', fallback.unknown),
    },
    edgeHierarchy: read('--okf-viz-edge-hierarchy', fallback.edgeHierarchy),
    edgeLink: read('--okf-viz-edge-link', fallback.edgeLink),
    ink: read('--okf-viz-label', fallback.ink),
    halo: read('--okf-viz-halo', fallback.halo),
    fontFamily:
      (cs && cs.fontFamily) ||
      'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  };
}

function buildStylesheet(palette) {
  const typeStyles = TYPE_ORDER.concat('unknown').map((type) => ({
    selector: `node[okfType = "${type}"]`,
    style: {
      'background-color': palette.types[type] || palette.types.unknown,
      shape: TYPE_SHAPES[type] || TYPE_SHAPES.unknown,
    },
  }));

  return [
    {
      selector: 'node',
      style: {
        width: 26,
        height: 26,
        'background-color': palette.types.unknown,
        shape: TYPE_SHAPES.unknown,
        'border-width': 1.5,
        'border-color': palette.ink,
        'border-opacity': 0.35,
        label: 'data(label)',
        color: palette.ink,
        'font-size': 10,
        'font-family': palette.fontFamily,
        'min-zoomed-font-size': 7,
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 7,
        'text-wrap': 'wrap',
        'text-max-width': '110px',
        'text-outline-color': palette.halo,
        'text-outline-width': 2,
        'text-outline-opacity': 0.9,
      },
    },
    ...typeStyles,
    // Folder indexes are the hubs of the hierarchy — render them larger.
    {
      selector: 'node[okfType = "index"]',
      style: {width: 34, height: 34},
    },
    {
      selector: 'node.okf-hover',
      style: {
        'border-width': 2.5,
        'border-opacity': 1,
        'border-color': palette.ink,
      },
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 3.5,
        'border-opacity': 1,
        'border-color': palette.ink,
      },
    },
    {
      selector: 'edge',
      style: {
        'curve-style': 'bezier',
        width: 1.5,
        'target-arrow-shape': 'none',
      },
    },
    // Hierarchy (folder index → child): solid, muted, recessive.
    {
      selector: 'edge[kind = "hierarchy"]',
      style: {
        'line-style': 'solid',
        'line-color': palette.edgeHierarchy,
      },
    },
    // Cross-link (markdown link between docs): dashed, accent-colored, arrowed.
    {
      selector: 'edge[kind = "link"]',
      style: {
        'line-style': 'dashed',
        'line-dash-pattern': [6, 3],
        'line-color': palette.edgeLink,
        'target-arrow-shape': 'triangle',
        'target-arrow-color': palette.edgeLink,
        'arrow-scale': 0.8,
      },
    },
    {
      selector: '.okf-hidden',
      style: {display: 'none'},
    },
  ];
}

/**
 * Layout choice: `cose` (force-directed, built into cytoscape core — no extra
 * dependency). OKF graphs mix tree-like hierarchy edges with arbitrary
 * cross-links, so they contain cycles; `breadthfirst` assumes a near-tree and
 * degrades badly there, while cose gives a readable organic layout for the
 * small graphs (a docs folder or a whole small site) this renders.
 * Edge-less graphs get a tidy grid instead — cose would just scatter them.
 */
function buildLayout(elements) {
  const hasEdges = elements.some((el) => el.data && el.data.source);
  if (!hasEdges) {
    return {name: 'grid', fit: true, padding: 30, avoidOverlap: true};
  }
  return {
    name: 'cose',
    animate: false,
    fit: true,
    padding: 30,
    randomize: true,
    nodeDimensionsIncludeLabels: true,
  };
}

/** Inner canvas — rendered ONLY inside <BrowserOnly>. */
function GraphCanvas({cytoscape, elements, activeTags, onNavigate, heightCss, graphLabel}) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const {colorMode} = useColorMode();

  // Keep latest values readable from stable event handlers without re-init.
  const colorModeRef = useRef(colorMode);
  colorModeRef.current = colorMode;
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;

  // (Re)create the instance when the data changes.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }
    const cy = cytoscape({
      container,
      elements,
      style: buildStylesheet(resolvePalette(container, colorModeRef.current)),
      layout: buildLayout(elements),
      minZoom: 0.2,
      maxZoom: 4,
    });

    cy.on('tap', 'node', (evt) => {
      const route = evt.target.data('route');
      if (route) {
        onNavigateRef.current(route);
      }
    });
    cy.on('mouseover', 'node', (evt) => {
      evt.target.addClass('okf-hover');
      container.style.cursor = 'pointer';
    });
    cy.on('mouseout', 'node', (evt) => {
      evt.target.removeClass('okf-hover');
      container.style.cursor = '';
    });

    // Modals/tabs can mount this at 0 width; refit once real size arrives.
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      let lastWidth = container.clientWidth;
      ro = new ResizeObserver(() => {
        if (!cyRef.current) {
          return;
        }
        cy.resize();
        if (lastWidth === 0 && container.clientWidth > 0) {
          cy.fit(cy.nodes().not('.okf-hidden'), 30);
        }
        lastWidth = container.clientWidth;
      });
      ro.observe(container);
    }

    cyRef.current = cy;
    return () => {
      if (ro) {
        ro.disconnect();
      }
      cyRef.current = null;
      cy.destroy();
    };
  }, [cytoscape, elements]);

  // Restyle in place when the color mode flips (positions are preserved).
  useEffect(() => {
    const cy = cyRef.current;
    const container = containerRef.current;
    if (!cy || !container) {
      return;
    }
    cy.style().fromJson(buildStylesheet(resolvePalette(container, colorMode))).update();
  }, [colorMode]);

  // Apply the tag filter; hiding a node hides its incident edges too.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }
    cy.batch(() => {
      cy.nodes().forEach((node) => {
        const tags = node.data('tags') || [];
        const visible =
          activeTags.length === 0 || tags.some((t) => activeTags.includes(t));
        node.toggleClass('okf-hidden', !visible);
      });
    });
    const visible = cy.nodes().not('.okf-hidden');
    if (visible.length > 0) {
      cy.fit(visible, 30);
    }
  }, [activeTags, elements]);

  const handleReset = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }
    const visible = cy.nodes().not('.okf-hidden');
    if (visible.length > 0) {
      cy.fit(visible, 30);
    }
  }, []);

  return (
    <div className={styles.canvasWrap}>
      <div
        ref={containerRef}
        className={styles.canvas}
        style={{height: heightCss}}
        role="application"
        aria-label={graphLabel}
      />
      <button type="button" className={styles.resetBtn} onClick={handleReset}>
        Reset view
      </button>
    </div>
  );
}

const SWATCH_CLASS_KEYS = {
  index: 'swatchIndex',
  guide: 'swatchGuide',
  example: 'swatchExample',
  log: 'swatchLog',
  note: 'swatchNote',
  unknown: 'swatchUnknown',
};

export default function OkfGraph({graph, title, height = 480}) {
  const elements = useMemo(() => toElements(graph), [graph]);

  const nodeCount = useMemo(
    () => elements.filter((el) => el.data && !el.data.source).length,
    [elements],
  );

  const typesPresent = useMemo(() => {
    const present = new Set(
      elements
        .filter((el) => el.data && !el.data.source)
        .map((el) => el.data.okfType),
    );
    return TYPE_ORDER.concat('unknown').filter((t) => present.has(t));
  }, [elements]);

  const edgeKindsPresent = useMemo(() => {
    const kinds = new Set(
      elements
        .filter((el) => el.data && el.data.source)
        .map((el) => el.data.kind),
    );
    return kinds;
  }, [elements]);

  const allTags = useMemo(() => {
    const tags = new Set();
    elements.forEach((el) => {
      if (el.data && !el.data.source) {
        el.data.tags.forEach((t) => tags.add(t));
      }
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [elements]);

  const [activeTags, setActiveTags] = useState([]);

  const toggleTag = useCallback((tag) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const clearTags = useCallback(() => setActiveTags([]), []);

  const history = useHistory();
  const {withBaseUrl} = useBaseUrlUtils();
  const baseRoot = withBaseUrl('/');
  const handleNavigate = useCallback(
    (route) => {
      // Routes normally arrive baseUrl-free (e.g. "/guide/editing") and are
      // resolved through useBaseUrl; if a producer already included the
      // baseUrl, don't double-prefix it.
      const target = route.startsWith(baseRoot) ? route : withBaseUrl(route);
      history.push(target);
    },
    [history, withBaseUrl, baseRoot],
  );

  const heightCss = typeof height === 'number' ? `${height}px` : height;
  const graphLabel = title || 'Documentation graph';

  if (nodeCount === 0) {
    return (
      <section className={styles.root} aria-label={graphLabel}>
        {title ? <div className={styles.title}>{title}</div> : null}
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Nothing to visualize yet</p>
          <p className={styles.emptyHint}>
            No graph data is available for this view.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.root} aria-label={graphLabel}>
      <div className={styles.header}>
        {title ? <div className={styles.title}>{title}</div> : null}
        <div className={styles.legend}>
          {typesPresent.map((type) => (
            <span key={type} className={styles.legendItem}>
              <span
                className={`${styles.swatch} ${styles[SWATCH_CLASS_KEYS[type]]}`}
                aria-hidden="true"
              />
              {type}
            </span>
          ))}
          {edgeKindsPresent.has('hierarchy') ? (
            <span className={styles.legendItem}>
              <span className={styles.edgeSolid} aria-hidden="true" />
              hierarchy
            </span>
          ) : null}
          {edgeKindsPresent.has('link') ? (
            <span className={styles.legendItem}>
              <span className={styles.edgeDashed} aria-hidden="true" />
              cross-link
            </span>
          ) : null}
        </div>
        {allTags.length > 0 ? (
          <div className={styles.toolbar}>
            <span className={styles.filterLabel}>Filter by tag</span>
            {allTags.map((tag) => {
              const active = activeTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                  aria-pressed={active}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              );
            })}
            {activeTags.length > 0 ? (
              <button
                type="button"
                className={`${styles.chip} ${styles.chipClear}`}
                onClick={clearTags}
              >
                Clear
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <BrowserOnly
        fallback={
          <div className={styles.loading} style={{height: heightCss}}>
            Loading graph…
          </div>
        }
      >
        {() => {
          // Browser-only: cytoscape touches window/document at import time.
          const req = require('cytoscape');
          const cytoscape = req.default || req;
          return (
            <GraphCanvas
              cytoscape={cytoscape}
              elements={elements}
              activeTags={activeTags}
              onNavigate={handleNavigate}
              heightCss={heightCss}
              graphLabel={graphLabel}
            />
          );
        }}
      </BrowserOnly>
    </section>
  );
}
