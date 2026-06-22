/**
 * Minimal, round-trip-safe YAML frontmatter handling for the docs editor.
 *
 * We deliberately do NOT use a full YAML library: the goal is that editing one
 * field (e.g. `title`) rewrites ONLY that field's line and leaves every other
 * line byte-identical. A full parse+serialize would reorder keys, drop comments,
 * normalize quoting, and otherwise churn the diff. So we do flat line surgery.
 *
 * Supported shape: a flat block of `key: value` pairs between the leading
 * `---` fences. Nested maps / multi-line block scalars are preserved verbatim
 * (passed through untouched) but are not exposed as editable `data` fields.
 */

// Leading BOM tolerated; CRLF or LF line endings tolerated.
const FRONTMATTER_RE = /^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Split a raw document into { frontmatterText, data, body }.
 * - frontmatterText: the inner YAML text (without the `---` fences), or '' if none.
 * - data: flat object of top-level scalar keys parsed from the frontmatter.
 * - body: everything after the closing fence (the markdown content).
 *
 * If there is no frontmatter block, frontmatterText='' , data={}, body=raw.
 */
export function splitFrontmatter(raw) {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    return {frontmatterText: '', data: {}, body: raw};
  }
  const frontmatterText = match[1];
  const body = raw.slice(match[0].length);
  return {
    frontmatterText,
    data: parseFlatYaml(frontmatterText),
    body,
  };
}

/**
 * Parse a flat block of `key: value` lines into an object.
 * Only top-level (non-indented) scalar keys are captured. Indented lines,
 * list items, comments and blanks are ignored for the purpose of `data`
 * (they remain in frontmatterText and are preserved by joinFrontmatter).
 */
export function parseFlatYaml(text) {
  const data = {};
  if (!text) return data;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    // top-level key only: starts at column 0, not a list item or comment
    const m = line.match(/^([A-Za-z0-9_][A-Za-z0-9_-]*):\s?(.*)$/);
    if (!m) continue;
    const key = m[1];
    data[key] = unquoteScalar(m[2]);
  }
  return data;
}

/**
 * Rebuild a full document from edited frontmatter values + body.
 *
 * `frontmatterText` is the ORIGINAL inner YAML; `updates` is an object of
 * key -> new value. For each key present in `updates`:
 *   - if the key already exists as a top-level line, that single line is
 *     rewritten in place (other lines untouched);
 *   - if it does not exist, a new `key: value` line is appended to the block.
 * Keys NOT in `updates` are left exactly as they were.
 *
 * When `updates` makes no actual change, the output is byte-identical to the
 * input round-trip (`joinFrontmatter(split.frontmatterText, {}, body)` ===
 * original document, given the original had standard `---\n…\n---\n` fences).
 *
 * If `frontmatterText` is '' and there are no updates, returns body unchanged
 * (no fences are invented for a doc that never had frontmatter).
 */
export function joinFrontmatter(frontmatterText, updates, body) {
  const keys = Object.keys(updates || {});

  if (!frontmatterText && keys.length === 0) {
    return body;
  }

  const lines = frontmatterText ? frontmatterText.split(/\r?\n/) : [];
  const seen = new Set();

  const rewritten = lines.map((line) => {
    const m = line.match(/^([A-Za-z0-9_][A-Za-z0-9_-]*):\s?(.*)$/);
    if (!m) return line; // preserve verbatim (indented, comment, blank, list)
    const key = m[1];
    if (!(key in updates)) return line;
    seen.add(key);
    return `${key}: ${formatScalar(updates[key])}`;
  });

  // Append any updated keys that were not already present.
  for (const key of keys) {
    if (!seen.has(key)) {
      rewritten.push(`${key}: ${formatScalar(updates[key])}`);
    }
  }

  const innerYaml = rewritten.join('\n');
  return `---\n${innerYaml}\n---\n${body}`;
}

// --- scalar helpers -------------------------------------------------------

/** Strip a single layer of matching surrounding quotes from a YAML scalar. */
function unquoteScalar(value) {
  const v = value.trim();
  if (v.length >= 2) {
    const first = v[0];
    const last = v[v.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      const inner = v.slice(1, -1);
      return first === '"' ? inner.replace(/\\"/g, '"') : inner.replace(/''/g, "'");
    }
  }
  return v;
}

/**
 * Format a JS value as a YAML scalar, quoting only when necessary to keep the
 * value safe/unambiguous (presence of `:` `#`, leading/trailing space, or
 * YAML-special bare words like true/false/null/numbers we want to stay strings).
 */
function formatScalar(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s === '') return '""';

  const needsQuote =
    /[:#]/.test(s) ||
    /^\s|\s$/.test(s) ||
    /^[>|&*!%@`'"[\]{},]/.test(s) ||
    /^(true|false|null|yes|no|on|off)$/i.test(s) ||
    /^-?\d+(\.\d+)?$/.test(s);

  if (!needsQuote) return s;
  // Double-quote and escape embedded double quotes.
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
