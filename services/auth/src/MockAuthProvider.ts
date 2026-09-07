import { AuthError, type AuthProvider, type Credentials, type Identity, type Role, type Session } from '@platform/contracts';

/** Test/e2e provider: the token encodes the identity; no network. */
export class MockAuthProvider implements AuthProvider {
  readonly id = 'mock';
  async login(credentials: Credentials): Promise<Session> {
    if (credentials.kind !== 'mock') throw new AuthError('UNSUPPORTED_CREDENTIALS', 'MockAuthProvider only accepts mock credentials');
    if (!credentials.name.trim()) throw new AuthError('INVALID_CREDENTIALS', 'A name is required');
    const payload = JSON.stringify({ name: credentials.name, role: credentials.role });
    return { provider: this.id, token: `mock.${btoa(payload)}`, createdAt: new Date().toISOString() };
  }
  async verify(session: Session): Promise<Identity> {
    if (session.provider !== this.id || !session.token.startsWith('mock.')) throw new AuthError('INVALID_CREDENTIALS', 'Not a mock session');
    try {
      const { name, role } = JSON.parse(atob(session.token.slice(5))) as { name: string; role: Role };
      if (!name || !['viewer', 'editor'].includes(role)) throw new Error();
      return { name, login: name.toLowerCase().replace(/\s+/g, '-'), email: null, role };
    } catch {
      throw new AuthError('INVALID_CREDENTIALS', 'Mock session is corrupt');
    }
  }
}
