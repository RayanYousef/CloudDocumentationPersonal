import { describe, it, expect } from 'vitest';
import { BrowserSessionStore, SESSION_STORAGE_KEY } from './SessionStore.js';

function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 } as Storage;
}
const session = { provider: 'github-token', token: 'ghp_x', createdAt: '2026-09-07T00:00:00Z' };

describe('BrowserSessionStore', () => {
  it('keeps the session in memory only unless remember is set', () => {
    const storage = fakeStorage();
    const store = new BrowserSessionStore(storage);
    store.save(session, false);
    expect(store.load()).toEqual(session);
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
  it('persists with remember and clears on clear()', () => {
    const storage = fakeStorage();
    const store = new BrowserSessionStore(storage);
    store.save(session, true);
    expect(JSON.parse(storage.getItem(SESSION_STORAGE_KEY)!)).toEqual(session);
    expect(new BrowserSessionStore(storage).load()).toEqual(session);
    store.clear();
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(store.load()).toBeNull();
  });
});
