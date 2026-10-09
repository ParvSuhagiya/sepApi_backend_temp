import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('landing renders hero, CTAs and shell with no a11y violations', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /realistic income ideas for india/i }),
  ).toBeVisible();
  await expect(page.getByRole('tablist', { name: /choose what to find/i })).toBeVisible();
  await expect(page.getByLabel('Example EarnRadar result')).toBeVisible();
  await expect(page.getByText(/income figures are estimates/i)).toBeVisible();
  await expect(page.getByText(/provides information, not guarantees/i)).toBeVisible();

  // Primary CTA reaches the income app; secondary reaches customers.
  await page.getByRole('link', { name: 'Find my opportunities' }).first().click();
  await expect(page.getByRole('heading', { name: /find income ideas/i })).toBeVisible();
  await page.goto('/');
  await page.getByRole('link', { name: 'Find customers for my product' }).first().click();
  await expect(page.getByRole('heading', { name: /find customers for my product/i })).toBeVisible();

  // Mode tabs navigate.
  await page.goto('/');
  await page.getByRole('tab', { name: /find customers/i }).click();
  await expect(page.getByRole('heading', { name: /find customers for my product/i })).toBeVisible();

  // Theme toggle flips the theme attribute.
  const toggle = page.getByRole('button', { name: /switch to (dark|light) theme/i });
  await toggle.click();
  await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.theme)).not.toBe('');

  // Skip link targets the main landmark.
  await expect(page.locator('#main-content')).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('customers, explainer, 404 and dev-route exclusion', async ({ page }) => {
  await page.goto('/customers');
  await expect(page.getByRole('heading', { name: /find customers for my product/i })).toBeVisible();

  await page.goto('/how-it-works');
  await expect(page.getByRole('heading', { name: /how earnradar works/i })).toBeVisible();

  await page.goto('/no-such-page');
  await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible();

  // /dev/ui is dev-only and must 404 in the production build.
  await page.goto('/dev/ui');
  await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
