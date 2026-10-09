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
      score_breakdown: { demand: 21.0 },
      adjustments: [],
    },
  ],
  jobs: [
    {
      title: 'Tailor needed',
      company: 'ABC Tailors',
      location: 'Pune',
      via: 'Indeed',
      salary: '₹12,000/month',
      desc: 'Stitching work.',
      link: 'https://example.test/apply/1',
      flags: [],
      risk: 'Low',
      lat: 18.5204,
      lng: 73.8567,
      geo_precision: null,
    },
  ],
  local: [],
  trend: [],
  trend_keyword: null,
  trend_growth: {},
  forum: [],
  stats: { credits_used: 2, cache_hits: 0 },
  meta: {
    request_id: 'req-net-1',
    duration_ms: 900,
    degraded: [],
    partial: [],
    notes: [],
    city_center: { lat: 18.5204, lng: 73.8567 },
  },
};

function isFirstParty(url: string): boolean {
  if (url.startsWith('data:') || url.startsWith('blob:')) return true;
  try {
    const host = new URL(url).hostname;
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.tile.openstreetmap.org')
    );
  } catch {
    return false;
  }
}

async function collectRequests(page: Page): Promise<string[]> {
  const urls: string[] = [];
  page.on('request', (request) => {
    urls.push(request.url());
  });
  return urls;
}

test('no external requests except the API origin and OSM tiles', async ({ page }) => {
  const urls = await collectRequests(page);
  await page.route('**/api/search', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SEARCH_BODY),
    });
  });
  await page.goto('/app/income');
  await page.getByLabel(/skills/i).fill('tailoring, stitching');
  await page.getByLabel(/^city$/i).fill('Pune');
  await page.getByRole('button', { name: /find income ideas/i }).click();
  await expect(page.getByRole('heading', { name: /your income opportunities/i })).toBeVisible();
  // Let lazy chunks and any map tiles settle.
  await page.waitForTimeout(1500);
  const thirdParty = urls.filter((url) => !isFirstParty(url));
  expect(thirdParty).toEqual([]);
});
