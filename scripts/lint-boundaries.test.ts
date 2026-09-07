import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

async function lint(file: string) {
  // The fixture tree mirrors the real layout so the element patterns match;
  // cwd is set to the fixture root, and the real config is loaded explicitly.
  // eslint-plugin-boundaries anchors element patterns on process.cwd() (the repo root),
  // not on ESLint's cwd, so point its root-path at the fixture tree as well.
  const fixtureRoot = path.join(root, 'scripts/lint-fixtures');
  const eslint = new ESLint({
    cwd: fixtureRoot,
    overrideConfigFile: path.join(root, 'eslint.config.js'),
    overrideConfig: [{ ignores: [], settings: { 'boundaries/root-path': fixtureRoot } }],
  });
  const [result] = await eslint.lintFiles([file]);
  return result?.messages.map((m) => m.ruleId ?? '') ?? [];
}

// Each run boots ESLint with the typescript resolver over the whole config; that can take
// well over Vitest's default 5 s on a cold cache (fresh clone, CI), so allow 30 s per test.
const TIMEOUT_MS = 30_000;

describe('import boundaries', () => {
  it('rejects a service importing another service', async () => {
    const rules = await lint('services/auth/src/bad.ts');
    // Fires boundaries/external when @platform/content is unbuilt (unresolvable) and
    // boundaries/element-types once services/content/dist exists (resolves to a local element).
    expect(rules.filter((r) => r.startsWith('boundaries/'))).not.toEqual([]);
  }, TIMEOUT_MS);
  it('accepts a service importing contracts', async () => {
    const rules = await lint('services/auth/src/good.ts');
    expect(rules.filter((r) => r.startsWith('boundaries/'))).toEqual([]);
  }, TIMEOUT_MS);
  it('accepts the site reading the root platform.config.js', async () => {
    const rules = await lint('site/docusaurus.config.js');
    expect(rules.filter((r) => r.startsWith('boundaries/'))).toEqual([]);
  }, TIMEOUT_MS);
});
