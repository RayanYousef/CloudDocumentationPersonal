import { describe, it, expect } from 'vitest';
import { normalizeRemote, lookupBundle } from '../scripts/resolve-bundle.mjs';

const registry = { version: 1, bundles: [{ remote: 'https://github.com/RayanYousef/CloudDocumentationPersonal', docs: { kind: 'local', sitePath: 'H:/Personal-Projects/CloudDocumentation/site' } }] };

describe('normalizeRemote', () => {
  it('maps ssh and https forms to one canonical URL', () => {
    expect(normalizeRemote('git@github.com:RayanYousef/CloudDocumentationPersonal.git')).toBe('https://github.com/RayanYousef/CloudDocumentationPersonal');
    expect(normalizeRemote('https://github.com/RayanYousef/CloudDocumentationPersonal.git')).toBe('https://github.com/RayanYousef/CloudDocumentationPersonal');
    expect(normalizeRemote('ssh://git@github.com/RayanYousef/CloudDocumentationPersonal')).toBe('https://github.com/RayanYousef/CloudDocumentationPersonal');
  });
});

describe('lookupBundle', () => {
  it('finds a bundle by normalised remote', () => {
    expect(lookupBundle(registry, 'git@github.com:RayanYousef/CloudDocumentationPersonal.git')?.docs.kind).toBe('local');
    expect(lookupBundle(registry, 'https://github.com/other/repo')).toBeNull();
  });
});
