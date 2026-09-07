import { useRef, useState } from 'react';
import { ButtonWithTooltip, usePublisher, insertJsx$ } from '@mdxeditor/editor';
import { usePlatform } from '../../PlatformContext.js';
import { fileExtension, sanitizeFileName, readFileBytes } from '../uploadHelpers.js';

/** Upload a .glb/.gltf/.fbx to the site's static/models and insert the matching viewer. */
export function InsertModelButton({ fileLabel }: { fileLabel: string }) {
  const insertJsx = usePublisher(insertJsx$);
  const { backend, identity } = usePlatform();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const ext = fileExtension(file.name);
    if (!['glb', 'gltf', 'fbx'].includes(ext)) { window.alert(`Unsupported 3D model type ".${ext}". Use .glb, .gltf or .fbx.`); return; }
    const name = sanitizeFileName(file.name);
    const isFbx = ext === 'fbx';
    const assetPath = isFbx ? `models/fbx/${name}` : `models/${name}`;
    setBusy(true);
    try {
      await backend.uploadAsset(assetPath, await readFileBytes(file), { message: `Add 3D model ${name} for ${fileLabel}`, author: { name: identity.name, email: identity.email ?? `${identity.login}@users.noreply.github.com` } });
      insertJsx({ name: isFbx ? 'FbxViewer' : 'ModelViewer', kind: 'flow', props: { src: `/${assetPath}`, alt: name } });
    } catch (e) { window.alert(`Could not insert 3D model: ${(e as Error).message}`); }
    finally { setBusy(false); }
  };
  return (<>
    <ButtonWithTooltip title={busy ? 'Uploading model...' : 'Insert 3D model (.glb, .gltf, .fbx)'} onClick={() => input.current?.click()} disabled={busy}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2 21 7v10l-9 5-9-5V7l9-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M3 7l9 5 9-5M12 12v10" stroke="currentColor" strokeWidth="1.6" /></svg>
    </ButtonWithTooltip>
    <input ref={input} type="file" accept=".glb,.gltf,.fbx" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void onFile(f); }} />
  </>);
}
