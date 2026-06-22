/**
 * Shared binary-asset upload helpers for the in-browser docs editor.
 *
 * Browser-only (uses btoa, FileReader/ArrayBuffer, window.prompt/confirm). Only
 * ever imported from the BrowserOnly editor subtree, so direct DOM/global use is
 * safe and never reaches SSR.
 *
 * Assets (3D models, images) are committed to the repo via the GitHub Contents
 * API exactly like text files, except the payload is the file's raw bytes
 * base64-encoded. The Contents API rejects large blobs, so we guard the size and
 * tell the user to use git / the Git Data API for anything bigger.
 */
import {getShaIfExists, putBinary} from './githubApi';

/**
 * Practical upper bound for a single Contents API PUT. GitHub documents a hard
 * limit around 100MB but strongly recommends the Git Data API past ~1MB (and the
 * base64 round-trip in the browser balloons memory). We block above ~1MB and
 * point the user at git.
 */
export const MAX_ASSET_BYTES = 1024 * 1024; // ~1 MB

/** Human-readable byte size. */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Base64-encode an ArrayBuffer without blowing the call stack.
 *
 * String.fromCharCode(...hugeArray) overflows the argument limit on big files,
 * so we walk the bytes in fixed-size chunks and concatenate the binary string,
 * then btoa() once at the end.
 */
export function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const CHUNK = 0x8000; // 32 KB per chunk — safe for String.fromCharCode.apply
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, i + CHUNK);
    binary += String.fromCharCode.apply(null, slice);
  }
  return btoa(binary);
}

/** Read a File/Blob into an ArrayBuffer (Promise wrapper around FileReader). */
export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}

/** Lowercased file extension without the dot (e.g. "fbx"), or '' if none. */
export function fileExtension(name) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

/**
 * Sanitize a file name for use as a repo path segment: keep it recognizable but
 * strip characters that are awkward in URLs / paths. Spaces -> hyphens.
 */
export function sanitizeFileName(name) {
  return name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9._-]/g, '');
}

/**
 * Upload a binary asset (model / image) to the repo via the Contents API.
 *
 * @param {string} pat                GitHub PAT.
 * @param {object} opts
 * @param {ArrayBuffer} opts.arrayBuffer  Raw file bytes.
 * @param {string} opts.repoPath          Full repo-relative target path
 *                                        (e.g. "website/static/models/foo.glb").
 * @param {string} opts.message           Commit message.
 *
 * Behaviour:
 *  - Throws if the file exceeds MAX_ASSET_BYTES (Contents API guard).
 *  - If the path already exists, prompts the user to overwrite; on decline,
 *    throws a cancellation error. On accept, passes the existing sha so the PUT
 *    updates rather than 422s.
 *  - Returns the GitHub API response (has .commit.html_url, .content.sha).
 */
export async function uploadBinaryAsset(pat, {arrayBuffer, repoPath, message}) {
  const byteLength = arrayBuffer.byteLength;
  if (byteLength > MAX_ASSET_BYTES) {
    throw new Error(
      `File is ${formatBytes(byteLength)}, which exceeds the ~${formatBytes(
        MAX_ASSET_BYTES,
      )} limit for in-browser uploads (GitHub Contents API). ` +
        `Commit large assets with git, or use the Git Data API.`,
    );
  }

  const existingSha = await getShaIfExists(pat, repoPath);
  if (existingSha) {
    // eslint-disable-next-line no-alert
    const ok = window.confirm(
      `"${repoPath}" already exists in the repo. Overwrite it with the file you picked?`,
    );
    if (!ok) {
      const cancelled = new Error('Upload cancelled — file already exists and was not overwritten.');
      cancelled.cancelled = true;
      throw cancelled;
    }
  }

  const base64 = arrayBufferToBase64(arrayBuffer);
  return putBinary(pat, {
    path: repoPath,
    base64,
    sha: existingSha || undefined,
    message,
  });
}
