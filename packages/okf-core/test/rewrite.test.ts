import { describe, it, expect } from 'vitest';
import { rewriteRefs } from '../src/index.js';

const sha = 'a'.repeat(40);
describe('rewriteRefs', () => {
  it('rewrites blob URLs of pinned repos only', () => {
    const text = 'resource: https://github.com/acme/game/blob/main/x\nother: https://github.com/zzz/q/blob/main/y\n';
    expect(rewriteRefs(text, { 'acme/game': { from: 'main', to: sha } })).toBe(`resource: https://github.com/acme/game/blob/${sha}/x\nother: https://github.com/zzz/q/blob/main/y\n`);
  });
  it('rewrites ref="main" only on JSX tags carrying repo="acme/game"', () => {
    const text = '<FbxViewer repo="acme/game" ref="main" path="A.fbx" />\n<ModelViewer repo="zzz/q" ref="main" path="B.glb" />';
    const out = rewriteRefs(text, { 'acme/game': { from: 'main', to: sha } });
    expect(out).toContain(`<FbxViewer repo="acme/game" ref="${sha}" path="A.fbx" />`);
    expect(out).toContain('<ModelViewer repo="zzz/q" ref="main" path="B.glb" />');
  });
});
