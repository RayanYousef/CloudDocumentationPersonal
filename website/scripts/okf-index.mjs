// okf-index.mjs — regenerate the BODY of index.md map files for the bundle
// root (docs/index.md) and every subfolder that directly contains concepts.
//
// Frontmatter fences are preserved byte-verbatim; only the body is rewritten.
// The output is deterministic, so running this twice produces zero diff.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { bundleRoot, walkConcepts } from './okf-lib.mjs';

// Leading frontmatter fence: '---\n' ... '\n---\n' (LF or CRLF), captured verbatim.
const FENCE_RE = /^(---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n)/;

function capitalize(s) {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Numeric sidebar_position (string or number); missing/invalid sorts last.
function posOf(fm) {
  const n = Number(fm && fm.sidebar_position);
  return Number.isFinite(n) ? n : Infinity;
}

// Read a folder's _category_.json position (for ordering subdirectories).
function categoryPosition(absDir) {
  try {
    const raw = fs.readFileSync(path.join(absDir, '_category_.json'), 'utf8');
    const n = Number(JSON.parse(raw).position);
    return Number.isFinite(n) ? n : Infinity;
  } catch {
    return Infinity;
  }
}

// Read an existing index's frontmatter (title/description), if any.
function readIndexFrontmatter(absDir) {
  for (const name of ['index.md', 'index.mdx']) {
    const p = path.join(absDir, name);
    if (fs.existsSync(p)) {
      try {
        return matter(fs.readFileSync(p, 'utf8')).data || {};
      } catch {
        return {};
      }
    }
  }
  return {};
}

// Escape characters that MDX would parse as JSX tags or expressions when a
// plain-text description is inlined into a markdown bullet. Rendered output is
// the literal character; keeps source descriptions clean plain text.
function mdxSafe(s) {
  return String(s).replace(/[<>{}]/g, (ch) => ({
    '<': '&lt;',
    '>': '&gt;',
    '{': '&#123;',
    '}': '&#125;',
  }[ch]));
}

function conceptLine(concept) {
  const fm = concept.frontmatter;
  const title = fm.title || path.basename(concept.absPath).replace(/\.mdx?$/, '');
  const link = path.basename(concept.absPath); // real extension, folder-relative
  const desc = fm.description ? ` - ${mdxSafe(fm.description)}` : '';
  return `* [${title}](${link})${desc}`;
}

// Write an index file: preserve existing fence verbatim, replace the body.
// If no index exists, synthesise minimal frontmatter.
function writeIndex(absDir, folderName, bodyLines) {
  const existingPath = ['index.md', 'index.mdx']
    .map((n) => path.join(absDir, n))
    .find((p) => fs.existsSync(p));

  let fence;
  if (existingPath) {
    const raw = fs.readFileSync(existingPath, 'utf8');
    const m = raw.match(FENCE_RE);
    if (m) {
      fence = m[1];
    } else {
      // Exists but no parseable fence: synthesise one.
      fence = `---\ntitle: ${capitalize(folderName)}\ndescription: Concepts in the ${capitalize(folderName)} section.\n---\n`;
    }
  } else {
    fence = `---\ntitle: ${capitalize(folderName)}\ndescription: Concepts in the ${capitalize(folderName)} section.\n---\n`;
  }

  const outPath = existingPath || path.join(absDir, 'index.md');
  // fence ends with a newline; a leading '' line yields the blank separator.
  const content = fence + ['', ...bodyLines].join('\n') + '\n';
  fs.writeFileSync(outPath, content, 'utf8');
  return outPath;
}

function main() {
  const concepts = walkConcepts();

  // Group concepts by their immediate directory (relDir; '' === root).
  const byDir = new Map();
  for (const c of concepts) {
    const dir = c.relDir || '';
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push(c);
  }

  const sortConcepts = (arr) =>
    arr.slice().sort((a, b) => {
      const pa = posOf(a.frontmatter);
      const pb = posOf(b.frontmatter);
      if (pa !== pb) return pa - pb;
      return path.basename(a.absPath).localeCompare(path.basename(b.absPath));
    });

  const written = [];

  // --- Subfolder indexes (folders that directly contain concepts) ---
  const subDirs = [...byDir.keys()].filter((d) => d !== '');
  for (const dir of subDirs) {
    const absDir = path.join(bundleRoot, dir);
    const folderName = dir.split('/').pop();
    const lines = ['# Concepts', ''];
    for (const c of sortConcepts(byDir.get(dir))) lines.push(conceptLine(c));
    written.push(writeIndex(absDir, folderName, lines));
  }

  // --- Root index (docs/index.md): Subdirectories + Concepts ---
  // Immediate top-level subfolders of root that contain concepts anywhere.
  const topSegments = new Set();
  for (const c of concepts) {
    if (c.relDir) topSegments.add(c.relDir.split('/')[0]);
  }
  const subOrder = [...topSegments].sort((a, b) => {
    const pa = categoryPosition(path.join(bundleRoot, a));
    const pb = categoryPosition(path.join(bundleRoot, b));
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b);
  });

  const rootLines = [];
  if (subOrder.length) {
    rootLines.push('# Subdirectories', '');
    for (const seg of subOrder) {
      const fm = readIndexFrontmatter(path.join(bundleRoot, seg));
      const title = fm.title || capitalize(seg);
      const desc = fm.description ? ` - ${mdxSafe(fm.description)}` : '';
      rootLines.push(`* [${title}](${seg}/index.md)${desc}`);
    }
    rootLines.push('');
  }
  rootLines.push('# Concepts', '');
  const rootConcepts = sortConcepts(byDir.get('') || []);
  for (const c of rootConcepts) rootLines.push(conceptLine(c));

  written.push(writeIndex(bundleRoot, 'Map', rootLines));

  console.log(JSON.stringify({ indexes: written.length, files: written }));
}

main();
