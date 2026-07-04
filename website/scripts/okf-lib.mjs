// Shared helpers for the OKF (Open Knowledge Format) Node tooling.
// Walks the Docusaurus docs/ tree and parses concept files permissively.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Root of the knowledge bundle: the Docusaurus docs/ folder.
export const bundleRoot = path.resolve(__dirname, '../docs');

// Basenames that are structural, not concepts.
const SKIP_BASENAMES = new Set(['index.md', 'index.mdx', 'log.md']);

function isConceptFile(name) {
  if (SKIP_BASENAMES.has(name)) return false;
  return name.endsWith('.md') || name.endsWith('.mdx');
}

// Turn an absolute file path into a bundle-relative id: path relative to
// bundleRoot, extension stripped, backslashes normalised to '/'.
export function toId(absPath) {
  let rel = path.relative(bundleRoot, absPath);
  rel = rel.replace(/\\/g, '/');
  rel = rel.replace(/\.mdx?$/, '');
  return rel;
}

// Recursively collect concept files under bundleRoot.
// Returns [{ id, absPath, relDir, frontmatter, body }].
// Files that fail frontmatter parsing are skipped silently (permissive).
export function walkConcepts() {
  const out = [];

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile() && isConceptFile(entry.name)) {
        let raw;
        try {
          raw = fs.readFileSync(abs, 'utf8');
        } catch {
          continue;
        }
        let parsed;
        try {
          parsed = matter(raw);
        } catch {
          // Permissive consumption: skip unparseable files silently.
          continue;
        }
        const relDir = path.relative(bundleRoot, path.dirname(abs)).replace(/\\/g, '/');
        out.push({
          id: toId(abs),
          absPath: abs,
          relDir,
          frontmatter: parsed.data || {},
          body: parsed.content || '',
        });
      }
    }
  }

  walk(bundleRoot);
  return out;
}
