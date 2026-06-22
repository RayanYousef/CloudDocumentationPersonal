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

export const OWNER = 'RayanYousef';
export const REPO = 'CloudDocumentationPersonal';
export const BRANCH = 'main';

/** Only files under this prefix are editable docs. */
export const DOCS_PREFIX = 'website/docs/';

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
 * markdown files under website/docs/, excluding _category_.json sidebar config.
 * Returns an array of repo-relative paths (e.g. "website/docs/foo/bar.mdx"),
 * sorted alphabetically.
 */
export async function listTree(pat) {
  const data = await ghFetch(
    pat,
    `/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`,
  );
  const tree = (data && data.tree) || [];
  return tree
    .filter((entry) => entry.type === 'blob')
    .map((entry) => entry.path)
    .filter(
      (p) =>
        p.startsWith(DOCS_PREFIX) &&
        (p.endsWith('.md') || p.endsWith('.mdx')) &&
        !p.endsWith('_category_.json'),
    )
    .sort((a, b) => a.localeCompare(b));
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
    return await ghFetch(pat, `/repos/${OWNER}/${REPO}/contents/${encodePath(path)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
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
