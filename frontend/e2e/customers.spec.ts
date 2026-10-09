import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

const PROBE_OFFER =
  'Restaurant management software helping local restaurants handle billing orders and staff duties';

const LEADS_BODY = {
  schema_version: '1.0',
  offer_summary: 'Restaurant management system for mid-level restaurants',
  leads: [
    {
      name: 'Shankar Restaurant',
      address: '12 MG Road, Ahmedabad',
      rating: 4.2,
      user_ratings_total: 320,
      business_type: 'Restaurant',
      match_score: 82,
      match_reasons: ['2 reviews mention possible pain points'],
      research_notes: 'bill was wrong; waited a long time',
      why_fit: 'Mid-size restaurant with billing pain.',
      pitch_angle: 'Cut billing errors.',
      suggested_first_question: 'How do you bill today?',
      phone: '919822012345',
      maps_url: 'https://maps.google.com/?q=shankar',
      price_level: 2,
      score_breakdown: { mid_level: 80, pain: 66.7, reachability: 66.7, no_software: 100 },
      likely_has_software: true,
      adjustments: [],
    },
    {
      name: 'Galaxy Gym',
      address: '5 CG Road, Ahmedabad',
      rating: 4.0,
      user_ratings_total: 150,
      business_type: 'Gym',
      match_score: 64,
      match_reasons: ['Listed on Google Maps in Ahmedabad'],
      research_notes: null,
      why_fit: null,
      pitch_angle: null,
      suggested_first_question: null,
      phone: null,
      maps_url: null,
      price_level: null,
      score_breakdown: {},
      likely_has_software: false,
      adjustments: ['Hard to reach: no public phone or website'],
    },
  ],
  market_notes: ['Several vendors sell billing software in India.', 'price not found'],
  meta: {
    credits_used: 7,
    cache_hits: 0,
    degraded: [],
    partial: ['reviews'],
    notes: [],
    timings_ms: { plan: 1 },
  },
  disclaimer:
    'Lead scores are signals from public data, not guarantees. Verify details before contacting.',
};

async function mockLeads(page: Page, handler: (route: Route) => Promise<void>) {
  await page.route('**/api/leads', async (route) => {
    let offer: unknown = null;
    try {
      const raw = route.request().postData();
      offer = raw ? (JSON.parse(raw) as { offer?: unknown }).offer : null;
    } catch {
      offer = null;
    }
    if (offer === PROBE_OFFER) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(LEADS_BODY),
      });
      return;
    }
    await handler(route);
  });
}

async function fillOffer(page: Page) {
  await page
    .getByLabel(/describe what you sell/i)
    .fill('Restaurant billing software for local eateries with waiter and manager billing work');
  await page.getByLabel(/^city$/i).fill('Ahmedabad');
}

function seriousOrCritical(violations: Array<{ impact?: string | null }>): Array<unknown> {
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
}

test('customers happy path renders leads with no horizontal scroll', async ({ page }) => {
  await mockLeads(page, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(LEADS_BODY),
    });
  });
  await page.goto('/app/customers');
  await expect(page.getByRole('heading', { name: 'B2B Customer Leads Radar' })).toBeVisible();
  await fillOffer(page);
  await page.getByRole('button', { name: /^find customers$/i }).click();
  await expect(page.getByRole('heading', { name: /your customer leads/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Shankar Restaurant' })).toBeVisible();
  await expect(page.getByText('May already use billing software')).toBeVisible();
  await expect(page.getByText('From public reviews')).toBeVisible();
  await expect(page.getByText('Price not found').first()).toBeVisible();
  await expect(page.getByText(/partial data from: reviews/i)).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  await page.getByRole('button', { name: 'Add Shankar Restaurant to shortlist' }).click();
  await expect(page.getByRole('button', { name: /open shortlist, 1 items/i })).toBeVisible();
  await page.getByRole('button', { name: /open shortlist, 1 items/i }).click();
  await expect(page.getByText(/nothing is saved on our servers/i)).toBeVisible();

  // Let reveal animations and count-ups settle so axe samples final colors.
  await page.waitForTimeout(800);
  const results = await new AxeBuilder({ page }).analyze();
  expect(seriousOrCritical(results.violations)).toEqual([]);
});

test('customers 429 shows countdown copy and retry works', async ({ page }) => {
  let calls = 0;
  await mockLeads(page, async (route) => {
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
        body: JSON.stringify(LEADS_BODY),
      });
    }
  });
  await page.goto('/app/customers');
  await fillOffer(page);
  await page.getByRole('button', { name: /^find customers$/i }).click();
  await expect(page.getByRole('alert')).toContainText(/too many requests/i);
  await expect(page.getByRole('alert')).toContainText(/45 seconds/);
  await page.getByRole('button', { name: /retry search/i }).click();
  await expect(page.getByRole('heading', { name: /your customer leads/i })).toBeVisible();
});

test('customers cold-start shows waking message on 502 retry', async ({ page }) => {
  let calls = 0;
  await mockLeads(page, async (route) => {
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
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(LEADS_BODY),
      });
    }
  });
  await page.goto('/app/customers');
  await fillOffer(page);
  await page.getByRole('button', { name: /^find customers$/i }).click();
  await expect(page.getByText(/waking up the server/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /your customer leads/i })).toBeVisible();
});

test('customers keyboard-only flow reaches and focuses results', async ({ page }) => {
  await mockLeads(page, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(LEADS_BODY),
    });
  });
  await page.goto('/app/customers');
  await page.getByLabel(/describe what you sell/i).focus();
  await page.keyboard.type('Restaurant billing software for local eateries and staff');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Ahmedabad');
  for (let tab = 0; tab < 7; tab += 1) {
    await page.keyboard.press('Tab');
  }
  await page.keyboard.press('Enter');
  const resultsHeading = page.getByRole('heading', { name: /your customer leads/i });
  await expect(resultsHeading).toBeVisible();
  await expect(resultsHeading).toBeFocused();

  // Let reveal animations and count-ups settle so axe samples final colors.
  await page.waitForTimeout(800);
  const results = await new AxeBuilder({ page }).analyze();
  expect(seriousOrCritical(results.violations)).toEqual([]);
});

test('customers tab hides when the mode is disabled', async ({ page }) => {
  await page.route('**/api/leads', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'feature_disabled', message: 'off', request_id: 'req-404' },
      }),
    });
  });
  await page.goto('/app/income');
  await expect(page.getByRole('tab', { name: 'Income Discovery' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'B2B Leads Radar' })).not.toBeVisible();
  await expect(page.getByRole('tab', { name: 'Saved Shortlist' })).toBeVisible();
});

test('customers alias /customers still serves the page', async ({ page }) => {
  await mockLeads(page, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(LEADS_BODY),
    });
  });
  await page.goto('/customers');
  await expect(page.getByRole('heading', { name: 'B2B Customer Leads Radar' })).toBeVisible();
});
