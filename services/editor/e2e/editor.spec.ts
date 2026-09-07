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

  // Reserved files never appear in the picker as pages.
  await expect(page.getByRole('button', { name: 'systems/inventory.md' })).toBeVisible();
  for (const reserved of ['log.md', 'AGENTS.md', 'README.md']) await expect(page.getByRole('button', { name: reserved, exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /code-maps\// })).toHaveCount(0);

  // Edit an existing page's description through the frontmatter form.
  await page.getByRole('button', { name: 'systems/inventory.md' }).click();
  const desc = page.locator('label.row', { hasText: 'description' }).locator('input');
  await desc.fill('Explains how item stacks are stored, merged and moved, and which service API mutates a container.');
  await expect(page.getByText('Unsaved changes')).toBeVisible();
  await page.getByLabel('Commit message').fill('Clarify inventory description');
  await page.getByRole('button', { name: 'Save & commit' }).click();
  await expect(page.getByRole('status')).toContainText('Committed');
  await expect(page.getByText('Unsaved changes')).toHaveCount(0);
  expect(await git('log', '-1', '--format=%an %s')).toBe('Mock Editor Clarify inventory description');
  const repo = await repoPath();
  expect(await readFile(path.join(repo, 'site/docs/systems/index.md'), 'utf8')).toContain('item stacks are stored, merged and moved');
  expect(await readFile(path.join(repo, 'site/docs/manifest.json'), 'utf8')).toContain('item stacks are stored, merged and moved');
  expect(await readFile(path.join(repo, 'site/docs/log.md'), 'utf8')).toContain('* **Update**: [Inventory](/systems/inventory.md) - Clarify inventory description. (by Mock Editor)');

  // Unsaved edits are guarded: dismissing the confirm keeps the current page and its edits.
  await desc.fill('Draft edit that must not be lost.');
  page.once('dialog', (d) => { expect(d.type()).toBe('confirm'); void d.dismiss(); });
  await page.getByRole('button', { name: 'systems/combat.md' }).click();
  await expect(page.getByRole('heading', { name: 'systems/inventory.md' })).toBeVisible();
  await expect(desc).toHaveValue('Draft edit that must not be lost.');

  // Validator problems are shown before anything is committed.
  await desc.fill('');
  await page.getByRole('button', { name: 'Save & commit' }).click();
  await expect(page.getByRole('alert')).toContainText('missing "description"');
  expect(await git('log', '-1', '--format=%s')).toBe('Clarify inventory description');
  await desc.fill('Explains how item stacks are stored, merged and moved between containers, and which service API mutates a container.');
  await page.getByRole('button', { name: 'Save & commit' }).click();
  await expect(page.getByRole('status')).toContainText('Committed');
  await expect(page.getByRole('alert')).toHaveCount(0);

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

  // A failed create stays in the dialog with the backend's message.
  await page.getByRole('button', { name: 'New page' }).click();
  await page.getByLabel('New page path').fill('systems/status-effects.md');
  await page.getByLabel('New page title').fill('Duplicate');
  await page.getByLabel('New page description').fill('Tries to reuse an existing path.');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('systems/status-effects.md');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Rename and delete commit through the backend and update the folder index.
  page.once('dialog', (d) => void d.accept('systems/effects.md'));
  await page.getByRole('button', { name: 'Rename' }).click();
  await expect(page.getByRole('heading', { name: 'systems/effects.md' })).toBeVisible();
  expect(await git('log', '-1', '--format=%s')).toBe('Rename systems/status-effects.md to systems/effects.md');
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('status')).toContainText('Deleted systems/effects.md');
  await expect(page.getByRole('button', { name: 'systems/effects.md' })).toHaveCount(0);
  expect(await readFile(path.join(repo, 'site/docs/systems/index.md'), 'utf8')).not.toContain('Status Effects');

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
  await expect(page.getByRole('button', { name: 'New page' })).toBeDisabled();
  await page.getByRole('button', { name: 'systems/inventory.md' }).click();
  await expect(page.getByRole('button', { name: 'Save & commit' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Delete' })).toBeDisabled();
  await expect(page.locator('label.row', { hasText: 'description' }).locator('input')).toBeDisabled();
});
