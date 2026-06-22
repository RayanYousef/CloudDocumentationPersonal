/**
 * Toolbar button: Insert 3D Model.
 *
 * Lives ONLY inside the MDXEditor toolbar (mounted from editorClient.js, which is
 * itself reachable only through the BrowserOnly editor subtree), so @mdxeditor
 * imports and direct DOM use are SSR-safe here.
 *
 * Flow when the user picks a file:
 *  1. Read it as an ArrayBuffer; derive extension + sanitized name.
 *  2. Choose the target dir to mirror the repo convention the viewers expect:
 *       - .fbx          -> website/static/models/fbx/   (bare src "/models/fbx/<name>")
 *       - .gltf / .glb  -> website/static/models/       (bare src "/models/<name>")
 *  3. Upload via the Contents API (size-guarded; overwrite-prompted).
 *  4. Insert the matching JSX node at the cursor via insertJsx$ so the jsxPlugin
 *     descriptor + auto-import apply (gives the live preview + clean round-trip):
 *       - .gltf/.glb -> <ModelViewer src="/models/<name>" alt="<name>" />
 *       - .fbx       -> <FbxViewer  src="/models/fbx/<name>" alt="<name>" />
 *
 * `src` is deliberately BARE (no /CloudDocumentationPersonal/ base path): the
 * viewers prepend baseUrl themselves, matching every authored doc.
 */
import React, {useRef, useState} from 'react';
import {ButtonWithTooltip, usePublisher, insertJsx$} from '@mdxeditor/editor';
import {
  readFileAsArrayBuffer,
  fileExtension,
  sanitizeFileName,
  uploadBinaryAsset,
  formatBytes,
} from './uploadHelpers';

const MODEL_ACCEPT = '.glb,.gltf,.fbx';

// A simple cube icon so the button reads as "3D".
function CubeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2 21 7v10l-9 5-9-5V7l9-5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M3 7l9 5 9-5M12 12v10" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export default function InsertModelButton({pat, fileLabel}) {
  const insertJsx = usePublisher(insertJsx$);
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const onClick = () => {
    if (busy) return;
    inputRef.current?.click();
  };

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    // Reset the input so picking the same file again still fires onChange.
    e.target.value = '';
    if (!file) return;

    const ext = fileExtension(file.name);
    if (!['glb', 'gltf', 'fbx'].includes(ext)) {
      // eslint-disable-next-line no-alert
      window.alert(`Unsupported 3D model type ".${ext}". Use .glb, .gltf or .fbx.`);
      return;
    }

    const name = sanitizeFileName(file.name);
    const isFbx = ext === 'fbx';
    const repoDir = isFbx ? 'website/static/models/fbx/' : 'website/static/models/';
    const repoPath = `${repoDir}${name}`;
    const bareSrc = isFbx ? `/models/fbx/${name}` : `/models/${name}`;
    const componentName = isFbx ? 'FbxViewer' : 'ModelViewer';

    setBusy(true);
    try {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      await uploadBinaryAsset(pat, {
        arrayBuffer,
        repoPath,
        message: `Add 3D model ${name}${fileLabel ? ` for ${fileLabel}` : ''}`,
      });

      // Insert via mdast so the descriptor (preview) and auto-import apply.
      insertJsx({
        name: componentName,
        kind: 'flow',
        props: {
          src: bareSrc,
          alt: name,
        },
      });
    } catch (err) {
      if (!err.cancelled) {
        // eslint-disable-next-line no-alert
        window.alert(`Could not insert 3D model: ${err.message || err}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ButtonWithTooltip
        title={busy ? 'Uploading model…' : 'Insert 3D model (.glb, .gltf, .fbx — incl. Unity FBX)'}
        onClick={onClick}
        disabled={busy}
      >
        <CubeIcon />
      </ButtonWithTooltip>
      <input
        ref={inputRef}
        type="file"
        accept={MODEL_ACCEPT}
        onChange={onFile}
        style={{display: 'none'}}
      />
    </>
  );
}

export {formatBytes};
