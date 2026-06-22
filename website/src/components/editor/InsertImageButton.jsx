/**
 * Toolbar button: Insert Image (upload-and-commit).
 *
 * Distinct from MDXEditor's built-in <InsertImage> (which only takes a URL): this
 * uploads the picked image to the repo (website/static/uploads/) via the Contents
 * API, then inserts standard markdown `![alt](/uploads/<name>)` at the cursor.
 *
 * The inserted path is BARE ("/uploads/<name>"): Docusaurus resolves static asset
 * URLs against baseUrl at render time, matching how authored docs reference
 * /uploads/ images.
 *
 * Only mounted inside the MDXEditor toolbar (BrowserOnly subtree), so @mdxeditor
 * imports and direct DOM use are SSR-safe.
 */
import React, {useRef, useState} from 'react';
import {ButtonWithTooltip, usePublisher, insertMarkdown$} from '@mdxeditor/editor';
import {
  readFileAsArrayBuffer,
  fileExtension,
  sanitizeFileName,
  uploadBinaryAsset,
} from './uploadHelpers';

const IMAGE_ACCEPT = 'image/*';
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'];

function ImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8.5" cy="9.5" r="1.8" stroke="currentColor" strokeWidth="1.4" />
      <path d="m4 18 5-5 4 4 3-3 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export default function InsertImageButton({pat, fileLabel}) {
  const insertMarkdown = usePublisher(insertMarkdown$);
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const onClick = () => {
    if (busy) return;
    inputRef.current?.click();
  };

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;

    const ext = fileExtension(file.name);
    if (!IMAGE_EXTS.includes(ext)) {
      // eslint-disable-next-line no-alert
      window.alert(`Unsupported image type ".${ext}". Use ${IMAGE_EXTS.join(', ')}.`);
      return;
    }

    const name = sanitizeFileName(file.name);
    const repoPath = `website/static/uploads/${name}`;
    const bareSrc = `/uploads/${name}`;
    const alt = name.replace(/\.[^.]+$/, '');

    setBusy(true);
    try {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      await uploadBinaryAsset(pat, {
        arrayBuffer,
        repoPath,
        message: `Add image ${name}${fileLabel ? ` for ${fileLabel}` : ''}`,
      });

      insertMarkdown(`![${alt}](${bareSrc})`);
    } catch (err) {
      if (!err.cancelled) {
        // eslint-disable-next-line no-alert
        window.alert(`Could not insert image: ${err.message || err}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ButtonWithTooltip
        title={busy ? 'Uploading image…' : 'Upload & insert image'}
        onClick={onClick}
        disabled={busy}
      >
        <ImageIcon />
      </ButtonWithTooltip>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        onChange={onFile}
        style={{display: 'none'}}
      />
    </>
  );
}
