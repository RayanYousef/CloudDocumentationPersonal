import { useState } from 'react';
import { ButtonWithTooltip, usePublisher, insertJsx$, insertImage$ } from '@mdxeditor/editor';
import type { AssetInfo } from '@platform/contracts';
import { usePlatform } from '../../PlatformContext.js';

/** Insert an asset already committed to the site (no re-upload). */
export function InsertFromRepoButton() {
  const insertJsx = usePublisher(insertJsx$);
  const insertImage = usePublisher(insertImage$);
  const { backend, platform } = usePlatform();
  const [assets, setAssets] = useState<AssetInfo[] | null>(null);
  const [open, setOpen] = useState(false);
  const openPicker = async () => { setOpen(true); if (!assets) setAssets(await backend.listAssets().catch(() => [])); };
  const pick = (a: AssetInfo) => {
    if (a.kind === 'model') insertJsx({ name: a.path.endsWith('.fbx') ? 'FbxViewer' : 'ModelViewer', kind: 'flow', props: { src: a.url, alt: a.path.split('/').at(-1) ?? a.path } });
    else insertImage({ src: `${platform.config.baseUrl}${a.url.slice(1)}`, altText: a.path });
    setOpen(false);
  };
  return (<>
    <ButtonWithTooltip title="Insert from repo (existing models and images)" onClick={openPicker}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.6" /></svg>
    </ButtonWithTooltip>
    {open && <div className="modal" onClick={() => setOpen(false)}><div onClick={(e) => e.stopPropagation()}>
      <h3>Insert from repo</h3>
      {!assets ? <p>Loading...</p> : assets.length === 0 ? <p>No assets committed yet.</p> : <ul className="filelist">{assets.map((a) => <li key={a.path}><button onClick={() => pick(a)}>{a.kind}: {a.path}</button></li>)}</ul>}
      <button className="btn secondary" onClick={() => setOpen(false)}>Close</button>
    </div></div>}
  </>);
}
