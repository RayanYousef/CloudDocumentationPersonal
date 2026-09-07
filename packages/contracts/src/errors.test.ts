import { describe, it, expect } from 'vitest';
import { AuthError, ContentError } from './index.js';

describe('error classes', () => {
  it('AuthError carries a code and is an Error', () => {
    const e = new AuthError('NOT_COLLABORATOR', 'You are not a write collaborator of o/r');
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('NOT_COLLABORATOR');
    expect(e.name).toBe('AuthError');
  });
  it('ContentError carries code and details', () => {
    const e = new ContentError('VALIDATION', 'invalid page', [{ file: 'a.md', rule: 'frontmatter', message: 'missing "type"' }]);
    expect(e.code).toBe('VALIDATION');
    expect(Array.isArray(e.details)).toBe(true);
  });
});
