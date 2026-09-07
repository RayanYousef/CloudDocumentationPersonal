import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import { ContentError, CURRENT_VERSION, type ComponentsManifest, type Identity, type PageSummary, type Session, type VersionInfo } from '@platform/contracts';
import { validatePage, type Problem } from '@platform/okf-core';
import type { Platform } from './composition/createPlatform.js';
import { PlatformContext } from './PlatformContext.js';
import { BrowserSessionStore } from './session/SessionStore.js';
import { LoginGate } from './components/LoginGate.js';
import { FilePicker } from './components/FilePicker.js';
import { FrontmatterForm } from './components/FrontmatterForm.js';
import { BodyEditor } from './components/BodyEditor.js';
import { ProblemList } from './components/ProblemList.js';
import { NewPageDialog } from './components/NewPageDialog.js';
import { PublishDialog } from './components/PublishDialog.js';
import { FolderIntroEditor } from './components/FolderIntroEditor.js';
import { splitDocument, readFields, applyFields, type FrontmatterFields } from './frontmatter/yamlDoc.js';
import { loadComponentsManifest, DEFAULT_COMPONENTS } from './mdx/componentsManifest.js';

const store = new BrowserSessionStore(typeof localStorage === 'undefined' ? null : localStorage);
const authorOf = (id: Identity) => ({ name: id.name, email: id.email ?? `${id.login}@users.noreply.github.com` });
export const DISCARD_PROMPT = 'You have unsaved changes. Discard them?';

export function App({ platform }: { platform: Platform }) {
  const [session, setSession] = useState<Session | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [checking, setChecking] = useState(true);
  const [loginNotice, setLoginNotice] = useState('');
  const backend = useMemo(() => platform.backend(session), [platform, session]);

  // Re-verify a stored session on mount; tell the user why they are back at the sign-in screen if it no longer works.
  useEffect(() => {
    const stored = store.load();
    if (!stored) { setChecking(false); return; }
    platform.auth.verify(stored)
      .then((id) => { setSession(stored); setIdentity(id); })
      .catch((e: Error) => { store.clear(); setLoginNotice(`Your saved session is no longer valid and was forgotten. ${e.message}`); })
      .finally(() => setChecking(false));
  }, [platform]);

  const [components, setComponents] = useState<ComponentsManifest>(DEFAULT_COMPONENTS);
  useEffect(() => { void loadComponentsManifest(platform.componentsUrl).then(setComponents); }, [platform]);

  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [version, setVersion] = useState(CURRENT_VERSION);
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [etag, setEtag] = useState('');
  const [fields, setFields] = useState<FrontmatterFields | null>(null);
  const [mode, setMode] = useState<'visual' | 'raw'>('visual');
  const [rawText, setRawText] = useState('');
  const [message, setMessage] = useState('');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string; url?: string | null } | null>(null);
  const [dialog, setDialog] = useState<'new' | 'publish' | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const mdx = useRef<MDXEditorMethods>(null);
  const frozen = versions.find((v) => v.id === version)?.frozen ?? false;
  const isIndex = selected?.endsWith('index.md') ?? false;

  // Unsaved edits: the browser asks before the tab is closed or reloaded.
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);
  const confirmDiscard = useCallback(() => !dirty || window.confirm(DISCARD_PROMPT), [dirty]);

  const refresh = useCallback(async () => {
    if (!identity) return;
    const [vs, ps] = await Promise.all([backend.listVersions(), backend.listPages(version)]);
    setVersions(vs); setPages(ps);
  }, [backend, identity, version]);
  useEffect(() => { void refresh().catch((e: Error) => setStatus({ kind: 'error', text: e.message })); }, [refresh]);

  const folders = useMemo(() => [...new Set(['', ...pages.map((p) => p.path.split('/').slice(0, -1)).flatMap((segs) => segs.map((_, i) => segs.slice(0, i + 1).join('/')))])].sort(), [pages]);
  const typesInUse = useMemo(() => [...new Set(pages.map((p) => p.type).filter(Boolean))].sort(), [pages]);

  /** Opens a page; asks before discarding unsaved edits unless the caller already did (`force`). */
  const open = useCallback(async (path: string, opts: { force?: boolean } = {}) => {
    if (!opts.force && !confirmDiscard()) return;
    setStatus(null); setProblems([]);
    try {
      const page = await backend.readPage(version, path);
      setSelected(path); setText(page.text); setEtag(page.etag); setRawText(page.text);
      setFields(path.endsWith('index.md') ? null : readFields(splitDocument(page.text).head));
      setMode('visual'); setMessage(`Update ${path}`); setDirty(false);
    } catch (e) { setStatus({ kind: 'error', text: (e as Error).message }); }
  }, [backend, version, confirmDiscard]);

  const compose = useCallback((): string => {
    if (mode === 'raw') return rawText;
    const body = mdx.current?.getMarkdown() ?? splitDocument(text).body;
    const withFields = fields ? applyFields(text, fields) : text;
    return `${splitDocument(withFields).head ? `---\n${splitDocument(withFields).head}\n---\n` : ''}${body.startsWith('\n') ? body : `\n${body}`}`;
  }, [mode, rawText, text, fields]);

  /** Runs a backend action, surfacing errors in the status line; `rethrow` lets dialogs show the error too. */
  const runAction = async (fn: () => Promise<void>, opts: { rethrow?: boolean } = {}) => {
    setBusy(true); setStatus(null); setProblems([]);
    try { await fn(); }
    catch (e) {
      if (e instanceof ContentError && e.code === 'VALIDATION' && Array.isArray(e.details)) setProblems(e.details as Problem[]);
      setStatus({ kind: 'error', text: (e as Error).message });
      if (opts.rethrow) throw e;
    } finally { setBusy(false); }
  };

  const save = () => runAction(async () => {
    if (!selected || !identity) return;
    const next = compose();
    const local = isIndex ? [] : validatePage(selected, next, { codeRepos: platform.config.codeRepos });
    if (local.length) { setProblems(local); setStatus({ kind: 'error', text: 'Fix the problems below before saving.' }); return; }
    const res = await backend.writePage(version, selected, next, { message: message || `Update ${selected}`, author: authorOf(identity), expectedEtag: etag });
    setText(next); setRawText(next); setEtag(res.etag); setDirty(false);
    setStatus({ kind: 'ok', text: `Committed ${res.commitSha.slice(0, 7)}; regenerated ${res.regenerated.join(', ') || 'nothing'}.`, url: res.commitUrl });
    await refresh();
  });

  const create = (path: string, pageText: string) => runAction(async () => {
    if (!identity || !confirmDiscard()) return;
    await backend.createPage(version, path, pageText, { message: `Add ${path}`, author: authorOf(identity) });
    setDialog(null); await refresh(); await open(path, { force: true });
    setStatus({ kind: 'ok', text: `Created ${path}.` });
  }, { rethrow: true });

  const remove = () => runAction(async () => {
    if (!selected || !identity || !window.confirm(`Delete ${selected}? This commits the deletion${dirty ? ' and discards your unsaved edits' : ''}.`)) return;
    await backend.deletePage(version, selected, { message: `Delete ${selected}`, author: authorOf(identity) });
    setSelected(null); setDirty(false); await refresh();
    setStatus({ kind: 'ok', text: `Deleted ${selected}.` });
  });

  const rename = () => runAction(async () => {
    if (!selected || !identity || !confirmDiscard()) return;
    const to = window.prompt('New path (bundle-relative, ending in .md):', selected);
    if (!to || to === selected) return;
    await backend.renamePage(version, selected, to, { message: `Rename ${selected} to ${to}`, author: authorOf(identity) });
    setDirty(false); await refresh(); await open(to, { force: true });
  });

  const publish = (v: string) => runAction(async () => {
    if (!identity) return;
    const res = await backend.publishVersion(v, { message: `Publish docs ${v}`, author: authorOf(identity) });
    setDialog(null); await refresh();
    setStatus({ kind: 'ok', text: `Published ${res.version} (tag ${res.tag}, commit ${res.commitSha.slice(0, 7)}).` });
  }, { rethrow: true });

  const logout = () => { if (!confirmDiscard()) return; store.clear(); setSession(null); setIdentity(null); setSelected(null); setDirty(false); setLoginNotice(''); };

  if (checking) return <p style={{ padding: '2rem' }}>Verifying saved session...</p>;
  if (!session || !identity) return <LoginGate platform={platform} initialError={loginNotice} onAuthed={(s, id, remember) => { store.save(s, remember); setSession(s); setIdentity(id); }} />;

  return (
    <PlatformContext.Provider value={{ platform, session, identity, backend, logout }}>
      <div className="layout">
        <aside className="sidebar">
          <h2>{platform.config.organizationName}/{platform.config.projectName}</h2>
          <p>Signed in as <strong>{identity.name}</strong> ({identity.role}) <button className="btn secondary" onClick={logout}>Forget token</button></p>
          <label className="row"><span>Version</span>
            <select aria-label="Version" value={version} onChange={(e) => { if (!confirmDiscard()) return; setVersion(e.target.value); setSelected(null); setDirty(false); }}>{versions.map((v) => <option key={v.id} value={v.id}>{v.label}{v.frozen ? ' (frozen)' : ''}</option>)}</select>
          </label>
          {frozen && <div className="notice">This version is frozen and read-only. Switch to Latest to edit.</div>}
          <div style={{ display: 'flex', gap: '0.5rem', margin: '0.5rem 0' }}>
            <button className="btn" disabled={frozen} onClick={() => setDialog('new')}>New page</button>
            {identity.role === 'editor' && <button className="btn secondary" disabled={frozen} onClick={() => setDialog('publish')}>Publish version</button>}
          </div>
          <FilePicker pages={pages} folders={folders} selected={selected} onSelectPage={(p) => void open(p)} onSelectFolder={(d) => void open(d ? `${d}/index.md` : 'index.md')} />
        </aside>
        <main className="main">
          {!selected && <p>Select a page or folder intro to start editing.</p>}
          {selected && isIndex && <FolderIntroEditor key={selected + etag} text={text} readOnly={frozen} onDirty={() => setDirty(true)} onSave={(next) => runAction(async () => {
            if (!identity) return;
            const res = await backend.writePage(version, selected, next, { message: `Update ${selected} intro`, author: authorOf(identity), expectedEtag: etag });
            setText(next); setEtag(res.etag); setDirty(false); setStatus({ kind: 'ok', text: `Committed ${res.commitSha.slice(0, 7)}.`, url: res.commitUrl }); await refresh();
          })} />}
          {selected && !isIndex && fields && (<>
            <h1 style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>{selected}</h1>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button className={`btn ${mode === 'visual' ? '' : 'secondary'}`} disabled={mode === 'visual'} onClick={() => { const { head } = splitDocument(rawText); setText(rawText); setFields(readFields(head)); setMode('visual'); }}>Visual</button>
              <button className={`btn ${mode === 'raw' ? '' : 'secondary'}`} disabled={mode === 'raw'} onClick={() => { setRawText(compose()); setMode('raw'); }}>Raw MDX</button>
              <span style={{ flex: 1 }} />
              <button className="btn secondary" disabled={frozen || busy} onClick={rename}>Rename</button>
              <button className="btn danger" disabled={frozen || busy} onClick={remove}>Delete</button>
            </div>
            {mode === 'raw' ? (
              <textarea aria-label="Raw MDX" rows={28} value={rawText} readOnly={frozen} spellCheck={false} onChange={(e) => { setRawText(e.target.value); setDirty(true); }} />
            ) : (<>
              <FrontmatterForm fields={fields} typesInUse={typesInUse} disabled={frozen} onChange={(f) => { setFields(f); setDirty(true); }} />
              <div className="editorFrame">
                <BodyEditor key={selected + etag} editorRef={mdx} markdown={splitDocument(text).body} fileLabel={selected} components={components} readOnly={frozen}
                  onChange={(_, initialNormalize) => { if (!initialNormalize) setDirty(true); }}
                  onError={(e) => { console.error('MDXEditor parse error', e); setRawText(text); setMode('raw'); setStatus({ kind: 'error', text: 'This file could not be opened in the visual editor; editing raw MDX instead.' }); }} />
              </div>
            </>)}
            <div style={{ marginTop: '1rem' }}>
              <label className="row"><span>Commit message</span><input aria-label="Commit message" value={message} onChange={(e) => setMessage(e.target.value)} /></label>
              <button className="btn" disabled={frozen || busy} onClick={save}>{busy ? 'Saving...' : 'Save & commit'}</button>
              {dirty && !frozen && <span style={{ marginLeft: '0.75rem', opacity: 0.8 }}>Unsaved changes</span>}
            </div>
          </>)}
          <ProblemList problems={problems} title="Validation problems" />
          {status && <p className={status.kind === 'ok' ? 'ok' : 'problems'} role="status">{status.text} {status.url && <a href={status.url} target="_blank" rel="noreferrer">View commit</a>}</p>}
        </main>
      </div>
      {dialog === 'new' && <NewPageDialog typesInUse={typesInUse} defaultResource={platform.config.codeRepos[0] ? `https://github.com/${platform.config.codeRepos[0].owner}/${platform.config.codeRepos[0].repo}/blob/${platform.config.codeRepos[0].defaultRef}/${platform.config.codeRepos[0].pathPrefix ?? ''}` : ''} onCreate={create} onClose={() => setDialog(null)} />}
      {dialog === 'publish' && <PublishDialog existing={versions.map((v) => v.id)} onPublish={publish} onClose={() => setDialog(null)} />}
    </PlatformContext.Provider>
  );
}
