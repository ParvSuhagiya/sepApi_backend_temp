import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const ROUTES = [
  '/',
  '/app/income',
  '/app/customers',
  '/customers',
  '/app/shortlist',
  '/how-it-works',
  '/privacy',
  '/terms',
  '/responsible-use',
  '/no-such-page',
];

for (const path of ROUTES) {
  test(`route ${path} is axe-clean in light and dark`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('#main-content h1')).toBeVisible();

    const light = await new AxeBuilder({ page }).analyze();
    expect(light.violations).toEqual([]);

    await page.getByRole('button', { name: /switch to (dark|light) theme/i }).click();
    await expect.poll(async () =>
      page.evaluate(() => document.documentElement.dataset.theme),
    ).not.toBe('');
    const dark = await new AxeBuilder({ page }).analyze();
    expect(dark.violations).toEqual([]);
  });
}

test('landing respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#main-content h1')).toBeVisible();
  const duration = await page.evaluate(
    () => getComputedStyle(document.querySelector('.hero-glow') as Element).animationDuration,
  );
  expect(duration).not.toBe('12s');
});
