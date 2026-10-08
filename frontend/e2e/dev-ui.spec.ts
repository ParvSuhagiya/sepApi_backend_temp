import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Runs against the DEV server (E2E_BASE_URL=http://localhost:5173) where
// /dev/ui exists. Skipped otherwise: the route is excluded from prod builds.
test.describe.configure({ mode: 'serial' });

const DEV_ONLY = !!process.env.E2E_BASE_URL;
test.skip(!DEV_ONLY, 'dev-ui spec needs a dev server (E2E_BASE_URL)');

const SECTIONS = [
  'Theme',
  'Buttons',
  'Fields',
  'Tabs',
  'Badges and chips',
  'Scores and risk',
  'Card and disclosure',
  'Dialog',
  'Tooltip and copy',
  'Progress, skeleton, spinner',
  'States and stats',
];

test('kitchen sink renders every primitive', async ({ page }) => {
  await page.goto('/dev/ui');
  for (const name of SECTIONS) {
    await expect(page.locator(`section[aria-label="${name}"]`)).toBeVisible();
  }
  await expect(page.getByRole('tablist', { name: 'Demo tabs' })).toBeVisible();
  await expect(page.getByText('Kitchen sink end marker')).toBeAttached();
});

test('kitchen sink works in both themes', async ({ page }) => {
  await page.goto('/dev/ui');
  const toggle = page.getByRole('button', { name: /toggle theme/i });
  await toggle.click();
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.dataset.theme))
    .toBe('dark');
  await expect(page.getByRole('heading', { name: 'UI kitchen sink' })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await toggle.click();
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.dataset.theme))
    .toBe('light');
});
