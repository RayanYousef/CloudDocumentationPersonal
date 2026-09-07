import type { AuthProvider, ContentBackend, PlatformConfig, Session } from '@platform/contracts';
import { GithubTokenProvider, MockAuthProvider } from '@platform/auth';
import { GithubBrowserBackend, HttpContentBackend } from '@platform/content';
import platform from '../../../../platform.config.js';

export interface Platform { auth: AuthProvider; backend(session: Session | null): ContentBackend; config: PlatformConfig; componentsUrl: string }

export function createPlatform(env: Record<string, string | undefined> = import.meta.env as Record<string, string | undefined>): Platform {
  const config = platform as PlatformConfig;
  const authKind = env['VITE_PLATFORM_AUTH'] ?? config.auth.provider;
  const contentUrl = env['VITE_PLATFORM_CONTENT'] ?? (config.content.backend === 'http' ? config.content.url : undefined);
  const auth: AuthProvider = authKind === 'mock' ? new MockAuthProvider() : new GithubTokenProvider({ owner: config.organizationName, repo: config.projectName });
  const backend = (session: Session | null): ContentBackend =>
    contentUrl
      ? new HttpContentBackend(contentUrl)
      : new GithubBrowserBackend({ owner: config.organizationName, repo: config.projectName, branch: config.deployBranch, sitePath: config.sitePath, codeRepos: config.codeRepos, token: session?.token ?? null });
  return { auth, backend, config, componentsUrl: `${config.baseUrl}platform/components.json` };
}
