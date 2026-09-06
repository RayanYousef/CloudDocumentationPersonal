export type Role = 'viewer' | 'editor';

export interface Identity {
  name: string;
  login: string;
  email: string | null;
  role: Role;
}

export interface Session {
  provider: string;
  token: string;
  createdAt: string; // ISO 8601
}

export interface GithubTokenCredentials { kind: 'github-token'; token: string }
export interface MockCredentials { kind: 'mock'; name: string; role: Role }
export type Credentials = GithubTokenCredentials | MockCredentials;

export type AuthErrorCode = 'INVALID_CREDENTIALS' | 'NOT_COLLABORATOR' | 'UNSUPPORTED_CREDENTIALS' | 'NETWORK';

export class AuthError extends Error {
  override readonly name = 'AuthError';
  constructor(public readonly code: AuthErrorCode, message: string) {
    super(message);
  }
}

/** Every authentication mechanism implements this and passes describeAuthProviderContract. */
export interface AuthProvider {
  readonly id: string;
  login(credentials: Credentials): Promise<Session>;
  verify(session: Session): Promise<Identity>;
}
