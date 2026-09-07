import { test, expect, type Page } from '@playwright/test';

/** The dark value of --ed-raised in src/theme/tokens.css (#1E2858), the surface every popover and dialog sits on. */
const RAISED_DARK = 'rgb(30, 40, 88)';
const TEXT_DARK = 'rgb(244, 238, 223)';

/** Resolves a --ed-* token the way the browser does, so the assertion tracks the token rather than a copied literal. */
const token = (page: Page, name: string) => page.evaluate((n) => {
  const probe = document.createElement('div');
  probe.style.backgroundColor = `var(${n})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}, name);

test('MDXEditor menus and dialogs render on the arcade dark surface, not the library default white', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Display name').fill('Theme Check');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'systems/combat.md' }).click();
  await expect(page.locator('.mdxeditor')).toBeVisible();

  expect(await token(page, '--ed-raised')).toBe(RAISED_DARK);
  const popup = page.locator('.mdxeditor-popup-container');
  await expect(popup).toHaveClass(/arcade-theme/);

  // Block type select
  await page.getByRole('combobox', { name: 'Block type' }).click();
  const blockTypes = popup.locator('.mdxeditor-select-content');
  await expect(blockTypes).toBeVisible();
  await expect(blockTypes).toHaveCSS('background-color', RAISED_DARK);
  await expect(blockTypes).toHaveCSS('color', TEXT_DARK);
  await page.keyboard.press('Escape');

  // Admonition dropdown
  await page.getByRole('combobox', { name: 'Insert Admonition' }).click();
  const admonitions = popup.locator('.mdxeditor-select-content');
  await expect(admonitions).toBeVisible();
  await expect(admonitions).toHaveCSS('background-color', RAISED_DARK);
  await page.keyboard.press('Escape');

  // Insert image dialog
  await page.getByRole('button', { name: 'Insert image' }).click();
  const dialog = popup.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS('background-color', RAISED_DARK);
  await expect(dialog).toHaveCSS('color', TEXT_DARK);
  await page.keyboard.press('Escape');

  // The library's own token no longer resolves to white anywhere the theme class is present.
  const pageBg = await page.locator('.mdxeditor').evaluate((el) => getComputedStyle(el).getPropertyValue('--basePageBg').trim());
  expect(pageBg).not.toBe('white');
});
