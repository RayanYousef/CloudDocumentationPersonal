#!/usr/bin/env node
// Resolves the docs bundle for a code repository from the user-level registry.
// Usage: node resolve-bundle.mjs [repoDir]   -> prints the bundle JSON, exit 1 if unregistered.
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REGISTRY_PATH = path.join(homedir(), '.docs-platform', 'registry.json');

export function normalizeRemote(url) {
  let u = url.trim().replace(/\.git$/, '');
  const ssh = u.match(/^git@([^:]+):(.+)$/);
  if (ssh) u = `https://${ssh[1]}/${ssh[2]}`;
  u = u.replace(/^ssh:\/\/git@/, 'https://').replace(/^http:\/\//, 'https://');
  return u.replace(/\/$/, '');
}

export function lookupBundle(registry, remoteUrl) {
  const key = normalizeRemote(remoteUrl);
  return registry.bundles.find((b) => normalizeRemote(b.remote) === key) ?? null;
}

export async function resolveBundle(repoDir = process.cwd(), registryPath = REGISTRY_PATH) {
  const { stdout } = await promisify(execFile)('git', ['remote', 'get-url', 'origin'], { cwd: repoDir });
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  return { remote: normalizeRemote(stdout), bundle: lookupBundle(registry, stdout) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { remote, bundle } = await resolveBundle(process.argv[2]);
  if (!bundle) { console.error(`No docs bundle registered for ${remote} in ${REGISTRY_PATH}`); process.exit(1); }
  console.log(JSON.stringify(bundle, null, 2));
}
