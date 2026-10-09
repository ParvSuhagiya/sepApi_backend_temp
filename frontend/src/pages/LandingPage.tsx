import { Link } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { RiskBadge } from '../components/ui/RiskBadge';
import { ScoreRing } from '../components/ui/ScoreBadge';

/** Warm the route chunk on hover/focus so the app opens instantly. */
function prefetchIncome() {
  void import('../pages/HomePage');
}

/** Warm the route chunk on hover/focus so the app opens instantly. */
function prefetchCustomers() {
  void import('../pages/CustomersPage');
}

const STEPS = [
  {
    title: 'Tell us about yourself',
    body: 'Your skills and city, or your product and price. Plain words are fine. Nothing is stored.',
  },
  {
    title: 'We check live sources',
    body: 'Jobs, local businesses, demand trends and forums. Slow sources are marked, never hidden.',
  },
  {
    title: 'You get ranked results',
    body: 'EarnScore or lead scores with the reasoning shown. Drafts are yours to review and send.',
  },
] as const;

const FEATURES = [
  { title: 'Ranked opportunities with EarnScore', body: 'Every score shows its weights and adjustments.' },
  { title: 'Scam Shield', body: 'Text-pattern risk signals on every job. A low-risk badge is not a safety promise.' },
  { title: 'Local leads on a map', body: 'Businesses near your city, with approximate pins marked as approximate.' },
  { title: 'Trend chart', body: 'Demand direction at a glance, with a data-table fallback.' },
  { title: '7-day plans', body: 'A concrete first week for each idea. Copy it or print it.' },
  { title: 'Human-reviewed outreach', body: 'Editable WhatsApp drafts. You open WhatsApp yourself. Nothing auto-sends.' },
] as const;

const FAQS = [
  {
    q: 'Are the income figures guaranteed?',
    a: 'No. They are estimates from collected evidence, always labelled Estimate. Treat them as a starting point, not a promise.',
  },
  {
    q: 'Is a “low risk” job safe?',
    a: 'Not necessarily. Scam Shield only checks text patterns. Verify every employer before paying money or sharing documents.',
  },
  {
    q: 'Do you send messages for me?',
    a: 'Never. Drafts are written for you to edit. You open WhatsApp yourself, and you can ignore the opt-out line rule at your own risk — every draft includes one.',
  },
  {
    q: 'What do you store about me?',
    a: 'Only your theme choice, in your own browser. Search results live in memory and vanish when you close the tab.',
  },
  {
    q: 'Why did a search cost zero credits?',
    a: 'Repeated identical searches are served from cache. The results page always shows credits used and cache hits.',
  },
] as const;

/** Static product mock built from real UI components, not an image. */
export function ProductMock() {
  return (
    <div
      aria-label="Example EarnRadar result"
      className="flex flex-col gap-3 rounded-lg border border-line bg-raised p-4 shadow-md"
    >
      <div className="flex items-start gap-3">
        <ScoreRing score={78} label="EarnScore" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">#1</p>
          <p className="break-words text-lg font-bold text-ink">Tailoring from home, Pune</p>
          <p className="mt-1 text-sm text-ink">
            <span className="font-semibold">Income: ₹8,000/month</span>{' '}
            <span className="rounded-sm bg-surface px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-ink">
              Estimate
            </span>
          </p>
        </div>
        <RiskBadge risk="Low" />
      </div>
      <div
        role="img"
        aria-label="Demand: 21.0 of 30 weighted points"
        className="h-2 overflow-hidden rounded-full bg-surface"
      >
        <div className="h-full rounded-full bg-brand-strong" style={{ width: '70%' }} />
      </div>
      <p className="text-xs text-muted">EarnScore 78 · 7-day plan included · evidence shown</p>
    </div>
  );
}

/** Marketing landing: hero, mock, steps, features, trust, FAQ, final CTA. */
export function LandingPage() {
  return (
    <div className="flex flex-col gap-12">
      <Seo route="/" />
      <section aria-labelledby="landing-heading" className="hero-glow rounded-xl px-2 py-10 text-center">
        <h1 id="landing-heading" className="mx-auto max-w-2xl text-3xl font-bold text-ink sm:text-4xl">
          Realistic income ideas for India
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-muted">
          Ranked opportunities with honest scores. Or customers for your product. Estimates, not
          promises.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/app/income"
            onMouseEnter={prefetchIncome}
            onFocus={prefetchIncome}
            className="brand-gradient inline-flex min-h-[44px] items-center rounded-md px-6 py-2 text-base font-semibold text-white shadow-md hover:brightness-110"
          >
            Find my opportunities
          </Link>
          <Link
            to="/app/customers"
            onMouseEnter={prefetchCustomers}
            onFocus={prefetchCustomers}
            className="inline-flex min-h-[44px] items-center rounded-md border border-line bg-raised px-6 py-2 text-base font-semibold text-ink hover:bg-surface"
          >
            Find customers for my product
          </Link>
        </div>
      </section>

      <section aria-labelledby="landing-mock-heading">
        <h2 id="landing-mock-heading" className="text-xl font-bold text-ink">
          What you get
        </h2>
        <div className="mt-3 max-w-xl">
          <ProductMock />
        </div>
      </section>

      <section aria-labelledby="landing-steps-heading">
        <h2 id="landing-steps-heading" className="text-xl font-bold text-ink">
          How it works
        </h2>
        <ol className="mt-3 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col gap-1 rounded-lg border border-line bg-raised p-4 shadow-sm"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-brand">
                Step {index + 1}
              </p>
              <p className="text-base font-bold text-ink">{step.title}</p>
              <p className="text-sm text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="landing-features-heading">
        <h2 id="landing-features-heading" className="text-xl font-bold text-ink">
          Features
        </h2>
        <ul className="mt-3 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="flex flex-col gap-1 rounded-lg border border-line bg-raised p-4 shadow-sm"
            >
              <p className="text-base font-bold text-ink">{feature.title}</p>
              <p className="text-sm text-muted">{feature.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="landing-trust-heading"
        className="rounded-lg border border-line bg-raised p-4 shadow-sm"
      >
        <h2 id="landing-trust-heading" className="text-xl font-bold text-ink">
          What we are — and aren&apos;t
        </h2>
        <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="font-bold text-ink">We are</p>
            <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-ink">
              <li>Estimates, clearly labelled</li>
              <li>Risk signals, not safety verdicts</li>
              <li>Drafts you review before sending</li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-ink">We aren&apos;t</p>
            <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-ink">
              <li>Promises of income or customers</li>
              <li>A guarantee any job is safe</li>
              <li>An auto-messenger — nothing sends itself</li>
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="landing-faq-heading">
        <h2 id="landing-faq-heading" className="text-xl font-bold text-ink">
          Questions
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {FAQS.map((faq) => (
            <details key={faq.q} className="rounded-md bg-raised p-3 shadow-sm">
              <summary className="cursor-pointer rounded-sm text-sm font-semibold text-ink">
                {faq.q}
              </summary>
              <p className="mt-2 text-sm text-ink">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="landing-cta-heading" className="pb-4 text-center">
        <h2 id="landing-cta-heading" className="text-xl font-bold text-ink">
          Start with your skills or your product
        </h2>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/app/income"
            onMouseEnter={prefetchIncome}
            onFocus={prefetchIncome}
            className="brand-gradient inline-flex min-h-[44px] items-center rounded-md px-6 py-2 text-base font-semibold text-white shadow-md hover:brightness-110"
          >
            Find my opportunities
          </Link>
          <Link
            to="/app/customers"
            onMouseEnter={prefetchCustomers}
            onFocus={prefetchCustomers}
            className="inline-flex min-h-[44px] items-center rounded-md border border-line bg-raised px-6 py-2 text-base font-semibold text-ink hover:bg-surface"
          >
            Find customers for my product
          </Link>
        </div>
      </section>
    </div>
  );
}
