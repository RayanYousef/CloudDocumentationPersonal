import { describeAuthProviderContract } from '@platform/contracts/testing';
import { MockAuthProvider } from '../src/index.js';

describeAuthProviderContract('MockAuthProvider', async () => ({
  provider: new MockAuthProvider(),
  validCredentials: { kind: 'mock', name: 'Mock Editor', role: 'editor' },
  invalidCredentials: { kind: 'mock', name: '', role: 'editor' },
}));
