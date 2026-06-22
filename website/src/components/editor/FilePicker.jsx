import React, {useEffect, useMemo, useState} from 'react';
import {listTree, DOCS_PREFIX} from './githubApi';

/**
 * Browser-only doc file picker.
 *
 * Lists every editable markdown file under the active version's `prefix`
 * (via listTree) and lets the user filter and pick one. Paths are shown
 * relative to that prefix for readability, but onSelect receives the FULL
 * repo-relative path (e.g. "website/docs/foo/bar.mdx") that the Contents API
 * needs. `version` is only used as a re-list trigger when the active version
 * changes.
 */
export default function FilePicker({pat, onSelect, selectedPath, prefix = DOCS_PREFIX, version}) {
  const [paths, setPaths] = useState(null); // null = loading
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    setPaths(null);
    setError('');
    listTree(pat, prefix)
      .then((list) => {
        if (!cancelled) setPaths(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to list files.');
      });
    return () => {
      cancelled = true;
    };
  }, [pat, prefix, version]);

  const filtered = useMemo(() => {
    if (!paths) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return paths;
    return paths.filter((p) => p.toLowerCase().includes(q));
  }, [paths, filter]);

  const rel = (p) => (p.startsWith(prefix) ? p.slice(prefix.length) : p);

  return (
    <div>
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter files…"
        style={{
          width: '100%',
          padding: '0.5rem 0.6rem',
          border: '1px solid var(--ifm-color-emphasis-300)',
          borderRadius: 'var(--ifm-global-radius)',
          marginBottom: '0.75rem',
        }}
      />

      {paths === null && !error && <p>Loading file list…</p>}
      {error && <p style={{color: 'var(--ifm-color-danger)'}}>{error}</p>}

      {paths && !error && (
        <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
          {filtered.map((p) => {
            const active = p === selectedPath;
            return (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => onSelect(p)}
                  title={p}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.35rem 0.5rem',
                    border: 'none',
                    borderRadius: 'var(--ifm-global-radius)',
                    cursor: 'pointer',
                    fontFamily: 'var(--ifm-font-family-monospace)',
                    fontSize: '0.85rem',
                    background: active
                      ? 'var(--ifm-color-primary-lightest)'
                      : 'transparent',
                    color: active
                      ? 'var(--ifm-color-primary-darkest)'
                      : 'inherit',
                  }}
                >
                  {rel(p)}
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li style={{color: 'var(--ifm-color-emphasis-600)'}}>
              No files match “{filter}”.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
