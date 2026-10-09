import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

const SEARCH_BODY = {
  opportunities: [
    {
      title: 'Tailoring from home',
      type: 'local business',
      why: 'Fits stitching skills.',
      income_estimate: '₹8,000/month',
      demand: 70,
      competition: 40,
      fit: 90,
      cost_ease: 85,
      trust: 75,
      evidence: ['Local demand noted', 'Forum mentions steady rates'],
      plan_7_days: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      earn_score: 78,
      score_breakdown: {
        demand: 21.0,
        fit: 18.0,
        trust: 15.0,
        low_competition: 9.0,
        cost_ease: 12.8,
      },
      adjustments: ['Trust capped: scam signals in matching jobs.'],
    },
  ],
  jobs: [
    {
      title: 'Tailor needed',
      company: 'ABC Tailors',
      location: 'Pune',
      via: 'Indeed',
      salary: '₹12,000/month',
      desc: 'Stitching work.\nSecond line.\nThird line.\nFourth line.',
      link: 'https://example.test/apply/1',
      flags: [],
      risk: 'Low',
      lat: 18.5204,
      lng: 73.8567,
      geo_precision: null,
    },
  ],
  local: [
    {
      name: 'Sharma Tailoring',
      rating: 4.5,
      reviews: 120,
      phone: '+91 98220 12345',
      address: 'MG Road Pune',
      type: 'Tailor',
      lat: 18.5204,
      lng: 73.8567,
    },
  ],
  trend: [
    { date: '2026-01-01', value: 20 },
    { date: '2026-02-01', value: 35 },
  ],
  trend_keyword: 'tailoring',
  trend_growth: { tailoring: 12 },
  forum: [
    {
      title: 'How much do tailors earn?',
      link: 'https://www.reddit.com/r/india/comments/abc',
      snippet: 'Steady rates in Pune.',
    },
  ],
  stats: { credits_used: 2, cache_hits: 1 },
  meta: {
    request_id: 'req-e2e-1',
    duration_ms: 1200,
    degraded: [],
    partial: [],
    notes: [],
    city_center: { lat: 18.5204, lng: 73.8567 },
  },
};

async function mockSearch(page: Page, handler: (route: Route) => Promise<void>) {
  await page.route('**/api/search', async (route) => handler(route));
}

async function fillProfile(page: Page) {
  await page.getByLabel(/skills/i).fill('tailoring, stitching');
  await page.getByLabel(/^city$/i).fill('Pune');
}

function seriousOrCritical(violations: Array<{ impact?: string | null }>): Array<unknown> {
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
}

test('income happy path renders results with no horizontal scroll', async ({ page }) => {
  await mockSearch(page, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SEARCH_BODY),
    });
  });
  await page.goto('/app/income');
  await expect(page.getByRole('heading', { name: /find income ideas/i })).toBeVisible();
  await fillProfile(page);
  await page.getByRole('button', { name: /find income ideas/i }).click();
  await expect(page.getByRole('heading', { name: /your income opportunities/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tailoring from home' })).toBeVisible();
  await expect(page.getByText('Estimate', { exact: true })).toBeVisible();
  await expect(page.getByText(/scam shield checks text patterns/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tailor needed' })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  const results = await new AxeBuilder({ page }).analyze();
  expect(seriousOrCritical(results.violations)).toEqual([]);
});

test('income 429 shows countdown copy and retry works', async ({ page }) => {
  let calls = 0;
  await mockSearch(page, async (route) => {
    calls += 1;
    if (calls === 1) {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: {
          'Retry-After': '45',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Retry-After, X-Request-ID',
        },
        body: JSON.stringify({
          error: { code: 'rate_limited', message: 'slow', request_id: 'req-429' },
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(SEARCH_BODY),
      });
    }
  });
  await page.goto('/app/income');
  await fillProfile(page);
  await page.getByRole('button', { name: /find income ideas/i }).click();
  await expect(page.getByRole('alert')).toContainText(/too many requests/i);
  await expect(page.getByRole('alert')).toContainText(/45 seconds/);
  await page.getByRole('button', { name: /retry search/i }).click();
  await expect(page.getByRole('heading', { name: /your income opportunities/i })).toBeVisible();
});

test('income cold-start shows waking message on 502 retry', async ({ page }) => {
  let calls = 0;
  await mockSearch(page, async (route) => {
    calls += 1;
    if (calls === 1) {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'upstream_failure', message: 'down', request_id: 'req-502' },
        }),
      });
    } else {
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(SEARCH_BODY),
      });
    }
  });
  await page.goto('/app/income');
  await fillProfile(page);
  await page.getByRole('button', { name: /find income ideas/i }).click();
  await expect(page.getByText(/waking up the server/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /your income opportunities/i })).toBeVisible();
});

test('income keyboard-only flow reaches and focuses results', async ({ page }) => {
  await mockSearch(page, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SEARCH_BODY),
    });
  });
  await page.goto('/app/income');
  await page.getByLabel(/skills/i).focus();
  await page.keyboard.type('tailoring, stitching');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Pune');
  await page.keyboard.press('Tab');
  await page.keyboard.type('12');
  await page.keyboard.press('Tab');
  await page.keyboard.type('0');
  await page.keyboard.press('Enter');
  const resultsHeading = page.getByRole('heading', { name: /your income opportunities/i });
  await expect(resultsHeading).toBeVisible();
  await expect(resultsHeading).toBeFocused();

  const results = await new AxeBuilder({ page }).analyze();
  expect(seriousOrCritical(results.violations)).toEqual([]);
});

test('income alias / still serves the search page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /find income ideas/i })).toBeVisible();
});
