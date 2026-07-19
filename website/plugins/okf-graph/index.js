// @ts-check
// ---------------------------------------------------------------------------
// okf-graph — build-time Docusaurus plugin that scans website/docs/ (current
// docs only, never versioned_docs/) and emits an OKF knowledge graph via
// setGlobalData. Clients read it with usePluginData('okf-graph').
//
// Global-data shape (pinned by the OKF template spec):
//   {
//     global:  { nodes: [...], edges: [...] },            // whole-site graph
//     folders: { '<docs-relative folder>': { nodes, edges } } // scoped graphs
//   }
//
// Node:  { id, route, title, type, tags: [], folder }
//   id     = docs-relative path without extension, posix separators
//   route  = site-root-relative route (no baseUrl; resolve via useBaseUrl)
//   folder = docs-relative folder ('' for docs root)
// Edge:  { source, target, kind: 'hierarchy' | 'link' }
//
// Resilience is a hard requirement: this plugin must NEVER throw or crash the
// build — broken frontmatter degrades to type 'unknown', unresolvable links
// are dropped, an empty/missing docs folder yields an empty graph.
// ---------------------------------------------------------------------------

'use strict';

const fs = require('fs');
const path = require('path');
const posix = path.posix;

const MD_EXTENSIONS = new Set(['.md', '.mdx', '.markdown']);

/** Convert a filesystem-relative path to posix separators. */
function toPosix(p) {
  return p.split(path.sep).join('/');
}

/** '' for root; posix parent folder otherwise. */
function parentFolder(folder) {
  if (folder === '') return null;
  const parent = posix.dirname(folder);
  return parent === '.' ? '' : parent;
}

/** Recursively list markdown files under dir, docs-relative posix paths. */
function listMarkdownFiles(docsDir) {
  const results = [];
  const walk = (absDir, relDir) => {
    let entries;
    try {
      entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch (e) {
      return; // unreadable dir — skip
    }
    for (const entry of entries) {
      // Docusaurus default exclude: underscore-prefixed files/folders are
      // partials, not pages. _category_.json is filtered by extension anyway.
      if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
      const absChild = path.join(absDir, entry.name);
      const relChild = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(absChild, relChild);
      } else if (entry.isFile()) {
        if (MD_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
          results.push(relChild);
        }
      }
    }
  };
  walk(docsDir, '');
  return results.sort();
}

/** Fallback frontmatter split used if @docusaurus/utils is unavailable. */
function naiveStripFrontMatter(fileContent) {
  const m = /^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(fileContent);
  return {
    frontMatter: {},
    content: m ? fileContent.slice(m[0].length) : fileContent,
  };
}

/** Humanized title from a file basename: 'markdown-basics' -> 'Markdown basics'. */
function titleFromFilename(baseName) {
  const words = baseName.replace(/[-_]+/g, ' ').trim();
  if (!words) return baseName;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** First ATX h1 in the markdown body, if any. */
function titleFromContent(content) {
  const m = /^#\s+(.+?)\s*#*\s*$/m.exec(content || '');
  return m ? m[1].trim() : null;
}

/** Is this basename a Docusaurus category-index name for its folder? */
function isCategoryIndexName(baseName, folder) {
  const lower = baseName.toLowerCase();
  if (lower === 'index' || lower === 'readme') return true;
  const folderName = folder === '' ? null : posix.basename(folder).toLowerCase();
  return folderName !== null && lower === folderName;
}

/**
 * Compute the doc's route (site-root-relative, no baseUrl) from its slug
 * frontmatter or its path, mirroring docs-plugin defaults with
 * routeBasePath '/'.
 */
function computeRoute({ frontMatter, folder, baseName }) {
  const rawSlug = frontMatter && typeof frontMatter.slug === 'string' ? frontMatter.slug.trim() : null;
  let route;
  if (rawSlug) {
    if (rawSlug === '/') {
      route = '/';
    } else if (rawSlug.startsWith('/')) {
      route = posix.normalize(rawSlug);
    } else {
      route = posix.normalize('/' + (folder ? `${folder}/` : '') + rawSlug);
    }
  } else if (isCategoryIndexName(baseName, folder)) {
    route = folder === '' ? '/' : `/${folder}`;
  } else {
    route = '/' + (folder ? `${folder}/` : '') + baseName;
  }
  if (route.length > 1 && route.endsWith('/')) route = route.slice(0, -1);
  return route;
}

/** Remove fenced code blocks and inline code spans so we don't harvest example links. */
function stripCode(content) {
  return (content || '')
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '')
    .replace(/`[^`\n]*`/g, '');
}

/**
 * Extract raw link targets from a markdown body: inline links/images
 * `[..](target)` and reference definitions `[ref]: target`.
 */
function extractLinkTargets(content) {
  const body = stripCode(content);
  const targets = [];
  const inline = /\[[^\]]*\]\(\s*<?([^)\s>]+)>?[^)]*\)/g;
  let m;
  while ((m = inline.exec(body)) !== null) targets.push(m[1]);
  const refDef = /^\s{0,3}\[[^\]]+\]:\s*<?(\S+?)>?\s*(?:".*")?\s*$/gm;
  while ((m = refDef.exec(body)) !== null) targets.push(m[1]);
  return targets;
}

/**
 * Resolve one raw link target to a node id, or null.
 * Silently drops externals, anchors-only links, and anything unresolvable.
 */
function resolveLinkTarget(rawTarget, sourceFolder, nodeById, indexIdByFolder, idByRoute) {
  let target = String(rawTarget).split('#')[0].split('?')[0].trim();
  if (!target) return null; // pure anchor or empty
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target) || target.startsWith('//')) return null; // external
  try {
    target = decodeURI(target);
  } catch (e) {
    /* keep raw */
  }

  const tryIds = (idNoExt) => {
    const clean = idNoExt.replace(/\/+$/, '');
    if (nodeById.has(clean)) return clean;
    if (indexIdByFolder.has(clean)) return indexIdByFolder.get(clean); // link to a folder
    return null;
  };
  const stripExt = (p) => p.replace(/\.(mdx?|markdown)$/i, '');

  if (target.startsWith('/')) {
    // Site-root-absolute link: match by route, then by docs-relative id.
    const route = target.length > 1 ? target.replace(/\/+$/, '') : '/';
    if (idByRoute.has(route)) return idByRoute.get(route);
    return tryIds(stripExt(route.replace(/^\/+/, '')));
  }

  // Relative link, resolved against the source doc's folder.
  const joined = posix.normalize(posix.join(sourceFolder || '.', target));
  if (joined.startsWith('..')) return null; // escapes docs/
  return tryIds(stripExt(joined === '.' ? '' : joined));
}

/** Build {nodes, edges} plus per-folder index bookkeeping from the docs dir. */
async function buildGraph(docsDir, logger) {
  const nodes = [];
  const nodeById = new Map();
  /** folder -> node id of its category index */
  const indexIdByFolder = new Map();
  /** node id -> raw markdown body (for link extraction pass) */
  const bodyById = new Map();
  const allFolders = new Set(['']);

  let parseFrontMatterFn = null;
  try {
    // Installed @docusaurus/utils (3.10.x) exposes the gray-matter based
    // parser as DEFAULT_PARSE_FRONT_MATTER({fileContent, filePath}).
    const utils = require('@docusaurus/utils');
    if (typeof utils.parseFrontMatter === 'function') {
      parseFrontMatterFn = (fileContent, filePath) => utils.parseFrontMatter(fileContent);
    } else if (typeof utils.DEFAULT_PARSE_FRONT_MATTER === 'function') {
      parseFrontMatterFn = (fileContent, filePath) =>
        utils.DEFAULT_PARSE_FRONT_MATTER({ fileContent, filePath });
    }
  } catch (e) {
    logger(`okf-graph: @docusaurus/utils unavailable, using naive frontmatter parser (${e.message})`);
  }

  const files = fs.existsSync(docsDir) ? listMarkdownFiles(docsDir) : [];

  for (const relFile of files) {
    try {
      const absFile = path.join(docsDir, ...relFile.split('/'));
      const fileContent = fs.readFileSync(absFile, 'utf8');

      let frontMatter = {};
      let content = fileContent;
      try {
        const parsed = parseFrontMatterFn
          ? await parseFrontMatterFn(fileContent, absFile)
          : naiveStripFrontMatter(fileContent);
        frontMatter = (parsed && parsed.frontMatter) || {};
        content = (parsed && typeof parsed.content === 'string') ? parsed.content : fileContent;
      } catch (e) {
        // Broken frontmatter: degrade, never fail.
        const naive = naiveStripFrontMatter(fileContent);
        frontMatter = {};
        content = naive.content;
        logger(`okf-graph: broken frontmatter in ${relFile}, using defaults (${e.message})`);
      }

      const ext = path.extname(relFile);
      const id = relFile.slice(0, -ext.length);
      const dirName = posix.dirname(id);
      const folder = dirName === '.' ? '' : dirName;
      const baseName = posix.basename(id);

      // Register this folder and all its ancestors.
      for (let f = folder; f !== null; f = parentFolder(f)) allFolders.add(f);

      const title =
        (typeof frontMatter.title === 'string' && frontMatter.title.trim()) ||
        titleFromContent(content) ||
        titleFromFilename(baseName);
      const type = typeof frontMatter.type === 'string' && frontMatter.type.trim() ? frontMatter.type.trim() : 'unknown';
      const tags = Array.isArray(frontMatter.tags)
        ? frontMatter.tags.filter((t) => typeof t === 'string' || typeof t === 'number').map(String)
        : [];
      const route = computeRoute({ frontMatter, folder, baseName });

      const node = { id, route, title, type, tags, folder };
      nodes.push(node);
      nodeById.set(id, node);
      bodyById.set(id, content);

      if (isCategoryIndexName(baseName, folder) && !indexIdByFolder.has(folder)) {
        indexIdByFolder.set(folder, id);
      }
    } catch (e) {
      logger(`okf-graph: skipping unreadable doc ${relFile} (${e.message})`);
    }
  }

  // Fallback folder indexes: a doc whose route IS the folder route (e.g. the
  // current intro.mdx with `slug: /`) acts as that folder's index when no
  // conventionally named index file exists.
  for (const node of nodes) {
    if (indexIdByFolder.has(node.folder)) continue;
    const folderRoute = node.folder === '' ? '/' : `/${node.folder}`;
    if (node.route === folderRoute) indexIdByFolder.set(node.folder, node.id);
  }

  const edges = [];
  const edgeKeys = new Set();
  const addEdge = (source, target, kind) => {
    if (!source || !target || source === target) return;
    if (!nodeById.has(source) || !nodeById.has(target)) return;
    const key = `${source} ${target} ${kind}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ source, target, kind });
  };

  // Hierarchy edges: folder index -> docs in the folder + child-folder indexes.
  for (const [folder, indexId] of indexIdByFolder) {
    for (const node of nodes) {
      if (node.folder === folder && node.id !== indexId) addEdge(indexId, node.id, 'hierarchy');
    }
    for (const [childFolder, childIndexId] of indexIdByFolder) {
      if (childFolder !== folder && parentFolder(childFolder) === folder) {
        addEdge(indexId, childIndexId, 'hierarchy');
      }
    }
  }

  // Link edges: actual markdown links between docs.
  const idByRoute = new Map();
  for (const node of nodes) {
    if (!idByRoute.has(node.route)) idByRoute.set(node.route, node.id);
  }
  for (const node of nodes) {
    const targets = extractLinkTargets(bodyById.get(node.id));
    for (const raw of targets) {
      try {
        const targetId = resolveLinkTarget(raw, node.folder, nodeById, indexIdByFolder, idByRoute);
        if (targetId) addEdge(node.id, targetId, 'link');
      } catch (e) {
        /* unresolvable links are silently dropped */
      }
    }
  }

  return { nodes, edges, allFolders, indexIdByFolder };
}

/**
 * Scoped graph for one folder: its own nodes, plus its direct child folders'
 * index nodes (so the scoped view shows where the subtrees continue), and
 * every edge whose endpoints are both inside that set.
 */
function scopeGraph(folder, nodes, edges, indexIdByFolder) {
  const ids = new Set();
  for (const node of nodes) {
    if (node.folder === folder) ids.add(node.id);
  }
  for (const [childFolder, childIndexId] of indexIdByFolder) {
    if (childFolder !== folder && parentFolder(childFolder) === folder) ids.add(childIndexId);
  }
  return {
    nodes: nodes.filter((n) => ids.has(n.id)),
    edges: edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
  };
}

const EMPTY_GRAPH = () => ({ nodes: [], edges: [] });

/** @type {import('@docusaurus/types').PluginModule} */
module.exports = function okfGraphPlugin(context, options) {
  const docsDir = path.join(context.siteDir, 'docs');
  // eslint-disable-next-line no-console
  const logger = (msg) => console.warn(msg);

  return {
    name: 'okf-graph',

    async loadContent() {
      try {
        const { nodes, edges, allFolders, indexIdByFolder } = await buildGraph(docsDir, logger);
        const folders = {};
        for (const folder of [...allFolders].sort()) {
          folders[folder] = scopeGraph(folder, nodes, edges, indexIdByFolder);
        }
        return { global: { nodes, edges }, folders };
      } catch (e) {
        // Hard guarantee: never crash the build.
        logger(`okf-graph: graph generation failed, emitting empty graph (${e && e.message})`);
        return { global: EMPTY_GRAPH(), folders: { '': EMPTY_GRAPH() } };
      }
    },

    async contentLoaded({ content, actions }) {
      try {
        actions.setGlobalData(content || { global: EMPTY_GRAPH(), folders: { '': EMPTY_GRAPH() } });
      } catch (e) {
        logger(`okf-graph: setGlobalData failed (${e && e.message})`);
      }
    },

    getPathsToWatch() {
      return [`${toPosix(docsDir)}/**/*.{md,mdx,markdown}`];
    },
  };
};
