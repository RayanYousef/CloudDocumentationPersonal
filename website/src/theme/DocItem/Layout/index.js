import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Layout from '@theme-original/DocItem/Layout';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import {usePluginData} from '@docusaurus/useGlobalData';
import OkfGraph from '@site/src/components/OkfGraph';
import styles from './styles.module.css';

/**
 * DocItem/Layout wrapper — adds a per-page "Viz" button that opens the current
 * folder's scoped OKF graph in a modal.
 *
 * Folder resolution (current docs only):
 *   - `useDoc().metadata.sourceDirName` is the doc's containing folder as a
 *     posix path relative to the version's docs dir (`"."` for the docs root).
 *     Normalized to `''` for root, it is exactly the key format the okf-graph
 *     plugin uses in its `folders` map.
 *   - `useDoc().metadata.version` gates versioned pages: the plugin scans ONLY
 *     current docs, so any non-`current` version (e.g. `1.0.0`) must never hit
 *     the lookup — a versioned `guide/` would otherwise collide with the
 *     current `guide/` key and show the wrong graph.
 *
 * When no graph exists for the folder (versioned pages, empty folders, plugin
 * data missing) the button renders disabled with a tooltip — never a broken
 * modal, never a crash. `usePluginData` is called WITHOUT `failfast`, so a
 * template fork that removed the plugin degrades to the disabled button.
 *
 * SSR safety: the modal only mounts after a click (client-only state) and
 * OkfGraph wraps cytoscape in BrowserOnly internally. The modal is rendered
 * inline (no portal) so it stays inside the doc page's ColorModeProvider,
 * which OkfGraph requires.
 */

const CURRENT_VERSION_NAME = 'current';

/** `sourceDirName` ('.', 'guide', 'a/b') -> okf-graph folder key ('' for root). */
function normalizeFolder(sourceDirName) {
  if (typeof sourceDirName !== 'string' || sourceDirName === '' || sourceDirName === '.') {
    return '';
  }
  return sourceDirName.replace(/^\.\//, '').replace(/\/+$/, '');
}

/** Human label for the folder: its index node's title, else humanized name. */
function folderLabel(folder, graph) {
  const indexRoute = folder === '' ? '/' : `/${folder}`;
  const nodes = graph && Array.isArray(graph.nodes) ? graph.nodes : [];
  const indexNode = nodes.find((n) => n && n.route === indexRoute);
  if (indexNode && typeof indexNode.title === 'string' && indexNode.title.trim()) {
    return indexNode.title.trim();
  }
  if (folder === '') {
    return 'Docs';
  }
  const base = folder.split('/').pop().replace(/[-_]+/g, ' ').trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : 'Docs';
}

function VizModal({title, ariaLabel, graph, onClose}) {
  const closeBtnRef = useRef(null);

  // Escape closes; body scroll is locked while open; close button gets focus.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (closeBtnRef.current) {
      closeBtnRef.current.focus();
    }
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const onBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <div className={styles.overlay} onClick={onBackdropClick}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={ariaLabel}>
        <div className={styles.dialogBar}>
          <button
            ref={closeBtnRef}
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close visualization"
          >
            &#215;
          </button>
        </div>
        <div className={styles.dialogBody}>
          <OkfGraph graph={graph} title={title} height="min(58vh, 480px)" />
        </div>
      </div>
    </div>
  );
}

function VizButton() {
  const {metadata} = useDoc();
  // No failfast: returns undefined instead of throwing if the plugin is absent.
  const pluginData = usePluginData('okf-graph');

  const isCurrentVersion = metadata.version === CURRENT_VERSION_NAME;
  const folder = normalizeFolder(metadata.sourceDirName);

  const graph = useMemo(() => {
    if (!isCurrentVersion || !pluginData || !pluginData.folders) {
      return null;
    }
    const scoped = pluginData.folders[folder];
    return scoped && Array.isArray(scoped.nodes) ? scoped : null;
  }, [isCurrentVersion, pluginData, folder]);

  const hasGraph = !!graph && graph.nodes.length > 0;

  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  const handleOpen = useCallback(() => {
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    // Return focus to the trigger so keyboard users are not stranded.
    if (triggerRef.current) {
      triggerRef.current.focus();
    }
  }, []);

  const label = hasGraph ? folderLabel(folder, graph) : null;
  const modalTitle = label ? `${label} — viz` : null;

  return (
    <>
      <div className={styles.vizRow}>
        <button
          ref={triggerRef}
          type="button"
          className={styles.vizBtn}
          onClick={hasGraph ? handleOpen : undefined}
          disabled={!hasGraph}
          title={hasGraph ? 'Visualize this section' : 'No viz available for this section'}
          aria-haspopup="dialog"
          aria-expanded={hasGraph ? open : undefined}
        >
          <svg
            className={styles.vizIcon}
            viewBox="0 0 16 16"
            width="14"
            height="14"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="4" cy="4" r="2.4" fill="currentColor" />
            <circle cx="12" cy="6" r="1.9" fill="currentColor" />
            <circle cx="7" cy="12.5" r="1.9" fill="currentColor" />
            <path
              d="M4 4 L12 6 M4 4 L7 12.5 M12 6 L7 12.5"
              stroke="currentColor"
              strokeWidth="1.1"
              fill="none"
            />
          </svg>
          Viz
        </button>
      </div>
      {open && hasGraph ? (
        <VizModal
          title={modalTitle}
          ariaLabel={modalTitle || 'Section visualization'}
          graph={graph}
          onClose={handleClose}
        />
      ) : null}
    </>
  );
}

export default function LayoutWrapper(props) {
  return (
    <>
      <VizButton />
      <Layout {...props} />
    </>
  );
}
