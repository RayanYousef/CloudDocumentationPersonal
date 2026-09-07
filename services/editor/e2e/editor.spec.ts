import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const repoPath = async () => (await readFile(path.join(here, '.repo-path'), 'utf8')).trim();
const git = async (...args: string[]) => (await run('git', args, { cwd: await repoPath() })).stdout.trim();

test('edit, create and publish through the editor against LocalFolderBackend', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Display name').fill('Mock Editor');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Signed in as')).toBeVisible();

  // Edit an existing page's description through the frontmatter form.
  await page.getByRole('button', { name: 'systems/inventory.md' }).click();
  const desc = page.locator('label.row', { hasText: 'description' }).locator('input');
  await desc.fill('Explains how item stacks are stored, merged and moved, and which service API mutates a container.');
  await page.getByLabel('Commit message').fill('Clarify inventory description');
  await page.getByRole('button', { name: 'Save & commit' }).click();
  await expect(page.getByRole('status')).toContainText('Committed');
  expect(await git('log', '-1', '--format=%an %s')).toBe('Mock Editor Clarify inventory description');
  const repo = await repoPath();
  expect(await readFile(path.join(repo, 'site/docs/systems/index.md'), 'utf8')).toContain('item stacks are stored, merged and moved');
  expect(await readFile(path.join(repo, 'site/docs/manifest.json'), 'utf8')).toContain('item stacks are stored, merged and moved');
  expect(await readFile(path.join(repo, 'site/docs/log.md'), 'utf8')).toContain('* **Update**: [Inventory](/systems/inventory.md) - Clarify inventory description. (by Mock Editor)');

  // Create a page.
  await page.getByRole('button', { name: 'New page' }).click();
  await page.getByLabel('New page path').fill('systems/status-effects.md');
  await page.getByLabel('New page title').fill('Status Effects');
  await page.getByLabel('New page description').fill('Lists every status effect, its duration rules and which combat stage applies it.');
  await page.getByLabel('New page type').fill('system');
  await page.getByLabel('New page resource').fill('https://github.com/RayanYousef/CloudDocumentationPersonal/blob/main/examples/unity-project/Assets/Scripts/Combat');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Created systems/status-effects.md');
  expect(await readFile(path.join(repo, 'site/docs/systems/index.md'), 'utf8')).toContain('* [Status Effects](status-effects.md) - Lists every status effect');

  // Publish a frozen version.
  await page.getByRole('button', { name: 'Publish version' }).click();
  await page.getByLabel('Version').last().fill('1.1.0');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Published 1.1.0');
  const frozen = await readFile(path.join(repo, 'site/versioned_docs/version-1.1.0/systems/inventory.md'), 'utf8');
  expect(frozen).toContain(`/blob/${'e'.repeat(40)}/examples/unity-project/Assets/Scripts/Inventory`);
  expect(frozen).not.toContain('/blob/main/');
  expect(JSON.parse(await readFile(path.join(repo, 'site/docs/versions/1.1.0.json'), 'utf8')).pins['RayanYousef/CloudDocumentationPersonal']).toBe('e'.repeat(40));
  expect((await git('tag', '--list')).split('\n')).toContain('docs-v1.1.0');

  // Frozen versions are read-only in the UI.
  await page.getByLabel('Version').first().selectOption('1.1.0');
  await expect(page.getByText('This version is frozen and read-only')).toBeVisible();
});
