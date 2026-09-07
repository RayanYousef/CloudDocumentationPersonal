import { useState } from 'react';
import { ButtonWithTooltip, usePublisher, insertJsx$, insertImage$ } from '@mdxeditor/editor';
import type { AssetInfo } from '@platform/contracts';
import { usePlatform } from '../../PlatformContext.js';
import { Modal } from '../../components/Modal.js';

/** Insert an asset already committed to the site (no re-upload). */
export function InsertFromRepoButton() {
  const insertJsx = usePublisher(insertJsx$);
  const insertImage = usePublisher(insertImage$);
  const { backend, platform } = usePlatform();
  const [assets, setAssets] = useState<AssetInfo[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const openPicker = async () => {
    setOpen(true); setError('');
    if (assets) return;
    try { setAssets(await backend.listAssets()); } catch (e) { setError(`Could not list assets: ${(e as Error).message}`); }
  };
  const pick = (a: AssetInfo) => {
    if (a.kind === 'model') insertJsx({ name: a.path.endsWith('.fbx') ? 'FbxViewer' : 'ModelViewer', kind: 'flow', props: { src: a.url, alt: a.path.split('/').at(-1) ?? a.path } });
    else insertImage({ src: `${platform.config.baseUrl}${a.url.slice(1)}`, altText: a.path });
    setOpen(false);
  };
  return (<>
    <ButtonWithTooltip title="Insert from repo (existing models and images)" onClick={openPicker}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.6" /></svg>
    </ButtonWithTooltip>
    {open && <Modal title="Insert from repo" onClose={() => setOpen(false)}>
      {error ? <p className="problems" role="alert">{error}</p> : !assets ? <p>Loading...</p> : assets.length === 0 ? <p>No assets committed yet.</p> : <ul className="filelist">{assets.map((a) => <li key={a.path}><button onClick={() => pick(a)}>{a.kind}: {a.path}</button></li>)}</ul>}
      <button className="btn secondary" onClick={() => setOpen(false)}>Close</button>
    </Modal>}
  </>);
}
