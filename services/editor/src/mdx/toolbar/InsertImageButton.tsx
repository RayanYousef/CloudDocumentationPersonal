import { useRef, useState } from 'react';
import { ButtonWithTooltip, usePublisher, insertImage$ } from '@mdxeditor/editor';
import { usePlatform } from '../../PlatformContext.js';
import { fileExtension, sanitizeFileName, readFileBytes } from '../uploadHelpers.js';

export function InsertImageButton({ fileLabel }: { fileLabel: string }) {
  const insertImage = usePublisher(insertImage$);
  const { backend, identity, platform } = usePlatform();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(fileExtension(file.name))) { window.alert('Unsupported image type.'); return; }
    const name = sanitizeFileName(file.name);
    setBusy(true);
    try {
      const res = await backend.uploadAsset(`uploads/${name}`, await readFileBytes(file), { message: `Add image ${name} for ${fileLabel}`, author: { name: identity.name, email: identity.email ?? `${identity.login}@users.noreply.github.com` } });
      insertImage({ src: `${platform.config.baseUrl}${res.asset.url.slice(1)}`, altText: name });
    } catch (e) { window.alert(`Could not upload image: ${(e as Error).message}`); }
    finally { setBusy(false); }
  };
  return (<>
    <ButtonWithTooltip title={busy ? 'Uploading image...' : 'Upload image'} onClick={() => input.current?.click()} disabled={busy}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.6" /></svg>
    </ButtonWithTooltip>
    <input ref={input} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void onFile(f); }} />
  </>);
}
