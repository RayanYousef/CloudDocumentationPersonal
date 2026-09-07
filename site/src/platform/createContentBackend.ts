import type { ContentBackend, Session } from '@platform/contracts';
import { GithubBrowserBackend } from '@platform/content';
import platform from '../../../platform.config.js';

/** Same key the editor uses; the site only reads it to authenticate asset fetches. */
export const SESSION_STORAGE_KEY = 'docs-platform.session';

export function readStoredSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch { return null; }
}

let cached: ContentBackend | null = null;
export function createContentBackend(): ContentBackend {
  if (cached) return cached;
  cached = new GithubBrowserBackend({
    owner: platform.organizationName, repo: platform.projectName, branch: platform.deployBranch, sitePath: platform.sitePath,
    codeRepos: platform.codeRepos, token: readStoredSession()?.token ?? null,
  });
  return cached;
}

export function defaultRefFor(repo: string): string {
  return platform.codeRepos.find((r) => `${r.owner}/${r.repo}` === repo)?.defaultRef ?? 'main';
}
