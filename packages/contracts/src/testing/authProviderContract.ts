import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { AuthProvider, Credentials, Session } from '../auth.js';
import { AuthError } from '../auth.js';

export interface AuthProviderHarness {
  provider: AuthProvider;
  validCredentials: Credentials;
  invalidCredentials: Credentials;
  /** Credentials that authenticate but lack write access (omit when the provider cannot express it). */
  nonCollaboratorCredentials?: Credentials;
  cleanup?: () => Promise<void>;
}

export function describeAuthProviderContract(name: string, factory: () => Promise<AuthProviderHarness>): void {
  describe(`AuthProvider contract: ${name}`, () => {
    let h: AuthProviderHarness;
    beforeAll(async () => { h = await factory(); });
    afterAll(async () => { await h.cleanup?.(); });

    it('has a stable id', () => {
      expect(typeof h.provider.id).toBe('string');
      expect(h.provider.id.length).toBeGreaterThan(0);
    });

    it('login with valid credentials returns a session for this provider', async () => {
      const s = await h.provider.login(h.validCredentials);
      expect(s.provider).toBe(h.provider.id);
      expect(s.token.length).toBeGreaterThan(0);
      expect(Number.isNaN(Date.parse(s.createdAt))).toBe(false);
    });

    it('verify of a fresh session yields an identity with a role', async () => {
      const s = await h.provider.login(h.validCredentials);
      const id = await h.provider.verify(s);
      expect(id.name.length).toBeGreaterThan(0);
      expect(id.login.length).toBeGreaterThan(0);
      expect(['viewer', 'editor']).toContain(id.role);
    });

    it('login with invalid credentials throws INVALID_CREDENTIALS', async () => {
      await expect(h.provider.login(h.invalidCredentials)).rejects.toMatchObject({ name: 'AuthError', code: 'INVALID_CREDENTIALS' });
    });

    it('verify of a tampered session throws an AuthError', async () => {
      const s = await h.provider.login(h.validCredentials);
      const tampered: Session = { ...s, token: `${s.token}x` };
      await expect(h.provider.verify(tampered)).rejects.toBeInstanceOf(AuthError);
    });

    it('rejects credentials of another kind with UNSUPPORTED_CREDENTIALS', async () => {
      const other: Credentials = h.validCredentials.kind === 'mock'
        ? { kind: 'github-token', token: 'ghp_x' }
        : { kind: 'mock', name: 'x', role: 'viewer' };
      await expect(h.provider.login(other)).rejects.toMatchObject({ code: 'UNSUPPORTED_CREDENTIALS' });
    });

    it('non-collaborators are refused with NOT_COLLABORATOR', async () => {
      if (!h.nonCollaboratorCredentials) return;
      await expect(h.provider.login(h.nonCollaboratorCredentials)).rejects.toMatchObject({ code: 'NOT_COLLABORATOR' });
    });
  });
}
