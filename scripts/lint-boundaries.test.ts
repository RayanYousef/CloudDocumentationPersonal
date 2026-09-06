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

describe('import boundaries', () => {
  it('rejects a service importing another service', async () => {
    const rules = await lint('services/auth/src/bad.ts');
    expect(rules).toContain('boundaries/external');
  });
  it('accepts a service importing contracts', async () => {
    const rules = await lint('services/auth/src/good.ts');
    expect(rules.filter((r) => r.startsWith('boundaries/'))).toEqual([]);
  });
});
