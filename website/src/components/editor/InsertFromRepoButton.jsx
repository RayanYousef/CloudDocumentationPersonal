/**
 * Toolbar button: Insert from repo.
 *
 * Lets the author reference an asset that is ALREADY committed to the repo —
 * no re-upload. On open it reads the repo tree (listAssets) and shows a small
 * picker of existing 3D models and images. Picking an item inserts the right
 * thing at the cursor, deriving the bare public src by stripping the
 * "website/static" prefix:
 *   - website/static/models/<f>.glb|.gltf -> insertJsx ModelViewer src="/models/<f>"
 *   - website/static/models/fbx/<f>.fbx   -> insertJsx FbxViewer  src="/models/fbx/<f>"
 *   - website/static/uploads/<f> (image)  -> markdown image src "/uploads/<f>"
 *   - website/static/img/<f>     (image)  -> markdown image src "/img/<f>"
 *
 * Inserted srcs are deliberately BARE (no /CloudDocumentationPersonal/ base
 * path): the viewers / Docusaurus prepend baseUrl themselves, matching every
 * authored doc.
 *
 * Lives ONLY inside the MDXEditor toolbar (mounted from editorClient.js, itself
 * reachable only through the BrowserOnly editor subtree), so @mdxeditor imports
 * and direct DOM use are SSR-safe here.
 */
import React, {useRef, useState} from 'react';
import {
  ButtonWithTooltip,
  usePublisher,
  insertJsx$,
  insertMarkdown$,
} from '@mdxeditor/editor';
import {listAssets} from './githubApi';
import {fileExtension} from './uploadHelpers';

const STATIC_PREFIX = 'website/static';

/** Strip the "website/static" prefix to get the bare public src (e.g. "/models/foo.glb"). */
function bareSrc(repoPath) {
  return repoPath.slice(STATIC_PREFIX.length);
}

/** Basename of a repo path, used as alt text / list label. */
function baseName(repoPath) {
  const i = repoPath.lastIndexOf('/');
  return i >= 0 ? repoPath.slice(i + 1) : repoPath;
}

// A repo / library icon so the button reads as "pick from repo".
function RepoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M5 16h13" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 4v12" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export default function InsertFromRepoButton({pat}) {
  const insertJsx = usePublisher(insertJsx$);
  const insertMarkdown = usePublisher(insertMarkdown$);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assets, setAssets] = useState({models: [], images: []});
  const loadedRef = useRef(false);

  const onToggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (loadedRef.current) return; // already loaded this session
    setLoading(true);
    setError('');
    try {
      const result = await listAssets(pat);
      setAssets(result);
      loadedRef.current = true;
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  /** Insert a 3D model reference (.glb/.gltf -> ModelViewer, .fbx -> FbxViewer). */
  const insertModel = (repoPath) => {
    const ext = fileExtension(repoPath);
    const isFbx = ext === 'fbx';
    const name = baseName(repoPath);
    insertJsx({
      name: isFbx ? 'FbxViewer' : 'ModelViewer',
      kind: 'flow',
      props: {
        src: bareSrc(repoPath),
        alt: name,
      },
    });
    setOpen(false);
  };

  /** Insert a markdown image referencing an existing repo image. */
  const insertImage = (repoPath) => {
    const alt = baseName(repoPath).replace(/\.[^.]+$/, '');
    insertMarkdown(`![${alt}](${bareSrc(repoPath)})`);
    setOpen(false);
  };

  return (
    <span style={{position: 'relative', display: 'inline-flex'}}>
      <ButtonWithTooltip title="Insert from repo (existing model or image)" onClick={onToggle}>
        <RepoIcon />
      </ButtonWithTooltip>
      {open && (
        <div
          role="dialog"
          aria-label="Insert from repo"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 30,
            marginTop: 4,
            minWidth: 280,
            maxWidth: 360,
            maxHeight: 360,
            overflowY: 'auto',
            padding: 8,
            borderRadius: 8,
            border: '1px solid var(--ifm-color-emphasis-300, #ccc)',
            background: 'var(--ifm-background-surface-color, #fff)',
            boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
            fontSize: 13,
          }}
        >
          {loading && <div style={{padding: 8}}>Loading repo assets…</div>}
          {error && (
            <div style={{padding: 8, color: 'var(--ifm-color-danger, #c00)'}}>
              Could not load assets: {error}
            </div>
          )}
          {!loading && !error && (
            <>
              <AssetGroup
                title="3D models"
                items={assets.models}
                emptyText="No committed models found."
                onPick={insertModel}
              />
              <AssetGroup
                title="Images"
                items={assets.images}
                emptyText="No committed images found."
                onPick={insertImage}
              />
            </>
          )}
        </div>
      )}
    </span>
  );
}

/** A labelled section of pickable asset rows. */
function AssetGroup({title, items, emptyText, onPick}) {
  return (
    <div style={{marginBottom: 8}}>
      <div
        style={{
          fontWeight: 600,
          padding: '4px 6px',
          color: 'var(--ifm-color-emphasis-700, #555)',
        }}
      >
        {title}
      </div>
      {items.length === 0 ? (
        <div style={{padding: '4px 6px', color: 'var(--ifm-color-emphasis-600, #777)'}}>
          {emptyText}
        </div>
      ) : (
        items.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPick(p)}
            title={p}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '4px 6px',
              border: 'none',
              borderRadius: 4,
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                'var(--ifm-color-emphasis-200, #eee)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {baseName(p)}
          </button>
        ))
      )}
    </div>
  );
}
