import { createContext, useContext } from 'react';
import type { ContentBackend, Identity, Session } from '@platform/contracts';
import type { Platform } from './composition/createPlatform.js';

export interface PlatformSession { platform: Platform; session: Session; identity: Identity; backend: ContentBackend; logout(): void }
export const PlatformContext = createContext<PlatformSession | null>(null);
export function usePlatform(): PlatformSession {
  const v = useContext(PlatformContext);
  if (!v) throw new Error('usePlatform outside PlatformContext');
  return v;
}
