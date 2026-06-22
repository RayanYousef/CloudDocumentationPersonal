import React, {useCallback, useRef, useState} from 'react';
import TokenGate from './TokenGate';
import FilePicker from './FilePicker';
import BodyEditor from './editorClient';
import {getFile, putFile, OWNER, REPO, DOCS_PREFIX} from './githubApi';
import {splitFrontmatter, joinFrontmatter} from './frontmatter';
import styles from './editor.module.css';

/**
 * Client-only docs editor application.
 *
 * Reached ONLY through require() inside the <BrowserOnly> render-prop in
 * src/pages/editor.js, so the static SSR build never imports this module (or the
 * browser-only @mdxeditor/editor it pulls in via editorClient). Top-level imports
 * of browser-only deps are therefore safe here.
 *
 * Flow: TokenGate (PAT) -> FilePicker -> load file (getFile + splitFrontmatter)
 * -> edit. Two editing modes:
 *   - WYSIWYG: a small frontmatter form + the MDXEditor body surface (with the
 *     Insert-Image / Insert-3D-Model toolbar buttons).
 *   - Raw MDX: a single <textarea> over the WHOLE file (frontmatter + body) for
 *     anything the visual editor cannot represent. This is also the automatic
 *     fallback target if MDXEditor fails to parse a file.
 * Save recombines + commits via putFile with the current sha.
 */

const FRONTMATTER_FIELDS = ['title', 'sidebar_position', 'description', 'slug'];

export default function EditorApp() {
  const [pat, setPat] = useState(null);

  // currently loaded file state
  const [path, setPath] = useState(null);
  const [sha, setSha] = useState(null);
  const [frontmatterText, setFrontmatterText] = useState('');
  const [fmFields, setFmFields] = useState({}); // editable subset
  const [body, setBody] = useState('');

  // MDXEditor imperative handle (getMarkdown/setMarkdown) for the WYSIWYG body.
  const mdxRef = useRef(null);

  // Editing mode + the single source of truth for raw mode (the WHOLE file).
  const [mode, setMode] = useState('wysiwyg'); // 'wysiwyg' | 'raw'
  const [rawText, setRawText] = useState('');
  // True when we were forced into raw mode by a parse error (vs user toggle).
  const [forcedRaw, setForcedRaw] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [commitUrl, setCommitUrl] = useState('');

  const onAuthed = useCallback((token) => {
    setPat(token);
  }, []);

  const loadFile = useCallback(
    async (selectedPath) => {
      setError('');
      setCommitUrl('');
      setLoading(true);
      setMode('wysiwyg');
      setForcedRaw(false);
      try {
        const {text, sha: blobSha} = await getFile(pat, selectedPath);
        const {frontmatterText: fmText, data, body: docBody} =
          splitFrontmatter(text);

        const fields = {};
        FRONTMATTER_FIELDS.forEach((k) => {
          if (k in data) fields[k] = data[k];
        });

        setPath(selectedPath);
        setSha(blobSha);
        setFrontmatterText(fmText);
        setFmFields(fields);
        setBody(docBody);
        setRawText(text); // full-file raw, ready if we switch/fall back to raw mode
        setMessage(`Update ${selectedPath.slice(DOCS_PREFIX.length)}`);
      } catch (err) {
        setError(err.message || 'Failed to load file.');
        setPath(null);
      } finally {
        setLoading(false);
      }
    },
    [pat],
  );

  /**
   * Compose the full file text from whichever mode is active.
   * - raw mode: rawText IS the whole file, committed as-is.
   * - wysiwyg : frontmatter form values + current MDXEditor markdown.
   */
  const composeFullText = useCallback(() => {
    if (mode === 'raw') {
      return rawText;
    }
    const updates = {};
    Object.keys(fmFields).forEach((k) => {
      updates[k] = fmFields[k];
    });
    const currentBody = mdxRef.current ? mdxRef.current.getMarkdown() : body;
    return joinFrontmatter(frontmatterText, updates, currentBody);
  }, [mode, rawText, fmFields, frontmatterText, body]);

  // Switch WYSIWYG -> Raw: snapshot the current document into rawText so the
  // textarea is the single source of truth from here on.
  const switchToRaw = useCallback(() => {
    setRawText(composeFullText());
    setForcedRaw(false);
    setMode('raw');
  }, [composeFullText]);

  // Switch Raw -> WYSIWYG: re-split the raw text back into frontmatter + body so
  // the form and the visual editor reflect the user's raw edits.
  const switchToWysiwyg = useCallback(() => {
    const {frontmatterText: fmText, data, body: docBody} =
      splitFrontmatter(rawText);
    const fields = {};
    FRONTMATTER_FIELDS.forEach((k) => {
      if (k in data) fields[k] = data[k];
    });
    setFrontmatterText(fmText);
    setFmFields(fields);
    setBody(docBody);
    setForcedRaw(false);
    setMode('wysiwyg');
  }, [rawText]);

  const save = useCallback(async () => {
    if (!path) return;
    setSaving(true);
    setError('');
    setCommitUrl('');
    try {
      const recombined = composeFullText();
      const res = await putFile(pat, {
        path,
        text: recombined,
        sha,
        message: message || `Update ${path}`,
      });
      // Advance the sha so a subsequent save does not 409 against ourselves.
      if (res && res.content && res.content.sha) setSha(res.content.sha);
      const url = (res && res.commit && res.commit.html_url) || '';
      setCommitUrl(url);
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }, [pat, path, sha, message, composeFullText]);

  if (!pat) {
    return <TokenGate onAuthed={onAuthed} />;
  }

  const relPath = path ? path.slice(DOCS_PREFIX.length) : '';

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <h2 className={styles.sidebarHeading}>
          {OWNER}/{REPO}
        </h2>
        <FilePicker pat={pat} onSelect={loadFile} selectedPath={path} />
      </aside>

      <main className={styles.main}>
        {!path && !loading && <p>Select a file to start editing.</p>}
        {loading && <p>Loading file…</p>}

        {path && !loading && (
          <>
            <h1 className={styles.pathHeading}>{relPath}</h1>

            {/* Mode toggle */}
            <div className={styles.modeBar}>
              <button
                type="button"
                className={`button button--sm ${
                  mode === 'wysiwyg' ? 'button--primary' : 'button--secondary button--outline'
                }`}
                onClick={switchToWysiwyg}
                disabled={mode === 'wysiwyg'}
              >
                Visual
              </button>
              <button
                type="button"
                className={`button button--sm ${
                  mode === 'raw' ? 'button--primary' : 'button--secondary button--outline'
                }`}
                onClick={switchToRaw}
                disabled={mode === 'raw'}
              >
                Raw MDX
              </button>
            </div>

            {mode === 'raw' ? (
              <>
                {forcedRaw && (
                  <div className={styles.notice}>
                    This file could not be opened in the visual editor (unsupported
                    MDX syntax). Editing the raw file instead. You can switch back
                    to <strong>Visual</strong> once the syntax is valid.
                  </div>
                )}
                <label className={styles.label}>Raw file (frontmatter + body)</label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  spellCheck={false}
                  className={`${styles.textarea} ${styles.rawTextarea}`}
                />
              </>
            ) : (
              <>
                {/* Frontmatter form (only fields that exist in the file) */}
                {Object.keys(fmFields).length > 0 && (
                  <section className={styles.section}>
                    <h3 style={{marginTop: 0}}>Frontmatter</h3>
                    {Object.keys(fmFields).map((key) => (
                      <label key={key} className={styles.fmRow}>
                        <span className={styles.fmKey}>{key}</span>
                        <input
                          type="text"
                          value={fmFields[key]}
                          onChange={(e) =>
                            setFmFields((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          className={styles.input}
                        />
                      </label>
                    ))}
                  </section>
                )}

                <label className={styles.label}>Body</label>
                <div className={styles.editorFrame}>
                  <BodyEditor
                    key={path}
                    editorRef={mdxRef}
                    markdown={body}
                    pat={pat}
                    fileLabel={relPath}
                    onError={(payload) => {
                      // Parse/render failure: snapshot the full file into raw mode
                      // so the user is never locked out.
                      // eslint-disable-next-line no-console
                      console.error('MDXEditor parse error', payload);
                      setRawText(joinFrontmatter(frontmatterText, fmFields, body));
                      setForcedRaw(true);
                      setMode('raw');
                    }}
                  />
                </div>
              </>
            )}

            {/* Commit controls */}
            <div style={{marginTop: '1rem'}}>
              <label className={styles.label}>Commit message</label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={styles.commitInput}
              />
              <button
                type="button"
                className="button button--primary"
                onClick={save}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save & commit'}
              </button>
            </div>

            {error && <p className={styles.error}>{error}</p>}
            {commitUrl && (
              <p className={styles.success}>
                Committed.{' '}
                <a href={commitUrl} target="_blank" rel="noreferrer">
                  View commit on GitHub
                </a>
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
