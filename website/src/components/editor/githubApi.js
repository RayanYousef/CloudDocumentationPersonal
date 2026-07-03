/**
 * GitHub REST plumbing for the in-browser docs editor.
 *
 * Pure browser code (uses `fetch`, `btoa`/`atob`, `TextEncoder`/`TextDecoder`).
 * It is only ever imported from EditorApp, which is reached exclusively through
 * the <BrowserOnly> require() in src/pages/editor.js — so it never runs under SSR.
 *
 * Auth is a GitHub Personal Access Token (PAT) supplied by the user at runtime;
 * every request is made client-side against the GitHub Contents / Git Data APIs.
 */

// Project identity comes from the single source of truth (website/site.config.js).
import siteConfig from '../../../site.config.js';
// Frozen doc versions come from the same file Docusaurus itself reads, so the
// editor's version list can never drift from the built site.
import versions from '../../../versions.json';

export const OWNER = siteConfig.organizationName;
export const REPO = siteConfig.projectName;
export const BRANCH = siteConfig.deployBranch;

/**
 * Editable doc versions. Each entry maps a version id to the repo prefix that
 * holds its markdown:
 *   - 'current' is the live "Latest" docs under website/docs/.
 *   - Every frozen snapshot lives under website/versioned_docs/version-<id>/.
 * Editing a non-'current' version commits straight into the archived snapshot.
 *
 * Derived from versions.json (["1.0.0", ...]) so this list stays in lockstep
 * with the versions Docusaurus builds — no hand-maintained duplicate to drift.
 */
export const VERSIONS = [
  {id: 'current', label: 'Latest', prefix: 'website/docs/'},
  ...versions.map((v) => ({
    id: v,
    label: v,
    prefix: `website/versioned_docs/version-${v}/`,
  })),
];

/**
 * Only files under this prefix are editable docs.
 * Back-compat export = the 'current' (Latest) prefix; new code should pass an
 * explicit prefix from VERSIONS instead.
 */
export const DOCS_PREFIX = VERSIONS[0].prefix;

const API_ROOT = 'https://api.github.com';

// --- base64 helpers (UTF-8 safe, browser only) ---------------------------

/** Encode a JS string to base64 (UTF-8 safe). */
export const encodeBase64 = (s) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s)));

/** Decode base64 to a JS string (UTF-8 safe). */
export const decodeBase64 = (b) =>
  new TextDecoder().decode(
    Uint8Array.from(atob(b), (c) => c.charCodeAt(0)),
  );

// --- low-level fetch ------------------------------------------------------

function authHeaders(pat) {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/**
 * Wraps fetch with GitHub auth headers and uniform error handling.
 * Throws an Error whose `.status` is the HTTP status (for callers that
 * special-case 404 / 409).
 */
async function ghFetch(pat, path, options = {}) {
  const res = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: {
      ...authHeaders(pat),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let detail = '';
    try {
      const data = await res.json();
      detail = data && data.message ? data.message : '';
    } catch (_) {
      // body was not JSON; ignore
    }
    const err = new Error(
      detail
        ? `GitHub API ${res.status}: ${detail}`
        : `GitHub API request failed with status ${res.status}`,
    );
    err.status = res.status;
    throw err;
  }

  // 204 No Content etc.
  if (res.status === 204) return null;
  return res.json();
}

// --- shared recursive-tree fetch ------------------------------------------
// listTree and listAssets both need the FULL recursive git tree of BRANCH.
// Fetching it once each is wasteful, so we share a single in-flight request and
// briefly cache the (blob-path) result. The TTL is a short backstop; any write
// (putRaw) also invalidates it, so newly committed files/assets show up right
// away. The tree is a property of the repo, not the token, so we don't key on
// the PAT.

const TREE_TTL_MS = 15000;
let treeCache = null; // { at: number, promise: Promise<string[]> } | null

/** Drop the cached tree so the next list refetches (call after any write). */
function invalidateTreeCache() {
  treeCache = null;
}

/** Fetch the recursive git tree of BRANCH, returning blob paths only. Shared/cached. */
function fetchTreeBlobs(pat) {
  const now = Date.now();
  if (treeCache && now - treeCache.at < TREE_TTL_MS) {
    return treeCache.promise;
  }
  const promise = ghFetch(
    pat,
    `/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`,
  ).then((data) => {
    const tree = (data && data.tree) || [];
    return tree
      .filter((entry) => entry.type === 'blob')
      .map((entry) => entry.path);
  });
  treeCache = {at: now, promise};
  // On failure, drop the cache so the next call retries instead of replaying
  // the same rejected promise for the whole TTL window.
  promise.catch(() => {
    if (treeCache && treeCache.promise === promise) treeCache = null;
  });
  return promise;
}

// --- public API -----------------------------------------------------------

/**
 * Verify a PAT can read the target repo.
 * Returns the repo object on success; throws (with .status) otherwise.
 */
export async function verifyToken(pat) {
  return ghFetch(pat, `/repos/${OWNER}/${REPO}`);
}

/**
 * List editable doc files: the recursive git tree of `main`, filtered to
 * markdown files under `prefix`, excluding _category_.json sidebar config.
 * `prefix` defaults to the 'current' (Latest) docs prefix.
 * Returns an array of repo-relative paths (e.g. "website/docs/foo/bar.mdx"),
 * sorted alphabetically.
 */
export async function listTree(pat, prefix = DOCS_PREFIX) {
  const paths = await fetchTreeBlobs(pat);
  return paths
    .filter(
      (p) =>
        p.startsWith(prefix) &&
        (p.endsWith('.md') || p.endsWith('.mdx')) &&
        !p.endsWith('_category_.json'),
    )
    .sort((a, b) => a.localeCompare(b));
}

/**
 * List assets already committed to the repo, so the editor can reference them
 * without re-uploading. Reads the recursive git tree of `main` once and buckets
 * the blobs into:
 *   - models: 3D files under website/static/models/** with a .glb/.gltf/.fbx ext.
 *   - images: image files under website/static/uploads/** or website/static/img/**
 *             with a jpg/jpeg/png/gif/svg/webp ext.
 * Each array holds repo-relative paths (e.g. "website/static/models/foo.glb"),
 * sorted alphabetically. Callers strip the "website/static" prefix to get the
 * bare public src.
 */
export async function listAssets(pat) {
  const paths = await fetchTreeBlobs(pat);

  const MODEL_EXTS = ['glb', 'gltf', 'fbx'];
  const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
  const extOf = (p) => {
    const i = p.lastIndexOf('.');
    return i >= 0 ? p.slice(i + 1).toLowerCase() : '';
  };

  const models = paths
    .filter(
      (p) =>
        p.startsWith('website/static/models/') && MODEL_EXTS.includes(extOf(p)),
    )
    .sort((a, b) => a.localeCompare(b));

  const images = paths
    .filter(
      (p) =>
        (p.startsWith('website/static/uploads/') ||
          p.startsWith('website/static/img/')) &&
        IMAGE_EXTS.includes(extOf(p)),
    )
    .sort((a, b) => a.localeCompare(b));

  return {models, images};
}

/**
 * Fetch a file's decoded text and current blob sha.
 * Returns { text, sha }.
 */
export async function getFile(pat, path) {
  const data = await ghFetch(
    pat,
    `/repos/${OWNER}/${REPO}/contents/${encodePath(path)}?ref=${BRANCH}`,
  );
  // GitHub may return base64 with embedded newlines.
  const raw = (data.content || '').replace(/\n/g, '');
  return {
    text: decodeBase64(raw),
    sha: data.sha,
  };
}

/**
 * Return the blob sha for a path if it exists, else null.
 * Used before putBinary to decide whether we are creating or updating.
 */
export async function getShaIfExists(pat, path) {
  try {
    const data = await ghFetch(
      pat,
      `/repos/${OWNER}/${REPO}/contents/${encodePath(path)}?ref=${BRANCH}`,
    );
    return data.sha || null;
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

/**
 * Create or update a text file via the Contents API.
 * `sha` must be the current blob sha when updating (omit/undefined to create).
 * On 409 (sha conflict — file changed on the server) throws a clear error.
 * Returns the API response (contains .commit with html_url and .content.sha).
 */
export async function putFile(pat, {path, text, sha, message}) {
  return putRaw(pat, {
    path,
    base64: encodeBase64(text),
    sha,
    message,
  });
}

/**
 * Create or update a binary file (e.g. an uploaded image) via the Contents API.
 * `base64` is the already-base64-encoded content. `sha` for updates, omit to create.
 * Returns the API response.
 */
export async function putBinary(pat, {path, base64, sha, message}) {
  return putRaw(pat, {path, base64, sha, message});
}

// --- internals ------------------------------------------------------------

async function putRaw(pat, {path, base64, sha, message}) {
  const body = {
    message: message || `Update ${path}`,
    content: base64,
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  try {
    const res = await ghFetch(pat, `/repos/${OWNER}/${REPO}/contents/${encodePath(path)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    // The write changed the tree; drop the shared cache so the next list is fresh.
    invalidateTreeCache();
    return res;
  } catch (err) {
    if (err.status === 409) {
      const conflict = new Error(
        `Conflict (409): "${path}" was changed on GitHub since you loaded it. ` +
          `Reload the file to get the latest version, then re-apply your edits.`,
      );
      conflict.status = 409;
      throw conflict;
    }
    throw err;
  }
}

/** Encode a repo path for use in a Contents API URL, preserving slashes. */
function encodePath(path) {
  return path
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}
